// =============================================================================
// The 3-D lab's camera by keyboard and by one pointer
// -----------------------------------------------------------------------------
// The scene (./scene.js) keeps the pointer: a drag orbits, a second finger or
// the right button pans, the wheel zooms. This gives the same three moves to
// the keyboard and to single presses (Prompt 278; INTERACTION.md, the surface
// `lab3d.camera` and the drag `lab3d.orbit`):
//
//   the keys, with the view focused: the arrows turn, Shift and an arrow
//   moves, + or = and - zoom (and the page's own keys: Space, 0, 1 to 5);
//   the view pad under the view: four arrows that turn or move, as its select
//   says, and two buttons that zoom.
//
// Both call one function, and the result is said once the pressing stops:
// where the view is from, relative to the reference plane, and how much of
// the system it holds. Out of js/lab3dLab.js, which is at its line ceiling.
// =============================================================================

import { formatNumber } from '../../format.js';

/** One turn, in radians, and one move, as a fraction of the view's height. */
export const TURN = 0.08;
export const MOVE = 0.05;
const ZOOM = 0.85;

/**
 * The camera in numbers a sentence can hold, relative to the reference plane
 * (z = 0).
 *
 * @param {{eye: number[], target: number[], mode: string, fov: number,
 *   height?: number}} cam - The scene's readCamera()
 * @param {number} reach - The system's extent, in the view's units
 * @returns {{above: number, around: number, size: number}} Degrees above the
 *   plane (negative below), degrees around it from +x, and the view's height
 *   in system diameters
 */
export function cameraNumbers(cam, reach) {
  const p = cam.eye.map((v, i) => v - cam.target[i]);
  const dist = Math.hypot(...p) || 1;
  const tall =
    cam.mode === 'orthographic'
      ? cam.height
      : 2 * dist * Math.tan((cam.fov * Math.PI) / 360);
  return {
    above: (Math.asin(p[2] / dist) * 180) / Math.PI,
    around: ((Math.atan2(p[1], p[0]) * 180) / Math.PI + 360) % 360,
    size: tall / (2 * (reach || 1)),
  };
}

/**
 * Wire the keys, the pad and the status line.
 *
 * @param {object} o
 * @param {() => ?object} o.scene - The scene, once there is one
 * @param {() => number} o.reach - The system's extent
 * @param {(id: string, vars?: object) => string} o.t - The lab's translator
 * @param {() => object} o.also - The page's own keys, by `event.key`
 * @returns {() => void} Name the pad again, after the language changes
 */
export function cameraControls({ scene, reach, t, also }) {
  const $ = id => document.getElementById(id);
  const pad = $('l3-pad');
  const mode = $('l3-pad-mode');
  let timer = null;

  const say = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const cam = scene()?.readCamera();
      if (!cam) return;
      const n = cameraNumbers(cam, reach());
      $('l3-camera').textContent = t(
        n.above < 0 ? 'l3.cam.below' : 'l3.cam.above',
        {
          above: String(Math.round(Math.abs(n.above))),
          around: String(Math.round(n.around) % 360),
          size: formatNumber(n.size, { sig: 2 }),
        }
      );
    }, 700);
  };

  /** One move: 'turn' or 'move' by steps across and up, or 'zoom' by a factor. */
  const move = (kind, dx, dy = 0) => {
    const s = scene();
    if (!s) return;
    if (kind === 'zoom') s.zoom(dx);
    else if (kind === 'move') s.pan(dx * MOVE, dy * MOVE);
    else s.orbit(dx * TURN, dy * TURN);
    say();
  };

  $('l3-canvas').addEventListener('keydown', e => {
    if (!scene()) return;
    const kind = e.shiftKey ? 'move' : 'turn';
    const keys = {
      ArrowLeft: () => move(kind, -1, 0),
      ArrowRight: () => move(kind, 1, 0),
      ArrowUp: () => move(kind, 0, 1),
      ArrowDown: () => move(kind, 0, -1),
      '+': () => move('zoom', ZOOM),
      '=': () => move('zoom', ZOOM),
      '-': () => move('zoom', 1 / ZOOM),
      ...also(),
    };
    const fn = keys[e.key];
    if (!fn) return;
    e.preventDefault();
    fn();
  });

  pad.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.zoom) return move('zoom', Number(b.dataset.zoom));
    const [dx, dy] = b.dataset.cam.split(',').map(Number);
    move(mode.value, dx, dy);
  });

  /** Name the four arrows for what they do now: turn or move. */
  const label = () => {
    for (const b of pad.querySelectorAll('[data-cam]')) {
      const [dx, dy] = b.dataset.cam.split(',').map(Number);
      const way = dx < 0 ? 'left' : dx > 0 ? 'right' : dy > 0 ? 'up' : 'down';
      b.setAttribute('aria-label', t(`l3.pad.${mode.value}.${way}`));
    }
  };
  mode.addEventListener('change', label);
  label();
  return label;
}
