// =============================================================================
// The front door
// -----------------------------------------------------------------------------
// A first-time visitor arriving at Gravitas used to land in the middle of a
// simulation control rail and have to work out from "Load Scenario", "Spacetime
// View" and "Blank Simulation" what the project was for. This layer answers
// that question once, says where to start and where everything is, and then
// never appears again.
//
// It is an orientation layer, not a homepage. The sandbox stays the product:
//   first visit        splash -> welcome -> sandbox
//   every visit after  splash -> sandbox
//   shared/deep link   splash -> the linked thing, welcome skipped and NOT
//                      marked seen, so an ordinary visit later still gets it
//   first-week mode    splash -> Home showing one list and nothing else, on
//                      every plain visit until the list is finished or left
//                      (Prompt 277; ONBOARDING.md)
//
// Nothing here reimplements anything. A recommended start opens the real
// investigation or page, the tour button opens the real tour in tutorial.js,
// and the first-week list and the five destinations are generated into
// js/fragments/home.html from the Library and tools/navigation-inventory.json
// (Prompt 162), so no title or line of prose is written twice.
// =============================================================================

// The four functions that decide whether this layer is needed live in
// js/welcomeGate.js, so that deciding can happen without downloading this. They
// are re-exported here because this is where their callers and their tests
// have always looked for them.
export {
  WELCOME_SEEN_KEY,
  firstWeekText,
  keep,
  isWelcomeSeen,
  markWelcomeSeen,
  resetWelcomePreference,
  hasDeepLinkDestination,
  shouldShowWelcome,
} from './welcomeGate.js';

import {
  firstWeekText,
  isOrientationSeen,
  keep,
  markOrientationSeen,
  markWelcomeSeen,
  resetWelcomePreference,
} from './welcomeGate.js';
import { getLocale, t } from './i18n/index.js';
import { announce } from './notify.js';

// This module's prose lives in the deferred half of the catalog - see the
// note in js/i18n/en.deferred.js. Registered from here rather than left to the
// caller, because nothing in the start-up path can reach this module and a
// reader who does reach it must not see message ids.
import {
  ensureDeferredMessages,
  loadFragment,
  mountFragment,
} from './i18n/deferredMessages.js';
import {
  EV_ESCAPE,
  KEY_FIRST_WEEK,
  KEY_NEXT_CONTEXT,
  KEY_RESUME,
} from './names.js';

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
 * The items of the one resume record (js/storage/local.js owns it), newest
 * first. Home only reads it, and reads it here, not through that module: the
 * module would be one more request on every lesson route in the build.
 * tests/resumeRecord.test.js holds this reader to the module's, record by
 * record.
 *
 * @param {() => ?string} [raw] - The stored text
 * @returns {Array<{id: string, route: string, title?: {en: string, es?: string}}>}
 */
export function resumeItems(raw = () => localStorage.getItem(KEY_RESUME)) {
  let record = null;
  try {
    record = JSON.parse(raw());
  } catch {
    return [];
  }
  if (record?.v !== 1 || !Array.isArray(record.items)) return [];
  const seen = new Set();
  const out = [];
  for (const i of record.items) {
    if (
      typeof i?.id !== 'string' ||
      !/^[\w.:/-]+$/.test(i.id) ||
      i.id.length > 120 ||
      typeof i.route !== 'string' ||
      !i.route.startsWith('/') ||
      i.route.startsWith('//') ||
      i.route.length > 240 ||
      seen.has(i.id)
    )
      continue;
    seen.add(i.id);
    out.push({ id: i.id, route: i.route, title: i.title });
  }
  return out;
}

/**
 * What Home's "where was I" lists: the item opened last first, then the
 * lessons begun and not finished, at most three. A lesson is a button that
 * opens it here (its address is the fallback); anything else is a link, and is
 * named by the title the Library wrote into the record.
 *
 * @param {Array<Object>} catalog - The manifest
 * @param {Array<Object>} items - From resumeItems
 * @param {Array<Object>} going - From unfinishedLessons
 * @returns {Array<{id: string, title: {en: string, es?: string}, route: ?string, seen?: number, total?: number}>}
 */
export function continueRows(catalog, items, going) {
  const lessons = new Map(catalog.map(inv => [inv.id, inv]));
  const progress = new Map(going.map(g => [g.id, g]));
  const rows = [];
  const add = row => {
    if (rows.length < 3 && !rows.some(r => r.id === row.id)) rows.push(row);
  };
  for (const item of items) {
    const lesson = lessons.get(item.id.replace(/^investigation:/, ''));
    if (lesson && item.id.startsWith('investigation:')) {
      const g = progress.get(lesson.id);
      add({
        id: lesson.id,
        title: { en: lesson.title },
        route: null,
        ...(g ? { seen: g.seen, total: g.total } : {}),
      });
    } else if (item.title?.en)
      add({ id: item.id, title: item.title, route: item.route });
  }
  for (const g of going)
    add({
      id: g.id,
      title: { en: g.title },
      route: null,
      seen: g.seen,
      total: g.total,
    });
  return rows;
}

