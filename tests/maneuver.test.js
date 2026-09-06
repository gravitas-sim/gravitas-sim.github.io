import { describe, test, expect } from '@jest/globals';
import {
  BURN_FRAME,
  burnFrame,
  burnRecord,
  hohmann,
  previewBurn,
} from '../js/maneuver.js';
import { orbitalElements } from '../js/orbital.js';

const G = 1;

/** A body on a circular orbit of radius r about a primary of mass M at rest. */
function circular(r, M = 1000, { clockwise = false } = {}) {
  const v = Math.sqrt((G * M) / r);
  const primary = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: M, id: 1 };
  const body = {
    pos: { x: r, y: 0 },
    vel: { x: 0, y: clockwise ? -v : v },
    mass: 0,
    id: 2,
  };
  return { body, primary, v };
}

describe('the burn frame', () => {
  test('radial points away from the primary and transverse the way it is going', () => {
    const { body, primary } = circular(100);
    const f = burnFrame(body, primary);
    expect(f.radial.x).toBeCloseTo(1, 12);
    expect(f.radial.y).toBeCloseTo(0, 12);
    // Moving +y at (100, 0), so transverse is +y.
    expect(f.transverse.x).toBeCloseTo(0, 12);
    expect(f.transverse.y).toBeCloseTo(1, 12);
  });

  test('a clockwise orbit gets the opposite transverse direction', () => {
    // Getting this wrong would make every prograde burn a brake on half the
    // orbits in the catalogue.
    const { body, primary } = circular(100, 1000, { clockwise: true });
    const f = burnFrame(body, primary);
    expect(f.transverse.y).toBeCloseTo(-1, 12);
  });

  test('the two directions are perpendicular unit vectors', () => {
    const { body, primary } = circular(250);
    // Somewhere off the axis, where the answer is not obvious by inspection.
    body.pos = { x: 150, y: 200 };
    const f = burnFrame(body, primary);
    expect(Math.hypot(f.radial.x, f.radial.y)).toBeCloseTo(1, 12);
    expect(Math.hypot(f.transverse.x, f.transverse.y)).toBeCloseTo(1, 12);
    expect(
      f.radial.x * f.transverse.x + f.radial.y * f.transverse.y
    ).toBeCloseTo(0, 12);
  });
});

