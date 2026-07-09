import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL, Item, Tier } from '../api';
import { Odometer } from '../components/RevealBars';
import { Comparison, RevealedItem, useLiveSession } from '../live';

export default function HostPage() {
  const { code = '' } = useParams();
  const token = localStorage.getItem(`streamerToken:${code}`) ?? undefined;
  const live = useLiveSession(code, { role: 'streamer', token });
  const [actionError, setActionError] = useState('');
  const [noItemsLeft, setNoItemsLeft] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const itemsById = useMemo(
    () => new Map(live.snapshot?.tierList.items.map((i) => [i.id, i]) ?? []),
    [live.snapshot],
  );

  function emitAck(event: string, payload: object) {
    setActionError('');
    live.socket?.emit(event, payload, (res: { error?: string }) => {
      if (res?.error === 'NO_ITEMS_LEFT') setNoItemsLeft(true);
      else if (res?.error) setActionError(res.error);
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || !live.activeItem) return;
    emitAck('resolveItem', {
      code,
      itemId: live.activeItem.id,
      tierId: e.over.id,
    });
  }

  if (!token) {
    return (
      <Shell>
        <p className="text-red-400 text-xl text-center mt-20">
          No hay token de streamer para esta sesión en este navegador.
        </p>
      </Shell>
    );
  }
  if (live.error) {
    return (
      <Shell>
        <p className="text-red-400 text-xl text-center mt-20">{live.error}</p>
      </Shell>
    );
  }
  if (!live.snapshot) {
    return (
      <Shell>
        <p className="text-zinc-400 text-center mt-20">Conectando...</p>
      </Shell>
    );
  }

  const { tierList } = live.snapshot;
  const resolvedCount = live.revealed.length;
  const totalItems = tierList.items.length;
  const finished = live.status === 'FINISHED';

  return (
    <Shell>
      <header className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
        <h1 className="text-2xl font-bold">{tierList.title}</h1>
        <div className="flex items-center gap-4 text-zinc-400">
          <span>
            Código:{' '}
            <span className="font-mono font-bold text-purple-400 text-xl tracking-widest">
              {code}
            </span>
          </span>
          <span>
            {resolvedCount}/{totalItems} items
          </span>
        </div>
      </header>

      {actionError && (
        <p className="mb-4 bg-red-900/50 border border-red-700 rounded px-4 py-2">
          {actionError}
        </p>
      )}

      {finished && live.comparison ? (
        <ResultsBoards comparison={live.comparison} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-1 mb-8">
            {tierList.tiers.map((tier) => (
              <TierRow
                key={tier.id}
                tier={tier}
                items={live.revealed
                  .filter((r) => r.streamerTierId === tier.id)
                  .map((r) => itemsById.get(r.itemId))
                  .filter((i): i is Item => !!i)}
                droppable={!!live.activeItem}
                reveal={live.reveal}
              />
            ))}
          </div>

          <CenterZone
            live={live}
            code={code}
            noItemsLeft={noItemsLeft}
            itemsById={itemsById}
            onStart={() => emitAck('startSession', { code })}
            onNext={() => emitAck('nextItem', { code })}
            onFinish={() => emitAck('finishSession', { code })}
          />
        </DndContext>
      )}
    </Shell>
  );
}

function ResultsBoards({ comparison }: { comparison: Comparison }) {
  const { tiers, items, matchPct } = comparison;

  const board = (title: string, tierOf: (e: (typeof items)[number]) => string) => (
    <div>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <div className="space-y-1">
        {tiers.map((tier) => (
          <div key={tier.id} className="flex items-stretch gap-1">
            <span
              className="w-14 shrink-0 rounded flex items-center justify-center text-2xl font-black text-zinc-900"
              style={{ backgroundColor: tier.color }}
            >
              {tier.label}
            </span>
            <div className="flex-1 min-h-16 rounded border border-zinc-800 bg-zinc-900 flex flex-wrap items-center gap-1 p-1">
              {items
                .filter((e) => tierOf(e) === tier.id)
                .map((e) => (
                  <div key={e.item.id} className="w-14 text-center" title={e.item.name}>
                    {e.item.imageUrl ? (
                      <img
                        src={`${API_URL}${e.item.imageUrl}`}
                        alt={e.item.name}
                        className={`w-14 h-14 object-cover rounded ${
                          e.match ? 'ring-2 ring-emerald-400' : ''
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-14 h-14 rounded bg-zinc-800 flex items-center justify-center text-[10px] p-1 overflow-hidden ${
                          e.match ? 'ring-2 ring-emerald-400' : ''
                        }`}
                      >
                        {e.item.name}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-zinc-400 uppercase tracking-wide text-sm">
          Coincidencia streamer vs chat
        </p>
        <p
          className={`text-6xl font-black ${
            matchPct >= 70
              ? 'text-emerald-400'
              : matchPct >= 40
                ? 'text-yellow-400'
                : 'text-red-400'
          }`}
        >
          {matchPct}%
        </p>
      </div>
      {board('Streamer', (e) => e.streamerTierId)}
      {board('Chat', (e) => e.chatTierId)}
      <p className="text-center text-sm text-zinc-500">
        Los items con borde verde coinciden en ambas listas
      </p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto">{children}</div>
    </div>
  );
}

function TierRow({
  tier,
  items,
  droppable,
  reveal,
}: {
  tier: Tier;
  items: Item[];
  droppable: boolean;
  reveal: RevealedItem | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: tier.id });
  const entry = reveal?.breakdown.find((b) => b.tierId === tier.id);
  const maxPct = reveal ? Math.max(...reveal.breakdown.map((b) => b.pct)) : 0;

  return (
    <div className="flex items-stretch gap-1">
      <span
        className="w-14 shrink-0 rounded flex items-center justify-center text-2xl font-black text-zinc-900"
        style={{ backgroundColor: tier.color }}
      >
        {tier.label}
      </span>
      <div
        ref={setNodeRef}
        className={`relative overflow-hidden flex-1 min-h-16 rounded border flex flex-wrap items-center gap-1 p-1 transition-colors ${
          isOver
            ? 'border-purple-400 bg-purple-500/20'
            : droppable
              ? 'border-zinc-600 border-dashed bg-zinc-900'
              : 'border-zinc-800 bg-zinc-900'
        }`}
      >
        {reveal && entry && (
          <RowFill
            key={reveal.itemId}
            pct={entry.pct}
            count={entry.count}
            color={tier.color}
            isWinner={reveal.totalVotes > 0 && entry.pct === maxPct && entry.pct > 0}
          />
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="relative z-10 w-14 text-center"
            title={item.name}
          >
            {item.imageUrl ? (
              <img
                src={`${API_URL}${item.imageUrl}`}
                alt={item.name}
                className="w-14 h-14 object-cover rounded"
              />
            ) : (
              <div className="w-14 h-14 rounded bg-zinc-800 flex items-center justify-center text-[10px] p-1 overflow-hidden">
                {item.name}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RowFill({
  pct,
  count,
  color,
  isWinner,
}: {
  pct: number;
  count: number;
  color: string;
  isWinner: boolean;
}) {
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setStarted(true)),
    );
    const t = window.setTimeout(() => setDone(true), 1600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);

  return (
    <>
      <div
        className={`battery-fill absolute inset-y-0 left-0 opacity-60 ${
          done && isWinner ? 'reveal-winner' : ''
        }`}
        style={{ width: started ? `${pct}%` : '0%', backgroundColor: color }}
      />
      <span className="absolute inset-y-0 right-2 z-10 flex items-center gap-2 font-mono font-bold">
        {started ? <Odometer target={pct} /> : '0%'}
        <span className="text-xs font-normal text-zinc-400">
          ({count} voto{count === 1 ? '' : 's'})
        </span>
      </span>
    </>
  );
}

function DraggableItem({ item }: { item: Item }) {
  const { setNodeRef, attributes, listeners, transform, isDragging } =
    useDraggable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
      className={`inline-flex flex-col items-center gap-2 bg-zinc-900 border-2 border-purple-500 rounded-xl p-4 cursor-grab touch-none select-none ${
        isDragging ? 'opacity-80 z-50 relative' : ''
      }`}
    >
      {item.imageUrl ? (
        <img
          src={`${API_URL}${item.imageUrl}`}
          alt={item.name}
          className="w-32 h-32 object-cover rounded-lg pointer-events-none"
        />
      ) : (
        <div className="w-32 h-32 rounded-lg bg-zinc-800 flex items-center justify-center text-3xl">
          🖼
        </div>
      )}
      <p className="text-xl font-bold">{item.name}</p>
    </div>
  );
}

function CenterZone(props: {
  live: ReturnType<typeof useLiveSession>;
  code: string;
  noItemsLeft: boolean;
  itemsById: Map<string, Item>;
  onStart: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  const { live, noItemsLeft, itemsById, onStart, onNext, onFinish } = props;

  if (live.status === 'LOBBY') {
    return (
      <div className="text-center space-y-4">
        <p className="text-zinc-400">
          Compartí el código con tu audiencia y arrancá cuando quieras.
        </p>
        <button
          onClick={onStart}
          className="px-10 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 font-black text-2xl"
        >
          COMENZAR
        </button>
      </div>
    );
  }

  if (live.activeItem) {
    return (
      <div className="text-center space-y-4">
        <p className="text-zinc-400 uppercase tracking-wide text-sm">
          Arrastrá el item a una tier para revelar los votos
        </p>
        <DraggableItem item={live.activeItem} />
        <p className="text-5xl font-black text-purple-400">
          {live.voteTotal}
          <span className="text-lg font-normal text-zinc-400 ml-2">
            voto{live.voteTotal === 1 ? '' : 's'}
          </span>
        </p>
      </div>
    );
  }

  if (live.reveal) {
    const item = itemsById.get(live.reveal.itemId);
    return (
      <div className="space-y-4 max-w-xl mx-auto">
        <p className="text-center text-xl font-bold">
          Así votó el chat{item ? ` “${item.name}”` : ''} —{' '}
          {live.reveal.totalVotes} voto
          {live.reveal.totalVotes === 1 ? '' : 's'}
        </p>
        <div className="flex justify-center gap-3">
          {!noItemsLeft ? (
            <button
              onClick={onNext}
              className="px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-lg"
            >
              Siguiente item →
            </button>
          ) : (
            <p className="text-yellow-400 self-center">No quedan items.</p>
          )}
          <button
            onClick={onFinish}
            className="px-8 py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 font-bold text-lg"
          >
            Finalizar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center space-y-4">
      <button
        onClick={onNext}
        className="px-8 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-lg"
      >
        Siguiente item →
      </button>
      <button
        onClick={onFinish}
        className="block mx-auto text-zinc-400 hover:text-zinc-200 underline"
      >
        Finalizar sesión
      </button>
    </div>
  );
}
