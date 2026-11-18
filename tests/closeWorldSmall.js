// =============================================================================
// Bodies drawn below 10 px, as recorded canvas calls
// -----------------------------------------------------------------------------
// For tests/closeWorld.test.js. Imports only what the tree before the close-
// world drawing also had, so the same cases can be recorded on that tree
// (tests/fixtures/close-world-small.json) and compared on this one.
// =============================================================================

import { createHash } from 'node:crypto';
import {
  Planet,
  GasGiant,
  StarObject,
  stars,
  planets,
  gas_giants,
} from '../js/physics.js';
import '../js/bodyDraw.js';
import { setTier } from '../js/quality.js';
import { clearVisualCaches, displayFactorFor } from '../js/bodyVisuals.js';

export /**
 * A context that writes down every call and, at every paint, the styles in
 * force: two draws that leave the same record paint the same pixels.
 */
function recorder() {
  const calls = [];
  let grads = 0;
  const num = v => (typeof v === 'number' ? +v.toFixed(6) : v);
  const style = v => (typeof v === 'object' && v ? v.id : v);
  const ctx = {
    calls,
    fillStyle: '',
    strokeStyle: '',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
    shadowColor: '',
    shadowBlur: 0,
    measureText: () => ({ width: 10 }),
  };
  const paint = name => {
    calls.push(
      `${name}|${style(ctx.fillStyle)}|${style(ctx.strokeStyle)}|${num(ctx.globalAlpha)}|${ctx.globalCompositeOperation}|${num(ctx.lineWidth)}|${ctx.font}|${ctx.shadowBlur}`
    );
  };
  for (const name of [
    'save',
    'restore',
    'clip',
    'setTransform',
    'translate',
    'rotate',
    'beginPath',
    'closePath',
    'moveTo',
    'lineTo',
    'arc',
    'ellipse',
    'rect',
    'drawImage',
  ]) {
    ctx[name] = (...a) => calls.push(`${name}(${a.map(num).join(',')})`);
  }
  for (const name of ['fill', 'stroke', 'fillRect', 'fillText']) {
    ctx[name] = (...a) => {
      calls.push(`${name}(${a.map(num).join(',')})`);
      paint(name);
    };
  }
  for (const kind of ['Linear', 'Radial']) {
    ctx[`create${kind}Gradient`] = (...a) => {
      const g = { id: `g${grads++}(${a.map(num).join(',')})` };
      g.addColorStop = (o, c) => (g.id += `[${num(o)}:${c}]`);
      calls.push(`create${kind}Gradient`);
      return g;
    };
  }
  return ctx;
}

const family = b => ({ StarObject: 'Star' })[b.kind] ?? b.kind;

/**
 * Draw at a drawn radius of `px` screen pixels, as the renderer sizes it.
 * @param {object} view - The state reference the drawers read the zoom from
 */
export function drawAt(view, body, px) {
  view.zoom = px / (body.radius * displayFactorFor(family(body)));
  view.frame_count++;
  const ctx = recorder();
  body.draw(ctx);
  return ctx.calls;
}

const clear = () => {
  stars.length = 0;
  planets.length = 0;
  gas_giants.length = 0;
  clearVisualCaches();
  setTier('full');
};

const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 16);

/**
 * Every small body the close-world drawing could reach, each case a hash of
 * its recorded calls: two tiers, with and without a star, seven sizes.
 */
export function smallCases(view) {
  const out = {};
  for (const tier of ['full', 'low']) {
    for (const lit of [true, false]) {
      clear();
      setTier(tier);
      if (lit)
        stars.push(new StarObject({ x: -4000, y: 0 }, { x: 0, y: 0 }, 1));
      const rocky = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
      rocky.density = 'rocky';
      const gas = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 5);
      gas.density = 'gaseous';
      const icy = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.5);
      icy.density = 'icy';
      const earth = new Planet({ x: 0, y: 0 }, { x: 0, y: 0 }, 1);
      earth.isEarth = true;
      const moon = new Planet({ x: 30, y: 0 }, { x: 0, y: 0 }, 0.0123);
      moon.isMoon = true;
      const giants = [0.05, 0.5, 2, 8, 20].map(mj => {
        const g = new GasGiant({ x: 0, y: 0 }, { x: 0, y: 0 }, mj);
        g.hasRings = mj === 0.5 || mj === 8;
        return g;
      });
      planets.push(earth, moon, rocky);
      gas_giants.push(...giants);
      const list = [
        ['rocky', rocky],
        ['gaseous', gas],
        ['icy', icy],
        ['earth', earth],
        ['moon', moon],
        ...giants.map((g, i) => [`giant${i}`, g]),
      ];
      for (const [name, body] of list) {
        for (const px of [1.5, 2.5, 4, 5.5, 7, 8.5, 9.9]) {
          const key = `${tier}/${lit ? 'lit' : 'dark'}/${name}/${px}`;
          out[key] = hash(drawAt(view, body, px).join('\n'));
        }
      }
    }
  }
  clear();
  return out;
}
