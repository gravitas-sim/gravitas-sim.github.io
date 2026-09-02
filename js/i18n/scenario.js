// =============================================================================
// Scenario prose, in the reader's language
// -----------------------------------------------------------------------------
// js/data/scenarioInfo.js and js/data/scenarioTags.js export English. That is
// the right form for the thumbnail generator, the instructor material builder
// and the catalog tests, none of which have a reader.
//
// The interface has one, so it comes here instead. These four accessors go
// through t(), which means a Spanish reader gets Spanish and a locale that has
// not translated a particular scenario falls back to that scenario's English
// rather than to a blank card.
// =============================================================================

import { t } from './index.js';

/**
 * A scenario's title, translated.
 * @param {string} key - Scenario key from SCENARIO_INFO
 * @returns {string} The title
 */
export const scenarioTitle = key => t(`scenario.${key}.title`);

/**
 * A scenario's summary, translated.
 * @param {string} key - Scenario key
 * @returns {string} The summary
 */
export const scenarioSummary = key => t(`scenario.${key}.summary`);

/**
 * A concept tag's display name, translated.
 * @param {string} id - Tag id from SCENARIO_TAGS
 * @returns {string} The label
 */
export const tagLabelLocalized = id => t(`tag.${id}.label`);

/**
 * A concept tag's one-line description, translated.
 * @param {string} id - Tag id
 * @returns {string} The description
 */
export const tagDescription = id => t(`tag.${id}.description`);