describe('previewing a burn', () => {
  test('a zero burn changes nothing', () => {
    const { body, primary } = circular(100);
    const p = previewBurn({ body, primary, G, radial: 0, transverse: 0 });
    expect(p.delta.magnitude).toBe(0);
    expect(p.delta.energy).toBeCloseTo(0, 12);
    expect(p.delta.periapsis).toBeCloseTo(0, 9);
    expect(p.delta.apoapsis).toBeCloseTo(0, 9);
    expect(p.unbound).toBe(false);
  });

  test('a prograde burn on a circular orbit raises the far side only', () => {
    // The classic result, and the thing a student is meant to discover: you
    // push here and the orbit changes over there.
    const { body, primary, v } = circular(100);
    const p = previewBurn({ body, primary, G, transverse: 0.05 * v });
    expect(p.delta.energy).toBeGreaterThan(0);
    expect(p.delta.angularMomentum).toBeGreaterThan(0);
    // The burn point stays on the orbit, so periapsis is unchanged...
    expect(p.after.periapsis).toBeCloseTo(100, 6);
    // ...and everything gained goes to the other side.
    expect(p.after.apoapsis).toBeGreaterThan(100);
    expect(p.delta.apoapsis).toBeGreaterThan(0);
  });

  test('a retrograde burn lowers the far side', () => {
    const { body, primary, v } = circular(100);
    const p = previewBurn({ body, primary, G, transverse: -0.05 * v });
    expect(p.delta.energy).toBeLessThan(0);
    expect(p.after.apoapsis).toBeCloseTo(100, 6);
    expect(p.after.periapsis).toBeLessThan(100);
  });

  test('a purely radial burn leaves angular momentum alone', () => {
    // Radial thrust has no moment about the primary, so h cannot change. A
    // planner that mixed the frame up would fail this.
    const { body, primary, v } = circular(100);
    const p = previewBurn({ body, primary, G, radial: 0.1 * v });
    expect(p.delta.angularMomentum).toBeCloseTo(0, 12);
    // It still costs energy, and it makes the orbit eccentric.
    expect(p.delta.energy).toBeGreaterThan(0);
    expect(p.after.e).toBeGreaterThan(p.before.e);
  });

  test('escape is reported as escape, not as an infinite apoapsis', () => {
    const { body, primary, v } = circular(100);
    // Just over the escape speed: v_esc = sqrt(2) * v_circ.
    const p = previewBurn({
      body,
      primary,
      G,
      transverse: v * (Math.SQRT2 - 1) + 0.01,
    });
    expect(p.becomesUnbound).toBe(true);
    expect(p.unbound).toBe(true);
    expect(p.after.bound).toBe(false);
    expect(p.after.energy).toBeGreaterThan(0);
    // Not reported as a change in apoapsis, which would be a difference from
    // infinity.
    expect(p.delta.apoapsis).toBeNull();
  });

  test('a burn just under escape stays bound', () => {
    const { body, primary, v } = circular(100);
    const p = previewBurn({
      body,
      primary,
      G,
      transverse: v * (Math.SQRT2 - 1) - 0.01,
    });
    expect(p.becomesUnbound).toBe(false);
    expect(p.after.bound).toBe(true);
    expect(Number.isFinite(p.after.apoapsis)).toBe(true);
  });

  test('capture from a hyperbolic orbit is reported too', () => {
    const { body, primary, v } = circular(100);
    body.vel.y = v * 1.6; // unbound
    const p = previewBurn({ body, primary, G, transverse: -v * 0.7 });
    expect(p.becomesBound).toBe(true);
    expect(p.after.bound).toBe(true);
  });

  test('the preview matches recomputing the elements by hand', () => {
    // The claim that the preview is the same physics as everything else, not a
    // separate model of it.
    const { body, primary, v } = circular(140);
    const p = previewBurn({
      body,
      primary,
      G,
      radial: 0.03 * v,
      transverse: -0.02 * v,
    });
    const byHand = orbitalElements(
      {
        pos: body.pos,
        vel: {
          x: body.vel.x + p.delta.vector.x,
          y: body.vel.y + p.delta.vector.y,
        },
        mass: body.mass,
      },
      primary,
      G
    );
    expect(p.after.a).toBeCloseTo(byHand.a, 12);
    expect(p.after.e).toBeCloseTo(byHand.e, 12);
    expect(p.after.energy).toBeCloseTo(byHand.energy, 12);
  });

  test('nonsense in is null out', () => {
    const { body, primary } = circular(100);
    expect(previewBurn({ body: null, primary, G })).toBeNull();
    expect(previewBurn({ body, primary, G, radial: NaN })).toBeNull();
    expect(previewBurn({ body, primary, G, transverse: Infinity })).toBeNull();
  });
});

