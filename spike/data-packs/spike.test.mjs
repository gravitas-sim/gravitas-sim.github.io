// Spike tests: node --test spike/data-packs/spike.test.mjs
//
// node:test rather than the repository's Jest, so the disposable prototype
// adds nothing to the suite, the CI shards or the gate.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validatePack, agreesWithPackage } from './schema.mjs';
import { decodeLightCurve, decodeRadialVelocity, checkObservation } from './observation.mjs';
import { importObservation, exportCsv, exportJson, LIMITS } from './import.mjs';
import { report } from './retrofit.mjs';

const OUT = 'spike/data-packs/out';
const json = f => JSON.parse(readFileSync(path.join(OUT, f), 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const CACHE = process.env.P11_CACHE;

const manifests = {
  tess: json('tess-hd209458-s56-lc.manifest.json'),
  rv: json('harps-hd75289-rv.manifest.json'),
};
const packs = { tess: json('tess-hd209458-s56.json'), rv: json('harps-hd75289.json') };

// ----------------------------------------------------------------- schema

test('both prototype manifests are valid packs', () => {
  assert.deepEqual(validatePack(manifests.tess), []);
  assert.deepEqual(validatePack(manifests.rv), []);
});

test('each manifest names the derivative it describes, by size and hash', () => {
  for (const m of Object.values(manifests)) {
    const bytes = readFileSync(m.derived.file);
    assert.equal(bytes.length, m.derived.bytes);
    assert.equal(sha(bytes), m.derived.sha256);
  }
});

test('a derivative changed by one byte no longer matches its manifest', () => {
  const bytes = Buffer.from(readFileSync(manifests.tess.derived.file));
  bytes[100] ^= 1;
  assert.notEqual(sha(bytes), manifests.tess.derived.sha256);
});

test('the validator names each missing field', () => {
  const m = structuredClone(manifests.tess);
  delete m.source.citations;
  m.license.status = 'restricted';
  m.raw[0].pinned = false;
  delete m.time;
  const paths = validatePack(m).map(p => p.path);
  for (const p of ['source.citations', 'license.status', 'raw[0].pinned', 'time.scale', 'time.reference']) {
    assert.ok(paths.includes(p), `${p} in ${paths}`);
  }
});

test('synthetic data is refused however complete its manifest is', () => {
  const m = { ...structuredClone(manifests.tess), origin: 'synthetic' };
  assert.deepEqual(validatePack(m).map(p => p.path), ['origin']);
});

test('a licence that is not a licence needs its basis stated', () => {
  const m = structuredClone(manifests.rv);
  delete m.license.basis;
  assert.deepEqual(validatePack(m).map(p => p.path), ['license.basis']);
});

test('the pack and its capability package must agree on the offline class', () => {
  const pkg = {
    id: 'gravitas.tess-hd209458',
    provides: { dataPacks: [{ id: manifests.tess.id }] },
    assets: [{ path: manifests.tess.derived.file, offline: 'core' }],
  };
  assert.deepEqual(agreesWithPackage(manifests.tess, pkg).map(p => p.path), ['offline']);
  pkg.assets[0].offline = 'optional';
  assert.deepEqual(agreesWithPackage(manifests.tess, pkg), []);
});

test('the retrofit: what each shipped dataset cannot yet say', () => {
  const byId = Object.fromEntries(report().map(r => [r.id, r.problems.map(p => p.path)]));
  // No transformation tool in the repository records a version.
  for (const paths of Object.values(byId)) assert.ok(paths.includes('transformation.version'));
  assert.deepEqual(byId['gwosc-five-events'], ['transformation.version']);
  assert.deepEqual(byId['sdss-dr18-stellar-spectra'], ['transformation.version']);
  assert.ok(byId['gwosc-gw150914-figure'].includes('raw[0].pinned'));
  assert.ok(byId['mist-v12-solar-tracks'].includes('raw[0].pinned'));
  assert.ok(byId['exoplanet-systems'].includes('source.citations'));
  assert.ok(byId['ngc3198-rotation-curve'].includes('origin'));
});

// ---------------------------------------------------------------- decoding

test('the light curve decodes to the bins the tool wrote', () => {
  const o = decodeLightCurve(packs.tess);
  assert.equal(o.x.values.length, 3758);
  assert.deepEqual(checkObservation(o), []);
  assert.ok(o.x.values[0] > 2825 && o.x.values.at(-1) < 2854, 'sector 56, September 2022, in BTJD');
  const med = [...o.err].sort((a, b) => a - b)[o.err.length >> 1];
  assert.ok(Math.abs(med * 1e6 - 105) < 5, `median error ${med * 1e6} ppm`);
});

test('the decoded light curve folds to the transit the manifest checked', () => {
  const o = decodeLightCurve(packs.tess);
  const P = manifests.tess.validation.against[0].value;
  const slots = Array.from({ length: 200 }, () => [0, 0]);
  o.x.values.forEach((t, i) => {
    const s = slots[Math.floor((((t % P) + P) % P / P) * 200)];
    s[0]++;
    s[1] += o.y.values[i];
  });
  const depth = 1 - Math.min(...slots.filter(s => s[0]).map(s => s[1] / s[0]));
  assert.ok(Math.abs(depth - manifests.tess.validation.result.depth) < 2e-5, `${depth}`);
});

test('a pack whose runs do not cover its bins is refused', () => {
  const broken = { ...packs.tess, runs: packs.tess.runs.slice(0, -1) };
  assert.throws(() => decodeLightCurve(broken), /runs cover/);
});

test('the radial velocities decode with their times restored', () => {
  const o = decodeRadialVelocity(packs.rv);
  assert.equal(o.y.values.length, 19);
  assert.deepEqual(checkObservation(o), []);
  assert.ok(o.x.values[0] > 2450000, 'full BJD');
});

// ------------------------------------------------------------------ import

test('a CSV with a units header reads into the same shape a pack decodes to', () => {
  const r = importObservation('time (d),flux,flux_err\n1,1.0,0.001\n2,0.99,0.001\n3,1.0,0.001\n');
  assert.deepEqual(r.errors, []);
  assert.equal(r.observation.x.unit, 'd');
  assert.equal(r.observation.quantity, 'relative-flux');
  assert.deepEqual(Array.from(r.observation.err), [0.001, 0.001, 0.001]);
  assert.deepEqual(Object.keys(r.observation).sort(), Object.keys(decodeLightCurve(packs.tess)).sort());
});

test('tab, semicolon with decimal commas, and spaces', () => {
  const tab = importObservation('t\trv\n1\t5\n2\t6\n');
  assert.deepEqual(Array.from(tab.observation.y.values), [5, 6]);
  const eu = importObservation('t;flux\n1,5;0,98\n2,5;0,99\n');
  assert.deepEqual(Array.from(eu.observation.x.values), [1.5, 2.5]);
  assert.ok(eu.notes.some(n => /decimal/.test(n)));
  const ws = importObservation('# from a notebook\n1.0   2.0\n2.0   2.5\n');
  assert.deepEqual(Array.from(ws.observation.y.values), [2, 2.5]);
});

test('a BOM, CRLF line ends and comment lines are read through', () => {
  const r = importObservation('\uFEFF% exported\r\ntime,rv,err\r\n1,2,0.5\r\n2,3,0.5\r\n');
  assert.deepEqual(r.errors, []);
  assert.equal(r.observation.quantity, 'radial-velocity');
});

test('rows that are not numbers are dropped and counted, never guessed', () => {
  const r = importObservation('time,flux\n1,1.0\n2,NaN\n3,\n4,1.0\n');
  assert.equal(r.observation.source.dropped, 2);
  assert.ok(r.notes.some(n => /2 rows were not numbers/.test(n)));
});

test('rows out of time order are sorted, and the note says so', () => {
  const r = importObservation('time,flux\n3,1\n1,2\n2,3\n');
  assert.deepEqual(Array.from(r.observation.y.values), [2, 3, 1]);
  assert.equal(r.observation.source.sorted, true);
});

test('an explicit mapping wins over the guess, and a wrong one is an error', () => {
  const text = 'a,b,c\n1,10,0.1\n2,20,0.1\n';
  const r = importObservation(text, { mapping: { x: 'b', y: 'a', err: null } });
  assert.deepEqual(Array.from(r.observation.x.values), [10, 20]);
  assert.equal(r.observation.err, null);
  assert.match(importObservation(text, { mapping: { y: 'flux' } }).errors[0], /no column "flux"/);
});

test('files that are not a series say why', () => {
  assert.match(importObservation('').errors[0], /empty/);
  assert.match(importObservation('just one column\n1\n2\n').errors[0], /told apart|two columns/);
  assert.match(importObservation('a,b\nx,y\nz,w\n').errors[0], /No row/);
  assert.match(importObservation('{"t": [1, 2]}').errors[0], /two arrays/);
  assert.match(importObservation('[1, 2').errors[0], /not valid JSON/);
  assert.match(importObservation('time,flux\n1,1\n2,x\n3,x\n4,x\n').errors[0], /right file/);
  assert.match(importObservation('x'.repeat(LIMITS.bytes + 1)).errors[0], /over 5 MB/);
});

test('JSON rows, JSON columns, and an observation written by this code', () => {
  const rows = importObservation('[{"time": 1, "rv": 3, "err": 1}, {"time": 2, "rv": 4, "err": 1}]');
  assert.deepEqual(Array.from(rows.observation.y.values), [3, 4]);
  const cols = importObservation('{"time": [1, 2], "flux": [1, 0.99]}');
  assert.deepEqual(Array.from(cols.observation.y.values), [1, 0.99]);
  const rv = decodeRadialVelocity(packs.rv);
  const back = importObservation(exportJson(rv)).observation;
  assert.deepEqual(Array.from(back.y.values), Array.from(rv.y.values));
  assert.deepEqual(Array.from(back.err), Array.from(rv.err));
});

test('the light curve survives a CSV round trip exactly', () => {
  const o = decodeLightCurve(packs.tess);
  const back = importObservation(exportCsv(o)).observation;
  assert.deepEqual(Array.from(back.x.values), Array.from(o.x.values));
  assert.deepEqual(Array.from(back.y.values), Array.from(o.y.values));
  assert.deepEqual(Array.from(back.err), Array.from(o.err));
});

test('a third column is an uncertainty only by name, or by position without a header', () => {
  assert.equal(importObservation('time,flux,airmass\n1,1,1.2\n2,1,1.3\n').observation.err, null);
  assert.deepEqual(Array.from(importObservation('1,1,0.1\n2,1,0.2\n').observation.err), [0.1, 0.2]);
});

test('a JSON key named __proto__ is data, not a prototype', () => {
  const r = importObservation('[{"time": 1, "flux": 1, "__proto__": {"polluted": 1}}, {"time": 2, "flux": 1}]');
  assert.deepEqual(r.errors, []);
  assert.equal({}.polluted, undefined);
});

// ------------------------------------------------------------ reproducible

test('rebuilding each derivative from the cached raw input is byte-identical', { skip: !CACHE && 'P11_CACHE not set' }, () => {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'p11-')));
  execFileSync('node', ['spike/data-packs/build-tess-pack.mjs', '--cache', CACHE, '--out', dir]);
  execFileSync('node', ['spike/data-packs/build-rv-pack.mjs', '--cache', CACHE, '--out', dir]);
  for (const m of Object.values(manifests)) {
    const rebuilt = path.join(dir, path.basename(m.derived.file));
    assert.ok(existsSync(rebuilt));
    assert.equal(sha(readFileSync(rebuilt)), m.derived.sha256);
  }
});

test('the TESS tool refuses a raw file that is not the pinned one', { skip: !CACHE && 'P11_CACHE not set' }, () => {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'p11-')));
  const raw = manifests.tess.raw[0].file;
  const bytes = Buffer.from(readFileSync(path.join(CACHE, raw)));
  bytes[bytes.length - 1] ^= 1;
  writeFileSync(path.join(dir, raw), bytes);
  assert.throws(
    () => execFileSync('node', ['spike/data-packs/build-tess-pack.mjs', '--cache', dir, '--out', dir], { stdio: 'pipe' }),
    /not the pinned file/
  );
});
