#!/usr/bin/env node
// Writes js/kernels/galactic/zeropointTables.js from the two coefficient text
// files as supplied (z5_200720.txt, z6_200720.txt, the files of the
// gaiadr3_zeropoint 0.0.5 package, Lindegren et al. 2021's tables). The numbers
// are read from the files, never typed.
//   node tools/gaia-oracle/make-zeropoint-tables.mjs <z5.txt> <z6.txt>
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const parse = file => {
  const text = readFileSync(file, 'utf8');
  const rows = text
    .split('\n')
    .filter(l => l.trim())
    .map(l => l.split(',').map(c => Number(c.trim())));
  return {
    sha256: createHash('sha256').update(text).digest('hex'),
    j: rows[0].slice(1),
    k: rows[1].slice(1),
    g: rows.slice(2).map(r => r[0]),
    q: rows.slice(2).map(r => r.slice(1).map(v => (v === 0 ? 0 : v))),
  };
};
const [a, b] = process.argv.slice(2);
const t5 = parse(a);
const t6 = parse(b);
const out = `// =============================================================================
// The parallax zero-point coefficients of Lindegren et al. (2021)
// -----------------------------------------------------------------------------
// GENERATED FILE. Do not edit. Written by tools/gaia-oracle/make-zeropoint-tables.mjs
// from the two coefficient files z5_200720.txt (sha256 ${t5.sha256}) and
// z6_200720.txt (sha256 ${t6.sha256}), as supplied with the gaiadr3_zeropoint
// 0.0.5 package (LGPL-3.0; only its tabulated numbers are used here, the code
// is written independently in zeropoint.js). Rows: the G magnitude nodes;
// columns: the coefficients q_jk in micro-arcseconds, with the colour basis
// index j and the sin(latitude) basis index k of each column.
// =============================================================================

export const Z5 = ${JSON.stringify(t5.sha256 && { j: t5.j, k: t5.k, g: t5.g, q: t5.q })};
export const Z6 = ${JSON.stringify({ j: t6.j, k: t6.k, g: t6.g, q: t6.q })};
export const TABLE_FILES = ${JSON.stringify({ z5: { file: 'z5_200720.txt', sha256: t5.sha256 }, z6: { file: 'z6_200720.txt', sha256: t6.sha256 } })};
`;
const target = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../js/kernels/galactic/zeropointTables.js'
);
writeFileSync(target, out);
console.log('wrote', target);
