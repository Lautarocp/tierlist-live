import { useEffect, useRef, useState } from 'react';
import { Tier } from '../api';
import { BreakdownEntry } from '../live';

const DURATION_MS = 1500;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function Odometer({ target }: { target: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / DURATION_MS, 1);
      setValue(Math.round(easeOutCubic(t) * target));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return <>{value}%</>;
}

export default function RevealBars(props: {
  tiers: Tier[];
  breakdown: BreakdownEntry[];
  totalVotes: number;
  streamerTierId: string;
}) {
  const { tiers, breakdown, totalVotes, streamerTierId } = props;
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const timeouts = useRef<number[]>([]);

  const byTier = new Map(breakdown.map((b) => [b.tierId, b]));
  const maxPct = Math.max(...breakdown.map((b) => b.pct));

  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setStarted(true)),
    );
    timeouts.current.push(
      window.setTimeout(() => setDone(true), DURATION_MS + 100),
    );
    return () => {
      cancelAnimationFrame(raf);
      timeouts.current.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="space-y-2 w-full">
      {tiers.map((tier) => {
        const entry = byTier.get(tier.id);
        const pct = entry?.pct ?? 0;
        const isWinner = totalVotes > 0 && pct === maxPct && pct > 0;
        return (
          <div key={tier.id} className="flex items-center gap-2">
            <span
              className="w-9 h-9 shrink-0 rounded flex items-center justify-center font-bold text-zinc-900"
              style={{ backgroundColor: tier.color }}
            >
              {tier.label}
            </span>
            <div
              className={`relative flex-1 h-9 bg-zinc-800/80 rounded overflow-hidden border border-zinc-700 ${
                done && isWinner ? 'reveal-winner' : ''
              }`}
            >
              <div
                className="battery-fill h-full"
                style={{
                  width: started ? `${pct}%` : '0%',
                  backgroundColor: tier.color,
                }}
              />
              <span className="absolute inset-y-0 right-2 flex items-center text-sm font-mono font-bold">
                {started ? <Odometer target={pct} /> : '0%'}
              </span>
              {tier.id === streamerTierId && (
                <span
                  className="absolute inset-y-0 left-2 flex items-center text-xs font-bold uppercase tracking-wide text-white/90"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,.8)' }}
                >
                  ★ streamer
                </span>
              )}
            </div>
          </div>
        );
      })}
      <p className="text-right text-sm text-zinc-400">
        {totalVotes} voto{totalVotes === 1 ? '' : 's'}
      </p>
    </div>
  );
}
