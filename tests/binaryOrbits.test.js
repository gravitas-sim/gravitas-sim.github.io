import {
  binaryFacts,
  binaryLayout,
  planetLayout,
  systemLayout,
  CIRCUMSTELLAR,
  CIRCUMBINARY,
} from '../js/binaryOrbits.js';

// Units: G = 1, mass in solar masses, length in AU. In these units a circular
// orbit of 1 AU about 1 solar mass has period 2*pi, which makes every number
// below checkable by hand.
const G = 1;

const BINARY = {
  m1: 1.0,
  m2: 0.5,
  separation: 10,
  eccentricity: 0.2,
  phaseDeg: 0,
  G,
};

const hypot = (a, b) => Math.sqrt(a * a + b * b);

describe('binaryFacts', () => {
  test('mu is the companion share, not the primary share', () => {
    // The whole published boundary hangs on this being m2/(m1+m2). 0.5/1.5.
    expect(binaryFacts(BINARY).mu).toBeCloseTo(1 / 3, 12);
  });

  test("period is Kepler's third law for the pair", () => {
    expect(binaryFacts(BINARY).period).toBeCloseTo(
      2 * Math.PI * Math.sqrt(1000 / 1.5),
      9
    );
  });

  test('periapsis and apoapsis bracket the separation', () => {
    const f = binaryFacts(BINARY);
    expect(f.periapsis).toBeCloseTo(8, 12);
    expect(f.apoapsis).toBeCloseTo(12, 12);
  });
});

describe('binaryLayout', () => {
  test('the barycenter is at the origin and at rest', () => {
    for (const phaseDeg of [0, 37, 90, 180, 271, 359]) {
      const { star1, star2 } = binaryLayout({ ...BINARY, phaseDeg });
      const M = BINARY.m1 + BINARY.m2;
      expect(
        (star1.pos.x * BINARY.m1 + star2.pos.x * BINARY.m2) / M
      ).toBeCloseTo(0, 12);
      expect(
        (star1.pos.y * BINARY.m1 + star2.pos.y * BINARY.m2) / M
      ).toBeCloseTo(0, 12);
      expect(
        (star1.vel.x * BINARY.m1 + star2.vel.x * BINARY.m2) / M
      ).toBeCloseTo(0, 12);
      expect(
        (star1.vel.y * BINARY.m1 + star2.vel.y * BINARY.m2) / M
      ).toBeCloseTo(0, 12);
    }
  });

  test('phase 0 starts at periapsis and phase 180 at apoapsis', () => {
    const peri = binaryLayout({ ...BINARY, phaseDeg: 0 });
    const apo = binaryLayout({ ...BINARY, phaseDeg: 180 });
    const sep = l =>
      hypot(l.star1.pos.x - l.star2.pos.x, l.star1.pos.y - l.star2.pos.y);
    expect(sep(peri)).toBeCloseTo(8, 10);
    expect(sep(apo)).toBeCloseTo(12, 10);
  });

  test('the relative orbit has the eccentricity it was asked for', () => {
    // Recovered from the vis-viva and angular momentum of the state vectors,
    // which is an independent route to e: if the velocity formula were wrong
    // the position would still look right and this would not.
    for (const phaseDeg of [0, 47, 133, 219, 300]) {
      const { star1, star2 } = binaryLayout({ ...BINARY, phaseDeg });
      const rx = star2.pos.x - star1.pos.x;
      const ry = star2.pos.y - star1.pos.y;
      const vx = star2.vel.x - star1.vel.x;
      const vy = star2.vel.y - star1.vel.y;
      const r = hypot(rx, ry);
      const v2 = vx * vx + vy * vy;
      const gm = G * 1.5;
      const a = 1 / (2 / r - v2 / gm);
      const h = rx * vy - ry * vx;
      const e = Math.sqrt(Math.max(0, 1 - (h * h) / (gm * a)));
      expect(a).toBeCloseTo(10, 9);
      expect(e).toBeCloseTo(0.2, 9);
      // Counter-clockwise: prograde, as the stability fit assumes.
      expect(h).toBeGreaterThan(0);
    }
  });

  test('a circular binary has a constant separation and speed', () => {
    const seps = [];
    const speeds = [];
    for (let d = 0; d < 360; d += 30) {
      const { star1, star2 } = binaryLayout({
        ...BINARY,
        eccentricity: 0,
        phaseDeg: d,
      });
      seps.push(hypot(star1.pos.x - star2.pos.x, star1.pos.y - star2.pos.y));
      speeds.push(hypot(star1.vel.x - star2.vel.x, star1.vel.y - star2.vel.y));
    }
    for (const s of seps) expect(s).toBeCloseTo(10, 10);
    for (const s of speeds) expect(s).toBeCloseTo(Math.sqrt(1.5 / 10), 10);
  });
});

