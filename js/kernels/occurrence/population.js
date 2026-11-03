// =============================================================================
// A population whose rates are known, searched by the survey (Prompt 229)
// -----------------------------------------------------------------------------
// The truth against which a rate is judged. A grid of rates Gamma[j][k] (the
// expected number of planets per star in the bin of period j and radius k: it
// may exceed one, the numbers on a star being Poisson) is laid on the survey's
// stars. Each planet is kept or dropped by the selection function of Prompt
// 154's object, in the order a survey does it:
//
//   transit    a probability R*/a            (selection on p_geo; the orbit's orientation)
//   epochs     at least MIN_TRANSITS         (a cut on the epochs the span holds)
//   recovery   Phi(S_true - threshold)       (the analytic form of the matched filter)
//
// and false listings are added so that the expected listings of a bin are
// Gamma E / r for the stated reliability r. A survey sees only the listings.
// Pure; no DOM.
// =============================================================================

import { stream } from '../../random/streams.js';
import { all, selection } from '../statistics/selection.js';
import { normalCdf } from '../statistics/special.js';
import {
  MIN_TRANSITS,
  PERIOD_EDGES,
  RADIUS_EDGES,
  THRESHOLD,
  epochCount,
  geometricProbability,
  midpoint,
  starAt,
} from './survey.js';
import { signalToNoise, transitSignal } from './injection.js';
import { drawPlanet } from './rates.js';

const { Math } = globalThis;

const NP = PERIOD_EDGES.length - 1;
const NR = RADIUS_EDGES.length - 1;

/** The stated truth: radius-bin totals over the period bins, weighted by the bin's mid-period to the 0.4. */
export function truthRates({
  radiusTotals = [1.6, 1.0, 0.6, 0.1, 0.03],
  periodExponent = 0.4,
} = {}) {
  const w = Array.from(
    { length: NP },
    (_, j) => midpoint(PERIOD_EDGES[j], PERIOD_EDGES[j + 1]) ** periodExponent
  );
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map(x => radiusTotals.map(T => (T * x) / sum));
}

/** A rate grid of one bin and zero elsewhere (the dense single-bin population). */
export function singleBin(j, k, rate) {
  return Array.from({ length: NP }, (_, a) =>
    Array.from({ length: NR }, (_, b) => (a === j && b === k ? rate : 0))
  );
}

/** A Poisson draw: Knuth's product in chunks of mean 30, so a mean of thousands costs a hundred loops. */
export function poisson(draw, lambda) {
  let n = 0;
  let rest = lambda;
  while (rest > 0) {
    const chunk = Math.min(rest, 30);
    rest -= chunk;
    const L = Math.exp(-chunk);
    let p = 1;
    let k = 0;
    do {
      k++;
      p *= draw();
    } while (p > L);
    n += k - 1;
  }
  return n;
}

/** The selection of one star's transit: a probability set by the orbit's orientation. */
export const transitSelection = () =>
  selection({ name: 'transit', observable: 'pTransit', probability: p => p });

/** The analytic detection: at least MIN_TRANSITS epochs and recovery with Phi(S - threshold). */
export const detectionSelection = (threshold = THRESHOLD) =>
  all(
    selection({
      name: 'epochs',
      observable: 'epochs',
      cut: { min: MIN_TRANSITS },
    }),
    selection({
      name: 'recovery',
      observable: 'snr',
      probability: s => normalCdf(s - threshold),
    })
  );

/**
 * One searched population: the listings in every bin.
 * @param {{stars: object, rates: number[][], reliability: number[]|number, completeness: number[][],
 *   seed: string, threshold?: number}} spec
 * @returns {{listed: number[][], real: number[][], false: number[][], planets: number, transiting: number}}
 */
export function simulatePopulation({
  stars,
  rates,
  reliability,
  completeness,
  seed,
  threshold = THRESHOLD,
}) {
  const draw = stream('forward', seed, 'population');
  const noise = stream('noise', seed, 'listings');
  const geometry = transitSelection();
  const detection = detectionSelection(threshold);
  const real = Array.from({ length: NP }, () => new Array(NR).fill(0));
  const fals = Array.from({ length: NP }, () => new Array(NR).fill(0));
  let planets = 0;
  let transiting = 0;
  for (let j = 0; j < NP; j++) {
    for (let k = 0; k < NR; k++) {
      const nPl = poisson(draw, rates[j][k] * stars.n);
      planets += nPl;
      const rows = [];
      for (let m = 0; m < nPl; m++) {
        const i = Math.floor(draw() * stars.n);
        const planet = drawPlanet(draw, j, k);
        rows.push({
          i,
          planet,
          pTransit: geometricProbability(planet.P, starAt(stars, i)),
        });
      }
      const hit = geometry.apply(rows, () => draw()).included;
      transiting += hit.length;
      const seen = [];
      for (const h of hit) {
        const { i, planet } = rows[h];
        const star = starAt(stars, i);
        const epochs = epochCount(planet.P, star.span, planet.t0);
        let snr = 0;
        if (epochs >= MIN_TRANSITS)
          snr = signalToNoise(transitSignal(planet, star, planet.t0), star);
        seen.push({ epochs, snr });
      }
      real[j][k] = detection.apply(seen, () => noise()).included.length;
      const r = Array.isArray(reliability) ? reliability[j] : reliability;
      fals[j][k] = poisson(
        noise,
        (rates[j][k] * completeness[j][k] * (1 - r)) / r
      );
    }
  }
  return {
    listed: real.map((row, j) => row.map((n, k) => n + fals[j][k])),
    real,
    false: fals,
    planets,
    transiting,
  };
}
