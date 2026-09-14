// =============================================================================
// The one experiment each investigation is built around, driven for real
// -----------------------------------------------------------------------------
// One test per investigation, and exactly one. The reserved acceptance tag -
// the prefix tools/acceptance-bindings.mjs reads, written out in full in each
// title below - belongs to this file, and a second claimant is refused.
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

  test('radial-velocity: tilting the system scales K by the sine of the inclination @accepts:ce.radial-velocity', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'radial-velocity';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    // The tilt lives on the step the prediction names, which is the lesson's
    // own arrangement: the answer arrives where the experiment is done.
    await walkToSid(page, plan, predict.reveal);
    const at = {};
    let trueMass = 0;
    for (const inc of [90, 60, 30]) {
      const { before, after } = await setControl(page, control, inc);
      if (inc !== 90) expect(after).not.toEqual(before);
      at[inc] = {
        k: reading(after, /K we would measure/i),
        reported: reading(after, /mass RV alone reports/i),
        sini: reading(after, /true mass times/i),
      };
      trueMass = reading(after, /true planet mass/i);
    }

    // Radial velocity sees only the component along the line of sight, so K
    // carries a factor of sin i and the mass it gives is a minimum: the planet
    // has not changed, and the number the method reports has.
    for (const inc of [90, 60, 30]) {
      const sini = Math.sin((inc * Math.PI) / 180);
      expect(at[inc].sini).toBeCloseTo(sini, 2);
      expect(at[inc].k / at[90].k).toBeCloseTo(sini, 2);
      expect(at[inc].reported).toBeCloseTo(trueMass * sini, 2);
      expect(at[inc].reported).toBeLessThanOrEqual(trueMass + 1e-9);
    }
    expect(at[30].k).toBeLessThan(at[90].k);

    await expectVerdictRevealed(page, plan, predict);

    await walkToSid(page, plan, measureSid);
    const evidence = { k: at[90].k.toFixed(1) };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);
  });

  test('missing-mass: the flat curve needs mass that is not visible @accepts:ce.missing-mass', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'missing-mass';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    // The curve comes off the running world, which is what the map means by
    // evidenceFrom "engine": ninety-odd stars orbiting a bulge, each with a
    // radius and a speed the integrator is carrying. The measure step has no
    // instrument of its own - the reader is looking at the galaxy.
    await walkToSid(page, plan, measureSid);
    const curve = await page.evaluate(async () => {
      const ls = await import('/js/lessonScene.js');
      const p = await import('/js/physics.js');
      const bodies = [...p.stars, ...p.planets, ...p.bh_list];
      if (bodies.length < 20) return null;
      const centre = bodies.slice().sort((a, b) => b.mass - a.mass)[0];
      const points = bodies
        .filter(b => b !== centre)
        .map(b => ({
          r: Math.hypot(b.pos.x - centre.pos.x, b.pos.y - centre.pos.y),
          v: Math.hypot(b.vel.x - centre.vel.x, b.vel.y - centre.vel.y),
        }))
        .filter(
          pt => Number.isFinite(pt.r) && Number.isFinite(pt.v) && pt.r > 0
        )
        .sort((a, b) => a.r - b.r);
      // Four radial bins, median speed in each: one star on an eccentric orbit
      // is not a rotation curve.
      const bins = [];
      const per = Math.floor(points.length / 4);
      for (let i = 0; i < 4; i++) {
        const slice = points.slice(i * per, (i + 1) * per);
        const vs = slice.map(pt => pt.v).sort((a, b) => a - b);
        bins.push({
          r: slice.reduce((a, pt) => a + pt.r, 0) / slice.length,
          v: vs[Math.floor(vs.length / 2)],
        });
      }
      return {
        bins,
        outer: ls.roleBody('outer') ? true : false,
        n: points.length,
      };
    });
    expect(curve, 'the galaxy is on the canvas to be measured').toBeTruthy();
    expect(curve.outer, 'the lesson bound the outer star it talks about').toBe(
      true
    );
    expect(curve.n).toBeGreaterThan(20);

    const slope = powerLawExponent(
      curve.bins.map(b => b.r),
      curve.bins.map(b => b.v)
    );
    // Keplerian is -0.5: outside the mass, speed falls as one over the square
    // root of the radius. This curve does not do that, and the gap between what
    // Kepler predicts from the inner stars and what the outer ones are actually
    // doing is the whole observation.
    const inner = curve.bins[0];
    const outer = curve.bins[curve.bins.length - 1];
    const keplerian = inner.v * Math.sqrt(inner.r / outer.r);
    const gap = outer.v / keplerian;
    expect(slope, 'the curve is flat, not Keplerian').toBeGreaterThan(-0.25);
    expect(Math.abs(slope)).toBeLessThan(0.25);
    expect(
      gap,
      'the outer stars outrun the Keplerian prediction'
    ).toBeGreaterThan(1.2);

    const evidence = {
      obs_slope: slope.toFixed(2),
      obs_shape: 'flat',
      obs_gap: gap.toFixed(1),
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);

    // Then the fit, with the declared control. Stars alone cannot come near;
    // adding halo mass closes the gap, and too much overshoots - which is why
    // the lesson calls this a fit and not a switch.
    await walkToSid(page, plan, 'now-add-the-halo');
    const miss = {};
    for (const halo of [0, 100, 160]) {
      const { before, after } = await setControl(page, control, halo);
      if (halo !== 0) expect(after).not.toEqual(before);
      miss[halo] = reading(after, /average miss/i);
    }
    expect(miss[0], 'stars alone are nowhere near').toBeGreaterThan(30);
    expect(miss[100]).toBeLessThan(miss[0]);
    expect(miss[160]).toBeLessThan(miss[100]);
    expect(miss[160], 'a halo brings the model within the data').toBeLessThan(
      10
    );
  });

  test('what-is-a-gravitational-wave: only a changing quadrupole radiates @accepts:ce.what-is-a-gravitational-wave', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'what-is-a-gravitational-wave';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, exploreSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    await walkToSid(page, plan, exploreSid);
    const verdicts = {};
    const arms = {};
    for (const source of [0, 1, 2]) {
      const { before, after } = await setControl(page, control, source);
      if (source !== 0) expect(after).not.toEqual(before);
      verdicts[source] = row(after, /does this radiate/i).text;
      arms[source] = row(after, /what an L would read/i).numbers;
    }

    // Motion is not the criterion. A static mass radiates nothing, and so does
    // a sphere pulsing in and out - its mass distribution never changes SHAPE.
    // Two lumps going round each other do, and that is the whole difference.
    expect(verdicts[0]).toMatch(/^No/);
    expect(verdicts[1]).toMatch(/^No/);
    expect(verdicts[1]).toMatch(/spherically symmetric/i);
    expect(verdicts[2]).toMatch(/^Yes/);
    expect(verdicts[2]).toMatch(/quadrupole/i);

    // And what a detector would see: the two arms change by equal and opposite
    // fractions, which is why the instrument is an L.
    const [horizontal, vertical] = arms[2];
    expect(Math.sign(horizontal)).toBe(-Math.sign(vertical));
    expect(Math.abs(horizontal)).toBeCloseTo(Math.abs(vertical), 24);
    expect(Math.abs(horizontal)).toBeGreaterThan(0);

    await expectVerdictRevealed(page, plan, predict);

    // The ring's change in length is what the lesson asks to be written down.
    const evidenceSid = 'measure-a-change-in-length';
    await walkToSid(page, plan, evidenceSid);
    const evidence = {
      toy: '0.02',
      real: Math.abs(horizontal).toExponential(2),
    };
    await recordFields(page, id, evidenceSid, evidence);
    await expectEvidenceRetained(page, id, evidenceSid, evidence);
  });

  test('listening-to-spacetime: heavier pairs leave the band sooner @accepts:ce.listening-to-spacetime', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'listening-to-spacetime';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const exploreSid = entry.loop[1];
    const measureSid = entry.loop[2];

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, entry.loop[0]);
    await commitPredictionHeld(page, predict);

    await walkToSid(page, plan, exploreSid);
    const secondary = 29;
    const band = {};
    for (const m1 of [18, 36, 60]) {
      const { before, after } = await setControl(page, control, m1);
      if (m1 !== 18) expect(after).not.toEqual(before);
      const modelled = row(after, /^modelled/i).text;
      // Two shapes: "813 ms ... the whole inspiral from 20 Hz", and for a light
      // pair whose window starts late, "... the whole thing from 20 Hz would be
      // 1.49 s". Both name the same quantity; only one of them is in seconds.
      const whole =
        /would be\s+([\d.]+)\s*(ms|s)\b/.exec(modelled) ||
        /^\s*([\d.]+)\s*(ms|s)\b/.exec(modelled);
      expect(whole, `"${modelled}" names a time in band`).toBeTruthy();
      band[m1] = {
        seconds: Number(whole[1]) / (whole[2] === 'ms' ? 1000 : 1),
        fIsco: reading(after, /where it stops/i),
      };
    }

    // A heavier pair merges at a larger separation, so it stops at a lower
    // frequency and spends less time climbing through the band. The innermost
    // stable orbit's frequency goes as 1 over the total mass, which the three
    // measurements pin to better than a percent.
    const totals = [18, 36, 60].map(m => m + secondary);
    const products = [18, 36, 60].map((m, i) => band[m].fIsco * totals[i]);
    for (const p of products) expect(p / products[0]).toBeCloseTo(1, 1);
    expect(band[60].fIsco).toBeLessThan(band[36].fIsco);
    expect(band[36].fIsco).toBeLessThan(band[18].fIsco);
    expect(band[60].seconds).toBeLessThan(band[36].seconds);
    expect(band[36].seconds).toBeLessThan(band[18].seconds);

    await walkToSid(page, plan, measureSid);
    const evidence = {
      t_light: band[18].seconds.toFixed(2),
      f_light: band[18].fIsco.toFixed(1),
      t_mid: band[36].seconds.toFixed(2),
      f_mid: band[36].fIsco.toFixed(1),
      t_heavy: band[60].seconds.toFixed(2),
      f_heavy: band[60].fIsco.toFixed(1),
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    // The declared evidence is an instrument capture, and the other half of the
    // declared quantity is strain against distance, which is the screen that
    // offers one.
    await walkToSid(page, plan, 'test-distance');
    const before = await captures(page);
    await toolAction(page, 'capture');
    await keepCapture(page, {
      claim: 'Time in band falls as the pair gets heavier.',
      evidence: `f_ISCO went ${band[18].fIsco} -> ${band[60].fIsco} Hz.`,
    });
    await expect
      .poll(async () => (await captures(page)).entries.length, {
        timeout: 10_000,
      })
      .toBeGreaterThan(before.entries.length);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('a-universe-of-stars: at one temperature, brightness is size @accepts:ce.a-universe-of-stars', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'a-universe-of-stars';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    await walkToSid(page, plan, measureSid);
    await page.waitForTimeout(400);

    // The focus control picks which pinned star the card is about. It moves the
    // instrument's own state rather than a number in the readout, so that is
    // where it has to be checked.
    const focused = () =>
      page.evaluate(async () => {
        const w = await import('/js/stellarWidgets.js');
        return w.activeLab()?.focusPinId ?? null;
      });
    const first = await focused();
    await setControl(page, control, 1);
    const second = await focused();
    await setControl(page, control, 2);
    const third = await focused();
    expect(
      new Set([first, second, third].map(String)).size,
      'the focus control actually moved the focus'
    ).toBeGreaterThan(1);

    const rows = await readout(page);
    const small = row(rows, /the smaller one/i).numbers;
    const big = row(rows, /the brighter one/i).numbers;
    const [tSmall, lSmall, rSmall] = small;
    const [tBig, lBig, rBig] = big;

    // Same temperature, three hundred times the light. A star's luminosity is
    // its area times what each square metre emits, and at equal temperature the
    // second factor is equal - so all of the difference is size, and the radius
    // ratio is the square root of the luminosity ratio.
    expect(Math.abs(tBig - tSmall) / tSmall).toBeLessThan(0.05);
    expect(rBig / rSmall).toBeCloseTo(Math.sqrt(lBig / lSmall), 0);
    expect(rBig).toBeGreaterThan(rSmall);

    const evidence = {
      small: rSmall.toFixed(3),
      large: rBig.toFixed(1),
      why: 'Same temperature, so every square metre emits the same; the brighter one simply has far more of them.',
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);
    await expectDerived(page, id, measureSid, { ratio: rBig / rSmall }, 0.05);

    const before = await captures(page);
    await toolAction(page, 'capture');
    await keepCapture(page, {
      claim: 'At the same temperature, luminosity is a statement about size.',
      evidence: `${lBig} / ${lSmall} in light, ${rBig} / ${rSmall} in radius.`,
    });
    await expect
      .poll(async () => (await captures(page)).entries.length, {
        timeout: 10_000,
      })
      .toBeGreaterThan(before.entries.length);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('lives-of-stars: leaving the main sequence makes it bigger, cooler and brighter @accepts:ce.lives-of-stars', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'lives-of-stars';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    await walkToSid(page, plan, measureSid);
    await page.waitForTimeout(400);

    // Walk the playhead along the published track and take the star's numbers
    // at each stop, keeping the first main-sequence sample and the largest
    // giant. Which position is which phase is the track's business, not this
    // test's, so the phase is read rather than assumed.
    const seen = [];
    for (const position of [0.12, 0.16, 0.19, 0.21]) {
      const { before, after } = await setControl(page, control, position);
      if (position !== 0.12) expect(after).not.toEqual(before);
      seen.push({
        position,
        phase: row(after, /^phase$/i).text,
        teff: reading(after, /surface temperature/i),
        lum: reading(after, /^luminosity$/i),
        radius: reading(after, /^radius$/i),
        mass: reading(after, /^mass$/i),
      });
    }
    const ms = seen.find(s => /main sequence/i.test(s.phase));
    const giant = seen.filter(s => /giant/i.test(s.phase)).pop();
    expect(ms, 'the track passes through the main sequence').toBeTruthy();
    expect(giant, 'the track reaches the giant branch').toBeTruthy();

    // Up and to the right on the HR diagram: the envelope swells by a factor of
    // tens while the surface cools, and the star is far brighter in spite of
    // being cooler - which is only possible because it is so much larger.
    expect(giant.radius / ms.radius).toBeGreaterThan(10);
    expect(giant.teff).toBeLessThan(ms.teff);
    expect(giant.lum / ms.lum).toBeGreaterThan(100);
    expect(giant.mass).toBeLessThanOrEqual(ms.mass);

    const evidence = {
      teff: giant.teff,
      lum: giant.lum,
      radius: giant.radius,
      mass: giant.mass,
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    const before = await captures(page);
    await toolAction(page, 'capture');
    await keepCapture(page, {
      claim:
        'Leaving the main sequence, the star gets larger, cooler and brighter.',
      evidence: `${ms.radius} R_sun at ${ms.teff} K became ${giant.radius} R_sun at ${giant.teff} K.`,
    });
    await expect
      .poll(async () => (await captures(page)).entries.length, {
        timeout: 10_000,
      })
      .toBeGreaterThan(before.entries.length);

    await expectVerdictRevealed(page, plan, predict);
  });
});
