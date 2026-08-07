import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL, Item, uid } from '../api';
import ComparisonView from '../components/ComparisonView';
import RevealBars from '../components/RevealBars';
import { useLiveSession } from '../live';

function getVoterId(): string {
  let id = localStorage.getItem('voterId');
  if (!id) {
    id = uid();
    localStorage.setItem('voterId', id);
  }
  return id;
}

function loadMyVotes(code: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(`myVotes:${code}`) ?? '{}');
  } catch {
    return {};
  }
}

export default function VotePage() {
  const { code = '' } = useParams();
  const voterId = useMemo(getVoterId, []);
  const live = useLiveSession(code, { role: 'viewer', voterId });
  const [myVotes, setMyVotes] = useState<Record<string, string>>(() =>
    loadMyVotes(code),
  );

  useEffect(() => {
    localStorage.setItem(`myVotes:${code}`, JSON.stringify(myVotes));
  }, [code, myVotes]);

  useEffect(() => {
    if (!live.snapshot) return;
    for (const item of live.snapshot.tierList.items) {
      if (item.imageUrl) {
        const img = new Image();
        img.src = `${API_URL}${item.imageUrl}`;
      }
    }
  }, [live.snapshot?.tierList.id]);

  function castVote(itemId: string, tierId: string) {
    // Optimista: bloquear el doble voto al instante, revertir si el server lo rechaza
    setMyVotes((v) => ({ ...v, [itemId]: tierId }));
    live.socket?.emit(
      'vote',
      { code, itemId, tierId, voterId },
      (res: { ok: boolean; reason?: string }) => {
        if (!res.ok && res.reason !== 'ALREADY_VOTED') {
          setMyVotes((v) => {
            const { [itemId]: _, ...rest } = v;
            return rest;
          });
        }
      },
    );
  }

  if (live.error) {
    return (
      <Shell code={code}>
        <p className="text-red-400 text-center text-lg mt-16">{live.error}</p>
      </Shell>
    );
  }
  if (!live.snapshot) {
    return (
      <Shell code={code}>
        <p className="text-zinc-400 text-center mt-16">Conectando...</p>
      </Shell>
    );
  }

  const tiers = live.snapshot.tierList.tiers;

  return (
    <Shell code={code} title={live.snapshot.tierList.title}>
      {live.status === 'FINISHED' && live.comparison ? (
        <ComparisonView comparison={live.comparison} />
      ) : live.status === 'LOBBY' ? (
        <div className="text-center mt-16 space-y-3">
          <p className="text-2xl">⏳</p>
          <p className="text-zinc-300 text-lg">
            Esperando a que el streamer comience...
          </p>
        </div>
      ) : live.activeItem ? (
        <ActiveVote
          item={live.activeItem}
          myTierId={myVotes[live.activeItem.id]}
          voteTotal={live.voteTotal}
          tiers={tiers}
          onVote={(tierId) => castVote(live.activeItem!.id, tierId)}
        />
      ) : live.reveal ? (
        <RevealSection
          reveal={live.reveal}
          tiers={tiers}
          myTierId={myVotes[live.reveal.itemId]}
        />
      ) : (
        <p className="text-zinc-400 text-center mt-16">
          Esperando el próximo item...
        </p>
      )}
    </Shell>
  );
}

function Shell(props: {
  code: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4">
      <div className="max-w-md mx-auto">
        <header className="flex items-baseline justify-between mb-6">
          <h1 className="font-bold truncate">{props.title ?? 'Tier List Live'}</h1>
          <span className="font-mono text-purple-400 tracking-widest shrink-0 ml-2">
            {props.code}
          </span>
        </header>
        {props.children}
      </div>
    </div>
  );
}

function ActiveVote(props: {
  item: Item;
  myTierId?: string;
  voteTotal: number;
  tiers: { id: string; label: string; color: string }[];
  onVote: (tierId: string) => void;
}) {
  const { item, myTierId, voteTotal, tiers, onVote } = props;
  const voted = !!myTierId;

  return (
    <div className="space-y-6">
      <div className="text-center">
        {item.imageUrl ? (
          <img
            src={`${API_URL}${item.imageUrl}`}
            alt={item.name}
            className="w-40 h-40 object-cover rounded-xl mx-auto"
          />
        ) : (
          <div className="w-40 h-40 rounded-xl bg-zinc-800 mx-auto flex items-center justify-center text-4xl">
            🖼
          </div>
        )}
      </div>

      {voted ? (
        <div className="text-center space-y-2">
          <p className="text-emerald-400 font-bold text-lg">✓ Voto registrado</p>
          <p className="text-zinc-400">
            Esperando a que el streamer decida...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <p className="text-center text-zinc-400 text-sm uppercase tracking-wide">
            ¿En qué tier va?
          </p>
          {tiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => onVote(tier.id)}
              className="py-3 rounded-lg font-black text-xl text-zinc-900 active:scale-95 transition-transform"
              style={{ backgroundColor: tier.color }}
            >
              {tier.label}
            </button>
          ))}
        </div>
      )}

      <p className="text-center text-3xl font-black text-purple-400">
        {voteTotal}
        <span className="text-sm font-normal text-zinc-400 ml-2">
          voto{voteTotal === 1 ? '' : 's'} del chat
        </span>
      </p>
    </div>
  );
}

function RevealSection(props: {
  reveal: {
    streamerTierId: string;
    breakdown: { tierId: string; count: number; pct: number }[];
    totalVotes: number;
  };
  tiers: { id: string; label: string; color: string; position: number }[];
  myTierId?: string;
}) {
  const { reveal, tiers, myTierId } = props;
  const streamerTier = tiers.find((t) => t.id === reveal.streamerTierId);
  const matched = myTierId === reveal.streamerTierId;

  return (
    <div className="space-y-5">

      <RevealBars
        tiers={tiers}
        breakdown={reveal.breakdown}
        totalVotes={reveal.totalVotes}
        streamerTierId={reveal.streamerTierId}
      />
      {myTierId ? (
        matched ? (
          <p className="text-center text-emerald-400 font-bold text-lg">
            🎯 ¡Coincidiste con el streamer!
          </p>
        ) : (
          <p className="text-center text-zinc-300">
            El streamer la puso en{' '}
            <span
              className="inline-block px-2 rounded font-bold text-zinc-900"
              style={{ backgroundColor: streamerTier?.color }}
            >
              {streamerTier?.label}
            </span>{' '}
            — vos votaste distinto
          </p>
        )
      ) : (
        <p className="text-center text-zinc-500">No votaste este item</p>
      )}
      <p className="text-center text-zinc-500 text-sm">
        Esperando el próximo item...
      </p>
    </div>
  );
}
