// =============================================================================
// The course packs Gravitas ships
// -----------------------------------------------------------------------------
// By id, each loaded only when asked for: the course home opens one as
// /course/?course=<id>, and the course-pack builder offers them as examples.
// =============================================================================

export const BUILTIN_COURSES = Object.freeze({
  'intro-astronomy': () =>
    import('./intro-astronomy.js').then(m => m.INTRO_ASTRONOMY),
});
