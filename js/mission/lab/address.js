// =============================================================================
// What the mission lab's address asks for
// -----------------------------------------------------------------------------
// Roadmap II Prompt 106 (MISSION_LAB.md, "On the platform"). Three things a
// link can ask of the lab besides its guides, all read before the lab computes:
//
//   embed=1     the lab as a figure, with its page around it removed
//               (EMBEDDING.md, "The mission figure"); `ev=1` beside it opts
//               into gravitas-embed/1's options and messages, the same
//               contract and the same security model as the Sandbox's and the
//               3-D lab's figures (js/embedOptions.js, js/embedMessages.js,
//               js/lab3d/embed.js, which the bridge below reuses)
//   open=<id>   a mission kept in My work (js/myWork/made.js), opened as its
//               plan
//   #plan1.…    a plan carried in the link (../link.js)
//
// A lazy module: the lab imports it by URL, in a bundle of its own in dist/
// (build.js), only when the address asks for one of these, so the lab's own
// download does not carry it.
// =============================================================================

import { readEmbedOptions } from '../../embedOptions.js';
import { applyEmbed, startBridge } from '../../lab3d/embed.js';
import { readMade, MADE_PREFIX } from '../../myWork/made.js';
import { readPlan, readPlanFragment } from '../link.js';

export { applyEmbed, startBridge };

/**
 * What the address asks for.
 * @param {string} search - The page's query string
 * @param {string} hash - Its fragment
 * @returns {{embed: ?object, open: ?string, link: ?string}} `embed` is the
 *   options of gravitas-embed/1 when `embed=1`, `open` a saved mission's id,
 *   `link` a fragment that carries a plan
 */
export function addressOf(search, hash) {
  const q = new URLSearchParams(search);
  const embed =
    q.get('embed') === '1' ? readEmbedOptions(search).options : null;
  const open = /^[a-z0-9-]{3,40}$/.test(q.get('open') ?? '')
    ? q.get('open')
    : null;
  return { embed, open, link: /^#plan\d/.test(hash) ? hash : null };
}

/**
 * The plan a saved mission holds.
 * @param {string} id - A My work record's id
 * @param {Storage} [storage]
 * @returns {{ok: true, plan: object}|{ok: false, code: string}} code is
 *   noSaved or notPlan
 */
export function savedPlan(id, storage = globalThis.localStorage) {
  let record = null;
  try {
    const r = readMade(JSON.parse(storage.getItem(`${MADE_PREFIX}${id}`)));
    if (r.ok && r.record.kind === 'mission') record = r.record;
  } catch {
    /* not there, or not readable: said below */
  }
  if (!record) return { ok: false, code: 'noSaved' };
  const plan = readPlan(record.mission.file.inputs);
  return plan ? { ok: true, plan } : { ok: false, code: 'notPlan' };
}

/**
 * The plan the address carries, if it carries one.
 * @returns {{ok: true, plan: object}|{ok: false, code: string}|null} null
 *   when the address asks for no plan
 */
export function planOf(address, storage) {
  if (address.open) return savedPlan(address.open, storage);
  if (address.link) return readPlanFragment(address.link);
  return null;
}

const PROBLEMS = {
  noSaved: [
    'That saved mission is not in this browser, so the lab opened with its own plan.',
    'Esa misión guardada no está en este navegador, así que el laboratorio se abrió con su plan.',
  ],
  notPlan: [
    'The plan in that address is not one the lab can read, so the lab opened with its own.',
    'El plan de esa dirección no es uno que el laboratorio pueda leer, así que se abrió con el suyo.',
  ],
  tooLong: [
    'The plan in that link is too long to be one, so the lab opened with its own.',
    'El plan de ese enlace es demasiado largo para serlo, así que el laboratorio se abrió con el suyo.',
  ],
  unreadable: [
    'The plan in that link could not be read, so the lab opened with its own.',
    'No se pudo leer el plan de ese enlace, así que el laboratorio se abrió con el suyo.',
  ],
};

/** The words for a plan an address could not give, in English or Spanish. */
export const problemText = (code, lang) =>
  (PROBLEMS[code] ?? PROBLEMS.notPlan)[lang === 'es' ? 1 : 0];

/** How long the cruise takes to play in a figure, and how often it steps. */
const PLAY_STEPS = 60;
const PLAY_MS = 150;

/**
 * What the embedding bridge asks of the figure: whether the cruise is playing,
 * to play or pause it, and to start again from the plan the figure opened with.
 * Play steps the day slider (the lab's own control, so the views, the readout
 * and every table follow it); it steps in a few seconds and stops at arrival.
 * A figure opens paused, whatever the machine.
 * @param {{slider: HTMLInputElement, restart: () => Promise<void>}} o
 * @param {Window} [win]
 */
export function bridgeServices({ slider, restart }, win = window) {
  let timer = null;
  const move = day => {
    slider.value = String(day);
    slider.dispatchEvent(new win.Event('input', { bubbles: true }));
  };
  const stop = () => {
    if (timer !== null) win.clearInterval(timer);
    timer = null;
  };
  return {
    playing: () => timer !== null,
    play(on) {
      stop();
      if (!on || slider.disabled) return;
      const max = +slider.max;
      if (+slider.value >= max) move(0);
      timer = win.setInterval(() => {
        const next = Math.min(
          max,
          +slider.value + Math.max(1, max / PLAY_STEPS)
        );
        move(next);
        if (next >= max) stop();
      }, PLAY_MS);
    },
    async restart() {
      stop();
      await restart();
      move(0);
    },
  };
}
