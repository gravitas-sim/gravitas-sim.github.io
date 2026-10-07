// =============================================================================
// Every versioned format Gravitas reads or writes, and FORMATS.md from them
// -----------------------------------------------------------------------------
//   node tools/formats.mjs --write   rewrite FORMATS.md from the table below
//   node tools/formats.mjs --check   fail when FORMATS.md is not what it would write
//
// Roadmap II Prompt 61 puts every public format under one rule: a schema, a
// format and version pair, a reader for the previous version or a refusal in
// words, and a deprecation window. This is the inventory that rule starts
// from, as data: one entry per format, with the constant that sets its
// version where the code has one. tests/formats.test.js holds each recorded
// version to that constant, each "schema" to sdk/schemas, and FORMATS.md to
// this table, so the table cannot say what the code does not.
// =============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DOC = path.join(ROOT, 'FORMATS.md');

// persisted: where a copy outlives the page. older: what the reader does with
// the previous version. newer: what it does with a later one.
//   const: [module, export] whose value is the current version, if any
//   schema: the file under sdk/schemas, if any
export const FORMATS = Object.freeze([
  // --- Observation, measurement and inference ---
  {
    name: 'gravitas.observation',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/observatory/schema.js', 'FORMAT_VERSION'],
    owner: 'js/observatory/schema.js validateObservation',
    persisted: 'download',
    older: 'v1 only',
    newer: 'refused: "reads /1"',
    schema: 'observation-1.schema.json',
  },
  {
    name: 'gravitas.pipeline',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/measure/pipeline.js', 'FORMAT_VERSION'],
    owner: 'js/measure/pipeline.js readPipeline',
    persisted: 'download',
    older: 'v1 only',
    newer: 'refused, in words',
    schema: 'pipeline-1.schema.json',
  },
  {
    name: 'gravitas.inference',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/inference/manifest.js', 'FORMAT_VERSION'],
    owner: 'js/inference/manifest.js validateInference',
    persisted: 'download',
    older: 'v1 only',
    newer: 'a validation problem',
    schema: 'inference-1.schema.json',
  },
  {
    name: 'gravitas.analysis',
    fields: 'format, formatVersion, kind',
    version: 1,
    const: ['js/analysis/sweepAnalysis.js', 'ANALYSIS_VERSION'],
    owner: 'js/analysis/seams.js readAnalysis (the analysis lab)',
    persisted: 'download',
    older: 'v1 only',
    newer: 'refused, in words',
    schema: 'analysis-1.schema.json',
  },
  {
    name: 'gravitas.artifact',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/platform/artifact.js', 'FORMAT_VERSION'],
    owner: 'js/platform/artifact.js validateArtifact',
    persisted: 'memory',
    older: 'v1 only',
    newer: 'a validation problem',
    schema: 'artifact-1.schema.json',
  },
  {
    name: 'gravitas.observed',
    fields: 'format, formatVersion',
    version: 1,
    owner: 'js/notebook/observed.js (inside a notebook entry)',
    persisted: 'localStorage',
    older: 'v1 only',
    newer: 'not checked',
  },
  {
    name: 'gravitas.observation-data-pack',
    fields: 'format, formatVersion',
    version: 1,
    const: ['tools/data-packs/schema.mjs', 'FORMAT_VERSION'],
    owner: 'tools/data-packs/schema.mjs validateDataPack',
    persisted: 'repository, extension archive',
    older: 'v1 only',
    newer: 'a validation problem',
    schema: 'observation-data-pack-1.schema.json',
  },
  // --- Simulation, systems and experiments ---
  {
    name: 'world share link',
    fields: 'v (link prefix 2)',
    version: 2,
    const: ['js/shareState.js', 'LINK_VERSION'],
    owner: 'js/shareState.js decodePayload',
    persisted: 'link',
    older: 'reads v1, whose scenario is an English name, by id',
    newer: 'refused, in words',
  },
  {
    name: 'built-in scenario id',
    fields: 'a public id (SCENARIO_INFO key)',
    version: 1,
    owner: 'js/scenarios.js scenarioId, js/data/scenarioInfo.js scenarioId',
    persisted:
      'link, lesson, course pack, investigation pack, experiment, notebook entry',
    older: 'reads the English name it was keyed by before ids',
    newer: 'refused: a link in words, a pack by its validator',
    schema: 'scenario-id-1.schema.json',
  },
  {
    name: 'experiment link block (xp)',
    fields: 'v',
    version: 1,
    owner: 'js/experiments/shareExperiment.js readExperimentBlock',
    persisted: 'link',
    older: 'v1 only',
    newer: 'reported, not checked',
  },
  {
    name: 'link extras (x)',
    fields: 'v',
    version: 1,
    owner: 'js/experiments/canonicalState.js readExtras',
    persisted: 'link',
    older: 'v1 only',
    newer: 'reported, not checked',
  },
  {
    name: 'gravitas.orbital-system',
    fields: 'format, version',
    version: 1,
    const: ['js/systemSpec.js', 'SYSTEM_VERSION'],
    owner: 'js/systemSpec.js systemFromFile',
    persisted: 'download',
    older: 'v1 only',
    newer: 'refused, in words',
    schema: 'orbital-system-1.schema.json',
  },
  {
    name: 'gravitas.system3d',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/lab3d/state.js', 'FORMAT_VERSION'],
    owner: 'js/lab3d/state.js migrateSystem',
    persisted: 'file, repository',
    older: 'v1 only; reads orbital-system/1',
    newer: 'refused, in words',
  },
  {
    name: 'gravitas.lab3d.snapshot',
    fields: 'format, formatVersion',
    version: 1,
    owner: 'js/lab3d/snapshot.js snapshotProblem',
    persisted: 'memory',
    older: 'v1 only',
    newer: 'refused',
  },
  {
    name: 'gravitas.experiment',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/experiments/experimentManifest.js', 'FORMAT_VERSION'],
    owner: 'js/experiments/experimentManifest.js migrateExperiment',
    persisted:
      'download (the runner’s manifest, and the bench’s comparison), memory, inside results',
    older:
      'converts an unversioned sweep spec; the retired id gravitas-experiment is version 0',
    newer: 'refused, in words',
    schema: 'experiment-1.schema.json',
  },
  {
    name: 'gravitas.experiment-result',
    fields: 'format, formatVersion',
    version: 1,
    owner:
      'js/experiments/experimentManifest.js reproducibility; the bench’s records, js/experiments/store.js migrate',
    persisted:
      'download, localStorage (the bench’s saved comparisons and reliability checks)',
    older:
      'the store’s v1 to v3 and the retired gravitas-reliability-check are version 0',
    newer: 'refused; the analysis panel does not check',
    schema: 'experiment-result-1.schema.json',
  },
  {
    name: 'experiment store',
    fields: 'v, beside format and formatVersion',
    version: 3,
    owner: 'js/experiments/store.js migrate',
    persisted: 'localStorage',
    older: 'migrates v1 and v2; a record without a format is read by v',
    newer: 'refused by reason code',
  },
  {
    name: 'gravitas.mission-plan',
    fields: 'format, formatVersion',
    version: 1,
    owner: 'none: written, never read',
    persisted: 'download',
    older: 'v1 only',
    newer: 'nothing reads it',
  },
  {
    name: 'gravitas.ephemeris-pack',
    fields: 'format, formatVersion',
    version: 1,
    owner: 'js/mission/ephemeris.js createEphemeris',
    persisted: 'repository',
    older: 'v1 only',
    newer: 'refused',
  },
  // --- Lessons, assignments and student work ---
  {
    name: 'gravitas.investigation-pack',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/platform/investigation.js', 'FORMAT_VERSION'],
    owner: 'js/platform/investigation.js migrateInvestigationPack',
    persisted: 'download, localStorage, repository',
    older: 'v1 only',
    newer: 'refused, in words',
    schema: 'investigation-pack-1.schema.json',
  },
  {
    name: 'gravitas.question-bank',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/platform/questionBank.js', 'BANK_FORMAT_VERSION'],
    owner: 'js/platform/questionBank.js validateQuestionBankWith',
    persisted: 'download',
    older: 'v1 only',
    newer: 'a validation problem',
    schema: 'question-bank-1.schema.json',
  },
  {
    name: 'gravitas.assignment',
    fields: 'k, v (link prefix a)',
    version: 2,
    const: ['js/assignments/assignment.js', 'ASSIGNMENT_SCHEMA'],
    owner: 'js/assignments/assignment.js validateAssignment',
    persisted: 'link, download',
    older: 'reads v1 as it is',
    newer: 'refused, in words',
    schema: 'assignment-2.schema.json',
  },
  {
    name: 'investigation progress',
    fields: 'schema',
    version: 2,
    owner: 'js/investigations/progressSchema.js readProgress',
    persisted: 'localStorage',
    older: 'migrates v1 (migrateFromV1)',
    newer: 'kept and not overwritten, in words',
  },
  {
    name: 'gravitas.investigation.progress',
    fields: 'kind, version',
    version: 2,
    owner: 'js/investigations/progressBackup.js restoreProgress',
    persisted: 'download',
    older: 'migrates v1',
    newer: 'refused, in words',
  },
  {
    name: 'submission token',
    fields: 'v (link prefix s)',
    version: 1,
    const: ['js/submission/submissionToken.js', 'SUBMISSION_SCHEMA'],
    owner: 'js/submission/submissionToken.js readSubmissionToken',
    persisted: 'pasted text',
    older: 'v1 only',
    newer: 'refused, in words',
    schema: 'submission-token-1.schema.json',
  },
  {
    name: 'gravitas.submission-results',
    fields: 'kind, version',
    version: 2,
    const: ['js/submission/results.js', 'RESULTS_VERSION'],
    owner: 'js/submission/results.js readResults',
    persisted: 'download',
    older: 'migrates v1',
    newer: 'refused by reason code',
    schema: 'submission-results-2.schema.json',
  },
  {
    name: 'gravitas.lab3d-guide-report',
    fields: 'format, formatVersion',
    version: 1,
    owner: 'none: written, never read',
    persisted: 'download',
    older: 'v1 only',
    newer: 'nothing reads it',
  },
  {
    name: 'gravitas.mission-lab-report',
    fields: 'format, formatVersion',
    version: 1,
    owner: 'none: written, never read',
    persisted: 'download',
    older: 'v1 only',
    newer: 'nothing reads it',
  },
  // --- The notebook ---
  {
    name: 'notebook store',
    fields: 'v',
    version: 1,
    owner: 'js/notebook/store.js load',
    persisted: 'localStorage',
    older: 'v1 only',
    newer: 'kept and not overwritten, in words',
  },
  {
    name: 'notebook entry snapshot',
    fields: 'snapshot.v',
    version: 1,
    owner: 'js/notebook/entry.js validateEntry',
    persisted: 'localStorage, download',
    older: 'v1 only',
    newer: 'refused by reason code',
  },
  {
    name: 'gravitas.evidence.notebook',
    fields: 'kind, version',
    version: 1,
    owner: 'js/notebook/notebook.js validateBackup',
    persisted: 'download',
    older: 'v1 only',
    newer: 'refused, in words',
    schema: 'evidence-notebook-1.schema.json',
  },
  // --- Courses, packages and the catalog ---
  {
    name: 'gravitas.course-pack (extension form)',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/platform/course.js', 'FORMAT_VERSION'],
    owner: 'js/platform/course.js validateCoursePack',
    persisted: 'repository, extension archive, IndexedDB',
    older: 'v1 only',
    newer: 'a validation problem, which /2 gets too',
    schema: 'course-pack-1.schema.json',
  },
  {
    name: 'gravitas.course-pack (builder form)',
    fields: 'format, formatVersion',
    version: 2,
    const: ['js/course/pack.js', 'FORMAT_VERSION'],
    owner: 'js/course/pack.js migrateCoursePack',
    persisted: 'download, localStorage, repository',
    older: 'migrates v1',
    newer: 'refused, in words',
  },
  {
    name: 'course home link',
    fields: 'link prefix c',
    version: 2,
    owner: 'js/course/links.js readCourseFragment',
    persisted: 'link',
    older: 'migrates c1',
    newer: 'refused by reason code',
  },
  {
    name: 'gravitas.course-manifest',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/course/manifest.js', 'MANIFEST_FORMAT_VERSION'],
    owner: 'none: written, never read',
    persisted: 'download',
    older: 'v1 only',
    newer: 'nothing reads it',
  },
  {
    name: 'gravitas.capability-package',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/platform/manifest.js', 'FORMAT_VERSION'],
    owner: 'js/platform/manifest.js validateManifest',
    persisted: 'repository, IndexedDB',
    older: 'v1 only',
    newer: 'refused, in words',
    schema: 'capability-package-1.schema.json',
  },
  {
    name: 'gravitas.scenario-pack',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/platform/scenario.js', 'FORMAT_VERSION'],
    owner: 'js/platform/scenario.js migrateScenarioPack',
    persisted: 'download, localStorage, link',
    older: 'v1 only; reads orbital-system/1',
    newer: 'refused, in words',
    schema: 'scenario-pack-1.schema.json',
  },
  {
    name: 'gravitas.catalog',
    fields: 'format, formatVersion',
    version: 1,
    owner: 'js/catalogPage.js load',
    persisted: 'repository',
    older: 'v1 only',
    newer: 'refused',
    schema: 'catalog-1.schema.json',
  },
  {
    name: 'gravitas.library',
    fields: 'format, formatVersion',
    version: 1,
    owner: 'js/library/format.js checkLibrary',
    const: ['js/library/format.js', 'FORMAT_VERSION'],
    persisted: 'repository',
    older: 'v1 only',
    newer: 'refused',
    schema: 'library-1.schema.json',
  },
  {
    name: 'gravitas.catalog-curation',
    fields: 'format, formatVersion',
    version: 1,
    owner: 'tools/catalog.mjs readCuration',
    persisted: 'repository',
    older: 'not checked',
    newer: 'not checked',
    schema: 'catalog-curation-1.schema.json',
  },
  {
    name: 'gravitas.extension-archive',
    fields: 'none (the archive structure)',
    version: 1,
    owner: 'sdk/lib/archive.mjs, js/catalog/archive.js',
    persisted: 'repository, download',
    older: 'structure checked, not version',
    newer: 'structure checked, not version',
  },
  // --- The embed and the evaluation kit ---
  {
    name: 'gravitas-embed messages',
    fields: 'protocol, version',
    version: 1,
    const: ['js/embedMessages.js', 'PROTOCOL_VERSION'],
    owner: 'js/embedMessages.js readMessage',
    persisted: 'memory',
    older: 'v1 only',
    newer: 'refused by error code',
    schema: 'embed-messages-1.schema.json',
  },
  {
    name: 'embed options',
    fields: 'query ev',
    version: 1,
    owner: 'js/embedOptions.js readEmbedOptions',
    persisted: 'link',
    older: 'v1 only',
    newer: 'ignored: opens as a plain embed',
  },
  {
    name: 'gravitas.student-data',
    fields: 'format, formatVersion',
    version: 1,
    const: ['js/storage/index.js', 'EXPORT_VERSION'],
    owner: 'js/storage/index.js Store.importAll',
    persisted: 'download',
    older: 'v1 only',
    newer: 'refused, with a reason',
  },
  {
    name: 'gravitas.evaluation',
    fields: 'kind, schema',
    version: 1,
    owner: 'tools/evaluation-summary.mjs',
    persisted: 'download, localStorage draft',
    older: 'v1 only',
    newer: 'skipped, in words',
    schema: 'evaluation-1.schema.json',
  },
]);

