// =============================================================================
// SED kernel: the point contract, its refusals and nonsimultaneity (Prompt 245)
// -----------------------------------------------------------------------------
// A point is one number about one star at one wavelength or through one band:
//
//   {id, kind, band | lambdaNm, convention, value, sigma, epoch}
//
// 'band-integrated' is the photon-weighted mean f_nu through a band of the
// bandpass pack (the thing a magnitude in that band is); 'monochromatic' is the
// flux density at one wavelength. The kernel never lets one stand in for the
// other: a band-integrated point is compared with the model through its band,
// and its wavelength is the band's pivot wavelength computed from the response.
// A point with an unknown convention, a band the map does not hold, a Vega
// magnitude with no offset, a band-integrated flux per wavelength (which has no
// unique f_nu), or a bad error is refused with a code, never guessed.
//
// The normalised point carries the natural log of f_nu (Jy) and its log-flux
// standard deviation, which is what the fit works in.
// =============================================================================

import { pivotWavelength } from '../radiation/index.js';
import { convertFlux } from '../radiation/index.js';
import {
  isConvention,
  isPerWavelength,
  magToJy,
  sigmaLnOfMag,
  MAGNITUDE_CONVENTIONS,
} from './conventions.js';

const { Math, Number, Map } = globalThis;

/** A flux error of this fraction of the flux or more is refused (the log-flux Gaussian is not valid). */
export const MAX_FRACTIONAL_ERROR = 0.5;

const refuse = (code, id, message) => ({ ok: false, code, id, message });

/**
 * Normalise one raw point.
 * @param {object} p - The point as the contract names it
 * @param {Map<string, object>|object} bands - Decoded bands (radiation kernel decodeBand) by id
 * @returns {{ok: true, point: object}|{ok: false, code: string, id: ?string, message: string}}
 */
export function normalizePoint(p, bands = {}) {
  const id = p?.id ?? null;
  if (p?.kind !== 'band-integrated' && p?.kind !== 'monochromatic')
    return refuse(
      'kind',
      id,
      "kind must be 'band-integrated' or 'monochromatic'"
    );
  if (!isConvention(p.convention))
    return refuse(
      'convention-unknown',
      id,
      'the point states no convention the kernel knows (ab-mag, vega-mag or a registry flux unit)'
    );
  const lookup = b =>
    bands instanceof Map
      ? bands.get(b)
      : Object.hasOwn(bands, b)
        ? bands[b]
        : undefined;
  let band = null;
  let lambdaNm;
  if (p.kind === 'band-integrated') {
    band = lookup(p.band);
    if (!band)
      return refuse(
        'no-bandpass',
        id,
        `no response is held for band ${String(p.band)}: a band-integrated point cannot be compared with a model without it`
      );
    if (isPerWavelength(p.convention))
      return refuse(
        'band-flux-per-wavelength',
        id,
        'a band-integrated value per unit wavelength has no unique f_nu; give the magnitude or the f_nu form'
      );
    lambdaNm = pivotWavelength(band);
  } else {
    lambdaNm = p.lambdaNm;
    if (!(Number.isFinite(lambdaNm) && lambdaNm > 0))
      return refuse(
        'wavelength',
        id,
        'a monochromatic point needs a positive wavelength'
      );
  }
  if (p.convention === 'vega-mag' && !Number.isFinite(band?.abMinusVega))
    return refuse(
      'vega-offset-missing',
      id,
      'a Vega magnitude needs the AB-Vega offset of a band; this point has no band or its band states none'
    );
  const isMag = MAGNITUDE_CONVENTIONS.includes(p.convention);
  if (!Number.isFinite(p.value) || (!isMag && !(p.value > 0)))
    return refuse(
      'flux',
      id,
      'the value is not a finite magnitude or a positive flux density'
    );
  let fnuJy;
  let sigmaLn;
  if (isMag) {
    fnuJy = magToJy(p.value, p.convention, band?.abMinusVega ?? null);
    if (!(p.sigma > 0 && Number.isFinite(p.sigma)))
      return refuse('sigma', id, 'sigma must be positive and finite');
    sigmaLn = sigmaLnOfMag(p.sigma);
  } else {
    const toJy = x =>
      convertFlux(
        x,
        p.convention,
        'Jy',
        p.kind === 'monochromatic' ? lambdaNm : undefined
      );
    fnuJy = toJy(p.value);
    if (!(p.sigma > 0 && Number.isFinite(p.sigma)))
      return refuse('sigma', id, 'sigma must be positive and finite');
    sigmaLn = toJy(p.sigma) / fnuJy;
  }
  if (!(Number.isFinite(fnuJy) && fnuJy > 0))
    return refuse('flux', id, 'the flux density is not positive and finite');
  if (!(sigmaLn < MAX_FRACTIONAL_ERROR))
    return refuse(
      'error-too-large',
      id,
      'a flux error of half the flux or more is outside the log-flux treatment'
    );
  return {
    ok: true,
    point: {
      id,
      kind: p.kind,
      band: band ? p.band : null,
      convention: p.convention,
      lambdaNm,
      fnuJy,
      lnF: Math.log(fnuJy),
      sigmaLn,
      epoch: Number.isFinite(p.epoch) ? p.epoch : null,
    },
  };
}

