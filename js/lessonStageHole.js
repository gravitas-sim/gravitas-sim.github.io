// =============================================================================
// The black-hole stage kinds: one hole with orbiters, and a star and a hole of
// the same mass
// -----------------------------------------------------------------------------
// Moved out of js/lessonStage.js so that only a lesson with a `hole` or an
// `equalMass` stage fetches them (stageGate.js loads them with the stage, before
// the step is applied). They build through `family`, the stage's own handle on
// its state: begin() empties the canvas and returns the list of staged bodies,
// end() settles the world and binds the roles, returning them.
// =============================================================================

import {
  Asteroid,
  BlackHole,
  getPhysicsSetting,
  SOLAR_MASS_UNIT,
  StarObject,
  asteroids,
  bh_list,
  stars,
} from './physics.js';

/**
 * Stand one black hole on the canvas, with bodies in orbit around it.
 *
 * The orbit radii are multiples of the hole's *drawn* radius, and that is a
 * statement about the picture and nothing else.
 *
 * This used to say they were Schwarzschild radii and that the floor below was
 * the innermost stable circular orbit. Neither was true, and the pair of claims
 * was the exact misconception the lesson that calls this spends a screen
 * dismantling: the dark disc is drawn at whatever size lets four orbits fit in
 * a window, a real horizon at these masses is many orders of magnitude smaller
 * than that disc, and a multiple of the drawn radius is therefore not a
 * multiple of anything physical. The floor is a floor on the drawing - it keeps
 * the innermost orbiter visibly outside the disc at any mass - and calling it
 * the ISCO gave a display constant a relativistic justification it does not
 * have.
 *
 * Nothing here models the ISCO, and nothing needs to. The engine is Newtonian
 * everywhere and has no horizon at all; where this lesson talks about the
 * innermost stable circular orbit it reads the number off a closed-form panel,
 * which is also where the Schwarzschild radius, the Hawking temperature and the
 * evaporation lifetime come from. See js/blackHolePhysics.js.
 *
 * Engine-owned, and the thing being demonstrated is Newtonian: outside a
 * spherical body the field depends on the mass and nothing else. The integrator
 * is entitled to move these and the lesson is entitled to measure what it does.
 *
 * @param {object} spec - {massSun, orbits, fit}
 * @returns {{built: boolean, roles: Array<string>}} What was staged
 */
export function applyHoleStage(spec = {}, family) {
  const massSun = Number(spec.massSun) > 0 ? Number(spec.massSun) : 10;
  const staged = family.begin();
  // The integrator's own constant, not the application's copy of it. The two
  // are synced while the app runs and are NOT synced anywhere else, so a stage
  // built from SETTINGS lays out an orbit for a gravity the engine is not
  // using - which is how a pair set up at apoapsis was found spiralling
  // outward instead of closing.
  const G = getPhysicsSetting('gravitational_constant');
  const mass = massSun * SOLAR_MASS_UNIT;
  const hole = new BlackHole({ x: 0, y: 0 }, mass, { x: 0, y: 0 }, false);
  hole.name = spec.name || 'Black Hole';
  hole.persistent = true;
  hole.model_owned = false;
  bh_list.push(hole);
  staged.push({
    role: 'hole',
    star: hole,
    model: null,
    spec: { name: hole.name, massSun },
    physicalRadiusSun: null,
  });
  // Radii in units of the drawn radius, so an orbit is visibly outside the dark
  // disc at any mass. Not the horizon: the drawn radius is a display size, and
  // the floor below is a floor on the picture rather than on the physics.
  const drawn = Math.max(hole.radius || 1, 1);
  (spec.orbits || [4.2, 6.4, 9.2, 12.6]).forEach((k, i) => {
    // Three drawn radii is the closest anything is placed. A drawing bound, so
    // the innermost orbiter reads as an orbit rather than as a rim on the
    // disc - it is not the ISCO, which is three *Schwarzschild* radii and is
    // not a length this canvas has.
    const r = Math.max(k * drawn, 3 * drawn);
    const body = new Asteroid(
      { x: r, y: 0 },
      { x: 0, y: Math.sqrt((G * mass) / r) }
    );
    body.name = `Orbiter ${i + 1}`;
    body.persistent = true;
    asteroids.push(body);
    staged.push({
      role: `orbiter-${i + 1}`,
      star: body,
      model: null,
      spec: { name: body.name },
      physicalRadiusSun: null,
    });
  });
  const bound = family.end(spec.fit);
  return { built: true, roles: bound };
}

