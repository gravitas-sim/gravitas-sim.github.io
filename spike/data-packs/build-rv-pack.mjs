// Spike: a developer tool that turns a public HARPS radial-velocity series
// into a pinned compact derivative and its gravitas.observation-data-pack/1
// manifest.
//
//   node spike/data-packs/build-rv-pack.mjs --cache <dir> [--star HD75289] [--fetch]
//
// Source: the HARPS RV bank (Trifonov et al. 2020, A&A 636, A74), SERVAL
// velocities corrected for nightly zero points, served by CDS VizieR. Only
// the five columns the derivative needs are asked for, for one star.
//
// What is pinned. A VizieR response is not byte-stable: its header carries
// the request date, so the SHA-256 of the file as served changes on every
// fetch. The pin is over the data rows - every line that is not a # comment,
// in order, exactly as served - and the file as retrieved is hashed too, for
// the record, but is not what a re-fetch is compared against.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// Published orbits, for the sanity check only; neither is written into the
// derivative. From the NASA Exoplanet Archive's planetary-systems table,
// queried 2026-09-24. HD 179949 b's published K runs from 102.2 m/s (Tinney
// et al. 2001) to 118.1 (Rosenthal et al. 2021), so the check's tolerance is
// the spread of the literature, not the quoted error of one paper.
const STARS = {
  HD75289: {
    rowsSha256: 'cf5359e717188703a7fb360f43950543aef3ee04c0cd420cc9fd83c16515a155',
    periodD: 3.509267, // +- 0.000064
    publishedK: 54.9, // +- 1.8 m/s
    orbitRef: 'Butler et al. 2006, ApJ 646, 505',
    toleranceK: 6, // Udry et al. 2000 give 54.0 +- 1
  },
  HD179949: {
    rowsSha256: 'b82a77259072681a240ec7603cac5c52fe4f74590cefdd5b1c1332dbc7666947',
    periodD: 3.092514, // +- 0.000032
    publishedK: 112.6, // +- 1.8 m/s
    orbitRef: 'Butler et al. 2006, ApJ 646, 505',
    toleranceK: 10, // the literature spans 102.2 - 118.1
    // Evaluated and not chosen: 39 velocities but on 7 nights, leaving a third
    // of the orbit unobserved (largest phase gap 0.33 against HD 75289's 0.16).
  },
};

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const STAR = opt('--star', 'HD75289');
const cacheDir = opt('--cache');
const outDir = opt('--out', 'spike/data-packs/out');
const star = STARS[STAR];
if (!star) throw new Error(`no orbit recorded for ${STAR}`);
const sha = b => createHash('sha256').update(b).digest('hex');
const url = `https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=J/A%2BA/636/A74/rvbank&-out=Name,BJD,DRVmlcnzp,e_DRVmlcnzp,Flag&Name=${STAR}&-out.max=unlimited`;
const file = `harps-${STAR.toLowerCase()}.tsv`;

const at = path.join(cacheDir, file);
if (args.includes('--fetch') && !existsSync(at)) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`VizieR answered ${res.status}`);
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(at, Buffer.from(await res.arrayBuffer()));
}
const text = readFileSync(at, 'utf8');
const dataLines = text.split('\n').filter(l => l && !l.startsWith('#'));
const rowsSha256 = sha(dataLines.join('\n'));
if (star.rowsSha256 && star.rowsSha256 !== rowsSha256) {
  throw new Error(`${file}: the rows are not the pinned rows (${rowsSha256})`);
}
const all = dataLines
  .filter(l => l.startsWith(STAR))
  .map(l => l.split('\t').map(s => s.trim()))
  .map(([, bjd, rv, err, flag]) => ({ bjd: Number(bjd), rv: Number(rv), err: Number(err), flag: Number(flag) }));
// Flag 0 is "normal (reliable) spectra"; -9999999 is VizieR's null.
const rows = all.filter(r => r.flag === 0 && r.rv > -9e6 && r.err > 0);

// Weighted least squares for v(t) = A sin(2 pi t / P) + B cos(2 pi t / P) + C
// at the published period; K = sqrt(A^2 + B^2). A circular orbit: both planets'
// published eccentricities are consistent with zero.
function fit(periodD) {
  const w = rows.map(r => 1 / r.err ** 2);
  const basis = rows.map(r => {
    const ph = (2 * Math.PI * r.bjd) / periodD;
    return [Math.sin(ph), Math.cos(ph), 1];
  });
  const m = [0, 1, 2].map(i => [0, 1, 2].map(j => basis.reduce((s, c, n) => s + w[n] * c[i] * c[j], 0)));
  const v = [0, 1, 2].map(i => basis.reduce((s, c, n) => s + w[n] * c[i] * rows[n].rv, 0));
  const a = m.map((row, i) => [...row, v[i]]);
  for (let i = 0; i < 3; i++) {
    const p = a[i][i];
    for (let j = i; j < 4; j++) a[i][j] /= p;
    for (let k = 0; k < 3; k++) {
      if (k === i) continue;
      const f = a[k][i];
      for (let j = i; j < 4; j++) a[k][j] -= f * a[i][j];
    }
  }
  const [A, B, C] = a.map(r => r[3]);
  const resid = rows.map((r, n) => r.rv - (A * basis[n][0] + B * basis[n][1] + C));
  const rms = Math.sqrt(resid.reduce((s, x) => s + x * x, 0) / rows.length);
  return { K: Math.hypot(A, B), rms };
}
const { K, rms } = fit(star.periodD);

