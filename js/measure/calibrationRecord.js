// =============================================================================
// The calibration record: a solved WCS with its residuals, and its replay
// -----------------------------------------------------------------------------
// One description of a sky calibration (Prompt 181, ASTROMETRY.md), in the two
// places a record lives, as Prompt 179's marks do:
//   the ledger     a gravitas.artifact/1 (Prompt 150): the reference position,
//                  reference pixel, scale, rotation and skew each with its
//                  sigma, the residual rms and chi-squared, the frame center's
//                  sky position; in the provenance the whole reduction, so it
//                  can be run again (replay)
//   the workspace  `workspace.calibration`, a gravitas.image-calibration/1
//                  block (FORMATS.md), written only when a calibration exists
// The record carries the solved WCS with its residuals, and the reference
// catalogue's identity and epoch. A WCS read from a header and not solved here
// says so (`origin: 'header'`) and carries no residuals, because none were
// computed; check it against stars to get them. `replay` refuses when the
// frame's pixels changed, solves again and says whether the numbers agree.
// Pure; async only for the digest. Imports only the kernel beside it.
// =============================================================================

import { fitWcs, fromHeader, skyOf, uncertaintyAt } from './astrometry.js';

export const CAL_FORMAT = 'gravitas.image-calibration';
export const CAL_VERSION = 1;
export const STEP = 'image-calibration';
/** The most reference stars a record holds. */
export const LIMITS = Object.freeze({ stars: 500 });
const VERDICTS = ['consistent', 'inconsistent', 'exact'];
const SOURCES = ['typed', 'sky-bright-stars'];

