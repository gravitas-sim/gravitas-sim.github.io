// =============================================================================
// The front door
// -----------------------------------------------------------------------------
// A first-time visitor arriving at Gravitas used to land in the middle of a
// simulation control rail and have to work out from "Load Scenario", "Spacetime
// View" and "Blank Simulation" what the project was for. This layer answers
// that question once, offers three ways in, and then never appears again.
//
// It is an orientation layer, not a homepage. The sandbox stays the product:
//   first visit        splash -> welcome -> sandbox
//   every visit after  splash -> sandbox
//   shared/deep link   splash -> the linked thing, welcome skipped and NOT
//                      marked seen, so an ordinary visit later still gets it
//
// Nothing here reimplements anything. Scenario cards go through
// loadScenarioByKey() in ui.js, the investigations button opens the real
// browser in investigations.js, the tour button opens the real tour in
// tutorial.js, and every title and summary is read from the live registries.
// =============================================================================

import { SCENARIO_INFO } from './data/scenarioInfo.js';
import {
  FEATURED_SCENARIO_KEYS,
  ENTRY_CARDS,
  AUDIENCES,
  RESOURCE_LINKS,
} from './data/welcome.js';
import { scenarioShotHtml, wireThumbnailFallbacks } from './scenarioBrowser.js';
import { t } from './i18n/index.js';

// The four functions that decide whether this layer is needed live in
// js/welcomeGate.js, so that deciding can happen without downloading this. They
// are re-exported here because this is where their callers and their tests
// have always looked for them.
export {
  WELCOME_SEEN_KEY,
  isWelcomeSeen,
  markWelcomeSeen,
  resetWelcomePreference,
  hasDeepLinkDestination,
  shouldShowWelcome,
} from './welcomeGate.js';

import { markWelcomeSeen, resetWelcomePreference } from './welcomeGate.js';

// This module's prose lives in the deferred half of the catalog - see the
// note in js/i18n/en.deferred.js. Registered from here rather than left to the
// caller, because nothing in the start-up path can reach this module and a
// reader who does reach it must not see message ids.
import {
  ensureDeferredMessages,
  loadFragment,
  mountFragment,
} from './i18n/deferredMessages.js';

ensureDeferredMessages().catch(() => {});

let els = {};
let open = false;
// Whether the layer is standing in for the interface (first visit) or floating
// over a running sandbox (reopened from the footer). The two close differently.
let auto = false;
let onEnter = null;
let lastFocus = null;
let built = false;

// --- Content -----------------------------------------------------------------

const escape = str =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The first sentence or two of a scenario summary.
 *
 * The catalog summaries run to three or four sentences, which is right in the
 * scenario browser and far too long on a card. Deriving the opening rather than
 * writing six new blurbs keeps SCENARIO_INFO the only place a scenario is
 * described: edit it there and the front door follows.
 *
 * @param {string} summary - A SCENARIO_INFO summary
 * @returns {string} One or two sentences
 */
export function cardSummary(summary) {
  const text = String(summary || '').trim();
  if (!text) return '';

  // Split on terminators, walking the string rather than matching pieces of
  // it. A period only ends a sentence when the end of the text or whitespace
  // follows: the catalog is full of "1.4 M_sun" and "0.5 AU", and a plain
  // /[.!?]/ split puts "Two neutron stars (1." on the card.
  const ends = [];
  for (let i = 0; i < text.length; i++) {
    if (!'.!?'.includes(text[i])) continue;
    const next = text[i + 1];
    if (next === undefined || /\s/.test(next)) ends.push(i + 1);
  }
  if (!ends.length) return text;

  let cut = ends[0];
  // A very short opener reads as a fragment on its own, so it takes the next
  // sentence with it. Anything past about seventy characters stands up alone.
  if (cut < 70 && ends[1]) cut = ends[1];
  return text.slice(0, cut).trim();
}

/**
 * The featured scenarios, resolved against the live catalog.
 * @returns {Array<Object>} key, title, trimmed summary and info for each entry
 */
export function featuredScenarios() {
  return FEATURED_SCENARIO_KEYS.filter(key => {
    if (SCENARIO_INFO[key]) return true;
    // A renamed scenario should cost one card, not the whole gallery.
    console.warn(`Featured scenario "${key}" is not in SCENARIO_INFO.`);
    return false;
  }).map(key => ({
    key,
    info: SCENARIO_INFO[key],
    title: SCENARIO_INFO[key].title || key,
    summary: cardSummary(SCENARIO_INFO[key].summary),
  }));
}

