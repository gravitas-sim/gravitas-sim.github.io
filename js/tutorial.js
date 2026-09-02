// =============================================================================
// Guided tour
// -----------------------------------------------------------------------------
// A step-through introduction that teaches the things the interface cannot say
// for itself: that dragging sets velocity, that Shift snaps to a circular
// orbit, that the energy plot is diagnostic, that history can be rewound.
//
// Each step names a real element to spotlight. The spotlight is a four-panel
// scrim rather than a translucent sheet, so the highlighted control stays at
// full brightness and remains genuinely readable.
// =============================================================================

import { t } from './i18n/index.js';

const STEPS = [
  {
    title: t('tutorial.welcome'),
    body: `A sandbox for gravity. Everything you see is integrated from Newton's
           law in real time: nothing here is on rails or pre-animated.`,
    tip: 'This tour takes about a minute. Use ← and → to move through it.',
    target: null,
  },
  {
    title: t('tutorial.place'),
    body: `Click empty space and drag before releasing. The direction and length
           of the drag set the launch velocity, so a short drag drops an object
           almost at rest and a long one flings it away.`,
    tip: 'Hold Shift while dragging to snap to a circular orbit. On a touch screen, press and hold first: a plain drag pans the view.',
    target: '#simulationCanvas',
  },
  {
    title: t('tutorial.choose'),
    body: `This button cycles the object type: star, planet, gas giant,
           asteroid, comet, neutron star, white dwarf or black hole. Each has
           its own mass range and behavior.`,
    tip: 'Placed something you did not mean to? Press Z, or use Undo Placement.',
    target: '#objectTypeBtn',
  },
  {
    title: t('tutorial.inspect'),
    body: `Click an object to open the inspector: mass, radius, temperature,
           orbital elements and composition. The mass slider is live: push a
           star past 20 M☉ and it will collapse into a black hole in front of
           you.`,
    tip: 'The Energy tab plots kinetic, potential and total energy. A flat total means a stable orbit; a rising one means the orbit is decaying or the object is escaping.',
    target: '#simulationCanvas',
  },
  {
    title: t('tutorial.rewind'),
    body: `The transport bar records history as the simulation runs. Drag the
           scrubber back to replay a merger or a close encounter you missed,
           then jump back to the present.`,
    tip: 'Space pauses, "," and "." step one frame, and L returns to live.',
    target: '#timelineBar',
  },
  {
    title: t('tutorial.scenario'),
    body: `Thirty-seven scenarios, from the Solar System to GW150914: the first
           black hole merger LIGO detected. Search by name or by keyword.`,
    tip: 'Refresh Scenario rebuilds the current one if an experiment gets away from you.',
    target: '#loadScenarioBtn',
  },
  {
    title: t('tutorial.settings'),
    body: `Switch between physical units (AU, M☉, km/s, years) and raw
           simulation units. Themes include Observatory, which uses red chrome
           to preserve night vision, and Daylight for bright rooms.`,
    tip: 'Settings holds gravity, object counts, trail styles and performance options.',
    target: '.ui-container',
  },
  {
    title: t('tutorial.done'),
    body: `Press <kbd>?</kbd> at any time for the full list of keyboard
           shortcuts, or reopen this tour from the <strong>?</strong> button in
           the corner.`,
    tip: 'Try loading "Hungry Hungry Holes" and watching the energy plot of a planet as it gets eaten.',
    target: null,
  },
];

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
 * Spotlight an element by dimming everything except its rectangle.
 * @param {string|null} selector - Element to highlight, or null for none
 */
function spotlight(selector) {
  clearSpotlight();
  if (!selector) return;
  const el = document.querySelector(selector);
  if (!el) return;

  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return;
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
  els.body.innerHTML = `
    <p class="tutorial-step-count">Step ${step + 1} of ${STEPS.length}</p>
    <h3 class="tutorial-title">${s.title}</h3>
    <p class="tutorial-text">${s.body}</p>
    ${s.tip ? `<p class="tutorial-tip"><span aria-hidden="true">💡</span> ${s.tip}</p>` : ''}
    <div class="tutorial-dots" role="presentation">
      ${STEPS.map((_, i) => `<span class="${i === step ? 'is-current' : i < step ? 'is-done' : ''}"></span>`).join('')}
    </div>`;
  els.prev.disabled = step === 0;
  els.next.textContent = step === STEPS.length - 1 ? 'Finish' : 'Next';
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
