// =============================================================================
// Every generated artifact, what it is made from, and what it must follow
// -----------------------------------------------------------------------------
// The one list. tools/generate.mjs runs it; BRANCHING.md's table of generated
// artifacts is written from it (tools/docs-facts.mjs, block:generatedArtifacts),
// so the table cannot leave an artifact out; and the npm `*:check` scripts of
// these nodes run through `node tools/generate.mjs --check --only <id>`.
//
//   id        the node's name
//   generate  the command that rewrites the outputs, or null where it needs
//             something a session does not have (a LaTeX engine, the
//             instructor passphrase)
//   check     the command that fails when the outputs are stale, or null where
//             the Jest suite is the check (it says which test)
//   inputs    paths, a directory meaning everything under it; their digest
//             decides whether the node is stale
//   outputs   what the generator writes, in full or in marked regions
//   after     nodes that must have run first
//   regions   hand-written files the node writes generated regions into: a
//             merge conflict in one is never resolved by taking a side
//   notes     what a person resolving a conflict needs to know
// =============================================================================

export const GRAPH = Object.freeze([
  {
    id: 'capabilities',
    generate: 'node tools/capabilities.mjs generate',
    check: 'node tools/capabilities.mjs check',
    inputs: ['capabilities', 'tools/capabilities.mjs'],
    outputs: ['js/platform/catalog.generated.js', 'docs/capabilities.md'],
    after: [],
  },
  {
    id: 'catalog',
    generate: 'node tools/catalog.mjs generate',
    check: 'node tools/catalog.mjs check',
    inputs: [
      'catalog',
      'data-packs',
      'js/data/courses',
      'js/platform/catalog.generated.js',
      'tools/catalog.mjs',
    ],
    outputs: ['catalog/catalog.json'],
    after: ['capabilities'],
  },
  {
    id: 'manifest',
    generate: 'node tools/build-investigation-manifest.js',
    check: null,
    testedBy: 'tests/investigationRegistry.test.js',
    inputs: ['js/data/investigations', 'tools/build-investigation-manifest.js'],
    outputs: [
      'js/data/investigations/manifest.js',
      'js/data/investigations/manifest.es.js',
      'js/data/investigations/browseData.js',
    ],
    after: [],
  },
  {
    id: 'cards',
    generate: 'node tools/generate-lesson-cards.mjs',
    check: 'node tools/generate-lesson-cards.mjs --check',
    inputs: ['js/data/investigations', 'tools/generate-lesson-cards.mjs'],
    outputs: ['images/investigations'],
    after: ['manifest'],
  },
  {
    id: 'teaching',
    generate: 'node tools/build-teaching-demos.mjs',
    check: 'node tools/build-teaching-demos.mjs --check',
    inputs: ['js/data/teaching.js', 'tools/build-teaching-demos.mjs'],
    outputs: ['js/data/teachingGenerated.js'],
    after: [],
  },
  {
    id: 'thumbnails',
    generate: 'node tools/generate-scenario-thumbnails.mjs',
    check: 'node tools/generate-scenario-thumbnails.mjs --check',
    inputs: [
      'js/data/scenarioInfo.js',
      'tools/thumbnail-config.mjs',
      'tools/generate-scenario-thumbnails.mjs',
    ],
    outputs: ['images/scenarios'],
    after: [],
  },
  {
    id: 'scene',
    generate: 'node tools/lesson-scene-audit.mjs --write',
    check: 'node tools/lesson-scene-audit.mjs --check',
    inputs: [
      'js/data/investigations',
      'js/lessonStage.js',
      'tools/lesson-scene-audit.mjs',
    ],
    outputs: [
      'docs/lesson-scene-catalog.json',
      'docs/lesson-scene-record.md',
      'js/data/investigations/provenance.js',
    ],
    after: ['manifest'],
  },
  {
    id: 'irreversible',
    generate: 'node tools/build-irreversibility-audit.mjs',
    check: 'node tools/build-irreversibility-audit.mjs --check',
    inputs: ['js/physics.js', 'tools/build-irreversibility-audit.mjs'],
    outputs: ['js/data/irreversible.js'],
    after: [],
  },
  {
    id: 'validation-data',
    generate: 'node tools/build-validation-data.mjs',
    check: 'node tools/build-validation-data.mjs --check',
    inputs: ['js', 'tools/build-validation-data.mjs'],
    outputs: ['validation/data.json'],
    after: [],
    notes:
      "The physics suite's own output; the `/validation/` page paints from it.",
  },
  {
    id: 'tools-index',
    generate: 'node tools/build-tools-index.mjs',
    check: 'node tools/build-tools-index.mjs --check',
    inputs: ['tools', 'package.json'],
    outputs: ['tools/README.md'],
    after: [],
  },
  {
    // After everything that rewrites a precached file: the manifest hashes
    // them, so one written after it is a manifest that is already stale.
    id: 'sw',
    generate: 'node tools/build-service-worker.mjs',
    check: 'node tools/build-service-worker.mjs --check',
    inputs: ['js', 'css', 'images', 'catalog', 'index.html', 'sw.js'],
    outputs: ['sw-manifest.js'],
    after: [
      'capabilities',
      'catalog',
      'manifest',
      'cards',
      'teaching',
      'thumbnails',
      'scene',
      'irreversible',
      'validation-data',
    ],
    notes: 'Precache list and version hash.',
  },
  {
    // dist/ is not committed, but the documented build sizes are read from it,
    // so it comes before the documentation facts.
    id: 'build',
    generate: 'node build.js',
    check: null,
    testedBy: 'tests/buildIntegrity.test.js',
    inputs: ['js', 'css', 'index.html', 'build.js'],
    outputs: ['dist'],
    after: ['sw'],
    uncommitted: true,
  },
  {
    id: 'docs',
    generate: 'node tools/docs-facts.mjs --sync --full',
    check: 'node tools/docs-facts.mjs --check --full',
    inputs: [
      'js',
      'tests',
      'e2e',
      'tools',
      'package.json',
      'sw-manifest.js',
      'dist/build-summary.json',
    ],
    outputs: ['manual/facts.tex', 'CITATION.cff', '.zenodo.json'],
    // Hand-written, with generated facts and blocks inside. Never resolved by
    // taking a side; the merge tripwire watches them.
    regions: [
      'README.md',
      'PHYSICS_VALIDATION.md',
      'ACCESSIBILITY.md',
      'OFFLINE_AND_LOW_END.md',
      'BRANCHING.md',
      'model/index.html',
      'paper.md',
    ],
    after: ['build', 'sw', 'manifest', 'scene', 'irreversible'],
  },
  {
    id: 'manual',
    generate: null,
    needs: 'a LaTeX engine (npm run manual)',
    check: 'node tools/build-manual.mjs --check',
    inputs: ['manual'],
    outputs: [
      'Gravitas_User_Manual.pdf',
      'manual/scenarios.tex',
      'manual/investigations.tex',
    ],
    after: ['docs'],
  },
  {
    id: 'instructors',
    generate: null,
    needs: 'the instructor passphrase (npm run build:instructors)',
    check: 'node tools/build-instructor-materials.js --check',
    inputs: ['js/data', 'tools/build-instructor-materials.js'],
    outputs: [
      'instructors/materials.enc.json',
      'instructors/materials.manifest.json',
    ],
    after: [],
    notes:
      "**Conflicts on every merge, by design.** Fresh salt and IV per build, so the ciphertext differs in every byte even when the content is identical. Check `materials.manifest.json`'s digest to see whether anything actually changed.",
  },
  {
    id: 'world-golden',
    generate: null,
    needs:
      'a deliberate decision (GRAVITAS_UPDATE_WORLD_GOLDEN=1, e2e/README.md)',
    check: null,
    testedBy: 'e2e/worldConstruction.spec.js',
    inputs: ['js/world', 'js/scenarios.js', 'js/data/scenarioInfo.js'],
    outputs: ['e2e/golden/world-construction.json'],
    after: [],
    notes:
      'Regenerate only deliberately — a change here means behaviour moved, not that a file went stale.',
  },
]);

/**
 * The nodes in an order that respects every `after`.
 *
 * @param {ReadonlyArray<object>} graph - Nodes
 * @returns {Array<object>} The same nodes, dependencies first
 * @throws {Error} On a cycle or an `after` naming no node
 */
export function order(graph = GRAPH) {
  const byId = new Map(graph.map(n => [n.id, n]));
  const out = [];
  const state = new Map();
  const visit = (n, path) => {
    if (state.get(n.id) === 'done') return;
    if (state.get(n.id) === 'visiting')
      throw new Error(
        `generate graph has a cycle: ${[...path, n.id].join(' -> ')}`
      );
    state.set(n.id, 'visiting');
    for (const a of n.after) {
      const dep = byId.get(a);
      if (!dep)
        throw new Error(`${n.id} runs after "${a}", which is not a node`);
      visit(dep, [...path, n.id]);
    }
    state.set(n.id, 'done');
    out.push(n);
  };
  for (const n of graph) visit(n, []);
  return out;
}
