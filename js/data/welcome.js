// =============================================================================
// Front-door content
// -----------------------------------------------------------------------------
// Structured data for the welcome screen, kept apart from its behavior in
// js/welcome.js.
//
// Every string here is a message id rather than the words themselves, resolved
// by js/welcome.js through the catalogue. That keeps this file free of imports
// - a test can read it without booting the app - while the front door still
// speaks the reader's language.
//
// The rule this file exists to enforce: the front door never restates anything
// the app already knows. Scenario titles and summaries come from
// SCENARIO_INFO, lesson titles from the investigation registry, and the card
// image from the same capture the scenario gallery shows. What lives here is
// only what has no other home: which six scenarios to feature, and the short
// standing copy of the page itself.
// =============================================================================

/**
 * The scenarios the front door offers a newcomer, in the order they appear.
 *
 * Chosen for range rather than spectacle: a familiar system, a real exoplanet
 * system, a stellar pair, a detected merger, a kilonova and a piece of orbital
 * dynamics. Every key must exist in SCENARIO_INFO, which a test enforces.
 */
export const FEATURED_SCENARIO_KEYS = [
  'Solar System',
  'TRAPPIST-1 System',
  'Binary Star System',
  'GW150914',
  'Neutron Star Collision',
  'Slingshot',
];

/**
 * The three doors into Gravitas.
 *
 * `action` is resolved by welcome.js, not here: this file stays free of DOM and
 * of imports so it can be read by a test without booting the app.
 */
export const ENTRY_CARDS = [
  {
    id: 'sandbox',
    eyebrow: 'welcomeCard.sandbox.eyebrow',
    title: 'welcomeCard.sandbox.title',
    text: 'welcomeCard.sandbox.text',
    action: 'enter',
    cta: 'welcomeCard.sandbox.cta',
  },
  {
    id: 'investigations',
    eyebrow: 'welcomeCard.investigations.eyebrow',
    title: 'welcomeCard.investigations.title',
    text: 'welcomeCard.investigations.text',
    action: 'investigations',
    cta: 'welcomeCard.investigations.cta',
  },
  {
    id: 'instructors',
    eyebrow: 'welcomeCard.instructors.eyebrow',
    title: 'welcomeCard.instructors.title',
    text: 'welcomeCard.instructors.text',
    action: 'instructors',
    cta: 'welcomeCard.instructors.cta',
  },
];

/** What a student, an instructor and a curious visitor each get out of it. */
export const AUDIENCES = [
  {
    title: 'welcomeAudience.students.title',
    text: 'welcomeAudience.students.text',
  },
  {
    title: 'welcomeAudience.instructors.title',
    text: 'welcomeAudience.instructors.text',
  },
  {
    title: 'welcomeAudience.curious.title',
    text: 'welcomeAudience.curious.text',
  },
];

/**
 * Links out of the front door.
 *
 * Every href here points at a route that exists in this repository. Anything
 * added later must be checked the same way: a front door that promises a
 * resource the deployment does not have is worse than one that stays quiet.
 */
export const RESOURCE_LINKS = {
  model: {
    href: '/model/',
    label: 'welcomeLink.model.label',
    note: 'welcomeLink.model.note',
  },
  instructors: {
    href: '/instructors/',
    label: 'welcomeCard.instructors.cta',
    note: 'welcomeLink.instructors.note',
  },
};
