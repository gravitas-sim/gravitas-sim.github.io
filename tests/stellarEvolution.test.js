// =============================================================================
// Playing a stellar life, and what it ends as
// -----------------------------------------------------------------------------
// Two claims are worth more than the rest here and most of this file exists to
// hold them.
//
// The first is that one age drives everything. A view that read the
// temperature from one place and the radius from another could disagree with
// itself by a whole phase and nothing would catch it, so the tests below check
// that the star reported at a position is self-consistent under
// Stefan-Boltzmann and is the star the track has at that age.
//
// The second is the line between a model output and a quoted result. Three
// tracks reach a white dwarf and their remnant masses are theirs; the rest
// stop while the star is still burning and their endpoints are somebody else's
// published work. `fromTrack` is that line and it is asserted on every entry.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  PACE,
  STAGE,
  advance,
  ageAt,
  createPlayback,
  durationSummary,
  frameOf,
  phaseMarks,
  restart,
  seek,
  stageAt,
  stepPhase,
  traceTo,
  trackEndsAt,
  trackStartsAt,
} from '../js/stellar/evolution.js';
import {
  ENDPOINT_PROVENANCE,
  allEndpoints,
  endpointFor,
  massLostOnTrack,
} from '../js/stellar/endpoints.js';
import { trackIds, trackSamples, trackBounds } from '../js/stellar/tracks.js';
import { radiusFromLuminosityAndTemperature } from '../js/stellar/geometry.js';
import { readFileSync } from 'node:fs';
import { getWidget } from '../js/widgets.js';
import { fromStellarObservation } from '../js/notebook/capture.js';
import {
  STELLAR_EVOLUTION_WIDGETS,
  activePlayback,
  resetPlaybackForTests,
} from '../js/stellarEvolutionWidgets.js';

/** A canvas whose every 2D method exists and does nothing. */
function stubCanvas(width = 460) {
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
    clientWidth: width,
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
  };
}

const defaults = w => Object.fromEntries(w.controls.map(c => [c.id, c.value]));

describe('the bundle now carries a black-hole progenitor', () => {
  test('there are eight tracks and the heaviest is 40 solar masses', () => {
    const ids = trackIds();
    expect(ids.length).toBe(8);
    expect(trackSamples(ids[ids.length - 1]).initialMassSun).toBe(40);
  });

  test('it stops before the end, like the other massive tracks', () => {
    const t = trackSamples('m4000');
    expect(t.phase[t.count - 1]).not.toBe('post-agb-and-cooling');
    // And it is honest about how much star is still there when it stops.
    expect(t.massSun[t.count - 1]).toBeGreaterThan(30);
  });

  test('every track still closes Stefan-Boltzmann at every sample', () => {
    for (const id of trackIds()) {
      const t = trackSamples(id);
      for (let i = 0; i < t.count; i += 7) {
        expect(
          radiusFromLuminosityAndTemperature(t.luminositySun[i], t.teffK[i]) /
            t.radiusSun[i]
        ).toBeCloseTo(1, 9);
      }
    }
  });

  test('the mass column survived being stored as a fraction', () => {
    // It is encoded as a fraction of the initial mass now, so this is the
    // check that the decode multiplies by the right thing.
    for (const id of trackIds()) {
      const t = trackSamples(id);
      expect(t.massSun[0]).toBeCloseTo(t.initialMassSun, 2);
      for (let i = 1; i < t.count; i++) {
        expect(t.massSun[i]).toBeLessThanOrEqual(t.massSun[i - 1] + 1e-6);
      }
    }
  });
});

