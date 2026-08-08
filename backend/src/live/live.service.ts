import { Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PersistenceService } from './persistence.service';
import { StoreService, StoredItem, StoredTier, StoredSession } from '../store/store.service';
import { RedisService } from '../redis/redis.service';

const VOTE_DEDUP_TTL_S = 7200;

interface LiveSession {
  id: string;
  code: string;
  status: 'LOBBY' | 'LIVE' | 'FINISHED';
  tierIds: Set<string>;
  items: StoredItem[];
  activeItemId: string | null;
}

export interface BreakdownEntry {
  tierId: string;
  count: number;
  pct: number;
}

export interface RevealedItem {
  itemId: string;
  streamerTierId: string;
  breakdown: BreakdownEntry[];
  totalVotes: number;
}

export class LiveError extends Error {}

@Injectable()
export class LiveService {
  private readonly logger = new Logger(LiveService.name);
  private readonly sessions = new Map<string, LiveSession>();

  constructor(
    private readonly store: StoreService,
    private readonly redis: RedisService,
    private readonly persistence: PersistenceService,
  ) {}

  private kActive(id: string)                            { return `sess:${id}:active`; }
  private kUsed(id: string)                              { return `sess:${id}:used`; }
  private kRevealed(id: string)                          { return `sess:${id}:revealed`; }
  private kVotes(id: string, itemId: string)             { return `votes:${id}:${itemId}`; }
  private kVoted(id: string, itemId: string, v: string)  { return `voted:${id}:${itemId}:${v}`; }

  private loadSession(code: string): LiveSession {
    const cached = this.sessions.get(code);
    if (cached) return cached;

    const session = this.store.sessionsByCode.get(code);
    if (!session) throw new LiveError('Sesión no encontrada');

    const live: LiveSession = {
      id: session.id,
      code,
      status: session.status,
      tierIds: new Set(session.tierList.tiers.map((t) => t.id)),
      items: session.tierList.items,
      activeItemId: null,
    };
    this.sessions.set(code, live);
    return live;
  }

  verifyStreamer(code: string, token: string | undefined): void {
    if (!token) throw new LiveError('Token de streamer requerido');
    const session = this.store.sessionsByCode.get(code);
    if (!session || session.streamerToken !== token) {
      throw new LiveError('Token de streamer inválido');
    }
  }

  async buildSnapshot(code: string) {
    const session = this.store.sessionsByCode.get(code);
    if (!session) throw new LiveError('Sesión no encontrada');

    this.sessions.delete(code);
    const live = this.loadSession(code);
    live.activeItemId = await this.redis.get(this.kActive(live.id));

    const tiers = session.tierList.tiers;
    const revealed = await this.getRevealed(session.id, tiers);
    const activeItem = live.activeItemId
      ? live.items.find((i) => i.id === live.activeItemId) ?? null
      : null;
    const voteTotal = activeItem ? await this.countVotes(session.id, activeItem.id) : 0;

    return {
      code,
      status: session.status,
      tierList: {
        id: session.tierList.id,
        title: session.tierList.title,
        tiers,
        items: session.tierList.items,
      },
      activeItem,
      voteTotal,
      revealed,
      comparison:
        session.status === 'FINISHED'
          ? this.buildComparison(session.id, tiers, live.items)
          : null,
    };
  }

  async start(code: string): Promise<StoredItem> {
    const live = this.loadSession(code);
    if (live.status !== 'LOBBY') throw new LiveError('La sesión ya comenzó');
    const session = this.store.sessionsByCode.get(code)!;
    session.status = 'LIVE';
    live.status = 'LIVE';
    const item = await this.pickNext(live);
    if (!item) throw new LiveError('La tier list no tiene items');
    return item;
  }

  async next(code: string): Promise<StoredItem | null> {
    const live = this.loadSession(code);
    if (live.status !== 'LIVE') throw new LiveError('La sesión no está en vivo');
    if (live.activeItemId) throw new LiveError('Resolvé el item activo antes de pasar al siguiente');
    return this.pickNext(live);
  }

  private async pickNext(live: LiveSession): Promise<StoredItem | null> {
    const used = new Set(await this.redis.smembers(this.kUsed(live.id)));
    const remaining = live.items.filter((i) => !used.has(i.id));
    if (remaining.length === 0) return null;

    const item = remaining[randomInt(remaining.length)];
    await this.redis.multi()
      .sadd(this.kUsed(live.id), item.id)
      .set(this.kActive(live.id), item.id)
      .exec();
    live.activeItemId = item.id;
    return item;
  }

