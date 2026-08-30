// =============================================================================
// Binary star widgets: the instruments for "Weighing the Stars"
// -----------------------------------------------------------------------------
// The lesson is for a general-education audience, so these are built to be
// watched and read off rather than solved. Everything runs in the units the
// lesson uses throughout: astronomical units, years and solar masses, in which
// Kepler's third law is simply a^3 = P^2 (M1 + M2) with no constants to carry.
//
// The orbits are circular and evaluated analytically rather than integrated.
// That is not a shortcut taken for speed: it means the barycenter never drifts,
// the period is exact, and a student timing an orbit with the stopwatch gets
// the number the arithmetic on the next screen expects. An integrator that lost
// a percent per orbit would quietly break the measurement the whole lesson is
// building towards.
// =============================================================================

import { withUnit } from './format.js';
import { surface, palette, responsiveHeight, MONO } from './widgetCanvas.js';

/** Simulated years that pass in one second of watching. */
const YEARS_PER_SECOND = 0.25;

/** The system a student is asked to weigh, and is not shown. */
const MYSTERY = { m1: 3, m2: 1, sep: 4 };

const SKY = '#080b14';
const SKY_INK = '#e9edf7';
const SKY_MUTED = '#9aa3b5';
const STAR_A = '#ffd97d';
const STAR_B = '#8fd4ff';
const MARKER = '#f2a65a';

/**
 * Everything about a circular binary that the lesson needs.
 * @param {number} m1 - Mass of star A, solar masses
 * @param {number} m2 - Mass of star B, solar masses
 * @param {number} sep - Separation of the two stars, AU
 * @returns {Object} masses, distances from the barycenter, and the period
 */
export function binaryFacts(m1, m2, sep) {
  const total = m1 + m2;
  return {
    m1,
    m2,
    total,
    sep,
    // The heavier star sits proportionally closer to the balance point, which
    // is the whole of the mass-ratio idea in one line.
    r1: (sep * m2) / total,
    r2: (sep * m1) / total,
    ratio: m1 / m2,
    // a^3 = P^2 M, in AU, years and solar masses.
    period: Math.sqrt(sep ** 3 / total),
  };
}

/** Where each star is, at a given time. */
function positionsAt(facts, years) {
  const angle = (2 * Math.PI * years) / facts.period;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    a: { x: -facts.r1 * c, y: -facts.r1 * s },
    b: { x: facts.r2 * c, y: facts.r2 * s },
    angle,
  };
}

