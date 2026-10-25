#!/usr/bin/env node
// =============================================================================
// Validation of the Galilean-moon kernel (Prompt 193, SATELLITE_EPHEMERIS.md)
// -----------------------------------------------------------------------------
// Runs every leg of tests/fixtures/galilean/contract.json, whose thresholds
// were committed before any candidate output was inspected, and prints one row
// per leg: the bound, what was measured and PASS, FAIL or NOT RUN. A leg that
// fails is reported and left failing: nothing here restates a bound.
//
//   node tools/galilean-validate.mjs [--json]
//
// The legs a2 and e1 compare with an independent numpy, astropy and scipy
// computation whose results are committed (tests/fixtures/galilean/oracle-
// results.json, made by tools/galilean-oracle/oracle.py); without that file
// they are NOT RUN, never a pass.
// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { gaussian } from '../js/inference/synthetic.js';
import { fitOnce } from '../js/inference/infer.js';
import { checkRows } from '../js/mission/ephemeris.js';
import {
  GM_JUPITER,
  MOON_IDS,
  REFERENCE,
  R_JUPITER_KM,
  openGalilean,
} from '../js/satellites/galilean.js';
import {
  aliasAnalysis,
  designEpochs,
  meanFrameRate,
  nightlyOnly,
  siderealPeriod,
  truthMarks,
} from '../js/satellites/cadence.js';
import { fitSinusoid, kepler, FitRefusal } from '../js/satellites/weigh.js';
import {
  frameDigest,
  measureFrame,
  renderFrame,
} from '../js/satellites/sequence.js';
import { createEphemeris } from '../js/mission/ephemeris.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'));
export const CONTRACT = read('tests/fixtures/galilean/contract.json');
const L = CONTRACT.legs;

export function loadModel() {
  return openGalilean(
    read('sky/galilean-moons.json'),
    read('sky/ephemeris.json')
  );
}

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const leg = (id, bound, measured, pass) => ({ id, bound, measured, pass });

/** The truth marks as {t, x: {id: [...]}} for a set of epochs. */
export function marksOf(model, epochs) {
  const marks = truthMarks(model, epochs);
  const t = Float64Array.from(marks, m => m.epoch.jdTt);
  const x = Object.fromEntries(
    MOON_IDS.map(id => [id, Float64Array.from(marks, m => m.moons[id].x)])
  );
  return { t, x, marks };
}

/** Fit every moon: {id: fit}. */
export function fitAll(t, x, sigma) {
  return Object.fromEntries(
    MOON_IDS.map(id => [id, fitSinusoid(t, x[id], sigma)])
  );
}

