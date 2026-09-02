// =============================================================================
// Energy widgets: the instruments for "Bound, Unbound and Escape"
// -----------------------------------------------------------------------------
// The lesson is for introductory students with little or no calculus, so these
// are built to be experimented with rather than solved. Everything is a real
// two-body integration in SI units against real planetary masses: the numbers a
// student reads off are the numbers, not a fitted illustration.
//
// The launch instrument is Newton's cannonball. Fire horizontally from the
// surface and the outcome changes character three times as the speed rises:
// it falls back, it circles, it leaves. The dividing speed is not put in by
// hand; it is where the total energy crosses zero, and the panel shows both at
// once so the connection is visible rather than asserted.
// =============================================================================

import { withUnit } from './format.js';
import { surface, palette, responsiveHeight, MONO } from './widgetCanvas.js';

const G = 6.674e-11;

/** Real bodies, so the escape speeds a student reads are the real ones. */
const BODIES = {
  moon: {
    label: 'the Moon',
    mass: 7.346e22,
    radius: 1.7374e6,
    color: '#b9bdc6',
  },
  earth: { label: 'Earth', mass: 5.972e24, radius: 6.371e6, color: '#5b9bd5' },
  jupiter: {
    label: 'Jupiter',
    mass: 1.898e27,
    radius: 7.1492e7,
    color: '#c9a37a',
  },
  sun: { label: 'the Sun', mass: 1.989e30, radius: 6.957e8, color: '#ffd34d' },
};
const BODY_ORDER = ['moon', 'earth', 'jupiter', 'sun'];

/**
 * Escape speed, in m/s.
 * @param {number} mass - Central mass in kg
 * @param {number} r - Distance from the center in m
 * @returns {number} Escape speed
 */
export const escapeSpeed = (mass, r) => Math.sqrt((2 * G * mass) / r);

/**
 * Speed of a circular orbit, in m/s.
 * @param {number} mass - Central mass in kg
 * @param {number} r - Orbital radius in m
 * @returns {number} Circular speed
 */
export const circularSpeed = (mass, r) => Math.sqrt((G * mass) / r);

/**
 * Fire something horizontally and follow it.
 *
 * Velocity Verlet, which conserves energy well enough over one orbit that the
 * total energy line in the panel is visibly flat rather than visibly drifting:
 * the whole point of the lesson is that the total does not change, so an
 * integrator that let it change would be teaching the opposite.
 *
 * @param {Object} opts
 * @param {number} opts.mass - Central mass, kg
 * @param {number} opts.radius - Central body radius, m
 * @param {number} opts.r0 - Launch distance from the center, m
 * @param {number} opts.v0 - Launch speed, m/s, horizontal
 * @param {number} [opts.reach] - Stop once this far out, in units of r0
 * @param {number} [opts.steps] - Integration steps
 * @returns {Object} points, and what happened
 */
