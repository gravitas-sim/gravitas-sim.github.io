#!/usr/bin/env node
// =============================================================================
// Validating CITATION.cff and .zenodo.json
// -----------------------------------------------------------------------------
// Three checks, and the third is the one that matters most.
//
//   CITATION.cff     against the Citation File Format 1.2.0 key set. CFF
//                    forbids keys it does not define, so a typo is a hard
//                    error rather than a field that is quietly ignored.
//   .zenodo.json     against the fields Zenodo's deposition API accepts, and
//                    the enumerations it constrains.
//   the two together they describe the same software, and Zenodo prefers
//                    .zenodo.json when both are present. A repository whose
//                    CFF is right and whose Zenodo file is stale mints a DOI
//                    with the stale metadata and says nothing about it.
//
// This is a structural and cross-consistency validation rather than a run of
// the upstream JSON schemas, which would mean vendoring two schemas and a
// Python tool into a Node repository and keeping both current. The key sets
// below are transcribed from the CFF 1.2.0 schema and the Zenodo deposition
// documentation, and the header of each list says so; `cffconvert --validate`
// remains the canonical check before a release, and RELEASING.md says to run it.
// =============================================================================

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import yaml from 'js-yaml';

/** Every key CFF 1.2.0 defines at the top level. Anything else is an error. */
const CFF_KEYS = new Set([
  'abstract',
  'authors',
  'cff-version',
  'commit',
  'contact',
  'date-released',
  'doi',
  'identifiers',
  'keywords',
  'license',
  'license-url',
  'message',
  'preferred-citation',
  'references',
  'repository',
  'repository-artifact',
  'repository-code',
  'title',
  'type',
  'url',
  'version',
]);

const CFF_REQUIRED = ['cff-version', 'message', 'title', 'authors'];

/** Keys a CFF person may carry. */
const CFF_PERSON_KEYS = new Set([
  'address',
  'affiliation',
  'alias',
  'city',
  'country',
  'email',
  'family-names',
  'fax',
  'given-names',
  'name-particle',
  'name-suffix',
  'orcid',
  'post-code',
  'region',
  'tel',
  'website',
]);

/** Fields Zenodo's deposition metadata accepts. */
const ZENODO_KEYS = new Set([
  'access_right',
  'access_conditions',
  'communities',
  'conference_acronym',
  'conference_dates',
  'conference_place',
  'conference_title',
  'conference_url',
  'conference_session',
  'conference_session_part',
  'contributors',
  'creators',
  'dates',
  'description',
  'doi',
  'embargo_date',
  'grants',
  'imprint_isbn',
  'imprint_place',
  'imprint_publisher',
  'journal_issue',
  'journal_pages',
  'journal_title',
  'journal_volume',
  'keywords',
  'language',
  'license',
  'locations',
  'method',
  'notes',
  'partof_pages',
  'partof_title',
  'prereserve_doi',
  'publication_date',
  'publication_type',
  'references',
  'related_identifiers',
  'subjects',
  'thesis_supervisors',
  'thesis_university',
  'title',
  'upload_type',
  'version',
]);

const ZENODO_UPLOAD_TYPES = new Set([
  'publication',
  'poster',
  'presentation',
  'dataset',
  'image',
  'video',
  'software',
  'lesson',
  'physicalobject',
  'other',
]);

const ZENODO_ACCESS = new Set(['open', 'embargoed', 'restricted', 'closed']);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ORCID = /^https:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/**
 * Check CITATION.cff.
 *
 * @param {object} cff - The parsed document
 * @returns {string[]} Problems, empty when valid
 */
