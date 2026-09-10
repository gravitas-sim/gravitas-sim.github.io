// =============================================================================
// Opening a classroom activity from a link
// -----------------------------------------------------------------------------
// A link is `#activity=<activity>/<format>` - short, readable, and something an
// instructor can type into a slide or an LMS without a base64 blob in it.
//
// Why not a prepared assignment link
// -----------------------------------------------------------------------------
// Because a built-in activity is not issued once and archived; it ships with
// the application and has to keep working as the lesson under it is revised. An
// encoded assignment carries per-step fingerprints taken when the link was
// made, so a link generated at build time would start reporting "3 steps
// changed" the first time somebody edited a sentence in the lesson - true, and
// useless, because the activity is not a snapshot of the lesson. Building the
// assignment here, from the lesson as it is now, means the activity is always
// current and the fingerprints always agree.
//
// Everything after that is the ordinary assignment path: the same runner, the
// same progress store keyed by the assignment id, the same printable page.
// =============================================================================

import { t, getLocale, registerMessages } from '../i18n/index.js';

/**
 * Make the activity prose available to the sandbox's catalogue.
 *
 * The titles and the format introductions live in the teaching page's own
 * message file, which the sandbox deliberately does not carry: it is 6KB of
 * instructor prose that a student loading the simulation has no use for. An
 * activity link is the one path that needs a few of those strings inside the
 * application, so they are registered here - on that path only, after the
 * import that already had to happen.
 *
 * Without this the assignment header showed the message id.
 */
async function ensureActivityMessages() {
  const locale = getLocale();
  const module =
    locale === 'es'
      ? await import('../i18n/es.teaching.js')
      : await import('../i18n/en.teaching.js');
  registerMessages(locale, module.ES_TEACHING || module.EN_TEACHING);
}

/** Does the address bar name an activity? */
export const activityInHash = hash =>
  /^#activity=[a-z0-9-]+(\/[a-z0-9-]+)?$/i.test(String(hash || ''));

/**
 * What the fragment asks for.
 * @param {string} hash - location.hash
 * @returns {?{activity: string, format: ?string}} The request, or null
 */
export function parseActivityHash(hash) {
  const match = /^#activity=([a-z0-9-]+)(?:\/([a-z0-9-]+))?$/i.exec(
    String(hash || '')
  );
  if (!match) return null;
  return { activity: match[1], format: match[2] || null };
}

/**
 * Open the activity the address bar names.
 *
 * A request that cannot be honoured says so and sends the reader to the page
 * that lists what does exist. It never opens a different activity and never
 * opens an empty lesson: both are worse than an error, because both look like
 * success.
 *
 * @returns {Promise<boolean>} True if a format was opened
 */
export async function openActivityFromUrl() {
  const request = parseActivityHash(location.hash);
  if (!request) return false;

  const [
    { activityById, formatById },
    logic,
    investigations,
    registry,
    { toast },
  ] = await Promise.all([
    import('../data/activities.js'),
    import('./activities.js'),
    import('../investigations.js'),
    import('../data/investigations/registry.js'),
    import('../controls.js'),
    import('../i18n/deferredMessages.js').then(m =>
      m.ensureDeferredMessages().catch(() => {})
    ),
  ]);

  await ensureActivityMessages();

  const activity = activityById(request.activity);
  if (!activity) {
    toast(t('activity.error.noActivity', { id: request.activity }));
    return false;
  }

  // No format named: the page that lists them is the right answer, not a guess
  // at which one they meant.
  if (!request.format) {
    toast(t('activity.error.noFormat', { id: '' }));
    return false;
  }

  const format = formatById(activity, request.format);
  if (!format) {
    toast(t('activity.error.noFormat', { id: request.format }));
    return false;
  }

  // The merged lesson in the reader's language, from the same loader the panel
  // uses - so the assignment is built against exactly what will be shown.
  const lesson = await registry.loadInvestigation(activity.lesson);
  const built = logic.assignmentForFormat(
    lesson,
    activity,
    format,
    t(activity.titleId),
    t(format.introId)
  );
  if (!built.ok) {
    toast(t('activity.error.notUsable'));
    return false;
  }

  const opened = await investigations.openInvestigation(activity.lesson, {
    assignment: built.assignment,
  });
  if (opened && opened.ok === false) {
    toast(t(`assign.error.${opened.reason}`));
    return false;
  }
  return true;
}
