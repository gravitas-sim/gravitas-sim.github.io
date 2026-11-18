// =============================================================================
// What a crowd draws: trails, detail, names
// -----------------------------------------------------------------------------
// js/crowdDraw.js decides, once a frame, which bodies of a crowded scene keep a
// trail and which are drawn in full; js/bodyDrawSky.js asks it. Drawing is the
// only thing any of it changes, so the last block drives the real draw path
// and checks that every body is still drawn at every tier.
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { SETTINGS, state as appState } from '../js/appState.js';
import { Planet, StarObject, setStateReference } from '../js/physics.js';
import { setBodyList, setLiveBodyCount } from '../js/engine/state.js';
import '../js/bodyDraw.js';
import { setTier } from '../js/quality.js';
import {
  LOD,
  CROWD_SOFT_START,
  displayFactorFor,
  lodFor,
} from '../js/bodyVisuals.js';
import {
  CROWD_DETAIL_CAP,
  CROWD_TRAIL_BODIES,
  beginCrowdFrame,
  crowdDetail,
  crowdTrails,
  isCrowd,
  setCrowdCaps,
} from '../js/crowdDraw.js';
import { lodOf } from '../js/bodyDrawSky.js';

const view = {
  paused: true,
  zoom: 1,
  pan: { x: 0, y: 0 },
  frameOffset: { x: 0, y: 0 },
  frame_count: 0,
  selectedObject: null,
};

/** n planets in a row, body i weighing i + 1. */
const row = n =>
  Array.from({ length: n }, (_, i) => {
    const p = new Planet({ x: 100 * i, y: 0 }, { x: 0, y: 0 }, i + 1);
    p.alive = true;
    return p;
  });

/** Choose a body, as a click does. */
const select = o => {
  view.selectedObject = o ? { type: 'Planet', object: o } : null;
  appState.selectedObject = view.selectedObject;
};

beforeEach(() => {
  setStateReference(view);
  view.zoom = 1;
  view.pan = { x: 0, y: 0 };
  select(null);
  SETTINGS.show_trails = true;
  setTier('full');
  setCrowdCaps({ trails: CROWD_TRAIL_BODIES, detail: CROWD_DETAIL_CAP });
  setBodyList('planets', []);
  setLiveBodyCount(0);
});

afterEach(() => {
  setTier('full');
  setBodyList('planets', []);
  setLiveBodyCount(0);
});

describe('a crowd starts at 200 live bodies', () => {
  test('and not before', () => {
    expect(CROWD_SOFT_START).toBe(200);
    expect(isCrowd(199)).toBe(false);
    expect(isCrowd(200)).toBe(true);
  });
});

describe('trails in a crowd', () => {
  test('below the crowd every body keeps its trail, the list untouched', () => {
    const list = row(30);
    setLiveBodyCount(199);
    beginCrowdFrame();
    expect(crowdTrails(list)).toBe(list);
  });

  test('at 200 the heaviest and the selected body keep theirs, in drawing order', () => {
    const list = row(40);
    setLiveBodyCount(200);
    select(list[2]);
    beginCrowdFrame();
    const kept = crowdTrails(list);
    expect(kept).toHaveLength(CROWD_TRAIL_BODIES + 1);
    expect(kept).toContain(list[2]);
    // Mass i + 1: the heaviest are the last ones.
    for (let i = 40 - CROWD_TRAIL_BODIES; i < 40; i++)
      expect(kept).toContain(list[i]);
    expect(kept).not.toContain(list[3]);
    expect(kept).toEqual(list.filter(o => kept.includes(o)));
  });

  test('a scene with trails off asks for none, whatever its size', () => {
    const list = row(40);
    setLiveBodyCount(300);
    SETTINGS.show_trails = false;
    beginCrowdFrame();
    expect(crowdTrails(list)).toBe(list);
  });

  test('the cap is the one the readout states', () => {
    const list = row(40);
    setLiveBodyCount(255);
    setCrowdCaps({ trails: 5 });
    beginCrowdFrame();
    expect(crowdTrails(list)).toHaveLength(5);
  });
});

