// Transit Photometry Light Curve Module
// Computes real-time light curves with limb darkening, secondary eclipses,
// and phase curves. Uses physically motivated radius ratios for realistic
// transit depths while keeping ingress/egress timing tied to the visual sim.

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
import { state } from './ui.js';

let enabled = false;
let observerAngleDeg = 0;
let prevAngleSnapshot = 0;
let chart = null;
let simTime = 0;
let isDraggingHandle = false;
let handleScreenPos = { x: 0, y: 0 };

const HANDLE_RADIUS = 14;
const MAX_DATA_POINTS = 500;
const SAMPLE_INTERVAL = 3;

let frameCounter = 0;

const timeLabels = [];
const brightnessValues = [];

let container = null;
let angleSlider = null;
let angleDisplay = null;
let statusLabel = null;

// Quadratic limb-darkening coefficients (Sun-like; Claret 2000)
const LD_U1 = 0.40;
const LD_U2 = 0.26;
const LD_I_AVG = 1 - LD_U1 / 3 - LD_U2 / 6;

// ── Initialization ──────────────────────────────────────────────────

export function initLightCurve() {
  container = document.getElementById('lightCurveContainer');
  angleSlider = document.getElementById('observerAngleSlider');
  angleDisplay = document.getElementById('observerAngleDisplay');
  statusLabel = document.getElementById('lightCurveStatus');

  const chartCanvas = document.getElementById('lightCurveCanvas');
  if (!chartCanvas) return;

  const ctx2 = chartCanvas.getContext('2d');
  chart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [
        {
          label: 'Relative Brightness',
          data: brightnessValues,
          borderColor: '#4facfe',
          backgroundColor: 'rgba(79, 172, 254, 0.08)',
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
          title: { display: true, text: 'Time (sim)', color: '#999', font: { size: 10 } },
          ticks: { color: '#666', maxTicksLimit: 6, font: { size: 9 } },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          title: { display: true, text: 'Brightness', color: '#999', font: { size: 10 } },
          ticks: { color: '#666', font: { size: 9 } },
          grid: { color: 'rgba(255,255,255,0.06)' },
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

  if (angleSlider) {
    angleSlider.addEventListener('input', e => {
      observerAngleDeg = parseFloat(e.target.value);
      if (angleDisplay) angleDisplay.textContent = `${Math.round(observerAngleDeg)}°`;
    });
  }

  const toggleBtn = document.getElementById('toggleLightCurve');
  if (toggleBtn) toggleBtn.addEventListener('click', toggle);

  const mobileBtn = document.getElementById('mobileToggleLightCurve');
  if (mobileBtn) mobileBtn.addEventListener('click', toggle);

  const closeBtn = document.getElementById('closeLightCurve');
  if (closeBtn) closeBtn.addEventListener('click', () => setEnabled(false));

  const clearBtn = document.getElementById('clearLightCurve');
  if (clearBtn) clearBtn.addEventListener('click', clearData);

  const infoBtn = document.getElementById('lightCurveInfoBtn');
  const infoOverlay = document.getElementById('lightCurveInfoOverlay');
  const infoClose = document.getElementById('lightCurveInfoClose');
  if (infoBtn && infoOverlay) {
    infoBtn.addEventListener('click', () => {
      infoOverlay.style.display = infoOverlay.style.display === 'none' ? 'flex' : 'none';
    });
  }
  if (infoClose && infoOverlay) {
    infoClose.addEventListener('click', () => {
      infoOverlay.style.display = 'none';
    });
  }

  setupCanvasInteraction();
}

// ── Toggle / Enable / Disable ───────────────────────────────────────

function toggle() {
  setEnabled(!enabled);
}

function setEnabled(next) {
  enabled = next;
  if (container) container.style.display = enabled ? '' : 'none';

  ['toggleLightCurve', 'mobileToggleLightCurve'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.setAttribute('aria-pressed', String(enabled));
  });

  if (statusLabel) statusLabel.textContent = enabled ? 'Active' : 'Hidden';

  if (enabled && chart) {
    setTimeout(() => chart.resize(), 50);
  }
}

function clearData() {
  timeLabels.length = 0;
  brightnessValues.length = 0;
  simTime = 0;
  if (chart) chart.update('none');
}

export function isLightCurveEnabled() {
  return enabled;
}

// ── Physical radius helpers ─────────────────────────────────────────

function stellarPhysicalRadius(star) {
  const m = star.massInSuns || 1;
  return Math.pow(Math.max(0.1, m), 0.8); // solar radii, MS approx
}

function stellarLuminosity(star) {
  const m = star.massInSuns || 1;
  return Math.pow(Math.max(0.1, m), 3.5);
}

function physicalRadiusRatio(obj, Rs_phys) {
  // k = Rp_physical / Rs_physical
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
    return 0.009 * Math.pow(m, -1 / 3) / Rs_phys;
  }
  if (obj.obj_type === 'Asteroid') return 0.0001 / Rs_phys;
  return 0.00005 / Rs_phys; // BH event horizon — negligible
}

