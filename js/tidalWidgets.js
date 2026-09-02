// =============================================================================
// Tidal widgets: the instruments for "Tides: When Gravity Pulls Unevenly"
// -----------------------------------------------------------------------------
// The main simulation canvas is very good at showing an orbit and useless at
// showing a difference of one part in a hundred between two arrows. Everything
// in this file exists because of that: each panel makes one comparison visible
// that the N-body view cannot.
//
// Two rules run through all of them.
//
//   A tide is a subtraction, so the subtraction is drawn. The arrow panel shows
//   the three raw pulls first, which look identical, and only then shows what
//   is left when the centre's is taken away. A student who is handed the second
//   picture without the first learns a diagram, not a mechanism.
//
//   Magnification is always declared. The residual arrows are tiny compared
//   with the pulls they came from, and drawing them at true relative length
//   would show nothing at all. Every panel that exaggerates says by how much,
//   on the panel, in the same place each time.
//
// All the physics is in tidalPhysics.js, which is pure and tested. Nothing here
// computes a tide or a Roche limit for itself.
// =============================================================================

import { surface, responsiveHeight, MONO } from './widgetCanvas.js';
import {
  tidalProfile,
  tidalAcceleration,
  selfGravity,
  massFromDensity,
  tidalToSelfGravity,
  rocheLimitRigid,
  rocheLimitFluid,
  disruptionRegime,
  tidalDisruption,
  swallowWholeMassSuns,
  tidalLineup,
  accelerationLabel,
  distanceLabel,
  timesLabel,
  ratioLabel,
  MOON_MASS_KG,
  MOON_DISTANCE_M,
  EARTH_RADIUS_M,
  EARTH_MASS_KG,
  SATURN_MASS_KG,
  SATURN_RADIUS_M,
  A_RING_OUTER_M,
  MIMAS_DISTANCE_M,
  MOON_RADIUS_M,
} from './tidalPhysics.js';

// The same fixed dark palette the black hole panels use, and for the same
// reason: these are pictures of space, and theme-coloured ink over them was
// unreadable in the light theme.
const SKY = '#080b14';
const INK = '#e9edf7';
const MUTED = '#9aa3b5';
const GRID = '#232a3a';
const PULL = '#8fd4ff'; // a raw gravitational pull
const STRETCH = '#f2748c'; // a residual, i.e. an actual tide
const GRIP = '#8de08a'; // a body's own gravity, holding it together
const WARN = '#ffb057';
const EARTH_BLUE = '#4b7be5';
const MOON_GREY = '#b9bcc4';

/** Ground the panel in a dark sky, whatever theme the page is wearing. */
function sky(ctx, w, h) {
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, w, h);
}

/** Text with a dark outline, so it stays readable over anything. */
function halo(ctx, text, x, y) {
  const fill = ctx.fillStyle;
  ctx.strokeStyle = 'rgba(8,11,20,0.92)';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** A horizontal arrow of a signed length, drawn from (x, y). */
function arrow(ctx, x, y, length, color, width = 2.4) {
  const dir = length >= 0 ? 1 : -1;
  const len = Math.abs(length);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  if (len < 1.5) {
    // A residual of zero is a real answer and has to look like one, or the
    // centre row reads as a drawing mistake.
    ctx.beginPath();
    ctx.arc(x, y, 2.6, 0, 2 * Math.PI);
    ctx.fill();
    return;
  }
  const head = Math.min(8, Math.max(4, len * 0.35));
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dir * (len - head * 0.6), y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + dir * len, y);
  ctx.lineTo(x + dir * (len - head), y - head * 0.55);
  ctx.lineTo(x + dir * (len - head), y + head * 0.55);
  ctx.closePath();
  ctx.fill();
}

/** A filled bar with a rounded end. */
function bar(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(1, w), h, Math.min(h / 2, 4));
  ctx.fill();
}

