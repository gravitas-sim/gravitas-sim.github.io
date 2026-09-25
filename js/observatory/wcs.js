// =============================================================================
// From an image pixel to the sky, for a FITS TAN projection
// -----------------------------------------------------------------------------
// The one projection the workspace reads: the gnomonic (TAN) projection that
// TESS, and most small astronomical images, are written in. A pixel (x, y), in
// FITS's convention of 1 at the center of the first pixel, becomes
// intermediate world coordinates through CRPIX and either CD or PC and CDELT;
// those are the standard coordinates (xi, eta) on the plane tangent to the sky
// at CRVAL, which the gnomonic formulae take back to right ascension and
// declination (Calabretta & Greisen 2002, A&A 395, 1077, section 5.1.3, with
// the default LONPOLE of 180 degrees).
//
// An image in any other projection has no sky coordinates here, and says so:
// skyOf() returns null rather than a position computed as if it were TAN.
//
// Pure: no DOM, no imports.
// =============================================================================

const RAD = Math.PI / 180;

/**
 * Why a WCS cannot be used, or null when it can.
 * @returns {string|null}
 */
export function unusableWcs(wcs) {
  if (!wcs) return 'the image has no world coordinates';
  const [a, b] = wcs.ctype || [];
  if (!/^RA---TAN/.test(a || '') || !/^DEC--TAN/.test(b || '')) {
    return `it is projected as ${a || '?'} / ${b || '?'}, and only TAN is read here`;
  }
  const finite = x =>
    Array.isArray(x) && x.length === 2 && x.every(Number.isFinite);
  if (!finite(wcs.crpix) || !finite(wcs.crval))
    return 'its reference pixel or position is missing';
  if (!wcs.cd && !(finite(wcs.cdelt) && Array.isArray(wcs.pc))) {
    return 'it has neither a CD matrix nor PC and CDELT';
  }
  return null;
}

/** The linear part: degrees on the tangent plane per pixel. */
function matrix(wcs) {
  if (wcs.cd) return wcs.cd;
  const [c1, c2] = wcs.cdelt;
  const pc = wcs.pc;
  return [
    [c1 * pc[0][0], c1 * pc[0][1]],
    [c2 * pc[1][0], c2 * pc[1][1]],
  ];
}

/**
 * Right ascension and declination of a pixel, in degrees.
 * @param {object} wcs - { ctype, crpix, crval, cd } or { ..., cdelt, pc }
 * @param {number} x - FITS pixel, 1 at the center of the first column
 * @param {number} y - FITS pixel, 1 at the center of the first row
 * @returns {{ra: number, dec: number}|null} Null when the WCS is unusable
 */
export function skyOf(wcs, x, y) {
  if (unusableWcs(wcs)) return null;
  const m = matrix(wcs);
  const dx = x - wcs.crpix[0];
  const dy = y - wcs.crpix[1];
  const xi = (m[0][0] * dx + m[0][1] * dy) * RAD;
  const eta = (m[1][0] * dx + m[1][1] * dy) * RAD;
  const ra0 = wcs.crval[0] * RAD;
  const dec0 = wcs.crval[1] * RAD;
  const denom = Math.cos(dec0) - eta * Math.sin(dec0);
  let ra = ra0 + Math.atan2(xi, denom);
  const dec = Math.atan2(
    Math.sin(dec0) + eta * Math.cos(dec0),
    Math.sqrt(xi * xi + denom * denom)
  );
  ra = (((ra / RAD) % 360) + 360) % 360;
  return { ra, dec: dec / RAD };
}

/**
 * The angle between two positions on the sky, in degrees (the haversine
 * form, which keeps its precision for small angles).
 */
export function separation(a, b) {
  const d1 = a.dec * RAD;
  const d2 = b.dec * RAD;
  const s =
    Math.sin((d2 - d1) / 2) ** 2 +
    Math.cos(d1) * Math.cos(d2) * Math.sin(((b.ra - a.ra) * RAD) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(s)))) / RAD;
}

/** The size of one pixel on the sky, in arcseconds, along each axis. */
export function pixelScale(wcs) {
  const m = matrix(wcs);
  return [
    Math.hypot(m[0][0], m[1][0]) * 3600,
    Math.hypot(m[0][1], m[1][1]) * 3600,
  ];
}
