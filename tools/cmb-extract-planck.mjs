// Reads, from the saved extracted text of arXiv:1807.06209 (Carl's session, outside every repository), the printed
// numbers legs P1 to P3 of thresholds.json name, by anchored row, and prints each line it used. Nothing is typed.
// SPIKE ONLY (Prompt 258 Part A).
//   node tools/cmb-extract-planck.mjs <saved text> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const [src, out] = process.argv.slice(2);
const raw = readFileSync(src);
const L = raw.toString('utf8').split('\n');
const norm = t => t.replace(/\s+/g, ' ').trim();
const used = [];
const take = (i, label) => {
  used.push({ line: i + 1, text: norm(L[i]), label });
  return L[i];
};
const find = (re, from, to, what) => {
  for (let i = from; i < Math.min(to, L.length); i++) if (re.test(L[i])) return i;
  throw new Error(`not found: ${what}`);
};
const first = t => {
  const m = t.match(/(\d+\.\d+)/);
  if (!m) throw new Error('no number');
  return m[1];
};
const pairsOf = t => [...t.matchAll(/(\d+\.\d+) ± (\d+\.\d+)/g)].map(m => [m[1], m[2]]);

// Table 1, the best-fit column is the first numerical column; its header names it
const h1 = find(/Parameter\s+Plik best fit\s+Plik \[1\]/, 0, L.length, 'Table 1 header');
take(h1, 'Table 1 header: the first numerical column is the Plik best fit');
const rowOf = (re, what, span = 40) => find(re, h1 + 1, h1 + span, what);
const iWb = rowOf(/^\s*0\.022383\s/, 'omega_b h^2 best fit (the value line; the label is split over the lines before it)');
const wb = first(take(iWb, 'omega_b h^2, best fit (the row label is split over two lines above)'));
const wc = first(take(rowOf(/c h2 \. \./, 'omega_c h^2'), 'omega_c h^2, best fit'));
const H0 = first(take(rowOf(/^\s*H0 \[ ?km s/, 'H0'), 'H0, best fit'));
const th1 = first(take(rowOf(/^\s*100θ. \./, '100 theta_star'), '100 theta_star, best fit, Table 1 (the full numerical result)'));
const caption = find(/one neutrino with a mass of 0\.06 eV/, h1 - 20, h1, 'neutrino-mass note');
take(caption, "Table 1's caption: Omega_m includes one neutrino of 0.06 eV");
const cap2 = find(/θ∗ is the full numerical result/, h1 - 20, h1, 'theta_star note');
take(cap2, "Table 1's caption: theta_star is the full numerical result, theta_MC an approximation");

// Table 2, the fifth numerical column, headed TT,TE,EE+lowE+lensing
const h2 = find(/TT\+lowE\s+TE\+lowE\s+EE\+lowE\s+TT,TE,EE\+lowE\s+TT,TE,EE\+lowE\+lensing\s+TT,TE,EE\+lowE\+lensing\+BAO/, h1, h1 + 80, 'Table 2 header');
take(h2, 'Table 2 header: the fifth numerical column is TT,TE,EE+lowE+lensing');
const iZ = find(/^\s*z∗ \./, h2, h2 + 80, 'z_star row');
take(iZ, 'z_star row, columns 1 to 3 (the third is split over two lines)');
const zl = take(iZ + 1, 'z_star row, columns 4 to 6');
const zp = pairsOf(zl);
if (zp.length !== 3) throw new Error(`expected three value-uncertainty pairs on the z_star continuation line, found ${zp.length}`);
const [zstar, zstarSigma] = zp[1];
const rl = take(find(/^\s*r∗ \[Mpc\]/, h2, h2 + 80, 'r_star row'), 'r_star row');
const rp = pairsOf(rl);
if (rp.length !== 6) throw new Error(`expected six pairs on the r_star row, found ${rp.length}`);
const [rstar, rstarSigma] = rp[4];
const tl = take(find(/^\s*100θ. \. .* 1\.0\d+ ± 0\.\d+ .* ± .* ± .* ± .* ± .* ± /, h2, h2 + 80, '100 theta_star row of Table 2'), '100 theta_star row of Table 2');
const tp = pairsOf(tl);
if (tp.length !== 6) throw new Error(`expected six pairs on the theta_star row, found ${tp.length}`);
const [th2, th2Sigma] = tp[4];
const res = {
  format: 'gravitas.cmb-scale-planck-extraction/1',
  note: "Written by tools/cmb-extract-planck.mjs on spike/cmb-scale-gate from the saved extracted text of arXiv:1807.06209 (Carl's session, 2026-11-06), by anchored row, after thresholds.json (commit 641c275e) and before any oracle, prototype or validator run; nothing typed by hand.",
  source: { identifier: 'arXiv:1807.06209', savedTextSha256: createHash('sha256').update(raw).digest('hex'), rights: 'D-R10-255-11 (same document, same use: printed numbers, no text reproduced)' },
  values: { omegaB: wb, omegaC: wc, H0, theta100Table1Best: th1, zstar, zstarSigma, rstar, rstarSigma, theta100Table2: th2, theta100Table2Sigma: th2Sigma, neutrinoMassEv: '0.06' },
  where: {
    omegaB: 'Table 1, Plik best fit column', omegaC: 'Table 1, Plik best fit column', H0: 'Table 1, Plik best fit column',
    theta100Table1Best: 'Table 1, Plik best fit column (100 theta_star, the full numerical result of the Boltzmann code)',
    zstar: 'Table 2, fifth numerical column (TT,TE,EE+lowE+lensing), a marginalised mean', zstarSigma: 'the same entry, printed uncertainty',
    rstar: 'Table 2, fifth numerical column, a marginalised mean, Mpc', rstarSigma: 'the same entry, printed uncertainty',
    theta100Table2: 'Table 2, fifth numerical column, a marginalised mean (reported only)', theta100Table2Sigma: 'the same entry, printed uncertainty',
    neutrinoMassEv: "Table 1's caption: Omega_m includes one neutrino of 0.06 eV",
  },
  assumptions: ['Neff = 3.046 is ASSUMED: not read from the paper', 'the columns are mixed: a best-fit parameter vector (Table 1) with a marginalised-mean z_star and r_star (Table 2)'],
  lines: used,
};
writeFileSync(out, JSON.stringify(res, null, 1) + '\n');
console.log(JSON.stringify(res.values));
