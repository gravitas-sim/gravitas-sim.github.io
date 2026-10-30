#!/usr/bin/env node
// =============================================================================
// The cooling-table pin of the remnants validation (Prompt 222, REMNANTS.md)
// -----------------------------------------------------------------------------
//   node tools/remnants-pin.mjs <directory holding seq_NNN_thick.txt> [--write]
//
// Reads the Montreal group's evolutionary sequences (Bedard et al. 2020; the
// raw files are in no repository: D-R10-222-01) and writes the derived pin
// tests/fixtures/remnants/cooling-pin.json: for each mass the models nearest
// to a grid of log L/Lsun in steps of 0.05 inside the domain of the thresholds
// file, four derived columns each (Teff in K, log L/Lsun, R/Rsun, age in
// years) at six significant figures. The records are three lines each; the
// file's own header names the columns. Run it only where the raw files are.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'tests/fixtures/remnants');
const L_SUN_ERG = 3.828e33;
const R_SUN_CM = 6.957e10;
const STEP = 0.05;
const MASSES = ['050', '060', '070', '080', '090', '100', '120'];

const sig6 = x => Number(x.toPrecision(6));

/** The models of one sequence file: [Teff, logg, R_cm, age_yr, L_erg]. */
export function parseSequence(text) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const f = lines[i].trim().split(/\s+/);
    if (f.length === 6 && /^\d+$/.test(f[0]) && /^[0-9.]+$/.test(f[1])) {
      out.push({
        index: Number(f[0]),
        teff: Number(f[1]),
        logg: Number(f[2]),
        rCm: Number(f[3]),
        ageYr: Number(f[4]),
        lErg: Number(f[5]),
      });
    }
  }
  return out;
}

function main() {
  const dir = process.argv[2];
  const th = JSON.parse(
    readFileSync(path.join(FIX, 'thresholds.json'), 'utf8')
  );
  const [lo, hi] = th.contract.coolingDomain.logLSun;
  const files = [];
  const masses = {};
  for (const m of MASSES) {
    const name = `seq_${m}_thick.txt`;
    const buf = readFileSync(path.join(dir, name));
    files.push({
      name,
      bytes: buf.length,
      sha256: createHash('sha256').update(buf).digest('hex'),
    });
    const models = parseSequence(buf.toString('utf8')).map(r => ({
      ...r,
      logL: Math.log10(r.lErg / L_SUN_ERG),
    }));
    const inside = models.filter(r => r.logL >= lo && r.logL <= hi);
    const picked = new Map();
    for (let g = lo; g <= hi + 1e-9; g += STEP) {
      let best = null;
      for (const r of inside)
        if (best === null || Math.abs(r.logL - g) < Math.abs(best.logL - g))
          best = r;
      if (best) picked.set(best.index, best);
    }
    const rows = [...picked.values()]
      .sort((a, b) => b.logL - a.logL)
      .map(r => [
        sig6(r.teff),
        sig6(r.logL),
        sig6(r.rCm / R_SUN_CM),
        sig6(r.ageYr),
      ]);
    masses[(Number(m) / 100).toFixed(1)] = {
      modelsInFile: models.length,
      modelsInDomain: inside.length,
      rows,
    };
  }
  const pin = {
    format: 'gravitas.remnants-cooling-pin/1',
    prompt: 'Roadmap III, Prompt 222',
    source:
      'Bedard, Bergeron, Brassard and Fontaine (2020, ApJ 901, 93): the Montreal group evolutionary sequences, DA, thick hydrogen (q_H = 1e-4, q_He = 1e-2), C/O core, https://www.astro.umontreal.ca/~bergeron/CoolingModels/CoolingModels/',
    retrieved: '2026-10-30 (the coordinator, HTTP 200)',
    rights:
      'no licence stated, credited (the page asks that the Web site and the references be acknowledged); a derived pin of rounded columns at a coarse grid, not the files (D-R10-222-01)',
    columns: ['teffK', 'logLSun', 'radiusSun', 'ageYr'],
    units:
      'L from erg/s over 3.828e33; R from cm over 6.957e10; six significant figures; rows ordered from high to low luminosity',
    grid: `the model nearest to each log L/Lsun = ${lo} + ${STEP} k inside [${lo}, ${hi}]`,
    files,
    masses,
  };
  if (process.argv.includes('--write'))
    writeFileSync(
      path.join(FIX, 'cooling-pin.json'),
      `${JSON.stringify(pin)}\n`
    );
  console.log(
    Object.entries(masses)
      .map(([m, v]) => `${m}: ${v.rows.length} rows of ${v.modelsInDomain}`)
      .join('\n')
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
