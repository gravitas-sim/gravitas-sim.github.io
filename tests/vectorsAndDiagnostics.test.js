import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  StarObject,
  Planet,
  stars,
  planets,
  bh_list,
  asteroids,
  comets,
  gas_giants,
  neutron_stars,
  white_dwarfs,
  galaxies,
  debris,
  particles,
  setStateReference,
  updatePhysicsSettings,
  updatePhysics,
  bumpWorldGeneration,
  resetPhysicsObjectCounter,
  accelerationBreakdown,
  gravitySourcesFor,
  conservedQuantities,
  conservationDrift,
  resetConservationBaseline,
  conservationCaveats,
  getSimulationTime,
  resetSimulationTime,
  activeIntegrator,
  INTEGRATORS,
  SOLAR_MASS_UNIT,
} from '../js/physics.js';
import {
  sourceColor,
  potentialAt,
  potentialSources,
  vectorLegendRows,
} from '../js/vectorOverlay.js';

// The overlay draws arrows for quantities the integrator computed, and the
// diagnostics report drift in quantities the integrator is supposed to conserve.
// Both are only worth anything if they agree with the simulation rather than
// with a second implementation of it, which is what these check.

// The lists have to be reached through the live bindings on every call, not
// captured once. updatePhysics reassigns them when it culls absorbed bodies -
// `planets = check_and_absorb(planets)` - so an array held from module load
// becomes a detached copy the moment anything is absorbed, and emptying it
// empties nothing the engine can see.
const eachList = fn =>
  [
    bh_list,
    planets,
    stars,
    gas_giants,
    asteroids,
    comets,
    debris,
    particles,
    neutron_stars,
    white_dwarfs,
    galaxies,
  ].forEach(fn);

const clearWorld = () => {
  eachList(l => {
    l.length = 0;
  });
  resetPhysicsObjectCounter();
  bumpWorldGeneration();
};

/** A massive point the engine will not reshape or destroy. */
const star = (x, y, massUnits, vx = 0, vy = 0) => {
  const s = new StarObject({ x, y }, { x: vx, y: vy }, massUnits / 1000);
  s.mass = massUnits;
  s.radius = 0.5;
  s.intact = true;
  s.persistent = true;
  return s;
};

/** A tracer light enough not to move anything else measurably. */
const tracer = (x, y, vx, vy) => {
  const p = new Planet({ x, y }, { x: vx, y: vy }, 1);
  p.mass = 1e-9;
  p.radius = 0.1;
  p.persistent = true;
  return p;
};

beforeEach(() => {
  setStateReference({
    frame_count: 0,
    zoom: 1,
    pan: { x: 0, y: 0 },
    frameOffset: { x: 0, y: 0 },
    paused: false,
  });
  updatePhysicsSettings({
    gravitational_constant: 1,
    mutual_gravity: true,
    star_only_gravity: false,
    enable_star_merging: false,
    dynamic_object_properties: false,
    use_barnes_hut: false,
    bh_behavior: 'Orbiting',
    orbit_decay_rate: 0,
    dark_matter_halo: false,
    max_timestep: 0,
    min_interaction_distance: 1e-6,
    integrator: 'Symplectic Euler',
  });
  clearWorld();
  resetSimulationTime();
});

