// Spike: the expression route on the same observation, and what it refuses.
import { readFileSync } from 'node:fs';
import { parse, evaluate } from './expr.js';
const o = JSON.parse(readFileSync(new URL('../notebook/observation.json', import.meta.url)));
const values = Object.fromEntries(o.columns.map(c => [c.id, c.values]));
const rows = o.columns[0].values.length;
const cols = o.columns.map(c => c.id);
const median = [...values.flux].filter(Number.isFinite).sort((a, b) => a - b)[rows >> 1];
const t0 = performance.now();
const tree = parse(`(1 - flux / ${median}) * 1e6`, cols);
const ppm = evaluate(tree, values, rows);
const ms = performance.now() - t0;
console.log('rows', rows, 'ms', ms.toFixed(2), 'max depth ppm', Math.round(Math.max(...ppm.filter(Number.isFinite))));
for (const bad of ['constructor', 'flux.constructor', 'this', 'alert(1)', 'flux; flux', '__proto__', 'x'.repeat(600), 'fetch(1)', '1 +'])
  try { parse(bad, cols); console.log('ACCEPTED', bad); } catch (e) { console.log('refused', JSON.stringify(bad.slice(0, 20)), '-', e.message); }
