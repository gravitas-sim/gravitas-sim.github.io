// The black-hole stage kinds (`hole`, `equalMass`), fetched with the stage by a
// lesson that declares one. They build through `family` (js/lessonStage.js):
// begin() empties the canvas and returns the staged list, end(fit) settles the
// world and returns the bound roles.

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
 * Orbit radii are multiples of the hole's *drawn* radius: a statement about
 * the picture, not a Schwarzschild radius, and the floor is a floor on the
 * drawing, not the ISCO. The engine is Newtonian and has no horizon; the
 * relativistic numbers come from js/blackHolePhysics.js. Engine-owned: the
 * integrator moves these and the lesson measures what it does.
 *
 * @param {object} spec - {massSun, orbits, fit}
 * @returns {{built: boolean, roles: Array<string>}} What was staged
 */
export function applyHoleStage(spec = {}, family) {
  const massSun = Number(spec.massSun) > 0 ? Number(spec.massSun) : 10;
  const staged = family.begin();
  // The integrator's own constant: the app's copy is not synced here.
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
  // Radii in drawn radii, so an orbit is outside the dark disc at any mass; a
  // display size, not the horizon.
  const drawn = Math.max(hole.radius || 1, 1);
  (spec.orbits || [4.2, 6.4, 9.2, 12.6]).forEach((k, i) => {
    // Three drawn radii: a drawing bound, not the ISCO.
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
 * A star and a black hole of the same mass, each with a body in the same orbit:
 * the controlled comparison, whose orbits are indistinguishable because outside
 * a spherical body the field depends on the mass alone. The orbit is outside
 * both central bodies, which is the condition under which that is true.
 *
 * @param {object} spec - {massSun, orbitUnits, fit}
 * @returns {{built: boolean, roles: Array<string>}} What was staged
 */
export function applyEqualMassStage(spec = {}, family) {
  const massSun = Number(spec.massSun) > 0 ? Number(spec.massSun) : 8;
  const staged = family.begin();
  // The integrator's own constant: the app's copy is not synced here.
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
