// =============================================================================
// The observing lab
// -----------------------------------------------------------------------------
// The lab's state - what is modelled, where the playhead is, which noise
// realization is under the signal, what is pinned against what - is separate
// from the canvas that draws it, so all of it can be checked here without a
// browser. The drawing itself is exercised through a stub context: a typo in a
// branch only one preset reaches should be a failing test rather than a blank
// panel a student finds.
//
// Three properties carry most of the weight:
//
//   the window is an excerpt and says so. A neutron-star inspiral is 158
//   seconds; the lab models the last eight and reports both numbers.
//   noise is fixed. Changing a mass must not redraw it, or a controlled
//   comparison is comparing two things at once.
//   the playhead is one number. The plots, the source view and the readout are
//   all evaluations of the same timeline at the same moment.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  PRESETS,
  LIMITS,
  BAND_FLOOR_HZ,
  MAX_WINDOW_SECONDS,
  clampParams,
  describe as describeLab,
  signatureOf,
  startFrequencyFor,
  createLab,
  rebuild,
  advance,
  seek,
  seekFraction,
  cursorFraction,
  restart,
  replay,
  pin,
  unpin,
  comparison,
  newNoiseRealization,
  noiseFor,
  noiseAt,
  observedAt,
  snapshotOf,
  defaultSpeedFor,
} from '../js/gwLab.js';
import { GW_WIDGETS } from '../js/gwWidgets.js';
import { getWidget } from '../js/widgets.js';
import { iscoFrequency, chirpMass } from '../js/gw/waveform.js';

/** A canvas whose every 2D method exists and does nothing. */
function stubCanvas() {
  const gradient = { addColorStop() {} };
  const ctx = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        if (/^create(Linear|Radial|Conic)Gradient$/.test(prop))
          return () => gradient;
        if (prop === 'measureText') return () => ({ width: 30 });
        return () => undefined;
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );
  return {
    clientWidth: 460,
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
  };
}

const lab = () => getWidget('gw-lab');
const real = () => getWidget('gw-real');
const defaults = w => Object.fromEntries(w.controls.map(c => [c.id, c.value]));

describe('the presets', () => {
  test('there are three, and they differ only in their masses and geometry', () => {
    expect(PRESETS.length).toBe(3);
    for (const p of PRESETS) {
      expect(p.m1).toBeGreaterThan(0);
      expect(p.m2).toBeGreaterThan(0);
      expect(p.distanceMpc).toBeGreaterThan(0);
      expect(p.windowSeconds).toBeGreaterThan(0);
      expect(p.windowSeconds).toBeLessThanOrEqual(MAX_WINDOW_SECONDS);
    }
  });

  test('each has a distinct chirp mass, so their signals genuinely differ', () => {
    const mcs = PRESETS.map(p => chirpMass(p.m1, p.m2));
    expect(new Set(mcs.map(m => m.toFixed(3))).size).toBe(3);
  });

  test('each stops at its own ISCO, which is set by the total mass alone', () => {
    for (const p of PRESETS) {
      expect(describeLab(p).iscoHz).toBeCloseTo(iscoFrequency(p.m1 + p.m2), 6);
    }
  });

  test('the black-hole preset stops lowest and the neutron-star one highest', () => {
    const byId = Object.fromEntries(PRESETS.map(p => [p.id, describeLab(p)]));
    expect(byId.bbh.iscoHz).toBeLessThan(byId.nsbh.iscoHz);
    expect(byId.nsbh.iscoHz).toBeLessThan(byId.bns.iscoHz);
  });

  test('every preset is frozen, so a widget cannot edit the catalogue', () => {
    for (const p of PRESETS) expect(Object.isFrozen(p)).toBe(true);
  });
});

