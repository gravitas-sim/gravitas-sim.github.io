// =============================================================================
// Opening an investigation link
// -----------------------------------------------------------------------------
// Prompt 78 (REMIX.md), delivery (a). Loaded only when the address bar holds an
// investigation fragment (`#i1z...`, js/investigationsLoader.js packInHash).
//
// What is opened is data: the link is read as a pack (a remix is laid over the
// faithful copy of its original first), judged by the format's rules and, for a
// remix, by what a remix may not change, compiled, and handed to the engine
// under an id made from the pack's id and version, so progress, the report and
// the token are this pack's and no other's. Nothing in a pack is run; the only
// code that runs is the original's, by reference.
//
// It reaches the engine only through js/investigations.js (packFacts, imported
// dynamically as every bridge does): another route to the registry or the
// scenario catalog, or a static import, splits chunks a lesson loads, and the
// route budgets count them.
//
// Never throws: a bad link must leave a working application and say what was
// wrong in the reader's language.
// =============================================================================

import { t, registerMessages } from '../i18n/index.js';

/** The pack, judged and compiled: {ok, compiled} or {ok: false, errors}. */
export async function compilePack(pack, facts) {
  const [{ validateInvestigationPack }, { WIDGET_IDS }, core, platform] =
    await Promise.all([
      import('../platform/investigation.js'),
      import('../composer/widgetIds.js'),
      import('../composer/remixCore.js'),
      import('../platform/remix.js'),
    ]);
  const api = {
    locales: ['en', 'es'],
    entities: Object.keys(facts.ENTITIES),
    scenarios: facts.scenarios,
    scenarioId: facts.scenarioId,
    widgets: [...WIDGET_IDS],
    lessons: facts.lessons,
    units: Object.fromEntries(
      Object.entries(facts.UNITS).map(([k, v]) => [k, Object.keys(v)])
    ),
  };
  let errors = validateInvestigationPack(pack, api);
  const scenarioApi = { scenarios: {}, scenarioId: facts.scenarioId };
  if (pack && typeof pack.derivedFrom === 'object' && pack.derivedFrom) {
    const original = await load(pack.derivedFrom.id, facts, core);
    errors = core.judgeWith(pack, errors, api, original);
    if (errors.length) return { ok: false, errors };
    return {
      ok: true,
      compiled: core.compileWith(pack, original, scenarioApi),
    };
  }
  if (errors.length) return { ok: false, errors };
  const { compileInvestigation } = await import('../composer/compile.js');
  const compiled = compileInvestigation(pack, scenarioApi);
  compiled.lesson.id = platform.remixLessonId(pack);
  compiled.lesson.pack = platform.packIdentity(pack);
  return { ok: true, compiled };
}

/** The built-in a remix names, as the engine has it. */
async function load(id, facts, core) {
  const { withDepth } = await import('../investigations/depth.js');
  return core.originalWith(id, {
    loadInvestigation: facts.loadInvestigation,
    withDepth,
  });
}

/**
 * Open whatever investigation the address bar names.
 * @returns {Promise<boolean>} Whether one was opened
 */
export async function openPackFromUrl() {
  // Dynamic, like every bridge's: a static import splits a chunk a lesson loads.
  const facts = (await import('../investigations.js')).packFacts();
  const [{ toast }, { readPackFragment }, { EN_REMIX }, { ES_REMIX }] =
    await Promise.all([
      import('../notify.js'),
      import('../composer/packLink.js'),
      import('../i18n/en.remix.js'),
      import('../i18n/es.remix.js'),
    ]);
  registerMessages('en', EN_REMIX);
  registerMessages('es', ES_REMIX);
  const fail = (field, message) =>
    toast(t('remix.error.invalid', { field, message })) && false;

  const read = await readPackFragment(location.hash);
  if (!read.ok) return toast(t(`remix.error.${read.reason}`)) && false;
  let pack = read.pack;
  if (read.delta) {
    const [core, { applyDelta }] = await Promise.all([
      import('../composer/remixCore.js'),
      import('../platform/remix.js'),
    ]);
    const from = String(read.delta.from?.id);
    const original = await load(from, facts, core);
    if (!original)
      return toast(t('remix.error.noOriginal', { id: from })) && false;
    const base = await core.remixOf(original, from, { id: 'base' });
    const laid = applyDelta(read.delta, base.pack);
    if (!laid.ok) return fail(laid.path, laid.message);
    pack = laid.pack;
  }
  const got = await compilePack(pack, facts);
  if (!got.ok) return fail(got.errors[0].path, got.errors[0].message);
  const { lesson, shadow } = got.compiled;
  facts.provideLessonLoaders(lesson.id, {
    lesson: () => Promise.resolve({ default: lesson }),
    translations: shadow
      ? { es: () => Promise.resolve({ default: shadow }) }
      : {},
  });
  const opened = await facts.openInvestigation(lesson.id);
  if (opened?.ok === false) return fail('', opened.reason);
  if (pack.derivedFrom)
    toast(
      t('remix.notice.opened', {
        title: lesson.title,
        original: pack.derivedFrom.id,
      })
    );
  return true;
}
