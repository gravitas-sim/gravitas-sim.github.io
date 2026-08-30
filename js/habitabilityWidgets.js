// =============================================================================
// Habitability widgets: the instruments for "The Goldilocks Question"
// -----------------------------------------------------------------------------
// Every number these draw comes from js/habitability.js, which is also what the
// simulation's own habitable-zone ring reads. A lesson instrument that computed
// its own zone would eventually disagree with the ring beside it.
//
// The orbits here are analytic rather than integrated, for the same reason the
// binary-star instruments are: a student reading insolation off a planet at
// periapsis needs the number to be exactly right and exactly repeatable. The
// eccentric orbit solves Kepler's equation, so the planet dawdles through its
// cold outer year and hurries through its hot periapsis, which is the whole
// point of that section.
//
// Accessibility note: habitable-zone status is never carried by color alone.
// Every band is labelled, the two edges use different dash patterns as well as
// different colors, and the readout says in words where a planet sits.
// =============================================================================

import { withUnit } from './format.js';
import { surface, responsiveHeight, MONO } from './widgetCanvas.js';
import {
  relativeInsolation,
  insolationWm2,
  habitableZoneBounds,
  habitableZoneStatus,
  orbitalStateAt,
  orbitExtremes,
  fractionOfYearInZone,
  EARTH_INSOLATION_WM2,
} from './habitability.js';
import { TRAPPIST1_STAR, TRAPPIST1_PLANETS } from './data/trappist1.js';

// A fixed dark palette rather than the theme's: these are pictures of space
// with bright stars in them, and theme-colored ink over them is unreadable in
// the Daylight theme.
const SKY = '#080b14';
const INK = '#e9edf7';
const MUTED = '#9aa3b5';
const GRID = '#232a3a';
const HOT = '#ff9a5c';
const COLD = '#7cc4ff';
const ZONE = '#5fd0a0';
const PLANET = '#8fd4ff';
const EARTHY = '#6ec6ff';

/** Ground the panel in a dark sky whatever theme the page is wearing. */
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