/** A disc with a soft limb, standing in for a world. */
function world(ctx, cx, cy, r, color) {
  const g = ctx.createRadialGradient(
    cx - r * 0.35,
    cy - r * 0.35,
    r * 0.1,
    cx,
    cy,
    r
  );
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Set a monospaced font at a size, and return it for chaining. */
function mono(ctx, size, color = MUTED) {
  ctx.font = `${size}px ${MONO}`;
  ctx.fillStyle = color;
}

/**
 * The first of several phrasings that fits the panel, longest first.
 *
 * These panels are drawn at 1440 pixels and at 340, and a caption written for
 * the wide one is silently clipped at both ends on a phone rather than
 * wrapping. Rather than write every caption short enough for the narrowest
 * case, each one carries a shorter alternative and the panel picks.
 *
 * The font must already be set on the context, because that is what the
 * measurement depends on.
 *
 * @param {CanvasRenderingContext2D} ctx - Target, with its font already set
 * @param {number} w - Panel width in CSS pixels
 * @param {...string} options - Phrasings, longest first
 * @returns {string} The first that fits, or the shortest if none do
 */
function fits(ctx, w, ...options) {
  for (const text of options) {
    if (ctx.measureText(text).width <= w - 18) return text;
  }
  return options[options.length - 1];
}

// =============================================================================
// 1. Near side, centre, far side: the subtraction, drawn
// =============================================================================

// The Earth is the body being stretched throughout the first half of the
// lesson, so its radius is fixed and only the perturber moves and changes mass.
const BODY_RADIUS_M = EARTH_RADIUS_M;

const VECTORS = {
  id: 'tide-vectors',
  title: 'The pull on three points',
  note: 'Distances are in units of the Moon’s real distance from the Earth, and masses in units of the Moon’s real mass. Setting both to 1.00 gives the real Earth-Moon system.',
  controls: [
    {
      id: 'dist',
      label: 'Distance to the companion',
      unit: '× Moon’s distance',
      min: 0.2,
      max: 2,
      step: 0.05,
      value: 1,
      decimals: 2,
    },
    {
      id: 'mass',
      label: 'Mass of the companion',
      unit: '× Moon’s mass',
      min: 0.25,
      max: 4,
      step: 0.25,
      value: 1,
      decimals: 2,
    },
  ],
  /**
   * The three pulls and the three residuals for the current settings.
   * @param {Object} v - Control values
   * @returns {Object} The profile, plus the separation and mass in SI
   */
  compute(v) {
    const distanceM = v.dist * MOON_DISTANCE_M;
    const massKg = v.mass * MOON_MASS_KG;
    return {
      distanceM,
      massKg,
      ...tidalProfile(massKg, distanceM, BODY_RADIUS_M),
    };
  },
  readout(v, _ctx, spec = {}) {
    const f = VECTORS.compute(v);
    const rows = [
      { label: 'Pull on the near side', value: accelerationLabel(f.near) },
      { label: 'Pull on the centre', value: accelerationLabel(f.centre) },
      { label: 'Pull on the far side', value: accelerationLabel(f.far) },
    ];
    if (spec.residual) {
      rows.push({
        label: 'Near side, minus the centre',
        value: `${accelerationLabel(f.nearResidual)} toward`,
        emphasis: true,
      });
      rows.push({
        label: 'Far side, minus the centre',
        value: `${accelerationLabel(Math.abs(f.farResidual))} away`,
        emphasis: true,
      });
    } else {
      rows.push({
        label: 'Near side bigger than far side by',
        value: `${(100 * (f.near / f.far - 1)).toFixed(1)}%`,
        emphasis: true,
      });
    }
    return rows;
  },
  draw(canvas, v, _ctx, spec = {}) {
    const showResidual = Boolean(spec.residual);
    const H = responsiveHeight(
      showResidual ? 330 : 250,
      showResidual ? 280 : 210
    );
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);

    const f = VECTORS.compute(v);
    const r = Math.min(34, (w - 200) / 6);
    const cx = Math.max(96, w * 0.34);
    // Both rows are placed from the height the panel actually got rather than
    // from the height it asks for. On a short window responsiveHeight hands
    // back fifty pixels less, and fixed offsets put the lower row's caption on
    // top of the footer text.
    // Two caption lines sit under a residual panel and only one under a raw
    // one, so the room reserved for them differs.
    const footerY = H - (showResidual ? 48 : 34);
    const rowA = showResidual ? 26 + r + 4 : H / 2 + 4;
    const rowB = footerY - r - 26;
    const opLabelY = (rowA + r + (rowB - r)) / 2 + 4;

    // The perturber lives at the right edge of every row, so "toward it" is
    // always to the right and the direction never has to be re-learned.
    const compX = w - 22;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    mono(ctx, 11, MUTED);
    halo(ctx, 'THE PULL AT EACH POINT', 14, 20);

    drawRow(ctx, {
      cx,
      cy: rowA,
      r,
      compX,
      values: [f.near, f.centre, f.far],
      color: PULL,
      // The centre arrow is given a fixed length and the other two are drawn in
      // true proportion to it, which is the honest picture: at the Moon's real
      // distance the three are within a few percent and look identical.
      scale: Math.min(96, w - cx - r - 60) / f.centre,
      label: 'toward the companion',
    });

    if (!showResidual) {
      mono(ctx, 10, MUTED);
      ctx.textAlign = 'center';
      halo(
        ctx,
        fits(
          ctx,
          w,
          'All three arrows point the same way, and at this scale they look the same length.',
          'All three point the same way, and look the same length.',
          'At this scale the three look identical.'
        ),
        w / 2,
        H - 26
      );
      halo(
        ctx,
        fits(
          ctx,
          w,
          'Read the numbers underneath: they are not the same.',
          'Read the numbers underneath: they are not.'
        ),
        w / 2,
        H - 12
      );
      companion(ctx, compX, rowA, v);
      return;
    }

    companion(ctx, compX, rowA, v);

    // The operation itself, written between the two rows.
    mono(ctx, 11, STRETCH);
    ctx.textAlign = 'left';
    halo(ctx, 'MINUS THE PULL ON THE CENTRE', 14, opLabelY);

    // Residuals are four orders of magnitude smaller than the pulls above, so
    // the row is drawn at its own scale and the factor is stated.
    const biggest = Math.max(Math.abs(f.nearResidual), Math.abs(f.farResidual));
    const residScale =
      biggest > 0 ? Math.min(56, cx - r - 46, w - cx - r - 30) / biggest : 0;
    drawRow(ctx, {
      cx,
      cy: rowB,
      r,
      compX: null,
      values: [f.nearResidual, 0, f.farResidual],
      color: STRETCH,
      scale: residScale,
      mode: 'bulge',
      labelX: Math.max(38, cx - r - 10 - Math.abs(f.farResidual) * residScale),
      label: 'what is left over',
    });

    const factor =
      residScale > 0
        ? residScale / (Math.min(96, w - cx - r - 60) / f.centre)
        : 0;
    mono(ctx, 10, MUTED);
    ctx.textAlign = 'center';
    halo(
      ctx,
      fits(
        ctx,
        w,
        `Bottom row drawn ${timesLabel(factor)} larger than the top row.`,
        `Bottom row drawn ${timesLabel(factor)} larger.`
      ),
      w / 2,
      H - 26
    );
    mono(ctx, 10, STRETCH);
    halo(
      ctx,
      fits(
        ctx,
        w,
        'Two bulges, and nothing is pushing the far side outward.',
        'Two bulges. Nothing pushes the far side.'
      ),
      w / 2,
      H - 12
    );
  },
};