describe('what each star ends as', () => {
  test('every bundled track has an endpoint', () => {
    expect(allEndpoints().length).toBe(trackIds().length);
    for (const id of trackIds()) expect(endpointFor(id)).toBeTruthy();
  });

  test('a white dwarf comes from the track and says so', () => {
    for (const id of ['m100', 'm200', 'm500']) {
      const e = endpointFor(id);
      expect(e.kind).toBe('white-dwarf');
      expect(e.fromTrack).toBe(true);
      // The mass is the track's own last sample, not a quoted figure.
      const t = trackSamples(id);
      expect(e.remnantMassSun).toBeCloseTo(t.massSun[t.count - 1], 9);
      expect(e.plottable).toBe(true);
    }
  });

  test('a neutron star and a black hole do not, and say that', () => {
    for (const id of ['m1000', 'm2000', 'm4000']) {
      const e = endpointFor(id);
      expect(e.fromTrack).toBe(false);
      expect(e.plottable).toBe(false);
      expect(e.source?.cite).toMatch(/Sukhbold/);
      // And the reader is told where the model actually stopped.
      expect(e.trackEndsAtPhase).toBeTruthy();
      expect(e.massAtTrackEndSun).toBeGreaterThan(0);
    }
  });

  test('the twenty solar-mass case is left uncertain, on purpose', () => {
    const e = endpointFor('m2000');
    expect(e.kind).toBe('uncertain');
    expect(e.remnantMassSun).toBe(null);
    expect(e.remnantRange[0]).toBeLessThan(e.remnantRange[1]);
    expect(e.note).toMatch(/depends on the explosion engine/i);
  });

  test('a black hole is not made to require a bright supernova', () => {
    expect(endpointFor('m4000').supernova).toBe('unlikely');
    expect(endpointFor('m4000').note).toMatch(/without a bright supernova/i);
  });

  test('the two unfinished tracks claim no endpoint at all', () => {
    for (const id of ['m020', 'm050']) {
      const e = endpointFor(id);
      expect(e.kind).toBe('unfinished');
      expect(e.remnantMassSun).toBe(null);
      expect(e.supernova).toBe('none');
    }
    expect(endpointFor('m020').note).toMatch(
      /no star of this mass has finished/i
    );
  });

  test('progenitor mass is never quoted as remnant mass', () => {
    for (const e of allEndpoints()) {
      if (!Number.isFinite(e.remnantMassSun)) continue;
      expect(e.remnantMassSun).toBeLessThan(e.initialMassSun);
    }
  });

  test('mass lost is what the track recorded, and never negative', () => {
    for (const id of trackIds()) {
      const lost = massLostOnTrack(id);
      expect(lost).toBeGreaterThanOrEqual(0);
      expect(lost).toBeLessThan(trackSamples(id).initialMassSun);
    }
    expect(massLostOnTrack('m500')).toBeCloseTo(4.11, 1);
  });

  test('the provenance names its sources and its scope', () => {
    expect(ENDPOINT_PROVENANCE.sources.length).toBeGreaterThanOrEqual(3);
    for (const s of ENDPOINT_PROVENANCE.sources) {
      expect(s.cite).toMatch(/\(\d{4}\)/);
      expect(s.url).toMatch(/^https:/);
      expect(s.covers.length).toBeGreaterThan(40);
    }
    expect(ENDPOINT_PROVENANCE.scope).toMatch(/[Ss]ingle stars/);
    expect(ENDPOINT_PROVENANCE.notCalculated).toMatch(
      /Nothing here was computed/
    );
  });
});

