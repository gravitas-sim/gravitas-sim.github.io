// =============================================================================
// What an investigation pack is checked against: this build of Gravitas
// -----------------------------------------------------------------------------
// js/platform/investigation.js and js/platform/questionBank.js are pure and
// take what they need to know as `api`; this assembles it - the interface's
// languages, the entities lesson prose may use, the scenarios and instruments
// a step may open, the lessons a pack may not share an id with, and the units
// the answer parser reads - for the Studio's composer, the tests and the SDK.
//
// checkInvestigationPack() is the whole verdict: the format's own rules, then
// the compiled lesson through js/authoring/rules.js, the checker every lesson
// in the repository passes. The rules read the instruments a lesson docks, so
// the families of the tools the pack uses - and only those - are fetched first.
// =============================================================================

import { SCENARIO_INFO, scenarioId } from '../data/scenarioInfo.js';
import { MANIFEST } from '../data/investigations/manifest.js';
import { gradedSteps } from '../data/investigations/catalog.js';
import { SETTING_KEYS } from '../data/settingKeys.js';
import { WIDGET_FAMILIES, WIDGET_IDS } from './widgetIds.js';
import { ENTITIES } from '../lessonMarkup.js';
import { UNITS } from '../answerParse.js';
import { validateInvestigationPack } from '../platform/investigation.js';
import { compileInvestigation, judge } from './compile.js';

export { WIDGET_FAMILIES, WIDGET_IDS };

let api = null;
/** The `api` the pack and bank validators take. */
export function packApi() {
  api ??= Object.freeze({
    locales: ['en', 'es'],
    entities: Object.keys(ENTITIES),
    scenarios: Object.keys(SCENARIO_INFO),
    scenarioId,
    widgets: [...WIDGET_IDS],
    lessons: MANIFEST.map(m => m.id),
    units: Object.fromEntries(
      Object.entries(UNITS).map(([dim, table]) => [dim, Object.keys(table)])
    ),
  });
  return api;
}

/** Whether the answer parser reads a unit, which is the common case. */
const parserReads = text =>
  text === '' ||
  Object.values(UNITS).some(t => Object.hasOwn(t, String(text).toLowerCase()));

/** Every `unit` a pack states: measure fields and bank items. */
function unitTexts(pack) {
  const fields = Array.isArray(pack?.steps)
    ? pack.steps.flatMap(s => (Array.isArray(s?.fields) ? s.fields : []))
    : [];
  const items = Array.isArray(pack?.bank?.items) ? pack.bank.items : [];
  return [...fields, ...items].map(f => f?.unit).filter(u => u !== undefined);
}

/**
 * The `isUnit` the validators ask. The registry is a module the Studio's
 * composer page does not otherwise carry (a request and some kilobytes on a
 * route with no room), so it is fetched only for a pack that states a unit the
 * answer parser does not already read; every unit the parser reads is in it.
 *
 * @param {object} pack - A parsed pack
 * @returns {Promise<(text: string) => boolean>}
 */
async function unitCheck(pack) {
  if (unitTexts(pack).every(u => typeof u !== 'string' || parserReads(u)))
    return parserReads;
  return (await import('../units/registry.js')).isUnit;
}

/**
 * The whole verdict on a pack.
 *
 * @param {object} pack - A parsed pack
 * @returns {Promise<{errors: Array, findings: Array, compiled: ?object}>}
 *   `errors` are the format's, each on a path; `findings` are the lesson
 *   checker's on the compiled lesson, each on a step index. A pack with errors
 *   is not compiled.
 */
export async function checkInvestigationPack(pack) {
  let errors = validateInvestigationPack(pack, {
    ...packApi(),
    isUnit: await unitCheck(pack),
  });
  // A remix is also judged against the built-in it was made from
  // (./remixApi.js, loaded only for a pack that says it has one).
  const remix =
    pack && typeof pack.derivedFrom === 'object' && pack.derivedFrom
      ? await import('./remixApi.js')
      : null;
  let original = null;
  if (remix)
    ({ errors, original } = await remix.judgeRemix(pack, errors, packApi()));
  if (errors.length) return { errors, findings: [], compiled: null };
  const compiled = remix
    ? remix.compileRemixed(pack, original)
    : compileInvestigation(pack, { scenarios: SCENARIO_INFO, scenarioId });
  // The instrument registry only when a step docks one: importing it fetches
  // the deferred catalogs of words (./widgetIds.js), and a pack with no
  // instrument has nothing for the rules to look up.
  const tools = [
    ...new Set(pack.steps.flatMap(s => (s.tool ? [s.tool.id] : []))),
  ];
  const [{ checkCatalog }, registry] = await Promise.all([
    import('../authoring/rules.js'),
    tools.length ? import('../widgets.js') : null,
  ]);
  if (registry) await Promise.all(tools.map(id => registry.ensureWidget(id)));
  const findings = judge(compiled, {
    checkCatalog,
    scenarios: SCENARIO_INFO,
    scenarioId,
    widgets: registry ? registry.allWidgets() : [],
    settingKeys: new Set(SETTING_KEYS),
    gradedSteps,
  });
  return { errors, findings, compiled };
}