/** The companion, drawn at the right edge with a label. */
function companion(ctx, x, y, v) {
  world(ctx, x, y, 9 + 3 * Math.cbrt(v.mass), MOON_GREY);
  ctx.textAlign = 'right';
  mono(ctx, 10, MUTED);
  halo(ctx, 'companion', x + 6, y + 30);
}

/**
 * One row of the arrow panel: a world with three arrows leaving it.
 * @param {CanvasRenderingContext2D} ctx - Target
 * @param {Object} o - Geometry, the three signed values, and how to scale them
 */
function drawRow(ctx, o) {
  const { cx, cy, r, values, color, scale, label, mode, labelX } = o;
  world(ctx, cx, cy, r, EARTH_BLUE);

  const ys = [cy - r * 0.62, cy, cy + r * 0.62];

  if (mode === 'bulge') {
    // The residual row is drawn as the shape it produces. The near-side arrow
    // leaves the limb facing the companion and points at it; the far-side
    // arrow leaves the opposite limb and points away. Anchoring them to the
    // sides they actually act on draws the two bulges instead of describing
    // them, and the centre gets a dot because nothing is left there.
    arrow(ctx, cx + r + 4, ys[0], values[0] * scale, color, 2.6);
    arrow(ctx, cx, ys[1], 0, color, 2);
    arrow(ctx, cx - r - 4, ys[2], -Math.abs(values[2]) * scale, color, 2.6);
  } else {
    // The raw row puts all three arrows on one vertical start line, so their
    // tips can be compared directly. Started at their own surface points they
    // would be offset by more than the difference being looked for, which is
    // the one thing this picture exists to show.
    const startX = cx + r + 8;
    ctx.strokeStyle = 'rgba(233,237,247,0.16)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(startX, ys[0] - 10);
    ctx.lineTo(startX, ys[2] + 10);
    ctx.stroke();
    ctx.setLineDash([]);
    values.forEach((value, i) => {
      arrow(ctx, startX, ys[i], value * scale, color, i === 1 ? 2 : 2.4);
    });
  }

  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  mono(ctx, 10, MUTED);
  // In bulge mode the far-side arrow leaves the left limb and runs outward, so
  // the labels move clear of the longest arrow the row can draw.
  const lx = labelX ?? cx - r - 8;
  halo(ctx, 'near', lx, ys[0] + 3);
  halo(ctx, 'centre', lx, ys[1] + 3);
  halo(ctx, 'far', lx, ys[2] + 3);

  if (label) {
    ctx.textAlign = 'left';
    mono(ctx, 10, color);
    halo(ctx, label, cx - r, cy + r + 22);
  }
}

// =============================================================================
// 2. How the tide changes with distance and with mass
// =============================================================================

/** The tide the real Moon raises on the real Earth, as the unit of comparison. */
const MOON_TIDE = tidalAcceleration(
  MOON_MASS_KG,
  MOON_DISTANCE_M,
  EARTH_RADIUS_M
);

