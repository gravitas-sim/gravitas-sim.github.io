// What a crowded scene draws: which bodies keep a trail, which get surface
// detail, and what the readout says about both. Drawing only: nothing here
// moves, hides or removes a body, and a body left without a trail or a detailed
// picture is still in the world, still hit-tested and still in every number.
import { SETTINGS } from './appState.js';
import {
  state,
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  liveBodyCount,
  currentTier,
} from './physics.js';
import { builtPopulation } from './quality.js';
import {
  CROWD_SOFT_START,
  LOD_SHADED_MAX_PX,
  displayRadius,
} from './bodyVisuals.js';
import { t } from './i18n/index.js';

/** Trails kept in a crowd: the selected body and this many of the heaviest. */
export let CROWD_TRAIL_BODIES = 12;
/** Bodies given surface detail per frame in a crowd, nearest the selection first. */
export let CROWD_DETAIL_CAP = 16;

/** For tests and the frame measurement; a page never calls it. */
export const setCrowdCaps = ({ trails, detail }) => {
  if (trails !== undefined) CROWD_TRAIL_BODIES = trails;
  if (detail !== undefined) CROWD_DETAIL_CAP = detail;
};

/** A scene of this many live bodies or more is a crowd. */
export const isCrowd = (n = liveBodyCount) => n >= CROWD_SOFT_START;

const selectedBody = () => state.selectedObject?.object ?? null;

let trailsThinned = false;

/**
 * The bodies whose trails are drawn: all of them, or in a crowd the selected
 * body and the heaviest. The list is returned as it came, in drawing order.
 */
export function crowdTrails(list) {
  if (!trailsThinned) return list;
  const keep = new Set();
  const picked = selectedBody();
  if (picked && list.includes(picked)) keep.add(picked);
  const top = [];
  for (const o of list) {
    if (!o.alive || o === picked) continue;
    const m = o.mass || 0;
    let i = top.length;
    while (i > 0 && (top[i - 1].mass || 0) < m) i--;
    if (i < CROWD_TRAIL_BODIES) {
      top.splice(i, 0, o);
      if (top.length > CROWD_TRAIL_BODIES) top.pop();
    }
  }
  for (const o of top) keep.add(o);
  return list.filter(o => keep.has(o));
}

// --- Detail ---------------------------------------------------------------------

const DETAILED = new Set();
const FAMILIES = [
  ['Planet', () => planets],
  ['GasGiant', () => gas_giants],
  ['Asteroid', () => asteroids],
  ['Comet', () => comets],
  ['Star', () => stars],
  ['NeutronStar', () => neutron_stars],
  ['WhiteDwarf', () => white_dwarfs],
  ['BlackHole', () => bh_list],
];

/**
 * Once a frame, before the bodies are drawn: choose which bodies of a crowd are
 * drawn in full. A body qualifies by its drawn radius (the same size a
 * body outside a crowd needs); of those, the cap's worth nearest the selected
 * body, or the middle of the view with none selected, are chosen. The low tier
 * grants none.
 */
export function beginCrowdFrame() {
  DETAILED.clear();
  trailsThinned = isCrowd() && !!SETTINGS.show_trails;
  if (!isCrowd() || currentTier() === 'low' || CROWD_DETAIL_CAP <= 0) return;
  const z = state.zoom || 1;
  const picked = selectedBody();
  const c = picked?.pos ?? {
    x: -state.pan.x / z + state.frameOffset.x,
    y: state.pan.y / z + state.frameOffset.y,
  };
  const big = [];
  for (const [type, list] of FAMILIES)
    for (const o of list()) {
      if (!o.alive || !o.pos) continue;
      if (displayRadius(o.radius, type) * z <= LOD_SHADED_MAX_PX) continue;
      big.push({ o, d: (o.pos.x - c.x) ** 2 + (o.pos.y - c.y) ** 2 });
    }
  if (big.length > CROWD_DETAIL_CAP) big.sort((a, b) => a.d - b.d);
  for (const { o } of big.slice(0, CROWD_DETAIL_CAP)) DETAILED.add(o);
}

/** Whether a crowd's drawing gave this body the full treatment this frame. */
export const crowdDetail = o => DETAILED.has(o);

// --- What the readout says ---------------------------------------------------------

/**
 * What this scene's drawing and build left out, as sentences: a smaller
 * population on a small device, trails kept for the heaviest bodies only.
 * Empty when neither applies.
 */
export function crowdNotes() {
  const out = [];
  const built = builtPopulation();
  if (built)
    out.push(
      t('canvas.reducedPopulation', { n: built.built, total: built.wanted })
    );
  if (trailsThinned)
    out.push(
      t('canvas.crowdTrails', { n: CROWD_TRAIL_BODIES, total: liveBodyCount })
    );
  return out;
}
