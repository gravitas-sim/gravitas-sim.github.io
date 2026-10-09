// SPIKE (Prompt 87). Builds the candidate star subset from the Yale Bright Star
// Catalogue, 5th revised ed. (Hoffleit and Warren, CDS V/50), reading the
// fixed-width `catalog` and `notes` files that fetch-catalogue.sh downloads. The
// OUTPUT IS NOT COMMITTED: redistribution of the data is exactly what the gate
// could not confirm (see SKY_LAB_GATE.md), so the spike keeps the builder and the
// counts, not the file.
//
//   node tools/build-catalogue.mjs <dir with V_50_catalog and V_50_notes> <out.json> [vmax]
import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const [dir, out, vmaxArg] = process.argv.slice(2);
const vmax = Number(vmaxArg ?? 4.5);
const cat = fs.readFileSync(`${dir}/V_50_catalog`, 'latin1').split('\n').filter(Boolean);
const notes = fs.readFileSync(`${dir}/V_50_notes`, 'latin1').split('\n').filter(Boolean);
const num = (s, f = 1) => { const t = s.trim(); return t === '' ? null : Number(t) * f; };

const names = new Map();
for (const l of notes) {
  const hr = Number(l.slice(0, 6));
  const rest = l.slice(6);
  const m = /^\s*\d+N:\s+(.*)$/.exec(rest) ?? /^\s*\d*N:\s+(.*)$/.exec(rest.slice(0));
  if (!m) continue;
  const first = m[1].split(';')[0].trim();
  if (/^[A-Z][A-Z' -]{2,}$/.test(first) && !names.has(hr)) names.set(hr, first.toLowerCase().replace(/(^|[ -])([a-z])/g, (_, a, b) => a + b.toUpperCase()));
}

const rows = [];
for (const l of cat) {
  const hr = Number(l.slice(0, 4));
  const v = num(l.slice(102, 107));
  if (v == null || v > vmax) continue;
  const rah = num(l.slice(75, 77)), ram = num(l.slice(77, 79)), ras = num(l.slice(79, 83));
  const sign = l[83] === '-' ? -1 : 1;
  const ded = num(l.slice(84, 86)), dem = num(l.slice(86, 88)), des = num(l.slice(88, 90));
  if (rah == null || ded == null) continue;
  const ra = (rah + ram / 60 + ras / 3600) * 15;
  const dec = sign * (ded + dem / 60 + des / 3600);
  rows.push({
    hr,
    name: l.slice(4, 14).trim().replace(/\s+/g, ' '),
    ra, dec, v,
    bv: num(l.slice(109, 114)),
    pmra: num(l.slice(148, 154)), pmde: num(l.slice(154, 160)),   // arcsec/yr
    sp: l.slice(127, 147).trim(),
    plx: num(l.slice(161, 166)), rv: num(l.slice(166, 170)),
    trad: names.get(hr) ?? null,
  });
}
rows.sort((a, b) => a.v - b.v);

// compact form: [hr, ra 1e-4 deg, dec 1e-4 deg, V*100, (B-V)*100|null, pmra mas/yr (int), pmde mas/yr, "Bayer", "Name"|0]
const R4 = x => Math.round(x * 1e4);
const compact = rows.map(r => [r.hr, R4(r.ra), R4(r.dec), Math.round(r.v * 100), r.bv == null ? null : Math.round(r.bv * 100),
  r.pmra == null ? 0 : Math.round(r.pmra * 1000), r.pmde == null ? 0 : Math.round(r.pmde * 1000), r.name, r.trad ?? 0]);
const doc = {
  format: 'sky-spike-stars/0', source: 'Yale Bright Star Catalogue, 5th rev. ed. (Hoffleit and Warren 1991), CDS V/50',
  vmax, count: compact.length, epoch: 'J2000.0 (ICRS to ~0.02 arcsec)',
  columns: ['hr', 'ra_1e-4deg', 'dec_1e-4deg', 'vmag_1e-2', 'bv_1e-2', 'pmra_mas_yr', 'pmde_mas_yr', 'bayer', 'name'],
  stars: compact,
};
const text = JSON.stringify(doc);
fs.writeFileSync(out, text);
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
console.log(JSON.stringify({
  vmax, count: compact.length, withTraditionalName: rows.filter(r => r.trad).length, withBayerOrFlamsteed: rows.filter(r => r.name).length,
  rawBytes: text.length, gzipBytes: zlib.gzipSync(text, { level: 9 }).length, brotliBytes: zlib.brotliCompressSync(text).length,
  sourceSha256: { catalog: sha(`${dir}/V_50_catalog`), notes: sha(`${dir}/V_50_notes`) },
  maxPmArcsecYr: Math.max(...rows.map(r => Math.hypot(r.pmra ?? 0, r.pmde ?? 0))),
}, null, 1));