/**
 * Fill in the lessons to continue, once the registry has loaded.
 *
 * The strip is hidden until there is something in it ("where was I" shows
 * only when something exists), and the registry is the manifest: a few
 * kilobytes of card-level facts, not the 225KB of lessons themselves, which
 * are fetched one at a time when one is opened. If the import fails the
 * strip simply stays hidden.
 */
async function fillContinue() {
  try {
    const { MANIFEST: INVESTIGATIONS } =
      await import('./data/investigations/registry.js');
    const going = unfinishedLessons(INVESTIGATIONS);
    const rows = continueRows(INVESTIGATIONS, resumeItems(), going);
    const strip = els.body?.querySelector('#welContinue');
    if (strip && rows.length) {
      const name = r =>
        r.title.es
          ? `<span class="gs-en">${escape(r.title.en)}</span><span class="gs-es" lang="es">${escape(r.title.es)}</span>`
          : escape(r.title.en);
      strip.querySelector('ul').innerHTML = rows
        .map(
          r =>
            `<li class="wel-lesson">${
              r.route
                ? `<a class="wel-quiet" href="${escape(r.route)}">${name(r)}</a>`
                : `<button type="button" class="wel-quiet" data-lesson="${escape(r.id)}">${name(r)}</button>`
            }${
              r.total
                ? `
          <span class="wel-lesson-meta"><span class="gs-en">${r.seen} of ${r.total} steps seen</span><span class="gs-es" lang="es">${r.seen} de ${r.total} pasos vistos</span></span>`
                : ''
            }</li>`
        )
        .join('');
      strip.hidden = false;
    }
  } catch {
    /* the strip stays hidden */
  }
}

// Home's sections, asked for as this module loads, so they arrive with it.
const sections = loadFragment('home');
sections.catch(() => {});

// The first-run introduction: three screens inside Home, so Home's place in
// the order (PLATFORM_MODEL.md, "First run") is the introduction's too.
let orienting = false;
const orientEl = () => els.body?.querySelector('#welOrient');

function showOrient(i) {
  const box = orientEl();
  if (!box) return;
  box.hidden = false;
  box.querySelectorAll('[data-orient]').forEach(s => {
    s.hidden = Number(s.dataset.orient) !== i;
  });
  box.querySelectorAll('[data-n]').forEach(n => (n.textContent = i + 1));
  // In the first-week mode it sits in the first item, in place of its link.
  box.parentElement.classList.add('is-orienting');
  const h = box.querySelector(`[data-orient="${i}"] [data-orient-h]`);
  h?.focus();
  announce(`${box.querySelector('#welOrientCount').innerText}. ${h.innerText}`);
}

/** Skip, finish or leave Home: the introduction is over and is not shown again. */
function endOrient(focus) {
  if (!orienting) return;
  orienting = false;
  markOrientationSeen();
  document.body.classList.remove('wel-orienting');
  const box = orientEl();
  if (box) {
    box.hidden = true;
    box.parentElement.classList.remove('is-orienting');
  }
  if (focus)
    els.body
      ?.querySelector(
        weekOn() ? '.wel-week-go' : '.wel-start [data-action="enter"]'
      )
      ?.focus();
}

// --- The first week (Prompt 277) ---------------------------------------------
//
// A mode of Home: one list, in order, with the place to continue marked, and
// nothing else on the page but the five destinations' names. The list is the
// record the course home left when a collection marked "first week" was opened
// by its link (js/library/firstWeek.js writes it; this reads and checks it,
// since stored text is never trusted). The mode lasts until every item is done
// or the reader leaves it, which is one press.

const short = (v, max) =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
/** The most items a first week holds (js/course/pack.js MAX_FIRST_WEEK_ITEMS). */
const WEEK_MAX = 7;

/**
 * The first-week record, or null unless every part of it is what Home can show:
 * a title, one to seven items, each with a title and an address on this site.
 *
 * @param {?string} [text] - The stored text
 * @returns {?{v: 1, t: {en: string, es?: string}, mo?: string, items: Array<{t: {en: string, es?: string}, h: string, l?: string, d?: string, n?: number, o?: 1}>}}
 */
