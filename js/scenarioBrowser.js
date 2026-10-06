// =============================================================================
// The scenario gallery
// -----------------------------------------------------------------------------
// The catalog outgrew its list. Forty-three scenarios presented as title-plus-
// paragraph cards is a wall of text you scroll past rather than read, and it
// answers only "what exists?".
//
// This answers two better questions: "what should I explore?" and, for someone
// planning a week of teaching, "what can I use for this concept?". Hence the
// concept chips across the top. They are the same tags carried in the catalog,
// which makes the gallery a lightweight curriculum index without a separate
// instructor-only feature existing anywhere.
//
// Nothing here loads a scenario itself. The module is handed an onSelect
// callback and calls it; ui.js owns the one authoritative loadScenarioByKey().
// =============================================================================

import { SCENARIO_INFO } from './data/scenarioInfo.js';
import { SCENARIO_TAGS, TAG_ORDER } from './data/scenarioTags.js';
import {
  scenarioTitle,
  scenarioSummary,
  tagLabelLocalized as tagLabel,
  tagDescription,
} from './i18n/scenario.js';
import { t, onLocaleChange } from './i18n/index.js';
import { mountFragment } from './i18n/deferredMessages.js';

/**
 * The scenario gallery, inserted at its host in index.html by initScenarioBrowser() before
 * anything is bound to it (INDEX_DECOMPOSITION.md).
 */
export const SCENARIO_LIST_MARKUP = `<!--
Scenario gallery. Cards, concept chips, counts and the result line are all
written by js/scenarioBrowser.js from the catalog in
js/data/scenarioInfo.js: no scenario title, summary, tag or count is
spelled out here, so nothing in this file can go stale.
-->
<div id="scenarioListModal" class="hidden" hidden inert>
<div
id="scenarioListContent"
role="dialog"
aria-modal="true"
aria-labelledby="scenarioBrowserTitle"
>
<div class="sc-head">
<div class="sc-head-text">
<h3
id="scenarioBrowserTitle"
data-i18n="gallery.scenarioBrowserTitle"
>
Explore scenarios
</h3>
<p id="scenarioBrowserSubtitle" class="sc-subtitle"></p>
</div>
<button
id="closeScenarioList"
class="ui-button"
title="Close the scenario gallery"
data-i18n-title="gallery.closeScenarioList.hint"
>
×
</button>
</div>
<button
class="floating-close-chip"
id="scenarioListCloseChip"
aria-label="Close"
title="Close the scenario gallery"
data-i18n-title="gallery.scenarioListCloseChip.hint"
data-i18n-aria-label="gallery.scenarioListCloseChip.label"
>
✕
</button>

<div class="scenario-search-wrap">
<span class="scenario-search-icon" aria-hidden="true">⌕</span>
<input
type="search"
id="scenarioSearch"
placeholder="Search scenarios, objects, or concepts…"
autocomplete="off"
aria-label="Search scenarios"
title='Filter by name, description or concept. Try "neutron", "merger", "tides" or "kepler". Enter loads the first result.'
data-i18n-title="gallery.scenarioSearch.hint"
data-i18n-aria-label="gallery.scenarioSearch.label"
data-i18n-placeholder="gallery.scenarioSearch.placeholder"
/>
</div>

<div class="sc-concepts">
<p
class="sc-concepts-label"
id="scenarioConceptsLabel"
data-i18n="gallery.scenarioConceptsLabel"
>
Browse by concept
</p>
<div
id="scenarioTagChips"
class="sc-chips"
role="group"
aria-labelledby="scenarioConceptsLabel"
></div>
<p id="scenarioConceptNote" class="sc-concept-note" hidden=""></p>
</div>

<p
id="scenarioResultCount"
class="sc-count"
role="status"
aria-live="polite"
></p>

<div id="scenarioListScroll" class="sc-scroll">
<div id="scenarioListItems" class="sc-grid"></div>
<p id="scenarioSearchEmpty" class="scenario-search-empty" hidden="">
No scenarios match that search. Try a different word, or choose
<strong data-i18n="gallery.scenarioSearchEmpty">All</strong> above.
</p>
</div>
</div>
</div>
`;

const ALL = 'all';

let els = {};
let onSelect = null;
let activeTag = ALL;
let query = '';

