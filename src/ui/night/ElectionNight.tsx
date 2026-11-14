import { useEffect, useRef, useState } from 'react';
import { getItem, getOffice, getRegion } from '../../data';
import {
  adBlitzCost,
  adBlitzError,
  counted,
  HOURS,
  lawyersError,
  mobilizeEffect,
  mobilizeError,
  nightFinished,
  nightView,
  reportedShares,
} from '../../engine';
import type { Action, GameState, RegionId } from '../../engine';
import { money, pct } from '../format';
import { StateMap } from '../map/StateMap';

/** Semicircle needle: 0 (left, you lose) → 1 (right, you win). */
function Needle({ p }: { p: number }) {
  const angle = -90 + p * 180;
  return (
    <svg className="needle" viewBox="0 0 200 116" role="img" aria-label={`Win probability ${Math.round(p * 100)}%`}>
      <defs>
        <linearGradient id="needle-arc" x1="0" x2="1">
          <stop offset="0%" stopColor="#e07b39" />
          <stop offset="50%" stopColor="#5a6680" />
          <stop offset="100%" stopColor="#2fb39a" />
        </linearGradient>
      </defs>
      <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="url(#needle-arc)" strokeWidth="16" strokeLinecap="round" />
      <g className="needle-hand" style={{ transform: `rotate(${angle}deg)` }}>
        <line x1="100" y1="100" x2="100" y2="26" stroke="var(--text)" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="100" r="7" fill="var(--text)" />
      <text x="100" y="80" textAnchor="middle" className="needle-label">
        {Math.round(p * 100)}%
      </text>
    </svg>
  );
}

