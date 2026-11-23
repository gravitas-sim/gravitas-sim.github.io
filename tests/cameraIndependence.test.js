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
import { framedBodies, sceneFrame } from '../js/utils.js';

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

describe('a view that frames the scene fits what the scene is about', () => {
  // framedBodies leaves a body out of the camera's frame only when it is more
  // than FRAME_OUTLIER median reaches from the median position and holds less
  // than a tenth of the mass. Nothing is removed from the world.
  const at = (x, mass = 1e-4, y = 0, kind = 'Asteroid') => ({
    pos: { x, y },
    mass,
    kind,
  });
  // The Solar System's starting reaches, in world units (tools/removal-cost.mjs
  // at frame 0): median 348; Hale-Bopp, Hyakutake, Pan-STARRS and Comet ISON
  // are 53 to 10,000 medians out.
  const solar = [
    at(0, 1000, 0, 'Star'),
    ...[39, 72, 100, 152].map(x => at(x, 0.003, 0, 'Planet')),
    ...[520, 958, 1919, 3007].map(x => at(x, 1, 0, 'GasGiant')),
    ...Array.from({ length: 16 }, (_, i) => at(200 + i * 10)),
    ...[660, 1034, 1784, 2608, 3358, 7850].map(x => at(x, 1e-6, 0, 'Comet')),
    ...[18586, 234950, 800015, 3650001].map(x => at(x, 1e-6, 0, 'Comet')),
  ];

  test('the Solar System frames out to its nearer comets, not to Comet ISON', () => {
    const frame = sceneFrame(solar);
    expect(solar.length - frame.bodies.length).toBe(4);
    expect(frame.center.x + frame.half.x).toBeCloseTo(7850, 6);
    expect(frame.center.x).toBeLessThan(10);
  });

  test("a galaxy's outer disc stays in the frame", () => {
    // Ninety tracers spread evenly out to 900, as spiral-galaxy builds them.
    const disc = [
      at(0, 1000, 0, 'BlackHole'),
      ...Array.from({ length: 90 }, (_, i) => {
        const r = 10 + (890 * i) / 89;
        const a = i * 2.39996;
        return at(r * Math.cos(a), 1, r * Math.sin(a), 'Star');
      }),
    ];
    expect(framedBodies(disc)).toHaveLength(disc.length);
  });

  test('a cluster of equal masses leaves out an escaper far beyond it, and keeps one nearby', () => {
    const cluster = Array.from({ length: 40 }, (_, i) =>
      at(100 * Math.cos(i), 1, 100 * Math.sin(i), 'Star')
    );
    const far = at(1e6, 1, 0, 'Star');
    const near = at(800, 1, 0, 'Star');
    expect(framedBodies([...cluster, far])).not.toContain(far);
    expect(framedBodies([...cluster, near])).toContain(near);
  });

  test('a body with a tenth of the mass is framed however far it is', () => {
    const companion = at(5e6, 300, 0, 'Star');
    expect(framedBodies([...solar, companion])).toContain(companion);
  });

  test('fewer than ten bodies are all framed; exactly ten can leave one out', () => {
    const nine = [...solar.slice(0, 8), at(3650001, 1e-6, 0, 'Comet')];
    expect(framedBodies(nine)).toHaveLength(9);
    const ten = [...solar.slice(0, 9), at(3650001, 1e-6, 0, 'Comet')];
    expect(framedBodies(ten)).toHaveLength(9);
  });

  test('no mass, or a position that is not a number, does not turn the frame off', () => {
    const massless = solar.map(b => ({ ...b, mass: 0 }));
    const still = sceneFrame(massless);
    expect(still.center.x + still.half.x).toBeCloseTo(7850, 6);
    const broken = [...solar, at(NaN), at(Infinity)];
    expect(sceneFrame(broken).bodies).toHaveLength(solar.length - 4);
    expect(sceneFrame([at(NaN)])).toBeNull();
  });

  test('a view centred on the centre of mass and sized by half holds every framed body', () => {
    const frame = sceneFrame(solar);
    for (const b of frame.bodies) {
      expect(Math.abs(b.pos.x - frame.center.x)).toBeLessThanOrEqual(
        frame.half.x
      );
      expect(Math.abs(b.pos.y - frame.center.y)).toBeLessThanOrEqual(
        frame.half.y
      );
    }
    // The Sun is the centre and McNaught the far edge: the box's half-width
    // (3925) would leave it off screen.
    expect(frame.half.x).toBeGreaterThan(7840);
  });

  test('more than half the bodies at one point still lets the cut work', () => {
    const pile = [
      ...Array.from({ length: 30 }, () => at(0, 1, 0, 'Star')),
      ...Array.from({ length: 5 }, (_, i) => at(100 + i, 1, 0, 'Star')),
    ];
    const far = at(1e7, 1, 0, 'Star');
    expect(framedBodies([...pile, far])).not.toContain(far);
    expect(framedBodies([...pile, far])).toHaveLength(35);
  });

  test('debris is not framed unless it is all there is', () => {
    const spray = Array.from({ length: 50 }, (_, i) =>
      at(1e5 + i, 1e-9, 0, 'Debris')
    );
    const framed = sceneFrame([...solar, ...spray]);
    expect(framed.center.x + framed.half.x).toBeCloseTo(7850, 6);
    expect(sceneFrame(spray).bodies).toHaveLength(50);
  });
});