/**
 * js/dialog.js, fetched on the first open rather than with the page: the
 * gallery is initialized at start-up, and the dialog machinery is not start-up
 * code. Primed when a reader points at or focuses the button, so the press
 * finds it here.
 */
let dialogs = null;
const loadDialogs = async () => (dialogs ??= await import('./dialog.js'));
const primeDialogs = () => loadDialogs().catch(() => {});

// --- The catalog, as the gallery sees it -------------------------------------

/**
 * Every scenario with its search text precomputed.
 *
 * Search covers the key, title, summary and both the ids and display names of
 * its tags, so "kepler" finds the Orbits & Kepler scenarios whether or not the
 * word appears in their prose, and "tides" finds the tidal ones.
 *
 * @returns {Array<Object>} key, info and a lowercased haystack
 */
export function catalogEntries() {
  return Object.entries(SCENARIO_INFO)
    .filter(([, info]) => info && typeof info === 'object')
    .map(([key, info]) => {
      const tags = Array.isArray(info.tags) ? info.tags : [];
      // The search index is built from the *displayed* strings, so a Spanish
      // reader searching Spanish words finds the card they can see. The key and
      // the tag ids stay in it as well, which keeps "kepler" and "tides"
      // working in any language - the key spaced too, so a reader who knows a
      // scenario by the name it was keyed by before ids still finds it.
      const haystack = [
        key,
        key.replace(/-/g, ' '),
        scenarioTitle(key),
        scenarioSummary(key),
        ...tags,
        ...tags.map(tagLabel),
      ]
        .join(' ')
        .toLowerCase();
      return { key, info, tags, haystack };
    });
}

/**
 * The scenarios matching a concept and a search string.
 *
 * The two combine as an intersection, which is the only behavior that needs no
 * explaining: pick your week's topic, then narrow it by name. Catalog order is
 * preserved inside a result set, because the front of the catalog is curated.
 *
 * @param {Object} [opts]
 * @param {string} [opts.tag] - A tag id, or 'all'
 * @param {string} [opts.search] - Free text
 * @returns {Array<Object>} Matching entries, in catalog order
 */
export function filterScenarios({ tag = ALL, search = '' } = {}) {
  const q = String(search || '')
    .trim()
    .toLowerCase();
  // An unknown tag id matches nothing rather than throwing or silently showing
  // everything: a typo in a link should look empty, not look like "All".
  const wantTag = tag && tag !== ALL ? tag : null;
  return catalogEntries().filter(entry => {
    if (wantTag && !entry.tags.includes(wantTag)) return false;
    if (q && !entry.haystack.includes(q)) return false;
    return true;
  });
}

/**
 * How many scenarios carry each tag.
 * @returns {Object} tag id -> count, including 'all'
 */
export function tagCounts() {
  const counts = { [ALL]: 0 };
  for (const id of TAG_ORDER) counts[id] = 0;
  for (const entry of catalogEntries()) {
    counts[ALL]++;
    for (const t of entry.tags) {
      if (t in counts) counts[t]++;
    }
  }
  return counts;
}

/**
 * The line above the grid: how many scenarios, and out of what.
 * @param {number} shown - Result count
 * @param {string} tag - Active tag id
 * @param {string} search - Active query
 * @returns {string} A sentence
 */
export function resultSummary(shown, tag, search) {
  const concept = tag && tag !== ALL ? tagLabel(tag) : '';
  // Four messages rather than one assembled from fragments. A sentence built by
  // concatenating " in " and " matching " cannot be reordered by a translator,
  // and Spanish wants the concept and the query in the other order from
  // English in at least one of these forms.
  if (search && concept)
    return t('gallery.results.searchInConcept', {
      n: shown,
      concept,
      query: search,
    });
  if (search) return t('gallery.results.search', { n: shown, query: search });
  if (concept) return t('gallery.results.concept', { n: shown, concept });
  return t('gallery.results.all', { n: shown });
}

// --- Markup ------------------------------------------------------------------

const escape = str =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** At most three pills on a card, with a count for the rest. */
function cardTags(tags) {
  const shown = tags.slice(0, 3);
  const rest = tags.length - shown.length;
  const pills = shown
    .map(t => `<span class="sc-pill">${escape(tagLabel(t))}</span>`)
    .join('');
  return `<span class="sc-card-tags">${pills}${
    rest > 0 ? `<span class="sc-pill is-more">+${rest}</span>` : ''
  }</span>`;
}