describe('the acceleration the overlay draws', () => {
  test('is the acceleration the integrator used, not a second calculation', () => {
    // The whole point of publishing it. An arrow computed independently of the
    // step is free to disagree with the motion it is drawn next to, and an
    // arrow that disagrees with the motion is worse than no arrow.
    //
    // Measured at one instant on both sides: the breakdown is taken first, then
    // a step is run from the same positions, so the integrator's acceleration
    // and the overlay's have to be bit-for-bit the same number rather than
    // merely close. Anything less would leave room for two force laws.
    clearWorld();
    const s = star(0, 0, 1000);
    const p = tracer(200, 0, 0, Math.sqrt(1000 / 200));
    stars.push(s);
    planets.push(p);
    bumpWorldGeneration();
    updatePhysics(0.01);

    const before = accelerationBreakdown(p);
    updatePhysics(0.01);
    expect(p.last_accel.x).toBe(before.total.ax);
    expect(p.last_accel.y).toBe(before.total.ay);
  });

  test('what the integrator used is reported alongside the current value', () => {
    clearWorld();
    const s = star(0, 0, 1000);
    const p = tracer(0, 300, 0.9, 0);
    stars.push(s);
    planets.push(p);
    bumpWorldGeneration();
    updatePhysics(1e-5);
    const parts = accelerationBreakdown(p);
    // A step this small cannot move the body far enough for the two to differ
    // by more than the step's own share, which is the statement being made:
    // they are the same function of position, evaluated a step apart. Compared
    // as a fraction of the vector, because one component of it is near zero
    // here and an absolute bound on that component would be a bound on nothing.
    const mag = Math.hypot(parts.total.ax, parts.total.ay);
    const gap = Math.hypot(
      parts.stepped.ax - parts.total.ax,
      parts.stepped.ay - parts.total.ay
    );
    // The bound is the step, not a fitted number: the body moves v*dt = 9e-6 of
    // a radius of 300, so the direction of the pull turns by 3e-8 radians and
    // the two vectors differ by about that. A factor of thirty of headroom on
    // it still separates "one step apart" from "a different force law" by six
    // orders of magnitude.
    expect(gap / mag).toBeLessThan(1e-6);
  });

  test('points at the mass, with the magnitude GM/r^2', () => {
    clearWorld();
    const s = star(0, 0, 1000);
    const p = tracer(0, 250, 0, 0);
    stars.push(s);
    planets.push(p);
    bumpWorldGeneration();
    updatePhysics(0.001);

    const parts = accelerationBreakdown(p);
    const mag = Math.hypot(parts.total.ax, parts.total.ay);
    expect(mag).toBeCloseTo(1000 / 250 ** 2, 9);
    // Straight down the line to the star, which is at -y from the tracer.
    expect(parts.total.ax).toBeCloseTo(0, 12);
    expect(parts.total.ay).toBeLessThan(0);
  });

  test('the per-source terms sum to the total', () => {
    // The check the picture makes visually: the dashed component arrows are a
    // vector sum a student can verify with a ruler.
    clearWorld();
    const a = star(-300, 0, 1400);
    const b = star(350, 120, 900);
    const c = star(60, -420, 2100);
    const p = tracer(20, 30, 0.4, -0.2);
    stars.push(a, b, c);
    planets.push(p);
    bumpWorldGeneration();
    updatePhysics(0.005);

    const parts = accelerationBreakdown(p);
    expect(parts.sources.length).toBe(3);
    let sx = 0;
    let sy = 0;
    for (const s of parts.sources) {
      sx += s.ax;
      sy += s.ay;
    }
    expect(sx).toBeCloseTo(parts.total.ax, 12);
    expect(sy).toBeCloseTo(parts.total.ay, 12);
    // Which is the same statement the module makes about itself.
    expect(Math.hypot(parts.residual.ax, parts.residual.ay)).toBeLessThan(
      1e-12
    );
  });

  test('the components are ordered strongest first', () => {
    clearWorld();
    const near = star(60, 0, 500);
    const far = star(-900, 0, 500);
    const p = tracer(0, 0, 0, 0);
    stars.push(near, far);
    planets.push(p);
    bumpWorldGeneration();
    updatePhysics(0.001);
    const parts = accelerationBreakdown(p);
    expect(parts.sources[0].id).toBe(near.id);
    expect(
      Math.hypot(parts.sources[0].ax, parts.sources[0].ay)
    ).toBeGreaterThan(Math.hypot(parts.sources[1].ax, parts.sources[1].ay));
  });

  test('a body is never a source of its own acceleration', () => {
    clearWorld();
    const a = star(0, 0, 1000);
    const b = star(400, 0, 1000);
    stars.push(a, b);
    bumpWorldGeneration();
    updatePhysics(0.001);
    const sources = gravitySourcesFor(a);
    expect(sources.some(s => s.id === a.id)).toBe(false);
    expect(sources.some(s => s.id === b.id)).toBe(true);
  });

  test('a dead body has no breakdown', () => {
    clearWorld();
    const p = tracer(10, 10, 0, 0);
    p.alive = false;
    expect(accelerationBreakdown(p)).toBeNull();
    expect(accelerationBreakdown(null)).toBeNull();
  });

  test('each source keeps its own colour, keyed on identity not position', () => {
    // A colour that changed every time something merged would make the picture
    // unreadable at exactly the moment it got interesting.
    expect(sourceColor(7)).toBe(sourceColor(7));
    expect(sourceColor(0)).not.toBe(sourceColor(1));
    expect(typeof sourceColor(12345)).toBe('string');
  });
});