describe('the modelled window is an excerpt, and says so', () => {
  test('a black-hole binary fits whole, and is not marked as excerpted', () => {
    const f = describeLab(PRESETS.find(p => p.id === 'bbh'));
    expect(f.excerpted).toBe(false);
    expect(f.fStartHz).toBeCloseTo(BAND_FLOOR_HZ, 6);
    expect(f.windowActualSeconds).toBeCloseTo(f.fullBandSeconds, 6);
  });

  test('a neutron-star binary does not, and both numbers are reported', () => {
    const f = describeLab(PRESETS.find(p => p.id === 'bns'));
    expect(f.excerpted).toBe(true);
    expect(f.fullBandSeconds).toBeGreaterThan(150);
    expect(f.windowActualSeconds).toBeCloseTo(8, 1);
    expect(f.fullBandCycles).toBeGreaterThan(4500);
    expect(f.cyclesInWindow).toBeLessThan(f.fullBandCycles);
  });

  test('the start frequency is never below the band floor', () => {
    for (const seconds of [0.5, 8, 1000]) {
      const f = startFrequencyFor(
        clampParams({
          m1: 1.4,
          m2: 1.4,
          distanceMpc: 40,
          windowSeconds: seconds,
        })
      );
      expect(f).toBeGreaterThanOrEqual(BAND_FLOOR_HZ - 1e-9);
    }
  });

  test('a window longer than the whole inspiral gives the whole inspiral', () => {
    const f = describeLab({
      m1: 36,
      m2: 29,
      distanceMpc: 410,
      inclinationDeg: 0,
      windowSeconds: MAX_WINDOW_SECONDS,
    });
    expect(f.fStartHz).toBeCloseTo(BAND_FLOOR_HZ, 6);
    expect(f.excerpted).toBe(false);
  });
});

describe('parameters are bounded', () => {
  test('every control is clamped into its own limits', () => {
    const c = clampParams({
      m1: 1e6,
      m2: -4,
      distanceMpc: 0,
      inclinationDeg: 400,
    });
    expect(c.m1).toBe(LIMITS.m1.max);
    expect(c.m2).toBe(LIMITS.m2.min);
    expect(c.distanceMpc).toBe(LIMITS.distanceMpc.min);
    expect(c.inclinationDeg).toBe(LIMITS.inclinationDeg.max);
  });

  test('nonsense becomes something valid rather than NaN', () => {
    const c = clampParams({
      m1: 'x',
      m2: null,
      distanceMpc: undefined,
      inclinationDeg: NaN,
    });
    for (const v of Object.values(c)) expect(Number.isFinite(v)).toBe(true);
  });

  test('the signature changes when the waveform does and not otherwise', () => {
    const base = {
      m1: 10,
      m2: 10,
      distanceMpc: 100,
      inclinationDeg: 0,
      windowSeconds: 2,
    };
    expect(signatureOf(base)).toBe(signatureOf({ ...base }));
    expect(signatureOf(base)).not.toBe(signatureOf({ ...base, m1: 11 }));
    expect(signatureOf(base)).not.toBe(
      signatureOf({ ...base, distanceMpc: 200 })
    );
  });
});

