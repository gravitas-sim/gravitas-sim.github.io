import { test, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadCosmologyData } from '../js/cosmologyData.js';
import { hubbleLawView, diagramView, bestFit, wedgeView } from '../js/cosmologyWidgets.js';
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const fileFetch = async url => ({ ok: true, json: async () => JSON.parse(readFileSync(path.join(REPO, url.slice(1)), 'utf8')) });
let data;
beforeAll(async () => { data = await loadCosmologyData(fileFetch); });
test('x', () => {
  const out = {};
  const h0 = hubbleLawView({ sample: 0, zmax: 0.1 }, data);
  out.h1929 = { n: h0.n, H0: h0.origin.H0, s: h0.origin.sigmaH0Scaled, line: h0.line.H0, ls: h0.line.sigmaH0Scaled, v0: h0.line.v0, maxr: Math.max(...h0.x), maxv: Math.max(...h0.y) };
  for (const z of [0.02, 0.05, 0.1, 0.3, 0.5]) { const f = hubbleLawView({ sample: 1, zmax: z }, data); out['z' + z] = { n: f.n, H0: f.origin.H0, s: f.origin.sigmaH0Scaled }; }
  const b = bestFit(data);
  out.fit = { Om: b.fit.Om, iv: b.fit.omInterval, chi2: b.fit.chi2, dof: b.fit.dof, n: b.fit.n, keys: Object.keys(b.fit), deg: b.degeneracy };
  for (const [om, h, c] of [[0.3,70,0],[0.36,70,0],[0.3,70,0.1],[0,70,0],[1,70,0],[0.5,70,0]]) { const d = diagramView({ om, h0: h, calib: c, view: 0 }, data); out[`d${om}_${c}`] = { chi2: d.at.chi2, d: d.dchi2, imp: d.impliedH0, pt: d.perTenth, off: d.at.offset }; }
  for (const [z, om] of [[0.12, 0.3], [0.08, 0.3], [0.04, 0.3], [0.12, 0.1], [0.12,0.5]]) { const w = wedgeView({ zmax: z, om }, data); out[`w${z}_${om}`] = { n: w.shown.length, rmax: w.rmax, vmr: w.vmr, near: w.near, far: w.far, shells: w.shells.map(s => [s.r0, s.total, +s.density.toFixed(2), s.vmr && +s.vmr.toFixed(2)]) }; }
  console.log(JSON.stringify(out));
});
