// =============================================================================
// Guided tour
// -----------------------------------------------------------------------------
// A step-through introduction to the things the interface cannot say for
// itself. Not a feature list: each step is here because a reader who has not
// been told will not guess it, and the ones that earn their place are the
// gestures (drag sets velocity, Shift snaps a circular orbit), the modes
// (placement has to be armed) and the instruments that look like decoration
// until you know they are measuring something.
//
// Each step names a real element to spotlight. The spotlight is a four-panel
// scrim rather than a translucent sheet, so the highlighted control stays at
// full brightness and remains genuinely readable.
//
// Every string is a translation key resolved at render time rather than at
// module load. The old version called t() while building the array, which ran
// before the Spanish catalogue had finished arriving - it is a dynamic import -
// so a Spanish reader got English titles until they reloaded. The bodies were
// not translatable at all.
//
// Targets are verified by tests/tutorial.test.js against index.html, because a
// tour that spotlights an element which no longer exists silently degrades into
// a tour with no spotlight and nobody notices.
// =============================================================================

import { t } from './i18n/index.js';

/**
 * The tour.
 *
 * `id` keys the three strings in the catalogues: `tutorial.<id>.title`,
 * `.body` and `.tip`. `target` is a selector to spotlight, or null for a step
 * that is about the whole application rather than one control.
 */
const STEPS = [
  { id: 'welcome', target: null },
  { id: 'choose', target: '#objectTypeBtn' },
  { id: 'place', target: '#simulationCanvas' },
  { id: 'inspect', target: '#simulationCanvas' },
  { id: 'transport', target: '#timelineBar' },
  { id: 'rewind', target: '#timelineBar' },
  { id: 'scenario', target: '#loadScenarioBtn' },
  { id: 'investigations', target: '#investigationsBtn' },
  { id: 'measure', target: '#toggleRuler' },
  { id: 'instruments', target: '#toggleLightCurve' },
  { id: 'rotation', target: '#toggleRotationCurve' },
  { id: 'bench', target: '#toggleExperiments' },
  { id: 'units', target: '#unitToggle' },
  { id: 'settings', target: '#settingsBtn' },
  { id: 'share', target: '#shareBtn' },
  { id: 'done', target: null },
];

/** The three strings for a step, resolved now rather than at import. */
const textOf = s => ({
  title: t(`tutorial.${s.id}.title`),
  body: t(`tutorial.${s.id}.body`),
  tip: t(`tutorial.${s.id}.tip`),
});

/** Exported for the tests: the step ids and their targets, in order. */
export const TUTORIAL_STEPS = STEPS;

let step = 0;
let open = false;
let scrim = [];
let ring = null;
let els = {};

/** Remove the spotlight scrim and ring. */
function clearSpotlight() {
  scrim.forEach(n => n.remove());
  scrim = [];
  if (ring) {
    ring.remove();
    ring = null;
  }
}

/**
 * Open whatever the target is folded inside, so there is something to light.
 *
 * The control rail is an accordion with one section open at a time, so most of
 * the controls the tour talks about are inside a collapsed section when it
 * runs. A collapsed section's children measure zero by zero, spotlight() gave
 * up on them, and six of the sixteen steps described a control while
 * highlighting nothing at all.
 *
 * Opening the section is also the more useful behaviour: the reader is told
 * where the control lives and then shown it, rather than being shown a heading
 * and left to find it.
 *
 * @param {HTMLElement} el - The step's target
 * @returns {boolean} True if something was opened, so the caller can re-measure
 */
function revealTarget(el) {
  const section = el.closest('.rail-section');
  if (!section?.id) return false;
  const toggle = document.querySelector(
    `.rail-section-toggle[aria-controls="${section.id}"]`
  );
  if (!toggle || toggle.getAttribute('aria-expanded') === 'true') return false;
  toggle.click();
  return true;
}

/**
 * Spotlight an element by dimming everything except its rectangle.
 * @param {string|null} selector - Element to highlight, or null for none
 * @param {number} [attempt] - Internal: how many times re-measuring has retried
 */
