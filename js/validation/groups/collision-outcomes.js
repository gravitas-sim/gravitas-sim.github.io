// =============================================================================
// Collision outcomes and bursts (Prompt 137)
// -----------------------------------------------------------------------------
// Two questions the suite had asked only of the black-hole and star-star paths:
//
//   1. What does each kind of event leave behind? A merger, a collapse and an
//      accretion each decide what forms (a star, a white dwarf, a neutron star,
//      a black hole, a gas giant) from the masses, and the rules are the ones
//      the model page states: the Tolman-Oppenheimer-Volkoff limit near three
//      solar masses, the Chandrasekhar limit at 1.4, the roughly eight solar
//      masses above which a star ends as a neutron star, and the application's
//      own most-massive-star setting. The canonical pairs below are written out
//      by hand, so the table is an answer key and not the code read back.
//
//   2. Do mass and linear momentum survive the event? Every `burst` kind in
//      js/engine/bodies.js is thrown by exactly one event, so running each
//      event and totalling the bodies either side covers every kind that could
//      matter; a second check calls all thirteen bursts directly and shows that
//      none of them touches a body.
//
// Where the engine does not conserve, the check says by how much and why, as an
// approximation with the departure computed from first principles. It does not
// pretend, and it does not change the engine (Prompt 137: a failing check is a
// finding, not a reason to edit a model). The two departures found are in the
// decision register.
// =============================================================================

import { OUTCOMES } from '../engineTolerances.js';
import { momentum } from '../harness.js';
import { burst } from '../../engine/bodies.js';
import { particlePool, registerEffects } from '../../engine/state.js';
import {
  asPhysicsObject,
  check_stellar_collapse,
  handle_gas_giant_accretion,
  handle_gas_giant_merging,
} from '../../engine/collisions.js';