/**
 * A few lesson titles for the investigations block.
 *
 * Takes the catalog rather than importing it: it is loaded lazily, so the
 * only caller already has it in hand by the time it asks.
 *
 * Accepts either shape - a manifest entry, which carries a step count, or a
 * whole lesson, which carries the steps. The front door is given the former and
 * the tests hand it the latter, and three titles and a number read the same off
 * both.
 *
 * @param {Array<Object>} catalog - MANIFEST or INVESTIGATIONS
 * @param {number} [n] - How many
 * @returns {Array<Object>} id, title, subtitle and step count for each
 */
export function previewInvestigations(catalog, n = 3) {
  return catalog.slice(0, n).map(inv => ({
    id: inv.id,
    title: inv.title,
    subtitle: inv.subtitle,
    steps: inv.stepCount ?? inv.steps.length,
  }));
}

// --- Markup ------------------------------------------------------------------

function scenarioCardsHtml() {
  return featuredScenarios()
    .map(
      s => `
      <button type="button" class="wel-scenario" data-scenario="${escape(s.key)}">
        ${scenarioShotHtml(s.info, s.title)}
        <span class="wel-scenario-text">
          <span class="wel-scenario-title">${escape(s.title)}</span>
          <span class="wel-scenario-summary">${escape(s.summary)}</span>
        </span>
      </button>`
    )
    .join('');
}

function entryCardsHtml() {
  return ENTRY_CARDS.map(
    c => `
      <div class="wel-door">
        <p class="wel-door-eyebrow">${escape(t(c.eyebrow))}</p>
        <h3 class="wel-door-title">${escape(t(c.title))}</h3>
        <p class="wel-door-text">${escape(t(c.text))}</p>
        <button type="button" class="ui-button wel-door-cta" data-action="${escape(c.action)}">
          ${escape(t(c.cta))}
        </button>
      </div>`
  ).join('');
}

function audiencesHtml() {
  return AUDIENCES.map(
    a => `
      <div class="wel-audience">
        <h3>${escape(t(a.title))}</h3>
        <p>${escape(t(a.text))}</p>
      </div>`
  ).join('');
}

/** How far a reader is through a lesson, from what the lesson saved. */
function savedProgress(id) {
  try {
    const saved = JSON.parse(
      localStorage.getItem(`gravitas_investigation_${id}`) || 'null'
    );
    return saved && { seen: saved.visited?.length || 0, at: saved.startedAt };
  } catch {
    return null;
  }
}

/**
 * The lessons a reader has started and not finished, most recently started
 * first: Home's "continue where you left off".
 *
 * @param {Array<Object>} catalog - The manifest
 * @param {(id: string) => ?{seen: number, at: ?string}} [read] - Saved progress
 * @returns {Array<Object>} id, title, seen and total, at most three
 */
export function unfinishedLessons(catalog, read = savedProgress) {
  return catalog
    .map(inv => ({ inv, p: read(inv.id) }))
    .filter(({ inv, p }) => p && p.seen < inv.stepCount)
    .sort((x, y) => String(y.p.at || '').localeCompare(String(x.p.at || '')))
    .slice(0, 3)
    .map(({ inv, p }) => ({
      id: inv.id,
      title: inv.title,
      seen: p.seen,
      total: inv.stepCount,
    }));
}

/**
 * Fill in the lessons, and the ones to continue, once the registry has loaded.
 *
 * The section renders without them and they drop in a moment later, rather than
 * the panel waiting on a 225KB import before it can show anything. If the
 * import fails the list simply stays empty: the button beneath it goes to the
 * real browser either way, so nothing is lost but a flourish.
 */
