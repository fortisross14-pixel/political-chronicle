import { GameError, reject } from './errors';
import { getItem, getOffice } from '../data';
import { drawElection, finalizeElection, isPrimaryTurn, opponentsAct, resolvePrimary } from './campaign';
import { checkTurnMilestones, applyCampaignItem } from './loot';
import { adBlitz, advanceNight, finalNightShares, mobilize, sendLawyers, startNight, applyNightItem } from './night';
import { askToJoin, launchCampaign } from './launch';
import { buyPack, discardCard, keepFromPack } from './packs';
import { playPolicy } from './policy';
import { simulateYear } from './world';
import { poll } from './opinion';
import { evaluateScenario } from './scenarios';
import { endTurnBlocker, validateAction } from './validate';
import { hasAbility } from './traits';
import { rollChambers } from './legislature';
import { assignPerson, discardPerson, hasPerk, unassignRole } from './people';
import { backgroundEnergyPenalty } from './traits';
import { dealDecisions, resolveDecisions } from './decisions';
import { collectIncome } from './economy';
import { playEvent } from './events';
import { governTick } from './governing';
import { Rng } from './rng';
import { ageOf, energyForAge, MAX_AGE_ENDS_RUN, takeSnapshot } from './run';
import { isElectionTurn, monthsPerTurn, turnsInYear } from './time';
import type { Action, GameState } from './types';

/**
 * Applies a player action. Invalid actions throw; the UI checks the matching
 * `*Error` / `*Blocker` helpers first so it never sends one.
 */
export function applyAction(state: GameState, action: Action): GameState {
  reject(validateAction(state, action));
  return evaluateScenario(reduce(state, action));
}

function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'END_TURN':
      return endTurn(state);
    case 'LAUNCH_CAMPAIGN':
      return launchCampaign(state, action);
    case 'PLAY_EVENT':
      return playEvent(state, action.cardUid, action.regionId, action.issue).state;
    case 'RESOLVE_DECISIONS':
      return resolveDecisions(state, action.apply);
    case 'BUY_PACK':
      return buyPack(state, action.kind, action.tier);
    case 'KEEP_FROM_PACK':
      return keepFromPack(state, action.keep);
    case 'PLAY_POLICY':
      return playPolicy(state, action.uid, action.regionId);
    case 'DISCARD_CARD':
      return discardCard(state, action.zone, action.uid);
    case 'DISMISS_RESULT':
      return { ...state, pendingResult: undefined };
    case 'USE_ITEM':
      return state.night ? applyNightItem(state, action.uid, action.regionId) : applyCampaignItem(state, action.uid, action.regionId);
    case 'NIGHT_ADVANCE':
      return advanceNight(state);
    case 'NIGHT_MOBILIZE':
      return mobilize(state, action.regionId);
    case 'NIGHT_LAWYERS':
      return sendLawyers(state, action.regionId);
    case 'NIGHT_AD_BLITZ':
      return adBlitz(state);
    case 'NIGHT_FINISH':
      return finishNight(state);
    case 'ASK_TO_JOIN':
      return askToJoin(state, action.party, action.platform);
    case 'ASSIGN_PERSON':
      return assignPerson(state, action.uid, action.role);
    case 'UNASSIGN_ROLE':
      return unassignRole(state, action.role);
    case 'DISCARD_PERSON':
      return discardPerson(state, action.uid);
    case 'RETIRE':
      if (state.ended) return state;
      return {
        ...state,
        ended: { reason: 'retired', year: state.clock.year },
        log: [...state.log, { year: state.clock.year, turn: state.clock.turn, text: 'Retired from politics.' }],
      };
  }
}

function endTurn(state: GameState): GameState {
  const blocker = endTurnBlocker(state);
  reject(blocker);
  const rng = new Rng(state.rng);
  let s: GameState = state;

  // Opponents campaign, milestones pay out, then the turn is recorded (including the poll).
  if (s.career.race) s = checkTurnMilestones({ ...s, career: { ...s.career, race: opponentsAct(rng, s.career.race) } });
  s = { ...s, snapshots: [...s.snapshots, takeSnapshot(s)] };

  if (isPrimaryTurn(s)) s = resolvePrimary(s, rng);
  else if (s.career.race && isElectionTurn(s.clock, s.career)) {
    // Election Day: the result is drawn now and revealed on election night. The calendar waits.
    const draw = drawElection(s, rng);
    return startNight(s, rng, draw.regionShares, draw.priors, draw.finalPoll);
  }
  return advanceCalendar(s, rng);
}

