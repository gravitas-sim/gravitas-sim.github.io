// Transit Photometry Light Curve Module
// -----------------------------------------------------------------------------
// Computes real-time light curves with limb darkening, secondary eclipses,
// and phase curves.
//
// Where the radii come from matters, because the transit lesson asks students
// to recover a planet radius from a depth and then checks their answer. A body
// that carries an explicit physical radius (radiusInSuns, radiusInEarths,
// radiusInJupiters) is measured with it; everything else falls back to a
// mass-radius relation, which is all a sandbox scenario can offer. Scenarios
// built for the lesson set the explicit values *and* draw their bodies at the
// matching relative size, so the depth a student measures, the radius ratio it
// implies and the silhouette on screen are all the same number.
//
// Multi-star systems are summed with luminosity weights, so a companion star
// dilutes a transit by exactly the factor real blended photometry suffers from.
// That is not a special case bolted on for the lesson: it falls out of adding
// the light up correctly.

import { chartColors } from './observationChart.js';
import { mountObserverControls } from './observerControls.js';
import {
  layoutObservationPanels,
  noteObservationPanelUsed,
} from './observationLayout.js';
import {
  observerGeometry,
  getPositionAngle,
  setPositionAngle,
} from './observerGeometry.js';
import { ensureChartJs } from './chartjs.js';
import {
  stars,
  planets,
  gas_giants,
  bh_list,
  neutron_stars,
  white_dwarfs,
  asteroids,
  world_to_screen,
} from './physics.js';
import { state } from './appState.js';
import { getSimClock } from './timeline.js';
import { timeUnitSeconds } from './units.js';
// Aliased: `t` is already the chart palette in this module, and a translator
// called on a colour object is a crash rather than a wrong word.
import { t as translate } from './i18n/index.js';

let enabled = false;
// The observer used to live here. It now lives in js/observerGeometry.js,
// because photometry is no longer the only instrument that depends on where you
// are standing: radial velocity and astrometry need the same answer. What stays
// here is the snapshot used to notice that the observer moved, which is when
// recorded photometry stops describing the geometry it was taken from.
let prevAngleSnapshot = 0;
let chart = null;
let chartCanvas = null;
let simTime = 0;
let lastBrightness = 1;
let isDraggingHandle = false;
let handleScreenPos = { x: 0, y: 0 };

const HANDLE_RADIUS = 14;
// A hot Jupiter's transit lasts a few percent of its orbit, so a window that
// holds only one period shows one dip and no way to time the next. Sampling
// every frame keeps about thirty points inside a transit that goes past in half
// a second, and 2000 of them hold half a minute of wall clock: two or three
// transits of the lesson's scenarios, with the shape of each one intact.
const MAX_DATA_POINTS = 2000;
const SAMPLE_INTERVAL = 1;
// Redrawing a 2000-point path sixty times a second is most of a frame's budget
// and none of it is visible, so the chart is repainted at about a tenth of the
// rate the data is recorded at.
const CHART_REDRAW_EVERY = 6;

// Radii, in solar radii.
const R_EARTH_SOLAR = 1 / 109.076;
const R_JUPITER_SOLAR = 1 / 9.7311;
const SECONDS_PER_DAY = 86400;

let frameCounter = 0;
let sampleCounter = 0;

// What the recorded curve contains, kept up to date as samples arrive. A
// student measuring a transit that goes past in half a second cannot read a
// value off the screen at the right instant, and should not have to: real
// photometry is measured off the recording afterwards, which is what this is.
let analysis = { baseline: 1, transits: [] };
const transitLog = [];
let transitsSeen = 0;
let countedThrough = -Infinity;
const TRANSIT_LOG_LIMIT = 400;

const timeLabels = [];
const timeDays = [];
const brightnessValues = [];

let container = null;
let angleSlider = null;
let angleDisplay = null;
let statusLabel = null;

// Quadratic limb-darkening coefficients (Sun-like; Claret 2000)
const LD_U1 = 0.4;
const LD_U2 = 0.26;
const LD_I_AVG = 1 - LD_U1 / 3 - LD_U2 / 6;

