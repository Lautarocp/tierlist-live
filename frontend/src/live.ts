import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL, Item, Tier } from './api';

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

export interface ComparisonEntry {
  item: Item;
  streamerTierId: string;
  chatTierId: string;
  breakdown: BreakdownEntry[];
  totalVotes: number;
  match: boolean;
}

export interface Comparison {
  tiers: Tier[];
  items: ComparisonEntry[];
  matchPct: number;
}

export interface Snapshot {
  code: string;
  status: 'LOBBY' | 'LIVE' | 'FINISHED';
  tierList: { id: string; title: string; tiers: Tier[]; items: Item[] };
  activeItem: Item | null;
  voteTotal: number;
  revealed: RevealedItem[];
  comparison: Comparison | null;
}

export interface LiveState {
  socket: Socket | null;
  snapshot: Snapshot | null;
  status: 'LOBBY' | 'LIVE' | 'FINISHED' | null;
  activeItem: Item | null;
  voteTotal: number;
  reveal: RevealedItem | null;
  revealed: RevealedItem[];
  comparison: Comparison | null;
  error: string;
}

export function useLiveSession(
  code: string,
  join: { role: 'streamer' | 'viewer'; voterId?: string; token?: string },
): LiveState {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<LiveState['status']>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [voteTotal, setVoteTotal] = useState(0);
  const [reveal, setReveal] = useState<RevealedItem | null>(null);
  const [revealed, setRevealed] = useState<RevealedItem[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState('');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${API_URL}/live`, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit(
      'joinSession',
      { code, role: join.role, voterId: join.voterId, token: join.token },
      (res: Snapshot | { error: string }) => {
        if ('error' in res) {
          setError(res.error);
          return;
        }
        setSnapshot(res);
        setStatus(res.status);
        setActiveItem(res.activeItem);
        setVoteTotal(res.voteTotal);
        setRevealed(res.revealed);
        setComparison(res.comparison);
      },
    );

    socket.on('itemActive', ({ item }: { item: Item }) => {
      setStatus('LIVE');
      setActiveItem(item);
      setVoteTotal(0);
      setReveal(null);
    });

    socket.on('voteCount', ({ total }: { itemId: string; total: number }) => {
      setVoteTotal(total);
    });

    socket.on('itemRevealed', (r: RevealedItem) => {
      setReveal(r);
      setRevealed((prev) => [...prev.filter((p) => p.itemId !== r.itemId), r]);
      setActiveItem(null);
    });

    socket.on(
      'sessionFinished',
      ({ comparison }: { comparison: Comparison }) => {
        setStatus('FINISHED');
        setComparison(comparison);
        setActiveItem(null);
        setReveal(null);
      },
    );

    socket.on('connect_error', () => setError('No se pudo conectar al servidor'));
    socket.on('connect', () => setError(''));

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return {
    socket: socketRef.current,
    snapshot,
    status,
    activeItem,
    voteTotal,
    reveal,
    revealed,
    comparison,
    error,
  };
}
