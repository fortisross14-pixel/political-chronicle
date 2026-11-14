// Trinket slots: tap an empty slot to pick a trinket from your collection (filtered by when it fires).
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { getTrinket, TRINKET_WINDOW_LABEL } from '../../data';
import type { Trinket, TrinketWindow } from '../../data';
import { ownedTrinkets, trinketSlots } from '../../engine';
import type { Profile } from '../../engine';
import { Painted } from '../cards/CardArt';
import { RARITY_LABEL } from '../cards/CardViews';
import { cue } from '../fx/sound';

interface Props {
  profile: Profile;
  trinkets: string[];
  onTrinkets: (ids: string[]) => void;
  pure?: boolean;
}

const ORDER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 } as const;
const FILTERS: (TrinketWindow | 'all')[] = ['all', 'campaign', 'mobilize', 'lateVoters', 'governing', 'passive'];

function TrinketTile({ t, onClick, label }: { t: Trinket; onClick: () => void; label?: string }) {
  return (
    <button type="button" className={`trinket-pick r-${t.rarity}`} onClick={onClick} aria-label={label ?? t.name}>
      <span className="trinket-pick-art" aria-hidden="true">
        <Painted id={t.id} />
      </span>
      <span className="trinket-meta">
        <span className={`rarity-dot r-${t.rarity}`} aria-hidden="true" />
        {RARITY_LABEL[t.rarity]} · {TRINKET_WINDOW_LABEL[t.window]}
        {t.uses > 0 ? ` · ${t.uses}×` : ''}
      </span>
      <strong>{t.name}</strong>
      <span className="small muted">{t.text}</span>
    </button>
  );
}

/** Pick the trinkets to bring into this try. */
export function Loadout({ profile, trinkets, onTrinkets, pure }: Props) {
  const slots = trinketSlots(profile);
  const [picking, setPicking] = useState<number | null>(null);
  const [filter, setFilter] = useState<TrinketWindow | 'all'>('all');
  const owned = ownedTrinkets(profile)
    .map(getTrinket)
    .sort((a, b) => ORDER[b.rarity] - ORDER[a.rarity] || a.name.localeCompare(b.name));
  const choices = owned.filter((t) => !trinkets.includes(t.id) && (filter === 'all' || t.window === filter));
  const put = (slot: number, id: string) => {
    cue('deal');
    const next = [...trinkets];
    next[slot] = id;
    onTrinkets(next.filter(Boolean));
    setPicking(null);
  };

  if (pure) return <p className="muted small">This mission is played pure: no trinkets.</p>;
  return (
    <div className="stack">
      <div className="panel-head">
        <h3>Trinkets</h3>
        <span className="muted small">
          {trinkets.length}/{slots} · {owned.length} owned
        </span>
      </div>
      <div className="trinket-slots">
        {Array.from({ length: slots }, (_, i) => {
          const id = trinkets[i];
          if (!id)
            return (
              <button
                key={i}
                type="button"
                className="trinket-slot empty"
                aria-label={`Trinket slot ${i + 1}: pick a trinket`}
                onClick={() => setPicking(Math.min(i, trinkets.length))}
              >
                <span className="plus" aria-hidden="true">
                  +
                </span>
                <span className="small">Pick a trinket</span>
              </button>
            );
          const t = getTrinket(id);
          return (
            <div key={i} className="trinket-slot filled">
              <TrinketTile t={t} onClick={() => setPicking(i)} label={`${t.name}: change`} />
              <button
                type="button"
                className="trinket-remove"
                aria-label={`Remove ${t.name}`}
                onClick={() => onTrinkets(trinkets.filter((x) => x !== id))}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {picking !== null &&
        createPortal(
          <div className="overlay" role="dialog" aria-modal="true" aria-label="Pick a trinket" onClick={() => setPicking(null)}>
            <div className="overlay-sheet trinket-picker" onClick={(e) => e.stopPropagation()}>
              <div className="sheet-head">
                <h2>Pick a trinket</h2>
                <button onClick={() => setPicking(null)}>Close</button>
              </div>
              <div className="segmented filter-row" role="group" aria-label="When it works">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={filter === f ? 'active' : undefined}
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                  >
                    {f === 'all' ? 'All' : TRINKET_WINDOW_LABEL[f]}
                  </button>
                ))}
              </div>
              <div className="trinket-grid">
                {choices.map((t) => (
                  <TrinketTile key={t.id} t={t} onClick={() => put(picking, t.id)} />
                ))}
                {!choices.length && <p className="muted small">Nothing here yet: earn more trinkets with mission stars.</p>}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
