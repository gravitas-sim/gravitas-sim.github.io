// =============================================================================
// Validate the Common Cartridge export against the real schemas
// (Roadmap III Prompt 169). A local tool, run by a person with the schemas:
// never by CI.
// -----------------------------------------------------------------------------
//   node tools/cartridge-validate.mjs --schemas <dir>          check and print
//   node tools/cartridge-validate.mjs --schemas <dir> --write  and record it
//
// <dir> holds the seven schema files as 1EdTech publishes them, under their
// published names (tests/fixtures/common-cartridge/provenance.json lists the
// addresses; this tool never fetches anything, and the files are not in the
// repository because their licence would need a registration with 1EdTech
// before they could be redistributed). Each file's SHA-256 is checked against
// the record first: a different file is not the file the cartridge was written
// against.
//
// For every built-in course, in both languages, with and without the notes
// for instructors, it builds the cartridge (js/instructorCartridge.js) and
//   1. validates imsmanifest.xml against the CC v1.3 manifest profile with
//      xmllint, offline, with the schemas' own imports pointed at <dir>;
//   2. validates each web link file against the web link schema;
//   3. runs the profile checker (tools/cartridge-profile.mjs).
// Then it runs the broken manifests (MUTATIONS) through xmllint and the
// checker, to record where the schema refuses them too.
//
// --write puts the verdict in tests/fixtures/common-cartridge/validation.json,
// which tests/commonCartridge.test.js compares with the cartridges as they are
// built now, and the readable example beside it. The tool needs xmllint (libxml2).
// =============================================================================

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { JSDOM } from 'jsdom';

import { MUTATIONS, checkCartridge } from './cartridge-profile.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = path.join(ROOT, 'tests/fixtures/common-cartridge');
const SITE = 'https://gravitas-sim.online/';
const sha = text => createHash('sha256').update(text).digest('hex');
const parse = text =>
  new new JSDOM('').window.DOMParser().parseFromString(text, 'application/xml');
const mod = p => import(pathToFileURL(path.join(ROOT, p)).href);

/** Every built-in course's cartridges, as the test builds them. */
async function buildAll() {
  const { BUILTIN_COURSES } = await mod('js/data/courses/index.js');
  const { itemsOf } = await mod('js/course/pack.js');
  const { courseFacts } = await mod('js/course/api.js');
  const { itemLink, courseLink } = await mod('js/course/links.js');
  const { courseManifest } = await mod('js/course/manifest.js');
  const { loadInvestigation } = await mod('js/data/investigations/registry.js');
  const cc = await mod('js/instructorCartridge.js');
  const out = [];
  for (const id of Object.keys(BUILTIN_COURSES)) {
    const pack = await BUILTIN_COURSES[id]();
    const facts = await courseFacts(pack, {
      load: lesson => loadInvestigation(lesson, 'en'),
    });
    const links = await cc.linksOf(pack, {
      itemsOf,
      itemLink,
      courseLink,
      root: SITE,
    });
    const manifest = courseManifest(pack, facts, {
      links: links.items,
      course: links.course,
    });
    for (const locale of ['en', 'es'])
      for (const notes of [false, true])
        out.push({
          id,
          locale,
          notes,
          cartridge: cc.buildCartridge(pack, manifest, {
            locale,
            notes,
            name: item => cc.itemTitle(item, facts, locale),
          }),
        });
  }
  return out;
}

const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8' });

function main() {
  const args = process.argv.slice(2);
  const at = flag => args[args.indexOf(flag) + 1];
  const dir = args.includes('--schemas') ? at('--schemas') : null;
  if (!dir) {
    console.error(
      'usage: node tools/cartridge-validate.mjs --schemas <dir> [--write]'
    );
    process.exit(2);
  }
  return { dir: path.resolve(dir), write: args.includes('--write') };
}

const { dir, write } = main();
const version = run('xmllint', ['--version']);
const xmllint = `${(version.stderr || version.stdout).split('\n')[0]}`;
if (!/libxml/.test(xmllint)) {
  console.error('xmllint (libxml2) is required.');
  process.exit(2);
}

