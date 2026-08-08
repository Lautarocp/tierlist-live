import { API_URL, Item, Tier } from '../api';
import { useT } from '../i18n';
import { Comparison } from '../live';

function ItemThumb({ item, matched }: { item: Item; matched: boolean }) {
  return (
    <div
      className={`w-14 shrink-0 text-center ${
        matched ? '' : 'opacity-90'
      }`}
      title={item.name}
    >
      {item.imageUrl ? (
        <img
          src={`${API_URL}${item.imageUrl}`}
          alt={item.name}
          className={`w-14 h-14 object-cover rounded border-2 ${
            matched ? 'border-emerald-400' : 'border-zinc-700'
          }`}
        />
      ) : (
        <div
          className={`w-14 h-14 rounded bg-zinc-800 border-2 flex items-center justify-center text-xs p-1 overflow-hidden ${
            matched ? 'border-emerald-400' : 'border-zinc-700'
          }`}
        >
          {item.name}
        </div>
      )}
    </div>
  );
}

function TierGrid(props: {
  title: string;
  tiers: Tier[];
  placement: (tierId: string) => { item: Item; match: boolean }[];
}) {
  const { title, tiers, placement } = props;
  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-center font-bold text-lg mb-2">{title}</h3>
      <div className="space-y-1">
        {tiers.map((tier) => (
          <div key={tier.id} className="flex items-stretch gap-1">
            <span
              className="w-10 shrink-0 rounded flex items-center justify-center font-bold text-zinc-900"
              style={{ backgroundColor: tier.color }}
            >
              {tier.label}
            </span>
            <div className="flex-1 min-h-16 bg-zinc-900 border border-zinc-800 rounded flex flex-wrap gap-1 p-1">
              {placement(tier.id).map(({ item, match }) => (
                <ItemThumb key={item.id} item={item} matched={match} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ComparisonView({
  comparison,
}: {
  comparison: Comparison;
}) {
  const { t } = useT();
  const { tiers, items, matchPct } = comparison;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-zinc-400 uppercase tracking-wide text-sm">
          {t('matchLabel')}
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

      <div className="flex flex-col lg:flex-row gap-6">
        <TierGrid
          title={t('streamerBoard')}
          tiers={tiers}
          placement={(tierId) =>
            items
              .filter((e) => e.streamerTierId === tierId)
              .map((e) => ({ item: e.item, match: e.match }))
          }
        />
        <TierGrid
          title={t('chatBoard')}
          tiers={tiers}
          placement={(tierId) =>
            items
              .filter((e) => e.chatTierId === tierId)
              .map((e) => ({ item: e.item, match: e.match }))
          }
        />
      </div>

      <p className="text-center text-sm text-zinc-500">{t('greenBorderNote')}</p>
    </div>
  );
}
