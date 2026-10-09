// Shared helpers for the gate's builders: byte accounting and packing.
// Nothing here is production code; nothing in js/ imports it.
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const here = fileURLToPath(new URL('.', import.meta.url));
export const KiB = 1024;
export const sha256 = b => createHash('sha256').update(b).digest('hex');

/** The derivative as the minified JSON a runtime module would hold. */
export function measure(obj) {
  const json = JSON.stringify(obj);
  const raw = Buffer.byteLength(json);
  const gz = gzipSync(json, { level: 9 }).length;
  return { json, raw, gzip: gz, sha256: sha256(json) };
}

export function writeDerived(id, obj) {
  mkdirSync(`${here}derived`, { recursive: true });
  const m = measure(obj);
  writeFileSync(`${here}derived/${id}.json`, m.json + '\n');
  return m;
}

export function writeResult(id, obj) {
  mkdirSync(`${here}results`, { recursive: true });
  writeFileSync(`${here}results/${id}.json`, JSON.stringify(obj, null, 2) + '\n');
}

/** CSV with a leading "#Table1" line, as SkyServer writes it. */
export function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l && !l.startsWith('#'));
  const head = lines[0].split(',');
  return lines.slice(1).map(l => {
    const f = l.split(',');
    const o = {};
    head.forEach((h, i) => (o[h] = f[i]));
    return o;
  });
}

export const readText = p => readFileSync(`${here}${p}`, 'utf8');

/** Delta-encode a sorted integer array: first value, then differences. */
export const deltas = a => a.map((v, i) => (i ? v - a[i - 1] : v));
export const undelta = a => {
  const out = [];
  a.reduce((s, d, i) => (out[i] = s + d), 0);
  return out;
};

export const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
export const sd = a => {
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
/** Relative difference, symmetric in the sense of |a-b| / |b|. */
export const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

/** Ordinary least squares y = a + b x; returns a, b and the b standard error. */
export function ols(x, y) {
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - mx) ** 2;
    sxy += (x[i] - mx) * (y[i] - my);
  }
  const b = sxy / sxx;
  const a = my - b * mx;
  let rss = 0;
  for (let i = 0; i < n; i++) rss += (y[i] - a - b * x[i]) ** 2;
  return { a, b, seB: Math.sqrt(rss / (n - 2) / sxx), rms: Math.sqrt(rss / (n - 2)) };
}
