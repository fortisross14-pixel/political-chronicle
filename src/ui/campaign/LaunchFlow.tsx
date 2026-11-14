// Blank desk → pick a race → launch it: campaign chief, self-donation, topics, and (optionally)
// asking a party to take you in.
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { getOffice, getPerson, getRegion, ISSUES, ISSUES_BY_ID, PARTIES, PARTY_IDS } from '../../data';
import {
  askError,
  campaignWindow,
  donationNorm,
  leanSide,
  raceField,
  effectivePlatform,
  homeStateId,
  joinChance,
  launchError,
  MAX_PLATFORM,
  nominationStatus,
  platformError,
  positionOf,
  raceBoard,
  regionWeights,
  relevance,
  selfFundingPenalty,
  stanceAt,
  STRENGTH_LABEL,
} from '../../engine';
import type { Action, GameState, IssueId, OfficeId, PartyId, Pledge } from '../../engine';
import { PersonCard, Stars } from '../cards/CardViews';
import { Painted, PortraitArt } from '../cards/CardArt';
import { Info } from '../Info';
import { opponentPortrait, playerPortrait } from '../portraits';
import { money, pct } from '../format';
import { cue } from '../fx/sound';

// ---------- The race board ----------

const LEVEL_LABEL = { mayor: 'Mayor', house: 'U.S. House', senate: 'U.S. Senate', governor: 'Governor' } as const;

type RaceFilter = 'open' | 'all' | 'mayor' | 'house' | 'senate' | 'governor';
const RACE_FILTERS: { id: RaceFilter; label: string }[] = [
  { id: 'open', label: 'Open now' },
  { id: 'all', label: 'All' },
  { id: 'mayor', label: 'Mayor' },
  { id: 'house', label: 'House' },
  { id: 'senate', label: 'Senate' },
  { id: 'governor', label: 'Governor' },
];