describe('planetLayout', () => {
  test('a circumstellar planet starts circular about its own star', () => {
    const layout = binaryLayout(BINARY);
    const p = planetLayout({
      ...BINARY,
      mode: CIRCUMSTELLAR,
      layout,
      planetMass: 0,
      semiMajor: 1.5,
      planetPhaseDeg: 40,
    });
    const rx = p.pos.x - layout.star1.pos.x;
    const ry = p.pos.y - layout.star1.pos.y;
    const vx = p.vel.x - layout.star1.vel.x;
    const vy = p.vel.y - layout.star1.vel.y;
    expect(hypot(rx, ry)).toBeCloseTo(1.5, 10);
    // Circular about m1 alone: v = sqrt(G m1 / a), and perpendicular to r.
    expect(hypot(vx, vy)).toBeCloseTo(Math.sqrt(1.0 / 1.5), 10);
    expect(rx * vx + ry * vy).toBeCloseTo(0, 10);
  });

  test('a circumbinary planet starts circular about the barycenter', () => {
    const layout = binaryLayout(BINARY);
    const p = planetLayout({
      ...BINARY,
      mode: CIRCUMBINARY,
      layout,
      planetMass: 0,
      semiMajor: 40,
      planetPhaseDeg: 125,
    });
    expect(hypot(p.pos.x, p.pos.y)).toBeCloseTo(40, 10);
    expect(hypot(p.vel.x, p.vel.y)).toBeCloseTo(Math.sqrt(1.5 / 40), 10);
    expect(p.pos.x * p.vel.x + p.pos.y * p.vel.y).toBeCloseTo(0, 10);
  });

  test('the planet goes the same way round as the binary', () => {
    const layout = binaryLayout(BINARY);
    const hBinary =
      (layout.star2.pos.x - layout.star1.pos.x) *
        (layout.star2.vel.y - layout.star1.vel.y) -
      (layout.star2.pos.y - layout.star1.pos.y) *
        (layout.star2.vel.x - layout.star1.vel.x);
    for (const mode of [CIRCUMSTELLAR, CIRCUMBINARY]) {
      const p = planetLayout({
        ...BINARY,
        mode,
        layout,
        planetMass: 0,
        semiMajor: mode === CIRCUMBINARY ? 40 : 1.5,
        planetPhaseDeg: 210,
      });
      const host = p.host;
      const h =
        (p.pos.x - host.pos.x) * (p.vel.y - host.vel.y) -
        (p.pos.y - host.pos.y) * (p.vel.x - host.vel.x);
      expect(Math.sign(h)).toBe(Math.sign(hBinary));
    }
  });

  test('the planet mass is carried into its circular speed', () => {
    const layout = binaryLayout(BINARY);
    const heavy = planetLayout({
      ...BINARY,
      mode: CIRCUMSTELLAR,
      layout,
      planetMass: 0.01,
      semiMajor: 1.5,
      planetPhaseDeg: 0,
    });
    const light = planetLayout({
      ...BINARY,
      mode: CIRCUMSTELLAR,
      layout,
      planetMass: 0,
      semiMajor: 1.5,
      planetPhaseDeg: 0,
    });
    const speed = p =>
      hypot(p.vel.x - layout.star1.vel.x, p.vel.y - layout.star1.vel.y);
    expect(speed(heavy)).toBeGreaterThan(speed(light));
    expect(speed(heavy)).toBeCloseTo(Math.sqrt(1.01 / 1.5), 10);
  });
});

describe('systemLayout', () => {
  test('the same description always produces the same numbers', () => {
    const cfg = {
      ...BINARY,
      mode: CIRCUMSTELLAR,
      planetMass: 3e-6,
      semiMajor: 1.5,
      planetPhaseDeg: 0,
    };
    // Reproducibility to the bit, not to a tolerance: the experiment bench
    // restores a run by rebuilding it, and "almost the same start" is not a
    // controlled experiment.
    expect(JSON.stringify(systemLayout(cfg))).toBe(
      JSON.stringify(systemLayout(cfg))
    );
  });

  test('the planet phase is measured from +x, not from the binary', () => {
    const base = {
      ...BINARY,
      mode: CIRCUMBINARY,
      planetMass: 0,
      semiMajor: 40,
    };
    const at0 = systemLayout({ ...base, planetPhaseDeg: 0 });
    expect(at0.planet.pos.x).toBeCloseTo(40, 10);
    expect(at0.planet.pos.y).toBeCloseTo(0, 10);
  });

  test('the two phases move independently', () => {
    const base = {
      ...BINARY,
      mode: CIRCUMBINARY,
      planetMass: 0,
      semiMajor: 40,
      planetPhaseDeg: 0,
    };
    // Turning the binary must not move the planet, and vice versa. When the
    // planet inherited the binary's phase - which it did, briefly - both of
    // these moved together and one of the investigation's controlled variables
    // silently did not exist.
    const turnedBinary = systemLayout({ ...base, phaseDeg: 90 });
    expect(turnedBinary.planet.pos.x).toBeCloseTo(40, 10);
    expect(turnedBinary.planet.pos.y).toBeCloseTo(0, 10);
    expect(turnedBinary.star1.pos.y).not.toBeCloseTo(
      systemLayout(base).star1.pos.y,
      6
    );

    const turnedPlanet = systemLayout({ ...base, planetPhaseDeg: 90 });
    expect(turnedPlanet.planet.pos.y).toBeCloseTo(40, 10);
    expect(turnedPlanet.star1.pos.x).toBeCloseTo(
      systemLayout(base).star1.pos.x,
      10
    );
  });
});
