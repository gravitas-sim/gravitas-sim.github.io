// =============================================================================
// The panels index.html no longer carries, and where each one went
// -----------------------------------------------------------------------------
// Roadmap II Prompt 53 (INDEX_DECOMPOSITION.md). index.html keeps the shell,
// the canvas, the transport bar, the rail, the live regions and the scene
// description; a panel whose family loads on demand ships its markup with that
// family, and is inserted where an empty `<template data-host="...">` stands.
//
// Two kinds, because two budgets decide where markup can live:
//   file      js/fragments/<host>.html, fetched with the family's modules.
//             HTML, because the deferred JavaScript total has 9 KB of room
//             and these panels are 70 KB of markup.
//   template  an exported template string in the module that binds the panel
//             at start-up, inserted before it binds. JavaScript, because a
//             start-up fetch would hold the first interaction back by a
//             round trip.
//
// This is the one list. tools/i18n-audit.mjs reads the strings through it,
// and the tests that read index.html for panel markup read the assembled
// document it builds, which is the page as a reader has it once every family
// has mounted.
// =============================================================================

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every host in index.html, in document order.
 *
 * `family` names the code that mounts it; `ids` are the fragment's top-level
 * elements, in order.
 */
export const FRAGMENTS = [
  {
    host: 'view3d',
    family: '3-D view',
    kind: 'file',
    owner: 'js/view3d.js',
    ids: ['threeViewportContainer'],
  },
  {
    host: 'pause-event',
    family: 'pause at event',
    kind: 'file',
    owner: 'js/pauseAtEventPanel.js',
    ids: ['pauseEventContainer'],
  },
  {
    host: 'rv-workspace',
    family: 'RV workspace',
    kind: 'file',
    owner: 'js/rvWorkspacePanel.js',
    ids: ['rvFitContainer'],
  },
  {
    host: 'assist',
    family: 'gravity assist',
    kind: 'file',
    owner: 'js/assistPanel.js',
    ids: ['assistContainer'],
  },
  {
    host: 'precise-placement',
    family: 'precise placement',
    kind: 'file',
    owner: 'js/precisePlacement.js',
    ids: ['precisePlaceDialog'],
  },
  {
    host: 'sound',
    family: 'start-up: sound panel',
    kind: 'template',
    owner: 'js/ui.js',
    name: 'SOUND_PANEL_MARKUP',
    ids: ['soundPanel'],
  },
  {
    host: 'scenario-list',
    family: 'start-up: scenario gallery',
    kind: 'template',
    owner: 'js/scenarioBrowser.js',
    name: 'SCENARIO_LIST_MARKUP',
    ids: ['scenarioListModal'],
  },
  {
    host: 'lesson',
    family: 'lesson engine',
    kind: 'file',
    owner: 'js/investigations.js',
    ids: [
      'investigationPanel',
      'investigationPlot',
      'investigationEllipse',
      'investigationTool',
    ],
  },
  {
    host: 'export',
    family: 'data export',
    kind: 'file',
    owner: 'js/exportDialog.js',
    ids: ['dataExport'],
  },
  {
    host: 'lesson-finish',
    family: 'lesson engine',
    kind: 'file',
    owner: 'js/investigations.js',
    ids: ['investigationFinish'],
  },
  {
    host: 'bh-masses',
    family: 'start-up: black-hole masses',
    kind: 'template',
    owner: 'js/ui.js',
    name: 'BH_MASSES_MARKUP',
    ids: ['bhMassesModal'],
  },
  {
    host: 'inspector',
    family: 'start-up: object inspector',
    kind: 'template',
    owner: 'js/ui.js',
    name: 'INSPECTOR_MARKUP',
    ids: ['objectInspector'],
  },
  {
    host: 'tutorial',
    family: 'start-up: guided tour',
    kind: 'template',
    owner: 'js/tutorial.js',
    name: 'TUTORIAL_MARKUP',
    ids: ['tutorialPopup'],
  },
  {
    host: 'lecture',
    family: 'lecture mode',
    kind: 'file',
    owner: 'js/lecture.js',
    ids: ['lectureBar', 'lectureSequenceSheet'],
  },
];

/**
 * The top-level elements index.html keeps, in document order: the shell, the
 * canvas and its scene description, the live regions, the readout, the rail,
 * the transport bar, the four observation panels start-up binds, and the
 * share and settings dialogs (D-INDEX-01, Option B). And two that ship with
 * on-demand code but stay, because the suite reads them before that code
 * loads: the binary-run panel, which lessons and specs drive in the same task
 * as the rebuild that fetches its module, and the lesson browser, whose
 * activities link is read at boot.
 */
export const STATIC_SET = [
  'a.skip-link',
  'header.gs-shell',
  'main#mainContent',
  'div#recordingBadge',
  'div#updateBadge',
  'p#srStatus',
  'div#rvContainer',
  'div#binaryRunContainer',
  'div#astrometryContainer',
  'div#rotationCurveContainer',
  'div#lightCurveContainer',
  'div#splash',
  'div#welcomeScreen',
  'div#overlay',
  'div#scenarioInfoDisplay',
  'div#scenarioInfoBox',
  'div#mobileInstructions',
  'div#mainControls',
  'div#placementStatus',
  'div#timelineBar',
  'button#mobileMenuToggle',
  'div#investigationBrowser',
  'div#shareModal',
  'div#settingsPanel',
  'div#pinnedInspectors',
  'button#tutorialBtn',
  'a#embedOpenFull',
  'footer#attribution',
];

/** @returns {string} index.html as it is on disk */
export const indexHtml = () =>
  readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/**
 * A fragment's markup, read from its file or from its module's source.
 *
 * Read as text rather than imported: the modules reach the DOM at load, and
 * nothing that reads this list has one. A template is held to having no
 * substitution and no escape, so its text is exactly what the page inserts.
 *
 * @param {Object} entry - One of FRAGMENTS
 * @returns {string} The markup
 */
export function fragmentMarkup(entry) {
  if (entry.kind === 'file') {
    return readFileSync(
      path.join(ROOT, 'js', 'fragments', `${entry.host}.html`),
      'utf8'
    );
  }
  const src = readFileSync(path.join(ROOT, entry.owner), 'utf8');
  const m = new RegExp(`export const ${entry.name} = \`([^\`]*)\`;`).exec(src);
  if (!m) throw new Error(`${entry.owner} exports no ${entry.name} template`);
  if (/\$\{|\\/.test(m[1])) {
    throw new Error(
      `${entry.owner} ${entry.name}: a fragment template takes no \${} and no backslash`
    );
  }
  return m[1];
}

/**
 * index.html with every host followed by its fragment, as the document is
 * once every family has mounted. The hosts stay, as they do in the page.
 *
 * @param {string} [html] - The page, if not the one on disk
 * @returns {string} The assembled document
 */
export function assembledIndexHtml(html = indexHtml()) {
  let out = html;
  for (const entry of FRAGMENTS) {
    const tag = `<template data-host="${entry.host}"></template>`;
    if (!out.includes(tag)) throw new Error(`index.html has no ${tag}`);
    out = out.replace(tag, () => `${tag}\n${fragmentMarkup(entry)}`);
  }
  return out;
}
