#!/usr/bin/env node
// =============================================================================
// The educational ephemeris pack, from JPL Horizons
// -----------------------------------------------------------------------------
// A developer pipeline. The live mission lab never calls Horizons: it reads
// a compact, same-origin derivative of what this pulled once and pinned.
//
//   node tools/build-ephemeris.mjs --fetch      fill .ephemeris-cache/ from
//                                               Horizons, for any file missing
//   node tools/build-ephemeris.mjs --write      rebuild the pack from the cache:
//                                               the module, the held-out check
//                                               set and the manifest's measures
//   node tools/build-ephemeris.mjs --check      offline: the committed module
//                                               against its manifest and the
//                                               held-out check set
//   ... --check --require-sources               and the cache against its pins,
//                                               and the pack rebuilt from it
//                                               byte for byte
//
// What it pulls, for each body (EPHEMERIS.md):
//
//   daily   heliocentric geometric states at 00:00 TDB every day of the range,
//           in the ecliptic of J2000.0 (ICRF), km and km/s: what is fitted
//   noon    the same at 12:00 TDB: never fitted, only compared with, so the
//           interpolation error is measured where no sample constrained it
//
// A Horizons answer is not byte-stable: its header carries the time it was
// made. It is pinned over its data rows (between $$SOE and $$EOE), and the
// header facts that matter (the ephemeris, the frame, the time scale, the
// units, the target) are read and compared with what the manifest says.
//
// The fit: Chebyshev polynomials over fixed segments of each body's orbit,
// by least squares on the daily positions and velocities together, as JPL's
// own ephemerides are stored. The two leading coefficients of each axis are
// kept as float64 and the rest as float32: the leading two carry the orbit's
// 1e8 km, and float32 would round them to kilometers; the rest are small
// enough that float32 costs nothing measurable (EPHEMERIS.md has the table).
// =============================================================================

import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'ephemeris-packs', 'solar-system-2025-2045.json');
const CACHE = path.join(ROOT, '.ephemeris-cache');
const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const args = process.argv.slice(2);
const has = flag => args.includes(flag);

