// =============================================================================
// The suites of guided investigations the Observatory offers
// -----------------------------------------------------------------------------
// Each is a module the runner (js/observatory/guidePanel.js) loads only when a
// reader chooses it, or arrives with ?guide=<id> for one of its guides; a
// guide's id begins with its suite's prefix, so the link alone says which
// suite to load. A suite module exports SUITE:
//
//   GUIDES    the investigations, each a list of steps (js/observatory/guides/
//             core.js says what a step is)
//   TARGETS   the observations its steps open: a fixture of the page, or a
//             catalog pack installed on first use
//   ANSWERS   how each `answer` step's number is worked out, and NEEDS, the
//             targets each reads
//   CORRECT   how a data-dependent `choose` step's option is worked out
//   SHOWS     the panels of numbers a step draws: what each reads, and its rows
//   messages  its words in each language, loaded with it
//
// Its title and one-line summary are the runner's (js/i18n/en.guides.js
// gd.suite.*), so the chooser can list every suite without loading any.
// =============================================================================

export const SUITES = Object.freeze([
  {
    id: 'exoplanet',
    prefix: 'exo-',
    load: () => import('./exoplanet.js').then(m => m.SUITE),
  },
  {
    id: 'populations',
    prefix: 'pop-',
    load: () => import('./populations.js').then(m => m.SUITE),
  },
]);

/** The suite a guide id belongs to, by its prefix, or null. */
export const suiteOf = guideId =>
  SUITES.find(s => String(guideId ?? '').startsWith(s.prefix)) ?? null;
