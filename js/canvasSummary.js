// =============================================================================
// A textual equivalent of the simulation
// -----------------------------------------------------------------------------
// The canvas is the application. Everything a sighted reader learns at a glance
// - which system is loaded, whether it is running, what is in it, what they
// have selected - is painted as pixels and is otherwise unavailable.
//
// This writes the same facts as a sentence, into a hidden element that the
// canvas points at with aria-describedby. A screen reader reaching the canvas
// hears what is in it rather than "graphic".
//
// What it is not
// -----------------------------------------------------------------------------
// It is not a live region. The simulation changes sixty times a second, and a
// live region attached to it would produce an unusable stream of speech that no
// reader could interrupt - which is worse than saying nothing, because it also
// drowns out the announcements that matter. The description is read when a
// reader asks for it, by moving to the canvas.
//
// Discrete events - a scenario loaded, the simulation paused, a body selected -
// are different: those are worth interrupting for, they happen when a reader
// did something, and they go to the existing polite live region through
// announce(). Nothing here announces on a timer.
//
// The honest limit is written down in ACCESSIBILITY.md: a sentence describing
// four planets on elliptical orbits is not equivalent to watching them move,
// and no amount of text makes it so. What it can do is make the state of the
// simulation legible, which is what most of the interface's controls act on.
// =============================================================================

import { state, SETTINGS, current_scenario_name } from './appState.js';
import {
  planets,
  gas_giants,
  asteroids,
  comets,
  stars,
  neutron_stars,
  white_dwarfs,
  bh_list,
  galaxies,
} from './physics.js';
import { t } from './i18n/index.js';
import { announce } from './notify.js';

/** How often the description may be rewritten, in milliseconds. */
const REFRESH_MS = 1500;

let el = null;
let lastText = '';
let lastAt = 0;
// What was last *announced*, as opposed to described. Only these three things
// interrupt a reader, and only when they actually change.
let announced = { scenario: null, running: null, selected: null };

/** The body kinds worth counting, in the order a person would say them. */
const KINDS = [
  ['summary.count.stars', () => stars.length],
  ['summary.count.planets', () => planets.length],
  ['summary.count.gasGiants', () => gas_giants.length],
  ['summary.count.moons', () => 0],
  ['summary.count.asteroids', () => asteroids.length],
  ['summary.count.comets', () => comets.length],
  ['summary.count.neutronStars', () => neutron_stars.length],
  ['summary.count.whiteDwarfs', () => white_dwarfs.length],
  ['summary.count.blackHoles', () => bh_list.length],
  ['summary.count.galaxies', () => galaxies.length],
];

/**
 * The sentence.
 *
 * @returns {string} A description of the simulation as it stands
 */
export function summaryText() {
  const parts = [];

  parts.push(
    current_scenario_name && current_scenario_name !== 'None'
      ? t('summary.scenario', { name: current_scenario_name })
      : t('summary.scenario.custom')
  );

  parts.push(state.paused ? t('summary.paused') : t('summary.running'));

  const counts = KINDS.map(([key, count]) => [key, count()]).filter(
    ([, n]) => n > 0
  );
  if (counts.length === 0) {
    parts.push(t('summary.empty'));
  } else {
    const total = counts.reduce((a, [, n]) => a + n, 0);
    const listed = counts
      .map(([key, n]) => t(key, { n, count: n }))
      .join(t('summary.listSeparator'));
    parts.push(t('summary.contains', { total, list: listed }));
  }

  const selected = state.selectedObject?.object;
  parts.push(
    selected
      ? t('summary.selected', {
          name: selected.name || t('summary.unnamedBody'),
        })
      : t('summary.noSelection')
  );

  // Where the description stops and the interface takes over. A reader who
  // wants numbers should be told they exist and where.
  parts.push(t('summary.readoutPointer'));

  return parts.join(' ');
}

/** The three facts a reader is interrupted for. */
function announceChanges() {
  const selected = state.selectedObject?.object;
  const now = {
    scenario: current_scenario_name || null,
    running: !state.paused,
    selected: selected ? selected.name || t('summary.unnamedBody') : null,
  };

  if (announced.scenario !== null && now.scenario !== announced.scenario) {
    announce(t('summary.announce.scenario', { name: now.scenario }));
  } else if (announced.running !== null && now.running !== announced.running) {
    announce(now.running ? t('summary.running') : t('summary.paused'));
  } else if (
    announced.selected !== null &&
    now.selected !== announced.selected
  ) {
    if (now.selected) {
      announce(t('summary.announce.selected', { name: now.selected }));
    }
  }
  announced = now;
}

/**
 * Rewrite the description, at most every REFRESH_MS and only when it changed.
 *
 * Called from the render loop, so the throttle matters: this runs sixty times a
 * second and does almost nothing on fifty-nine of them.
 *
 * @param {number} [now] - Timestamp, for testing
 */
export function updateCanvasSummary(now = Date.now()) {
  if (!el) el = document.getElementById('canvasSummary');
  if (!el) return;

  // The throttle exists to stop the sentence being rebuilt sixty times a
  // second while bodies drift. It must not delay the things that change
  // because the reader did something: loading a scenario, pausing, selecting a
  // body. Those skip the wait, so the description is never stale about the
  // action just taken.
  const selected = state.selectedObject?.object;
  const discrete =
    (current_scenario_name || null) !== announced.scenario ||
    !state.paused !== announced.running ||
    (selected ? selected.name || t('summary.unnamedBody') : null) !==
      announced.selected;

  if (!discrete && now - lastAt < REFRESH_MS) return;
  lastAt = now;

  const text = summaryText();
  if (text === lastText) return;
  lastText = text;
  // textContent, not a live region: this element has no aria-live, so writing
  // to it is silent. It is spoken when a reader moves to the canvas.
  el.textContent = text;

  announceChanges();
}

/** Forget everything, so a new world is described from scratch. */
export function resetCanvasSummary() {
  lastText = '';
  lastAt = 0;
  announced = { scenario: null, running: null, selected: null };
}

/** @returns {object} What the description is built from, for the tests */
export function summaryFacts() {
  return {
    scenario: current_scenario_name,
    paused: Boolean(state.paused),
    counts: Object.fromEntries(
      KINDS.map(([key, count]) => [key.split('.').pop(), count()]).filter(
        ([, n]) => n > 0
      )
    ),
    selected: state.selectedObject?.object?.name ?? null,
    overlaysVisible: Boolean(SETTINGS.show_dynamic_overlays),
  };
}
