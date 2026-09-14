// =============================================================================
// The one experiment each investigation is built around, driven for real
// -----------------------------------------------------------------------------
// One test per investigation, and exactly one: `@accepts:ce.<id>` is reserved
// for this file and tools/acceptance-bindings.mjs refuses a second claimant.
//
// Why this file exists at all
// -----------------------------------------------------------------------------
// The tags used to be scattered across whichever spec happened to mention the
// lesson, and an independent audit found what that was worth. Thirteen of the
// twenty-two ids were carried by more than one test and `ce.keplers-laws` by
// three, because two files wrote the tag into a generated title and every
// lesson their loop touched acquired a binding for free. The rest sat on
// whatever was nearby: a scenario load accepted weighing-stars, answer
// persistence accepted tides, report generation accepted missing-mass, an
// object list accepted retrograde-motion. Every one of those is a real test of
// something. None of them is the experiment the lesson is built around.
//
// So each test here does the experiment: reaches the declared prediction,
// commits to it, checks the lesson has not yet said whether it was right, moves
// the declared control, reads the declared quantity out of the declared source,
// writes the evidence down, reads it back from saved progress, and asserts the
// relationship the lesson exists to establish. The control and the loop are
// read from docs/lesson-acceptance.json at run time, so a lesson that moves its
// central experiment fails here rather than drifting quietly away from the map.
//
// What is not claimed
// -----------------------------------------------------------------------------
// That any of this teaches anybody anything; no study has been run. What is
// checked is that the experiment the map describes is one a reader can actually
// perform, and that the answer arrives from the measurement rather than from
// the answer key.
// =============================================================================

import { test, expect } from './fixtures.js';
import {
  commitPredictionHeld,
  controlOf,
  declared,
  expectDerived,
  expectEvidenceRetained,
  expectVerdictRevealed,
  keepCapture,
  lessonPlan,
  openInvestigation,
  powerLawExponent,
  reading,
  readout,
  recordFields,
  setControl,
  step,
  toolAction,
  walkToSid,
  captures,
  row,
} from './centralExperiment.js';

