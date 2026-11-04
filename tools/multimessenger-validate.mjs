#!/usr/bin/env node
// =============================================================================
// The multi-messenger kernel against its committed thresholds (Prompt 244)
// -----------------------------------------------------------------------------
//   npm run multimessenger:validate                    print the table
//   npm run multimessenger:validate -- --json          print it as JSON
//   npm run multimessenger:validate -- --write-results rewrite tests/fixtures/multimessenger/results.json
//   npm run multimessenger:validate -- --write-failed  rewrite tests/fixtures/multimessenger/failed-legs.json
//   --only=A1,B1                                       run the legs whose id starts with these
//
// tests/fixtures/multimessenger/thresholds.json fixed every bound before
// js/kernels/multimessenger existed (MULTIMESSENGER.md, "Validation contract").
// This reads the bounds from that file, not from copies. The oracle rows read the
// results of tools/multimessenger-oracle/oracle.py pinned in oracle-results.json
// (numpy, scipy, Fractions; no Gravitas code). A leg whose authentic file was never
// supplied is NOT RUN and says why.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as K from '../js/kernels/multimessenger/index.js';
import { createCosmology } from '../js/kernels/cosmology/flrw.js';
import { adaptive } from '../js/numeric/quadrature.js';
import { brent } from '../js/numeric/roots.js';
import { gaussian, stream } from '../js/random/streams.js';
import { chi2Sf } from '../js/kernels/statistics/special.js';
import { BANDS } from '../js/data/radiation/bandpasses.js';
import { decodeBand } from '../js/kernels/radiation/photometry.js';
import { C_LIGHT } from '../js/kernels/radiation/constants.js';
import { SIGMA_SB } from '../js/kernels/radiation/constants.js';
import { EVENTS } from '../js/data/gw/gwoscEvents.js';
import {
  checkLeapList,
  parseLeapSecondsList,
  parsePhotometryCsv,
  readAuthenticJson,
} from './multimessenger-authentic.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = 'tests/fixtures/multimessenger';
const read = rel => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
export const THRESHOLDS = read(`${DIR}/thresholds.json`);
const lim = id => THRESHOLDS.checks.find(c => c.id === id).limits;
const ORACLE = read(`${DIR}/oracle-results.json`);
const ASTROPY = read(`${DIR}/oracle-astropy-times.json`);
const ORACLE_BANDS = read(`${DIR}/oracle-bands.json`);
const SEED = THRESHOLDS.seeds;
const AUTH_DIR = path.join(ROOT, DIR, 'authentic');

const sig = (v, d = 4) => (Number.isFinite(v) ? Number(v.toPrecision(d)) : v);
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const maxOf = a => a.reduce((m, v) => Math.max(m, v), 0);
const median = a => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2
    ? s[(s.length - 1) / 2]
    : 0.5 * (s[s.length / 2 - 1] + s[s.length / 2]);
};
const throwsCode = (fn, code) => {
  try {
    fn();
  } catch (e) {
    return e?.code === code;
  }
  return false;
};

const decoded = Object.fromEntries(
  ['g', 'r', 'i', 'z', 'J', 'H', 'Ks'].map(id => [
    id,
    decodeBand(BANDS.find(b => b.id === id)),
  ])
);
const MODEL = {
  ...K.ILLUSTRATIVE_PARAMETERS,
  ...(() => {
    const m = THRESHOLDS.synthetic.kilonovaModel;
    return {
      velocityC: m.velocityC,
      T0K: m.T0K,
      tRefDays: m.tRefDays,
      coolingExponent: m.coolingExponent,
      floorK: m.floorK,
      domainDays: m.domainDays,
    };
  })(),
};

/**
 * Run the legs.
 * @param {{only?: string[], authDir?: string}} [opts]
 * @returns {object[]} rows {id, status, measured, note}
 */
