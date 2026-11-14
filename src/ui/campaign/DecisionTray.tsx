import { useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { getDecisionCard, getRegion, ISSUES_BY_ID, PARTIES } from '../../data';
import { decisionError, decisionImpact, DECISIONS_PER_TURN, yourChamber } from '../../engine';
import type { Action, GameState } from '../../engine';
import { IssueArt, ItemArt } from '../cards/CardArt';
import { GameCard } from '../cards/GameCard';
import { money } from '../format';
import { cue } from '../fx/sound';
import { useMediaQuery } from '../fx/useMediaQuery';
import { effectLabel, PRECISE_PREVIEW_POLICY, stanceLabel } from './labels';

export function DecisionTray({ state, dispatch }: { state: GameState; dispatch: (a: Action) => void }) {
  const hand = state.decisions!;
  const [chosen, setChosen] = useState<string[]>([]);
  const precise = state.politician.skills.strategy >= PRECISE_PREVIEW_POLICY;
  const inOffice = !!state.career.office;
  const title = inOffice ? 'Bills on your desk' : 'Take a stand';
  const stack = useMediaQuery('(max-width: 700px)');
  const [at, setAt] = useState(0);
  const decide = (id: string, yes: boolean) => {
    setChosen((c) => (yes ? (c.includes(id) ? c : [...c, id]) : c.filter((x) => x !== id)));
    setAt((i) => Math.min(hand.cardIds.length, Math.max(i, hand.cardIds.indexOf(id) + 1)));
  };

  if (hand.resolved) {
    if (!inOffice)
      return (
        <section className="panel">
          <h2>{title}</h2>
          <p className="muted small">
            You publicly backed {hand.applied.map((id) => `“${getDecisionCard(id).title}”`).join(', ')}. New questions next turn.
          </p>
        </section>
      );
    // In office: the signing ceremony. Every bill gets its stamp.
    return (
      <section className="panel ceremony">
        <div className="panel-head">
          <h2>Signing ceremony</h2>
          <span className="muted small">New bills next turn</span>
        </div>
        <ul className="ceremony-list">
          {hand.applied.map((id, i) => {
            const failed = hand.failed?.includes(id);
            return (
              <li key={id} className={failed ? 'failed' : 'passed'} style={{ animationDelay: `${i * 0.25}s` }}>
                <span className="ceremony-title">{getDecisionCard(id).title}</span>
                <span className="ceremony-stamp">
                  {failed ? `Failed in ${yourChamber(state)?.name ?? 'the legislature'}` : 'Signed into law'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  const error = decisionError(state, chosen);
  const renderCard = (id: string): ReactNode => {
    const card = getDecisionCard(id);
    const impact = decisionImpact(state, card);
    const on = chosen.includes(id);
    // Approval first (in office), then how the rest of the state hears it.
    const regions: [string, number, string][] = [
      ...Object.entries(impact.approval).map(([r, v]) => [r, v, 'approval'] as [string, number, string]),
      ...Object.entries(impact.favorability)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .map(([r, v]) => [r, v, ''] as [string, number, string]),
    ];
    return (
      <GameCard
        key={id}
        className={on ? 'decision-card on' : 'decision-card'}
        tone="bill"
        title={card.title}
        typeLine={[inOffice ? 'Bill' : 'Public stance', ...card.tags.map((t) => ISSUES_BY_ID[t.issue].name)].join(', ')}
        art={card.tags[0] ? <IssueArt issue={card.tags[0].issue} /> : <ItemArt id="endorsement" />}
        rarity={card.partyPriority ? 'Whip vote' : inOffice ? 'Bill' : 'Stance'}
        foil={!!card.partyPriority}
        selected={on}
      >
        {card.partyPriority && (
          <span className={`whip ${card.partyPriority.toLowerCase()}`}>{PARTIES[card.partyPriority].nickname} whip vote</span>
        )}
        {impact.rejectStanding < 0 && (
          <p className="muted small">Your party expects you to sign this ({impact.rejectStanding} standing if you don’t).</p>
        )}
        <p className="small">{card.text}</p>
        <ul className="tags small">
          {card.tags.map((t) => (
            <li key={t.issue}>
              {ISSUES_BY_ID[t.issue].name}: {stanceLabel(t.issue, t.stance)}
            </li>
          ))}
        </ul>
        <dl className="kv small">
          {regions.slice(0, 4).map(([r, v, kind]) => (
            <div key={r} className="kv-row">
              <dt>
                {getRegion(r).seatCity}
                {kind && ' approval'}
              </dt>
              <dd className={v >= 0 ? 'pos' : 'neg'}>{effectLabel(v, precise)}</dd>
            </div>
          ))}
          {impact.integrity !== 0 && (
            <div className="kv-row">
              <dt>Integrity</dt>
              <dd className={impact.integrity > 0 ? 'pos' : 'neg'}>{impact.integrity > 0 ? `+${impact.integrity}` : impact.integrity}</dd>
            </div>
          )}
          {impact.standing !== 0 && (
            <div className="kv-row">
              <dt>Party standing</dt>
              <dd className={impact.standing > 0 ? 'pos' : 'neg'}>
                {impact.standing > 0 ? `+${impact.standing.toFixed(1)}` : impact.standing.toFixed(1)}
              </dd>
            </div>
          )}
          {impact.funds !== 0 && (
            <div className="kv-row">
              <dt>Funds</dt>
              <dd className={impact.funds > 0 ? 'pos' : 'neg'}>{money(impact.funds)}</dd>
            </div>
          )}
        </dl>
        {impact.passage < 1 && (
          <p className={`small ${impact.passage >= 0.7 ? 'pos' : impact.passage >= 0.45 ? '' : 'neg'}`}>
            {Math.round(impact.passage * 100)}% chance to pass {yourChamber(state)?.name}
          </p>
        )}
        {impact.promisesKept.length > 0 && <p className="fit good small">Keeps a campaign promise</p>}
        {impact.promisesBroken.length > 0 && <p className="fit bad small">Breaks a campaign promise</p>}
        {card.rejectCost && (
          <p className="muted small">{inOffice ? 'Shelving this will cost approval.' : 'Declining costs you some goodwill.'}</p>
        )}
        <button
          className={on ? 'primary stamp' : 'stamp'}
          aria-pressed={on}
          onClick={() => {
            cue('stamp');
            if (stack) decide(id, !on);
            else setChosen(on ? chosen.filter((c) => c !== id) : [...chosen, id]);
          }}
        >
          {on ? (inOffice ? 'Signing ✓' : 'Backing ✓') : inOffice ? 'Sign into law' : 'Back this'}
        </button>
      </GameCard>
    );
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span className="muted small">
          {inOffice ? `Sign 1–${DECISIONS_PER_TURN}. Laws move approval.` : `Back 1–${DECISIONS_PER_TURN}. Words move opinion.`}
        </span>
      </div>
      {stack ? (
        <SwipeStack
          ids={hand.cardIds}
          at={at}
          chosen={chosen}
          verb={inOffice ? 'Sign' : 'Back'}
          no={inOffice ? 'Shelve' : 'Decline'}
          onDecide={decide}
          onRestart={() => {
            setAt(0);
            setChosen([]);
          }}
          render={renderCard}
          titleOf={(id) => getDecisionCard(id).title}
        />
      ) : (
        <div className="decision-grid">{hand.cardIds.map((id) => renderCard(id))}</div>
      )}
      <div className="row">
        <button className="primary" disabled={!!error} onClick={() => dispatch({ type: 'RESOLVE_DECISIONS', apply: chosen })}>
          {inOffice
            ? `Confirm: sign ${chosen.length || ''} into law`
            : `Confirm ${chosen.length || ''} stance${chosen.length === 1 ? '' : 's'}`}
        </button>
        {!precise && <span className="muted small">Raise Strategy to {PRECISE_PREVIEW_POLICY} to see exact effects.</span>}
      </div>
    </section>
  );
}

interface StackProps {
  ids: string[];
  at: number;
  chosen: string[];
  verb: string;
  no: string;
  onDecide: (id: string, yes: boolean) => void;
  onRestart: () => void;
  render: (id: string) => ReactNode;
  titleOf: (id: string) => string;
}

const THRESHOLD = 90;

/** Phones: one card at a time. Swipe right to sign or back it, left to pass. Buttons do the same. */
function SwipeStack({ ids, at, chosen, verb, no, onDecide, onRestart, render, titleOf }: StackProps) {
  const [dx, setDx] = useState(0);
  const [leaving, setLeaving] = useState<'yes' | 'no' | null>(null);
  const start = useRef<{ x: number; y: number; id: number; active: boolean } | null>(null);
  const top = ids[at];

  const commit = (yes: boolean) => {
    if (!top || leaving) return;
    cue(yes ? 'stamp' : 'deal');
    setLeaving(yes ? 'yes' : 'no');
    setTimeout(() => {
      setLeaving(null);
      setDx(0);
      onDecide(top, yes);
    }, 220);
  };

  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return;
      start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, active: false };
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      const s = start.current;
      if (!s || s.id !== e.pointerId) return;
      const mx = e.clientX - s.x;
      if (!s.active) {
        if (Math.abs(mx) < 10 || Math.abs(mx) < Math.abs(e.clientY - s.y)) return;
        s.active = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      setDx(mx);
    },
    onPointerUp: () => {
      const s = start.current;
      start.current = null;
      if (!s?.active) return;
      if (Math.abs(dx) > THRESHOLD) commit(dx > 0);
      else setDx(0);
    },
    onPointerCancel: () => {
      start.current = null;
      setDx(0);
    },
  };

  const offset = leaving === 'yes' ? 480 : leaving === 'no' ? -480 : dx;
  return (
    <div className="swipe-stack">
      <div className="swipe-dots" role="img" aria-label={`Card ${Math.min(at + 1, ids.length)} of ${ids.length}`}>
        {ids.map((id, i) => (
          <span key={id} className={i === at ? 'dot now' : chosen.includes(id) ? 'dot yes' : i < at ? 'dot no' : 'dot'} />
        ))}
      </div>
      {top ? (
        <>
          <div className="swipe-deck">
            <div
              className={dx || leaving ? 'swipe-card moving' : 'swipe-card'}
              style={{ translate: `${offset}px 0`, rotate: `${offset / 22}deg` }}
              {...handlers}
            >
              <span className="swipe-stamp yes" style={{ opacity: Math.max(0, offset / THRESHOLD) }} aria-hidden="true">
                {verb}
              </span>
              <span className="swipe-stamp no" style={{ opacity: Math.max(0, -offset / THRESHOLD) }} aria-hidden="true">
                {no}
              </span>
              {render(top)}
            </div>
            {ids.slice(at + 1, at + 3).map((id, i) => (
              <div key={id} className={`swipe-under under-${i + 1}`} aria-hidden="true" inert>
                {render(id)}
              </div>
            ))}
          </div>
          <div className="swipe-actions">
            <button onClick={() => commit(false)}>‹ {no}</button>
            <button className="primary" onClick={() => commit(true)}>
              {verb} ›
            </button>
          </div>
          <p className="muted small swipe-hint">
            Swipe right to {verb.toLowerCase()}, left to {no.toLowerCase()}.
          </p>
        </>
      ) : (
        <div className="swipe-done">
          <p>
            {chosen.length
              ? `You chose: ${chosen.map((id) => `“${titleOf(id)}”`).join(', ')}.`
              : 'You passed on everything. Pick at least one card to go on.'}
          </p>
          <button onClick={onRestart}>Start over</button>
        </div>
      )}
    </div>
  );
}