function objectAlbedo(obj) {
  if (obj.massInJupiters !== undefined) return 0.12;
  if (obj.massInEarths !== undefined) return 0.30;
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
  const alpha = Math.acos(Math.min(1, Math.max(-1, (d2 + R2 - r2) / (2 * d * R))));
  const beta = Math.acos(Math.min(1, Math.max(-1, (d2 + r2 - R2) / (2 * d * r))));
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

  // (Rs/distance) factor — how much starlight the planet intercepts
  const distFactor = Rs_sim / Math.max(distSim, Rs_sim * 2);

  // Reflected component: Ag · k² · (Rs/a)² · Φ(α)
  const reflected = ag * k * k * distFactor * distFactor * lambertianPhase(alpha);

  // Thermal re-emission: (Tp/Ts)⁴ · (Rp/Rs)² ≈ (Rs/2a)² · (1-Ag) · k²
  const thermal = 0.25 * (1 - ag) * distFactor * distFactor * k * k;

  return reflected + thermal;
}

// ── Main brightness calculation ─────────────────────────────────────

function calculateBrightness() {
  const angle = (observerAngleDeg * Math.PI) / 180;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

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

      // LOS depth: positive ⇒ object closer to observer than star
      const losDepth = dx * cosA + dy * sinA;
      const sep = Math.abs(-dx * sinA + dy * cosA);
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

export function updateLightCurve(dtSim) {
  if (!enabled || state.paused) return;

  // Clear chart when observer angle changes
  if (Math.abs(observerAngleDeg - prevAngleSnapshot) > 0.5) {
    clearData();
    prevAngleSnapshot = observerAngleDeg;
  }

  frameCounter++;
  if (frameCounter % SAMPLE_INTERVAL !== 0) return;

  simTime += dtSim * SAMPLE_INTERVAL;
  const brightness = calculateBrightness();

  timeLabels.push(simTime.toFixed(1));
  brightnessValues.push(brightness);

  while (timeLabels.length > MAX_DATA_POINTS) {
    timeLabels.shift();
    brightnessValues.shift();
  }

  if (chart && brightnessValues.length > 1) {
    const minB = Math.min(...brightnessValues);
    const maxB = Math.max(...brightnessValues);
    const range = maxB - minB;
    const margin = Math.max(range * 0.3, 0.0001);
    chart.options.scales.y.min = Math.max(0, minB - margin);
    chart.options.scales.y.max = maxB + margin;
    chart.update('none');
  }
}

// ── Canvas overlay: observer direction indicator ────────────────────

export function drawObserverIndicator(ctx, W, H) {
  if (!enabled) return;

  const angle = (observerAngleDeg * Math.PI) / 180;
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
    endY - headLen * Math.sin(screenAngle - headHalf),
  );
  ctx.lineTo(
    endX - headLen * Math.cos(screenAngle + headHalf),
    endY - headLen * Math.sin(screenAngle + headHalf),
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
    true,
  );

  document.addEventListener(
    'mousemove',
    e => {
      if (!isDraggingHandle) return;
      updateAngleFromPointer(e.clientX, e.clientY, simCanvas);
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );

  document.addEventListener(
    'mouseup',
    () => {
      isDraggingHandle = false;
    },
    true,
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
    { capture: true, passive: false },
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
    { capture: true, passive: false },
  );

  document.addEventListener(
    'touchend',
    () => {
      isDraggingHandle = false;
    },
    true,
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
  observerAngleDeg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

  if (angleSlider) angleSlider.value = Math.round(observerAngleDeg);
  if (angleDisplay) angleDisplay.textContent = `${Math.round(observerAngleDeg)}°`;
}