/** Ends election night: applies the final count, then moves the calendar on. */
function finishNight(state: GameState): GameState {
  const night = state.night;
  if (!night) throw new GameError('No election night.');
  const rng = new Rng(state.rng);
  const nightItems = state.items.filter((i) => getItem(i.itemId).window !== 'campaign');
  let s: GameState = { ...state, night: undefined, items: state.items.filter((i) => !nightItems.includes(i)) };
  s = finalizeElection(s, finalNightShares(night), night.finalPoll);
  return advanceCalendar(s, rng);
}

function advanceCalendar(state: GameState, rng: Rng): GameState {
  let s = state;
  const months = monthsPerTurn(s.clock.turnsThisYear);
  let { year, turn, turnsThisYear } = s.clock;
  turn += 1;
  if (turn >= turnsThisYear) {
    year += 1;
    turn = 0;
    turnsThisYear = turnsInYear(s.career, year);
  }
  s = { ...s, clock: { year, turn, turnsThisYear, monthsElapsed: s.clock.monthsElapsed + months } };

  const age = ageOf(s);
  s = { ...s, energy: Math.max(1, energyForAge(age) - backgroundEnergyPenalty(s)) };
  // A new two-year cycle: legislatures change hands.
  if (turn === 0 && year % 2 === 0 && s.chambers.rolledYear !== year) s = { ...s, chambers: rollChambers(rng, year) };
  if (turn === 0) s = endOfYear(s, rng, year - 1);
  if (!s.ended && s.careerYears && turn === 0 && year >= s.startYear + s.careerYears) {
    s = {
      ...s,
      ended: { reason: 'length', year },
      log: [...s.log, { year, turn, text: `${s.careerYears} years in public life: your career is complete.` }],
    };
  }
  if (!s.ended && age >= MAX_AGE_ENDS_RUN) {
    s = {
      ...s,
      ended: { reason: 'age', year },
      log: [...s.log, { year, turn, text: `At ${Math.floor(age)}, it is time to step away from public life.` }],
    };
  }
  s = { ...s, rng: rng.state };
  if (s.ended) return { ...s, decisions: undefined };
  s = governTick(collectIncome(s));
  if (hasPerk(s, 'roadWarrior') && s.career.race) s = { ...s, energy: s.energy + 1 };
  // Comeback kid (ability): trailing by 5+ going into the final turn.
  const race = s.career.race;
  if (race?.platform.length && hasAbility(s, 'comeback_kid') && isElectionTurn(s.clock, s.career)) {
    const p = poll(s, race).decided;
    if (Math.max(...p.slice(1)) - p[0]! >= 0.05) {
      s = {
        ...s,
        energy: s.energy + 1,
        career: { ...s.career, race: { ...race, tokens: race.tokens + 1 } },
        log: [...s.log, { year, turn, text: 'Comeback kid: you dig in for the final stretch (+1 energy, +1 token).' }],
      };
    }
  }
  return dealDecisions(s);
}

/** New Year: last year's other races are decided, and a term you didn't defend ends. */
function endOfYear(state: GameState, rng: Rng, year: number): GameState {
  let s = simulateYear(state, rng, year);
  const office = s.career.office;
  if (
    office &&
    office.termEndsYear <= year &&
    !s.elections.some((e) => e.kind === 'general' && e.officeId === office.officeId && e.year === office.termEndsYear)
  ) {
    const { office: _done, ...rest } = s.career;
    s = {
      ...s,
      career: rest,
      log: [
        ...s.log,
        {
          year: year + 1,
          turn: 0,
          text: `Your term as ${getOffice(office.officeId).name} ended. ${s.world.seats[office.officeId]?.holder ?? 'Someone new'} takes over.`,
        },
      ],
    };
  }
  return s;
}
