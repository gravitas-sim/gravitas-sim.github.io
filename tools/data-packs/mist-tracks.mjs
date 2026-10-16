// =============================================================================
// A curated subset of the MIST stellar evolution tracks, as a data pack
// -----------------------------------------------------------------------------
//   npm run stellar:data         fetch what is missing, reduce, write the module
//                                and data-packs/mist-v12-tracks.json
//   npm run stellar:check        verify both, no network
//   npm run stellar:provenance   rebuild both from the cached grid and compare
//
// Those commands run tools/build-stellar-tracks.mjs, which hands this pack to
// tools/build-data-packs.mjs runDataset(): the build, check and rebuild every
// data pack goes through (DATA_PACKS.md). Until Roadmap II Prompt 62 this was
// a builder of its own whose fresh download was used unchecked - it compared
// the grid's SHA-256 only when the tarball was already cached - and whose
// record was a PROVENANCE object inside the module the browser loads. The
// tarball is checked against its pin on every read now, fresh or cached
// (tools/data-packs/pinned.mjs), the eight tracks are extracted from it into a
// fresh directory on every build rather than read from whatever an earlier
// run left in the cache, and the record is the pack manifest.
//
// MIST is a model, not an observation (origin: model), and the manifest and
// the runtime copy both say so.
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

import { Buffer } from 'node:buffer';
import process from 'node:process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const cacheDir = () =>
  process.env.GRAVITAS_MIST_CACHE
    ? path.resolve(process.env.GRAVITAS_MIST_CACHE)
    : path.join(REPO, '.mist-cache');

/**
 * The tool version that wrote the pack. A change to what this file writes
 * bumps it, and packs:check fails on a manifest that names another.
 */
export const TRANSFORM_VERSION = '1.0.0';

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
 * The eight masses, in units of a hundredth of a solar mass, which is how MIST
 * names its files. Every one is a grid point: none of these is interpolated.
 *
 * The 40 solar-mass track is here for one reason: an endpoint. The published
 * explodability studies put 10 solar masses confidently among the stars that
 * explode and leave a neutron star, and 20 near a boundary where the answer
 * depends on which engine is used - which is worth teaching, but is not a
 * black hole. 40 is where those studies agree, so it is what the black-hole
 * pathway is built on rather than an assertion with no track behind it.
 */