async function fillLessonPreviews() {
  const list = els.body?.querySelector('[data-slot="lessons"]');
  if (!list) return;
  try {
    // Imported here rather than at the top of the module, and the manifest
    // rather than the lessons. Three titles and a step count are card-level
    // facts, and the manifest is a few kilobytes of exactly those; the lessons
    // themselves are 225KB and are fetched one at a time when one is opened.
    const { MANIFEST: INVESTIGATIONS } =
      await import('./data/investigations/registry.js');
    const count = els.body?.querySelector('[data-lesson-count]');
    if (count) count.textContent = `${INVESTIGATIONS.length} guided`;

    const lessons = previewInvestigations(INVESTIGATIONS);
    list.innerHTML = lessons
      .map(
        inv => `
        <li class="wel-lesson">
          <span class="wel-lesson-title">${escape(inv.title)}</span>
          <span class="wel-lesson-sub">${escape(inv.subtitle)}</span>
          <span class="wel-lesson-meta">${inv.steps} steps</span>
        </li>`
      )
      .join('');

    const going = unfinishedLessons(INVESTIGATIONS);
    const strip = els.body.querySelector('#welContinue');
    if (strip && going.length) {
      strip.querySelector('ul').innerHTML = going
        .map(
          g => `<li class="wel-lesson"><button type="button" class="wel-quiet" data-lesson="${escape(g.id)}">${escape(g.title)}</button>
          <span class="wel-lesson-meta"><span class="gs-en">${g.seen} of ${g.total} steps seen</span><span class="gs-es" lang="es">${g.seen} de ${g.total} pasos vistos</span></span></li>`
        )
        .join('');
      strip.hidden = false;
    }
  } catch {
    list.remove();
  }
}

// Home's sections, asked for as this module loads, so they arrive with it.
const sections = loadFragment('home');
sections.catch(() => {});

/** Put the sections in place and fill them. Runs once, after build(). */
async function fillSections() {
  mountFragment('home', await sections);
  const node = document.getElementById('welcomeSections');
  if (!node || !els.body) return;
  els.body.append(node);
  const total = String(Object.keys(SCENARIO_INFO).length);
  for (const n of node.querySelectorAll('[data-slot="scenario-count"]'))
    n.textContent = total;
  const fill = (slot, markup) => {
    const n = node.querySelector(`[data-slot="${slot}"]`);
    if (n) n.innerHTML = markup;
  };
  fill('doors', entryCardsHtml());
  fill('scenarios', scenarioCardsHtml());
  fill('audiences', audiencesHtml());
  fill(
    'links',
    ['teaching', 'instructors', 'model']
      .map(
        k => `<a class="wel-link" href="${RESOURCE_LINKS[k].href}">
          <span class="wel-link-label">${escape(t(RESOURCE_LINKS[k].label))}</span>
          <span class="wel-link-note">${escape(t(RESOURCE_LINKS[k].note))}</span>
        </a>`
      )
      .join('')
  );
  syncReset();
  // The same treatment the gallery gives a capture that fails to load.
  wireThumbnailFallbacks(node);
  // The lesson titles and the count come from the registry, fetched
  // separately so the panel does not wait on it.
  fillLessonPreviews();
}

/**
 * Write Home's heading, then its sections when they arrive. Runs once,
 * lazily, on the first open. The heading is here rather than in the
 * fragment so the panel has its name the moment it opens.
 */
function build() {
  if (built || !els.body) return;
  built = true;
  els.body.innerHTML = `
    <div class="wel-hero">
      <p class="wel-eyebrow">Interactive astrophysics in your browser</p>
      <h1 class="wel-wordmark" id="welcomeTitle">GRAVITAS</h1>
      <p class="wel-lede">
        Build planetary systems, orbit binary stars, collide compact objects and
        reproduce systems astronomers have actually observed. Then measure what
        happens.
      </p>
      <div class="wel-hero-actions">
        <button type="button" class="ui-button wel-primary" data-action="enter">
          Enter the sandbox
        </button>
        <button type="button" class="ui-button wel-secondary" data-action="investigations">
          Start an investigation
        </button>
        <button type="button" class="wel-quiet" data-action="tour">
          Take a quick tour
        </button>
      </div>
    </div>`;
  wireBody();
  fillSections().catch(err => console.warn('Home sections unavailable:', err));
}

// --- Actions -----------------------------------------------------------------