/** A star with a glow, sized and colored for its type. */
function drawStar(ctx, x, y, r, color) {
  const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3.2);
  glow.addColorStop(0, `${color}88`);
  glow.addColorStop(1, `${color}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Approximate display color for a star of a given effective temperature. */
function starColor(teffK) {
  if (teffK < 3200) return '#ff7043';
  if (teffK < 4200) return '#ffa451';
  if (teffK < 5300) return '#ffcf7a';
  if (teffK < 6200) return '#fff2c4';
  if (teffK < 7500) return '#f2f6ff';
  return '#cfe0ff';
}

/** Insolation written the way the lesson says it: Earth units first. */
const earthUnits = s =>
  !Number.isFinite(s)
    ? '-'
    : s >= 100
      ? `${Math.round(s)} Earths`
      : s >= 10
        ? withUnit(s.toFixed(1), 'Earths')
        : withUnit(s.toFixed(2), 'Earths');

const wm2 = s =>
  `${Math.round(insolationWm2(1, 1) * 0 + s * EARTH_INSOLATION_WM2)} W/m²`;

// =============================================================================
// 1. Insolation against distance: the inverse-square law
// =============================================================================

const INSOLATION = {
  id: 'hz-insolation',
  title: 'How much starlight reaches the planet?',
  note: 'The star never changes. Only the planet moves. Everything is measured against what Earth receives from the Sun, which is one Earth unit.',
  controls: [
    {
      id: 'distance',
      label: 'Distance from the star',
      unit: 'AU',
      min: 0.3,
      max: 3,
      step: 0.05,
      value: 1,
      decimals: 2,
    },
  ],
  presets: [
    {
      label: '0.5 AU',
      values: { distance: 0.5 },
      note: 'Half of Earth’s distance.',
    },
    {
      label: '1 AU',
      values: { distance: 1 },
      note: 'Earth’s distance from the Sun.',
    },
    { label: '2 AU', values: { distance: 2 }, note: 'Twice Earth’s distance.' },
    {
      label: '3 AU',
      values: { distance: 3 },
      note: 'Three times Earth’s distance.',
    },
  ],
  compute(v) {
    const insolation = relativeInsolation(1, v.distance);
    return { distanceAU: v.distance, insolation };
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        label: 'Distance from the star',
        value: withUnit(c.distanceAU.toFixed(2), 'AU'),
      },
      {
        label: 'Starlight reaching each square meter',
        value: earthUnits(c.insolation),
        emphasis: true,
      },
      { label: 'The same thing in physical units', value: wm2(c.insolation) },
      { label: 'Earth, for comparison', value: '1.00 Earths at 1 AU' },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(304, 252);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const c = this.compute(v);

    const left = 40;
    const right = w - 24;
    const track = right - left;
    const maxAU = 3;
    const X = au => left + (au / maxAU) * track;

    // Three bands, each with its own job and none overlapping the next. The
    // fractions reproduce the original fixed layout at the full height of 304
    // and keep every band in proportion below it: a measurement screen stacks
    // this instrument above its plot and hands it about 190px, where hard-coded
    // offsets put the bar off the bottom of the canvas entirely.
    const cy = Math.round(0.23 * H);
    const skyBottom = Math.round(0.41 * H);
    const axisY = Math.round(0.47 * H);
    const barTop = Math.round(0.645 * H);
    const barH = Math.max(22, H - barTop - 34);

    // The star, and rays fanning out from it. The rays are the explanation:
    // the same light, spread over more area the further out it goes. Clipped
    // to the top band so they cannot run through the axis or the bar.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, skyBottom);
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 240, 190, 0.28)';
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const a = (i / 4) * 0.42;
      ctx.beginPath();
      ctx.moveTo(left, cy);
      ctx.lineTo(right, cy + Math.tan(a) * track);
      ctx.stroke();
    }
    drawStar(ctx, left, cy, 11, '#fff2c4');
    ctx.restore();

    // The planet, on the axis of the fan, at its distance.
    const px = X(c.distanceAU);
    ctx.fillStyle = EARTHY;
    ctx.beginPath();
    ctx.arc(px, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = EARTHY;
    halo(ctx, withUnit(c.distanceAU.toFixed(2), 'AU'), px, cy - 12);

    // The distance scale
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, axisY);
    ctx.lineTo(right, axisY);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.textBaseline = 'top';
    for (let au = 0; au <= maxAU; au += 0.5) {
      const x = X(au);
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + (au % 1 === 0 ? 5 : 3));
      ctx.stroke();
      if (au % 1 === 0) ctx.fillText(`${au}`, x, axisY + 8);
    }
    ctx.fillText('distance from the star (AU)', (left + right) / 2, axisY + 24);

    // A bar for the incoming energy, on a scale where Earth sits a quarter of
    // the way along, so quadrupling at half the distance still fits.
    const scaleMax = 4.2;
    const frac = Math.min(1, c.insolation / scaleMax);
    ctx.fillStyle = GRID;
    ctx.beginPath();
    ctx.roundRect(left, barTop, track, barH, 6);
    ctx.fill();
    const grad = ctx.createLinearGradient(left, 0, right, 0);
    grad.addColorStop(0, COLD);
    grad.addColorStop(1, HOT);
    ctx.fillStyle = grad;
    // The bar has to be free to shrink towards nothing: this used to be
    // floored at the bar's own height, so everything past about 1.4 AU drew
    // the same stub and the falloff the whole screen is about was invisible.
    // The corner radius shrinks with it rather than forcing a minimum width.
    const barW = Math.max(0, track * frac);
    const radius = Math.min(6, barW / 2);
    if (barW > 0.5) {
      ctx.beginPath();
      ctx.roundRect(left, barTop, barW, barH, radius);
      ctx.fill();
    }
    const barEnd = left + barW;

    // Earth's level, marked, so the bar means something without a legend.
    const ex = left + track * (1 / scaleMax);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(ex, barTop - 5);
    ctx.lineTo(ex, barTop + barH + 5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    halo(ctx, 'what Earth gets', ex + 5, barTop + barH + 8);

    // The value, inside the bar when it fits and beside it when it does not.
    ctx.font = `bold 13px ${MONO}`;
    ctx.textBaseline = 'middle';
    const label = earthUnits(c.insolation);
    const lw = ctx.measureText(label).width;
    if (lw + 20 < barW) {
      ctx.fillStyle = SKY;
      ctx.textAlign = 'right';
      ctx.fillText(label, barEnd - 9, barTop + barH / 2);
    } else {
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      halo(ctx, label, barEnd + 9, barTop + barH / 2);
    }
  },
};

// =============================================================================
// 1b. Why it fades: the same light over a bigger shell
// =============================================================================

const SPREADING = {
  id: 'hz-spreading',
  title: 'The same light, spread further',
  note: 'The star is not running out of light. Watch the patch of light and the shell it lands on as the distance grows.',
  controls: [
    {
      id: 'shell',
      label: 'Distance from the star',
      unit: 'AU',
      min: 1,
      max: 4,
      step: 1,
      value: 1,
      decimals: 0,
    },
  ],
  compute(v) {
    const d = Math.round(v.shell);
    return {
      d,
      area: d * d,
      insolation: 1 / (d * d),
    };
  },
  readout(v) {
    const c = this.compute(v);
    // At 1 AU every line would read "1", which looks like a broken instrument
    // rather than the reference case it is.
    if (c.d === 1) {
      return [
        { label: 'Distance from the star', value: '1 AU' },
        { label: 'The shell', value: 'the reference, where Earth sits' },
        {
          label: 'So each square meter gets',
          value: '1.00 Earths, by definition',
          emphasis: true,
        },
        { label: 'Total energy crossing the shell', value: 'the same, always' },
      ];
    }
    return [
      { label: 'Distance from the star', value: withUnit(c.d, 'AU') },
      {
        label: 'The shell is this many times bigger',
        value: `${c.d} \u00d7 ${c.d} = ${c.area}\u00d7`,
      },
      {
        label: 'So each square meter gets',
        value: `1 / ${c.area} = ${c.insolation.toFixed(c.d > 2 ? 3 : 2)} Earths`,
        emphasis: true,
      },
      { label: 'Total energy crossing the shell', value: 'the same, always' },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(300, 250);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const c = this.compute(v);

    const cx = 34;
    const cy = H / 2 - 16;
    const maxD = 4;
    // The shells are arcs, so their vertical reach is r*sin(halfAngle). The
    // outermost one has to fit between the top of the panel and the two lines
    // of arithmetic underneath, or it is drawn off the edge.
    const arc = 0.38;
    const maxR = Math.min(
      w - 74,
      (cy - 12) / Math.sin(arc),
      (H - 48 - cy) / Math.sin(arc)
    );
    const rFor = d => 20 + (d / maxD) * (maxR - 20);

    // Every shell the light will cross, faintly, with the current one lit.
    for (let d = 1; d <= maxD; d++) {
      const r = rFor(d);
      const on = d === c.d;
      ctx.strokeStyle = on ? ZONE : GRID;
      ctx.lineWidth = on ? 1.8 : 1;
      ctx.setLineDash(on ? [] : [3, 5]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, -arc, arc);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `10px ${MONO}`;
      ctx.fillStyle = on ? ZONE : MUTED;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const ly = cy + Math.sin(arc) * r + 6;
      if (ly < H - 46) halo(ctx, `${d} AU`, cx + Math.cos(arc) * r, ly);
    }

    // One cone of light, fixed in angle. What changes is the patch it lands on.
    const half = 0.085;
    ctx.fillStyle = 'rgba(255, 240, 190, 0.18)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, rFor(c.d), -half, half);
    ctx.closePath();
    ctx.fill();

    // The patch itself, drawn as a bar whose length is the arc it covers. That
    // length grows with distance; the total light in it does not.
    const r = rFor(c.d);
    ctx.strokeStyle = HOT;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, -half, half);
    ctx.stroke();
    ctx.lineCap = 'butt';

    drawStar(ctx, cx, cy, 10, '#fff2c4');

    // The arithmetic, spelled out under the picture.
    ctx.font = `11px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = INK;
    halo(
      ctx,
      c.d === 1
        ? 'at 1 AU this is the patch Earth gets'
        : `at ${c.d} AU the same light covers ${c.area}x the area`,
      w / 2,
      H - 26
    );
    ctx.font = `bold 12px ${MONO}`;
    ctx.fillStyle = HOT;
    halo(
      ctx,
      c.d === 1
        ? 'move out and watch it stretch'
        : `so each square meter gets 1/${c.area}`,
      w / 2,
      H - 8
    );
  },
};

