import { describe, test, expect, beforeEach } from '@jest/globals';
import { state, holdClock, releaseHold } from '../js/appState.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { validateInvestigationPack } from '../js/platform/investigation.js';
import { packApi, checkInvestigationPack } from '../js/composer/api.js';
import { remixBuiltin } from '../js/composer/remixApi.js';
import { EXAMPLE_INVESTIGATION } from '../js/composer/example.js';
import { compileInvestigation } from '../js/composer/compile.js';

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

  test('a reading step with a pauseAt watch keeps running, so the watch can fire', () => {
    holdClock(read({ pauseAt: { kind: 'transit' } }), W);
    expect(state.paused).toBe(false);
    const dip = INVESTIGATIONS.find(
      l => l.id === 'transit-photometry'
    ).steps.find(s => s.sid === 'the-shape-of-the-dip');
    expect(dip.type).toBe('read');
    holdClock(dip, W);
    expect(state.paused).toBe(false);
  });

  test('a pause the reader makes after a hold is theirs once the hold is released', () => {
    holdClock(read(), W);
    state.paused = false; // Play ...
    state.paused = true; // ... then Pause: the transport releases the hold
    releaseHold();
    holdClock(ask, W);
    expect(state.paused).toBe(true);
  });

  test('closing or opening a lesson drops a hold the old step left', () => {
    holdClock(read(), W);
    releaseHold();
    state.paused = false;
    state.paused = true;
    holdClock(ask, W);
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
      'binary-star-planets/two-suns',
      'black-holes/not-a-hole-and-not',
      'orbital-energy/something-that-came-from-outside',
      'retrograde-motion/what-you-are-looking-at',
      'weighing-stars/what-are-they-going-round',
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

describe('a pack carries motion through the compiler and a remix', () => {
  test('compiling a pack keeps motion on the reading step that has it and no other', () => {
    const pack = JSON.parse(JSON.stringify(EXAMPLE_INVESTIGATION));
    const reads = pack.steps.filter(s => s.type === 'read');
    reads[0].motion = true;
    const lesson = compileInvestigation(pack, packApi()).lesson;
    const got = sid => lesson.steps.find(s => s.sid === sid);
    expect(got(reads[0].sid).motion).toBe(true);
    for (const s of lesson.steps)
      if (s.sid !== reads[0].sid) expect(s.motion).toBeUndefined();
  });

  test('a remix of a lesson with a moving reading step keeps it', async () => {
    const { pack } = await remixBuiltin('weighing-stars', { id: 'my-ws' });
    const v = await checkInvestigationPack(pack);
    expect(v.errors).toEqual([]);
    const out = v.compiled.lesson.steps.find(
      s => s.sid === 'what-are-they-going-round'
    );
    expect(out.motion).toBe(true);
    // A held reading step stays without it.
    expect(
      v.compiled.lesson.steps.find(s => s.sid === 'watch-them')?.motion
    ).toBeUndefined();
  });
});
