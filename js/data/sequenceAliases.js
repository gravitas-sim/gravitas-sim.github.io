// =============================================================================
// Sequence ids that were renamed or merged
// -----------------------------------------------------------------------------
// A student's browser can still hold an old id (the "what next" record the
// Library leaves), so a rename not listed here quietly takes the next-step
// offer away. Add a row whenever a sequence id in sequences.js changes. It is
// a file of its own, read by tools/build-library.mjs and written into
// library/library.json (sequenceAliases), so no lesson route pays for it.
// tests/sequenceAliases.test.js holds every target to a real sequence.
// =============================================================================

export const SEQUENCE_ALIASES = {
  'orbital-mechanics': 'gravity-and-orbits',
  'gravity-beyond-two-bodies': 'gravity-and-orbits',
  'gravitational-waves': 'gravity-and-orbits',
  'exoplanet-detection': 'planets-and-exoplanets',
};
