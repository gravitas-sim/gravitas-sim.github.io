// =============================================================================
// Solar kernel: the 14-day sequence's readers (Prompt 194 part 2)
// -----------------------------------------------------------------------------
// Pure functions over the sidecar frames/sun-2024-05.json (tools/sun-frames-build.mjs
// writes it): a frame's disc as the geometry functions take it, a tracked group's
// marks as the points trackRotation reads, and the irradiance rows as the series
// summariseFluxSeries reads. The sidecar is the caller's to fetch; nothing here
// reads a file, a clock or the network. The instruments (js/sunWidgets.js),
// tools/sun-validate.mjs and the tests all use these, so a number a lesson states
// is the number the validation computes.
//
// The pictures are display pictures: a position read from one is an instructional
// reading with a placement sigma, labeled not astrometry (D-R10-92).
// =============================================================================

import { diskToHeliographic, positionSigma } from './geometry.js';
import { trackRotation } from './rotation.js';
import { summariseFluxSeries } from './irradiance.js';

const { Math } = globalThis;

/** A day at or above this mu is on the disc far enough for a precise rate (the kernel's own line). */
export const MU_PRECISE = 0.35;

/** The disc of frame `i`, in the form the geometry functions take (north up: pDeg 0). */
export function diskOfDay(side, i) {
  const d = side.days[i];
  return {
    cx: d.disc.centrePx[0],
    cy: d.disc.centrePx[1],
    radiusPx: d.disc.radiusPx,
    pDeg: d.pImageDeg,
    b0Deg: d.b0Deg,
    l0Deg: d.l0Deg,
    distanceAu: d.distanceAu,
  };
}

/** The ids of the tracked groups. */
export const groupIds = side => Object.keys(side.marks);

/**
 * One group's marks as heliographic positions: [{ day, date, jd, x, y, pixels,
 * latDeg, lonStonyDeg, lonCarringtonDeg, mu, sigmaLonDeg, sigmaLatDeg }], every
 * mark the sidecar holds (including those near the limb).
 */
export function groupPositions(side, id) {
  const g = side.marks[id];
  if (!g) return [];
  return g.marks.map(m => {
    const disk = diskOfDay(side, m.day);
    const pos = diskToHeliographic(m.x, m.y, disk);
    const sg = positionSigma(m.x, m.y, disk, g.sigmaPx);
    return {
      day: m.day,
      date: side.days[m.day].date,
      jd: side.days[m.day].jd,
      x: m.x,
      y: m.y,
      pixels: m.pixels,
      ...pos,
      sigmaLonDeg: sg.sigmaLonDeg,
      sigmaLatDeg: sg.sigmaLatDeg,
    };
  });
}

/**
 * A group's rotation from its marks: the marks of days `first` to `last`
 * (inclusive, indices into the frames), only those with mu at or above `minMu`
 * (default MU_PRECISE; a lower one adds the limb days, and the kernel warns).
 */
export function trackGroup(side, id, { first = 0, last = 13, minMu } = {}) {
  const g = side.marks[id];
  if (!g) return { status: 'refused', code: 'too-few', why: 'no such group' };
  const lowest = minMu ?? MU_PRECISE;
  const points = groupPositions(side, id)
    .filter(p => p.day >= first && p.day <= last && p.mu >= lowest)
    .map(p => ({
      jd: p.jd,
      x: p.x,
      y: p.y,
      sigmaPx: g.sigmaPx,
      disk: diskOfDay(side, p.day),
    }));
  return trackRotation(points);
}

/** The measured irradiance rows (fill values left out): [{ date, jd, fluxEarth, sigma, flux1Au }]. */
export const measuredIrradiance = side =>
  side.irradiance
    .filter(r => !r.fill)
    .map(r => ({
      date: r.date,
      jd: r.jd,
      fluxEarth: r.tsiEarthWm2,
      flux1Au: r.tsi1AuWm2,
      sigma: r.sigmaWm2,
      distanceAu: side.days.find(d => d.date === r.date)?.distanceAu ?? null,
    }));

/**
 * The first `n` measured days (default all) to the Sun's luminosity and effective
 * temperature: each day's flux at the Earth times the square of Horizons' distance
 * (a flux at 1 AU), their mean, its standard error from the scatter, and the chain
 * through the radiation kernel.
 */
export function summariseIrradiance(side, n = Infinity) {
  const rows = measuredIrradiance(side).slice(0, Math.max(1, n));
  return summariseFluxSeries(
    rows.map(r => ({ fluxWm2: r.fluxEarth, distanceAu: r.distanceAu })),
    { instrument: side.sources.irradiance.instrument }
  );
}
