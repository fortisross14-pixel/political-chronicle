// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createRun, defaultPolitician } from '../engine';
import { passTurns, readyRun } from '../engine/testUtils';
import { SAVE_KEY, clearSave, loadAllSlots, loadGame, saveGame, SLOT_COUNT } from './save';

describe('save / load', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a run in progress', () => {
    const state = passTurns(readyRun({ seed: 'save' }), 2);
    expect(saveGame(state)).toBe(true);
    expect(loadGame()).toEqual(state);
  });

  it('returns null when nothing is saved, after clearing, or for an old schema', () => {
    expect(loadGame()).toBeNull();
    saveGame(createRun({ seed: 'x', politician: defaultPolitician(), wealth: 0 }));
    clearSave();
    expect(loadGame()).toBeNull();
    localStorage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 0, state: {} }));
    expect(loadGame()).toBeNull();
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(loadGame()).toBeNull();
  });

  it('keeps three runs side by side; slot 1 is the original save', () => {
    const a = passTurns(readyRun({ seed: 'slot-a' }), 1);
    const b = passTurns(readyRun({ seed: 'slot-b' }), 2);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ schemaVersion: 12, savedAt: 'x', state: a }));
    saveGame(b, 2);
    const slots = loadAllSlots();
    expect(slots).toHaveLength(SLOT_COUNT);
    expect(slots[0]!.state).toEqual(a);
    expect(slots[1]!.state).toBeNull();
    expect(slots[2]!.state).toEqual(b);
    clearSave(2);
    expect(loadGame(2)).toBeNull();
    expect(loadGame(0)).toEqual(a);
  });
});