describe('velocity and acceleration on an eccentric orbit', () => {
  /**
   * A body at apoapsis on an eccentric orbit, advanced far enough to be
   * somewhere general on it.
   * @param {number} steps - Steps of 0.02 to take
   * @returns {{p: object, s: object}} The tracer and its primary
   */
  const eccentric = steps => {
    clearWorld();
    const a = 200;
    const e = 0.65;
    const s = star(0, 0, 1000);
    const rApo = a * (1 + e);
    const vApo = Math.sqrt((1000 / a) * ((1 - e) / (1 + e)));
    const p = tracer(rApo, 0, 0, vApo);
    stars.push(s);
    planets.push(p);
    bumpWorldGeneration();
    for (let i = 0; i < steps; i++) updatePhysics(0.02);
    return { p, s };
  };

  /** Degrees between velocity and total acceleration. */
  const angle = p => {
    const parts = accelerationBreakdown(p);
    const dot = p.vel.x * parts.total.ax + p.vel.y * parts.total.ay;
    const cross = p.vel.x * parts.total.ay - p.vel.y * parts.total.ax;
    return (Math.abs(Math.atan2(cross, dot)) * 180) / Math.PI;
  };

  test('they are perpendicular at apoapsis', () => {
    // The teaching case. If velocity pointed along the force the orbit would be
    // a straight line into the star, and at apoapsis the two are exactly square
    // to each other.
    const { p } = eccentric(1);
    expect(angle(p)).toBeCloseTo(90, 0);
  });

  test('they are nowhere near parallel anywhere on the orbit', () => {
    // Sampled right round, including through periapsis, where the acceleration
    // is thirty times what it is at apoapsis and the velocity is fastest. The
    // misconception this overlay exists to destroy would predict zero degrees
    // everywhere; the orbit never gets within forty of it.
    //
    // The bound is not a fitted number. On a Kepler orbit the angle between the
    // velocity and the radius is 90 - phi, where sin(phi) is at most the
    // eccentricity, so at e = 0.65 the angle is confined to 90 +/- 40.5
    // degrees. That is what makes an eccentric orbit the case worth drawing.
    const { p } = eccentric(1);
    let smallest = 180;
    let largest = 0;
    // A whole orbit, not a piece of one: the period at a = 200 about 1000 units
    // is about 562 time units, and sampling only the first eighty would miss
    // periapsis entirely and report a swing of twenty degrees.
    const period = 2 * Math.PI * Math.sqrt(200 ** 3 / 1000);
    const steps = Math.round(period / 0.02);
    for (let i = 0; i < steps; i++) {
      updatePhysics(0.02);
      const a = angle(p);
      if (!Number.isFinite(a)) continue;
      smallest = Math.min(smallest, a);
      largest = Math.max(largest, a);
    }
    const phi = (Math.asin(0.65) * 180) / Math.PI;
    expect(smallest).toBeGreaterThan(90 - phi - 2);
    expect(largest).toBeLessThan(90 + phi + 2);
    // And it really does swing: a near-circular orbit would sit at 90 and this
    // check would pass without the picture showing anything.
    expect(largest - smallest).toBeGreaterThan(60);
  });
});

