// The sample writer of the follow-up to the population inference gate (Roadmap III, Prompt 264).
//
//   node tools/population-followup-samples.mjs <scratch dir>
//
// It holds no estimator: the named streams of js/random/streams.js, Prompt 229's Poisson draw and
// genObjects copied without change from tools/population-validate.mjs. It writes the stream samples
// of Part A's P3 ensemble and of the follow-up's P3c and P4c, which the oracle's second stage reads
// (draws only) and the validator regenerates in process and compares byte for byte.
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { stream, gaussian } from '../js/random/streams.js';
import { poisson } from '../js/kernels/occurrence/population.js';

export function genObjects(seed, edges, mu, sigLo, sigHi) {
  const draw = stream('noise', seed, 'objects');
  const gauss = gaussian(draw);
  const objects = [];
  for (let j = 0; j < mu.length; j++) {
    const w = edges[j + 1] - edges[j];
    const n = poisson(draw, mu[j]);
    for (let i = 0; i < n; i++) {
      const u = edges[j] + w * draw();
      const sigma =
        w *
        Math.exp(
          Math.log(sigLo) + (Math.log(sigHi) - Math.log(sigLo)) * draw()
        );
      objects.push({ x: u + sigma * gauss(), sigma });
    }
  }
  return objects;
}

export const P_EDGES = Array.from({ length: 11 }, (_, i) => i);
export const P3_E = new Array(10).fill(12);
export const P3_G = Array.from(
  { length: 10 },
  (_, j) => 0.4 * Math.exp(-0.15 * j)
);
export const P4_E = new Array(10).fill(60);
export const P4_G = Array.from({ length: 10 }, (_, j) => (j === 4 ? 0.6 : 0.1));

export const SETS = {
  P3: { file: 'p3-stream.json', baseSeed: 264800, E: P3_E, G: P3_G },
  P4: { file: 'p4-stream.json', baseSeed: 264850, E: P4_E, G: P4_G },
  P3c: { file: 'p3c-stream.json', baseSeed: 2648000, E: P3_E, G: P3_G },
  P4c: { file: 'p4c-stream.json', baseSeed: 2648500, E: P4_E, G: P4_G },
};

export function sampleText(name) {
  const s = SETS[name];
  const replicates = [];
  for (let r = 0; r < 400; r++) {
    const objects = genObjects(
      s.baseSeed + r,
      P_EDGES,
      s.G.map((g, j) => g * s.E[j]),
      0.2,
      0.2
    );
    replicates.push({
      x: objects.map(o => o.x),
      sigma: objects.map(o => o.sigma),
    });
  }
  return JSON.stringify({ name, baseSeed: s.baseSeed, replicates });
}

if (
  process.argv[1] &&
  process.argv[1].endsWith('population-followup-samples.mjs')
) {
  const dir = process.argv[2];
  for (const name of Object.keys(SETS)) {
    const text = sampleText(name);
    writeFileSync(join(dir, SETS[name].file), text);
    console.log(
      name,
      SETS[name].file,
      createHash('sha256').update(text).digest('hex')
    );
  }
}
