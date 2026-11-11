// =============================================================================
// A seeded image observation with known truth (Prompt 283)
// -----------------------------------------------------------------------------
// gravitas.observation/1, kind image: Gaussian point sources at sub-pixel
// positions and one bright disc, on a flat sky with Gaussian noise, so a
// finger's placement and the instrument's refinement can be compared with the
// truth. IMAGE_MEASUREMENT_GATE.md's T2 bounds are 0.5 px for a refined point
// and 2 % for a disc's radius; the hand's own placement was within 1.0 px.
// =============================================================================

import { mulberry32 } from '../js/rng.js';

export const SIZE = 256;
export const STARS = [
  { x: 40.3, y: 50.7, fwhm: 3.6, snr: 60 },
  { x: 100.6, y: 40.2, fwhm: 4.4, snr: 90 },
  { x: 200.4, y: 60.5, fwhm: 3.2, snr: 45 },
  { x: 60.8, y: 130.1, fwhm: 5.0, snr: 110 },
  { x: 120.2, y: 110.9, fwhm: 3.9, snr: 70 },
  { x: 220.7, y: 140.3, fwhm: 4.8, snr: 55 },
  { x: 50.5, y: 210.6, fwhm: 4.1, snr: 100 },
  { x: 110.3, y: 220.2, fwhm: 3.4, snr: 80 },
];
export const DISC = { x: 170.4, y: 180.3, r: 32 };
const SKY = 100;
const NOISE = 8;

export function frameObservation(id = 'mobile-sweep') {
  const u = mulberry32(283);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
  const n = SIZE * SIZE;
  const x = new Array(n);
  const y = new Array(n);
  const v = new Array(n);
  for (let j = 1; j <= SIZE; j++)
    for (let i = 1; i <= SIZE; i++) {
      const k = (j - 1) * SIZE + (i - 1);
      x[k] = i;
      y[k] = j;
      let s = SKY;
      for (const st of STARS) {
        const sg = st.fwhm / 2.354820045;
        s +=
          st.snr *
          NOISE *
          Math.exp(-((i - st.x) ** 2 + (j - st.y) ** 2) / (2 * sg * sg));
      }
      s +=
        400 /
        (1 + Math.exp((Math.hypot(i - DISC.x, j - DISC.y) - DISC.r) / 0.8));
      v[k] = Math.round((s + NOISE * gauss()) * 100) / 100;
    }
  return {
    format: 'gravitas.observation',
    formatVersion: 1,
    kind: 'image',
    id,
    title: 'Mobile sweep frame',
    object: null,
    facility: null,
    origin: 'observed',
    source: { kind: 'builtin', id, version: null },
    credit: 'synthetic test frame (seeded)',
    license: { status: 'cc0' },
    retrieved: null,
    citations: [],
    reductions: [],
    columns: [
      { id: 'x', name: 'column', unit: 'pix', role: 'x', values: x },
      { id: 'y', name: 'row', unit: 'pix', role: 'x', values: y },
      { id: 'v', name: 'counts', unit: 'count', role: 'value', values: v },
    ],
    axes: { x: 'x', y: 'y' },
    image: { width: SIZE, height: SIZE, x: 'x', y: 'y', value: 'v' },
    masks: [],
    annotations: [],
  };
}

export const asFile = (o, name = 'frame.json') => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(o)),
});