// ── Theming ─────────────────────────────────────────────────────────
// Chart.js takes literal colors, so the palette has to be read out of the
// design tokens and pushed back in whenever the theme changes. Left hardcoded,
// the grid lines were white at 4% opacity, which is invisible on the two light
// themes: exactly the panel a student is asked to read numbers off.

function repaintChart() {
  if (!chart) return;
  const t = chartColors();
  const set = chart.data.datasets[0];
  set.borderColor = t.accent;
  set.backgroundColor = t.accentSoft;
  for (const axis of [chart.options.scales.x, chart.options.scales.y]) {
    axis.title.color = t.label;
    axis.ticks.color = t.tick;
    axis.grid.color = t.grid;
  }
  chart.update('none');
}

// ── Initialization ──────────────────────────────────────────────────

export function initLightCurve() {
  container = document.getElementById('lightCurveContainer');
  // The bespoke angle slider that used to live here has been replaced by the
  // shared observer control, so that this panel, radial velocity and astrometry
  // are demonstrably driving one observer rather than three that happen to
  // agree. It also gains an inclination control it never had.
  const controlHost = document.getElementById('lightCurveObserverControls');
  if (controlHost) mountObserverControls(controlHost);
  angleSlider = null;
  angleDisplay = null;
  statusLabel = document.getElementById('lightCurveStatus');

  // The controls work whether or not the chart library ever arrives.
  wireLightCurveControls();

  // The chart itself waits until the panel is opened. Nothing else in this
  // module needs it: every path that touches `chart` already returns early when
  // it is null, because that was already the state before initialization.
  chartCanvas = document.getElementById('lightCurveCanvas');
}

/**
 * Create the chart once Chart.js has arrived.
 *
 * Split out of initLightCurve() so start-up does not wait on a 70KB CDN script
 * for a panel that is closed. Everything else in the module already tolerates a
 * missing chart: repaintChart() and the update path both return early on null.
 *
 * @param {HTMLCanvasElement} chartCanvas - The light-curve canvas
 */
async function buildChart(chartCanvas) {
  const Chart = await ensureChartJs();
  if (!Chart || chart) return;

  const ctx2 = chartCanvas.getContext('2d');
  const t = chartColors();
  chart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [
        {
          label: translate('lightCurve.relativeBrightness'),
          data: brightnessValues,
          borderColor: t.accent,
          backgroundColor: t.accentSoft,
          fill: true,
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time (days)',
            color: t.label,
            font: { size: 10 },
          },
          ticks: { color: t.tick, maxTicksLimit: 6, font: { size: 9 } },
          grid: { color: t.grid },
        },
        y: {
          title: {
            display: true,
            text: 'Brightness',
            color: t.label,
            font: { size: 10 },
          },
          ticks: { color: t.tick, font: { size: 9 } },
          grid: { color: t.grid },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          mode: 'nearest',
          intersect: false,
          callbacks: {
            label: item => `Brightness: ${Number(item.raw).toFixed(6)}`,
          },
        },
      },
    },
  });

  // The chart is created after the panel's colors are known, so it starts in
  // the active theme rather than repainting on the first frame.
  repaintChart();
}

/** Wire the panel's controls. Independent of whether the chart exists. */
function wireLightCurveControls() {
  if (angleSlider) {
    angleSlider.addEventListener('input', e => {
      setPositionAngle(parseFloat(e.target.value));
      const observerAngleDeg = getPositionAngle();
      if (angleDisplay)
        angleDisplay.textContent = `${Math.round(observerAngleDeg)}°`;
    });
  }

  const toggleBtn = document.getElementById('toggleLightCurve');
  if (toggleBtn) toggleBtn.addEventListener('click', toggle);

  const closeBtn = document.getElementById('closeLightCurve');
  if (closeBtn) closeBtn.addEventListener('click', () => setEnabled(false));

  const clearBtn = document.getElementById('clearLightCurve');
  if (clearBtn) clearBtn.addEventListener('click', clearData);

  const infoBtn = document.getElementById('lightCurveInfoBtn');
  const infoOverlay = document.getElementById('lightCurveInfoOverlay');
  const infoClose = document.getElementById('lightCurveInfoClose');
  if (infoBtn && infoOverlay) {
    infoBtn.addEventListener('click', () => {
      infoOverlay.style.display =
        infoOverlay.style.display === 'none' ? 'flex' : 'none';
    });
  }
  if (infoClose && infoOverlay) {
    infoClose.addEventListener('click', () => {
      infoOverlay.style.display = 'none';
    });
  }

  // A rebuild restarts the simulation clock, so samples taken before it belong
  // to a different world and would plot on top of the new ones.
  window.addEventListener('gravitasSimulationReset', clearData);
  window.addEventListener('gravitasThemeChanged', repaintChart);

  setupCanvasInteraction();
}