// =============================================================================
// 2. Change the star
// =============================================================================

/** A handful of main-sequence stars a student can name. */
const STARS = [
  {
    key: 'red',
    name: 'A dim red dwarf',
    L: 0.0015,
    teff: 3000,
    note: 'Like Proxima Centauri, the nearest star to the Sun.',
  },
  {
    key: 'orange',
    name: 'An orange dwarf',
    L: 0.34,
    teff: 5200,
    note: 'Like Alpha Centauri B.',
  },
  {
    key: 'sun',
    name: 'The Sun',
    L: 1,
    teff: 5772,
    note: 'The star we know best.',
  },
  {
    key: 'bright',
    name: 'A hotter, brighter star',
    L: 5.1,
    teff: 6600,
    note: 'Like Procyon A.',
  },
];

const STAR_WIDGET = {
  id: 'hz-star',
  title: 'The same planet, a different star',
  note: 'The planet stays where you put it. Only the star changes. Watch both the incoming energy and, once it is shown, the band of distances where liquid water could be possible.',
  controls: [
    {
      id: 'star',
      label: 'Star',
      min: 0,
      max: 3,
      step: 1,
      value: 2,
      format: v => STARS[Math.round(v)]?.name ?? '-',
    },
    {
      id: 'distance',
      label: 'Planet’s distance',
      unit: 'AU',
      min: 0.02,
      max: 3,
      step: 0.02,
      value: 1,
      decimals: 2,
    },
  ],
  compute(v, spec = {}) {
    const star = STARS[Math.round(v.star)] ?? STARS[2];
    const props = { luminositySolar: star.L, teffK: star.teff };
    const bounds = habitableZoneBounds(props, spec.model ?? 'conservative');
    const insolation = relativeInsolation(star.L, v.distance);
    return {
      star,
      bounds,
      insolation,
      status: habitableZoneStatus(v.distance, bounds),
    };
  },
  readout(v, ctx2, spec = {}) {
    const c = this.compute(v, spec);
    const rows = [
      { label: 'Star', value: c.star.name },
      { label: 'Its luminosity', value: `${formatL(c.star.L)} Suns` },
      {
        label: 'Planet’s distance',
        value: withUnit(v.distance.toFixed(2), 'AU'),
      },
      {
        label: 'Starlight the planet receives',
        value: earthUnits(c.insolation),
        emphasis: true,
      },
    ];
    if (spec.showZone) {
      rows.push({
        label: 'Habitable zone runs from',
        value: `${fmtAU(c.bounds.innerAU)} to ${fmtAU(c.bounds.outerAU)} AU`,
      });
      rows.push({
        label: 'This planet is',
        value: c.status.label,
        emphasis: true,
      });
    }
    return rows;
  },
  draw(canvas, v, ctx2, spec = {}) {
    const H = responsiveHeight(300, 250);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const c = this.compute(v, spec);

    // The axis spans whichever is larger: the planet, or the whole zone.
    const maxAU = Math.max(
      v.distance * 1.15,
      spec.showZone ? c.bounds.outerAU * 1.25 : 0,
      0.05
    );
    const left = 40;
    const right = w - 24;
    const track = right - left;
    const X = au => left + (au / maxAU) * track;
    const cy = 118;

    if (spec.showZone && Number.isFinite(c.bounds.outerAU)) {
      const x0 = X(c.bounds.innerAU);
      const x1 = X(c.bounds.outerAU);
      ctx.fillStyle = 'rgba(95, 208, 160, 0.16)';
      ctx.fillRect(x0, 46, Math.max(1, x1 - x0), 132);
      // Edges: different dash patterns as well as different colors.
      ctx.lineWidth = 1.6;
      ctx.setLineDash([7, 4]);
      ctx.strokeStyle = HOT;
      ctx.beginPath();
      ctx.moveTo(x0, 46);
      ctx.lineTo(x0, 178);
      ctx.stroke();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = COLD;
      ctx.beginPath();
      ctx.moveTo(x1, 46);
      ctx.lineTo(x1, 178);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = `10px ${MONO}`;
      ctx.fillStyle = ZONE;
      ctx.textBaseline = 'top';
      // Inside the band when it fits, beside it when the star is faint enough
      // that the whole zone is only a few pixels wide.
      const zoneText = 'habitable zone';
      const zw = ctx.measureText(zoneText).width;
      if (x1 - x0 >= zw + 10) {
        ctx.textAlign = 'center';
        halo(ctx, zoneText, (x0 + x1) / 2, 52);
      } else if (x1 + 6 + zw < right) {
        ctx.textAlign = 'left';
        halo(ctx, zoneText, x1 + 6, 52);
      } else {
        ctx.textAlign = 'right';
        halo(ctx, zoneText, x0 - 6, 52);
      }
      // The two sides, clamped so a zone near either end of the axis cannot
      // push its caption off the panel.
      ctx.fillStyle = HOT;
      ctx.textAlign = 'left';
      halo(ctx, 'too much light', left + 2, 182);
      ctx.fillStyle = COLD;
      ctx.textAlign = 'right';
      halo(ctx, 'too little light', right - 2, 182);
    }

    drawStar(ctx, left, cy, 10, starColor(c.star.teff));
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    halo(ctx, c.star.name, left - 4, 34);

    const px = X(v.distance);
    ctx.fillStyle = EARTHY;
    ctx.beginPath();
    ctx.arc(px, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = EARTHY;
    halo(ctx, withUnit(v.distance.toFixed(2), 'AU'), px, cy - 12);
    // The insolation is captioned at the top rather than under the planet: a
    // planet sitting on a zone edge would otherwise print its value on top of
    // the edge's own label.
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.font = `bold 12px ${MONO}`;
    halo(ctx, `${earthUnits(c.insolation)} of starlight`, w - 8, 34);
    ctx.font = `10px ${MONO}`;

    // Distance scale
    const axisY = 202;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, axisY);
    ctx.lineTo(right, axisY);
    ctx.stroke();
    const step = niceStep(maxAU);
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `10px ${MONO}`;
    // A label is only drawn when there is room for it. The axis span changes
    // by two orders of magnitude between a red dwarf and a bright star, so a
    // fixed tick count crushes the labels together at one end.
    let lastLabelX = -Infinity;
    for (let au = 0; au <= maxAU + 1e-9; au += step) {
      const x = X(au);
      if (x > right) break;
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 4);
      ctx.stroke();
      const text = axisLabel(au, step);
      if (x - lastLabelX >= ctx.measureText(text).width + 12) {
        ctx.fillText(text, x, axisY + 7);
        lastLabelX = x;
      }
    }
    ctx.fillText('distance from the star (AU)', (left + right) / 2, axisY + 24);
  },
};