  async vote(code: string, itemId: string, tierId: string, voterId: string) {
    const live = this.sessions.get(code);
    if (!live || live.status !== 'LIVE') return { ok: false, reason: 'SESSION_NOT_LIVE' };
    if (live.activeItemId !== itemId)    return { ok: false, reason: 'ITEM_NOT_ACTIVE' };
    if (!live.tierIds.has(tierId) || !voterId) return { ok: false, reason: 'INVALID_VOTE' };

    const fresh = await this.redis.set(
      this.kVoted(live.id, itemId, voterId), '1', 'EX', VOTE_DEDUP_TTL_S, 'NX',
    );
    if (!fresh) return { ok: false, reason: 'ALREADY_VOTED' };

    await this.redis.hincrby(this.kVotes(live.id, itemId), tierId, 1);
    return { ok: true };
  }

  async getActiveVoteTotal(code: string) {
    const live = this.sessions.get(code);
    if (!live?.activeItemId) return null;
    const total = await this.countVotes(live.id, live.activeItemId);
    return { itemId: live.activeItemId, total };
  }

  async resolve(code: string, itemId: string, tierId: string): Promise<RevealedItem> {
    const live = this.loadSession(code);
    if (live.status !== 'LIVE')        throw new LiveError('La sesión no está en vivo');
    if (live.activeItemId !== itemId)  throw new LiveError('El item no es el activo');

    const session = this.store.sessionsByCode.get(code)!;
    if (!live.tierIds.has(tierId))     throw new LiveError('Tier inválida');

    const counts = await this.redis.hgetall(this.kVotes(live.id, itemId));
    const tiers = session.tierList.tiers;
    const { breakdown, totalVotes } = this.toBreakdown(counts, tiers);

    const revealed: RevealedItem = { itemId, streamerTierId: tierId, breakdown, totalVotes };

    await this.redis.multi()
      .hset(this.kRevealed(live.id), itemId, JSON.stringify({ streamerTierId: tierId, counts, totalVotes }))
      .del(this.kActive(live.id))
      .exec();
    live.activeItemId = null;

    this.persistence.enqueue(live.id, {
      itemId,
      streamerTierId: tierId,
      votesBreakdown: Object.fromEntries(breakdown.map((b) => [b.tierId, b.count])),
      totalVotes,
    });

    return revealed;
  }

  async finish(code: string) {
    const live = this.loadSession(code);
    if (live.status === 'FINISHED') throw new LiveError('La sesión ya terminó');

    const session = this.store.sessionsByCode.get(code)!;
    session.status = 'FINISHED';
    live.status = 'FINISHED';
    live.activeItemId = null;
    await this.redis.del(this.kActive(live.id));

    const tiers = session.tierList.tiers;
    const comparison = this.buildComparison(live.id, tiers, live.items);
    this.cleanupImages(live.items);
    return comparison;
  }

  private cleanupImages(items: StoredItem[]) {
    for (const item of items) {
      if (!item.imageUrl) continue;
      const filename = item.imageUrl.replace(/^\/uploads\//, '');
      this.store.images.delete(filename);
    }
  }

  private buildComparison(sessionId: string, tiers: StoredTier[], items: StoredItem[]) {
    const results = this.store.results.get(sessionId) ?? [];
    const itemsById = new Map(items.map((i) => [i.id, i]));

    let matches = 0;
    const entries = results.flatMap((r) => {
      const item = itemsById.get(r.itemId);
      if (!item) return [];
      const counts = Object.fromEntries(
        Object.entries(r.votesBreakdown).map(([k, v]) => [k, String(v)]),
      );
      const { breakdown } = this.toBreakdown(counts, tiers);
      const chatTierId = breakdown.reduce((best, b) => (b.count > best.count ? b : best)).tierId;
      const match = chatTierId === r.streamerTierId;
      if (match) matches++;
      return [{ item, streamerTierId: r.streamerTierId, chatTierId, breakdown, totalVotes: r.totalVotes, match }];
    });

    return {
      tiers,
      items: entries,
      matchPct: entries.length > 0 ? Math.round((matches / entries.length) * 100) : 0,
    };
  }

  private async getRevealed(sessionId: string, tiers: StoredTier[]): Promise<RevealedItem[]> {
    const raw = await this.redis.hgetall(this.kRevealed(sessionId));
    return Object.entries(raw).map(([itemId, json]) => {
      const { streamerTierId, counts, totalVotes } = JSON.parse(json);
      return { itemId, streamerTierId, breakdown: this.toBreakdown(counts, tiers).breakdown, totalVotes };
    });
  }

  private async countVotes(sessionId: string, itemId: string): Promise<number> {
    const counts = await this.redis.hvals(this.kVotes(sessionId, itemId));
    return counts.reduce((sum, c) => sum + Number(c), 0);
  }

  private toBreakdown(counts: Record<string, string>, tiers: StoredTier[]) {
    const totalVotes = Object.values(counts).reduce((sum, c) => sum + Number(c), 0);
    const breakdown = tiers.map((t) => {
      const count = Number(counts[t.id] ?? 0);
      return { tierId: t.id, count, pct: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0 };
    });
    return { breakdown, totalVotes };
  }
}