// ── Toggle / Enable / Disable ───────────────────────────────────────

function toggle() {
  setEnabled(!enabled);
}

function setEnabled(next) {
  // Opening the panel starts a fresh observing run. Keeping the old samples
  // would join the last point before it closed to the first point after with a
  // straight line across however much time went by, which on a light curve
  // reads as "nothing happened" rather than "nobody was watching".
  if (next && !enabled) clearData();
  enabled = next;
  if (container) container.style.display = enabled ? '' : 'none';
  if (enabled) noteObservationPanelUsed('lightCurveContainer');
  // Every path that opens or closes this panel comes through here - the toggle
  // button, the close button and the public setter - so this is the one place
  // the observing stack can be re-laid out without being bypassed.
  layoutObservationPanels();

  // First time the panel is opened: fetch Chart.js and build the chart. Until
  // then the 70KB library has not been downloaded at all.
  if (enabled && chartCanvas && !chart) buildChart(chartCanvas);

  const toggleBtn = document.getElementById('toggleLightCurve');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-pressed', String(enabled));
    toggleBtn.dataset.state = enabled ? 'on' : 'off';
    toggleBtn.textContent = enabled ? 'Hide Light Curve' : 'Light Curve';
  }

  if (statusLabel) statusLabel.textContent = enabled ? 'Active' : 'Hidden';

  // The guided lessons lay themselves out around it, and it can be toggled from
  // the Tools menu at any moment, so the state has to be announced.
  window.dispatchEvent(
    new CustomEvent('gravitasLightCurveToggled', { detail: { enabled } })
  );

  if (enabled && chart) {
    setTimeout(() => chart.resize(), 50);
  }
}

function clearData() {
  timeLabels.length = 0;
  timeDays.length = 0;
  brightnessValues.length = 0;
  transitLog.length = 0;
  analysis = { baseline: 1, transits: [] };
  transitsSeen = 0;
  countedThrough = -Infinity;
  simTime = 0;
  if (chart) chart.update('none');
}

export function isLightCurveEnabled() {
  return enabled;
}

// ── Physical radius helpers ─────────────────────────────────────────

function stellarPhysicalRadius(star) {
  // An explicit radius always wins: the mass-radius relation below is a
  // main-sequence approximation, and a scenario that names a real star knows
  // better than it does.
  if (Number.isFinite(star.radiusInSuns) && star.radiusInSuns > 0) {
    return star.radiusInSuns;
  }
  const m = star.massInSuns || 1;
  return Math.pow(Math.max(0.1, m), 0.8); // solar radii, MS approx
}

function stellarLuminosity(star) {
  if (Number.isFinite(star.luminosityInSuns) && star.luminosityInSuns > 0) {
    return star.luminosityInSuns;
  }
  const m = star.massInSuns || 1;
  return Math.pow(Math.max(0.1, m), 3.5);
}