const STRENGTH = {
  id: 'tide-strength',
  title: 'Tidal strength',
  note: 'The curve is drawn for you; the dot is where your slider is. Everything is measured against the tide the real Moon raises on the real Earth, which is 1.00.',
  controls: [
    {
      id: 'dist',
      label: 'Distance to the companion',
      unit: '× Moon’s distance',
      min: 0.2,
      max: 2,
      step: 0.05,
      value: 1,
      decimals: 2,
    },
    {
      id: 'mass',
      label: 'Mass of the companion',
      unit: '× Moon’s mass',
      min: 0.25,
      max: 4,
      step: 0.25,
      value: 1,
      decimals: 2,
    },
  ],
  /**
   * The tide at the current settings, in absolute and relative terms.
   * @param {Object} v - Control values
   * @returns {Object} tide in m/s², and as a multiple of the real lunar tide
   */
  compute(v) {
    const tide = tidalAcceleration(
      v.mass * MOON_MASS_KG,
      v.dist * MOON_DISTANCE_M,
      BODY_RADIUS_M
    );
    return { tide, relative: tide / MOON_TIDE };
  },
  readout(v, _ctx, spec = {}) {
    const f = STRENGTH.compute(v);
    const rows = [];
    if (spec.axis !== 'mass') {
      rows.push({
        label: 'Distance',
        value: `${v.dist.toFixed(2)} × the Moon’s`,
      });
    }
    if (spec.axis !== 'distance') {
      rows.push({ label: 'Mass', value: `${v.mass.toFixed(2)} × the Moon’s` });
    }
    rows.push({
      label: 'Tidal stretch',
      value: `${f.relative.toFixed(2)} × the real lunar tide`,
      emphasis: true,
    });
    rows.push({ label: 'In full units', value: accelerationLabel(f.tide) });
    return rows;
  },
  draw(canvas, v, _ctx, spec = {}) {
    const byMass = spec.axis === 'mass';
    const H = responsiveHeight(275, 215);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);

    const L = 52;
    const R = w - 16;
    const T = 20;
    const B = H - 34;

    // Both axes are held fixed across the whole slider range. Rescaling to fit
    // would keep the dot in the middle of the picture and hide the very change
    // the student is being asked to see.
    const xMin = byMass ? 0 : 0.2;
    const xMax = byMass ? 4 : 2;
    const yMax = byMass ? 4.2 : 8.5;
    const at = x =>
      byMass
        ? x // linear in mass
        : Math.pow(1 / x, 3); // and an inverse cube in distance
    const px = x => L + ((x - xMin) / (xMax - xMin)) * (R - L);
    const py = y => B - (Math.min(y, yMax) / yMax) * (B - T);

    // Grid and axes.
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    mono(ctx, 10, MUTED);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let g = 0; g <= yMax; g += byMass ? 1 : 2) {
      const y = py(g);
      ctx.beginPath();
      ctx.moveTo(L, y);
      ctx.lineTo(R, y);
      ctx.stroke();
      ctx.fillText(String(g), L - 6, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xTicks = byMass ? [0, 1, 2, 3, 4] : [0.25, 0.5, 1, 1.5, 2];
    for (const t of xTicks) {
      if (t < xMin || t > xMax) continue;
      ctx.beginPath();
      ctx.moveTo(px(t), T);
      ctx.lineTo(px(t), B);
      ctx.stroke();
      ctx.fillText(t.toFixed(t < 1 ? 2 : 0), px(t), B + 5);
    }

    // The curve.
    ctx.strokeStyle = STRETCH;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 240; i++) {
      const x = xMin + ((xMax - xMin) * i) / 240;
      const y = at(x) * (byMass ? v.dist ** -3 : v.mass);
      if (y > yMax * 1.05) {
        started = false;
        continue;
      }
      const X = px(x);
      const Y = py(y);
      if (!started) {
        ctx.moveTo(X, Y);
        started = true;
      } else ctx.lineTo(X, Y);
    }
    ctx.stroke();

    // Where the slider is.
    const here = STRENGTH.compute(v).relative;
    const hx = px(byMass ? v.mass : v.dist);
    const hy = py(here);
    if (here <= yMax) {
      ctx.strokeStyle = 'rgba(242,116,140,0.4)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, B);
      ctx.lineTo(hx, hy);
      ctx.lineTo(L, hy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(hx, hy, 4.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = STRETCH;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      mono(ctx, 11, WARN);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      halo(ctx, `${here.toFixed(1)} × — off the top of this graph`, hx, T + 4);
    }

    // Axis names.
    mono(ctx, 10, MUTED);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    halo(
      ctx,
      byMass ? 'companion mass  (× the Moon’s)' : 'distance  (× the Moon’s)',
      (L + R) / 2,
      H - 2
    );
    ctx.save();
    ctx.translate(11, (T + B) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // A measurement screen stacks this panel above its plot and leaves it
    // barely taller than the label, so the long form is dropped rather than
    // being drawn off the top of the canvas.
    halo(
      ctx,
      B - T > 200 ? 'tidal stretch  (× the lunar tide)' : 'stretch (× lunar)',
      0,
      0
    );
    ctx.restore();
  },
};

// =============================================================================
// 3. The same mechanism, over fourteen orders of magnitude
// =============================================================================

const LINEUP = tidalLineup();

const COMPARE = {
  id: 'tide-compare',
  title: 'Seven real tides, on one scale',
  note: 'Each bar is one order of magnitude longer than the last for every factor of ten, because these numbers cannot fit on an ordinary ruler. Move the slider to read one off.',
  controls: [
    {
      id: 'which',
      label: 'Highlight',
      unit: '',
      min: 0,
      max: LINEUP.length - 1,
      step: 1,
      value: 0,
      decimals: 0,
      format: i => LINEUP[Math.round(i)]?.short ?? '',
    },
  ],
  readout(v) {
    const s = LINEUP[Math.round(v.which)] ?? LINEUP[0];
    const moon = LINEUP[0].tidal;
    return [
      { label: 'Pairing', value: s.label },
      { label: 'Separation', value: distanceLabel(s.distanceM) },
      {
        label: 'Tidal stretch',
        value: accelerationLabel(s.tidal),
        emphasis: true,
      },
      {
        label: 'Compared with the lunar tide',
        value: timesLabel(s.tidal / moon),
      },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(300, 250);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);

    const pick = Math.round(v.which);
    const logs = LINEUP.map(s => Math.log10(s.tidal));
    const lo = Math.floor(Math.min(...logs)) - 1;
    const hi = Math.ceil(Math.max(...logs));
    const left = 12;
    const right = w - 12;
    const top = 26;
    const gap = Math.min(34, (H - top - 26) / LINEUP.length);

    // Decade gridlines, so the log scale is a thing on the picture rather than
    // an instruction in the caption.
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    mono(ctx, 9, MUTED);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let d = lo; d <= hi; d++) {
      const x = left + ((d - lo) / (hi - lo)) * (right - left);
      ctx.beginPath();
      ctx.moveTo(x, top - 6);
      ctx.lineTo(x, top + gap * LINEUP.length - 8);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    halo(
      ctx,
      fits(
        ctx,
        w,
        'each gridline is ten times the one before',
        'each gridline is ten times the last'
      ),
      left,
      8
    );

    LINEUP.forEach((s, i) => {
      const y = top + i * gap;
      const frac = (Math.log10(s.tidal) - lo) / (hi - lo);
      const len = Math.max(3, frac * (right - left));
      const on = i === pick;
      mono(ctx, 10, on ? INK : MUTED);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      halo(ctx, s.short, left + 2, y + 8);
      bar(ctx, left, y + 12, len, on ? 9 : 6, on ? STRETCH : GRID);
      if (!on) {
        ctx.strokeStyle = MUTED;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(left, y + 12, len, 6, 3);
        ctx.stroke();
      }
      if (on) {
        mono(ctx, 10, STRETCH);
        ctx.textAlign = 'right';
        halo(ctx, accelerationLabel(s.tidal), right, y + 8);
      }
    });

    mono(ctx, 10, MUTED);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    halo(
      ctx,
      fits(
        ctx,
        w,
        'tidal stretch, on a scale that counts the zeros',
        'a scale that counts the zeros'
      ),
      w / 2,
      H - 6
    );
  },
};

// =============================================================================
// 4. What the stretch has to beat
// =============================================================================

// The Moon, walked in toward the Earth. Using the real pair keeps the whole
// second half of the lesson in the system the first half established, and the
// answer it produces - a break-up distance of about one and a half Earth radii
// - is the number a textbook quotes for the Earth-Moon Roche limit.
//
// The satellite's radius cancels out of the Roche limit once its density is
// fixed, so what the density slider really changes is what the body is made
// of, not how big it is.
const RUBBLE_RADIUS_M = MOON_RADIUS_M;

/** Density presets for the stretch-against-grip panel. */
const BALANCE_PRESETS = [
  {
    label: 'Comet ice',
    values: { density: 600 },
    note: 'A porous, weakly bound nucleus. Very little grip for its size, so the balance tips a long way out.',
  },
  {
    label: 'The Moon',
    values: { density: 3300 },
    note: 'The Moon’s own density, 3 344 kg/m³. This is the real Earth-Moon case, with the Moon moved in from its actual distance of about sixty Earth radii.',
  },
  {
    label: 'Iron',
    values: { density: 6000 },
    note: 'A dense metallic body. More grip for its size, so it can come in closer before the balance tips.',
  },
];

const BALANCE = {
  id: 'tide-balance',
  title: 'Stretch against grip',
  note: 'A body the size of the Moon, brought in far closer to the Earth than the Moon really is. Green is its own gravity holding it together; red is the tide pulling its ends apart. Both are measured at its surface.',
  controls: [
    {
      id: 'dist',
      label: 'Distance from the Earth’s centre',
      unit: 'Earth radii',
      min: 1.2,
      max: 6,
      step: 0.05,
      value: 5,
      decimals: 2,
    },
    {
      id: 'density',
      label: 'Density of the body',
      unit: 'kg/m³',
      min: 500,
      max: 6000,
      step: 100,
      value: 3300,
      decimals: 0,
    },
  ],
  /**
   * The density presets, withheld on a step that holds the density fixed.
   *
   * "Where the balance tips" pins the density at the Moon's own, hides the
   * slider, says so in its note, and then asks a graded question about the
   * crossing distance. With these buttons still on screen a student could press
   * "Iron", move a parameter they cannot see, read a crossing distance for a
   * different body, and be marked wrong with nothing on screen to explain why.
   *
   * @param {Object} [spec] - The step's tool spec
   * @returns {Array} Presets to show
   */
  presets(spec = {}) {
    if ((spec.hide || []).includes('density')) return [];
    return BALANCE_PRESETS;
  },
  /**
   * Both accelerations at the body's surface, and where they cross.
   * @param {Object} v - Control values
   * @returns {Object} stretch, grip, ratio, the Roche limits and the regime
   */
  compute(v) {
    const distanceM = v.dist * EARTH_RADIUS_M;
    const mass = massFromDensity(v.density, RUBBLE_RADIUS_M);
    const stretch = tidalAcceleration(
      EARTH_MASS_KG,
      distanceM,
      RUBBLE_RADIUS_M
    );
    const grip = selfGravity(mass, RUBBLE_RADIUS_M);
    const rigid = rocheLimitRigid(EARTH_MASS_KG, mass, RUBBLE_RADIUS_M);
    const fluid = rocheLimitFluid(EARTH_MASS_KG, mass, RUBBLE_RADIUS_M);
    return {
      distanceM,
      mass,
      stretch,
      grip,
      ratio: stretch / grip,
      rigid,
      fluid,
      regime: disruptionRegime(distanceM, rigid, fluid),
    };
  },
  readout(v) {
    const f = BALANCE.compute(v);
    const verdict = {
      safe: 'Its own gravity wins. It stays a ball.',
      deforming:
        'Comparable. It would be visibly stretched and shedding material.',
      disrupting: 'The tide wins. A body with no strength comes apart here.',
    }[f.regime];
    return [
      {
        label: 'Its own gravity, at its surface',
        value: accelerationLabel(f.grip),
      },
      {
        label: 'Tidal stretch, at its surface',
        value: accelerationLabel(f.stretch),
      },
      {
        label: 'Stretch ÷ grip',
        value: ratioLabel(f.ratio),
        emphasis: true,
      },
      {
        label: 'The two are equal at',
        value: `${(f.rigid / EARTH_RADIUS_M).toFixed(2)} Earth radii  (${distanceLabel(f.rigid)})`,
        emphasis: true,
      },
      { label: 'What that means', value: verdict },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(280, 230);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);

    const f = BALANCE.compute(v);
    const left = 14;
    const span = Math.max(w - left - 14, 40);
    const big = Math.max(f.grip, f.stretch, 1e-12);

    // Two bars against a common scale, so "which is longer" is the whole
    // reading and no arithmetic is needed to get it. The names sit above the
    // bars rather than beside them: set to the left they were long enough to
    // run off the panel on a narrow window.
    const rows = [
      {
        value: f.grip,
        color: GRIP,
        text: 'its own gravity, holding it together',
      },
      {
        value: f.stretch,
        color: STRETCH,
        text: 'the tide, pulling its ends apart',
      },
    ];
    rows.forEach((row, i) => {
      const y = 42 + i * 58;
      mono(ctx, 11, row.color);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      halo(ctx, fits(ctx, w, row.text, row.short), left, y - 7);
      bar(ctx, left, y, (row.value / big) * span, 14, row.color);
      mono(ctx, 10, MUTED);
      halo(ctx, accelerationLabel(row.value), left, y + 28);
    });

    // The verdict, in the largest type on the panel.
    const verdict = {
      safe: { text: 'HOLDS TOGETHER', color: GRIP },
      deforming: { text: 'STRETCHING, SHEDDING', color: WARN },
      disrupting: { text: 'COMES APART', color: STRETCH },
    }[f.regime];
    // The verdict is centred in whatever room is left between the bars and the
    // ruler. Fixed offsets put it on top of the ruler once responsiveHeight
    // handed back a shorter panel on a phone.
    const ry = H - 26;
    const verdictY = (134 + (ry - 20)) / 2 - 8;
    mono(ctx, 15, verdict.color);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    halo(ctx, verdict.text, w / 2, verdictY);
    mono(ctx, 11, MUTED);
    halo(ctx, `stretch ÷ grip = ${ratioLabel(f.ratio)}`, w / 2, verdictY + 22);

    // A ruler underneath showing where the crossing point sits.
    const scaleLo = 1.2;
    const scaleHi = 6;
    const rx = d => 20 + ((d - scaleLo) / (scaleHi - scaleLo)) * (w - 40);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, ry);
    ctx.lineTo(w - 20, ry);
    ctx.stroke();
    const cross = f.rigid / EARTH_RADIUS_M;
    if (cross >= scaleLo && cross <= scaleHi) {
      ctx.strokeStyle = WARN;
      ctx.beginPath();
      ctx.moveTo(rx(cross), ry - 8);
      ctx.lineTo(rx(cross), ry + 8);
      ctx.stroke();
      mono(ctx, 9, WARN);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      // Kept clear of both ends: the crossing point sits near the left of the
      // ruler for a dense body and the label would otherwise run off it.
      halo(
        ctx,
        'equal here',
        Math.min(w - 40, Math.max(40, rx(cross))),
        ry + 9
      );
    }
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(
      rx(Math.min(scaleHi, Math.max(scaleLo, v.dist))),
      ry,
      5,
      0,
      2 * Math.PI
    );
    ctx.fill();
    mono(ctx, 9, MUTED);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    halo(ctx, 'closer in', 20, ry - 8);
    ctx.textAlign = 'right';
    halo(ctx, 'further out', w - 20, ry - 8);
  },
};

// =============================================================================
// 5. The Roche limit, as a place rather than a formula
// =============================================================================

const ROCHE = {
  id: 'roche-model',
  title: 'Bring a moon in toward Saturn',
  note: 'The two rings on the picture are the two Roche limits: the outer one for a body with no strength at all, the inner one for a body that keeps its shape. Between them is a real gap, not a rounding error.',
  controls: [
    {
      id: 'dist',
      label: 'Distance from Saturn’s centre',
      unit: 'Saturn radii',
      min: 1.1,
      max: 4,
      step: 0.05,
      value: 3.2,
      decimals: 2,
    },
    {
      id: 'density',
      label: 'Density of the moon',
      unit: 'kg/m³',
      min: 400,
      max: 6000,
      step: 100,
      value: 600,
      decimals: 0,
    },
  ],
  presets: [
    {
      label: 'Porous ice',
      values: { density: 600 },
      note: 'What Saturn’s ring particles actually are: water ice, loosely packed. This is the case the rings themselves test.',
    },
    {
      label: 'Solid ice',
      values: { density: 900 },
      note: 'Dense, unfractured ice. The limit moves inward, because a denser body grips itself harder.',
    },
    {
      label: 'Rock',
      values: { density: 3000 },
      note: 'Denser, so it holds together closer in. The Roche limit is not one distance: it depends on what is falling in.',
    },
    {
      label: 'Iron',
      values: { density: 6000 },
      note: 'Denser still, and the limit moves in again. Change what the moon is made of and you change where it breaks.',
    },
  ],
  /**
   * The two Roche limits for the chosen material, and where the moon sits.
   * @param {Object} v - Control values
   * @returns {Object} Limits in Saturn radii, plus the regime and the ratio
   */
  compute(v) {
    // The moon's radius cancels out of the density form of the limit, so the
    // answer depends only on what it is made of. A representative inner-moon
    // size is used for the drawing and for the surface accelerations.
    const radiusM = 2e5;
    const mass = massFromDensity(v.density, radiusM);
    const rigid = rocheLimitRigid(SATURN_MASS_KG, mass, radiusM);
    const fluid = rocheLimitFluid(SATURN_MASS_KG, mass, radiusM);
    const distanceM = v.dist * SATURN_RADIUS_M;
    return {
      radiusM,
      mass,
      distanceM,
      rigid,
      fluid,
      rigidRadii: rigid / SATURN_RADIUS_M,
      fluidRadii: fluid / SATURN_RADIUS_M,
      ratio: tidalToSelfGravity(SATURN_MASS_KG, mass, radiusM, distanceM),
      regime: disruptionRegime(distanceM, rigid, fluid),
    };
  },
  readout(v) {
    const f = ROCHE.compute(v);
    const verdict = {
      safe: 'Outside both limits: a moon can survive here.',
      deforming:
        'Between the limits: a weak body comes apart, a rigid one holds on.',
      disrupting:
        'Inside both: nothing held together by gravity alone survives.',
    }[f.regime];
    return [
      {
        label: 'Roche limit, body with no strength',
        value: `${f.fluidRadii.toFixed(2)} R_Saturn  (${distanceLabel(f.fluid)})`,
        emphasis: true,
      },
      {
        label: 'Roche limit, body that keeps its shape',
        value: `${f.rigidRadii.toFixed(2)} R_Saturn  (${distanceLabel(f.rigid)})`,
      },
      {
        label: 'Stretch ÷ grip where you have put it',
        value: f.ratio.toFixed(2),
      },
      { label: 'Verdict', value: verdict },
      {
        label: 'For comparison, the A ring’s outer edge',
        value: `${(A_RING_OUTER_M / SATURN_RADIUS_M).toFixed(2)} R_Saturn`,
      },
      {
        label: 'And Mimas, the innermost round moon',
        value: `${(MIMAS_DISTANCE_M / SATURN_RADIUS_M).toFixed(2)} R_Saturn`,
      },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(300, 250);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);

    const f = ROCHE.compute(v);
    const maxRadii = 4.3;
    const cx = 46;
    const cy = H / 2 - 10;
    const pxPerRadius = (w - cx - 26) / maxRadii;
    const rPlanet = Math.min(30, pxPerRadius);

    // Saturn, then the two limits as arcs rather than full circles: a full
    // circle at this aspect ratio runs off the top and bottom and reads as a
    // wall instead of a distance.
    // A limit that falls below one planet radius is a real answer - a dense
    // enough body could orbit inside Saturn's cloud tops without the tide
    // touching it - but there is nowhere on the picture to draw it, so it is
    // reported in words instead of quietly clipped.
    // The band the arcs are allowed to occupy, so a wide arc does not sweep
    // down across the ruler and the caption underneath it.
    const halfBand = Math.min(cy - 22, H - 58 - cy);
    const limitArc = (radii, color, dash, label) => {
      if (radii < 1.05) return `${label}: inside Saturn itself`;
      const R = radii * pxPerRadius;
      // A wide arc is drawn as a shorter sweep rather than a taller one, which
      // keeps every arc inside the same horizontal band whatever its radius.
      const extent = Math.min(1.15, Math.asin(Math.min(1, halfBand / R)));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.arc(cx, cy, R, -extent, extent);
      ctx.stroke();
      ctx.setLineDash([]);
      // Labelled at the arc's upper end, which is on the canvas by
      // construction, instead of at a fixed offset that ran off the top.
      mono(ctx, 9, color);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const lx = Math.min(w - 34, Math.max(34, cx + R * Math.cos(extent)));
      halo(ctx, label, lx, cy - R * Math.sin(extent) - 3);
      return null;
    };

    const buried = [
      limitArc(f.fluidRadii, WARN, [5, 4], 'no strength'),
      limitArc(f.rigidRadii, GRIP, [2, 4], 'keeps its shape'),
    ].filter(Boolean);

    world(ctx, cx, cy, rPlanet, '#d8c18a');
    // A ring hint, for the comparison the readout makes.
    ctx.strokeStyle = 'rgba(216,193,138,0.55)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(
      cx,
      cy,
      ((A_RING_OUTER_M / SATURN_RADIUS_M) * pxPerRadius + 1.3 * pxPerRadius) /
        2,
      -0.5,
      0.5
    );
    ctx.stroke();
    mono(ctx, 9, MUTED);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    halo(ctx, 'rings', cx + 1.6 * pxPerRadius, cy + 2);

    if (buried.length) {
      mono(ctx, 9, MUTED);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      halo(ctx, buried.join('  ·  '), 10, 8);
    }

    // The moon itself, drawn as one body, as a stretched one, or as a spread
    // of fragments. This is a cartoon of the outcome and the caption says so:
    // nothing here is a fluid calculation.
    const mx = cx + Math.min(v.dist, maxRadii) * pxPerRadius;
    const my = cy - 44;
    const baseR = 8;
    if (f.regime === 'safe') {
      world(ctx, mx, my, baseR, MOON_GREY);
    } else if (f.regime === 'deforming') {
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(Math.atan2(my - cy, mx - cx));
      ctx.scale(1.9, 0.7);
      world(ctx, 0, 0, baseR, MOON_GREY);
      ctx.restore();
    } else {
      const n = 9;
      const ang = Math.atan2(my - cy, mx - cx);
      for (let i = 0; i < n; i++) {
        const t = (i - (n - 1) / 2) / (n - 1);
        const spread = 46;
        world(
          ctx,
          mx + Math.cos(ang) * t * spread,
          my + Math.sin(ang) * t * spread,
          Math.max(2, baseR * 0.42 * (1 - 0.4 * Math.abs(t))),
          MOON_GREY
        );
      }
    }

    const caption = {
      safe: 'The moon survives here.',
      deforming: 'Stretched, and losing material from its ends.',
      disrupting: 'Pulled into a stream of fragments.',
    }[f.regime];
    mono(
      ctx,
      11,
      f.regime === 'safe' ? GRIP : f.regime === 'deforming' ? WARN : STRETCH
    );
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    halo(ctx, caption, w / 2, H - 42);

    // A distance ruler along the bottom.
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    mono(ctx, 9, MUTED);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let d = 1; d <= 4; d++) {
      const x = cx + d * pxPerRadius;
      if (x > w - 6) break;
      ctx.beginPath();
      ctx.moveTo(x, H - 34);
      ctx.lineTo(x, H - 28);
      ctx.stroke();
      halo(ctx, `${d}R`, x, H - 27);
    }
    // On its own line: on a narrow panel this used to overlap the ruler ticks.
    ctx.textAlign = 'center';
    halo(
      ctx,
      fits(
        ctx,
        w,
        'a drawing of the outcome, not a fluid calculation',
        'a drawing, not a fluid calculation'
      ),
      w / 2,
      H - 13
    );
  },
};

