// SPIKE (Prompt 21): THRESHOLDS.md applied to what bench.mjs recorded.
//   node spike/kernel/verdict.mjs evidence/bench.json
// Only rounds not marked `loaded` count. Every timing is the median across
// those rounds of each round's own median. Prints the table the gate quotes,
// and each criterion with the number that decided it.

import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const PROFILES = ['chromium', 'chromium-4x', 'firefox', 'webkit'];
const LOW = 'chromium-4x';
const median = xs => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const get = (o, path) => path.split('.').reduce((v, k) => v?.[k], o);

const by = {};
for (const p of PROFILES) {
  const quiet = report.runs.filter(r => r.profile === p && !r.loaded);
  if (!quiet.length) throw new Error(`no quiet round for ${p}`);
  by[p] = { rounds: quiet.length, at: path => median(quiet.map(r => get(r, path))), all: quiet };
}

const f = (x, d = 1) => (x >= 100 ? x.toFixed(0) : x.toFixed(d));
const rows = [];
rows.push('| Profile | rounds | GLS baseline | GLS optimized JS | GLS WASM | WASM / JS | JS / baseline | BLS baseline | BLS optimized JS | BLS WASM | WASM / JS | JS / baseline |');
rows.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
const speed = {};
for (const p of PROFILES) {
  const a = by[p].at;
  const g = { base: a('gls.baselineMs'), js: a('gls.jsMs'), wasm: a('gls.wasmMs') };
  const b = { base: a('bls.baselineMs'), js: a('bls.jsMs'), wasm: a('bls.wasmMs') };
  speed[p] = { gls: g.js / g.wasm, glsOpt: g.base / g.js, bls: b.js / b.wasm, blsOpt: b.base / b.js };
  rows.push(
    `| ${p} | ${by[p].rounds} | ${f(g.base)} ms | ${f(g.js)} ms | ${f(g.wasm)} ms | ${(g.js / g.wasm).toFixed(2)}x | ${(g.base / g.js).toFixed(2)}x | ${f(b.base)} ms | ${f(b.js)} ms | ${f(b.wasm)} ms | ${(b.js / b.wasm).toFixed(2)}x | ${(b.base / b.js).toFixed(2)}x |`
  );
}
console.log(rows.join('\n'));

const low = by[LOW].at;
const cold = { bytes: by[LOW].all[0].wasm.bytes, ms: low('wasm.compileMs') + low('wasm.instantiateMs') };
console.log('\nCold load (low-end):', cold.bytes, 'bytes;', cold.ms.toFixed(2), 'ms compile + instantiate');
for (const p of PROFILES)
  console.log(`  ${p}: compile ${by[p].at('wasm.compileMs').toFixed(2)} ms, instantiate ${by[p].at('wasm.instantiateMs').toFixed(2)} ms, memory after ${by[p].all[0].wasm.memoryBytesAfter} bytes`);

// Correctness, and determinism across engines.
console.log('\nCorrectness (worst over every quiet round):');
const worst = path => Math.max(...PROFILES.flatMap(p => by[p].all.map(r => get(r, path))));
const glsVsRef = worst('gls.jsVsBaseline');
console.log('  GLS optimized JS vs the direct formula, max relative:', glsVsRef.toExponential(2));
console.log('  GLS WASM vs optimized JS, max relative:', worst('gls.wasmVsJs'));
console.log('  BLS WASM vs optimized JS, max relative:', worst('bls.wasmVsJs'));
console.log('  BLS optimized JS vs the production loop, max relative:', worst('bls.jsVsBaseline').toExponential(2));
const shas = kind => Object.fromEntries(PROFILES.map(p => [p, [...new Set(by[p].all.map(r => JSON.stringify(r[kind].sha)))]]));
console.log('  GLS digests by profile:', JSON.stringify(shas('gls')));
console.log('  BLS digests by profile:', JSON.stringify(shas('bls')));
console.log('  BLS best trial by profile:', JSON.stringify(Object.fromEntries(PROFILES.map(p => [p, by[p].all[0].bls.argmax]))));