function physicalRadiusRatio(obj, Rs_phys) {
  // k = Rp_physical / Rs_physical
  if (Number.isFinite(obj.radiusInJupiters) && obj.radiusInJupiters > 0) {
    return (obj.radiusInJupiters * R_JUPITER_SOLAR) / Rs_phys;
  }
  if (Number.isFinite(obj.radiusInEarths) && obj.radiusInEarths > 0) {
    return (obj.radiusInEarths * R_EARTH_SOLAR) / Rs_phys;
  }
  if (obj.massInJupiters !== undefined) {
    const Rp = 0.1005 * Math.pow(Math.max(0.1, obj.massInJupiters), 0.06);
    return Rp / Rs_phys;
  }
  if (obj.massInEarths !== undefined) {
    const Rp = 0.00916 * Math.pow(Math.max(0.1, obj.massInEarths), 0.27);
    return Rp / Rs_phys;
  }
  if (obj.pulsar_period !== undefined) return 0.000015 / Rs_phys;
  if (obj.cooling_age !== undefined) {
    const m = obj.massInSuns || 0.6;
    return (0.009 * Math.pow(m, -1 / 3)) / Rs_phys;
  }
  if (obj.obj_type === 'Asteroid') return 0.0001 / Rs_phys;
  return 0.00005 / Rs_phys; // BH event horizon - negligible
}

function objectAlbedo(obj) {
  if (obj.massInJupiters !== undefined) return 0.12;
  if (obj.massInEarths !== undefined) return 0.3;
  return 0.05;
}

// ── Limb-darkened intensity at normalized radius r/Rs ───────────────

function limbDarkenedIntensity(b) {
  const bCl = Math.min(Math.abs(b), 1);
  const mu = Math.sqrt(Math.max(0, 1 - bCl * bCl));
  return 1 - LD_U1 * (1 - mu) - LD_U2 * (1 - mu) * (1 - mu);
}

// ── Lambertian sphere phase function ────────────────────────────────

function lambertianPhase(alpha) {
  // alpha: phase angle (0 = full, π = new/transit)
  const a = Math.max(0, Math.min(Math.PI, alpha));
  return (Math.sin(a) + (Math.PI - a) * Math.cos(a)) / Math.PI;
}

// ── Circle-circle overlap area ──────────────────────────────────────

function circleOverlapArea(R, r, d) {
  if (d >= R + r) return 0;
  if (d <= Math.abs(R - r)) {
    const small = Math.min(R, r);
    return Math.PI * small * small;
  }
  const R2 = R * R,
    r2 = r * r,
    d2 = d * d;
  const alpha = Math.acos(
    Math.min(1, Math.max(-1, (d2 + R2 - r2) / (2 * d * R)))
  );
  const beta = Math.acos(
    Math.min(1, Math.max(-1, (d2 + r2 - R2) / (2 * d * r)))
  );
  const sqrtTerm = (-d + R + r) * (d + R - r) * (d - R + r) * (d + R + r);
  return R2 * alpha + r2 * beta - 0.5 * Math.sqrt(Math.max(0, sqrtTerm));
}

// ── Primary transit depth (limb-darkened, realistic k) ──────────────

function transitDip(k, b, Rs_sim, Rp_sim, sep) {
  // k: physical Rp/Rs  |  b: sep/Rs_sim (visual impact param)
  const k_sim = Rp_sim / Rs_sim;
  if (b >= 1 + k_sim) return 0;

  // Fraction of visual planet disk that overlaps the visual star disk
  let onDiskFrac;
  if (b + k_sim <= 1) {
    onDiskFrac = 1;
  } else {
    const area = circleOverlapArea(Rs_sim, Rp_sim, sep);
    onDiskFrac = area / (Math.PI * Rp_sim * Rp_sim);
  }

  const I_local = limbDarkenedIntensity(b);
  return k * k * (I_local / LD_I_AVG) * onDiskFrac;
}

// ── Occultation fraction (planet hidden behind star) ────────────────

function occultationFrac(Rs_sim, Rp_sim, sep) {
  if (sep >= Rs_sim + Rp_sim) return 0;
  if (sep <= Rs_sim - Rp_sim) return 1;
  const area = circleOverlapArea(Rs_sim, Rp_sim, sep);
  return area / (Math.PI * Rp_sim * Rp_sim);
}

// ── Planet flux (reflected + thermal, relative to star) ─────────────

