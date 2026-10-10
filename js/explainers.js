// =============================================================================
// "What am I looking at?"
// -----------------------------------------------------------------------------
// Every instrument family and every kind of plot has an explainer: four short
// answers about the picture in front of the reader - what its axes are, what a
// feature of it means, what to read off it and what it cannot show. They are
// shown on demand, from a button on the docked panel and from a plot's help
// button, and never unbidden: an explainer that opens by itself is one more
// thing in the way of the first look.
//
// A lazy module with its words in two lazy files (./explain/en.js, es.js),
// fetched the first time a reader presses the button and, for Spanish, only
// then. Nothing here is reachable from the start-up path.
// =============================================================================

import { getLocale } from './i18n/index.js';

/** The four answers, in order, as the reader is told what each is. */
const LABELS = {
  en: [
    'What the axes are',
    'What a feature means',
    'What to read off it',
    'What it cannot show',
  ],
  es: [
    'Qué son los ejes',
    'Qué significa un rasgo',
    'Qué se lee en ella',
    'Qué no puede mostrar',
  ],
};

/** The name of the region, per language. */
const TITLE = { en: 'What am I looking at?', es: '¿Qué estoy viendo?' };

/**
 * The instruments each family owns, by the ids a step names (the registry's
 * LAZY_FAMILIES in js/widgets.js, which tests/explainers.test.js holds this to).
 */
export const FAMILY_IDS = Object.freeze({
  energy: ['launch', 'live-energy', 'escape-compare', 'shapes'],
  binary: ['binary', 'binary-compare', 'balance', 'visual-binary'],
  blackHole: [
    'bh-horizon',
    'bh-scaling',
    'bh-escape',
    'bh-density',
    'bh-blocks',
    'bh-thermo',
    'bh-lifetime',
    'bh-lineup',
  ],
  habitability: [
    'hz-insolation',
    'hz-spreading',
    'hz-star',
    'hz-boundaries',
    'hz-orbit',
    'hz-trappist',
    'hz-candidates',
  ],
  exoplanet: [
    'reflex-motion',
    'rv-observer',
    'rv-mass',
    'rv-inclination',
    'astrometry-signature',
    'method-comparison',
    'planet-characterization',
    'survey-schedule',
    'transit-noise',
  ],
  tidal: [
    'tide-vectors',
    'tide-strength',
    'tide-compare',
    'tide-balance',
    'roche-model',
    'tide-disrupt',
  ],
  darkMatter: [
    'dm-shapes',
    'dm-enclosed',
    'dm-fit',
    'dm-flyby',
    'dm-virial',
    'dm-budget',
    'dm-mond',
  ],
  chaos: ['chaos-divergence'],
  resonance: [
    'resonance-periods',
    'resonance-angle',
    'resonance-conjunctions',
    'resonance-frame',
  ],
  stellar: ['stellar-lab', 'stellar-compare', 'stellar-population'],
  stellarEvolution: ['stellar-evolution'],
  observing: ['observing-planner'],
  spectra: ['spectra-compare', 'spectra-identify'],
  transit: ['depth-size', 'geometry', 'spectrum', 'dilution', 'resolve'],
  powerLaw: [
    'power-law-precession',
    'power-law-refinement',
    'power-law-kepler',
    'power-law-conservation',
  ],
  gw: ['gw-lab', 'gw-real'],
  light: ['blackbody'],
  sky: [
    'sky-turning',
    'sky-seasons',
    'sky-phases',
    'sky-eclipses',
    'sky-wanderers',
    'sky-plan',
  ],
  gwEvents: ['gw-events'],
});

/**
 * The explainer an instrument id belongs to: its family's.
 * @param {string} widgetId - An id a step's `tool` names
 * @returns {?string} A key into the explainers
 */
export const explainerKeyFor = widgetId =>
  Object.keys(FAMILY_IDS).find(k => FAMILY_IDS[k].includes(widgetId)) ?? null;

const loaded = {};

/**
 * One explainer's four answers.
 * @param {string} key - An explainer key
 * @param {string} [locale] - Defaults to the reader's
 * @returns {Promise<?string[]>} Axes, meaning, what to read, what it cannot show
 */
export async function explainerFor(key, locale = getLocale()) {
  const lang = locale === 'es' ? 'es' : 'en';
  loaded[lang] ??= (
    lang === 'es'
      ? await import('./explain/es.js')
      : await import('./explain/en.js')
  ).default;
  return loaded[lang][key] ?? null;
}

let counter = 0;

/**
 * Show or hide an explainer beside a control.
 *
 * Built as a labelled region the button controls (aria-expanded, aria-controls)
 * so it is reached by keyboard and named by a screen reader, and left where it
 * is until asked again: focus stays on the button.
 *
 * @param {HTMLElement} button - The control that asked
 * @param {string} key - An explainer key
 * @param {HTMLElement} [host] - Which element the region follows (the button)
 * @returns {Promise<boolean>} Whether it is now showing
 */
export async function toggleExplainer(button, key, host = button) {
  const old = host.nextElementSibling?.classList.contains('explainer')
    ? host.nextElementSibling
    : null;
  if (old) {
    old.remove();
    button.setAttribute('aria-expanded', 'false');
    return false;
  }
  const lang = getLocale() === 'es' ? 'es' : 'en';
  const words = await explainerFor(key, lang);
  if (!words) return false;
  const region = document.createElement('div');
  region.className = 'explainer';
  region.id = `explainer-${++counter}`;
  region.setAttribute('role', 'region');
  region.setAttribute('aria-label', TITLE[lang]);
  const list = document.createElement('dl');
  words.forEach((text, i) => {
    const dt = document.createElement('dt');
    dt.textContent = LABELS[lang][i];
    const dd = document.createElement('dd');
    dd.textContent = text;
    list.append(dt, dd);
  });
  region.append(list);
  host.after(region);
  button.setAttribute('aria-expanded', 'true');
  button.setAttribute('aria-controls', region.id);
  return true;
}
