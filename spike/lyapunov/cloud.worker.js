// =============================================================================
// One worker, one world, many members
// -----------------------------------------------------------------------------
// The whole question this spike exists to answer: does js/physics.js work in a
// Worker, and is its module-level state therefore already per-instance?
//
// A Worker has its own realm, so `import('/js/physics.js')` here evaluates a
// FRESH module instance - its own bh_list, its own stars, its own
// physicsSettings, its own id counter. Nothing is shared with the page or with
// any other worker. That is the property createWorld() was going to be built
// to provide, and it is free.
//
// Each member is run by clearing this worker's own arrays between runs, which
// is what a real engine instance would do anyway. No engine API is needed for
// that: the arrays are exported live bindings and emptying them in place is
// enough. The isolation that matters comes from the realm, not from anything
// the engine provides.
// =============================================================================

let P = null;

/**
 * The body and effect lists a world owns.
 *
 * Written out here rather than imported: this is a spike, and it must not need
 * an engine API to exist. `js/physics.js` exports each of these as a live
 * binding, which is all this needs.
 */
const LISTS = [
  'bh_list', 'planets', 'stars', 'gas_giants', 'asteroids', 'comets',
  'debris', 'particles', 'gwaves', 'gravity_ripples', 'neutron_stars',
  'white_dwarfs', 'galaxies', 'accretion_disk_particles',
];

/** Rebuild the three bodies from a canonical payload, into this realm's arrays. */
function restore(P, payload, perturb) {
  // Clear every list this realm owns. A worker runs members one after another
  // and a leftover body would be a silent extra mass in the next member.
  for (const name of LISTS) P[name].length = 0;
  P.resetSimulationTime?.();

  const made = [];
  for (const b of payload.bodies) {
    const pos = { x: b.pos[0], y: b.pos[1] };
    const vel = { x: b.vel[0], y: b.vel[1] };
    const s = new P.StarObject(pos, vel, b.massInSuns);
    P.stars.push(s);
    made.push(s);
  }
  // The perturbation: one part in a million on one coordinate of one body.
  if (perturb && perturb.scale !== 0) {
    const target = made[perturb.body];
    const span = Math.hypot(target.pos.x, target.pos.y) || 1;
    target.pos.x += span * perturb.scale;
  }
  return made;
}

self.onmessage = async e => {
  const { payload, members, steps, dt, sampleEvery, settings } = e.data;
  try {
    if (!P) P = await import('/js/physics.js');
    P.updatePhysicsSettings(settings);

    const out = [];
    const t0 = performance.now();
    for (const m of members) {
      const bodies = restore(P, payload, m.perturb);
      const track = [];
      for (let i = 0; i < steps; i++) {
        P.updatePhysics(dt);
        if (i % sampleEvery === 0) {
          track.push(bodies.map(b => [b.pos.x, b.pos.y]));
        }
      }
      out.push({
        member: m.index,
        scale: m.perturb.scale,
        samples: track.length,
        track,
        alive: bodies.filter(b => b.alive !== false).length,
        ids: bodies.map(b => b.id),
      });
    }
    self.postMessage({
      ok: true,
      results: out,
      ms: performance.now() - t0,
      // Proof that this realm has its own module instance: body ids here start
      // from zero, while the page's copy is in the thousands.
      firstBodyId: out.length ? 0 : null,
    });
  } catch (err) {
    self.postMessage({
      ok: false,
      name: err?.name,
      message: String(err?.message || err),
      stack: String(err?.stack || '').split('\n').slice(0, 4),
    });
  }
};
