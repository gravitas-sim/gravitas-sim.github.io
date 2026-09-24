// =============================================================================
// An extension: load it, validate it, test it, describe it
// -----------------------------------------------------------------------------
// An extension is a directory (or a .gxp archive of one) whose
// gravitas-extension.json is a gravitas.capability-package/1 manifest, plus
// the files that manifest names. Three types, told apart by what it provides:
//
//   data-pack     declarative. provides.dataPacks: one pack, a
//                 gravitas.observation-data-pack/1 record and its series.
//   course-pack   declarative. provides.courses: one gravitas.course-pack/1
//                 sequence of lessons Gravitas already has.
//   capability    built-in: curated, executable. provides.widgetFamilies: an
//                 instrument family whose code is reviewed, vendored into
//                 Gravitas and compiled with it. Never installed at run time.
//
// Every finding is { severity, file, path, line, column, message }: the file
// and the field it is about, and the line in that file, so the message can be
// acted on without reading the validator. Errors fail `validate`; warnings are
// what an author should know and a reviewer will ask about.
// =============================================================================

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  mkdtempSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { validateManifest } from '../../js/platform/manifest.js';
import { BUILTINS } from '../../js/platform/builtins.js';
import { parseRange, satisfies } from '../../js/platform/semver.js';
import {
  agreesWithPackage,
  runtimeMeta,
  validateDataPack,
} from '../../tools/data-packs/schema.mjs';
import { foldedDepth } from '../../tools/data-packs/tess-light-curve.mjs';
import { validateCoursePack } from './course.mjs';
import { positions, locate } from './locate.mjs';
import { MANIFEST_ENTRY, read as readArchive } from './archive.mjs';
import {
  acceptsPlatform,
  checkObservation,
  EXTENSION_TYPES,
  LOCALES,
  observationOf,
  PLATFORM_API,
  publicIds,
} from './api.mjs';

const sha256 = b => createHash('sha256').update(b).digest('hex');
const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
/** Files an extension directory may hold without declaring them. */
const UNDECLARED_OK = /^(README\.md|LICENSE(\.[a-z]+)?|CHANGELOG\.md)$/i;

// --- Loading -------------------------------------------------------------------

/**
 * An extension's files, from a directory or a .gxp archive.
 * @param {string} source - A directory, or a path ending .gxp
 * @returns {{source: string, archive: boolean, files: Map<string, Buffer>, problems: string[]}}
 */
export function loadExtension(source) {
  if (source.endsWith('.gxp')) {
    const { files, problems } = readArchive(readFileSync(source));
    files.delete('CHECKSUMS');
    return { source, archive: true, files, problems };
  }
  if (!existsSync(source) || !statSync(source).isDirectory()) {
    throw new Error(
      `${source} is not an extension directory or a .gxp archive`
    );
  }
  const files = new Map();
  const walk = rel => {
    for (const name of readdirSync(path.join(source, rel)).sort()) {
      const r = rel ? `${rel}/${name}` : name;
      if (statSync(path.join(source, r)).isDirectory()) walk(r);
      else files.set(r, readFileSync(path.join(source, r)));
    }
  };
  walk('');
  return { source, archive: false, files, problems: [] };
}

// --- Findings --------------------------------------------------------------------

