// =============================================================================
// The project's own description of itself
// -----------------------------------------------------------------------------
// CITATION.cff and .zenodo.json say the same things in two different shapes: a
// title, an abstract, a list of authors, a licence, some keywords. Keeping two
// hand-written copies of that in step is exactly the kind of chore nobody does,
// and the failure is quiet - Zenodo prefers .zenodo.json when both are present,
// so a repository whose CFF is right and whose Zenodo file is stale will mint a
// DOI with the stale metadata and nothing will say so.
//
// So both files are generated from this one. tools/docs-facts.mjs renders them
// alongside manual/facts.tex, `npm run docs:sync` writes them and
// `npm run docs:check` fails when they have drifted.
//
// The counts in the abstract are not written here. They are interpolated from
// the live catalogue at render time, so "53 configurable scenarios" cannot be
// wrong in the way it was wrong before.
//
// Release fields
// -----------------------------------------------------------------------------
// `version` and `date-released` are deliberately absent, and RELEASE below says
// why: there is no tag and no GitHub release, so any value for either would be
// invented. CFF 1.2.0 makes both optional. When a release is actually cut,
// RELEASING.md says what to put here.
// =============================================================================

/** Where the project lives. */
export const URLS = {
  site: 'https://gravitas-sim.online',
  repository: 'https://github.com/gravitas-sim/gravitas-sim.github.io',
};

/**
 * Release identity.
 *
 * Every field is null until there is something real to point at. The generators
 * omit a null rather than writing a placeholder, because a placeholder DOI or a
 * guessed date is worse than an absent one: it looks like a fact.
 */
export const RELEASE = {
  // Set by RELEASING.md when a tag is cut. `null` means unreleased.
  version: null,
  // ISO date of the GitHub release, not the day the file was edited.
  dateReleased: null,
  // Minted by Zenodo when the release is archived. Never written by hand.
  doi: null,
  // The concept DOI, which is stable across versions.
  conceptDoi: null,
};

/**
 * Authors, in citation order.
 *
 * One author, confirmed by the project owner. The ORCID and the departmental
 * affiliation are the ones used in the author's published work, supplied
 * rather than looked up - an ORCID that belongs to somebody else is worse than
 * none, so nothing here is inferred from a name.
 *
 * Git history carries two further identities and neither is a second author.
 * See .mailmap: "Kristina Ziegler" was this machine's name and an erroneous
 * local Git identity, not a person.
 */
export const AUTHORS = [
  {
    familyNames: 'Ziegler',
    givenNames: 'Carl',
    affiliation:
      'Department of Physics, Engineering and Astronomy, Stephen F. Austin ' +
      'State University, Nacogdoches, TX 75962, USA',
    email: 'Carl.Ziegler@sfasu.edu',
    // Stored as the full URL: CITATION.cff wants it this way and the Zenodo
    // generator strips the prefix, which is the direction that cannot lose
    // information.
    orcid: 'https://orcid.org/0000-0002-0619-7639',
  },
];

/**
 * How the work was funded, in the project's own words.
 *
 * Prose rather than a structured award, because there is no grant number or
 * funder identifier to put in one and a structured field with an invented
 * identifier in it is a false claim rather than a tidier one. If an award
 * number is supplied later it belongs here alongside the sentence.
 */
export const ACKNOWLEDGEMENT =
  'Gravitas began as a SURE project at Stephen F. Austin State University ' +
  'and was funded by the SFA COSM.';

export const TITLE =
  'Gravitas: an interactive astrophysics sandbox for teaching';

export const LICENSE = 'MIT';

export const KEYWORDS = [
  'astronomy education',
  'physics education',
  'N-body simulation',
  'orbital mechanics',
  'exoplanets',
  'habitable zone',
  'interactive simulation',
  'open educational resources',
];

/**
 * The abstract, as paragraphs, with the counts left as placeholders.
 *
 * `{scenarios}` and `{investigations}` are filled from the live catalogue by
 * the generator. Written as digits in the output so that a reader - and the
 * checker - can see the number.
 *
 * @param {object} facts - From tools/docs-facts.mjs
 * @returns {string[]} Paragraphs, plain text
 */
export function abstractParagraphs(facts) {
  return [
    'Gravitas is a browser-based N-body gravity sandbox and astronomy ' +
      `teaching tool. It ships ${facts.scenarios} configurable scenarios ` +
      'drawn from real and idealized systems, ' +
      `${facts.investigations} guided investigations in which undergraduate ` +
      'students predict, measure and plot their own data, instructor ' +
      'materials with answer keys, and a public account of what the ' +
      'underlying model does and does not represent.',
    'It runs entirely client-side as a static site, requires no account or ' +
      'installation, and encodes any simulation state into a shareable URL.',
  ];
}
