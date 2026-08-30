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

// Versioned on purpose. Bumping it shows the front door once more to everyone
// who has already dismissed it, which is right for a genuine redesign and wrong
// for a copy edit. Do not bump it for wording.
export const WELCOME_SEEN_KEY = 'gravitas_welcome_seen_v1';

let els = {};
let open = false;
// Whether the layer is standing in for the interface (first visit) or floating
// over a running sandbox (reopened from the footer). The two close differently.
let auto = false;
let onEnter = null;
let lastFocus = null;
let built = false;

// --- Storage -----------------------------------------------------------------
//
// Every access is guarded. Safari in private mode throws on setItem, some
// embedded browsers throw on the getter itself, and a visitor with storage
// disabled must still get a working simulator. The fallback everywhere is the
// behavior of a first-time visitor: show the door, let them dismiss it, and
// accept that the dismissal will not survive the reload.

/** @returns {boolean} True if this browser has recorded the door as seen */
export function isWelcomeSeen() {
  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Record that the visitor has been through the front door. */
export function markWelcomeSeen() {
  try {
    window.localStorage.setItem(WELCOME_SEEN_KEY, '1');
  } catch {
    /* the visit still works; the preference just will not persist */
  }
}

/** Forget the front door, so the next ordinary visit shows it again. */
export function resetWelcomePreference() {
  try {
    window.localStorage.removeItem(WELCOME_SEEN_KEY);
    return true;
  } catch {
    return false;
  }
}

// --- Should it open? ---------------------------------------------------------

/**
 * Does this URL name something the visitor specifically asked for?
 *
 * Both forms are matched against the actual link architecture rather than an
 * invented query string: share.js writes `#<n><z|r><payload>` and
 * investigations.js reads `#investigation=<id>`. Someone opening an
 * instructor's assignment must not have it covered by an introduction.
 *
 * @param {string} [hash] - Defaults to the current fragment
 * @returns {boolean} True if the URL encodes an intentional destination
 */
export function hasDeepLinkDestination(hash) {
  const h = hash === undefined ? window.location?.hash || '' : hash || '';
  // Kept in step with hasSharedLink() in share.js and investigationFromHash()
  // in investigations.js. Duplicated rather than imported because this runs
  // during start-up coordination, before either module is needed.
  return /^#\d+[zr]./.test(h) || /^#investigation=[\w-]+$/.test(h);
}

/**
 * Should the front door open by itself on this load?
 *
 * @param {Object} [opts]
 * @param {string} [opts.hash] - Fragment to test, for tests
 * @param {boolean} [opts.seen] - Override the stored preference, for tests
 * @returns {boolean} True to present the welcome layer automatically
 */
export function shouldShowWelcome(opts = {}) {
  const hash = opts.hash === undefined ? undefined : opts.hash;
  if (hasDeepLinkDestination(hash)) return false;
  const seen = opts.seen === undefined ? isWelcomeSeen() : opts.seen;
  return !seen;
}

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
 * Takes the registry rather than importing it: the lesson data is loaded
 * lazily, so the only caller already has it in hand by the time it asks.
 *
 * @param {Array<Object>} registry - INVESTIGATIONS
 * @param {number} [n] - How many
 * @returns {Array<Object>} id, title, subtitle and step count for each
 */
export function previewInvestigations(registry, n = 3) {
  return registry.slice(0, n).map(inv => ({
    id: inv.id,
    title: inv.title,
    subtitle: inv.subtitle,
    steps: inv.steps.length,
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
        <p class="wel-door-eyebrow">${escape(c.eyebrow)}</p>
        <h3 class="wel-door-title">${escape(c.title)}</h3>
        <p class="wel-door-text">${escape(c.text)}</p>
        <button type="button" class="ui-button wel-door-cta" data-action="${escape(c.action)}">
          ${escape(c.cta)}
        </button>
      </div>`
  ).join('');
}

function audiencesHtml() {
  return AUDIENCES.map(
    a => `
      <div class="wel-audience">
        <h3>${escape(a.title)}</h3>
        <p>${escape(a.text)}</p>
      </div>`
  ).join('');
}

/**
 * Fill in the lesson previews once the registry has loaded.
 *
 * The section renders without them and they drop in a moment later, rather than
 * the panel waiting on a 225KB import before it can show anything. If the
 * import fails the list simply stays empty: the button beneath it goes to the
 * real browser either way, so nothing is lost but a flourish.
 */
async function fillLessonPreviews() {
  const list = els.body?.querySelector('.wel-lessons');
  if (!list) return;
  try {
    // Imported here rather than at the top of the module. The registry carries
    // every lesson's full text: 225KB, which used to be pulled into the
    // start-up bundle for the sake of three titles on a page most visitors see
    // once. Fetching it when the panel is built keeps it off the critical path,
    // and by the time anyone clicks through to a lesson it is already warm.
    const { INVESTIGATIONS } = await import('./data/investigations.js');
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
  } catch {
    list.remove();
  }
}

/** Fill the shell in index.html. Runs once, lazily, on the first open. */
function build() {
  if (built || !els.body) return;
  built = true;
  const total = Object.keys(SCENARIO_INFO).length;

  els.body.innerHTML = `
    <header class="wel-hero">
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
    </header>

    <section class="wel-section wel-what" aria-labelledby="welWhat">
      <h2 id="welWhat" class="wel-h2">What Gravitas is</h2>
      <p class="wel-say">
        A gravity simulation you can steer, paired with guided astronomy lessons
        that use it. Change a system, predict what will happen, run it, measure
        the result, and connect that back to the physics. Nothing here is a
        recorded animation: every orbit on screen is being integrated as you
        watch.
      </p>
      <div class="wel-triad">
        <div class="wel-point">
          <h3>Build</h3>
          <p>
            Place stars, planets and black holes by dragging, and change any
            object's mass, velocity or position while it moves.
          </p>
        </div>
        <div class="wel-point">
          <h3>Explore</h3>
          <p>
            Load ${total} scenarios, from the Solar System and TRAPPIST-1 to the
            GW150914 black-hole merger and a star torn apart by tides.
          </p>
        </div>
        <div class="wel-point">
          <h3>Learn</h3>
          <p>
            Work through <span data-lesson-count>guided</span> investigations
            with predictions, measurements, plots and a lab report you can hand
            in.
          </p>
        </div>
      </div>
    </section>

    <section class="wel-section" aria-labelledby="welDoors">
      <h2 id="welDoors" class="wel-h2">Three ways in</h2>
      <div class="wel-doors">${entryCardsHtml()}</div>
    </section>

    <section class="wel-section" aria-labelledby="welScenarios">
      <div class="wel-section-head">
        <h2 id="welScenarios" class="wel-h2">Featured scenarios</h2>
        <button type="button" class="wel-quiet" data-action="scenarios">
          Browse all ${total} scenarios
        </button>
      </div>
      <div class="wel-scenarios">${scenarioCardsHtml()}</div>
    </section>

    <section class="wel-section wel-lessons-block" aria-labelledby="welLessons">
      <h2 id="welLessons" class="wel-h2">Guided investigations</h2>
      <p class="wel-say">
        Structured undergraduate astronomy activities built into the simulation
        rather than bolted on beside it. Each one asks for a prediction before
        it shows you anything, hands you an instrument to measure with, plots
        your own readings back to you, saves your progress, and exports a lab
        report as a PDF.
      </p>
      <ul class="wel-lessons"></ul>
      <button type="button" class="ui-button wel-secondary" data-action="investigations">
        Browse investigations
      </button>
    </section>

    <section class="wel-section" aria-labelledby="welWho">
      <h2 id="welWho" class="wel-h2">Who it is for</h2>
      <div class="wel-audiences">${audiencesHtml()}</div>
    </section>

    <section class="wel-section wel-teaching" aria-labelledby="welTeaching">
      <h2 id="welTeaching" class="wel-h2">Teaching with Gravitas</h2>
      <p class="wel-say">
        Written for introductory undergraduate astronomy, including
        general-education and non-science-major courses. Every investigation
        ships with an instructor guide, stated learning objectives, expected
        measurements and a generated answer key. The simulation's assumptions
        and approximations are documented in public.
      </p>
      <div class="wel-links">
        <a class="wel-link" href="${RESOURCE_LINKS.instructors.href}">
          <span class="wel-link-label">${escape(RESOURCE_LINKS.instructors.label)}</span>
          <span class="wel-link-note">${escape(RESOURCE_LINKS.instructors.note)}</span>
        </a>
        <a class="wel-link" href="${RESOURCE_LINKS.model.href}">
          <span class="wel-link-label">${escape(RESOURCE_LINKS.model.label)}</span>
          <span class="wel-link-note">${escape(RESOURCE_LINKS.model.note)}</span>
        </a>
      </div>
    </section>

    <footer class="wel-foot">
      <button type="button" class="ui-button wel-primary" data-action="enter">
        Enter the sandbox
      </button>
      <p class="wel-foot-note">
        This introduction appears once. You can reopen it any time from
        <strong>About Gravitas</strong>, under <strong>Learn</strong> at the
        bottom of the control panel.
      </p>
      <button type="button" class="wel-quiet wel-reset" data-action="reset" hidden>
        Show this again on my next visit
      </button>
    </footer>`;

  wireBody();
  // The same treatment the gallery gives a capture that fails to load.
  wireThumbnailFallbacks(els.body);
  // Everything above renders from data already in memory. The lesson titles and
  // the count come from the registry, which is fetched separately so the panel
  // does not wait on it.
  fillLessonPreviews();
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
        toast('That scenario is no longer available.');
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
      const { ensureInvestigations } = await import(
        './investigationsLoader.js'
      );
      (await ensureInvestigations()).openBrowser();
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
        btn.textContent = 'It will be shown again next time';
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
  const items = [...els.screen.querySelectorAll(FOCUSABLE)].filter(
    el => el.offsetParent !== null || el === document.activeElement
  );
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
function setBackgroundInert(on) {
  if (!els.screen) return;
  for (const node of document.body.children) {
    if (node === els.screen) continue;
    if (on) {
      node.setAttribute('inert', '');
      node.setAttribute('aria-hidden', 'true');
    } else {
      node.removeAttribute('inert');
      node.removeAttribute('aria-hidden');
    }
  }
}

// --- Open and close ----------------------------------------------------------

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
  const reset = els.body?.querySelector('[data-action="reset"]');
  if (reset) {
    reset.hidden = auto;
    reset.disabled = false;
    reset.textContent = 'Show this again on my next visit';
  }

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