/** The Desk's big button: opens the race picker. */
export function LaunchButton({ state, onPick, label }: { state: GameState; onPick: (id: OfficeId) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const count = raceBoard(state).filter((r) => r.status === 'open').length;
  return (
    <>
      <button className="launch-cta" onClick={() => setOpen(true)}>
        <span className="launch-cta-art" aria-hidden="true">
          <Painted id="arena_rally" />
        </span>
        <span className="launch-cta-text">
          <strong>{label}</strong>
          <span>{count ? `${count} race${count === 1 ? '' : 's'} open now` : 'No race open yet'}</span>
        </span>
      </button>
      {open &&
        createPortal(
          <div className="overlay" role="dialog" aria-modal="true" aria-label="Pick a race" onClick={() => setOpen(false)}>
            <div className="overlay-sheet race-picker" onClick={(e) => e.stopPropagation()}>
              <RaceBoard
                state={state}
                title="Pick a race"
                onClose={() => setOpen(false)}
                onPick={(id) => {
                  setOpen(false);
                  onPick(id);
                }}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export function RaceBoard({
  state,
  onPick,
  title,
  onClose,
}: {
  state: GameState;
  onPick: (id: OfficeId) => void;
  title: string;
  onClose?: () => void;
}) {
  const [filter, setFilter] = useState<RaceFilter>(() => (raceBoard(state).some((r) => r.status === 'open') ? 'open' : 'all'));
  const board = raceBoard(state).filter(
    (r) => filter === 'all' || (filter === 'open' ? r.status === 'open' : getOffice(r.officeId).level === filter),
  );
  const order = { open: 0, later: 1, locked: 2 } as const;
  const rung = { mayor: 0, house: 1, senate: 2, governor: 3 } as const;
  const sorted = [...board].sort(
    (a, b) =>
      order[a.status] - order[b.status] ||
      rung[getOffice(a.officeId).level] - rung[getOffice(b.officeId).level] ||
      a.window.turnsLeft - b.window.turnsLeft,
  );
  return (
    <section className="panel race-board">
      <div className="panel-head">
        <h2>{title}</h2>
        <Info label="campaign windows" align="right">
          Campaigns open 7 turns before the vote and close at 4. Launch early to get ahead of your opponents.
        </Info>
        {onClose && <button onClick={onClose}>Close</button>}
      </div>
      <div className="segmented filter-row" role="group" aria-label="Filter races">
        {RACE_FILTERS.map((f) => (
          <button
            key={f.id}
            className={filter === f.id ? 'active' : undefined}
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="race-list">
        {sorted.map((slot) => {
          const office = getOffice(slot.officeId);
          return (
            <li key={slot.officeId} className={`race-slot ${slot.status}`}>
              <div className="race-main">
                <span className="race-level">{LEVEL_LABEL[office.level]}</span>
                <strong>{office.name}</strong>
                <span className="muted small">
                  Nov {slot.window.electionYear}
                  {office.partisan
                    ? ` · ${nominationStatus(state, office.id).kind === 'nominee' ? 'your party backs you' : 'partisan'}`
                    : ' · nonpartisan'}
                </span>
              </div>
              {slot.status === 'open' ? (
                <button className="primary" onClick={() => onPick(slot.officeId)}>
                  Launch · {slot.window.turnsLeft} turns
                </button>
              ) : (
                <span className="race-status small">
                  {slot.status === 'later' ? `Opens in ${slot.window.opensIn} turn${slot.window.opensIn === 1 ? '' : 's'}` : slot.reason}
                </span>
              )}
            </li>
          );
        })}
        {filter === 'all' && (
          <li className="race-slot locked">
            <div className="race-main">
              <span className="race-level">President</span>
              <strong>President of the United States</strong>
              <span className="muted small">Nov 2028 · it’s a free country</span>
            </div>
            <span className="race-status small">Out of reach for now</span>
          </li>
        )}
        {sorted.length === 0 && filter !== 'all' && <li className="muted small">Nothing here right now.</li>}
      </ul>
    </section>
  );
}

// ---------- Topics ----------

interface TopicRow {
  issue: IssueId;
  importance: number;
  voters: number;
}

function topicRows(officeId: OfficeId): TopicRow[] {
  const office = getOffice(officeId);
  const w = regionWeights(officeId);
  const avg = (issue: IssueId, key: 'issueOpinion' | 'issueSalience') =>
    office.regionIds.reduce((s, id) => s + getRegion(id)[key][issue] * w[id]!, 0);
  return ISSUES.map((i) => ({
    issue: i.id,
    importance: avg(i.id, 'issueSalience') * relevance(i.id, office.level),
    voters: avg(i.id, 'issueOpinion'),
  })).sort((a, b) => b.importance - a.importance);
}

export function positionLabel(issue: IssueId, pos: number): string {
  if (pos === 0) return 'Neutral';
  const i = ISSUES_BY_ID[issue];
  return `${STRENGTH_LABEL[Math.abs(pos)]}: ${pos < 0 ? i.negLabel : i.posLabel}`;
}

function TopicPicker({
  state,
  officeId,
  platform,
  onChange,
  onClose,
}: {
  state: GameState;
  officeId: OfficeId;
  platform: Pledge[];
  onChange: (p: Pledge[]) => void;
  onClose: () => void;
}) {
  const rows = useMemo(() => topicRows(officeId), [officeId]);
  const stateId = homeStateId(state);
  const parties: PartyId[] = state.career.affiliation === 'IND' ? PARTY_IDS : [state.career.affiliation as PartyId];
  const prev = state.career.platform ?? [];
  const error = platformError(state, platform);
  const max = Math.max(...rows.map((r) => r.importance));
  const set = (issue: IssueId, pos: number | null) => {
    cue('tap');
    const rest = platform.filter((p) => p.issue !== issue);
    if (pos === null) return onChange(rest);
    if (rest.length >= MAX_PLATFORM && !platform.some((p) => p.issue === issue)) return;
    onChange([...rest, { issue, stance: stanceAt(pos) }]);
  };
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Campaign topics">
      <div className="overlay-sheet topics">
        <div className="sheet-head">
          <h2>Campaign topics</h2>
          <span className={platform.length ? 'badge-soft' : 'muted small'}>
            {platform.length}/{MAX_PLATFORM}
          </span>
        </div>
        <p className="muted small legend-line">
          <span className="mark voters" /> Voters here
          {parties.map((p) => (
            <span key={p}>
              <span className={`mark ${p.toLowerCase()}`} /> {PARTIES[p].nickname}
            </span>
          ))}
          {prev.length > 0 && (
            <span>
              <span className="mark prev" /> Your last platform
            </span>
          )}
        </p>
        <ul className="topic-list">
          {rows.map((row) => {
            const chosen = platform.find((p) => p.issue === row.issue);
            const pos = chosen ? positionOf(chosen.stance) : undefined;
            const old = prev.find((p) => p.issue === row.issue);
            const full = !chosen && platform.length >= MAX_PLATFORM;
            const issue = ISSUES_BY_ID[row.issue];
            const at = (v: number) => `${((positionOf(v) + 3) / 6) * 100}%`;
            const exact = (v: number) => `${((Math.max(-2, Math.min(2, v)) + 2) / 4) * 100}%`;
            return (
              <li key={row.issue} className={chosen ? 'topic on' : 'topic'}>
                <div className="topic-head">
                  <strong>{issue.name}</strong>
                  <span className="importance" role="img" aria-label={`Importance ${Math.round((row.importance / max) * 100)}%`}>
                    <span style={{ width: `${(row.importance / max) * 100}%` }} />
                  </span>
                  {chosen && (
                    <button className="link" onClick={() => set(row.issue, null)}>
                      Remove
                    </button>
                  )}
                </div>
                <div className="slider" role="radiogroup" aria-label={issue.name}>
                  <span className="slider-pole">{issue.negLabel}</span>
                  <div className="slider-track">
                    <span
                      className="mark voters"
                      style={{ left: exact(row.voters) }}
                      title={`Voters: ${positionLabel(row.issue, positionOf(row.voters))}`}
                    />
                    {parties.map((p) => {
                      const v = effectivePlatform(p, stateId)[row.issue].position;
                      return (
                        <span
                          key={p}
                          className={`mark ${p.toLowerCase()}`}
                          style={{ left: exact(v) }}
                          title={`${PARTIES[p].nickname}: ${positionLabel(row.issue, positionOf(v))}`}
                        />
                      );
                    })}
                    {old && <span className="mark prev" style={{ left: at(old.stance) }} />}
                    {[-3, -2, -1, 0, 1, 2, 3].map((p) => (
                      <button
                        key={p}
                        role="radio"
                        aria-checked={pos === p}
                        aria-label={positionLabel(row.issue, p)}
                        disabled={full}
                        className={pos === p ? 'stop on' : 'stop'}
                        style={{ left: `${((p + 3) / 6) * 100}%` }}
                        onClick={() => set(row.issue, p)}
                      />
                    ))}
                  </div>
                  <span className="slider-pole">{issue.posLabel}</span>
                </div>
                <span className="small topic-choice">
                  {pos !== undefined ? positionLabel(row.issue, pos) : full ? 'Platform full' : 'Not on your platform'}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="sheet-foot">
          {error && platform.length > 0 && <span className="neg small">{error}</span>}
          <button className="primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- The launch screen ----------

/** 0..1000 slider → a dollar amount on a log scale (fine steps at the low end). */
function fromSlider(t: number, max: number): number {
  if (t <= 0 || max <= 0) return 0;
  const v = Math.min(max, 1000 * Math.pow(Math.max(1, max / 1000), t / 1000));
  const step = v >= 1e6 ? 50_000 : v >= 1e5 ? 5_000 : 1_000;
  return t >= 1000 ? max : Math.round(v / step) * step;
}

function toSlider(v: number, max: number): number {
  if (v <= 0 || max <= 1000) return v > 0 ? 1000 : 0;
  return Math.round((Math.log(Math.max(1000, v) / 1000) / Math.log(max / 1000)) * 1000);
}

export function LaunchScreen({
  state,
  officeId,
  dispatch,
  onClose,
}: {
  state: GameState;
  officeId: OfficeId;
  dispatch: (a: Action) => void;
  onClose: () => void;
}) {
  const office = getOffice(officeId);
  const [platform, setPlatform] = useState<Pledge[]>(() => (state.career.platform ?? []).map((p) => ({ ...p })));
  const bestManager = [...state.team.cards].sort(
    (a, b) => getPerson(b.personId).stars.campaignManager - getPerson(a.personId).stars.campaignManager,
  )[0];
  const [managerUid, setManagerUid] = useState<number | undefined>(state.team.assigned.campaignManager ?? bestManager?.uid);
  const norm = donationNorm(officeId);
  const [donation, setDonation] = useState(() => Math.min(state.wealth, Math.round(norm / 4 / 1000) * 1000));
  const [topics, setTopics] = useState(false);
  const [picking, setPicking] = useState(false);
  const penalty = selfFundingPenalty(officeId, donation);
  const action = { type: 'LAUNCH_CAMPAIGN' as const, officeId, platform, donation, managerUid };
  const error = launchError(state, action);
  const manager = managerUid !== undefined ? state.team.cards.find((c) => c.uid === managerUid) : undefined;

  return createPortal(
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`Launch: ${office.name}`}>
      <div className="overlay-sheet launch">
        <div className="sheet-head">
          <div>
            <span className="live">Launch</span>
            <h2>{office.name}</h2>
          </div>
          <button onClick={onClose}>Back</button>
        </div>

        <FieldPreview state={state} officeId={officeId} />

        <div className="launch-tiles">
          <button className={`launch-tile${manager ? ' done' : ''}`} onClick={() => setPicking(true)}>
            <span className="tile-num">1</span>
            <span className="tile-title">Campaign chief</span>
            {manager ? (
              <span className="tile-value">
                {getPerson(manager.personId).name} <Stars value={getPerson(manager.personId).stars.campaignManager} />
              </span>
            ) : (
              <span className="tile-value muted">{state.team.cards.length ? 'Pick someone' : 'Nobody on your roster yet'}</span>
            )}
          </button>

          <div className={`launch-tile${donation > 0 ? ' done' : ''}`}>
            <span className="tile-num">2</span>
            <span className="tile-title">Your own money</span>
            <span className="tile-value">
              <strong>{money(donation)}</strong> <span className="muted small">of {money(state.wealth)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1000}
              value={toSlider(donation, state.wealth)}
              aria-label="Self-donation"
              onChange={(e) => setDonation(fromSlider(Number(e.target.value), state.wealth))}
            />
            <span className={`small ${penalty > 0 ? 'neg' : 'muted'}`}>
              {penalty > 0
                ? `Above ${money(norm)}: voters say you’re buying it (−${Math.round(penalty * 100)} favorability)`
                : `Normal here: up to ${money(norm)}`}
            </span>
          </div>

          <button className={`launch-tile${platform.length ? ' done' : ''}`} onClick={() => setTopics(true)}>
            <span className="tile-num">3</span>
            <span className="tile-title">Campaign topics</span>
            <span className="tile-value">
              {platform.length ? (
                <span className="topic-chips">
                  {platform.map((p) => (
                    <span key={p.issue} className="chip">
                      {ISSUES_BY_ID[p.issue].name} {positionOf(p.stance) > 0 ? '+' : ''}
                      {positionOf(p.stance)}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="muted">Pick up to 5</span>
              )}
            </span>
          </button>

          <PartyTile state={state} platform={platform} dispatch={dispatch} partisan={office.partisan} />
        </div>

        <div className="sheet-foot">
          {error && <span className="muted small">{error}</span>}
          <button
            className="primary big"
            disabled={!!error}
            onClick={() => {
              dispatch(action);
              onClose();
            }}
          >
            Launch the campaign
          </button>
        </div>
      </div>

      {topics && (
        <TopicPicker state={state} officeId={officeId} platform={platform} onChange={setPlatform} onClose={() => setTopics(false)} />
      )}
      {picking && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="Campaign chief">
          <div className="overlay-sheet">
            <div className="sheet-head">
              <h2>Campaign chief</h2>
              <button onClick={() => setPicking(false)}>Done</button>
            </div>
            <div className="card-row wrap">
              {[...state.team.cards]
                .sort((a, b) => getPerson(b.personId).stars.campaignManager - getPerson(a.personId).stars.campaignManager)
                .map((c) => (
                  <PersonCard
                    key={c.uid}
                    small
                    person={getPerson(c.personId)}
                    selected={managerUid === c.uid}
                    onClick={() => {
                      cue('tap');
                      setManagerUid(managerUid === c.uid ? undefined : c.uid);
                    }}
                  />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

const SIDE_LABEL = { red: 'Leans red', blue: 'Leans blue', neutral: 'Neutral' } as const;

/** Who else is running, and which way they lean. */
function FieldPreview({ state, officeId }: { state: GameState; officeId: OfficeId }) {
  const window = campaignWindow(state, officeId);
  const field = useMemo(() => raceField(state, officeId, window.electionYear), [state, officeId, window.electionYear]);
  const you = playerPortrait(state.politician);
  return (
    <section className="versus" aria-label="Who else is running">
      <div className="vs-card you">
        <span className="vs-portrait">
          <PortraitArt id={you} name={state.politician.name} role="campaignManager" />
        </span>
        <strong>{state.politician.name}</strong>
        <span className="lean-chip you">You</span>
      </div>
      <div className="vs-mark" aria-hidden="true">
        VS
        <small>
          Nov {window.electionYear} · {window.turnsLeft} turns
        </small>
      </div>
      <div className="vs-field">
        {field.map((c) => {
          const side = leanSide(c);
          return (
            <div key={c.id} className={`vs-card ${side}`}>
              <span className="vs-portrait">
                <PortraitArt id={opponentPortrait(c.name)} name={c.name} role="chiefOfStaff" />
              </span>
              <strong>{c.name}</strong>
              <span className={`lean-chip ${side}`}>{c.affiliation !== 'IND' ? PARTIES[c.affiliation].nickname : SIDE_LABEL[side]}</span>
              {c.incumbent && <span className="vs-inc">Incumbent</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PartyTile({
  state,
  platform,
  dispatch,
  partisan,
}: {
  state: GameState;
  platform: Pledge[];
  dispatch: (a: Action) => void;
  partisan: boolean;
}) {
  const member = state.career.affiliation !== 'IND' ? (state.career.affiliation as PartyId) : undefined;
  return (
    <div className={`launch-tile${member ? ' done' : ''}`}>
      <span className="tile-num">4</span>
      <span className="tile-title">Party {partisan ? '' : '(optional)'}</span>
      {member ? (
        <span className="tile-value">
          <span className={`party-chip ${member.toLowerCase()}`}>{PARTIES[member].nickname}</span> standing{' '}
          {Math.round(state.career.partyStanding ?? 0)}
        </span>
      ) : (
        <span className="tile-actions">
          {PARTY_IDS.map((p) => {
            const err = askError(state, p);
            return (
              <button
                key={p}
                className={`party-ask ${p.toLowerCase()}`}
                disabled={!!err}
                title={err}
                onClick={() => dispatch({ type: 'ASK_TO_JOIN', party: p, platform })}
              >
                Ask the {PARTIES[p].nickname} <span className="small">{pct(joinChance(state, p, platform))}</span>
              </button>
            );
          })}
        </span>
      )}
      <Info label="parties" align="right">
        {member
          ? 'Party money and a ballot line.'
          : 'Independent: no party money, harder in partisan races. The percentage is your chance the party says yes.'}
      </Info>
    </div>
  );
}