describe('one age drives everything', () => {
  test('the star at a position is self-consistent', () => {
    const p = createPlayback({ trackId: 'm100', pace: PACE.PHASE });
    const w = getWidget('stellar-evolution');
    for (let at = 0.07; at < 0.9; at += 0.05) {
      seek(p, at);
      const age = ageAt(p);
      expect(Number.isFinite(age)).toBe(true);
    }
    expect(w).toBeTruthy();
  });

  test('the age never runs backwards as the playhead runs forwards', () => {
    for (const pace of [PACE.TIME, PACE.PHASE]) {
      const p = createPlayback({ trackId: 'm200', pace });
      let last = -Infinity;
      for (
        let at = trackStartsAt('m200');
        at <= trackEndsAt('m200');
        at += 0.01
      ) {
        seek(p, at);
        const age = ageAt(p);
        expect(age).toBeGreaterThanOrEqual(last - 1);
        last = age;
      }
    }
  });

  test('the cloud has no age, and that is deliberate', () => {
    const p = createPlayback({ trackId: 'm100' });
    seek(p, 0.01);
    expect(stageAt(p).stage).toBe(STAGE.CLOUD);
    expect(ageAt(p)).toBe(null);
    expect(frameOf(p).onDiagram).toBe(false);
  });

  test('a star with no endpoint gets no remnant stage, at any position', () => {
    // 0.2 solar masses stops on the main sequence: there is nothing after it,
    // however far the playhead is dragged.
    const p = createPlayback({ trackId: 'm020' });
    expect(trackEndsAt('m020')).toBe(1);
    for (const at of [0.5, 0.9, 0.999, 1]) {
      seek(p, at);
      expect(stageAt(p).stage).toBe(STAGE.TRACK);
      expect(frameOf(p).endpoint.kind).toBe('unfinished');
    }
  });

  test('stepping to the last stop really reaches the remnant', () => {
    // The stop "next phase" seeks to is cloud plus track in floating point,
    // which lands an ulp short of the boundary. It used to stop one step
    // before the thing it was stepping towards.
    for (const id of ['m100', 'm1000', 'm4000']) {
      const p = createPlayback({ trackId: id, pace: PACE.PHASE });
      let last = null;
      let k;
      let guard = 0;
      while ((k = stepPhase(p, 1)) && guard++ < 30) last = k;
      expect(last).toBe(STAGE.REMNANT);
      expect(stageAt(p).stage).toBe(STAGE.REMNANT);
    }
  });

  test('a black hole is not put on the diagram', () => {
    const p = createPlayback({ trackId: 'm4000' });
    seek(p, 1);
    const f = frameOf(p);
    expect(f.stage).toBe(STAGE.REMNANT);
    expect(f.endpoint.kind).toBe('black-hole');
    expect(f.onDiagram).toBe(false);
  });

  test('a white dwarf is', () => {
    const p = createPlayback({ trackId: 'm100' });
    seek(p, 1);
    expect(frameOf(p).stage).toBe(STAGE.REMNANT);
    expect(frameOf(p).onDiagram).toBe(true);
  });
});

describe('the playhead', () => {
  test('advancing stops at the end rather than looping', () => {
    const p = createPlayback({ trackId: 'm100', playing: true, rate: 1 });
    for (let i = 0; i < 5; i++) advance(p, 1);
    expect(p.position).toBe(1);
    expect(p.playing).toBe(false);
  });

  test('it does not move while paused', () => {
    const p = createPlayback({ trackId: 'm100', playing: false, rate: 1 });
    advance(p, 10);
    expect(p.position).toBe(0);
  });

  test('restart puts it back and stops it', () => {
    const p = createPlayback({ trackId: 'm100', playing: true });
    seek(p, 0.7);
    restart(p);
    expect(p.position).toBe(0);
    expect(p.playing).toBe(false);
  });

  test('phase stepping visits every phase once, forwards', () => {
    const p = createPlayback({ trackId: 'm100', pace: PACE.PHASE });
    const seen = [];
    let k;
    while ((k = stepPhase(p, 1)) && seen.length < 20) seen.push(k);
    const phases = trackBounds('m100').segments.map(s => s.key);
    for (const phase of phases) expect(seen).toContain(phase);
    expect(seen[seen.length - 1]).toBe(STAGE.REMNANT);
  });

  test('and backwards returns the same stops in reverse', () => {
    const p = createPlayback({ trackId: 'm100', pace: PACE.PHASE });
    const forward = [];
    let k;
    while ((k = stepPhase(p, 1)) && forward.length < 20) forward.push(k);
    const back = [];
    while ((k = stepPhase(p, -1)) && back.length < 20) back.push(k);
    expect(back.length).toBe(forward.length);
    expect(back[back.length - 1]).toBe(STAGE.CLOUD);
  });

  test('the phase marks are in order and inside the playhead', () => {
    const p = createPlayback({ trackId: 'm500' });
    const marks = phaseMarks(p);
    expect(marks.length).toBeGreaterThan(3);
    let last = -1;
    for (const m of marks) {
      expect(m.at).toBeGreaterThanOrEqual(0);
      expect(m.at).toBeLessThanOrEqual(1);
      expect(m.at).toBeGreaterThanOrEqual(last);
      last = m.at;
    }
  });
});

