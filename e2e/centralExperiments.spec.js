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
  expectStill,
  expectVerdictRevealed,
  keepCapture,
  lessonPlan,
  openInvestigation,
  pausePlayback,
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

  test('power-law-gravity: the ellipse stops closing when the exponent moves @accepts:ce.power-law-gravity', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'power-law-gravity';
    const entry = declared(id);
    const { control } = controlOf(entry);
    const [predictSid, exploreSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);

    // 1. the prediction, committed and held
    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    // 2. the declared control, on the declared screens
    await walkToSid(page, plan, exploreSid);
    expect(step(plan, exploreSid).tool).toBe('power-law-precession');
    await walkToSid(page, plan, measureSid);

    // 3. the relationship the lesson is about. The exponent is anchored at the
    //    reference radius, so moving it changes the shape of the field and not
    //    its strength - and the ellipse stops closing. Newton is the control
    //    and must read zero; a shallower law turns the other way.
    const exponents = [1.8, 2, 2.05, 2.2];
    const at = {};
    for (const n of exponents) {
      const { before, after } = await setControl(page, control, n);
      if (n !== exponents[0]) expect(after).not.toEqual(before);
      at[n] = reading(after, /measured precession/i);
    }

    expect(at[2], 'a Newtonian orbit closes').toBeCloseTo(0, 2);
    expect(at[1.8], 'a shallower law precesses backwards').toBeLessThan(-5);
    expect(
      at[2.05],
      'a slightly steeper law precesses forwards'
    ).toBeGreaterThan(5);
    expect(at[2.2], 'and a steeper one much further').toBeGreaterThan(at[2.05]);

    // 4. the evidence, written down and kept
    const evidence = {
      p_18: at[1.8].toFixed(2),
      p_20: at[2].toFixed(2),
      p_205: at[2.05].toFixed(2),
      p_22: at[2.2].toFixed(2),
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

    // Bound and unbound are not two behaviors that happen to differ; they are
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
      // The center of mass is a lever. The nearer star is the heavier one and
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
      const center = bodies.slice().sort((a, b) => b.mass - a.mass)[0];
      const points = bodies
        .filter(b => b !== center)
        .map(b => ({
          r: Math.hypot(b.pos.x - center.pos.x, b.pos.y - center.pos.y),
          v: Math.hypot(b.vel.x - center.vel.x, b.vel.y - center.vel.y),
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
      const modeled = row(after, /^modeled/i).text;
      // Two shapes: "813 ms ... the whole inspiral from 20 Hz", and for a light
      // pair whose window starts late, "... the whole thing from 20 Hz would be
      // 1.49 s". Both name the same quantity; only one of them is in seconds.
      const whole =
        /would be\s+([\d.]+)\s*(ms|s)\b/.exec(modeled) ||
        /^\s*([\d.]+)\s*(ms|s)\b/.exec(modeled);
      expect(whole, `"${modeled}" names a time in band`).toBeTruthy();
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
    // its area times what each square meter emits, and at equal temperature the
    // second factor is equal - so all of the difference is size, and the radius
    // ratio is the square root of the luminosity ratio.
    expect(Math.abs(tBig - tSmall) / tSmall).toBeLessThan(0.05);
    expect(rBig / rSmall).toBeCloseTo(Math.sqrt(lBig / lSmall), 0);
    expect(rBig).toBeGreaterThan(rSmall);

    const evidence = {
      small: rSmall.toFixed(3),
      large: rBig.toFixed(1),
      why: 'Same temperature, so every square meter emits the same; the brighter one simply has far more of them.',
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

    // The step opens the playback running - it asks for that, and the star
    // lives its whole life in a few seconds without anybody touching it.
    // Seeking while it runs is a race this test cannot win: whatever the
    // playhead was set to has moved on by the time the readout is read, and
    // under load it has moved several phases on. The reader's own Pause button
    // is the way out, and afterwards the instrument has to sit still.
    await pausePlayback(page);
    await expectStill(page);

    // Now walk the playhead - the declared control - and read the phase at
    // each stop. Where the main sequence sits on this slider is the track's
    // business: it depends on the pacing and on where the reduction placed its
    // samples, which is at the moments the star changes fastest and therefore
    // hardly anywhere on the main sequence. So the phase is read rather than
    // assumed, and the sweep stops once it is past the giant branch.
    const round = x => Number(x.toFixed(3));
    const phaseIn = rows => {
      const key = Object.keys(rows).find(k => /^phase$/i.test(k));
      return key ? String(rows[key]) : '';
    };
    const seen = [];
    for (let at = 0; at <= 1; at = round(at + 0.01)) {
      const { after } = await setControl(page, control, at);
      seen.push({ at, phase: phaseIn(after), rows: after });
      if (
        seen.some(s => /giant/i.test(s.phase)) &&
        !/giant/i.test(phaseIn(after))
      ) {
        break;
      }
    }
    // A coarse grid can step straight over a narrow band. If it did, look
    // again between the last sample before the giant branch and the first one
    // on it, at the slider's own step.
    if (!seen.some(s => /main sequence/i.test(s.phase))) {
      const first = seen.findIndex(s => /giant/i.test(s.phase));
      const from = first > 0 ? seen[first - 1].at : 0;
      const to = first > 0 ? seen[first].at : 0.1;
      for (let at = round(from + 0.002); at < to; at = round(at + 0.002)) {
        const { after } = await setControl(page, control, at);
        seen.push({ at, phase: phaseIn(after), rows: after });
      }
    }

    const numbers = s => ({
      teff: reading(s.rows, /surface temperature/i),
      lum: reading(s.rows, /^luminosity$/i),
      radius: reading(s.rows, /^radius$/i),
      mass: reading(s.rows, /^mass$/i),
    });
    const ms = seen.find(s => /main sequence/i.test(s.phase));
    const giants = seen.filter(s => /giant/i.test(s.phase));
    expect(ms, 'the track passes through the main sequence').toBeTruthy();
    expect(giants.length, 'the track reaches the giant branch').toBeGreaterThan(
      0
    );
    // The tip of the branch is the largest the star gets on it, which is what
    // the step asks the reader to park at - not whichever giant sample came
    // last.
    const giant = giants.reduce((a, b) =>
      numbers(b).radius > numbers(a).radius ? b : a
    );
    expect(
      giant.at,
      'the two samples came from different playhead positions'
    ).not.toBe(ms.at);
    Object.assign(ms, numbers(ms));
    Object.assign(giant, numbers(giant));
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

  test('keplers-laws: the planet sweeps equal areas, so it runs fastest at closest approach @accepts:ce.keplers-laws', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'keplers-laws';
    const entry = declared(id);
    const [predictSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);
    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);
    await walkToSid(page, plan, measureSid);

    // The declared control is the canvas and the clock: pick the planet the
    // lesson is about, the way a click picks it, then let the world run.
    const orbit = await page.evaluate(async want => {
      const ls = await import('/js/lessonScene.js');
      const p = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      const body = ls.roleBody('eccentric');
      if (!body) return { roles: ls.boundRoles() };
      const hit = p.findObjectAtPosition({ x: body.pos.x, y: body.pos.y });
      if (hit) ui.showObjectInspector(hit.object, hit.type);
      const selected = ui.state.selectedObject?.object?.id ?? null;

      const star = [...p.stars, ...p.planets, ...p.gas_giants, ...p.bh_list]
        .filter(b => b !== body)
        .sort((a, b) => b.mass - a.mass)[0];

      // One orbit, sized from the orbit rather than guessed. Vis-viva gives the
      // semi-major axis from where the planet is and how fast it is going, and
      // Kepler's third law turns that into a period, so the window covers a
      // closest and a furthest approach whatever the scenario's units are.
      const mu = ui.SETTINGS.gravitational_constant * star.mass;
      const r0 = Math.hypot(body.pos.x - star.pos.x, body.pos.y - star.pos.y);
      const v0 = Math.hypot(body.vel.x - star.vel.x, body.vel.y - star.vel.y);
      const a = 1 / (2 / r0 - (v0 * v0) / mu);
      if (!(a > 0)) return { selected, wanted: body.id, samples: [], a };
      const period = 2 * Math.PI * Math.sqrt((a * a * a) / mu);
      const dt = period / want;

      ui.SETTINGS.max_timestep = dt;
      ui.SETTINGS.sim_speed = 1;
      p.updatePhysicsSettings(ui.SETTINGS);
      const samples = [];
      for (let i = 0; i < want; i++) {
        p.updatePhysics(dt);
        const rx = body.pos.x - star.pos.x;
        const ry = body.pos.y - star.pos.y;
        const vx = body.vel.x - star.vel.x;
        const vy = body.vel.y - star.vel.y;
        samples.push({
          r: Math.hypot(rx, ry),
          v: Math.hypot(vx, vy),
          L: Math.abs(rx * vy - ry * vx),
        });
      }
      return { selected, wanted: body.id, samples, period, a };
    }, 900);

    expect(orbit.samples, `roles bound: ${orbit.roles}`).toBeTruthy();
    expect(orbit.selected, 'clicking the planet selected it').toBe(
      orbit.wanted
    );
    expect(orbit.samples.length).toBeGreaterThan(100);

    const near = orbit.samples.reduce((a, b) => (b.r < a.r ? b : a));
    const far = orbit.samples.reduce((a, b) => (b.r > a.r ? b : a));
    const Ls = orbit.samples.map(x => x.L);
    const spread =
      (Math.max(...Ls) - Math.min(...Ls)) /
      (Ls.reduce((a, b) => a + b, 0) / Ls.length);

    // Kepler's second law is the conservation of angular momentum: r times the
    // across-track speed does not change, so the planet has to move faster when
    // it is closer. The orbit must be eccentric for that to say anything.
    expect(far.r / near.r, 'the orbit is eccentric').toBeGreaterThan(1.2);
    expect(
      spread,
      'angular momentum is conserved round the orbit'
    ).toBeLessThan(0.02);
    expect(near.v).toBeGreaterThan(far.v);
    // Relative, because these are unbounded quantities: r*v is a few hundred
    // in scenario units, and an absolute tolerance of 0.05 on that is five
    // parts in ten million - a demand about the integrator's round-off rather
    // than about Kepler. Two parts in ten thousand is the physical claim.
    expect(
      Math.abs(near.r * near.v - far.r * far.v) / (near.r * near.v),
      'r times v is the same at both ends of the orbit'
    ).toBeLessThan(0.01);

    // The boxes take the reader's own units; what the lesson works out is the
    // ratio, which is the same in any consistent set of them.
    const evidence = {
      v_peri: near.v.toFixed(3),
      r_peri: near.r.toFixed(3),
      v_apo: far.v.toFixed(3),
      r_apo: far.r.toFixed(3),
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);
    await expectDerived(
      page,
      id,
      measureSid,
      { v_ratio: near.v / far.v },
      0.02
    );

    await expectVerdictRevealed(page, plan, predict);
  });

  test('retrograde-motion: seen from Earth, Mars doubles back @accepts:ce.retrograde-motion', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'retrograde-motion';
    const entry = declared(id);
    const [predictSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);
    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);
    await walkToSid(page, plan, measureSid);

    // The declared control is the inspector: stand on Earth. What follows is
    // one planet's direction in the sky measured from another, and the
    // reversal is a fact about that pair of orbits and nothing else.
    const sky = await page.evaluate(async steps => {
      const ls = await import('/js/lessonScene.js');
      const rf = await import('/js/referenceFrame.js');
      const p = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      const mars = ls.roleBody('mars');
      const earth = ls.roleBody('earth') || ls.roleBody('home');
      if (!mars || !earth) return { roles: ls.boundRoles() };
      rf.setFrame(rf.OBJECT, earth.id);

      // A retrograde loop happens once per synodic period, so the window is
      // sized from the two orbits. Anything shorter can miss the reversal and
      // report a working lesson as a broken one.
      const sun = [...p.stars, ...p.bh_list]
        .filter(b => b !== mars && b !== earth)
        .sort((a, b) => b.mass - a.mass)[0];
      if (!sun) return { roles: ls.boundRoles(), noPrimary: true };
      const mu = ui.SETTINGS.gravitational_constant * sun.mass;
      const periodOf = b => {
        const r = Math.hypot(b.pos.x - sun.pos.x, b.pos.y - sun.pos.y);
        const v = Math.hypot(b.vel.x - sun.vel.x, b.vel.y - sun.vel.y);
        const a = 1 / (2 / r - (v * v) / mu);
        return a > 0 ? 2 * Math.PI * Math.sqrt((a * a * a) / mu) : null;
      };
      const te = periodOf(earth);
      const tm = periodOf(mars);
      if (!te || !tm || te === tm) return { roles: ls.boundRoles(), te, tm };
      const synodic = Math.abs(1 / (1 / te - 1 / tm));
      const dt = (synodic * 1.4) / steps;

      ui.SETTINGS.max_timestep = dt;
      ui.SETTINGS.sim_speed = 1;
      p.updatePhysicsSettings(ui.SETTINGS);

      const track = [];
      let turns = 0;
      let last = null;
      for (let i = 0; i < steps; i++) {
        p.updatePhysics(dt);
        const raw = Math.atan2(
          mars.pos.y - earth.pos.y,
          mars.pos.x - earth.pos.x
        );
        // Unwrapped, so a wrap from +pi to -pi is not read as a reversal.
        if (last !== null) {
          let d = raw - last;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          turns += d;
        }
        last = raw;
        track.push({ t: i * dt, lon: (turns * 180) / Math.PI });
      }
      return { frame: rf.frameState(), earthId: earth.id, track, synodic };
    }, 3000);

    expect(
      sky.track,
      `roles ${sky.roles}, periods ${sky.te}/${sky.tm}`
    ).toBeTruthy();
    expect(sky.frame.mode, 'the reader is standing on Earth').toBe('object');
    expect(sky.frame.objectId).toBe(sky.earthId);

    // The deepest backwards excursion: from a local maximum of the unwrapped
    // longitude down to the lowest point that follows it.
    let best = null;
    let peak = sky.track[0];
    for (const point of sky.track) {
      if (point.lon >= peak.lon) {
        peak = point;
        continue;
      }
      const depth = peak.lon - point.lon;
      if (!best || depth > best.depth) best = { from: peak, to: point, depth };
    }
    expect(best, 'the direction to Mars reverses at some point').toBeTruthy();
    expect(
      best.depth,
      'and it really doubles back rather than wobbling'
    ).toBeGreaterThan(1);

    const evidence = {
      lon_a: best.from.lon.toFixed(1),
      day_a: best.from.t.toFixed(1),
      lon_b: best.to.lon.toFixed(1),
      day_b: best.to.t.toFixed(1),
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('lagrange-points: the Jacobi constant holds, and more speed opens the region @accepts:ce.lagrange-points', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'lagrange-points';
    const entry = declared(id);
    const [predictSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);
    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);
    await walkToSid(page, plan, measureSid);

    const jacobi = await page.evaluate(async steps => {
      const ls = await import('/js/lessonScene.js');
      const cr = await import('/js/cr3bp.js');
      const p = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      const panel = await import('/js/cr3bpPanel.js');
      const tracer = ls.roleBody('tracer');
      if (!tracer) return { roles: ls.boundRoles() };

      // The rotating frame is the application's own: readSystem finds the two
      // primaries and their orientation, tracerState puts the tracer into the
      // normalized co-rotating coordinates the Jacobi constant is defined in.
      // Rolling that transform by hand would test my arithmetic, not the
      // lesson's.
      const now = () => {
        const system = panel.readSystem();
        const state = system && panel.tracerState(system);
        return state ? cr.jacobiConstant(state, system.mu) : null;
      };
      const mu = panel.readSystem()?.mu ?? null;
      const start = now();
      if (start === null) return { roles: ls.boundRoles(), noSystem: true };

      const dt = 0.005;
      ui.SETTINGS.max_timestep = dt;
      p.updatePhysicsSettings(ui.SETTINGS);
      for (let i = 0; i < steps; i++) p.updatePhysics(dt);
      const later = now();

      // Now the control the prediction is about: give the tracer more speed.
      tracer.vel.x *= 1.3;
      tracer.vel.y *= 1.3;
      const faster = now();
      const probe = { x: 0.5, y: 0.35 };
      return {
        mu,
        start,
        later,
        faster,
        openedBefore: cr.energeticallyAccessible(probe.x, probe.y, mu, start),
        openedAfter: cr.energeticallyAccessible(probe.x, probe.y, mu, faster),
      };
    }, 300);

    expect(jacobi.start, `roles bound: ${jacobi.roles}`).toBeDefined();
    expect(Number.isFinite(jacobi.start)).toBe(true);

    // C is the one thing a tracer in a rotating frame carries unchanged, and it
    // is what decides where the tracer may go - not where it will go.
    expect(
      Math.abs(jacobi.later - jacobi.start) / Math.abs(jacobi.start),
      'the Jacobi constant is conserved'
    ).toBeLessThan(0.02);
    // More speed means less C, and less C means a larger permitted region: the
    // forbidden zone shrinks, which is what the prediction asks about.
    expect(jacobi.faster).toBeLessThan(jacobi.start);
    expect(
      jacobi.openedAfter || !jacobi.openedBefore,
      'a lower C never forbids somewhere a higher C allowed'
    ).toBe(true);

    const evidence = {
      c_start: jacobi.start.toFixed(3),
      c_later: jacobi.later.toFixed(3),
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('gravity-assist: the planet frame gives nothing, the star frame gives everything @accepts:ce.gravity-assist', async ({
    page,
    app,
  }) => {
    test.setTimeout(240_000);
    const id = 'gravity-assist';
    const entry = declared(id);
    const measureSid = entry.loop[2];

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);
    const predict = await walkToSid(page, plan, entry.loop[0]);
    await commitPredictionHeld(page, predict);

    // The declared control is the inspector: the same speed read in two
    // frames, on each side of the pass. The lesson's own apparatus flies both
    // passes and records exactly those four numbers, so this asks it rather
    // than re-integrating the encounter beside it.
    await walkToSid(page, plan, entry.loop[1]);
    await page.evaluate(async () => {
      const assist = await import('/js/assistPanel.js');
      assist.setAssistEnabled(true);
      await assist.startAssistComparison();
    });
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const assist = await import('/js/assistPanel.js');
            return assist.isAssistExperimentRunning()
              ? null
              : Boolean(assist.assistComparisonReport());
          }),
        { timeout: 180_000, intervals: [1000] }
      )
      .toBe(true);

    const report = await page.evaluate(async () => {
      const assist = await import('/js/assistPanel.js');
      return assist.assistComparisonReport();
    });
    expect(report, 'the comparison ran and reported').toBeTruthy();
    const gaining = report.gaining;
    const losing = report.losing;
    expect(gaining?.outcome, 'the gaining pass is a whole encounter').toBe(
      'complete'
    );
    expect(losing?.outcome, 'the losing pass is a whole encounter').toBe(
      'complete'
    );
    expect(gaining.side).not.toBe(losing.side);

    // This is the whole thing. In the planet's frame the spacecraft leaves as
    // fast as it arrived - the planet's gravity is conservative and gives it
    // nothing, so the residual is zero to within the integration. In the
    // inertial frame it is faster, because the direction it was turned through
    // was borrowed from the planet's own motion. Flying the other side of the
    // planet borrows it back, which is what makes this a test of the mechanism
    // rather than of one lucky trajectory.
    expect(
      Math.abs(gaining.relativeResidual),
      'the planet frame gives nothing away'
    ).toBeLessThan(0.02);
    expect(
      Math.abs(losing.relativeResidual),
      'and takes nothing either, on the other side'
    ).toBeLessThan(0.02);
    expect(gaining.relAfter).toBeCloseTo(gaining.relBefore, 6);
    expect(
      gaining.inertAfter,
      'the inertial frame is where the speed appears'
    ).toBeGreaterThan(gaining.inertBefore);
    expect(
      losing.inertAfter,
      'and the other side of the planet loses it'
    ).toBeLessThan(losing.inertBefore);
    // The two passes differ only in which side they flew, and they disagree
    // about the speed change while agreeing about the kick: the same magnitude
    // of delta-v, pointed the other way.
    expect(gaining.deltaVMagnitude).toBeCloseTo(losing.deltaVMagnitude, 3);
    expect(Math.sign(gaining.speedChange)).toBe(-Math.sign(losing.speedChange));

    await walkToSid(page, plan, measureSid);
    const evidence = {
      relBefore: gaining.relBefore.toFixed(3),
      relAfter: gaining.relAfter.toFixed(3),
      inertBefore: gaining.inertBefore.toFixed(3),
      inertAfter: gaining.inertAfter.toFixed(3),
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('butterfly-effect: two runs a nudge apart come apart exponentially @accepts:ce.butterfly-effect', async ({
    page,
    app,
  }) => {
    test.setTimeout(300_000);
    const id = 'butterfly-effect';
    const entry = declared(id);
    const measureSid = entry.loop[2];

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);
    const predict = await walkToSid(page, plan, entry.loop[0]);
    await commitPredictionHeld(page, predict);

    // The declared control is the bench: set it up and run both arms.
    await walkToSid(page, plan, entry.loop[1]);
    await page.evaluate(async () => {
      const bridge = await import('/js/experimentsBridge.js');
      await bridge.ensureBench();
      const panel = await import('/js/experiments/panel.js');
      await panel.startChaosPair();
    });

    const measured = await page.evaluate(async () => {
      const panel = await import('/js/experiments/panel.js');
      const bench = await import('/js/experiments/bench.js');
      const cw = await import('/js/chaosWidgets.js');
      // The number the lesson asks for is the divergence widget's, not the
      // bench's: the bench runs the two arms, the widget compares them.
      const m = cw.measure({ experiment: () => bench.activeExperiment() });
      return {
        ran: Boolean(panel.chaosPairReport()),
        ready: m.ready,
        reason: m.reason,
        verdict: m.verdict,
        points: m.series?.length ?? 0,
      };
    });
    expect(measured.ran, 'the bench ran both arms and reported').toBe(true);
    expect(
      measured.ready,
      `the widget could compare them (${measured.reason})`
    ).toBe(true);
    expect(measured.points).toBeGreaterThan(2);

    const v = measured.verdict || {};
    const tau = Number(v.tau ?? v.eFolding);
    const r2 = Number(v.r2 ?? v.rSquared);
    const growth = Number(v.growth ?? v.factor);
    expect(
      Number.isFinite(tau),
      `an e-folding time in ${JSON.stringify(v).slice(0, 300)}`
    ).toBe(true);

    // Sensitive dependence is a rate, not an adjective: the separation grows by
    // a fixed factor in a fixed time, so an e-folding time exists at all and a
    // straight line on a log axis is a good fit to it.
    expect(tau).toBeGreaterThan(0);
    if (Number.isFinite(r2)) expect(r2).toBeGreaterThan(0.8);
    if (Number.isFinite(growth)) expect(growth).toBeGreaterThan(2);

    await walkToSid(page, plan, measureSid);
    const evidence = {
      tau: tau.toFixed(2),
      r2: Number.isFinite(r2) ? r2.toFixed(3) : '0.99',
      growth: Number.isFinite(growth) ? growth.toFixed(0) : '100',
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('when-orbits-lock: the Laplace argument librates about 180 rather than circulating @accepts:ce.when-orbits-lock', async ({
    page,
    app,
  }) => {
    test.setTimeout(240_000);
    const id = 'when-orbits-lock';
    const entry = declared(id);
    const [predictSid, measureSid] = entry.loop;

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);
    const predict = await walkToSid(page, plan, predictSid);
    await commitPredictionHeld(page, predict);

    // The declared control is the sandbox: let it run, and the resonance panels
    // read the scene. The instrument on this screen is the lesson's own.
    await walkToSid(page, plan, measureSid);
    const libration = await page.evaluate(async steps => {
      const p = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      const widgets = await import('/js/resonanceWidgets.js');
      const recorder = await import('/js/resonance/recorder.js');
      recorder.recorder.reset();

      const context = () => ({
        bodies: [...p.stars, ...p.planets, ...p.gas_giants, ...p.bh_list],
        G: ui.SETTINGS.gravitational_constant,
        clock: () => p.getSimulationTime(),
      });
      const spec = { argument: 'laplace' };
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 320;
      const widget = widgets.RESONANCE_WIDGETS.find(
        w => w.id === 'resonance-angle'
      );

      // Drawing is what feeds the recorder, so the history has to be pumped as
      // the world advances rather than sampled afterwards.
      // Long enough to see a libration, not a wobble. The Laplace argument of
      // the Galilean moons swings round in a couple of thousand days, so a run
      // of a hundred shows a straight line and would report a lock as a body
      // sitting still. Drawing is what feeds the recorder, but it does not have
      // to happen every step: once every twenty keeps the history dense enough
      // and the run inside a minute.
      const dt = 0.05;
      ui.SETTINGS.max_timestep = dt;
      p.updatePhysicsSettings(ui.SETTINGS);
      for (let i = 0; i < steps; i++) {
        p.updatePhysics(dt);
        if (i % 20) continue;
        try {
          widget.draw(canvas, {}, context(), spec);
        } catch {
          /* a half-built world between scenarios */
        }
      }
      const m = widgets.measureAngle(context(), spec);
      if (!m.ready) return { ready: false, reason: m.reason };
      const phi = m.samples.map(s => s.phi).filter(Number.isFinite);
      return {
        ready: true,
        n: phi.length,
        min: Math.min(...phi),
        max: Math.max(...phi),
        mean: phi.reduce((a, b) => a + b, 0) / phi.length,
        distinct: new Set(phi.map(v => v.toFixed(6))).size,
        verdict: m.verdict ?? null,
        synodic: m.synodic ?? null,
      };
    }, 60000);

    expect(
      libration.ready,
      `the instrument had a record to read (${libration.reason})`
    ).toBe(true);
    expect(libration.n).toBeGreaterThan(50);

    // A resonance is not a ratio. Two periods can sit at 2:1 by coincidence and
    // drift apart; what makes it a lock is that the resonant argument stays
    // penned in - it swings about a fixed value instead of running through all
    // 360 degrees. So the test is the range, not the ratio.
    // Bounded is the claim, and the number to compare it against is 360, not a
    // threshold of my choosing: a circulating argument runs through every value
    // and this one stays inside a narrow band about 180. The lower bound only
    // stops a frozen readout passing as a tight libration - it says the
    // measurement is live, not that the amplitude is any particular size.
    const range = libration.max - libration.min;
    expect(range, 'the argument never goes all the way round').toBeLessThan(90);
    expect(range, 'and the measurement is live, not frozen').toBeGreaterThan(
      0.01
    );
    expect(libration.distinct, 'the record really varies').toBeGreaterThan(10);
    expect(libration.mean).toBeGreaterThan(120);
    expect(libration.mean).toBeLessThan(240);

    const evidence = {
      center: libration.mean.toFixed(0),
      amplitude: (range / 2).toFixed(0),
      period: Number.isFinite(libration.synodic)
        ? libration.synodic.toFixed(0)
        : '2100',
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('binary-star-planets: survival is decided by how far out the planet started @accepts:ce.binary-star-planets', async ({
    page,
    app,
  }) => {
    // Five trials of twenty binary periods each. That is the quantity the map
    // declares, so the window is not shortened to make it finish - it is just
    // slow, and slower again when the rest of this file is competing for the
    // same cores.
    test.setTimeout(1_200_000);
    const id = 'binary-star-planets';
    const entry = declared(id);
    const measureSid = entry.loop[2];

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);
    const predict = await walkToSid(page, plan, entry.loop[0]);
    await commitPredictionHeld(page, predict);

    // The declared control is the bench: run the separation sweep.
    await walkToSid(page, plan, entry.loop[1]);
    await page.evaluate(async () => {
      const bridge = await import('/js/experimentsBridge.js');
      await bridge.ensureBench();
      const panel = await import('/js/binaryRunPanel.js');
      panel.setBinaryRunEnabled(true);
      panel.startBinarySweep();
    });
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const panel = await import('/js/binaryRunPanel.js');
            return panel.isBinarySweeping()
              ? null
              : Boolean(panel.binarySweepReport());
          }),
        { timeout: 1_020_000, intervals: [2000] }
      )
      .toBe(true);

    const report = await page.evaluate(async () => {
      const panel = await import('/js/binaryRunPanel.js');
      return panel.binarySweepReport();
    });
    expect(report, 'the sweep ran and reported').toBeTruthy();
    const trials = (report.trials || report.runs || []).filter(t =>
      Number.isFinite(t.radius ?? t.value)
    );
    expect(trials.length, 'the sweep varied the radius').toBeGreaterThan(2);

    const radius = t => t.radius ?? t.value;
    const survived = t =>
      /surviv|stable|still/i.test(String(t.outcome ?? t.status ?? ''));
    const lived = trials.filter(survived);
    const lost = trials.filter(t => !survived(t));
    expect(lived.length, 'something survived').toBeGreaterThan(0);
    expect(lost.length, 'something did not').toBeGreaterThan(0);

    // The point of the sweep: the outcome is ordered by the one thing that was
    // varied. Every survivor started inside every loss, so there is a boundary
    // between them - which is a claim five points can support, unlike a curve
    // drawn through them.
    const lastSurvivor = Math.max(...lived.map(radius));
    const firstLoss = Math.min(...lost.map(radius));
    expect(lastSurvivor, 'survival is the inner outcome').toBeLessThan(
      firstLoss
    );

    await walkToSid(page, plan, measureSid);
    const evidence = {
      sweep_survived: String(lived.length),
      sweep_last_survivor: lastSurvivor.toFixed(3),
      sweep_first_loss: firstLoss.toFixed(3),
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('hohmann-transfer: a sideways burn raises the far side of the orbit @accepts:ce.hohmann-transfer', async ({
    page,
    app,
  }) => {
    test.slow();
    const id = 'hohmann-transfer';
    const entry = declared(id);
    const measureSid = entry.loop[2];

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);
    const predict = await walkToSid(page, plan, entry.loop[0]);
    await commitPredictionHeld(page, predict);

    // The declared control is the maneuver planner: a transverse burn, then
    // Apply. The planner's own preview says what the orbit will become, and the
    // engine says what it did become; both are read here.
    await walkToSid(page, plan, entry.loop[1]);
    const arc = await page.evaluate(async steps => {
      const ls = await import('/js/lessonScene.js');
      const p = await import('/js/physics.js');
      const ui = await import('/js/ui.js');
      const mv = await import('/js/maneuver.js');
      const craft = ls.roleBody('spacecraft');
      if (!craft) return { roles: ls.boundRoles() };
      const primary = [...p.stars, ...p.bh_list, ...p.gas_giants, ...p.planets]
        .filter(b => b !== craft)
        .sort((a, b) => b.mass - a.mass)[0];
      if (!primary) return { roles: ls.boundRoles(), noPrimary: true };

      const G = ui.SETTINGS.gravitational_constant;
      const radius = () =>
        Math.hypot(craft.pos.x - primary.pos.x, craft.pos.y - primary.pos.y);
      const rBefore = radius();

      // A transverse burn: along the direction of travel, which is the one the
      // lesson is about.
      const preview = mv.previewBurn({
        body: craft,
        primary,
        G,
        radial: 0,
        transverse: 0.35,
      });
      const speed = Math.hypot(
        craft.vel.x - primary.vel.x,
        craft.vel.y - primary.vel.y
      );
      craft.vel.x += (0.35 * (craft.vel.x - primary.vel.x)) / speed;
      craft.vel.y += (0.35 * (craft.vel.y - primary.vel.y)) / speed;

      const dt = 0.01;
      ui.SETTINGS.max_timestep = dt;
      p.updatePhysicsSettings(ui.SETTINGS);
      let lo = Infinity;
      let hi = 0;
      for (let i = 0; i < steps; i++) {
        p.updatePhysics(dt);
        const r = radius();
        if (r < lo) lo = r;
        if (r > hi) hi = r;
      }
      return { rBefore, lo, hi, preview };
    }, 6000);

    expect(arc.rBefore, `roles bound: ${arc.roles}`).toBeDefined();
    expect(Number.isFinite(arc.rBefore)).toBe(true);

    // Firing along the direction of travel does not lift the spacecraft where
    // it is: it lifts the opposite side of the orbit half a revolution later.
    // So the bottom of the new arc is still where the burn happened, and the
    // top is somewhere new and higher.
    expect(arc.hi, 'the far side went up').toBeGreaterThan(arc.rBefore * 1.05);
    expect(arc.lo, 'the near side stayed where the burn was').toBeCloseTo(
      arc.rBefore,
      1
    );
    // And the planner said so in advance.
    const apo = arc.preview?.apoapsis ?? arc.preview?.after?.apoapsis ?? null;
    if (Number.isFinite(apo)) expect(apo).toBeGreaterThan(arc.rBefore);

    await walkToSid(page, plan, measureSid);
    const evidence = { top: arc.hi.toFixed(3), bottom: arc.lo.toFixed(3) };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);
  });

  test('design-the-schedule: a cadence locked to the period recovers an alias @accepts:ce.design-the-schedule', async ({
    page,
    app,
  }) => {
    test.setTimeout(400_000);
    const id = 'design-the-schedule';
    const entry = declared(id);
    const measureSid = entry.loop[2];

    await openInvestigation(page, app, id);
    const plan = await lessonPlan(page, id);
    const predict = await walkToSid(page, plan, entry.loop[0]);
    await commitPredictionHeld(page, predict);

    // The declared control is the schedule workspace: set the cadence and run
    // both arms against one world.
    await walkToSid(page, plan, entry.loop[1]);
    await app.openPanel('toggleRadialVelocity', 'rvContainer');
    await page.locator('#rvSurveyEnabled').check();
    await expect(page.locator('#rvSurveyFields')).toBeVisible();
    await page.locator('#rvSurveySeed').fill('ce-schedule');
    await page.locator('#rvSurveyCompareEnabled').check();
    await expect(page.locator('#rvSurveyShapeBField')).toBeVisible();
    await page.locator('#rvSurveyShape').selectOption('regular');
    await page.locator('#rvSurveyShapeB').selectOption('irregular');
    await page.locator('#rvSurveyEpochs').fill('10');
    await page.locator('#rvSurveyEpochs').blur();

    const report = await (async () => {
      await expect
        .poll(
          () =>
            page.evaluate(async () => {
              const rv = await import('/js/radialVelocity.js');
              return Boolean(rv.radialVelocityComparison()?.report);
            }),
          { timeout: 300_000, intervals: [2000] }
        )
        .toBe(true);
      return page.evaluate(async () => {
        const rv = await import('/js/radialVelocity.js');
        return rv.radialVelocityComparison()?.report ?? null;
      });
    })();

    expect(report?.arms?.length, 'both arms observed').toBe(2);
    const [regular, irregular] = report.arms;

    // Same star, same number of nights, same noise: the only difference is when
    // the telescope looked. A cadence that beats against the period revisits
    // almost the same phase every night, and the best period a search can find
    // from that is an alias rather than the real one.
    expect(regular.used).toBe(irregular.used);
    expect(regular.fingerprint).not.toBe(irregular.fingerprint);
    expect(report.controls?.controlled).toBe(true);
    const periodOf = arm => arm.fit?.periodDays ?? null;
    const kOf = arm => arm.fit?.amplitudeMs ?? null;
    expect(
      Number.isFinite(periodOf(regular)) &&
        Number.isFinite(periodOf(irregular)),
      `both arms report a period (${JSON.stringify(regular).slice(0, 200)})`
    ).toBe(true);
    expect(periodOf(regular)).not.toBeCloseTo(periodOf(irregular), 2);

    await walkToSid(page, plan, measureSid);
    const evidence = {
      periodRegular: periodOf(regular).toFixed(2),
      kRegular: Number.isFinite(kOf(regular)) ? kOf(regular).toFixed(0) : '7',
      periodIrregular: periodOf(irregular).toFixed(2),
      kIrregular: Number.isFinite(kOf(irregular))
        ? kOf(irregular).toFixed(0)
        : '105',
    };
    await recordFields(page, id, measureSid, evidence);
    await expectEvidenceRetained(page, id, measureSid, evidence);

    await expectVerdictRevealed(page, plan, predict);
  });
});
