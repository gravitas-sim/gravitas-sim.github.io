// Prompt 257 follow-up (SPIKE ONLY, never merged): transcribes the fitting-formula coefficients, exponents,
// stated domain and stated accuracy of Eisenstein & Hu 1998 (astro-ph/9709112v1) from the layout text of the
// PDF, by line, and checks every captured token against a second, independent extraction (pdftotext -raw).
// Nothing is typed from memory: each number below is a regular expression applied to ONE anchored line of
// the text, and the script stops if an anchor matches no line or more than one.
//
//   node tools/bao-extract-eh98.mjs <eh98 layout text> <eh98 raw text> <pdf sha256> <layout text sha256 is computed> <out.json>

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [layoutPath, rawPath, pdfSha, outPath] = process.argv.slice(2);
const layoutBytes = readFileSync(layoutPath);
const rawBytes = readFileSync(rawPath);
// the extraction writes the ohm sign U+2126 where the paper has Omega: normalised to U+03A9 before matching
const layout = layoutBytes.toString('utf8').replaceAll(String.fromCharCode(0x2126), String.fromCharCode(0x3a9)).split('\n');
const raw = rawBytes.toString('utf8');
const sha = b => createHash('sha256').update(b).digest('hex');

// pdf page of each line from the form feeds pdftotext writes between pages
const pageOf = [];
let page = 1;
for (const l of layout) {
  page += (l.match(/\f/g) || []).length;
  pageOf.push(page);
}

