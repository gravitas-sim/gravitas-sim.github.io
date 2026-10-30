// =============================================================================
// The views of the remnants panels (Prompt 222, REMNANTS.md)
// -----------------------------------------------------------------------------
// Pure functions of the panels' control values, shared by js/remnantsWidgets.js
// and tests/remnantsLessons.test.js (which recomputes every number a lesson
// states from them). Nothing is calculated here that the kernel does not: the
// cooling age and its two terms, the initial-final mass relation and the
// outcome probabilities are js/kernels/remnants/.
//
// No observed white-dwarf table is shipped (D-INTERIOR-01, D-RIGHTS-03), so
// nothing here is drawn against data: the panels show the models and say so.
//
// Pure: no DOM, no clock. Every result is cached by its inputs.
// =============================================================================

import {
  coolingAge,
  coolingAgeLaw,
  COOLING_DOMAIN,
  finalMass,
  remnantOutcome,
  neutronStarMasses,
  radiusSunOf,
  teffRange,
  IFMR,
  THRESHOLDS,
} from './kernels/remnants/index.js';
import { chandrasekharMassSun } from './kernels/stellar/whiteDwarf.js';

const { Math, Map } = globalThis;

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const caches = new Map();
const memo = (key, make) => {
  if (!caches.has(key)) caches.set(key, make());
  return caches.get(key);
};

/** The three precisions of the cooling panel: the one-sigma uncertainties a measurement carries. */
export const PRECISIONS = Object.freeze([
  { id: 'none', sigmaMass: 0, sigmaLogL: 0, sigmaTeff: 0 },
  { id: 'good', sigmaMass: 0.02, sigmaLogL: 0.02, sigmaTeff: 100 },
  { id: 'typical', sigmaMass: 0.05, sigmaLogL: 0.05, sigmaTeff: 300 },
  { id: 'poor', sigmaMass: 0.1, sigmaLogL: 0.1, sigmaTeff: 600 },
]);

/** The Chandrasekhar mass of the model, for the line the panels draw. */
export const CHANDRASEKHAR = chandrasekharMassSun();

// ---- the cooling panel -------------------------------------------------------------

/**
 * The cooling age at the control values, or the refusal.
 * @param {{mass?: number, entry?: number, logL?: number, teff?: number,
 *   precision?: number, view?: number}} v - entry 0 luminosity, 1 temperature
 */
export function coolingView(v) {
  const mass = clamp(v.mass ?? 0.6, 0.3, 1.4);
  const entry = Math.round(v.entry ?? 0) === 1 ? 1 : 0;
  const logL = clamp(v.logL ?? -3, -4.6, -1);
  const teff = clamp(v.teff ?? 8000, 3000, 40000);
  const p = PRECISIONS[clamp(Math.round(v.precision ?? 0), 0, 3)];
  const view = Math.round(v.view ?? 0) === 1 ? 1 : 0;
  const key = `cool:${mass}:${entry}:${logL}:${teff}:${p.id}:${view}`;
  return memo(key, () => {
    const input = {
      massSun: mass,
      sigmaMass: p.sigmaMass,
      ...(entry === 1
        ? { teffK: teff, sigmaTeff: p.sigmaTeff }
        : { logLSun: logL, sigmaLogL: p.sigmaLogL }),
    };
    const result = coolingAge(input);
    const [l0, l1] = COOLING_DOMAIN.logLSun;
    const m0 = Math.max(mass, 0.5);
    // the law over the domain for the chart: log10 of the age in years against log L
    const curve = [];
    for (let i = 0; i <= 50; i++) {
      const lg = l0 + ((l1 - l0) * i) / 50;
      curve.push([lg, Math.log10(coolingAgeLaw(mass, 10 ** lg))]);
    }
    // the age against mass at the luminosity in question (view 1)
    const lAt = result.status === 'ok' ? result.logLSun : logL;
    const byMass = [];
    for (let i = 0; i <= 25; i++) {
      const m = 0.5 + (0.5 * i) / 25;
      byMass.push([m, coolingAgeLaw(m, 10 ** clamp(lAt, l0, l1)) / 1e9]);
    }
    return {
      mass,
      entry,
      logL,
      teff,
      precision: p,
      result,
      curve,
      byMass,
      domain: COOLING_DOMAIN,
      teffEdges: mass >= 0.5 && mass <= 1 ? teffRange(mass) : null,
      radiusSun: mass < CHANDRASEKHAR ? radiusSunOf(mass) : null,
      lowerMass: m0,
    };
  });
}

// ---- the relation and the outcomes ----------------------------------------------------

/**
 * The initial-final relation and the outcome at an initial mass.
 * @param {{mi?: number, relation?: number, view?: number}} v - relation 0 MIST, 1 PARSEC;
 *   view 0 the relation, 1 the outcome probabilities, 2 neutron-star masses
 */
export function outcomeView(v) {
  const mi = clamp(v.mi ?? 3, 0.5, 60);
  const relation = Math.round(v.relation ?? 0) === 1 ? 'parsec' : 'mist';
  const view = clamp(Math.round(v.view ?? 0), 0, 2);
  return memo(`out:${mi}:${relation}:${view}`, () => {
    const remnant = finalMass(mi, { relation });
    const outcome = remnantOutcome(mi);
    const curve = [];
    const rel = IFMR.relations[relation];
    const lo = rel.pieces[0].lo;
    for (let i = 0; i <= 60; i++) {
      const m = lo + ((7.5 - lo) * i) / 60;
      const r = finalMass(m, { relation });
      curve.push({
        mi: m,
        mf: r.finalMass,
        lo: r.interval95.lo,
        hi: r.interval95.hi,
      });
    }
    const probs = [];
    for (let i = 0; i <= 120; i++) {
      const m = 0.8 + (59.2 * i) / 120;
      probs.push([m, remnantOutcome(m).probabilities]);
    }
    return {
      mi,
      relation,
      view,
      remnant,
      outcome,
      curve,
      probs,
      neutronStars: neutronStarMasses(),
      thresholds: THRESHOLDS,
      chandrasekhar: CHANDRASEKHAR,
    };
  });
}