/** Draw a star with a soft glow, sized by mass but never smaller than legible. */
function drawStar(ctx, x, y, mass, color, scale, fixedRadius) {
  const r = fixedRadius ?? Math.max(4.5, 5.5 * Math.cbrt(mass) * scale);
  const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.6);
  glow.addColorStop(0, `${color}66`);
  glow.addColorStop(1, `${color}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  return r;
}

/** A label that stays readable over a star, a trail or a grid ring. */
function label(ctx, text, x, y) {
  ctx.strokeStyle = 'rgba(6, 9, 18, 0.9)';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

/**
 * Rings at whole astronomical units, so a distance can be read off rather than
 * estimated. Students are told not to infer scales from pixels, and this is how
 * that promise is kept.
 */
function drawGrid(ctx, cx, cy, scale, maxAu, box) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let au = 1; au <= maxAu; au++) {
    ctx.strokeStyle = SKY_MUTED;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, au * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = SKY_MUTED;
    // Up the vertical rather than along the horizontal: stacked this way the
    // labels sit a whole astronomical unit apart on screen instead of sharing
    // one line, and a star crosses them at only one point in its orbit.
    label(ctx, `${au} AU`, cx + (au % 2 ? -18 : 18), cy - au * scale);
  }
  ctx.restore();
}

// --- 1. The binary, in every mode the lesson needs ----------------------------

const TRAIL_POINTS = 260;
let bin = {
  key: '',
  years: 0,
  running: true,
  trailA: [],
  trailB: [],
  markedAt: null,
  stoppedAt: null,
  markAngle: 0,
};

/** The masses in play, which the mystery step supplies rather than the sliders. */
const activeMasses = (v, spec = {}) =>
  spec.mystery
    ? { m1: MYSTERY.m1, m2: MYSTERY.m2, sep: MYSTERY.sep }
    : spec.planet
      ? { m1: v.m1, m2: 0.000954, sep: spec.sep ?? 4 }
      : { m1: v.m1, m2: v.m2, sep: spec.sep ?? 4 };

const BINARY = {
  id: 'binary',
  title: 'Two stars, orbiting',
  note: 'Both stars are moving. Watch them for a few seconds before reading anything off.',
  animated: true,
  controls: [
    {
      id: 'm1',
      label: 'Mass of Star A',
      unit: 'M☉',
      min: 0.5,
      max: 5,
      step: 0.5,
      value: 2,
      decimals: 1,
    },
    {
      id: 'm2',
      label: 'Mass of Star B',
      unit: 'M☉',
      min: 0.5,
      max: 5,
      step: 0.5,
      value: 2,
      decimals: 1,
    },
  ],
  // The stopwatch only appears on the step that asks a student to time a lap.
  actions: (spec = {}) =>
    spec.timer
      ? [
          { id: 'mark', label: '⚑ Mark' },
          { id: 'stop', label: '■ Stop' },
          { id: 'run', label: '▶ Run / Pause' },
          { id: 'reset', label: '↺ Reset' },
        ]
      : [
          { id: 'run', label: '▶ Run / Pause' },
          { id: 'reset', label: '↺ Reset' },
        ],
  facts(v, spec) {
    const m = activeMasses(v, spec);
    return binaryFacts(m.m1, m.m2, m.sep);
  },
  key(v, spec = {}) {
    const m = activeMasses(v, spec);
    return `${m.m1}|${m.m2}|${m.sep}|${spec.planet ? 'p' : ''}`;
  },
  reset(v, { autorun = true, spec = {} } = {}) {
    bin = {
      key: this.key(v, spec),
      years: 0,
      running: autorun,
      trailA: [],
      trailB: [],
      markedAt: null,
      stoppedAt: null,
      markAngle: 0,
    };
  },
  act(id, v, spec = {}) {
    if (id === 'reset') this.reset(v, { autorun: true, spec });
    else if (id === 'run') bin.running = !bin.running;
    else if (id === 'mark') {
      bin.markedAt = bin.years;
      bin.stoppedAt = null;
      const f = this.facts(v, spec);
      bin.markAngle = positionsAt(f, bin.years).angle;
    } else if (id === 'stop' && bin.markedAt !== null) {
      bin.stoppedAt = bin.years;
    }
  },
  step(v, dt, spec = {}) {
    if (bin.key !== this.key(v, spec)) this.reset(v, { spec });
    if (!bin.running) return;
    bin.years += dt * YEARS_PER_SECOND;
    const f = this.facts(v, spec);
    const p = positionsAt(f, bin.years);
    bin.trailA.push(p.a);
    bin.trailB.push(p.b);
    while (bin.trailA.length > TRAIL_POINTS) {
      bin.trailA.shift();
      bin.trailB.shift();
    }
  },
  readout(v, ctx, spec = {}) {
    const f = this.facts(v, spec);
    const rows = [];
    const want = spec.rows || ['distances'];
    const has = key => want.includes(key);

    if (has('masses')) {
      rows.push({
        label: 'Mass of Star A',
        value: withUnit(f.m1.toFixed(1), 'M☉'),
      });
      rows.push({
        label: 'Mass of Star B',
        value: withUnit(f.m2.toFixed(1), 'M☉'),
      });
    }
    if (has('distances')) {
      rows.push({
        label: 'Star A, distance from the barycenter',
        value: withUnit(f.r1.toFixed(2), 'AU'),
        emphasis: true,
      });
      rows.push({
        label: 'Star B, distance from the barycenter',
        value: withUnit(f.r2.toFixed(2), 'AU'),
        emphasis: true,
      });
    }
    if (has('separation')) {
      rows.push({
        label: 'Distance between the two stars',
        value: withUnit(f.sep.toFixed(1), 'AU'),
      });
    }
    if (has('which')) {
      rows.push({
        label: 'Which star is closer to the balance point',
        value:
          Math.abs(f.m1 - f.m2) < 1e-6
            ? 'neither: they are the same'
            : f.r1 < f.r2
              ? 'Star A, the heavier one'
              : 'Star B, the heavier one',
        emphasis: true,
      });
    }
    if (has('clock')) {
      rows.push({
        label: 'Years since you started watching',
        value: withUnit(bin.years.toFixed(2), 'yr'),
      });
    }
    if (has('timer')) {
      const elapsed =
        bin.markedAt === null
          ? null
          : (bin.stoppedAt ?? bin.years) - bin.markedAt;
      rows.push({
        label: 'Stopwatch',
        value:
          elapsed === null
            ? 'press Mark when Star A crosses the line'
            : `${elapsed.toFixed(2)} years${
                bin.stoppedAt !== null
                  ? ' (stopped)'
                  : bin.running
                    ? ' (running)'
                    : ' (paused)'
              }`,
        emphasis: true,
      });
    }
    if (has('period')) {
      rows.push({
        label: 'Time for one full orbit',
        value: withUnit(f.period.toFixed(2), 'years'),
      });
    }
    if (has('total')) {
      rows.push({
        label: 'Total mass of the pair',
        value: withUnit(f.total.toFixed(1), 'M☉'),
      });
    }
    if (has('wobble')) {
      rows.push({
        label: 'How far the planet moves',
        value: withUnit(f.r2.toFixed(2), 'AU'),
      });
      rows.push({
        label: 'How far the star moves',
        value: withUnit((f.r1 * 1000).toFixed(1), 'thousandths of an AU'),
        emphasis: true,
      });
      rows.push({
        label: 'The star’s wobble, compared with the planet’s orbit',
        value: `about ${Math.round(f.r2 / f.r1)} times smaller`,
      });
    }
    return rows;
  },
  draw(canvas, v, ctx2, spec = {}) {
    const H = responsiveHeight(304, 248);
    const { ctx, w } = surface(canvas, H);
    const { grid } = palette();
    const f = this.facts(v, spec);
    if (bin.key !== this.key(v, spec)) this.reset(v, { spec });

    const box = { x: 4, y: 4, w: w - 8, h: H - 8 };
    ctx.fillStyle = SKY;
    ctx.fillRect(box.x, box.y, box.w, box.h);

    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    // Room for the widest orbit the sliders can produce, so the picture does
    // not rescale under a student who is comparing two settings.
    const maxAu = spec.planet ? f.sep * 1.25 : (spec.sep ?? 4) * 1.18;
    const scale = Math.min(box.w, box.h) / (2 * maxAu);

    if (spec.grid) drawGrid(ctx, cx, cy, scale, Math.floor(maxAu), box);

    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();

    const P = positionsAt(f, bin.years);
    const sx = p => cx + p.x * scale;
    const sy = p => cy - p.y * scale;

    // Faint guide circles for each star's own orbit
    if (spec.orbits !== false) {
      ctx.strokeStyle = SKY_MUTED;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 1;
      for (const r of [f.r1, f.r2]) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // The line a student marks the orbit against
    if (spec.timer && bin.markedAt !== null) {
      ctx.strokeStyle = MARKER;
      ctx.globalAlpha = 0.8;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx - Math.cos(bin.markAngle) * f.r1 * scale * 3,
        cy + Math.sin(bin.markAngle) * f.r1 * scale * 3
      );
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    if (spec.trails !== false) {
      const trail = (points, color) => {
        if (points.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        points.forEach((p, i) =>
          i === 0 ? ctx.moveTo(sx(p), sy(p)) : ctx.lineTo(sx(p), sy(p))
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
      };
      trail(bin.trailA, STAR_A);
      trail(bin.trailB, STAR_B);
    }

    if (spec.barycenter) {
      ctx.strokeStyle = MARKER;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy);
      ctx.lineTo(cx + 7, cy);
      ctx.moveTo(cx, cy - 7);
      ctx.lineTo(cx, cy + 7);
      ctx.stroke();
    }

    const rA = drawStar(ctx, sx(P.a), sy(P.a), f.m1, STAR_A, scale / 40);
    const rB = drawStar(
      ctx,
      sx(P.b),
      sy(P.b),
      spec.planet ? 0.15 : f.m2,
      spec.planet ? '#b8875a' : STAR_B,
      scale / 40
    );
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = STAR_A;
    label(ctx, spec.planet ? 'star' : 'Star A', sx(P.a), sy(P.a) - rA - 5);
    ctx.fillStyle = spec.planet ? '#e0b183' : STAR_B;
    label(ctx, spec.planet ? 'planet' : 'Star B', sx(P.b), sy(P.b) - rB - 5);
    ctx.restore();

    // The star's own path, magnified, for the planet case
    if (spec.planet) {
      const inset = { x: box.x + 8, y: box.y + 8, w: 96, h: 96 };
      ctx.fillStyle = 'rgba(6, 9, 18, 0.92)';
      ctx.fillRect(inset.x, inset.y, inset.w, inset.h);
      ctx.strokeStyle = MARKER;
      ctx.lineWidth = 1;
      ctx.strokeRect(inset.x + 0.5, inset.y + 0.5, inset.w - 1, inset.h - 1);
      const icx = inset.x + inset.w / 2;
      const icy = inset.y + inset.h / 2 + 4;
      const iScale = (inset.w * 0.32) / Math.max(f.r1, 1e-9);
      ctx.strokeStyle = STAR_A;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(icx, icy, f.r1 * iScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      drawStar(
        ctx,
        icx + P.a.x * iScale,
        icy - P.a.y * iScale,
        1,
        STAR_A,
        0.06
      );
      ctx.fillStyle = SKY_MUTED;
      ctx.font = `9px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      label(
        ctx,
        `star, magnified ${Math.round(iScale / scale)}×`,
        icx,
        inset.y + 5
      );
    }

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);

    // Corner captions
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = SKY_MUTED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    // The planet case has no useful pair of masses to print, and the caption
    // would sit exactly where the magnified inset goes.
    if (!spec.planet) {
      label(
        ctx,
        spec.mystery
          ? 'masses hidden'
          : `${f.m1.toFixed(1)} + ${f.m2.toFixed(1)} M☉`,
        box.x + 7,
        box.y + 6
      );
    }
    ctx.textAlign = 'right';
    label(
      ctx,
      withUnit(bin.years.toFixed(2), 'years'),
      box.x + box.w - 7,
      box.y + 6
    );
    if (spec.barycenter) {
      const ky = box.y + box.h - 7;
      ctx.strokeStyle = MARKER;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(box.x + 8, ky - 4);
      ctx.lineTo(box.x + 16, ky - 4);
      ctx.moveTo(box.x + 12, ky - 8);
      ctx.lineTo(box.x + 12, ky);
      ctx.stroke();
      ctx.fillStyle = MARKER;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      label(ctx, 'barycenter', box.x + 21, ky + 1);
    }
    if (!bin.running) {
      ctx.fillStyle = MARKER;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      label(ctx, 'paused', box.x + box.w - 7, box.y + box.h - 6);
    }
  },
};

