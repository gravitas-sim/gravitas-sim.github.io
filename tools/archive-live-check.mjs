#!/usr/bin/env node
// =============================================================================
// Does CDS still answer the way the archive import was built for?
// -----------------------------------------------------------------------------
//   npm run archive:live                 ask CDS, compare, say what changed
//   npm run archive:live -- --json out   and write the record
//
// The live-sandbox contract test for the Observatory's archive import
// (js/archive/, VO_ARCHIVE_GATE.md). It is NOT in the default gate: the
// network is not a test dependency, and tests/archive.test.js and
// e2e/archive.spec.js hold every contract against saved answers. This asks
// the real services the same three questions, once, and checks that the
// saved answers are still the truth:
//
//   1. CORS      each service still sends Access-Control-Allow-Origin for a
//                page on another origin (asked with Gravitas's own Origin)
//   2. Sesame    SU Dra is where tests/fixtures/archive/sesame-su-dra.xml says
//   3. cone      VizieR's Gaia DR3 cone finds Gaia DR3 1058066262817534336
//   4. epochs    its epoch photometry has the fixture's content digest -
//                Gaia DR3 is a frozen release, so a different digest is a
//                real change - and it converts, with the units the curated
//                descriptor expects (a service that starts stating a unit
//                the descriptor does not expect stops the conversion)
//
// It sends one name (SU Dra) and two small ADQL queries to CDS, with no
// cookie and no referrer. It exits 1 on any difference, and says which.
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const { DOMParser } = new JSDOM('').window;
globalThis.DOMParser = DOMParser;

const cds = await import('../js/archive/cds.js');
const { parseVotable } = await import('../js/archive/votable.js');
const { toObservation } = await import('../js/archive/gaiaEpochs.js');

const ORIGIN = 'https://gravitas-sim.github.io';
const SU_DRA = '1058066262817534336';
const fixture = name =>
  readFileSync(new URL(`../tests/fixtures/archive/${name}`, import.meta.url));

/** fetch, as a browser on Gravitas's origin would send it, recording CORS. */
const cors = [];
const browserLike = async (url, init) => {
  const res = await fetch(url, { ...init, headers: { Origin: ORIGIN } });
  cors.push({
    origin: new URL(url).origin,
    allowOrigin: res.headers.get('access-control-allow-origin'),
  });
  return res;
};

const problems = [];
const record = { at: new Date().toISOString(), node: process.version };

// 2. Sesame
const pos = await cds.resolveName('SU Dra', { fetchImpl: browserLike });
const saved = new DOMParser().parseFromString(
  fixture('sesame-su-dra.xml').toString('utf8'),
  'application/xml'
);
const savedRa = Number(saved.getElementsByTagName('jradeg')[0].textContent);
const savedDec = Number(saved.getElementsByTagName('jdedeg')[0].textContent);
record.sesame = pos && {
  ra: pos.ra,
  dec: pos.dec,
  otype: pos.otype,
  resolver: pos.resolver,
};
if (!pos) problems.push('Sesame no longer resolves SU Dra');
else if (
  Math.abs(pos.ra - savedRa) > 1e-6 ||
  Math.abs(pos.dec - savedDec) > 1e-6
)
  problems.push(
    `Sesame moved SU Dra: ${pos.ra}, ${pos.dec} (saved ${savedRa}, ${savedDec})`
  );

// 3. The cone
if (pos) {
  const { sources } = await cds.gaiaSourcesAt(pos, { fetchImpl: browserLike });
  record.cone = sources;
  if (!sources.some(s => s.source === SU_DRA))
    problems.push(`the cone no longer finds Gaia DR3 ${SU_DRA}`);
}

// 4. The epochs
const { answer } = await cds.gaiaEpochs(SU_DRA, { fetchImpl: browserLike });
const savedDigest = await cds.tableDigest(
  parseVotable(fixture('gaia-epphot-su-dra.vot').toString('utf8'))
);
record.epochs = {
  rows: answer.table.rows.length,
  bytes: answer.bytes,
  sha256: answer.sha256,
  contentSha256: answer.contentSha256,
  savedContentSha256: savedDigest,
  units: Object.fromEntries(answer.table.fields.map(f => [f.name, f.unit])),
};
if (answer.contentSha256 !== savedDigest)
  problems.push(
    `the epoch photometry changed: content ${answer.contentSha256.slice(0, 12)}, saved ${savedDigest.slice(0, 12)}`
  );
try {
  const o = toObservation(answer, { source: SU_DRA });
  record.epochs.converted = o.columns[0].values.length;
} catch (err) {
  problems.push(`the conversion stopped: ${err.message}`);
}

// 1. CORS
record.cors = cors;
for (const c of cors) {
  if (c.allowOrigin !== '*' && c.allowOrigin !== ORIGIN)
    problems.push(
      `${c.origin} no longer allows a page on ${ORIGIN} (Access-Control-Allow-Origin: ${c.allowOrigin})`
    );
}

record.problems = problems;
const i = process.argv.indexOf('--json');
if (i > 0)
  writeFileSync(process.argv[i + 1], `${JSON.stringify(record, null, 2)}\n`);
console.log(`CDS, ${record.at}`);
console.log(
  `  Sesame: ${pos ? `${pos.ra}, ${pos.dec} (${pos.otype})` : 'not found'}`
);
console.log(
  `  cone:   ${record.cone ? record.cone.map(s => s.source).join(', ') : '-'}`
);
console.log(
  `  epochs: ${record.epochs.rows} rows, content ${record.epochs.contentSha256.slice(0, 12)}`
);
console.log(
  `  CORS:   ${cors.map(c => `${new URL(c.origin).host} ${c.allowOrigin ?? 'none'}`).join('; ')}`
);
if (problems.length) {
  console.error(
    `\n${problems.length} difference(s):\n${problems.map(p => `  - ${p}`).join('\n')}`
  );
  process.exit(1);
}
console.log('\nEverything the archive import was built for still holds.');
