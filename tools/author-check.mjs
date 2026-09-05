#!/usr/bin/env node
// =============================================================================
// npm run author:check
// -----------------------------------------------------------------------------
// Validates every investigation and every step against tools/authoring/rules.mjs
// and prints the result for a person who is writing a lesson.
//
// Addressed the way an author thinks: lesson, then step number, then what is
// wrong. The step number is the 1-based one the panel shows in "STEP 7 OF 23"
// and the one the instructor guide prints, so a finding can be typed straight
// into the authoring preview:
//
//   npm run author:check
//   npm run author:check -- --lesson=tides
//   npm run author:check -- --warnings         include warnings in the exit code
//   npm run author:check -- --json             for an editor or a CI annotation
//   npm run author:check -- --rules            what is enforced, and why
//
// Exit code is 1 when there is an error, so it can gate a commit. Warnings do
// not fail the build unless --warnings is passed: they are things a human
// should look at, and a tool that fails on them gets switched off.
// =============================================================================

import { loadAuthoringInputs } from './authoring/inputs.mjs';
import { checkCatalogue, RULE_INDEX } from '../js/authoring/rules.js';

const argv = process.argv.slice(2);
const has = flag => argv.includes(flag);
const value = name => {
  const hit = argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const OFF = '\x1b[0m';
const paint = process.stdout.isTTY && !has('--no-color');
const c = (code, text) => (paint ? `${code}${text}${OFF}` : text);

if (has('--rules')) {
  console.log(c(BOLD, 'Authoring rules'));
  console.log(
    'Every finding names the rule that raised it. To argue with a finding,\n' +
      'argue with its rule in js/authoring/rules.js.\n'
  );
  const groups = new Map();
  for (const [id, description] of Object.entries(RULE_INDEX)) {
    const family = id.split('/')[0];
    if (!groups.has(family)) groups.set(family, []);
    groups.get(family).push([id, description]);
  }
  for (const [family, rules] of groups) {
    console.log(c(BOLD, family));
    for (const [id, description] of rules) {
      console.log(`  ${id.padEnd(28)} ${c(DIM, description)}`);
    }
    console.log('');
  }
  process.exit(0);
}

const inputs = await loadAuthoringInputs();
let findings = checkCatalogue(inputs);

const only = value('lesson');
if (only) {
  const known = new Set(inputs.investigations.map(i => i.id));
  if (!known.has(only)) {
    console.error(
      `No lesson "${only}". The catalogue holds:\n  ${[...known].join('\n  ')}`
    );
    process.exit(2);
  }
  findings = findings.filter(f => f.lesson === only);
}

const errors = findings.filter(f => f.level === 'error');
const warnings = findings.filter(f => f.level === 'warn');

if (has('--json')) {
  console.log(
    JSON.stringify(
      {
        lessons: inputs.investigations.length,
        steps: inputs.investigations.reduce((n, i) => n + i.steps.length, 0),
        errors: errors.length,
        warnings: warnings.length,
        findings,
      },
      null,
      2
    )
  );
  process.exit(errors.length > 0 ? 1 : 0);
}

const byLesson = new Map();
for (const f of findings) {
  if (!byLesson.has(f.lesson)) byLesson.set(f.lesson, []);
  byLesson.get(f.lesson).push(f);
}

for (const inv of inputs.investigations) {
  const mine = byLesson.get(inv.id);
  if (!mine || mine.length === 0) continue;
  console.log(`\n${c(BOLD, inv.id)} ${c(DIM, `- ${inv.steps.length} steps`)}`);
  const sorted = [...mine].sort((a, b) => (a.step ?? -1) - (b.step ?? -1));
  for (const f of sorted) {
    const where =
      f.step === null || f.step === undefined
        ? 'lesson'
        : `step ${f.step + 1}/${inv.steps.length}`;
    const tag = f.level === 'error' ? c(RED, 'error') : c(YELLOW, ' warn');
    console.log(
      `  ${tag} ${c(DIM, where.padEnd(14))} ${f.message}\n` +
        `        ${c(DIM, `${f.rule}  ·  preview: /?author=${inv.id}${f.step != null ? `&step=${f.step + 1}` : ''}`)}`
    );
  }
}

// Findings whose lesson is not in the catalogue at all - an orphaned manifest
// entry, instructor guidance for a deleted lesson - have nowhere above to go.
const known = new Set(inputs.investigations.map(i => i.id));
const orphans = findings.filter(f => !known.has(f.lesson));
if (orphans.length) {
  console.log(`\n${c(BOLD, 'unattached')}`);
  for (const f of orphans) {
    const tag = f.level === 'error' ? c(RED, 'error') : c(YELLOW, ' warn');
    console.log(
      `  ${tag} ${f.lesson}: ${f.message}\n        ${c(DIM, f.rule)}`
    );
  }
}

const steps = inputs.investigations.reduce((n, i) => n + i.steps.length, 0);
const scope = only
  ? `${only}`
  : `${inputs.investigations.length} investigations`;
console.log('');
if (errors.length === 0 && warnings.length === 0) {
  console.log(c(GREEN, `${scope}, ${steps} steps: nothing to report.`));
} else {
  const parts = [];
  if (errors.length) parts.push(c(RED, `${errors.length} error(s)`));
  if (warnings.length) parts.push(c(YELLOW, `${warnings.length} warning(s)`));
  console.log(`${scope}, ${steps} steps: ${parts.join(', ')}.`);
  if (warnings.length && !errors.length) {
    console.log(
      c(DIM, 'Warnings do not fail this command. Pass --warnings to make them.')
    );
  }
}

const fail = errors.length > 0 || (has('--warnings') && warnings.length > 0);
process.exit(fail ? 1 : 0);
