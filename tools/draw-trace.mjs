#!/usr/bin/env node
// =============================================================================
// The canvas calls a body makes, recorded and hashed
// -----------------------------------------------------------------------------
// Development only. A pixel comparison (tools/body-shots.mjs) says two builds
// drew the same picture; this says they made the same calls, in the same order,
// with the same numbers, which is the stronger statement and the one a code move
// has to meet ("this passed as o, nothing else changed").
//
//   node tools/draw-trace.mjs --out base.json --port 47972 [--reduced-motion]
//   node tools/draw-trace.mjs --compare base.json head.json
//
// Run it in each checkout, then compare. Every scene is built from a fixed seed
// and stepped a fixed number of times (or placed by hand), then every body is
// drawn into a recording context at six zooms on both quality tiers, twice, so
// the second pass sees warm caches. The recording context keeps the name and the
// full-precision arguments of each call, each property it is given, each
// gradient and its stops, and a hash of every sprite handed to drawImage, and
// answers the bloom layer's question with a second recording context. A neutron
// star's pulse phase, which drawing advances, is reset before each draw.
// =============================================================================

import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { serveStatic } from './static-server.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

function compare(a, b) {
  const A = JSON.parse(readFileSync(a, 'utf8'));
  const B = JSON.parse(readFileSync(b, 'utf8'));
  let rows = 0;
  let ops = 0;
  const bad = [];
  for (const id of new Set([...Object.keys(A), ...Object.keys(B)])) {
    const ra = A[id]?.rows ?? [];
    const rb = B[id]?.rows ?? [];
    for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
      rows++;
      ops += ra[i]?.ops ?? 0;
      if (JSON.stringify(ra[i]) !== JSON.stringify(rb[i])) {
        bad.push(`${id} ${ra[i]?.tier} zoom ${ra[i]?.zoom}`);
      }
    }
  }
  console.log(
    `${rows} rows, ${ops} calls: ${bad.length ? `${bad.length} differ` : 'identical'}`
  );
  for (const line of bad.slice(0, 20)) console.log(`  ${line}`);
  return bad.length ? 1 : 0;
}

