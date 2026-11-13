import { useState } from 'react';
import { BASIC_CARD_IDS, getEventCard, getRegion, ISSUES_BY_ID, STATES } from '../../data';
import { eventCost, previewEvent } from '../../engine';
import type { Action, EventCard, GameState, IssueId, RegionId } from '../../engine';
import { money } from '../format';
import { effectLabel, PRECISE_PREVIEW_POLICY, stanceLabel } from './labels';

const MEDIUM_LABEL: Record<EventCard['medium'], string> = {
  tv: 'TV',
  cable: 'Cable',
  social: 'Social',
  inPerson: 'In person',
  radio: 'Radio',
};

interface Props {
  state: GameState;
  dispatch: (a: Action) => void;
  regionId: RegionId;
  onRegionChange: (id: RegionId) => void;
}

interface HandEntry {
  key: string;
  ref: number | string;
  card: EventCard;
  count?: number;
}

export function HandPanel({ state, dispatch, regionId, onRegionChange }: Props) {
  const race = state.career.race!;
  const [selected, setSelected] = useState<string>('door_knocking');
  const [issue, setIssue] = useState<IssueId>(race.platform[0]!.issue);

  const entries: HandEntry[] = BASIC_CARD_IDS.map((id) => ({ key: id, ref: id, card: getEventCard(id) }));
  const counts = new Map<string, number[]>();
  for (const c of state.hand) counts.set(c.cardId, [...(counts.get(c.cardId) ?? []), c.uid]);
  for (const [cardId, uids] of counts) entries.push({ key: cardId, ref: uids[0]!, card: getEventCard(cardId), count: uids.length });

  const entry = entries.find((e) => e.key === selected) ?? entries[0]!;
  const preview = previewEvent(state, entry.ref, regionId, issue);
  const precise = state.politician.skills.policy >= PRECISE_PREVIEW_POLICY;
  const target = preview.effects.find((e) => e.regionId === regionId);
  const spill = preview.effects.filter((e) => e.regionId !== regionId);
  const stateRegions = STATES[getRegion(regionId).state]!.regionIds;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Campaign events</h2>
        <span className="muted small">Energy {state.energy} · Funds {money(state.funds)}</span>
      </div>
      <div className="hand">
        {entries.map((e) => (
          <button
            key={e.key}
            className={e.key === entry.key ? 'event-card active' : 'event-card'}
            aria-pressed={e.key === entry.key}
            onClick={() => setSelected(e.key)}
          >
            <span className="event-name">
              {e.card.name}
              {e.count && e.count > 1 ? ` ×${e.count}` : ''}
            </span>
            <span className="muted small">
              {MEDIUM_LABEL[e.card.medium]} · ⚡{e.card.energy} · {e.card.cost ? money(eventCost(e.card, regionId)) : 'free'}
              {e.card.basic ? ' · basic' : ''}
            </span>
          </button>
        ))}
      </div>

      <div className="play-controls">
        <p className="small">{entry.card.description}</p>
        <div className="row">
          <label className="field inline">
            <span>Where</span>
            <select value={regionId} onChange={(e) => onRegionChange(e.target.value)}>
              {stateRegions.map((id) => (
                <option key={id} value={id}>
                  {getRegion(id).seatCity} — {getRegion(id).name}
                </option>
              ))}
            </select>
          </label>
          {!entry.card.fundraising && (
            <label className="field inline">
              <span>Topic</span>
              <select value={issue} onChange={(e) => setIssue(e.target.value as IssueId)}>
                {race.platform.map((p) => (
                  <option key={p.issue} value={p.issue}>
                    {ISSUES_BY_ID[p.issue].name} — {stanceLabel(p.issue, p.stance)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="preview small">
          {entry.card.fundraising ? (
            <span>Expected: raise {money(preview.fundsGain)}.</span>
          ) : target ? (
            <>
              <span>
                {getRegion(regionId).seatCity}: recognition <b className="pos">{effectLabel(target.dRecognition, precise)}</b>, favorability{' '}
                <b className={target.dFavorability >= 0 ? 'pos' : 'neg'}>{effectLabel(target.dFavorability, precise)}</b>
                {preview.fatigue < 1 && <span className="muted"> · repeated topic here (×{preview.fatigue.toFixed(2)})</span>}
              </span>
              {spill.length > 0 && (
                <span>
                  Heard elsewhere:{' '}
                  {spill.map((e) => (
                    <span key={e.regionId} className={e.dFavorability >= 0 ? 'pos' : 'neg'}>
                      {getRegion(e.regionId).seatCity} {effectLabel(e.dFavorability, precise)}{' '}
                    </span>
                  ))}
                </span>
              )}
              {preview.gaffeChance > 0 && <span className="muted">Gaffe risk {Math.round(preview.gaffeChance * 100)}% (Media Savvy lowers it)</span>}
            </>
          ) : null}
        </div>

        <div className="row">
          <button
            className="primary"
            disabled={!!preview.error}
            onClick={() => dispatch({ type: 'PLAY_EVENT', cardUid: entry.ref, regionId, issue })}
          >
            Hold event ({preview.cost ? money(preview.cost) : 'free'}, ⚡{preview.energy})
          </button>
          {preview.error && <span className="muted small">{preview.error}</span>}
        </div>
      </div>
    </section>
  );
}
