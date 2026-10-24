// =============================================================================
// The inputs of the authentic-frame oracle (Prompt 189)
// -----------------------------------------------------------------------------
//   node tools/image-packs-oracle/make-inputs.mjs > tests/fixtures/imagePacks/oracle-inputs.json
//   (then Prettier)
//
// The oracle (oracle.py) reads the frame itself, from the committed frames file
// of the pack, and is given only what Gravitas decided under the committed
// analysis contract: which source is the brightest, and the aperture and the
// recentred position it measured there. Nothing is computed by the oracle from
// Gravitas's output beyond those choices.
// =============================================================================

import process from 'node:process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONTRACT,
  DETECTION,
  FRAME_FWHM,
  openFrame,
  plan,
} from '../image-packs-validate.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { mod, a } = await openFrame();
const p = plan(a);
if (p.refused) throw new Error(`detection refused with ${p.refused}`);
const bytes = readFileSync(path.join(ROOT, mod.SIDECAR.file));
const inputs = {
  format: 'gravitas.image-packs-oracle-inputs/1',
  prompt: 189,
  contract: 'tests/fixtures/imagePacks/analysis-contract.json',
  frame: {
    pack: CONTRACT.frame.pack,
    file: mod.SIDECAR.file,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    width: mod.PACK.image.width,
    height: mod.PACK.image.height,
    unit: 'electron/s',
  },
  detection: DETECTION,
  photometry: p.m.ok
    ? {
        x: p.m.x,
        y: p.m.y,
        r: p.m.r,
        rIn: p.m.rIn,
        rOut: p.m.rOut,
        start: { x0: p.brightest.x, y0: p.brightest.y, half: p.ap.half },
      }
    : null,
  fwhmFit: { half: p.ap.half, why: 'the contract’s centroid window: the largest square the 11 by 13 frame holds about the star' },
  fwhm: FRAME_FWHM,
};
process.stdout.write(JSON.stringify(inputs));