/**
 * A star and a black hole of the same mass, each with a body in the same orbit.
 *
 * The controlled comparison. Two systems side by side, identical in every way
 * a student can vary except what sits at the center, and the thing being
 * demonstrated is that the orbits are indistinguishable - because outside a
 * spherical body the field depends on the mass and nothing else, and a black
 * hole is not a special kind of gravity.
 *
 * The orbit radius is chosen outside *both* central bodies, which for a star
 * of a few solar masses means outside the star: that is the condition under
 * which the claim is true, and putting an orbit inside the star would be
 * comparing two different problems.
 *
 * @param {object} spec - {massSun, orbitUnits, fit}
 * @returns {{built: boolean, roles: Array<string>}} What was staged
 */
export function applyEqualMassStage(spec = {}, family) {
  const massSun = Number(spec.massSun) > 0 ? Number(spec.massSun) : 8;
  const staged = family.begin();
  // The integrator's own constant, not the application's copy of it. The two
  // are synced while the app runs and are NOT synced anywhere else, so a stage
  // built from SETTINGS lays out an orbit for a gravity the engine is not
  // using - which is how a pair set up at apoapsis was found spiralling
  // outward instead of closing.
  const G = getPhysicsSetting('gravitational_constant');
  const mass = massSun * SOLAR_MASS_UNIT;
  // Far enough apart that neither system perturbs the other to the accuracy a
  // student could see over the few orbits the step lasts.
  const gap = Number(spec.gap) > 0 ? Number(spec.gap) : 900;
  const hole = new BlackHole(
    { x: -gap / 2, y: 0 },
    mass,
    { x: 0, y: 0 },
    false
  );
  hole.name = 'Black hole, 8 M☉';
  hole.persistent = true;
  hole.model_owned = false;
  bh_list.push(hole);

  const star = new StarObject({ x: gap / 2, y: 0 }, { x: 0, y: 0 }, massSun);
  star.name = 'Star, 8 M☉';
  star.mass = mass;
  star.massInSuns = massSun;
  star.persistent = true;
  star.model_owned = false;
  stars.push(star);

  // Outside both. The star is the larger of the two by a wide margin at any
  // stellar mass, so its drawn radius sets the floor.
  const r = Math.max(
    Number(spec.orbitUnits) > 0 ? Number(spec.orbitUnits) : 160,
    (star.radius || 9) * 3,
    (hole.radius || 9) * 3
  );
  const v = Math.sqrt((G * mass) / r);
  [
    { center: hole, role: 'hole', label: 'Orbiting the black hole' },
    { center: star, role: 'star', label: 'Orbiting the star' },
  ].forEach(({ center, role, label }) => {
    const body = new Asteroid(
      { x: center.pos.x + r, y: center.pos.y },
      { x: 0, y: v }
    );
    body.name = label;
    body.persistent = true;
    asteroids.push(body);
    staged.push({
      role: `${role}-orbiter`,
      star: body,
      model: null,
      spec: { name: body.name },
      physicalRadiusSun: null,
    });
  });
  staged.push(
    {
      role: 'hole',
      star: hole,
      model: null,
      spec: { name: hole.name, massSun },
      physicalRadiusSun: null,
    },
    {
      role: 'star',
      star,
      model: null,
      spec: { name: star.name, massSun },
      physicalRadiusSun: null,
    }
  );
  const bound = family.end(spec.fit);
  return { built: true, roles: bound, orbitRadius: r };
}
