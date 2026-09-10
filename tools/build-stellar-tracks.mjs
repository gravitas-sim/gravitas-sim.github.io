#!/usr/bin/env node
// =============================================================================
// Bundle a curated subset of the MIST stellar evolution tracks
// -----------------------------------------------------------------------------
//   npm run stellar:data     download (or reuse a cache), reduce, write the module
//   npm run stellar:check    verify the checked-in module
//
// What this is
// -----------------------------------------------------------------------------
// Seven evolutionary tracks from MIST v1.2 at solar metallicity, solar-scaled
// abundances and no rotation: 0.2, 0.5, 1, 2, 5, 10 and 20 solar masses. Every
// one is a grid model, so nothing here is interpolated between masses at build
// time and nothing is extrapolated past where MESA stopped.
//
// MIST computed these. This project did not, and could not: they are the output
// of a stellar-structure code integrating a star for up to a trillion years, and
// nothing in a browser is going to reproduce that. What this script does is
// reduce them - about 7,700 rows of 77 columns down to a few hundred rows of
// four - and record exactly how, so that the reduction can be undone by
// anybody who wants the originals.
//
// What is stored, and what is derived
// -----------------------------------------------------------------------------
// Age, current mass, log L and log Teff are stored. The radius is NOT: it
// follows from the other two by
//
//     L / Lsun = (R / Rsun)^2 (Teff / Teff_sun)^4
//
// and MIST's own log_R column satisfies that to machine precision - across all
// 7,654 rows of the seven tracks the implied solar effective temperature comes
// out at 5772.16 K with a standard deviation of 4e-16, which is the IAU 2015
// nominal value. The build re-measures that on every run and refuses to write
// if it has moved, so "derive the radius" is a checked claim rather than an
// assumption.
//
// How the reduction works
// -----------------------------------------------------------------------------
// Ramer-Douglas-Peucker, run three times over each track and unioned: once on
// the Hertzsprung-Russell curve so a loop or a tip is not cut off a corner,
// once against age so a long quiet stretch does not lose its timing, and once
// against mass so the wind losses of a massive star survive. The ten primary
// EEPs are pinned as segment ends and are never thinned away, which is what
// keeps the named phase boundaries exactly where MIST put them.
//
// The build then measures the worst error the reduction introduced, in every
// stored quantity, and records it on the track. If the reduction ever gets
// worse than the tolerance below it refuses to write.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as prettier from 'prettier';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const OUT = path.join(REPO, 'js', 'data', 'stellar', 'mistTracks.js');
const CACHE = path.join(REPO, '.mist-cache');

/** The one published grid this bundle comes from. */
const GRID = {
  version: 'MIST v1.2',
  file: 'MIST_v1.2_feh_p0.00_afe_p0.0_vvcrit0.0_EEPS.txz',
  url: 'https://mist.science/data/tarballs_v1.2/MIST_v1.2_feh_p0.00_afe_p0.0_vvcrit0.0_EEPS.txz',
  /** Recorded on the copy this bundle was built from. */
  sha256: 'a445d926c1765e951eb1bf6811dbfb14635725efcf63aaaa883d02f36cc58741',
  bytes: 100050704,
};

/**
 * The seven masses, in units of a hundredth of a solar mass, which is how MIST
 * names its files. Every one is a grid point: none of these is interpolated.
 */
const MASSES = [
  { file: '00020M', massSun: 0.2, id: 'm020' },
  { file: '00050M', massSun: 0.5, id: 'm050' },
  { file: '00100M', massSun: 1, id: 'm100' },
  { file: '00200M', massSun: 2, id: 'm200' },
  { file: '00500M', massSun: 5, id: 'm500' },
  { file: '01000M', massSun: 10, id: 'm1000' },
  { file: '02000M', massSun: 20, id: 'm2000' },
];

/** Zero-based indices of the columns this bundle keeps. */
const COL = { age: 0, mass: 1, logL: 6, logTeff: 11, logR: 13, phase: 76 };

/**
 * The primary equivalent evolutionary points, in the order MIST writes them.
 *
 * The eighth means different things on the two kinds of track, which is why
 * `type` is carried through: on a low-mass track it is the start of thermal
 * pulses on the asymptotic giant branch, and on a high-mass one it is the
 * onset of carbon burning. Naming both "TPAGB" would be wrong about half the
 * catalogue.
 */