describe('the playhead', () => {
  let state;
  beforeEach(() => {
    state = createLab({ params: PRESETS[0] });
  });

  test('starts at the beginning of the modelled span', () => {
    expect(state.cursorT).toBeCloseTo(state.timeline.tStart, 9);
    expect(cursorFraction(state)).toBeCloseTo(0, 9);
  });

  test('cannot be seeked outside the span', () => {
    seek(state, -1e9);
    expect(state.cursorT).toBe(state.timeline.tStart);
    seek(state, 1e9);
    expect(state.cursorT).toBe(state.timeline.tEnd);
  });

  test('advances only while playing', () => {
    const before = state.cursorT;
    advance(state, 0.1);
    expect(state.cursorT).toBe(before);
    state.playing = true;
    advance(state, 0.1);
    expect(state.cursorT).toBeGreaterThan(before);
  });

  test('stops at the end rather than looping, because the binary does not', () => {
    state.playing = true;
    const ended = advance(state, 1e6);
    expect(ended).toBe(true);
    expect(state.playing).toBe(false);
    expect(state.cursorT).toBe(state.timeline.tEnd);
  });

  test('restart returns to the beginning without starting playback', () => {
    seekFraction(state, 0.8);
    restart(state);
    expect(cursorFraction(state)).toBeCloseTo(0, 9);
    expect(state.playing).toBe(false);
  });

  test('replay returns and runs', () => {
    seekFraction(state, 0.8);
    replay(state);
    expect(cursorFraction(state)).toBeCloseTo(0, 9);
    expect(state.playing).toBe(true);
  });

  test('is preserved as a fraction when the waveform is rebuilt', () => {
    seekFraction(state, 0.4);
    state.params = { ...state.params, distanceMpc: 900 };
    rebuild(state);
    expect(cursorFraction(state)).toBeCloseTo(0.4, 3);
  });

  test('the default speed makes every preset take a similar time to watch', () => {
    for (const p of PRESETS) {
      const f = describeLab(p);
      const seconds = f.windowActualSeconds / defaultSpeedFor(f);
      expect(seconds).toBeGreaterThan(2);
      expect(seconds).toBeLessThan(20);
    }
  });
});

describe('the noise realization is fixed on purpose', () => {
  test('is not redrawn when a parameter changes', () => {
    const state = createLab({ params: PRESETS[0], noiseOn: true });
    const before = Array.from(noiseFor(state).slice(0, 200));
    state.params = { ...state.params, m1: 40 };
    rebuild(state);
    const after = Array.from(noiseFor(state).slice(0, 200));
    expect(after).toEqual(before);
  });

  test('is redrawn only when the student asks', () => {
    const state = createLab({ params: PRESETS[0], noiseOn: true });
    const before = Array.from(noiseFor(state).slice(0, 200));
    newNoiseRealization(state);
    const after = Array.from(noiseFor(state).slice(0, 200));
    expect(after).not.toEqual(before);
  });

  test('two labs on the same seed see the same noise', () => {
    const a = createLab({
      params: PRESETS[0],
      noiseSeed: 'same',
      noiseOn: true,
    });
    const b = createLab({
      params: PRESETS[0],
      noiseSeed: 'same',
      noiseOn: true,
    });
    expect(Array.from(noiseFor(a).slice(0, 100))).toEqual(
      Array.from(noiseFor(b).slice(0, 100))
    );
  });

  test('contributes nothing at all while it is switched off', () => {
    const state = createLab({ params: PRESETS[0], noiseOn: false });
    const t = state.timeline.tStart + state.timeline.duration / 2;
    expect(noiseAt(state, t)).toBe(0);
    expect(observedAt(state, t)).toBe(state.timeline.strainAtTime(t));
  });

  test('adds to the signal rather than replacing it', () => {
    const state = createLab({ params: PRESETS[0], noiseOn: true });
    const t = state.timeline.tStart + state.timeline.duration / 2;
    expect(observedAt(state, t)).toBeCloseTo(
      state.timeline.strainAtTime(t) + noiseAt(state, t),
      30
    );
  });

  test('is bounded however long the inspiral is', () => {
    const state = createLab({
      params: PRESETS.find(p => p.id === 'bns'),
      noiseOn: true,
    });
    expect(noiseFor(state).length).toBeLessThanOrEqual(
      MAX_WINDOW_SECONDS * 4096 + 1
    );
  });
});

