// The inspector's orbit and radius rows (js/inspectorOrbit.js), in English:
// the primary, the two-body elements, why there are none, and what a model
// radius does not give. Registered with the inspector card.
export const EN_INSPECTORORBIT = {
  'inspector.stat.primary': 'Primary',
  'inspector.stat.semiMajorAxis': 'Semi-major axis (two-body)',
  'inspector.stat.eccentricity': 'Eccentricity (two-body)',
  'inspector.stat.modelRadius': 'Model radius (contact size)',
  'inspector.forModelRadius': '(for the model radius)',
  'inspector.byMass': '(by mass)',
  'inspector.byModelRadius': '(by model radius)',
  'inspector.orbit.noPrimary': 'no primary',
  'inspector.orbit.unbound': 'unbound',
  'inspector.orbit.softened':
    'not a two-body orbit here: inside the softening length, where the pull grows with distance',
  'inspector.orbit.mond':
    'not a two-body orbit here: modified gravity (MOND) is on',
  'inspector.orbit.approximate': '(approximate: dark-matter halo)',
  'inspector.orbit.unnamed': 'unnamed body',
  'inspector.tip.radiusPhysical':
    'The body’s physical radius, measured or from its stated properties. Collisions in the simulation use the model radius instead, and the drawing is enlarged; read radii here, never off the drawing.',
  'inspector.tip.twoBody':
    'Two-body values about the primary named above, from the present position and velocity and the pair’s own gravity: G(M + m) where each pulls the other, G M where only the primary pulls. Other bodies perturb the real path.',
};
