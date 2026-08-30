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
import { SCENARIO_TAGS, TAG_ORDER, tagLabel } from './data/scenarioTags.js';

const ALL = 'all';

let els = {};
let onSelect = null;
let activeTag = ALL;
let query = '';
let lastFocus = null;

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
      const haystack = [
        key,
        info.title || '',
        info.summary || '',
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
  const plural = shown === 1 ? 'scenario' : 'scenarios';
  const where = tag && tag !== ALL ? ` in ${tagLabel(tag)}` : '';
  if (search) return `${shown} ${plural}${where} matching “${search}”`;
  return `${shown} ${plural}${where}`;
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
  const title = info.title || key;
  // The whole card is the control, so the accessible name has to carry
  // everything a sighted user gets from scanning it.
  const label = `${title}. ${tags.map(tagLabel).join(', ')}.`;
  return `
    <button type="button" class="sc-card" data-scenario="${escape(key)}"
            aria-label="${escape(label)}" title="${escape(info.summary || title)}">
      ${scenarioShotHtml(info, title)}
      <span class="sc-card-body">
        <span class="sc-card-title">${escape(title)}</span>
        <span class="sc-card-summary">${escape(info.summary || '')}</span>
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
    chip(ALL, 'All') +
    TAG_ORDER.map(id => chip(id, SCENARIO_TAGS[id].label)).join('')
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
  const concept = activeTag !== ALL ? SCENARIO_TAGS[activeTag] : null;
  els.concept.hidden = !concept;
  if (concept) els.concept.textContent = concept.description;

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
export function openScenarioBrowser() {
  if (!els.modal) return;
  lastFocus = document.activeElement;
  query = '';
  if (els.search) els.search.value = '';
  renderChips();
  renderResults();
  els.modal.classList.remove('hidden');
  if (els.scroller) els.scroller.scrollTop = 0;
  // The search field is the fastest way in for anyone who already knows what
  // they want, and focusing it does not stop the chips being tabbed to.
  setTimeout(() => els.search?.focus(), 60);
}

/** Hide the gallery. */
export function closeScenarioBrowser() {
  if (!els.modal) return;
  els.modal.classList.add('hidden');
  if (
    lastFocus &&
    document.contains(lastFocus) &&
    lastFocus !== document.body
  ) {
    lastFocus.focus();
  }
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
    els.subtitle.textContent = `${Object.keys(SCENARIO_INFO).length} systems to explore. Search by name or concept, or browse the curriculum topics below.`;
  }

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

  els.modal.addEventListener('click', e => {
    if (e.target === els.modal) closeScenarioBrowser();
  });

  document
    .getElementById('loadScenarioBtn')
    ?.addEventListener('click', () =>
      isScenarioBrowserOpen() ? closeScenarioBrowser() : openScenarioBrowser()
    );

  window.addEventListener('gravitasEscape', () => {
    if (isScenarioBrowserOpen()) closeScenarioBrowser();
  });
}
