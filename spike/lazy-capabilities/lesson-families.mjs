#!/usr/bin/env node
// =============================================================================
// Spike: which instrument families each lesson actually uses
// -----------------------------------------------------------------------------
// Pairs every step's `tool.id` with the *Widgets.js module that defines it, and
// the family bytes from route-bytes.mjs, to say how much of the instrument
// catalog a lesson loads for nothing today.
//
//   node spike/lazy-capabilities/lesson-families.mjs [--json]
// =============================================================================

import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

// Widget id -> family module, from each family's exported array.
const familyOf = new Map();
for (const file of readdirSync(path.join(ROOT, 'js')).filter(f =>
  /Widgets\.js$/.test(f)
)) {
  const mod = await import(pathToFileURL(path.join(ROOT, 'js', file)).href);
  for (const value of Object.values(mod)) {
    if (!Array.isArray(value)) continue;
    for (const w of value)
      if (w && typeof w.id === 'string') familyOf.set(w.id, `js/${file}`);
  }
}

const routes = JSON.parse(
  execFileSync(
    process.execPath,
    [path.join(ROOT, 'spike/lazy-capabilities/route-bytes.mjs'), '--json'],
    {
      cwd: ROOT,
      encoding: 'utf8',
    }
  )
);
const familyBytes = Object.fromEntries(
  routes.families.map(f => [f.module, f.bytes])
);
const allFamilies = routes.families.reduce((n, f) => n + f.bytes, 0);

const { MANIFEST } = await import(
  pathToFileURL(path.join(ROOT, 'js/data/investigations/manifest.js')).href
);
const kb = n => Math.round(n / 102.4) / 10;
const rows = [];
const unknown = new Set();
for (const entry of MANIFEST) {
  const mod = await import(
    pathToFileURL(path.join(ROOT, `js/data/investigations/${entry.id}.js`)).href
  );
  const lesson = mod.default || Object.values(mod)[0];
  const tools = new Set(
    (lesson.steps || []).map(s => s.tool?.id).filter(Boolean)
  );
  const fams = new Set();
  for (const id of tools) {
    const f = familyOf.get(id);
    if (f) fams.add(f);
    else unknown.add(`${entry.id}:${id}`);
  }
  const used = [...fams].reduce((n, f) => n + (familyBytes[f] || 0), 0);
  rows.push({
    id: entry.id,
    tools: tools.size,
    families: [...fams].sort(),
    usedKb: kb(used),
    unusedKb: kb(allFamilies - used),
  });
}

const report = {
  widgets: familyOf.size,
  allFamiliesKb: kb(allFamilies),
  lessons: rows,
  unknownTools: [...unknown],
};
if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else {
  console.log(
    `${familyOf.size} widgets in ${routes.families.length} families, ${report.allFamiliesKb} KB loaded by every lesson`
  );
  for (const r of rows) {
    console.log(
      `${r.id.padEnd(30)} uses ${String(r.families.length).padStart(2)} famil${r.families.length === 1 ? 'y ' : 'ies'} ${String(r.usedKb).padStart(6)} KB  unused ${String(r.unusedKb).padStart(6)} KB  ${r.families.map(f => path.basename(f, '.js')).join(', ')}`
    );
  }
  if (unknown.size)
    console.log('tools with no family:', [...unknown].join(' '));
}
