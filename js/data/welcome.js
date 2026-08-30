// =============================================================================
// Front-door content
// -----------------------------------------------------------------------------
// Structured data for the welcome screen, kept apart from its behavior in
// js/welcome.js.
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
    eyebrow: 'Free exploration',
    title: 'Sandbox',
    text: 'Build a system from nothing, or load one of the built-in scenarios and change it. Drag to place an object; the drag sets its velocity.',
    action: 'enter',
    cta: 'Enter the sandbox',
  },
  {
    id: 'investigations',
    eyebrow: 'Guided lessons',
    title: 'Investigations',
    text: 'Structured astronomy activities inside the simulation: predict, experiment, measure, answer, and export a lab report.',
    action: 'investigations',
    cta: 'Browse investigations',
  },
  {
    id: 'instructors',
    eyebrow: 'For teaching',
    title: 'Instructors',
    text: 'Instructor guides, learning objectives, answer keys and a curriculum map for introductory astronomy courses.',
    action: 'instructors',
    cta: 'Instructor resources',
  },
];

/** What a student, an instructor and a curious visitor each get out of it. */
export const AUDIENCES = [
  {
    title: 'For students',
    text: 'See the relationships an equation describes. Move a planet outward and watch its year lengthen; stretch an orbit and watch the starlight swing.',
  },
  {
    title: 'For instructors',
    text: 'Six guided investigations for introductory and general-education astronomy, with instructor guides, answer keys and shareable simulation links.',
  },
  {
    title: 'For the curious',
    text: 'No account, no install, nothing to read first. Load a black-hole merger and watch it, or start from empty space and see what gravity does.',
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
    label: 'How Gravitas models the universe',
    note: 'What is calculated, what is approximated, and what is only drawn.',
  },
  instructors: {
    href: '/instructors/',
    label: 'Instructor resources',
    note: 'Guides, answer keys and a curriculum map.',
  },
};
