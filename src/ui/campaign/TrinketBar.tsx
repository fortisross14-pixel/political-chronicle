// The trinkets you brought, with a button for each one that can fire right now.
import { ART_IDS } from '../../data/artManifest';
import { Painted } from '../cards/CardArt';
import { getOffice, getTrinket, TRINKET_WINDOW_LABEL } from '../../data';
import type { TrinketWindow } from '../../data';
import { policyJurisdiction, trinketError, trinketUsesLeft } from '../../engine';
import type { Action, GameState, RegionId } from '../../engine';
import { useState } from 'react';
import { cue } from '../fx/sound';
import { areaName } from '../format';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
  /** Only these windows (all active windows by default). */
  windows?: TrinketWindow[];
  title?: string;
}

function regionsFor(state: GameState, window: TrinketWindow): RegionId[] {
  if (window === 'governing') return policyJurisdiction(state);
  const officeId = state.night?.officeId ?? state.career.race?.officeId;
  return officeId ? getOffice(officeId).regionIds : [];
}

function AreaPicker({
  regions,
  disabled,
  onUse,
}: {
  regions: RegionId[];
  disabled: (r: RegionId) => boolean;
  onUse: (r: RegionId) => void;
}) {
  const [at, setAt] = useState(regions[0]!);
  return (
    <>
      <select aria-label="Where" value={at} onChange={(e) => setAt(e.target.value)}>
        {regions.map((r) => (
          <option key={r} value={r}>
            {areaName(r)}
          </option>
        ))}
      </select>
      <button className="primary" disabled={disabled(at)} onClick={() => onUse(at)}>
        Use
      </button>
    </>
  );
}

export function TrinketBar({ state, dispatch, windows, title = 'Your trinkets' }: Props) {
  const active = state.artifacts
    .map((id) => getTrinket(id))
    .filter((t) => t.window !== 'passive' && (!windows || windows.includes(t.window)));
  // Show only those that make sense now (usable, or at least in the right moment with uses left).
  const shown = active.filter((t) => {
    const err = trinketError(state, t.id, t.targetsRegion ? regionsFor(state, t.window)[0] : undefined);
    return !err || /Used up|armed/.test(err);
  });
  if (!shown.length) return null;
  const use = (id: string, regionId?: RegionId) => {
    cue('deal');
    dispatch({ type: 'USE_TRINKET', id, regionId });
  };
  return (
    <section className="panel trinket-bar" aria-label={title}>
      <div className="panel-head">
        <h2>{title}</h2>
      </div>
      <div className="trinket-row">
        {shown.map((t) => {
          const left = trinketUsesLeft(state, t.id);
          const regions = t.targetsRegion ? regionsFor(state, t.window) : [];
          return (
            <div key={t.id} className={`trinket-tile r-${t.rarity}${left ? '' : ' spent'}`}>
              <span className="trinket-meta">
                <span className={`rarity-dot r-${t.rarity}`} aria-hidden="true" />
                {TRINKET_WINDOW_LABEL[t.window]} · {left}/{t.uses} left
              </span>
              {ART_IDS.has(t.id) && (
                <span className="trinket-art">
                  <Painted id={t.id} />
                </span>
              )}
              <strong>{t.name}</strong>
              <span className="small muted">{t.text}</span>
              <span className="trinket-actions">
                {t.targetsRegion && regions.length > 3 ? (
                  <AreaPicker regions={regions} disabled={(r) => !!trinketError(state, t.id, r)} onUse={(r) => use(t.id, r)} />
                ) : t.targetsRegion ? (
                  regions.map((r) => (
                    <button key={r} disabled={!!trinketError(state, t.id, r)} onClick={() => use(t.id, r)}>
                      {regions.length > 1 ? areaName(r) : 'Use'}
                    </button>
                  ))
                ) : (
                  <button className="primary" disabled={!!trinketError(state, t.id)} onClick={() => use(t.id)}>
                    Use
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