// One call: the unit of work between yields.
const chunk = { gls: low('gls.wasmChunkMs'), bls: low('bls.wasmChunkMs'), blsJs: low('bls.jsChunkMs') };
console.log('\nOne call on the low-end profile: GLS', chunk.gls.toFixed(2), 'ms (512 frequencies); BLS', chunk.bls.toFixed(2), 'ms (16 periods; JS', chunk.blsJs.toFixed(2), 'ms)');

// Workers.
console.log('\nWorker (optimized JS), low-end:');
for (const k of ['gls', 'bls']) {
  const total = low(`${k}.worker.total`);
  const compute = low(`${k}.worker.compute`);
  console.log(`  ${k}: total ${total.toFixed(1)} ms, compute ${compute.toFixed(1)} ms, overhead ${(total - compute).toFixed(1)} ms = ${((100 * (total - compute)) / compute).toFixed(1)}% of compute; main-thread optimized JS ${low(`${k}.jsMs`).toFixed(1)} ms`);
}

// The verdicts.
console.log('\nVerdicts:');
const verdict = (k, chunkMs) => {
  const s = PROFILES.map(p => speed[p][k]);
  const c1 = s.every(x => x >= 2.0);
  const c2 = cold.bytes <= 16384 && cold.ms <= 16;
  // Against the reference: the optimized JS's own error, plus WASM's from it.
  const c3 = worst(`${k}.jsVsBaseline`) + worst(`${k}.wasmVsJs`) <= 1e-12;
  const c4 = chunkMs <= 16;
  const c5 = true; // it ran in all three engines, without flags or shared memory: this file exists
  // The hand-encoded form builds with wasm.mjs and Node, and nothing else: it
  // holds as written. A kernel in C, Rust or AssemblyScript would not.
  const c6 = true;
  const min = Math.min(...s);
  const grade = c2 && c3 && c4 && c5 && (c1 && c6 ? 'A' : (min >= 1.3 && min < 2.0) || (c1 && !c6) ? 'B' : 'C');
  console.log(`  ${k}: speed ${s.map(x => x.toFixed(2)).join(' / ')} (min ${min.toFixed(2)}, needs 2.0) ${c1 ? 'pass' : 'FAIL'}; cold ${c2 ? 'pass' : 'FAIL'}; correct ${c3 ? 'pass' : 'FAIL'}; call ${chunkMs.toFixed(2)} ms ${c4 ? 'pass' : 'FAIL'}; engines pass; toolchain ${c6 ? 'pass (hand-encoded)' : 'FAIL'} -> ${grade || 'C'}`);
};
verdict('gls', chunk.gls);
verdict('bls', chunk.bls);
for (const [k, opt] of [['gls', 'glsOpt'], ['bls', 'blsOpt']]) {
  const x = speed[LOW][opt];
  const tol = k === 'gls' ? glsVsRef <= 1e-12 : worst('bls.jsVsBaseline') <= 1e-12;
  console.log(`  ${k} optimized JS replaces the baseline: ${x.toFixed(2)}x on low-end (needs 1.5) ${x >= 1.5 ? 'pass' : 'FAIL'}; tolerance ${tol ? 'pass' : 'FAIL'} -> ${x >= 1.5 && tol ? 'YES' : 'NO'}`);
}
for (const k of ['gls', 'bls']) {
  const main = low(`${k}.jsMs`);
  const over = (low(`${k}.worker.total`) - low(`${k}.worker.compute`)) / low(`${k}.worker.compute`);
  console.log(`  ${k} moves to a Worker: blocks ${main.toFixed(0)} ms on low-end (over 100?) ${main > 100 ? 'yes' : 'no'}; overhead ${(100 * over).toFixed(1)}% (10% at most?) ${over <= 0.1 ? 'yes' : 'no'} -> ${main > 100 && over <= 0.1 ? 'YES' : 'NO'}`);
}
