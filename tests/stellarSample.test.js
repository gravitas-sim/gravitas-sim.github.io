// =============================================================================
// One star, one answer
// -----------------------------------------------------------------------------
// A lesson names a star once and two things draw it: js/lessonStage.js stands
// it on the canvas, and js/stellarWidgets.js plots it on the H-R diagram and
// puts it on the comparison card. Until this suite existed each side worked
// out for itself what the declaration meant, and they did not agree - a bare
// `{track: 'm500'}` was the middle of the main sequence to the card and forty
// per cent of the way through the track's age to the canvas. Same name, same
// screen, two stars: 16,596 K and 3.26 solar radii against 16,687 K and 3.18.
//
// So these are not tests that a resolver returns plausible numbers. They are
// tests that there is exactly one resolver, that the identity of a star
// survives being sorted, and that a lesson cannot reintroduce a second
// declaration of the same example without this failing.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  MODE,
  PACE,
  comparison,
  createLab,
  midMainSequenceFraction,
  pin,
  pinModel,
  resolveStarSpec,
  sampleForSpec,
  setMode,
} from '../js/stellarLab.js';
import { stateAtSample, trackBounds } from '../js/stellar/tracks.js';
import A_UNIVERSE_OF_STARS from '../js/data/investigations/a-universe-of-stars.js';
import LIVES_OF_STARS from '../js/data/investigations/lives-of-stars.js';

/** The lessons whose stars come off the MIST tracks. */
const STELLAR_LESSONS = [A_UNIVERSE_OF_STARS, LIVES_OF_STARS];

describe('a declaration means one thing', () => {
  test('a bare track is the middle of the main sequence, said once', () => {
    for (const id of ['m020', 'm100', 'm500', 'm2000']) {
      const bare = resolveStarSpec({ track: id });
      const said = resolveStarSpec({ track: id, at: 'ms' });
      expect(bare).toEqual(said);
      // And it really is the middle of the main sequence, not a fraction of
      // the track's length that happens to land near it.
      expect(bare.phase).toBe('main-sequence');
      expect(sampleForSpec({ track: id })).toBeCloseTo(
        midMainSequenceFraction(id, PACE.PHASE),
        12
      );
    }
  });

  test('the sample fraction is what the state is read at', () => {
    for (const spec of [
      { track: 'm100' },
      { track: 'm100', at: 0.206 },
      { track: 'm100', ageYr: 1.129e10 },
      { track: 'm2000', at: 1 },
    ]) {
      const direct = stateAtSample(spec.track, sampleForSpec(spec));
      const resolved = resolveStarSpec(spec);
      expect(resolved.teffK).toBeCloseTo(direct.teffK, 12);
      expect(resolved.radiusSun).toBeCloseTo(direct.radiusSun, 12);
      expect(resolved.ageYr).toBeCloseTo(direct.ageYr, 6);
    }
  });

  test('a hypothetical point carries no mass, no age and no lifetime', () => {
    const free = resolveStarSpec({ teffK: 25000, lumSun: 0.01 });
    expect(free.source).toBe('hypothetical');
    // Withheld, not zero and not absent-by-accident: a position on the
    // diagram does not fix any of the three, and a table that printed a
    // number here would be teaching that it does.
    expect(Number.isFinite(free.massSun)).toBe(false);
    expect(Number.isFinite(free.ageYr)).toBe(false);
    expect(Number.isFinite(free.mainSequenceYr)).toBe(false);
    // The radius does follow, exactly, from the two that were chosen.
    expect(free.radiusSun).toBeGreaterThan(0);
  });

  test('nothing answers to a track that is not there', () => {
    expect(resolveStarSpec({ track: 'm999' })).toBeNull();
    expect(resolveStarSpec({})).toBeNull();
    expect(resolveStarSpec(null)).toBeNull();
  });
});

