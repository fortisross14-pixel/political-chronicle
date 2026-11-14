/**
 * A move the rules don't allow (spending energy you don't have, ending a turn with decisions
 * pending…). The UI shows the message to the player. Anything else thrown by the engine is a
 * bug.
 */
export class GameError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid_action' | 'invalid_character' = 'invalid_action',
  ) {
    super(message);
    this.name = 'GameError';
  }
}

/** Throws a GameError when `error` is set. Used by every action handler as its own guard. */
export function reject(error: string | undefined): void {
  if (error) throw new GameError(error);
}