function spotlight(selector, attempt = 0) {
  clearSpotlight();
  if (!selector) return;
  const el = document.querySelector(selector);
  if (!el) return;

  if (attempt === 0) revealTarget(el);

  let r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) {
    // The section opens on a max-height transition, so the first measurement
    // after clicking is still zero. Re-measure on the next few frames rather
    // than guessing a duration; it settles in two or three and gives up after
    // that rather than spinning against a control that is genuinely hidden.
    if (attempt < 30 && open) {
      requestAnimationFrame(() => {
        if (open && STEPS[step].target === selector) {
          spotlight(selector, attempt + 1);
        }
      });
    }
    return;
  }
  r = el.getBoundingClientRect();
  const pad = 6;
  const box = {
    left: Math.max(0, r.left - pad),
    top: Math.max(0, r.top - pad),
    right: Math.min(window.innerWidth, r.right + pad),
    bottom: Math.min(window.innerHeight, r.bottom + pad),
  };

  // Four panels around the target, so the target itself is never dimmed.
  const panels = [
    { left: 0, top: 0, width: '100vw', height: `${box.top}px` },
    {
      left: 0,
      top: box.bottom,
      width: '100vw',
      height: `${Math.max(0, window.innerHeight - box.bottom)}px`,
    },
    {
      left: 0,
      top: box.top,
      width: `${box.left}px`,
      height: `${box.bottom - box.top}px`,
    },
    {
      left: box.right,
      top: box.top,
      width: `${Math.max(0, window.innerWidth - box.right)}px`,
      height: `${box.bottom - box.top}px`,
    },
  ];

  for (const p of panels) {
    const n = document.createElement('div');
    n.className = 'tutorial-scrim';
    n.style.left = `${p.left}px`;
    n.style.top = `${p.top}px`;
    n.style.width = p.width;
    n.style.height = p.height;
    document.body.appendChild(n);
    scrim.push(n);
  }

  ring = document.createElement('div');
  ring.className = 'tutorial-ring';
  ring.style.left = `${box.left}px`;
  ring.style.top = `${box.top}px`;
  ring.style.width = `${box.right - box.left}px`;
  ring.style.height = `${box.bottom - box.top}px`;
  ring.style.borderRadius = getComputedStyle(el).borderRadius || '10px';
  document.body.appendChild(ring);
}

/** Re-run the spotlight for the current step (after a resize or scroll). */
function reposition() {
  if (open) spotlight(STEPS[step].target);
}

/** Render the current step into the popup. */
function render() {
  const s = STEPS[step];
  const text = textOf(s);
  els.body.innerHTML = `
    <p class="tutorial-step-count">${t('tutorial.stepCount')
      .replace('{n}', String(step + 1))
      .replace('{total}', String(STEPS.length))}</p>
    <h3 class="tutorial-title">${text.title}</h3>
    <p class="tutorial-text">${text.body}</p>
    ${text.tip ? `<p class="tutorial-tip"><span aria-hidden="true">💡</span> ${text.tip}</p>` : ''}
    <div class="tutorial-dots" role="presentation">
      ${STEPS.map((_, i) => `<span class="${i === step ? 'is-current' : i < step ? 'is-done' : ''}"></span>`).join('')}
    </div>`;
  els.prev.disabled = step === 0;
  els.next.textContent =
    step === STEPS.length - 1 ? t('tutorial.finish') : t('tutorial.next');
  spotlight(s.target);
}

/** Open the tour at the first step. */
export function openTutorial() {
  if (!els.popup) return;
  open = true;
  step = 0;
  els.popup.style.display = 'block';
  els.popup.setAttribute('aria-hidden', 'false');
  render();
  els.next.focus();
}

/** Close the tour and clear the spotlight. */
export function closeTutorial() {
  if (!els.popup) return;
  open = false;
  els.popup.style.display = 'none';
  els.popup.setAttribute('aria-hidden', 'true');
  clearSpotlight();
  els.btn?.focus();
}

/** @returns {boolean} True while the tour is showing */
export const isTutorialOpen = () => open;

function go(delta) {
  const next = step + delta;
  if (next < 0) return;
  if (next >= STEPS.length) {
    closeTutorial();
    return;
  }
  step = next;
  render();
}

/** Wire up the tour. Safe to call once, from init. */
export function initTutorial() {
  els = {
    btn: document.getElementById('tutorialBtn'),
    popup: document.getElementById('tutorialPopup'),
    body: document.getElementById('tutorialPopupBody'),
    prev: document.getElementById('tutorialPrevBtn'),
    next: document.getElementById('tutorialNextBtn'),
    close: document.getElementById('tutorialCloseBtn'),
  };
  if (!els.btn || !els.popup || !els.body) return;

  els.btn.addEventListener('click', () =>
    open ? closeTutorial() : openTutorial()
  );
  els.prev.addEventListener('click', () => go(-1));
  els.next.addEventListener('click', () => go(1));
  els.close?.addEventListener('click', closeTutorial);

  window.addEventListener('keydown', e => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeTutorial();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    }
  });

  window.addEventListener('resize', reposition);
  window.addEventListener('gravitasEscape', () => open && closeTutorial());
}