function findings(ext) {
  const list = [];
  const tables = new Map();
  const at = (file, fieldPath) => {
    const text = ext.files.get(file)?.toString('utf8');
    if (text === undefined) return { line: 0, column: 0 };
    if (!tables.has(file)) {
      try {
        tables.set(file, positions(text));
      } catch {
        tables.set(file, new Map());
      }
    }
    const { line, column } = locate(text, fieldPath, tables.get(file));
    return { line, column };
  };
  const seen = new Set();
  const add = (severity, file, fieldPath, message) => {
    // One problem, once: the platform's rules can reach the same field twice.
    const key = `${severity}|${file}|${fieldPath}|${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({
      severity,
      file,
      path: fieldPath,
      ...at(file, fieldPath),
      message,
    });
  };
  return {
    list,
    error: (file, p, m) => add('error', file, p, m),
    warn: (file, p, m) => add('warning', file, p, m),
  };
}

/** One finding as a line a terminal and an editor can both use. */
export function formatFinding(f, root = '') {
  const where = `${path.join(root, f.file)}${f.line ? `:${f.line}:${f.column}` : ''}`;
  return `${where}  ${f.severity}  ${f.path ? `${f.path}: ` : ''}${f.message}`;
}

function parseJson(ext, file, report) {
  const bytes = ext.files.get(file);
  if (!bytes) {
    report.error(
      MANIFEST_ENTRY,
      '',
      `${file} is named but not in the extension`
    );
    return null;
  }
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch (err) {
    const m = /position (\d+)/.exec(err.message);
    const offset = m ? Number(m[1]) : 0;
    const before = bytes.toString('utf8').slice(0, offset).split('\n');
    report.list.push({
      severity: 'error',
      file,
      path: '',
      line: before.length,
      column: before.at(-1).length + 1,
      message: `not valid JSON: ${err.message}`,
    });
    return null;
  }
}

/** Does a licence scope - `**`, `*` or an exact path - cover a file? */
function covers(scope, file) {
  const re = new RegExp(
    `^${scope
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '\0')
      .replace(/\*/g, '[^/]*')
      .replace(/\0/g, '.*')}$`
  );
  return re.test(file);
}

/** Which of the three an extension is, from what it provides. */
export function extensionType(m) {
  const p = m?.provides || {};
  const kinds = [];
  if (p.dataPacks?.length) kinds.push('data-pack');
  if (p.courses?.length) kinds.push('course-pack');
  if (p.widgetFamilies?.length) kinds.push('capability');
  return kinds;
}

// --- Validate ---------------------------------------------------------------------

/**
 * Every problem with an extension, and what an author should know.
 * @param {ReturnType<typeof loadExtension>} ext
 * @returns {Promise<{type: string|null, manifest: object|null, findings: object[]}>}
 */
export async function validateExtension(ext) {
  const report = findings(ext);
  const M = MANIFEST_ENTRY;
  for (const p of ext.problems) report.error('CHECKSUMS', '', p);
  if (!ext.files.has(M)) {
    report.error(M, '', `an extension is a directory with ${M} at its root`);
    return { type: null, manifest: null, findings: report.list };
  }
  const m = parseJson(ext, M, report);
  if (!m) return { type: null, manifest: null, findings: report.list };

  // The format itself, and the declarative boundary: the platform's own rules.
  for (const e of validateManifest(m)) report.error(M, e.path, e.message);

  const types = extensionType(m);
  if (types.length !== 1) {
    report.error(
      M,
      'provides',
      types.length
        ? `provides ${types.join(' and ')}; an extension is exactly one type`
        : 'provides no dataPacks, courses or widgetFamilies, so it is no extension type'
    );
    return { type: null, manifest: m, findings: report.list };
  }
  const type = types[0];
  const expected = EXTENSION_TYPES[type].kind;
  if (m.kind !== expected)
    report.error(M, 'kind', `a ${type} is "${expected}"`);

  const ids = await publicIds();
  // API compatibility: the platform, and every package it requires.
  if (
    typeof m.gravitas === 'string' &&
    parseRange(m.gravitas) &&
    !acceptsPlatform(m.gravitas)
  ) {
    report.error(
      M,
      'gravitas',
      `accepts ${m.gravitas}; this Gravitas implements platform ${PLATFORM_API}`
    );
  }
  for (const [req, range] of Object.entries(m.requires || {})) {
    const have = ids.packages.get(req);
    if (!have)
      report.error(M, `requires.${req}`, `no installed package "${req}"`);
    else if (parseRange(range) && !satisfies(have, range))
      report.error(
        M,
        `requires.${req}`,
        `installed ${req} is ${have}, outside ${range}`
      );
  }
  for (const [kind, list] of Object.entries(m.uses || {})) {
    const known = ids[kind];
    if (!known) continue;
    (Array.isArray(list) ? list : []).forEach((id, i) => {
      if (!known.has(id))
        report.error(
          M,
          `uses.${kind}[${i}]`,
          `Gravitas has no ${kind.replace(/s$/, '')} "${id}"`
        );
    });
  }
  // Every check the extension names exists: a release-gate step, or a test file.
  if (Array.isArray(m.validation)) {
    const { CHECKS } = await import('../../tools/checks.mjs');
    const registry = new Set(CHECKS.map(c => c.id));
    m.validation.forEach((v, i) => {
      const [kind, ref] = String(v?.check).split(/:(.*)/s);
      const ok =
        kind === 'registry'
          ? registry.has(ref)
          : existsSync(path.join(REPO, ref || ''));
      if (!ok)
        report.error(
          M,
          `validation[${i}].check`,
          `names no check: ${v?.check}`
        );
    });
  }
  if (ids.packages.has(m.id))
    report.error(M, 'id', `"${m.id}" is an installed package; pick another id`);

  // Localization: the title in every interface language.
  if (m.title && typeof m.title === 'object') {
    for (const l of LOCALES) {
      if (!m.title[l])
        report.warn(
          M,
          `title.${l}`,
          `no ${l} title; readers in ${l} will see ${m.title.en ? `"${m.title.en}"` : 'nothing'}`
        );
    }
  }

  // Assets: present, licensed, and in an offline class the type can have.
  const assets = Array.isArray(m.assets) ? m.assets : [];
  const declared = new Set([M, ...assets.map(a => a?.path)]);
  assets.forEach((a, i) => {
    if (!a || typeof a.path !== 'string') return;
    if (!ext.files.has(a.path))
      report.error(M, `assets[${i}].path`, `${a.path} is not in the extension`);
    if (
      !(m.licenses || []).some(
        l => typeof l?.scope === 'string' && covers(l.scope, a.path)
      )
    ) {
      report.error(
        M,
        `assets[${i}].path`,
        `no entry in licenses covers ${a.path}`
      );
    }
    if (m.kind === 'declarative' && a.offline === 'core') {
      report.error(
        M,
        `assets[${i}].offline`,
        'a declarative extension is never core: a failed fetch would break the install for everybody; use optional'
      );
    }
    if (a.offline === 'locale' && a.role !== 'translation') {
      report.error(
        M,
        `assets[${i}].offline`,
        '"locale" is for translations, warmed when their language is chosen'
      );
    }
  });

  const checkType = {
    'data-pack': validateDataPackExtension,
    'course-pack': validateCourseExtension,
    capability: validateCapabilityExtension,
  }[type];
  const extra = (await checkType(ext, m, report, ids)) || [];
  for (const f of extra) declared.add(f);

  if (!ext.archive) {
    for (const file of ext.files.keys()) {
      if (!declared.has(file) && !UNDECLARED_OK.test(file)) {
        report.warn(
          M,
          'assets',
          `${file} is not declared, so \`sdk pack\` leaves it out`
        );
      }
    }
  }
  return { type, manifest: m, findings: report.list };
}