export function runValidation({ only = [], authDir = AUTH_DIR } = {}) {
  const rows = [];
  const row = (id, pass, measured, note = '') =>
    rows.push({ id, status: pass ? 'pass' : 'fail', measured, note });
  const reported = (id, measured, note = '') =>
    rows.push({ id, status: 'reported', measured, note });
  const notRun = (id, note) =>
    rows.push({ id, status: 'not-run', measured: null, note });
  const wanted = id => !only.length || only.some(p => id.startsWith(p));
  const cpu0 = process.cpuUsage();

  const table = K.makeLeapTable(THRESHOLDS.synthetic.leapTable);
  const gpsOf = t72 => K.fromT72(t72, 'GPS', table);

  // ---- time ------------------------------------------------------------------------

  if (wanted('A1.')) {
    const L = lim('A1.timeCases');
    let gpsErr = 0;
    let mjdErr = 0;
    let okRound = true;
    for (const c of L.cases) {
      const t = K.toT72({ value: c.utc, system: 'UTC' }, table);
      if (c.gps != null) {
        gpsErr = Math.max(gpsErr, Math.abs(gpsOf(t) - c.gps));
        const back = K.toT72({ value: c.gps, system: 'GPS' }, table);
        if (K.formatUtc(K.fromT72(back, 'UTC', table), 0) !== c.utc)
          okRound = false;
      }
      if (c.met != null)
        gpsErr = Math.max(
          gpsErr,
          Math.abs(K.fromT72(t, 'FERMI_MET', table) - c.met)
        );
      if (c.mjd != null)
        mjdErr = Math.max(
          mjdErr,
          Math.abs(K.fromT72(t, 'MJD_UTC', table) - c.mjd)
        );
    }
    const step =
      gpsOf(K.toT72({ value: '2000-01-01T00:00:00', system: 'UTC' }, table)) -
      gpsOf(K.toT72({ value: '1999-12-31T23:59:59', system: 'UTC' }, table));
    const refused = [
      throwsCode(
        () => K.toT72({ value: L.refusedUtc[0], system: 'UTC' }, table),
        'invalid-utc'
      ),
      throwsCode(
        () => K.toT72({ value: L.refusedUtc[1], system: 'UTC' }, table),
        'before-1972'
      ),
    ];
    row(
      'A1.timeCases',
      gpsErr <= L.maxGpsErrorS &&
        mjdErr <= L.maxMjdErrorDays &&
        okRound &&
        step === L.stepDeltaS &&
        refused.every(Boolean),
      {
        maxSecondsError: gpsErr,
        maxMjdError: mjdErr,
        roundTrip: okRound,
        stepDelta: step,
        refused,
      }
    );
  }

  if (wanted('B1.')) {
    const L = lim('B1.timeOracle');
    let g = 0;
    let m = 0;
    let d = 0;
    let mj = 0;
    let cal = 0;
    let delayErr = 0;
    let n = 0;
    for (const r of ORACLE.time) {
      n++;
      const t = K.utcToT72(r.utc, table);
      g = Math.max(g, Math.abs(K.fromT72(t, 'GPS', table) - r.gps));
      m = Math.max(m, Math.abs(K.fromT72(t, 'FERMI_MET', table) - r.met));
      if (r.mjd != null)
        mj = Math.max(mj, Math.abs(K.fromT72(t, 'MJD_UTC', table) - r.mjd));
      const back = K.fromT72(
        K.toT72({ value: r.gps, system: 'GPS' }, table),
        'UTC',
        table
      );
      const same =
        back.year === r.utc.year &&
        back.month === r.utc.month &&
        back.day === r.utc.day &&
        back.hour === r.utc.hour &&
        back.minute === r.utc.minute;
      d = Math.max(d, same ? Math.abs(back.second - r.utc.second) : Infinity);
      cal += same ? 0 : 1;
      if (r.delay != null)
        delayErr = Math.max(
          delayErr,
          Math.abs(
            K.delaySeconds(
              { value: r.gps, system: 'GPS' },
              { value: r.metPlusDelay, system: 'FERMI_MET' },
              table
            ) - r.delay
          )
        );
    }
    row(
      'B1.timeOracle',
      n >= L.instants &&
        g <= L.maxGpsErrorS &&
        m <= L.maxMetErrorS &&
        mj <= L.maxMjdErrorDays &&
        d <= L.maxGpsErrorS &&
        cal === 0 &&
        delayErr <= L.maxDelayErrorS,
      {
        instants: n,
        maxGpsErrorS: g,
        maxMetErrorS: m,
        maxMjdErrorDays: mj,
        maxInverseErrorS: d,
        calendarMismatches: cal,
        maxDelayErrorS: delayErr,
      }
    );
  }

  let authTable = null;
  let authNote = '';
  if (wanted('B2.') || wanted('E1.')) {
    const L = lim('B2.timeAuthentic');
    const p = path.join(authDir, 'leap-seconds.list');
    const sources = readAuthenticJson(authDir, 'SOURCES.json');
    if (!existsSync(p))
      authNote = 'authentic/leap-seconds.list was not supplied';
    else {
      const list = parseLeapSecondsList(readFileSync(p, 'utf8'));
      const retrieved = sources?.['leap-seconds.list']?.retrieved ?? null;
      const problems = checkLeapList(list, retrieved);
      if (!retrieved)
        problems.push(
          'SOURCES.json has no retrieval date for leap-seconds.list'
        );
      if (problems.length)
        authNote = `the supplied list fails its own checks: ${problems.join('; ')}`;
      else {
        authTable = K.makeLeapTable(
          list.entries.map(({ from, taiMinusUtc }) => ({ from, taiMinusUtc }))
        );
        if (wanted('B2.')) {
          let g = 0;
          let m = 0;
          for (const r of ASTROPY.rows) {
            const t = K.utcToT72(r.utc, authTable);
            g = Math.max(g, Math.abs(K.fromT72(t, 'GPS', authTable) - r.gps));
            m = Math.max(
              m,
              Math.abs(K.fromT72(t, 'FERMI_MET', authTable) - r.met)
            );
          }
          row(
            'B2.timeAuthentic',
            g <= L.maxGpsErrorS && m <= L.maxMetErrorS,
            {
              instants: ASTROPY.rows.length,
              maxGpsErrorS: g,
              maxMetErrorS: m,
              entries: list.entries.length,
            },
            'the list passes its own checks (first of a month, ascending, 19 s at the GPS epoch, not expired)'
          );
        }
      }
    }
    if (!authTable && wanted('B2.')) notRun('B2.timeAuthentic', authNote);
  }

  // ---- the bound -------------------------------------------------------------------

  if (wanted('A2.')) {
    const L = lim('A2.boundForms');
    let worst = 0;
    let worstExact = 0;
    let ratioOk = true;
    ORACLE.boundA2.forEach(o => {
      const r = K.speedBound({
        delay: o.delay,
        distance: o.distanceMpc,
        emissionDelay: { min: o.tauMin, max: o.tauMax },
      });
      worst = Math.max(
        worst,
        rel(r.implied.upper, o.firstOrderUpper),
        rel(r.implied.lower, o.firstOrderLower)
      );
      worstExact = Math.max(
        worstExact,
        rel(r.implied.exactUpper, o.exactUpper),
        rel(r.implied.exactLower, o.exactLower)
      );
      const x = Math.abs(o.firstOrderLower);
      const gap = rel(r.implied.exactLower, r.implied.lower);
      if (
        x > 0 &&
        gap >
          L.maxRelExactVsFirstOrderFactor *
            Math.max(x, Math.abs(o.firstOrderUpper))
      )
        ratioOk = false;
    });
    const zero = K.speedBound({
      delay: 1.74,
      distance: 40,
      emissionDelay: { min: 1.74, max: 10 },
    });
    row(
      'A2.boundForms',
      worst <= L.maxRel &&
        worstExact <= L.maxRel &&
        ratioOk &&
        zero.upper === 0,
      {
        maxRelFirstOrder: worst,
        maxRelExact: worstExact,
        exactVsFirstOrderWithinFactor: ratioOk,
        upperAtTauEqualsDelay: zero.upper,
      }
    );
  }

  if (wanted('A3.')) {
    const L = lim('A3.boundStructure');
    const base = {
      delay: 1.74,
      distance: 40,
      emissionDelay: { min: 0, max: 10 },
    };
    const a = K.speedBound(base);
    const dbl = K.speedBound({ ...base, distance: 80 });
    const scale = Math.max(
      rel(dbl.upper * 2, a.upper),
      rel(dbl.lower * 2, a.lower)
    );
    const wideMax = K.speedBound({
      ...base,
      emissionDelay: { min: 0, max: 20 },
    });
    const wideMin = K.speedBound({
      ...base,
      emissionDelay: { min: 1, max: 10 },
    });
    const indep = Math.max(
      rel(wideMax.upper, a.upper),
      rel(wideMin.lower, a.lower)
    );
    const v = tau =>
      K.speedBound({ ...base, emissionDelay: { min: tau, max: 10 } }).upper;
    const slope = (v(1) - v(0.5)) / 0.5;
    const slopeRel = rel(slope, -(C_LIGHT / (40 * K.MPC_M)));
    const widths = [0, 0.5, 1, 1.5].map(t => {
      const r = K.speedBound({ ...base, emissionDelay: { min: t, max: 10 } });
      return r.upper - r.lower;
    });
    const widthsMonotone = widths.every(
      (w, i) => i === 0 || w <= widths[i - 1] * (1 + 1e-12)
    );
    const curve = K.boundCurve({
      delay: 1.74,
      distance: 40,
      tauGrid: L.curveGridS,
    });
    const lows = curve.lowerVsTauMax.map(r => r.value);
    const ups = curve.upperVsTauMin.map(r => r.value);
    const curveOk =
      lows.every((x, i) => i === 0 || x <= lows[i - 1]) &&
      ups.every((x, i) => i === 0 || x <= ups[i - 1]);
    const cons = K.speedBound({
      ...base,
      distance: { value: 40, lower: -15, upper: 7 },
    });
    const at25 = K.speedBound({ ...base, distance: 25 });
    const consOk =
      cons.distanceMpc === 25 &&
      cons.distanceRule === 'lower-end' &&
      cons.upper === at25.upper;
    row(
      'A3.boundStructure',
      scale <= L.maxRel &&
        indep <= L.maxRel &&
        slopeRel <= L.maxRel &&
        widthsMonotone &&
        curveOk &&
        consOk,
      {
        inverseDistanceRel: scale,
        independenceRel: indep,
        slopeRel,
        widthsMonotone,
        curveOk,
        conservativeDistance: consOk,
      }
    );
  }

  if (wanted('B3.')) {
    const L = lim('B3.boundExact');
    let worst = 0;
    for (const o of ORACLE.boundCases) {
      const r = K.speedBound({
        delay: o.delay,
        distance: o.distanceMpc,
        emissionDelay: { min: o.tauMin, max: o.tauMax },
      });
      worst = Math.max(
        worst,
        rel(r.implied.exactUpper, o.exactUpper),
        rel(r.implied.exactLower, o.exactLower)
      );
    }
    row(
      'B3.boundExact',
      ORACLE.boundCases.length >= L.cases && worst <= L.maxRel,
      {
        cases: ORACLE.boundCases.length,
        maxRel: worst,
      }
    );
  }

  if (wanted('B4.') || wanted('E1.')) {
    const pub = readAuthenticJson(authDir, 'published-bound.json');
    if (!pub) {
      if (wanted('B4.'))
        notRun(
          'B4.boundPublished',
          'authentic/published-bound.json was not supplied'
        );
    } else if (wanted('B4.')) {
      const r = K.speedBound({
        delay: pub.delay.value,
        distance: pub.distance.value,
        emissionDelay: {
          min: pub.emissionDelay.min,
          max: pub.emissionDelay.max,
        },
      });
      const sf = pub.bound.printedSignificantFigures;
      const ends = r.status === 'bounded' ? [r.lower, r.upper] : [NaN, NaN];
      const same =
        Number(ends[0].toPrecision(sf)) === pub.bound.lower &&
        Number(ends[1].toPrecision(sf)) === pub.bound.upper;
      row('B4.boundPublished', same, {
        kernel: { lower: r.lower, upper: r.upper },
        printed: pub.bound,
        delayDefinition: pub.delay.definition,
        status: r.status,
      });
    }
  }

  if (wanted('D1.')) {
    const L = lim('D1.noBound');
    const outcomes = L.cases.map(c => {
      const r = K.speedBound({
        delay: c.dt,
        distance: 40,
        emissionDelay: { min: c.tauMin, max: c.tauMax },
      });
      const nullEnds =
        r.status === 'no-bound'
          ? r.lower === null && r.upper === null && r.reason && r.implied
          : true;
      return (
        r.status === c.status &&
        nullEnds &&
        (c.upper == null || r.upper === c.upper)
      );
    });
    const codes = [
      throwsCode(
        () =>
          K.speedBound({
            delay: 1,
            distance: 0,
            emissionDelay: { min: 0, max: 1 },
          }),
        'bad-distance'
      ),
      throwsCode(
        () =>
          K.speedBound({
            delay: 1,
            distance: -3,
            emissionDelay: { min: 0, max: 1 },
          }),
        'bad-distance'
      ),
      throwsCode(
        () =>
          K.speedBound({
            delay: 1,
            distance: 40,
            emissionDelay: { min: 5, max: 1 },
          }),
        'bad-interval'
      ),
      throwsCode(
        () =>
          K.speedBound({
            delay: NaN,
            distance: 40,
            emissionDelay: { min: 0, max: 1 },
          }),
        'not-finite'
      ),
      throwsCode(
        () =>
          K.speedBound({ delay: 1, distance: 40, emissionDelay: { min: 0 } }),
        'assumption-required'
      ),
      throwsCode(
        () => K.speedBound({ delay: 1, distance: 40 }),
        'assumption-required'
      ),
    ];
    row('D1.noBound', outcomes.every(Boolean) && codes.every(Boolean), {
      cases: outcomes,
      refusals: codes,
    });
  }

  // ---- the timeline ----------------------------------------------------------------

  if (wanted('A4.') || wanted('D2.')) {
    const s = K.syntheticScene({ seed: SEED.ensemble, leapTable: table });
    const mk = (id, messenger, band, t, sigmaS) =>
      K.makeEvent({ id, messenger, band, time: { ...t, sigmaS } });
    const evs = [
      mk('opt', 'photon', 'optical', s.stamps.optical, 0.01),
      mk('grb', 'photon', 'gamma', s.stamps.grb, 0.02),
      mk('gw', 'gravitational-wave', null, s.stamps.gw, 0.05),
    ];
    if (wanted('A4.')) {
      const L = lim('A4.timeline');
      const tl = K.buildTimeline(evs, { reference: 'gw', leapTable: table });
      const order = tl.entries.map(e => e.id).join(',') === 'gw,grb,opt';
      const grb = tl.entries.find(e => e.id === 'grb');
      const offErr = Math.abs(grb.offsetS - s.truth.delayS);
      const sigRel = rel(grb.sigmaOffsetS, Math.hypot(0.02, 0.05));
      const noSigma = K.buildTimeline(
        [mk('gw', 'gravitational-wave', null, s.stamps.gw), evs[1]],
        { reference: 'gw', leapTable: table }
      ).entries.find(e => e.id === 'grb').sigmaOffsetS;
      const kept = tl.entries.every(e => e.system && e.definition);
      const same = K.buildTimeline(
        [
          mk('a', 'gravitational-wave', null, {
            value: 1187008882.4,
            system: 'GPS',
            definition: 'merger-catalogue',
          }),
          mk('b', 'photon', 'gamma', {
            value: K.fromT72(
              K.toT72({ value: 1187008882.4, system: 'GPS' }, table),
              'FERMI_MET',
              table
            ),
            system: 'FERMI_MET',
            definition: 'instrument-trigger',
          }),
        ],
        { reference: 'a', leapTable: table }
      ).entries.find(e => e.id === 'b').offsetS;
      row(
        'A4.timeline',
        order &&
          offErr <= L.maxOffsetErrorS &&
          sigRel <= L.maxRel &&
          noSigma === null &&
          kept &&
          Math.abs(same) <= L.maxOffsetErrorS,
        {
          order,
          offsetErrorS: offErr,
          sigmaRel: sigRel,
          sigmaAbsentWhenEitherAbsent: noSigma === null,
          systemsKept: kept,
          sameInstantOffsetS: same,
        },
        'the scene is SYNTHETIC (an invented merger, the table of the thresholds file)'
      );
    }
    if (wanted('D2.')) {
      const L = lim('D2.names');
      const refused = L.refusedMessengers.map(m =>
        throwsCode(() => mk('x', m, null, s.stamps.gw), 'bad-messenger')
      );
      const photonNoBand = throwsCode(
        () => mk('x', 'photon', null, s.stamps.grb),
        'bad-band'
      );
      const gwBand = throwsCode(
        () => mk('x', 'gravitational-wave', 'gamma', s.stamps.gw),
        'bad-band'
      );
      const noSystem = throwsCode(
        () =>
          K.makeEvent({
            id: 'x',
            messenger: 'photon',
            band: 'gamma',
            time: { value: 1, definition: 'peak' },
          }),
        'unknown-system'
      );
      const noDef = throwsCode(
        () =>
          K.makeEvent({
            id: 'x',
            messenger: 'photon',
            band: 'gamma',
            time: { value: 1, system: 'GPS' },
          }),
        'definition-required'
      );
      const hinted = (() => {
        try {
          mk('x', 'gamma-ray', null, s.stamps.gw);
        } catch (e) {
          return /gravitational-wave and photon/.test(e.message);
        }
        return false;
      })();
      row(
        'D2.names',
        refused.every(Boolean) &&
          photonNoBand &&
          gwBand &&
          noSystem &&
          noDef &&
          hinted,
        {
          refusedMessengers: refused,
          photonWithoutBand: photonNoBand,
          gravitationalWaveWithBand: gwBand,
          noSystem,
          noDefinition: noDef,
          hintNamesTheTwo: hinted,
        }
      );
    }
  }

  // ---- localisation, counts, hosts -------------------------------------------------

  if (wanted('A5.')) {
    const L = lim('A5.skyArea');
    const r2d = Math.PI / 180;
    const deg2 = 4 * Math.PI * (180 / Math.PI) ** 2;
    let worst = 0;
    for (const r of L.radiiDeg)
      worst = Math.max(
        worst,
        rel(
          K.circleAreaDeg2(r),
          2 * Math.PI * (1 - Math.cos(r * r2d)) * (180 / Math.PI) ** 2
        )
      );
    // 2 pi (1 - cos r) loses digits at small r, so the comparison above is bounded by the cancellation, not the kernel:
    // judge against the half-angle form instead for the radii below 5 degrees
    let worstHalf = 0;
    for (const r of L.radiiDeg)
      worstHalf = Math.max(
        worstHalf,
        rel(
          K.circleAreaDeg2(r),
          4 * Math.PI * Math.sin((r * r2d) / 2) ** 2 * (180 / Math.PI) ** 2
        )
      );
    const hemi = rel(K.circleAreaDeg2(90), L.hemisphereDeg2);
    const whole = rel(K.WHOLE_SKY_DEG2, deg2);
    let pix = 0;
    for (const n of L.nsides)
      pix = Math.max(pix, rel(K.healpixPixelAreaDeg2(n), deg2 / (12 * n * n)));
    const g = L.gaussian;
    const u = stream('noise', SEED.ensemble, 'A5');
    const z = gaussian(u);
    const mc = g.levels.map(level => {
      const area = K.gaussianAreaDeg2({ sigmaDeg: g.sigmaDeg, level });
      const r = Math.sqrt(area / Math.PI);
      let inside = 0;
      for (let i = 0; i < g.draws; i++) {
        const x = g.sigmaDeg * z();
        const y = g.sigmaDeg * z();
        if (x * x + y * y <= r * r) inside++;
      }
      const f = inside / g.draws;
      return {
        level,
        fraction: f,
        sigmas:
          Math.abs(f - level) / Math.sqrt((level * (1 - level)) / g.draws),
        closedFormRel: rel(
          area,
          -2 * Math.PI * g.sigmaDeg ** 2 * Math.log(1 - level)
        ),
      };
    });
    const refused = throwsCode(
      () => K.gaussianAreaDeg2({ sigmaDeg: 11, level: 0.9 }),
      'out-of-domain'
    );
    row(
      'A5.skyArea',
      worstHalf <= L.maxRel &&
        hemi <= L.hemisphereMaxRel &&
        whole <= L.maxRel &&
        pix <= L.maxRel &&
        mc.every(m => m.sigmas <= g.maxSigmas && m.closedFormRel <= L.maxRel) &&
        refused,
      {
        circleRelHalfAngleForm: worstHalf,
        circleRelCosForm: worst,
        hemisphereRel: hemi,
        wholeSkyRel: whole,
        healpixRel: pix,
        gaussianMonteCarlo: mc.map(m => ({
          ...m,
          fraction: sig(m.fraction, 5),
          sigmas: sig(m.sigmas, 3),
        })),
        refusedWide: refused,
      },
      'the 1 - cos form is shown for contrast: it loses digits at small radii, which is why the kernel uses the half-angle form'
    );
  }

  if (wanted('A6.')) {
    const L = lim('A6.expectedCount');
    let q = 0;
    let o = 0;
    let p0 = 0;
    ORACLE.volume.forEach((c, i) => {
      const lc = L.cases[i];
      const N = K.expectedCount(lc);
      const omega = lc.areaDeg2 / (180 / Math.PI) ** 2;
      const quad = adaptive(r => omega * r * r, lc.loMpc, lc.hiMpc, {
        absTol: 0,
        relTol: 1e-13,
      }).value;
      q = Math.max(q, rel(N, lc.densityPerMpc3 * quad));
      o = Math.max(o, rel(N, c.expected));
      p0 = Math.max(p0, rel(K.probabilityNoCandidate(N), c.pNone));
    });
    const n = 1e-9;
    const one = rel(
      K.probabilityAtLeastOne(n),
      n - (n * n) / 2 + (n * n * n) / 6
    );
    row(
      'A6.expectedCount',
      q <= L.maxRelQuadrature &&
        o <= L.maxRelOracle &&
        p0 <= L.maxRelPoisson &&
        one <= L.maxRelPoisson,
      {
        quadratureRel: q,
        oracleRel: o,
        poissonNoneRel: p0,
        atLeastOneAtTinyNRel: one,
      }
    );
  }

  if (wanted('R1.')) {
    const L = lim('R1.volumeVsComoving');
    const cosmo = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
    const zOf = dl => brent(z => cosmo.luminosityDistance(z) - dl, 1e-9, 1).x;
    const table1 = L.centresMpc.map(c => {
      const lo = c * (1 - L.halfWidthFraction);
      const hi = c * (1 + L.halfWidthFraction);
      const euclid = hi ** 3 - lo ** 3;
      const com =
        cosmo.comovingDistance(zOf(hi)) ** 3 -
        cosmo.comovingDistance(zOf(lo)) ** 3;
      return { centreMpc: c, ratio: sig(euclid / com, 4) };
    });
    const within = table1
      .filter(t => Math.abs(t.ratio - 1) <= L.domainRatioWithin)
      .map(t => t.centreMpc);
    reported(
      'R1.volumeVsComoving',
      {
        table: table1,
        largestCentreWithin10Percent: within.length
          ? Math.max(...within)
          : null,
      },
      'not a judged leg: the table that sets the stated domain'
    );
  }

  if (wanted('A7.')) {
    const L = lim('A7.hostRule');
    const c = L.candidates.map((x, i) => ({
      id: `c${i}`,
      ...x,
      distanceMpc: x.dMpc,
    }));
    const run = (list, opts = {}) =>
      K.rankHosts({
        candidates: list,
        distanceHatMpc: L.dHatMpc,
        sigmaDistanceMpc: L.sigmaDMpc,
        sigmaSkyDeg: L.sigmaSkyDeg,
        ...opts,
      });
    const direct = list => {
      const w = list.map(
        x =>
          x.mass *
          Math.exp(-((x.dMpc - L.dHatMpc) ** 2) / (2 * L.sigmaDMpc ** 2)) *
          Math.exp(-(x.x * x.x + x.y * x.y) / (2 * L.sigmaSkyDeg ** 2))
      );
      const s = w.reduce((a, b) => a + b, 0);
      return w.map(v => v / s);
    };
    const r = run(c);
    const closed = direct(L.candidates);
    const byId = Object.fromEntries(r.ranked.map(x => [x.id, x.weight]));
    const closedRel = maxOf(c.map((x, i) => rel(byId[x.id], closed[i])));
    const scaled = run(c.map(x => ({ ...x, mass: x.mass * 17 })));
    const sId = Object.fromEntries(scaled.ranked.map(x => [x.id, x.weight]));
    const massScale = maxOf(c.map(x => rel(sId[x.id], byId[x.id])));
    const perm = run([c[2], c[0], c[1]]);
    const pId = Object.fromEntries(perm.ranked.map(x => [x.id, x.weight]));
    const permRel = maxOf(c.map(x => rel(pId[x.id], byId[x.id])));
    const dropped = run([c[0], c[2]]);
    const dId = Object.fromEntries(dropped.ranked.map(x => [x.id, x.weight]));
    const w1 = byId.c1;
    const dropRel = maxOf(
      [c[0], c[2]].map(x => rel(dId[x.id], byId[x.id] / (1 - w1)))
    );
    const noMass = run(c, { useMass: false });
    const equal = run(c.map(x => ({ ...x, mass: 1 })));
    const eId = Object.fromEntries(equal.ranked.map(x => [x.id, x.weight]));
    const nId = Object.fromEntries(noMass.ranked.map(x => [x.id, x.weight]));
    const massFree = maxOf(c.map(x => rel(nId[x.id], eId[x.id])));
    const centre = { raDeg: 150, decDeg: 20 };
    const g0 = K.tangentOffsetDeg(centre, centre);
    const dRa = 0.01;
    const gR = K.tangentOffsetDeg(
      {
        raDeg: centre.raDeg + dRa / Math.cos((20 * Math.PI) / 180),
        decDeg: 20,
      },
      centre
    );
    const gD = K.tangentOffsetDeg({ raDeg: 150, decDeg: 20.01 }, centre);
    const gn = Math.max(rel(gR.x, dRa), rel(gD.y, 0.01));
    row(
      'A7.hostRule',
      closedRel <= L.maxRel &&
        massScale <= L.maxRel &&
        permRel <= L.maxRel &&
        dropRel <= L.maxRel &&
        massFree <= L.maxRel &&
        g0.x === 0 &&
        g0.y === 0 &&
        gn <= L.gnomonicMaxRel,
      {
        closedFormRel: closedRel,
        massScaleRel: massScale,
        permutationRel: permRel,
        removalRel: dropRel,
        massFreeRel: massFree,
        gnomonicCentre: [g0.x, g0.y],
        gnomonicSmallOffsetRel: gn,
      }
    );
  }

  if (wanted('C1.')) {
    const L = lim('C1.hostCalibration');
    const opts = {
      galaxies: L.galaxies,
      radiusDeg: L.radiusDeg,
      distanceRangeMpc: L.distanceRangeMpc,
      log10MassSigma: L.log10MassSigma,
      sigmaDistanceMpc: L.sigmaDMpc,
      sigmaSkyDeg: L.sigmaSkyDeg,
    };
    const run = (sigmaFactor, useMass = true) => {
      const bins = L.bins.slice(0, -1).map(() => ({ n: 0, host: 0, sumW: 0 }));
      let topHits = 0;
      let topSum = 0;
      for (let f = 0; f < L.fields; f++) {
        const fld = K.syntheticGalaxyField({
          seed: SEED.ensemble,
          label: `host-${f}`,
          ...opts,
        });
        const r = K.rankHosts({
          candidates: fld.candidates,
          distanceHatMpc: fld.measurement.distanceHatMpc,
          sigmaDistanceMpc: fld.measurement.sigmaDistanceMpc * sigmaFactor,
          sigmaSkyDeg: fld.measurement.sigmaSkyDeg,
          useMass,
        });
        for (const c of r.ranked) {
          let b = 0;
          while (c.weight >= L.bins[b + 1]) b++;
          bins[b].n++;
          bins[b].sumW += c.weight;
          if (c.id === fld.truth.hostId) bins[b].host++;
        }
        topSum += r.ranked[0].weight;
        if (r.ranked[0].id === fld.truth.hostId) topHits++;
      }
      const out = bins.map((b, i) => {
        const iv = b.n ? K.binomialInterval(b.host, b.n, L.level) : null;
        const mean = b.n ? b.sumW / b.n : null;
        return {
          bin: `[${L.bins[i]}, ${Math.min(L.bins[i + 1], 1)})`,
          n: b.n,
          fractionHost: b.n ? sig(b.host / b.n, 4) : null,
          meanWeight: mean === null ? null : sig(mean, 4),
          covers: iv ? iv.lo <= mean && mean <= iv.hi : false,
        };
      });
      const acc = topHits / L.fields;
      const meanTop = topSum / L.fields;
      return {
        bins: out,
        covering: out.filter(b => b.covers).length,
        topAccuracy: sig(acc, 4),
        meanTopWeight: sig(meanTop, 4),
        topSigmas:
          Math.abs(acc - meanTop) /
          Math.sqrt((meanTop * (1 - meanTop)) / L.fields),
      };
    };
    const good = run(1);
    const noMass = run(1, false);
    row(
      'C1.hostCalibration',
      good.covering >= L.binsMustCover && good.topSigmas <= L.topMaxSigmas,
      {
        ...good,
        topSigmas: sig(good.topSigmas, 3),
        sensitivityNotJudged: {
          massTermDropped: {
            binsCovering: noMass.covering,
            topAccuracy: noMass.topAccuracy,
            meanTopWeight: noMass.meanTopWeight,
          },
        },
      },
      'the sensitivity entry shows how little this ensemble can say about the mass term (0.5 dex of scatter); A7 holds the mass term exactly'
    );
    const bad = run(L.misspecifiedSigmaDFactor);
    reported(
      'C1b.misspecifiedHostRule',
      {
        binsCovering: bad.covering,
        of: L.bins.length - 1,
        bins: bad.bins,
        topAccuracy: bad.topAccuracy,
        meanTopWeight: bad.meanTopWeight,
      },
      'the rule with half the true distance width: its weights are overconfident; nothing is judged'
    );
  }

  if (wanted('D3.')) {
    const L = lim('D3.hostRefusals');
    const base = { distanceHatMpc: 40, sigmaDistanceMpc: 6, sigmaSkyDeg: 1.5 };
    const two = K.rankHosts({
      ...base,
      candidates: [
        { id: 'a', x: 0.2, y: 0.1, distanceMpc: 41, mass: 2 },
        { id: 'b', x: 0.2, y: 0.1, distanceMpc: 41, mass: 2 },
      ],
    });
    const twoOk =
      !two.identified &&
      two.host === null &&
      Math.abs(two.topWeight - 0.5) <= 1e-12;
    const lone = K.rankHosts({
      ...base,
      candidates: [{ id: 'far', x: 5 * 1.5, y: 0, distanceMpc: 40, mass: 1 }],
    });
    const loneOk =
      lone.status === 'no-consistent-candidate' &&
      lone.host === null &&
      Math.abs(lone.topWeight - 1) <= 1e-12 &&
      lone.ranked[0].chi2P < L.minChi2P;
    const strong = K.rankHosts({
      ...base,
      candidates: [
        { id: 'host', x: 0.1, y: 0, distanceMpc: 40, mass: 5 },
        { id: 'other', x: 3, y: 1, distanceMpc: 52, mass: 1 },
      ],
    });
    const strongOk =
      strong.identified &&
      strong.host === 'host' &&
      strong.topWeight >= L.identifyWeight;
    const weak = K.rankHosts({
      ...base,
      candidates: [
        { id: 'a', x: 0.1, y: 0, distanceMpc: 40, mass: 1 },
        { id: 'b', x: 0.5, y: 0.5, distanceMpc: 43, mass: 1 },
      ],
    });
    const weakOk =
      !weak.identified &&
      weak.topWeight < L.identifyWeight &&
      weak.status === 'ambiguous';
    const codes = [
      throwsCode(
        () => K.rankHosts({ ...base, candidates: [] }),
        'no-candidates'
      ),
      throwsCode(
        () =>
          K.rankHosts({
            ...base,
            sigmaSkyDeg: 0,
            candidates: [{ id: 'a', x: 0, y: 0, distanceMpc: 40 }],
          }),
        'bad-width'
      ),
      throwsCode(
        () =>
          K.rankHosts({
            ...base,
            candidates: [{ id: 'a', x: NaN, y: 0, distanceMpc: 40 }],
          }),
        'not-finite'
      ),
      throwsCode(
        () =>
          K.rankHosts({
            ...base,
            candidates: [{ id: 'a', x: 0, y: 0, distanceMpc: 40, mass: -1 }],
          }),
        'bad-mass'
      ),
    ];
    const chiCheck = Math.abs(lone.ranked[0].chi2P - chi2Sf(25, 3)) <= 1e-15;
    row(
      'D3.hostRefusals',
      twoOk && loneOk && strongOk && weakOk && codes.every(Boolean) && chiCheck,
      {
        twoIdentical: twoOk,
        loneFarCandidate: loneOk,
        identifiedWhenStrong: strongOk,
        ambiguousWhenWeak: weakOk,
        refusals: codes,
      }
    );
  }

  if (wanted('B5.')) {
    const L = lim('B5.hostDistance');
    let worst = 0;
    const gaps = [];
    ORACLE.distance.forEach(o => {
      const r = K.hostDistance({
        z: o.z,
        cosmology: L.cosmology,
        sigmaVKms: L.sigmaVKms,
      });
      worst = Math.max(worst, rel(r.distanceMpc, o.dLMpc));
      if (o.z <= 0.01) {
        const gap = r.distanceMpc / r.hubbleFlowMpc - 1;
        gaps.push({
          z: o.z,
          gap: sig(gap, 4),
          firstOrder: sig(L.firstOrderCoefficient * o.z, 4),
          rel: rel(gap, L.firstOrderCoefficient * o.z),
        });
      }
    });
    const a = K.hostDistance({
      z: 0.01,
      cosmology: L.cosmology,
      sigmaVKms: 300,
    });
    const exactRel = rel(a.relativePeculiar, 300 / ((C_LIGHT / 1000) * 0.01));
    const flags = ORACLE.distance.map(o => ({
      z: o.z,
      flagged: K.hostDistance({
        z: o.z,
        cosmology: L.cosmology,
        sigmaVKms: L.sigmaVKms,
      }).flags.includes('peculiar-velocity-dominated'),
      expected: L.sigmaVKms / ((C_LIGHT / 1000) * o.z) > L.dominatedAbove,
    }));
    const refused = throwsCode(
      () => K.hostDistance({ z: 0, cosmology: L.cosmology }),
      'bad-redshift'
    );
    row(
      'B5.hostDistance',
      worst <= L.maxRel &&
        gaps.every(g => g.rel <= L.firstOrderGapWithin) &&
        exactRel <= 1e-12 &&
        flags.every(f => f.flagged === f.expected) &&
        refused,
      {
        maxRelVsOracle: worst,
        firstOrderGap: gaps,
        peculiarRelExact: exactRel,
        flags,
        refusedZero: refused,
      }
    );
  }

  if (wanted('E2.')) {
    const L = lim('E2.packDistanceVsRedshift');
    const ev = EVENTS[L.event].catalog;
    const lo = ev.luminosity_distance.value + ev.luminosity_distance.lower;
    const hi = ev.luminosity_distance.value + ev.luminosity_distance.upper;
    const r = K.hostDistance({
      z: ev.redshift.value,
      cosmology: THRESHOLDS.checks.find(c => c.id === 'B5.hostDistance').limits
        .cosmology,
      sigmaVKms: L.sigmaVKms,
    });
    const inside = r.distanceMpc >= lo && r.distanceMpc <= hi;
    const flagged = r.flags.includes('peculiar-velocity-dominated');
    row(
      'E2.packDistanceVsRedshift',
      inside === L.mustLieInsideInterval && flagged,
      {
        redshift: ev.redshift.value,
        kernelDistanceMpc: sig(r.distanceMpc, 4),
        packInterval: [lo, hi],
        relativePeculiar: sig(r.relativePeculiar, 4),
        flagged,
      },
      "AM2: the flag is raised at 0.10007 against 0.1, a margin the pack's redshift (rounded to 0.01) does not support"
    );
  }

  // ---- the kilonova ----------------------------------------------------------------

  if (wanted('A8.')) {
    const L = lim('A8.photosphere');
    const p = MODEL;
    let r = 0;
    let t = 0;
    let lum = 0;
    let floorOk = true;
    let prevT = Infinity;
    let mono = true;
    for (const d of L.daysGrid) {
      const s = K.kilonovaState(p, d);
      r = Math.max(r, rel(s.radiusM, p.velocityC * C_LIGHT * d * 86400));
      const raw = p.T0K * (d / p.tRefDays) ** -p.coolingExponent;
      t = Math.max(t, rel(s.temperatureK, Math.max(p.floorK, raw)));
      lum = Math.max(
        lum,
        rel(
          s.luminosityW,
          4 * Math.PI * s.radiusM ** 2 * SIGMA_SB * s.temperatureK ** 4
        )
      );
      floorOk &&= s.temperatureK >= p.floorK;
      mono &&= s.temperatureK <= prevT;
      prevT = s.temperatureK;
    }
    const atRef = rel(K.kilonovaState(p, p.tRefDays).temperatureK, p.T0K);
    const quad = rel(
      K.kilonovaState({ ...p, velocityC: 0.4 }, 2).luminosityW /
        K.kilonovaState(p, 2).luminosityW,
      4
    );
    row(
      'A8.photosphere',
      r <= L.maxRel &&
        t <= L.maxRel &&
        lum <= L.maxRel &&
        floorOk &&
        mono &&
        atRef <= L.maxRel &&
        quad <= L.maxRel,
      {
        radiusRel: r,
        temperatureRel: t,
        luminosityRel: lum,
        floorHeld: floorOk,
        monotone: mono,
        T0AtRefRel: atRef,
        doubledVelocityRel: quad,
      }
    );
  }

  if (wanted('B6.')) {
    const L = lim('B6.kilonovaMagnitudes');
    let worst = 0;
    let worstColour = 0;
    ORACLE.photometry.forEach(o => {
      const st = { radiusM: o.R, temperatureK: o.T };
      const mags = Object.fromEntries(
        L.bands.map(b => [b, K.kilonovaAbMag(decoded[b], st, L.distanceMpc)])
      );
      for (const b of L.bands)
        worst = Math.max(worst, Math.abs(mags[b] - o.mags[b]));
      worstColour = Math.max(
        worstColour,
        Math.abs(K.kilonovaColour(decoded.g, decoded.i, st) - o.colourGI)
      );
    });
    let indep = 0;
    for (const T of L.temperaturesK) {
      const c = (R, D) => {
        const st = { radiusM: R, temperatureK: T };
        return (
          K.kilonovaAbMag(decoded.g, st, D) - K.kilonovaAbMag(decoded.i, st, D)
        );
      };
      indep = Math.max(
        indep,
        Math.abs(c(1e14, 40) - c(1e16, 100)),
        Math.abs(c(1e15, 40) - c(1e16, 40))
      );
    }
    row(
      'B6.kilonovaMagnitudes',
      ORACLE_BANDS.bands.g &&
        worst <= L.maxMag &&
        worstColour <= L.maxMag &&
        indep <= L.colourIndependenceMag,
      {
        cells: ORACLE.photometry.length * L.bands.length,
        maxMagError: worst,
        maxColourError: worstColour,
        colourIndependence: indep,
      }
    );
  }

  if (wanted('A9.')) {
    const L = lim('A9.colourMonotone');
    const [a, b] = MODEL.domainDays;
    const days = Array.from(
      { length: L.steps },
      (_, i) => a * (b / a) ** (i / (L.steps - 1))
    );
    const col = days.map(d =>
      K.kilonovaColour(decoded.g, decoded.i, K.kilonovaState(MODEL, d))
    );
    const st = days.map(d => K.kilonovaState(MODEL, d));
    let ok = true;
    let flat = 0;
    for (let i = 1; i < days.length; i++) {
      if (col[i] < col[i - 1]) ok = false;
      if (!st[i].atFloor && !st[i - 1].atFloor && !(col[i] > col[i - 1]))
        ok = false;
      if (st[i].atFloor && st[i - 1].atFloor)
        flat = Math.max(flat, Math.abs(col[i] - col[i - 1]));
    }
    row('A9.colourMonotone', ok && flat <= L.constantAfterFloorMag, {
      steps: L.steps,
      colourFirst: sig(col[0], 4),
      colourLast: sig(col[col.length - 1], 4),
      constantAfterFloor: flat,
    });
  }

  if (wanted('D4.')) {
    const out = [
      throwsCode(() => K.kilonovaState(MODEL, 0.1), 'out-of-domain'),
      throwsCode(() => K.kilonovaState(MODEL, 20), 'out-of-domain'),
      K.kilonovaState(MODEL, 20, { allowOutside: true }).outOfDomain === true,
      throwsCode(
        () => K.kilonovaState({ ...MODEL, velocityC: 0 }, 1),
        'bad-velocity'
      ),
      throwsCode(
        () => K.kilonovaState({ ...MODEL, velocityC: 1 }, 1),
        'bad-velocity'
      ),
      throwsCode(
        () => K.kilonovaState({ ...MODEL, velocityC: -0.1 }, 1),
        'bad-velocity'
      ),
      throwsCode(
        () => K.kilonovaState({ ...MODEL, T0K: 0 }, 1),
        'bad-temperature'
      ),
      throwsCode(
        () => K.kilonovaState({ ...MODEL, floorK: -1 }, 1),
        'bad-temperature'
      ),
      throwsCode(
        () => K.kilonovaState({ ...MODEL, tRefDays: 0 }, 1),
        'bad-parameter'
      ),
      throwsCode(
        () => K.kilonovaState({ ...MODEL, coolingExponent: -1 }, 1),
        'bad-parameter'
      ),
      throwsCode(
        () => K.kilonovaState({ ...MODEL, floorK: 1e4 }, 1),
        'bad-parameter'
      ),
      throwsCode(
        () =>
          K.kilonovaAbMag(decoded.g, { radiusM: 1e15, temperatureK: 5000 }, 0),
        'bad-parameter'
      ),
    ];
    const noMass = !Object.keys(K).some(k =>
      /ejecta|abundance|yield|fit/i.test(k)
    );
    row('D4.kilonovaDomain', out.every(Boolean) && noMass, {
      refusals: out,
      noMassOrFitFunction: noMass,
    });
  }

  // ---- detection -------------------------------------------------------------------

  if (wanted('A10.')) {
    const L = lim('A10.falseAlarm');
    let worst = 0;
    ORACLE.falseAlarm.forEach(o => {
      worst = Math.max(
        worst,
        rel(
          K.falseAlarmProbability({
            epochs: o.N,
            thresholdSigma: o.n,
            minDetections: o.k,
          }),
          o.p
        )
      );
    });
    const m = L.mc;
    const z = gaussian(stream('noise', SEED.ensemble, 'A10'));
    const sigma = 1;
    let hit = 0;
    for (let i = 0; i < m.trials; i++) {
      const epochs = [];
      for (let j = 0; j < m.N; j++) epochs.push({ t: j, flux: z(), sigma });
      if (
        K.detectTransient({ epochs, thresholdSigma: m.n, minDetections: m.k })
          .detected
      )
        hit++;
    }
    const p = K.falseAlarmProbability({
      epochs: m.N,
      thresholdSigma: m.n,
      minDetections: m.k,
    });
    const sigmas =
      Math.abs(hit / m.trials - p) / Math.sqrt((p * (1 - p)) / m.trials);
    row('A10.falseAlarm', worst <= L.maxRel && sigmas <= m.maxSigmas, {
      maxRelVsScipy: worst,
      monteCarlo: {
        analytic: p,
        fraction: hit / m.trials,
        sigmas: sig(sigmas, 3),
        flagged: hit,
      },
    });
  }

  if (wanted('B7.')) {
    const L = lim('B7.detectionProbability');
    let worst = 0;
    let worstAbs = 0;
    for (const o of ORACLE.detection) {
      const p = K.detectionProbability({
        means: o.means,
        sigmas: o.sigmas,
        thresholdSigma: o.n,
        minDetections: o.k,
      });
      worst = Math.max(worst, rel(p, o.p));
      worstAbs = Math.max(worstAbs, Math.abs(p - o.p));
    }
    row(
      'B7.detectionProbability',
      ORACLE.detection.length >= L.sequences &&
        (worst <= L.maxRel || worstAbs <= L.maxAbs),
      { sequences: ORACLE.detection.length, maxRel: worst, maxAbs: worstAbs }
    );
  }

  if (wanted('C2.')) {
    const L = lim('C2.completenessCoverage');
    const g = decoded.g;
    const d40 = THRESHOLDS.synthetic.kilonovaModel.distanceMpc;
    const grid = Array.from(
      { length: 200 },
      (_, i) =>
        MODEL.domainDays[0] *
        (MODEL.domainDays[1] / MODEL.domainDays[0]) ** (i / 199)
    );
    const gridMags = grid.map(t =>
      K.kilonovaAbMag(g, K.kilonovaState(MODEL, t), d40)
    );
    const brightest = Math.min(...gridMags);
    const sigmaFlux = (3631 * 10 ** (-0.4 * L.depth5SigmaMag)) / 5;
    const cells = [];
    for (const cad of L.cadencesDays) {
      const epochs = [];
      for (let t = L.startDay; t <= L.endDay + 1e-9; t += cad) epochs.push(t);
      const mags = epochs.map(t =>
        K.kilonovaAbMag(g, K.kilonovaState(MODEL, t), d40)
      );
      for (const peak of L.peakMags) {
        const truth = epochs.map((t, i) => ({
          t,
          flux: 3631 * 10 ** (-0.4 * (mags[i] - brightest + peak)),
        }));
        for (const k of L.kValues) {
          const r = K.injectionCompleteness({
            truth,
            sigma: sigmaFlux,
            trials: L.injections,
            seed: SEED.ensemble,
            label: `c2-${cad}-${k}-${peak}`,
            thresholdSigma: L.thresholdSigma,
            minDetections: k,
            level: L.level,
          });
          cells.push({
            cadence: cad,
            k,
            peak,
            analytic: r.analytic,
            fraction: r.fraction,
            lo: r.interval.lo,
            hi: r.interval.hi,
            covers: r.interval.lo <= r.analytic && r.analytic <= r.interval.hi,
          });
        }
      }
    }
    const covering = cells.filter(c => c.covers).length;
    const widths = cells
      .filter(c => c.analytic > 0.02 && c.analytic < 0.98)
      .map(c => c.hi - c.lo);
    const medianWidth = median(widths);
    row(
      'C2.completenessCoverage',
      covering / cells.length >= L.minCoverFraction &&
        medianWidth <= L.maxMedianWidth,
      {
        cells: cells.length,
        covering,
        coverFraction: sig(covering / cells.length, 4),
        nontrivialCells: widths.length,
        medianWidth: sig(medianWidth, 4),
        failingCells: cells
          .filter(c => !c.covers)
          .map(c => ({
            cadence: c.cadence,
            k: c.k,
            peak: c.peak,
            analytic: sig(c.analytic, 4),
            fraction: c.fraction,
          })),
        curve: cells
          .filter(c => c.cadence === 1 && c.k === 2)
          .map(c => ({
            peak: c.peak,
            analytic: sig(c.analytic, 4),
            fraction: c.fraction,
          })),
      }
    );
  }

  if (wanted('D5.')) {
    const ep = n =>
      Array.from({ length: n }, (_, i) => ({ t: i, flux: 1, sigma: 1 }));
    const out = [
      throwsCode(
        () => K.detectTransient({ epochs: ep(1), minDetections: 2 }),
        'not-enough-epochs'
      ),
      throwsCode(
        () =>
          K.detectTransient({
            epochs: [
              { t: 0, flux: 1, sigma: 0 },
              { t: 1, flux: 1, sigma: 1 },
            ],
          }),
        'bad-sigma'
      ),
      throwsCode(
        () =>
          K.detectTransient({
            epochs: [
              { t: 0, flux: 1, sigma: -1 },
              { t: 1, flux: 1, sigma: 1 },
            ],
          }),
        'bad-sigma'
      ),
      throwsCode(
        () =>
          K.detectTransient({
            epochs: [
              { t: 0, flux: 1, sigma: NaN },
              { t: 1, flux: 1, sigma: 1 },
            ],
          }),
        'not-finite'
      ),
      throwsCode(
        () =>
          K.detectTransient({
            epochs: [
              { t: 0, flux: NaN, sigma: 1 },
              { t: 1, flux: 1, sigma: 1 },
            ],
          }),
        'not-finite'
      ),
      throwsCode(
        () => K.detectTransient({ epochs: ep(3), thresholdSigma: 0 }),
        'bad-threshold'
      ),
      throwsCode(
        () => K.detectTransient({ epochs: ep(3), minDetections: 0 }),
        'bad-k'
      ),
      throwsCode(
        () => K.detectTransient({ epochs: ep(3), minDetections: 1.5 }),
        'bad-k'
      ),
    ];
    row(
      'D5.detectionRefusals',
      out.every(Boolean),
      { refusals: out },
      'the pure-noise flags are leg A10'
    );
  }

  // ---- authentic -------------------------------------------------------------------

  if (wanted('E1.')) {
    const pub = readAuthenticJson(authDir, 'published-bound.json');
    const trig = readAuthenticJson(authDir, 'grb-trigger.json');
    if (!pub || !trig)
      notRun(
        'E1.delayFromPacks',
        `${!pub ? 'authentic/published-bound.json' : 'authentic/grb-trigger.json'} was not supplied`
      );
    else if (!authTable)
      notRun(
        'E1.delayFromPacks',
        authNote || 'the leap-second list was not usable'
      );
    else if (pub.delay.definition !== 'trigger-minus-merger')
      notRun(
        'E1.delayFromPacks',
        `the published delay is defined as '${pub.delay.definition}', not trigger minus merger: a different quantity, recorded, not absorbed into a tolerance`
      );
    else {
      const d = K.delaySeconds(
        { value: EVENTS.GW170817.gps, system: 'GPS' },
        trig.trigger,
        authTable
      );
      const tol = 0.05 + 3 * pub.delay.sigma;
      row('E1.delayFromPacks', Math.abs(d - pub.delay.value) <= tol, {
        packDelayS: d,
        publishedS: pub.delay.value,
        toleranceS: tol,
      });
    }
  }

  if (wanted('E3.')) {
    const L = lim('E3.kilonovaReddening');
    const csv = path.join(authDir, 'kilonova-photometry.csv');
    if (!existsSync(csv))
      notRun(
        'E3.kilonovaReddening',
        'authentic/kilonova-photometry.csv was not supplied'
      );
    else if (!authTable)
      notRun(
        'E3.kilonovaReddening',
        authNote || 'the leap-second list was not usable'
      );
    else {
      const data = parsePhotometryCsv(readFileSync(csv, 'utf8'));
      const mergerMjd = K.fromT72(
        K.toT72({ value: EVENTS.GW170817.gps, system: 'GPS' }, authTable),
        'MJD_UTC',
        authTable
      );
      const days = r => r.mjd - mergerMjd;
      const early = data.filter(r => days(r) > 0 && days(r) <= L.windowDays);
      const gs = early.filter(r => r.band === 'g');
      const is = early.filter(r => r.band === 'i');
      const pairs = [];
      for (const g of gs) {
        const near = is
          .filter(i => Math.abs(i.mjd - g.mjd) <= L.pairMaxGapDays)
          .sort((a, b) => Math.abs(a.mjd - g.mjd) - Math.abs(b.mjd - g.mjd))[0];
        if (near)
          pairs.push({
            t: days(g),
            colour: g.mag - near.mag,
            sigma: Math.hypot(g.sigma, near.sigma),
          });
      }
      pairs.sort((a, b) => a.t - b.t);
      if (pairs.length < 2)
        notRun(
          'E3.kilonovaReddening',
          `only ${pairs.length} g and i pairs within ${L.pairMaxGapDays} d in the first ${L.windowDays} d`
        );
      else {
        const a = pairs[0];
        const b = pairs[pairs.length - 1];
        const sigmas = (b.colour - a.colour) / Math.hypot(a.sigma, b.sigma);
        row('E3.kilonovaReddening', sigmas > L.minSigmas, {
          pairs: pairs.length,
          earliest: a,
          latest: b,
          sigmas: sig(sigmas, 3),
        });
      }
    }
  }

  if (wanted('P1.')) {
    const L = lim('P1.speed');
    const cpu = process.cpuUsage(cpu0);
    const secs = (cpu.user + cpu.system) / 1e6;
    row(
      'P1.speed',
      secs <= L.maxCpuSeconds,
      { cpuSeconds: sig(secs, 3) },
      'recorded, not a physics bound'
    );
  }

  rows.sort((a, b) => a.id.localeCompare(b.id));
  return rows;
}