/**
 * The thumbnail block for a scenario, with its fallback underneath.
 *
 * Shared with the front door's featured cards so both surfaces show the same
 * capture, lazy-load it the same way, and degrade the same way when an image is
 * missing. Decorative alt: the card's own accessible name already says which
 * scenario this is, and describing the picture as well would make a screen
 * reader announce every card twice.
 *
 * @param {Object} info - A SCENARIO_INFO entry
 * @param {string} title - Shown in the fallback
 * @returns {string} HTML
 */
export function scenarioShotHtml(info, title) {
  return `<span class="sc-card-shot">
      <img src="${escape(info?.thumbnail || '')}" alt=""
           loading="lazy" decoding="async" width="640" height="360" />
      <span class="sc-card-fallback" aria-hidden="true">
        <span class="sc-card-fallback-mark">✧</span>
        <span class="sc-card-fallback-name">${escape(title)}</span>
      </span>
    </span>`;
}

/**
 * Make a missing or broken thumbnail show the fallback instead of the browser's
 * broken-image glyph. Call after inserting cards.
 * @param {Element} root - Container holding .sc-card-shot elements
 */
export function wireThumbnailFallbacks(root) {
  for (const img of root.querySelectorAll('.sc-card-shot img')) {
    const shot = img.closest('.sc-card-shot');
    if (!img.getAttribute('src')) {
      shot?.classList.add('is-missing');
      continue;
    }
    img.addEventListener('error', () => shot?.classList.add('is-missing'));
  }
}

function cardHtml(entry) {
  const { key, info, tags } = entry;
  const title = scenarioTitle(key) || key;
  // The whole card is the control, so the accessible name has to carry
  // everything a sighted user gets from scanning it.
  const label = `${title}. ${tags.map(tagLabel).join(', ')}.`;
  return `
    <button type="button" class="sc-card" data-scenario="${escape(key)}"
            aria-label="${escape(label)}" title="${escape(scenarioSummary(key) || title)}">
      ${scenarioShotHtml(info, title)}
      <span class="sc-card-body">
        <span class="sc-card-title">${escape(title)}</span>
        <span class="sc-card-summary">${escape(scenarioSummary(key) || '')}</span>
        ${cardTags(tags)}
      </span>
    </button>`;
}

function chipsHtml() {
  const counts = tagCounts();
  const chip = (id, label) => `
    <button type="button" class="sc-chip${activeTag === id ? ' is-active' : ''}"
            data-tag="${escape(id)}" aria-pressed="${activeTag === id}">
      ${escape(label)}<span class="sc-chip-count">${counts[id] ?? 0}</span>
    </button>`;
  return (
    chip(ALL, t('gallery.chip.all')) +
    TAG_ORDER.map(id => chip(id, tagLabel(id))).join('')
  );
}

// --- Rendering ---------------------------------------------------------------

/** Repaint the grid, the count line and the concept description. */
function renderResults() {
  if (!els.grid) return;
  const results = filterScenarios({ tag: activeTag, search: query });

  els.grid.innerHTML = results.map(cardHtml).join('');
  els.count.textContent = resultSummary(results.length, activeTag, query);
  els.empty.hidden = results.length > 0;

  // One line of context for the concept, so the chips read as a curriculum
  // index rather than as filters.
  const concept = activeTag !== ALL ? activeTag : null;
  els.concept.hidden = !concept;
  if (concept) els.concept.textContent = tagDescription(concept);

  wireThumbnailFallbacks(els.grid);
}

/** Repaint the concept chips. Only needed when the catalog or filter changes. */
function renderChips() {
  if (!els.chips) return;
  els.chips.innerHTML = chipsHtml();
}

// --- Behavior ----------------------------------------------------------------

function setTag(id) {
  activeTag = id in SCENARIO_TAGS || id === ALL ? id : ALL;
  renderChips();
  renderResults();
  // Scroll back to the top of the results: after switching concept the grid is
  // a different set, and staying at the old scroll position lands the reader in
  // the middle of it.
  if (els.scroller) els.scroller.scrollTop = 0;
}

function setQuery(next) {
  query = next;
  renderResults();
}

function choose(key) {
  if (!key) return;
  closeScenarioBrowser();
  onSelect?.(key);
}