describe('the controlled comparison', () => {
  test('reports nothing until something is pinned', () => {
    const state = createLab({ params: PRESETS[0] });
    expect(comparison(state)).toBe(null);
  });

  test('names the one thing that changed', () => {
    const state = createLab({ params: PRESETS[0] });
    pin(state);
    state.params = { ...state.params, distanceMpc: 820 };
    rebuild(state);
    const c = comparison(state);
    expect(c.changed).toEqual(['distanceMpc']);
    expect(c.held).toEqual(['m1', 'm2', 'inclinationDeg']);
    expect(c.controlled).toBe(true);
  });

  test('says so when more than one thing changed', () => {
    const state = createLab({ params: PRESETS[0] });
    pin(state);
    state.params = { ...state.params, distanceMpc: 820, m1: 40 };
    rebuild(state);
    const c = comparison(state);
    expect(c.changed.length).toBe(2);
    expect(c.controlled).toBe(false);
  });

  test('records whether the two ran under the same noise', () => {
    const state = createLab({ params: PRESETS[0], noiseOn: true });
    pin(state);
    expect(comparison(state).sameNoise).toBe(true);
    newNoiseRealization(state);
    expect(comparison(state).sameNoise).toBe(false);
  });

  test('unpinning forgets it', () => {
    const state = createLab({ params: PRESETS[0] });
    pin(state);
    unpin(state);
    expect(comparison(state)).toBe(null);
  });
});

describe('a snapshot carries what a claim would rest on', () => {
  const state = createLab({
    params: PRESETS.find(p => p.id === 'bns'),
    noiseOn: true,
  });
  seekFraction(state, 0.7);
  const snap = snapshotOf(state);

  test.each([
    'model',
    'massFrame',
    'chirpMassSun',
    'distanceMpc',
    'inclinationDeg',
    'effectiveDistanceMpc',
    'detectorResponse',
    'iscoHz',
    'terminatedAt',
    'windowSeconds',
    'fullBandSeconds',
    'excerpted',
    'cursorSecondsToMerger',
    'frequencyAtCursorHz',
    'vOverCAtCursor',
    'fidelityAtCursor',
    'playbackSpeed',
  ])('records %s', field => {
    expect(snap[field]).not.toBe(undefined);
    expect(snap[field]).not.toBe(null);
  });

  test('says the masses are detector-frame, because they are', () => {
    expect(snap.massFrame).toBe('detector');
  });

  test('names the noise curve and its seed when noise is on', () => {
    expect(snap.noise.seed).toBeTruthy();
    expect(snap.noise.curve).toMatch(/aLIGO/);
  });

  test('carries no noise block when noise is off', () => {
    const quiet = createLab({ params: PRESETS[0], noiseOn: false });
    expect(snapshotOf(quiet).noise).toBe(null);
  });

  test('the numbers agree with the timeline at the same moment', () => {
    expect(snap.frequencyAtCursorHz).toBeCloseTo(
      state.timeline.frequencyAtTime(state.cursorT),
      9
    );
    expect(snap.cursorSecondsToMerger).toBeCloseTo(-state.cursorT, 12);
  });
});

