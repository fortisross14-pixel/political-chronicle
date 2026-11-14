// Scenarios (missions): a preset start, an objective with a deadline, and star goals (DESIGN_V2 §8.1).
import { getOffice, getScenario, PARTIES } from '../data';
import type { Scenario, StarRule } from '../data';
import { autoAllocate, buildRunConfig } from './creation';
import { dealDecisions } from './decisions';
import { newTerm } from './governing';
import { nudgeRecognition } from './opinion';
import { createRun } from './run';
import { turnsInYear } from './time';
import type { ElectionRecord, GameState } from './types';

export interface ScenarioStart {
  name: string;
  artifacts: string[];
  seed: string;
}

/** Builds the opening state of a scenario. */
export function createScenarioRun(scenarioId: string, start: ScenarioStart): GameState {
  const scenario = getScenario(scenarioId);
  const { setup } = scenario;
  const input = {
    ...setup.character,
    name: start.name,
    allocation: setup.character.allocation ?? autoAllocate(setup.character.backgroundId, setup.character.age),
  };
  const config = buildRunConfig(input, start.seed);
  let s = createRun({
    ...config,
    earliestYear: setup.startYear,
    exactYear: !!setup.office,
    raceOfficeId: scenario.objective.officeId,
    artifacts: setup.pure ? [] : start.artifacts,
    modifiers: { opponentRecognition: setup.opponentRecognition ?? 1, opponentActivity: setup.opponentActivity ?? 0 },
  });

  if (setup.office) {
    const o = setup.office;
    const office = getOffice(o.officeId);
    const shares = Object.fromEntries(office.regionIds.map((id) => [id, [o.share, 1 - o.share]]));
    const term = {
      ...newTerm(o.officeId, o.wonYear, shares, o.platform),
      approval: Object.fromEntries(office.regionIds.map((id) => [id, o.approval])),
    };
    const regions = { ...s.regions };
    for (const id of office.regionIds)
      regions[id] = {
        ...regions[id]!,
        recognition: nudgeRecognition(regions[id]!.recognition, 0.5),
        favorability: Math.max(regions[id]!.favorability, 0.15),
      };
    const past: ElectionRecord = {
      officeId: o.officeId,
      year: o.wonYear,
      kind: 'general',
      candidates: [
        { name: start.name, isPlayer: true, affiliation: setup.party?.id ?? 'IND', lean: 0 },
        {
          name: 'Your last opponent',
          isPlayer: false,
          affiliation: office.partisan ? (setup.party?.id === 'DU' ? 'RP' : 'DU') : 'IND',
          lean: 0,
        },
      ],
      regionShares: shares,
      totalShares: [o.share, 1 - o.share],
      finalPoll: o.share,
      playerWon: true,
    };
    s = {
      ...s,
      regions,
      record: Object.fromEntries(o.platform.map((p) => [p.issue, p.stance])),
      elections: [past],
      career: { ...s.career, office: term, platform: o.platform.map((p) => ({ ...p })) },
      world: {
        ...s.world,
        seats: {
          ...s.world.seats,
          [o.officeId]: { holder: start.name, affiliation: setup.party?.id ?? 'IND', since: o.wonYear, isPlayer: true },
        },
      },
      log: [...s.log, { year: setup.startYear, turn: 0, text: `You are ${office.name}.` }],
    };
  }
  if (setup.party) {
    s = {
      ...s,
      career: { ...s.career, affiliation: setup.party.id, partyStanding: setup.party.standing },
      log: [...s.log, { year: setup.startYear, turn: 0, text: `A member of the ${PARTIES[setup.party.id].name}.` }],
    };
  }
  if (setup.funds) s = { ...s, funds: s.funds + setup.funds };
  s = {
    ...s,
    clock: { ...s.clock, turnsThisYear: turnsInYear(s.career, s.clock.year) },
    scenario: { id: scenarioId, startYear: s.startYear },
  };
  return dealDecisions({ ...s, decisions: undefined });
}

/** The winning election that completes the objective, if any. */
function objectiveWin(state: GameState, scenario: Scenario): ElectionRecord | undefined {
  const obj = scenario.objective;
  const from = obj.minYear ?? state.scenario!.startYear;
  return state.elections.find(
    (e) => e.kind === 'general' && e.officeId === obj.officeId && e.playerWon && e.year >= from && e.year <= obj.by,
  );
}

export function starEarned(state: GameState, scenario: Scenario, rule: StarRule, win: ElectionRecord): boolean {
  const start = state.scenario!.startYear;
  switch (rule.kind) {
    case 'win':
      return true;
    case 'share':
      return win.totalShares[0]! >= rule.min;
    case 'noBrokenPromises':
      return !state.promises.some((p) => p.year >= start && !p.kept);
    case 'approval': {
      const snap = [...state.snapshots].reverse().find((x) => x.year === win.year && x.approval !== undefined);
      return (snap?.approval ?? 0) >= rule.min;
    }
    case 'noPrimary':
      return !state.elections.some((e) => e.kind === 'primary' && e.officeId === scenario.objective.officeId && e.year === win.year);
    case 'standing':
      return (state.career.partyStanding ?? 0) >= rule.min;
    case 'firstTry':
      return (
        state.elections.filter((e) => e.kind === 'general' && e.officeId === scenario.objective.officeId && e.year >= start).length === 1
      );
    case 'carryRegion': {
      const shares = win.regionShares[rule.regionId];
      return !!shares && shares[0]! > Math.max(...shares.slice(1));
    }
  }
}

/** Checks the objective after every action; ends the run when it's won or lost. */
export function evaluateScenario(state: GameState): GameState {
  const run = state.scenario;
  if (!run || run.result || state.night) return state;
  const scenario = getScenario(run.id);
  const win = objectiveWin(state, scenario);
  const year = state.clock.year;
  if (win) {
    const stars = scenario.stars.filter((g) => starEarned(state, scenario, g.rule, win)).map((g) => g.id);
    return {
      ...state,
      scenario: { ...run, result: { won: true, stars, year, reason: `Objective complete: ${scenario.objective.text}.` } },
      ended: { reason: 'scenario', year },
      decisions: undefined,
    };
  }
  const deadlinePassed = year > scenario.objective.by;
  if (deadlinePassed || state.ended) {
    const reason = deadlinePassed ? `Time ran out: ${scenario.objective.text}.` : 'Your career ended before the objective.';
    return {
      ...state,
      scenario: { ...run, result: { won: false, stars: [], year, reason } },
      ended: state.ended ?? { reason: 'scenario', year },
      decisions: undefined,
    };
  }
  return state;
}
