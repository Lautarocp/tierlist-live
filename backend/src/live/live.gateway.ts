import { OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import { LiveError, LiveService } from './live.service';

const TICK_MS = 300;

@WebSocketGateway({ namespace: '/live', cors: { origin: '*' } })
export class LiveGateway implements OnModuleDestroy {
  @WebSocketServer()
  server: Namespace;

  private ticks = new Map<string, NodeJS.Timeout>();
  private lastTotals = new Map<string, string>();

  constructor(private readonly service: LiveService) {}

  private room(code: string) {
    return `session:${code}`;
  }

  private async guard<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof LiveError) return { error: err.message };
      throw err;
    }
  }

  @SubscribeMessage('joinSession')
  joinSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    body: { code: string; role: 'streamer' | 'viewer'; voterId?: string; token?: string },
  ) {
    return this.guard(async () => {
      const snapshot = await this.service.buildSnapshot(body.code);
      if (body.role === 'streamer') {
        await this.service.verifyStreamer(body.code, body.token);
        socket.data.isStreamer = true;
      }
      socket.data.code = body.code;
      socket.data.voterId = body.voterId;
      await socket.join(this.room(body.code));
      if (snapshot.status === 'LIVE') this.startTick(body.code);
      return snapshot;
    });
  }

  @SubscribeMessage('startSession')
  startSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { code: string },
  ) {
    return this.guard(async () => {
      this.assertStreamer(socket, body.code);
      const item = await this.service.start(body.code);
      this.startTick(body.code);
      this.server.to(this.room(body.code)).emit('itemActive', { item });
      return { ok: true };
    });
  }

  @SubscribeMessage('nextItem')
  nextItem(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { code: string },
  ) {
    return this.guard(async () => {
      this.assertStreamer(socket, body.code);
      const item = await this.service.next(body.code);
      if (!item) return { error: 'NO_ITEMS_LEFT' };
      this.server.to(this.room(body.code)).emit('itemActive', { item });
      return { ok: true };
    });
  }

  @SubscribeMessage('vote')
  vote(
    @MessageBody()
    body: { code: string; itemId: string; tierId: string; voterId: string },
  ) {
    return this.service.vote(body.code, body.itemId, body.tierId, body.voterId);
  }

  @SubscribeMessage('resolveItem')
  resolveItem(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { code: string; itemId: string; tierId: string },
  ) {
    return this.guard(async () => {
      this.assertStreamer(socket, body.code);
      const revealed = await this.service.resolve(
        body.code,
        body.itemId,
        body.tierId,
      );
      this.server.to(this.room(body.code)).emit('itemRevealed', revealed);
      return { ok: true };
    });
  }

  @SubscribeMessage('finishSession')
  finishSession(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { code: string },
  ) {
    return this.guard(async () => {
      this.assertStreamer(socket, body.code);
      const comparison = await this.service.finish(body.code);
      this.stopTick(body.code);
      this.server.to(this.room(body.code)).emit('sessionFinished', { comparison });
      return { ok: true };
    });
  }

  private assertStreamer(socket: Socket, code: string) {
    if (!socket.data.isStreamer || socket.data.code !== code) {
      throw new LiveError('Solo el streamer puede hacer esto');
    }
  }

  private startTick(code: string) {
    if (this.ticks.has(code)) return;
    this.ticks.set(
      code,
      setInterval(async () => {
        const active = await this.service.getActiveVoteTotal(code);
        if (!active) return;
        const key = `${active.itemId}:${active.total}`;
        if (this.lastTotals.get(code) === key) return;
        this.lastTotals.set(code, key);
        this.server
          .to(this.room(code))
          .emit('voteCount', { itemId: active.itemId, total: active.total });
      }, TICK_MS),
    );
  }

  private stopTick(code: string) {
    const tick = this.ticks.get(code);
    if (tick) clearInterval(tick);
    this.ticks.delete(code);
    this.lastTotals.delete(code);
  }

  onModuleDestroy() {
    for (const code of this.ticks.keys()) this.stopTick(code);
  }
}