// --- 2. Two systems side by side ----------------------------------------------

let pair = { years: 0, running: true, trails: [[], []] };
const PAIR_SYSTEMS = [
  { m1: 0.5, m2: 0.5, sep: 4, label: 'lightweight pair' },
  { m1: 2, m2: 2, sep: 4, label: 'heavyweight pair' },
];

const BINARY_COMPARE = {
  id: 'binary-compare',
  title: 'Same size orbit, different masses',
  note: 'Both pairs are exactly the same distance apart. Only the masses differ. Watch which one gets round first.',
  animated: true,
  controls: [],
  actions: [
    { id: 'run', label: '▶ Run / Pause' },
    { id: 'reset', label: '↺ Reset' },
  ],
  reset(v, { autorun = true } = {}) {
    pair = { years: 0, running: autorun, trails: [[], []] };
  },
  act(id, v) {
    if (id === 'reset') this.reset(v);
    else pair.running = !pair.running;
  },
  step(v, dt) {
    if (!pair.running) return;
    pair.years += dt * YEARS_PER_SECOND;
    PAIR_SYSTEMS.forEach((sys, i) => {
      const f = binaryFacts(sys.m1, sys.m2, sys.sep);
      pair.trails[i].push(positionsAt(f, pair.years).b);
      while (pair.trails[i].length > 220) pair.trails[i].shift();
    });
  },
  readout() {
    return [
      { label: 'Years elapsed', value: withUnit(pair.years.toFixed(2), 'yr') },
      ...PAIR_SYSTEMS.map(sys => {
        const f = binaryFacts(sys.m1, sys.m2, sys.sep);
        return {
          label: `${sys.label}: laps completed`,
          value: (pair.years / f.period).toFixed(2),
          emphasis: true,
        };
      }),
      {
        label: 'Separation of each pair',
        value: `${PAIR_SYSTEMS[0].sep} AU, both the same`,
      },
    ];
  },
  draw(canvas) {
    const H = responsiveHeight(268, 220);
    const { ctx, w } = surface(canvas, H);
    const { grid, ink } = palette();
    const half = (w - 12) / 2;

    PAIR_SYSTEMS.forEach((sys, i) => {
      const box = { x: 4 + i * (half + 4), y: 4, w: half, h: H - 8 };
      ctx.fillStyle = SKY;
      ctx.fillRect(box.x, box.y, box.w, box.h);
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2 + 6;
      const scale = Math.min(box.w, box.h - 20) / (2 * sys.sep * 1.2);
      const f = binaryFacts(sys.m1, sys.m2, sys.sep);
      const P = positionsAt(f, pair.years);

      ctx.save();
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.w, box.h);
      ctx.clip();

      ctx.strokeStyle = SKY_MUTED;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, f.r2 * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const t = pair.trails[i];
      if (t.length > 1) {
        ctx.strokeStyle = STAR_B;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        t.forEach((p, k) =>
          k === 0
            ? ctx.moveTo(cx + p.x * scale, cy - p.y * scale)
            : ctx.lineTo(cx + p.x * scale, cy - p.y * scale)
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.strokeStyle = MARKER;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy);
      ctx.lineTo(cx + 5, cy);
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx, cy + 5);
      ctx.stroke();

      drawStar(
        ctx,
        cx + P.a.x * scale,
        cy - P.a.y * scale,
        f.m1,
        STAR_A,
        scale / 40
      );
      drawStar(
        ctx,
        cx + P.b.x * scale,
        cy - P.b.y * scale,
        f.m2,
        STAR_B,
        scale / 40
      );
      ctx.restore();

      ctx.font = `10px ${MONO}`;
      ctx.fillStyle = SKY_INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      label(ctx, `${sys.m1} + ${sys.m2} = ${f.total} M☉`, cx, box.y + 6);
      ctx.fillStyle = SKY_MUTED;
      ctx.textBaseline = 'bottom';
      label(
        ctx,
        withUnit((pair.years / f.period).toFixed(2), 'laps'),
        cx,
        box.y + box.h - 6
      );
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
    });

    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
  },
};

