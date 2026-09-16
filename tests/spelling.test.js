// =============================================================================
// American spellings, and the words a substring rule turns into non-words
// -----------------------------------------------------------------------------
// The project settled on American spellings, and the pass that applied them ran
// rules like `realis -> realiz` and `centre -> center` as plain substring
// replacements. That is right for a suffix and wrong in the middle of a word,
// so `realistic` became `realiztic`, `characteristic` became `characteriztic`,
// `optimistic` became `optimiztic`, `centred` became `centerd` and `optimism`
// became `optimizm` - 283 of them, in the welcome screen, the scenario
// descriptions, the lesson prose, the model page and the generated manual.
//
// None of that was caught, because nothing was looking. A spell checker over
// the repository is not the answer: it drowns in identifiers, Spanish, units
// and proper names, and a check nobody can keep green is a check that gets
// turned off. What is checkable is a fixed list of words that must never
// appear in English text a reader sees - the corruptions above, which are not
// words in any dialect, and the British forms the project deliberately does
// not use.
//
// Scope is text a reader sees: the English catalogs' values, the lesson and
// instructor prose, and the text content of the standalone pages. Not keys,
// not identifiers, not attribute names - `aria-labelledby` is spelled the way
// the HTML specification spells it and always will be.
// =============================================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Words that must not appear in English a reader sees.
 *
 * An enumerated list, deliberately, and short. An earlier version of this file
 * also ran a general rule over anything ending -ise, -isation or -yse, with an
 * allowlist of the words where that ending is not a suffix. It found real
 * things - but a rule shaped like that fails on content nobody has written
 * yet: a quoted paper title, a cited author, a term of art a field spells its
 * own way. `polarisation`, `linearised` and `destabilise` are ordinary
 * scientific English, not defects, and a checker that calls them errors is one
 * a writer learns to ignore. So the general rule is gone and what remains is
 * two lists somebody chose.
 *
 * TIER 1 - corruptions. Not words in any dialect. These came from a substring
 * transform that treated `-ise -> -ize` as if it could be applied mid-word, so
 * `realistic` became `realiztic` and `centred` became `centerd`. There is no
 * argument to be had about these.
 *
 * TIER 2 - house style. British forms this project standardized long before
 * this file existed; they are listed so a regression is caught, not because
 * the British spelling is wrong. Adding to this list is a deliberate act and
 * removing from it is a legitimate one.
 *
 * Matched whole-word and case-insensitively, against text a reader sees -
 * never keys, identifiers or attribute names.
 */
const FORBIDDEN = {
  // --- Tier 1: corruptions, not words in any dialect ------------------------
  // `realis`, `characteris`, `optimis` and `centre` are suffix rules that also
  // match mid-word.
  realiztic: 'realistic',
  characteriztic: 'characteristic',
  characteriztics: 'characteristics',
  optimiztic: 'optimistic',
  optimizm: 'optimism',
  realizm: 'realism',
  centerd: 'centered',
  specializt: 'specialist',
  specializts: 'specialists',
  catalogd: 'cataloged',
  programr: 'programmer',
  tagLabelocalized: 'tagLabelLocalized',
  // Two Ls in American English as well; `cancell -> cancel` took one away.
  cancelation: 'cancellation',
  cancelations: 'cancellations',
  // --- Tier 2: house style, settled long ago --------------------------------
  colour: 'color',
  colours: 'colors',
  coloured: 'colored',
  behaviour: 'behavior',
  behaviours: 'behaviors',
  centre: 'center',
  centres: 'centers',
  centred: 'centered',
  catalogue: 'catalog',
  catalogues: 'catalogs',
  licence: 'license',
  metre: 'meter',
  metres: 'meters',
  kilometre: 'kilometer',
  kilometres: 'kilometers',
  barycentre: 'barycenter',
  grey: 'gray',
  honour: 'honor',
  neighbour: 'neighbor',
  neighbours: 'neighbors',
  favourite: 'favorite',
  artefact: 'artifact',
  artefacts: 'artifacts',
  manoeuvre: 'maneuver',
  manoeuvres: 'maneuvers',
  analyse: 'analyze',
  analysed: 'analyzed',
  organise: 'organize',
  organised: 'organized',
  realise: 'realize',
  realised: 'realized',
  recognise: 'recognize',
  recognised: 'recognized',
  normalise: 'normalize',
  normalised: 'normalized',
  summarise: 'summarize',
  summarised: 'summarized',
  modelled: 'modeled',
  modelling: 'modeling',
  labelled: 'labeled',
  labelling: 'labeling',
  cancelled: 'canceled',
  travelling: 'traveling',
  judgement: 'judgment',
  acknowledgement: 'acknowledgment',
  programme: 'program',
};

