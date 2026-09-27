#!/usr/bin/env node
// =============================================================================
// Studio round-trip spike: the measurements behind STUDIO_ROUNDTRIP_GATE.md
// -----------------------------------------------------------------------------
// node spike/studio/harness.mjs [--out spike/studio/evidence.json]
//
// Runs the gate's fixed edit script through core.mjs's change set on the
// repository's own sources, and measures thresholds T1-T3 and T6-T13 in Node.
// T4 (validation inside the Studio), T5 (preview) and T14 (cost) are measured
// in a browser by browser.mjs, which reads what this writes to spike/studio/out/.
// Disposable prototype code.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, symlinkSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'acorn';

import * as S from './core.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(REPO, 'spike/studio/out');
mkdirSync(OUT, { recursive: true });
const read = rel => readFileSync(path.join(REPO, rel), 'utf8');

// --- The files in scope ------------------------------------------------------------

const FILES = {
  'js/data/investigations/twelve-nights.js': { locator: { kind: 'lesson' } },
  'js/data/investigations/es/twelve-nights.js': { locator: { kind: 'shadow' } },
  'js/data/instructorContent.js': {
    locator: { kind: 'entry', object: 'INSTRUCTOR_CONTENT', key: 'twelve-nights' },
  },
  'js/scenarios.js': { locator: { kind: 'preset', name: 'Alien Dyson Swarm Collapse' } },
  'js/data/scenarioInfo.js': {
    locator: { kind: 'entry', object: 'SCENARIO_STRUCTURE', key: 'Alien Dyson Swarm Collapse' },
  },
  'js/i18n/en.js': {
    locator: { kind: 'entry', object: 'EN', key: 'scenario.Alien Dyson Swarm Collapse.title' },
  },
  'js/i18n/es.js': {
    locator: { kind: 'entry', object: 'ES', key: 'scenario.Alien Dyson Swarm Collapse.title' },
  },
};
for (const [f, v] of Object.entries(FILES)) v.source = read(f);
const LESSON = 'js/data/investigations/twelve-nights.js';
const SHADOW = 'js/data/investigations/es/twelve-nights.js';
const INSTR = 'js/data/instructorContent.js';

const evidence = { base: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO, encoding: 'utf8' }).trim() };
const pass = (id, ok, detail) => {
  evidence[id] = { pass: Boolean(ok), ...detail };
  process.stdout.write(`${id} ${ok ? 'PASS' : 'FAIL'}\n`);
};

