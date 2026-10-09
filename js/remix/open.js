// =============================================================================
// Opening an investigation link
// -----------------------------------------------------------------------------
// Prompt 78 (REMIX.md), delivery (a). Loaded only when the address bar holds an
// investigation fragment (`#i1z...`, js/investigationsLoader.js
// packInHash), so a student who is never sent one pays nothing.
//
// What is opened is data. The link is read as a pack (a remix is laid over the
// faithful copy of its original first), judged by the format's own rules and,
// for a remix, by what a remix may not change, and compiled into the lesson the
// engine runs. It enters the engine through the door a packaged lesson uses
// (provideLessonLoaders), under an id made from the pack's id and version, so
// everything the engine keeps for a lesson - progress, the report, the token -
// is kept for this pack and no other. Nothing in a pack is ever run; the only
// code that runs is the original's, by reference, for a remix.
//
// Never throws: this runs at boot and on a pasted link, and a bad one must
// leave a working application and say what was wrong in the reader's language.
// =============================================================================

import { t, registerMessages } from '../i18n/index.js';

/**
 * Install a pack's compiled lesson in the registry the engine reads.
 *
 * @param {{lesson: object, shadow: ?object}} compiled
 */
export async function provide(compiled) {
  const { provideLessonLoaders } =
    await import('../data/investigations/registry.js');
  const { lesson, shadow } = compiled;
  provideLessonLoaders(lesson.id, {
    lesson: () => Promise.resolve({ default: lesson }),
    translations: shadow
      ? { es: () => Promise.resolve({ default: shadow }) }
      : {},
  });
}

/**
 * Judge and compile a pack, from a link or from anywhere else.
 *
 * @param {object} pack - Parsed, not yet judged
 * @returns {Promise<{ok: true, compiled: object, original: ?object}|
 *   {ok: false, errors: Array}>}
 */
export async function compilePack(pack) {
  const [{ validateInvestigationPack }, { packApi }] = await Promise.all([
    import('../platform/investigation.js'),
    import('../composer/api.js'),
  ]);
  const api = packApi();
  let errors = validateInvestigationPack(pack, api);
  const derived =
    pack && typeof pack.derivedFrom === 'object' && pack.derivedFrom;
  const remix = derived ? await import('../composer/remixApi.js') : null;
  let original = null;
  if (remix) ({ errors, original } = await remix.judgeRemix(pack, errors, api));
  if (errors.length) return { ok: false, errors };
  const compiled = remix
    ? remix.compileRemixed(pack, original)
    : await compileOwn(pack);
  return { ok: true, compiled, original };
}

/** A pack written from scratch, under the namespaced id every remix has. */
async function compileOwn(pack) {
  const [
    { compileInvestigation },
    { remixLessonId, packIdentity },
    { SCENARIO_INFO, scenarioId },
  ] = await Promise.all([
    import('../composer/compile.js'),
    import('../platform/remix.js'),
    import('../data/scenarioInfo.js'),
  ]);
  const compiled = compileInvestigation(pack, {
    scenarios: SCENARIO_INFO,
    scenarioId,
  });
  compiled.lesson.id = remixLessonId(pack);
  compiled.lesson.pack = packIdentity(pack);
  return compiled;
}

/**
 * Open whatever investigation the address bar names.
 *
 * @returns {Promise<boolean>} Whether one was opened
 */
export async function openPackFromUrl() {
  const [{ toast }, { readPackFragment }, { EN_REMIX }, { ES_REMIX }] =
    await Promise.all([
      import('../notify.js'),
      import('../composer/packLink.js'),
      import('../i18n/en.remix.js'),
      import('../i18n/es.remix.js'),
    ]);
  registerMessages('en', EN_REMIX);
  registerMessages('es', ES_REMIX);

  const read = await readPackFragment(location.hash);
  if (!read.ok) {
    toast(t(`remix.error.${read.reason}`));
    return false;
  }
  let pack = read.pack;
  if (read.delta) {
    const { remixBuiltin } = await import('../composer/remixApi.js');
    const { applyDelta } = await import('../platform/remix.js');
    const made = await remixBuiltin(String(read.delta.from?.id), {
      id: 'base',
    }).catch(() => null);
    if (!made) {
      toast(t('remix.error.noOriginal', { id: String(read.delta.from?.id) }));
      return false;
    }
    const laid = applyDelta(read.delta, made.pack);
    if (!laid.ok) {
      toast(
        t('remix.error.invalid', { field: laid.path, message: laid.message })
      );
      return false;
    }
    pack = laid.pack;
  }
  const got = await compilePack(pack);
  if (!got.ok) {
    const first = got.errors[0];
    toast(
      t('remix.error.invalid', { field: first.path, message: first.message })
    );
    return false;
  }
  await provide(got.compiled);
  const { openInvestigation } = await import('../investigations.js');
  const opened = await openInvestigation(got.compiled.lesson.id);
  if (opened && opened.ok === false) {
    toast(t('remix.error.invalid', { field: '', message: opened.reason }));
    return false;
  }
  if (pack.derivedFrom)
    toast(
      t('remix.notice.opened', {
        title: got.compiled.lesson.title,
        original: pack.derivedFrom.id,
      })
    );
  return true;
}