const cell = s => String(s).replace(/\|/g, '\\|');

/** FORMATS.md, as this table writes it. */
export function render(formats = FORMATS) {
  const withSchema = formats.filter(f => f.schema).length;
  const migrating = formats.filter(f =>
    /^migrates|^reads v1|^converts/.test(f.older)
  ).length;
  const rows = formats.map(
    f =>
      `| ${cell(f.name)} | ${cell(f.fields)} | ${f.version} | ${cell(f.owner)} | ${cell(f.persisted)} | ${cell(f.older)} | ${cell(f.newer)} | ${f.schema ? `[yes](sdk/schemas/${f.schema})` : 'no'} |`
  );
  return `<!-- Generated by tools/formats.mjs from its table. Do not edit by hand: node tools/formats.mjs --write -->

# Formats

Every versioned format Gravitas reads or writes: ${formats.length} of them. ${withSchema} have a JSON Schema in \`sdk/schemas\`, and ${migrating} read their previous version rather than only their own.

Roadmap II Prompt 61 puts each under one rule:
- a JSON Schema;
- a \`format\` and \`formatVersion\` pair;
- a reader for the previous version (\`readVersioned()\` in \`js/platform/common.js\`), or a written refusal with an export path;
- a deprecation window.

This table is where that starts. \`tests/formats.test.js\` holds each version here to the constant the code sets it with, and each schema to \`sdk/schemas\`.

The columns:
- **persisted** says where a copy outlives the page, and so what a change of version must still read.
- **previous** is what the reader does with the previous version.
- **newer** is what it does with a later one.

| Format | Identified by | Version | Owner | Persisted | Previous | Newer | Schema |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## What the table shows

- **Five ways to say a version:**
  - \`format\` with \`formatVersion\`;
  - \`format\` with \`version\`;
  - \`kind\` with \`version\` or \`schema\`;
  - a bare \`v\`;
  - a link prefix.

  Prompt 61 makes \`format\` and \`formatVersion\` the one convention, and \`readVersioned()\` reads the older pairs by name for one major version.
- **Confusable ids.** \`gravitas-experiment\` is no longer a format: it is the retired name of \`gravitas.experiment/1\`, which the A/B bench writes (\`kind: comparison\`) and the runner reads, as it reads the retired name, as version 0. The bench’s reliability check is \`gravitas.experiment-result/1\` of \`kind: reliability-check\`, the retired \`gravitas-reliability-check\` its version 0. \`gravitas.course-pack\` is two: /1, which extensions and the catalog carry, and /2, which the builder writes. The /1 validator refuses a /2 pack with the same message it gives any other version.
- **Written but never read:** \`gravitas.analysis\`, the two guide reports, \`gravitas.mission-plan\` and \`gravitas.course-manifest\`. A student's file in any of them cannot be opened again.
- **Newer versions:** they are refused in words in some readers, by a bare reason code in others (spelled \`newer\`, \`newerVersion\`, \`tooNew\`, \`schemaTooNew\` and \`from-a-newer-version\`), and not at all in the link blocks, \`gravitas.observed\` and the catalog curation.

## Scenarios by id

Roadmap II Prompt 63 gave every built-in scenario a public id: lower case, words joined by hyphens, permanent (\`sdk/schemas/scenario-id-1.schema.json\`). Until then a scenario was keyed by its English name, and that name is what every link, lesson, course pack and experiment made before carries. The rule \`scenarioId()\` reads both: an id is its old name lower-cased, with apostrophes dropped and every other run of spaces and punctuation one hyphen (\`"Kepler's 2nd Law"\` is \`keplers-2nd-law\`). \`tests/scenarioIds.test.js\` holds the rule to all 59 old names. A title is a translation of the id and never a key.

- **World links are version 2** and name the scenario by id. Version 1 still opens: its English name is read as the id. A scenario this build does not have is refused in words, where it used to build the default world.
- **A pack's world says which pack.** A link made from a scenario pack carries \`{pack: {id, version}}\` in its extras, and the application carries it on into any link it makes of the same world. A pack may also name a built-in to start from, by id.
- **The built-in lessons keep their English keys.** A step's scenario is part of its fingerprint, which assignment links, course-pack pins, submission results and progress backups store, so the lessons written before ids keep the key they were written with, and every reader resolves it. New lessons name scenarios by id.

## One precision for a written world

Every number a world is written down in - a share link's bodies and settings, an A/B setup, a scenario pack's compiled bodies - keeps twelve significant figures (\`LINK_PRECISION\` in \`js/shareState.js\`). The share trimmer kept seven and the pack compiler twelve, so a pack's world shared from the application lost five digits the pack had.

Twelve, because seven is not below what Gravitas measures. The labs report conserved speeds and energies to parts in 1e-7 and 1e-8, and a world rounded to seven figures carries that much error into the reading it is shared to show. Twelve is four orders of magnitude below any of them, and still drops the noise digits float arithmetic leaves, which cost bytes and compress badly. Measured on full links of six built-in worlds: 30 to 40 per cent longer than at seven figures, 13 per cent more JSON to inflate (Kessler Cascade, 301 bodies: 47 KB to 53 KB, against a 64,000-byte limit), and 17 per cent shorter than every digit. A seeded link, the kind an instructor sends, carries no bodies and is the same length either way.
`;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const text = render();
  if (process.argv.includes('--write')) {
    writeFileSync(DOC, text);
    console.log(`Wrote FORMATS.md: ${FORMATS.length} formats.`);
  } else {
    const now = existsSync(DOC) ? readFileSync(DOC, 'utf8') : '';
    if (now !== text) {
      console.error('FORMATS.md is stale. Run node tools/formats.mjs --write');
      process.exit(1);
    }
    console.log(`FORMATS.md is current: ${FORMATS.length} formats.`);
  }
}