function planetFlux(obj, star, k, distSim, alpha) {
  const Rs_sim = star.radius;
  const ag = objectAlbedo(obj);

  // (Rs/distance) factor - how much starlight the planet intercepts
  const distFactor = Rs_sim / Math.max(distSim, Rs_sim * 2);

  // Reflected component: Ag · k² · (Rs/a)² · Φ(α)
  const reflected =
    ag * k * k * distFactor * distFactor * lambertianPhase(alpha);

  // Thermal re-emission: (Tp/Ts)⁴ · (Rp/Rs)² ≈ (Rs/2a)² · (1-Ag) · k²
  const thermal = 0.25 * (1 - ag) * distFactor * distFactor * k * k;

  return reflected + thermal;
}

// ── Main brightness calculation ─────────────────────────────────────

function calculateBrightness() {
  // Shared geometry. At the default inclination of 90 degrees cosA and sinA are
  // exactly the values this function used when it owned the angle itself, so
  // the edge-on results are unchanged rather than approximately reproduced.
  const geometry = observerGeometry();
  const cosA = geometry.cosPhi;
  const sinA = geometry.sinPhi;
  const cosI = geometry.cosI;
  const sinI = geometry.sinI;

  const liveStars = stars.filter(s => s.alive);
  if (liveStars.length === 0) return 1.0;

  // Total luminosity for weighting multi-star systems
  let totalLum = 0;
  for (const star of liveStars) totalLum += stellarLuminosity(star);
  if (totalLum === 0) return 1.0;

  const allObjects = [
    ...planets,
    ...gas_giants,
    ...asteroids,
    ...bh_list,
    ...neutron_stars,
    ...white_dwarfs,
  ].filter(o => o.alive);

  let flux = 1.0; // normalized stellar baseline

  for (const star of liveStars) {
    const w = stellarLuminosity(star) / totalLum; // luminosity weight
    const Rs_phys = stellarPhysicalRadius(star);
    const Rs_sim = star.radius;

    for (const obj of allObjects) {
      if (obj === star) continue;

      const dx = obj.pos.x - star.pos.x;
      const dy = obj.pos.y - star.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1e-6) continue;

      const k = physicalRadiusRatio(obj, Rs_phys);
      const Rp_sim = obj.radius || 1;

      // LOS depth: positive ⇒ object closer to observer than star.
      // Both quantities are the shared projection written out inline: the
      // per-body cost of calling into observerGeometry.js here would be paid
      // once per planet per frame for no benefit, and the geometry snapshot
      // above already did the trigonometry once.
      const along = dx * cosA + dy * sinA;
      const losDepth = sinI * along;
      // Sky-plane separation. The second term is the foreshortened axis, zero
      // when edge-on: tilt the orbit away from 90 degrees and the planet's
      // track slides off the stellar disk, which is why an inclined system
      // stops transiting without any need for a fake fade.
      const skyX = -dx * sinA + dy * cosA;
      const skyY = -cosI * along;
      const sep = Math.hypot(skyX, skyY);
      const b = sep / Rs_sim; // normalized impact parameter on visual disk

      // Phase angle at planet: 0 = full (behind star), π = transit
      const cosAlpha = Math.max(-1, Math.min(1, -losDepth / dist));
      const alpha = Math.acos(cosAlpha);

      // Phase-dependent planet flux contribution
      const pFlux = planetFlux(obj, star, k, dist, alpha);

      // ── Primary transit ──
      if (losDepth > 0 && sep < Rs_sim + Rp_sim) {
        flux -= w * transitDip(k, b, Rs_sim, Rp_sim, sep);
      }

      // ── Secondary eclipse (occultation) ──
      let occ = 0;
      if (losDepth < 0 && sep < Rs_sim + Rp_sim) {
        occ = occultationFrac(Rs_sim, Rp_sim, sep);
      }

      // Add planet's visible flux (reduced during occultation)
      flux += w * pFlux * (1 - occ);
    }
  }

  return Math.max(0, flux);
}

// ── Per-frame update ────────────────────────────────────────────────

