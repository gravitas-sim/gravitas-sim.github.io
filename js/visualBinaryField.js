// =============================================================================
// The view of the visual-binary panel (Prompt 218 Part B, BINARY_MASSES.md)
// -----------------------------------------------------------------------------
// A pure function of the panel's control values, shared by js/massesWidgets.js and
// tests/visualBinary.test.js (which recomputes every number a lesson states). Nothing
// is calculated here that js/measure/visualBinary.js and Prompt 187's fitter do not:
// this module only MAKES the synthetic data (a Keplerian relative orbit by the closed
// Thiele-Innes form, the components about a moving barycentre, or the photocentre about
// a fixed one, with a seeded noise draw) and asks the kernel what they weigh.
//
// Three systems, labelled synthetic, with their truth kept here so a step can say what
// the fit should return. Their seeds are the gate's (tests/fixtures/visual-binary), so
// the panel and the gate's V1 to V3 are the same stars.
//
// Pure: no DOM, no clock. A view is cached by its controls.
// =============================================================================

import { KEPLER_K, positionsFromElements } from './measure/orbit-fit.js';
import {
  photocentreFactor,
  solvePhotocentre,
  solveResolved,
} from './measure/visualBinary.js';
import { gaussian, stream } from './random/streams.js';

const { Math, Map } = globalThis;

/** The systems (the gate's V1 to V3): masses in solar masses, P in years, the parallax in milliarcseconds, angles in degrees. */
export const PAIRS = Object.freeze([
  {
    id: 'v1',
    MA: 0.9,
    MB: 0.6,
    P: 12,
    parallaxMas: 50,
    e: 0.35,
    i: 62,
    Omega: 140,
    omega: 70,
    T: 2003.1,
    lB: 0.1,
  },
  {
    id: 'v2',
    MA: 1.1,
    MB: 1.0,
    P: 8,
    parallaxMas: 80,
    e: 0.05,
    i: 40,
    Omega: 25,
    omega: 200,
    T: 2001.7,
    lB: 0.4,
  },
  {
    id: 'v3',
    MA: 0.8,
    MB: 0.3,
    P: 20,
    parallaxMas: 100,
    e: 0.6,
    i: 75,
    Omega: 310,
    omega: 15,
    T: 2008.4,
    lB: 0.02,
  },
]);
export const START = 2000;
const NUISANCE = Object.freeze({ offset: [0.02, -0.015], pm: [0.005, -0.008] });
const PREFIX = 'visual-binary-218b';
const EPOCHS = 16;

const elementsOf = s => {
  const aAu = Math.cbrt(((s.MA + s.MB) * s.P * s.P) / KEPLER_K);
  return {
    a: (aAu * s.parallaxMas) / 1000,
    e: s.e,
    i: s.i,
    Omega: s.Omega,
    omega: s.omega,
    P: s.P,
    T: s.T,
  };
};

/** The truth of a system: the masses, B, the light fraction, the relative axis and the photocentre's, the sum. */
export function truthOf(index) {
  const s = PAIRS[Math.max(0, Math.min(PAIRS.length - 1, Math.round(index)))];
  const el = elementsOf(s);
  const B = s.MB / (s.MA + s.MB);
  return {
    ...s,
    B,
    sum: s.MA + s.MB,
    aArcsec: el.a,
    aPhotocentre: Math.abs(s.lB - B) * el.a,
    factor: photocentreFactor(B, s.lB),
    elements: el,
  };
}

/** Epochs from START over `arc` periods, the interior ones jittered by +-0.3 of the spacing. */
function epochYears(s, arc, label) {
  const u = stream('experiments', PREFIX, 'panel-epochs', s.id, label);
  const span = arc * s.P;
  const dt = span / (EPOCHS - 1);
  return Array.from({ length: EPOCHS }, (_, k) =>
    k === 0 || k === EPOCHS - 1
      ? START + (span * k) / (EPOCHS - 1)
      : START + dt * k + dt * 0.3 * (2 * u() - 1)
  );
}

const cache = new Map();

/**
 * @param {{system?: number, view?: number, arc?: number, snr?: number}} v - system 0 to 2;
 *   view 0 resolved pair (both components), 1 unresolved photocentre; arc in periods
 *   (0.2 to 1.2); snr, the signal-to-noise of the parallax (3 to 40)
 */
export function visualView(v = {}) {
  const system = Math.max(
    0,
    Math.min(PAIRS.length - 1, Math.round(v.system ?? 0))
  );
  const view = Math.round(v.view ?? 0) === 1 ? 1 : 0;
  const arc = Math.max(0.2, Math.min(1.2, v.arc ?? 1.1));
  const snr = Math.max(3, Math.min(40, v.snr ?? 20));
  const key = `${system}:${view}:${arc.toFixed(3)}:${snr.toFixed(2)}`;
  if (cache.has(key)) return cache.get(key);
  const truth = truthOf(system);
  const s = PAIRS[system];
  const el = truth.elements;
  const years = epochYears(s, arc, key.split(':').slice(0, 3).join(':'));
  const rel = positionsFromElements(el, years);
  const g = gaussian(stream('noise', PREFIX, 'panel', s.id, String(view)));
  const sigma = 0.01 * (view === 1 ? Math.abs(truth.factor) * el.a : el.a);
  const t = y => ({ value: y, format: 'year' });
  const gp = gaussian(stream('noise', PREFIX, 'panel-parallax', s.id));
  const parallax = {
    value: s.parallaxMas * (1 + gp() / snr),
    sigma: s.parallaxMas / snr,
    unit: 'mas',
    frame: 'absolute',
    source: 'the synthetic truth, scaled by the stated signal-to-noise',
  };
  const out = {
    system,
    view,
    arc,
    snr,
    truth,
    parallax,
    sigma,
    years,
    epochs: [],
  };
  if (view === 0) {
    out.epochs = years.map((y, k) => {
      const tau = y - START;
      const bx = NUISANCE.offset[0] + NUISANCE.pm[0] * tau;
      const by = NUISANCE.offset[1] + NUISANCE.pm[1] * tau;
      return {
        time: t(y),
        A: {
          x: bx - truth.B * rel[k].x + sigma * g(),
          y: by - truth.B * rel[k].y + sigma * g(),
          sigma,
        },
        B: {
          x: bx + (1 - truth.B) * rel[k].x + sigma * g(),
          y: by + (1 - truth.B) * rel[k].y + sigma * g(),
          sigma,
        },
      };
    });
    out.result = solveResolved({ epochs: out.epochs }, parallax);
  } else {
    out.epochs = years.map((y, k) => ({
      time: t(y),
      x: truth.factor * rel[k].x + sigma * g(),
      y: truth.factor * rel[k].y + sigma * g(),
      sigma,
    }));
    const given = {
      lightFraction: { value: s.lB, sigma: 0.05 * s.lB },
      primaryMass: { value: s.MA, sigma: 0.05 * s.MA },
    };
    out.given = given;
    out.result = solvePhotocentre({ epochs: out.epochs }, parallax, given);
  }
  cache.set(key, out);
  return out;
}

/** The true curves for drawing: the relative orbit and the photocentre's, n points over one period. */
export function trueCurves(system, n = 200) {
  const truth = truthOf(system);
  const el = truth.elements;
  const ys = Array.from({ length: n + 1 }, (_, k) => el.T + (el.P * k) / n);
  const rel = positionsFromElements(el, ys);
  return {
    relative: rel,
    photocentre: rel.map(p => ({
      x: truth.factor * p.x,
      y: truth.factor * p.y,
    })),
  };
}
