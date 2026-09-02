// =============================================================================
// Scenario concept tags
// -----------------------------------------------------------------------------
// The controlled vocabulary the scenario gallery browses by, and the only place
// a concept's display name is written down. The gallery chips, the card pills,
// the search index and the filter descriptions all read from here.
//
// This is a curriculum index, not an astronomical ontology. It is deliberately
// short: an instructor planning a week should be able to read the whole list at
// a glance and find the one topic they are teaching. Twelve concepts was already
// near the limit of that, and the rule was to resist a thirteenth unless a
// genuine block of course material had nowhere to sit.
//
// Dark Matter is that thirteenth, added when the rotation-curve instrument and
// The Missing Mass arrived. It is a standard unit in an introductory course and
// none of the other twelve covers it: Galaxies & Clusters is about many-body
// dynamics at large scales, which is a different lecture. Thirteen is now the
// limit, and the same rule applies to a fourteenth.
//
// A tag means "this scenario is useful for discussing this concept". It does
// not claim the concept is simulated in full fidelity: Gravitas is Newtonian
// with a phenomenological inspiral model, and a scenario can still be the right
// thing to put on screen while teaching gravitational waves. The limitations
// are documented at /model/ rather than papered over here.
// =============================================================================

/**
 * The controlled vocabulary, assembled from the message catalogue.
 *
 * The labels and descriptions moved to js/i18n/en.js with the rest of the
 * user-facing strings; the ids and their order stay here, because they are the
 * vocabulary itself rather than words about it. A tag id appears in a scenario's
 * `tags` array and in nothing a reader ever sees.
 *
 * As with SCENARIO_INFO, the strings assembled here are English. The gallery
 * reads js/i18n/scenario.js's tagLabelLocalized() instead, which answers in the
 * reader's language.
 */
import { EN } from '../i18n/en.js';

export const SCENARIO_TAGS = Object.fromEntries(
  [
    'orbits-kepler',
    'solar-system',
    'exoplanets',
    'detection',
    'habitability',
    'binary-systems',
    'tides',
    'chaos',
    'stellar-evolution',
    'compact-objects',
    'relativity',
    'galaxies-clusters',
    'dark-matter',
  ].map(id => [
    id,
    {
      label: EN[`tag.${id}.label`] ?? id,
      description: EN[`tag.${id}.description`] ?? '',
    },
  ])
);

/** Tag ids in the order the concept chips should appear. */
export const TAG_ORDER = Object.keys(SCENARIO_TAGS);

/**
 * The display name for a tag id.
 * @param {string} id - A key of SCENARIO_TAGS
 * @returns {string} Its label, or the raw id if it is not in the vocabulary
 */
export const tagLabel = id => SCENARIO_TAGS[id]?.label ?? id;

export default SCENARIO_TAGS;