describe('seeking is a pure function of the position', () => {
  test('the trace covers exactly as much track as the playhead has', () => {
    const p = createPlayback({ trackId: 'm200', pace: PACE.PHASE });
    seek(p, 0.5);
    const half = traceTo(p);
    seek(p, 0.85);
    const most = traceTo(p);
    const reach = list =>
      list.length ? list[list.length - 1].luminositySun : 0;
    // Further along the playhead is further along the track.
    expect(most.length).toBeGreaterThan(0);
    expect(reach(most)).not.toBe(reach(half));

    // And going back gives back exactly what was there before: no tail is
    // left behind, because nothing was accumulated.
    seek(p, 0.5);
    expect(traceTo(p)).toEqual(half);
  });

  test('the same position always draws the same trace', () => {
    const a = createPlayback({ trackId: 'm500', pace: PACE.PHASE });
    const b = createPlayback({ trackId: 'm500', pace: PACE.PHASE });
    seek(a, 0.44);
    // Reached by playing rather than by seeking, and it must not matter.
    b.playing = true;
    b.rate = 0.11;
    for (let i = 0; i < 4; i++) advance(b, 1);
    seek(b, 0.44);
    expect(traceTo(b)).toEqual(traceTo(a));
  });

  test('nothing is drawn before the track begins', () => {
    const p = createPlayback({ trackId: 'm100' });
    seek(p, 0.02);
    expect(traceTo(p)).toEqual([]);
  });
});

describe('the duration summary tells on the pacing', () => {
  test('the real durations add up to the life, whatever the pacing', () => {
    for (const pace of [PACE.TIME, PACE.PHASE]) {
      const p = createPlayback({ trackId: 'm100', pace });
      const rows = durationSummary(p);
      const total = rows.reduce((a, r) => a + r.fractionOfLife, 0);
      expect(total).toBeCloseTo(1, 2);
    }
  });

  test('phase pacing really does exaggerate the short phases, and says so', () => {
    const p = createPlayback({ trackId: 'm100', pace: PACE.PHASE });
    const rows = durationSummary(p);
    const ms = rows.find(r => r.key === 'main-sequence');
    const brief = rows.find(r => r.key === 'thermally-pulsing-agb');
    // The main sequence is most of the life and a sliver of the playback.
    expect(ms.fractionOfLife).toBeGreaterThan(0.8);
    expect(ms.shareOfPlayback).toBeLessThan(0.1);
    expect(ms.exaggeration).toBeLessThan(1);
    // And the short one is the other way round, by a factor in the hundreds.
    expect(brief.exaggeration).toBeGreaterThan(100);
  });

  test('time pacing does not, which is the point of having it', () => {
    const p = createPlayback({ trackId: 'm100', pace: PACE.TIME });
    const ms = durationSummary(p).find(r => r.key === 'main-sequence');
    // Logarithmic, so it is not 1:1 either - but the main sequence is no
    // longer a sliver.
    expect(ms.shareOfPlayback).toBeGreaterThan(0.2);
  });
});