export function updateLightCurve() {
  if (!enabled || state.paused) return;

  // Clear chart when observer angle changes
  if (Math.abs(getPositionAngle() - prevAngleSnapshot) > 0.5) {
    clearData();
    prevAngleSnapshot = getPositionAngle();
  }

  frameCounter++;
  if (frameCounter % SAMPLE_INTERVAL !== 0) return;

  // The shared simulation clock, not a private accumulator: a lesson that asks
  // students to time successive transits stamps the same clock, so the number
  // under the dip and the number they write down are the same quantity.
  simTime = getSimClock();
  lastBrightness = calculateBrightness();

  timeDays.push(simTimeToDays(simTime));
  timeLabels.push(timeDays[timeDays.length - 1].toFixed(2));
  brightnessValues.push(lastBrightness);

  while (timeLabels.length > MAX_DATA_POINTS) {
    timeLabels.shift();
    timeDays.shift();
    brightnessValues.shift();
  }

  sampleCounter++;
  // Often enough that no transit can enter and leave the window uncounted,
  // rarely enough that the sort in the median costs nothing.
  if (sampleCounter % 15 === 0) analyseCurve();
  if (sampleCounter % CHART_REDRAW_EVERY !== 0) return;

  if (chart && brightnessValues.length > 1) {
    let minB = Infinity;
    let maxB = -Infinity;
    for (const v of brightnessValues) {
      if (v < minB) minB = v;
      if (v > maxB) maxB = v;
    }
    const range = maxB - minB;
    const margin = Math.max(range * 0.3, 0.0001);
    chart.options.scales.y.min = Math.max(0, minB - margin);
    chart.options.scales.y.max = maxB + margin;
    chart.update('none');
  }
}

// ── Finding the transits in the recording ───────────────────────────