const formatL = L =>
  L >= 1
    ? String(Number(L.toPrecision(3)))
    : L.toPrecision(2).replace(/0+$/, '');
const fmtAU = au =>
  !Number.isFinite(au)
    ? '-'
    : au >= 1
      ? au.toFixed(2)
      : au >= 0.1
        ? au.toFixed(3)
        : au.toFixed(4);
/** A tick spacing that gives four to six labelled marks. */
function niceStep(span) {
  const raw = span / 4.5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

/** A tick written to the precision its spacing needs, and no further. */
function axisLabel(au, step) {
  if (au === 0) return '0';
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)));
  return au.toFixed(decimals);
}

// =============================================================================
// 3. The two edges, and the two models
// =============================================================================

const BOUNDARIES_WIDGET = {
  id: 'hz-boundaries',
  title: 'Where the edges come from',
  note: 'Two published definitions of the same zone. They differ in what atmospheric conditions they are willing to assume, not in how optimistic anyone feels.',
  controls: [
    {
      id: 'model',
      label: 'Definition',
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      format: v => (v >= 0.5 ? 'Optimistic' : 'Conservative'),
    },
  ],
  presets: [
    {
      label: 'Conservative',
      values: { model: 0 },
      note: 'From a climate model: the inner edge is where a water-rich planet would lose its oceans to space, and the outer edge is the most a carbon-dioxide atmosphere can warm a surface.',
    },
    {
      label: 'Optimistic',
      values: { model: 1 },
      note: 'From the Solar System’s own history: Venus has had no surface water for about a billion years, and Mars appears to have had some early on. Those two facts bracket a wider zone.',
    },
  ],
  compute(v) {
    const model = v.model >= 0.5 ? 'optimistic' : 'conservative';
    const sun = { luminositySolar: 1, teffK: 5772 };
    return {
      model,
      bounds: habitableZoneBounds(sun, model),
      other: habitableZoneBounds(
        sun,
        model === 'optimistic' ? 'conservative' : 'optimistic'
      ),
    };
  },
  readout(v) {
    const c = this.compute(v);
    return [
      {
        label: 'Definition shown',
        value: c.model === 'optimistic' ? 'Optimistic' : 'Conservative',
      },
      {
        label: 'Inner edge',
        value: `${fmtAU(c.bounds.innerAU)} AU · ${c.bounds.innerLabel}`,
      },
      {
        label: 'Outer edge',
        value: `${fmtAU(c.bounds.outerAU)} AU · ${c.bounds.outerLabel}`,
      },
      {
        label: 'Width of the zone',
        value: `${fmtAU(c.bounds.outerAU - c.bounds.innerAU)} AU`,
        emphasis: true,
      },
      { label: 'Earth sits at', value: '1.00 AU' },
    ];
  },
  draw(canvas, v) {
    const H = responsiveHeight(292, 244);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const c = this.compute(v);

    const left = 34;
    const right = w - 24;
    const track = right - left;
    const maxAU = 2.0;
    const X = au => left + (au / maxAU) * track;
    const cy = 108;

    // Both zones are drawn: the one selected in full, the other as an outline,
    // so switching shows what actually changed rather than redrawing a blob.
    const drawBand = (b, y, h, fill, alpha, label) => {
      const x0 = X(b.innerAU);
      const x1 = X(b.outerAU);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.fillRect(x0, y, x1 - x0, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = fill;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(x0, y, x1 - x0, h);
      ctx.setLineDash([]);
      ctx.font = `10px ${MONO}`;
      ctx.fillStyle = fill;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      halo(ctx, label, (x0 + x1) / 2, y + h / 2);
    };

    const opt = c.model === 'optimistic' ? c.bounds : c.other;
    const con = c.model === 'optimistic' ? c.other : c.bounds;
    drawBand(
      opt,
      44,
      26,
      ZONE,
      c.model === 'optimistic' ? 0.28 : 0.08,
      'optimistic'
    );
    drawBand(
      con,
      76,
      26,
      ZONE,
      c.model === 'conservative' ? 0.28 : 0.08,
      'conservative'
    );

    // The Sun and Earth, for scale.
    drawStar(ctx, left, cy + 44, 9, '#fff2c4');
    const ex = X(1);
    ctx.fillStyle = EARTHY;
    ctx.beginPath();
    ctx.arc(ex, cy + 44, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = EARTHY;
    // Offset to the right: Earth at 1 AU sits within a couple of pixels of the
    // conservative inner edge, and a centred label lands on that line.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    halo(ctx, 'Earth', ex + 9, cy + 44);

    // Named edges of the selected model, on leader lines so the labels sit
    // clear of the bands rather than on top of them.
    const b = c.bounds;
    const edges = [
      { au: b.innerAU, name: b.innerLabel, color: HOT, align: 'right' },
      { au: b.outerAU, name: b.outerLabel, color: COLD, align: 'left' },
    ];
    const edgeY = cy + 74;
    for (const e of edges) {
      const x = X(e.au);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 1.4;
      ctx.setLineDash(e.color === HOT ? [7, 4] : [2, 4]);
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, edgeY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `10px ${MONO}`;
      ctx.fillStyle = e.color;
      ctx.textAlign = e.align;
      ctx.textBaseline = 'top';
      halo(
        ctx,
        `${e.name}  ${fmtAU(e.au)} AU`,
        e.align === 'right' ? x - 5 : x + 5,
        edgeY + 4
      );
    }

    // Distance scale
    const axisY = H - 26;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, axisY);
    ctx.lineTo(right, axisY);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `10px ${MONO}`;
    for (let au = 0; au <= maxAU + 1e-9; au += 0.5) {
      const x = X(au);
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 4);
      ctx.stroke();
      ctx.fillText(au.toFixed(1), x, axisY + 7);
    }
  },
};

