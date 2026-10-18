// =============================================================================
// The investigation chooser: the in-application list of investigations, its
// search and filters, the curated sequences and the dialog that holds them.
// -----------------------------------------------------------------------------
// Extracted from js/investigations.js (Prompt 107, slice 1) without a change
// of behavior. It never imports the engine back: what it needs of the engine
// (the progress reader, the opener, the dialog loader and the engine's
// elements) arrives through bindChooser(), once, and through setChooserElements()
// each time the engine mounts or unmounts its markup.
// =============================================================================

import { put } from '../storage/local.js';
import { t } from '../i18n/index.js';
import { escapeHtml as escape, prose } from '../lessonMarkup.js';
import {
  MANIFEST,
  investigationMeta,
  loadInvestigation,
  seriesPosition,
  lessonCatalogReady,
} from '../data/investigations/registry.js';
import {
  NO_FILTERS,
  PROGRESSES,
  filterCatalog,
  isFiltered,
  loosening,
  subjectsOf,
} from '../data/investigations/browse.js';
import {
  LENGTH,
  LENGTHS,
  CALCULATIONS,
  SEQUENCES,
  resolveSequence,
} from '../data/investigations/sequences.js';
import {
  scenarioShotHtml,
  wireThumbnailFallbacks,
} from '../scenarioBrowser.js';
import { loadFailed } from '../notify.js';