async function validateDataPackExtension(ext, m, report, ids) {
  const M = MANIFEST_ENTRY;
  const entries = m.provides.dataPacks;
  if (entries.length !== 1)
    report.error(
      M,
      'provides.dataPacks',
      'a data-pack extension provides exactly one pack'
    );
  const entry = entries[0] || {};
  if (ids.dataPacks.has(entry.id))
    report.error(
      M,
      'provides.dataPacks[0].id',
      `"${entry.id}" is a data pack Gravitas already has`
    );
  if (typeof entry.provenance !== 'string')
    return report.error(
      M,
      'provides.dataPacks[0].provenance',
      'the pack record (a gravitas.observation-data-pack/1 manifest)'
    );
  if (typeof entry.file !== 'string')
    return report.error(M, 'provides.dataPacks[0].file', 'the series file');
  const P = entry.provenance;
  const pack = parseJson(ext, P, report);
  if (!pack) return [];
  for (const e of validateDataPack(pack, { derivedUnder: '' }))
    report.error(P, e.path, e.message);
  if (pack.id !== entry.id)
    report.error(
      P,
      'id',
      `is "${pack.id}"; the extension provides "${entry.id}"`
    );
  for (const e of agreesWithPackage(pack, m, P))
    report.error(P, e.path, e.message);
  if (pack.derived?.file !== entry.file)
    report.error(
      P,
      'derived.file',
      `is ${pack.derived?.file}; the extension ships ${entry.file}`
    );
  const bytes = ext.files.get(entry.file);
  if (!bytes) {
    report.error(
      M,
      'provides.dataPacks[0].file',
      `${entry.file} is not in the extension`
    );
    return [];
  }
  if (
    bytes.length !== pack.derived?.bytes ||
    sha256(bytes) !== pack.derived?.sha256
  ) {
    report.error(
      P,
      'derived.sha256',
      `${entry.file} is ${bytes.length} bytes, ${sha256(bytes)}: not the file this record describes`
    );
  }
  const series = parseJson(ext, entry.file, report);
  if (
    series &&
    JSON.stringify(series.PACK) !== JSON.stringify(runtimeMeta(pack))
  ) {
    report.error(entry.file, 'PACK', `is not the runtime fields of ${P}`);
  }
  // The transformation script is code, so it is never an asset of a
  // declarative extension; it belongs to the pull request, not the archive.
  const script = pack.transformation?.script;
  return typeof script === 'string' && ext.files.has(script) ? [script] : [];
}