test.describe('the central experiment of each investigation', () => {
  test('goldilocks-question: starlight falls as the inverse square of distance @accepts:ce.goldilocks-question', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'goldilocks-question';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, exploreSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    // 1. the prediction, committed and held
    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    // 2. the declared control, moved, on the declared screens
    await walkToSid(page, plan, exploreSid);
    expect(step(plan, exploreSid).tool).toBe(
      entry.object === 'earth' ? 'hz-insolation' : null
    );
    await walkToSid(page, plan, measureSid);

    const d = [0.5, 1, 1.5, 2];
    const at = {};
    for (const au of d) {
      const { before, after } = await setControl(page, control, au);
      if (au !== d[0]) expect(after).not.toEqual(before);
      at[au] = reading(after, /starlight reaching/i);
    }

    // 3. the relationship the lesson is about. Starlight spreads over the
    //    surface of a sphere, so it falls as the inverse square of distance:
    //    twice as far out is a quarter as much.
    const n = powerLawExponent(
      d,
      d.map(au => at[au])
    );
    expect(n, 'starlight goes as 1/d^2').toBeCloseTo(-2, 1);
    expect(at[0.5] / at[2]).toBeGreaterThan(1);

    // 4. the evidence, written down and kept
    const evidence = {
      d1: 0.5,
      s1: at[0.5].toFixed(2),
      d2: 1,
      s2: at[1].toFixed(2),
      d3: 2,
      s3: at[2].toFixed(2),
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    // 5. and only now is the prediction settled
    await expectVerdictRevealed(page, plan, predict);
  });

  test('tides: the stretch goes as the inverse cube of distance @accepts:ce.tides', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'tides';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    await walkToSid(page, plan, measureSid);
    const d = [2, 1, 0.5, 0.25];
    const at = {};
    for (const r of d) {
      const { before, after } = await setControl(page, control, r);
      if (r !== d[0]) expect(after).not.toEqual(before);
      at[r] = reading(after, /tidal stretch/i);
    }

    // A tide is the difference of a 1/r^2 pull across the width of a body, and
    // that difference goes as 1/r^3: halving the distance multiplies it by
    // eight, which is the answer the prediction step asks for.
    const n = powerLawExponent(
      d,
      d.map(r => at[r])
    );
    expect(n, 'the tidal stretch goes as 1/d^3').toBeCloseTo(-3, 1);
    expect(at[0.25]).toBeGreaterThan(at[2]);

    const evidence = {
      d1: 2,
      t1: at[2].toFixed(2),
      d2: 1,
      t2: at[1].toFixed(2),
      d3: 0.5,
      t3: at[0.5].toFixed(2),
      d4: 0.25,
      t4: at[0.25].toFixed(2),
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('transit-photometry: the dip goes as the square of the planet radius @accepts:ce.transit-photometry', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'transit-photometry';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    // The size control lives on the screen between the prediction and the
    // measurement, which is where the lesson puts it.
    await walkToSid(page, plan, 'try-it-on-some-real');
    const rp = [5.6, 8, 11.2, 14];
    const depth = {};
    let ratio = 0;
    for (const r of rp) {
      const { before, after } = await setControl(page, control, r);
      if (r !== rp[0]) expect(after).not.toEqual(before);
      depth[r] = reading(after, /transit depth/i);
      ratio = reading(after, /radius ratio/i);
    }

    // A transit blocks the fraction of the disc the planet covers, so the depth
    // goes as the square of the radius ratio - which is the whole reason a
    // depth can be turned into a size.
    const n = powerLawExponent(
      rp,
      rp.map(r => depth[r])
    );
    expect(n, 'depth goes as radius squared').toBeCloseTo(2, 1);
    // And the panel's own two numbers agree with each other.
    expect(depth[14] / 100).toBeCloseTo(ratio ** 2, 3);

    await walkToSid(page, plan, measureSid);
    const delta = depth[11.2] / 100;
    const evidence = { base: '1.00000', bot: (1 - delta).toFixed(5) };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);
    // The two boxes the lesson works out for itself are the point of the
    // exercise: a depth is a difference, and a radius ratio is its square root.
    await expectDerived(page, id, measureSid, {
      depth: delta,
      k_naive: Math.sqrt(delta),
    });

    await expectVerdictRevealed(page, plan, predict);
  });

  test('orbital-energy: the dividing speed is where the total energy crosses zero @accepts:ce.orbital-energy', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'orbital-energy';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, exploreSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    await walkToSid(page, plan, exploreSid);
    const slow = await setControl(page, control, 9);
    const slowEnergy = reading(slow.after, /total energy/i);
    const escape = reading(slow.after, /escape speed/i);
    expect(row(slow.after, /come back/i).text).toMatch(/comes back/i);

    const fast = await setControl(page, control, 12);
    expect(fast.after).not.toEqual(slow.after);
    const fastEnergy = reading(fast.after, /total energy/i);

    // Bound and unbound are not two behaviours that happen to differ; they are
    // the two signs of one number. Below the escape speed the total energy is
    // negative and the cannonball comes back, above it the energy is not and it
    // does not, and the dividing speed is where that changes.
    expect(slowEnergy).toBeLessThan(0);
    expect(fastEnergy).toBeGreaterThanOrEqual(0);
    expect(escape).toBeGreaterThan(9);
    expect(escape).toBeLessThan(12);
    expect(row(fast.after, /come back/i).text).not.toMatch(/comes back/i);

    await walkToSid(page, plan, measureSid);
    const evidence = {
      back: (escape - 0.1).toFixed(1),
      gone: (escape + 0.1).toFixed(1),
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('weighing-stars: the see-saw splits the total mass by the arm lengths @accepts:ce.weighing-stars', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'weighing-stars';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const measureSid = entry.loop[2];

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, entry.loop[0]);
    await commitPredictionHeld(page, predict);

    await walkToSid(page, plan, measureSid);
    const seen = [];
    for (const d1 of [1, 2]) {
      const { before, after } = await setControl(page, control, d1);
      if (d1 !== 1) expect(after).not.toEqual(before);
      seen.push({
        aArm: reading(after, /star a is this far/i),
        bArm: reading(after, /star b is this far/i),
        // "Star A, by 3 times" - the ratio, at full precision. The split below
        // it is rounded to whole solar masses for display, so 2.4 and 1.6 both
        // read as "2" and cannot carry any arithmetic.
        ratio: reading(after, /heavier star/i),
        split: row(after, /splitting/i).numbers,
      });
    }

    for (const { aArm, bArm, ratio, split } of seen) {
      // The centre of mass is a lever. The nearer star is the heavier one and
      // the mass ratio is exactly the inverse of the arm ratio, which is what
      // turns one total mass into two separate ones.
      expect(aArm).toBeLessThan(bArm);
      expect(ratio).toBeCloseTo(bArm / aArm, 2);
      expect(split[0] + split[1]).toBeCloseTo(4, 1);
      expect(split[0]).toBeGreaterThanOrEqual(split[1]);
    }
    // And the control really swept: the answer is not the same every time.
    expect(Math.abs(seen[0].ratio - seen[1].ratio)).toBeGreaterThan(0.1);

    const { aArm, bArm } = seen[seen.length - 1];
    const total = 4;
    const ma = (total * bArm) / (aArm + bArm);
    const evidence = { ma: ma.toFixed(2), mb: (total - ma).toFixed(2) };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);
    await expectDerived(page, id, measureSid, { sum: total }, 0.05);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('black-holes: the horizon grows in proportion to the mass @accepts:ce.black-holes', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'black-holes';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, exploreSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    await walkToSid(page, plan, exploreSid);
    const masses = [5, 10, 20];
    const rs = {};
    for (const m of masses) {
      const { before, after } = await setControl(page, control, m);
      if (m !== masses[0]) expect(after).not.toEqual(before);
      const at = row(after, /slider is at/i).numbers;
      expect(at.length).toBeGreaterThan(1);
      expect(at[0]).toBeCloseTo(m, 1);
      rs[m] = at[1];
      await toolAction(page, 'record');
    }

    // r_s = 2GM/c^2. Linear in the mass, and the constant of proportionality is
    // 2.95 km per solar mass - which is why doubling the mass doubles the
    // horizon rather than quadrupling it or leaving it alone.
    const n = powerLawExponent(
      masses,
      masses.map(m => rs[m])
    );
    expect(n, 'the horizon is linear in the mass').toBeCloseTo(1, 1);
    for (const m of masses) expect(rs[m] / m).toBeCloseTo(2.95, 1);

    // The declared evidence is an instrument capture, so it has to reach the
    // notebook and survive there.
    // Pressing Capture offers a draft; keeping it is what writes it down.
    const before = await captures(page);
    await toolAction(page, 'capture');
    await keepCapture(page, {
      claim: 'The horizon radius is proportional to the mass.',
      evidence: `${masses.join(', ')} solar masses gave ${masses
        .map(m => rs[m])
        .join(', ')} km.`,
    });
    await expect
      .poll(async () => (await captures(page)).entries.length, {
        timeout: 10_000,
      })
      .toBeGreaterThan(before.entries.length);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('detect-this-planet: a cadence that beats against the period hides it @accepts:ce.detect-this-planet', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'detect-this-planet';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    await walkToSid(page, plan, measureSid);

    // Schedule B samples every 3.52 days on a 3.5247-day planet, so every night
    // lands at almost the same orbital phase.
    const b = await readout(page);
    const bChi = reading(b, /against a constant velocity/i);
    const bBins = reading(b, /phase coverage/i);
    const bScatter = reading(b, /scatter of the measurements/i);

    // Schedule A's cadence, on the same star, same nights, same noise.
    const { before, after } = await setControl(page, control, 0.32);
    expect(after).not.toEqual(before);
    const aChi = reading(after, /against a constant velocity/i);
    const aBins = reading(after, /phase coverage/i);

    // Nothing about the planet changed. What changed is when the telescope
    // looked, and that alone decides whether the signal is there to be found.
    expect(aBins).toBeGreaterThan(bBins);
    expect(aChi).toBeGreaterThan(bChi);

    await setControl(page, control, 3.52);
    const evidence = {
      coverageB: bBins,
      scatterB: bScatter.toFixed(1),
      chiB: bChi.toFixed(2),
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);
  });
});