/** The data rows of a Horizons answer, and the header lines above them. */
export function parseHorizons(text) {
  const result = JSON.parse(text).result;
  const a = result.indexOf('$$SOE');
  const b = result.indexOf('$$EOE');
  if (a < 0 || b < a) throw new Error('no $$SOE ... $$EOE block');
  const block = result.slice(a + 5, b).trim();
  const rows = block.split('\n').map(line => {
    const c = line.split(',').map(s => s.trim());
    return [Number(c[0]), ...c.slice(2, 8).map(Number)];
  });
  if (!rows.every(r => r.length === 7 && r.every(Number.isFinite)))
    throw new Error('a data row is not seven numbers');
  const header = result.slice(0, a);
  const fact = re => (header.match(re) || [])[1]?.trim() ?? null;
  return {
    block,
    rows,
    facts: {
      target: fact(/Target body name:\s*([^{\n]+?)\s*\{/),
      targetSource: fact(/Target body name:[^{]*\{source:\s*([^}]+)\}/),
      centerSource: fact(/Center body name:[^{]*\{source:\s*([^}]+)\}/),
      frame: fact(/Reference frame\s*:\s*([^\n]+)/),
      units: fact(/Output units\s*:\s*([^\n]+)/),
      type: fact(/Output type\s*:\s*([^\n]+)/),
      start: fact(/Start time\s*:\s*([^\n]+)/),
    },
  };
}

/** The query for one body and one sampling. */
function query(m, body, kind) {
  const s = m.request.sampling[kind];
  const params = {
    format: 'json',
    COMMAND: `'${body.command}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: `'${m.request.center}'`,
    START_TIME: `'${s.start}'`,
    STOP_TIME: `'${s.stop}'`,
    STEP_SIZE: `'${m.request.step}'`,
    VEC_TABLE: "'2'",
    REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'ICRF'",
    VEC_CORR: "'NONE'",
    OUT_UNITS: "'KM-S'",
    CSV_FORMAT: "'YES'",
    TIME_DIGITS: "'FRACSEC'",
  };
  return `${API}?${Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')}`;
}

const cacheFile = (body, kind) => path.join(CACHE, `${body.command}-${kind}.json`);

/** Every problem with one cached answer against its pin and the manifest. */
function rawProblems(m, body, kind) {
  const file = cacheFile(body, kind);
  if (!existsSync(file)) return [`${path.relative(ROOT, file)} is not cached (run --fetch)`];
  const parsed = parseHorizons(readFileSync(file, 'utf8'));
  const pin = body.raw[kind];
  const out = [];
  const digest = sha256(Buffer.from(parsed.block));
  if (digest !== pin.sha256)
    out.push(`${body.id} ${kind}: its data rows are ${digest}, not the pinned ${pin.sha256}`);
  if (parsed.rows.length !== pin.rows)
    out.push(`${body.id} ${kind}: ${parsed.rows.length} rows, not ${pin.rows}`);
  const want = {
    target: body.target,
    targetSource: body.source,
    centerSource: m.source.ephemeris,
    frame: m.frame.horizons,
    units: 'KM-S',
    type: 'GEOMETRIC cartesian states',
  };
  for (const [k, v] of Object.entries(want))
    if (parsed.facts[k] !== v)
      out.push(`${body.id} ${kind}: the answer says ${k} "${parsed.facts[k]}", the manifest "${v}"`);
  return out;
}

async function fetchAll(m) {
  mkdirSync(CACHE, { recursive: true });
  for (const body of m.bodies)
    for (const kind of ['daily', 'noon']) {
      const file = cacheFile(body, kind);
      if (!existsSync(file)) {
        process.stderr.write(`fetching ${body.id} ${kind}\n`);
        const res = await fetch(query(m, body, kind), {
          signal: globalThis.AbortSignal.timeout(120000),
        });
        if (!res.ok) throw new Error(`${body.id} ${kind}: HTTP ${res.status}`);
        writeFileSync(file, await res.text());
      }
      // A pin that is still empty is being made: record what came back.
      if (!body.raw[kind].sha256) {
        const parsed = parseHorizons(readFileSync(file, 'utf8'));
        body.raw[kind] = { sha256: sha256(Buffer.from(parsed.block)), rows: parsed.rows.length };
      }
      const problems = rawProblems(m, body, kind);
      if (problems.length) throw new Error(problems.join('\n'));
    }
}

// --- Chebyshev fits ------------------------------------------------------------

/** T_k(x) and T_k'(x) for k = 0..n. */
function basis(x, n) {
  const T = new Float64Array(n + 1);
  const U = new Float64Array(n + 1);
  T[0] = 1;
  if (n > 0) {
    T[1] = x;
    U[1] = 1;
  }
  for (let k = 2; k <= n; k++) {
    T[k] = 2 * x * T[k - 1] - T[k - 2];
    U[k] = 2 * T[k - 1] + 2 * x * U[k - 1] - U[k - 2];
  }
  return [T, U];
}

/** Gaussian elimination with partial pivoting: A x = b, A small and square. */
function solve(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
    x[i] = s / A[i][i];
  }
  return x;
}

/** Segment k's first day: fixed steps, the last one ending on the last day. */
export const segmentStart = (start, stop, days, count, k) =>
  k === count - 1 ? stop - days : start + k * days;
export const segmentCount = (start, stop, days) => Math.ceil((stop - start) / days - 1e-9);

/**
 * Fit one body: for each segment and axis, n + 1 coefficients minimizing the
 * squared error in position (km) and velocity (km/day) at every daily sample
 * the segment covers, ends included.
 */
function fitBody(rows, start, stop, days, n) {
  const count = segmentCount(start, stop, days);
  const half = days / 2;
  const segments = [];
  for (let k = 0; k < count; k++) {
    const a = segmentStart(start, stop, days, count, k);
    const pts = rows.filter(r => r[0] >= a - 1e-9 && r[0] <= a + days + 1e-9);
    const axes = [];
    for (let ax = 0; ax < 3; ax++) {
      const M = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
      const y = new Array(n + 1).fill(0);
      for (const r of pts) {
        const [T, U] = basis((r[0] - a) / half - 1, n);
        for (let i = 0; i <= n; i++) {
          for (let j = 0; j <= n; j++) M[i][j] += T[i] * T[j] + (U[i] * U[j]) / (half * half);
          y[i] += T[i] * r[1 + ax] + (U[i] / half) * r[4 + ax] * 86400;
        }
      }
      axes.push(solve(M, y));
    }
    segments.push(axes);
  }
  return segments;
}

/** The bytes of one body: per segment and axis, c0 and c1 as float64, the rest float32. */
function encodeBody(segments, n) {
  const per = 16 + 4 * (n - 1);
  const buf = Buffer.alloc(segments.length * 3 * per);
  let o = 0;
  for (const axes of segments)
    for (const c of axes) {
      buf.writeDoubleLE(c[0], o);
      buf.writeDoubleLE(c[1], o + 8);
      for (let k = 2; k <= n; k++) buf.writeFloatLE(c[k], o + 16 + 4 * (k - 2));
      o += per;
    }
  return buf;
}

/** The pack, evaluated as the page will: from the encoded bytes. */
async function runtimeFrom(pack, data) {
  const { createEphemeris } = await import('../js/mission/ephemeris.js');
  return createEphemeris(pack, data);
}

/** The worst position and velocity errors of the pack against rows. */
function errorsAgainst(eph, id, rows) {
  let pos = 0;
  let vel = 0;
  for (const r of rows) {
    const s = eph.stateAt(id, r[0]);
    pos = Math.max(pos, Math.hypot(s.r[0] - r[1], s.r[1] - r[2], s.r[2] - r[3]));
    vel = Math.max(vel, Math.hypot(s.v[0] - r[4], s.v[1] - r[5], s.v[2] - r[6]));
  }
  return { positionKm: pos, velocityKmS: vel };
}

/** Three significant figures, rounded up: a bound is never below what was measured. */
const ceil3 = x => {
  if (x === 0) return 0;
  const e = Math.floor(Math.log10(x)) - 2;
  const f = 10 ** e;
  return Number((Math.ceil(x / f) * f).toPrecision(3));
};

/** The runtime part of the manifest, which the module carries. */
export function runtimeMeta(m) {
  return {
    format: m.format,
    formatVersion: m.formatVersion,
    id: m.id,
    version: m.version,
    title: m.title,
    frame: m.frame.name,
    center: m.frame.center,
    timeScale: m.timeScale,
    units: m.units,
    range: m.range,
    encoding: m.encoding,
    credit: m.credit,
    bodies: m.bodies.map(b => ({
      id: b.id,
      name: b.name,
      target: b.target,
      segmentDays: b.segmentDays,
      degree: b.degree,
      segments: b.segments,
      bytes: b.bytes,
      sha256: b.sha256,
      maxError: b.maxError,
    })),
  };
}

async function prettierFormat(source, file) {
  const prettier = await import('prettier');
  const options = (await prettier.resolveConfig(file)) || {};
  return prettier.format(source, { ...options, filepath: file });
}

/** Build everything from the cache: the module, the check set, the manifest's measures. */
async function build(m) {
  const data = {};
  const heldOut = {};
  const fitRows = {};
  for (const body of m.bodies) {
    const daily = parseHorizons(readFileSync(cacheFile(body, 'daily'), 'utf8')).rows;
    const noon = parseHorizons(readFileSync(cacheFile(body, 'noon'), 'utf8')).rows;
    const segments = fitBody(daily, m.range.startJd, m.range.stopJd, body.segmentDays, body.degree);
    const bytes = encodeBody(segments, body.degree);
    data[body.id] = bytes.toString('base64');
    body.segments = segments.length;
    body.bytes = bytes.length;
    body.sha256 = sha256(bytes);
    heldOut[body.id] = noon;
    fitRows[body.id] = daily;
  }
  const provisional = runtimeMeta(m);
  const eph = await runtimeFrom(provisional, data);
  for (const body of m.bodies) {
    const fit = errorsAgainst(eph, body.id, fitRows[body.id]);
    const held = errorsAgainst(eph, body.id, heldOut[body.id]);
    body.measured = { fitted: fit, heldOut: held };
    // The bound the pack states, and every check holds it to.
    body.maxError = {
      positionKm: ceil3(Math.max(fit.positionKm, held.positionKm)),
      velocityKmS: ceil3(Math.max(fit.velocityKmS, held.velocityKmS)),
    };
  }
  const meta = runtimeMeta(m);
  const file = path.join(ROOT, m.output.module);
  const source = await prettierFormat(
    [
      `// Generated by tools/build-ephemeris.mjs from ${path.relative(ROOT, MANIFEST)}. Do not edit.`,
      '// A compact derivative of JPL Horizons (DE441) states: EPHEMERIS.md says how it',
      '// was made, how accurate it is, and what it may be used for.',
      '',
      `export const PACK = ${JSON.stringify(meta)};`,
      `export const DATA = ${JSON.stringify(data)};`,
      '',
    ].join('\n'),
    file
  );
  // The held-out check set: every 73rd noon state of each body, for the
  // offline check and the tests, which have no cache.
  const check = {
    note: 'Held-out JPL Horizons (DE441) states at 12:00 TDB, never fitted: every 73rd day of each body. Written by tools/build-ephemeris.mjs --write.',
    columns: ['jdTdb', 'x', 'y', 'z', 'vx', 'vy', 'vz'],
    bodies: Object.fromEntries(
      m.bodies.map(b => [b.id, heldOut[b.id].filter((_, i) => i % 73 === 0)])
    ),
  };
  const checkFile = path.join(ROOT, m.output.check);
  const checkSource = `${JSON.stringify(check, null, 1)}\n`;
  m.output.moduleSha256 = sha256(Buffer.from(source));
  m.output.moduleBytes = Buffer.byteLength(source);
  m.output.checkSha256 = sha256(Buffer.from(checkSource));
  return { source, file, checkSource, checkFile };
}

async function check(m, requireSources) {
  const problems = [];
  const mod = await import(`${path.join(ROOT, m.output.module)}?t=${Date.now()}`);
  const want = JSON.stringify(runtimeMeta(m));
  if (JSON.stringify(mod.PACK) !== want)
    problems.push(`${m.output.module}: PACK is not the manifest's runtime part`);
  const moduleBytes = readFileSync(path.join(ROOT, m.output.module));
  if (sha256(moduleBytes) !== m.output.moduleSha256)
    problems.push(`${m.output.module}: its SHA-256 is not the manifest's`);
  for (const b of m.bodies) {
    const bytes = Buffer.from(mod.DATA[b.id] || '', 'base64');
    if (bytes.length !== b.bytes || sha256(bytes) !== b.sha256)
      problems.push(`${b.id}: its coefficients are not the manifest's (${bytes.length} bytes)`);
  }
  const checkBytes = readFileSync(path.join(ROOT, m.output.check));
  if (sha256(checkBytes) !== m.output.checkSha256)
    problems.push(`${m.output.check}: its SHA-256 is not the manifest's`);
  const set = JSON.parse(checkBytes.toString('utf8'));
  const eph = await runtimeFrom(mod.PACK, mod.DATA);
  for (const b of m.bodies) {
    const e = errorsAgainst(eph, b.id, set.bodies[b.id]);
    if (!(e.positionKm <= b.maxError.positionKm && e.velocityKmS <= b.maxError.velocityKmS))
      problems.push(
        `${b.id}: the held-out check set is ${e.positionKm} km and ${e.velocityKmS} km/s off, over the stated ${b.maxError.positionKm} km and ${b.maxError.velocityKmS} km/s`
      );
  }
  if (requireSources) {
    for (const b of m.bodies)
      for (const kind of ['daily', 'noon']) problems.push(...rawProblems(m, b, kind));
    if (!problems.length) {
      const copy = JSON.parse(JSON.stringify(m));
      const rebuilt = await build(copy);
      if (rebuilt.source !== moduleBytes.toString('utf8'))
        problems.push(`${m.output.module} is not what the cached sources build`);
      if (rebuilt.checkSource !== checkBytes.toString('utf8'))
        problems.push(`${m.output.check} is not what the cached sources build`);
      if (JSON.stringify(copy) !== JSON.stringify(m))
        problems.push(`${path.relative(ROOT, MANIFEST)}: its measures are not what the cached sources give`);
    }
  }
  return problems;
}

const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));
if (has('--fetch')) {
  await fetchAll(m);
  writeFileSync(MANIFEST, `${JSON.stringify(m, null, 2)}\n`);
  console.log('The cache matches every pin.');
}
if (has('--write')) {
  for (const b of m.bodies)
    for (const kind of ['daily', 'noon']) {
      const p = rawProblems(m, b, kind);
      if (p.length) throw new Error(p.join('\n'));
    }
  const out = await build(m);
  mkdirSync(path.dirname(out.file), { recursive: true });
  writeFileSync(out.file, out.source);
  writeFileSync(out.checkFile, out.checkSource);
  writeFileSync(MANIFEST, `${JSON.stringify(m, null, 2)}\n`);
  for (const b of m.bodies)
    console.log(
      `${b.id.padEnd(8)} ${String(b.segments).padStart(4)} segments of ${String(b.segmentDays).padStart(3)} d, degree ${b.degree}: ${b.bytes} bytes, held out ${b.measured.heldOut.positionKm.toExponential(2)} km, ${b.measured.heldOut.velocityKmS.toExponential(2)} km/s`
    );
  console.log(`${m.output.module}: ${m.output.moduleBytes} bytes`);
}
if (has('--check')) {
  const problems = await check(m, has('--require-sources'));
  if (problems.length) {
    console.error(problems.map(p => `  ${p}`).join('\n'));
    process.exit(1);
  }
  console.log(
    `The ephemeris pack ${m.id} ${m.version} is current${has('--require-sources') ? ', and rebuilds from its pinned sources' : ''}.`
  );
}
