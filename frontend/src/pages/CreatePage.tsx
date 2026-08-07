import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Cog } from 'lucide-react';
import QRCode from 'qrcode';
import { addItem, createSession, createTierList, Session, uid } from '../api';
import { useT } from '../i18n';

const TIER_COLORS = [
  '#ff7f7f', '#ffbf7f', '#ffdf7f', '#ffff7f', '#bfff7f',
  '#7fff7f', '#7fffff', '#7fbfff', '#7f7fff', '#bf7fbf', '#a1a1aa',
];

const DEFAULT_TIERS = [
  { label: 'S', color: '#ff7f7f' },
  { label: 'A', color: '#ffbf7f' },
  { label: 'B', color: '#ffdf7f' },
  { label: 'C', color: '#ffff7f' },
  { label: 'D', color: '#7fff7f' },
];

interface TierDraft { label: string; color: string; }
interface StagedItem { key: string; name: string; file: File; previewUrl: string; }

function nameFromFile(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
}

export default function CreatePage() {
  const { t } = useT();
  const [title, setTitle] = useState('');
  const [tiers, setTiers] = useState<TierDraft[]>(DEFAULT_TIERS);
  const [items, setItems] = useState<StagedItem[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  function addFiles(files: FileList | File[]) {
    setError('');
    const all = [...files];
    if (all.length === 0) {
      setError(t('dragFromWebError'));
      return;
    }
    const valid = all.filter((f) => /^image\/(png|jpe?g|webp|gif)$/.test(f.type));
    const rejected = all.length - valid.length;
    if (rejected > 0) {
      const s = rejected === 1 ? '' : 's';
      setError(t('unsupportedFiles', {
        n: rejected,
        s,
        types: all.filter((f) => !valid.includes(f)).map((f) => f.type || 'unknown').join(', '),
      }));
    }
    const staged = valid.map((file) => ({
      key: uid(), name: nameFromFile(file), file, previewUrl: URL.createObjectURL(file),
    }));
    setItems((prev) => [...prev, ...staged]);
  }

  function removeItem(key: string) {
    setItems((prev) => {
      const item = prev.find((i) => i.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.key !== key);
    });
  }

  async function handleLaunch() {
    setError('');
    try {
      setProgress(t('creatingTierList'));
      const tierList = await createTierList(title, tiers.map((t, i) => ({ ...t, position: i })));
      for (let i = 0; i < items.length; i++) {
        setProgress(t('uploadingItems', { i: i + 1, n: items.length }));
        await addItem(tierList.id, items[i].name, items[i].file);
      }
      setProgress(t('creatingSession'));
      const s = await createSession(tierList.id);
      localStorage.setItem(`streamerToken:${s.code}`, s.streamerToken);
      setSession(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress('');
    }
  }

  const missing = [
    !title.trim() && t('missingTitle'),
    items.length === 0 && t('missingItems'),
    tiers.length < 2 && t('missingTiers'),
    tiers.some((t) => !t.label.trim()) && t('missingTierName'),
  ].filter((m): m is string => !!m);

  const canLaunch = !progress && missing.length === 0;

  if (session) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-2xl mx-auto">
          <SessionInfo session={session} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('titlePlaceholder')}
          className="w-full bg-transparent text-center text-3xl font-bold placeholder-zinc-600 border-b-2 border-zinc-800 focus:border-purple-500 focus:outline-none pb-2"
        />

        {error && (
          <p className="bg-red-900/50 border border-red-700 rounded px-4 py-2">{error}</p>
        )}

        <TierRows tiers={tiers} setTiers={setTiers} />
        <ImageBank items={items} addFiles={addFiles} removeItem={removeItem} />

        <button
          onClick={handleLaunch}
          disabled={!canLaunch}
          className="w-full py-4 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed font-black text-xl"
        >
          {progress || t('startLive')}
        </button>
        {missing.length > 0 && (
          <p className="text-center text-sm text-yellow-500/90 -mt-3">
            {t('toStart')} {missing.join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}

function TierRows(props: { tiers: TierDraft[]; setTiers: (v: TierDraft[]) => void }) {
  const { tiers, setTiers } = props;
  const { t } = useT();
  const [editing, setEditing] = useState<number | null>(null);

  function update(i: number, patch: Partial<TierDraft>) {
    setTiers(tiers.map((tier, j) => (j === i ? { ...tier, ...patch } : tier)));
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= tiers.length) return;
    const next = [...tiers];
    [next[i], next[j]] = [next[j], next[i]];
    setTiers(next);
    if (editing === i) setEditing(j);
    else if (editing === j) setEditing(i);
  }

  function remove(i: number) {
    setTiers(tiers.filter((_, j) => j !== i));
    setEditing(null);
  }

  return (
    <div className="border border-zinc-700 rounded overflow-hidden">
      {tiers.map((tier, i) => {
        const isEditing = editing === i;
        return (
          <div
            key={i}
            className="flex items-stretch border-b border-zinc-950 last:border-b-0"
            style={{ minHeight: isEditing ? '4rem' : '5rem' }}
          >
            {/* Bloque de color: label estático o input inline */}
            <div
              className="w-24 sm:w-28 shrink-0 flex items-center justify-center p-2"
              style={{ backgroundColor: tier.color }}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={tier.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder={t('tierNamePlaceholder')}
                  className="w-full bg-transparent font-bold text-zinc-900 text-center placeholder-zinc-600 focus:outline-none"
                />
              ) : (
                <span className="font-bold text-zinc-900 text-center break-words leading-tight">
                  {tier.label}
                </span>
              )}
            </div>

            {/* Área central: placeholder de items o paleta de colores */}
            <div className="flex-1 bg-zinc-800 flex items-center px-3 gap-2 flex-wrap min-w-0">
              {isEditing ? (
                <>
                  {TIER_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => update(i, { color: c })}
                      className={`w-6 h-6 rounded shrink-0 ${tier.color === c ? 'ring-2 ring-white' : 'hover:ring-1 hover:ring-zinc-400'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={tier.color}
                    onChange={(e) => update(i, { color: e.target.value })}
                    title="Color personalizado"
                    className="w-6 h-6 rounded cursor-pointer bg-transparent shrink-0"
                  />
                  <button
                    onClick={() => remove(i)}
                    disabled={tiers.length <= 2}
                    className="ml-auto text-red-400 hover:text-red-300 disabled:opacity-30 text-sm shrink-0"
                  >
                    {t('deleteTier')}
                  </button>
                </>
              ) : (
                i === 0 && (
                  <span className="text-zinc-600 text-sm select-none">
                    {t('tierPlaceholder')}
                  </span>
                )
              )}
            </div>

            {/* Controles */}
            <div className="w-16 shrink-0 bg-zinc-900 flex flex-row items-center justify-center gap-1 text-zinc-400 px-1">
              <button
                onClick={() => setEditing(isEditing ? null : i)}
                title={t('editTier')}
                className={`hover:text-zinc-100 ${isEditing ? 'text-purple-400' : ''}`}
              >
                <Cog size={22} />
              </button>
              <div className="flex flex-col items-center">
                <button onClick={() => move(i, -1)} disabled={i === 0} title={t('moveUp')} className="hover:text-zinc-100 disabled:opacity-20">
                  <ChevronUp size={22} />
                </button>
                <button onClick={() => move(i, 1)} disabled={i === tiers.length - 1} title={t('moveDown')} className="hover:text-zinc-100 disabled:opacity-20">
                  <ChevronDown size={22} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <button
        onClick={() => {
          setTiers([...tiers, { label: '', color: TIER_COLORS[tiers.length % TIER_COLORS.length] }]);
          setEditing(tiers.length);
        }}
        className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-sm"
      >
        {t('addTier')}
      </button>
    </div>
  );
}

function ImageBank(props: {
  items: StagedItem[];
  addFiles: (files: FileList | File[]) => void;
  removeItem: (key: string) => void;
}) {
  const { items, addFiles, removeItem } = props;
  const { t } = useT();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
      className={`rounded border-2 border-dashed p-4 transition-colors ${
        dragOver ? 'border-purple-400 bg-purple-500/10' : 'border-zinc-700 bg-zinc-900/50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-zinc-400 text-sm">{t('imageBankLabel', { n: items.length })}</p>
        <button
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 font-bold text-sm"
        >
          {t('uploadImages')}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {items.length === 0 ? (
        <p className="text-center text-zinc-600 py-8 select-none">{t('noItems')}</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {items.map((item) => (
            <div key={item.key} className="w-20 group relative">
              <img src={item.previewUrl} alt={item.name} className="w-20 h-20 object-cover rounded" />
              <button
                onClick={() => removeItem(item.key)}
                title={t('removeItem')}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-xs leading-none hidden group-hover:block"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionInfo({ session }: { session: Session }) {
  const { t } = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const voteUrl = `${window.location.origin}/vote/${session.code}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, voteUrl, { width: 200, margin: 1 });
    }
  }, [voteUrl]);

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 text-center space-y-4">
      <p className="text-zinc-400">{t('sessionCode')}</p>
      <p className="text-5xl font-mono font-bold tracking-widest text-purple-400">{session.code}</p>
      <a href={voteUrl} className="block text-purple-400 hover:text-purple-300 underline break-all">
        {voteUrl}
      </a>
      <div className="flex justify-center">
        <canvas ref={canvasRef} className="rounded-lg bg-white p-1" />
      </div>
      <a
        href={`/host/${session.code}`}
        className="inline-block px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold"
      >
        {t('goToHost')}
      </a>
    </div>
  );
}