describe('the widgets', () => {
  test('both are registered and reachable by id', () => {
    expect(GW_WIDGETS.length).toBe(2);
    for (const w of GW_WIDGETS) {
      expect(getWidget(w.id)).toBe(w);
      expect(typeof w.draw).toBe('function');
      expect(typeof w.readout).toBe('function');
      expect(typeof w.title).toBe('string');
      expect(w.title.length).toBeGreaterThan(0);
    }
  });

  test('every control default sits inside its own range', () => {
    for (const w of GW_WIDGETS) {
      for (const c of w.controls) {
        expect(c.value).toBeGreaterThanOrEqual(c.min);
        expect(c.value).toBeLessThanOrEqual(c.max);
        expect(c.step).toBeGreaterThan(0);
      }
    }
  });

  test('every preset sets only controls the widget has', () => {
    for (const w of GW_WIDGETS) {
      const ids = new Set(w.controls.map(c => c.id));
      const presets =
        typeof w.presets === 'function' ? w.presets({}) : w.presets;
      for (const p of presets || []) {
        for (const key of Object.keys(p.values))
          expect(ids.has(key)).toBe(true);
      }
    }
  });

  test('the lab draws in every view a step can ask for, without throwing', () => {
    const w = lab();
    const v = defaults(w);
    for (const view of ['signal', 'source', 'both', undefined]) {
      for (const noise of [false, true]) {
        const spec = { view, noise };
        w.reset(v, { autorun: false, spec });
        expect(() => w.draw(stubCanvas(), v, undefined, spec)).not.toThrow();
        expect(Array.isArray(w.readout(v, undefined, spec))).toBe(true);
      }
    }
  });

  test('the lab draws every preset, at both ends of the timeline', () => {
    const w = lab();
    const presets = typeof w.presets === 'function' ? w.presets({}) : w.presets;
    for (const p of presets) {
      const v = { ...defaults(w), ...p.values };
      for (const cursor of [0, 0.5, 1]) {
        v.cursor = cursor;
        w.reset(v, { autorun: false, spec: {} });
        expect(() =>
          w.draw(stubCanvas(), v, undefined, { view: 'both' })
        ).not.toThrow();
        const rows = w.readout(v, undefined, {});
        expect(rows.every(r => typeof r.value === 'string')).toBe(true);
      }
    }
  });

  test('a spec that asks for an action gets it', () => {
    // The other direction from the sweep below, and the one that matters: the
    // sweep only exercises the actions that are declared, so a button that was
    // never added passes it silently. Both of these were, once.
    const w = lab();
    const ids = spec => w.actions(spec).map(a => a.id);
    expect(ids({})).toContain('play');
    expect(ids({})).toContain('replay');
    // Listening is offered everywhere and required nowhere.
    expect(ids({})).toContain('listen');
    expect(ids({})).toContain('noise');
    expect(ids({ noiseControls: false })).not.toContain('noise');
    expect(ids({})).not.toContain('pin');
    expect(ids({ compare: true })).toContain('pin');
    expect(ids({ compare: true })).toContain('unpin');
    expect(ids({})).not.toContain('capture');
    expect(ids({ capture: true })).toContain('capture');
  });

  test('every action is handled and leaves the lab in a drawable state', () => {
    const w = lab();
    const v = defaults(w);
    const spec = { compare: true, capture: true };
    w.reset(v, { autorun: false, spec });
    for (const a of w.actions(spec)) {
      expect(() => w.act(a.id, v, spec)).not.toThrow();
      expect(() => w.draw(stubCanvas(), v, undefined, spec)).not.toThrow();
    }
  });

  test('the readout never prints a raw message id', () => {
    const w = lab();
    const v = defaults(w);
    w.reset(v, { autorun: false, spec: { compare: true } });
    w.act('pin', v, { compare: true });
    for (const row of w.readout(v, undefined, { compare: true })) {
      expect(row.label).not.toMatch(/^gwW\./);
      expect(row.value).not.toMatch(/^gwW\./);
    }
  });

  test('the real-data widget draws both of its modes', () => {
    const w = real();
    const v = defaults(w);
    for (const mode of ['detectors', 'reconstruction']) {
      expect(() => w.draw(stubCanvas(), v, undefined, { mode })).not.toThrow();
      const rows = w.readout(v, undefined, { mode });
      expect(rows.length).toBeGreaterThan(3);
    }
  });

  test('the real-data readout always names its source, DOI and licence', () => {
    const w = real();
    const rows = w.readout(defaults(w), undefined, {});
    const text = rows.map(r => r.value).join(' | ');
    expect(text).toMatch(/10\.1103\/PhysRevLett\.116\.061102/);
    expect(text).toMatch(/CC BY 4\.0/);
    expect(text).toMatch(/Abbott/);
  });

  test('the real-data widget states what the student has applied', () => {
    const w = real();
    const v = { shift: 6.9, invert: 1 };
    const rows = w.readout(v, undefined, { mode: 'detectors' });
    const applied = rows.find(r => r.value.includes('6.90'));
    expect(applied).toBeTruthy();
  });
});
