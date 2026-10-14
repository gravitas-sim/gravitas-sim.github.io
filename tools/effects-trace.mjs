#!/usr/bin/env node
// =============================================================================
// The effects an engine event spawns, counted and hashed
// -----------------------------------------------------------------------------
// Development and test. The merger explosions and the bursts at a collapse or
// an absorption are driven by engine events and draw from Math.random as they
// go, so a move of the code that builds them has to keep the same draws in the
// same order at the same moments. This runs each event through the engine
// (updatePhysics on bodies placed in contact), with Math.random replaced by a
// seeded stream that counts, and Date.now and performance.now by counters, and
// records per event: how many draws were taken, the draw that comes next, and a
// hash of every particle (full precision) and of every gravitational wave ripple.
//
//   node tools/effects-trace.mjs [--out file.json]
//
// It works in any checkout, before or after the effects module exists: it
// imports js/bodyEffects.js when there is one, as the application does.
// tests/effects.test.js holds the result recorded on the commit before the
// move (tests/fixtures/effectsGolden.json).
// =============================================================================

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export async function traceEffects() {
  const physics = await import('../js/physics.js');
  await import('../js/bodyEffects.js').catch(e => {
    if (!/Cannot find|not found|ENOENT/i.test(String(e?.message))) throw e;
  });
  const {
    NeutronStar,
    WhiteDwarf,
    StarObject,
    BlackHole,
    Planet,
    GasGiant,
    Asteroid,
    Comet,
    SOLAR_MASS_UNIT,
  } = physics;

  const realRandom = Math.random;
  const realNow = Date.now;
  const realPerf = performance.now.bind(performance);
  let seed = 0;
  let draws = 0;
  let clock = 0;
  const reseed = s => {
    seed = s | 0;
    draws = 0;
  };
  Math.random = () => {
    draws++;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Date.now = () => 1.7e12 + clock++;
  performance.now = () => 5000 + clock++;

  const hash = text => {
    let h1 = 2166136261;
    let h2 = 5381;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619);
      h2 = (Math.imul(h2, 33) ^ c) | 0;
    }
    return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}:${text.length}`;
  };

  const lists = () => [
    physics.bh_list,
    physics.planets,
    physics.stars,
    physics.gas_giants,
    physics.asteroids,
    physics.comets,
    physics.debris,
    physics.particles,
    physics.neutron_stars,
    physics.white_dwarfs,
    physics.galaxies,
    physics.accretion_disk_particles,
    physics.gravity_ripples,
  ];
  const clear = () => {
    for (const l of lists()) l.length = 0;
    physics.particlePool.clear();
    physics.resetPhysicsObjectCounter?.();
  };
  const at = (x, y = 0) => ({ x, y });
  const still = () => at(0, 0);
  const suns = m => m * SOLAR_MASS_UNIT;

  // A pair in contact, at rest, at the origin: the merger rules do the rest.
  const events = {
    'ns-ns heavy (kilonova)': () => {
      physics.neutron_stars.push(
        new NeutronStar(at(0), still(), 1.8, false),
        new NeutronStar(at(0.5), still(), 1.8, false)
      );
    },
    'ns-ns light (small kilonova)': () => {
      physics.neutron_stars.push(
        new NeutronStar(at(0), still(), 1.3, false),
        new NeutronStar(at(0.5), still(), 1.3, false)
      );
    },
    'ns-wd (neutron star and white dwarf)': () => {
      physics.neutron_stars.push(new NeutronStar(at(0), still(), 1.4, false));
      physics.white_dwarfs.push(new WhiteDwarf(at(0.5), still(), 0.9));
    },
    'wd-wd over the Chandrasekhar limit': () => {
      physics.white_dwarfs.push(
        new WhiteDwarf(at(0), still(), 0.9),
        new WhiteDwarf(at(0.5), still(), 0.8)
      );
    },
    'wd-wd under the limit': () => {
      physics.white_dwarfs.push(
        new WhiteDwarf(at(0), still(), 0.5),
        new WhiteDwarf(at(0.5), still(), 0.6)
      );
    },
    'star-star merger': () => {
      physics.stars.push(
        new StarObject(at(0), still(), 1),
        new StarObject(at(0.5), still(), 1)
      );
    },
    'collapse: massive star': () => {
      physics.stars.push(new StarObject(at(0), still(), 400));
    },
    'collapse: neutron star over TOV': () => {
      const ns = new NeutronStar(at(0), still(), 3.4, false);
      physics.neutron_stars.push(ns);
    },
    'collapse: white dwarf over Chandrasekhar (type Ia style)': () => {
      const wd = new WhiteDwarf(at(0), still(), 1.5);
      physics.white_dwarfs.push(wd);
    },
    'black hole absorbs a planet': () => {
      physics.bh_list.push(new BlackHole(at(0), suns(1000), still(), false));
      physics.planets.push(new Planet(at(0.3), still(), 1));
    },
    'black hole absorbs a star, a comet and an asteroid': () => {
      physics.bh_list.push(new BlackHole(at(0), suns(1000), still(), false));
      physics.stars.push(new StarObject(at(0.2), still(), 1));
      physics.comets.push(new Comet(at(0.3, 0.1), still()));
      physics.asteroids.push(new Asteroid(at(-0.3), still()));
    },
    'star swallows a planet, a gas giant and an asteroid': () => {
      physics.stars.push(new StarObject(at(0), still(), 1));
      physics.planets.push(new Planet(at(0.2), still(), 1));
      physics.gas_giants.push(new GasGiant(at(-0.2), still(), 1));
      physics.asteroids.push(new Asteroid(at(0, 0.2), still()));
    },
    'two planets collide': () => {
      physics.planets.push(
        new Planet(at(0), at(40, 0), 1),
        new Planet(at(0.3), at(-40, 0), 1)
      );
    },
    'two gas giants merge': () => {
      physics.gas_giants.push(
        new GasGiant(at(0), still(), 1),
        new GasGiant(at(0.5), still(), 1)
      );
    },
    'two black holes merge': () => {
      physics.bh_list.push(
        new BlackHole(at(0), suns(20), still(), false),
        new BlackHole(at(0.5), suns(20), still(), false)
      );
    },
  };

  const out = {};
  const savedSettings = { ...physics.physicsSettings };
  try {
    let n = 0;
    for (const [name, setup] of Object.entries(events)) {
      reseed(0x9e3779b9 + 7 * ++n);
      clock = 0;
      clear();
      setup();
      // Draws made by building the bodies do not count: take them first.
      const built = draws;
      const rows = [];
      for (let step = 0; step < 4; step++) {
        physics.updatePhysics(0.01);
        const particles = physics.particles.map(p => ({
          pos: p.pos,
          vel: p.vel,
          lifetime: p.lifetime,
          age: p.age,
          start_size: p.start_size,
          end_size: p.end_size,
          color: p.color,
          glow: p.kilonova_glow ? p.glow_intensity : null,
        }));
        rows.push({
          draws: draws - built,
          particles: particles.length,
          hash: hash(JSON.stringify(particles)),
          ripples: hash(JSON.stringify(physics.gravity_ripples)),
        });
      }
      out[name] = {
        rows,
        kinds: {
          bh: physics.bh_list.length,
          ns: physics.neutron_stars.length,
          wd: physics.white_dwarfs.length,
          stars: physics.stars.length,
          planets: physics.planets.length,
          gas: physics.gas_giants.length,
          ripples: physics.gravity_ripples.length,
        },
        next: Math.random(),
      };
    }
  } finally {
    Math.random = realRandom;
    Date.now = realNow;
    performance.now = realPerf;
    Object.assign(physics.physicsSettings, savedSettings);
    clear();
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const result = await traceEffects();
  const text = `${JSON.stringify(result, null, 1)}\n`;
  const i = args.indexOf('--out');
  if (i >= 0) writeFileSync(args[i + 1], text);
  else process.stdout.write(text);
}
