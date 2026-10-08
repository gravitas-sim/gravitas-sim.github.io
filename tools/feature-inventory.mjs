// =============================================================================
// The feature-detection inventory (Prompt 111)
// -----------------------------------------------------------------------------
// One entry per browser capability Gravitas depends on beyond the baseline the
// build targets (ES2022 and the DOM): what it is used for, where the code
// detects its absence, and what the reader gets without it.
//
// This list is data, and tests/platformBaseline.test.js holds it to the code
// in both directions:
//
//   - every `uses` entry names a file that still matches its `detect` pattern,
//     so a detection that is deleted or renamed fails the test;
//   - every file under js/ that touches one of these APIs (`token`) has an
//     entry, so a new use of Workers, IndexedDB, WebGL and the rest cannot ship
//     without a line here saying what happens when the browser lacks it.
//
// SUPPORT.md renders the table from it (tools/browser-support.mjs), so the
// document cannot describe a detection the code does not have.
//
// An entry with no `uses` is a capability the code deliberately does not use
// (OffscreenCanvas); the test then asserts the token appears nowhere.
// =============================================================================

/**
 * @typedef {{file: string, detect: RegExp, note: string}} Use
 * @typedef {{
 *   id: string, name: string, purpose: string, token: RegExp,
 *   without: string, uses: Use[]
 * }} Feature
 */