describe('the Hohmann transfer, against the closed form', () => {
  const mu = 1000;
  const r1 = 100;
  const r2 = 400;

  test('both burns match vis-viva', () => {
    const h = hohmann({ r1, r2, mu });
    const a = (r1 + r2) / 2;
    // Worked independently here rather than reusing the module's arithmetic.
    const vCirc1 = Math.sqrt(mu / r1);
    const vCirc2 = Math.sqrt(mu / r2);
    const vPeri = Math.sqrt(mu * (2 / r1 - 1 / a));
    const vApo = Math.sqrt(mu * (2 / r2 - 1 / a));

    expect(h.dv1).toBeCloseTo(vPeri - vCirc1, 12);
    expect(h.dv2).toBeCloseTo(vCirc2 - vApo, 12);
    expect(h.total).toBeCloseTo(
      Math.abs(vPeri - vCirc1) + Math.abs(vCirc2 - vApo),
      12
    );
  });

  test('the transfer takes half the ellipse period', () => {
    const h = hohmann({ r1, r2, mu });
    const a = (r1 + r2) / 2;
    expect(h.transferTime).toBeCloseTo(Math.PI * Math.sqrt(a ** 3 / mu), 12);
    expect(h.transferTime).toBeCloseTo(h.period.transfer / 2, 12);
  });

  test('going inwards, both burns are brakes', () => {
    const h = hohmann({ r1: 400, r2: 100, mu });
    expect(h.dv1).toBeLessThan(0);
    expect(h.dv2).toBeLessThan(0);
    // And it costs the same as going out, which is the symmetry worth seeing.
    const out = hohmann({ r1: 100, r2: 400, mu });
    expect(h.total).toBeCloseTo(out.total, 12);
    expect(h.transferTime).toBeCloseTo(out.transferTime, 12);
  });

  test('applying the first burn to a circular orbit produces the transfer ellipse', () => {
    // The end-to-end check: the analytic manoeuvre, fed through the same
    // preview a student would use, gives the ellipse the analysis says it
    // should - apoapsis at the destination radius.
    const { body, primary } = circular(r1, mu / G);
    const h = hohmann({ r1, r2, mu: G * (mu / G) });
    const p = previewBurn({ body, primary, G, transverse: h.dv1 });
    expect(p.after.periapsis).toBeCloseTo(r1, 6);
    expect(p.after.apoapsis).toBeCloseTo(r2, 6);
    expect(p.after.a).toBeCloseTo((r1 + r2) / 2, 6);
    expect(p.after.period / 2).toBeCloseTo(h.transferTime, 6);
  });

  test('applying the second burn at apoapsis circularises', () => {
    // The half of a transfer that is easy to forget, and the half that decides
    // whether the spacecraft stays where it was sent.
    const M = 1000;
    const h = hohmann({ r1, r2, mu: G * M });
    const a = (r1 + r2) / 2;
    const vApo = Math.sqrt(G * M * (2 / r2 - 1 / a));
    const primary = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: M };
    // At apoapsis, on the far side, still going anticlockwise.
    const atApoapsis = {
      pos: { x: -r2, y: 0 },
      vel: { x: 0, y: -vApo },
      mass: 0,
    };
    const p = previewBurn({ body: atApoapsis, primary, G, transverse: h.dv2 });
    expect(p.after.e).toBeCloseTo(0, 6);
    expect(p.after.periapsis).toBeCloseTo(r2, 6);
    expect(p.after.apoapsis).toBeCloseTo(r2, 6);
  });

  test('equal or impossible radii give nothing', () => {
    expect(hohmann({ r1: 100, r2: 100, mu })).toBeNull();
    expect(hohmann({ r1: 0, r2: 100, mu })).toBeNull();
    expect(hohmann({ r1: 100, r2: 400, mu: 0 })).toBeNull();
  });
});

describe('the burn record', () => {
  test('says when, what, which frame, what units, and where it ended up', () => {
    const { body, primary, v } = circular(100);
    body.name = 'Probe';
    primary.name = 'Sol';
    const preview = previewBurn({ body, primary, G, transverse: 0.05 * v });
    const rec = burnRecord({
      body,
      primary,
      preview,
      simTime: 1234.5,
      units: {
        velocityUnitToMs: 9420,
        timeUnitSeconds: 1000,
        simUnitsPerAu: 100,
      },
      index: 2,
      scenario: 'Transfer Lab',
    });

    expect(rec.index).toBe(2);
    expect(rec.simTime).toBe(1234.5);
    expect(rec.body.name).toBe('Probe');
    expect(rec.primary.name).toBe('Sol');
    expect(rec.frame).toBe(BURN_FRAME);
    expect(rec.delta.transverse).toBeCloseTo(0.05 * v, 12);
    expect(rec.units.velocityToMs).toBe(9420);
    expect(rec.after.apoapsis).toBeGreaterThan(rec.before.apoapsis);
    // The caveat travels with the record, not only with the panel.
    expect(rec.assumption).toMatch(/osculating two-body/i);
    expect(rec.assumption).toMatch(/perturbed/i);
  });

  test('an unbound result records no apoapsis rather than infinity', () => {
    const { body, primary, v } = circular(100);
    const preview = previewBurn({ body, primary, G, transverse: v });
    const rec = burnRecord({ body, primary, preview, simTime: 0, units: {} });
    expect(rec.becameUnbound).toBe(true);
    expect(rec.after.bound).toBe(false);
    expect(rec.after.apoapsis).toBeNull();
    expect(rec.after.period).toBeNull();
  });
});
