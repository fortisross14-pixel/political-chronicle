// The campaign deck: a "Play a card" button that opens a window with two slots (where, and which
// card from your album), the topic, the effect as a range (luck plays a part), and "Play it!" —
// then what actually happened. Election-night cards wait in their own pile.
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BASIC_CARD_IDS, getEventCard, getItem, getOffice, ISSUES_BY_ID, MILESTONES_BY_ID } from '../../data';
import { activePlatform, decided, describeDemo, itemError, LUCK, poll, previewEvent } from '../../engine';
import type { Action, EventPreview, GameState, IssueId, RegionId } from '../../engine';
import { getRegion } from '../../data';
import { ActionCardView, ItemCardView } from '../cards/CardViews';
import { EventArt, ItemArt } from '../cards/CardArt';
import { Bolt } from '../cards/GameCard';
import { areaName, money } from '../format';
import { cue } from '../fx/sound';
import { stanceLabel } from './labels';

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
  regionId: RegionId;
  onRegionChange: (id: RegionId) => void;
}

/** One thing you can play: a campaign action (basic or from your hand) or a campaign item. */
interface Entry {
  key: string;
  kind: 'action' | 'item';
  /** PLAY_EVENT ref (basic id or hand uid) or item uid. */
  ref: number | string;
  id: string;
  name: string;
  count: number;
}

function entriesOf(state: GameState): Entry[] {
  const out: Entry[] = BASIC_CARD_IDS.map((id) => ({ key: id, kind: 'action', ref: id, id, name: getEventCard(id).name, count: 1 }));
  const byCard = new Map<string, number[]>();
  for (const c of state.hand) byCard.set(c.cardId, [...(byCard.get(c.cardId) ?? []), c.uid]);
  for (const [id, uids] of byCard)
    out.push({ key: `h:${id}`, kind: 'action', ref: uids[0]!, id, name: getEventCard(id).name, count: uids.length });
  for (const it of state.items) {
    const meta = getItem(it.itemId);
    if (meta.window === 'night') continue;
    out.push({ key: `i:${it.uid}`, kind: 'item', ref: it.uid, id: it.itemId, name: meta.name, count: 1 });
  }
  return out;
}

/** Your vote share in an area and race-wide if the event's effects land at `luck`. */
function projectVote(state: GameState, preview: EventPreview, luck: number, regionId: RegionId): { area: number; total: number } {
  const race = state.career.race!;
  const regions = { ...state.regions };
  for (const e of preview.effects) {
    const r = regions[e.regionId]!;
    regions[e.regionId] = {
      recognition: Math.min(1, r.recognition + e.dRecognition * luck),
      favorability: Math.max(-1, Math.min(1, r.favorability + e.dFavorability * luck)),
    };
  }
  const p = poll({ ...state, regions }, race);
  return { area: decided(p.regions[regionId]!)[0]!, total: p.decided[0]! };
}

