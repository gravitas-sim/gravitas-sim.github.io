// Prompt 257 follow-up (SPIKE ONLY, never merged): transcribes, by line, the few printed numbers of Alam et al. 2017
// (arXiv:1607.03155) that the follow-up legs compare against, from the layout text of the PDF. Each number is a regular
// expression applied to ONE anchored line; the script stops if an anchor matches no line or more than one.
//
//   node tools/bao-extract-alam.mjs <a17 layout text> <pdf sha256> <out.json>

import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [layoutPath, pdfSha, outPath] = process.argv.slice(2);
const bytes = readFileSync(layoutPath);
const OHM = String.fromCharCode(0x2126);
const OMEGA = String.fromCharCode(0x3a9);
const layout = bytes.toString('utf8').replaceAll(OHM, OMEGA).split('\n');
const pageOf = [];
let page = 1;
for (const l of layout) {
  page += (l.match(/\f/g) || []).length;
  pageOf.push(page);
}

const SPEC = [
  ['table10.planck.omegaMh2', /^\s*\S+CDM\s+Planck\s+0\.1429 \(14\)\s+0\.317 \(9\)/, /Planck\s+(0\.1429 \(14\))/],
  ['table10.planck.omegaM', /^\s*\S+CDM\s+Planck\s+0\.1429 \(14\)\s+0\.317 \(9\)/, /\)\s+(0\.317 \(9\))/],
  ['table10.planckPlusBao.omegaMh2', /^\s*\S+CDM\s+Planck \+ BAO\s+0\.1418 \(10\)\s+0\.309 \(6\)/, /BAO\s+(0\.1418 \(10\))/],
  ['table10.planckPlusBao.omegaM', /^\s*\S+CDM\s+Planck \+ BAO\s+0\.1418 \(10\)\s+0\.309 \(6\)/, /\)\s+(0\.309 \(6\))/],
  ['table10.planckPlusBao.H0', /^\s*\S+CDM\s+Planck \+ BAO\s+0\.1418 \(10\)\s+0\.309 \(6\)/, /\)\s+(67\.7 \(5\))/],
  ['rdFid.table7Caption', /rd,fid = 147\.78 Mpc\. The cosmological analysis presented in Section 9/, /(147\.78) Mpc/],
  ['rdFid.fiducialSentence', /cial cosmological model, rd,fid = 147\.78 Mpc, and convenient/, /(147\.78) Mpc/],
  ['neutrinoSector.chains.massEv', /^\s*use a minimal neutrino sector, with one species with a mass of 0\.06/, /mass of (0\.06)/],
];
const out = { format: 'gravitas.bao-alam-printed/1', entries: {} };
for (const [id, anchor, take] of SPEC) {
  const hits = layout.map((l, i) => [l, i]).filter(([l]) => anchor.test(l));
  if (hits.length !== 1) throw new Error(`${id}: anchor matched ${hits.length} lines`);
  const [text, i] = hits[0];
  const m = take.exec(text);
  if (!m) throw new Error(`${id}: token not found on line ${i + 1}`);
  const token = m[1];
  const rec = { token, line: i + 1, pdfPage: pageOf[i] };
  const lead = /^(\d+\.\d+)(?: \((\d+)\))?$/.exec(token);
  rec.value = Number(lead[1]);
  if (lead[2]) rec.lastDigitsOfUncertainty = Number(lead[2]);
  rec.lineText = text.trim().replace(/\s+/g, ' ').slice(0, 160);
  out.entries[id] = rec;
}
// The paper's own statement that the neutrino sector of the FIDUCIAL cosmology is elsewhere: line 645 points to another paper
const ptr = layout.findIndex(l => /\(including neutrino mass\) can be found in Aubourg et al\. \(2015\)/.test(l));
if (ptr < 0) throw new Error('the pointer to Aubourg et al. was not found');
out.fiducialNeutrinoSector = { statedInThisPaper: false, line: ptr + 1, pdfPage: pageOf[ptr], note: 'the paper points to Aubourg et al. 2015 for the scaling of r_d with the neutrino mass and states no Neff or neutrino mass for the fiducial cosmology; 0.06 eV is stated for the cosmological chains only' };
out.source = { identifier: 'arXiv:1607.03155', pdfSha256: pdfSha, layoutTextSha256: createHash('sha256').update(bytes).digest('hex'), tool: 'pdftotext -layout (poppler 26.08.0)' };
writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');
console.log(`transcribed ${Object.keys(out.entries).length} entries`);