export function runLegs(model = loadModel()) {
  const out = [];
  const epochs = designEpochs(model);
  const { t, x } = marksOf(model, epochs);
  const sigma = L['d1.coverage'].sigmaRj;

  // a1: the pack against the Horizons half-hour samples it never saw.
  {
    const check = read('tests/fixtures/galilean/galileanCheck.json');
    const eph = createEphemeris(
      model.pack,
      read('sky/galilean-moons.json').data
    );
    let pos = 0;
    let vel = 0;
    for (const id of MOON_IDS)
      for (const r of checkRows(check, id)) {
        const s = eph.stateAt(id, r[0]);
        pos = Math.max(
          pos,
          Math.hypot(s.r[0] - r[1], s.r[1] - r[2], s.r[2] - r[3])
        );
        vel = Math.max(
          vel,
          Math.hypot(s.v[0] - r[4], s.v[1] - r[5], s.v[2] - r[6])
        );
      }
    const b = L['a1.packVsHorizons'];
    out.push(
      leg(
        'a1.packVsHorizons',
        `<= ${b.positionKm} km, <= ${b.velocityKmS} km/s`,
        { positionKm: pos, velocityKmS: vel },
        pos <= b.positionKm && vel <= b.velocityKmS
      )
    );
  }

  // a2: the geometry against the independent oracle.
  {
    const file = path.join(ROOT, 'tests/fixtures/galilean/oracle-results.json');
    const b = L['a2.geometryVsOracle'];
    if (!existsSync(file))
      out.push(
        leg(
          'a2.geometryVsOracle',
          `<= ${b.xyRj} Rj`,
          'NOT RUN (no oracle results)',
          null
        )
      );
    else {
      const o = JSON.parse(readFileSync(file, 'utf8'));
      let worst = 0;
      for (const row of o.geometry.rows) {
        const model_ = model;
        const m = marksAtJd(model_, row.jdTt);
        for (const id of MOON_IDS)
          worst = Math.max(
            worst,
            Math.abs(m[id].x - row.moons[id].x),
            Math.abs(m[id].y - row.moons[id].y)
          );
      }
      out.push(
        leg(
          'a2.geometryVsOracle',
          `<= ${b.xyRj} Rj`,
          { worstRj: worst, epochs: o.geometry.rows.length },
          worst <= b.xyRj
        )
      );
    }
  }

  // b1: once-nightly sampling cannot tell Io from its alias.
  {
    const nights = nightlyOnly(epochs);
    const nt = Float64Array.from(nights, e => e.jdTt);
    const b = L['b1.aliasNightly'];
    const rows = {};
    let pass = true;
    for (const id of MOON_IDS) {
      const xs = Float64Array.from(
        truthMarks(model, nights),
        m => m.moons[id].x
      );
      const analysis = aliasAnalysis(REFERENCE[id].periodDays, 1);
      const fit = fitSinusoid(nt, xs, b.sigmaRj);
      if (id === 'io') {
        const alias = analysis.aliases.find(a => a.belowNyquist);
        const near = (p, q) => Math.abs(p - q) / q < 0.01;
        const trueC = fit.candidates.find(c =>
          near(c.periodDays, REFERENCE.io.periodDays)
        );
        const aliasC = fit.candidates.find(c =>
          near(c.periodDays, alias.periodDays)
        );
        const delta =
          trueC && aliasC ? Math.abs(trueC.chi2 - aliasC.chi2) : null;
        rows[id] = {
          aliased: analysis.aliased,
          aliasPeriodDays: alias.periodDays,
          deltaChi2: delta,
          ambiguous: fit.ambiguous,
        };
        pass =
          pass &&
          analysis.aliased &&
          delta !== null &&
          delta < b.deltaChi2Below;
      } else {
        rows[id] = { aliased: analysis.aliased, ambiguous: fit.ambiguous };
        pass = pass && !analysis.aliased;
      }
    }
    out.push(
      leg(
        'b1.aliasNightly',
        `Io: dChi2 < ${b.deltaChi2Below}; the others not aliased`,
        rows,
        pass
      )
    );
  }

  // b2: the designed cadence tells them apart.
  const fits = fitAll(t, x, sigma);
  {
    const b = L['b2.aliasDesigned'];
    const rows = {};
    let pass = true;
    for (const id of MOON_IDS) {
      const f = fits[id];
      const others = f.candidates.filter(
        c => Math.abs(c.periodDays - f.periodDays) / f.periodDays > 0.01
      );
      const gap = others.length
        ? Math.min(...others.map(c => c.deltaChi2))
        : Infinity;
      const near = rel(f.periodDays, REFERENCE[id].periodDays);
      rows[id] = {
        periodDays: f.periodDays,
        relativeToReference: near,
        nearestRivalDeltaChi2: gap,
      };
      pass =
        pass &&
        gap >= b.deltaChi2AtLeast &&
        near <= b.relativeToReference &&
        !f.ambiguous;
    }
    out.push(
      leg(
        'b2.aliasDesigned',
        `rival dChi2 >= ${b.deltaChi2AtLeast}; period within ${b.relativeToReference} of reference`,
        rows,
        pass
      )
    );
  }

  // c1: period and semi-major axis, apparent and corrected.
  const rate = meanFrameRate(model, epochs);
  const corrected = {};
  {
    const b = L['c1.periodAmplitude'];
    const rows = {};
    let pass = true;
    for (const id of MOON_IDS) {
      const f = fits[id];
      const sid = siderealPeriod(f.periodDays, rate);
      corrected[id] = sid;
      const r1 = rel(f.periodDays, REFERENCE[id].periodDays);
      const r2 = rel(f.amplitude, REFERENCE[id].aKm / R_JUPITER_KM);
      const r3 = rel(sid, REFERENCE[id].periodDays);
      rows[id] = {
        periodDays: f.periodDays,
        sigmaPeriodDays: f.sigmaPeriodDays,
        amplitudeRj: f.amplitude,
        apparentRelative: r1,
        amplitudeRelative: r2,
        correctedPeriodDays: sid,
        correctedRelative: r3,
      };
      pass =
        pass &&
        r1 <= b.apparentPeriodRelative &&
        r2 <= b.amplitudeRelative &&
        r3 <= b.correctedPeriodRelative;
    }
    out.push(
      leg(
        'c1.periodAmplitude',
        `apparent <= ${b.apparentPeriodRelative}, axis <= ${b.amplitudeRelative}, corrected <= ${b.correctedPeriodRelative}`,
        { frameRateDegPerDay: rate, rows },
        pass
      )
    );
  }

  // x1: a DIAGNOSTIC added after c1 and b2 failed (not a contract leg, no bound
  // of the contract is replaced by it): is the apparent period what the frame's
  // turning predicts, 1/P = 1/P_reference - rate/360, within 5e-4 relative?
  {
    const rows = {};
    let pass = true;
    for (const id of MOON_IDS) {
      const predicted = 1 / (1 / REFERENCE[id].periodDays - rate / 360);
      const d = rel(fits[id].periodDays, predicted);
      rows[id] = {
        predictedApparentDays: predicted,
        fittedDays: fits[id].periodDays,
        relative: d,
      };
      pass = pass && d <= 5e-4;
    }
    out.push({
      ...leg(
        'x1.syncheck',
        'diagnostic: apparent period within 5e-4 of the frame-rate prediction',
        rows,
        pass
      ),
      diagnostic: true,
    });
  }

  // c2: Jupiter's GM.
  {
    const b = L['c2.mass'];
    const rows = {};
    const gms = [];
    let pass = true;
    for (const id of MOON_IDS) {
      const f = fits[id];
      const k0 = kepler(f);
      const k1 = kepler({ ...f, periodDays: corrected[id] });
      gms.push(k1.gm);
      const r0 = rel(k0.gm, GM_JUPITER);
      const r1 = rel(k1.gm, GM_JUPITER);
      rows[id] = {
        gmUncorrected: k0.gm,
        gmCorrected: k1.gm,
        uncorrectedRelative: r0,
        correctedRelative: r1,
      };
      pass = pass && r0 <= b.uncorrectedRelative && r1 <= b.correctedRelative;
    }
    const mean = gms.reduce((p, q) => p + q, 0) / gms.length;
    const scatter = (Math.max(...gms) - Math.min(...gms)) / mean;
    pass = pass && scatter <= b.scatterRelative;
    out.push(
      leg(
        'c2.mass',
        `<= ${b.uncorrectedRelative} uncorrected, <= ${b.correctedRelative} corrected, scatter <= ${b.scatterRelative}`,
        { rows, scatter, gmReference: GM_JUPITER },
        pass
      )
    );
  }

  // d1 and d2: an ensemble of noise realisations.
  {
    const b = L['d1.coverage'];
    const b2 = L['d2.massEnsemble'];
    const hitsP = Object.fromEntries(MOON_IDS.map(id => [id, 0]));
    const hitsA = Object.fromEntries(MOON_IDS.map(id => [id, 0]));
    const hitsM = Object.fromEntries(MOON_IDS.map(id => [id, 0]));
    for (let s = 0; s < b.seeds; s++) {
      const noise = gaussian(`galilean-${s}`);
      for (const id of MOON_IDS) {
        const xs = Float64Array.from(x[id], v => v + b.sigmaRj * noise());
        const f = fitSinusoid(t, xs, b.sigmaRj);
        const f0 = fits[id];
        if (Math.abs(f.periodDays - f0.periodDays) <= f.sigmaPeriodDays)
          hitsP[id]++;
        if (Math.abs(f.amplitude - f0.amplitude) <= f.sigmaAmplitude)
          hitsA[id]++;
        const sid = siderealPeriod(f.periodDays, rate);
        const sigmaSid = f.sigmaPeriodDays * (sid / f.periodDays) ** 2;
        const k = kepler({ ...f, periodDays: sid, sigmaPeriodDays: sigmaSid });
        if (Math.abs(k.gm - GM_JUPITER) <= b2.withinSigmas * k.sigmaGm)
          hitsM[id]++;
      }
    }
    const frac = o =>
      Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / b.seeds]));
    const cp = frac(hitsP);
    const ca = frac(hitsA);
    const cm = frac(hitsM);
    const cov = Object.values({
      ...cp,
      ...Object.fromEntries(Object.entries(ca).map(([k, v]) => [`a${k}`, v])),
    });
    out.push(
      leg(
        'd1.coverage',
        `one-sigma coverage in [${b.coverageLow}, ${b.coverageHigh}] over ${b.seeds} seeds`,
        { period: cp, amplitude: ca },
        cov.every(v => v >= b.coverageLow && v <= b.coverageHigh)
      )
    );
    out.push(
      leg(
        'd2.massEnsemble',
        `within ${b2.withinSigmas} sigma at least ${b2.atLeast}`,
        cm,
        Object.values(cm).every(v => v >= b2.atLeast)
      )
    );
  }

  // e1: scipy's fit of the committed marks.
  {
    const b = L['e1.oracleFit'];
    const file = path.join(ROOT, 'tests/fixtures/galilean/oracle-results.json');
    if (!existsSync(file) || !JSON.parse(readFileSync(file, 'utf8')).fit)
      out.push(
        leg(
          'e1.oracleFit',
          `<= ${b.relative}`,
          'NOT RUN (no oracle results)',
          null
        )
      );
    else {
      const o = JSON.parse(readFileSync(file, 'utf8')).fit;
      const rows = {};
      let pass = true;
      for (const id of MOON_IDS) {
        const f = fits[id];
        const dp = rel(f.periodDays, o[id].periodDays);
        const da = rel(f.amplitude, o[id].amplitude);
        rows[id] = { periodRelative: dp, amplitudeRelative: da };
        pass = pass && dp <= b.relative && da <= b.relative;
      }
      out.push(leg('e1.oracleFit', `<= ${b.relative}`, rows, pass));
    }
  }

  // e2: the inference core's rv-keplerian fit of the same marks.
  {
    const b = L['e2.inferenceCore'];
    const rows = {};
    let pass = true;
    for (const id of MOON_IDS) {
      const ref = REFERENCE[id].periodDays;
      const data = {
        x: Float64Array.from(t, v => v - t[0]),
        y: x[id],
        sigma: new Float64Array(t.length).fill(sigma),
        groups: null,
        rows: Array.from(t, (_, i) => i),
        counts: {
          total: t.length,
          used: t.length,
          masked: 0,
          missing: 0,
          withoutUncertainty: 0,
        },
        columns: { x: 'time', y: 'x', sigma: 'sigma' },
        units: { x: 'd', y: 'Rj' },
        perDay: 1,
      };
      const f = fits[id];
      const fit = fitOnce(
        {
          model: { id: 'rv-keplerian' },
          parameters: {
            P: { lo: ref * 0.99, hi: ref * 1.01 },
            tc: { lo: 0, hi: ref },
            sqrtEcosw: { mode: 'fixed', value: 0 },
            sqrtEsinw: { mode: 'fixed', value: 0 },
          },
        },
        data
      );
      const p = fit.parameters.find(q => q.name === 'P').value;
      const k = fit.parameters.find(q => q.name === 'K').value;
      const dp = rel(p, f.periodDays);
      const da = rel(k, f.amplitude);
      rows[id] = { periodRelative: dp, amplitudeRelative: da };
      pass = pass && dp <= b.relative && da <= b.relative;
    }
    out.push(leg('e2.inferenceCore', `<= ${b.relative}`, rows, pass));
  }

  // f1: refusals.
  {
    const rows = {};
    const refused = (name, fn) => {
      try {
        fn();
        rows[name] = 'no refusal';
        return false;
      } catch (e) {
        rows[name] = e instanceof FitRefusal ? e.code : `other: ${e.message}`;
        return e instanceof FitRefusal;
      }
    };
    const few = refused('fewMarks', () =>
      fitSinusoid(t.slice(0, 5), x.io.slice(0, 5), sigma)
    );
    const short = refused('spanShorterThanPeriod', () =>
      fitSinusoid(t.slice(0, 12), x.callisto.slice(0, 12), sigma, {
        minPeriodDays: 4,
        maxPeriodDays: 40,
      })
    );
    out.push(
      leg(
        'f1.refusals',
        'refuses too few marks and a span shorter than the period',
        rows,
        few && short
      )
    );
  }
  // g1: the synthetic frames.
  {
    let worstPx = 0;
    let measured = 0;
    let skipped = 0;
    let stable = true;
    epochs.forEach((e, i) => {
      const f = renderFrame(model, e, i);
      if (
        i % 10 === 0 &&
        frameDigest(f) !== frameDigest(renderFrame(model, e, i))
      )
        stable = false;
      const r = measureFrame(model, e, f);
      for (const id of MOON_IDS) {
        if (!r.moons[id]) {
          skipped++;
          continue;
        }
        measured++;
        const tr = f.truth[id];
        const dx = (r.moons[id].x - tr.x) * r.pixelsPerRj;
        const dy = (r.moons[id].y - tr.y) * r.pixelsPerRj;
        worstPx = Math.max(worstPx, Math.hypot(dx, dy));
      }
    });
    out.push(
      leg(
        'g1.frames',
        'centroid within 0.15 pixel of the rendered position; digest stable',
        {
          worstPixel: worstPx,
          measured,
          notMeasuredBlendedOrOnTheDisk: skipped,
          digestStable: stable,
        },
        worstPx <= 0.15 && stable
      )
    );
  }
  return out;
}

/** Offsets of the moons at a TT Julian date, for the oracle comparison. */
import { moonsAt } from '../js/satellites/galilean.js';
const marksAtJd = (model, jdTt) => moonsAt(model, jdTt).moons;

const main =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (main) {
  const rows = runLegs();
  const json = process.argv.includes('--json');
  if (json) console.log(JSON.stringify(rows, null, 2));
  else
    for (const r of rows)
      console.log(
        `${r.pass === null ? 'NOT RUN' : r.pass ? 'PASS   ' : 'FAIL   '} ${r.id.padEnd(22)} ${r.bound}\n         ${JSON.stringify(r.measured).slice(0, 600)}`
      );
  process.exit(rows.some(r => r.pass === false && !r.diagnostic) ? 1 : 0);
}