export function validateCff(cff) {
  const problems = [];
  if (!cff || typeof cff !== 'object') return ['CITATION.cff is not a mapping'];

  for (const key of CFF_REQUIRED) {
    if (!(key in cff)) problems.push(`CITATION.cff: missing required "${key}"`);
  }
  if (cff['cff-version'] !== '1.2.0') {
    problems.push(
      `CITATION.cff: cff-version is ${JSON.stringify(cff['cff-version'])}; this validator knows 1.2.0`
    );
  }
  for (const key of Object.keys(cff)) {
    if (!CFF_KEYS.has(key)) {
      problems.push(
        `CITATION.cff: "${key}" is not a CFF 1.2.0 field, and CFF forbids extra keys`
      );
    }
  }

  if (Array.isArray(cff.authors)) {
    if (cff.authors.length === 0) {
      problems.push('CITATION.cff: authors is empty');
    }
    cff.authors.forEach((author, i) => {
      const where = `CITATION.cff: author ${i + 1}`;
      const named =
        author['family-names'] || author['given-names'] || author.name;
      if (!named) problems.push(`${where} has no name fields`);
      for (const key of Object.keys(author)) {
        if (!CFF_PERSON_KEYS.has(key)) {
          problems.push(`${where}: "${key}" is not a CFF person field`);
        }
      }
      if (author.orcid && !ORCID.test(author.orcid)) {
        problems.push(
          `${where}: orcid must be a full https://orcid.org/0000-0000-0000-0000 URL`
        );
      }
    });
  } else if ('authors' in cff) {
    problems.push('CITATION.cff: authors must be a list');
  }

  if ('date-released' in cff) {
    const value =
      cff['date-released'] instanceof Date
        ? cff['date-released'].toISOString().slice(0, 10)
        : String(cff['date-released']);
    if (!ISO_DATE.test(value)) {
      problems.push(`CITATION.cff: date-released "${value}" is not YYYY-MM-DD`);
    }
  }
  if ('version' in cff && typeof cff.version !== 'string') {
    problems.push('CITATION.cff: version should be a string, e.g. "1.0.0"');
  }
  if ('type' in cff && !['software', 'dataset'].includes(cff.type)) {
    problems.push(
      `CITATION.cff: type "${cff.type}" is not software or dataset`
    );
  }
  return problems;
}

/**
 * Check .zenodo.json.
 *
 * @param {object} record - The parsed document
 * @returns {string[]} Problems, empty when valid
 */
export function validateZenodo(record) {
  const problems = [];
  if (!record || typeof record !== 'object') {
    return ['.zenodo.json is not an object'];
  }
  for (const key of ['title', 'description', 'upload_type', 'creators']) {
    if (!(key in record)) {
      problems.push(`.zenodo.json: missing required "${key}"`);
    }
  }
  for (const key of Object.keys(record)) {
    if (!ZENODO_KEYS.has(key)) {
      problems.push(`.zenodo.json: "${key}" is not a Zenodo metadata field`);
    }
  }
  if (record.upload_type && !ZENODO_UPLOAD_TYPES.has(record.upload_type)) {
    problems.push(
      `.zenodo.json: upload_type "${record.upload_type}" is not one Zenodo accepts`
    );
  }
  if (record.access_right && !ZENODO_ACCESS.has(record.access_right)) {
    problems.push(
      `.zenodo.json: access_right "${record.access_right}" is not one Zenodo accepts`
    );
  }
  if (record.access_right === 'open' && !record.license) {
    problems.push('.zenodo.json: an open record needs a license');
  }
  if (Array.isArray(record.creators)) {
    record.creators.forEach((creator, i) => {
      if (!creator.name) {
        problems.push(
          `.zenodo.json: creator ${i + 1} has no "name" (Zenodo wants "Family, Given")`
        );
      } else if (!creator.name.includes(',')) {
        problems.push(
          `.zenodo.json: creator ${i + 1} name "${creator.name}" should be "Family, Given"`
        );
      }
      if (
        creator.orcid &&
        !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(creator.orcid)
      ) {
        problems.push(
          `.zenodo.json: creator ${i + 1} orcid should be bare digits, not a URL`
        );
      }
    });
  } else if ('creators' in record) {
    problems.push('.zenodo.json: creators must be a list');
  }
  if ('publication_date' in record && !ISO_DATE.test(record.publication_date)) {
    problems.push('.zenodo.json: publication_date is not YYYY-MM-DD');
  }
  for (const identifier of record.related_identifiers || []) {
    if (!identifier.identifier || !identifier.relation) {
      problems.push(
        '.zenodo.json: every related_identifier needs an identifier and a relation'
      );
    }
  }
  return problems;
}