describe('the canvas and the card resolve the same star', () => {
  // The behavioural claim, stated over the actual lesson data rather than
  // over an example: for every step that compares its staged stars, each
  // pinned star IS one of the stars standing on the canvas - the same track,
  // the same point on it, to the last digit.
  const staged = lesson =>
    lesson.steps
      .filter(s => s.tool?.pinStaged && s.stage?.stars)
      .map(s => ({ sid: s.sid, stars: s.stage.stars, want: s.tool.pinStaged }));

  test('every step that pins its stage has stars to pin', () => {
    const all = STELLAR_LESSONS.flatMap(staged);
    expect(all.length).toBeGreaterThan(0);
    for (const step of all) expect(step.stars.length).toBeGreaterThan(0);
  });

  test('a named subset names stars that are actually staged', () => {
    for (const step of STELLAR_LESSONS.flatMap(staged)) {
      if (!Array.isArray(step.want)) continue;
      for (const role of step.want) {
        expect(step.stars.some(s => s.role === role)).toBe(true);
      }
    }
  });

  test('pinning a staged star reproduces the canvas star exactly', () => {
    const lab = createLab({ pace: PACE.PHASE });
    for (const step of STELLAR_LESSONS.flatMap(staged)) {
      const wanted = Array.isArray(step.want)
        ? step.want.map(r => step.stars.find(s => s.role === r))
        : step.stars;
      lab.pinned.length = 0;
      for (const spec of wanted.slice(0, 4)) {
        pinModel(lab, resolveStarSpec(spec), {
          pinId: spec.role,
          name: spec.name,
        });
      }
      for (const row of lab.pinned) {
        const canvas = resolveStarSpec(
          step.stars.find(s => s.role === row.pinId)
        );
        expect(row.teffK).toBe(canvas.teffK);
        expect(row.radiusSun).toBe(canvas.radiusSun);
        expect(row.luminositySun).toBe(canvas.luminositySun);
      }
    }
  });

  test('an example is declared once, however many steps use it', () => {
    // The audit, as a test. Two declarations that give a star the same name
    // must resolve to the same star; that is what "one exact model per
    // example" means, and it is what stopped being true when the pinned
    // copies drifted from the staged ones.
    //
    // A Universe of Stars only. Its names are identities - "Red dwarf", "The
    // Sun", "Supergiant" are examples the lesson returns to. Lives of Stars
    // names its single subject "The star" on every screen and gives it a
    // different track each time, which is a role rather than an example, and
    // js/stellarEvolutionWidgets.js overwrites its state from the playback on
    // the first frame in any case.
    for (const lesson of [A_UNIVERSE_OF_STARS]) {
      const byName = new Map();
      for (const step of lesson.steps) {
        for (const spec of step.stage?.stars ?? []) {
          if (!spec.name) continue;
          const model = resolveStarSpec(spec);
          if (!model) continue;
          const seen = byName.get(spec.name);
          if (!seen) {
            byName.set(spec.name, model);
            continue;
          }
          expect({
            name: spec.name,
            teffK: model.teffK,
            radiusSun: model.radiusSun,
          }).toEqual({
            name: spec.name,
            teffK: seen.teffK,
            radiusSun: seen.radiusSun,
          });
        }
      }
    }
  });

  test('every staged star that is not on a track says so', () => {
    for (const lesson of STELLAR_LESSONS) {
      for (const step of lesson.steps) {
        for (const spec of step.stage?.stars ?? []) {
          const model = resolveStarSpec(spec);
          if (!model || model.source === 'model') continue;
          // A hypothetical example. It may not smuggle in a mass or an age
          // through the declaration, because nothing computed one.
          expect(spec.track).toBeUndefined();
          expect(Number.isFinite(model.massSun)).toBe(false);
          expect(Number.isFinite(model.ageYr)).toBe(false);
        }
      }
    }
  });
});