// ---- command line --------------------------------------------------------------------

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  const flag = f => args.includes(f);
  const only = (args.find(a => a.startsWith('--only=')) ?? '')
    .slice(7)
    .split(',')
    .filter(Boolean);
  const rows = runValidation({ only });
  const failed = rows.filter(r => r.status === 'fail');
  if (flag('--json')) console.log(JSON.stringify(rows, null, 2));
  else {
    for (const r of rows)
      console.log(
        `${r.status.toUpperCase().padEnd(8)} ${r.id.padEnd(30)} ${JSON.stringify(r.measured)} ${r.note}`
      );
    console.log(
      `\n${rows.filter(r => r.status === 'pass').length} pass, ${failed.length} fail, ${rows.filter(r => r.status === 'reported').length} reported, ${rows.filter(r => r.status === 'not-run').length} not run`
    );
  }
  if (flag('--write-results'))
    writeFileSync(
      path.join(ROOT, DIR, 'results.json'),
      JSON.stringify(
        { format: 'gravitas.multimessenger-results/1', rows },
        null,
        2
      ) + '\n'
    );
  if (flag('--write-failed'))
    writeFileSync(
      path.join(ROOT, DIR, 'failed-legs.json'),
      JSON.stringify(
        {
          format: 'gravitas.multimessenger-failed-legs/1',
          label:
            'These legs crossed a committed bound and stay failing; only Carl resets one.',
          legs: failed.map(r => ({ id: r.id, measured: r.measured })),
        },
        null,
        2
      ) + '\n'
    );
}