async function runAction(action, key) {
  switch (action) {
    case 'enter':
      closeWelcome();
      break;

    case 'scenario': {
      // One authoritative scenario loader, shared with the scenario browser.
      const { loadScenarioByKey } = await import('./ui.js');
      const loaded = loadScenarioByKey(key);
      closeWelcome();
      if (!loaded) {
        const { toast } = await import('./controls.js');
        toast(t('welcome.scenarioGone'));
      }
      break;
    }

    case 'scenarios': {
      closeWelcome();
      // The real gallery, not a second copy of the catalog.
      const { openScenarioBrowser } = await import('./scenarioBrowser.js');
      openScenarioBrowser();
      break;
    }

    case 'investigations': {
      closeWelcome();
      const { ensureInvestigations } =
        await import('./investigationsLoader.js');
      (await ensureInvestigations()).openBrowser();
      break;
    }

    case 'lesson': {
      closeWelcome();
      const { ensureInvestigations } =
        await import('./investigationsLoader.js');
      (await ensureInvestigations()).openInvestigation(key);
      break;
    }

    case 'tour': {
      closeWelcome();
      const { openTutorial } = await import('./tutorial.js');
      openTutorial();
      break;
    }

    case 'instructors':
      window.location.href = RESOURCE_LINKS.instructors.href;
      break;

    case 'reset': {
      resetWelcomePreference();
      const btn = els.body?.querySelector('[data-action="reset"]');
      if (btn) {
        btn.textContent = t('welcome.shownAgain');
        btn.disabled = true;
      }
      break;
    }

    default:
      break;
  }
}

function wireBody() {
  els.body.addEventListener('click', e => {
    const scenario = e.target.closest('[data-scenario]');
    if (scenario) {
      runAction('scenario', scenario.dataset.scenario);
      return;
    }
    const lesson = e.target.closest('[data-lesson]');
    if (lesson) {
      runAction('lesson', lesson.dataset.lesson);
      return;
    }
    const action = e.target.closest('[data-action]');
    if (action) runAction(action.dataset.action);
  });
}

// --- Focus containment -------------------------------------------------------

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Keep Tab inside the layer.
 *
 * The interface underneath is a toolbar of forty-odd controls. Without this a
 * visitor tabbing through the welcome screen would walk straight out of it into
 * a rail they cannot see, which is disorienting with a keyboard and completely
 * lost with a screen reader. `inert` on the rest of the document does the same
 * job for assistive technology and is applied in openWelcome().
 */