const t0 = Math.floor(rows[0].bjd);
const derivative = {
  pack: `harps-${STAR.toLowerCase()}-rv`,
  version: '0.1.0',
  t0,
  // Days since t0, m/s, m/s. Three short columns kept as numbers: a few dozen
  // rows are smaller as JSON than any encoding would save.
  t: rows.map(r => Number((r.bjd - t0).toFixed(5))),
  rv: rows.map(r => Number(r.rv.toFixed(2))),
  err: rows.map(r => Number(r.err.toFixed(2))),
};
const derivedText = `${JSON.stringify(derivative)}\n`;
const derivedFile = `harps-${STAR.toLowerCase()}.json`;

const name = STAR.replace(/^HD/, 'HD ');
const manifest = {
  format: 'gravitas.observation-data-pack',
  formatVersion: 1,
  id: derivative.pack,
  version: derivative.version,
  title: `${name}: HARPS radial velocities`,
  object: { name, frame: 'ICRS', note: 'coordinates as in the HARPS RV bank; not stored here' },
  facility: { observatory: 'ESO La Silla 3.6 m', instrument: 'HARPS', pipeline: 'SERVAL, nightly zero points corrected' },
  dataType: 'radial-velocity',
  origin: 'observed',
  source: {
    urls: [url],
    archive: 'CDS VizieR, catalogue J/A+A/636/A74/rvbank',
    citations: [
      { text: 'Trifonov et al. 2020, A&A 636, A74', bibcode: '2020A&A...636A..74T', doi: '10.1051/0004-6361/201936686' },
      { text: 'Mayor et al. 2003, The Messenger 114, 20 (HARPS)' },
    ],
    retrieved: '2026-09-24',
  },
  license: {
    status: 'attribution-requested',
    statement:
      'The catalogue states no licence. The velocities are derived by Trifonov et al. from ESO archive spectra, public under the ESO archive data policy.',
    basis:
      'Redistributed as a published scientific table with its citation. ESO asks that use of archive data acknowledge ESO and the programme IDs of the observations, which this pack does not yet list - a condition of production.',
  },
  raw: [
    {
      file,
      bytes: Buffer.byteLength(text),
      sha256: sha(text),
      pinned: star.rowsSha256 !== null,
      canonical: 'the lines not starting with #, in order, joined by \\n (the header dates the request)',
      canonicalSha256: rowsSha256,
    },
  ],
  derived: { file: `spike/data-packs/out/${derivedFile}`, bytes: Buffer.byteLength(derivedText), sha256: sha(derivedText) },
  transformation: {
    script: 'spike/data-packs/build-rv-pack.mjs',
    version: '0.1.0',
    steps: [
      'Keep rows with Flag 0 (reliable spectra) and a non-null velocity and error.',
      'Subtract the integer BJD of the first row from every time.',
      'Round times to 1e-5 d (0.9 s) and velocities and errors to 0.01 m/s.',
    ],
  },
  time: { scale: 'BJD, UTC or TDB not stated by the catalogue (they differ by 69 s)', reference: `JD ${t0}`, unit: 'd' },
  columns: [
    { name: 't', unit: 'd', description: 'barycentric Julian date minus t0' },
    { name: 'rv', unit: 'm/s', description: 'differential RV, relative to the star’s own mean template' },
    { name: 'err', unit: 'm/s', uncertaintyOf: 'rv', description: 'SERVAL formal error; no stellar jitter' },
  ],
  masks: [{ column: 'Flag', rule: 'bitwise; only 0 kept', dropped: all.length - rows.length }],
  assumptions: [
    'Velocities are differential: the zero point is arbitrary, so only changes are meaningful.',
    'Formal errors omit stellar jitter; the scatter about an orbit is larger than they say.',
  ],
  reductions: ['None beyond rounding: every reliable measurement in the bank is kept.'],
  validation: {
    check: `circular orbit at the published period recovers K within ${star.toleranceK} m/s`,
    against: [{ quantity: 'K', value: star.publishedK, unit: 'm/s', ref: star.orbitRef }],
    result: { K: Number(K.toFixed(1)), rms: Number(rms.toFixed(1)) },
  },
  compatible: { widgets: ['rv-curve (a measured-series mode; not built)'], investigations: [] },
  offline: 'optional',
};

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, derivedFile), derivedText);
writeFileSync(path.join(outDir, `${derivative.pack}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  star: STAR, rows: all.length, kept: rows.length,
  nights: new Set(rows.map(r => Math.floor(r.bjd))).size,
  spanDays: Number((rows.at(-1).bjd - rows[0].bjd).toFixed(1)),
  medianErr: [...rows.map(r => r.err)].sort((a, b) => a - b)[rows.length >> 1],
  fittedK: Number(K.toFixed(1)), publishedK: star.publishedK, rms: Number(rms.toFixed(1)),
  rawSha256: sha(text), rowsSha256,
  derivedBytes: Buffer.byteLength(derivedText), derivedSha256: sha(derivedText),
}, null, 1));
if (Math.abs(K - star.publishedK) > star.toleranceK) {
  console.error('The fitted semi-amplitude is not the published one.');
  process.exit(1);
}