const attr = text => escape(text).replace(/"/g, '&quot;');

/**
 * The engine's side of the seam.
 * @typedef {Object} ChooserHost
 * @property {(id: string) => Object} progressFor - Saved progress for a lesson
 * @property {(id: string) => Promise<void>} openInvestigation - Open a lesson
 * @property {() => Promise<Object>} loadDialogs - js/dialog.js, fetched on use
 * @property {() => (Object|null)} dialogs - js/dialog.js if already fetched
 */

/** @type {ChooserHost|null} */
let host = null;
/** The engine's elements; empty while its markup is not mounted. */
let els = {};

const progressFor = id => host.progressFor(id);
const openInvestigation = id => host.openInvestigation(id);
const loadDialogs = () => host.loadDialogs();

/**
 * Hand the chooser what it needs of the engine. Called once, at import.
 * @param {ChooserHost} engine
 */
export function bindChooser(engine) {
  host = engine;
}

/**
 * Give the chooser the engine's elements, or an empty map on teardown.
 * @param {Object} elements
 */
export function setChooserElements(elements) {
  els = elements || {};
}

// --- The lesson browser -------------------------------------------------------
//
// Visually a sibling of the scenario gallery: the same surface tokens, the same
// borrowed thumbnails, the same monospaced count line above the grid. It is not
// the same card, though, and the differences are the point. A scenario is a
// portrait tile you click on a whim; a lesson is an hour of work with a report
// at the end, so it gets a wide landscape card with room to say how long it
// takes, how many steps it is, what you will be able to do afterwards, and how
// far through it you already are. Eight of those read as a syllabus. Forty-odd
// small tiles read as a catalog. Each list looks like the thing it is.
//
// There is deliberately no search box and no filter chips here. Eight lessons
// fit on two scrolls, and a filter over eight items is furniture.

/** Minutes named in a `duration` string, as a [low, high] pair. */
function durationRange(text) {
  const nums = String(text || '').match(/\d+/g);
  if (!nums?.length) return [0, 0];
  const low = Number(nums[0]);
  return [low, nums.length > 1 ? Number(nums[1]) : low];
}

/**
 * The line above the grid: how much work the whole set is, and where the
 * student has got to in it.
 *
 * Nothing here is written down anywhere. Adding a lesson changes the sentence.
 *
 * @param {Array<Object>} list - The catalog
 * @returns {string} A sentence
 */
export function browserSummary(list = MANIFEST) {
  const steps = list.reduce((n, inv) => n + inv.stepCount, 0);
  const [low, high] = list.reduce(
    ([a, b], inv) => {
      const [l, h] = durationRange(inv.duration);
      return [a + l, b + h];
    },
    [0, 0]
  );
  const hours = (lo, hi) => {
    const l = Math.round(lo / 60);
    const h = Math.round(hi / 60);
    return l === h
      ? t('inv.summary.about', { h })
      : t('inv.summary.range', { l, h });
  };

  const parts = [
    t('inv.summary.lessons', { n: list.length }),
    t('inv.summary.steps', { n: steps }),
    t('inv.summary.work', { hours: hours(low, high) }),
  ];

  // Progress, only once there is some: eight "not started" markers say nothing.
  const progress = list.map(inv => progressFor(inv.id));
  const done = progress.filter(p => p.started && p.done >= p.total).length;
  const going = progress.filter(p => p.started && p.done < p.total).length;
  if (done) parts.push(t('inv.summary.complete', { n: done }));
  if (going) parts.push(t('inv.summary.going', { n: going }));

  return parts.join(' · ');
}

/**
 * The level to show on a card, if any.
 *
 * Every lesson currently reads "Introductory astronomy", and eight identical
 * pills are noise. So the shared level is stated once in the header and a card
 * carries one only when it is the odd one out.
 *
 * @param {Object} inv - Investigation
 * @param {string|null} shared - The level the whole catalog shares, or null
 * @returns {string} A level, or the empty string
 */
const cardLevel = (inv, shared) =>
  inv.level === shared ? '' : inv.level || '';

/** The one level the whole catalog shares, or null if they differ. */
function sharedLevel(list = MANIFEST) {
  const levels = new Set(list.map(inv => inv.level).filter(Boolean));
  return levels.size === 1 ? [...levels][0] : null;
}

function browserCardHtml(inv, index, shared) {
  const p = progressFor(inv.id);
  const complete = p.started && p.done >= p.total;
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  const series = seriesPosition(inv);
  const level = cardLevel(inv, shared);

  // What the card's one control promises. A student who left off at step 12 of
  // 35 wants to be told that, not "Start".
  const cta = complete
    ? t('inv.card.review')
    : p.started
      ? t('inv.card.resume', { n: p.at })
      : t('inv.card.start');

  const status = complete
    ? t('inv.card.complete')
    : p.started
      ? t('inv.card.seen', { done: p.done, total: p.total })
      : '';

  // The whole card is the control, so its accessible name has to carry
  // everything scanning it gives a sighted reader.
  const label = [
    inv.title,
    inv.subtitle,
    series
      ? t('inv.card.series', {
          label: series.label,
          index: series.index,
          of: series.of,
        })
      : '',
    t('inv.summary.steps', { n: inv.stepCount }),
    inv.duration,
    status,
    cta,
  ]
    .filter(Boolean)
    .join('. ');

  // The objectives sit beside the card, not in it: the card is one button, and
  // a disclosure inside a button is not a disclosure. They are fetched with
  // the lesson when a reader opens them, since the manifest carries a count.
  return `<div class="inv-card-wrap"><button type="button" class="inv-card${complete ? ' is-complete' : ''}"
            data-investigation="${escape(inv.id)}"
            aria-label="${attr(label)}" title="${attr(inv.summary || inv.title)}">
      <span class="inv-card-shot">
        ${scenarioShotHtml(inv, inv.title)}
        <span class="inv-card-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
        <span class="inv-card-clock" aria-hidden="true">${escape(inv.duration)}</span>
      </span>
      <span class="inv-card-body">
        <span class="inv-card-flags${series || level ? '' : ' is-empty'}">
          ${
            series
              ? `<span class="inv-flag is-series">${escape(series.label)}
                   <b>${series.index}/${series.of}</b></span>`
              : ''
          }
          ${level ? `<span class="inv-flag">${escape(level)}</span>` : ''}
        </span>
        <span class="inv-card-title">${escape(inv.title)}</span>
        <span class="inv-card-sub">${escape(inv.subtitle)}</span>
        <span class="inv-card-summary">${escape(inv.summary)}</span>
        <span class="inv-card-meta">
          <span>${escape(t('inv.summary.steps', { n: inv.stepCount }))}</span>
          <span>${escape(t('inv.card.objectives', { n: inv.objectiveCount }))}</span>
          <span>${escape(t('inv.card.report'))}</span>
        </span>
        <span class="inv-card-foot">
          ${
            p.started
              ? `<span class="inv-card-progress">
                   <span class="inv-card-bar"><span style="width:${pct}%"></span></span>
                   <span class="inv-card-status${complete ? ' is-done' : ''}">${escape(status)}</span>
                 </span>`
              : ''
          }
          <span class="inv-card-cta">${escape(cta)}<span aria-hidden="true"> →</span></span>
        </span>
      </span>
    </button><details class="inv-card-objectives" data-objectives="${attr(inv.id)}">
      <summary>${escape(t('inv.card.objectivesShow'))}</summary><ul></ul>
    </details></div>`;
}

// --- Search, filters and the curated orders -----------------------------------

/**
 * What the reader has narrowed the list to.
 *
 * Module state, deliberately: a student who filters to "in progress", opens a
 * lesson and comes back should find the list as they left it, and that has to
 * survive the panel being closed and reopened. It is not written to storage -
 * a filter is about the next five minutes, and finding the catalog silently
 * cut down a week later would be a bug, not a convenience.
 */
let browserFilters = { ...NO_FILTERS };

/** For tests and for the assignment flow: start from the whole catalog. */
export function resetBrowserFilters() {
  browserFilters = { ...NO_FILTERS };
}

/** Options for one select: an "any" row, then the values. */
function fillSelect(select, values, labelOf, anyLabel, current) {
  if (!select) return;
  select.innerHTML = [
    `<option value="">${escape(anyLabel)}</option>`,
    ...values.map(
      value =>
        `<option value="${attr(value)}">${escape(labelOf(value))}</option>`
    ),
  ].join('');
  select.value = current || '';
}

/**
 * Build the filter menus from the catalog.
 *
 * Called on every render rather than once, because the labels are translated
 * and the subject counts move as lessons are added.
 */
function fillFilterMenus() {
  const subjects = subjectsOf(MANIFEST);
  fillSelect(
    els.filterSubject,
    subjects.map(s => s.tag),
    tag => {
      const found = subjects.find(s => s.tag === tag);
      return t('inv.filter.subject.option', {
        subject: t(`inv.tag.${tag}`),
        n: found ? found.count : 0,
      });
    },
    t('inv.filter.subject.any'),
    browserFilters.subject
  );
  fillSelect(
    els.filterLength,
    LENGTHS,
    value => t(`inv.filter.length.${value}`),
    t('inv.filter.length.any'),
    browserFilters.length
  );
  fillSelect(
    els.filterCalculation,
    CALCULATIONS,
    value => t(`inv.filter.calculation.${value}`),
    t('inv.filter.calculation.any'),
    browserFilters.calculation
  );
  fillSelect(
    els.filterProgress,
    PROGRESSES,
    value => t(`inv.filter.progress.${value}`),
    t('inv.filter.progress.any'),
    browserFilters.progress
  );
}

/**
 * One lesson inside a curated sequence.
 *
 * The title, duration and length label all come from the manifest entry. The
 * sequence contributes the position, the reason and the prerequisites.
 */
function sequenceStepHtml(step, index) {
  const inv = step.entry;
  const p = progressFor(inv.id);
  const complete = p.started && p.done >= p.total;
  const needs = step.needs
    .map(id => investigationMeta(id)?.title)
    .filter(Boolean);

  // Only a lesson that really is short gets called short. Anything longer says
  // how long it is and offers the builder, which is the honest way to get a
  // fifteen-minute activity out of a seventy-minute lesson.
  const fit =
    step.fit === LENGTH.DEMO
      ? t('inv.seq.fit.demo')
      : step.fit === LENGTH.PERIOD
        ? t('inv.seq.fit.period')
        : t('inv.seq.fit.long');

  return `<li class="inv-seq-step${complete ? ' is-complete' : ''}">
      <span class="inv-seq-num" aria-hidden="true">${index + 1}</span>
      <span class="inv-seq-body">
        <button type="button" class="inv-seq-open" data-sequence-lesson="${escape(inv.id)}">
          ${escape(inv.title)}
        </button>
        <span class="inv-seq-tags">
          <span class="inv-seq-time">${escape(inv.duration)}</span>
          <span class="inv-seq-fit is-${escape(step.fit)}">${escape(fit)}</span>
          <span class="inv-seq-depth">${escape(t(`inv.seq.depth.${step.depth}`))}</span>
          ${complete ? `<span class="inv-seq-done">${escape(t('inv.card.complete'))}</span>` : ''}
        </span>
        <span class="inv-seq-why">${escape(t(step.whyId))}</span>
        ${
          needs.length
            ? `<span class="inv-seq-needs">${escape(
                t('inv.seq.needs', { lessons: needs.join(', ') })
              )}</span>`
            : `<span class="inv-seq-needs is-none">${escape(t('inv.seq.needs.none'))}</span>`
        }
        ${
          step.fit === LENGTH.LONG
            ? `<a class="inv-seq-assign" href="?assign=${encodeURIComponent(inv.id)}">${escape(
                t('inv.seq.assign')
              )}</a>`
            : ''
        }
      </span>
    </li>`;
}

/** All the curated sequences, resolved against the catalog. */
function renderSequences() {
  if (!els.sequenceList) return;
  els.sequenceList.innerHTML = SEQUENCES.map(sequence => {
    const steps = resolveSequence(sequence, MANIFEST);
    if (!steps.length) return '';
    return `<section class="inv-seq" data-seq="${sequence.id}">
        <h5 class="inv-seq-title">${escape(t(sequence.titleId))}</h5>
        <p class="inv-seq-blurb">${escape(t(sequence.blurbId))}</p>
        <ol class="inv-seq-steps">${steps
          .map((step, i) => sequenceStepHtml(step, i))
          .join('')}</ol>
      </section>`;
  }).join('');

  // A distinct attribute from the cards' `data-investigation`, on purpose: that
  // one has meant "a lesson card" everywhere for long enough that half a dozen
  // tests select on it bare, and a second element answering to it made those
  // selectors ambiguous rather than wrong. The sequence rows say what they are.
  els.sequenceList.querySelectorAll('[data-sequence-lesson]').forEach(btn => {
    btn.addEventListener('click', () => {
      try {
        put(
          'gravitas_next_context',
          JSON.stringify({
            k: 'seq',
            id: btn.closest('[data-seq]').dataset.seq,
          }),
          'preferences'
        );
      } catch {
        /* no storage: no next offered */
      }
      openCardLesson(btn, btn.dataset.sequenceLesson);
    });
  });
}

/**
 * Open a lesson from a card or a sequence row.
 *
 * Shared so a sequence entry behaves exactly like a card: the same busy state,
 * the same failure message, the same lazy fetch.
 */
function openCardLesson(btn, id = btn.dataset.investigation) {
  // Opening is a fetch now, so the control says so. On a warm cache this class
  // is added and removed within a frame and nobody sees it; on a phone on
  // campus wifi it is the difference between a considered wait and a card
  // that looks broken.
  btn.setAttribute('aria-busy', 'true');
  const cta = btn.querySelector('.inv-card-cta');
  const wasCta = cta?.textContent;
  if (cta) cta.textContent = t('inv.card.loading');
  return openInvestigation(id)
    .catch(err => loadFailed(() => openCardLesson(btn, id), err))
    .finally(() => {
      btn.removeAttribute('aria-busy');
      if (cta && wasCta) cta.textContent = wasCta;
    });
}

/** Nothing matched: say what would help rather than leaving a blank panel. */
function renderEmpty(filtered) {
  if (!els.empty) return;
  els.empty.hidden = Boolean(filtered.length);
  if (filtered.length) return;

  const relax = loosening(MANIFEST, browserFilters, progressFor);
  if (els.emptyText)
    els.emptyText.textContent = browserFilters.query
      ? t('inv.empty.search', { query: browserFilters.query })
      : t('inv.empty.filters');
  if (els.emptyAction) {
    els.emptyAction.hidden = false;
    els.emptyAction.textContent = relax
      ? t('inv.empty.relax', {
          filter: t(`inv.filter.${relax.key}`).toLowerCase(),
          n: relax.count,
        })
      : t('inv.filter.clear');
    els.emptyAction.dataset.relax = relax ? relax.key : '';
  }
}

export function renderBrowser() {
  if (!els.list) return;
  const shared = sharedLevel();
  const narrowed = isFiltered(browserFilters);
  const rows = filterCatalog(MANIFEST, browserFilters, progressFor);

  fillFilterMenus();

  if (els.count) {
    // While filtering, the count is the answer to what was just typed, and the
    // element is a live region so it is also the announcement. The standing
    // summary of the whole catalog would bury that.
    els.count.textContent = narrowed
      ? t('inv.filter.count', { n: rows.length, total: MANIFEST.length })
      : browserSummary();
  }
  // The level, said once, where it is a fact about the set rather than a pill
  // repeated eight times.
  if (els.level) {
    els.level.hidden = !shared || narrowed;
    if (shared)
      els.level.textContent = t('inv.summary.level', {
        level: shared.toLowerCase(),
      });
  }
  if (els.filterClear) els.filterClear.hidden = !narrowed;

  // The curated orders are an answer to "where do I start", which is not the
  // question somebody typing in the search box is asking.
  if (els.sequences) {
    els.sequences.hidden = narrowed;
    if (!narrowed) renderSequences();
    else els.sequenceList.innerHTML = '';
  }
  if (els.allHeading) els.allHeading.hidden = narrowed;

  els.list.innerHTML = rows
    .map((row, i) => browserCardHtml(row.entry, i, shared))
    .join('');

  wireThumbnailFallbacks(els.list);

  els.list.querySelectorAll('[data-investigation]').forEach(btn => {
    btn.addEventListener('click', () => openCardLesson(btn));
  });
  els.list.querySelectorAll('[data-objectives]').forEach(box => {
    box.addEventListener('toggle', async () => {
      if (!box.open || box.dataset.loaded) return;
      box.dataset.loaded = '1';
      const inv = await loadInvestigation(box.dataset.objectives);
      box.querySelector('ul').innerHTML = (inv?.objectives || [])
        .map(o => `<li>${prose(o)}</li>`)
        .join('');
    });
  });

  renderEmpty(rows);
}

/**
 * A keystroke waiting out the debounce.
 *
 * Held here rather than inside the listener because any other filter change
 * has to settle it first. Without that, choosing a subject a tenth of a second
 * after typing renders with the old empty query and the typed text is lost -
 * which is exactly what happened, and is why the timer is module state.
 */
let pendingQuery = null;

/** Apply a keystroke that has not waited out its debounce yet. */
function flushQuery() {
  if (pendingQuery === null) return;
  clearTimeout(pendingQuery);
  pendingQuery = null;
  browserFilters = {
    ...browserFilters,
    query: (els.search?.value || '').trim(),
  };
}

/** Take a filter change and redraw. */
function setBrowserFilter(key, value) {
  flushQuery();
  browserFilters = { ...browserFilters, [key]: value };
  renderBrowser();
}

/** Empty every filter, including the box the reader typed in. */
function clearBrowserFilters() {
  if (pendingQuery !== null) clearTimeout(pendingQuery);
  pendingQuery = null;
  resetBrowserFilters();
  if (els.search) els.search.value = '';
  renderBrowser();
}

/**
 * Wire the search box and the four menus. Once per mount: the browser is
 * index.html's, so its listeners go with the engine's signal.
 * @param {AddEventListenerOptions} [opts] - Carries that signal
 */
export function wireBrowserFilters(opts) {
  // Debounced, because a keystroke rebuilds seventeen cards and their
  // thumbnails; 150ms is below the point a reader notices and above the rate
  // anybody types.
  els.search?.addEventListener(
    'input',
    () => {
      if (pendingQuery !== null) clearTimeout(pendingQuery);
      pendingQuery = setTimeout(() => {
        pendingQuery = null;
        setBrowserFilter('query', els.search.value.trim());
      }, 150);
    },
    opts
  );
  // Escape empties the box rather than closing the panel out from under
  // somebody who was only trying to undo a search.
  els.search?.addEventListener(
    'keydown',
    event => {
      if (event.key !== 'Escape' || !els.search.value) return;
      event.stopPropagation();
      event.preventDefault();
      if (pendingQuery !== null) clearTimeout(pendingQuery);
      pendingQuery = null;
      els.search.value = '';
      setBrowserFilter('query', '');
    },
    opts
  );

  const menus = [
    [els.filterSubject, 'subject'],
    [els.filterLength, 'length'],
    [els.filterCalculation, 'calculation'],
    [els.filterProgress, 'progress'],
  ];
  menus.forEach(([select, key]) => {
    select?.addEventListener(
      'change',
      () => setBrowserFilter(key, select.value),
      opts
    );
  });

  els.filterClear?.addEventListener(
    'click',
    () => {
      clearBrowserFilters();
      els.search?.focus();
    },
    opts
  );

  els.emptyAction?.addEventListener(
    'click',
    () => {
      const key = els.emptyAction.dataset.relax;
      if (key) setBrowserFilter(key, '');
      else clearBrowserFilters();
      els.search?.focus();
    },
    opts
  );
}

/** Show the list of available investigations. */
export async function openBrowser() {
  if (!els.browser || isBrowserOpen()) return;
  // Where the reader was, asked before the wait for the module.
  const trigger = document.activeElement;
  const { openDialog } = await loadDialogs();
  if (isBrowserOpen()) return;
  renderBrowser();
  // And again once the catalog for this language has arrived, if it had not.
  //
  // The panel opens immediately - waiting on a fetch before showing anything
  // would be a worse trade than a grid that fills in - but a reader who chose
  // Spanish before the lesson system was ever loaded would otherwise be left
  // looking at English titles until they touched a filter. Resolved already in
  // the common cases: English, or any second open.
  //
  // It resolves after the open even when the catalog is already here, and the
  // redraw replaces the card that has focus. So the same card takes it back:
  // the first, on an ordinary open.
  lessonCatalogReady()
    .then(() => {
      if (!isBrowserOpen()) return;
      const card = document.activeElement?.closest?.('[data-investigation]');
      renderBrowser();
      if (card)
        els.list
          ?.querySelector(
            `[data-investigation="${CSS.escape(card.dataset.investigation)}"]`
          )
          ?.focus({ preventScroll: true });
    })
    .catch(() => {
      /* the English catalog is already on screen; that is the fallback */
    });
  // The browser declares aria-modal="true", and js/dialog.js keeps it: Tab
  // stays inside, the page behind is inert to a screen reader, Escape and the
  // backdrop close it, and focus goes back where it came from.
  openDialog(els.browserContent, {
    backdrop: els.browser,
    isolate: true,
    trigger,
    // The first lesson, not the close button: the point of arriving here is
    // to choose one, and it puts the keyboard user at the top of the same list
    // a sighted user is reading. Focused without scrolling (js/dialog.js
    // passes preventScroll), because the first card sits below the panel's
    // heading and its intro paragraph: at 320x568 a scrolled focus opened the
    // panel 137px down, on the second half of a sentence and no title at all.
    //
    // With a filter still applied from earlier there may be no first card at
    // all. The search box is the right fallback - it is both focusable and
    // the thing they need in order to see any lessons again.
    initialFocus: () => els.list?.querySelector('.inv-card') || els.search,
  });
  // Both of them, now that they are laid out. #investigationBrowserScroll is
  // the list, but the element that actually scrolls is
  // #investigationBrowserContent, and resetting only the former left the panel
  // wherever it had been.
  if (els.browserScroll) els.browserScroll.scrollTop = 0;
  if (els.browserContent) els.browserContent.scrollTop = 0;
}

/**
 * Hide the list of investigations.
 * @param {Object} [opts]
 * @param {boolean} [opts.restoreFocus] - Send focus back where it came from.
 *   False when a lesson is opening: the panel takes focus instead, and putting
 *   it back on the rail button first would be a visible detour.
 */
export function closeBrowser({ restoreFocus = true } = {}) {
  // Loaded by definition: the browser cannot be open without it.
  host.dialogs()?.closeDialog(els.browserContent, 'close', {
    returnFocus: restoreFocus !== false,
  });
}

export const isBrowserOpen = () =>
  Boolean(els.browser) && !els.browser.classList.contains('hidden');