const PATTERN = new RegExp(`\\b(${Object.keys(FORBIDDEN).join('|')})\\b`, 'gi');

/**
 * Every misspelling in one piece of text, with a little context.
 *
 * @param {string} where - What to call this text in a failure message
 * @param {string} text - The text to read
 * @returns {string[]} One line per hit
 */
function offences(where, text) {
  if (typeof text !== 'string') return [];
  const out = [];
  const say = (m, right) => {
    const from = Math.max(0, m.index - 30);
    const context = text
      .slice(from, m.index + m[0].length + 30)
      .replace(/\s+/g, ' ');
    out.push(`${where}: "${m[0]}" should be "${right}"  …${context}…`);
  };
  for (const m of text.matchAll(PATTERN)) say(m, FORBIDDEN[m[1].toLowerCase()]);
  return out;
}

/** Walk anything, collecting the strings in it. */
function strings(value, at, into) {
  if (typeof value === 'string') into.push([at, value]);
  else if (Array.isArray(value))
    value.forEach((v, i) => strings(v, `${at}[${i}]`, into));
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) strings(v, `${at}.${k}`, into);
}

/** An HTML page's visible text: no tags, no comments, no script or style. */
function visibleText(rel) {
  return readFileSync(path.join(REPO, rel), 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

describe('American spellings in English a reader sees', () => {
  test('the pattern matches something, so the sweeps below are not vacuous', () => {
    expect(offences('probe', 'a realiztic centerd catalogue')).toHaveLength(3);
    // And it does not fire on the words these were made from.
    expect(offences('probe', 'a realistic centered catalog')).toEqual([]);
    // Nor inside a longer word, nor on the attribute the HTML spec defines.
    expect(offences('probe', 'aria-labelledby concentre')).toEqual([]);
    // And it stays out of the way of spellings that are a house-style
    // preference rather than an error. A British -ise is not a defect; a
    // quoted paper title is not ours to rewrite; and a checker that fails on
    // either is a checker somebody switches off. This list is the confirmed
    // errors, and adding to it is a deliberate act.
    expect(
      offences('probe', 'the polarisation was linearised and destabilised')
    ).toEqual([]);
    expect(offences('probe', 'Polaris, precise, otherwise, praising')).toEqual(
      []
    );
  });

  test('the English message catalogs', async () => {
    const mods = await Promise.all([
      import('../js/i18n/en.js'),
      import('../js/i18n/en.deferred.js'),
      import('../js/i18n/en.teaching.js'),
      import('../js/i18n/en.activities.js'),
    ]);
    const found = [];
    for (const mod of mods) {
      for (const [name, table] of Object.entries(mod)) {
        // The value is what renders. The key is an identifier nobody reads.
        for (const [key, value] of Object.entries(table)) {
          found.push(...offences(`${name}.${key}`, value));
        }
      }
    }
    expect(found).toEqual([]);
  });

  test('the lesson prose', async () => {
    const { INVESTIGATIONS } = await import('../js/data/investigations.js');
    const found = [];
    for (const lesson of INVESTIGATIONS) {
      const into = [];
      strings(lesson, lesson.id, into);
      for (const [at, text] of into) found.push(...offences(at, text));
    }
    expect(found).toEqual([]);
  });

  test('the instructor guides', async () => {
    const { INSTRUCTOR_CONTENT } =
      await import('../js/data/instructorContent.js');
    const into = [];
    strings(INSTRUCTOR_CONTENT, 'instructorContent', into);
    const found = [];
    for (const [at, text] of into) found.push(...offences(at, text));
    expect(found).toEqual([]);
  });

  test('the standalone pages', () => {
    const pages = [
      'index.html',
      'model/index.html',
      'teaching/index.html',
      'instructors/index.html',
      'validation/index.html',
    ];
    const found = [];
    for (const page of pages) found.push(...offences(page, visibleText(page)));
    expect(found).toEqual([]);
  });
});