export function launchPath({
  mass,
  radius,
  r0,
  v0,
  reach = 42,
  eta = 0.004,
  maxSteps = 4000,
}) {
  const mu = G * mass;
  const energy = 0.5 * v0 * v0 - mu / r0;
  const bound = energy < 0;
  const a = bound ? -mu / (2 * energy) : 0;
  const period = bound ? 2 * Math.PI * Math.sqrt(a ** 3 / mu) : 0;
  // Launched sideways, so the launch point is either the closest or the
  // furthest point of the orbit and the eccentricity follows directly.
  const ecc = Math.abs(1 - (r0 * v0 * v0) / mu);
  const apoapsis = bound ? a * (1 + ecc) : Infinity;
  // An unbound path has no natural duration, so it is followed for a fixed
  // number of free-fall times instead, which is long enough to make it obvious
  // that it is not turning around.
  const timescale = Math.sqrt(r0 ** 3 / mu);
  const total = bound ? period : 16 * timescale;
  const rMax = reach * r0;

  let x = r0;
  let y = 0;
  let vx = 0;
  let vy = v0;
  let ax = -mu / (r0 * r0);
  let ay = 0;
  const points = [{ x, y, r: r0, v: v0, t: 0 }];
  let impact = false;
  let far = r0;
  let t = 0;

  for (let i = 0; i < maxSteps && t < total; i++) {
    // The step follows the local free-fall time, so a pass close to the body
    // is resolved as finely as the slow crawl out at the far end. With a fixed
    // step, an orbit at eccentricity 0.9 gained enough energy at each
    // periapsis to spiral visibly outwards, which is precisely the thing this
    // panel exists to show does not happen.
    const rNow = Math.hypot(x, y) || r0;
    const dt = Math.min(
      eta * Math.sqrt((rNow * rNow * rNow) / mu),
      Math.max(total - t, 1e-6)
    );
    x += vx * dt + 0.5 * ax * dt * dt;
    y += vy * dt + 0.5 * ay * dt * dt;
    const r = Math.hypot(x, y) || 1e-9;
    const k = -mu / (r * r * r);
    const nax = k * x;
    const nay = k * y;
    vx += 0.5 * (ax + nax) * dt;
    vy += 0.5 * (ay + nay) * dt;
    ax = nax;
    ay = nay;
    t += dt;
    if (r > far) far = r;
    points.push({ x, y, r, v: Math.hypot(vx, vy), t });
    // Just inside the surface rather than at it: a path launched at exactly
    // circular speed skims the ground forever, and floating point would
    // otherwise call that a crash on the first step.
    if (r <= radius * 0.999) {
      impact = true;
      break;
    }
    if (r >= rMax) break;
  }

  const last = points[points.length - 1];
  return {
    points,
    bound,
    impact,
    far,
    energy,
    period,
    apoapsis,
    escape: escapeSpeed(mass, r0),
    ranOff: far >= rMax,
    // How well the integration held on to the thing it is demonstrating,
    // measured against the depth of the well rather than against the total.
    // At the escape boundary the total is nearly zero, and dividing by it
    // would report a huge relative error for an absolutely tiny one.
    drift: Math.abs(0.5 * last.v * last.v - mu / last.r - energy) / (mu / r0),
  };
}

// --- Drawing pieces -----------------------------------------------------------

const MJ = v => v / 1e6;
const kms = v => v / 1000;

/**
 * Three energy bars against a marked zero line.
 *
 * Kinetic up, potential down, total wherever it lands. The zero line is the
 * whole message, so it is drawn heavier than anything else in the panel.
 */
