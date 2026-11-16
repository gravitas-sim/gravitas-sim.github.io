import { describe, test, expect, beforeEach } from '@jest/globals';
import { state, holdClock } from '../js/appState.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { validateInvestigationPack } from '../js/platform/investigation.js';
import { packApi } from '../js/composer/api.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';

// A reading step holds the clock so nothing runs behind the panels; a step that
// says `motion: true`, or carries an instrument, keeps it; the step after a held
// one releases only what the hold itself paused.

const read = extra => ({ type: 'read', ...extra });
const ask = { type: 'question' };
const W = { scenario: 'a' };

beforeEach(() => {
  state.paused = false;
  holdClock(ask, null); // forget any earlier hold
  state.paused = false;
});

describe('holdClock', () => {
  test('a reading step pauses a running scene and the next step releases it', () => {
    holdClock(read(), W);
    expect(state.paused).toBe(true);
    holdClock(ask, W);
    expect(state.paused).toBe(false);
  });

  test('a reading step that declares motion, or has an instrument, keeps running', () => {
    holdClock(read({ motion: true }), W);
    expect(state.paused).toBe(false);
    holdClock(read({ tool: { id: 'x' } }), W);
    expect(state.paused).toBe(false);
  });

  test('consecutive reading steps stay held, and the first other step releases', () => {
    holdClock(read(), W);
    holdClock(read(), W);
    expect(state.paused).toBe(true);
    holdClock(read({ motion: true }), W);
    expect(state.paused).toBe(false);
  });

  test('a pause that was not the hold is never released by it', () => {
    state.paused = true;
    holdClock(read(), W);
    holdClock(ask, W);
    expect(state.paused).toBe(true);
  });

  test('a rebuilt world owns the clock again', () => {
    holdClock(read(), W);
    expect(state.paused).toBe(true);
    // A setup that starts paused is built; the hold of the old world is gone.
    holdClock(ask, { scenario: 'b' });
    expect(state.paused).toBe(true);
  });

  test('a reader who presses play on a held step is not paused again until the next one', () => {
    holdClock(read(), W);
    state.paused = false;
    holdClock(ask, W);
    expect(state.paused).toBe(false);
  });
});

describe('the steps that declare motion', () => {
  const declared = INVESTIGATIONS.flatMap(l =>
    l.steps.filter(s => s.motion !== undefined).map(s => `${l.id}/${s.sid}`)
  );

  test('are reading steps, and are exactly the list the change record gives', () => {
    for (const l of INVESTIGATIONS)
      for (const s of l.steps)
        if (s.motion !== undefined) {
          expect(s.type).toBe('read');
          expect(s.motion).toBe(true);
        }
    expect(declared.sort()).toEqual([
      'binary-star-planets/nothing-here-is-random',
      'black-holes/not-a-hole-and-not',
      'keplers-laws/what-you-are-looking-at',
      'orbital-energy/something-that-came-from-outside',
      'retrograde-motion/what-you-are-looking-at',
      'why-rings/a-pass-inside-the-limit',
    ]);
  });

  test('an investigation pack may declare it on a reading step and nowhere else', () => {
    const api = packApi();
    const pack = JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION));
    const reading = pack.steps.find(s => s.type === 'read');
    const other = pack.steps.find(s => s.type !== 'read');
    reading.motion = true;
    expect(validateInvestigationPack(pack, api)).toEqual([]);
    other.motion = true;
    const codes = validateInvestigationPack(pack, api).map(e => e.path);
    expect(codes.some(p => p.endsWith(other.sid) || p.includes('steps['))).toBe(
      true
    );
  });
});