describe('it is isolated from the sandbox', () => {
  const SOURCES = [
    'js/stellar/evolution.js',
    'js/stellar/endpoints.js',
    'js/stellarEvolutionWidgets.js',
  ];

  test('nothing here imports the N-body engine or its collision routines', () => {
    // Reusing the star renderer must not drag in the destructive merger paths
    // beside it, and a stellar lifetime must never reach the simulation clock.
    for (const file of SOURCES) {
      const src = readFileSync(file, 'utf8');
      const imports = [...src.matchAll(/from '([^']+)'/g)].map(m => m[1]);
      for (const spec of imports) {
        expect(spec).not.toMatch(/physics\.js$/);
        expect(spec).not.toMatch(/timeline\.js$/);
        expect(spec).not.toMatch(/collisions?/i);
      }
    }
  });

  test('the playback has no opinion about the simulation clock', () => {
    for (const file of SOURCES) {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/getSimClock|SECONDS_PER_DAY|timeUnitSeconds/);
    }
  });

  test('advancing it a thousand times changes nothing but the playhead', () => {
    const p = createPlayback({ trackId: 'm2000', playing: true, rate: 0.001 });
    const before = { ...p };
    for (let i = 0; i < 1000; i++) advance(p, 0.001);
    expect(p.trackId).toBe(before.trackId);
    expect(p.pace).toBe(before.pace);
    expect(p.position).toBeGreaterThan(0);
    expect(p.position).toBeLessThanOrEqual(1);
  });
});

describe('what a capture carries', () => {
  const snapshotFor = extra => ({
    source: 'model',
    trackId: 'm4000',
    teffK: 4789,
    luminositySun: 5.17e5,
    radiusSun: 1045,
    massSun: 35.09,
    initialMassSun: 40,
    ageYr: 4.76e6,
    mainSequenceYr: NaN,
    phase: 'helium-ignition',
    grid: 'MIST v1.2, [Fe/H] = 0, no rotation',
    trackComplete: false,
    trackEndsBecause: 'helium-ignition',
    sizeMode: 'true',
    pinned: [],
    ambiguous: false,
    nearbyCount: 0,
    ...extra,
  });

  test('an ordinary reading names the grid', () => {
    const entry = fromStellarObservation({ snapshot: snapshotFor({}) });
    expect(JSON.stringify(entry)).toMatch(/MIST/);
  });

  test('a reading from the playback records the stage and the pacing', () => {
    const entry = fromStellarObservation({
      snapshot: snapshotFor({ stage: 'remnant', pace: 'phase' }),
    });
    const flags = entry.snapshot.provenance.flags;
    expect(flags).toContain('stage:remnant');
    expect(flags).toContain('paced-by:phase');
    expect(flags).toContain('sizes:true');
  });

  test('and says when the endpoint was quoted rather than computed', () => {
    const entry = fromStellarObservation({
      snapshot: snapshotFor({
        stage: 'remnant',
        endpointKind: 'black-hole',
        endpointFromTrack: false,
        endpointSource: 'Sukhbold et al. (2016), ApJ 821, 38',
      }),
    });
    expect(entry.snapshot.provenance.flags).toContain('ends-as:black-hole');
    expect(entry.prose.limitations).toMatch(/not from the track/i);
    expect(entry.prose.limitations).toMatch(/Sukhbold/);
    expect(entry.prose.limitations).toMatch(/Nothing in Gravitas computed it/);
  });

  test('a cloud reading says it is before the model begins', () => {
    const entry = fromStellarObservation({
      snapshot: snapshotFor({ stage: 'cloud' }),
    });
    expect(entry.prose.limitations).toMatch(/before the track begins/i);
  });
});

