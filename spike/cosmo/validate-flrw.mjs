// Part 2 of THRESHOLDS.md: the kernel against both reference tiers, the
// identities, the refusal of closed models, the cost, the size, and the
// radiation-neglect error. Output: results/flrw.json
import { readFileSync, statSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { build } from 'esbuild';
import { here, rel, writeResult } from './lib.mjs';
import { createCosmology, closedForms, ClosedModelError } from './flrw.mjs';

const refs = JSON.parse(readFileSync(`${here}refs.json`, 'utf8'));
const keys = [['dc', 'comovingDistance'], ['dm', 'transverseComovingDistance'], ['dl', 'luminosityDistance'], ['da', 'angularDiameterDistance'], ['lb', 'lookbackTime']];
const worst = { t1: { v: 0 }, t2: { v: 0 } };
const byQuantity = {};
for (const r of refs.rows) {
  const c = createCosmology({ H0: r.H0, Om: r.Om, OL: r.OL });
  for (const [k, fn] of keys) {
    const v = c[fn](r.z);
    for (const [tier, ref] of [['t1', r.astropy[k]], ['t2', r.quad[k]]]) {
      const e = rel(v, ref);
      const q = (byQuantity[`${tier}:${k}`] ??= 0);
      if (e > q) byQuantity[`${tier}:${k}`] = e;
      if (e > worst[tier].v) worst[tier] = { v: e, at: { family: r.family, Om: r.Om, OL: r.OL, H0: r.H0, z: r.z, quantity: k } };
    }
  }
}
// Identities.
let idEds = 0, idMattig = 0, idLookback = 0, idRel = 0;
for (const h0 of [50, 70, 90]) {
  for (const z of refs.grid.z) {
    idEds = Math.max(idEds, rel(createCosmology({ H0: h0, Om: 1, OL: 0 }).comovingDistance(z), closedForms.edsComoving(h0, z)));
    for (const om of [0.05, 0.1, 0.3, 0.5, 0.9]) {
      idMattig = Math.max(idMattig, rel(createCosmology({ H0: h0, Om: om, OL: 0 }).luminosityDistance(z), closedForms.mattigLuminosity(h0, om, z)));
      idLookback = Math.max(idLookback, rel(createCosmology({ H0: h0, Om: om, OL: 1 - om }).lookbackTime(z), closedForms.flatLambdaLookback(h0, om, z)));
      const c = createCosmology({ H0: h0, Om: om, OL: (1 - om) / 2 });
      idRel = Math.max(idRel, rel(c.luminosityDistance(z), (1 + z) * c.transverseComovingDistance(z)), rel(c.angularDiameterDistance(z), c.transverseComovingDistance(z) / (1 + z)));
    }
  }
}
let refused = false;
try { createCosmology({ H0: 70, Om: 0.5, OL: 0.7 }); } catch (e) { refused = e instanceof ClosedModelError; }
// Cost: 1,000 luminosity distances, median of 31 runs.
const c = createCosmology({ H0: 70, Om: 0.3, OL: 0.7 });
const zs = Array.from({ length: 1000 }, (_, i) => 0.001 + (i * 2.0) / 1000);
const times = [];
for (let k = 0; k < 31; k++) {
  const t0 = performance.now();
  let s = 0;
  for (const z of zs) s += c.luminosityDistance(z);
  times.push(performance.now() - t0);
  if (!(s > 0)) throw new Error('no');
}
times.sort((a, b) => a - b);
// Size, minified.
const out = await build({ entryPoints: [`${here}flrw.mjs`], bundle: true, minify: true, format: 'esm', write: false });
const minBytes = out.outputFiles[0].contents.length;
// Radiation.
const radBy = {};
for (const r of refs.radiation) (radBy[r.z] ??= []).push(Math.abs(r.relErrDL));
const radiation = Object.fromEntries(Object.entries(radBy).map(([z, a]) => [z, Math.max(...a)]));
writeResult('flrw', {
  references: refs.versions,
  rows: refs.rows.length,
  worstTier1: worst.t1,
  worstTier2: worst.t2,
  worstByQuantity: byQuantity,
  identities: { edsComoving: idEds, mattigLuminosity: idMattig, flatLookback: idLookback, dlDaRelations: idRel },
  closedRefused: refused,
  cost: { thousandLuminosityDistancesMsMedian: times[15], minMs: times[0], maxMs: times[30] },
  minifiedBytes: minBytes,
  radiationNeglectMaxRelErrDL: radiation,
});
console.log(JSON.stringify({ t1: worst.t1, t2: worst.t2, idEds, idMattig, idLookback, idRel, refused, ms: times[15], minBytes, radiation }, null, 1));