export function readWeek(text = firstWeekText()) {
  let r = null;
  try {
    r = JSON.parse(text);
  } catch {
    return null;
  }
  const ok =
    r?.v === 1 &&
    short(r.t?.en, 120) &&
    Array.isArray(r.items) &&
    r.items.length > 0 &&
    r.items.length <= WEEK_MAX &&
    r.items.every(
      i =>
        short(i?.t?.en, 200) &&
        short(i.h, 4000) &&
        // On this site: one leading slash, no backslash, no space.
        /^\/(?!\/)[^\\\s]*$/.test(i.h) &&
        (i.l === undefined || /^[\w-]+$/.test(i.l)) &&
        (i.d === undefined || /^\w+$/.test(i.d))
    );
  return ok ? r : null;
}

/** A lesson is done when every step was seen; anything else once it was opened. */
const weekDone = (i, read = savedProgress) =>
  i.l ? i.n > 0 && (read(i.l)?.seen ?? 0) >= i.n : i.o === 1;

/**
 * Where a first week stands: each item's state, in order. The first item not
 * done is the one to start or continue; `on` is false once all are done.
 *
 * @param {object} week - From readWeek
 * @param {(id: string) => ?{seen: number}} [read] - Saved lesson progress
 * @returns {{on: boolean, states: string[]}} 'start', 'next', 'done', 'opened' or ''
 */
export function weekStates(week, read = savedProgress) {
  const at = week.items.findIndex(i => !weekDone(i, read));
  return {
    on: at >= 0,
    states: week.items.map((i, n) =>
      n === at
        ? n === 0 && !(i.l && read(i.l))
          ? 'start'
          : 'next'
        : weekDone(i, read)
          ? i.l
            ? 'done'
            : 'opened'
          : ''
    ),
  };
}

const weekOn = () => document.body.classList.contains('wel-week-on');

/** Two languages as two spans, or the one there is, written as text. */
function words(node, { en, es }) {
  node.replaceChildren(
    ...(short(es, 200)
      ? [
          Object.assign(document.createElement('span'), {
            className: 'gs-en',
            textContent: en,
          }),
          Object.assign(document.createElement('span'), {
            className: 'gs-es',
            lang: 'es',
            textContent: es,
          }),
        ]
      : [en])
  );
}

/** Show a line Home keeps for the moment a first week ends, and say it. */
function weekNote(id, title) {
  const note = els.body?.querySelector(id);
  if (!note) return;
  if (title) words(note.querySelector('[data-name]'), title);
  note.hidden = false;
  announce(note.innerText);
}

/**
 * Draw Home as the first week, or as itself. Called when the sections arrive
 * and on every open, since a lesson may have been finished in between.
 */
function showWeek() {
  const box = els.body?.querySelector('#welWeek');
  if (!box) return;
  // A line said when a first week ended is said once.
  for (const id of ['#welWeekDone', '#welWeekLeft'])
    els.body.querySelector(id).hidden = true;
  const week = readWeek();
  const { on, states } = week ? weekStates(week) : { on: false };
  // Finished, or not a record Home can show: the mode is over.
  if (!on && firstWeekText()) {
    keep(KEY_FIRST_WEEK, null);
    if (week) weekNote('#welWeekDone', week.t);
  }
  document.body.classList.toggle('wel-week-on', on);
  box.hidden = !on;
  const orient = orientEl();
  const list = box.querySelector('ol');
  if (!on) {
    // The introduction goes back to the head of Home.
    if (orient && list.contains(orient))
      els.body.querySelector('#welcomeSections').prepend(orient);
    list.replaceChildren();
    return;
  }
  words(box.querySelector('#welWeekTitle'), week.t);
  const item = box.querySelector('template').content.firstElementChild;
  list.replaceChildren(
    ...week.items.map((it, n) => {
      const li = item.cloneNode(true);
      const state = n ? states[n] : `${states[n]} first`;
      for (const part of li.querySelectorAll('[data-when]'))
        if (!state.split(' ').includes(part.dataset.when)) part.remove();
      const go = li.querySelector('.wel-week-go');
      go.href = it.h;
      go.dataset.week = n;
      words(go.querySelector('[data-name]'), it.t);
      if (/start|next/.test(state)) {
        go.classList.add('ui-button', 'wel-primary');
        li.setAttribute('aria-current', 'step');
      }
      return li;
    })
  );
  // The introduction is folded into the first item.
  if (orient) list.firstElementChild.append(orient);
}