describe('detail in a crowd', () => {
  /** Planets drawn at about `px` pixels of radius at this zoom. */
  const bigRow = (n, px) => {
    const list = row(n);
    view.zoom = px / (list[0].radius * displayFactorFor('Planet'));
    setBodyList('planets', list);
    return list;
  };

  test('a body is eligible by its drawn radius, and only the cap are granted, nearest the selection', () => {
    const list = bigRow(40, 30);
    setLiveBodyCount(255);
    select(list[20]);
    beginCrowdFrame();
    const granted = list.filter(crowdDetail);
    expect(granted).toHaveLength(CROWD_DETAIL_CAP);
    expect(crowdDetail(list[20])).toBe(true);
    // The nearest bodies in a row are the ones either side of the selection.
    const reach = Math.max(...granted.map(o => Math.abs(o.pos.x - 2000)));
    const left = list.filter(o => !crowdDetail(o));
    expect(
      Math.min(...left.map(o => Math.abs(o.pos.x - 2000)))
    ).toBeGreaterThanOrEqual(reach);
  });

  test('a small body gets none however near the selection', () => {
    const list = bigRow(5, 4);
    setLiveBodyCount(255);
    beginCrowdFrame();
    expect(list.some(crowdDetail)).toBe(false);
  });

  test('the low tier grants none, and nothing outside a crowd is granted', () => {
    const list = bigRow(10, 30);
    setLiveBodyCount(255);
    setTier('low');
    beginCrowdFrame();
    expect(list.some(crowdDetail)).toBe(false);
    setTier('full');
    setLiveBodyCount(50);
    beginCrowdFrame();
    expect(list.some(crowdDetail)).toBe(false);
  });

  test('a granted body is drawn DETAILED, the rest of a crowd shaded or a point', () => {
    const list = bigRow(30, 30);
    setLiveBodyCount(255);
    beginCrowdFrame();
    const levels = list.map(o => lodOf(o, 'Planet'));
    expect(levels.filter(l => l === LOD.DETAILED)).toHaveLength(
      CROWD_DETAIL_CAP
    );
    expect(levels.filter(l => l === LOD.SHADED)).toHaveLength(
      30 - CROWD_DETAIL_CAP
    );
    setTier('low');
    beginCrowdFrame();
    expect(list.map(o => lodOf(o, 'Planet'))).not.toContain(LOD.DETAILED);
  });

  test('lodFor takes the grant and still caps a crowd without it', () => {
    expect(lodFor(30, { crowded: true })).toBe(LOD.SHADED);
    expect(lodFor(30, { crowded: true, detailed: true })).toBe(LOD.DETAILED);
    expect(lodFor(30, { crowded: true, detailed: true, tier: 'low' })).toBe(
      LOD.SHADED
    );
    expect(lodFor(5, { crowded: true, detailed: true })).toBe(LOD.POINT);
  });
});

describe('drawing never removes a body', () => {
  test('every body of a crowd is drawn at each tier, a star included', () => {
    const list = row(20);
    const star = new StarObject({ x: 0, y: 500 }, { x: 0, y: 0 }, 1);
    star.alive = true;
    setBodyList('planets', list);
    setLiveBodyCount(255);
    view.zoom = 3;
    const drawn = [];
    for (const tier of ['low', 'full', 'ultra']) {
      setTier(tier);
      beginCrowdFrame();
      let n = 0;
      for (const o of [...list, star]) {
        const arcs = [];
        const calls = {
          arc: (...a) => arcs.push(a),
          drawImage: (...a) => arcs.push(a),
          createRadialGradient: () => ({ addColorStop() {} }),
          createLinearGradient: () => ({ addColorStop() {} }),
        };
        o.draw(
          new Proxy(calls, {
            get: (t, k) => (k in t ? t[k] : () => {}),
            set: () => true,
          })
        );
        if (arcs.length) n++;
      }
      drawn.push(n);
    }
    expect(drawn).toEqual([21, 21, 21]);
  });
});
