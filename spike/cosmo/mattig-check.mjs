// Where does the Mattig identity miss 1e-10, and is it the kernel or the formula?
// The formula is evaluated again in 50-digit decimal arithmetic (Python Decimal,
// run by mattig-check.py) and both the kernel and the double-precision closed
// form are compared with it.
import { execFileSync } from 'node:child_process';
import { here, rel, writeResult } from './lib.mjs';
import { createCosmology, closedForms } from './flrw.mjs';

const pts = [];
for (const h0 of [50, 70, 90]) for (const om of [0.05, 0.1, 0.3, 0.5, 0.9]) for (const z of [0.001, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 3, 5, 10]) pts.push([h0, om, z]);
const exact = JSON.parse(execFileSync('python3', [`${here}mattig-check.py`, JSON.stringify(pts)]).toString());
let worstForm = 0, worstKernel = 0, atForm = null, over = 0;
pts.forEach(([h0, om, z], i) => {
  const k = createCosmology({ H0: h0, Om: om, OL: 0 }).luminosityDistance(z);
  const f = closedForms.mattigLuminosity(h0, om, z);
  const e = +exact[i];
  const ef = rel(f, e), ek = rel(k, e);
  if (rel(k, f) > 1e-10) over++;
  if (ef > worstForm) { worstForm = ef; atForm = { h0, om, z }; }
  worstKernel = Math.max(worstKernel, ek);
});
writeResult('mattig-check', { points: pts.length, pointsOver1e10KernelVsFormula: over, worstDoubleFormulaVsDecimal: worstForm, at: atForm, worstKernelVsDecimal: worstKernel });
console.log({ over, worstForm, atForm, worstKernel });