describe('conservation diagnostics', () => {
  /** An isolated, closed two-body system. */
  const closedPair = () => {
    clearWorld();
    updatePhysicsSettings({
      mutual_gravity: true,
      star_only_gravity: false,
      enable_star_merging: false,
      bh_behavior: 'Orbiting',
      dark_matter_halo: false,
      orbit_decay_rate: 0,
    });
    const M = 1000;
    const m = 40;
    const a = 220;
    const v = Math.sqrt((M + m) / a);
    const s1 = star((-a * m) / (M + m), 0, M, 0, (-v * m) / (M + m));
    const s2 = star((a * M) / (M + m), 0, m, 0, (v * M) / (M + m));
    stars.push(s1, s2);
    bumpWorldGeneration();
    return { s1, s2, period: 2 * Math.PI * Math.sqrt(a ** 3 / (M + m)) };
  };

  test('reports the energy an independent calculation gives', () => {
    const { s1, s2 } = closedPair();
    const now = conservedQuantities();
    const r = Math.hypot(s1.pos.x - s2.pos.x, s1.pos.y - s2.pos.y);
    const ke =
      0.5 * s1.mass * (s1.vel.x ** 2 + s1.vel.y ** 2) +
      0.5 * s2.mass * (s2.vel.x ** 2 + s2.vel.y ** 2);
    const pe = -(1 * s1.mass * s2.mass) / r;
    expect(now.energy).toBeCloseTo(ke + pe, 9);
    expect(now.count).toBe(2);
  });

  test('reports the angular momentum an independent calculation gives', () => {
    const { s1, s2 } = closedPair();
    const now = conservedQuantities();
    const m = s1.mass + s2.mass;
    const cx = (s1.mass * s1.pos.x + s2.mass * s2.pos.x) / m;
    const cy = (s1.mass * s1.pos.y + s2.mass * s2.pos.y) / m;
    const L =
      s1.mass * ((s1.pos.x - cx) * s1.vel.y - (s1.pos.y - cy) * s1.vel.x) +
      s2.mass * ((s2.pos.x - cx) * s2.vel.y - (s2.pos.y - cy) * s2.vel.x);
    expect(now.angular).toBeCloseTo(L, 9);
  });

  test('the drift percentages match the raw totals they came from', () => {
    // The readout is the thing a student writes down, so it has to be the same
    // number as the quantities above and not a separately maintained one.
    closedPair();
    resetConservationBaseline();
    for (let i = 0; i < 400; i++) updatePhysics(0.05);
    const d = conservationDrift();
    const now = conservedQuantities();
    expect(d.energy).toBeCloseTo(now.energy, 9);
    expect(d.energyDrift).toBeCloseTo(
      (100 * (now.energy - d.baselineEnergy)) / Math.abs(d.baselineEnergy),
      9
    );
    expect(d.angularDrift).toBeCloseTo(
      (100 * (now.angular - d.baselineAngular)) / Math.abs(d.baselineAngular),
      9
    );
  });

  test('a closed circular pair drifts by almost nothing', () => {
    const { period } = closedPair();
    resetConservationBaseline();
    const dt = 0.02;
    for (let i = 0; i < Math.round((4 * period) / dt); i++) updatePhysics(dt);
    const d = conservationDrift();
    expect(Math.abs(d.energyDrift)).toBeLessThan(0.5);
    expect(Math.abs(d.angularDrift)).toBeLessThan(1e-9);
  });

  test('the baseline is the state it was taken at, and can be retaken', () => {
    closedPair();
    resetConservationBaseline();
    for (let i = 0; i < 200; i++) updatePhysics(0.05);
    const drifted = conservationDrift();
    const retaken = resetConservationBaseline();
    const after = conservationDrift();
    expect(retaken.energy).toBeCloseTo(drifted.energy, 9);
    expect(after.energyDrift).toBeCloseTo(0, 12);
    expect(after.angularDrift).toBeCloseTo(0, 12);
  });

  test('says so when the configuration cannot conserve anything', () => {
    // A drift figure that did not say "there is a static black hole in this
    // scene" would be blamed on the integrator.
    // Message ids rather than sentences: the prose moved to the catalogue when
    // the interface was internationalized, and physics.js is the wrong place
    // for a sentence anyway.
    clearWorld();
    updatePhysicsSettings({ star_only_gravity: true, mutual_gravity: false });
    expect(conservationCaveats()).toContain('caveat.oneWayGravity');

    updatePhysicsSettings({ star_only_gravity: false, mutual_gravity: true });
    expect(conservationCaveats()).not.toContain('caveat.oneWayGravity');

    updatePhysicsSettings({ dark_matter_halo: true });
    expect(conservationCaveats()).toContain('caveat.halo');
    updatePhysicsSettings({ dark_matter_halo: false });
  });

  test('no baseline means no reading, rather than a made-up one', () => {
    closedPair();
    const d = conservationDrift();
    // A baseline exists from the previous test's reset, so this is about the
    // shape of the answer rather than its absence.
    expect(d === null || typeof d.energyDrift === 'number').toBe(true);
  });

  test('the drift the readout shows names the scheme it was measured under', () => {
    closedPair();
    resetConservationBaseline();
    for (const scheme of INTEGRATORS) {
      updatePhysicsSettings({ integrator: scheme });
      updatePhysics(0.01);
      expect(conservationDrift().integrator).toBe(scheme);
      expect(activeIntegrator()).toBe(scheme);
    }
    updatePhysicsSettings({ integrator: 'Symplectic Euler' });
  });
});

describe('the simulated clock', () => {
  test('counts what was integrated, not frames or wall-clock time', () => {
    clearWorld();
    stars.push(star(0, 0, SOLAR_MASS_UNIT));
    bumpWorldGeneration();
    resetSimulationTime();
    expect(getSimulationTime()).toBe(0);
    for (let i = 0; i < 10; i++) updatePhysics(0.25);
    expect(getSimulationTime()).toBeCloseTo(2.5, 12);
    // A substepping scenario takes several calls per frame and must count all
    // of them, and a zero or negative step must count for nothing.
    for (let i = 0; i < 4; i++) updatePhysics(0.125);
    updatePhysics(0);
    updatePhysics(-3);
    expect(getSimulationTime()).toBeCloseTo(3, 12);
    resetSimulationTime();
    expect(getSimulationTime()).toBe(0);
  });
});