/**
 * Normalise a list; the first refusal refuses the whole SED and names its id.
 * @returns {{ok: true, points: object[]}|{ok: false, code: string, id: ?string, message: string}}
 */
export function normalizePoints(points, bands = {}) {
  if (!Array.isArray(points))
    return refuse('points', null, 'the points must be a list');
  const out = [];
  const seen = new Set();
  for (const p of points) {
    const r = normalizePoint(p, bands);
    if (!r.ok) return r;
    if (seen.has(r.point.id))
      return refuse('duplicate-id', r.point.id, 'two points carry the same id');
    seen.add(r.point.id);
    out.push(r.point);
  }
  return { ok: true, points: out };
}

/**
 * The nonsimultaneity rule. With an allowance v > 0, a point whose epoch is null or
 * differs from `referenceEpoch` by more than `windowDays` is flagged and its log-flux
 * sigma becomes sqrt(sigma^2 + v^2); v is a fractional flux amplitude (0.1 is 10 percent).
 * Without an allowance nothing is widened and the result says it assumes simultaneity.
 * @returns {{ok: true, points: object[], widening: object}|{ok: false, code: string, message: string}}
 */
export function applyNonsimultaneity(
  points,
  { allowance, referenceEpoch, windowDays } = {}
) {
  if (!(allowance > 0))
    return {
      ok: true,
      points: points.map(p => ({
        ...p,
        nonsimultaneous: false,
        sigmaLnEff: p.sigmaLn,
      })),
      widening: { rule: 'none', assumesSimultaneous: true, widened: [] },
    };
  if (!Number.isFinite(referenceEpoch) || !(windowDays >= 0))
    return refuse(
      'reference-epoch',
      null,
      'an allowance needs a reference epoch and a window in days'
    );
  const out = points.map(p => {
    const flagged =
      p.epoch === null || Math.abs(p.epoch - referenceEpoch) > windowDays;
    return {
      ...p,
      nonsimultaneous: flagged,
      sigmaLnEff: flagged
        ? Math.sqrt(p.sigmaLn ** 2 + allowance ** 2)
        : p.sigmaLn,
    };
  });
  return {
    ok: true,
    points: out,
    widening: {
      rule: 'sigma_eff^2 = sigma^2 + v^2 for a point with no epoch or more than the window from the reference',
      assumesSimultaneous: false,
      allowance,
      referenceEpoch,
      windowDays,
      widened: out.filter(p => p.nonsimultaneous).map(p => p.id),
    },
  };
}
