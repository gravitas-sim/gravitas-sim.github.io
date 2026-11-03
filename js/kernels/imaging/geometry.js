// Angles: the separation of a planet from its star as seen from here, the
// diffraction scale lambda / D, and the observability verdict against a stated
// instrument.
//
// lambda / D and the Rayleigh angle describe the telescope's point-spread
// function. A coronagraph's inner working angle is a different number: it is
// where that instrument's starlight suppression starts to work, it is set by
// the mask and the wavefront control, and it is stated for the instrument, never
// derived from lambda / D here. observable() therefore refuses a call that does
// not state one.
import {
  lambdaOverD,
  rayleighAngle,
  ARCSEC_PER_RAD,
} from '../detector/optics.js';
import { NOT_OBSERVABLE, ImagingError, posNum } from './constants.js';

/** The angle between planet and star, radians, for a projected separation and a distance (both metres). */
export function angularSeparation({ separationM, distanceM }) {
  if (typeof separationM !== 'number' || !(separationM >= 0))
    throw new ImagingError('input', 'the separation must be zero or more');
  posNum(distanceM, 'the distance');
  const rad = Math.atan(separationM / distanceM);
  return { rad, arcsec: rad * ARCSEC_PER_RAD };
}

/** The diffraction scale of a telescope at a wavelength, with the statement about the inner working angle. */
export function diffractionScale({ apertureM, wavelengthM }) {
  posNum(apertureM, 'the aperture');
  posNum(wavelengthM, 'the wavelength');
  const o = { apertureM, wavelengthM };
  const scale = lambdaOverD(o);
  const ray = rayleighAngle(o);
  return {
    lambdaOverDRad: scale,
    lambdaOverDArcsec: scale * ARCSEC_PER_RAD,
    rayleighRad: ray,
    rayleighArcsec: ray * ARCSEC_PER_RAD,
    isInnerWorkingAngle: false,
    statement:
      'lambda / D is the diffraction scale of the telescope. A coronagraph inner working angle is a separate, instrument-specific quantity.',
  };
}

/**
 * Can this instrument see the planet?
 *
 * instrument: { apertureM, wavelengthM, innerWorkingArcsec | innerWorkingLambdaOverD, contrastFloor }
 * The inner working angle is the instrument's own stated number; a multiple of
 * lambda / D is accepted only as that stated number (the caller names it).
 */
export function observable({ separationArcsec, contrast, instrument }) {
  if (typeof separationArcsec !== 'number' || !(separationArcsec >= 0))
    throw new ImagingError('input', 'the separation must be zero or more');
  if (typeof contrast !== 'number' || !(contrast >= 0))
    throw new ImagingError('input', 'the contrast must be zero or more');
  const inst = instrument ?? {};
  let iwa = null;
  if (inst.innerWorkingArcsec != null)
    iwa = posNum(inst.innerWorkingArcsec, 'the inner working angle');
  else if (inst.innerWorkingLambdaOverD != null) {
    const d = diffractionScale({
      apertureM: inst.apertureM,
      wavelengthM: inst.wavelengthM,
    });
    iwa =
      posNum(
        inst.innerWorkingLambdaOverD,
        'the inner working angle in lambda / D'
      ) * d.lambdaOverDArcsec;
  }
  if (iwa == null)
    return {
      ok: false,
      status: 'refused',
      code: 'no-inner-working-angle',
      message:
        'no inner working angle stated: it is a property of the instrument and is not derived from lambda / D',
    };
  const floor = inst.contrastFloor;
  if (floor != null) posNum(floor, 'the contrast floor');
  const base = {
    ok: true,
    separationArcsec,
    innerWorkingArcsec: iwa,
    contrast,
    contrastFloor: floor ?? null,
  };
  if (separationArcsec < iwa)
    return {
      ...base,
      observable: false,
      status: 'not-observable',
      code: 'inside-inner-working-angle',
      message: NOT_OBSERVABLE,
      reason: 'the planet lies inside the stated inner working angle',
    };
  if (floor != null && contrast < floor)
    return {
      ...base,
      observable: false,
      status: 'not-observable',
      code: 'below-contrast-floor',
      message: NOT_OBSERVABLE,
      reason: 'the planet is fainter than the stated contrast floor',
    };
  return {
    ...base,
    observable: true,
    status: 'observable',
    code: 'observable',
    message:
      'outside the stated inner working angle and above the stated contrast floor',
    reason: null,
  };
}
