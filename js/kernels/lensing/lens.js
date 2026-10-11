// =============================================================================
// Lensing kernel: deflection, Einstein radii, images and time delay
// -----------------------------------------------------------------------------
// The thin-lens, weak-field approximation: all the bending happens in one
// plane at the lens, through an angle small enough that sin a = a, by a mass
// whose field is weak where the light passes (b much greater than the
// Schwarzschild radius). Distances are the ones a student can read: the lens
// and the source from the observer, and for a lens inside the Galaxy the lens-
// source distance is their difference. For a lens at cosmological distance the
// caller passes the angular-diameter distance Dls itself.
//
// Units: SI inside (metres, kilograms, seconds, radians); the helpers
// ARCSEC, MAS and the conversions say what a caller reads. Lengths on the sky
// are in units of the Einstein radius where a function says so (x for an
// image, y or u for the source).
//
// Pure: no DOM, no clock.
// =============================================================================

import { C_SI, G_SI } from '../../constants.js';

export const ARCSEC = Math.PI / (180 * 3600);
export const MAS = ARCSEC / 1000;

/** 2GM/c^2, metres. */
export const schwarzschildRadius = massKg =>
  (2 * G_SI * massKg) / (C_SI * C_SI);

/**
 * The Einstein deflection of light passing a point mass at impact parameter b:
 * alpha = 4GM / (c^2 b), radians. Twice the Newtonian value for a corpuscle at
 * the speed of light; valid for b >> 2GM/c^2 (weakFieldRatio says how far).
 */
export function deflectionAngle(massKg, impactM) {
  return (4 * G_SI * massKg) / (C_SI * C_SI * impactM);
}

/** b over the Schwarzschild radius: the weak-field approximation wants this much greater than 1. */
export const weakFieldRatio = (massKg, impactM) =>
  impactM / schwarzschildRadius(massKg);

/**
 * The angular Einstein radius of a point mass, radians:
 * theta_E = sqrt(4GM/c^2 * Dls / (Dl Ds)). With dls omitted the lens is in the
 * Galaxy and Dls = Ds - Dl.
 */
export function einsteinAngle(massKg, dl, ds, dls = ds - dl) {
  return Math.sqrt(((4 * G_SI * massKg) / (C_SI * C_SI)) * (dls / (dl * ds)));
}

/** The Einstein radius projected on the lens plane, metres. */
export const einsteinRadiusM = (massKg, dl, ds, dls) =>
  einsteinAngle(massKg, dl, ds, dls) * dl;

/** The mass whose point-mass Einstein angle is thetaE: the inverse of einsteinAngle. */
export function massFromEinstein(thetaE, dl, ds, dls = ds - dl) {
  return (thetaE * thetaE * C_SI * C_SI * dl * ds) / (4 * G_SI * dls);
}

/**
 * The Einstein angle of a singular isothermal sphere with one-dimensional
 * velocity dispersion sigma (m/s): theta_E = 4 pi (sigma/c)^2 Dls/Ds, radians.
 * It does not depend on the lens distance except through Dls.
 */
export function sisEinsteinAngle(sigmaMs, ds, dls) {
  return 4 * Math.PI * (sigmaMs / C_SI) ** 2 * (dls / ds);
}

/** The velocity dispersion (m/s) of an SIS with Einstein angle thetaE: the inverse. */
export const sisDispersion = (thetaE, ds, dls) =>
  C_SI * Math.sqrt((thetaE * ds) / (4 * Math.PI * dls));

// -----------------------------------------------------------------------------
// The point mass: lens equation y = x - 1/x
// -----------------------------------------------------------------------------

/** The total magnification of a point lens at source separation u (in theta_E). */
export function pointMagnification(u) {
  if (!(u > 0)) return Infinity;
  return (u * u + 2) / (u * Math.sqrt(u * u + 4));
}

/**
 * The two images of a point lens for a source at y >= 0, in units of theta_E:
 * positions x+ (outside the ring, on the source's side) and x- (inside the
 * ring, on the other side, negative), with the magnification of each
 * (parity-signed: the inner image is flipped, so its signed value is
 * negative) and the total. y = 0 is the Einstein ring: both images at |x| = 1,
 * infinite point-source magnification.
 */
export function pointImages(y) {
  const s = Math.sqrt(y * y + 4);
  const xp = (y + s) / 2;
  const xm = (y - s) / 2;
  const f = y > 0 ? (y * y + 2) / (2 * y * s) : Infinity;
  return {
    x: [xp, xm],
    mu: [f + 0.5, -(f - 0.5)],
    total: y > 0 ? 2 * f : Infinity,
  };
}

/**
 * The time delay between the two images of a point lens, seconds:
 * dt = (4GM/c^3)(1 + zl) [ y sqrt(y^2+4)/2 + ln((sqrt(y^2+4)+y)/(sqrt(y^2+4)-y)) ].
 * The first term is the geometric delay, the second the Shapiro delay.
 */
export function pointTimeDelay(massKg, y, zl = 0) {
  const s = Math.sqrt(y * y + 4);
  return (
    ((4 * G_SI * massKg) / (C_SI * C_SI * C_SI)) *
    (1 + zl) *
    ((y * s) / 2 + Math.log((s + y) / (s - y)))
  );
}

// -----------------------------------------------------------------------------
// The singular isothermal sphere: lens equation y = x - sign(x)
// -----------------------------------------------------------------------------

/**
 * The images of an SIS for a source at y >= 0, in units of theta_E: one image
 * at x = y + 1 when y >= 1 and two (x = y + 1 and x = y - 1) when y < 1,
 * with their magnifications |1 + 1/y| and |1 - 1/y| and the total, 2/y inside
 * the Einstein radius and 1 + 1/y outside.
 */
export function sisImages(y) {
  const out = { x: [y + 1], mu: [y > 0 ? 1 + 1 / y : Infinity] };
  if (y < 1) {
    out.x.push(y - 1);
    out.mu.push(y > 0 ? -(1 / y - 1) : -Infinity);
  }
  out.total = out.mu.reduce((a, m) => a + Math.abs(m), 0);
  return out;
}

/**
 * The critical curve of both lenses is the circle of radius theta_E: a point
 * on it, the angle phi from the lens-source axis, in units of theta_E.
 */
export const criticalCurvePoint = phi => [Math.cos(phi), Math.sin(phi)];