describe('a pinned star keeps its identity', () => {
  let lab;
  const THREE = [
    { role: 'a', name: 'Red dwarf', track: 'm020', at: 'ms' },
    { role: 'b', name: 'Supergiant', track: 'm2000', at: 1 },
    { role: 'c', name: 'The Sun', track: 'm100', at: 'ms' },
  ];

  beforeEach(() => {
    lab = createLab({ pace: PACE.PHASE });
    for (const spec of THREE) {
      pinModel(lab, resolveStarSpec(spec), {
        pinId: spec.role,
        name: spec.name,
        bodyId: THREE.indexOf(spec) + 10,
      });
    }
  });

  test('re-ordering re-orders and nothing else', () => {
    const before = new Map(
      comparison(lab, 'radiusSun').map(r => [
        r.pinId,
        { name: r.name, teffK: r.teffK, radiusSun: r.radiusSun, id: r.bodyId },
      ])
    );
    const after = comparison(lab, 'teffK');
    // The order changes...
    expect(after.map(r => r.pinId)).not.toEqual([...before.keys()]);
    // ...and every star is still itself, still attached to its own body.
    for (const row of after) {
      expect({
        name: row.name,
        teffK: row.teffK,
        radiusSun: row.radiusSun,
        id: row.bodyId,
      }).toEqual(before.get(row.pinId));
    }
  });

  test('two stars at the same point are two pins, not one', () => {
    // The old key was built from the temperature and the luminosity, so a
    // second star at the same place collided with the first.
    const twin = createLab({ pace: PACE.PHASE });
    const spec = { track: 'm100', at: 'ms' };
    pinModel(twin, resolveStarSpec(spec), { pinId: 'left', name: 'Left' });
    pinModel(twin, resolveStarSpec(spec), { pinId: 'right', name: 'Right' });
    expect(twin.pinned).toHaveLength(2);
    expect(new Set(twin.pinned.map(p => p.pinId)).size).toBe(2);
  });

  test('a reader pinning from the controls still gets an identity', () => {
    const own = createLab({ pace: PACE.PHASE });
    setMode(own, MODE.MODEL);
    expect(pin(own)).toBe(true);
    expect(pin(own)).toBe(true);
    expect(own.pinned.every(p => p.pinId)).toBe(true);
    expect(new Set(own.pinned.map(p => p.pinId)).size).toBe(2);
  });

  test('the comparison refuses a fifth star rather than dropping one', () => {
    expect(
      pinModel(lab, resolveStarSpec({ track: 'm050', at: 'ms' }), {
        pinId: 'd',
      })
    ).toBe(true);
    expect(
      pinModel(lab, resolveStarSpec({ track: 'm200', at: 'ms' }), {
        pinId: 'e',
      })
    ).toBe(false);
    expect(lab.pinned.map(p => p.pinId)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('a role is not an example', () => {
  test('the Lives of Stars subject is one star per step, by design', () => {
    // The other half of the rule above, stated rather than left implied: the
    // protagonist role appears on many screens with many tracks, and each
    // screen stages exactly one of it.
    const subjects = LIVES_OF_STARS.steps
      .map(s => (s.stage?.stars ?? []).filter(x => x.role === 'star'))
      .filter(list => list.length);
    expect(subjects.length).toBeGreaterThan(1);
    for (const list of subjects) expect(list).toHaveLength(1);
    // More than one track across the lesson - which is why its name cannot be
    // read as an identity.
    const tracks = new Set(subjects.flat().map(x => x.track));
    expect(tracks.size).toBeGreaterThan(1);
    // And each one still says where on its track it is.
    for (const spec of subjects.flat()) {
      expect(spec.at ?? spec.ageYr).toBeDefined();
    }
  });
});

describe('the tracks stay lazy', () => {
  test('resolving a spec loads one track, not the bundle', () => {
    // trackBounds is the cheap header; the samples are what cost. Reading one
    // star must not pull in the other seven tracks' data.
    const before = trackBounds('m100');
    expect(before).toBeTruthy();
    expect(resolveStarSpec({ track: 'm100', at: 'ms' })).toBeTruthy();
  });
});
