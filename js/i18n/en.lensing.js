// =============================================================================
// The lensing instruments' words, in English
// -----------------------------------------------------------------------------
// Registered by js/lensingWidgets.js when the family loads, so no other page
// carries them. lensW.* ids. The same keys are in es.lensing.js.
// =============================================================================

export const EN_LENSING = {
  'lensW.row.source': 'What this is',
  'lensW.row.how': 'What is left out',
  'lensW.b.title': 'Bending light',
  'lensW.b.note':
    'A ray of light passes a point mass. The line shows how far the ray is bent at each distance of closest approach; the gray line is the Sun, the colored line is the mass you chose, the dot is where the ray passes. The shaded part is closer than ten Schwarzschild radii, where the formula cannot be trusted.',
  'lensW.b.control.mass': 'Mass of the lens',
  'lensW.b.control.impact': 'Closest approach of the ray',
  'lensW.b.preset.sun': 'Light grazing the Sun',
  'lensW.b.preset.far': 'A hundred solar radii out',
  'lensW.b.preset.ten': 'A ten-solar-mass star',
  'lensW.b.preset.bh': 'A black hole of 100 million Suns',
  'lensW.b.axisB': 'closest approach, log₁₀ of solar radii',
  'lensW.b.axisA': 'log₁₀ of the bending, arcseconds',
  'lensW.b.legend': 'the Sun · your mass · this ray · too close to trust',
  'lensW.b.value.source':
    'A model: a point mass and a ray of light, in the weak field',
  'lensW.b.value.how':
    'Thin lens, weak field, one point mass: the bending is 4GM/(c²b), valid only far outside the Schwarzschild radius',
  'lensW.b.row.mass': 'Mass of the lens',
  'lensW.b.row.impact': 'Closest approach',
  'lensW.b.row.rs': 'Schwarzschild radius 2GM/c²',
  'lensW.b.row.ratio': 'Closest approach divided by the Schwarzschild radius',
  'lensW.b.row.alpha': 'Bending of the ray, 4GM/(c² b)',
  'lensW.b.row.newton':
    'Half of that: the bending a Newtonian particle would get',
  'lensW.b.row.valid': 'Is the weak-field formula trustworthy here?',
  'lensW.b.value.valid': 'Yes: the ray is more than 10 Schwarzschild radii out',
  'lensW.b.value.invalid':
    'No: the ray is within 10 Schwarzschild radii, so general relativity gives a different answer',
  'lensW.p.title': 'The lens plane',
  'lensW.p.note':
    'The sky around a lens, in units of its Einstein radius (the dashed ring). The orange disk is the source, the blue shapes are the images the lens makes of it. The source is twice as far as the lens. At zero offset the images join into a ring.',
  'lensW.p.control.kind': 'Kind of lens',
  'lensW.p.kind.point': 'A point mass',
  'lensW.p.kind.sis': 'A singular isothermal sphere (a galaxy)',
  'lensW.p.control.mass': 'Mass inside the Einstein radius',
  'lensW.p.control.dist': 'Distance to the lens',
  'lensW.p.control.y': 'Source offset from the lens (Einstein radii)',
  'lensW.p.control.size': 'Source radius (Einstein radii)',
  'lensW.p.preset.star': 'A Sun at 4 kpc',
  'lensW.p.preset.ring': 'A galaxy at 1 Gpc, source straight behind',
  'lensW.p.preset.offset': 'The same, source off to one side',
  'lensW.p.preset.sis': 'An isothermal galaxy, source off to one side',
  'lensW.p.legend': 'lens · Einstein ring · source · images',
  'lensW.p.value.source':
    'A model: one thin lens, one source, in the weak field; the source is twice as far as the lens',
  'lensW.p.value.how':
    'Euclidean distances (the source at twice the lens distance), no cosmology, no ellipticity or shear, a circular lens',
  'lensW.p.value.noDelay': 'Not computed for this lens',
  'lensW.p.row.mass': 'Mass inside the Einstein radius',
  'lensW.p.row.thetaMas': 'Einstein radius, in milliarcseconds',
  'lensW.p.row.thetaArcsec': 'Einstein radius, in arcseconds',
  'lensW.p.row.radius': 'Einstein radius at the lens',
  'lensW.p.row.sigma': 'Speed spread of a galaxy that makes this ring',
  'lensW.p.row.count': 'Images',
  'lensW.p.row.outer': 'Outer image, in Einstein radii',
  'lensW.p.row.inner': 'Inner image, in Einstein radii',
  'lensW.p.row.muOuter': 'Magnification of the outer image',
  'lensW.p.row.muInner': 'Magnification of the inner image (negative: flipped)',
  'lensW.p.row.total': 'Total magnification',
  'lensW.p.row.delay': 'Light-travel delay between the two images',
  'lensW.m.title': 'A lens passing by',
  'lensW.m.note':
    'The brightness of a star as a lens passes in front of it. The lens crosses the Einstein radius in the time tE, which depends on mass, distance and speed together. The curve is flux over its baseline. With real-looking data on, gray dots are a synthetic event with noise.',
  'lensW.m.control.mass': 'Mass of the lens',
  'lensW.m.control.dist': 'Distance to the lens (the source is at 8 kpc)',
  'lensW.m.control.speed': 'Sideways speed of the lens',
  'lensW.m.control.u0': 'Closest approach (Einstein radii)',
  'lensW.m.control.fs': 'Share of the light that is the source’s',
  'lensW.m.control.rho': 'Source radius (Einstein radii)',
  'lensW.m.control.data': 'Synthetic event with noise',
  'lensW.m.data.on': 'On',
  'lensW.m.data.off': 'Off',
  'lensW.m.preset.typical': 'A typical bulge event',
  'lensW.m.preset.finite': 'A very close pass, finite source',
  'lensW.m.preset.blend': 'The same event, half the light blended',
  'lensW.m.preset.data': 'Fit the synthetic event',
  'lensW.m.axisT': 'time since closest approach, days',
  'lensW.m.axisF': 'flux over baseline',
  'lensW.m.legend': 'the model light curve',
  'lensW.m.legendData': 'the model light curve · synthetic data',
  'lensW.m.value.source':
    'A model: a point lens passing a star; the data, when shown, are synthetic with known truth',
  'lensW.m.value.how':
    'One point lens, uniform source disk, straight constant-speed motion; no parallax, limb darkening, binary lens or second source',
  'lensW.m.value.pm': '{v} ± {e} {u}',
  'lensW.m.row.thetaE': 'Einstein radius, angle',
  'lensW.m.row.radius': 'Einstein radius at the lens',
  'lensW.m.row.tE': 'Crossing time tE',
  'lensW.m.row.peak': 'Peak flux over baseline',
  'lensW.m.row.above': 'Time brighter than 1.34 times baseline',
  'lensW.m.row.near': 'Mass for this tE at 2 kpc and 100 km/s',
  'lensW.m.row.far': 'Mass for this tE at 6 kpc and 300 km/s',
  'lensW.m.row.chi': 'Your model against the data, chi-square per point',
  'lensW.m.row.fitHeld.tE': 'Best fit with no blending: tE',
  'lensW.m.row.fitHeld.u0': 'Best fit with no blending: closest approach',
  'lensW.m.row.fitHeld.chi': 'Best fit with no blending: chi-square per point',
  'lensW.m.row.fitFree.tE': 'Best fit with blending free: tE',
  'lensW.m.row.fitFree.u0': 'Best fit with blending free: closest approach',
  'lensW.m.row.fitFree.chi':
    'Best fit with blending free: chi-square per point',
  'lensW.m.row.fitFree.fs':
    'Best fit with blending free: source share of the light',
};