/** Show the gallery. */
export async function openScenarioBrowser() {
  if (!els.modal || isScenarioBrowserOpen()) return;
  // Asked now, before the wait for the module: it is where the reader was.
  const trigger = document.activeElement;
  const { openDialog } = await loadDialogs();
  if (isScenarioBrowserOpen()) return;
  query = '';
  if (els.search) els.search.value = '';
  renderChips();
  renderResults();
  // Modal, focus kept inside it, the page behind it inert, Escape and the
  // backdrop close it and focus goes back where it came from: js/dialog.js.
  //
  // The search field is the fastest way in for anyone who already knows what
  // they want, and focusing it does not stop the chips being tabbed to.
  openDialog(els.content, {
    backdrop: els.modal,
    isolate: true,
    trigger,
    initialFocus: els.search,
  });
  if (els.scroller) els.scroller.scrollTop = 0;
}

/** Hide the gallery. */
export function closeScenarioBrowser() {
  // Loaded by definition: the gallery cannot be open without it.
  dialogs?.closeDialog(els.content);
}

/** @returns {boolean} True while the gallery is showing */
export const isScenarioBrowserOpen = () =>
  Boolean(els.modal) && !els.modal.classList.contains('hidden');

/**
 * Wire up the gallery. Safe to call once, from init.
 * @param {Object} opts
 * @param {Function} opts.onScenarioSelected - Called with the chosen key
 */
export function initScenarioBrowser({ onScenarioSelected } = {}) {
  mountFragment('scenario-list', SCENARIO_LIST_MARKUP);
  onSelect = onScenarioSelected;
  els = {
    modal: document.getElementById('scenarioListModal'),
    content: document.getElementById('scenarioListContent'),
    chips: document.getElementById('scenarioTagChips'),
    concept: document.getElementById('scenarioConceptNote'),
    count: document.getElementById('scenarioResultCount'),
    grid: document.getElementById('scenarioListItems'),
    empty: document.getElementById('scenarioSearchEmpty'),
    search: document.getElementById('scenarioSearch'),
    scroller: document.getElementById('scenarioListScroll'),
    subtitle: document.getElementById('scenarioBrowserSubtitle'),
  };
  if (!els.modal || !els.grid) return;

  // Never a hardcoded number: the catalog is the only place that knows.
  if (els.subtitle) {
    els.subtitle.textContent = t('gallery.subtitle', {
      n: Object.keys(SCENARIO_INFO).length,
    });
  }

  // The gallery holds rendered text, so it has to be repainted when the
  // language changes rather than only when the filter does.
  onLocaleChange(() => {
    if (!els.grid) return;
    if (els.subtitle) {
      els.subtitle.textContent = t('gallery.subtitle', {
        n: Object.keys(SCENARIO_INFO).length,
      });
    }
    renderChips();
    renderResults();
  });

  els.chips?.addEventListener('click', e => {
    const chip = e.target.closest('[data-tag]');
    if (chip) setTag(chip.dataset.tag);
  });

  els.grid.addEventListener('click', e => {
    const card = e.target.closest('[data-scenario]');
    if (card) choose(card.dataset.scenario);
  });

  els.search?.addEventListener('input', () => setQuery(els.search.value));
  els.search?.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      // Clear the text first; a second Escape closes the gallery through the
      // app's normal handler. Preserved from the old browser.
      if (els.search.value) {
        els.search.value = '';
        setQuery('');
        e.stopPropagation();
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      choose(els.grid.querySelector('[data-scenario]')?.dataset.scenario);
    }
  });

  document
    .getElementById('closeScenarioList')
    ?.addEventListener('click', closeScenarioBrowser);
  document
    .getElementById('scenarioListCloseChip')
    ?.addEventListener('click', closeScenarioBrowser);

  const button = document.getElementById('loadScenarioBtn');
  button?.addEventListener('click', () =>
    isScenarioBrowserOpen() ? closeScenarioBrowser() : openScenarioBrowser()
  );
  button?.addEventListener('pointerenter', primeDialogs, { once: true });
  button?.addEventListener('focus', primeDialogs, { once: true });

  // js/dialog.js takes an Escape pressed inside the gallery. This is the one
  // pressed with focus on <body>, where a chip that redrew itself leaves it.
  window.addEventListener('gravitasEscape', () => {
    if (isScenarioBrowserOpen()) closeScenarioBrowser();
  });
}
