// =============================================================================
// Black hole widgets: the instruments for "Black Holes by the Numbers"
// -----------------------------------------------------------------------------
// The lesson is for non-science majors, so every panel here is built to be
// looked at and read off rather than solved. Not one of them asks for algebra.
//
// All of the physics comes from blackHolePhysics.js, which is also what the
// object inspector reads. A lesson that quietly disagreed with the inspector
// about the size of the same black hole would teach a student to distrust both.
//
// Two problems recur and are solved the same way throughout:
//
//   Scale. Black holes span ten orders of magnitude in mass and radius. A panel
//   never silently rescales: either the pixels-per-kilometre is held fixed
//   across the whole slider range so a change in size is a change you can see,
//   or the panel says out loud what scale it is drawn at.
//
//   Orders of magnitude. A student who has never read a log axis is told, on
//   the panel itself, that the bar length counts the zeros. That framing is
//   used for density, temperature and lifetime alike, so it only has to be
//   learned once.
// =============================================================================

import { withUnit } from './format.js';
import { surface, responsiveHeight, MONO } from './widgetCanvas.js';
import {
  blackHoleFacts,
  newtonianEscapeSpeed,
  SOLAR_MASS_KG,
  SOLAR_RADIUS_M,
  EARTH_RADIUS_M,
  AU_M,
  C_SI,
  AGE_OF_UNIVERSE_YEARS,
  CMB_TEMPERATURE_K,
  sci,
  commas,
  massLabel,
  lengthLabel,
  yearsLabel,
  densityLabel,
  timesLabel,
  superscript,
} from './blackHolePhysics.js';

// A fixed dark palette rather than the theme's. These are pictures of space
// with black discs in them, and theme-colored ink over them was unreadable in
// the Daylight theme.
const SKY = '#080b14';
const SKY_INK = '#e9edf7';
const SKY_MUTED = '#9aa3b5';
const SKY_GRID = '#232a3a';
const HOT = '#ffb057';
const COOL = '#8fd4ff';
const FALLING = '#f2748c';
const EARTH_BLUE = '#5fa8ff';
const SUN_YELLOW = '#ffd97d';

/** Ground the panel in a dark sky, whatever theme the page is wearing. */
function sky(ctx, w, h) {
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, w, h);
}

/** Text with a dark halo, so it survives being drawn over anything. */
function halo(ctx, text, x, y) {
  ctx.save();
  ctx.strokeStyle = 'rgba(6, 9, 18, 0.92)';
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.restore();
  ctx.fillText(text, x, y);
}

/**
 * The event horizon itself: a black disc with the warm glow of infalling
 * material outside it. The disc is genuinely black, because that is the whole
 * point of the thing being drawn.
 */