// Evaluate a module's text without writing it anywhere: a data: URL.
const evaluate = async text =>
  (await import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`)).default;
const comments = text => {
  const c = [];
  parse(text, { ecmaVersion: 'latest', sourceType: 'module', onComment: c });
  return c.map(x => x.value);
};

// --- T1: identity ----------------------------------------------------------------------

const bases = {};
for (const [f, v] of Object.entries(FILES)) bases[f] = await S.sha256(v.source);
{
  const empty = { format: S.FORMAT, version: S.VERSION, bases, edits: [] };
  const r = await S.replay(empty, FILES);
  const identical = Object.entries(r.sources).map(([f, t]) => [f, t === FILES[f].source]);
  const imports = Object.entries(FILES).map(([f, v]) => {
    try {
      return [f, S.checkImport(v.source, v.source, v.locator)];
    } catch (e) {
      return [f, e.message];
    }
  });
  pass('T1', identical.every(([, ok]) => ok) && imports.every(([, ok]) => ok === true), {
    files: Object.fromEntries(identical),
    importAccepted: Object.fromEntries(imports),
  });
}

// --- The edit script, resolved against the lesson's sids --------------------------------

const baseLesson = await evaluate(FILES[LESSON].source);
const sidIndex = (lesson, sid) => lesson.steps.findIndex(s => s.sid === sid);
const NEW_READ = {
  sid: 'studio-inserted-read',
  type: 'read',
  title: 'A step the Studio inserted',
  body: 'Read this before you plan: the <strong>window</strong> moves every night.',
};
const NEW_QUESTION = {
  sid: 'studio-inserted-question',
  type: 'question',
  kind: 'choice',
  title: 'A question the Studio inserted',
  body: 'The window opens earlier each night.',
  prompt: 'By about how much does it open earlier each night?',
  options: ['About one minute', 'About four minutes', 'About an hour', 'It does not move'],
  answer: 1,
  because: 'The window follows the sidereal day, which is about four minutes shorter than the solar day.',
};

function editScript() {
  // Indices move as steps go in and out; each is resolved on the lesson as it
  // stands when the edit is made, which is what a Studio addressing steps by
  // sid does.
  const steps = baseLesson.steps.map(s => s.sid);
  const at = sid => steps.indexOf(sid);
  const E = [];
  const lesson = (op, rest) => E.push({ file: LESSON, op, ...rest });
  const shadow = (op, rest) => E.push({ file: SHADOW, op, ...rest });
  // 1. Reword a step's title and body.
  lesson('set', { path: ['steps', at('the-allocation'), 'title'], value: 'Twelve nights, and a catch' });
  lesson('set', {
    path: ['steps', at('the-allocation'), 'body'],
    value: 'A committee has given you <strong>twelve nights</strong> on HD 209458 from La Silla.\n\nThe target never rises high: plan around that.',
  });
  // 2. Reword one option of a choice step.
  lesson('set', { path: ['steps', at('predict-the-comb'), 'options', 2], value: 'A comb whose teeth drift by four minutes a night' });
  // 3. A measure field's hint (Twelve Nights has no numeric answer with a
  //    tolerance: the other half of edit 3 does not apply to it).
  lesson('set', { path: ['steps', at('measure-the-window'), 'fields', 0, 'hint'], value: '5.0' });
  // 4. Insert a read step before the-three-plans, and a choice question
  //    before commit-and-observe; the shadow gets `null` (not translated) at
  //    the same index, which keeps every later step aligned.
  let i = at('the-three-plans');
  lesson('insert', { path: ['steps'], index: i, value: NEW_READ });
  shadow('insert', { path: ['steps'], index: i, value: null });
  steps.splice(i, 0, NEW_READ.sid);
  i = at('commit-and-observe');
  lesson('insert', { path: ['steps'], index: i, value: NEW_QUESTION });
  shadow('insert', { path: ['steps'], index: i, value: null });
  steps.splice(i, 0, NEW_QUESTION.sid);
  // 5. Delete a step, and its shadow entry.
  i = at('sixty-nights-would-not-help');
  lesson('remove', { path: ['steps'], index: i });
  shadow('remove', { path: ['steps'], index: i });
  steps.splice(i, 1);
  // 6. The scenario: two settings, its English title, one tag.
  E.push({ file: 'js/scenarios.js', op: 'set', path: ['num_stars'], value: 150 });
  E.push({ file: 'js/scenarios.js', op: 'set', path: ['trail_length'], value: 24 });
  E.push({ file: 'js/i18n/en.js', op: 'set', path: [], value: 'Alien Dyson Swarm Collapse, Revisited' });
  E.push({ file: 'js/data/scenarioInfo.js', op: 'set', path: ['tags', 1], value: 'orbits-kepler' });
  return { edits: E, after: steps };
}
const script = editScript();

// The instructor entry's step-numbered references, renumbered to follow the
// sids they named (T9): expectations keys and flow ranges.
const baseInstr = (await import(pathToFileURL(path.join(REPO, INSTR)))).INSTRUCTOR_CONTENT['twelve-nights'];
const beforeSids = baseLesson.steps.map(s => s.sid);
const afterSids = script.after;
const renumber = n => {
  const sid = beforeSids[n - 1];
  const j = afterSids.indexOf(sid);
  return j < 0 ? null : j + 1;
};
const instructorEdits = [];
const review = [];
{
  const keys = Object.keys(baseInstr.expectations).map(Number).sort((a, b) => b - a);
  // Descending, so a renamed key never lands on one not yet moved.
  for (const k of keys) {
    const to = renumber(k);
    if (to === null) review.push({ where: `expectations.${k}`, why: 'its step was deleted' });
    else if (to !== k) instructorEdits.push({ file: INSTR, op: 'rekey', path: ['expectations', String(k)], key: String(to) });
  }
  baseInstr.flow.forEach((f, idx) => {
    const m = /^(\d+)(?:-(\d+))?$/.exec(String(f.steps));
    if (!m) return review.push({ where: `flow.${idx}`, why: `a range the Studio does not read: ${f.steps}` });
    const a = renumber(Number(m[1]));
    const b = m[2] ? renumber(Number(m[2])) : null;
    if (a === null || (m[2] && b === null))
      return review.push({ where: `flow.${idx}`, why: `a deleted step in ${f.steps}` });
    const next = m[2] ? `${a}-${b}` : `${a}`;
    if (next !== f.steps) instructorEdits.push({ file: INSTR, op: 'set', path: ['flow', idx, 'steps'], value: next });
  });
  // Prose that names a step by number cannot be renumbered safely: listed.
  const walk = (v, where) => {
    if (typeof v === 'string') {
      for (const m of v.matchAll(/\b[Ss]teps? (\d+)(?:\s*(?:-|–|and|to)\s*(\d+))?/g))
        review.push({ where, why: `prose names "${m[0]}"` });
    } else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) if (!(where.startsWith('flow') && k === 'steps')) walk(x, `${where}.${k}`);
  };
  for (const [k, v] of Object.entries(baseInstr)) walk(v, k);
}
// And the lesson's own prose that names steps by number.
const lessonReview = [];
baseLesson.steps.forEach(s => {
  for (const k of ['body', 'because', 'tip', 'prompt'])
    for (const m of String(s[k] ?? '').matchAll(/\bsteps? (\d+)\b/gi)) lessonReview.push({ sid: s.sid, field: k, text: m[0] });
});

const edits = [...script.edits, ...instructorEdits];
const changes = { format: S.FORMAT, version: S.VERSION, bases, edits };
writeFileSync(path.join(OUT, 'changes.json'), `${JSON.stringify(changes, null, 2)}\n`);

// --- Apply ------------------------------------------------------------------------------

const applied = await S.replay(changes, FILES);
for (const [f, t] of Object.entries(applied.sources)) {
  const dest = path.join(OUT, 'sources', f);
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, t);
}

// --- T2: lossless edits -------------------------------------------------------------------

{
  const perFile = {};
  for (const [f, v] of Object.entries(FILES)) {
    const before = v.source;
    const after = applied.sources[f];
    const bAst = S.parseSource(before);
    const aAst = S.parseSource(after);
    const bLoc = S.locate(bAst, v.locator);
    const aLoc = S.locate(aAst, v.locator);
    // Outside the edited object: identical bytes.
    const outside =
      before.slice(0, bLoc.root.start) === after.slice(0, aLoc.root.start) &&
      before.slice(bLoc.root.end) === after.slice(aLoc.root.end);
    // Code: identical text, function by function, with the edited object set
    // aside (a preset's literal sits inside applyPreset).
    const masked = (t, r) => t.slice(0, r.start) + '{}' + t.slice(r.end);
    const code =
      JSON.stringify(S.codeOf(masked(before, bLoc.root))) ===
      JSON.stringify(S.codeOf(masked(after, aLoc.root)));
    // Comments: identical.
    const comm = JSON.stringify(comments(before)) === JSON.stringify(comments(after));
    // Inside: the same shape once the structural edits are replayed on the
    // base's shape (literal values masked).
    const expect = S.shapeOf(bLoc.root);
    const fileEdits = edits.filter(e => e.file === f);
    const pathShape = (shape, p) => {
      let n = shape;
      for (const step of p) {
        if (n.t === 'ObjectExpression') n = n.properties.find(q => q.key === String(step)).value;
        else if (n.t === 'ArrayExpression') n = n.elements[step];
        else return null;
      }
      return n;
    };
    for (const e of fileEdits) {
      if (e.op === 'insert') {
        const arr = pathShape(expect, e.path);
        const inserted = S.shapeOf(S.parseSource(`x = ${S.render(e.value, '')}`).body[0].expression.right);
        arr.elements.splice(e.index, 0, inserted);
      } else if (e.op === 'remove') pathShape(expect, e.path).elements.splice(e.index, 1);
      else if (e.op === 'rekey') {
        const obj = pathShape(expect, e.path.slice(0, -1));
        const prop = obj.properties.find(q => q.key === String(e.path.at(-1)));
        prop.key = String(e.key);
      }
    }
    const shape = JSON.stringify(expect) === JSON.stringify(S.shapeOf(aLoc.root));
    // Inserted text is data only.
    const insertsData = fileEdits.filter(e => e.op === 'insert').every(e => e.value === null || S.isDataNode(S.parseSource(`x = ${S.render(e.value, '')}`).body[0].expression.right));
    perFile[f] = { outside, code, comments: comm, shape, insertsData, edits: fileEdits.length, bytes: [before.length, after.length] };
  }
  pass('T2', Object.values(perFile).every(r => r.outside && r.code && r.comments && r.shape && r.insertsData), {
    perFile,
    notApplicable: 'edit 3b: Twelve Nights has no numeric answer with a tolerance',
  });
}

// --- T3: one registry: a patch git accepts, and regeneration by existing commands --------

const patchLines = [];
for (const f of Object.keys(FILES)) {
  const a = path.join(REPO, f);
  const b = path.join(OUT, 'sources', f);
  try {
    execFileSync('diff', ['-u', '--label', `a/${f}`, '--label', `b/${f}`, a, b], { encoding: 'utf8' });
  } catch (e) {
    patchLines.push(e.stdout);
  }
}
const patch = patchLines.join('');
writeFileSync(path.join(OUT, 'studio.patch'), patch);
const tmp = realpathSync(mkdtempSync(path.join(tmpdir(), 'studio-gate-')));
execFileSync('sh', ['-c', `git archive HEAD | tar -x -C "${tmp}"`], { cwd: REPO });
execFileSync('git', ['init', '-q'], { cwd: tmp });
execFileSync('git', ['add', '-A'], { cwd: tmp });
execFileSync('git', ['-c', 'user.email=spike@example.invalid', '-c', 'user.name=spike', 'commit', '-q', '-m', 'base'], { cwd: tmp });
symlinkSync(path.join(REPO, 'node_modules'), path.join(tmp, 'node_modules'));
let applies = false;
let applyError = '';
try {
  execFileSync('git', ['apply', '--check', path.join(OUT, 'studio.patch')], { cwd: tmp, stdio: 'pipe' });
  execFileSync('git', ['apply', path.join(OUT, 'studio.patch')], { cwd: tmp, stdio: 'pipe' });
  applies = true;
} catch (e) {
  applyError = String(e.stderr);
}
const identicalToOut = Object.keys(FILES).every(f => readFileSync(path.join(tmp, f), 'utf8') === applied.sources[f]);
// T4's reference: author:check on the patched tree as the Studio leaves it,
// before any maintainer regeneration (the browser cannot regenerate).
const authorCheck = () => {
  try {
    return execFileSync('node', ['tools/author-check.mjs', '--lesson=twelve-nights', '--json', '--warnings'], { cwd: tmp, encoding: 'utf8' });
  } catch (e) {
    return e.stdout;
  }
};
const beforeRegen = authorCheck();
writeFileSync(path.join(OUT, 'author-check-before-regeneration.json'), beforeRegen);
const regen = {};
const run = (name, cmd) => {
  try {
    execFileSync('sh', ['-c', cmd], { cwd: tmp, stdio: 'pipe', env: { ...process.env, NODE_OPTIONS: '' }, timeout: 600000 });
    regen[name] = 'ok';
  } catch (e) {
    regen[name] = `failed: ${String(e.stderr || e.stdout).trim().split('\n').slice(-3).join(' | ')}`;
  }
};
run('manifest', 'npm run manifest --silent');
run('audit:scene', 'npm run audit:scene --silent -- --write');
run('teaching:data', 'npm run teaching:data --silent');
run('docs:sync', 'npm run docs:sync --silent');
let formatChanged;
try {
  execFileSync('npx', ['prettier', '--check', ...Object.keys(FILES)], { cwd: tmp, stdio: 'pipe' });
  formatChanged = 'Prettier-clean as written';
} catch (e) {
  formatChanged = String(e.stdout || e.stderr).trim();
}
const checks = {};
const check = (name, cmd) => {
  try {
    execFileSync('sh', ['-c', cmd], { cwd: tmp, stdio: 'pipe', timeout: 600000 });
    checks[name] = 'pass';
  } catch (e) {
    checks[name] = `fail: ${String(e.stdout || e.stderr).trim().split('\n').slice(-4).join(' | ')}`;
  }
};
check('manifest:check', 'node tools/build-investigation-manifest.js --check');
check('audit:scene:check', 'npm run audit:scene:check --silent');
check('docs:check', 'npm run docs:check --silent');
check('teaching:check', 'npm run teaching:check --silent');
check('instructors:check', 'npm run instructors:check --silent');
check('author:check', 'npm run author:check --silent -- --lesson=twelve-nights');
const changedFiles = execFileSync('git', ['status', '--porcelain'], { cwd: tmp, encoding: 'utf8' }).trim().split('\n');
pass('T3', applies && identicalToOut, {
  patchBytes: patch.length,
  gitApply: applies ? 'clean' : applyError,
  appliedEqualsStudioOutput: identicalToOut,
  regenerated: regen,
  prettierReformatted: formatChanged.trim() || 'nothing',
  checksAfterRegeneration: checks,
  filesChangedInRepo: changedFiles,
  note: 'build:instructors needs the passphrase: a maintainer step, never the Studio',
});
evidence.tmp = tmp;

// --- T4 (Node half): the findings author:check gives on the patched tree ------------------

{
  const out = authorCheck();
  writeFileSync(path.join(OUT, 'author-check.json'), out);
  const parseOr = t => { try { return JSON.parse(t); } catch { return t.slice(0, 400); } };
  evidence.T4node = { beforeRegeneration: parseOr(beforeRegen), afterRegeneration: parseOr(out) };
}

// --- T6: existing answer primitives only --------------------------------------------------

{
  const afterLesson = await evaluate(applied.sources[LESSON]);
  const kinds = afterLesson.steps.map(s => ({
    sid: s.sid,
    check: typeof s.validate === 'function' ? 'validate (read-only code)' : s.kind === 'choice' || s.type === 'predict' ? (Number.isInteger(s.answer) ? 'choice index' : 'prediction') : s.kind === 'short' ? 'rubric' : s.kind === 'numeric' ? 'numeric+tolerance' : 'none',
  }));
  const code = S.codeOf(FILES[LESSON].source);
  const codeAfter = S.codeOf(applied.sources[LESSON]);
  let refused = null;
  try {
    S.applyEdit(FILES[LESSON].source, { kind: 'lesson' }, { op: 'set', path: ['steps', 2, 'validate'], value: 'x' });
  } catch (e) {
    refused = e.code;
  }
  pass('T6', code.length === 3 && JSON.stringify(code) === JSON.stringify(codeAfter) && refused === 'code', {
    validators: code.length,
    byteIdentical: JSON.stringify(code) === JSON.stringify(codeAfter),
    editingAValidator: refused,
    checksPerStep: kinds,
    ops: ['set', 'insert', 'remove', 'rekey'],
  });
}

// --- T7: stable ids and fingerprints -------------------------------------------------------

{
  const { stepFingerprint } = await import(pathToFileURL(path.join(REPO, 'js/investigations/progressBackup.js')));
  const { isValidSid } = await import(pathToFileURL(path.join(REPO, 'js/investigations/progressSchema.js')));
  const afterLesson = await evaluate(applied.sources[LESSON]);
  const before = new Map(baseLesson.steps.map(s => [s.sid, stepFingerprint(s)]));
  const after = new Map(afterLesson.steps.map(s => [s.sid, stepFingerprint(s)]));
  const actual = {};
  for (const [sid, fp] of before)
    actual[sid] = !after.has(sid) ? 'deleted' : after.get(sid) === fp ? 'same' : 'changed';
  for (const sid of after.keys()) if (!before.has(sid)) actual[sid] = 'new';
  // The Studio's prediction, from the edits alone: a step is changed when an
  // edit touches a fingerprinted field (type, kind, tool id, setup scenario,
  // field ids, option count, answer, tolerance, unit, correct).
  const FP = new Set(['type', 'kind', 'tool', 'setup', 'fields', 'options', 'answer', 'tolerance', 'unit', 'correct']);
  const predicted = Object.fromEntries(beforeSids.map(s => [s, 'same']));
  const order = [...beforeSids];
  for (const e of script.edits.filter(x => x.file === LESSON)) {
    if (e.op === 'insert') {
      order.splice(e.index, 0, e.value.sid);
      predicted[e.value.sid] = 'new';
    } else if (e.op === 'remove') {
      predicted[order[e.index]] = 'deleted';
      order.splice(e.index, 1);
    } else if (e.op === 'set') {
      const sid = order[e.path[1]];
      const field = e.path[2];
      // Option wording and field hints are not fingerprinted; ids and counts are.
      const touches = FP.has(field) && !((field === 'options' && e.path.length === 4) || (field === 'fields' && e.path[4] !== 'id'));
      if (touches && predicted[sid] === 'same') predicted[sid] = 'changed';
    }
  }
  const sidsKept = beforeSids.filter(s => afterLesson.steps.some(x => x.sid === s)).length;
  const newValid = [NEW_READ.sid, NEW_QUESTION.sid].every(isValidSid);
  const unique = new Set(afterLesson.steps.map(s => s.sid)).size === afterLesson.steps.length;
  pass('T7', JSON.stringify(actual) === JSON.stringify(predicted) && newValid && unique, {
    actual,
    predicted,
    sidsKept,
    newSidsValid: newValid,
    unique,
    note: 'reworded text and option wording are NOT fingerprinted: saved answers and assignment links keep them silently',
  });
}

// --- T8: translation ----------------------------------------------------------------------

{
  const { mergeTranslation } = await import(pathToFileURL(path.join(REPO, 'js/data/investigations/i18n.js')));
  const baseShadow = await evaluate(FILES[SHADOW].source);
  const afterLesson = await evaluate(applied.sources[LESSON]);
  const afterShadow = await evaluate(applied.sources[SHADOW]);
  const before = mergeTranslation(baseLesson, baseShadow);
  const after = mergeTranslation(afterLesson, afterShadow);
  const spanishOf = m => new Map(m.steps.map(s => [s.sid, s.title]));
  const b = spanishOf(before);
  const a = spanishOf(after);
  const misaligned = [];
  for (const [sid, title] of a) {
    if (!b.has(sid)) {
      // A new step shows its English until translated.
      if (title !== afterLesson.steps.find(s => s.sid === sid).title) misaligned.push(sid);
    } else if (title !== b.get(sid) && sid !== 'the-allocation') misaligned.push(sid);
  }
  // Stale: English strings edited where the shadow has a translation.
  const stale = [];
  const order = [...beforeSids];
  for (const e of script.edits.filter(x => x.file === LESSON)) {
    if (e.op === 'insert') order.splice(e.index, 0, e.value.sid);
    else if (e.op === 'remove') order.splice(e.index, 1);
    else if (e.op === 'set') {
      const idx = e.path[1];
      const sid = order[idx];
      const baseIdx = beforeSids.indexOf(sid);
      let t = baseShadow.steps?.[baseIdx];
      for (const k of e.path.slice(2)) t = t?.[k];
      if (typeof t === 'string') stale.push({ sid, field: e.path.slice(2).join('.'), spanish: t.slice(0, 60) });
    }
  }
  // Without the Studio's shadow edits: the index shift every later step suffers.
  const noShadowEdits = mergeTranslation(afterLesson, baseShadow);
  const shifted = noShadowEdits.steps.filter(s => b.has(s.sid) && s.title !== b.get(s.sid) && s.sid !== 'the-allocation').map(s => s.sid);
  const want = ['title', 'body', 'options.2'];
  const staleCovers = want.every(f => stale.some(s => s.field === f));
  pass('T8', misaligned.length === 0 && staleCovers, {
    misaligned,
    stale,
    titleOfEditedStepInSpanish: a.get('the-allocation'),
    withoutShadowEdits: { misalignedSteps: shifted.length, of: afterLesson.steps.length },
  });
}

// --- T9: the instructor boundary ------------------------------------------------------------

{
  const afterInstr = (await import(`${pathToFileURL(path.join(tmp, INSTR))}?t=${Date.now()}`)).INSTRUCTOR_CONTENT['twelve-nights'];
  const same = Object.keys(baseInstr.expectations).every(k => {
    const to = renumber(Number(k));
    if (to === null) return true;
    return afterInstr.expectations[to] === baseInstr.expectations[k];
  });
  const flowOk = baseInstr.flow.every((f, i) => afterInstr.flow[i].text === f.text);
  const touched = changedFilesAll();
  const forbidden = touched.filter(f => /materials\.enc|materials\.manifest|\.instructor|\.pdf$/.test(f));
  pass('T9', same && flowOk && forbidden.length === 0, {
    expectationsFollowTheirSteps: same,
    renumbered: instructorEdits.map(e => `${e.path.join('.')} -> ${e.key ?? e.value}`),
    forReview: review,
    lessonProseNamingSteps: lessonReview,
    instructorFilesInExport: forbidden,
  });
}
function changedFilesAll() {
  return patch.split('\n').filter(l => l.startsWith('+++ b/')).map(l => l.slice(6));
}

// --- T10: hostile inputs ---------------------------------------------------------------------

{
  const L = { kind: 'lesson' };
  const base = FILES[LESSON].source;
  const cases = [];
  const expectRefused = (name, fn) => {
    try {
      fn();
      cases.push({ name, refused: false });
    } catch (e) {
      cases.push({ name, refused: e instanceof S.StudioError, code: e.code, reason: e.message.slice(0, 120) });
    }
  };
  const set = value => S.applyEdit(base, L, { op: 'set', path: ['steps', 0, 'title'], value });
  expectRefused('a function as an edit value', () => set(() => 1));
  expectRefused('markup that prose never carries', () => set('<img src=x onerror=alert(1)>'));
  expectRefused('a script tag', () => set('</script><script>alert(1)</script>'));
  expectRefused('a javascript: URL', () => set('javascript:alert(1)'));
  expectRefused('a __proto__ key in an inserted step', () =>
    S.applyEdit(base, L, { op: 'insert', path: ['steps'], index: 0, value: JSON.parse('{"__proto__": {"x": 1}, "sid": "a"}') }));
  expectRefused('a constructor key', () => S.applyEdit(base, L, { op: 'insert', path: ['steps'], index: 0, value: { constructor: 1 } }));
  expectRefused('a getter', () => {
    const v = { sid: 'g' };
    Object.defineProperty(v, 'title', { get: () => 'x', enumerable: true });
    S.applyEdit(base, L, { op: 'insert', path: ['steps'], index: 0, value: v });
  });
  expectRefused('a non-finite number', () => set(Infinity));
  expectRefused('an oversize string', () => set('x'.repeat(S.LIMITS.stringChars + 1)));
  expectRefused('editing a validator', () => S.applyEdit(base, L, { op: 'set', path: ['steps', 2, 'validate'], value: 'x' }));
  const hostileFile = (name, text) => expectRefused(name, () => S.checkImport(text, base, L));
  hostileFile('an oversize file', `${base}\n//${'x'.repeat(S.LIMITS.fileBytes)}`);
  hostileFile('an added import', `import x from './evil.js';\n${base}`);
  hostileFile('a call in a literal position', base.replace("title: 'Twelve Nights',", "title: fetch('https://evil.invalid'),"));
  hostileFile('a template with an expression', base.replace("title: 'Twelve Nights',", 'title: `${alert(1)}`,'));
  hostileFile('a getter in the lesson', base.replace("title: 'Twelve Nights',", "get title() { return 'x'; },"));
  hostileFile('a changed validator', base.replace('Math.abs(', 'Math.abs(fetch("x"), '));
  hostileFile('a file not shaped like a lesson', 'export const x = 1;');
  hostileFile('markup in an imported lesson', base.replace("title: 'Twelve Nights',", "title: '<iframe src=x>',"));
  // A change set recorded against other sources.
  let tampered = null;
  try {
    await S.replay({ ...changes, bases: { ...bases, [LESSON]: '0'.repeat(64) } }, FILES);
  } catch (e) {
    tampered = e.code;
  }
  cases.push({ name: 'an edit log for other sources', refused: tampered === 'base', code: tampered });
  // And a value that would escape a template literal is written escaped, not run.
  const esc = S.applyEdit(base, L, { op: 'set', path: ['steps', 0, 'body'], value: 'a `b` ${c}' }).source;
  const escaped = (await evaluate(esc)).steps[0].body === 'a `b` ${c}';
  pass('T10', cases.every(c => c.refused) && cases.length >= 10 && escaped, {
    cases,
    templateEscapeHolds: escaped,
    evaluated: 'only the repository’s module, patched by literal edits and re-verified (T2), for preview',
  });
}

