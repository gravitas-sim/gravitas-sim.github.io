/* global document, window, performance, location, URLSearchParams */
// The harness page of the gate's browser measurements: builds a frame set from the
// query, mounts the prototype panel and exposes what the driver needs on window.
// Spike code; nothing under js/ imports it.
import { discFrame, largeFrame, moonSequence, pointField } from './frames.mjs';
import { mount } from './panel.js';
import { place } from './marks.js';
import { decodePlane } from '../../js/dataKinds/planes.js';
import { displayPlan, downsampleMean } from '../../js/dataKinds/limits.js';

const q = new URLSearchParams(location.search);
const set = q.get('set') ?? 'moon';
const lang = q.get('lang') ?? 'en';
const settleMs = Number(q.get('settle') ?? 700);
window.__frames = {};

function build() {
  if (set === 'points') {
    const f = pointField({
      seed: Number(q.get('seed') ?? 178),
      n: Number(q.get('n') ?? 300),
    });
    return { setId: f.id, frames: [f], sidecar: {}, truth: f.truth };
  }
  if (set === 'disc') {
    const f = discFrame({
      seed: Number(q.get('seed') ?? 1000),
      bright: q.get('bright') !== '0',
    });
    return {
      setId: f.id,
      frames: [f],
      sidecar: { knownLength: { value: 3474.8, unit: 'km' } },
      truth: f.truth,
      click: f.click,
    };
  }
  const s = moonSequence({
    frames: Number(q.get('frames') ?? 6),
    size: Number(q.get('size') ?? 1024),
  });
  return {
    setId: s.id,
    frames: s.frames,
    sidecar: { knownLength: s.knownLength },
    truth: s.frames.map(f => f.truth),
  };
}

const t0 = performance.now();
const made = build();
window.__genMs = performance.now() - t0;
const inst = mount(document.getElementById('root'), {
  ...made,
  lang,
  settleMs,
});
window.__im = inst;
window.__truth = made.truth;
window.__click = made.click;
/** Fifty marks on a frame, placed through the store (not the picture): 30 points, 10 circles, 5 segments, 3 polygons, 2 counts. */
window.__seed = (frame, n = 50) => {
  const f = made.frames[frame];
  let s = inst.store.state;
  const at = i => [
    60 + ((i * 97) % (f.width - 120)),
    60 + ((i * 53) % (f.height - 120)),
  ];
  const kinds = [
    ...Array(30).fill('point'),
    ...Array(10).fill('circle'),
    ...Array(5).fill('segment'),
    ...Array(3).fill('polygon'),
    ...Array(2).fill('count'),
  ];
  for (let i = 0; i < n; i++) {
    const kind = kinds[i % kinds.length];
    const [x, y] = at(i);
    const pts =
      kind === 'circle'
        ? [
            [x, y],
            [x + 20, y],
          ]
        : kind === 'segment'
          ? [
              [x, y],
              [x + 30, y + 10],
            ]
          : kind === 'polygon'
            ? [
                [x, y],
                [x + 25, y],
                [x + 10, y + 20],
              ]
            : [[x, y]];
    s = place(s, { kind, frame, tag: String.fromCharCode(97 + (i % 12)), pts });
  }
  inst.store.apply(s);
  inst.store.seal();
  inst.renderTable();
  inst.drawOverlay();
};
window.__lib = { decodePlane, displayPlan, downsampleMean, largeFrame };
window.__ready = true;