function drawEnergyBars(ctx, box, e, colors, opts = {}) {
  const { x, y, w, h } = box;
  // Two callers with two different kinds of number. The launch instrument runs
  // in SI and can honestly print megajoules per kilogram. The live one reads
  // the simulation, whose energies are in the simulation's own units and mean
  // nothing as an absolute figure, so it shows each bar as a share of the
  // depth of the well instead: dimensionless, comparable, and the form in
  // which the object's own mass has already canceled out.
  // The launch instrument runs in SI and can honestly print megajoules per
  // kilogram. The live one reads the simulation, whose energies are in the
  // simulation's own units and mean nothing as an absolute figure, so it shows
  // no numbers at all: on that step the lengths and the plot underneath are
  // the whole argument, and a dimensionless number would need more explaining
  // than it earns.
  const bare = opts.mode === 'bare';
  const { ink, muted, accent, warn, good } = colors;

  // A strip along the bottom for the names, so a downward bar and its label
  // never end up in the same place.
  const NAMES = 14;
  const LABEL = 13; // room kept clear beyond the longest bar for its number
  const plot = h - NAMES;
  const zero = y + plot * 0.4;
  const up = zero - y - LABEL;
  const down = y + plot - zero - LABEL;

  const bars = [
    { label: 'motion', value: e.kinetic, color: good },
    { label: 'position', value: e.potential, color: accent },
    { label: 'TOTAL', value: e.total, color: e.total < 0 ? warn : '#ff6b6b' },
  ];
  const maxUp = Math.max(0, ...bars.map(b => b.value));
  const maxDown = Math.max(0, ...bars.map(b => -b.value));
  // One scale for all three, so their lengths can be compared by eye. That
  // comparison is the entire content of the picture.
  const scale = Math.min(
    maxUp > 0 ? up / maxUp : Infinity,
    maxDown > 0 ? down / maxDown : Infinity
  );

  ctx.font = `10px ${MONO}`;
  const slot = w / bars.length;
  bars.forEach((b, i) => {
    const cx = x + slot * (i + 0.5);
    const bw = Math.min(48, slot * 0.46);
    const px = Math.max(
      2,
      Math.abs(b.value) * (Number.isFinite(scale) ? scale : 0)
    );
    const top = b.value >= 0 ? zero - px : zero;

    ctx.fillStyle = b.color;
    ctx.globalAlpha = b.label === 'TOTAL' ? 1 : 0.75;
    ctx.fillRect(cx - bw / 2, top, bw, px);
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    if (!bare) {
      ctx.fillStyle = ink;
      ctx.textBaseline = b.value >= 0 ? 'bottom' : 'top';
      ctx.fillText(
        `${b.value >= 0 ? '+' : ''}${MJ(b.value).toFixed(1)}`,
        cx,
        b.value >= 0 ? top - 2 : top + px + 2
      );
    }

    ctx.fillStyle = muted;
    ctx.textBaseline = 'bottom';
    ctx.fillText(b.label, cx, y + h - 2);
  });

  // The zero line last, over the bars: it is the thing being pointed at.
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, zero);
  ctx.lineTo(x + w, zero);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = `600 10px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('zero', x + 2, zero - 2);
  // Down in the name strip, not under the zero line: at the escape boundary the
  // total bar is a couple of pixels long and its value label lands exactly
  // where this used to sit.
}

/**
 * Write a label that stays readable over whatever it lands on.
 *
 * The captions sit inside the picture, and the picture contains a planet, a
 * dotted launch ring and a trajectory. A dark casing behind the glyphs costs
 * nothing and removes every collision at once.
 */
function label(ctx, text, x, y) {
  ctx.strokeStyle = 'rgba(6, 9, 18, 0.9)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

// The trajectory pictures are viewports onto space, and are drawn on their own
// dark ground in every theme, exactly as the simulation canvas is. That keeps
// one fixed palette inside the frame: on a light theme, theme-colored text
// over a planet silhouette is unreadable, and a casing dark enough to fix it
// would be a black slab on a white panel.
const SKY = '#080b14';
const SKY_INK = '#e9edf7';
const SKY_MUTED = '#9aa3b5';

/** Fit a set of points into a box, preserving the aspect ratio. */
function fitter(points, box, halfWidth) {
  const s = Math.min(box.w, box.h) / (2 * halfWidth);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return {
    px: p => cx + p.x * s,
    py: p => cy - p.y * s,
    s,
    cx,
    cy,
    points,
  };
}

// --- 1. Newton's cannonball ---------------------------------------------------

const ANIMATION_SECONDS = 4.5;
const LAUNCH_HEIGHT = 1.05;
let shot = { key: '', path: null, head: 0, running: false, view: 1 };

const LAUNCH = {
  id: 'launch',
  title: 'Does it come back?',
  note: 'Fired sideways off a tower 320 km high, the way Newton imagined firing a cannonball off a very tall mountain. Move the speed and it re-runs. The bars are energies, in megajoules per kilogram.',
  animated: true,
  controls: [
    {
      id: 'v',
      label: 'Launch speed',
      unit: 'km/s',
      min: 3,
      max: 16,
      step: 0.1,
      value: 6,
      decimals: 1,
    },
  ],
  presets: [
    {
      label: 'Slow: 6 km/s',
      values: { v: 6 },
      note: 'Not fast enough. It arcs a long way over the horizon and falls back to the ground, which is what every cannonball in history has done.',
    },
    {
      label: 'Orbit: 7.8 km/s',
      values: { v: 7.8 },
      note: 'Now it falls all the way round. Nothing has changed except the speed: an orbit is what happens when you fall fast enough sideways that the ground curves away underneath you as fast as you drop.',
    },
    {
      label: 'Boundary: 10.9 km/s',
      values: { v: 10.9 },
      note: 'The dividing line from up here. It leaves and never comes back, but only just: it is still slowing down the whole way out, and only stops once it is infinitely far away.',
    },
    {
      label: 'Fast: 14 km/s',
      values: { v: 14 },
      note: 'Clearly gone. It leaves along an open path and still has speed to spare when it is far away.',
    },
  ],
  actions: [
    { id: 'run', label: '▶ Run' },
    { id: 'reset', label: '↺ Reset' },
  ],
  compute(v) {
    const body = BODIES.earth;
    // Fired from 5% of an Earth radius up, about 320 km: above the atmosphere,
    // and the altitude the space station flies at. Fired from the ground
    // itself, a shot slower than orbital speed is already descending on its
    // first meter and buries itself immediately, with no arc to look at.
    const r0 = body.radius * LAUNCH_HEIGHT;
    const v0 = v.v * 1000;
    const mu = G * body.mass;
    const kinetic = 0.5 * v0 * v0;
    const potential = -mu / r0;
    return {
      body,
      r0,
      v0,
      kinetic,
      potential,
      total: kinetic + potential,
      escape: escapeSpeed(body.mass, r0),
      circular: circularSpeed(body.mass, r0),
    };
  },
  key(v) {
    return String(v.v);
  },
  reset(v, { autorun = true } = {}) {
    const c = this.compute(v);
    shot = {
      key: this.key(v),
      path: launchPath({
        mass: c.body.mass,
        radius: c.body.radius,
        r0: c.r0,
        v0: c.v0,
      }),
      head: 0,
      running: autorun,
    };
    shot.view = shot.path.impact
      ? 1.1 * c.r0
      : Math.max(1.45 * c.r0, Math.min(1.15 * shot.path.far, 13 * c.r0));
  },
  act(id, v) {
    this.reset(v, { autorun: id !== 'reset' });
  },
  step(v, dt) {
    if (shot.key !== this.key(v) || !shot.path) this.reset(v);
    if (!shot.running) return;
    const n = shot.path.points.length;
    shot.head += (dt / ANIMATION_SECONDS) * n;
    if (shot.head >= n - 1) {
      shot.head = n - 1;
      shot.running = false;
    }
  },
  readout(v) {
    const c = this.compute(v);
    const p = shot.path;
    const verdict = !p
      ? '…'
      : p.impact
        ? 'no: it falls back to the ground'
        : p.bound
          ? 'yes: it comes back round'
          : 'no: it leaves for good';
    return [
      {
        label: 'Does it come back?',
        value: verdict,
        emphasis: true,
      },
      {
        label: 'Total energy',
        value: `${MJ(c.total) >= 0 ? '+' : ''}${withUnit(MJ(c.total).toFixed(1), 'MJ per kg')}, ${c.total < 0 ? 'below zero' : 'above zero'}`,
      },
      {
        label: 'Escape speed from here',
        value: withUnit(kms(c.escape).toFixed(2), 'km/s'),
      },
      {
        label: 'Furthest it gets',
        value: !p
          ? '…'
          : p.impact
            ? 'it never leaves the ground'
            : p.bound
              ? withUnit(
                  (p.apoapsis / c.body.radius).toFixed(1),
                  'Earth radii out, then back'
                )
              : 'no limit: it never turns round',
      },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(334, 262);
    const { ctx, w } = surface(canvas, H);
    const colors = palette();
    // Only the frame and the trail colors come from the theme; everything
    // inside the picture uses the fixed sky palette.
    const { grid, warn, good } = colors;
    const c = this.compute(v);
    if (shot.key !== this.key(v) || !shot.path) this.reset(v);
    const path = shot.path;

    const viewH = Math.round((H - 12) * 0.635);
    const view = { x: 4, y: 4, w: w - 8, h: viewH };
    const fit = fitter(path.points, view, shot.view);

    ctx.fillStyle = SKY;
    ctx.fillRect(view.x, view.y, view.w, view.h);

    // The body
    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.w, view.h);
    ctx.clip();

    const bodyPx = Math.max(3, c.body.radius * fit.s);
    const glow = ctx.createRadialGradient(
      fit.cx,
      fit.cy,
      bodyPx * 0.6,
      fit.cx,
      fit.cy,
      bodyPx * 1.9
    );
    glow.addColorStop(0, `${c.body.color}55`);
    glow.addColorStop(1, `${c.body.color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(fit.cx, fit.cy, bodyPx * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16283d';
    ctx.beginPath();
    ctx.arc(fit.cx, fit.cy, bodyPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.body.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // The launch point
    const start = { x: c.r0, y: 0 };
    ctx.strokeStyle = SKY_MUTED;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(fit.cx, fit.cy, c.r0 * fit.s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // The trail so far. A shot that falls back hugs the limb of the planet,
    // where a thin line of any color disappears into the disk, so it is drawn
    // over a dark casing that separates it from whatever is underneath.
    const head = Math.max(1, Math.floor(shot.head));
    const trailColor = path.impact ? warn : path.bound ? good : '#ff6b6b';
    const trace = width => {
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= head && i < path.points.length; i++) {
        const p = path.points[i];
        const X = fit.px(p);
        const Y = fit.py(p);
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(6, 9, 18, 0.85)';
    trace(5);
    ctx.strokeStyle = trailColor;
    trace(2.4);

    // Where it is now
    const at = path.points[Math.min(head, path.points.length - 1)];
    ctx.fillStyle = 'rgba(6, 9, 18, 0.85)';
    ctx.beginPath();
    ctx.arc(fit.px(at), fit.py(at), 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SKY_INK;
    ctx.beginPath();
    ctx.arc(fit.px(at), fit.py(at), 3.4, 0, Math.PI * 2);
    ctx.fill();

    // Where it landed, when it did
    if (path.impact && head >= path.points.length - 1) {
      const end = path.points[path.points.length - 1];
      ctx.strokeStyle = warn;
      ctx.lineWidth = 2;
      const X = fit.px(end);
      const Y = fit.py(end);
      for (const [dx, dy] of [
        [-5, -5],
        [-5, 5],
      ]) {
        ctx.beginPath();
        ctx.moveTo(X + dx, Y + dy);
        ctx.lineTo(X - dx, Y - dy);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Launch marker and scale
    ctx.fillStyle = SKY_MUTED;
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    label(
      ctx,
      `sideways at ${v.v.toFixed(1)} km/s, from 320 km up`,
      view.x + 6,
      view.y + 5
    );
    ctx.fillStyle = trailColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    label(
      ctx,
      path.impact
        ? 'falls back to the surface'
        : path.bound
          ? 'closed path: it returns'
          : 'open path: it never returns',
      view.x + 6,
      view.y + view.h - 5
    );
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(view.x + 0.5, view.y + 0.5, view.w - 1, view.h - 1);
    ctx.fillStyle = SKY_MUTED;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    label(
      ctx,
      `view is ${((2 * shot.view) / c.body.radius).toFixed(0)} Earth radii across`,
      view.x + view.w - 6,
      view.y + view.h - 5
    );
    // Marker for the launch point itself
    ctx.fillStyle = '#5ec8f5';
    ctx.beginPath();
    ctx.arc(fit.px(start), fit.py(start), 2.5, 0, Math.PI * 2);
    ctx.fill();

    drawEnergyBars(
      ctx,
      { x: 4, y: view.y + view.h + 8, w: w - 8, h: H - view.h - 16 },
      { kinetic: c.kinetic, potential: c.potential, total: c.total },
      colors
    );
  },
};

// --- 2. Live energy of whatever is selected in the simulation ------------------

const HISTORY = 260;
let history = { ke: [], pe: [], total: [], id: null, scale: 1, first: null };

const LIVE_ENERGY = {
  id: 'live-energy',
  title: 'Energy around one orbit',
  note: 'The bars are right now. The plot underneath is the last minute or so: watch the two colored lines trade places while the white one stays where it is.',
  animated: true,
  live: true,
  controls: [],
  compute() {
    return {};
  },
  sample(ctx) {
    const body = ctx?.selected;
    const e = body ? ctx.energy(body) : null;
    if (!e) return null;
    if (history.id !== body.id) {
      history = {
        ke: [],
        pe: [],
        total: [],
        id: body.id,
        scale: 1,
        first: e.total,
      };
    }
    history.ke.push(e.kinetic);
    history.pe.push(e.potential);
    history.total.push(e.total);
    while (history.ke.length > HISTORY) {
      history.ke.shift();
      history.pe.shift();
      history.total.shift();
    }
    history.scale = Math.max(1e-30, ...history.pe.map(Math.abs), ...history.ke);
    return e;
  },
  readout(v, ctx) {
    const body = ctx?.selected;
    if (!body) {
      return [{ label: 'Click a planet in the simulation', value: '…' }];
    }
    const e = ctx.energy(body);
    const el = ctx.elements(body);
    if (!e) return [{ label: body.name || 'Body', value: 'no primary found' }];
    const share = v2 => (e.potential ? v2 / Math.abs(e.potential) : 0);
    return [
      { label: 'Watching', value: body.name || 'Body' },
      {
        label: 'Energy of motion',
        value: `${(share(e.kinetic) * 100).toFixed(0)}% of the depth`,
      },
      {
        label: 'Total energy',
        value: e.total < 0 ? 'below zero: bound' : 'above zero: unbound',
        emphasis: true,
      },
      {
        label: 'How much the total has moved',
        value:
          history.first === null
            ? 'watching…'
            : `${((Math.abs(e.total - history.first) / (Math.abs(e.potential) || 1)) * 100).toFixed(2)}% of the depth`,
      },
      {
        label: 'Where it is',
        value: el
          ? el.r < (el.periapsis + el.apoapsis) / 2
            ? 'on the close, fast part'
            : 'on the far, slow part'
          : '-',
      },
    ];
  },
  draw(canvas, v, ctx) {
    const H = responsiveHeight(306, 250);
    const { ctx: g, w } = surface(canvas, H);
    const colors = palette();
    const { ink, muted, grid, accent, good } = colors;
    const e = this.sample(ctx);
    if (!e) {
      g.fillStyle = muted;
      g.font = `12px ${MONO}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('Click a planet in the simulation', w / 2, H / 2);
      return;
    }

    const barsH = Math.round((H - 24) * 0.42);
    drawEnergyBars(g, { x: 4, y: 4, w: w - 8, h: barsH }, e, colors, {
      mode: 'bare',
    });

    // History: the point of the whole step is that the white line is flat.
    const box = { x: 34, y: barsH + 22, w: w - 42, h: H - barsH - 50 };
    const s = history.scale * 1.15;
    const zero = box.y + box.h / 2;
    g.strokeStyle = grid;
    g.lineWidth = 1;
    g.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
    g.strokeStyle = ink;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(box.x, zero);
    g.lineTo(box.x + box.w, zero);
    g.stroke();

    const line = (values, color, width) => {
      if (values.length < 2) return;
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      values.forEach((val, i) => {
        const X = box.x + (i / (HISTORY - 1)) * box.w;
        const Y = zero - (val / s) * (box.h / 2 - 6);
        if (i === 0) g.moveTo(X, Y);
        else g.lineTo(X, Y);
      });
      g.stroke();
    };
    line(history.ke, good, 1.6);
    line(history.pe, accent, 1.6);
    line(history.total, ink, 2.4);

    g.font = `10px ${MONO}`;
    g.fillStyle = muted;
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    g.fillText('0', box.x - 5, zero);
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillStyle = good;
    g.fillText('motion', box.x + 6, box.y + 5);
    g.fillStyle = accent;
    g.fillText('position', box.x + 60, box.y + 5);
    g.fillStyle = ink;
    g.fillText('total', box.x + 124, box.y + 5);
    g.fillStyle = muted;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.fillText('time', box.x + box.w / 2, box.y + box.h + 4);
  },
};

// --- 3. What changes the escape speed -----------------------------------------

const ESCAPE_COMPARE = {
  id: 'escape-compare',
  title: 'What makes escape hard?',
  note: 'Escape speed from four real bodies. Move the slider to start further out and watch every bar fall.',
  controls: [
    {
      id: 'dist',
      label: 'Start distance',
      unit: '× body radius',
      min: 1,
      max: 20,
      step: 0.5,
      value: 1,
      decimals: 1,
    },
  ],
  presets: [
    {
      label: 'At the surface',
      values: { dist: 1 },
      note: 'Standing on each one. This is the number quoted when people say "escape velocity": 11.2 km/s from Earth, and five times that from Jupiter.',
    },
    {
      label: 'Twice as far out',
      values: { dist: 2 },
      note: 'Doubling the distance does not halve the escape speed. It divides it by the square root of two, about 1.41: the pull weakens quickly, but the speed you need weakens more slowly.',
    },
    {
      label: 'Ten radii out',
      values: { dist: 10 },
      note: 'From here escaping Earth needs only 3.5 km/s. Nothing about Earth changed. You simply started most of the way out of its gravity already.',
    },
  ],
  compute(v) {
    const rows = BODY_ORDER.map(key => {
      const b = BODIES[key];
      return {
        key,
        label: b.label,
        color: b.color,
        mass: b.mass,
        v: escapeSpeed(b.mass, b.radius * v.dist),
      };
    });
    // Jupiter sets the scale: the Sun is ten times higher again and would
    // squash everything else into the left edge, so its bar is shown running
    // off the chart with its value on it.
    const full = rows.find(r => r.key === 'jupiter').v * 1.06;
    return { rows, full };
  },
  readout(v) {
    const c = this.compute(v);
    return [
      ...c.rows.map(r => ({
        label: `Escape speed from ${r.label}`,
        value: withUnit(kms(r.v).toFixed(2), 'km/s'),
        emphasis: r.key === 'earth',
      })),
      {
        label: 'Starting distance',
        value: `${v.dist.toFixed(1)} × the body's own radius`,
      },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(210, 184);
    const { ctx, w } = surface(canvas, H);
    const { ink, muted, grid } = palette();
    const c = this.compute(v);

    const padL = 66;
    const padR = 12;
    const barW = w - padL - padR;
    const rowH = Math.round((H - 30) / 4);
    ctx.font = `11px ${MONO}`;

    c.rows.forEach((r, i) => {
      const y = 22 + i * rowH;
      ctx.fillStyle = muted;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.label, padL - 8, y + 9);

      const frac = r.v / c.full;
      const drawn = Math.min(1, frac);
      ctx.fillStyle = r.color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(padL, y, Math.max(3, drawn * barW), 18);
      ctx.globalAlpha = 1;

      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      const label = withUnit(kms(r.v).toFixed(2), 'km/s');
      if (frac > 1) {
        // Off the scale: say so rather than pretending the bar means something.
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.moveTo(padL + barW, y);
        ctx.lineTo(padL + barW + 10, y + 9);
        ctx.lineTo(padL + barW, y + 18);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = ink;
        ctx.textAlign = 'right';
        ctx.fillText(`${label} - off the scale`, padL + barW - 8, y + 9);
      } else if (drawn * barW > 118) {
        ctx.textAlign = 'right';
        ctx.fillText(label, padL + drawn * barW - 8, y + 9);
      } else {
        ctx.fillText(label, padL + drawn * barW + 8, y + 9);
      }
    });

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL - 0.5, 16);
    ctx.lineTo(padL - 0.5, 22 + c.rows.length * rowH - 6);
    ctx.stroke();
    ctx.fillStyle = muted;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('escape speed', padL, 4);
    ctx.textAlign = 'right';
    ctx.fillText(
      `starting ${v.dist.toFixed(1)} radii out`,
      w - padR,
      22 + c.rows.length * rowH - 2
    );
  },
};

// --- 4. The three shapes ------------------------------------------------------

const SHAPES = {
  id: 'shapes',
  title: 'One law, three shapes',
  note: 'The same planet, the same launch point, the same law of gravity. Only the speed is different.',
  controls: [
    {
      id: 'k',
      label: 'Speed, as a fraction of escape speed',
      unit: '×',
      // Below about 0.71 the orbit shrinks back towards the planet and there is
      // nothing to see; everything interesting happens between there and the
      // escape point.
      min: 0.7,
      max: 1.4,
      step: 0.01,
      value: 0.82,
      decimals: 2,
    },
  ],
  presets: [
    {
      label: 'Below escape',
      values: { k: 0.82 },
      note: 'A closed loop, an ellipse. Total energy below zero: it can only ever reach a certain distance before gravity turns it round.',
    },
    {
      label: 'Exactly escape',
      values: { k: 1 },
      note: 'A parabola, the knife edge. Total energy exactly zero. It never turns round, but it also never gets anywhere with speed left over: it slows towards a dead stop that it only reaches infinitely far away.',
    },
    {
      label: 'Above escape',
      values: { k: 1.25 },
      note: 'A hyperbola, an open path. Total energy above zero: it leaves and is still moving when it is far away. This is the shape of an interstellar visitor.',
    },
  ],
  compute(v) {
    const body = BODIES.earth;
    const r0 = body.radius * 1.6;
    const vEsc = escapeSpeed(body.mass, r0);
    const v0 = vEsc * v.k;
    const energy = 0.5 * v0 * v0 - (G * body.mass) / r0;
    return {
      body,
      r0,
      vEsc,
      v0,
      energy,
      shape: v.k < 0.995 ? 'ellipse' : v.k > 1.005 ? 'hyperbola' : 'parabola',
      sign:
        v.k < 0.995
          ? 'below zero'
          : v.k > 1.005
            ? 'above zero'
            : 'exactly zero',
    };
  },
  readout(v) {
    const c = this.compute(v);
    return [
      { label: 'Shape of the path', value: c.shape, emphasis: true },
      { label: 'Total energy', value: c.sign },
      {
        label: 'Does it come back?',
        value: c.shape === 'ellipse' ? 'yes' : 'no',
      },
      { label: 'Launch speed', value: withUnit(kms(c.v0).toFixed(2), 'km/s') },
      {
        label: 'Escape speed here',
        value: withUnit(kms(c.vEsc).toFixed(2), 'km/s'),
      },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(292, 236);
    const { ctx, w } = surface(canvas, H);
    const { ink, muted, grid } = palette();
    const c = this.compute(v);
    // The legend gets its own strip under the drawing rather than sitting on
    // top of it: every one of these curves sweeps through the lower left.
    const box = { x: 4, y: 4, w: w - 8, h: H - 66 };
    const legendTop = box.y + box.h + 6;
    ctx.fillStyle = SKY;
    ctx.fillRect(box.x, box.y, box.w, box.h);

    // Fixed colors, not theme ones: these are drawn on the sky inside the
    // picture, where the light theme's accent is nearly invisible.
    const reference = [
      { k: 0.82, color: '#8de08a', label: 'below escape: ellipse' },
      { k: 1.0, color: '#5ec8f5', label: 'escape exactly: parabola' },
      { k: 1.25, color: '#ff6b6b', label: 'above escape: hyperbola' },
    ];
    const paths = reference.map(r => ({
      ...r,
      path: launchPath({
        mass: c.body.mass,
        radius: c.body.radius,
        r0: c.r0,
        v0: c.vEsc * r.k,
        reach: 6,
      }),
    }));
    const mine = launchPath({
      mass: c.body.mass,
      radius: c.body.radius,
      r0: c.r0,
      v0: c.v0,
      reach: 6,
    });

    // Tight enough that the closed case fills a good part of the frame. The
    // open ones then run off the edge, which is the correct impression: the
    // difference being shown is between a path that fits and one that does not.
    const halfWidth = 2.7 * c.r0;
    const fit = fitter([], box, halfWidth);
    // Launched sideways, every one of these curves swings away to one side, so
    // the planet is placed off center and the picture is balanced.
    const shift = 0.62 * c.r0 * fit.s;
    fit.cx += shift;
    const px = p => fit.cx + p.x * fit.s;
    const py = p => fit.cy - p.y * fit.s;

    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();

    ctx.fillStyle = '#16283d';
    ctx.beginPath();
    ctx.arc(fit.cx, fit.cy, Math.max(3, c.body.radius * fit.s), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.body.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = SKY_MUTED;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(fit.cx, fit.cy, c.r0 * fit.s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const stroke = (path, color, width, alpha) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      path.points.forEach((p, i) => {
        const X = px(p);
        const Y = py(p);
        if (i === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    };
    for (const r of paths) stroke(r.path, r.color, 1.7, 0.62);
    ctx.strokeStyle = 'rgba(6, 9, 18, 0.8)';
    stroke(mine, 'rgba(6, 9, 18, 0.8)', 5, 1);
    stroke(mine, SKY_INK, 2.6, 1);
    // Where every one of them starts
    ctx.fillStyle = '#5ec8f5';
    ctx.beginPath();
    ctx.arc(fit.cx + c.r0 * fit.s, fit.cy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);

    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const legend = [
      ...paths.map(r => ({ color: r.color, label: r.label })),
      { color: SKY_INK, label: `yours: ${v.k.toFixed(2)} × escape speed` },
    ];
    legend.forEach((r, i) => {
      const lx = box.x + 6 + (i % 2) * (box.w / 2);
      const ly = legendTop + Math.floor(i / 2) * 15;
      // The swatch keeps the curve's own color so the two can be matched; the
      // text takes the theme's, because it sits on the panel and not the sky.
      ctx.fillStyle = r.color;
      ctx.fillRect(lx, ly + 4, 12, 3);
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(lx - 0.5, ly + 3.5, 13, 4);
      ctx.fillStyle = i === legend.length - 1 ? ink : muted;
      ctx.fillText(r.label, lx + 18, ly);
    });
    ctx.fillStyle = SKY_MUTED;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    label(ctx, 'Earth, to scale', box.x + box.w - 8, box.y + 8);
  },
};

/** The instruments the orbital-energy lesson hands out. */
export const ENERGY_WIDGETS = [LAUNCH, LIVE_ENERGY, ESCAPE_COMPARE, SHAPES];