// =============================================================================
// 4. An eccentric orbit, in real Keplerian time
// =============================================================================

/** Orbits per second of watching. */
const ORBITS_PER_SECOND = 0.11;
let orbitState = { key: '', phase: 0, running: true, trail: [] };

const ORBIT = {
  id: 'hz-orbit',
  title: 'A year on an eccentric orbit',
  note: 'The planet is not moving at a constant speed. It races through the part of its year closest to the star and takes far longer over the cold outer half, exactly as Kepler’s second law requires.',
  animated: true,
  controls: [
    {
      id: 'ecc',
      label: 'Eccentricity',
      min: 0,
      max: 0.6,
      step: 0.01,
      value: 0,
      decimals: 2,
    },
    {
      id: 'semi',
      label: 'Semi-major axis',
      unit: 'AU',
      min: 0.6,
      max: 1.8,
      step: 0.05,
      value: 1.2,
      decimals: 2,
    },
  ],
  actions: [
    { id: 'run', label: '▶ Run / Pause' },
    { id: 'reset', label: '↺ Reset' },
  ],
  key: (v, spec = {}) => `${v.ecc}|${v.semi}|${spec.model ?? 'c'}`,
  reset(v, { autorun = true, spec = {} } = {}) {
    orbitState = {
      key: this.key(v, spec),
      phase: 0,
      running: autorun,
      trail: [],
    };
  },
  act(id, v, spec = {}) {
    if (id === 'run') orbitState.running = !orbitState.running;
    else if (id === 'reset') this.reset(v, { autorun: true, spec });
  },
  step(v, dt, spec = {}) {
    if (orbitState.key !== this.key(v, spec)) this.reset(v, { spec });
    if (!orbitState.running) return;
    orbitState.phase = (orbitState.phase + dt * ORBITS_PER_SECOND) % 1;
  },
  compute(v, spec = {}) {
    const orbit = {
      semiMajorAU: v.semi,
      eccentricity: v.ecc,
      luminositySolar: 1,
    };
    const bounds = habitableZoneBounds(
      { luminositySolar: 1, teffK: 5772 },
      spec.model ?? 'conservative'
    );
    const now = orbitalStateAt(orbit, orbitState.phase);
    return {
      orbit,
      bounds,
      now,
      extremes: orbitExtremes(orbit),
      fraction: fractionOfYearInZone(orbit, bounds, 720),
      status: habitableZoneStatus(now.distanceAU, bounds),
    };
  },
  readout(v, ctx2, spec = {}) {
    const c = this.compute(v, spec);
    const rows = [
      {
        label: 'Distance right now',
        value: withUnit(c.now.distanceAU.toFixed(3), 'AU'),
      },
      {
        label: 'Starlight right now',
        value: earthUnits(c.now.insolation),
        emphasis: true,
      },
      {
        label: 'Closest / furthest',
        value: `${c.extremes.periapsisAU.toFixed(2)} / ${c.extremes.apoapsisAU.toFixed(2)} AU`,
      },
      {
        label: 'Starlight at closest / furthest',
        value: `${earthUnits(c.extremes.periapsisInsolation)} / ${earthUnits(c.extremes.apoapsisInsolation)}`,
      },
    ];
    if (spec.showZone) {
      rows.push({ label: 'Right now the planet is', value: c.status.label });
      rows.push({
        label: 'Fraction of the year inside the zone',
        value: `${Math.round(c.fraction * 100)}%`,
        emphasis: true,
      });
    }
    return rows;
  },
  draw(canvas, v, ctx2, spec = {}) {
    const H = responsiveHeight(340, 286);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const c = this.compute(v, spec);

    const plotH = 96;
    const orbitH = H - plotH - 18;
    const cx = w / 2;
    const cy = orbitH / 2 + 4;
    const maxR = Math.max(
      c.extremes.apoapsisAU,
      spec.showZone ? c.bounds.outerAU : 0
    );
    const scale = (Math.min(w, orbitH) / 2 - 26) / maxR;

    // The zone, as an annulus around the star
    if (spec.showZone && Number.isFinite(c.bounds.outerAU)) {
      ctx.fillStyle = 'rgba(95, 208, 160, 0.14)';
      ctx.beginPath();
      ctx.arc(cx, cy, c.bounds.outerAU * scale, 0, Math.PI * 2);
      ctx.arc(cx, cy, c.bounds.innerAU * scale, 0, Math.PI * 2, true);
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.setLineDash([7, 4]);
      ctx.strokeStyle = HOT;
      ctx.beginPath();
      ctx.arc(cx, cy, c.bounds.innerAU * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = COLD;
      ctx.beginPath();
      ctx.arc(cx, cy, c.bounds.outerAU * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // The orbit itself
    ctx.strokeStyle = 'rgba(143, 212, 255, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 240; i++) {
      const s = orbitalStateAt(c.orbit, i / 240);
      const x = cx + s.x * scale;
      const y = cy + s.y * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // The star sits at a focus, not the center of the ellipse.
    drawStar(ctx, cx, cy, 8, '#fff2c4');

    const px = cx + c.now.x * scale;
    const py = cy + c.now.y * scale;
    ctx.fillStyle = EARTHY;
    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, Math.PI * 2);
    ctx.fill();

    if (spec.showZone) {
      ctx.font = `10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = ZONE;
      halo(ctx, 'habitable zone', cx, cy + c.bounds.outerAU * scale + 5);
    }

    // The synchronized plot: starlight against the fraction of the year gone.
    const pl = 46;
    const pr = w - 16;
    const pt = orbitH + 14;
    const pb = H - 22;
    const maxS = Math.max(
      c.extremes.periapsisInsolation * 1.15,
      spec.showZone ? c.bounds.innerFlux * 1.15 : 0
    );
    const PX = ph => pl + ph * (pr - pl);
    const PY = s => pb - (s / maxS) * (pb - pt);

    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pl, pb);
    ctx.lineTo(pr, pb);
    ctx.moveTo(pl, pt);
    ctx.lineTo(pl, pb);
    ctx.stroke();

    // The zone as a horizontal band on the plot: the same information again,
    // in the axis a student is about to read.
    if (spec.showZone) {
      const yTop = PY(Math.min(maxS, c.bounds.innerFlux));
      const yBot = PY(c.bounds.outerFlux);
      ctx.fillStyle = 'rgba(95, 208, 160, 0.16)';
      ctx.fillRect(pl, yTop, pr - pl, yBot - yTop);
      ctx.setLineDash([7, 4]);
      ctx.strokeStyle = HOT;
      ctx.beginPath();
      ctx.moveTo(pl, yTop);
      ctx.lineTo(pr, yTop);
      ctx.stroke();
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = COLD;
      ctx.beginPath();
      ctx.moveTo(pl, yBot);
      ctx.lineTo(pr, yBot);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = EARTHY;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const s = orbitalStateAt(c.orbit, i / 200);
      const x = PX(i / 200);
      const y = PY(s.insolation);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // The marker that ties the two halves of the panel together.
    const mx = PX(orbitState.phase);
    const my = PY(c.now.insolation);
    ctx.strokeStyle = 'rgba(233, 237, 247, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mx, pt);
    ctx.lineTo(mx, pb);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('one full year', (pl + pr) / 2, pb + 5);
    ctx.save();
    ctx.translate(12, (pt + pb) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'top';
    ctx.fillText('starlight (Earths)', 0, 0);
    ctx.restore();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(maxS.toFixed(1), pl - 4, pt);
    ctx.textBaseline = 'bottom';
    ctx.fillText('0', pl - 4, pb);
  },
};

// =============================================================================
// 5. TRAPPIST-1
// =============================================================================

const TRAPPIST = {
  id: 'hz-trappist',
  title: 'TRAPPIST-1, all seven planets',
  note: 'Every planet in this system orbits closer to its star than Mercury does to the Sun. The star is so faint that the habitable zone is in there with them.',
  controls: [
    {
      id: 'model',
      label: 'Zone definition',
      min: 0,
      max: 1,
      step: 1,
      value: 0,
      format: v => (v >= 0.5 ? 'Optimistic' : 'Conservative'),
    },
  ],
  compute(v, spec = {}) {
    const model = v.model >= 0.5 ? 'optimistic' : 'conservative';
    const props = {
      luminositySolar: TRAPPIST1_STAR.luminosityInSuns,
      teffK: TRAPPIST1_STAR.temperatureK,
    };
    const bounds = habitableZoneBounds(props, model);
    const planets = TRAPPIST1_PLANETS.map(p => ({
      ...p,
      insolation: relativeInsolation(props.luminositySolar, p.a),
      status: habitableZoneStatus(p.a, bounds),
    }));
    return { model, bounds, planets, compare: spec.compare === true };
  },
  readout(v, ctx2, spec = {}) {
    const c = this.compute(v, spec);
    const rows = [
      {
        label: 'Habitable zone',
        value: `${fmtAU(c.bounds.innerAU)} to ${fmtAU(c.bounds.outerAU)} AU`,
        emphasis: true,
      },
    ];
    for (const p of c.planets) {
      rows.push({
        // "TRAPPIST-1b" in every row wraps the label onto two lines in the
        // 460px panel and adds nothing: the panel is titled TRAPPIST-1.
        label: `Planet ${p.name} at ${p.a.toFixed(4)} AU`,
        value: `${earthUnits(p.insolation)} · ${p.status.label}`,
        emphasis: p.status.status === 'inside',
      });
    }
    return rows;
  },
  draw(canvas, v, ctx2, spec = {}) {
    const H = responsiveHeight(316, 268);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const c = this.compute(v, spec);

    const left = 30;
    const right = w - 20;
    const track = right - left;
    // A square-root axis, so the inner planets are not piled on the star while
    // the outer ones sit alone. The axis is labelled, so the compression is
    // visible rather than misleading.
    const maxAU = 0.07;
    const X = au => left + Math.sqrt(Math.max(0, au) / maxAU) * track;

    const rowY = c.compare ? 84 : 118;

    // The zone
    const x0 = X(c.bounds.innerAU);
    const x1 = X(c.bounds.outerAU);
    ctx.fillStyle = 'rgba(95, 208, 160, 0.16)';
    ctx.fillRect(x0, rowY - 44, x1 - x0, 78);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([7, 4]);
    ctx.strokeStyle = HOT;
    ctx.beginPath();
    ctx.moveTo(x0, rowY - 44);
    ctx.lineTo(x0, rowY + 34);
    ctx.stroke();
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = COLD;
    ctx.beginPath();
    ctx.moveTo(x1, rowY - 44);
    ctx.lineTo(x1, rowY + 34);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = ZONE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    halo(ctx, `habitable zone (${c.model})`, (x0 + x1) / 2, rowY - 48);

    drawStar(ctx, left, rowY, 8, starColor(TRAPPIST1_STAR.temperatureK));
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    halo(ctx, 'TRAPPIST-1', left - 4, rowY + 14);

    // Seven planets, labelled above and below alternately so that seven labels
    // on a compressed axis cannot collide.
    c.planets.forEach((p, i) => {
      const x = X(p.a);
      const inside = p.status.status === 'inside';
      ctx.fillStyle = inside ? ZONE : PLANET;
      ctx.beginPath();
      ctx.arc(x, rowY, inside ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      if (inside) {
        // A ring as well as a color, so the distinction survives without it.
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(x, rowY, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
      const up = i % 2 === 0;
      const ly = up ? rowY - 14 : rowY + 16;
      ctx.strokeStyle = 'rgba(154, 163, 181, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, rowY + (up ? -8 : 8));
      ctx.lineTo(x, ly + (up ? 3 : -3));
      ctx.stroke();
      ctx.font = `11px ${MONO}`;
      ctx.fillStyle = inside ? ZONE : INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = up ? 'bottom' : 'top';
      halo(ctx, p.name, x, ly);
    });

    // Axis
    const axisY = rowY + 52;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, axisY);
    ctx.lineTo(right, axisY);
    ctx.stroke();
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const au of [0, 0.01, 0.02, 0.04, 0.06]) {
      const x = X(au);
      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 4);
      ctx.stroke();
      ctx.fillText(au === 0 ? '0' : au.toFixed(2), x, axisY + 7);
    }
    ctx.fillText('distance from the star (AU)', (left + right) / 2, axisY + 22);

    if (!c.compare) return;

    // The Solar System on the same axis, for scale. Mercury alone is nearly six
    // times further out than TRAPPIST-1h.
    const sy = axisY + 68;
    ctx.strokeStyle = GRID;
    ctx.beginPath();
    ctx.moveTo(left, sy - 26);
    ctx.lineTo(right, sy - 26);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `10px ${MONO}`;
    ctx.fillText('the same axis, with the Solar System on it', left, sy - 22);

    const solar = [
      { name: 'Mercury', a: 0.387 },
      { name: 'Venus', a: 0.723 },
      { name: 'Earth', a: 1.0 },
    ];
    // All three are far off the right-hand end of this axis, which is the point.
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = HOT;
    halo(
      ctx,
      `Mercury is at 0.387 AU, ${Math.round(solar[0].a / TRAPPIST1_PLANETS[6].a)}x further out than TRAPPIST-1h`,
      right,
      sy + 2
    );
    ctx.textAlign = 'left';
    ctx.fillStyle = MUTED;
    halo(
      ctx,
      'the whole system would fit inside Mercury’s orbit',
      left,
      sy + 20
    );
  },
};

// =============================================================================
// 6. Three candidates
// =============================================================================

const CANDIDATES = [
  {
    key: 'A',
    name: 'Planet A',
    insolation: 1.05,
    radius: 1.0,
    facts: [
      'Rocky, about Earth’s size',
      'No atmosphere detected at current sensitivity',
      'Host star is quiet',
      'Nearly circular orbit',
    ],
    verdict:
      'Without an atmosphere there is nothing to hold heat or pressure, and liquid water on the surface would not be stable. The non-detection is not proof of no atmosphere, but it makes this the weakest of the three on the evidence available.',
  },
  {
    key: 'B',
    name: 'Planet B',
    insolation: 0.95,
    radius: 1.1,
    facts: [
      'Rocky, slightly larger than Earth',
      'Atmosphere detected, composition not yet measured',
      'Host star is quiet',
      'Nearly circular orbit',
    ],
    verdict:
      'An atmosphere of unknown composition around a rocky planet receiving nearly Earth’s starlight, orbiting a star that is not stripping it. Nothing here shows the planet is habitable, but everything here is worth a spectrum.',
  },
  {
    key: 'C',
    name: 'Planet C',
    insolation: 1.1,
    radius: 1.6,
    facts: [
      '1.6 Earth radii, likely a thick hydrogen envelope',
      'Atmosphere detected, very extended',
      'Host star flares frequently',
      'Nearly circular orbit',
    ],
    verdict:
      'At 1.6 Earth radii this is more likely to be a small gas-rich world than a rocky one, and a thick hydrogen envelope over a deep interior is not a surface where liquid water sits. The flaring star is a further complication. Interesting, but not the best first target.',
  },
];

const CANDIDATE_WIDGET = {
  id: 'hz-candidates',
  title: 'Three planets, similar starlight',
  note: 'All three receive close to what Earth receives, and all three lie inside the modeled habitable zone. That is where the similarity ends.',
  controls: [
    {
      id: 'which',
      label: 'Showing',
      min: 0,
      max: 2,
      step: 1,
      value: 0,
      format: v => CANDIDATES[Math.round(v)]?.name ?? '-',
    },
  ],
  readout(v, ctx2, spec = {}) {
    const c = CANDIDATES[Math.round(v.which)] ?? CANDIDATES[0];
    const rows = CANDIDATES.map(p => ({
      label: p.name,
      value: `${earthUnits(p.insolation)} · ${p.radius.toFixed(1)} R⊕`,
      emphasis: p.key === c.key,
    }));
    if (spec.reveal) rows.push({ label: `About ${c.name}`, value: c.verdict });
    return rows;
  },
  draw(canvas, v) {
    const H = responsiveHeight(300, 252);
    const { ctx, w } = surface(canvas, H);
    sky(ctx, w, H);
    const c = CANDIDATES[Math.round(v.which)] ?? CANDIDATES[0];

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 13px ${MONO}`;
    ctx.fillStyle = ZONE;
    ctx.fillText(c.name, w / 2, 18);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `${earthUnits(c.insolation)}  ·  ${c.radius.toFixed(1)} Earth radii  ·  inside the modeled zone`,
      w / 2,
      36
    );

    // The planet, drawn to relative size.
    const cy = 108;
    const r = 22 * c.radius;
    const glow = ctx.createRadialGradient(
      w / 2,
      cy,
      r * 0.6,
      w / 2,
      cy,
      r * 1.9
    );
    glow.addColorStop(0, 'rgba(143, 212, 255, 0.35)');
    glow.addColorStop(1, 'rgba(143, 212, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(w / 2, cy, r * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PLANET;
    ctx.beginPath();
    ctx.arc(w / 2, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Earth outline for scale, beside it.
    const ex = w / 2 + r + 34;
    ctx.strokeStyle = MUTED;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(ex, cy, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `10px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (ex + 22 < w - 4) halo(ctx, 'Earth', ex, cy + 26);

    // What is known about it.
    ctx.textAlign = 'left';
    ctx.font = `10px ${MONO}`;
    let y = cy + 62;
    for (const f of c.facts) {
      ctx.fillStyle = MUTED;
      ctx.fillText('·', 22, y);
      ctx.fillStyle = INK;
      ctx.fillText(f, 34, y);
      y += 17;
    }
  },
};

export const HABITABILITY_WIDGETS = [
  INSOLATION,
  SPREADING,
  STAR_WIDGET,
  BOUNDARIES_WIDGET,
  ORBIT,
  TRAPPIST,
  CANDIDATE_WIDGET,
];

/** Test seam: the candidate planets the closing activity offers. */
export const candidatePlanets = () => CANDIDATES.map(c => ({ ...c }));
/** Test seam: the stars the comparison instrument offers. */
export const comparisonStars = () => STARS.map(s => ({ ...s }));