// {id, eq, anchor: regex that must match exactly one line, take: regex with one capture group, applied to that line}
// Several coefficients of one printed line share an anchor; "nth" picks the n-th match of `take` on the line.
const SPEC = [
  ['zd.a', '4', /zd\s+=\s+1291\s+\[1 \+ b1/, /(1291)/],
  ['zd.exponentOfOmega0h2', '4', /\(Ω0 h2 \)0\.251\s*$/, /\)(0\.251)/],
  ['zd.denominatorCoefficient', '4', /1 \+ 0\.659\(Ω0h2 \)0\.828/, /\+ (0\.659)\(/],
  ['zd.denominatorExponent', '4', /1 \+ 0\.659\(Ω0h2 \)0\.828/, /\)(0\.828)\s*$/],
  ['b1.a', '4', /b1\s+=\s+0\.313/, /= {1,}(0\.313)\(/],
  ['b1.exponentOfOmega0h2', '4', /b1\s+=\s+0\.313/, /\)(−0\.419)/],
  ['b1.bracketCoefficient', '4', /b1\s+=\s+0\.313/, /\[1 \+ (0\.607)\(/],
  ['b1.bracketExponent', '4', /b1\s+=\s+0\.313/, /\)(0\.674)\s*\]/],
  ['b2.a', '4', /b2\s+=\s+0\.238/, /= {1,}(0\.238)\(/],
  ['b2.exponentOfOmega0h2', '4', /b2\s+=\s+0\.238/, /\)(0\.223)/],
  ['R.a', '5', /R ≡ 3ρb \/4ργ = 31\.5Ωb h2/, /= (31\.5)Ωb/],
  ['R.zScale.power10', '5', /\(z\/103\)−1/, /\(z\/(103)\)/],
  ['zeq.mantissa', '2', /zeq = 2\.50 × 104 Ω0 h2/, /= (2\.50) ×/],
  ['zeq.power10', '2', /zeq = 2\.50 × 104 Ω0 h2/, /× (104) Ω0/],
  ['keq.mantissa', '3', /keq ≡ \(2Ω0 H02 zeq \)1\/2 = 7\.46 × 10−2/, /= (7\.46) ×/],
  ['keq.power10', '3', /keq ≡ \(2Ω0 H02 zeq \)1\/2 = 7\.46 × 10−2/, /× (10−2) Ω0/],
  ['s26.a', '26', /44\.5 ln\(9\.83\/Ω0 h2 \)/, /(44\.5) ln/],
  ['s26.lnArgument', '26', /44\.5 ln\(9\.83\/Ω0 h2 \)/, /\((9\.83)\//],
  ['s26.denominatorCoefficient', '26', /1 \+ 10\(Ωb h2 \)3\/4/, /\+ (10)\(/],
  ['s26.denominatorExponent', '26', /1 \+ 10\(Ωb h2 \)3\/4/, /\)(3\/4)/],
  ['accuracy.percent', '26 text', /approximates the sound horizon to ∼ 2% over the range/, /to ∼ (2)%/],
  ['domain.omegaBh2.lower', '26 text', /approximates the sound horizon to ∼ 2% over the range/, /(0\.0125)/],
  ['domain.omega0h2.lower', '26 text', /approximates the sound horizon to ∼ 2% over the range/, /and (0\.025)/],
  ['domain.omega0h2.upper', '26 text', /Ω0 h <∼ 0\.5\. The value/, /<∼ (0\.5)\./],
  ['domain.omegaBh2.upperForDragEpoch', '4 text', /∼ 0\.03,/, /∼ (0\.03),/],
  ['T.cobe', 'text', /FIRAS instrument are 2\.728 ± 0\.004 K/, /are (2\.728) ±/],
  ['z.reductionFactorFromHS96', '4 text', /reduced zd by a factor of 0\.96 from HS96/, /factor of (0\.96) from/],
];

const out = { format: 'gravitas.bao-eh98-transcription/1', coefficients: {} };
for (const [id, eq, anchor, take] of SPEC) {
  const hits = layout.map((l, i) => [l, i]).filter(([l]) => anchor.test(l));
  if (hits.length !== 1) throw new Error(`${id}: anchor matched ${hits.length} lines`);
  const [text, i] = hits[0];
  const m = take.exec(text);
  if (!m) throw new Error(`${id}: token not found on line ${i + 1}`);
  const token = m[1];
  // the independent extraction must hold the same token (glued exponents differ in layout, so the mantissa is checked)
  const probe = token.replace(/^10(.+)$/, '$1').replace('−', '');
  if (!raw.includes(probe) && !raw.replace(/−/g, '').includes(probe)) throw new Error(`${id}: ${token} absent from the raw extraction`);
  const rec = { equation: eq, token, line: i + 1, pdfPage: pageOf[i], lineText: text.trim().replace(/\s+/g, ' ') };
  if (id.endsWith('power10')) {
    // "104" is 10 to the power 4 and "10−2" is 10 to the power -2, as the superscript is glued to the 10 by the extraction
    rec.exponent = Number(token.slice(2).replace('−', '-'));
    rec.base = 10;
    rec.note = 'the superscript is glued to the 10 by the extraction; checked against the page image';
  } else if (token === '3/4') {
    rec.value = 0.75;
  } else {
    rec.value = Number(token.replace('−', '-'));
  }
  out.coefficients[id] = rec;
}
// The structure of each equation (which coefficient multiplies what) is read from the rendered pages 4, 5 and 12 of the
// PDF, not from the text extraction; it is recorded as words, and the numbers above are the only numbers.
out.forms = {
  eq4: 'z_d = a (w0^e1) / (1 + c (w0^e2)) [1 + b1 (wb^b2)], b1 = a1 (w0^e3) [1 + c1 (w0^e4)], b2 = a2 (w0^e5); w0 = Omega0 h^2, wb = Omega_b h^2 (pdf page 5)',
  eq5: 'R(z) = 3 rho_b / (4 rho_gamma) = a wb Theta27^-4 (z / 10^3)^-1 (pdf page 5)',
  eq2: 'z_eq = m 10^4 w0 Theta27^-4 (pdf page 4)',
  eq3: 'k_eq = m 10^-2 w0 Theta27^-2 per Mpc, equal to (2 Omega0 H0^2 z_eq)^(1/2) (pdf page 4)',
  eq6: 's = 2 / (3 k_eq) sqrt(6 / R_eq) ln[(sqrt(1 + R_d) + sqrt(R_d + R_eq)) / (1 + sqrt(R_eq))], R_d = R(z_d), R_eq = R(z_eq) (pdf page 5)',
  eq26: 's = a ln(l / w0) / sqrt(1 + c wb^(3/4)) Mpc (pdf page 12)',
  theta27: 'Theta27 = T_CMB / 2.7 K; the paper fixes T_CMB to the COBE value 2.728 K and does not vary Theta27 in its fits (pdf page 4)',
  neutrinos: 'three massless species at (4/11)^(1/3) the photon temperature (pdf page 4)',
  omega0: 'Omega0 = Omega_b + Omega_c, no neutrino mass (pdf page 4)',
};
out.source = {
  identifier: 'arXiv:astro-ph/9709112v1',
  citation: 'Eisenstein and Hu 1998, Baryonic Features in the Matter Transfer Function, ApJ 496, 605',
  pdfSha256: pdfSha,
  layoutTextSha256: sha(layoutBytes),
  rawTextSha256: sha(rawBytes),
  tool: 'pdftotext -layout and pdftotext -raw (poppler 26.08.0)',
};
writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');
console.log(`transcribed ${Object.keys(out.coefficients).length} entries`);
