// =============================================================================
// The Motion row of the Settings panel
// -----------------------------------------------------------------------------
// The device-local override of the system's reduced-motion setting
// (js/quality.js, INTERACTION.md "Reduced motion"). Its own module, fetched when
// the panel is first built, with its own strings (js/i18n/en.interaction.js),
// for the reason js/precisePlacement.js keeps its strings out of the catalogs
// that every route embeds.
//
// It imports nothing statically, and that is deliberate: a lazy module whose
// static imports are modules the start-up graph already holds makes the bundler
// split those into a shared chunk, which costs every route a request. What it
// needs arrives in `services` from js/settingsPanel.js.
//
// The choice takes effect at once, unlike the course level beside it: a reader
// who asks for less motion should not have to find Apply first. Choosing
// 'step' also pauses the world, because that is what the mode promises.
// =============================================================================

/** Locales whose strings are already registered: a repeat would re-render. */
const loaded = new Set();

/**
 * Bring in the row's strings for the locale in use.
 * @param {object} services - See fillMotionRow
 * @returns {Promise<void>} Resolves once t() can answer
 */
async function ensureMessages({ getLocale, registerMessages }) {
  const locale = getLocale();
  if (loaded.has(locale)) return;
  loaded.add(locale);
  const module =
    locale === 'es'
      ? await import('./i18n/es.interaction.js')
      : await import('./i18n/en.interaction.js');
  registerMessages(locale, module.ES_INTERACTION || module.EN_INTERACTION);
}

/**
 * Fill an empty element with the Motion select and its hint.
 * @param {HTMLElement} host - The row, already in the panel
 * @param {object} services - What the panel already holds: t, getLocale,
 *   registerMessages, announce, modes, preference(), setPreference(mode) and
 *   pause()
 * @returns {Promise<void>}
 */
export async function fillMotionRow(host, services) {
  const { t, announce, modes, preference, setPreference, pause } = services;
  await ensureMessages(services);
  const label = document.createElement('label');
  label.htmlFor = 'settingsMotion';
  label.textContent = t('motion.label');
  const select = document.createElement('select');
  select.id = 'settingsMotion';
  select.setAttribute('aria-describedby', 'settingsMotionHint');
  for (const mode of modes) {
    const option = document.createElement('option');
    option.value = mode;
    option.textContent = t(`motion.mode.${mode}`);
    option.selected = mode === preference();
    select.appendChild(option);
  }
  const hint = document.createElement('p');
  hint.id = 'settingsMotionHint';
  hint.className = 'settings-level-hint';
  hint.textContent = t('motion.hint');
  select.onchange = () => {
    setPreference(select.value);
    if (select.value === 'step') pause();
    announce(t(`motion.changed.${select.value}`));
  };
  host.replaceChildren(label, select, hint);
}