const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;
const pts = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(1)}`;

export function HandPanel({ state, dispatch, regionId, onRegionChange }: Props) {
  const [open, setOpen] = useState(false);
  const entries = entriesOf(state);
  const night = state.items.filter((i) => getItem(i.itemId).window === 'night');
  const race = state.career.race;
  return (
    <section className="panel deck-panel">
      <div className="panel-head">
        <h2>{race ? 'Campaign actions' : 'Out with the voters'}</h2>
        <span className="muted small">
          <Bolt /> {state.energy} energy
        </span>
      </div>
      <button className="play-cta" onClick={() => setOpen(true)}>
        <span className="play-cta-fan" aria-hidden="true">
          {entries.slice(-3).map((e) => (
            <span key={e.key} className="play-cta-card">
              {e.kind === 'item' ? <ItemArt id={e.id} /> : <EventArt id={e.id} medium={getEventCard(e.id).medium} />}
            </span>
          ))}
        </span>
        <span className="play-cta-text">
          <strong>Play a card</strong>
          <span>
            {entries.length} in your album
            {race ? ` · ${race.tokens} ground-game tokens` : ''}
          </span>
        </span>
      </button>
      {(night.length > 0 || (race && race.milestones.length > 0)) && (
        <p className="muted small">
          {night.length > 0 && `${night.length} card${night.length === 1 ? '' : 's'} saved for election night. `}
          {race && race.milestones.length > 0 && `Milestones: ${race.milestones.map((m) => MILESTONES_BY_ID[m]!.name).join(', ')}.`}
        </p>
      )}
      {open && <PlayCardWindow state={state} dispatch={dispatch} start={regionId} onArea={onRegionChange} onClose={() => setOpen(false)} />}
    </section>
  );
}

type Picking = 'area' | 'card' | null;

interface Before {
  areaId: RegionId;
  name: string;
  rec: number;
  fav: number;
  area?: number;
  total?: number;
  logLength: number;
}

function PlayCardWindow({
  state,
  dispatch,
  start,
  onArea,
  onClose,
}: {
  state: GameState;
  dispatch: (a: Action) => void;
  start: RegionId;
  onArea: (id: RegionId) => void;
  onClose: () => void;
}) {
  const race = state.career.race?.platform.length ? state.career.race : undefined;
  const officeId = race?.officeId ?? state.career.office?.officeId;
  const areas = officeId ? getOffice(officeId).regionIds : [];
  const [area, setArea] = useState<RegionId | null>(areas.includes(start) ? start : null);
  const [key, setKey] = useState<string | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [before, setBefore] = useState<Before | null>(null);
  const entries = entriesOf(state);
  const entry = entries.find((e) => e.key === key);
  const platform = activePlatform(state);
  const card = entry?.kind === 'action' ? getEventCard(entry.id) : undefined;

  // The topic that lands best here, unless the player picks another.
  const [issueChoice, setIssue] = useState<IssueId | null>(null);
  const bestIssue = useMemo(() => {
    if (!entry || entry.kind !== 'action' || !area) return platform[0]?.issue;
    return [...platform]
      .map((p) => ({
        issue: p.issue,
        f: previewEvent(state, entry.ref, area, p.issue).effects.find((e) => e.regionId === area)?.dFavorability ?? -9,
      }))
      .sort((a, b) => b.f - a.f)[0]?.issue;
  }, [entry, area, platform, state]);
  const issue = issueChoice ?? bestIssue;
  const preview = entry?.kind === 'action' && area && issue ? previewEvent(state, entry.ref, area, issue) : undefined;
  const itemErr =
    entry?.kind === 'item'
      ? itemError(state, entry.ref as number, getItem(entry.id).targetsRegion ? (area ?? undefined) : undefined)
      : undefined;
  const target = preview?.effects.find((e) => e.regionId === area);
  const others = preview?.effects.filter((e) => e.regionId !== area) ?? [];
  const lo = preview && race && area && !preview.error && !card?.fundraising ? projectVote(state, preview, LUCK.min, area) : undefined;
  const hi = preview && race && area && !preview.error && !card?.fundraising ? projectVote(state, preview, LUCK.max, area) : undefined;
  const nowVote = race && area ? { area: decided(poll(state, race).regions[area]!)[0]!, total: poll(state, race).decided[0]! } : undefined;
  const error = !area ? 'Pick a neighborhood.' : !entry ? 'Pick a card.' : entry.kind === 'item' ? itemErr : preview?.error;

  const play = () => {
    if (!area || !entry || error) return;
    cue('deal');
    setBefore({
      areaId: area,
      name: entry.name,
      rec: state.regions[area]!.recognition,
      fav: state.regions[area]!.favorability,
      area: nowVote?.area,
      total: nowVote?.total,
      logLength: state.log.length,
    });
    if (entry.kind === 'item')
      dispatch({ type: 'USE_ITEM', uid: entry.ref as number, regionId: getItem(entry.id).targetsRegion ? area : undefined });
    else dispatch({ type: 'PLAY_EVENT', cardUid: entry.ref, regionId: area, issue: issue! });
    onArea(area);
  };

  const content = before ? (
    <Result state={state} before={before} onAgain={() => (setBefore(null), setKey(null), setIssue(null))} onClose={onClose} />
  ) : (
    <>
      <div className="play-slots">
        <button
          className={`play-slot${area ? ' filled' : ''}`}
          onClick={() => setPicking('area')}
          aria-label={area ? `Where: ${areaName(area)}` : 'Pick a neighborhood'}
        >
          <span className="play-slot-label">Where</span>
          {area ? (
            <>
              <strong>{areaName(area)}</strong>
              <span className="small muted">{describeDemo(getRegion(area).demo)}</span>
              {nowVote && <span className="small">You {pct1(nowVote.area)} here</span>}
            </>
          ) : (
            <span className="plus">+</span>
          )}
        </button>
        <button
          className={`play-slot card${entry ? ' filled' : ''}`}
          onClick={() => setPicking('card')}
          aria-label={entry ? `Card: ${entry.name}` : 'Pick a card'}
        >
          <span className="play-slot-label">Card</span>
          {entry ? (
            entry.kind === 'item' ? (
              <ItemCardView id={entry.id} small />
            ) : (
              <ActionCardView id={entry.id} small />
            )
          ) : (
            <span className="plus">+</span>
          )}
        </button>
      </div>

      {card && !card.fundraising && platform.length > 0 && (
        <div className="segmented topic-row" role="group" aria-label="Topic">
          {platform.map((p) => (
            <button
              key={p.issue}
              className={issue === p.issue ? 'active' : undefined}
              aria-pressed={issue === p.issue}
              onClick={() => setIssue(p.issue)}
            >
              {ISSUES_BY_ID[p.issue].name}
              <small> {stanceLabel(p.issue, p.stance)}</small>
            </button>
          ))}
        </div>
      )}

      <div className="play-effects" aria-live="polite">
        {entry?.kind === 'item' && <p>{getItem(entry.id).campaignText}</p>}
        {preview && !preview.error && card?.fundraising && <p>Raises about {money(preview.fundsGain)}.</p>}
        {preview && !preview.error && target && !card?.fundraising && (
          <ul className="effect-ranges">
            <li>
              <span>Known in {areaName(area!)}</span>
              <b className="pos">
                {pts(target.dRecognition * LUCK.min)} to {pts(target.dRecognition * LUCK.max)}
              </b>
            </li>
            <li>
              <span>Liked in {areaName(area!)}</span>
              <b className={target.dFavorability >= 0 ? 'pos' : 'neg'}>
                {pts(target.dFavorability * LUCK.min)} to {pts(target.dFavorability * LUCK.max)}
              </b>
            </li>
            {lo && hi && nowVote && (
              <li>
                <span>Your vote here</span>
                <b>
                  {pct1(nowVote.area)} → {pct1(lo.area)}–{pct1(hi.area)}
                </b>
              </li>
            )}
            {lo && hi && nowVote && others.length > 0 && (
              <li>
                <span>Your vote overall</span>
                <b>
                  {pct1(nowVote.total)} → {pct1(lo.total)}–{pct1(hi.total)}
                </b>
              </li>
            )}
            {preview.gaffeChance > 0 && (
              <li>
                <span>Gaffe risk</span>
                <b className="neg">{Math.round(preview.gaffeChance * 100)}%</b>
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="sheet-foot">
        {error && <span className="muted small">{error}</span>}
        <button className="primary big" disabled={!!error} onClick={play}>
          Play it!{' '}
          {card && (
            <>
              <Bolt /> {card.energy}
            </>
          )}
        </button>
      </div>
    </>
  );

  return createPortal(
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Play a card" onClick={onClose}>
      <div className="overlay-sheet play-window" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{before ? 'What happened' : 'Play a card'}</h2>
          <button onClick={onClose}>Close</button>
        </div>
        {content}
        {picking === 'area' && (
          <Picker title="Pick a neighborhood" onClose={() => setPicking(null)}>
            <div className="area-grid">
              {areas.map((id) => {
                const v = race ? decided(poll(state, race).regions[id]!)[0]! : undefined;
                return (
                  <button
                    key={id}
                    className={`area-tile${id === area ? ' active' : ''}`}
                    onClick={() => {
                      setArea(id);
                      setPicking(null);
                    }}
                  >
                    <strong>{areaName(id)}</strong>
                    <span className="small muted">{describeDemo(getRegion(id).demo)}</span>
                    {v !== undefined && <span className="small">You {pct1(v)}</span>}
                  </button>
                );
              })}
            </div>
          </Picker>
        )}
        {picking === 'card' && (
          <Picker title="Your album" onClose={() => setPicking(null)}>
            <div className="album-grid">
              {entries.map((e) => {
                const why =
                  e.kind === 'item'
                    ? itemError(state, e.ref as number, getItem(e.id).targetsRegion ? (area ?? areas[0]) : undefined)
                    : previewEvent(state, e.ref, area ?? areas[0]!, platform[0]?.issue ?? 'taxes').error;
                const pick = () => {
                  cue('tap');
                  setKey(e.key);
                  setIssue(null);
                  setPicking(null);
                };
                return (
                  <div key={e.key} className={`album-slot${why ? ' unavailable' : ''}`}>
                    {e.kind === 'item' ? (
                      <ItemCardView id={e.id} small dim={!!why} onClick={pick} />
                    ) : (
                      <ActionCardView id={e.id} small dim={!!why} onClick={pick} />
                    )}
                    {e.count > 1 && <span className="album-count">×{e.count}</span>}
                    {why && <span className="album-why small">{why}</span>}
                  </div>
                );
              })}
            </div>
          </Picker>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Picker({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="picker" role="dialog" aria-label={title}>
      <div className="sheet-head">
        <h3>{title}</h3>
        <button onClick={onClose}>Back</button>
      </div>
      {children}
    </div>
  );
}

/** The real outcome, against how things stood before. */
function Result({ state, before, onAgain, onClose }: { state: GameState; before: Before; onAgain: () => void; onClose: () => void }) {
  const race = state.career.race?.platform.length ? state.career.race : undefined;
  const now = state.regions[before.areaId]!;
  const p = race ? poll(state, race) : undefined;
  const area = p ? decided(p.regions[before.areaId]!)[0]! : undefined;
  const lines = state.log.slice(before.logLength).map((l) => l.text);
  const gaffe = lines.some((t) => t.includes('gaffe went viral'));
  const lucky = lines.some((t) => t.includes('even better than hoped'));
  const flat = lines.some((t) => t.includes('fell a little flat'));
  return (
    <div className={`play-result${gaffe ? ' bad' : lucky ? ' good' : ''}`} role="status">
      <span className="play-result-tag">{gaffe ? 'Gaffe!' : lucky ? 'Better than hoped' : flat ? 'Fell a little flat' : 'Done'}</span>
      <h3>
        {before.name} in {areaName(before.areaId)}
      </h3>
      <ul className="effect-ranges">
        <li>
          <span>Known</span>
          <b className="pos">{pts(now.recognition - before.rec)}</b>
        </li>
        <li>
          <span>Liked</span>
          <b className={now.favorability - before.fav >= 0 ? 'pos' : 'neg'}>{pts(now.favorability - before.fav)}</b>
        </li>
        {area !== undefined && before.area !== undefined && (
          <li>
            <span>Your vote here</span>
            <b>
              {pct1(before.area)} → {pct1(area)}{' '}
              <span className={area - before.area >= 0 ? 'pos' : 'neg'}>({pts(area - before.area)})</span>
            </b>
          </li>
        )}
        {p && before.total !== undefined && (
          <li>
            <span>Your vote overall</span>
            <b>
              {pct1(before.total)} → {pct1(p.decided[0]!)}{' '}
              <span className={p.decided[0]! - before.total >= 0 ? 'pos' : 'neg'}>({pts(p.decided[0]! - before.total)})</span>
            </b>
          </li>
        )}
      </ul>
      {lines.length > 0 && <p className="small muted">{lines.join(' ')}</p>}
      <div className="sheet-foot">
        <button onClick={onClose}>Done</button>
        <button className="primary" onClick={onAgain}>
          Play another
        </button>
      </div>
    </div>
  );
}
