// The camera never changes the world (Prompt 496, D-R4-496-01).
//
// tools/camera-independence.mjs steps one seeded world 600 frames with no
// canvas and again under twelve views (three canvas sizes, zoom 0.25 and 3,
// pan 0 and 200 AU), and compares every live body's id, position and velocity
// exactly. Each scene runs in its own Node process, outside Jest's VM, which
// would make the kuiper belt's 309 bodies ten times slower. The control - that
// the same tool sees the old cull - was run on the base commit and is recorded
// in the register row: 3 to 35 of the solar system's 35 bodies removed.
import { describe, test, expect } from '@jest/globals';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';

const ROOT = new URL('..', import.meta.url).pathname;
const PLAN = JSON.parse(
  readFileSync(
    new URL('fixtures/camera-removal/plan.json', import.meta.url),
    'utf8'
  )
);

const run = scene =>
  new Promise((resolve, reject) =>
    execFile(
      process.execPath,
      ['tools/camera-independence.mjs', '--scene', scene],
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 },
      (err, stdout, stderr) =>
        err ? reject(new Error(`${scene}: ${stderr}`)) : resolve(stdout)
    )
  ).then(out => JSON.parse(out));

describe('two cameras on one world give the same bodies, bit for bit', () => {
  const scenes = PLAN.fixtures.everyBranch.cameraScenes;
  let results;

  test('every view of every scene keeps every body where the bare run has it', async () => {
    results = await Promise.all(scenes.map(run));
    for (const r of results) {
      expect(r.views).toHaveLength(12);
      for (const v of r.views)
        expect({ scene: r.scene, ...v }).toEqual({
          scene: r.scene,
          canvas: v.canvas,
          zoom: v.zoom,
          panAU: v.panAU,
          removed: 0,
          moved: 0,
          added: 0,
        });
    }
  }, 600000);

  test("the solar system's three far comets are alive after 600 frames", () => {
    const solar = results.find(r => r.scene === 'solar-system');
    for (const name of PLAN.fixtures.everyBranch.solarSystemComets)
      expect(solar.comets.some(n => n.includes(name))).toBe(true);
    expect(solar.live).toBe(35);
  });
});