// --- 3. The see-saw ------------------------------------------------------------

const BALANCE = {
  id: 'balance',
  title: 'The balance point',
  note: 'A see-saw balances when the heavier child sits closer to the middle. Two stars do exactly the same thing.',
  controls: [
    {
      id: 'd1',
      label: 'Star A, distance from the middle',
      unit: 'AU',
      min: 1,
      max: 4,
      step: 1,
      value: 1,
      decimals: 0,
    },
    {
      id: 'd2',
      label: 'Star B, distance from the middle',
      unit: 'AU',
      min: 1,
      max: 4,
      step: 1,
      value: 2,
      decimals: 0,
    },
  ],
  presets: [
    {
      label: '1 AU and 2 AU',
      values: { d1: 1, d2: 2 },
      note: 'Star B is twice as far out, so Star A must be twice as heavy to balance it.',
    },
    {
      label: '1 AU and 3 AU',
      values: { d1: 1, d2: 3 },
      note: 'Star B is three times as far out, so Star A is three times as heavy.',
    },
    {
      label: '2 AU and 4 AU',
      values: { d1: 2, d2: 4 },
      note: 'Twice as far again, so twice as heavy again. Only the ratio of the two distances matters, not the distances themselves.',
    },
    {
      label: 'Equal, 2 AU each',
      values: { d1: 2, d2: 2 },
      note: 'Equal distances mean equal masses. This is the case you started the lesson with.',
    },
  ],
  compute(v, spec = {}) {
    const ratio = v.d2 / v.d1;
    const total = spec.total ?? null;
    return {
      ratio,
      // Whole blocks whenever the ratio is a whole number, which is why the
      // lesson only ever uses distances like 1 and 3.
      blocksA: total ? (total * ratio) / (1 + ratio) : ratio,
      blocksB: total ? total / (1 + ratio) : 1,
      total,
    };
  },
  readout(v, ctx, spec = {}) {
    const c = this.compute(v, spec);
    const heavier = c.ratio >= 1 ? 'Star A' : 'Star B';
    const times = c.ratio >= 1 ? c.ratio : 1 / c.ratio;
    const rows = [
      { label: 'Star A is this far from the middle', value: `${v.d1} AU` },
      { label: 'Star B is this far from the middle', value: `${v.d2} AU` },
      {
        label: 'The heavier star, and by how much',
        value:
          c.ratio === 1
            ? 'neither: they weigh the same'
            : `${heavier}, by ${times % 1 === 0 ? times : times.toFixed(2)} times`,
        emphasis: true,
      },
    ];
    if (c.total) {
      rows.push({
        label: `Splitting ${c.total} M☉ between them`,
        value: `${c.blocksA.toFixed(0)} M☉ and ${c.blocksB.toFixed(0)} M☉`,
        emphasis: true,
      });
    }
    return rows;
  },
  draw(canvas, v, ctx2, spec = {}) {
    const H = responsiveHeight(spec.total ? 264 : 210, spec.total ? 230 : 184);
    const { ctx, w } = surface(canvas, H);
    const { ink, muted, grid } = palette();
    const c = this.compute(v, spec);

    const beamY = 104;
    const span = w - 72;
    const unit = span / 2 / 4; // pixels per AU, room for 4 AU each side
    const cx = w / 2;
    const xA = cx - v.d1 * unit;
    const xB = cx + v.d2 * unit;

    // The beam and its fulcrum
    ctx.strokeStyle = muted;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(xA, beamY);
    ctx.lineTo(xB, beamY);
    ctx.stroke();
    ctx.fillStyle = MARKER;
    ctx.beginPath();
    ctx.moveTo(cx, beamY - 2);
    ctx.lineTo(cx - 9, beamY + 16);
    ctx.lineTo(cx + 9, beamY + 16);
    ctx.closePath();
    ctx.fill();
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = MARKER;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('barycenter', cx, beamY + 20);

    // The two stars, sized by the mass the balance implies
    const radiusFor = m => 8 + 6 * Math.cbrt(m);
    const rA = drawStar(
      ctx,
      xA,
      beamY - 24,
      c.ratio,
      STAR_A,
      1,
      radiusFor(c.ratio)
    );
    const rB = drawStar(ctx, xB, beamY - 24, 1, STAR_B, 1, radiusFor(1));
    ctx.fillStyle = STAR_A;
    ctx.textBaseline = 'bottom';
    ctx.fillText('Star A', xA, beamY - 30 - rA);
    ctx.fillStyle = STAR_B;
    ctx.fillText('Star B', xB, beamY - 30 - rB);

    // Distance brackets under the beam
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.fillStyle = muted;
    ctx.textBaseline = 'top';
    for (const [x, d, side] of [
      [xA, v.d1, -1],
      [xB, v.d2, 1],
    ]) {
      const y = beamY + 44;
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x, y);
      ctx.lineTo(cx, y);
      ctx.lineTo(cx, y - 5);
      ctx.stroke();
      ctx.fillText(`${d} AU`, (x + cx) / 2, y + 3);
      void side;
    }

    // Mass blocks, so the split can be counted rather than calculated
    const wholeBlocks =
      c.total &&
      Math.abs(c.blocksA - Math.round(c.blocksA)) < 0.01 &&
      Math.abs(c.blocksB - Math.round(c.blocksB)) < 0.01;
    if (c.total && !wholeBlocks) {
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10, H - 78);
      ctx.lineTo(w - 10, H - 78);
      ctx.stroke();
      ctx.fillStyle = muted;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        `${c.total} solar masses split ${c.blocksA.toFixed(2)} to ${c.blocksB.toFixed(2)}`,
        cx,
        H - 72
      );
      ctx.fillText(
        'set the distances to 1 AU and 3 AU for whole blocks',
        cx,
        H - 56
      );
    }
    if (wholeBlocks) {
      const blocks = (n, x, color, name) => {
        const count = Math.round(n);
        const size = 15;
        const gap = 4;
        const startX = x - ((count - 1) * (size + gap)) / 2;
        for (let i = 0; i < count; i++) {
          ctx.fillStyle = color;
          ctx.fillRect(
            startX + i * (size + gap) - size / 2,
            H - 44,
            size,
            size
          );
        }
        ctx.fillStyle = ink;
        ctx.font = `10px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${name}: ${count} M☉`, x, H - 24);
      };
      ctx.fillStyle = muted;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${c.total} solar masses to share out`, cx, H - 50);
      blocks(c.blocksA, w * 0.28, STAR_A, 'Star A');
      blocks(c.blocksB, w * 0.75, STAR_B, 'Star B');
    }
  },
};

// --- 4. A real visual binary ---------------------------------------------------

// Sirius A and B. The orbit is real: a 50.1 year period and a true separation
// averaging 19.8 AU, which the lesson's own formula turns into 3.1 solar masses
// against a measured 3.06. Nothing here is adjusted to make that work.
const SIRIUS = { period: 50.1, a: 19.8, e: 0.5923, firstEpoch: 1894.13 };

/** Solve M = E - e sin E, so the marked epochs fall where they really would. */
function eccentricAnomaly(M, e) {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 40; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

/** Where the companion sits relative to the primary, in AU, at a given date. */
function siriusAt(year) {
  const M = (2 * Math.PI * (year - SIRIUS.firstEpoch)) / SIRIUS.period;
  const E = eccentricAnomaly(
    ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI),
    SIRIUS.e
  );
  const x = SIRIUS.a * (Math.cos(E) - SIRIUS.e);
  const y = SIRIUS.a * Math.sqrt(1 - SIRIUS.e ** 2) * Math.sin(E);
  return { x, y };
}

const VISUAL_BINARY = {
  id: 'visual-binary',
  title: 'Sirius, watched for a century',
  note: 'Each dot is where the faint companion was seen, relative to the bright star. Slide forward through the years and the orbit draws itself.',
  controls: [
    {
      id: 'year',
      label: 'Observations up to',
      unit: '',
      min: 1900,
      max: 2000,
      step: 5,
      value: 1900,
      decimals: 0,
      format: v => String(Math.round(v)),
    },
  ],
  presets: [
    {
      label: 'One decade',
      values: { year: 1910 },
      note: 'Three dots. They are moving, but nobody could tell you the shape of the orbit from this.',
    },
    {
      label: 'Half an orbit',
      values: { year: 1925 },
      note: 'A curve is appearing. Notice the dots are further apart when the companion is on the near side: it moves faster there, which is Kepler’s second law showing up in real data.',
    },
    {
      label: 'One full orbit',
      values: { year: 1945 },
      note: 'Fifty years of watching gives one complete orbit, and with it the period and the size. That is everything the mass formula needs.',
    },
    {
      label: 'A century',
      values: { year: 2000 },
      note: 'Two orbits. The companion returns to the same track, which is how astronomers know they are watching a bound pair rather than two stars passing.',
    },
  ],
  compute(v) {
    const points = [];
    for (let y = 1900; y <= v.year + 0.001; y += 5)
      points.push({ y, ...siriusAt(y) });
    return {
      points,
      total: SIRIUS.a ** 3 / SIRIUS.period ** 2,
      complete: (v.year - 1900) / SIRIUS.period,
    };
  },
  readout(v) {
    const c = this.compute(v);
    return [
      { label: 'Observations plotted', value: `${c.points.length}` },
      { label: 'Years of watching', value: `${Math.round(v.year - 1900)}` },
      {
        label: 'Orbits completed',
        value: c.complete.toFixed(2),
        emphasis: true,
      },
      { label: 'Period, once the orbit closes', value: '50.1 years' },
      { label: 'Orbit size, once the orbit closes', value: '19.8 AU' },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(258, 214);
    const { ctx, w } = surface(canvas, H);
    const { grid } = palette();
    const c = this.compute(v);

    const box = { x: 4, y: 4, w: w - 8, h: H - 8 };
    ctx.fillStyle = SKY;
    ctx.fillRect(box.x, box.y, box.w, box.h);

    // The primary sits at a focus, so the frame is offset to fit the ellipse.
    const scale = Math.min(box.w, box.h) / (2 * SIRIUS.a * 1.55);
    const cx = box.x + box.w / 2 + SIRIUS.a * SIRIUS.e * scale;
    const cy = box.y + box.h / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();

    // The orbit itself, revealed once a full circuit has been watched
    if (c.complete >= 1) {
      ctx.strokeStyle = STAR_B;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const p = siriusAt(1900 + (i / 200) * SIRIUS.period);
        const X = cx + p.x * scale;
        const Y = cy - p.y * scale;
        i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // The observations
    c.points.forEach((p, i) => {
      const X = cx + p.x * scale;
      const Y = cy - p.y * scale;
      ctx.fillStyle = STAR_B;
      ctx.globalAlpha = 0.35 + (0.65 * i) / Math.max(1, c.points.length - 1);
      ctx.beginPath();
      ctx.arc(X, Y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (p.y % 20 === 0) {
        ctx.font = `9px ${MONO}`;
        ctx.fillStyle = SKY_MUTED;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        label(ctx, String(p.y), X + 6, Y);
      }
    });

    drawStar(ctx, cx, cy, 2, STAR_A, 0.22);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = STAR_A;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    label(ctx, 'Sirius A', cx, cy - 16);
    ctx.restore();

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = SKY_MUTED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    label(
      ctx,
      `positions seen from Earth, 1900 to ${Math.round(v.year)}`,
      box.x + 7,
      box.y + 6
    );
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    label(
      ctx,
      '19.8 AU across at its widest',
      box.x + box.w - 7,
      box.y + box.h - 6
    );
  },
};

/** The instruments the binary-star lesson hands out. */
export const BINARY_WIDGETS = [BINARY, BINARY_COMPARE, BALANCE, VISUAL_BINARY];