const MASSES = [
  { file: '00020M', massSun: 0.2, id: 'm020' },
  { file: '00050M', massSun: 0.5, id: 'm050' },
  { file: '00100M', massSun: 1, id: 'm100' },
  { file: '00200M', massSun: 2, id: 'm200' },
  { file: '00500M', massSun: 5, id: 'm500' },
  { file: '01000M', massSun: 10, id: 'm1000' },
  { file: '02000M', massSun: 20, id: 'm2000' },
  { file: '04000M', massSun: 40, id: 'm4000' },
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
 * catalog.
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
 * Pull the eight tracks out of the pinned tarball, into a fresh directory.
 * @param {string} tarball - Path to the archive
 * @returns {Promise<string>} The directory they are in
 */
async function extractTracks(tarball) {
  const dir = await mkdtemp(path.join(tmpdir(), 'gravitas-mist-'));
  const stem = GRID.file.replace('.txz', '');
  await run('tar', [
    '-xJf',
    tarball,
    '--strip-components=1',
    '-C',
    dir,
    ...MASSES.map(m => `${stem}/${m.file}.track.eep`),
  ]);
  return dir;
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

/** The tarball's pin, as the manifest records it. */
const RAW = [
  {
    file: GRID.file,
    url: GRID.url,
    bytes: GRID.bytes,
    sha256: GRID.sha256,
  },
];

/**
 * What the pack cites: the two MIST papers MIST's references page asks for
 * (read 2026-10-01), the MESA instrument papers and the solar abundances.
 * Each DOI resolved through Crossref on 2026-10-01.
 */
const CITATIONS = [
  {
    text: 'Dotter 2016, ApJS 222, 8 (MIST 0)',
    doi: '10.3847/0067-0049/222/1/8',
  },
  {
    text: 'Choi et al. 2016, ApJ 823, 102 (MIST I)',
    doi: '10.3847/0004-637X/823/2/102',
  },
  {
    text: 'Paxton et al. 2011, ApJS 192, 3 (MESA)',
    doi: '10.1088/0067-0049/192/1/3',
  },
  {
    text: 'Paxton et al. 2013, ApJS 208, 4 (MESA)',
    doi: '10.1088/0067-0049/208/1/4',
  },
  {
    text: 'Paxton et al. 2015, ApJS 220, 15 (MESA)',
    doi: '10.1088/0067-0049/220/1/15',
  },
  {
    text: 'Asplund et al. 2009, ARA&A 47, 481 (the solar abundances MIST scales)',
    doi: '10.1146/annurev.astro.46.060407.145222',
  },
];

/** What the age column counts from, as the readout says it. */
const AGE_ZERO =
  'years since the start of the MIST track (EEP 1, an early ' +
  'pre-main-sequence model), stored as log10';

/**
 * The pack's runtime metadata and the rest of its manifest, from the grid.
 * @param {Uint8Array[]} raw - The tarball, pinned (its bytes are not read
 *   here: tar reads the cached file, which pinned.mjs has just checked)
 */
async function build(raw) {
  if (!raw[0]?.length) throw new Error('the MIST grid was not read');
  const dir = await extractTracks(path.join(cacheDir(), GRID.file));
  try {
    const tracks = {};
    let teffSunMin = Infinity;
    let teffSunMax = -Infinity;
    let rows = 0;
    let composition = null;
    let mesaRevision = null;

    for (const spec of MASSES) {
      const file = path.join(dir, `${spec.file}.track.eep`);
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
          // Twelve significant digits: `10 **` is not correctly rounded, and
          // Node 20 and Node 24 disagree in its last bit, so the unrounded power
          // made a file only one of them could regenerate. A part in 1e12 is far
          // inside what landing on the sample needs.
          ageYr: Number(
            (
              10 **
              (Math.round(logAgeOf(track.rows[track.eeps[i] - 1]) * AGE_SCALE) /
                AGE_SCALE)
            ).toPrecision(12)
          ),
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
        // A fraction of the initial mass rather than a mass. Bounded between 0
        // and 1 for every track however heavy, so adding a 40 solar-mass star
        // does not overflow a column scaled for a 20 solar-mass one - which it
        // did. At this scale the resolution is 3e-5 of the initial mass, which
        // for the heaviest track is about a thousandth of a solar mass.
        massFraction: encode(
          sample.map(r => r[COL.mass] / track.initialMass),
          30000
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

    const model = {
      name: GRID.version,
      mesaRevision,
      composition: {
        ...composition,
        note: 'Solar-scaled abundances from Asplund et al. (2009). [Fe/H] = 0, [a/Fe] = 0.',
      },
      rotation: 'none: v/vcrit = 0',
      ageZeroPoint: AGE_ZERO,
    };
    const meta = {
      id: 'mist-v12-tracks',
      version: '1.0.0',
      title:
        'MIST v1.2 evolutionary tracks: eight model stars at solar metallicity',
      object: {
        name: 'Eight model stars of 0.2 to 40 solar masses',
        identifiers: MASSES.map(m => `${m.massSun} Msun`),
      },
      facility: {
        observatory: 'MIST (MESA Isochrones and Stellar Tracks)',
        instrument: `MESA r${mesaRevision}`,
        pipeline: 'MIST v1.2 EEP tracks, [Fe/H] = 0, [a/Fe] = 0, v/vcrit = 0',
      },
      dataType: 'model-grid',
      origin: 'model',
      credit: 'MIST v1.2 (Dotter 2016; Choi et al. 2016)',
      license: {
        status: 'no-license-stated',
        statement:
          'MIST asks that Dotter 2016 and Choi et al. 2016 be cited by any publication using the models, and states no separate redistribution license.',
        basis:
          'What is bundled here is a heavily reduced derived subset for teaching, attributed in full, with the exact source and checksum recorded so the originals can be recovered. If MIST would prefer this not be redistributed, the build script reproduces it from their download in one command.',
      },
      retrieved: '2026-10-01',
      columns: [
        {
          name: 'log age',
          unit: 'dex',
          description: `log10 of ${AGE_ZERO.replace(', stored as log10', '')}`,
        },
        { name: 'mass', unit: 'Msun', description: 'current, not initial' },
        {
          name: 'log L',
          unit: 'dex',
          description: 'log10 of bolometric luminosity in solar units',
        },
        {
          name: 'log Teff',
          unit: 'dex',
          description: 'log10 of effective temperature in kelvin',
        },
        { name: 'phase', unit: '', description: 'MIST’s own phase flag' },
      ],
      masks: [],
      reductions: [
        `Thinned from about 7,700 rows of 77 columns to a few hundred rows of four, within ${TOLERANCE} dex of the curve, with the primary evolutionary points kept; the worst error is recorded on each track.`,
        'The radius is not stored: it follows from L and Teff, which MIST’s own radii satisfy to machine precision.',
      ],
      model,
    };

    const manifestRest = {
      source: {
        archive: 'MIST',
        urls: [
          'https://mist.science/',
          GRID.url,
          'https://mist.science/references.html',
        ],
        citations: CITATIONS,
        terms: [
          'https://mist.science/references.html: “Please cite the following papers in a publication that makes use of the MIST models” - Dotter 2016 and Choi et al. 2016, then two MIST v2 papers listed without a volume (read 2026-10-01). No data licence is stated on the site; its pages carry a website footer, “© MIST. All rights reserved”.',
        ],
      },
      raw: RAW,
      transformation: {
        script: 'tools/data-packs/mist-tracks.mjs',
        version: TRANSFORM_VERSION,
        options: {
          toleranceDex: TOLERANCE,
          maxError: MAX_ERROR,
          ageScale: AGE_SCALE,
        },
        steps: [
          'Extract the eight .track.eep files from the pinned tarball and read age, current mass, log L, log Teff, log R and the phase flag.',
          'Check the Stefan-Boltzmann relation closes on every row: the solar effective temperature MIST’s columns imply must be 5772 K to within 5 K, with a spread under 0.01 K, or the radius cannot be derived and the build refuses.',
          'Thin each track by Ramer-Douglas-Peucker on the H-R curve, on luminosity against age, and on mass against age, unioned, within each primary-EEP segment, keeping the primary EEPs.',
          'Refuse a reduction worse than the stated error in any stored quantity, and record the worst per track.',
          'Encode: log age as 32-bit integers at 1e-7, the mass as a fraction of the initial mass and log L, log Teff and the phase as 16-bit integers.',
        ],
        record: {
          teffSunK: Number(teffSun.toFixed(2)),
          stefanBoltzmannCheck: {
            rows,
            impliedTeffSunSpreadK: Number(spread.toPrecision(3)),
            note: "MIST's own log_R column is reproduced by L = 4 pi R^2 sigma Teff^4 to machine precision across every row of every track, which is why the radius is derived here rather than stored.",
          },
        },
      },
      whyV12:
        'v1.2 rather than the newer v2.5 because its two describing papers are published and citable; the v2.5 references are listed as forthcoming.',
      notModeled: [
        'Rotation, binarity, magnetic fields, and any metallicity but solar.',
        'Core collapse and everything after it: the 10 and 20 solar-mass tracks stop while the star is still a red supergiant.',
        'White-dwarf cooling beyond the first few million years, which is where MIST stops following it.',
      ],
      assumptions: [
        'These are model examples. None of them is a reconstruction of a named star.',
        'Every track is a grid model: nothing is interpolated between masses at build time and nothing is extrapolated past where MESA stopped.',
      ],
      compatible: {
        widgets: [
          'stellar-lab',
          'stellar-compare',
          'stellar-population',
          'stellar-evolution',
        ],
        investigations: ['a-universe-of-stars', 'lives-of-stars'],
      },
      offline: 'core',
    };

    return {
      meta,
      manifestRest,
      render: PACK => renderModule(PACK, tracks),
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The module the browser loads: PACK and the tracks. */
async function renderModule(PACK, tracks) {
  const body = `// =============================================================================
// A curated subset of the MIST stellar evolution tracks
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/data-packs/mist-tracks.mjs; run
// \`npm run stellar:data\` to regenerate and \`npm run stellar:check\` to verify.
//
// Eight tracks at solar metallicity with no rotation, reduced from about 7,700
// rows of 77 columns to a few hundred rows of four. MIST computed these; this
// project reduced them and recorded how, in the data pack's manifest,
// data-packs/mist-v12-tracks.json: the version, the composition, the source
// URL and checksum, the citations the modelers ask for, and the error the
// reduction introduced. PACK is that manifest's runtime fields.
//
// These are model examples. None of them is a reconstruction of a named star.
// =============================================================================

/* eslint-disable */

/** What the data is and who to credit, as an interface shows it. */
export const PACK = ${JSON.stringify(PACK, null, 2)};

/** The tracks, base64 little-endian int16 columns. */
export const TRACKS = ${JSON.stringify(tracks, null, 2)};

/**
 * Turn a fraction column back into the quantity it is a fraction of.
 *
 * @param {Float64Array} column - Fractions
 * @param {number} of - What they are fractions of
 * @returns {Float64Array} The quantity
 */
function scaleColumn(column, of) {
  const out = new Float64Array(column.length);
  for (let i = 0; i < column.length; i++) out[i] = column[i] * of;
  return out;
}

/**
 * Decode one column of one track.
 *
 * @param {object} column - One of the encoded column objects on a track
 * @returns {Float64Array} The values, in the units PACK.columns gives
 */
function decodeColumn(column) {
  const binary =
    typeof atob === 'function'
      ? atob(column.data)
      : Buffer.from(column.data, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  // The age column is 32-bit and everything else is 16. See the note on the
  // encoder in tools/data-packs/mist-tracks.mjs: a logarithmic age axis at 16
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
    massSun: scaleColumn(decodeColumn(spec.massFraction), spec.initialMassSun),
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

  return (await import('prettier')).format(body, {
    parser: 'babel',
    ...(await prettierOptions()),
  });
}

/** Verify a module against its manifest without the 100 MB source. */
function check(mod, manifest) {
  const problems = [];
  const { PACK, decodeTrack, TRACK_IDS } = mod;
  if (PACK?.origin !== 'model')
    problems.push('PACK does not say this is a model');
  for (const field of ['name', 'composition', 'rotation', 'ageZeroPoint']) {
    if (!PACK?.model?.[field]) problems.push(`PACK.model is missing ${field}`);
  }
  if (!manifest.notModeled?.length)
    problems.push('the manifest says nothing of what is not modelled');
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

/**
 * The scientific check, on the committed tracks: the one solar-mass track at
 * the Sun's age is the Sun, to within what a model grid and a 4.57 Gyr age
 * can promise.
 */
function validate(mod) {
  const t = mod.decodeTrack('m100');
  // Interpolate in log age, as js/stellar/tracks.js does.
  const target = Math.log10(4.57e9);
  let i = 1;
  while (i < t.count - 1 && t.logAgeYr[i] < target) i++;
  const f = (target - t.logAgeYr[i - 1]) / (t.logAgeYr[i] - t.logAgeYr[i - 1]);
  const at = col => col[i - 1] + (col[i] - col[i - 1]) * f;
  const logL = Number(at(t.logL).toFixed(4));
  const logTeff = Number(at(t.logTeff).toFixed(4));
  return {
    check:
      'the 1 solar-mass track at 4.57 Gyr is within 0.1 dex of the Sun’s luminosity and 0.01 dex of its effective temperature',
    against: [
      {
        quantity: 'log L/Lsun of the Sun',
        value: 0,
        unit: 'dex',
        ref: 'by definition',
      },
      {
        quantity: 'log Teff of the Sun',
        value: Number(Math.log10(5772).toFixed(4)),
        unit: 'dex',
        ref: 'IAU 2015 Resolution B3 nominal solar effective temperature, 5772 K',
      },
      {
        quantity: 'age of the Sun',
        value: 4.57,
        unit: 'Gyr',
        ref: 'the age these checks are made at',
      },
    ],
    result: { logL, logTeff },
    ok: Math.abs(logL) <= 0.1 && Math.abs(logTeff - Math.log10(5772)) <= 0.01,
  };
}

/** The pack, as tools/build-data-packs.mjs builds, checks and rebuilds it. */
export const MIST_TRACKS = {
  id: 'mist-v12-tracks',
  label: 'The MIST tracks',
  manifest: 'data-packs/mist-v12-tracks.json',
  capability: null,
  module: 'js/data/stellar/mistTracks.js',
  transformVersion: TRANSFORM_VERSION,
  raw: RAW,
  cache: cacheDir,
  refetch: 'npm run stellar:data',
  ownCommands: true,
  build,
  decode: mod => mod,
  check,
  validate,
};
