import { useEffect, useRef, useState } from 'react';
import { API_URL } from './api';

const RETRY_MS = 3000;
const TIMEOUT_MS = 5000;

async function pingHealth(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export function useBackendReady() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function attempt() {
      const ok = await pingHealth();
      if (cancelled) return;
      if (ok) {
        setReady(true);
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        setReady(false);
        timerRef.current = setInterval(async () => {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
          const ok2 = await pingHealth();
          if (cancelled) return;
          if (ok2) {
            setReady(true);
            if (timerRef.current) clearInterval(timerRef.current);
          }
        }, RETRY_MS);
      }
    }

    attempt();
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { ready, elapsed };
}