function trapFocus(e) {
  if (e.key !== 'Tab' || !open || !els.screen) return;
  // Home is a page of the shell: the bar above it is part of it, and Tab
  // moves through both.
  const bar = document.querySelector('.gs-shell');
  const items = [
    ...(bar ? bar.querySelectorAll(FOCUSABLE) : []),
    ...els.screen.querySelectorAll(FOCUSABLE),
  ].filter(el => el.offsetParent !== null || el === document.activeElement);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * Hide the rest of the page from assistive technology while the door is open.
 *
 * Only the siblings of the welcome layer are marked, so the layer itself and
 * the splash stay reachable.
 *
 * @param {boolean} on - True to hide, false to restore
 */
/** The elements setBackgroundInert(true) changed, to restore and no others. */
let madeInert = [];

function setBackgroundInert(on) {
  if (!els.screen) return;
  if (!on) {
    // Only what this layer changed. It used to clear inert from every child of
    // <body>, which un-hid closed dialogs that were inert before Home opened.
    for (const node of madeInert) {
      node.removeAttribute('inert');
      node.removeAttribute('aria-hidden');
    }
    madeInert = [];
    return;
  }
  for (const node of document.body.children) {
    // The layer, and the shell's bar above it, which stays usable.
    if (node === els.screen || node.classList.contains('gs-shell')) continue;
    // A live region stays audible: what is announced over Home is still said.
    if (node.matches('[aria-live], [role="status"], [role="alert"]')) continue;
    if (node.hasAttribute('inert')) continue;
    node.setAttribute('inert', '');
    node.setAttribute('aria-hidden', 'true');
    madeInert.push(node);
  }
}

// --- Open and close ----------------------------------------------------------

/**
 * Offer to show Home again on a manually reopened Home only: on a first
 * visit the preference has not been set yet. Called on every open, and when
 * the sections arrive.
 */
function syncReset() {
  const reset = els.body?.querySelector('[data-action="reset"]');
  if (!reset) return;
  reset.hidden = auto;
  reset.disabled = false;
  reset.textContent = t('welcome.showAgain');
}

/**
 * Present the front door.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.automatic] - True on a first visit, when the layer is
 *   standing in for the interface and closing it must reveal that interface.
 *   False when reopened over a running sandbox, which must not be disturbed.
 * @param {Function} [opts.onEnter] - Called once, when an automatic door closes
 */
export function openWelcome(opts = {}) {
  if (!els.screen || open) return;
  auto = Boolean(opts.automatic);
  if (opts.onEnter) onEnter = opts.onEnter;
  lastFocus = document.activeElement;

  build();
  els.screen.hidden = false;
  // The class carries two jobs: it lets the scenario card in ui.js know not to
  // raise itself yet, and it holds the page still while the layer scrolls.
  document.body.classList.add('welcome-open');
  document.body.classList.toggle('welcome-automatic', auto);
  open = true;
  setBackgroundInert(true);

  // A manually reopened door can be dismissed and put back. Offering to reset
  // the preference makes sense there and nowhere else: on a first visit the
  // preference has not been set yet.
  syncReset();

  els.screen.scrollTop = 0;
  // Reading a layout property forces the style change from `hidden` to flush
  // before the class lands, which is what makes the opacity transition run.
  // requestAnimationFrame would do the same, but it does not fire in a
  // background tab: a visitor who opened Gravitas in a tab and switched away
  // would come back to a layer stuck at zero opacity with the interface behind
  // it still hidden. The same trap the splash reveal was already written to
  // avoid.
  void els.screen.offsetHeight;
  els.screen.classList.add('is-shown');
  // Focus the panel rather than the first button, so a screen reader reads the
  // heading and lede before announcing a control.
  els.dialog?.focus();
  document.addEventListener('keydown', trapFocus, true);
}

/**
 * Dismiss the front door.
 *
 * Closing it never touches the simulation: no rebuild, no settings, no camera,
 * no scenario change. The world that was initialized behind the layer is the
 * world the visitor lands in, which is what makes entering instant.
 */
export function closeWelcome() {
  if (!els.screen || !open) return;
  open = false;
  document.removeEventListener('keydown', trapFocus, true);

  // Only an intentional pass through the front door records it. A door skipped
  // by a deep link never opens, so it can never mark itself seen here.
  markWelcomeSeen();
  // Leaving Home by name leaves its name out of the address, so a reload
  // lands in the sandbox the reader chose.
  if (location.hash === '#home')
    history.replaceState(null, '', location.pathname + location.search);

  els.screen.classList.remove('is-shown');
  setBackgroundInert(false);

  const finish = () => {
    // Focus must leave before the layer is hidden. A focused element inside a
    // `hidden` subtree leaves the keyboard with nowhere sensible to go next,
    // and a screen reader announcing an element that is no longer rendered.
    if (els.screen.contains(document.activeElement))
      document.activeElement.blur();
    els.screen.hidden = true;
    document.body.classList.remove('welcome-open', 'welcome-automatic');

    if (auto && onEnter) {
      const fn = onEnter;
      onEnter = null;
      fn();
    } else if (!auto) {
      // Reopened from the footer: hand focus back where it came from. A
      // programmatic open leaves lastFocus on <body>, which cannot take focus,
      // so the control that opens it is the fallback.
      const back =
        lastFocus && document.contains(lastFocus) && lastFocus !== document.body
          ? lastFocus
          : els.reopen;
      back?.focus?.();
    }
    auto = false;
  };

  // Match the CSS fade, and skip it entirely when the visitor has asked for
  // less motion or when the transition will not fire.
  const reduced = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)'
  )?.matches;
  if (reduced) finish();
  else setTimeout(finish, 260);
}

/** @returns {boolean} True while the front door is showing */
export const isWelcomeOpen = () => open;

// --- Wiring ------------------------------------------------------------------

/**
 * Wire up the front door. Safe to call once, from main.js.
 *
 * Does not decide whether to show it: main.js coordinates start-up and calls
 * openWelcome() at the moment the splash clears, so the two layers never
 * overlap and the interface underneath is never revealed for a frame first.
 */
export function initWelcome() {
  els = {
    screen: document.getElementById('welcomeScreen'),
    dialog: document.getElementById('welcomeDialog'),
    body: document.getElementById('welcomeBody'),
    close: document.getElementById('welcomeClose'),
    reopen: document.getElementById('aboutGravitasBtn'),
  };
  if (!els.screen || !els.body) return;

  els.close?.addEventListener('click', () => closeWelcome());

  els.reopen?.addEventListener('click', e => {
    e.preventDefault();
    openWelcome({ automatic: false });
  });

  // Escape closes a door the visitor opened themselves. On a first visit it
  // does too: the layer is a modal, and a modal that cannot be escaped is a
  // trap. Either way "enter the sandbox" is what closing means.
  window.addEventListener('gravitasEscape', () => {
    if (open) closeWelcome();
  });

  // Clicking the backdrop outside the panel, the same as every other overlay
  // in the app.
  els.screen.addEventListener('click', e => {
    if (e.target === els.screen) closeWelcome();
  });
}
