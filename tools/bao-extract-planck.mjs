// Reads, from the saved extracted text of arXiv:1807.06209 (Carl's session, outside every repository), the
// numbers AM2's rule names, by line, and prints each line it used. Nothing is typed. SPIKE ONLY.
//   node tools/bao-extract-planck.mjs <saved text> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [src, out] = process.argv.slice(2);
const raw = readFileSync(src);
const L = raw.toString('utf8').split('\n');
const at = n => L[n - 1];
const used = [];
const take = (n, mustContain) => {
  const t = at(n);
  if (!mustContain.every(m => t.includes(m))) throw new Error(`line ${n} does not hold ${mustContain.join(', ')}`);
  used.push({ line: n, text: t.replace(/\s+/g, ' ').trim() });
  return t;
};
const first = t => {
  const m = t.match(/(\d+\.\d+)/);
  if (!m) throw new Error('no number');
  return m[1];
};
// Table 1, the best-fit column is the first numerical column; the header names it
take(1136, ['Plik best fit', 'Plik [1]']);
const wb = first(at(1139));
used.push({ line: 1139, text: at(1139).replace(/\s+/g, ' ').trim(), label: 'omega_b h^2 (the row label is split over lines 1137 and 1138: "Ωb h", "2")' });
take(1137, ['b h']);
const wc = first(take(1140, ['c h2']));
const H0 = first(take(1147, ['H0 [']));
const rdrag = first(take(1154, ['rdrag [Mpc]']));
// Table 2, the fifth numerical column, headed TT,TE,EE+lowE+lensing
take(1174, ['TT+lowE', 'TT,TE,EE+lowE+lensing', 'TT,TE,EE+lowE+lensing+BAO']);
const zline = take(1224, ['zdrag']);
const pairs = [...zline.matchAll(/(\d+\.\d+) ± (\d+\.\d+)/g)].map(m => [m[1], m[2]]);
if (pairs.length !== 6) throw new Error(`expected six value-uncertainty pairs on the z_drag row, found ${pairs.length}`);
const [zd, zdSigma] = pairs[4];
const noteLine = L.findIndex((t, i) => i >= 1119 && i <= 1135 && t.includes('one neutrino with a mass of 0.06 eV')) + 1;
if (noteLine < 1) throw new Error('the neutrino-mass note was not found in the Table 1 caption');
take(noteLine, ['one neutrino with a mass of 0.06 eV']);
const mnu = '0.06';
const res = {
  format: 'gravitas.bao-planck-extraction/1',
  note: 'Written by tools/bao-extract-planck.mjs on spike/bao-gate from the saved extracted text of arXiv:1807.06209 (Carl\'s session, 2026-11-06), by line, after AM2 of thresholds.json; nothing typed by hand.',
  source: { identifier: 'arXiv:1807.06209', savedTextSha256: createHash('sha256').update(raw).digest('hex'), rights: 'D-R10-255-11 (same document, same use: printed numbers, no text reproduced)' },
  values: { omegaB: wb, omegaC: wc, H0, rdrag, zdrag: zd, zdragSigma: zdSigma, neutrinoMassEv: mnu },
  where: {
    omegaB: 'Table 1, Plik best fit column', omegaC: 'Table 1, Plik best fit column', H0: 'Table 1, Plik best fit column', rdrag: 'Table 1, Plik best fit column',
    zdrag: 'Table 2, fifth numerical column (TT,TE,EE+lowE+lensing), a marginalised mean', zdragSigma: 'the same entry, printed uncertainty', neutrinoMassEv: "Table 1's caption: Omega_m includes one neutrino of 0.06 eV",
  },
  lines: used,
};
writeFileSync(out, JSON.stringify(res, null, 1) + '\n');
console.log(JSON.stringify(res.values));
