// One place that knows whether an action is legal right now. `applyAction` calls it first, so
// the UI can ask the same question (`validateAction`) before offering a button.
import { getPerson } from '../data';
import { fileRaceError, platformError } from './campaign';
import { decisionError } from './decisions';
import { buyError } from './economy';
import { previewEvent } from './events';
import { itemError } from './loot';
import { adBlitzError, lawyersError, mobilizeError, nightFinished } from './night';
import { joinError } from './parties';
import type { Action, GameState } from './types';

/** Why the player can't end the turn right now, or undefined if they can. */
export function endTurnBlocker(state: GameState): string | undefined {
  if (state.ended) return 'Your career is over.';
  if (state.night) return 'Election night is under way.';
  if (state.pendingResult !== undefined) return 'Review the election result first.';
  if (state.career.race && !state.career.race.platform.length) return 'Choose your platform first.';
  if (state.decisions && !state.decisions.resolved) return 'Resolve this turn’s decisions first (apply 1–3).';
  return undefined;
}

const NIGHT_ACTIONS = new Set<Action['type']>([
  'NIGHT_ADVANCE',
  'NIGHT_MOBILIZE',
  'NIGHT_LAWYERS',
  'NIGHT_AD_BLITZ',
  'NIGHT_FINISH',
  'USE_ITEM',
]);
/** Team management doesn't touch the game state's flow, so it's allowed whenever the career is live. */
const ALWAYS = new Set<Action['type']>(['ASSIGN_PERSON', 'UNASSIGN_ROLE', 'DISCARD_PERSON']);

/** Why `action` can't be applied to `state`, or undefined if it can. */
export function validateAction(state: GameState, action: Action): string | undefined {
  if (action.type === 'DISMISS_RESULT') return state.pendingResult === undefined ? 'There is no result to dismiss.' : undefined;
  if (state.ended) return 'Your career is over.';
  if (state.night && !NIGHT_ACTIONS.has(action.type) && !ALWAYS.has(action.type)) return 'Election night is under way.';
  if (!state.night && NIGHT_ACTIONS.has(action.type) && action.type !== 'USE_ITEM') return 'There is no election night right now.';

  switch (action.type) {
    case 'END_TURN':
      return endTurnBlocker(state);
    case 'FILE_RACE':
      return fileRaceError(state, action.officeId);
    case 'SET_PLATFORM':
      return platformError(state, action.platform);
    case 'PLAY_EVENT': {
      try {
        return previewEvent(state, action.cardUid, action.regionId, action.issue).error;
      } catch (e) {
        return e instanceof Error ? e.message : 'That card isn’t available.';
      }
    }
    case 'RESOLVE_DECISIONS':
      return decisionError(state, action.apply);
    case 'BUY_CARD':
      return buyError(state, action.offerIndex);
    case 'RETIRE':
      return undefined;
    case 'JOIN_PARTY':
      return joinError(state, action.party);
    case 'ASSIGN_PERSON':
      return state.team.cards.some((c) => c.uid === action.uid) ? undefined : 'Not on your team.';
    case 'UNASSIGN_ROLE':
      return state.team.assigned[action.role] === undefined ? 'Nobody holds that role.' : undefined;
    case 'DISCARD_PERSON': {
      const card = state.team.cards.find((c) => c.uid === action.uid);
      return card && getPerson(card.personId) ? undefined : 'Not on your team.';
    }
    case 'USE_ITEM':
      return itemError(state, action.uid, action.regionId);
    case 'NIGHT_ADVANCE':
      return nightFinished(state.night!) ? 'Everything is counted — see the results.' : undefined;
    case 'NIGHT_MOBILIZE':
      return mobilizeError(state, action.regionId);
    case 'NIGHT_LAWYERS':
      return lawyersError(state, action.regionId);
    case 'NIGHT_AD_BLITZ':
      return adBlitzError(state);
    case 'NIGHT_FINISH':
      return undefined;
  }
}
