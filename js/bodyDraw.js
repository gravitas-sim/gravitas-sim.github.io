// =============================================================================
// How the bodies are painted
// -----------------------------------------------------------------------------
// The draw code for the planets, gas giants and their rings, asteroids, debris,
// comets and black holes, formerly a `draw(ctx)` method on each class in
// js/physics.js. The engine holds a table of drawers (registerBodyDrawers) and
// this module fills it, so the engine imports nothing that paints; the render
// layer rule in check:architecture holds it to that. Each function is the old
// method with `this` passed as `o`, unchanged otherwise. The stars, neutron
// stars, white dwarfs, galaxies and particles still draw from the engine, and
// the helpers imported from it below follow them in a later slice.
// =============================================================================

import { EARTH_MASSES_PER_JUPITER_MASS, SOLAR_MASS_UNIT } from './constants.js';
import { simToAu } from './units.js';
import { formatNumber, withUnit } from './format.js';
import { t } from './i18n/index.js';
import { drawSolarLabel, EARTH_SYMBOL, hexToRgb } from './utils.js';
import { currentTier } from './quality.js';
import { ENVIRONMENT } from './blackHole/appearance.js';
import {
  LOD,
  lodAtLeast,
  visualSeed,
  hash01,
  silhouetteFor,
  lightDirection,
  scaleRgb,
  tailActivity,
  ionTailDirection,
  dustTailDirection,
} from './bodyVisuals.js';
import { relativeInsolation } from './habitability.js';
import {
  state,
  bh_list,
  world_to_screen,
  compute_dynamic_color,
  physicsSettings,
  drawRadius,
  lodOf,
  dominantStarFor,
  rgba,
  bloomLayer,
  visualClockSeconds,
  defaultAppearance,
  registerBodyDrawers,
  setBloomLayer,
} from './physics.js';

// Fetched the first time a black hole is drawn, not at start-up. A scenario
// with no black holes in it never asks for the renderer at all, and the four
// kilobytes it costs stay out of everyone else's initial download. Until it
// arrives the object is drawn as the simple mark the far level of detail uses,
// which is a frame or two on a cold load and nothing on a warm one.
let blackHoleRenderer = null;
let blackHoleRendererPending = false;
const ensureBlackHoleRenderer = () => {
  if (blackHoleRenderer || blackHoleRendererPending) return blackHoleRenderer;
  blackHoleRendererPending = true;
  import('./blackHole/render.js')
    .then(m => {
      blackHoleRenderer = m;
    })
    .catch(() => {
      // Leave it null: the simple mark is a complete, honest drawing of a
      // black hole and the sandbox keeps working without the rest.
      blackHoleRendererPending = false;
    });
  return null;
};