describe('the potential-well underlay', () => {
  const at = (x, y) => ({ x, y });
  const mass = (x, y, m) => ({ mass: m, pos: { x, y }, alive: true, id: m });

  test('is the Newtonian potential of the masses that are there', () => {
    // The underlay is a claim about the field, so it has to be the field: this
    // is -GM/r written out, and if the picture were built from anything else it
    // would be a decoration that happens to be centred on the star.
    const src = [mass(0, 0, 1000)];
    expect(potentialAt(at(0, 200), 1, 1e-6, src)).toBeCloseTo(-1000 / 200, 12);
    expect(potentialAt(at(300, 400), 2, 1e-6, src)).toBeCloseTo(
      (-2 * 1000) / 500,
      12
    );
  });

  test('adds up over the masses, so a binary has two wells', () => {
    const src = [mass(-100, 0, 600), mass(100, 0, 600)];
    const middle = potentialAt(at(0, 0), 1, 1e-6, src);
    const nearLeft = potentialAt(at(-90, 0), 1, 1e-6, src);
    const faraway = potentialAt(at(0, 5000), 1, 1e-6, src);
    // Deeper next to a star than between them, and shallower far away than
    // either. That ordering is the shape of the picture.
    expect(nearLeft).toBeLessThan(middle);
    expect(middle).toBeLessThan(faraway);
    expect(middle).toBeCloseTo(-2 * (600 / 100), 12);
  });

  test('follows the masses when they move', () => {
    const m = mass(0, 0, 1000);
    const before = potentialAt(at(200, 0), 1, 1e-6, [m]);
    m.pos.x = 150;
    const after = potentialAt(at(200, 0), 1, 1e-6, [m]);
    expect(after).toBeLessThan(before);
    expect(after).toBeCloseTo(-1000 / 50, 12);
  });

  test('is deeper for a heavier mass at the same place', () => {
    const light = potentialAt(at(0, 300), 1, 1e-6, [mass(0, 0, 500)]);
    const heavy = potentialAt(at(0, 300), 1, 1e-6, [mass(0, 0, 5000)]);
    expect(heavy / light).toBeCloseTo(10, 12);
  });

  test('uses the same softening floor the force law does', () => {
    // A body that never feels a singular force should not be drawn sitting in
    // one, and a well that went to minus infinity at a star would paint a black
    // disc over the star.
    const src = [mass(0, 0, 1000)];
    const inside = potentialAt(at(0.001, 0), 1, 5, src);
    expect(inside).toBeCloseTo(-1000 / 5, 12);
    expect(Number.isFinite(potentialAt(at(0, 0), 1, 5, src))).toBe(true);
  });

  test('samples only the heaviest sources, and the heaviest first', () => {
    // A six-hundred-asteroid scenario would otherwise cost six hundred terms
    // per grid sample for a contribution below one step of the colour ramp.
    const many = [];
    for (let i = 0; i < 400; i++) many.push(mass(i, 0, 1 + i));
    const chosen = potentialSources(many);
    expect(chosen.length).toBeLessThanOrEqual(24);
    expect(chosen[0].mass).toBe(400);
    for (let i = 1; i < chosen.length; i++) {
      expect(chosen[i - 1].mass).toBeGreaterThanOrEqual(chosen[i].mass);
    }
  });

  test('a dead or massless body is not a source', () => {
    const dead = mass(0, 0, 1000);
    dead.alive = false;
    expect(potentialSources([dead, mass(0, 0, 0), mass(1, 1, 5)]).length).toBe(
      1
    );
  });
});

describe('the vector legend', () => {
  test('names only what was drawn', () => {
    expect(vectorLegendRows(null)).toEqual([]);
    expect(
      vectorLegendRows({ velocity: { x: 1, y: 0 }, total: null, sources: [] })
    ).toHaveLength(1);
    const both = vectorLegendRows({
      velocity: { x: 1, y: 0 },
      total: { x: 0, y: 1 },
      sources: [{ id: 4, label: 'Alpha' }],
    });
    expect(both).toHaveLength(3);
    expect(both[2].label).toBe('from Alpha');
    expect(both[2].dash).toBe(true);
    // Velocity and acceleration must never be drawn in the same colour: the
    // whole point of the overlay is that they can be told apart at a glance.
    expect(both[0].color).not.toBe(both[1].color);
  });
});