async function validateCourseExtension(ext, m, report, ids) {
  const M = MANIFEST_ENTRY;
  const entries = m.provides.courses;
  if (entries.length !== 1)
    report.error(
      M,
      'provides.courses',
      'a course-pack extension provides exactly one course'
    );
  const entry = entries[0] || {};
  if (ids.courses.has(entry.id))
    report.error(
      M,
      'provides.courses[0].id',
      `"${entry.id}" is a course Gravitas already has`
    );
  if (typeof entry.file !== 'string')
    return report.error(M, 'provides.courses[0].file', 'the course file');
  const course = parseJson(ext, entry.file, report);
  if (!course) return [];
  for (const e of validateCoursePack(course, {
    lessons: ids.lessons,
    locales: [...LOCALES],
  }))
    report.error(entry.file, e.path, e.message);
  if (course.id !== entry.id)
    report.error(
      entry.file,
      'id',
      `is "${course.id}"; the extension provides "${entry.id}"`
    );
  if (!(m.assets || []).some(a => a?.path === entry.file))
    report.error(
      M,
      'assets',
      `${entry.file} is provided but not declared as an asset`
    );
  return [];
}

async function validateCapabilityExtension(ext, m, report, ids) {
  const M = MANIFEST_ENTRY;
  m.provides.widgetFamilies.forEach((f, i) => {
    const at = `provides.widgetFamilies[${i}]`;
    for (const [j, w] of (f.widgets || []).entries()) {
      if (ids.widgets.has(w))
        report.error(
          M,
          `${at}.widgets[${j}]`,
          `"${w}" is an instrument Gravitas already has`
        );
    }
    const builtin = String(f.entry || '').replace(/^builtin:/, '');
    if (!f.entry)
      report.error(
        M,
        `${at}.entry`,
        'an instrument family is loaded as builtin:<id>'
      );
    else if (!BUILTINS[builtin]) {
      report.warn(
        M,
        `${at}.entry`,
        `${f.entry} is not in js/platform/builtins.js yet: that line is added when a maintainer vendors the family (sdk/README.md, "Vendoring")`
      );
    }
  });
  const code = (m.assets || []).filter(a => a?.role === 'code');
  if (!code.length)
    report.error(
      M,
      'assets',
      'an executable capability declares its module as a code asset'
    );
  for (const a of code) {
    const text = ext.files.get(a.path)?.toString('utf8') || '';
    for (const spec of [
      ...text.matchAll(/^\s*import\b[^'"]*['"]([^'"]+)['"]/gm),
    ].map(x => x[1])) {
      const inside =
        spec.startsWith('./') &&
        !path.posix
          .normalize(path.posix.join(path.posix.dirname(a.path), spec))
          .startsWith('..');
      if (!inside) {
        report.warn(
          a.path,
          '',
          `imports ${spec}: a Gravitas module outside the SDK's public API, so no SDK version promises it will not change`
        );
      }
    }
  }
  return [];
}

// --- Test --------------------------------------------------------------------------

/**
 * Run an extension against the public API, as Gravitas would use it.
 * @returns {Promise<{passed: string[], failed: string[]}>}
 */
export async function testExtension(ext, { type, manifest: m }) {
  const passed = [];
  const failed = [];
  const check = (ok, what) => (ok ? passed : failed).push(what);
  const json = f => JSON.parse(ext.files.get(f).toString('utf8'));
  if (type === 'data-pack') {
    const entry = m.provides.dataPacks[0];
    const pack = json(entry.provenance);
    let o;
    try {
      o = observationOf(json(entry.file));
      check(true, `${entry.file} decodes with observationOf()`);
    } catch (err) {
      check(
        false,
        `${entry.file} decodes with observationOf(): ${err.message}`
      );
      return { passed, failed };
    }
    const problems = checkObservation(o);
    check(
      !problems.length,
      `the series is clean${problems.length ? `: ${problems[0]}` : ''} (${o.x.values.length} points)`
    );
    const rule = pack.validation?.rule;
    if (rule?.kind === 'folded-depth') {
      const depth = foldedDepth(o, rule.periodDays);
      check(
        Math.abs(depth - rule.expected) <= rule.tolerance,
        `folded on ${rule.periodDays} d, the depth is ${depth.toFixed(5)}; expected ${rule.expected} within ${rule.tolerance}`
      );
    } else if (rule) {
      check(
        false,
        `validation.rule "${rule.kind}" is not a check this SDK can run`
      );
    }
  } else if (type === 'course-pack') {
    const ids = await publicIds();
    const course = json(m.provides.courses[0].file);
    for (const unit of course.units || []) {
      for (const { lesson } of unit.lessons || []) {
        const titles = ids.lessonTitles.get(lesson) || {};
        for (const l of course.locales || [])
          check(
            Boolean(titles[l]),
            `${lesson} opens in ${l}${titles[l] ? ` as "${titles[l]}"` : ': Gravitas has no translation'}`
          );
      }
    }
  } else if (type === 'capability') {
    const dir = ext.archive ? materialize(ext) : ext.source;
    for (const family of m.provides.widgetFamilies) {
      const asset = (m.assets || []).find(a => a.role === 'code');
      const mod = await import(
        pathToFileURL(path.resolve(dir, asset.path)).href
      );
      const widgets = Object.values(mod).find(
        v => Array.isArray(v) && v.some(w => w && family.widgets.includes(w.id))
      );
      check(
        Boolean(widgets),
        `${asset.path} exports the family's widgets as an array`
      );
      if (!widgets) continue;
      check(
        JSON.stringify(widgets.map(w => w.id).sort()) ===
          JSON.stringify([...family.widgets].sort()),
        `the exported widgets are exactly ${family.widgets.join(', ')}`
      );
      for (const w of widgets)
        for (const [ok, what] of widgetContract(w))
          check(ok, `${w.id}: ${what}`);
    }
  }
  return { passed, failed };
}

/** An archive's files on disk, so its code can be imported to be tested. */
function materialize(ext) {
  const dir = mkdtempSync(path.join(tmpdir(), 'gravitas-ext-'));
  for (const [name, body] of ext.files) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), body);
  }
  return dir;
}