function drawPlanet(o, ctx) {
  const world_pos = o.pos; // Use direct world coordinates since canvas is already transformed

  // Custom rendering for Earth and Moon
  if (o.isEarth) {
    drawEarth(o, ctx, world_pos);
    return;
  }

  if (o.isMoon) {
    drawMoon(o, ctx, world_pos);
    return;
  }

  // A scenario that names a color means it: the Solar System sets Mercury
  // gray, Venus cream, Mars red, and the Kepler lesson distinguishes its two
  // orbiters by color in the text. Falling straight through to the density
  // switch ignored all of that and drew every planet the same sky blue,
  // including two side by side that the lesson calls "blue" and "orange".
  let baseColor = o.baseColor;
  if (!baseColor) {
    switch (o.density) {
      case 'gaseous':
        baseColor = '#87CEEB';
        break;
      case 'icy':
        baseColor = '#E6E6FA';
        break;
      case 'rocky':
      default:
        baseColor = '#87CEEB';
        break;
    }
  }

  const r = drawRadius(o, 'Planet');
  const z = (state && state.zoom) || 1;
  const level = lodOf(o, 'Planet');
  const litColor = compute_dynamic_color(baseColor, o.pos, bh_list);

  ctx.fillStyle = litColor;
  ctx.beginPath();
  ctx.arc(world_pos.x, world_pos.y, r, 0, 2 * Math.PI);
  ctx.fill();

  // Everything from here to the label is inside the limb.
  //
  // The bands and the polar caps below used to be drawn as full-width
  // rectangles across the body: correct in the middle, and running past the
  // circle at the top and bottom of each one, so a planet had two tabs
  // sticking out of its side. Clipping to the disc is what makes them
  // markings on a sphere rather than stripes behind one - and it is one
  // clip for the whole group rather than one path per marking.
  if (lodAtLeast(level, LOD.SHADED)) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, r, 0, 2 * Math.PI);
    ctx.clip();
    drawPlanetSurface(o, ctx, world_pos, r, z, level, baseColor);
    ctx.restore();
  }

  // Soft bloom, into the offscreen layer js/render.js composites additively.
  // One pass, in the planet's own color. Two blocks used to paint the same
  // gradient, the second in a fixed pale blue at more than twice the alpha,
  // so every planet wore the same bluish halo and paid for two gradients. The
  // alphas below are the two sets summed: the brightness is what it was.
  //
  // Asking for the bloom layer arms the composite (see setBloomLayer), so the
  // tier check comes first: js/quality.js lists the bloom canvas among the
  // passes the low tier skips, and the layer must not be touched there.
  try {
    if (currentTier() !== 'low') {
      // The halo follows the drawn body, not the model radius.
      const screenR = r * state.zoom;
      const bloom = screenR > 1 && bloomLayer();
      if (bloom) {
        const { x: screenX, y: screenY } = world_to_screen(world_pos);
        const rgbPlanet = hexToRgb(baseColor) || { r: 200, g: 220, b: 255 };
        const { r, g, b } = rgbPlanet;
        const grad = bloom.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          screenR * 2.5
        );
        grad.addColorStop(0, `rgba(${r},${g},${b},0.5)`);
        grad.addColorStop(0.6, `rgba(${r},${g},${b},0.21)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        bloom.fillStyle = grad;
        bloom.beginPath();
        bloom.arc(screenX, screenY, screenR * 2.5, 0, 2 * Math.PI);
        bloom.fill();
      }
    }
  } catch {
    // no-op
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const true_screen_pos = world_to_screen(world_pos);
  // Two different sizes, on purpose.
  //
  // The offset follows the *drawn* body, so a label sits just off the disc
  // the reader can see. Whether to label at all follows the *model* radius,
  // which is the size this decision has always been made on: gating on the
  // drawn size instead would have taken the names off every planet in the
  // Solar System the moment the displayed-size policy shrank them, which is
  // a labeling change nobody asked for.
  const screen_radius = r * state.zoom;
  const label_size = o.radius * state.zoom;

  if (label_size > 4) {
    const label_y_offset = screen_radius + 10;
    ctx.font = '10px Roboto Mono';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 3;

    // Show name for Solar System planets, mass for others
    if (o.isSolarSystemPlanet) {
      ctx.fillText(
        o.name,
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset
      );
    } else {
      drawSolarLabel(
        ctx,
        formatNumber(o.massInEarths),
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset,
        { symbol: EARTH_SYMBOL }
      );
    }
  }
  ctx.restore();
}

/**
 * What is drawn on the planet's face, inside the limb.
 *
 * The caller has already clipped to the disc, which is what lets everything
 * here be simple shapes: a band is a rectangle and the clip makes it a band
 * on a sphere. Ordered cheapest first, so the level of detail can stop
 * partway rather than needing a separate code path per level.
 *
 * @param {CanvasRenderingContext2D} ctx - Clipped, world-transformed context
 * @param {{x: number, y: number}} at - Center, world units
 * @param {number} r - Drawn radius, world units
 * @param {number} z - Zoom
 * @param {string} level - From lodOf
 * @param {string} baseColor - The planet's own color
 */
function drawPlanetSurface(o, ctx, at, r, z, level, baseColor) {
  // --- one shading pass: which side the light is on ---------------------
  //
  // From the star that actually lights this planet, so the terminator turns
  // as it orbits and two planets on opposite sides of a star are lit from
  // opposite sides. A scene with no luminous body gets the fixed fallback
  // from js/bodyVisuals.js rather than an invented sun.
  const sun = dominantStarFor(at);
  const light = lightDirection(at, sun ? sun.pos : null);
  const shade = ctx.createRadialGradient(
    at.x + light.x * r * 0.55,
    at.y + light.y * r * 0.55,
    r * 0.1,
    at.x,
    at.y,
    r * 1.05
  );
  shade.addColorStop(0, 'rgba(255,255,255,0.22)');
  shade.addColorStop(0.45, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, 2 * Math.PI);
  ctx.fill();

  if (!lodAtLeast(level, LOD.DETAILED)) return;

  // --- body-specific detail ---------------------------------------------
  if (o.density === 'gaseous') {
    ctx.fillStyle = 'rgba(135, 206, 235, 0.45)';
    const band = Math.max(1 / z, r * 0.18);
    ctx.fillRect(at.x - r, at.y - r * 0.5 - band / 2, r * 2, band);
    ctx.fillRect(at.x - r, at.y + r * 0.5 - band / 2, r * 2, band);
  } else if (o.density === 'icy') {
    // Polar caps. Drawn as squat ellipses rather than rectangles so the clip
    // has something cap-shaped to trim, which reads as a pole rather than as
    // a flat lid.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    const cap = r * 0.42;
    for (const sign of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(
        at.x,
        at.y + sign * r * 0.92,
        r * 0.95,
        cap,
        0,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  } else {
    // Rocky: a few maria, in fixed places on this planet forever. The
    // positions come from the object's own id through js/bodyVisuals.js, so
    // the same world rebuilt from the same seed - or reopened from a share
    // link - has the same planet with the same markings, and no draw path
    // has to call Math.random.
    const seed = visualSeed(o);
    const dark = hexToRgb(baseColor) || { r: 140, g: 140, b: 150 };
    const spot = scaleRgb(dark, 0.72);
    ctx.fillStyle = rgba(spot, 0.5);
    const marks = 3;
    for (let i = 0; i < marks; i++) {
      const a = hash01(seed, 10 + i) * Math.PI * 2;
      const d = (0.15 + hash01(seed, 20 + i) * 0.55) * r;
      const rad = (0.16 + hash01(seed, 30 + i) * 0.2) * r;
      ctx.beginPath();
      ctx.ellipse(
        at.x + Math.cos(a) * d,
        at.y + Math.sin(a) * d,
        rad,
        rad * (0.6 + hash01(seed, 40 + i) * 0.5),
        a,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  }
}

function drawEarth(o, ctx, world_pos) {
  // Everything here is proportioned to the drawn disc rather than to the
  // model radius: a continent sized to a radius the body is no longer drawn
  // at is a continent that covers the planet.
  const r = drawRadius(o, 'Planet');
  // Draw Earth with realistic appearance - blue oceans with green continents
  const gradient = ctx.createRadialGradient(
    world_pos.x,
    world_pos.y,
    0,
    world_pos.x,
    world_pos.y,
    r
  );

  // Base ocean color
  gradient.addColorStop(0, '#4B7BE5'); // Deep blue center
  gradient.addColorStop(0.7, '#5B8BF5'); // Lighter blue
  gradient.addColorStop(1, '#6B9BF5'); // Light blue edge

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(world_pos.x, world_pos.y, drawRadius(o, 'Planet'), 0, 2 * Math.PI);
  ctx.fill();

  // Add continent-like features (simplified)
  if (r * state.zoom > 8) {
    // Draw some green "continents" as simple shapes
    ctx.fillStyle = '#2D5A2D'; // Dark green for continents

    // North America-like shape
    ctx.beginPath();
    ctx.arc(
      world_pos.x - r * 0.3,
      world_pos.y - r * 0.4,
      r * 0.25,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Europe/Asia-like shape
    ctx.beginPath();
    ctx.arc(
      world_pos.x + r * 0.2,
      world_pos.y - r * 0.3,
      r * 0.3,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // Africa-like shape
    ctx.beginPath();
    ctx.arc(
      world_pos.x + r * 0.1,
      world_pos.y + r * 0.2,
      r * 0.2,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // South America-like shape
    ctx.beginPath();
    ctx.arc(
      world_pos.x - r * 0.4,
      world_pos.y + r * 0.3,
      r * 0.15,
      0,
      2 * Math.PI
    );
    ctx.fill();
  }

  // Add atmospheric glow
  ctx.strokeStyle = 'rgba(135, 206, 235, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(
    world_pos.x,
    world_pos.y,
    drawRadius(o, 'Planet') + 1,
    0,
    2 * Math.PI
  );
  ctx.stroke();
}

function drawMoon(o, ctx, world_pos) {
  const r = drawRadius(o, 'Planet');
  // Draw Moon with realistic gray appearance and mock craters
  const gradient = ctx.createRadialGradient(
    world_pos.x,
    world_pos.y,
    0,
    world_pos.x,
    world_pos.y,
    r
  );

  // Moon surface gradient
  gradient.addColorStop(0, '#6B6B6B'); // Dark gray center
  gradient.addColorStop(0.5, '#8B8B8B'); // Medium gray
  gradient.addColorStop(1, '#A0A0A0'); // Light gray edge

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(world_pos.x, world_pos.y, drawRadius(o, 'Planet'), 0, 2 * Math.PI);
  ctx.fill();

  // Add mock craters if zoomed in enough
  if (r * state.zoom > 6) {
    ctx.fillStyle = '#5A5A5A'; // Darker gray for craters

    // Draw several craters of different sizes
    const craters = [
      { x: -0.3, y: -0.2, r: 0.15 },
      { x: 0.2, y: 0.3, r: 0.12 },
      { x: 0.4, y: -0.1, r: 0.08 },
      { x: -0.1, y: 0.4, r: 0.1 },
      { x: 0.1, y: -0.4, r: 0.06 },
      { x: -0.4, y: 0.1, r: 0.09 },
    ];

    craters.forEach(crater => {
      ctx.beginPath();
      ctx.arc(
        world_pos.x + crater.x * r,
        world_pos.y + crater.y * r,
        crater.r * r,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  }

  // Add subtle surface texture
  if (r * state.zoom > 4) {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 0.5;

    // Draw some subtle lines to simulate lunar surface features
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI) / 3;
      const x1 = world_pos.x + Math.cos(angle) * r * 0.8;
      const y1 = world_pos.y + Math.sin(angle) * r * 0.8;
      const x2 = world_pos.x + Math.cos(angle) * r;
      const y2 = world_pos.y + Math.sin(angle) * r;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}

/**
 * One half of the ring system, as concentric projected ellipses.
 *
 * The disk is drawn in two passes with the planet between them, which is the
 * whole of what makes it read as a disk rather than as a hoop painted on the
 * sky: the far half goes down first, the opaque planet covers the part of it
 * that crosses the disc, and the near half goes over the top. The planet
 * fill is opaque, so the occlusion is exact rather than approximate.
 *
 * Bands, gaps and an optional Cassini-like division, all from the cached
 * geometry: no gradients, no allocation beyond the paths themselves, and
 * nothing random.
 *
 * @param {CanvasRenderingContext2D} ctx - Target
 * @param {{x: number, y: number}} at - Planet center, world coordinates
 * @param {number} pr - The planet's displayed radius, world units
 * @param {boolean} near - The half in front of the planet
 * @param {boolean} detailed - Bands and a division, rather than one annulus
 */
function drawRingHalf(o, ctx, at, pr, near, detailed) {
  const g = o.ringGeometry();
  // Which half of the parameterised ellipse faces the viewer depends on
  // which side of the ring plane the viewer is on, which is what tiltSign
  // records. Flipping it swaps front and back, and is the difference between
  // a ring that passes in front of the planet and one that does not.
  const front = g.tiltSign > 0;
  const t0 = near === front ? 0 : Math.PI;

  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(g.angle);
  ctx.globalAlpha = g.opacity;

  const arcs = detailed ? g.bands : [{ r0: g.inner, r1: g.outer, alpha: 0.8 }];

  for (const band of arcs) {
    const r1 = band.r1 * pr;
    const r0 = band.r0 * pr;
    // A band narrower than a fraction of a pixel is not a band.
    if (r1 - r0 <= 0) continue;
    ctx.beginPath();
    ctx.ellipse(0, 0, r1, r1 * g.flatten, 0, t0, t0 + Math.PI, false);
    ctx.ellipse(0, 0, r0, r0 * g.flatten, 0, t0 + Math.PI, t0, true);
    ctx.closePath();
    ctx.fillStyle = `rgba(${g.tint.r},${g.tint.g},${g.tint.b},${band.alpha.toFixed(3)})`;
    ctx.fill('evenodd');
  }

  // The division, drawn as a hole rather than as a line: it is a gap in the
  // rings, and a dark stroke over them would read as a wire.
  if (detailed && g.cassini) {
    const r1 = g.cassini.r1 * pr;
    const r0 = g.cassini.r0 * pr;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(0, 0, r1, r1 * g.flatten, 0, t0, t0 + Math.PI, false);
    ctx.ellipse(0, 0, r0, r0 * g.flatten, 0, t0 + Math.PI, t0, true);
    ctx.closePath();
    ctx.fill('evenodd');
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * The planet's shadow, falling across the rings away from the star.
 *
 * A wedge, not a radiative-transfer calculation, and it claims no more than
 * that: the rings are darker on the side the planet is between them and the
 * light. Drawn only when there is a light to be away from and only at the
 * size where it is legible.
 *
 * @param {CanvasRenderingContext2D} ctx - Target
 * @param {{x: number, y: number}} at - Planet center, world coordinates
 * @param {number} pr - Displayed planetary radius
 * @param {{x: number, y: number}} light - Unit vector toward the light
 */
function drawRingShadow(o, ctx, at, pr, light) {
  const g = o.ringGeometry();
  const away = Math.atan2(-light.y, -light.x) - g.angle;
  const half = 0.42; // radians either side: a shadow, not a sector chart

  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(g.angle);
  ctx.globalAlpha = 0.55 * g.opacity;
  ctx.globalCompositeOperation = 'destination-out';
  const r1 = g.outer * pr;
  const r0 = g.inner * pr;
  ctx.beginPath();
  ctx.ellipse(0, 0, r1, r1 * g.flatten, 0, away - half, away + half, false);
  ctx.ellipse(0, 0, r0, r0 * g.flatten, 0, away + half, away - half, true);
  ctx.closePath();
  ctx.fill('evenodd');
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawGasGiant(o, ctx) {
  const world_pos = o.pos; // Use direct world coordinates since canvas is already transformed

  // The drawn radius, and how much of the system is worth showing at it.
  // Everything below is proportioned to this rather than to the model
  // radius, rings included.
  const gr = drawRadius(o, 'GasGiant');
  const gz = (state && state.zoom) || 1;
  const glevel = lodOf(o, 'GasGiant');
  const grPx = gr * gz;

  // Rings, when there is room for them to be rings.
  //
  // A ring system on a body a few pixels across is four gray pixels beside
  // three colored ones, which is noise rather than information - so below
  // the shaded threshold they are simply not drawn, and in a crowded field
  // they are not drawn at all. Between the two, a single annulus each side;
  // above it, the bands and the division.
  const ringsVisible =
    o.hasRings && lodAtLeast(glevel, LOD.SHADED) && grPx >= 5;
  const ringsDetailed =
    ringsVisible && lodAtLeast(glevel, LOD.DETAILED) && grPx >= 9;

  // The far half first, so the planet can cover the part of it that crosses
  // the disc.
  if (ringsVisible) drawRingHalf(o, ctx, world_pos, gr, false, ringsDetailed);

  // Draw the gas giant sphere (this will occlude the back portion of the ring)
  let baseColor;
  switch (o.giantType) {
    case 'brown_dwarf':
      baseColor = '#8B4513';
      break;
    case 'super_jupiter':
      baseColor = '#DAA520';
      break;
    case 'jupiter_like':
      baseColor = '#D2B48C';
      break;
    case 'neptune_like':
      baseColor = '#4169E1';
      break;
    case 'mini_neptune':
    default:
      baseColor = '#87CEEB';
      break;
  }

  ctx.fillStyle = compute_dynamic_color(baseColor, o.pos, bh_list);
  ctx.beginPath();
  ctx.arc(world_pos.x, world_pos.y, gr, 0, 2 * Math.PI);
  ctx.fill();

  // Spherical shading, and the clip that makes the bands below belong to the
  // sphere rather than lie across it. One clip for the whole face: the bands
  // were ellipses wider than the body, so their ends were cut by nothing and
  // a gas giant had two lozenges floating over its silhouette.
  if (lodAtLeast(glevel, LOD.SHADED)) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, gr, 0, 2 * Math.PI);
    ctx.clip();

    const gsun = dominantStarFor(world_pos);
    const glight = lightDirection(world_pos, gsun ? gsun.pos : null);
    const gshade = ctx.createRadialGradient(
      world_pos.x + glight.x * gr * 0.5,
      world_pos.y + glight.y * gr * 0.5,
      gr * 0.08,
      world_pos.x,
      world_pos.y,
      gr * 1.05
    );
    gshade.addColorStop(0, 'rgba(255,255,255,0.18)');
    gshade.addColorStop(0.4, 'rgba(255,255,255,0)');
    gshade.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = gshade;
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, gr, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  if (lodAtLeast(glevel, LOD.DETAILED) && gr * gz > 4) {
    // Clipped to the disc, for the reason above: the band ellipses are wider
    // and taller than the sphere at the latitudes they sit at, so without
    // this the outer ones hang off the limb.
    ctx.save();
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, gr, 0, 2 * Math.PI);
    ctx.clip();

    let bandColor, highlightColor;
    switch (o.giantType) {
      case 'brown_dwarf':
        bandColor = 'rgba(139, 69, 19, 0.6)';
        highlightColor = 'rgba(160, 82, 45, 0.4)';
        break;
      case 'super_jupiter':
        bandColor = 'rgba(218, 165, 32, 0.5)';
        highlightColor = 'rgba(255, 215, 0, 0.3)';
        break;
      case 'jupiter_like':
        bandColor = 'rgba(160, 82, 45, 0.5)';
        highlightColor = 'rgba(210, 180, 140, 0.3)';
        break;
      case 'neptune_like':
        bandColor = 'rgba(65, 105, 225, 0.5)';
        highlightColor = 'rgba(100, 149, 237, 0.3)';
        break;
      case 'mini_neptune':
      default:
        bandColor = 'rgba(135, 206, 235, 0.5)';
        highlightColor = 'rgba(173, 216, 230, 0.3)';
        break;
    }

    // A band has to reach the limb, or it is a lozenge floating on the face.
    // These ellipses are wider than the disc on purpose and the clip above
    // trims them to it, which is what makes each one span the full width of
    // the sphere at its own latitude. They used to be sized from the model
    // radius, which over-spanned by so much that every band ran together
    // into a wash; sized from the drawn radius they have to be widened
    // deliberately instead of by accident.
    const numBands = o.massInJupiters > 3 ? 4 : 2;
    const BAND_OVERSPAN = 1.15;
    for (let i = 0; i < numBands; i++) {
      const bandOffset = (i - (numBands - 1) / 2) * (gr * 0.4);
      const bandWidth = gr * 0.15;

      ctx.fillStyle = bandColor;
      ctx.beginPath();
      ctx.ellipse(
        world_pos.x,
        world_pos.y + bandOffset,
        gr * BAND_OVERSPAN,
        bandWidth,
        0,
        0,
        2 * Math.PI
      );
      ctx.fill();

      ctx.fillStyle = highlightColor;
      ctx.beginPath();
      ctx.ellipse(
        world_pos.x,
        world_pos.y + bandOffset - bandWidth * 0.3,
        gr * BAND_OVERSPAN * 0.94,
        bandWidth * 0.4,
        0,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }

    // Polar caps, likewise trimmed to the limb rather than sitting inside it.
    if (o.massInJupiters > 2) {
      ctx.fillStyle = bandColor;
      ctx.beginPath();
      ctx.ellipse(
        world_pos.x,
        world_pos.y - gr * 0.8,
        gr * 0.7,
        gr * 0.28,
        0,
        0,
        2 * Math.PI
      );
      ctx.ellipse(
        world_pos.x,
        world_pos.y + gr * 0.8,
        gr * 0.7,
        gr * 0.28,
        0,
        0,
        2 * Math.PI
      );
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const true_screen_pos = world_to_screen(world_pos);
  // Two different sizes, on purpose.
  //
  // The offset follows the *drawn* body, so a label sits just off the disc
  // the reader can see. Whether to label at all follows the *model* radius,
  // which is the size this decision has always been made on: gating on the
  // drawn size instead would have taken the names off every planet in the
  // Solar System the moment the displayed-size policy shrank them, which is
  // a labeling change nobody asked for.
  const screen_radius = gr * state.zoom;
  const label_size = o.radius * state.zoom;

  if (label_size > 6) {
    const label_y_offset = screen_radius + 12;
    ctx.font = '11px Roboto Mono';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 3;

    // Show name for Solar System gas giants, mass for others
    if (o.isSolarSystemPlanet) {
      ctx.fillText(
        o.name,
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset
      );
    } else {
      const massInEarths = o.massInJupiters * EARTH_MASSES_PER_JUPITER_MASS;
      drawSolarLabel(
        ctx,
        String(Math.round(massInEarths)),
        true_screen_pos.x,
        true_screen_pos.y + label_y_offset,
        { symbol: EARTH_SYMBOL }
      );
    }
  }
  ctx.restore();

  // ...and the near half over the top, which is what makes the disk read as
  // a disk passing behind and in front rather than as a hoop drawn on the
  // sky. Then the planet's own shadow across it, where there is a star to
  // cast one.
  if (ringsVisible) {
    drawRingHalf(o, ctx, world_pos, gr, true, ringsDetailed);
    if (ringsDetailed) {
      const rsun = dominantStarFor(world_pos);
      if (rsun) {
        drawRingShadow(
          o,
          ctx,
          world_pos,
          gr,
          lightDirection(world_pos, rsun.pos)
        );
      }
    }
  }
}

/**
 * A rock.
 *
 * A circle until it is big enough on screen for a shape to read, then a
 * deterministic irregular outline - because an asteroid is not round, and at
 * twenty pixels a perfect disc is the one thing it certainly is not. The
 * outline comes from this body's own visual seed, so the same rock has the
 * same shape in every session and in every share link, and the vertices are
 * cached rather than rebuilt per frame.
 *
 * In a crowded field it stays a dot however large it is: js/bodyVisuals.js
 * caps the level of detail there, and a belt of two hundred rocks each
 * stroking a nine-vertex path is two hundred paths a frame to draw something
 * the reader sees as a haze.
 *
 * @param {CanvasRenderingContext2D} ctx - World-transformed context
 */
function drawAsteroid(o, ctx) {
  const world_pos = o.pos; // Use direct world coordinates since canvas is already transformed
  const r = drawRadius(o, 'Asteroid');
  const level = lodOf(o, 'Asteroid');

  ctx.fillStyle = '#8B4513';

  if (!lodAtLeast(level, LOD.DETAILED)) {
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, r, 0, 2 * Math.PI);
    ctx.fill();
    return;
  }

  const shape = silhouetteFor(visualSeed(o));
  ctx.beginPath();
  for (let i = 0; i < shape.length; i++) {
    const a = (i / shape.length) * Math.PI * 2;
    const rr = r * shape[i];
    const x = world_pos.x + Math.cos(a) * rr;
    const y = world_pos.y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // One shading pass, from the same light every other body uses.
  const sun = dominantStarFor(world_pos);
  const light = lightDirection(world_pos, sun ? sun.pos : null);
  ctx.save();
  ctx.clip();
  const shade = ctx.createRadialGradient(
    world_pos.x + light.x * r * 0.6,
    world_pos.y + light.y * r * 0.6,
    r * 0.1,
    world_pos.x,
    world_pos.y,
    r * 1.2
  );
  shade.addColorStop(0, 'rgba(255,235,205,0.35)');
  shade.addColorStop(0.5, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(world_pos.x - r * 1.3, world_pos.y - r * 1.3, r * 2.6, r * 2.6);
  ctx.restore();
}

function drawDebris(o, ctx) {
  const world_pos = o.pos; // Use direct world coordinates since canvas is already transformed
  ctx.fillStyle = compute_dynamic_color('#c8c8c8', o.pos, bh_list, 200.0, {
    r: 255,
    g: 100,
    b: 0,
  });
  ctx.beginPath();
  ctx.arc(world_pos.x, world_pos.y, drawRadius(o, 'Debris'), 0, 2 * Math.PI);
  ctx.fill();
}

function drawBlackHole(o, ctx) {
  const world_pos = o.pos; // Use direct world coordinates since canvas is already transformed
  const world_radius = o.radius;

  // Everything visual lives in js/blackHole/render.js, which is handed a
  // position, a drawn radius, this object's appearance and a clock. It reads
  // no settings and no state of its own, so what is drawn here is entirely
  // determined by those four things - which is what makes the picture
  // reproducible and what keeps a rendering choice from reaching the
  // integrator.
  //
  // The three global toggles stay visibility controls and nothing more:
  // `show_accretion_disk` and `show_bh_jets` can hide what the object's
  // environment would otherwise show, and neither can conjure a disk onto a
  // quiescent hole. Whether a black hole HAS a disk is a property of the
  // scenario, not of the renderer.
  const bhLevel = lodOf(o, 'BlackHole');
  const wanted = o.appearance || defaultAppearance(o.id);
  const shown = {
    ...wanted,
    environment: physicsSettings.show_accretion_disk
      ? wanted.environment
      : ENVIRONMENT.QUIESCENT,
    jetStrength: physicsSettings.show_bh_jets ? wanted.jetStrength : 0,
  };

  const renderer = ensureBlackHoleRenderer();
  if (renderer && lodAtLeast(bhLevel, LOD.SHADED)) {
    renderer.drawBlackHole(ctx, {
      at: world_pos,
      unit: world_radius,
      appearance: shown,
      // The simulation's own clock, so pausing freezes the flow and two runs
      // of the same scenario draw the same frame. Never Date.now().
      time: visualClockSeconds(),
      tier: lodAtLeast(bhLevel, LOD.DETAILED) ? 'full' : 'low',
      alpha: 1,
    });
  } else {
    // Far away or on the low tier: the silhouette and nothing else. It used
    // to carry a pale ring here too, and it is gone for the same reason it
    // is gone from the renderer - a horizon does not glow at its edge. What
    // finds a dark object is the hover and selection ring, which is drawn in
    // js/render.js as UI, and the mass label below.
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(world_pos.x, world_pos.y, world_radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  // "Explain this view": labels on the parts of the picture. Off unless
  // asked for, because a diagram covered in captions is not a sandbox.
  if (
    renderer &&
    physicsSettings.bh_explain_view &&
    lodAtLeast(bhLevel, LOD.SHADED)
  ) {
    ctx.save();
    ctx.font = `${Math.max(9, world_radius * 0.22)}px ui-monospace, monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // The one boundary the picture is allowed to show, and only here: a
    // dashed line on a labeled diagram, at the silhouette's edge. See
    // drawHorizonBoundary in js/blackHole/render.js for why it is not drawn
    // the rest of the time.
    renderer.drawHorizonBoundary(
      ctx,
      world_pos,
      world_radius,
      1 / (state.zoom || 1)
    );
    for (const mark of renderer.annotations(shown, world_radius)) {
      const x = world_pos.x + mark.x;
      const y = world_pos.y + mark.y;
      ctx.strokeStyle = 'rgba(160,200,255,0.75)';
      ctx.lineWidth = Math.max(0.4, world_radius * 0.02);
      ctx.beginPath();
      ctx.arc(x, y, mark.r * 0.35, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + mark.r * 0.35, y);
      ctx.lineTo(x + mark.r * 0.9, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(210,230,255,0.95)';
      ctx.fillText(t(`inspector.bh.label.${mark.key}`), x + mark.r * 1.0, y);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const true_screen_pos = world_to_screen(world_pos);
  const screen_radius = world_radius * state.zoom;
  let label_y_offset = screen_radius + 15;
  if (physicsSettings.show_bh_jets) {
    label_y_offset = screen_radius * 6 + screen_radius + 10;
  } else if (physicsSettings.show_accretion_disk) {
    label_y_offset = screen_radius * 2.5 + 10;
  } else if (physicsSettings.show_bh_glow) {
    label_y_offset = screen_radius * 1.8 + 10;
  }
  ctx.font = '14px Roboto Mono';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 4;
  // Significant figures rather than one decimal place: a stellar-mass hole
  // reads 9.80 and a supermassive one reads 1.00 x 10^6 instead of 1000000.0.
  const massStr = formatNumber(o.mass / SOLAR_MASS_UNIT);
  drawSolarLabel(
    ctx,
    massStr,
    true_screen_pos.x,
    true_screen_pos.y + label_y_offset
  );
  ctx.restore();
}

/**
 * Draw the nucleus, the coma and the tail.
 *
 * In world coordinates, like every other body: the render pass has already
 * applied the pan, the zoom and the reference-frame offset to the context.
 * This used to convert to screen coordinates first and then draw through that
 * transform, which puts a comet at roughly (zoom * pos + pan + half a canvas)
 * instead of at pos. Nothing caught it because js/render.js never called this
 * at all - `comets` was not among the collections it drew - so the Solar
 * System's ten comets and every hand-placed one were simply absent.
 *
 * The nucleus is held at the shared screen-space floor, the same way an
 * asteroid's is. A comet's physical radius is a fraction of a world unit and
 * covers well under a pixel at any zoom a scenario opens at, so without the
 * floor a placed comet is invisible and unclickable. The floor is a drawing
 * decision only: `this.radius` is what collisions, tidal disruption and the
 * inspector read, and it is untouched.
 *
 * @param {CanvasRenderingContext2D} ctx - The world-transformed context
 */
function drawComet(o, ctx) {
  const world_pos = o.pos;
  const r = drawRadius(o, 'Comet');
  const z = (state && state.zoom) || 1;
  const level = lodOf(o, 'Comet');

  // Where the light is, which is what a comet's appearance is entirely about.
  // The tails are not exhaust: the ion tail is blown radially outward by the
  // stellar wind and points away from the star whichever way the comet is
  // traveling, and there is no coma at all until something warms the ice.
  const sun = dominantStarFor(world_pos);
  const activity = sun
    ? tailActivity(
        relativeInsolation(
          sun.luminosity,
          simToAu(Math.hypot(world_pos.x - sun.pos.x, world_pos.y - sun.pos.y))
        )
      )
    : 0;

  ctx.save();

  if (activity > 0 && lodAtLeast(level, LOD.SHADED)) {
    drawTails(o, ctx, world_pos, r, z, sun, activity);
    drawComa(ctx, world_pos, r, activity);
  }

  // The nucleus. Always drawn, at the shared screen-space floor, so a comet
  // in the outer system is a visible speck rather than nothing - which is
  // what it looks like through a telescope, and what makes it clickable.
  ctx.fillStyle = activity > 0 ? '#f4f4ef' : '#cfd3d8';
  ctx.beginPath();
  ctx.arc(world_pos.x, world_pos.y, r, 0, 2 * Math.PI);
  ctx.fill();

  ctx.restore();

  // The label is text, and text has to be drawn in screen space or the
  // render pass's flipped Y axis renders it upside down. Same shape as the
  // planet's and the star's: reset the transform, draw, put it back.
  if (r * z > 4) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const true_screen_pos = world_to_screen(world_pos);
    ctx.font = '10px Roboto Mono';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 2;
    ctx.fillText(
      withUnit(formatNumber(o.massInComets), 'C'),
      true_screen_pos.x,
      true_screen_pos.y + r * z + 12
    );
    ctx.restore();
  }
}

/**
 * The coma: the halo of gas and dust boiled off the nucleus.
 *
 * Grows with activity, so the same comet swells as it comes in and shrinks
 * as it leaves. Drawn as a single radial gradient rather than a sprite
 * because its radius changes continuously with activity, which is exactly
 * the case a size-bucketed sprite cache serves badly.
 *
 * @param {CanvasRenderingContext2D} ctx - World-transformed context
 * @param {{x: number, y: number}} at - The nucleus
 * @param {number} r - Drawn nucleus radius, world units
 * @param {number} activity - 0 to 1
 */
function drawComa(ctx, at, r, activity) {
  const coma = r * (1.6 + 4.5 * activity);
  const grad = ctx.createRadialGradient(at.x, at.y, r * 0.5, at.x, at.y, coma);
  grad.addColorStop(0, `rgba(214,244,255,${0.5 * activity})`);
  grad.addColorStop(0.45, `rgba(170,225,245,${0.22 * activity})`);
  grad.addColorStop(1, 'rgba(150,200,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(at.x, at.y, coma, 0, 2 * Math.PI);
  ctx.fill();
}

/**
 * The two tails.
 *
 * A comet has two, they point in different directions, and telling them
 * apart is most of what there is to learn from the picture:
 *
 *   The ion tail is gas, ionized and swept straight out by the stellar wind.
 *   It is narrow, blue, and points directly away from the star - which means
 *   that on the way out of the system it leads rather than follows. This is
 *   the part the old drawing had backwards: it pointed the tail opposite the
 *   comet's velocity, which is the picture students already hold and which
 *   the real geometry contradicts.
 *
 *   The dust tail is grains, heavy enough that the wind only nudges them.
 *   They leave with the nucleus's own orbital motion and fall behind, so the
 *   tail lies between anti-solar and the orbital trail and curves along the
 *   orbit. Broader, yellower, and drawn as an arc so the curve reads.
 *
 * Geometry from js/bodyVisuals.js, which is where it is tested.
 *
 * @param {CanvasRenderingContext2D} ctx - World-transformed context
 * @param {{x: number, y: number}} at - The nucleus
 * @param {number} r - Drawn nucleus radius, world units
 * @param {number} z - Current zoom
 * @param {Object} sun - The dominant light source
 * @param {number} activity - 0 to 1
 */
function drawTails(o, ctx, at, r, z, sun, activity) {
  // `tailLength` was written as screen pixels at zoom 1, so it carries over
  // to world units one for one. Capped so a zoomed-in comet does not streak
  // across the whole canvas, floored so a zoomed-out one is not swallowed by
  // its own nucleus.
  const len = Math.max(
    Math.min(o.tailLength, 140 / z) * activity,
    r * 4 * activity
  );
  if (!(len > 0)) return;

  const ion = ionTailDirection(at, sun.pos, o.vel);
  if (!ion) return;

  // --- the ion tail: straight, narrow, away from the star ---
  const ionEnd = { x: at.x + ion.x * len, y: at.y + ion.y * len };
  const ionGrad = ctx.createLinearGradient(at.x, at.y, ionEnd.x, ionEnd.y);
  ionGrad.addColorStop(0, `rgba(190,235,255,${0.55 * activity})`);
  ionGrad.addColorStop(0.4, `rgba(140,200,255,${0.28 * activity})`);
  ionGrad.addColorStop(1, 'rgba(120,170,255,0)');
  const halfWidth = r * 0.9;
  ctx.fillStyle = ionGrad;
  ctx.beginPath();
  ctx.moveTo(at.x - ion.y * halfWidth, at.y + ion.x * halfWidth);
  ctx.lineTo(ionEnd.x, ionEnd.y);
  ctx.lineTo(at.x + ion.y * halfWidth, at.y - ion.x * halfWidth);
  ctx.closePath();
  ctx.fill();

  // --- the dust tail: broader, yellower, curved along the orbit ---
  // Sampled rather than drawn as one wedge, because the whole point is that
  // it bends: each step asks bodyVisuals for the direction at that fraction
  // of the way out and walks along it.
  const dustLen = len * 0.8;
  const steps = 6;
  const spine = [];
  let px = at.x;
  let py = at.y;
  for (let i = 1; i <= steps; i++) {
    const f = i / steps;
    const dir = dustTailDirection(at, sun.pos, o.vel, f);
    if (!dir) break;
    px += (dir.x * dustLen) / steps;
    py += (dir.y * dustLen) / steps;
    spine.push({ x: px, y: py, f });
  }
  if (spine.length < 2) return;

  const dustGrad = ctx.createLinearGradient(
    at.x,
    at.y,
    spine[spine.length - 1].x,
    spine[spine.length - 1].y
  );
  dustGrad.addColorStop(0, `rgba(255,238,205,${0.4 * activity})`);
  dustGrad.addColorStop(0.5, `rgba(240,215,170,${0.18 * activity})`);
  dustGrad.addColorStop(1, 'rgba(220,200,160,0)');

  // One closed path down one edge and back up the other, widening with
  // distance the way a real dust fan does.
  const widthAt = f => r * (1.1 + 2.6 * f);
  ctx.fillStyle = dustGrad;
  ctx.beginPath();
  ctx.moveTo(at.x, at.y);
  for (const pt of spine) {
    const prev = spine[spine.indexOf(pt) - 1] || at;
    const tx = pt.x - prev.x;
    const ty = pt.y - prev.y;
    const d = Math.hypot(tx, ty) || 1;
    const w = widthAt(pt.f);
    ctx.lineTo(pt.x - (ty / d) * w, pt.y + (tx / d) * w);
  }
  for (let i = spine.length - 1; i >= 0; i--) {
    const pt = spine[i];
    const prev = spine[i - 1] || at;
    const tx = pt.x - prev.x;
    const ty = pt.y - prev.y;
    const d = Math.hypot(tx, ty) || 1;
    const w = widthAt(pt.f);
    ctx.lineTo(pt.x + (ty / d) * w, pt.y - (tx / d) * w);
  }
  ctx.closePath();
  ctx.fill();
}

// Where the glow goes is the page's to say (js/render.js), passed through here so
// that importing the drawers is what registers them.
export { setBloomLayer };

registerBodyDrawers({
  Planet: drawPlanet,
  GasGiant: drawGasGiant,
  Asteroid: drawAsteroid,
  Debris: drawDebris,
  Comet: drawComet,
  BlackHole: drawBlackHole,
});