async function record(args) {
  const arg = name => args[args.indexOf(name) + 1];
  const port = Number(arg('--port') || 47972);
  const out = arg('--out');
  const reduced = args.includes('--reduced-motion');
  const server = await serveStatic({ root: ROOT, port });
  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=default',
      '--enable-gpu-rasterization',
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  page.on('pageerror', e => console.warn('  ! ' + e.message));
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await page.evaluate(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* not required */
    }
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.splashScreenEnded === true, {
    timeout: 20000,
  });
  await page.waitForTimeout(1500);
  const result = await page.evaluate(async () => {
    const ui = await import('/js/ui.js');
    const physics = await import('/js/physics.js');
    const quality = await import('/js/quality.js');
    // The particle class lives in the effects module once there is one.
    const fx = await import('/js/bodyEffects.js').catch(() => null);
    const Particle = (fx || physics).Particle;
    const sky = await import('/js/bodyDrawSky.js').catch(() => null);
    const setBloom = (sky || physics).setBloomLayer;
    // recording context
    let log = [];
    let ops = 0;
    const gid = new WeakMap();
    let gn = 0;
    const chash = new WeakMap();
    const canvasHash = c => {
      if (chash.has(c)) return chash.get(c);
      let h = 2166136261;
      try {
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        for (let i = 0; i < d.length; i++) {
          h ^= d[i];
          h = Math.imul(h, 16777619);
        }
      } catch {
        h = -1;
      }
      const s = `${c.width}x${c.height}#${h >>> 0}`;
      chash.set(c, s);
      return s;
    };
    const fmt = v => {
      if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
      if (typeof v === 'string') return JSON.stringify(v);
      if (v && gid.has(v)) return 'G' + gid.get(v);
      if (v && v.tagName === 'CANVAS') return 'C' + canvasHash(v);
      return String(v);
    };
    const mk = tag => {
      const props = {};
      return new Proxy(
        {},
        {
          get(t, p) {
            if (p in props) return props[p];
            if (p === 'canvas')
              return document.getElementById('simulationCanvas');
            return (...a) => {
              ops++;
              log.push(`${tag}${String(p)}(${a.map(fmt).join(',')})`);
              if (
                p === 'createRadialGradient' ||
                p === 'createLinearGradient'
              ) {
                const g = {
                  addColorStop: (o, c) => {
                    log.push(`G${gid.get(g)}.stop(${fmt(o)},${fmt(c)})`);
                  },
                };
                gid.set(g, ++gn);
                log.push(`-> G${gn}`);
                return g;
              }
              if (p === 'measureText')
                return { width: String(a[0]).length * 7.3 };
              return undefined;
            };
          },
          set(t, p, v) {
            ops++;
            props[p] = v;
            log.push(`${tag}set ${String(p)}=${fmt(v)}`);
            return true;
          },
        }
      );
    };
    const ctx = mk('');
    const bloomCtx = mk('B:');
    let bloomAsked = 0;
    setBloom(() => {
      bloomAsked++;
      log.push('bloomAsked');
      return bloomCtx;
    });
    let a = 0x9e3779b9;
    let draws = 0;
    Math.random = () => {
      draws++;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const hashLog = () => {
      let h1 = 2166136261,
        h2 = 5381;
      const s = log.join('\n');
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 16777619);
        h2 = (Math.imul(h2, 33) ^ c) | 0;
      }
      return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}:${s.length}`;
    };
    const out = {};
    const scenes = [
      'solar-system',
      'binary-star-system',
      'pulsar-system',
      'compact-object-zoo',
      'white-dwarf-binary',
      'neutron-star-collision',
      'spiral-galaxy',
      'coma-cluster',
      'tidal-disruption-event',
      'supermassive-bh',
      'star-cluster',
      'galactic-collision',
      'stellar-graveyard',
      'milky-way-rotation',
      'supernova-remnant',
      'trappist-1-system',
      'synthetic-stars',
      'synthetic-remnants',
      'synthetic-galaxies',
      'synthetic-particles',
      // What the engine spawns at an event, by its own rules: bodies in contact
      // and two steps. The draws taken, the draw that comes next and the ripples
      // are recorded beside the picture, with the clocks pinned.
      'event-kilonova',
      'event-small-kilonova',
      'event-ns-wd',
      'event-wd-wd',
      'event-supernova',
      'event-type-ia',
      'event-bh-feast',
      'event-impacts',
      'event-bh-merger',
      'event-bh-nocolor',
      'event-gas-plume',
      'event-gas-star',
      'event-tracer-fall',
    ];
    for (const sc of scenes) {
      ui.state.paused = true;
      ui.SETTINGS.adaptive_detail = false;
      physics.setDetailScale(1);
      const synth = sc.startsWith('synthetic-');
      const event = sc.startsWith('event-');
      ui.SETTINGS.preset_scenario = synth || event ? 'solar-system' : sc;
      ui.initialize_simulation({ seed: 'trace' });
      ui.state.paused = true;
      ui.SETTINGS.adaptive_detail = false;
      physics.setDetailScale(1);
      if (!synth && !event)
        for (let i = 0; i < 150; i++) physics.updatePhysics(0.01);
      const still = { x: 0, y: 0 };
      let eventRow = null;
      if (event) {
        for (const list of [
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
        ])
          list.length = 0;
        physics.particlePool.clear();
        a = 0x1234567 + sc.length * 977;
        let tick = 0;
        Date.now = () => 1.7e12 + tick++;
        performance.now = () => 5000 + tick++;
        const P = physics;
        const at = (x, y = 0) => ({ x, y });
        const suns = m => m * P.SOLAR_MASS_UNIT;
        const built = {
          'event-kilonova': () =>
            P.neutron_stars.push(
              new P.NeutronStar(at(0), still, 1.8, false),
              new P.NeutronStar(at(0.5), still, 1.8, false)
            ),
          'event-small-kilonova': () =>
            P.neutron_stars.push(
              new P.NeutronStar(at(0), still, 1.3, false),
              new P.NeutronStar(at(0.5), still, 1.3, false)
            ),
          'event-ns-wd': () => {
            P.neutron_stars.push(new P.NeutronStar(at(0), still, 1.4, false));
            P.white_dwarfs.push(new P.WhiteDwarf(at(0.5), still, 0.9));
          },
          'event-wd-wd': () =>
            P.white_dwarfs.push(
              new P.WhiteDwarf(at(0), still, 0.9),
              new P.WhiteDwarf(at(0.5), still, 0.8)
            ),
          'event-supernova': () =>
            P.stars.push(new P.StarObject(at(0), still, 400)),
          'event-type-ia': () =>
            P.white_dwarfs.push(new P.WhiteDwarf(at(0), still, 1.5)),
          'event-bh-feast': () => {
            P.bh_list.push(new P.BlackHole(at(0), suns(1000), still, false));
            P.stars.push(new P.StarObject(at(0.2), still, 1));
            P.comets.push(new P.Comet(at(0.3, 0.1), still));
            P.asteroids.push(new P.Asteroid(at(-0.3), still));
            P.planets.push(new P.Planet(at(0, 0.3), still, 1));
          },
          'event-impacts': () => {
            P.stars.push(new P.StarObject(at(0, 40), still, 1));
            P.planets.push(
              new P.Planet(at(40), { x: 40, y: 0 }, 1),
              new P.Planet(at(40.3), { x: -40, y: 0 }, 1),
              new P.Planet(at(0, 40.2), still, 1)
            );
            P.gas_giants.push(
              new P.GasGiant(at(-40), still, 1),
              new P.GasGiant(at(-39.5), still, 1)
            );
            P.asteroids.push(new P.Asteroid(at(0.1, 40.1), still));
          },
          'event-bh-merger': () =>
            P.bh_list.push(
              new P.BlackHole(at(0), suns(20), still, false),
              new P.BlackHole(at(0.5), suns(20), still, false)
            ),
          'event-bh-nocolor': () => {
            const planet = new P.Planet(at(0.3), still, 1);
            planet.baseColor = 'not a color';
            P.bh_list.push(new P.BlackHole(at(0), suns(1000), still, false));
            P.planets.push(planet);
          },
          'event-gas-plume': () => {
            P.gas_giants.push(new P.GasGiant(at(0), still, 1));
            P.planets.push(new P.Planet(at(3, 1), still, 1));
          },
          'event-gas-star': () =>
            P.gas_giants.push(
              new P.GasGiant(at(0), still, 50),
              new P.GasGiant(at(0.5), still, 50)
            ),
          'event-tracer-fall': () => {
            const bh = new P.BlackHole(at(0), suns(1000), still, false);
            P.bh_list.push(bh);
            const tr = new P.AccretionDiskParticle(
              at(bh.radius + 1),
              still,
              bh
            );
            bh.disk_particles.push(tr);
            P.accretion_disk_particles.push(tr);
          },
        };
        built[sc]();
        const first = draws;
        physics.bumpWorldGeneration();
        for (let i = 0; i < 2; i++) physics.updatePhysics(0.01);
        eventRow = {
          draws: draws - first,
          ripples: JSON.stringify(physics.gravity_ripples),
        };
      }
      if (synth) {
        for (const list of [
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
        ])
          list.length = 0;
        const at = (i, n, gap) => ({ x: (i - (n - 1) / 2) * gap, y: 0 });
        if (sc === 'synthetic-stars') {
          const spec = [
            [35000, 20],
            [15000, 5],
            [9000, 2.2],
            [6800, 1.4],
            [5800, 1.0],
            [4400, 0.7],
            [3200, 0.2],
            [5800, 1.0, { baseColor: '#ff8844' }],
            [5800, 1.0, { anonymous: true }],
            [5800, 1.0, { isSolarSystemSun: true, name: 'Sol' }],
            [5800, 1.0, { stageRadius: 25 }],
            [2500, 0.09],
            [50000, 60, { temperature: 50000 }],
            [5800, 1.0, { luminosityInSuns: 3 }],
          ];
          spec.forEach(([teff, m, extra], i) => {
            const s = new physics.StarObject(at(i, spec.length, 70), still, m);
            s.temperature = teff;
            Object.assign(s, extra);
            physics.stars.push(s);
          });
        } else if (sc === 'synthetic-remnants') {
          [true, false, true].forEach((p, i) => {
            const b = new physics.NeutronStar(
              { x: -40 + i * 20, y: 12 },
              still,
              1.4 + i * 0.3,
              p
            );
            b.magnetic_field_strength = [0.3, 0.7, 5][i];
            b.pulsar_period = 0.4 + i * 0.5;
            physics.neutron_stars.push(b);
          });
          [4000, 8000, 12000, 18000, 7600, 15001].forEach((T, i) => {
            const w = new physics.WhiteDwarf(
              { x: 20 + i * 20, y: 12 },
              still,
              0.6 + i * 0.1
            );
            w.temperature = T;
            physics.white_dwarfs.push(w);
          });
        } else if (sc === 'synthetic-galaxies') {
          for (let i = 0; i < 8; i++)
            physics.galaxies.push(
              new physics.Galaxy(
                { x: (i % 4) * 420 - 630, y: i < 4 ? 180 : -180 },
                still,
                1e5,
                i % 2 === 0 ? 'spiral' : 'elliptical'
              )
            );
        } else {
          const hole = new physics.BlackHole({ x: 0, y: 0 }, { x: 5, y: 3 }, 5);
          physics.bh_list.push(hole);
          [0.05, 0.3, 0.8].forEach((hh, i) => {
            const p = new physics.AccretionDiskParticle(
              { x: 30 + i * 12, y: 20 - i * 15 },
              { x: 0, y: -30 },
              hole
            );
            p.heating_intensity = hh;
            p.radius = 3;
            physics.accretion_disk_particles.push(p);
          });
          for (let i = 0; i < 14; i++) {
            const p = new Particle(
              { x: -80 + i * 14, y: -40 },
              still,
              1.0,
              9,
              2,
              `rgb(${255 - i * 10}, ${120 + i * 8}, ${60 + i * 12})`
            );
            p.age = (i / 14) * 1.05;
            if (i % 3 === 0) {
              p.kilonova_glow = true;
              p.glow_intensity = 0.6 + (i % 2) * 0.4;
            }
            physics.particles.push(p);
          }
        }
      }
      // the drawn lists, with the kinds this slice moved first
      const lists = () => [
        ...physics.stars,
        ...physics.neutron_stars,
        ...physics.white_dwarfs,
        ...physics.galaxies,
        ...physics.particles,
        ...physics.accretion_disk_particles,
        ...physics.planets,
        ...physics.gas_giants,
        ...physics.comets,
        ...physics.bh_list,
      ];
      const counts = {
        stars: physics.stars.length,
        ns: physics.neutron_stars.length,
        wd: physics.white_dwarfs.length,
        gal: physics.galaxies.length,
        particles: physics.particles.length,
        adp: physics.accretion_disk_particles.length,
        planets: physics.planets.length,
        bh: physics.bh_list.length,
      };
      const rows = [];
      for (const tier of ['full', 'low']) {
        quality.setTier(tier);
        for (const zoom of [0.05, 0.3, 1, 4, 14, 60]) {
          ui.state.zoom = zoom;
          ui.state.pan = { x: 0, y: 0 };
          log = [];
          ops = 0;
          bloomAsked = 0;
          // twice the first frame's worth: the second pass sees the caches warm
          for (let pass = 0; pass < 2; pass++) {
            let pi = 0;
            for (const o of lists()) {
              if (o.alive === false) continue;
              if (
                Object.getOwnPropertyDescriptor(o, 'pulsar_phase') !==
                  undefined &&
                typeof o.pulsar_period === 'number'
              ) {
                o.pulsar_phase = 0.7 + pi++ * 0.9;
              }
              log.push(`#${o.kind || o.constructor.name}`);
              o.draw(ctx);
            }
          }
          rows.push({ tier, zoom, ops, bloomAsked, h: hashLog() });
        }
      }
      if (eventRow) {
        // the draws the event took, the draw that comes next, and its ripples
        const next = Math.random();
        rows.push({
          tier: 'event',
          zoom: 0,
          ops: 0,
          bloomAsked: 0,
          h: `${eventRow.draws}:${next}:${eventRow.ripples}`,
        });
      }
      out[sc] = { counts, rows };
    }
    return out;
  });
  writeFileSync(out, `${JSON.stringify(result, null, 1)}\n`);
  let total = 0;
  for (const k of Object.keys(result))
    for (const r of result[k].rows) total += r.ops;
  console.log(out, 'scenes', Object.keys(result).length, 'ops', total);
  await browser.close();
  server.close();
}

const argv = process.argv.slice(2);
if (argv.includes('--compare')) {
  const i = argv.indexOf('--compare');
  process.exit(compare(argv[i + 1], argv[i + 2]));
} else {
  record(argv).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