/** Strip HTML and collapse whitespace, so two descriptions can be compared. */
const plain = html =>
  String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The two files must describe the same software.
 *
 * @param {object} cff - Parsed CITATION.cff
 * @param {object} zen - Parsed .zenodo.json
 * @returns {string[]} Problems
 */
export function validateConsistency(cff, zen) {
  const problems = [];
  const note =
    ' (Zenodo prefers .zenodo.json when both are present, so a disagreement ' +
    'ships the Zenodo version)';

  if (cff.title !== zen.title) {
    problems.push(`title differs between the two files${note}`);
  }

  const cffAbstract = plain(cff.abstract || '');
  const zenDescription = plain(zen.description || '');
  // The Zenodo description carries an extra "Live at" sentence the CFF has no
  // field for, so containment rather than equality.
  if (cffAbstract && !zenDescription.includes(cffAbstract.slice(0, 120))) {
    problems.push(`the abstract and the description have diverged${note}`);
  }

  const cffKeywords = [...(cff.keywords || [])].sort().join('|');
  const zenKeywords = [...(zen.keywords || [])].sort().join('|');
  if (cffKeywords !== zenKeywords) {
    problems.push(`keywords differ between the two files${note}`);
  }

  if (String(cff.license).toLowerCase() !== String(zen.license).toLowerCase()) {
    problems.push(
      `license differs: CITATION.cff says ${cff.license}, .zenodo.json says ${zen.license}`
    );
  }

  const cffNames = (cff.authors || [])
    .map(a => `${a['family-names']}, ${a['given-names']}`)
    .join('; ');
  const zenNames = (zen.creators || []).map(c => c.name).join('; ');
  if (cffNames !== zenNames) {
    problems.push(
      `authors differ: CITATION.cff has "${cffNames}", .zenodo.json has "${zenNames}"`
    );
  }

  const cffVersion = 'version' in cff ? String(cff.version) : null;
  const zenVersion = 'version' in zen ? String(zen.version) : null;
  if (cffVersion !== zenVersion) {
    problems.push(
      `version differs: CITATION.cff ${cffVersion ?? '(absent)'}, .zenodo.json ${zenVersion ?? '(absent)'}`
    );
  }
  return problems;
}

/**
 * Load and validate both files.
 *
 * @returns {Promise<{problems: string[], cff: object, zenodo: object}>} Result
 */
export async function validateCitationFiles() {
  const problems = [];
  let cff = null;
  let zen = null;

  if (!existsSync('CITATION.cff')) {
    problems.push('CITATION.cff is missing');
  } else {
    try {
      cff = yaml.load(await readFile('CITATION.cff', 'utf8'));
      problems.push(...validateCff(cff));
    } catch (err) {
      problems.push(`CITATION.cff does not parse as YAML: ${err.message}`);
    }
  }

  if (!existsSync('.zenodo.json')) {
    problems.push('.zenodo.json is missing');
  } else {
    try {
      zen = JSON.parse(await readFile('.zenodo.json', 'utf8'));
      problems.push(...validateZenodo(zen));
    } catch (err) {
      problems.push(`.zenodo.json does not parse as JSON: ${err.message}`);
    }
  }

  if (cff && zen) problems.push(...validateConsistency(cff, zen));
  return { problems, cff, zenodo: zen };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { problems } = await validateCitationFiles();
  if (problems.length) {
    for (const p of problems) process.stderr.write(`  ${p}\n`);
    process.stderr.write(`\n${problems.length} metadata problem(s).\n`);
    process.exit(1);
  }
  process.stdout.write(
    'CITATION.cff and .zenodo.json are valid and agree with each other.\n'
  );
}
