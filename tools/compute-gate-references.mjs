#!/usr/bin/env node
// Spike, Prompt 268: the outputs of the Gravitas modules the candidates are held against, written once
// under Node 22 before any notebook runs (N04: js/orbital.js solveKepler; N06: js/kernels/variables/
// period.js periodogram). N05's reference (Prompt 154's fTest) is called by the validator on the
// notebook's own sums of squares, so it has no pinned file. N08's reference is the input grid itself.
//   node tools/compute-gate-references.mjs <repo root of the inputs> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2];
const imp = p => import(pathToFileURL(path.join(REPO, p)));
const { solveKepler } = await imp('js/orbital.js');
const { periodogram } = await imp('js/kernels/variables/period.js');
const sys = JSON.parse(readFileSync(path.join(REPO, 'compute/inputs/kepler-16.gravitas-system.json'), 'utf8'));
const es = [...sys.bodies.slice(1).map(b => b.e), 0.5, 0.9, 0.99, 0.999];
const Ms = [...Array.from({ length: 721 }, (_, k) => (2 * Math.PI * k) / 720), 1e-6, 1e-3, 2 * Math.PI - 1e-3];
const kepler = {};
for (const e of es) kepler[String(e)] = Ms.map(M => solveKepler(M, e));
const tess = JSON.parse(readFileSync(path.join(REPO, 'compute/inputs/tess-hd209458-s56.observation.json'), 'utf8'));
const col = id => Float64Array.from(tess.columns.find(c => c.id === id).values);
const P = Float64Array.from({ length: 400 }, (_, k) => 0.5 * 20 ** (k / 399));
const power = Array.from(periodogram(col('time'), col('flux'), P));
let peak = 0;
for (let i = 1; i < power.length; i++) if (power[i] > power[peak]) peak = i;
writeFileSync(out, JSON.stringify({ format: 'gravitas.compute-gate-ii-reference-results/1', node: process.version, N04: { e: es, M: Ms, E: kepler }, N06: { periods: Array.from(P), power, peakIndex: peak } }, null, 1) + '\n');
console.log('references written', out);
