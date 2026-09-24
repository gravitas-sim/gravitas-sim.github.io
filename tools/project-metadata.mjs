// =============================================================================
// The project's own description of itself
// -----------------------------------------------------------------------------
// CITATION.cff and .zenodo.json say the same things in two different shapes: a
// title, an abstract, a list of authors, a license, some keywords. Keeping two
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
// the live catalog at render time, so "53 configurable scenarios" cannot be
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
 * The paper describing this software.
 *
 * Separate from RELEASE because it is a different object with a different
 * lifetime: the software is versioned and archived per release, the paper is
 * written once and then goes through a venue's own process. A new version of
 * Gravitas does not produce a new paper.
 *
 * The DOI was not available when the paper was first recorded here: arXiv
 * registers a DataCite DOI for a submission, but hours later, and for a while
 * https://doi.org/10.48550/arXiv.2609.19327 returned 404 while the abstract
 * page was already live. It was left null until it resolved rather than
 * written ahead of time, because an identifier that looks authoritative and
 * resolves to nothing is worse than none. It resolved about eleven hours after
 * submission and DataCite reports it findable, so it is here now.
 *
 * The arXiv id stays beside it. The DOI is the identifier to cite; the id is
 * the one a reader recognises, and the generators print both.
 */
export const PAPER = {
  arxivId: '2609.19327',
  url: 'https://arxiv.org/abs/2609.19327',
  title:
    'Gravitas: A Browser-Based Astrophysics Laboratory for Prediction, ' +
    'Measurement, and Discovery',
  year: 2026,
  doi: '10.48550/arXiv.2609.19327',
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
  version: '1.0.0',
  // ISO date of the GitHub release, not the day the file was edited. If the
  // tag slips past this date, change this and regenerate before tagging: a
  // citation that names the wrong day is a citation nobody can check against
  // the archive.
  dateReleased: '2026-09-16',
  // Minted by Zenodo when the release is archived, and copied from the record
  // rather than composed by hand. It could not be inside the v1.0.0 tag: with
  // the GitHub-Zenodo workflow the identifier does not exist until the release
  // is published, so this was recorded afterwards and the archived v1.0.0 does
  // not contain it. That is expected - see RELEASING.md.
  //
  // This one names the 1.0.0 release specifically. Cite it when the exact
  // version matters, which for a reproducible result it always does.
  doi: '10.5281/zenodo.22800610',
  // The concept DOI, which is stable across versions: it resolves to whichever
  // release is newest. Right for a badge or a "cite the software" link, wrong
  // for citing the version somebody actually ran.
  conceptDoi: '10.5281/zenodo.22800609',
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
export const ACKNOWLEDGMENT =
  'Gravitas began as a SURE project at Stephen F. Austin State University ' +
  'and was funded by the SFA COSM.';

export const TITLE =
  'Gravitas: an interactive astrophysics sandbox for teaching';

export const LICENSE = 'MIT';

/**
 * The license on the original educational text and graphics.
 *
 * Separate from LICENSE because they are separate works with separate
 * audiences. MIT is a software license and says nothing useful to an
 * instructor who wants to put one of the investigations into a course pack;
 * CC BY 4.0 is the license that answers that question, and is what JOSE
 * expects of educational material. LICENSES.md says which files each covers.
 *
 * Zenodo's `license` field takes one identifier and the deposit is a software
 * record, so it carries this one's counterpart; CITATION.cff takes a list and
 * carries both.
 */
export const CONTENT_LICENSE = 'CC-BY-4.0';

/**
 * How the two licenses are explained on the Zenodo record.
 *
 * Zenodo's `license` field takes one identifier, and for a software deposit
 * that is the code license - so the record would otherwise say "MIT" and leave
 * an instructor to guess whether that covers the investigations. It does not.
 * The field stays MIT because the field is about the software; the rest is
 * said in the notes, where a reader looking at the record can see it.
 */
export const LICENSE_NOTE =
  'Licensing: the source code is MIT. The original educational material - the ' +
  'guided investigations, the instructor guides and answer keys, the user ' +
  'manual, the documentation and the original figures - is Creative Commons ' +
  'Attribution 4.0 International (CC BY 4.0). Third-party components keep ' +
  'their own licenses and attribution: three.js and Chart.js (MIT), the Inter, ' +
  'Poppins and Roboto Mono families (SIL OFL 1.1), the Transit of Venus ' +
  'photograph (CC BY 2.5, Brocken Inaglory), gravitational-wave strain from ' +
  'the Gravitational Wave Open Science Center (CC BY 4.0), radial velocities ' +
  'of 51 Pegasi from Butler et al. (2017) retrieved via VizieR (cited, not ' +
  'relicensed), and derived MIST stellar tracks (cited, not relicensed). ' +
  'LICENSES.md in the repository says which files each one covers.';

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
 * `{scenarios}` and `{investigations}` are filled from the live catalog by
 * the generator. Written as digits in the output so that a reader - and the
 * checker - can see the number.
 *
 * @param {object} facts - From tools/docs-facts.mjs
 * @returns {string[]} Paragraphs, plain text
 */
export function abstractParagraphs(facts) {
  // Every count here must be a real measurement. An earlier version defaulted
  // the physics total to the word "every" when the fact was absent, which is
  // how a cheap `docs:sync` came to write "every checks of the engine" into
  // the two files a DOI is minted from. physicsChecks is a deferred fact, so
  // the caller must have run with --full; refusing is the only safe answer.
  if (facts.physicsChecks === undefined) {
    throw new Error(
      'abstractParagraphs() needs physicsChecks, which only a --full run ' +
        'gathers. Regenerate the citation metadata with: npm run docs:sync -- --full'
    );
  }
  return [
    'Gravitas is a browser-based N-body gravity sandbox and astronomy ' +
      `teaching tool. It ships ${facts.scenarios} configurable scenarios ` +
      'drawn from real and idealized systems, ' +
      `${facts.investigations} guided investigations in which undergraduate ` +
      'students predict, measure and plot their own data, instructor ' +
      'materials with answer keys, and a public account of what the ' +
      'underlying model does and does not represent.',
    `Alongside the investigations are ${facts.activities} classroom ` +
      'activities — shorter formats built from the same lesson steps, from a ' +
      'five-minute demonstration to a full lab — and ' +
      `${facts.instructorDocuments} generated instructor documents: a guide ` +
      'and an answer key for every investigation, activity guides and student ' +
      'worksheets, an adopter\u2019s guide and a curriculum map. Answer keys ' +
      'are derived from the lesson definitions and verified against the same ' +
      'function that marks student work, so they cannot disagree with what a ' +
      'student sees.',
    'It runs entirely client-side as a static site, requires no account or ' +
      'installation, and encodes any simulation state into a shareable URL. ' +
      'It works offline after a first visit, targets WCAG 2.2 Level AA with ' +
      `axe-core run over ${facts.axeSurfaces} surfaces in ` +
      `${facts.locales} languages and ${facts.axeThemes} themes on every ` +
      'build, and is published in English and Spanish.',
    `The physics is checked in public: ${facts.physicsChecks} ` +
      'checks of the engine against analytic results, published values and ' +
      'independent integrations, each with its measured error and the kind of ' +
      'evidence it rests on, at gravitas-sim.online/validation/. A companion ' +
      'page states what the model represents and, at equal length, what it ' +
      'does not.',
  ];
}