/** @type {Feature[]} */
export const FEATURES = [
  {
    id: 'workers',
    name: 'Web Workers (module Workers)',
    purpose:
      'Barnes–Hut gravity, the chart feed, the validation suite, the experiment runner, the Mission lab, the 3-D lab, the Observatory fitter and the RV workspace.',
    token: /new Worker\(/,
    without:
      'Optional uses degrade: gravity is summed on the main thread, charts update directly, and the validation and experiment pages say they cannot run here. The Mission lab, the 3-D lab, the Observatory fitter and the RV workspace search, fit and Monte Carlo have no main-thread fallback and need module Workers.',
    uses: [
      {
        file: 'js/physics.js',
        detect: /summing gravity on the main thread/,
        note: 'falls back to the main thread',
      },
      {
        file: 'js/ui.js',
        detect: /_chartWorker === false/,
        note: 'falls back to direct chart updates',
      },
      {
        file: 'js/validationPage.js',
        detect: /typeof Worker === 'undefined'/,
        note: 'disables the live run',
      },
      {
        file: 'js/experimentsPage.js',
        detect: /typeof Worker === 'undefined'/,
        note: 'reports that estimates need Workers',
      },
      {
        file: 'js/missionPage.js',
        detect: /new Worker\(/,
        note: 'no fallback',
      },
      {
        file: 'js/missionLabPage.js',
        detect: /new Worker\(/,
        note: 'no fallback',
      },
      {
        file: 'js/lab3dPage.js',
        detect: /new Worker\(/,
        note: 'no fallback',
      },
      {
        file: 'js/lab3dLab.js',
        detect: /new Worker\(/,
        note: 'no fallback',
      },
      {
        file: 'js/observatory/fitPanel.js',
        detect: /new Worker\(/,
        note: 'no fallback',
      },
      {
        file: 'js/inference/rvClient.js',
        detect: /new Worker\(/,
        note: 'no fallback',
      },
    ],
  },
  {
    id: 'indexeddb',
    name: 'IndexedDB',
    purpose:
      'Saved work (the storage layer), the Catalog, and the reader’s cache of archive answers.',
    token: /\bindexedDB\b/,
    without:
      'Saved work falls back to localStorage, then to memory, and says so: work in memory is gone when the tab closes. The Catalog and the archive cache fall back to memory.',
    uses: [
      {
        file: 'js/storage/index.js',
        detect: /localStorage is not available/,
        note: 'IndexedDB, then localStorage, then memory',
      },
      {
        file: 'js/catalog/store.js',
        detect: /if \(!indexedDB\) return createMemoryStore\(\)/,
        note: 'memory store',
      },
      {
        file: 'js/archive/cache.js',
        detect: /typeof indexedDB === 'undefined'/,
        note: 'memory store',
      },
    ],
  },
  {
    id: 'webgl',
    name: 'WebGL',
    purpose: 'The 3-D view in the sandbox and the picture in the 3-D lab.',
    token: /WebGLRenderer\(|getContext\(\s*['"](experimental-)?webgl/,
    without:
      'The 3-D views say so and stay empty. Every number is still in the tables, and the 2-D sandbox does not use WebGL.',
    uses: [
      {
        file: 'js/view3d.js',
        detect: /WebGL not available/,
        note: 'the view stays off',
      },
      {
        file: 'js/lab3d/view/scene.js',
        detect: /new THREE\.WebGLRenderer\(/,
        note: 'throws; the lab catches it',
      },
      {
        file: 'js/lab3dLab.js',
        detect: /l3\.status\.noWebgl/,
        note: 'shows the no-WebGL notice and keeps the numbers',
      },
    ],
  },
  {
    id: 'offscreencanvas',
    name: 'OffscreenCanvas',
    purpose: 'Not used.',
    token: /OffscreenCanvas|transferControlToOffscreen/,
    without:
      'Nothing to fall back from: Workers send numbers to the page and the page draws, so no canvas is ever transferred.',
    uses: [],
  },
  {
    id: 'serviceworker',
    name: 'Service Workers',
    purpose: 'The offline copy of the site.',
    token: /serviceWorker/,
    without:
      'The site works online as usual and offers no offline copy. It is also skipped on file:// and on a page that opted out.',
    uses: [
      {
        file: 'js/offline.js',
        detect: /'serviceWorker' in navigator/,
        note: 'returns before registering',
      },
    ],
  },
  {
    id: 'compression',
    name: 'Compression Streams',
    purpose: 'Shorter share links.',
    token: /CompressionStream/,
    without:
      'A link is made uncompressed (a marker byte says so) and still opens in every browser. Reading a compressed link needs DecompressionStream and says so if it is missing.',
    uses: [
      {
        file: 'js/shareState.js',
        detect: /typeof CompressionStream === 'undefined'/,
        note: 'payload goes uncompressed',
      },
    ],
  },
  {
    id: 'mediarecorder',
    name: 'MediaRecorder and canvas captureStream',
    purpose: 'Recording a clip of the simulation.',
    token: /MediaRecorder/,
    without:
      'The record button is hidden. Nothing else depends on it, and Playwright’s WebKit is one build where it is hidden.',
    uses: [
      {
        file: 'js/utils.js',
        detect: /export function canRecordClips/,
        note: 'canRecordClips() gates the button',
      },
      {
        file: 'js/capture.js',
        detect: /!canRecord\(\)/,
        note: 'refuses to start',
      },
      {
        file: 'js/ui.js',
        detect: /if \(!canRecordClips\(\)\) recordBtn\.hidden = true/,
        note: 'hides the button',
      },
    ],
  },
  {
    id: 'webaudio',
    name: 'Web Audio',
    purpose: 'Sonification and the optional sounds.',
    token: /AudioContext/,
    without: 'No sound. Every sonification has a text equivalent on the page.',
    uses: [
      {
        file: 'js/audio.js',
        detect: /const hasAudioSupport = /,
        note: 'ensureAudioContext() returns false',
      },
      {
        file: 'js/gwAudio.js',
        detect: /reason: 'unsupported'/,
        note: 'reports the sound as unsupported',
      },
    ],
  },
  {
    id: 'broadcastchannel',
    name: 'BroadcastChannel',
    purpose: 'Telling other tabs that saved work changed.',
    token: /BroadcastChannel\(/,
    without:
      'Other open tabs do not hear about a change until they reload; nothing is lost.',
    uses: [
      {
        file: 'js/storage/index.js',
        detect: /typeof globalThis\.BroadcastChannel === 'function'/,
        note: 'no channel is opened',
      },
    ],
  },
  {
    id: 'webcrypto',
    name: 'Web Crypto (a secure context)',
    purpose:
      'The instructor portal’s decryption and the SHA-256 digests that check downloaded files.',
    token: /crypto\.subtle/,
    without:
      'No fallback is implemented: it needs https or localhost. The student-facing simulations do not depend on it.',
    uses: [
      {
        file: 'js/instructorPortal.js',
        detect: /crypto\.subtle\.decrypt/,
        note: 'no fallback',
      },
      {
        file: 'js/hash.js',
        detect: /crypto\.subtle\.digest/,
        note: 'no fallback',
      },
      {
        file: 'js/archive/net.js',
        detect: /crypto\.subtle\.digest/,
        note: 'no fallback',
      },
      {
        file: 'js/catalog/archive.js',
        detect: /crypto\.subtle\.digest/,
        note: 'no fallback',
      },
      {
        file: 'js/lab3d/kernel.js',
        detect: /crypto\.subtle\.digest/,
        note: 'no fallback',
      },
    ],
  },
];

/** The table SUPPORT.md shows, as Markdown. */
export function inventoryMarkdown() {
  const cell = s => s.replace(/\|/g, '\\|');
  const rows = FEATURES.map(f => {
    const where = f.uses.length
      ? f.uses.map(u => `\`${u.file}\``).join(', ')
      : 'not used';
    return `| ${cell(f.name)} | ${cell(f.purpose)} | ${where} | ${cell(f.without)} |`;
  });
  return [
    '| Capability | Used for | Where the code checks | Without it |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}
