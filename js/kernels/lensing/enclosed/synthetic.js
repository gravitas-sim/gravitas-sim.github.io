// =============================================================================
// Labelled synthetic arcs and lens worlds (Prompt 251)
// -----------------------------------------------------------------------------
// Everything here is SYNTHETIC: invented lenses and arcs with a truth manifest, drawn from the 'noise'
// stream of js/random/streams.js forked by the world index, so a world does not depend on the order the
// others were drawn in. Nothing is a measurement. Pixel scale 0.1 arcsec per pixel.
// =============================================================================

import { gaussian, stream } from '../../../random/streams.js';
import { ARCSEC, sisDispersion } from '../lens.js';
import { lensDistances } from './distances.js';

export const PIXEL_ARCSEC = 0.1;
export const SYNTHETIC_LABEL =
  'SYNTHETIC: an invented lens and arc with a truth manifest, not a measurement';

/**
 * Points on a circular arc with Gaussian position noise (per coordinate).
 * @param {{centre: {x: number, y: number}, radius: number, extentDeg: number, startDeg: number,
 *   n: number, sigma: number, normal?: () => number}} o
 */
export function syntheticArc({
  centre,
  radius,
  extentDeg,
  startDeg = 0,
  n,
  sigma,
  normal,
}) {
  const points = [];
  const full = extentDeg >= 360;
  for (let i = 0; i < n; i++) {
    const f = full ? i / n : n === 1 ? 0 : i / (n - 1);
    const a = ((startDeg + f * extentDeg) * Math.PI) / 180;
    const nx = normal ? normal() * sigma : 0;
    const ny = normal ? normal() * sigma : 0;
    points.push({
      x: centre.x + radius * Math.cos(a) + nx,
      y: centre.y + radius * Math.sin(a) + ny,
    });
  }
  return {
    synthetic: true,
    label: SYNTHETIC_LABEL,
    truth: { centre: { ...centre }, radius, extentDeg, startDeg, sigma },
    points,
  };
}

/**
 * One world of the validation ensembles (thresholds.json worlds.ensemble, as amended by AM1).
 * @param {{seed: string, index: number, kind: 'ring'|'partial'|'offset', cosmology: object,
 *   n?: number, sigmaPx?: number, extentRangeDeg?: [number, number], yMax?: number}} o
 */
export function ensembleWorld(o) {
  const { seed, index, kind, cosmology } = o;
  const n = o.n ?? 24;
  const sigmaPx = o.sigmaPx ?? 1;
  const u = stream('noise', seed, String(index));
  const normal = gaussian(stream('noise', seed, String(index), 'position'));
  const thetaEArcsec = Math.exp(Math.log(3) + u() * Math.log(10));
  const zl = 0.1 + u() * 0.5;
  const zs = zl + 0.5 + u() * 1.5;
  const centre = { x: 256 + (u() - 0.5) * 100, y: 256 + (u() - 0.5) * 100 };
  const startDeg = u() * 360;
  const extentU = u();
  const yU = u();
  const d = lensDistances({ zl, zs, cosmology });
  const thetaE = thetaEArcsec * ARCSEC;
  const [e0, e1] = o.extentRangeDeg ?? [360, 360];
  const extentDeg = kind === 'ring' ? 360 : e0 + extentU * (e1 - e0);
  const y = kind === 'offset' ? yU * (o.yMax ?? 0.3) : 0;
  const radiusPx = (thetaEArcsec * (1 + y)) / PIXEL_ARCSEC;
  const arc = syntheticArc({
    centre,
    radius: radiusPx,
    extentDeg,
    startDeg,
    n,
    sigma: sigmaPx,
    normal,
  });
  return {
    ...arc,
    truth: {
      ...arc.truth,
      kind,
      index,
      thetaEArcsec,
      thetaE,
      sourceOffset: y,
      zl,
      zs,
      sigmaKms: sisDispersion(thetaE, d.ds, d.dls) / 1000,
      distancesM: { dl: d.dl, ds: d.ds, dls: d.dls },
      pixelArcsec: PIXEL_ARCSEC,
    },
    distances: d,
  };
}