const BURSTS = [
  'absorb',
  'tracer',
  'starMerge',
  'starPlanet',
  'starGas',
  'starAsteroid',
  'rocky',
  'collapseStar',
  'collapseNS',
  'collapseWD',
  'gasAccretion',
  'gasMerge',
  'gasStar',
];

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ physics, constants, add, lab }) {
  const GROUP = 'Collision outcomes';
  const SUN = constants.SOLAR_MASS_UNIT;
  const live = () =>
    [
      physics.stars,
      physics.neutron_stars,
      physics.white_dwarfs,
      physics.bh_list,
      physics.planets,
      physics.gas_giants,
      physics.asteroids,
    ]
      .flat()
      .filter(b => b.alive);
  const pRel = (after, before) =>
    Math.hypot(after.x - before.x, after.y - before.y) /
    Math.hypot(before.x, before.y);

  // ---- 1. The merger table -------------------------------------------------
  // [first, second, expected product, why the answer is that]
  const star = (m, v) => new physics.StarObject({ x: 0, y: 0 }, v, m);
  const ns = (m, v) => new physics.NeutronStar({ x: 0, y: 0 }, v, m, null);
  const wd = (m, v) => new physics.WhiteDwarf({ x: 0, y: 0 }, v, m);
  const bh = (m, v) => new physics.BlackHole({ x: 0, y: 0 }, m * SUN, v, false);
  const PAIRS = [
    ['star 3 + star 3', () => [star(3, 0), star(3, 0)], 'StarObject'],
    ['star 5 + star 5', () => [star(5, 0), star(5, 0)], 'NeutronStar'],
    ['star 12 + star 12', () => [star(12, 0), star(12, 0)], 'BlackHole'],
    ['NS 1.4 + NS 1.4', () => [ns(1.4, 0), ns(1.4, 0)], 'NeutronStar'],
    ['NS 2 + NS 1.5', () => [ns(2, 0), ns(1.5, 0)], 'BlackHole'],
    ['WD 0.6 + WD 0.6', () => [wd(0.6, 0), wd(0.6, 0)], 'WhiteDwarf'],
    ['WD 0.9 + WD 0.9', () => [wd(0.9, 0), wd(0.9, 0)], 'NeutronStar'],
    ['WD 1.0 + NS 1.4', () => [wd(1.0, 0), ns(1.4, 0)], 'NeutronStar'],
    ['star 1 + WD 0.6', () => [star(1, 0), wd(0.6, 0)], 'NeutronStar'],
    ['star 1 + NS 1.4', () => [star(1, 0), ns(1.4, 0)], 'NeutronStar'],
    ['BH 5 + star 5', () => [bh(5, 0), star(5, 0)], 'BlackHole'],
    ['BH 5 + NS 1.4', () => [bh(5, 0), ns(1.4, 0)], 'BlackHole'],
  ];

  const mergerRuns = PAIRS.map(([label, make, expected], k) => {
    lab.reset({ enable_star_merging: true });
    // Moving apart and across, so the mass-weighted velocity is not a
    // coincidence of equal masses or a zero.
    const [a, b] = make();
    a.vel = { x: 3 + k, y: -1 };
    b.vel = { x: -2, y: 2 + k * 0.5 };
    a.pos = { x: -0.5, y: 0 };
    b.pos = { x: 0.5, y: 0 };
    for (const o of [a, b]) {
      o.radius = 5;
      o.persistent = true;
      o.model_owned = false;
      const list =
        o.kind === 'StarObject'
          ? physics.stars
          : o.kind === 'NeutronStar'
            ? physics.neutron_stars
            : o.kind === 'WhiteDwarf'
              ? physics.white_dwarfs
              : physics.bh_list;
      list.push(o);
    }
    lab.commit();
    const before = { m: a.mass + b.mass, p: momentum([a, b]) };
    physics.handle_star_merging([
      ...physics.stars,
      ...physics.neutron_stars,
      ...physics.white_dwarfs,
      ...physics.bh_list.map(asPhysicsObject),
    ]);
    const after = live();
    const product = after.length === 1 ? after[0] : null;
    return {
      label,
      expected,
      got: product ? product.kind : `${after.length} bodies`,
      mass: after.reduce((s, o) => s + o.mass, 0) / before.m - 1,
      mom: pRel(momentum(after), before.p),
    };
  });
  const wrong = mergerRuns.filter(r => r.got !== r.expected);
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Merger products match the documented outcome table (12 canonical pairs)',
    measured: wrong.length,
    expected: 0,
    unit: 'pairs with the wrong product',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: `A merger is a perfectly inelastic collision whose product class depends only on the masses: star 3+3 stays a star, 5+5 is over eight solar masses (a neutron star), 12+12 is over the most-massive-star setting of 20 (a black hole); two 1.4 neutron stars stay one, 2+1.5 is over the 3.0 Tolman-Oppenheimer-Volkoff limit; white dwarfs of 0.6+0.6 stay a white dwarf and 0.9+0.9 is over the 1.4 Chandrasekhar limit; a white dwarf or star with a neutron star is a neutron star under 3.0; a hole absorbs anything. The table is hand-written. ${wrong.length ? 'Wrong: ' + wrong.map(r => `${r.label} gave ${r.got}, expected ${r.expected}`).join('; ') + '.' : ''}`,
    source:
      'Chandrasekhar (1931); Oppenheimer & Volkoff (1939); Rhoades & Ruffini (1974), Phys. Rev. Lett. 32, 324 (an upper bound near 3 M-sun)',
  });
  add({
    group: GROUP,
    kind: 'integration',
    name: 'Every merger product conserves mass',
    measured: Math.max(...mergerRuns.map(r => Math.abs(r.mass))),
    expected: 0,
    unit: 'relative',
    tolerance: OUTCOMES.exact,
    toleranceKind: 'absolute',
    why: "The product of a merger carries the sum of its parents' masses whatever it becomes, because a point-mass model has no mass-energy radiated away: the 12 canonical pairs, product class aside. The model page already says that a real merger radiates several percent as gravitational waves and this one radiates none.",
  });
  add({
    group: GROUP,
    kind: 'integration',
    name: 'Every merger product conserves linear momentum',
    measured: Math.max(...mergerRuns.map(r => r.mom)),
    expected: 0,
    unit: 'relative',
    tolerance: OUTCOMES.exact,
    toleranceKind: 'absolute',
    why: "Mass-weighted position and velocity make the collision perfectly inelastic, so momentum is exact for all 12 canonical pairs. Run through the engine's own handler, including the black-hole and neutron-star branches a hand-built pair of stars would never reach.",
  });

  // ---- 2. Collapse ---------------------------------------------------------
  const collapseRuns = [
    ['star 25 (over the 20 limit)', () => star(25, 0), 'stars', 'BlackHole'],
    ['NS 3.5 (over 3.0)', () => ns(3.5, 0), 'neutron_stars', 'BlackHole'],
    ['WD 1.6 (over 1.4)', () => wd(1.6, 0), 'white_dwarfs', 'NeutronStar'],
    ['star 15 (under 20)', () => star(15, 0), 'stars', 'StarObject'],
    ['NS 2.5 (under 3.0)', () => ns(2.5, 0), 'neutron_stars', 'NeutronStar'],
    ['WD 1.2 (under 1.4)', () => wd(1.2, 0), 'white_dwarfs', 'WhiteDwarf'],
  ].map(([label, make, listName, expected], k) => {
    lab.reset();
    const o = make();
    o.vel = { x: 4 - k, y: 1.5 };
    o.pos = { x: 10 * k, y: -3 };
    o.model_owned = false;
    physics[listName].push(o);
    lab.commit();
    const before = { m: o.mass, p: momentum([o]) };
    check_stellar_collapse();
    const after = live();
    return {
      label,
      expected,
      got: after.length === 1 ? after[0].kind : `${after.length} bodies`,
      mass: after.reduce((s, x) => s + x.mass, 0) / before.m - 1,
      mom: pRel(momentum(after), before.p),
    };
  });
  const badCollapse = collapseRuns.filter(r => r.got !== r.expected);
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Collapse thresholds: over a limit collapses, under it does not (6 cases)',
    measured: badCollapse.length,
    expected: 0,
    unit: 'cases with the wrong product',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: `A star over the most-massive-star setting (20) becomes a black hole, a neutron star over 3.0 becomes one, a white dwarf over the 1.4 Chandrasekhar limit becomes a neutron star, and each one just under its limit stays what it is. The under-limit cases are the guard: without them a collapse that fired on everything would pass. ${badCollapse.length ? 'Wrong: ' + badCollapse.map(r => `${r.label} gave ${r.got}`).join('; ') + '.' : ''}`,
    source: 'Chandrasekhar (1931); Oppenheimer & Volkoff (1939)',
  });
  add({
    group: GROUP,
    kind: 'integration',
    name: 'Collapse conserves mass and momentum',
    measured: Math.max(
      ...collapseRuns.map(r => Math.max(Math.abs(r.mass), r.mom))
    ),
    expected: 0,
    unit: 'relative',
    tolerance: OUTCOMES.exact,
    toleranceKind: 'absolute',
    why: 'A collapse changes the class of one body and nothing else: same position, same mass, same velocity. All six cases, collapsed or not, total the same either side.',
  });

  // ---- 3. Gas giants -------------------------------------------------------
  lab.reset();
  const gg = new physics.GasGiant({ x: 0, y: 0 }, { x: 1, y: 0.5 }, 10);
  gg.model_owned = false;
  const rock = new physics.Planet({ x: 3, y: 0 }, { x: -2, y: 5 }, 5);
  rock.persistent = true;
  physics.gas_giants.push(gg);
  physics.planets.push(rock);
  lab.commit();
  const gBefore = { m: gg.mass + rock.mass, p: momentum([gg, rock]) };
  handle_gas_giant_accretion();
  const gAfter = live();
  add({
    group: GROUP,
    kind: 'integration',
    name: 'A gas giant sweeping up a planet conserves mass and momentum',
    measured: Math.max(
      Math.abs(gAfter.reduce((s, o) => s + o.mass, 0) / gBefore.m - 1),
      pRel(momentum(gAfter), gBefore.p)
    ),
    expected: 0,
    unit: 'relative',
    tolerance: OUTCOMES.exact,
    toleranceKind: 'absolute',
    why: "Accretion by a giant gives the planet's mass and momentum to the giant at the mass-weighted velocity. The check is the larger of the mass and momentum errors; the planet must also be gone (one body left), or both would pass with nothing absorbed.",
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'The planet is absorbed (one body remains)',
    measured: gAfter.length,
    expected: 1,
    unit: 'bodies',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'A guard on the check above: it compares totals and would pass trivially if the planet had been left standing inside the giant.',
  });

  const mergeGas = (mJ, label, k) => {
    lab.reset();
    const a = new physics.GasGiant({ x: -1, y: 0 }, { x: 2 + k, y: 1 }, mJ / 2);
    const b = new physics.GasGiant({ x: 1, y: 0 }, { x: -1, y: -2 }, mJ / 2);
    for (const o of [a, b]) {
      o.model_owned = false;
      o.radius = 5;
      physics.gas_giants.push(o);
    }
    lab.commit();
    const before = { m: a.mass + b.mass, p: momentum([a, b]) };
    handle_gas_giant_merging();
    const after = live();
    return {
      label,
      got: after.length === 1 ? after[0].kind : `${after.length} bodies`,
      mass: after.reduce((s, o) => s + o.mass, 0) / before.m - 1,
      mom: pRel(momentum(after), before.p),
    };
  };
  const gasRuns = [
    mergeGas(40, 'two 20 M_J giants', 0),
    mergeGas(100, 'two 50 M_J giants', 1),
  ];
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Gas giants merge into a giant below 80 Jupiter masses and a star above',
    measured:
      Number(gasRuns[0].got === 'GasGiant') +
      Number(gasRuns[1].got === 'StarObject'),
    expected: 2,
    unit: 'correct products',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'The application turns a merged gas giant into a star at 80 Jupiter masses, the standard hydrogen-burning limit for brown dwarfs (Burrows et al. 2001; about 0.075 solar masses is 78.6 Jupiter masses). 40 M_J total stays a giant; 100 M_J becomes a low-mass star.',
    source: 'Burrows et al. (2001), Rev. Mod. Phys. 73, 719',
  });
  add({
    group: GROUP,
    kind: 'integration',
    name: 'Gas giant mergers conserve mass and momentum, giant or star product',
    measured: Math.max(...gasRuns.map(r => Math.max(Math.abs(r.mass), r.mom))),
    expected: 0,
    unit: 'relative',
    tolerance: OUTCOMES.throughStep,
    toleranceKind: 'absolute',
    why: 'Mass and velocity come from the same mass-weighted merge for both products. The star branch converts through solar masses and back, so the tolerance is the through-the-step one, not the exact one: round-off in two conversions, not physics.',
  });

  // ---- 4. A star absorbing a small body ------------------------------------
  const sink = (kindName, make, k) => {
    lab.reset();
    const s = star(4, 0);
    s.vel = { x: 1.5, y: -0.5 };
    s.pos = { x: 0, y: 0 };
    s.model_owned = false;
    s.persistent = true;
    const body = make();
    body.vel = { x: -3 + k, y: 4 };
    body.pos = { x: s.radius * 0.5, y: 0 };
    body.persistent = true;
    physics.stars.push(s);
    (kindName === 'planet'
      ? physics.planets
      : kindName === 'gas'
        ? physics.gas_giants
        : physics.asteroids
    ).push(body);
    lab.commit();
    const pb = momentum([s, body]);
    const mb = s.mass + body.mass;
    const vBefore = { ...s.vel };
    physics.handle_star_object_collisions();
    const after = live();
    return {
      mass: after.reduce((x, o) => x + o.mass, 0) / mb - 1,
      dv: Math.hypot(s.vel.x - vBefore.x, s.vel.y - vBefore.y),
      absorbed: after.length === 1 && after[0] === s,
      discarded:
        body.mass * Math.hypot(s.vel.x - body.vel.x, s.vel.y - body.vel.y),
      p: Math.hypot(pb.x, pb.y),
    };
  };
  const sinks = [
    sink(
      'planet',
      () => new physics.Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 30),
      0
    ),
    sink(
      'gas',
      () => new physics.GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, 2),
      1
    ),
    sink(
      'asteroid',
      () => new physics.Asteroid({ x: 0, y: 0 }, { x: 0, y: 0 }),
      2
    ),
  ];
  add({
    group: GROUP,
    kind: 'integration',
    name: 'A star absorbing a planet, gas giant or asteroid conserves mass',
    measured: Math.max(...sinks.map(r => Math.abs(r.mass))),
    expected: 0,
    unit: 'relative',
    tolerance: OUTCOMES.exact,
    toleranceKind: 'absolute',
    why: "The star's mass grows by exactly the absorbed body's. Each of the three kinds was absorbed (a guard: one body left).",
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'A star absorbs each kind of small body (one body left)',
    measured: sinks.filter(r => r.absorbed).length,
    expected: 3,
    unit: 'kinds absorbed',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'A guard on the checks around it: planet, gas giant and asteroid each end inside the star.',
  });
  add({
    group: GROUP,
    kind: 'approximation',
    name: "A star absorbing a body keeps its own velocity, so the body's momentum is discarded",
    measured: Math.max(...sinks.map(r => r.dv)),
    expected: 0,
    unit: "change in the star's velocity",
    tolerance: 0,
    toleranceKind: 'absolute',
    why: `Not a conservation check, and labeled as the departure it is: the engine adds the absorbed mass to the star and leaves the star's velocity alone, so the system loses m (v_body - v_star) of momentum for a body of mass m (here ${sinks.map(r => (r.discarded / r.p).toExponential(1)).join(', ')} of the system's momentum, for the planet, the gas giant and the asteroid). The black-hole path conserves momentum (Absorption group); the star path does not. The loss scales as m / (M + m): negligible for a planet or asteroid on a star, not for a brown-dwarf-mass giant on a red dwarf. A finding for the decision register, not a model change in this prompt.`,
  });

  // ---- 5. Rocky collisions -------------------------------------------------
  const rocky = (speed, label) => {
    lab.reset();
    const a = new physics.Planet({ x: -1.5, y: 0 }, { x: speed / 2, y: 0 }, 3);
    const b = new physics.Planet(
      { x: 1.5, y: 0 },
      { x: -speed / 2, y: 0.4 },
      2
    );
    for (const o of [a, b]) {
      o.radius = 2;
      o.persistent = true;
      physics.planets.push(o);
    }
    lab.commit();
    const before = { m: a.mass + b.mass, p: momentum([a, b]) };
    const debrisBefore = physics.debris.length;
    physics.handle_rocky_collisions([a, b]);
    return {
      label,
      speed,
      mass: (a.mass + b.mass) / before.m,
      mom:
        Math.hypot(
          ...[
            momentum([a, b]).x - (before.p.x * (a.mass + b.mass)) / before.m,
            momentum([a, b]).y - (before.p.y * (a.mass + b.mass)) / before.m,
          ]
        ) / Math.hypot(before.p.x, before.p.y),
      debris: physics.debris.length - debrisBefore,
    };
  };
  const slow = rocky(8, 'slow');
  const fast = rocky(40.4, 'fast');
  add({
    group: GROUP,
    kind: 'integration',
    name: 'A slow rocky collision (relative speed under 15) conserves mass exactly',
    measured: Math.abs(slow.mass - 1),
    expected: 0,
    unit: 'relative',
    tolerance: OUTCOMES.exact,
    toleranceKind: 'absolute',
    why: 'Under the fragmentation speed the pair bounce with a coefficient of restitution of 0.3 and no mass is lost or made. The collision must have happened (momentum below).',
  });
  add({
    group: GROUP,
    kind: 'integration',
    name: 'A slow rocky collision conserves linear momentum',
    measured: slow.mom,
    expected: 0,
    unit: 'relative',
    tolerance: OUTCOMES.exact,
    toleranceKind: 'absolute',
    why: "The impulse acts equally and oppositely along the line of centers. The pair's momentum is the same before and after.",
  });
  add({
    group: GROUP,
    kind: 'approximation',
    name: "A fast rocky collision (relative speed 40) removes exactly a tenth of each body's mass",
    measured: Math.abs(fast.mass - 0.9),
    expected: 0,
    unit: 'fraction of mass',
    tolerance: OUTCOMES.exact,
    toleranceKind: 'absolute',
    why: "Above a relative speed of 15 the engine multiplies each body's mass by 0.9 and throws floor(speed/8)+2 debris fragments of a tiny fixed mass. The mass is not moved into the fragments: a tenth of the system's mass simply leaves. The check proves the departure is exactly a tenth. A finding for the decision register, not a model change here.",
  });
  add({
    group: GROUP,
    kind: 'approximation',
    name: 'A fast rocky collision throws floor(speed/8)+2 fragments',
    measured: fast.debris,
    expected: Math.floor(40.4 / 8) + 2,
    unit: 'fragments',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'The count the engine documents: relative speed 40.4 gives 7 fragments.',
  });
  add({
    group: GROUP,
    kind: 'approximation',
    name: 'After the tenth is lost the pair still conserves what remains (momentum)',
    measured: fast.mom,
    expected: 0,
    unit: 'relative',
    tolerance: OUTCOMES.exact,
    toleranceKind: 'absolute',
    why: "The mass loss is applied before the impulse, with the velocities unchanged, so the pair's momentum becomes 0.9 of what it was and the impulse conserves that. The measured value is the departure from 0.9 times the original, zero if the loss is the only departure.",
  });

  // ---- 6. Bursts alter no body ---------------------------------------------
  lab.reset();
  const bodies = [star(3, 0), ns(1.4, 0), bh(5, 0)];
  bodies.forEach((o, i) => {
    o.pos = { x: 20 * i, y: 5 };
    o.vel = { x: 1 + i, y: -i };
  });
  physics.stars.push(bodies[0]);
  physics.neutron_stars.push(bodies[1]);
  physics.bh_list.push(bodies[2]);
  lab.commit();
  const snap = () =>
    bodies.map(o => [o.mass, o.pos.x, o.pos.y, o.vel.x, o.vel.y]).flat();
  const s0 = snap();
  let moved = 0;
  const thrown = { n: 0 };
  // The engine's pool spawns nothing until the page files one, so a counting
  // pool stands in, and the one that was there is put back.
  const original = particlePool;
  registerEffects({
    pool: {
      ...original,
      getParticle: () => {
        thrown.n++;
        return {};
      },
    },
  });
  try {
    for (const name of BURSTS) {
      thrown.n = 0;
      burst(name, { x: 3, y: 4 });
      thrown[name] = thrown.n;
      moved += snap().reduce((s, v, k) => s + Math.abs(v - s0[k]), 0);
    }
  } finally {
    registerEffects({ pool: original });
  }
  const silent = BURSTS.filter(name => !thrown[name]).length;
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'All 13 bursts leave every body unchanged',
    measured: moved,
    expected: 0,
    unit: 'summed change in mass, position, velocity',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: "A burst is a spray of particles and nothing else: it must not touch a body's mass, position or velocity. All thirteen kinds are called directly, with a star, a neutron star and a black hole in the world.",
  });
  add({
    group: GROUP,
    kind: 'analytic',
    name: 'Every burst kind throws particles',
    measured: silent,
    expected: 0,
    unit: 'kinds that threw none',
    tolerance: 0,
    toleranceKind: 'absolute',
    why: 'A guard on the check above: a burst that threw nothing would leave every body unchanged trivially.',
  });
}
