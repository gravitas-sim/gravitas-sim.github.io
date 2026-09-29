#!/usr/bin/env node
// =============================================================================
// The mission core's validation
// -----------------------------------------------------------------------------
// Runs every reference case in js/mission/references.js (textbook examples,
// closed-form constants, and the 3-D kernel flying each solver's answer) and
// compares each measure with its fixed tolerance. Node, not Jest, for the
// same reason as validate:lab3d: Jest's module VM is far slower at arithmetic.
//
//   node tools/validate-mission.mjs            the table; exit 1 on any failure
//   node tools/validate-mission.mjs L1 W1      some cases
//   node tools/validate-mission.mjs --write    and write the table into MISSION.md
//   node tools/validate-mission.mjs --json     one JSON line per case
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { CASES, runCase } from '../js/mission/references.js';

const args = process.argv.slice(2);
const ids = args.filter(a => /^[A-Z]\d+$/.test(a));
const write = args.includes('--write');
const json = args.includes('--json');

const fmt = v =>
  typeof v !== 'number'
    ? String(v)
    : v === 0
      ? '0'
      : Math.abs(v) >= 0.01 && Math.abs(v) < 1e4
        ? String(Number(v.toPrecision(5)))
        : v.toExponential(1);
const bound = m =>
  typeof m.expected === 'number'
    ? `${fmt(m.expected)} ± ${fmt(m.tolerance)}${m.unit ? ` ${m.unit}` : ''}`
    : `= ${m.expected}`;

const rows = [];
let failed = 0;
for (const c of CASES) {
  if (ids.length && !ids.includes(c.id)) continue;
  const started = Date.now();
  const measures = runCase(c);
  const ms = Date.now() - started;
  for (const m of measures) {
    if (!m.ok) failed++;
    rows.push({ id: c.id, kind: c.kind, title: c.title, ...m });
  }
  if (json)
    console.log(JSON.stringify({ id: c.id, kind: c.kind, ms, measures }));
  else
    process.stderr.write(
      `${c.id} ${measures.every(m => m.ok) ? 'pass' : 'FAIL'} (${ms} ms)\n`
    );
}

/** A table cell: a measure's name may hold |v|, which would end the cell. */
const cell = v => String(v).replace(/\|/g, '\\|');

const table = [
  '| # | Case | Kind | Measured | Value | Expected | |',
  '|---|---|---|---|---|---|---|',
  ...rows.map(
    r =>
      `| ${r.id} | ${cell(r.title)} | ${r.kind} | ${cell(r.name)} | ${cell(fmt(r.value))} | ${cell(bound(r))} | ${r.ok ? 'pass' : '**fail**'} |`
  ),
].join('\n');

if (!json) console.log(table);
if (write) {
  const doc = readFileSync('MISSION.md', 'utf8');
  const open = '<!-- mission:validation -->';
  const close = '<!-- /mission:validation -->';
  const a = doc.indexOf(open);
  const b = doc.indexOf(close);
  if (a < 0 || b < a) throw new Error('MISSION.md has no validation block');
  writeFileSync(
    'MISSION.md',
    `${doc.slice(0, a + open.length)}\n${table}\n${doc.slice(b)}`
  );
}
if (failed) {
  console.error(`${failed} measure(s) failed.`);
  process.exit(1);
}