export function ElectionNight({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const night = state.night!;
  const office = getOffice(night.officeId);
  const view = nightView(night);
  const [playing, setPlaying] = useState(true);
  const [selected, setSelected] = useState<RegionId>(office.regionIds[0]!);
  const done = nightFinished(night);
  const names = ['You', ...(state.career.race?.opponents.map((c) => c.name) ?? [])];
  const callSeen = useRef(night.calledFor);
  const [banner, setBanner] = useState<string | null>(null);

  // Auto-play the count.
  useEffect(() => {
    if (!playing || done) return;
    const t = setTimeout(() => dispatch({ type: 'NIGHT_ADVANCE' }), 1100);
    return () => clearTimeout(t);
  }, [playing, done, night.step, dispatch]);

  // "Called!" banner the moment the race is called.
  useEffect(() => {
    if (night.calledFor !== undefined && callSeen.current === undefined) {
      setBanner(night.calledFor === 0 ? 'Projected winner: YOU' : 'Race called for your opponent');
      setPlaying(false);
    }
    callSeen.current = night.calledFor;
  }, [night.calledFor]);

  const nightItems = state.items.filter((i) => getItem(i.itemId).window !== 'campaign');
  const hour = HOURS[Math.min(night.step, HOURS.length - 1)]!;

  return (
    <div className="stack night-screen">
      <section className="panel night-head">
        <div className="panel-head">
          <div>
            <span className="live">● LIVE</span>
            <h2>Election night — {office.name}</h2>
            <span className="muted small">
              {hour} {night.step <= 7 ? 'pm' : 'am'} · {pct(view.countedTotal)} of the expected vote counted
            </span>
          </div>
          <div className="row">
            {!done && (
              <>
                <button onClick={() => setPlaying(!playing)}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
                <button onClick={() => dispatch({ type: 'NIGHT_ADVANCE' })}>Next ›</button>
              </>
            )}
            <button className={done ? 'primary' : undefined} onClick={() => dispatch({ type: 'NIGHT_FINISH' })}>
              {done ? 'See the results' : 'Skip to the end'}
            </button>
          </div>
        </div>
        {banner && (
          <div className={night.calledFor === 0 ? 'called-banner win' : 'called-banner lose'} role="status">
            {banner}
            <button onClick={() => setBanner(null)}>OK</button>
          </div>
        )}
        <div className="night-grid">
          <div className="needle-box">
            <Needle p={view.winProbability} />
            <span className="muted small">Chance you win</span>
          </div>
          <div className="poll">
            {names.map((name, i) => (
              <div key={name} className={i === 0 ? 'poll-row you' : 'poll-row'}>
                <span className="poll-name">{name}</span>
                <span className="poll-bar" aria-hidden>
                  <span style={{ width: `${(view.reportedTotals[i] ?? 0) * 100}%` }} />
                </span>
                <span className="num">{view.countedTotal ? pct(view.reportedTotals[i] ?? 0) : '—'}</span>
              </div>
            ))}
            <ul className="ticker small">
              {[...night.ticker]
                .slice(-5)
                .reverse()
                .map((t, i) => (
                  <li key={`${night.ticker.length - i}`} className={i === 0 ? 'fresh' : undefined}>
                    {t}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="map-layout">
          <StateMap state={state} layer="night" selected={selected} onSelect={setSelected} />
          <div className="stack">
            <div className="tokens">
              <span className="big-number">{night.tokens}</span> <span className="muted small">ground-game tokens</span>
            </div>
            <ul className="night-regions">
              {office.regionIds.map((id) => {
                const r = night.regions[id]!;
                const c = counted(r, night.step);
                const rep = reportedShares(night, id);
                const mErr = mobilizeError(state, id);
                const lErr = lawyersError(state, id);
                return (
                  <li key={id} className={id === selected ? 'selected' : undefined} onClick={() => setSelected(id)}>
                    <div className="night-region-head">
                      <strong>{getRegion(id).name}</strong>
                      {r.calledFor !== undefined ? (
                        <span className={r.calledFor === 0 ? 'fit good' : 'fit bad'}>
                          {r.calledFor === 0 ? 'Called: you' : 'Called: them'}
                        </span>
                      ) : c >= 0.3 ? (
                        <span className="fit mixed">Too close to call</span>
                      ) : c > 0 ? (
                        <span className="muted small">Counting…</span>
                      ) : (
                        <span className="muted small">Polls open</span>
                      )}
                    </div>
                    <div className="count-bar" aria-label={`${pct(c)} counted`}>
                      <span style={{ width: `${c * 100}%` }} />
                    </div>
                    <span className="small muted">
                      {pct(c)} in{rep ? ` · you ${pct(rep[0]!)} vs ${pct(Math.max(...rep.slice(1)))}` : ''}
                      {r.protected ? ' · lawyers on site' : ''}
                    </span>
                    {!done && (
                      <div className="row">
                        <button disabled={!!mErr} title={mErr} onClick={() => dispatch({ type: 'NIGHT_MOBILIZE', regionId: id })}>
                          Mobilize {mErr ? '' : `(+${(mobilizeEffect(state, id) * 100).toFixed(1)} pts)`}
                        </button>
                        <button disabled={!!lErr} title={lErr} onClick={() => dispatch({ type: 'NIGHT_LAWYERS', regionId: id })}>
                          Lawyers
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {!done && (
              <div className="row">
                <button disabled={!!adBlitzError(state)} title={adBlitzError(state)} onClick={() => dispatch({ type: 'NIGHT_AD_BLITZ' })}>
                  Late ad blitz ({money(adBlitzCost(state))})
                </button>
                {nightItems.map((item) => {
                  const meta = getItem(item.itemId);
                  return (
                    <button
                      key={item.uid}
                      title={meta.nightText}
                      onClick={() => dispatch({ type: 'USE_ITEM', uid: item.uid, regionId: meta.targetsRegion ? selected : undefined })}
                    >
                      Use {meta.name}
                      {meta.targetsRegion ? ` → ${getRegion(selected).seatCity}` : ''}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="muted small">
              Actions only move votes that haven’t been counted yet. Act early with less information, or wait and have fewer places left.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