/** An item was followed: note it, and leave the lesson's finish panel its way on. */
function followWeek(n) {
  const week = readWeek();
  const it = week?.items[n];
  if (!it) return;
  if (!it.l) it.o = 1;
  keep(KEY_FIRST_WEEK, JSON.stringify(week));
  const say = x => (getLocale() === 'es' && x.es) || x.en;
  keep(
    KEY_NEXT_CONTEXT,
    JSON.stringify({
      k: 'course',
      home: '/#home',
      t: say(week.t),
      i: n,
      items: week.items.map(x => [x.l || '', x.d || '', say(x.t)]),
    })
  );
}

/** Put the sections in place and fill them. Runs once, after build(). */
async function fillSections() {
  mountFragment('home', await sections);
  const node = document.getElementById('welcomeSections');
  if (!node || !els.body) return;
  els.body.append(node);
  syncReset();
  showWeek();
  if (orienting) showOrient(0);
  fillContinue();
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
      <p class="wel-eyebrow"><span class="gs-en">Interactive astrophysics in your browser</span><span class="gs-es" lang="es">Astrofísica interactiva en tu navegador</span></p>
      <h1 class="wel-wordmark" id="welcomeTitle">GRAVITAS</h1>
      <p class="wel-lede">
        <span class="gs-en">Build planetary systems, orbit binary stars, collide compact objects and
        reproduce systems astronomers have actually observed. Then measure what
        happens.</span><span class="gs-es" lang="es">Construye sistemas planetarios, haz orbitar estrellas binarias, colisiona objetos compactos y reproduce sistemas que los astrónomos han observado de verdad. Después, mide lo que ocurre.</span>
      </p>
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

    case 'orient':
      // The introduction again, on request: it is never forced a second time.
      orienting = true;
      document.body.classList.toggle('wel-orienting', !weekOn());
      showOrient(0);
      break;

    case 'leave':
      // One press, and Home is all of itself again; the link opens the mode anew.
      endOrient(false);
      keep(KEY_FIRST_WEEK, null);
      showWeek();
      weekNote('#welWeekLeft');
      els.dialog?.focus();
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
    const item = e.target.closest('[data-week]');
    if (item) {
      // A link, followed as one: the address opens the item on this page or
      // another, and Home closes behind it.
      followWeek(Number(item.dataset.week));
      // Opened in another tab or window, Home stays where it is.
      if (!(e.ctrlKey || e.metaKey || e.shiftKey)) closeWelcome();
      return;
    }
    const lesson = e.target.closest('[data-lesson]');
    if (lesson) {
      // A link into the lesson (its address is the fallback) or a button.
      e.preventDefault();
      runAction('lesson', lesson.dataset.lesson);
      return;
    }
    const o = e.target.closest('[data-orient-act]');
    if (o) {
      const i = Number(o.closest('[data-orient]').dataset.orient);
      const a = o.dataset.orientAct;
      if (a === 'next') showOrient(i + 1);
      else if (a === 'back') showOrient(i - 1);
      else endOrient(true);
      return;
    }
    const action = e.target.closest('[data-action]');
    if (action) {
      // Explore is a link to the sandbox, which Home already stands over.
      e.preventDefault();
      runAction(action.dataset.action);
      return;
    }
    // A destination followed from the introduction ends it, as leaving Home does.
    if (e.target.closest('[data-orient] a')) endOrient(false);
  });
  els.body.addEventListener('keydown', e => {
    const s = e.target.closest?.('[data-orient]');
    if (!s || e.altKey || e.ctrlKey || e.metaKey) return;
    const i = Number(s.dataset.orient);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1 }[e.key];
    if (to >= 0 && to < 3) {
      e.preventDefault();
      showOrient(to);
    }
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

  // Only a first, automatic Home carries it; the page then shows nothing else
  // until it ends (css: .wel-orienting).
  orienting = auto && !isOrientationSeen();
  // The first week keeps its list on the page; the introduction is in its
  // first item, not in place of Home.
  const week = readWeek();
  document.body.classList.toggle(
    'wel-orienting',
    orienting && !(week && weekStates(week).on)
  );
  if (built) showWeek();
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
  endOrient(false);
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
      // The layer held focus until a moment ago; leaving it on <body> would
      // send a keyboard user back to the top of the page. The shell's brand
      // link is the first stop of the interface that has just been revealed.
      if (!document.activeElement || document.activeElement === document.body)
        document.querySelector('.gs-brand')?.focus?.({ preventScroll: true });
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
  const reduced =
    document.documentElement.dataset.motion ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (reduced) finish();
  else setTimeout(finish, 260);
}

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
  window.addEventListener(EV_ESCAPE, () => {
    if (open) closeWelcome();
  });

  // Clicking the backdrop outside the panel, the same as every other overlay
  // in the app.
  els.screen.addEventListener('click', e => {
    if (e.target === els.screen) closeWelcome();
  });
}
