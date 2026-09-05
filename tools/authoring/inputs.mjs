// =============================================================================
// Everything the authoring checks read
// -----------------------------------------------------------------------------
// Gathered in one place so that the rules themselves are a pure function of
// their inputs, and so that the CLI, the Jest suite and the browser walker all
// look at exactly the same catalogue.
//
// All of this imports in Node. The lessons are content modules with no imports
// at all, the widget registry is arithmetic and canvas-drawing closures that
// are never called here, and js/answerCheck.js was already extracted precisely
// so that a build script could judge an answer the way the site does. The one
// thing that does need a browser - js/investigations.js, the lesson engine - is
// deliberately not imported: what it does is covered by the browser walker.
// =============================================================================

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { INVESTIGATIONS } from '../../js/data/investigations.js';
import { MANIFEST as MANIFEST_EN } from '../../js/data/investigations/manifest.js';
import { MANIFEST as MANIFEST_ES } from '../../js/data/investigations/manifest.es.js';
import { INSTRUCTOR_CONTENT } from '../../js/data/instructorContent.js';
import { SCENARIO_INFO } from '../../js/data/scenarioInfo.js';
import { DEFAULT_SETTINGS } from '../../js/appState.js';
import { allWidgets } from '../../js/widgets.js';
import { gradedSteps } from '../../js/data/investigations/catalogue.js';

export const LESSON_DIR = 'js/data/investigations';
export const LOCALES = ['es'];

/**
 * Read every input the rules need.
 *
 * @returns {Promise<object>} The catalogue and everything it is checked against
 */
export async function loadAuthoringInputs() {
  const translations = {};
  for (const locale of LOCALES) {
    translations[locale] = {};
    const dir = path.posix.join(LESSON_DIR, locale);
    let entries = [];
    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!name.endsWith('.js')) continue;
      const id = name.replace(/\.js$/, '');
      const mod = await import(`../../${dir}/${name}`);
      translations[locale][id] = { data: mod.default, file: `${dir}/${name}` };
    }
  }

  const sources = {};
  for (const inv of INVESTIGATIONS) {
    const file = `${LESSON_DIR}/${inv.id}.js`;
    try {
      sources[inv.id] = { file, text: await readFile(file, 'utf8') };
    } catch {
      sources[inv.id] = { file, text: null };
    }
  }

  return {
    investigations: INVESTIGATIONS,
    manifests: { en: MANIFEST_EN, es: MANIFEST_ES },
    instructor: INSTRUCTOR_CONTENT,
    scenarios: SCENARIO_INFO,
    settingKeys: new Set(Object.keys(DEFAULT_SETTINGS)),
    widgets: allWidgets(),
    translations,
    sources,
    gradedSteps,
  };
}
