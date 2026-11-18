// =============================================================================
// A textual equivalent of the simulation
// The canvas is the application; this writes what it shows (the system, whether
// it runs, what is in it, what is selected, what is labelled) as a sentence in a
// hidden element the canvas points at with aria-describedby. It is not a live
// region (sixty changes a second would drown the announcements that matter);
// discrete events go to the polite live region through announce(). The honest
// limit is in ACCESSIBILITY.md: text makes the state legible, not equivalent.
// =============================================================================

import { state, current_scenario_name, registerCommands } from './appState.js';
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
import { lightingNotes } from './bodyDraw.js';
import { drawnLabels } from './bodyLabels.js';
import { crowdNotes } from './bodyDrawSky.js';

// For the inspector's Appearance disclosure, which loads lazily and must not
// import the drawing modules itself (js/inspectorView.js says why).
registerCommands({ lightingNotes });
import { scenarioTitle } from './i18n/scenario.js';

/** A scenario id, as opposed to 'None', the sentinel for a hand-built world. */
const SCENARIO_KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/;
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
      ? t('summary.scenario', { name: scenarioTitle(current_scenario_name) })
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
  if (
    selected &&
    (selected.kind === 'Planet' || selected.kind === 'GasGiant')
  ) {
    parts.push(...lightingNotes(selected));
  }

  const named = drawnLabels();
  if (named.length)
    parts.push(
      t('summary.labels', { list: named.join(t('summary.listSeparator')) })
    );
  parts.push(...crowdNotes().map(n => `${n}.`));

  // The stage of a star's life, where a lesson is drawing one. The canvas is
  // showing a collapsing cloud, a wind, or the remains of an explosion, and
  // none of that is a body in the object list - so for a reader who cannot
  // see the canvas this sentence is the only place any of it appears. It is
  // the text equivalent of the illustration, not a summary of it.
  const life = state.evolutionOverlay;
  if (life?.active && life.frame) {
    const key =
      life.frame.stage === 'cloud'
        ? 'summary.life.cloud'
        : life.frame.stage === 'remnant'
          ? life.frame.endpoint?.supernova === 'expected'
            ? 'summary.life.explosion'
            : 'summary.life.remnant'
          : life.lostFraction > 0.02
            ? 'summary.life.wind'
            : 'summary.life.star';
    parts.push(
      t(key, {
        pct: Math.round((life.lostFraction || 0) * 100),
        kind: life.frame.endpoint?.kind
          ? t(`stelE.remnant.${life.frame.endpoint.kind}`)
          : '',
      })
    );
  }

  // Where the description stops and the interface takes over. A reader who
  // wants numbers should be told they exist and where.
  parts.push(t('summary.readoutPointer'));

  // And the one thing the drawing is not telling the truth about. The canvas
  // carries a one-line disclosure beside the scale bar; a reader who cannot
  // see the canvas gets the whole explanation, because for them this is the
  // only place it appears.
  parts.push(t('canvas.sizeDisclosure.detail'));

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
    const name = SCENARIO_KEY.test(now.scenario)
      ? scenarioTitle(now.scenario)
      : now.scenario;
    announce(t('summary.announce.scenario', { name }));
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