const hex = buf =>
  [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
/** SHA-256 of bytes or text, as lower-case hex (what js/hash.js gives; no import, so no shared chunk). */
export const sha256 = async data =>
  hex(
    await globalThis.crypto.subtle.digest(
      'SHA-256',
      typeof data === 'string' ? new TextEncoder().encode(data) : data
    )
  );
/** A frame's digest: the same bytes Prompt 179's marks hash (its values as 64-bit floats). */
export const digestFrame = f =>
  sha256(new Uint8Array(f.data.buffer, f.data.byteOffset, f.data.byteLength));

/**
 * What the reference stars came from: the pack's identity when the positions
 * were looked up, else what the reader said (the reader states the epoch).
 * @param {{doc?: object, mjd?: number, typed?: string}} a
 */
export function catalogOf({ doc, mjd, typed } = {}) {
  if (doc?.pack)
    return {
      source: 'sky-bright-stars',
      name: doc.pack.title,
      id: doc.pack.id,
      version: doc.pack.version,
      epoch: Number.isFinite(mjd)
        ? `${doc.epoch}, moved to MJD ${mjd} by proper motion`
        : String(doc.epoch),
    };
  return {
    source: 'typed',
    name: 'positions typed by the reader',
    epoch: typed || 'not stated by the reader',
  };
}

/** An image's time as a Modified Julian Date, or NaN: {value, format?: 'mjd'|'jd'|'iso'} (the scale is not needed to move a star's proper motion). */
export function mjdOf(time) {
  if (!time) return NaN;
  const v = time.value;
  if (time.format !== 'iso' && !Number.isFinite(Number(v))) return NaN;
  if (time.format === 'iso')
    return Date.parse(String(v).endsWith('Z') ? v : `${v}Z`) / 86400000 + 40587;
  return time.format === 'jd' ? Number(v) - 2400000.5 : Number(v);
}

const round = v => (Number.isFinite(v) ? v : null);

/**
 * The block for a solved or header calibration.
 * @param {{frame: {id: string, width: number, height: number, digest: string},
 *   catalog: object, stars: object[], fit?: object, header?: object}} a - `fit` is fitWcs's answer; `header` a WCS read by fromHeader
 */
export function calibrationBlock({ frame, catalog, stars, fit, header }) {
  const base = {
    format: CAL_FORMAT,
    formatVersion: CAL_VERSION,
    step: STEP,
    version: CAL_VERSION,
    frame: {
      id: frame.id,
      width: frame.width,
      height: frame.height,
      digest: frame.digest,
    },
    catalog,
    stars: stars.map(s => ({
      id: s.id,
      ...(s.name ? { name: s.name } : {}),
      x: s.x,
      y: s.y,
      sigma: s.sigma,
      ra: s.ra,
      dec: s.dec,
      ...(s.catalogSigma ? { catalogSigma: s.catalogSigma } : {}),
    })),
  };
  if (fit?.ok)
    return {
      ...base,
      solution: {
        origin: 'fit',
        model: fit.model,
        ...(fit.model === 'similarity' ? { parity: fit.parity } : {}),
        tangent: fit.tangent,
        tangentGiven: fit.tangentGiven,
        wcs: fit.wcs,
      },
      result: {
        params: fit.params,
        covariance: fit.covariance,
        derived: fit.derived,
        sigmas: fit.sigmas,
        stats: { ...fit.stats, p: round(fit.stats.p) },
        verdict: fit.verdict,
        consistent: fit.consistent,
        residuals: fit.residuals,
      },
    };
  return {
    ...base,
    solution: { origin: 'header', wcs: header.wcs },
    result: null,
  };
}

const finite = Number.isFinite;
const HEX = /^[0-9a-f]{64}$/;
const finiteList = (a, n) =>
  Array.isArray(a) && a.length === n && a.every(finite);

/**
 * Whether a `workspace.calibration` block is well formed: the paths that are
 * not (empty when it is). Data only: nothing here reads pixels.
 * @returns {string[]}
 */
export function validateCalibration(b) {
  const out = [];
  const bad = p => out.push(p);
  if (b?.format !== CAL_FORMAT || b.formatVersion !== CAL_VERSION)
    return ['format'];
  const f = b.frame;
  if (
    !f ||
    typeof f.id !== 'string' ||
    !(f.width > 0 && Number.isInteger(f.width)) ||
    !(f.height > 0 && Number.isInteger(f.height)) ||
    !HEX.test(f.digest ?? '')
  )
    bad('frame');
  const c = b.catalog;
  if (
    !c ||
    !SOURCES.includes(c.source) ||
    typeof c.name !== 'string' ||
    typeof c.epoch !== 'string'
  )
    bad('catalog');
  if (!Array.isArray(b.stars) || b.stars.length > LIMITS.stars)
    return [...out, 'stars'];
  b.stars.forEach((s, i) => {
    const ok =
      typeof s?.id === 'string' &&
      finite(s.x) &&
      finite(s.y) &&
      finite(s.ra) &&
      s.dec >= -90 &&
      s.dec <= 90 &&
      s.sigma > 0 &&
      s.sigma < Infinity &&
      (s.catalogSigma === undefined || s.catalogSigma >= 0);
    if (!ok) bad(`stars[${i}]`);
  });
  const sol = b.solution;
  if (
    !sol ||
    !['fit', 'header'].includes(sol.origin) ||
    !fromHeader(sol.wcs).ok
  ) {
    bad('solution');
    return out;
  }
  if (sol.origin === 'header') {
    if (b.result !== null) bad('result');
    return out;
  }
  const r = b.result;
  const n = b.stars.length;
  const ok =
    ['affine', 'similarity'].includes(sol.model) &&
    finiteList(sol.tangent, 2) &&
    r &&
    finiteList(r.params, 6) &&
    Array.isArray(r.covariance) &&
    r.covariance.length === 6 &&
    r.covariance.every(row => finiteList(row, 6)) &&
    VERDICTS.includes(r.verdict) &&
    r.stats?.n === n &&
    Number.isInteger(r.stats.dof) &&
    finite(r.stats.chi2) &&
    Array.isArray(r.residuals) &&
    r.residuals.length === n &&
    r.residuals.every(q => finite(q.dx) && finite(q.dy));
  if (!ok) bad('result');
  return out;
}

/** The quantities of a record, each with its uncertainty of Prompt 150's kinds. */
export function quantitiesOf(block) {
  const q = [];
  const wcs = block.solution.wcs;
  const centre = [(block.frame.width + 1) / 2, (block.frame.height + 1) / 2];
  const sky = skyOf(wcs, ...centre);
  const add = (id, label, value, unit, origin, uncertainty) =>
    q.push({ id, label, value, unit, origin, uncertainty });
  const sigma = (s, basis) =>
    Number.isFinite(s)
      ? { kind: 'sigma', sigma: s, basis }
      : { kind: 'assumed' };
  const assumed = { kind: 'assumed' };
  if (block.solution.origin === 'header') {
    add(
      'crval.ra',
      'reference position, right ascension',
      wcs.crval[0],
      'deg',
      'assumed',
      assumed
    );
    add(
      'crval.dec',
      'reference position, declination',
      wcs.crval[1],
      'deg',
      'assumed',
      assumed
    );
    add(
      'crpix.x',
      'reference pixel, x',
      wcs.crpix[0],
      'pix',
      'assumed',
      assumed
    );
    add(
      'crpix.y',
      'reference pixel, y',
      wcs.crpix[1],
      'pix',
      'assumed',
      assumed
    );
    add(
      'centre.ra',
      'right ascension of the frame center',
      sky.ra,
      'deg',
      'derived',
      assumed
    );
    add(
      'centre.dec',
      'declination of the frame center',
      sky.dec,
      'deg',
      'derived',
      assumed
    );
    return q;
  }
  const r = block.result;
  const d = r.derived;
  const s = r.sigmas;
  add(
    'crval.ra',
    'reference position, right ascension',
    wcs.crval[0],
    'deg',
    'assumed',
    assumed
  );
  add(
    'crval.dec',
    'reference position, declination',
    wcs.crval[1],
    'deg',
    'assumed',
    assumed
  );
  add(
    'crpix.x',
    'reference pixel, x',
    wcs.crpix[0],
    'pix',
    'derived',
    sigma(s.crpix[0], 'data')
  );
  add(
    'crpix.y',
    'reference pixel, y',
    wcs.crpix[1],
    'pix',
    'derived',
    sigma(s.crpix[1], 'data')
  );
  add(
    'scale',
    'pixel scale, arcsec per pixel',
    d.scale,
    null,
    'derived',
    sigma(s.scale, 'derived')
  );
  add(
    'rotation',
    'position angle of the +y axis, east of north',
    d.positionAngle,
    'deg',
    'derived',
    sigma(s.positionAngle, 'derived')
  );
  if (block.solution.model === 'affine') {
    add(
      'skew',
      'skew of the axes from a right angle',
      d.skew,
      'deg',
      'derived',
      sigma(s.skew, 'derived')
    );
    add(
      'axisRatio',
      'x scale over y scale',
      d.axisRatio,
      null,
      'derived',
      sigma(s.axisRatio, 'derived')
    );
  }
  const fit = { params: r.params, covariance: r.covariance };
  const u = uncertaintyAt(fit, ...centre);
  const cosd = Math.cos((sky.dec * Math.PI) / 180);
  add(
    'centre.ra',
    'right ascension of the frame center',
    sky.ra,
    'deg',
    'derived',
    sigma(u.east / 3600 / (cosd || 1), 'derived')
  );
  add(
    'centre.dec',
    'declination of the frame center',
    sky.dec,
    'deg',
    'derived',
    sigma(u.north / 3600, 'derived')
  );
  add(
    'rms',
    'rms residual of the reference stars',
    r.stats.rmsPix,
    'pix',
    'derived',
    assumed
  );
  add(
    'chi2',
    'chi-squared of the residuals',
    r.stats.chi2,
    null,
    'derived',
    assumed
  );
  add('dof', 'degrees of freedom', r.stats.dof, null, 'derived', assumed);
  return q;
}

/** The reduction a record keeps in its provenance (the block without its format words). */
const reductionOf = block => {
  const rest = { ...block };
  delete rest.format;
  delete rest.formatVersion;
  return rest;
};

/**
 * One gravitas.artifact/1 envelope with replay.
 * @param {{id: string, setId: string, block: object}} a
 */
export async function writeRecord({ id, setId, block }) {
  // The envelope's module is the Fit panel's too: fetched when a record is made.
  const { artifact } = await import('../platform/artifact.js');
  return artifact({
    id,
    source: {
      kind: 'observation',
      id: setId,
      digest: (await sha256(block.frame.digest)).slice(0, 64),
    },
    quantities: quantitiesOf(block),
    provenance: { reductions: [reductionOf(block)] },
    made: { app: 'gravitas', tool: STEP },
  });
}

export class ReplayError extends Error {
  constructor(code, detail = code) {
    super(detail);
    this.code = code;
  }
}

/** The numbers a replay compares: relative to the matrix, absolute for the reference pixel. */
const agreeing = (a, b) =>
  a.every((v, i) => Math.abs(v - b[i]) <= 1e-9 * Math.max(1, Math.abs(b[i])));

/**
 * Reopen a record against the frame it was made on: refuse if the frame's
 * pixels changed, solve again from the stars it holds, and say whether the
 * numbers agree with the ones it stored.
 * @param {object} record - A gravitas.artifact/1 written by writeRecord, or a gravitas.image-calibration/1 block
 * @param {{width: number, height: number, data: Float64Array}} [frame] - The frame now open
 * @returns {Promise<{block: object, fit: ?object, agrees: boolean}>}
 * @throws {ReplayError} `invalid` or `image-changed`
 */
export async function replay(record, frame) {
  let block;
  if (record?.format === CAL_FORMAT) block = record;
  else {
    const { validateArtifact } = await import('../platform/artifact.js');
    const problems = validateArtifact(record);
    if (problems.length) throw new ReplayError('invalid', problems[0].path);
    const red = record.provenance.reductions.find(r => r.step === STEP);
    if (!red) throw new ReplayError('invalid');
    block = { format: CAL_FORMAT, formatVersion: CAL_VERSION, ...red };
  }
  const problems = validateCalibration(block);
  if (problems.length) throw new ReplayError('invalid', problems[0]);
  if (
    frame &&
    (frame.width !== block.frame.width ||
      frame.height !== block.frame.height ||
      (await digestFrame(frame)) !== block.frame.digest)
  )
    throw new ReplayError('image-changed');
  if (block.solution.origin === 'header')
    return { block, fit: null, agrees: true };
  const sol = block.solution;
  const fit = fitWcs(block.stars, {
    model: sol.model,
    parity: sol.parity,
    tangent: sol.tangentGiven ? sol.tangent : undefined,
  });
  const agrees =
    fit.ok &&
    agreeing(fit.params.slice(0, 2), block.result.params.slice(0, 2)) &&
    agreeing(
      fit.params.slice(2).map(v => v / Math.hypot(...fit.params.slice(2))),
      block.result.params
        .slice(2)
        .map(v => v / Math.hypot(...block.result.params.slice(2)))
    );
  return { block, fit, agrees };
}