/** Middle value of a copy of the samples. */
function median(values) {
  if (!values.length) return 1;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Find every complete transit in the recorded curve.
 *
 * The baseline is the median rather than the maximum, because a transit
 * occupies a few percent of an orbit and the phase curve makes the maximum
 * drift: the median is the level the star spends nearly all its time at, which
 * is exactly what a photometrist means by out of transit.
 *
 * A dip only counts as a transit if it is deep against the curve's own
 * variability. Without that test, a window that happens to contain no transit
 * has its threshold set by whatever the deepest thing in it is, and the
 * secondary eclipse gets reported as a transit at half the period. It is about
 * seven times the scatter; a real transit is hundreds of times it.
 *
 * The middle of a transit is taken as the midpoint of its two half-depth
 * crossings rather than the position of the lowest sample, which is the
 * standard estimator and far steadier when the floor is flat.
 *
 * Runs touching either end of the window are skipped. One of them is a transit
 * still in progress and the other started before the recording did, and
 * reporting either would give a depth and a mid-time from half an event.
 */
function analyseCurve() {
  const n = brightnessValues.length;
  if (n < 24) return;

  const baseline = median(brightnessValues);
  analysis = { baseline, transits: [] };

  // Robust scatter of the curve about its baseline. The transit samples are a
  // few percent of the total, so they barely move a median.
  const spread =
    1.4826 * median(brightnessValues.map(v => Math.abs(v - baseline)));
  const noise = Math.max(spread, 1e-9);
  const entry = baseline - Math.max(8 * noise, 1e-7);

  let start = -1;
  for (let i = 0; i < n; i++) {
    const below = brightnessValues[i] < entry;
    if (below && start < 0) {
      start = i;
    } else if (!below && start >= 0) {
      addTransit(start, i - 1, baseline, noise);
      start = -1;
    }
  }

  for (const t of analysis.transits) {
    if (t.mid <= countedThrough + 1e-9) continue;
    countedThrough = t.mid;
    transitsSeen++;
    transitLog.push({ ...t, seq: transitsSeen });
    if (transitLog.length > TRANSIT_LOG_LIMIT) transitLog.shift();
  }
}

/**
 * Record one dip as a transit, if it is deep enough and complete.
 *
 * The depth test is per-dip rather than against the deepest dip in the window,
 * so a compact system whose planets differ in size by a factor of two has all
 * of its transits found rather than only the big ones.
 */
function addTransit(first, last, baseline, noise) {
  if (first === 0) return; // began before the recording did
  if (last >= brightnessValues.length - 1) return; // still going on
  if (last - first + 1 < 3) return; // too few samples to be a shape

  let bottom = Infinity;
  for (let i = first; i <= last; i++) {
    if (brightnessValues[i] < bottom) bottom = brightnessValues[i];
  }
  const depth = baseline - bottom;
  // A planet crossing the disk is hundreds of times the scatter. A secondary
  // eclipse, where the star hides the planet's own light, is about seven.
  if (depth < 25 * noise) return;

  const half = baseline - depth / 2;
  let a = -1;
  let b = -1;
  for (let i = first; i <= last; i++) {
    if (brightnessValues[i] >= half) continue;
    if (a < 0) a = i;
    b = i;
  }
  if (a < 0) return;

  analysis.transits.push({
    mid: (timeDays[a] + timeDays[b]) / 2,
    bottom,
    depth,
    duration: timeDays[last] - timeDays[first],
  });
}

/**
 * What the recording says, for a lesson that wants to reason about it.
 *
 * @returns {Object} baseline, the complete transits still inside the window,
 *   how many have gone past since the recording started, and the log of them
 * @property {number} baseline - Out-of-transit level
 * @property {Array} transits - Complete transits in the current window
 * @property {number} seen - Running count since the recording was last cleared
 * @property {Array} log - The counted transits, each with its sequence number
 * @property {Object|null} last - The most recent complete transit
 */
export function transitAnalysis() {
  return {
    baseline: analysis.baseline,
    transits: analysis.transits.map(t => ({ ...t })),
    seen: transitsSeen,
    log: transitLog.map(t => ({ ...t })),
    last: transitLog.length ? { ...transitLog[transitLog.length - 1] } : null,
  };
}

// ── Read-out API, used by the guided lessons ────────────────────────

/** @returns {number} Days represented by a simulation time value */
function simTimeToDays(t) {
  return (t * timeUnitSeconds()) / SECONDS_PER_DAY;
}

/**
 * The brightness a photometer would read right now.
 *
 * Computed fresh rather than returning the last sample, so a paused simulation
 * still answers, which is what a student parked on the bottom of a dip needs.
 *
 * @returns {number} Relative flux, 1.0 outside any eclipse
 */
export function currentBrightness() {
  return enabled ? calculateBrightness() : lastBrightness;
}

/** @returns {number} Simulation clock, in days */
export const currentTimeDays = () => simTimeToDays(getSimClock());

/** @returns {number} Observer direction, in degrees */
/**
 * The observer's position angle.
 *
 * Kept as a thin wrapper because investigations.js and lesson steps already
 * call it. The state itself is in observerGeometry.js.
 *
 * @returns {number} Position angle in degrees
 */
export const getObserverAngle = () => getPositionAngle();

/**
 * Point the observer somewhere.
 * @param {number} deg - Direction in degrees
 */
export function setObserverAngle(deg) {
  setPositionAngle(deg);
  const observerAngleDeg = getPositionAngle();
  prevAngleSnapshot = observerAngleDeg;
  if (angleSlider) angleSlider.value = String(Math.round(observerAngleDeg));
  if (angleDisplay)
    angleDisplay.textContent = `${Math.round(observerAngleDeg)}°`;
}

/**
 * Show or hide the panel from outside.
 * @param {boolean} on - Whether the light curve should be running
 */
export function setLightCurveEnabled(on) {
  if (Boolean(on) !== enabled) setEnabled(Boolean(on));
}

/**
 * The recorded curve, for a lesson that wants to reason about it.
 * @returns {{days:number[], flux:number[]}} Copies of the sample arrays
 */
export const lightCurveSeries = () => ({
  days: [...timeDays],
  flux: [...brightnessValues],
});

/** Throw away the recorded samples and start again. */
export const clearLightCurve = clearData;

// ── Canvas overlay: observer direction indicator ────────────────────

export function drawObserverIndicator(ctx, W, H) {
  if (!enabled) return;

  const angle = (getPositionAngle() * Math.PI) / 180;
  const screenAngle = -angle;

  // Center on the sole star when there is exactly one; otherwise use viewport center
  const liveStars = stars.filter(s => s.alive);
  let cx = W / 2;
  let cy = H / 2;
  if (liveStars.length === 1) {
    const sp = world_to_screen(liveStars[0].pos);
    cx = sp.x;
    cy = sp.y;
  }

  const arrowLen = Math.min(W, H) * 0.38;
  const endX = cx + Math.cos(screenAngle) * arrowLen;
  const endY = cy + Math.sin(screenAngle) * arrowLen;

  ctx.save();

  // Arrow shaft from center toward observer
  ctx.strokeStyle = 'rgba(79, 172, 254, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrowhead
  const headLen = 10;
  const headHalf = Math.PI / 6;
  ctx.fillStyle = 'rgba(79, 172, 254, 0.7)';
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headLen * Math.cos(screenAngle - headHalf),
    endY - headLen * Math.sin(screenAngle - headHalf)
  );
  ctx.lineTo(
    endX - headLen * Math.cos(screenAngle + headHalf),
    endY - headLen * Math.sin(screenAngle + headHalf)
  );
  ctx.closePath();
  ctx.fill();

  // Draggable handle
  handleScreenPos = { x: endX, y: endY };
  ctx.beginPath();
  ctx.arc(endX, endY, HANDLE_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = isDraggingHandle
    ? 'rgba(79, 172, 254, 0.5)'
    : 'rgba(79, 172, 254, 0.2)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(79, 172, 254, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Label
  const labelDist = arrowLen + 22;
  const labelX = cx + Math.cos(screenAngle) * labelDist;
  const labelY = cy + Math.sin(screenAngle) * labelDist;
  ctx.font = '11px Inter, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(79, 172, 254, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Observer', labelX, labelY);

  ctx.restore();
}

