// =============================================================================
// The course packs Gravitas ships
// -----------------------------------------------------------------------------
// By id, each loaded only when asked for: the course home opens one as
// /course/?course=<id>, and the course-pack builder offers them as examples.
// =============================================================================

export const BUILTIN_COURSES = Object.freeze({
  'intro-astronomy': () =>
    import('./intro-astronomy.js').then(m => m.INTRO_ASTRONOMY),
  'astronomy-semester': () =>
    import('./astronomy-semester.js').then(m => m.ASTRONOMY_SEMESTER),
  'solar-system-and-the-sun': () =>
    import('./solar-system-and-the-sun.js').then(
      m => m.SOLAR_SYSTEM_AND_THE_SUN
    ),
  'observing-lab': () =>
    import('./observing-lab.js').then(m => m.OBSERVING_LAB),
  'upper-level-modules': () =>
    import('./upper-level-modules.js').then(m => m.UPPER_LEVEL_MODULES),
});