// --- T11: undo, redo, recovery --------------------------------------------------------------

{
  const undoAll = await S.replay({ ...changes, edits: [] }, FILES);
  const undone = Object.keys(FILES).every(f => undoAll.sources[f] === FILES[f].source);
  // Undo is replaying a shorter prefix of the log; redo, a longer one. Every
  // prefix must replay, and stepping back one edit and forward again must give
  // the bytes it gave before.
  let steps = true;
  let previous = null;
  for (let k = 0; k <= edits.length; k++) {
    const state = await S.replay({ ...changes, edits: edits.slice(0, k) }, FILES);
    if (k > 0) {
      const back = await S.replay({ ...changes, edits: edits.slice(0, k - 1) }, FILES);
      steps &&= Object.keys(FILES).every(f => back.sources[f] === previous.sources[f]);
    }
    previous = state;
  }
  const reloaded = JSON.parse(JSON.stringify(changes));
  const again = await S.replay(reloaded, FILES);
  const recovered = Object.keys(FILES).every(f => again.sources[f] === applied.sources[f]);
  pass('T11', undone && steps && recovered && evidence.T10.cases.find(c => c.name === 'an edit log for other sources').refused, {
    undoAllIdentity: undone,
    undoRedoAtEveryEdit: steps,
    serializedReplayIdentity: recovered,
    foreignLogRefused: true,
    logBytes: JSON.stringify(changes).length,
  });
}