// ── Canvas mouse/touch interaction for dragging the handle ──────────

function setupCanvasInteraction() {
  const simCanvas = document.getElementById('simulationCanvas');
  if (!simCanvas) return;

  document.addEventListener(
    'mousedown',
    e => {
      if (!enabled || e.target !== simCanvas) return;
      if (hitTestHandle(e.clientX, e.clientY, simCanvas)) {
        isDraggingHandle = true;
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true
  );

  document.addEventListener(
    'mousemove',
    e => {
      if (!isDraggingHandle) return;
      updateAngleFromPointer(e.clientX, e.clientY, simCanvas);
      e.stopPropagation();
      e.preventDefault();
    },
    true
  );

  document.addEventListener(
    'mouseup',
    () => {
      isDraggingHandle = false;
    },
    true
  );

  document.addEventListener(
    'touchstart',
    e => {
      if (!enabled || e.target !== simCanvas) return;
      const t = e.touches[0];
      if (hitTestHandle(t.clientX, t.clientY, simCanvas)) {
        isDraggingHandle = true;
        e.stopPropagation();
        e.preventDefault();
      }
    },
    { capture: true, passive: false }
  );

  document.addEventListener(
    'touchmove',
    e => {
      if (!isDraggingHandle) return;
      const t = e.touches[0];
      updateAngleFromPointer(t.clientX, t.clientY, simCanvas);
      e.stopPropagation();
      e.preventDefault();
    },
    { capture: true, passive: false }
  );

  document.addEventListener(
    'touchend',
    () => {
      isDraggingHandle = false;
    },
    true
  );
}

function hitTestHandle(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const dx = x - handleScreenPos.x;
  const dy = y - handleScreenPos.y;
  return dx * dx + dy * dy <= HANDLE_RADIUS * HANDLE_RADIUS * 4;
}

function updateAngleFromPointer(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const dx = x - cx;
  const dy = -(y - cy);
  setPositionAngle((Math.atan2(dy, dx) * 180) / Math.PI);
  const observerAngleDeg = getPositionAngle();

  if (angleSlider) angleSlider.value = Math.round(observerAngleDeg);
  if (angleDisplay)
    angleDisplay.textContent = `${Math.round(observerAngleDeg)}°`;
}
