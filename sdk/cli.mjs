#!/usr/bin/env node
// =============================================================================
// The Gravitas Extension SDK
// -----------------------------------------------------------------------------
//   npm run sdk -- init <data-pack|course-pack|capability> <id> [--dir <path>]
//   npm run sdk -- validate <extension-dir|archive.gxp>... | --all [--json]
//   npm run sdk -- test <extension-dir|archive.gxp>... | --all
//   npm run sdk -- pack <extension-dir> [--out <dir>]
//   npm run sdk -- inspect <extension-dir|archive.gxp> [--preview]
//
// Exit status: 0 when everything asked for passed, 1 when anything failed,
// 2 when the command itself was wrong. sdk/README.md is the author's guide.
// =============================================================================

import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { pack } from './lib/archive.mjs';
import {
  describeExtension,
  formatFinding,
  loadExtension,
  packFiles,
  testExtension,
  validateExtension,
} from './lib/extension.mjs';
import { scaffold, TEMPLATES } from './lib/templates.mjs';
import { SDK_VERSION } from './lib/api.mjs';

const USAGE = `Gravitas Extension SDK ${SDK_VERSION}

  init <${Object.keys(TEMPLATES).join('|')}> <id> [--dir <path>]
  validate <extension-dir|archive.gxp>... | --all [--json]
  test <extension-dir|archive.gxp>... | --all
  pack <extension-dir> [--out <dir>]
  inspect <extension-dir|archive.gxp> [--preview]

sdk/README.md has the whole workflow.`;

const flag = (argv, name) => argv.includes(name);
/** --all: the SDK's examples, and every extension a contributor has added. */
const ALL_ROOTS = ['sdk/examples', 'extensions'];
const everyExtension = () =>
  ALL_ROOTS.filter(r => existsSync(r)).flatMap(r =>
    readdirSync(r)
      .sort()
      .map(n => path.join(r, n))
      .filter(d => statSync(d).isDirectory())
  );
const option = (argv, name) =>
  argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined;
const positional = argv =>
  argv.filter(
    (a, i) => !a.startsWith('--') && !['--dir', '--out'].includes(argv[i - 1])
  );

async function validateAll(sources, { json = false, log = console.log } = {}) {
  let failed = false;
  const results = [];
  for (const source of sources) {
    const ext = loadExtension(source);
    const result = await validateExtension(ext);
    results.push({ source, type: result.type, findings: result.findings });
    const errors = result.findings.filter(f => f.severity === 'error');
    if (errors.length) failed = true;
    if (!json) {
      for (const f of result.findings)
        log(formatFinding(f, ext.archive ? `${source}!` : source));
      log(
        `${source}: ${result.type ?? 'unknown type'}, ${errors.length ? `${errors.length} error${errors.length === 1 ? '' : 's'}` : 'valid'}${result.findings.length - errors.length ? `, ${result.findings.length - errors.length} warning(s)` : ''}`
      );
    }
  }
  if (json) log(JSON.stringify(results, null, 2));
  return failed;
}

/**
 * Run one command.
 * @param {string[]} argv - Arguments after the script name
 * @param {{log?: Function, cwd?: string}} [io]
 * @returns {Promise<number>} The exit status
 */
export async function run(argv, { log = console.log } = {}) {
  const [command, ...rest] = argv;
  const args = flag(rest, '--all') ? everyExtension() : positional(rest);
  if (command === 'init') {
    const [type, id] = args;
    if (!TEMPLATES[type] || !id) {
      log(USAGE);
      return 2;
    }
    const dir = option(rest, '--dir') || path.join('extensions', id);
    if (existsSync(dir)) {
      log(`${dir} already exists; init writes only into a new directory`);
      return 2;
    }
    const files = scaffold(type, id);
    for (const [name, body] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
      writeFileSync(path.join(dir, name), body);
    }
    log(
      `${dir}: a ${type} named ${id}, ${Object.keys(files).length} files. Next: npm run sdk -- validate ${dir}`
    );
    return 0;
  }
  if (command === 'validate') {
    if (!args.length) return (log(USAGE), 2);
    return (await validateAll(args, { json: flag(rest, '--json'), log }))
      ? 1
      : 0;
  }
  if (command === 'test') {
    if (!args.length) return (log(USAGE), 2);
    let failed = false;
    for (const source of args) {
      const ext = loadExtension(source);
      const result = await validateExtension(ext);
      if (result.findings.some(f => f.severity === 'error')) {
        for (const f of result.findings) log(formatFinding(f, source));
        log(`${source}: not tested, because it is not valid`);
        failed = true;
        continue;
      }
      const t = await testExtension(ext, result);
      for (const p of t.passed) log(`  ok    ${p}`);
      for (const p of t.failed) log(`  FAIL  ${p}`);
      log(`${source}: ${t.passed.length} passed, ${t.failed.length} failed`);
      if (t.failed.length) failed = true;
    }
    return failed ? 1 : 0;
  }
  if (command === 'pack') {
    const [source] = args;
    if (!source) return (log(USAGE), 2);
    const ext = loadExtension(source);
    const result = await validateExtension(ext);
    if (result.findings.some(f => f.severity === 'error')) {
      for (const f of result.findings) log(formatFinding(f, source));
      log(`${source}: not packed, because it is not valid`);
      return 1;
    }
    const bytes = pack(packFiles(ext, result.manifest));
    const out = option(rest, '--out') || '.';
    mkdirSync(out, { recursive: true });
    const file = path.join(
      out,
      `${result.manifest.id}-${result.manifest.version}.gxp`
    );
    writeFileSync(file, bytes);
    log(
      `${file}  ${bytes.length} bytes  sha256 ${createHash('sha256').update(bytes).digest('hex')}`
    );
    return 0;
  }
  if (command === 'inspect') {
    const [source] = args;
    if (!source) return (log(USAGE), 2);
    const ext = loadExtension(source);
    const result = await validateExtension(ext);
    if (!result.manifest || !result.type) {
      for (const f of result.findings) log(formatFinding(f, source));
      return 1;
    }
    log(
      await describeExtension(ext, result, { preview: flag(rest, '--preview') })
    );
    for (const f of result.findings) log(formatFinding(f, source));
    return result.findings.some(f => f.severity === 'error') ? 1 : 0;
  }
  log(USAGE);
  return command ? 2 : 0;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run(process.argv.slice(2)).then(
    code => process.exit(code),
    err => {
      console.error(err.message);
      process.exit(2);
    }
  );
}