// =============================================================================
// 6. The compact-object case, and where it stops working
// =============================================================================

const DISRUPT = {
  id: 'tide-disrupt',
  title: 'A Sun-like star falling toward a black hole',
  note: 'The slider counts zeros: 1 is ten solar masses, 8 is a hundred million. Both circles are drawn on a scale that counts zeros too, because they differ by a factor of a billion at the left-hand end.',
  controls: [
    {
      id: 'logm',
      label: 'Black hole mass',
      unit: '',
      min: 0.5,
      max: 9,
      step: 0.1,
      value: 1,
      decimals: 1,
      format: x => {
        const m = Math.pow(10, x);
        return m >= 1e6
          ? `${(m / 1e6).toFixed(m / 1e6 < 10 ? 1 : 0)} million M☉`
          : `${m < 100 ? m.toFixed(0) : Math.round(m).toLocaleString('en-US')} M☉`;
      },
    },
  ],
  presets: [
    {
      label: 'Stellar, 10 M☉',
      values: { logm: 1 },
      note: 'The kind LIGO hears merging. Its tidal radius is tens of thousands of times its horizon, so a star is shredded a long way out.',
    },
    {
      label: 'Sagittarius A*, 4 million M☉',
      values: { logm: 6.63 },
      note: 'The black hole at the centre of our own galaxy. A star still comes apart outside the horizon here, which is why these flares can be seen at all.',
    },
    {
      label: 'A giant, 1 billion M☉',
      values: { logm: 9 },
      note: 'The tidal radius has fallen inside the horizon. A Sun-like star crosses whole, and there is no flare to see from outside.',
    },
  ],
  /**
   * The tidal radius and the horizon for the current mass.
   * @param {Object} v - Control values
   * @returns {Object} Radii in metres, their ratio, and the crossover mass
   */
  compute(v) {
    const massSuns = Math.pow(10, v.logm);
    return {
      massSuns,
      ...tidalDisruption(massSuns),
      crossover: swallowWholeMassSuns(),
    };
  },
  readout(v) {
    const f = DISRUPT.compute(v);
    return [
      {
        label: 'Black hole mass',
        value:
          f.massSuns >= 1e6
            ? `${(f.massSuns / 1e6).toPrecision(3)} million M☉`
            : `${Math.round(f.massSuns).toLocaleString('en-US')} M☉`,
      },
      {
        label: 'Star is torn apart at',
        value: distanceLabel(f.tidalRadiusM),
        emphasis: true,
      },
      { label: 'Event horizon at', value: distanceLabel(f.horizonM) },
      {
        label: 'Tidal radius ÷ horizon',
        value: timesLabel(f.ratio),
        emphasis: true,
      },
      {
        label: 'What an outside observer sees',
        value: f.disruptsOutside
          ? 'The star is shredded outside the horizon: a flare.'
          : 'The star crosses the horizon whole: nothing to see.',
      },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(285, 235);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);

    const f = DISRUPT.compute(v);
    const cx = w / 2;
    // The four lines of text underneath are fixed; the diagram takes whatever
    // is left and centres itself in it. Pinning the centre at a constant y put
    // the tidal circle straight through the verdict on a phone.
    const textTop = H - 76;
    const cy = 18 + (textTop - 18) / 2;
    const maxR = Math.max(20, Math.min(cy - 20, textTop - cy - 8));

    // Both radii on one logarithmic scale, anchored so the picture is stable
    // as the slider moves: the horizon is the unit and the tidal radius is
    // drawn at a length that counts the zeros between them.
    const rHorizon = 16;
    const decades = Math.log10(Math.max(f.ratio, 1e-3));
    const rTidal = Math.min(rHorizon + decades * 13, maxR);

    if (rTidal > rHorizon) {
      ctx.strokeStyle = STRETCH;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, rTidal, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx, cy, rHorizon, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = WARN;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    if (rTidal <= rHorizon) {
      ctx.strokeStyle = STRETCH;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(3, rTidal), 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    mono(ctx, 10, WARN);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    halo(ctx, 'event horizon', cx, cy + rHorizon + 4);
    mono(ctx, 10, STRETCH);
    ctx.textBaseline = 'bottom';
    halo(ctx, 'torn apart here', cx, cy - Math.max(rTidal, rHorizon) - 4);

    // The verdict and the crossover, which is the point of the whole panel.
    const good = f.disruptsOutside;
    mono(ctx, 14, good ? STRETCH : MUTED);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    halo(ctx, good ? 'SHREDDED IN THE OPEN' : 'SWALLOWED WHOLE', cx, H - 62);
    mono(ctx, 10, MUTED);
    halo(
      ctx,
      fits(
        ctx,
        w,
        `tidal radius is ${timesLabel(f.ratio)} the horizon`,
        `${timesLabel(f.ratio)} the horizon`
      ),
      cx,
      H - 44
    );
    halo(
      ctx,
      fits(
        ctx,
        w,
        `the two meet at about ${(f.crossover / 1e6).toFixed(0)} million solar masses`,
        `they meet at ${(f.crossover / 1e6).toFixed(0)} million M☉`
      ),
      cx,
      H - 26
    );
    mono(ctx, 9, MUTED);
    halo(ctx, 'Newtonian estimate, not a hydrodynamic model.', cx, H - 8);
  },
};

/** Every instrument the tides lesson uses. */
export const TIDAL_WIDGETS = [
  VECTORS,
  STRENGTH,
  COMPARE,
  BALANCE,
  ROCHE,
  DISRUPT,
];

export {
  MOON_TIDE,
  RUBBLE_RADIUS_M,
  BODY_RADIUS_M,
  VECTORS,
  STRENGTH,
  COMPARE,
  BALANCE,
  ROCHE,
  DISRUPT,
};
