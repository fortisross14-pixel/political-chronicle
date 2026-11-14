import { ART_IDS } from '../../data/artManifest';
import { Painted } from '../cards/CardArt';
import { getTrinket, TRINKET_WINDOW_LABEL } from '../../data';
import { ownedTrinkets, trinketSlots } from '../../engine';
import type { Profile } from '../../engine';
import { RARITY_LABEL } from '../cards/CardViews';

interface Props {
  profile: Profile;
  trinkets: string[];
  onTrinkets: (ids: string[]) => void;
  pure?: boolean;
}

const ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 } as const;

/** Pick the trinkets to bring into this try. */
export function Loadout({ profile, trinkets, onTrinkets, pure }: Props) {
  const slots = trinketSlots(profile);
  const owned = ownedTrinkets(profile).sort((a, b) => ORDER[getTrinket(a).rarity] - ORDER[getTrinket(b).rarity]);
  const toggle = (id: string) => {
    if (trinkets.includes(id)) onTrinkets(trinkets.filter((x) => x !== id));
    else if (trinkets.length < slots) onTrinkets([...trinkets, id]);
  };
  return (
    <div className="stack">
      <div className="panel-head">
        <h3>Trinkets</h3>
        <span className="muted small">
          {trinkets.length}/{slots} slots · more at 6 and 10 stars
        </span>
      </div>
      {pure ? (
        <p className="muted small">This mission is played pure: no trinkets.</p>
      ) : (
        <div className="loadout-grid">
          {owned.map((id) => {
            const t = getTrinket(id);
            const on = trinkets.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`loadout-card trinket r-${t.rarity}${on ? ' on' : ''}`}
                aria-pressed={on}
                disabled={!on && trinkets.length >= slots}
                onClick={() => toggle(id)}
              >
                <span className="trinket-meta">
                  <span className={`rarity-dot r-${t.rarity}`} aria-hidden="true" />
                  {RARITY_LABEL[t.rarity]} · {TRINKET_WINDOW_LABEL[t.window]}
                  {t.uses > 0 ? ` · ${t.uses}×` : ''}
                </span>
                {ART_IDS.has(t.id) && (
                  <span className="trinket-art">
                    <Painted id={t.id} />
                  </span>
                )}
                <strong>{t.name}</strong>
                <span className="small muted">{t.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