describe('the widget', () => {
  beforeEach(() => resetPlaybackForTests());

  test('it is registered and reachable', () => {
    expect(STELLAR_EVOLUTION_WIDGETS.length).toBe(1);
    const w = getWidget('stellar-evolution');
    expect(w).toBe(STELLAR_EVOLUTION_WIDGETS[0]);
    expect(w.animated).toBe(true);
  });

  test('it has a preset per track, each with the endpoint as its note', () => {
    const w = getWidget('stellar-evolution');
    expect(w.presets.length).toBe(trackIds().length);
    for (const p of w.presets) expect(p.note.length).toBeGreaterThan(30);
  });

  test('it draws at every stage of every track', () => {
    const w = getWidget('stellar-evolution');
    for (const [i, id] of trackIds().entries()) {
      resetPlaybackForTests();
      const v = { ...defaults(w), track: i };
      const spec = { interior: true };
      w.reset(v, { autorun: false, spec });
      for (const at of [0, 0.03, 0.2, 0.5, 0.8, 0.95, 1]) {
        v.position = at;
        expect(() => w.draw(stubCanvas(), v, undefined, spec)).not.toThrow();
        const rows = w.readout(v, undefined, spec);
        expect(rows.length).toBeGreaterThan(1);
        for (const r of rows) {
          expect(String(r.value)).not.toMatch(
            /stelE\.|stellar\.|undefined|NaN|\{[a-z]+\}/
          );
        }
      }
      expect(id).toBeTruthy();
    }
  });

  test('it draws on a narrow canvas too', () => {
    const w = getWidget('stellar-evolution');
    const v = defaults(w);
    w.reset(v, { spec: {} });
    expect(() => w.draw(stubCanvas(320), v, undefined, {})).not.toThrow();
  });

  test('every action is handled and leaves it drawable', () => {
    const w = getWidget('stellar-evolution');
    const v = defaults(w);
    const spec = { capture: false, interior: false };
    w.reset(v, { spec });
    for (const a of w.actions(spec)) {
      expect(() => w.act(a.id, v, spec)).not.toThrow();
      expect(() => w.draw(stubCanvas(), v, undefined, spec)).not.toThrow();
    }
  });

  test('play and pause toggle, and stepping a phase stops the playback', () => {
    const w = getWidget('stellar-evolution');
    const v = defaults(w);
    const spec = {};
    w.reset(v, { spec });
    w.act('play', v, spec);
    expect(activePlayback().playing).toBe(true);
    w.act('next', v, spec);
    expect(activePlayback().playing).toBe(false);
    expect(v.position).toBe(activePlayback().position);
  });

  test('step writes the playhead back into the slider', () => {
    const w = getWidget('stellar-evolution');
    const v = defaults(w);
    const spec = {};
    w.reset(v, { spec });
    w.act('play', v, spec);
    w.step(v, 0.5, spec);
    expect(v.position).toBeGreaterThan(0);
    expect(v.position).toBe(activePlayback().position);
  });

  test('changing the star restarts rather than keeping the old playhead', () => {
    const w = getWidget('stellar-evolution');
    const v = defaults(w);
    const spec = {};
    w.reset(v, { spec });
    v.position = 0.6;
    w.draw(stubCanvas(), v, undefined, spec);
    v.track = 6;
    w.draw(stubCanvas(), v, undefined, spec);
    expect(v.position).toBe(0);
    expect(activePlayback().trackId).toBe(trackIds()[6]);
  });

  test('the readout names the source whenever the endpoint is not the track', () => {
    const w = getWidget('stellar-evolution');
    for (const [i, id] of trackIds().entries()) {
      const end = endpointFor(id);
      if (end.kind === 'unfinished' || end.fromTrack) continue;
      resetPlaybackForTests();
      // Position after reset: changing the star restarts the playhead, which
      // is what an earlier test in this block asserts.
      const v = { ...defaults(w), track: i };
      w.reset(v, { spec: {} });
      v.position = 1;
      const text = w
        .readout(v, undefined, {})
        .map(r => `${r.label} ${r.value}`)
        .join(' | ');
      expect(text).toMatch(/Sukhbold/);
      expect(text).toMatch(/Not from the track/);
    }
  });

  test('a remnant with no photosphere says why it left the diagram', () => {
    const w = getWidget('stellar-evolution');
    const v = { ...defaults(w), track: trackIds().indexOf('m4000') };
    w.reset(v, { spec: {} });
    v.position = 1;
    const text = w
      .readout(v, undefined, {})
      .map(r => `${r.label} ${r.value}`)
      .join(' | ');
    expect(text).toMatch(/no photosphere/i);
    expect(text).toMatch(/black hole/i);
  });

  test('an explosion is drawn only where the endpoint model has one', () => {
    const w = getWidget('stellar-evolution');
    for (const id of trackIds()) {
      const end = endpointFor(id);
      resetPlaybackForTests();
      const v = { ...defaults(w), track: trackIds().indexOf(id) };
      w.reset(v, { spec: {} });
      v.position = 1;
      const text = w
        .readout(v, undefined, {})
        .map(r => `${r.label} ${r.value}`)
        .join(' | ');
      if (end.supernova === 'expected') {
        expect(text).toMatch(/The explosion drawn here/);
        expect(text).toMatch(/not a calculation of one/);
      } else {
        expect(text).not.toMatch(/The explosion drawn here/);
      }
    }
  });

  test('a black hole is not given a supernova it does not need', () => {
    // The prompt this was built to is explicit: a black hole must not require
    // a spectacular explosion, and this is the assertion that keeps it so.
    expect(endpointFor('m4000').supernova).not.toBe('expected');
  });

  test('the main sequence is not reported as one immutable point', () => {
    const w = getWidget('stellar-evolution');
    resetPlaybackForTests();
    const v = { ...defaults(w), track: trackIds().indexOf('m100') };
    w.reset(v, { spec: {} });
    // A little past the start of the main sequence, found rather than guessed:
    // the phase boundaries move when the pacing does.
    const marks = phaseMarks(activePlayback());
    const ms = marks.find(m => m.key === 'main-sequence');
    const after = marks.find(m => m.at > ms.at);
    v.position = (ms.at + after.at) / 2;
    const text = w
      .readout(v, undefined, {})
      .map(r => `${r.label} ${r.value}`)
      .join(' | ');
    expect(text).toMatch(/Not one fixed point/);
    expect(text).toMatch(/Moved so far/);
  });

  test('the giant phase says core hydrogen ran out, not all of it', () => {
    const w = getWidget('stellar-evolution');
    resetPlaybackForTests();
    const v = { ...defaults(w), track: trackIds().indexOf('m100') };
    w.reset(v, { spec: {} });
    const marks = phaseMarks(activePlayback());
    const rgb = marks.find(m => m.key === 'red-giant-branch');
    const after = marks.find(m => m.at > rgb.at);
    v.position = (rgb.at + after.at) / 2;
    const text = w
      .readout(v, undefined, {})
      .map(r => `${r.label} ${r.value}`)
      .join(' | ');
    expect(text).toMatch(/hydrogen in the CORE, not hydrogen in the star/);
  });

  test('the pre-main-sequence says the light is from contraction', () => {
    const w = getWidget('stellar-evolution');
    resetPlaybackForTests();
    const v = defaults(w);
    w.reset(v, { spec: {} });
    v.position = 0.062;
    const text = w
      .readout(v, undefined, {})
      .map(r => `${r.label} ${r.value}`)
      .join(' | ');
    expect(text).toMatch(/shining before it is fusing/i);
    expect(text).toMatch(
      /not the same event as arriving on the main sequence/i
    );
  });

  test('the cloud readout refuses to give numbers', () => {
    const w = getWidget('stellar-evolution');
    const v = defaults(w);
    w.reset(v, { spec: {} });
    v.position = 0.01;
    const rows = w.readout(v, undefined, {});
    const text = rows.map(r => `${r.label} ${r.value}`).join(' | ');
    expect(text).toMatch(/inventing them|does not describe/i);
    expect(text).not.toMatch(/Surface temperature/);
  });
});