/** The instrument contract js/widgets.js relies on, as [ok, what] pairs. */
export function widgetContract(w) {
  const out = [];
  const is = (ok, what) => out.push([Boolean(ok), what]);
  is(
    typeof w.id === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(w.id),
    'a kebab-case id'
  );
  is(typeof w.title === 'string' && w.title.trim(), 'a title');
  is(
    typeof w.note === 'string' && w.note.trim(),
    'a note saying what it shows'
  );
  is(Array.isArray(w.controls), 'a list of controls');
  const values = {};
  for (const c of w.controls || []) {
    const ok =
      typeof c.id === 'string' &&
      typeof c.label === 'string' &&
      c.min < c.max &&
      c.step > 0 &&
      c.value >= c.min &&
      c.value <= c.max;
    is(
      ok,
      `control ${c.id}: a label, min < max, step > 0 and a default inside the range`
    );
    values[c.id] = c.value;
  }
  is(typeof w.draw === 'function', 'a draw(canvas, values) function');
  for (const name of ['compute', 'readout']) {
    if (w[name] !== undefined)
      is(typeof w[name] === 'function', `${name} is a function`);
  }
  try {
    const rows = w.readout ? w.readout(values) : [];
    is(
      Array.isArray(rows) &&
        rows.every(
          r =>
            typeof r?.label === 'string' &&
            ['string', 'number'].includes(typeof r?.value)
        ),
      'readout(defaults) returns rows of { label, value }'
    );
  } catch (err) {
    is(false, `readout(defaults) throws: ${err.message}`);
  }
  try {
    if (w.compute) w.compute(values);
    is(true, 'compute(defaults) runs');
  } catch (err) {
    is(false, `compute(defaults) throws: ${err.message}`);
  }
  return out;
}