// 1. The schemas are the ones the record names.
const prov = JSON.parse(
  readFileSync(path.join(FIXTURES, 'provenance.json'), 'utf8')
);
const work = mkdtempSync(path.join(tmpdir(), 'cc-xsd-'));
const schemas = {};
for (const s of prov.sources.filter(x => x.kind === 'schema')) {
  const file = path.join(dir, s.file);
  const have = sha(readFileSync(file));
  if (have !== s.sha256) {
    console.error(`${s.file}: SHA-256 ${have} is not the recorded ${s.sha256}`);
    process.exit(1);
  }
  schemas[s.file] = have;
  // The schemas import each other by absolute address: point them at the copies.
  let text = readFileSync(file, 'utf8');
  for (const t of prov.sources.filter(x => x.kind === 'schema'))
    text = text.replaceAll(
      `"${t.url.replace('https://', 'http://')}"`,
      `"${t.file}"`
    );
  writeFileSync(path.join(work, s.file), text);
}
const MANIFEST_XSD = path.join(work, 'ccv1p3_imscp_v1p2_v1p0.xsd');
const WEBLINK_XSD = path.join(work, 'ccv1p3_imswl_v1p3.xsd');

const valid = (schema, file) =>
  run('xmllint', ['--noout', '--nonet', '--schema', schema, file]);

// 2. The cartridges.
const records = [];
let failed = 0;
const all = await buildAll();
for (const { id, locale, notes, cartridge: c } of all) {
  const d = path.join(
    work,
    'out',
    `${id}-${locale}-${notes ? 'notes' : 'plain'}`
  );
  mkdirSync(d, { recursive: true });
  writeFileSync(path.join(d, 'imsmanifest.xml'), c.manifest);
  for (const p of c.parts) writeFileSync(path.join(d, p.path), p.text);
  const m = valid(MANIFEST_XSD, path.join(d, 'imsmanifest.xml'));
  const links = c.parts.map(p => valid(WEBLINK_XSD, path.join(d, p.path)));
  const problems = checkCartridge(
    parse,
    c.manifest,
    new Map(c.parts.map(p => [p.path, p.text]))
  );
  const row = {
    id,
    locale,
    notes,
    parts: c.parts.length,
    manifestSha256: sha(c.manifest),
    partsSha256: sha(c.parts.map(p => `${p.path}\n${p.text}`).join('\u0000')),
    manifestSchema: m.status === 0 ? 'valid' : 'invalid',
    webLinkSchema: links.every(r => r.status === 0) ? 'valid' : 'invalid',
    profile: problems.length ? 'invalid' : 'valid',
  };
  if (row.manifestSchema !== 'valid')
    console.error(m.stderr.split('\n').slice(0, 3).join('\n'));
  if (row.webLinkSchema !== 'valid')
    console.error(links.find(r => r.status !== 0).stderr);
  if (problems.length) console.error(problems.join('\n'));
  if (Object.values(row).includes('invalid')) failed += 1;
  records.push(row);
}

// 3. The broken manifests: does the schema refuse them too?
const base = all.find(
  x => x.id === 'intro-astronomy' && x.locale === 'en' && !x.notes
).cartridge;
const files = new Map(base.parts.map(p => [p.path, p.text]));
const agreement = MUTATIONS.map(mu => {
  const text = mu.change(base.manifest);
  const file = path.join(work, `mutation-${sha(mu.name).slice(0, 8)}.xml`);
  writeFileSync(file, text);
  return {
    name: mu.name,
    xmllint: valid(MANIFEST_XSD, file).status === 0 ? 'valid' : 'invalid',
    checker: checkCartridge(parse, text, files).length ? 'refused' : 'accepted',
  };
});
for (const a of agreement) if (a.checker !== 'refused') failed += 1;

console.log(
  `${records.length} cartridges: ${records.filter(r => !Object.values(r).includes('invalid')).length} valid against the manifest and web link schemas and the profile`
);
console.log(
  `${agreement.length} broken manifests: ${agreement.filter(a => a.checker === 'refused').length} refused by the checker, ${agreement.filter(a => a.xmllint === 'invalid').length} also by the schema`
);

if (write && !failed) {
  writeFileSync(
    path.join(FIXTURES, 'validation.json'),
    `${JSON.stringify(
      {
        note: 'The verdict of the real CC v1.3 schemas on every built-in course in both languages, written by tools/cartridge-validate.mjs. Digests are of the manifest text and of the web link files (path, newline, text), which are deterministic; no digest of an archive is kept, because deflate would differ between Node versions and the archive here is stored. tests/commonCartridge.test.js fails when a cartridge differs from this record: run the tool again with the schemas.',
        tool: 'tools/cartridge-validate.mjs',
        validatedOn: '2026-10-22',
        xmllint,
        profile: prov.profile,
        schemas,
        cartridges: records,
        agreement,
      },
      null,
      2
    )}\n`
  );
  const ex = base.manifest;
  writeFileSync(
    path.join(FIXTURES, 'example-intro-astronomy-en.imsmanifest.xml'),
    ex
  );
  console.log('recorded tests/fixtures/common-cartridge/validation.json');
}
process.exit(failed ? 1 : 0);