// --- T12: the change set, and a migration ----------------------------------------------------

{
  const v0 = {
    v: 0,
    file: LESSON,
    base: bases[LESSON],
    edits: [{ path: 'steps.0.title', value: 'Twelve nights, and a catch' }],
  };
  const fromV0 = await S.replay(v0, { [LESSON]: FILES[LESSON] });
  const v1 = await S.replay({ format: S.FORMAT, version: 1, bases: { [LESSON]: bases[LESSON] }, edits: [{ file: LESSON, op: 'set', path: ['steps', 0, 'title'], value: 'Twelve nights, and a catch' }] }, { [LESSON]: FILES[LESSON] });
  let newer = null;
  try {
    S.migrate({ ...changes, version: 99 });
  } catch (e) {
    newer = e.code;
  }
  pass('T12', fromV0.sources[LESSON] === v1.sources[LESSON] && newer === 'version', {
    migratedV0EqualsV1: fromV0.sources[LESSON] === v1.sources[LESSON],
    newerRefused: newer,
    format: `${S.FORMAT}/${S.VERSION}`,
  });
}

// --- T13: diff review ---------------------------------------------------------------------------

{
  const afterLesson = await evaluate(applied.sources[LESSON]);
  const semantic = [];
  const bySid = l => new Map(l.steps.map(s => [s.sid, s]));
  const b = bySid(baseLesson);
  const a = bySid(afterLesson);
  const flat = (v, p = '') => {
    if (typeof v === 'function') return { [p]: `[code ${v.toString().length} chars]` };
    if (v && typeof v === 'object') return Object.assign({}, ...Object.entries(v).map(([k, x]) => flat(x, p ? `${p}.${k}` : k)));
    return { [p]: v };
  };
  for (const [sid, s] of b) {
    if (!a.has(sid)) { semantic.push({ file: LESSON, sid, change: 'deleted' }); continue; }
    const fb = flat(s);
    const fa = flat(a.get(sid));
    for (const k of new Set([...Object.keys(fb), ...Object.keys(fa)]))
      if (fb[k] !== fa[k]) semantic.push({ file: LESSON, sid, field: k, from: fb[k], to: fa[k] });
  }
  for (const sid of a.keys()) if (!b.has(sid)) semantic.push({ file: LESSON, sid, change: 'inserted', at: afterLesson.steps.findIndex(s => s.sid === sid) + 1 });
  // Non-lesson files: every edit is a literal at a path.
  for (const e of edits.filter(x => x.file !== LESSON))
    semantic.push({ file: e.file, op: e.op, path: e.path.join('.'), to: e.value ?? e.key ?? null });
  // Every edit appears in the semantic diff, and every semantic change comes
  // from an edit.
  const lessonEdits = script.edits.filter(x => x.file === LESSON);
  const explained = semantic.filter(x => x.file === LESSON).every(x =>
    x.change === 'deleted' || x.change === 'inserted' || lessonEdits.some(e => e.op === 'set' && x.field === e.path.slice(2).join('.')));
  const covered = lessonEdits.every(e =>
    e.op === 'insert' ? semantic.some(x => x.sid === e.value.sid && x.change === 'inserted')
      : e.op === 'remove' ? semantic.some(x => x.change === 'deleted')
        : semantic.some(x => x.field === e.path.slice(2).join('.')));
  const hunks = patch.split('\n').filter(l => /^[-+][^-+]/.test(l)).length;
  writeFileSync(path.join(OUT, 'semantic-diff.json'), `${JSON.stringify(semantic, null, 2)}\n`);
  pass('T13', explained && covered, {
    semanticChanges: semantic.length,
    textDiffChangedLines: hunks,
    everySemanticChangeFromAnEdit: explained,
    everyEditInTheSemanticDiff: covered,
    sample: semantic.slice(0, 6),
  });
}

writeFileSync(path.join(REPO, 'spike/studio/evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
process.stdout.write(`evidence written; patched tree at ${tmp}\n`);