// --- Describe ------------------------------------------------------------------------

/** What `sdk inspect` prints: the manifest's claims and each file's checksum. */
export async function describeExtension(
  ext,
  { type, manifest: m, findings: list },
  { preview = false } = {}
) {
  const lines = [];
  const say = s => lines.push(s);
  say(
    `${m.id} ${m.version}  ${type} (${m.kind})  platform ${m.gravitas}${acceptsPlatform(m.gravitas) ? '' : `  NOT accepted by ${PLATFORM_API}`}`
  );
  say(
    `  title      ${LOCALES.map(l => `${l}: ${m.title?.[l] ?? '(none)'}`).join(' | ')}`
  );
  for (const [k, v] of Object.entries(m.provides || {}))
    say(
      `  provides   ${k}: ${v.map(e => e.id || e.path || e.locale).join(', ')}`
    );
  for (const a of m.assets || []) {
    const b = ext.files.get(a.path);
    say(
      `  asset      ${a.path}  ${a.role}, offline ${a.offline}${b ? `, ${b.length} B, ${sha256(b).slice(0, 12)}` : ', MISSING'}`
    );
  }
  for (const l of m.licenses || [])
    say(`  licence    ${l.scope}: ${l.license}`);
  for (const c of m.citations || []) say(`  cite       ${c.text}`);
  const errors = list.filter(f => f.severity === 'error').length;
  say(
    `  findings   ${errors} error${errors === 1 ? '' : 's'}, ${list.length - errors} warning${list.length - errors === 1 ? '' : 's'}`
  );
  if (preview && !errors) {
    const json = f => JSON.parse(ext.files.get(f).toString('utf8'));
    if (type === 'data-pack') {
      const o = observationOf(json(m.provides.dataPacks[0].file));
      const y = o.y.values;
      const lo = Math.min(...y);
      const hi = Math.max(...y);
      const bars = '▁▂▃▄▅▆▇█';
      const width = 64;
      const step = Math.max(1, Math.floor(y.length / width));
      let spark = '';
      for (let i = 0; i < y.length; i += step) {
        const v = Math.min(...y.subarray(i, i + step));
        spark +=
          bars[Math.round(((v - lo) / (hi - lo || 1)) * (bars.length - 1))];
      }
      say(
        `  preview    ${o.x.values.length} points, ${o.x.name} ${o.x.values[0].toFixed(3)} to ${o.x.values.at(-1).toFixed(3)} ${o.x.unit} (${o.x.scale}), ${o.y.name} ${lo.toFixed(5)} to ${hi.toFixed(5)}`
      );
      say(`             ${spark}`);
    } else if (type === 'course-pack') {
      const ids = await publicIds();
      const course = json(m.provides.courses[0].file);
      for (const u of course.units) {
        say(`  unit       ${u.title.en}`);
        for (const { lesson } of u.lessons)
          say(
            `               ${lesson}: ${ids.lessonTitles.get(lesson)?.en ?? '?'}`
          );
      }
    } else if (type === 'capability') {
      const dir = ext.archive ? materialize(ext) : ext.source;
      const asset = m.assets.find(a => a.role === 'code');
      const mod = await import(
        pathToFileURL(path.resolve(dir, asset.path)).href
      );
      for (const w of Object.values(mod).find(v => Array.isArray(v)) || []) {
        const values = Object.fromEntries(
          (w.controls || []).map(c => [c.id, c.value])
        );
        say(`  instrument ${w.id}: ${w.title}`);
        for (const r of w.readout?.(values) || [])
          say(`               ${r.label}: ${r.value}`);
      }
    }
  }
  return lines.join('\n');
}

/** The files `sdk pack` puts in the archive: the manifest and its assets. */
export function packFiles(ext, manifest) {
  const files = new Map([[MANIFEST_ENTRY, ext.files.get(MANIFEST_ENTRY)]]);
  for (const a of manifest.assets || [])
    files.set(a.path, ext.files.get(a.path));
  for (const name of ext.files.keys())
    if (/^README\.md$/i.test(name) || /^LICENSE/i.test(name))
      files.set(name, ext.files.get(name));
  return files;
}