function drawHole(ctx, cx, cy, r, maxGlow = Infinity) {
  // The glow is capped rather than clipped: a radial gradient cut off by the
  // edge of the canvas leaves a straight line across the picture, which reads
  // as a rendering bug rather than as light.
  const outer = Math.max(r * 1.08, Math.min(r * 1.9, maxGlow));
  const glow = ctx.createRadialGradient(cx, cy, r, cx, cy, outer);
  glow.addColorStop(0, 'rgba(255, 176, 87, 0.55)');
  glow.addColorStop(0.35, 'rgba(255, 130, 60, 0.22)');
  glow.addColorStop(1, 'rgba(255, 130, 60, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = HOT;
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

/**
 * A value written at the end of a bar, moved inside the bar when there is not
 * enough room to the right of it. Every bar panel here uses this, which is why
 * none of them can push a number off the edge of the canvas.
 */
function barValue(ctx, text, barEnd, right, y, color, inside = SKY) {
  const width = ctx.measureText(text).width;
  if (barEnd + 8 + width <= right) {
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(text, barEnd + 8, y);
  } else {
    // No room to the right, so it goes inside the bar. A dark ink on the
    // bar's own color reads as a label; a haloed light one reads as a smudge.
    ctx.fillStyle = inside;
    ctx.textAlign = 'right';
    ctx.fillText(text, Math.min(barEnd, right) - 7, y);
  }
  ctx.textAlign = 'left';
}

/** A rounded bar, the shape used by every gauge and every comparison row. */
function bar(ctx, x, y, w, h, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(h, w), h, h / 2);
  ctx.fill();
  ctx.restore();
}

/** A round number near the target, for scale bars: 1, 2, 5, 10, 20, 50, ... */
function niceLength(target) {
  const mag = 10 ** Math.floor(Math.log10(target));
  const n = target / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

/**
 * A labeled scale bar. Every panel that draws at its own zoom level carries
 * one, because a picture of a black hole with no scale on it is a picture of
 * a circle.
 */
function scaleBar(ctx, x, y, maxPx, metersPerPx) {
  const target = maxPx * metersPerPx;
  // The unit is chosen before the rounding. Round a number of meters and then
  // convert, and the bar ends up labelled "0.224 AU", which reads as an
  // accident rather than as a scale.
  const unit =
    target >= 0.02 * AU_M ? { m: AU_M, name: 'AU' } : { m: 1000, name: 'km' };
  const value = niceLength(target / unit.m);
  const meters = value * unit.m;
  const px = meters / metersPerPx;
  const text = `${value >= 1 ? commas(Math.round(value)) : Number(value.toPrecision(2))} ${unit.name}`;
  ctx.strokeStyle = SKY_MUTED;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y + 4);
  ctx.moveTo(x, y);
  ctx.lineTo(x + px, y);
  ctx.moveTo(x + px, y - 4);
  ctx.lineTo(x + px, y + 4);
  ctx.stroke();
  ctx.fillStyle = SKY_MUTED;
  ctx.font = `10px ${MONO}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x + px + 7, y - 5);
}

// =============================================================================
// 1. The event horizon, at a scale that does not move
// =============================================================================

const REFERENCE_LENGTHS = [
  { label: 'across the event horizon', m: null, color: HOT },
  { label: 'a marathon', m: 42195, color: SKY_MUTED },
  { label: 'Manhattan, end to end', m: 21600, color: SKY_MUTED },
];

const HORIZON = {
  id: 'bh-horizon',
  title: 'One black hole, drawn to scale',
  note: 'Everything on this panel is drawn at the same scale, and the scale does not change when you move the slider. A bigger picture really is a bigger black hole.',
  controls: [
    {
      id: 'mass',
      label: 'Mass of the black hole',
      unit: 'M☉',
      min: 2,
      max: 25,
      step: 1,
      value: 5,
      decimals: 0,
    },
  ],
  readout(v, _ctx, spec = {}) {
    const f = blackHoleFacts(v.mass);
    const want = spec.rows || ['mass', 'radius', 'across'];
    const rows = [];
    if (want.includes('mass')) {
      rows.push({ label: 'Mass', value: massLabel(f.massInSuns) });
    }
    if (want.includes('radius')) {
      rows.push({
        label: 'Schwarzschild radius, Rₛ',
        value: withUnit(f.rsKm.toFixed(1), 'km'),
        emphasis: true,
      });
    }
    if (want.includes('across')) {
      rows.push({
        label: 'Right across the event horizon',
        value: withUnit((2 * f.rsKm).toFixed(1), 'km'),
      });
    }
    if (want.includes('compare')) {
      rows.push({
        label: 'Compared with the length of Manhattan',
        value: withUnit((f.rsM / 21600).toFixed(1), 'times'),
      });
    }
    return rows;
  },
  draw(canvas, v, _ctx, spec = {}) {
    const H = responsiveHeight(300, 246);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);

    const f = blackHoleFacts(v.mass);
    const showCompare = spec.compare !== false;
    // The scale is set by the top of the slider's range, not by the value
    // showing. Auto-fitting each frame would keep the disc the same size on
    // screen and hide the very thing the student is being asked to notice.
    const ceiling = blackHoleFacts(spec.scaleMax ?? 25);
    const rMax = Math.round(
      Math.min(showCompare ? (H - 118) / 2 : (H - 44) / 2, 78)
    );
    const kmPerPx = ceiling.rsKm / rMax;
    const r = Math.max(2.5, f.rsKm / kmPerPx);
    const cx = w / 2;
    const cy = 12 + rMax;

    drawHole(ctx, cx, cy, r, Math.min(cy - 3, w / 2 - 3));

    // The measurement line: center to horizon, with its value on it.
    ctx.strokeStyle = COOL;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r, cy);
    ctx.stroke();
    for (const x of [cx, cx + r]) {
      ctx.beginPath();
      ctx.moveTo(x, cy - 4);
      ctx.lineTo(x, cy + 4);
      ctx.stroke();
    }
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = COOL;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    // Two characters on the line itself, which fits even when the disc is at
    // its smallest, and the number in a fixed place underneath, which is where
    // a student watching it change wants to look.
    halo(ctx, 'Rₛ', cx + r / 2, cy - 7);
    ctx.textBaseline = 'middle';
    ctx.font = `12px ${MONO}`;
    halo(ctx, `Rₛ = ${f.rsKm.toFixed(1)} km`, cx, 12 + 2 * rMax + 15);

    if (!showCompare) {
      scaleBar(ctx, 14, H - 16, Math.min(120, w / 3), kmPerPx * 1000);
      return;
    }

    const top = 12 + 2 * rMax + 27;
    const gap = 26;
    const left = 18;
    const right = w - 14;
    ctx.textBaseline = 'alphabetic';
    REFERENCE_LENGTHS.forEach((ref, i) => {
      const meters = ref.m ?? 2 * f.rsM;
      const px = Math.max(2, meters / (kmPerPx * 1000));
      const y = top + i * gap;
      const barW = Math.min(px, right - left);
      ctx.font = `10px ${MONO}`;
      ctx.fillStyle = ref.m === null ? HOT : SKY_MUTED;
      ctx.textAlign = 'left';
      ctx.fillText(`${ref.label}: ${lengthLabel(meters)}`, left, y + 9);
      bar(ctx, left, y + 13, barW, 6, ref.m === null ? HOT : SKY_GRID);
      if (ref.m !== null) {
        // A grey bar on a dark ground needs an outline to read at all.
        ctx.strokeStyle = SKY_MUTED;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(left, y + 13, barW, 6, 3);
        ctx.stroke();
      }
    });
  },
};

// =============================================================================
// 2. The mass experiment: record a few trials, watch the graph draw itself
// =============================================================================

/** Trials belong to a run of steps, not to the page: see `session` below. */
let trials = { session: null, points: [] };

const SCALING = {
  id: 'bh-scaling',
  title: 'Mass against horizon size',
  note: 'Set a mass, press Record, and the point lands on the graph. Three or four trials are plenty.',
  controls: [
    {
      id: 'mass',
      label: 'Mass of the black hole',
      unit: 'M☉',
      min: 2,
      max: 25,
      step: 1,
      value: 5,
      decimals: 0,
    },
  ],
  actions: [
    { id: 'record', label: '⊕ Record this trial' },
    { id: 'clear', label: '↺ Clear trials' },
  ],
  reset(v, { spec = {} } = {}) {
    // Moving between the steps of one experiment keeps the table; arriving
    // from anywhere else starts it empty, so a graph never opens with points
    // left over from a run the student does not remember doing.
    const session = spec.session ?? 'default';
    if (trials.session !== session) trials = { session, points: [] };
  },
  act(id, v) {
    if (id === 'clear') {
      trials.points = [];
      return;
    }
    if (id !== 'record') return;
    const f = blackHoleFacts(v.mass);
    const point = { mass: f.massInSuns, rsKm: f.rsKm };
    const at = trials.points.findIndex(p => p.mass === point.mass);
    // Recording the same mass twice is a correction, not a second data point.
    if (at >= 0) trials.points[at] = point;
    else trials.points.push(point);
    trials.points.sort((a, b) => a.mass - b.mass);
  },
  readout(v) {
    const f = blackHoleFacts(v.mass);
    const rows = trials.points.map((p, i) => ({
      label: `Trial ${i + 1}: ${massLabel(p.mass)}`,
      value: withUnit(p.rsKm.toFixed(1), 'km'),
    }));
    rows.push({
      label: 'Slider is at',
      value: `${massLabel(f.massInSuns)} → ${f.rsKm.toFixed(1)} km`,
      emphasis: true,
    });
    return rows;
  },
  draw(canvas, v, _ctx, spec = {}) {
    const H = responsiveHeight(292, 244);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);

    const top = blackHoleFacts((spec.scaleMax ?? 25) + 3);
    const xMax = top.massInSuns;
    const yMax = top.rsKm;
    const padL = 54;
    const padR = 14;
    const padT = 16;
    const padB = 40;
    const plotW = Math.max(40, w - padL - padR);
    const plotH = Math.max(40, H - padT - padB);
    const X = m => padL + (m / xMax) * plotW;
    const Y = km => padT + plotH - (km / yMax) * plotH;

    // Grid
    ctx.strokeStyle = SKY_GRID;
    ctx.lineWidth = 1;
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = SKY_MUTED;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (let km = 0; km <= yMax; km += 20) {
      const y = Y(km);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + plotW, y);
      ctx.stroke();
      ctx.fillText(String(km), padL - 7, y);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let m = 0; m <= xMax; m += 5) {
      const x = X(m);
      ctx.strokeStyle = SKY_GRID;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + plotH);
      ctx.stroke();
      ctx.fillStyle = SKY_MUTED;
      ctx.fillText(String(m), x, padT + plotH + 6);
    }

    ctx.fillStyle = SKY_INK;
    ctx.fillText('Mass of the black hole (M☉)', padL + plotW / 2, H - 15);
    ctx.save();
    ctx.translate(13, padT + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Schwarzschild radius (km)', 0, 0);
    ctx.restore();

    // The trend, once there is enough evidence on screen to draw one.
    if (trials.points.length >= 2) {
      let sxy = 0;
      let sxx = 0;
      for (const p of trials.points) {
        sxy += p.mass * p.rsKm;
        sxx += p.mass * p.mass;
      }
      const slope = sxx > 0 ? sxy / sxx : 0;
      ctx.strokeStyle = COOL;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      ctx.lineTo(X(xMax), Y(slope * xMax));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Where the slider is now, before it has been recorded.
    const live = blackHoleFacts(v.mass);
    ctx.strokeStyle = SKY_MUTED;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(X(live.massInSuns), Y(live.rsKm), 5, 0, Math.PI * 2);
    ctx.stroke();

    for (const p of trials.points) {
      ctx.fillStyle = HOT;
      ctx.beginPath();
      ctx.arc(X(p.mass), Y(p.rsKm), 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = trials.points.length ? HOT : SKY_MUTED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `10px ${MONO}`;
    ctx.fillText(
      trials.points.length
        ? `${trials.points.length} trial${trials.points.length === 1 ? '' : 's'} recorded`
        : 'no trials recorded yet',
      padL + 6,
      padT + 4
    );
  },
};

// =============================================================================
// 3. Squeeze the Sun: the escape-speed analogy, honestly labeled
// =============================================================================

const SUN_RADIUS_KM = SOLAR_RADIUS_M / 1000;
const SUN_RS_KM = blackHoleFacts(1).rsKm;

const ESCAPE = {
  id: 'bh-escape',
  title: 'Squeezing the Sun',
  note: 'The Sun keeps all of its mass. Only its size changes. The gauge is the ordinary escape speed from the surface, worked out the way you would for a planet.',
  controls: [
    {
      id: 'logr',
      label: 'Radius of the squeezed Sun',
      min: Math.log10(SUN_RS_KM),
      max: Math.log10(SUN_RADIUS_KM),
      step: 0.005,
      value: Math.log10(SUN_RADIUS_KM),
      format: v => `${commas(Math.max(1, Math.round(10 ** v)))} km`,
    },
  ],
  presets: [
    {
      label: 'The Sun today',
      values: { logr: Math.log10(SUN_RADIUS_KM) },
      note: '696,000 km across the radius. Escape speed 618 km/s, which is about two ten-thousandths of the speed of light.',
    },
    {
      label: 'Earth-sized',
      values: { logr: Math.log10(6371) },
      note: 'A whole solar mass packed into a ball the size of the Earth. This is roughly what a white dwarf is.',
    },
    {
      label: '30 km',
      values: { logr: Math.log10(30) },
      note: 'A solar mass in a ball the size of a city. This is roughly a neutron star, and light now needs about a third of its speed to get away.',
    },
    {
      label: '6 km',
      values: { logr: Math.log10(6) },
      note: 'Twice the Schwarzschild radius. The escape speed is already seven tenths of the speed of light.',
    },
    {
      label: '3 km',
      values: { logr: Math.log10(SUN_RS_KM) },
      note: 'The Schwarzschild radius of one solar mass, 2.95 km. The Newtonian escape speed here comes out at exactly the speed of light.',
    },
  ],
  compute(v) {
    const radiusM = 10 ** v.logr * 1000;
    const speed = newtonianEscapeSpeed(SOLAR_MASS_KG, radiusM);
    return {
      radiusM,
      speed,
      fraction: Math.min(1, speed / C_SI),
      multiple: radiusM / (SUN_RS_KM * 1000),
    };
  },
  readout(v) {
    const c = this.compute(v);
    return [
      { label: 'Mass, unchanged throughout', value: '1 M☉' },
      { label: 'Radius now', value: lengthLabel(c.radiusM) },
      {
        label: 'Escape speed from the surface',
        value: `${commas(Math.round(c.speed / 1000))} km/s`,
      },
      {
        label: 'As a share of the speed of light',
        value: `${(c.fraction * 100).toFixed(1)}%`,
        emphasis: true,
      },
      {
        label: 'Radius, in Schwarzschild radii',
        value: `${c.multiple < 10 ? c.multiple.toFixed(2) : commas(Math.round(c.multiple))} × Rₛ`,
      },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(304, 252);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const c = this.compute(v);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 15px ${MONO}`;
    ctx.fillStyle = c.fraction >= 0.999 ? HOT : COOL;
    ctx.fillText(
      `${(c.fraction * 100).toFixed(1)}% of the speed of light`,
      w / 2,
      17
    );

    // The object, drawn against the Sun's real size at a fixed scale. Below a
    // few thousand kilometers it stops being a shape and becomes a dot, which
    // is the honest picture and also the point being made.
    const regionTop = 34;
    const regionBottom = H - 92;
    const outline = Math.min((regionBottom - regionTop) / 2 - 12, 66);
    const cx = w / 2;
    const cy = (regionTop + regionBottom) / 2;
    const mPerPx = SOLAR_RADIUS_M / outline;

    ctx.strokeStyle = SUN_YELLOW;
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, outline, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = SUN_YELLOW;
    ctx.textBaseline = 'bottom';
    halo(ctx, "the Sun's real size", cx, cy - outline - 5);

    const rPx = c.radiusM / mPerPx;
    if (c.fraction >= 0.999) {
      drawHole(ctx, cx, cy, Math.max(2.5, rPx));
    } else {
      const glow = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        Math.max(6, rPx * 1.6)
      );
      glow.addColorStop(0, 'rgba(255, 217, 125, 0.85)');
      glow.addColorStop(1, 'rgba(255, 217, 125, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(6, rPx * 1.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = SUN_YELLOW;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(2, rPx), 0, Math.PI * 2);
      ctx.fill();
    }
    if (rPx < 3) {
      ctx.fillStyle = SKY_MUTED;
      ctx.textBaseline = 'top';
      halo(ctx, 'smaller than one dot at this scale', cx, cy + 10);
    }

    // The gauge
    const trackX = 22;
    const trackW = w - 44;
    const trackY = H - 66;
    const trackH = 18;
    ctx.fillStyle = SKY_GRID;
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackW, trackH, trackH / 2);
    ctx.fill();
    const fill = Math.max(trackH, trackW * c.fraction);
    const grad = ctx.createLinearGradient(trackX, 0, trackX + trackW, 0);
    grad.addColorStop(0, COOL);
    grad.addColorStop(1, HOT);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, fill, trackH, trackH / 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(8, 11, 20, 0.7)';
    ctx.lineWidth = 1;
    for (const frac of [0.25, 0.5, 0.75]) {
      const x = trackX + trackW * frac;
      ctx.beginPath();
      ctx.moveTo(x, trackY);
      ctx.lineTo(x, trackY + trackH);
      ctx.stroke();
    }
    // The speed of light is a wall, not a tick: it gets its own bright line.
    ctx.strokeStyle = HOT;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(trackX + trackW + 1, trackY - 5);
    ctx.lineTo(trackX + trackW + 1, trackY + trackH + 5);
    ctx.stroke();

    ctx.font = `10px ${MONO}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = SKY_MUTED;
    ctx.fillText('0', trackX, trackY + trackH + 9);
    ctx.textAlign = 'right';
    ctx.fillStyle = HOT;
    ctx.fillText(
      'the speed of light',
      trackX + trackW + 2,
      trackY + trackH + 9
    );
    ctx.textAlign = 'left';
  },
};

// =============================================================================
// 4. The density ladder
// =============================================================================

const DENSITY_LADDER = [
  { label: 'Air at sea level', value: 1.2 },
  { label: 'Water', value: 1000 },
  { label: 'A white dwarf', value: 1e9 },
  { label: 'An atomic nucleus', value: 2.3e17 },
];

const DENSITY = {
  id: 'bh-density',
  title: 'Average density, on a ladder',
  note: 'This is the black hole’s mass divided by the volume of a sphere the size of its event horizon. It is a comparison number, not a claim about what the inside is made of. Every small tick on the ladder is ten times denser than the one below it.',
  controls: [
    {
      id: 'logm',
      label: 'Mass of the black hole',
      min: 0.5,
      max: 9,
      step: 0.05,
      value: 1,
      format: v => massLabel(10 ** v),
    },
  ],
  presets: [
    { label: '10 M☉', values: { logm: 1 } },
    { label: '100 M☉', values: { logm: 2 } },
    { label: '1,000 M☉', values: { logm: 3 } },
    { label: '1,000,000 M☉', values: { logm: 6 } },
  ],
  readout(v, _ctx, spec = {}) {
    const f = blackHoleFacts(10 ** v.logm);
    const rows = [
      { label: 'Mass', value: massLabel(f.massInSuns) },
      { label: 'Horizon radius', value: lengthLabel(f.rsM) },
      {
        label: 'Average density on this scale',
        value: densityLabel(f.density),
        emphasis: true,
      },
      {
        label: 'Compared with water',
        value: `${timesLabel(f.density / 1000)} denser`,
      },
    ];
    if (spec.reference) {
      const ref = blackHoleFacts(spec.reference);
      rows.push({
        label: `For comparison, ${massLabel(ref.massInSuns)}`,
        value: densityLabel(ref.density),
      });
    }
    return rows;
  },
  draw(canvas, v) {
    const H = responsiveHeight(312, 258);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const f = blackHoleFacts(10 ** v.logm);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = SKY_MUTED;
    ctx.fillText(massLabel(f.massInSuns), w / 2, 14);
    ctx.font = `bold 14px ${MONO}`;
    ctx.fillStyle = HOT;
    ctx.fillText(densityLabel(f.density), w / 2, 33);

    const axisX = 88;
    const yTop = 54;
    const yBot = H - 16;
    const lo = 0;
    const hi = 20;
    const Y = d =>
      yBot - ((Math.min(hi, Math.max(lo, d)) - lo) / (hi - lo)) * (yBot - yTop);

    ctx.strokeStyle = SKY_GRID;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(axisX, yTop);
    ctx.lineTo(axisX, yBot);
    ctx.stroke();

    ctx.font = `10px ${MONO}`;
    for (let d = lo; d <= hi; d++) {
      const y = Y(d);
      const major = d % 4 === 0;
      ctx.strokeStyle = SKY_GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(axisX - (major ? 8 : 4), y);
      ctx.lineTo(axisX, y);
      ctx.stroke();
      if (major) {
        ctx.fillStyle = SKY_MUTED;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`10${superscript(d)}`, axisX - 11, y);
      }
    }

    // The black hole's level. The dashed run starts clear of the widest
    // benchmark label rather than at the axis, so it can never be drawn
    // straight through the words it is being compared against.
    ctx.font = `10px ${MONO}`;
    const labelRoom =
      axisX +
      13 +
      Math.max(...DENSITY_LADDER.map(m => ctx.measureText(m.label).width));
    const bhY = Y(Math.log10(f.density));
    const dashFrom = Math.min(labelRoom + 12, w - 60);
    ctx.strokeStyle = HOT;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(dashFrom, bhY);
    ctx.lineTo(w - 8, bhY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = HOT;
    ctx.beginPath();
    ctx.arc(axisX, bhY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const mark of DENSITY_LADDER) {
      const y = Y(Math.log10(mark.value));
      ctx.strokeStyle = SKY_MUTED;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(axisX, y);
      ctx.lineTo(axisX + 9, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = SKY_INK;
      halo(ctx, mark.label, axisX + 13, y);
    }

    ctx.fillStyle = HOT;
    ctx.textAlign = 'right';
    halo(ctx, 'this black hole', w - 6, bhY - 10);
  },
};

// =============================================================================
// 5. Why density falls: bar length counts the zeros
// =============================================================================

const BLOCKS = {
  id: 'bh-blocks',
  title: 'Counting the zeros',
  note: 'Start from a 10 M☉ black hole and multiply its mass. Each bar shows how many zeros that quantity gained, or lost. Radius grows in step with mass, so volume grows three times as fast, and density has to fall.',
  controls: [
    {
      id: 'zeros',
      label: 'Multiply the mass by',
      min: 1,
      max: 8,
      step: 1,
      value: 3,
      format: v => `×${commas(10 ** v)}`,
    },
  ],
  compute(v, spec = {}) {
    const base = blackHoleFacts(spec.reference ?? 10);
    const f = blackHoleFacts(base.massInSuns * 10 ** v.zeros);
    return { base, f, n: v.zeros };
  },
  readout(v, _ctx, spec = {}) {
    const { base, f, n } = this.compute(v, spec);
    return [
      { label: 'Starting black hole', value: massLabel(base.massInSuns) },
      { label: 'After multiplying', value: massLabel(f.massInSuns) },
      {
        label: 'Volume gained',
        value: `${n} + ${n} + ${n} = ${3 * n} zeros`,
        emphasis: true,
      },
      {
        label: 'So density lost',
        value: `${3 * n} − ${n} = ${2 * n} zeros`,
        emphasis: true,
      },
      { label: 'New average density', value: densityLabel(f.density) },
    ];
  },
  draw(canvas, v, _ctx, spec = {}) {
    const H = responsiveHeight(276, 236);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const { f, n } = this.compute(v, spec);

    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = SKY_MUTED;
    ctx.fillText(`10 M☉  →  ${massLabel(f.massInSuns)}`, w / 2, 15);

    const rows = [
      { label: 'Mass', zeros: n, up: true },
      { label: 'Horizon radius', zeros: n, up: true },
      { label: 'Volume inside it', zeros: 3 * n, up: true },
      { label: 'Average density', zeros: 2 * n, up: false },
    ];
    const maxZeros = 3 * n;
    const labelRight = 106;
    const trackX = 114;
    const right = w - 12;
    const trackW = right - trackX;
    const top = 34;
    const summaryY = H - 12;
    const gap = (summaryY - 18 - top) / rows.length;

    rows.forEach((row, i) => {
      const y = top + i * gap;
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = SKY_INK;
      ctx.fillText(row.label, labelRight, y + 6);

      const px = Math.max(4, (row.zeros / maxZeros) * trackW);
      ctx.strokeStyle = SKY_GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(trackX, y, trackW, 12, 6);
      ctx.stroke();
      bar(ctx, trackX, y, px, 12, row.up ? COOL : FALLING);

      ctx.font = `10px ${MONO}`;
      ctx.textBaseline = 'middle';
      barValue(
        ctx,
        `${row.up ? '×' : '÷'}${commas(10 ** row.zeros)}`,
        trackX + px,
        right,
        y + 6,
        row.up ? SKY_INK : FALLING
      );
    });

    const summary = `zeros:  mass +${n}   radius +${n}   volume +${3 * n}   density −${2 * n}`;
    ctx.font = `10px ${MONO}`;
    if (ctx.measureText(summary).width < w - 16) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = FALLING;
      ctx.fillText(summary, w / 2, summaryY);
    }
  },
};

// =============================================================================
// 6. The Hawking thermometer
// =============================================================================

const TEMPERATURE_LADDER = [
  { label: "The Sun's surface", value: 5772 },
  { label: 'The microwave background', value: CMB_TEMPERATURE_K },
  { label: 'The coldest lab experiment', value: 3.8e-11 },
];

const THERMO = {
  id: 'bh-thermo',
  title: 'How cold is it?',
  note: 'Quantum physics predicts that a black hole behaves as though it has a temperature. Every small tick on this thermometer is ten times hotter than the one below it, so a short drop on screen is an enormous drop in temperature.',
  controls: [
    {
      id: 'logm',
      label: 'Mass of the black hole',
      min: 0,
      max: 9,
      step: 0.05,
      value: 1,
      format: v => massLabel(10 ** v),
    },
  ],
  presets: [
    { label: '1 M☉', values: { logm: 0 } },
    { label: '10 M☉', values: { logm: 1 } },
    { label: '1,000 M☉', values: { logm: 3 } },
    { label: 'Sagittarius A*', values: { logm: Math.log10(4.3e6) } },
  ],
  readout(v) {
    const f = blackHoleFacts(10 ** v.logm);
    return [
      { label: 'Mass', value: massLabel(f.massInSuns) },
      {
        label: 'Hawking temperature',
        value: `${sci(f.temperature)} K`,
        emphasis: true,
      },
      {
        label: 'Colder than the microwave background by',
        value: timesLabel(f.timesColderThanCMB),
      },
      {
        label: 'The microwave background, for scale',
        value: '2.725 K',
      },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(312, 258);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const f = blackHoleFacts(10 ** v.logm);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = SKY_MUTED;
    ctx.fillText(massLabel(f.massInSuns), w / 2, 14);
    ctx.font = `bold 14px ${MONO}`;
    ctx.fillStyle = COOL;
    ctx.fillText(`${sci(f.temperature)} K`, w / 2, 33);

    const tubeX = 62;
    const tubeW = 26;
    const yTop = 54;
    const yBot = H - 16;
    const lo = -20;
    const hi = 4;
    const Y = d =>
      yBot - ((Math.min(hi, Math.max(lo, d)) - lo) / (hi - lo)) * (yBot - yTop);

    // The empty part of the tube is nearly the ground color and the filled
    // part is bright: with the two the other way round a low reading looked
    // like a full thermometer.
    ctx.fillStyle = '#10151f';
    ctx.beginPath();
    ctx.roundRect(tubeX, yTop, tubeW, yBot - yTop, tubeW / 2);
    ctx.fill();
    ctx.strokeStyle = SKY_GRID;
    ctx.lineWidth = 1;
    ctx.stroke();

    const level = Y(Math.log10(f.temperature));
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(tubeX, yTop, tubeW, yBot - yTop, tubeW / 2);
    ctx.clip();
    ctx.fillStyle = COOL;
    ctx.fillRect(tubeX, level, tubeW, yBot - level);
    ctx.restore();
    ctx.strokeStyle = COOL;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tubeX - 4, level);
    ctx.lineTo(tubeX + tubeW + 4, level);
    ctx.stroke();

    ctx.font = `10px ${MONO}`;
    for (let d = lo; d <= hi; d++) {
      const y = Y(d);
      const major = (d - hi) % 4 === 0;
      ctx.strokeStyle = SKY_GRID;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tubeX - (major ? 8 : 4), y);
      ctx.lineTo(tubeX, y);
      ctx.stroke();
      if (major) {
        ctx.fillStyle = SKY_MUTED;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`10${superscript(d)}`, tubeX - 11, y);
      }
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const mark of TEMPERATURE_LADDER) {
      const y = Y(Math.log10(mark.value));
      ctx.strokeStyle = SKY_MUTED;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tubeX + tubeW, y);
      ctx.lineTo(tubeX + tubeW + 9, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = SKY_INK;
      halo(ctx, mark.label, tubeX + tubeW + 13, y);
    }

    ctx.fillStyle = COOL;
    ctx.textAlign = 'right';
    halo(ctx, 'this black hole', w - 6, level - 10);
  },
};

// =============================================================================
// 7. The evaporation timeline
// =============================================================================

const LIFETIME = {
  id: 'bh-lifetime',
  title: 'How long will it last?',
  note: 'Each bar is as long as the number of zeros in the answer. Thirteen point eight billion years has ten zeros; a black hole’s lifetime has dozens. One extra zero means ten times longer.',
  controls: [
    {
      id: 'logm',
      label: 'Mass of the black hole',
      min: 0,
      max: 9,
      step: 0.05,
      value: 1,
      format: v => massLabel(10 ** v),
    },
  ],
  presets: [
    { label: '1 M☉', values: { logm: 0 } },
    { label: '10 M☉', values: { logm: 1 } },
    { label: '1,000 M☉', values: { logm: 3 } },
    { label: 'Sagittarius A*', values: { logm: Math.log10(4.3e6) } },
  ],
  readout(v) {
    const f = blackHoleFacts(10 ** v.logm);
    return [
      { label: 'Mass', value: massLabel(f.massInSuns) },
      {
        label: 'Evaporation lifetime',
        value: yearsLabel(f.lifetimeYears),
        emphasis: true,
      },
      {
        label: 'Zeros in that number',
        value: String(Math.round(Math.log10(f.lifetimeYears))),
      },
      {
        label: 'Ages of the universe',
        value: timesLabel(f.lifetimeInUniverseAges),
      },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(248, 208);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const f = blackHoleFacts(10 ** v.logm);

    const rows = [
      {
        label: 'Age of the universe',
        years: AGE_OF_UNIVERSE_YEARS,
        color: SKY_MUTED,
        text: '13.8 billion years',
      },
      {
        label: 'Until the last stars burn out',
        years: 1e14,
        color: SKY_MUTED,
        text: '100 trillion years',
      },
      {
        label: 'This black hole evaporates',
        years: f.lifetimeYears,
        color: HOT,
        text: yearsLabel(f.lifetimeYears),
      },
    ];

    const left = 16;
    const right = w - 14;
    const trackW = right - left;
    const maxZeros = 100;
    const top = 16;
    const axisY = H - 36;
    const gap = (axisY - 22 - top) / rows.length;

    rows.forEach((row, i) => {
      const y = top + i * gap;
      const zeros = Math.log10(row.years);
      const px = Math.max(4, (zeros / maxZeros) * trackW);
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = row.color === HOT ? HOT : SKY_INK;
      ctx.fillText(row.label, left, y);
      bar(ctx, left, y + 6, px, 12, row.color, row.color === HOT ? 1 : 0.55);
      ctx.font = `10px ${MONO}`;
      ctx.textBaseline = 'middle';
      barValue(
        ctx,
        `${row.text} (${Math.round(zeros)} zeros)`,
        left + px,
        right,
        y + 12,
        row.color === HOT ? SKY_INK : SKY_MUTED
      );
    });

    // The zero axis
    ctx.strokeStyle = SKY_GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, axisY);
    ctx.lineTo(right, axisY);
    ctx.stroke();
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = SKY_MUTED;
    ctx.textBaseline = 'top';
    for (let z = 0; z <= maxZeros; z += 25) {
      const x = left + (z / maxZeros) * trackW;
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 4);
      ctx.stroke();
      ctx.textAlign = z === 0 ? 'left' : z === maxZeros ? 'right' : 'center';
      ctx.fillText(String(z), x, axisY + 7);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = SKY_MUTED;
    ctx.fillText('number of zeros in the number of years', w / 2, axisY + 22);
  },
};

// =============================================================================
// 8. The lineup: four black holes, each at its own labeled scale
// =============================================================================

const LINEUP = [
  {
    tag: 'A',
    name: 'Black Hole A',
    real: 'A stellar-mass black hole',
    mass: 8,
    compare: {
      kind: 'bar',
      m: 21600,
      label: 'Manhattan, end to end',
      color: COOL,
    },
    note: 'about as far as the length of Manhattan',
  },
  {
    tag: 'B',
    name: 'Black Hole B',
    real: 'An intermediate-mass black hole',
    mass: 1000,
    compare: {
      kind: 'disc',
      m: EARTH_RADIUS_M,
      label: 'the Earth',
      color: EARTH_BLUE,
    },
    note: 'a little under half the radius of the Earth',
  },
  {
    tag: 'C',
    name: 'Black Hole C',
    real: 'An intermediate-mass black hole',
    mass: 150000,
    compare: {
      kind: 'disc',
      m: SOLAR_RADIUS_M,
      label: 'the Sun',
      color: SUN_YELLOW,
    },
    note: 'about two thirds of the radius of the Sun',
  },
  {
    tag: 'D',
    name: 'Black Hole D',
    real: 'Sagittarius A*, at the center of our galaxy',
    mass: 4.3e6,
    compare: {
      kind: 'ring',
      m: 0.387 * AU_M,
      label: "Mercury's orbit",
      color: SKY_MUTED,
    },
    note: 'about a fifth of the way out to Mercury',
  },
];

const LINEUP_WIDGET = {
  id: 'bh-lineup',
  title: 'Four black holes',
  note: 'Each black hole is drawn at its own scale, and the scale bar underneath tells you which. They cannot share one, because the largest is half a million times wider than the smallest.',
  controls: [
    {
      id: 'which',
      label: 'Showing',
      min: 0,
      max: 3,
      step: 1,
      value: 0,
      format: v => LINEUP[Math.round(v)]?.tag ?? '-',
    },
  ],
  readout(v, _ctx, spec = {}) {
    return LINEUP.map((hole, i) => ({
      label: `${spec.named ? hole.real : hole.name} · ${massLabel(hole.mass)}`,
      value: lengthLabel(blackHoleFacts(hole.mass).rsM),
      emphasis: i === Math.round(v.which),
    }));
  },
  draw(canvas, v, _ctx, spec = {}) {
    const H = responsiveHeight(308, 254);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const hole = LINEUP[Math.round(v.which)] ?? LINEUP[0];
    const f = blackHoleFacts(hole.mass);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 12px ${MONO}`;
    ctx.fillStyle = HOT;
    ctx.fillText(spec.named ? hole.real : hole.name, w / 2, 15);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = SKY_MUTED;
    ctx.fillText(
      `${massLabel(hole.mass)}   ·   Rₛ = ${lengthLabel(f.rsM)}`,
      w / 2,
      32
    );

    const top = 46;
    const bottom = H - 42;
    const cy = (top + bottom) / 2;
    /** How much room a glow has before it would be clipped by the cell. */
    const room = (px, py) =>
      Math.min(px, w - px, py - top + 6, bottom - py + 6);
    const availH = bottom - top - 16;
    const availW = w - 40;
    const c = hole.compare;
    let mPerPx;
    let cx = w / 2;

    if (c.kind === 'disc') {
      // Side by side, sharing one scale, with a gap between them.
      const byWidth = (2 * f.rsM + 2 * c.m) / (availW - 26);
      const byHeight = (2 * Math.max(f.rsM, c.m)) / availH;
      mPerPx = Math.max(byWidth, byHeight);
      const rHole = f.rsM / mPerPx;
      const rComp = c.m / mPerPx;
      const totalW = 2 * rHole + 26 + 2 * rComp;
      const startX = (w - totalW) / 2;
      cx = startX + rHole;
      const compX = startX + 2 * rHole + 26 + rComp;

      ctx.strokeStyle = c.color;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(compX, cy, rComp, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = c.color;
      ctx.fill();
      ctx.globalAlpha = 1;

      drawHole(ctx, cx, cy, rHole, room(cx, cy));

      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = c.color;
      halo(ctx, c.label, compX, cy + rComp + 7);
      ctx.fillStyle = HOT;
      halo(ctx, 'the horizon', cx, cy + rHole + 7);
    } else if (c.kind === 'ring') {
      mPerPx = (2 * c.m) / Math.min(availW, availH);
      const rHole = f.rsM / mPerPx;
      const rComp = c.m / mPerPx;
      ctx.strokeStyle = c.color;
      ctx.globalAlpha = 0.75;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(cx, cy, rComp, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      drawHole(ctx, cx, cy, rHole, room(cx, cy));
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = SKY_MUTED;
      halo(ctx, c.label, cx, cy + rComp + 7);
    } else {
      // A length, not a shape: the horizon disc with a ruler under it.
      // The ruler and its caption live under the disc, so the disc gets the
      // height that is left after they have taken theirs.
      mPerPx = Math.max(
        (2 * f.rsM) / availW,
        (2 * f.rsM) / (availH - 46),
        c.m / availW
      );
      const rHole = f.rsM / mPerPx;
      const discCy = top + 8 + rHole;
      drawHole(ctx, cx, discCy, rHole, room(cx, discCy));
      const px = c.m / mPerPx;
      const y = discCy + rHole + 16;
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx - px / 2, y);
      ctx.lineTo(cx + px / 2, y);
      ctx.moveTo(cx - px / 2, y - 4);
      ctx.lineTo(cx - px / 2, y + 4);
      ctx.moveTo(cx + px / 2, y - 4);
      ctx.lineTo(cx + px / 2, y + 4);
      ctx.stroke();
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = c.color;
      halo(ctx, c.label, cx, y + 6);
    }

    scaleBar(ctx, 16, H - 20, Math.min(110, w / 3.2), mPerPx);
  },
};

export const BLACK_HOLE_WIDGETS = [
  HORIZON,
  SCALING,
  ESCAPE,
  DENSITY,
  BLOCKS,
  THERMO,
  LIFETIME,
  LINEUP_WIDGET,
];

/** Test seam: the trial table the scaling experiment is holding. */
export const recordedTrials = () => trials.points.map(p => ({ ...p }));
/** Test seam: throw the trial table away. */
export const clearTrials = () => {
  trials = { session: null, points: [] };
};
