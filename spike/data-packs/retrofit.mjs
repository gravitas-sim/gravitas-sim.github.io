// Spike: every authentic dataset Gravitas already ships, written as a
// gravitas.observation-data-pack/1 manifest from what its own provenance
// records, and nothing else. A field the dataset does not record is left out,
// so the validator's complaints are exactly what a migration would have to
// supply - the coverage test of the schema.
//
//   node spike/data-packs/retrofit.mjs [--json]

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { validatePack, agreesWithPackage } from './schema.mjs';

const root = process.cwd();
const load = rel => import(pathToFileURL(path.join(root, rel)).href);
const file = rel => {
  const bytes = readFileSync(path.join(root, rel));
  return { file: rel, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
};
const base = { format: 'gravitas.observation-data-pack', formatVersion: 1, version: '1.0.0' };

const gw = (await load('js/data/gw/gw150914.js')).PROVENANCE;
const gwosc = await load('js/data/gw/gwoscEventsProvenance.js');
const sdss = await load('js/data/spectra/sdssSpectraProvenance.js');
const mist = (await load('js/data/stellar/mistTracks.js')).PROVENANCE;
const sdssPackage = JSON.parse(readFileSync(path.join(root, 'capabilities/sdss-dr18-spectra.json'), 'utf8'));

export const RETROFITS = [
  {
    ...base,
    id: 'gwosc-gw150914-figure',
    title: 'GW150914, the published figure strain',
    object: { name: 'GW150914' },
    facility: { observatory: 'LIGO Hanford and Livingston' },
    dataType: 'strain',
    origin: 'observed',
    source: {
      urls: [gw.baseUrl, gw.eventPage],
      citations: [{ text: gw.paper, doi: gw.doi }],
      // not recorded: the provenance has no retrieval date
    },
    license: { status: 'cc-by-4.0', statement: gw.attribution },
    // Hashes of what the tool read, computed at build time; nothing compares
    // a fresh download with them, so they are recorded, not pinned.
    raw: gw.inputs.map(i => ({ file: i.file, bytes: i.bytes, sha256: i.sha256, pinned: false })),
    derived: file('js/data/gw/gw150914.js'),
    transformation: { script: 'tools/build-gw-data.mjs', steps: gw.processing },
    time: { scale: 'GPS', reference: `GPS ${gw.gpsEpoch}` },
    columns: [{ name: 'strain', unit: '' }],
    masks: [],
    assumptions: gw.priorProcessingByPublisher.map(s => `By the publisher: ${s}`),
    reductions: gw.notApplied,
    compatible: { investigations: ['listening-to-spacetime'] },
    offline: 'core',
  },
  {
    ...base,
    id: 'gwosc-five-events',
    title: 'Five gravitational-wave events, whitened strain',
    object: { name: Object.keys(gwosc.RECORDS).join(', ') },
    facility: { observatory: 'LIGO Hanford and Livingston' },
    dataType: 'strain',
    origin: 'observed',
    source: {
      urls: [gwosc.PROVENANCE.archive.url],
      citations: Object.values(gwosc.PROVENANCE.archive.catalogs).map(c => ({ text: c.paper, doi: c.doi })),
      retrieved: gwosc.PROVENANCE.archive.retrieved.slice(0, 10),
    },
    license: { status: 'cc-by-4.0', statement: gwosc.PROVENANCE.archive.attribution },
    raw: Object.values(gwosc.RECORDS).map(r => {
      const d = r.detectors[r.chosen];
      return { file: d.url, bytes: d.bytes, sha256: d.sha256, pinned: true };
    }),
    derived: file('js/data/gw/gwoscEvents.js'),
    transformation: {
      script: 'tools/build-gwosc-events.mjs',
      steps: ['PSD by median Welch', 'whiten, 20-400 Hz', 'unit variance', 'window and decimate to 1024 Hz', 'int16'],
    },
    time: { scale: 'GPS', reference: 'per event: window.gpsStart' },
    columns: [{ name: 'whitened strain', unit: 'noise sigma' }],
    masks: gwosc.PROVENANCE.documentedGlitches.map(g => ({ column: 'strain', rule: `${g.event} ${g.detector}: ${g.what}` })),
    assumptions: Object.values(gwosc.PROVENANCE.evidence),
    reductions: ['3 s of each 32 s file kept', '4096 Hz to 1024 Hz', '16-bit quantisation'],
    compatible: { investigations: ['listening-to-spacetime'] },
    offline: 'core',
  },
  {
    ...base,
    id: 'sdss-dr18-stellar-spectra',
    title: 'Four observed stellar spectra (SDSS DR18)',
    object: { name: Object.values(sdss.RECORDS).map(r => `SDSS ${r.specObjID}`).join(', ') },
    facility: { observatory: 'Apache Point Observatory 2.5 m', instrument: sdss.PROVENANCE.archive.instrument },
    dataType: 'spectrum',
    origin: 'observed',
    source: {
      urls: [sdss.PROVENANCE.archive.spectrumBase, sdss.PROVENANCE.archive.catalogQuery],
      citations: [{ text: sdss.PROVENANCE.archive.releasePaper }, { text: sdss.PROVENANCE.archive.instrumentPaper }],
      retrieved: sdss.PROVENANCE.archive.retrieved,
    },
    license: { status: 'public-domain', statement: sdss.PROVENANCE.archive.acknowledgement },
    raw: Object.values(sdss.RECORDS).map(r => ({ file: r.url, bytes: r.sourceBytes, sha256: r.sourceSha256, pinned: true })),
    derived: file('js/data/spectra/sdssSpectra.js'),
    transformation: {
      script: 'tools/build-sdss-spectra.mjs',
      steps: ['resample to a common grid', 'thin', 'normalise', 'int16'],
    },
    columns: [
      { name: 'wavelength', unit: 'Angstrom' },
      { name: 'flux', unit: '1e-17 erg/s/cm^2/Angstrom, normalised' },
    ],
    masks: [],
    assumptions: ['ELODIE template types are the pipeline’s, not a classification by this project.'],
    reductions: ['thinned to 1271 samples; the line-depth change per feature is recorded'],
    compatible: { widgets: ['spectra-compare', 'spectra-identify'], investigations: ['a-universe-of-stars'] },
    offline: 'core',
  },
  {
    ...base,
    id: 'mist-v12-solar-tracks',
    title: `${mist.grid} tracks at solar metallicity`,
    object: { name: 'model stars, 0.1 to 20 solar masses' },
    facility: { observatory: 'MIST (MESA Isochrones and Stellar Tracks)', instrument: `MESA r${mist.mesaRevision}` },
    dataType: 'model-grid',
    origin: 'model',
    source: {
      urls: [mist.source, mist.homepage],
      citations: mist.cite.map(text => ({ text })),
      // not recorded: the provenance has no retrieval date
    },
    license: { status: 'attribution-requested', statement: mist.terms, basis: 'cited as MIST asks; see NOTICE' },
    // Checked when the tarball is already cached; a fresh download is used
    // without the check, so it is not pinned in the sense the schema means.
    raw: [{ file: mist.source, bytes: mist.sourceBytes, sha256: mist.sourceSha256, pinned: false }],
    derived: file('js/data/stellar/mistTracks.js'),
    transformation: {
      script: 'tools/build-stellar-tracks.mjs',
      steps: [mist.reduction.algorithm],
    },
    columns: Object.entries(mist.units).map(([name, unit]) => ({ name, unit })),
    masks: [],
    assumptions: mist.notModeled,
    reductions: [`RDP thinning at ${mist.reduction.toleranceDex} dex`],
    compatible: { investigations: ['a-universe-of-stars'] },
    offline: 'core',
  },
  {
    ...base,
    id: 'trappist-1-system',
    title: 'TRAPPIST-1, star and seven planets',
    object: { name: 'TRAPPIST-1' },
    facility: { observatory: 'compiled from TRAPPIST, Spitzer and ground-based photometry papers' },
    dataType: 'system-parameters',
    origin: 'compilation',
    source: {
      urls: [], // not recorded
      citations: [
        { text: 'Agol et al. 2021, Planet. Sci. J. 2, 1' },
        { text: 'Ducrot et al. 2020' },
        { text: 'Gillon et al. 2017' },
      ],
    },
    license: { status: 'no-license-stated', statement: 'physical parameters from papers', basis: 'facts are not copyrightable; cited' },
    raw: [],
    derived: file('js/data/trappist1.js'),
    transformation: { steps: [] },
    columns: [
      { name: 'massInSuns', unit: 'M_sun' },
      { name: 'radiusInSuns', unit: 'R_sun' },
      { name: 'luminosityInSuns', unit: 'L_sun' },
    ],
    masks: [],
    assumptions: ['values rounded to the precision the simulation uses'],
    reductions: [],
    compatible: { investigations: ['goldilocks-question'] },
    offline: 'core',
  },
  {
    ...base,
    id: 'exoplanet-systems',
    title: 'HD 209458 and the Sun-Jupiter comparison',
    object: { name: 'HD 209458' },
    facility: { observatory: 'compiled from the literature' },
    dataType: 'system-parameters',
    origin: 'compilation',
    source: { urls: [], citations: [] }, // the module cites no paper per value
    license: { status: 'no-license-stated', statement: 'physical parameters', basis: 'facts are not copyrightable' },
    raw: [],
    derived: file('js/data/exoplanetSystems.js'),
    transformation: { steps: [] },
    columns: [{ name: 'periodDays', unit: 'd' }, { name: 'transitDepthPercent', unit: '%' }],
    masks: [],
    assumptions: ['“accepted published parameters”'],
    reductions: [],
    compatible: { investigations: ['detect-this-planet', 'design-the-schedule'] },
    offline: 'core',
  },
  {
    ...base,
    id: 'ngc3198-rotation-curve',
    title: 'NGC 3198 rotation curve, as dm-fit draws it',
    object: { name: 'NGC 3198' },
    facility: { observatory: 'none: generated from published structural parameters' },
    dataType: 'rotation-curve',
    origin: 'synthetic',
    source: { urls: [], citations: [] },
    license: { status: 'no-license-stated', statement: 'written in js/darkMatterWidgets.js', basis: 'own work' },
    raw: [],
    derived: file('js/darkMatterWidgets.js'),
    transformation: { script: 'js/darkMatterWidgets.js NGC3198_OBSERVED', steps: ['model + fixed offsets'] },
    columns: [{ name: 'r', unit: 'kpc' }, { name: 'v', unit: 'km/s' }, { name: 'err', unit: 'km/s', uncertaintyOf: 'v' }],
    masks: [],
    assumptions: ['disc 2.6 kpc, halo flat speed 150 km/s'],
    reductions: [],
    compatible: { widgets: ['dm-fit', 'dm-mond'], investigations: ['missing-mass'] },
    offline: 'core',
  },
];

export function report() {
  return RETROFITS.map(m => ({
    id: m.id,
    origin: m.origin,
    problems: [
      ...validatePack(m),
      ...(m.id === 'sdss-dr18-stellar-spectra' ? agreesWithPackage(m, sdssPackage) : []),
    ],
  }));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const rows = report();
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else {
    for (const r of rows) {
      console.log(`${r.id} (${r.origin}): ${r.problems.length ? '' : 'valid'}`);
      for (const p of r.problems) console.log(`  ${p.path}: ${p.message}`);
    }
  }
}