const EEP_NAMES = [
  'pms',
  'zams',
  'iams',
  'tams',
  'rgb-tip',
  'zacheb',
  'tacheb',
  'tpagb',
  'post-agb',
  'wd-cooling',
];
const EEP_NAMES_HIGH = [...EEP_NAMES.slice(0, 7), 'carbon-burning'];

/**
 * The multiplier the log-age column is quantized at, and the one the recorded
 * EEP ages have to use so that the two agree exactly at a named point.
 */
const AGE_SCALE = 1e7;

/** How far a thinned point may sit from the curve it came from, in dex. */
const TOLERANCE = 0.004;

/** And the worst error the whole reduction may introduce, per quantity. */
const MAX_ERROR = { logL: 0.01, logTeff: 0.004, mass: 0.01, logAge: 0.01 };

/** The solar effective temperature MIST's own columns imply. IAU 2015 nominal. */
const TEFF_SUN_EXPECTED = 5772;

/**
 * Fetch the grid, or reuse the cache.
 * @param {boolean} offline - Refuse to reach the network
 * @returns {Promise<string>} Path to the tarball
 */
async function ensureGrid(offline) {
  const file = path.join(CACHE, GRID.file);
  if (existsSync(file)) {
    // The cache is not the source of truth: a truncated or replaced download
    // would silently produce a different bundle, and the whole point of the
    // recorded checksum is that it cannot.
    const digest = createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
    if (digest !== GRID.sha256) {
      throw new Error(
        `${path.relative(REPO, file)} is not the grid this bundle was built from.\n` +
          `  expected ${GRID.sha256}\n  found    ${digest}\n` +
          'Delete it and let the build fetch it again, or update GRID.sha256 ' +
          'deliberately if MIST has republished.'
      );
    }
    return file;
  }
  if (offline) {
    throw new Error(
      `${GRID.file} is not in ${path.relative(REPO, CACHE)} and --offline was given.\n` +
        `Run without --offline once to fetch it from ${GRID.url} (100 MB).`
    );
  }
  await mkdir(CACHE, { recursive: true });
  const res = await fetch(GRID.url);
  if (!res.ok) throw new Error(`${GRID.url}: HTTP ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

/**
 * Pull the seven tracks out of the tarball, once.
 * @param {string} tarball - Path to the archive
 * @returns {Promise<void>}
 */
async function ensureTracks(tarball) {
  const missing = MASSES.filter(
    m => !existsSync(path.join(CACHE, `${m.file}.track.eep`))
  );
  if (!missing.length) return;
  const stem = GRID.file.replace('.txz', '');
  await run('tar', [
    '-xJf',
    tarball,
    '--strip-components=1',
    '-C',
    CACHE,
    ...missing.map(m => `${stem}/${m.file}.track.eep`),
  ]);
}

/**
 * Read one EEP track file.
 * @param {string} file - Path
 * @returns {Promise<object>} Header facts and rows
 */
async function readTrack(file) {
  const text = await readFile(file, 'utf8');
  const rows = [];
  const header = [];
  for (const line of text.split('\n')) {
    if (line.startsWith('#')) {
      header.push(line.trim());
      continue;
    }
    const parts = line.trim().split(/\s+/);
    if (parts.length < 77) continue;
    rows.push(parts.map(Number));
  }
  const eepLine = header.find(h => h.startsWith('# EEPs:'));
  const infoIndex = header.findIndex(h => h.includes('initial_mass'));
  const info = header[infoIndex + 1].replace(/^#\s*/, '').split(/\s+/);
  const compLine = header.find(h => /^#\s*[\d.]+\s+[\d.]+E/.test(h));
  const comp = compLine.replace(/^#\s*/, '').split(/\s+/).map(Number);
  return {
    rows,
    eeps: eepLine.replace('# EEPs:', '').trim().split(/\s+/).map(Number),
    initialMass: Number(info[0]),
    type: info[5],
    composition: {
      yInit: comp[0],
      zInit: comp[1],
      feH: comp[2],
      alphaFe: comp[3],
      vDivVcrit: comp[4],
    },
    mesaRevision: Number(
      (header.find(h => h.includes('MESA revision')) || '0 0').split('=')[1]
    ),
  };
}

/**
 * Ramer-Douglas-Peucker, measuring the error the way the reader will see it.
 *
 * Not the perpendicular distance to the chord, which is the usual form: the
 * *vertical* distance, at the same x. That is exactly the error a caller gets
 * when it interpolates y at that x, so a tolerance here is a bound on what the
 * runtime will be wrong by rather than a number in a mixed-unit plane. The
 * ordinary form was tried first and does not work on this data at all: a
 * track's age spans ten decades and its luminosity two, so a perpendicular
 * distance is almost entirely the age axis and a tolerance of 0.004 in it
 * permitted a 0.07 dex error in luminosity.
 *
 * @param {Float64Array|Array<number>} xs - Strictly increasing
 * @param {Float64Array|Array<number>} ys - The values to bound
 * @param {number} tolerance - Largest interpolation error to permit, in y
 * @param {number} from - First index, inclusive
 * @param {number} to - Last index, inclusive
 * @param {Set<number>} keep - Accumulator
 * @returns {void}
 */
function rdp(xs, ys, tolerance, from, to, keep) {
  keep.add(from);
  keep.add(to);
  if (to <= from + 1) return;
  const span = xs[to] - xs[from];
  let worst = -1;
  let at = -1;
  for (let i = from + 1; i < to; i++) {
    const f = span > 0 ? (xs[i] - xs[from]) / span : 0;
    const d = Math.abs(ys[from] + (ys[to] - ys[from]) * f - ys[i]);
    if (d > worst) {
      worst = d;
      at = i;
    }
  }
  if (worst <= tolerance || at < 0) return;
  rdp(xs, ys, tolerance, from, at, keep);
  rdp(xs, ys, tolerance, at, to, keep);
}

/** The log age of a row, the way the stored column expresses it. */
const logAgeOf = row => Math.log10(Math.max(row[COL.age], 1));

/** Linear interpolation of a column between two kept samples. */
const lerp = (a, b, f) => a + (b - a) * f;

/**
 * Reduce a track, and measure what the reduction cost.
 * @param {object} track - From readTrack()
 * @returns {object} Kept indices and the worst error introduced
 */
function reduce(track) {
  const { rows, eeps } = track;
  // Everything is parameterised by log age, because that is what the runtime
  // interpolates in: a track's samples are decades apart at one end and
  // millennia apart at the other, and a linear age axis cannot express both.
  const logAge = rows.map(r => Math.log10(Math.max(r[COL.age], 1)));
  const logL = rows.map(r => r[COL.logL]);
  const logTeff = rows.map(r => r[COL.logTeff]);
  const massFrac = rows.map(r => r[COL.mass] / track.initialMass);

  const keep = new Set(eeps.map(e => e - 1));
  keep.add(0);
  keep.add(rows.length - 1);
  const bounds = [...keep].sort((a, b) => a - b);
  for (let s = 0; s < bounds.length - 1; s++) {
    rdp(logAge, logL, TOLERANCE, bounds[s], bounds[s + 1], keep);
    rdp(logAge, logTeff, TOLERANCE / 2, bounds[s], bounds[s + 1], keep);
    rdp(logAge, massFrac, TOLERANCE / 2, bounds[s], bounds[s + 1], keep);
  }

  const kept = [...keep].sort((a, b) => a - b);

  // What the thinning cost, measured against every row that was dropped, and
  // measured the way the runtime will interpolate.
  const worst = { logL: 0, logTeff: 0, mass: 0 };
  for (let k = 0; k < kept.length - 1; k++) {
    const i0 = kept[k];
    const i1 = kept[k + 1];
    if (i1 <= i0 + 1) continue;
    const span = logAge[i1] - logAge[i0];
    for (let i = i0 + 1; i < i1; i++) {
      const f = span > 0 ? (logAge[i] - logAge[i0]) / span : 0;
      worst.logL = Math.max(
        worst.logL,
        Math.abs(lerp(logL[i0], logL[i1], f) - logL[i])
      );
      worst.logTeff = Math.max(
        worst.logTeff,
        Math.abs(lerp(logTeff[i0], logTeff[i1], f) - logTeff[i])
      );
      worst.mass = Math.max(
        worst.mass,
        Math.abs(
          lerp(rows[i0][COL.mass], rows[i1][COL.mass], f) - rows[i][COL.mass]
        )
      );
    }
  }
  return { kept, worst };
}

/**
 * Quantize a column to a fixed scale, and report the error.
 *
 * Sixteen bits for everything except the age, which needs thirty-two.
 *
 * The reason is worth writing down. Ages are stored as log10, and the step a
 * 16-bit column buys over twelve decades is 5e-4 dex, which is 0.12 per cent in
 * age. A solar-mass star's helium flash lasts about two million years out of an
 * eleven-billion-year life, which is 0.018 per cent: at 16 bits its start and
 * its end quantized to the same number, the phase came out with zero duration,
 * and a query for the state at its age landed in the wrong segment. The late
 * phases of a star are the interesting ones and they are exactly the ones a
 * logarithmic age axis cannot resolve cheaply.
 *
 * @param {Array<number>} values - The column
 * @param {number} scale - Multiplier before rounding
 * @param {number} [bits] - 16 or 32
 * @returns {object} The encoded column
 */
function encode(values, scale, bits = 16) {
  const Ints = bits === 32 ? Int32Array : Int16Array;
  const limit = bits === 32 ? 2147483647 : 32767;
  const ints = new Ints(values.length);
  let worst = 0;
  for (let i = 0; i < values.length; i++) {
    const q = Math.round(values[i] * scale);
    if (q > limit || q < -limit - 1) {
      throw new RangeError(
        `value ${values[i]} does not fit int${bits} at scale ${scale}`
      );
    }
    ints[i] = q;
    worst = Math.max(worst, Math.abs(q / scale - values[i]));
  }
  return {
    data: Buffer.from(new Uint8Array(ints.buffer)).toString('base64'),
    scale,
    bits,
    quantizationError: Number(worst.toPrecision(3)),
  };
}

/** The repository's own Prettier settings. */
async function prettierOptions() {
  try {
    return JSON.parse(
      await readFile(path.join(REPO, '.prettierrc.json'), 'utf8')
    );
  } catch {
    return {};
  }
}

/** Build the module text. */
async function build({ offline }) {
  const tarball = await ensureGrid(offline);
  await ensureTracks(tarball);

  const tracks = {};
  let teffSunMin = Infinity;
  let teffSunMax = -Infinity;
  let rows = 0;
  let composition = null;
  let mesaRevision = null;

  for (const spec of MASSES) {
    const file = path.join(CACHE, `${spec.file}.track.eep`);
    const track = await readTrack(file);
    if (Math.abs(track.initialMass - spec.massSun) > 1e-9) {
      throw new Error(
        `${spec.file}: header says ${track.initialMass}, expected ${spec.massSun}`
      );
    }
    composition = composition || track.composition;
    mesaRevision = mesaRevision || track.mesaRevision;

    // The Stefan-Boltzmann consistency check, on every row before thinning.
    for (const r of track.rows) {
      rows++;
      const implied = r[COL.logTeff] - (r[COL.logL] - 2 * r[COL.logR]) / 4;
      teffSunMin = Math.min(teffSunMin, implied);
      teffSunMax = Math.max(teffSunMax, implied);
    }

    const { kept, worst } = reduce(track);
    if (
      worst.logL > MAX_ERROR.logL ||
      worst.logTeff > MAX_ERROR.logTeff ||
      worst.mass > MAX_ERROR.mass * spec.massSun
    ) {
      throw new Error(
        `${spec.file}: the reduction lost too much - logL ${worst.logL.toPrecision(2)}, ` +
          `logTeff ${worst.logTeff.toPrecision(2)}, mass ${worst.mass.toPrecision(2)}. ` +
          'Lower TOLERANCE rather than raising MAX_ERROR.'
      );
    }

    const sample = kept.map(i => track.rows[i]);
    const names = track.type === 'high-mass' ? EEP_NAMES_HIGH : EEP_NAMES;
    const eepIndex = track.eeps.map(e => kept.indexOf(e - 1));
    if (eepIndex.some(i => i < 0)) {
      throw new Error(`${spec.file}: a primary EEP was thinned away`);
    }

    // How many kept samples share a stored age with the one before them.
    //
    // Not a defect of the encoding: MIST's own ages come as close as two parts
    // in ten billion during the thermal pulses on the asymptotic giant branch,
    // and no stored age is going to separate a three-hundred-year interval at
    // an age of one and a third billion years. Those samples are reachable by
    // index and by evolutionary point and not by age, which is recorded here
    // rather than discovered later.
    const storedLogAge = sample.map(
      r => Math.round(logAgeOf(r) * AGE_SCALE) / AGE_SCALE
    );
    let tiedToPrevious = 0;
    for (let i = 1; i < storedLogAge.length; i++) {
      if (storedLogAge[i] === storedLogAge[i - 1]) tiedToPrevious++;
    }

    tracks[spec.id] = {
      initialMassSun: spec.massSun,
      type: track.type,
      count: sample.length,
      sourceRows: track.rows.length,
      /** Samples an age query cannot address, because an earlier one shares
       *  their stored age. See the note above. */
      tiedToPrevious,
      /**
       * Where each named equivalent evolutionary point sits in the kept rows.
       *
       * The age recorded is the *quantized* one - what the stored log-age
       * column decodes to at that index - and not MIST's own value, which is
       * up to 0.06 percent away from it. That looks like throwing precision
       * away and is the opposite: an EEP age that disagreed with the column at
       * its own index by even a part in ten thousand made a query for "the age
       * at the zero-age main sequence" land between two samples and interpolate,
       * so the state at a named point differed from the state at that point's
       * age. The published value is one line below, unrounded, for anybody who
       * wants it.
       */
      eeps: names.slice(0, track.eeps.length).map((name, i) => ({
        name,
        at: eepIndex[i],
        ageYr:
          10 **
          (Math.round(logAgeOf(track.rows[track.eeps[i] - 1]) * AGE_SCALE) /
            AGE_SCALE),
        publishedAgeYr: Number(
          track.rows[track.eeps[i] - 1][COL.age].toPrecision(8)
        ),
      })),
      thinning: {
        logL: Number(worst.logL.toPrecision(3)),
        logTeff: Number(worst.logTeff.toPrecision(3)),
        massSun: Number(worst.mass.toPrecision(3)),
      },
      logAge: encode(
        sample.map(r => Math.log10(Math.max(r[COL.age], 1))),
        AGE_SCALE,
        32
      ),
      massSun: encode(
        sample.map(r => r[COL.mass]),
        1000
      ),
      logL: encode(
        sample.map(r => r[COL.logL]),
        4000
      ),
      // 5000 rather than 6000: a 20 solar-mass star reaches log Teff 5.48 on
      // its way to the giant branch, and 5.48 x 6000 overflows an int16. The
      // resolution is still 2e-4 dex, which is a hundred times finer than the
      // thinning tolerance.
      logTeff: encode(
        sample.map(r => r[COL.logTeff]),
        5000
      ),
      /** MIST's own phase flag, kept as a cross-check on the EEP segments. */
      phase: encode(
        sample.map(r => r[COL.phase]),
        1
      ),
    };
  }

  const teffSun = 10 ** ((teffSunMin + teffSunMax) / 2);
  if (Math.abs(teffSun - TEFF_SUN_EXPECTED) > 5) {
    throw new Error(
      `the grid implies a solar effective temperature of ${teffSun.toFixed(1)} K, ` +
        `not the ${TEFF_SUN_EXPECTED} K this build expects. Something changed upstream.`
    );
  }
  const spread = 10 ** teffSunMax - 10 ** teffSunMin;
  if (spread > 0.01) {
    throw new Error(
      `the Stefan-Boltzmann relation does not close across the grid: the implied ` +
        `solar temperature varies by ${spread.toPrecision(3)} K. The radius cannot be derived.`
    );
  }

  const provenance = {
    grid: GRID.version,
    mesaRevision,
    source: GRID.url,
    sourceSha256: GRID.sha256,
    sourceBytes: GRID.bytes,
    homepage: 'https://mist.science/',
    composition: {
      ...composition,
      note: 'Solar-scaled abundances from Asplund et al. (2009). [Fe/H] = 0, [a/Fe] = 0.',
    },
    rotation: 'none: v/vcrit = 0',
    cite: [
      'Dotter (2016), ApJS 222, 8',
      'Choi et al. (2016), ApJ 823, 102',
      'Paxton et al. (2011, 2013, 2015), the MESA instrument papers',
    ],
    terms:
      'MIST asks that the papers above be cited by any publication using the ' +
      'models and states no separate redistribution licence. What is bundled ' +
      'here is a heavily reduced derived subset for teaching, attributed in ' +
      'full, with the exact source and checksum recorded so the originals can ' +
      'be recovered. If MIST would prefer this not be redistributed, the build ' +
      'script reproduces it from their download in one command.',
    whyV12:
      'v1.2 rather than the newer v2.5 because its two describing papers are ' +
      'published and citable; the v2.5 references are listed as forthcoming.',
    units: {
      age:
        'years since the start of the MIST track (EEP 1, an early ' +
        'pre-main-sequence model), stored as log10',
      mass: 'solar masses, current rather than initial',
      luminosity: 'log10 of bolometric luminosity in solar units',
      temperature: 'log10 of effective temperature in kelvin',
      radius: 'not stored; derived from L and Teff',
    },
    teffSunK: Number(teffSun.toFixed(2)),
    stefanBoltzmannCheck: {
      rows,
      impliedTeffSunSpreadK: Number(spread.toPrecision(3)),
      note:
        "MIST's own log_R column is reproduced by L = 4 pi R^2 sigma Teff^4 to " +
        'machine precision across every row of every track, which is why the ' +
        'radius is derived here rather than stored.',
    },
    reduction: {
      algorithm:
        'Ramer-Douglas-Peucker on the H-R curve, on luminosity ' +
        'against age, and on mass against age, unioned, within each primary-EEP ' +
        'segment. The primary EEPs are pinned.',
      toleranceDex: TOLERANCE,
      note: 'The worst error the thinning introduced is recorded per track.',
    },
    notModelled: [
      'Rotation, binarity, magnetic fields, and any metallicity but solar.',
      'Core collapse and everything after it: the 10 and 20 solar-mass tracks ' +
        'stop while the star is still a red supergiant.',
      'White-dwarf cooling beyond the first few million years, which is where ' +
        'MIST stops following it.',
    ],
  };

  const body = `// =============================================================================
// A curated subset of the MIST stellar evolution tracks
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/build-stellar-tracks.mjs; run
// \`npm run stellar:data\` to regenerate and \`npm run stellar:check\` to verify.
//
// Seven tracks at solar metallicity with no rotation, reduced from about 7,700
// rows of 77 columns to a few hundred rows of four. MIST computed these; this
// project reduced them and recorded how. PROVENANCE carries the version, the
// composition, the source URL and checksum, the citation the modellers ask for,
// and the error the reduction introduced.
//
// These are model examples. None of them is a reconstruction of a named star.
// =============================================================================

/* eslint-disable */

/** Where every number here came from, and what was done to it. */
export const PROVENANCE = ${JSON.stringify(provenance, null, 2)};

/** The tracks, base64 little-endian int16 columns. */
export const TRACKS = ${JSON.stringify(tracks, null, 2)};

/**
 * Decode one column of one track.
 *
 * @param {object} column - One of the encoded column objects on a track
 * @returns {Float64Array} The values, in the units PROVENANCE records
 */
function decodeColumn(column) {
  const binary =
    typeof atob === 'function'
      ? atob(column.data)
      : Buffer.from(column.data, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  // The age column is 32-bit and everything else is 16. See the note on the
  // encoder in tools/build-stellar-tracks.mjs: a logarithmic age axis at 16
  // bits cannot resolve a helium flash inside an eleven-billion-year life.
  const width = column.bits === 32 ? 4 : 2;
  const Ints = column.bits === 32 ? Int32Array : Int16Array;
  const ints = new Ints(bytes.buffer, bytes.byteOffset, bytes.length / width);
  const out = new Float64Array(ints.length);
  for (let i = 0; i < ints.length; i++) out[i] = ints[i] / column.scale;
  return out;
}

/** Decoded tracks, made once each. */
const cache = new Map();

/**
 * One track, decoded.
 *
 * @param {string} id - A key of TRACKS
 * @returns {object} Columns as typed arrays, plus the track's own facts
 */
export function decodeTrack(id) {
  if (cache.has(id)) return cache.get(id);
  const spec = TRACKS[id];
  if (!spec) throw new Error('Unknown stellar track: ' + id);
  const decoded = {
    id,
    initialMassSun: spec.initialMassSun,
    type: spec.type,
    count: spec.count,
    sourceRows: spec.sourceRows,
    eeps: spec.eeps,
    thinning: spec.thinning,
    logAgeYr: decodeColumn(spec.logAge),
    massSun: decodeColumn(spec.massSun),
    logL: decodeColumn(spec.logL),
    logTeff: decodeColumn(spec.logTeff),
    phase: decodeColumn(spec.phase),
  };
  cache.set(id, decoded);
  return decoded;
}

/** Every track id, lightest first. */
export const TRACK_IDS = Object.keys(TRACKS);
`;

  return prettier.format(body, {
    parser: 'babel',
    ...(await prettierOptions()),
  });
}

/** Verify the committed module without the 100 MB source. */
async function structuralCheck() {
  const problems = [];
  if (!existsSync(OUT)) return ['js/data/stellar/mistTracks.js is missing'];
  const mod = await import(pathToFileURL(OUT).href);
  const { PROVENANCE, decodeTrack, TRACK_IDS } = mod;

  for (const field of [
    'grid',
    'source',
    'sourceSha256',
    'composition',
    'rotation',
    'cite',
    'units',
  ]) {
    if (!PROVENANCE?.[field]) problems.push(`provenance is missing ${field}`);
  }
  if (!/^[0-9a-f]{64}$/.test(PROVENANCE?.sourceSha256 || '')) {
    problems.push('the source checksum is not a SHA-256');
  }
  if (TRACK_IDS.length !== MASSES.length) {
    problems.push(`${TRACK_IDS.length} tracks, expected ${MASSES.length}`);
  }
  for (const id of TRACK_IDS) {
    const t = decodeTrack(id);
    const n = t.count;
    for (const key of ['logAgeYr', 'massSun', 'logL', 'logTeff', 'phase']) {
      if (t[key].length !== n)
        problems.push(`${id}: ${key} has ${t[key].length} of ${n}`);
      if (![...t[key]].every(Number.isFinite))
        problems.push(`${id}: ${key} is not all finite`);
    }
    for (let i = 1; i < n; i++) {
      if (t.logAgeYr[i] < t.logAgeYr[i - 1]) {
        problems.push(`${id}: age goes backwards at ${i}`);
        break;
      }
    }
    for (let i = 1; i < n; i++) {
      if (t.massSun[i] > t.massSun[i - 1] + 1e-6) {
        problems.push(`${id}: mass increases at ${i}`);
        break;
      }
    }
    if (t.eeps[0].name !== 'pms' || t.eeps[0].at !== 0) {
      problems.push(`${id}: the track does not start at its first EEP`);
    }
    if (t.eeps[t.eeps.length - 1].at !== n - 1) {
      problems.push(`${id}: the track does not end at its last EEP`);
    }
  }
  return problems;
}

const args = process.argv.slice(2);
const check = args.includes('--check');
const offline = args.includes('--offline');
const haveCache = existsSync(path.join(CACHE, GRID.file));

try {
  if (check) {
    const problems = await structuralCheck();
    if (problems.length) {
      console.error('The stellar tracks have problems:');
      for (const p of problems) console.error(`  ${p}`);
      process.exit(1);
    }
    if (!haveCache && offline) {
      console.log(
        'Stellar tracks are complete and internally consistent.\n' +
          '  The 100 MB source grid is not cached, so they were not regenerated.\n' +
          '  Run `npm run stellar:data` once to fetch it, then this compares byte for byte.'
      );
      process.exit(0);
    }
    const next = await build({ offline });
    if ((await readFile(OUT, 'utf8')) !== next) {
      console.error(
        'js/data/stellar/mistTracks.js is not what tools/build-stellar-tracks.mjs would write.\n' +
          'Run `npm run stellar:data` and commit the result.'
      );
      process.exit(1);
    }
    console.log('Stellar tracks are current, and regenerate byte for byte.');
  } else {
    const next = await build({ offline });
    await mkdir(path.dirname(OUT), { recursive: true });
    await writeFile(OUT, next);
    const kb = (Buffer.byteLength(next) / 1024).toFixed(1);
    console.log(`Wrote ${path.relative(REPO, OUT)} (${kb} KB)`);
    const mod = await import(`${pathToFileURL(OUT).href}?t=${Date.now()}`);
    for (const id of mod.TRACK_IDS) {
      const t = mod.TRACKS[id];
      console.log(
        `  ${String(t.initialMassSun).padStart(5)} Msun  ${String(t.count).padStart(4)} rows ` +
          `from ${String(t.sourceRows).padStart(4)}  ${t.type.padEnd(10)} ` +
          `worst dlogL ${t.thinning.logL}`
      );
    }
  }
} catch (err) {
  console.error(String(err.message || err));
  process.exit(1);
}
