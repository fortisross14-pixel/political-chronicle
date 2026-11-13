// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createRun, defaultPolitician } from '../engine';
import { passTurns, readyRun } from '../engine/testUtils';
import { SAVE_KEY, clearSave, loadGame, saveGame } from './save';

describe('save / load', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a run in progress', () => {
    const state = passTurns(readyRun({ seed: 'save' }), 2);
    expect(saveGame(state)).toBe(true);
    expect(loadGame()).toEqual(state);
  });

  it('returns null when nothing is saved, after clearing, or for an old schema', () => {
    expect(loadGame()).toBeNull();
    saveGame(createRun({ seed: 'x', politician: defaultPolitician(), startingFunds: 0 }));
    clearSave();
    expect(loadGame()).toBeNull();
    localStorage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 0, state: {} }));
    expect(loadGame()).toBeNull();
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(loadGame()).toBeNull();
  });
});
