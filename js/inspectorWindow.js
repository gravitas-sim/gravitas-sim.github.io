// =============================================================================
// The inspector window: putting the card on screen, not what is on it
// -----------------------------------------------------------------------------
// Opening, closing, dragging and docking the object inspector, the readout's
// minimize control, the reference-frame switcher, the pinned comparison cards,
// the header buttons (close, delete, maneuver, pin) and the lazy maneuver
// planner they ask for (formerly js/maneuverBridge.js, folded in to pay for
// this module's request). Content is js/inspectorView.js, js/inspectorPanel.js
// and js/inspectorInfo.js.
//
// Interface (CONTRIBUTING.md, Module boundaries): no context object, because
// nothing is needed from the coordinator. Exports: showObjectInspector,
// hideObjectInspector, inspectorTypeFor, setInspectorSuppressed (the flag
// lives here), setupOverlayMinimize, wireInspectorControls (ui.js calls it
// once, where its own start-up code ran these statements), and the planner's
// watchForManeuver, openManeuverFor, ensureManeuverPlanner,
// maneuverPlannerLoaded. ui.js registers hideObjectInspector and
// setInspectorSuppressed on the command bus; this module never imports ui.js.
// Nothing here touches an element at import time (ui.js mounts the markup
// after the imports run), so every lookup is inside a function.
// =============================================================================

import {
  computeDockPosition,
  renderDetails,
  patchDetails,
  renderPinnedCard,
  setupEnergyTab,
  ensureChartReady,
  updateCurrentEnergyValues,
  updateEnergyChart,
  releaseEnergyChart,
} from './inspectorPanel.js';
import {
  bh_list,
  stars,
  gas_giants,
  neutron_stars,
  white_dwarfs,
  barycenterBodies,
  clearObjectEnergyHistory,
} from './physics.js';
import { debugLog } from './utils.js';
import {
  WORLD,
  BARYCENTER,
  OBJECT,
  setFrame,
  frameState,
  onFrameChange,
} from './referenceFrame.js';
import { t } from './i18n/index.js';
import { setBodySelector } from './widgetRuntime.js';
import {
  objectInfoFor,
  wireInspectorOverlayToggles,
  buildInspectorView,
  paintInspectorHeader,
  setupMassSliderListeners,
  isObjectStillInSimulation,
} from './inspectorView.js';
import { state, SETTINGS, current_scenario_name, command } from './appState.js';

/**
 * The type string the inspector dispatches on, for a body.
 *
 * Not obj_type, which is what this used to pass. A StarObject's obj_type is
 * "StarObject" and objectInfoFor's case is "Star", so a star merger re-selected
 * the product and then logged "Unknown object type: StarObject" and rendered
 * nothing. Every other caller of showObjectInspector gets its type from
 * findObjectAtPosition, which is where this mapping otherwise lives; this is
 * the one caller that has a body and no click to resolve it from.
 *
 * Keyed on the class rather than obj_type because the two are not
 * interchangeable - a transformed body carries the obj_type of what it became
 * and the class of what it was - and build.js keeps class names through
 * minification for exactly this kind of comparison.
 *
 * @param {object} body - A physics body
 * @returns {string} The inspector's type string
 */
export const inspectorTypeFor = body => {
  const byClass = {
    BlackHole: 'BlackHole',
    StarObject: 'Star',
    NeutronStar: 'NeutronStar',
    WhiteDwarf: 'WhiteDwarf',
    Planet: 'Planet',
    GasGiant: 'GasGiant',
    Comet: 'Comet',
    Asteroid: 'Asteroid',
    Galaxy: 'Galaxy',
  };
  return byClass[body?.kind] || body?.obj_type || 'Planet';
};

/**
 * Show the object inspector modal with detailed information about a physics object
 * @param {Object} object - Physics object to inspect
 * @param {string} type - Type of object (BlackHole, Star, Planet, etc.)
 */
export const showObjectInspector = (object, type) => {
  // Check if splash screen is still active using both the global flag and our state variable
  if (!window.splashScreenEnded || window.isSplashActive) {
    debugLog(
      'Splash screen still active, completely ignoring showObjectInspector call'
    );
    return;
  }

  // Check if inspector element exists
  const objectInspector = document.getElementById('objectInspector');
  if (!objectInspector) {
    console.error('objectInspector element not found!');
    return;
  }

  // Check if we're already showing the same object
  if (
    state.inspector_open &&
    state.selectedObject &&
    state.selectedObject.object &&
    state.selectedObject.object.id === object.id &&
    state.selectedObject.type === type
  ) {
    debugLog('Inspector already open for this object, skipping');
    return;
  }

  // Store the current object for auto-updating
  state.selectedObject = { object, type };

  // If object appears in a near-circular, bound orbit around the dominant body, enable blue orbit overlay
  try {
    const centerCandidates = [
      ...bh_list,
      ...stars,
      ...neutron_stars,
      ...white_dwarfs,
      ...gas_giants,
    ];
    const G = SETTINGS.gravitational_constant;
    const obj = object;
    let primary = null;
    let maxInfluence = -Infinity;
    for (const b of centerCandidates) {
      if (!b || !b.alive || b === obj) continue;
      const dx = obj.pos.x - b.pos.x;
      const dy = obj.pos.y - b.pos.y;
      const r2 = Math.max(1e-6, dx * dx + dy * dy);
      const influence = (G * b.mass) / r2;
      if (influence > maxInfluence) {
        maxInfluence = influence;
        primary = b;
      }
    }
    if (primary) {
      const rx = obj.pos.x - primary.pos.x;
      const ry = obj.pos.y - primary.pos.y;
      const r = Math.max(1e-6, Math.hypot(rx, ry));
      const vCirc = Math.sqrt((G * primary.mass) / r);
      const vMag = Math.hypot(obj.vel.x, obj.vel.y);
      const dirTan = Math.atan2(ry, rx) + Math.PI / 2;
      const vIdeal = {
        x: vCirc * Math.cos(dirTan),
        y: vCirc * Math.sin(dirTan),
      };
      const dot = obj.vel.x * vIdeal.x + obj.vel.y * vIdeal.y;
      const denom = Math.max(1e-6, vMag * vCirc);
      const cosTheta = Math.max(-1, Math.min(1, dot / denom));
      const angErr = Math.acos(cosTheta);
      const speedRatio = vMag / vCirc;
      const angleTol =
        ((SETTINGS.sticky_dir_only_angle_deg || 15) * Math.PI) / 180;
      const speedTol = 0.2; // allow ~20% speed deviation
      const isBound = 0.5 * vMag * vMag - (G * primary.mass) / r < 0;
      if (
        isBound &&
        angErr <= angleTol &&
        speedRatio > 1 - speedTol &&
        speedRatio < 1 + speedTol
      ) {
        // Build one-loop circular path for overlay
        const samples = 240;
        const theta0 = Math.atan2(ry, rx);
        const loop = [];
        for (let i = 0; i <= samples; i++) {
          const t = i / samples;
          const th = theta0 + 2 * Math.PI * t;
          loop.push({
            x: primary.pos.x + r * Math.cos(th),
            y: primary.pos.y + r * Math.sin(th),
          });
        }
        state.inspectorOrbitOverlay.active = true;
        state.inspectorOrbitOverlay.points = loop;
      } else {
        state.inspectorOrbitOverlay.active = false;
        state.inspectorOrbitOverlay.points = [];
      }
    } else {
      state.inspectorOrbitOverlay.active = false;
      state.inspectorOrbitOverlay.points = [];
    }
  } catch {
    state.inspectorOrbitOverlay.active = false;
    state.inspectorOrbitOverlay.points = [];
  }

  // A guided lesson does its own reporting in its own panel, and the inspector
  // is a large floating card that lands squarely over the orbit the student has
  // just been asked to watch. Selection and the orbit overlay above still
  // happen - only the panel is withheld.
  if (inspectorSuppressed) return;

  const updateInspector = () => {
    if (!state.inspector_open || !state.selectedObject) return;

    // The selected object can be absorbed, merged away or culled while the
    // inspector is open. Without this the panel keeps polling a detached
    // object and shows a frozen ghost, and the mass slider still acts on it.
    if (!isObjectStillInSimulation(state.selectedObject.object)) {
      hideObjectInspector();
      return;
    }

    // Skip updates if slider is being dragged
    if (state.sliderDragging) {
      return;
    }

    const info = objectInfoFor(
      state.selectedObject.object,
      state.selectedObject.type
    );
    if (!info) {
      console.error('Unknown object type:', state.selectedObject.type);
      return;
    }

    const inspectorTitle = document.getElementById('inspectorTitle');
    const detailsTabContent = document.getElementById('detailsTab');

    if (!inspectorTitle || !detailsTabContent) {
      // Silently return instead of logging error - elements may not exist during initialization
      return;
    }

    inspectorTitle.innerHTML = `<span class="object-icon">${info.icon}</span>${info.title}`;

    // Check if this is a new object selection or just a real-time update
    const existingMassSlider = document.getElementById('massSlider');
    const currentObjectId =
      state.selectedObject && state.selectedObject.object
        ? String(state.selectedObject.object.id ?? 'unknown')
        : 'unknown';
    const sliderObjectId = existingMassSlider?.dataset?.objectId ?? 'unknown';
    const isNewObject =
      !existingMassSlider || sliderObjectId !== currentObjectId;

    // Don't recreate inspector if it's just a mass update (to preserve energy chart)
    // TODO: REMOVE - Energy chart preservation logic to be replaced
    const isMassUpdate =
      existingMassSlider &&
      state.selectedObject &&
      state.selectedObject.object &&
      sliderObjectId === currentObjectId &&
      Math.abs(
        existingMassSlider.valueAsNumber - state.selectedObject.object.mass
      ) < 0.1;

    if (isNewObject && !isMassUpdate) {
      // Reset energy log when switching to a new object
      state.energyLog = [];
      const view = buildInspectorView(
        state.selectedObject.object,
        state.selectedObject.type,
        info
      );
      if (!view) return;
      paintInspectorHeader(view);
      detailsTabContent.innerHTML = renderDetails(view);

      // Set up mass slider event listeners
      setupMassSliderListeners();

      wireInspectorOverlayToggles();

      // Store object ID for future reference
      const newMassSlider = document.getElementById('massSlider');
      if (newMassSlider && state.selectedObject.object) {
        newMassSlider.dataset.objectId = currentObjectId;
      }
    } else if (isNewObject && isMassUpdate) {
      // Just update the mass slider value without recreating the inspector
      const existingMassSlider = document.getElementById('massSlider');
      if (existingMassSlider) {
        existingMassSlider.value = state.selectedObject.object.mass;
      }
    } else {
      // Ten times a second. Nothing is rebuilt: patchDetails walks the value
      // cells and writes only the ones whose text actually changed, so an open
      // "About this object", a focused control and a slider mid-drag all
      // survive. The old path replaced every row's innerHTML on every tick.
      const view = buildInspectorView(
        state.selectedObject.object,
        state.selectedObject.type,
        info
      );
      if (view) {
        paintInspectorHeader(view);
        if (!patchDetails(detailsTabContent, view)) {
          // The property list changed shape, which means the object became
          // something else. Rebuild rather than mismatch labels to values.
          detailsTabContent.innerHTML = renderDetails(view);
          setupMassSliderListeners();
          wireInspectorOverlayToggles();
        }
      }
    }

    // Update energy chart if energy tab is active
    const energyTab = document.querySelector(
      '.inspector-tab[data-tab="energy"]'
    );
    if (energyTab && energyTab.classList.contains('active')) {
      updateEnergyChart();
      updateCurrentEnergyValues();
    }
  };

  // Clear any existing update interval
  if (state.inspectorUpdateInterval) {
    clearInterval(state.inspectorUpdateInterval);
    state.inspectorUpdateInterval = null;
  }

  // Initial update
  updateInspector();

  // Update current energy values immediately (even if energy tab isn't active)
  updateCurrentEnergyValues();

  // Set up auto-update interval
  state.inspectorUpdateInterval = setInterval(updateInspector, 100); // Update 10 times per second

  // Remove inline hide styles so CSS takes over
  [
    'display',
    'opacity',
    'visibility',
    'pointerEvents',
    'position',
    'left',
    'top',
    'zIndex',
  ].forEach(prop => {
    objectInspector.style[prop] = '';
  });

  // Show the inspector
  objectInspector.classList.add('visible');

  // Ensure the showUI class is also present (added after splash screen ends)
  if (!objectInspector.classList.contains('showUI')) {
    objectInspector.classList.add('showUI');
  }

  state.inspector_open = true;

  // Clear anything a previous drag left behind, then dock. No transform is
  // applied at all - the old translate(-50%, -50%) centering is what the drag
  // code then had to undo on every mousedown.
  objectInspector.style.left = '';
  objectInspector.style.top = '';
  objectInspector.style.transform = '';
  dockInspector(objectInspector);
  layoutPinnedCards();

  // Set up mobile-friendly backdrop click to close
  setupInspectorBackdropClick();

  // Set up dragging functionality with a small delay to ensure proper positioning
  setTimeout(() => {
    setupInspectorDragging();
  }, 50);

  // Set up energy tab functionality
  setupEnergyTab();

  // Initialize energy chart immediately for new object selection
  // This ensures the chart is ready even if the energy tab isn't active
  setTimeout(() => {
    ensureChartReady();
    updateEnergyChart();
    updateCurrentEnergyValues();
  }, 100); // Small delay to ensure DOM elements are ready

  // Set up overlay minimize functionality
  setupOverlayMinimize();

  // The rail's "Selected object" option names the current selection, so it
  // changes whenever the selection does.
  paintFrameControls();
};

// One way to select a body, installed rather than imported.
//
// Selecting and inspecting are the same call here - showObjectInspector sets
// state.selectedObject and opens the card in one go - and js/lessonScene.js
// cannot import this module, because this module is the coordinator and that
// one sits below it. So it goes through the port in js/widgetRuntime.js, the
// way js/gwAudio.js installs its player there. What it buys is that a lesson's
// accessible object list, a plot marker and a click on the canvas all take the
// same path and cannot end up disagreeing about what is selected.
setBodySelector(showObjectInspector);

export const hideObjectInspector = () => {
  const objectInspector = document.getElementById('objectInspector');
  if (!objectInspector) {
    console.error('objectInspector element not found when trying to hide!');
    return;
  }
  objectInspector.classList.remove('visible');
  objectInspector.classList.remove('dragging');
  state.inspector_open = false;
  // turn off orbit overlay when inspector closes
  state.inspectorOrbitOverlay.active = false;
  state.inspectorOrbitOverlay.points = [];
  // The equal-area overlay deliberately survives: it is a thing the user turned
  // on to look at, and closing the panel that switched it on is not a request
  // to stop looking. It clears itself instead when the orbit it describes stops
  // being the orbit the body is on. See checkAreaSweepValidity.

  // Re-apply hide styles to ensure inspector stays hidden
  objectInspector.style.display = 'none';
  objectInspector.style.opacity = '0';
  objectInspector.style.visibility = 'hidden';
  objectInspector.style.pointerEvents = 'none';
  objectInspector.style.position = 'absolute';
  objectInspector.style.left = '-9999px';
  objectInspector.style.top = '-9999px';
  objectInspector.style.zIndex = '-9999';

  // Clear auto-update interval
  if (state.inspectorUpdateInterval) {
    clearInterval(state.inspectorUpdateInterval);
    state.inspectorUpdateInterval = null;
  }

  // Stop auto-refresh, reset chart state
  releaseEnergyChart();

  state.selectedObject = null;
  paintFrameControls();
};

// Add mobile-friendly backdrop click to close functionality
const setupInspectorBackdropClick = () => {
  const objectInspector = document.getElementById('objectInspector');
  if (!objectInspector) return;

  // Remove existing event listeners to prevent duplicates
  objectInspector.removeEventListener('click', handleInspectorBackdropClick);

  // Add backdrop click handler
  objectInspector.addEventListener('click', handleInspectorBackdropClick);
};

const handleInspectorBackdropClick = e => {
  // Only close if clicking on the inspector backdrop (not on content)
  if (e.target.id === 'objectInspector') {
    hideObjectInspector();
  }
};

// Dragging functionality for object inspector
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialLeft = 0;
let initialTop = 0;

const setupInspectorDragging = () => {
  const objectInspector = document.getElementById('objectInspector');
  const inspectorHeader = objectInspector?.querySelector('.inspector-header');

  if (!objectInspector || !inspectorHeader) return;

  // Remove existing listeners to prevent duplicates
  inspectorHeader.removeEventListener('mousedown', startDrag);
  document.removeEventListener('mousemove', drag);
  document.removeEventListener('mouseup', endDrag);

  // Add drag listeners
  inspectorHeader.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', endDrag);

  // Touch support for mobile
  inspectorHeader.removeEventListener('touchstart', startDragTouch);
  document.removeEventListener('touchmove', dragTouch);
  document.removeEventListener('touchend', endDrag);

  inspectorHeader.addEventListener('touchstart', startDragTouch, {
    passive: false,
  }); // passive: false is required because startDragTouch calls preventDefault
  document.addEventListener('touchmove', dragTouch);
  document.addEventListener('touchend', endDrag);
};

// The inspector once had a minimize button. Nothing has referenced
// .inspector-minimize in the markup, the script or the stylesheet for some
// time, so the class checks that used to guard against dragging a collapsed
// panel guarded against a state that can no longer occur. The cursor is a
// stylesheet concern now.
//
// Note this is only the inspector's dead copy: setOverlayMinimized below still
// collapses the HUD readout, and that one is reachable.

const startDrag = e => {
  // The same guard startDragTouch has, and for a related reason. A press on
  // one of the header's own buttons is not a drag, and treating it as one
  // re-anchors the panel from its right/bottom edges to left/top on mousedown.
  // Where those anchors differ - a narrow window, where the stylesheet lays
  // the inspector out against the other edge - the panel moves a few pixels
  // out from under the pointer, mouseup lands somewhere else, and the browser
  // never synthesises a click at all. So Close, Pin and Delete did nothing on
  // a narrow window while working perfectly on a wide one, which is why this
  // outlived the touch fix.
  if (e.target?.closest?.('button, a, input, select, textarea')) return;

  e.preventDefault();

  const objectInspector = document.getElementById('objectInspector');

  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;

  // Get the current visual position (after any transforms)
  const rect = objectInspector.getBoundingClientRect();

  // The inspector starts centered with transform: translate(-50%, -50%)
  // When we start dragging, we need to set the absolute position to match the current visual position
  // The rect.left and rect.top give us the actual visual position on screen
  initialLeft = rect.left;
  initialTop = rect.top;

  objectInspector.classList.add('dragging');

  // Pin the panel to where it already is before switching to left/top control.
  // There is no transform to cancel any more, but the right/bottom anchors from
  // the stylesheet have to give way or the panel fights the drag.
  objectInspector.style.left = initialLeft + 'px';
  objectInspector.style.top = initialTop + 'px';
  objectInspector.style.right = 'auto';
  objectInspector.style.bottom = 'auto';
};

const startDragTouch = e => {
  // A touch that landed on one of the header's own buttons is not a drag, and
  // treating it as one broke every control up there on a phone. Calling
  // preventDefault() on touchstart cancels the click the browser would have
  // synthesised, so the close, pin and delete buttons received the tap and did
  // nothing at all - on desktop the same handler is harmless, because
  // preventDefault() on mousedown does not cancel a click, which is why this
  // went unnoticed.
  if (e.target?.closest?.('button, a, input, select, textarea')) return;

  e.preventDefault();
  isDragging = true;
  const touch = e.touches[0];
  dragStartX = touch.clientX;
  dragStartY = touch.clientY;

  const objectInspector = document.getElementById('objectInspector');
  // Get the current visual position (after any transforms)
  const rect = objectInspector.getBoundingClientRect();

  // The inspector starts centered with transform: translate(-50%, -50%)
  // When we start dragging, we need to set the absolute position to match the current visual position
  // The rect.left and rect.top give us the actual visual position on screen
  initialLeft = rect.left;
  initialTop = rect.top;

  objectInspector.classList.add('dragging');

  // Pin the panel to where it already is before switching to left/top control.
  // There is no transform to cancel any more, but the right/bottom anchors from
  // the stylesheet have to give way or the panel fights the drag.
  objectInspector.style.left = initialLeft + 'px';
  objectInspector.style.top = initialTop + 'px';
  objectInspector.style.right = 'auto';
  objectInspector.style.bottom = 'auto';
};

const drag = e => {
  if (!isDragging) return;
  e.preventDefault();

  const objectInspector = document.getElementById('objectInspector');
  const deltaX = e.clientX - dragStartX;
  const deltaY = e.clientY - dragStartY;

  // Small threshold to prevent accidental drags
  if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return;

  const newLeft = initialLeft + deltaX;
  const newTop = initialTop + deltaY;

  // Keep inspector within viewport bounds
  const rect = objectInspector.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width;
  const maxTop = window.innerHeight - rect.height;

  const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
  const clampedTop = Math.max(0, Math.min(newTop, maxTop));

  // Set position and remove transform immediately to prevent jumping
  objectInspector.style.left = clampedLeft + 'px';
  objectInspector.style.top = clampedTop + 'px';
  objectInspector.style.transform = 'none';
};

const dragTouch = e => {
  if (!isDragging) return;
  e.preventDefault();

  const touch = e.touches[0];
  const objectInspector = document.getElementById('objectInspector');
  const deltaX = touch.clientX - dragStartX;
  const deltaY = touch.clientY - dragStartY;

  // Small threshold to prevent accidental drags
  if (Math.abs(deltaX) < 3 && Math.abs(deltaY) < 3) return;

  const newLeft = initialLeft + deltaX;
  const newTop = initialTop + deltaY;

  // Keep inspector within viewport bounds
  const rect = objectInspector.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width;
  const maxTop = window.innerHeight - rect.height;

  const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
  const clampedTop = Math.max(0, Math.min(newTop, maxTop));

  // Set position and remove transform immediately to prevent jumping
  objectInspector.style.left = clampedLeft + 'px';
  objectInspector.style.top = clampedTop + 'px';
  objectInspector.style.transform = 'none';
};

const endDrag = () => {
  isDragging = false;
  const objectInspector = document.getElementById('objectInspector');
  if (objectInspector) {
    objectInspector.classList.remove('dragging');
  }
};

// Overlay minimize/maximize functionality. Run at start-up and again for every
// selection; the registrations of the run before are taken back each time.
let overlayAbort = null;
export const setupOverlayMinimize = () => {
  const overlay = document.getElementById('overlay');
  const minimizeBtn = document.getElementById('overlayMinimize');

  if (!overlay || !minimizeBtn) return;

  overlayAbort?.abort();
  overlayAbort = new AbortController();
  const on = (target, type, fn) =>
    target.addEventListener(type, fn, { signal: overlayAbort.signal });

  // Add minimize/maximize handler
  on(minimizeBtn, 'click', toggleOverlayMinimize);

  // The whole collapsed panel is the target for re-opening, not just the chip
  on(overlay, 'click', e => {
    if (!overlay.classList.contains('minimized')) return;
    if (minimizeBtn.contains(e.target)) return;
    setOverlayMinimized(overlay, minimizeBtn, false);
  });

  setOverlayMinimized(
    overlay,
    minimizeBtn,
    overlay.classList.contains('minimized')
  );
};

const toggleOverlayMinimize = e => {
  e.preventDefault();
  e.stopPropagation();

  const overlay = document.getElementById('overlay');
  const minimizeBtn = document.getElementById('overlayMinimize');

  if (!overlay || !minimizeBtn) return;

  const isMinimized = overlay.classList.contains('minimized');

  setOverlayMinimized(overlay, minimizeBtn, !isMinimized);
};

/**
 * Apply the minimized/expanded state to the readout panel and its control.
 * The button carries a word as well as a glyph - a bare "−" gave no clue that
 * the panel could be collapsed, and the collapsed state was an unlabeled box.
 * @param {HTMLElement} overlay - The overlay panel
 * @param {HTMLElement} btn - The minimize/expand button
 * @param {boolean} minimized - Target state
 */
const setOverlayMinimized = (overlay, btn, minimized) => {
  overlay.classList.toggle('minimized', minimized);
  const glyph = minimized ? '▸' : '▾';
  const label = minimized ? t('readout.toggle.show') : t('readout.toggle.hide');
  btn.innerHTML =
    `<span aria-hidden="true">${glyph}</span>` +
    `<span class="overlay-toggle-label">${label}</span>`;
  btn.title = minimized
    ? t('readout.toggle.show.hint')
    : t('readout.toggle.hide.hint');
  btn.setAttribute('aria-expanded', String(!minimized));
  btn.setAttribute(
    'aria-label',
    minimized ? t('readout.toggle.show.label') : t('readout.toggle.hide.hint')
  );
};
/**
 * Create a mass adjustment slider for the object inspector
 * @param {Object} object - The physics object
 * @param {string} type - The type of object
 * @returns {string} HTML string for the mass slider
 */
/**
 * Measure what is on screen and move the inspector out of its way.
 *
 * The decision itself lives in computeDockPosition; this half only gathers the
 * rectangles. The bottom-sheet layout on a phone (767px and under) is left alone: there the
 * panel is meant to cover things.
 *
 * @param {HTMLElement} panel - The inspector element
 */
const dockInspector = panel => {
  if (window.innerWidth <= 767) return;

  const visible = sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  };

  // The rail is revealed a fifth of a second after the splash ends, and
  // docking against a screen it has not reached yet is worse than not docking:
  // the fallback in computeDockPosition puts the panel at the viewport edge,
  // which is exactly where the rail then appears, and nothing moves it again
  // until a resize. One run in eight of the layering test, and any reader
  // quick enough to click a star on load. The stylesheet's own position
  // already clears the rail, so a measurement that cannot be taken is left
  // untaken.
  const rail = visible('#mainControls');
  if (!rail && document.getElementById('mainControls')) return;

  const { left, top, maxHeight } = computeDockPosition({
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    panelWidth: panel.offsetWidth,
    panelHeight: panel.offsetHeight,
    hud: visible('#overlay'),
    rail,
  });

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  // Never taller than the stylesheet allows; only shorter, when the position
  // it was given leaves less room than that.
  panel.style.maxHeight = `min(72vh, 640px, ${maxHeight}px)`;
};

// --- Reference-frame switcher -------------------------------------------------
// The rail control and the inspector row are two doors into the same state, so
// both are driven from one subscription rather than each trying to keep the
// other in step.

/**
 * The name to show for a frame, and what choosing it does.
 *
 * @param {{mode: string, objectId: ?number}} frame - The frame
 * @returns {{value: string, note: string, active: boolean}} What the rail shows
 */
const describeFrame = frame => {
  if (frame.mode === BARYCENTER) {
    return {
      value: BARYCENTER,
      note: 'Positions relative to the system\u2019s center of mass. It does not sit inside the largest body.',
      active: true,
    };
  }
  if (frame.mode === OBJECT) {
    const body = barycenterBodies().find(b => b.id === frame.objectId);
    const name = body?.name || 'the selected object';
    return {
      value: OBJECT,
      note: `Positions and trails as seen from ${name}, which now sits still.`,
      active: true,
    };
  }
  return {
    value: WORLD,
    note: 'Positions as the scenario defines them.',
    active: false,
  };
};

/** Bring the rail control and the inspector row in line with the frame. */
const paintFrameControls = () => {
  const frame = frameState();
  const shown = describeFrame(frame);

  const select = document.getElementById('referenceFrameSelect');
  if (select) {
    const objectOption = select.querySelector('option[value="object"]');
    if (objectOption) {
      // "Selected object" is only a choice when there is one. Offering it with
      // nothing selected would set a frame with no origin.
      const sel = state.selectedObject?.object;
      objectOption.disabled = !sel;
      objectOption.textContent = sel
        ? `Selected: ${sel.name || 'object'}`
        : 'Selected object';
    }
    select.value = shown.value;
  }

  const note = document.getElementById('referenceFrameNote');
  if (note) {
    // Only shown while a frame is active. It is a reminder that every number on
    // screen is now measured against something other than the scenario's own
    // coordinates, and in the world frame there is nothing to remind anyone of.
    note.textContent = shown.note;
    note.hidden = !shown.active;
  }

  const btn = document.getElementById('frameToggleBtn');
  if (btn) {
    const sel = state.selectedObject?.object;
    const on = !!sel && frame.mode === OBJECT && frame.objectId === sel.id;
    btn.setAttribute('data-state', on ? 'on' : 'off');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.textContent = on ? t('settings.toggle.on') : t('settings.toggle.off');
  }
};

/** Wire the rail's frame selector. */
const setupReferenceFrameControl = () => {
  const select = document.getElementById('referenceFrameSelect');
  if (select) {
    select.addEventListener('change', () => {
      const value = select.value;
      if (value === OBJECT) {
        const sel = state.selectedObject?.object;
        setFrame(sel ? OBJECT : WORLD, sel ? sel.id : null);
      } else {
        setFrame(value === BARYCENTER ? BARYCENTER : WORLD);
      }
    });
  }
  onFrameChange(paintFrameControls);
  paintFrameControls();
};

// --- Pinned comparison cards ------------------------------------------------
// One inspector answers "what is this?". Two answer "how do these differ?",
// which is the question a student actually has when they are looking at two
// planets. Pinning takes a copy of the current object's numbers and leaves it
// on screen while the main inspector moves on to whatever is selected next.
//
// The cards are read-only by design: see renderPinnedCard for why a second mass
// slider would collide with the first.
const pinnedInspectors = [];
let pinnedUpdateInterval = null;

/**
 * Lay the pinned cards out beside the inspector.
 *
 * Beside rather than below, because that is the arrangement the comparison
 * needs: two sets of numbers at the same height, read across. Stacking them
 * under the panel put the first card's bottom edge 200px past the bottom of
 * the window.
 *
 * Cards fill a column downward from the panel's top edge and start a new column
 * further left when the next one would not fit, so pinning a fourth card never
 * pushes anything off screen.
 */
const layoutPinnedCards = () => {
  const host = document.getElementById('pinnedInspectors');
  const main = document.getElementById('objectInspector');
  if (!host) return;

  const GAP = 10;
  const CARD_W = 300;
  const open = main && getComputedStyle(main).display !== 'none';

  // On a phone (767px and under) the inspector is a bottom sheet, so there is no "beside" to
  // work with: the cards take the top of the screen and the sheet keeps the
  // bottom. Anchoring to the sheet would stack them straight onto it.
  if (window.innerWidth <= 767) {
    let y = GAP;
    for (const pin of pinnedInspectors) {
      if (pin.placed) continue;
      pin.el.style.left = `${GAP}px`;
      pin.el.style.top = `${Math.round(y)}px`;
      y += pin.el.offsetHeight + GAP;
    }
    return;
  }

  const anchor = open ? main.getBoundingClientRect() : null;

  // With the panel open the cards start to its left; with it closed they take
  // the space the panel would have occupied.
  let right = anchor ? anchor.left - GAP : window.innerWidth - GAP;
  const topStart = anchor ? anchor.top : 96;
  let top = topStart;

  for (const pin of pinnedInspectors) {
    if (pin.placed) continue;
    const h = pin.el.offsetHeight;
    if (top !== topStart && top + h > window.innerHeight - GAP) {
      // This column is full: start another one to the left.
      right -= CARD_W + GAP;
      top = topStart;
    }
    pin.el.style.left = `${Math.round(Math.max(GAP, right - CARD_W))}px`;
    pin.el.style.top = `${Math.round(
      Math.max(GAP, Math.min(top, window.innerHeight - h - GAP))
    )}px`;
    top += h + GAP;
  }
};

/** Remove a pinned card. @param {object} pin - The pin record */
const unpinInspector = pin => {
  const i = pinnedInspectors.indexOf(pin);
  if (i >= 0) pinnedInspectors.splice(i, 1);
  pin.el.remove();
  if (!pinnedInspectors.length && pinnedUpdateInterval) {
    clearInterval(pinnedUpdateInterval);
    pinnedUpdateInterval = null;
  }
  layoutPinnedCards();
};

/** Pin the object the inspector is currently showing. */
const pinCurrentObject = () => {
  const sel = state.selectedObject;
  if (!sel?.object) return;
  // Pinning the same body twice would just stack two identical cards.
  if (pinnedInspectors.some(p => p.object === sel.object)) return;

  const info = objectInfoFor(sel.object, sel.type);
  const view = buildInspectorView(sel.object, sel.type, info);
  if (!view) return;

  const el = document.createElement('div');
  el.className = 'insp-pin';
  el.innerHTML = renderPinnedCard(view);
  document.getElementById('pinnedInspectors')?.appendChild(el);

  const pin = { el, object: sel.object, type: sel.type };
  pinnedInspectors.push(pin);
  el.querySelector('[data-pin-close]')?.addEventListener('click', () =>
    unpinInspector(pin)
  );
  makePinDraggable(pin);
  // The main inspector's ticker stops when it closes. A pinned card has to
  // outlive that, so the cards run their own.
  if (!pinnedUpdateInterval) {
    pinnedUpdateInterval = setInterval(updatePinnedInspectors, 100);
  }
  layoutPinnedCards();
};

/**
 * Let a pinned card be dragged by its header.
 *
 * Once dragged it stops taking part in the automatic column layout: the user
 * has said where they want it, and having it jump back the next time another
 * card is pinned would undo that.
 *
 * @param {object} pin - The pin record
 */
const makePinDraggable = pin => {
  const header = pin.el.querySelector('.insp-pin-header');
  if (!header) return;
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    const rect = pin.el.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    pin.placed = true;
    const move = ev => {
      pin.el.style.left = `${Math.round(
        Math.min(
          Math.max(4, ev.clientX - offsetX),
          window.innerWidth - rect.width - 4
        )
      )}px`;
      pin.el.style.top = `${Math.round(
        Math.min(Math.max(4, ev.clientY - offsetY), window.innerHeight - 40)
      )}px`;
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    e.preventDefault();
  });
};

/**
 * Refresh every pinned card, and drop any whose object has left the world.
 *
 * Called from the same tick as the main inspector, so a pinned card is as live
 * as the panel it was copied from.
 */
const updatePinnedInspectors = () => {
  if (!pinnedInspectors.length) return;
  for (const pin of [...pinnedInspectors]) {
    if (!isObjectStillInSimulation(pin.object)) {
      unpinInspector(pin);
      continue;
    }
    const info = objectInfoFor(pin.object, pin.type);
    const view = buildInspectorView(pin.object, pin.type, info);
    if (!view) continue;
    if (!patchDetails(pin.el, view)) {
      pin.el.innerHTML = renderPinnedCard(view);
      pin.el
        .querySelector('[data-pin-close]')
        ?.addEventListener('click', () => unpinInspector(pin));
    }
  }
};

// Set while a guided investigation is running; see showObjectInspector.
let inspectorSuppressed = false;

/**
 * Hide the object inspector without disabling selection.
 * @param {boolean} value - True to withhold the panel on click
 */
export const setInspectorSuppressed = value => {
  inspectorSuppressed = !!value;
  // Deliberately not hideObjectInspector(): that also clears the orbit overlay
  // and the equal-areas wedges, which are exactly what a lesson wants left on
  // screen. Only the panel itself is put away.
  if (inspectorSuppressed) {
    const el = document.getElementById('objectInspector');
    if (el) {
      el.classList.remove('visible');
      el.style.display = 'none';
      el.style.pointerEvents = 'none';
    }
    state.inspector_open = false;
    if (state.inspectorUpdateInterval) {
      clearInterval(state.inspectorUpdateInterval);
      state.inspectorUpdateInterval = null;
    }
  } else {
    const el = document.getElementById('objectInspector');
    if (el) el.style.display = '';
  }
};

/**
 * Wire the header buttons and the resize handler. Called once from ui.js, where
 * these statements used to run at the top level, so the order is unchanged.
 */
export function wireInspectorControls() {
  // Button event handlers
  document.getElementById('inspectorClose').onclick = hideObjectInspector;
  const inspectorCloseChip = document.getElementById('inspectorCloseChip');
  if (inspectorCloseChip) inspectorCloseChip.onclick = hideObjectInspector;

  // Delete object functionality
  const deleteSelectedObject = () => {
    if (state.selectedObject && state.selectedObject.object) {
      const object = state.selectedObject.object;
      const type = state.selectedObject.type;

      // Clear energy history for the object being deleted
      if (object.id) {
        clearObjectEnergyHistory(object.id);
        debugLog(`Cleared energy history for deleted ${type}: ${object.id}`);
      }

      // Mark the object as dead so it gets removed in the next physics update
      object.alive = false;

      // Close the inspector
      hideObjectInspector();

      // Show a brief notification
      debugLog(`Deleted ${type}: ${object.id}`);
    }
  };

  document.getElementById('inspectorDelete').onclick = deleteSelectedObject;

  // The maneuver planner, opened from the body it is about. Deliberately not a
  // rail chip: the Tools group already fills the height it has, and a burn is a
  // thing you do to a particular object rather than a tool you reach for in the
  // abstract. Lazy - most visitors never plan one.
  const inspectorManeuverBtn = document.getElementById('inspectorManeuver');
  if (inspectorManeuverBtn) {
    // An event rather than a call: watchForManeuver (below) answers it, like
    // the bench's rail button, so a button here need not know how the planner
    // is loaded.
    inspectorManeuverBtn.onclick = () => {
      const target = state.selectedObject?.object;
      if (!target) return;
      window.dispatchEvent(
        new CustomEvent('gravitasManeuverRequested', {
          detail: { bodyId: target.id },
        })
      );
    };
  }
  setupReferenceFrameControl();
  const inspectorPinBtn = document.getElementById('inspectorPin');
  if (inspectorPinBtn) inspectorPinBtn.onclick = pinCurrentObject;
  // Cards are positioned in viewport coordinates against the inspector's edge,
  // so a resize has to re-run the layout or they end up off screen.
  window.addEventListener('resize', () => {
    const panel = document.getElementById('objectInspector');
    // A window that narrows can push a docked panel over the readout it was
    // measured to clear, so the measurement has to be redone.
    if (panel && state.inspector_open) dockInspector(panel);
    layoutPinnedCards();
  });
}

// --- The maneuver planner, loaded on demand ----------------------------------
// Most visitors never plan a burn, and the planner drags in the panel and its
// prose. This is what the start-up path sees instead: one function, and an
// import that happens the first time somebody asks for it from the inspector.
// The same shape as js/experimentsBridge.js; the application is reached through
// the command bus in js/appState.js, not by importing ui.js.
let loading = null;

/**
 * Load the planner and hand it what it needs of the application.
 *
 * @returns {Promise<object>} The planner module
 */
export function ensureManeuverPlanner() {
  if (!loading) {
    loading = (async () => {
      const [planner, i18n] = await Promise.all([
        import('./maneuverPlanner.js'),
        import('./i18n/deferredMessages.js'),
      ]);
      await i18n.ensureDeferredMessages().catch(() => {});
      planner.initManeuver({
        captureShareState: command('captureShareState'),
        applyShareState: command('applyShareState'),
        getSettings: () => SETTINGS,
        getScenario: () => current_scenario_name,
      });
      // A rebuilt world is a different set of bodies, so the burns recorded
      // against the old ones are not a log of anything that is on screen.
      window.addEventListener('gravitasSimulationReset', () => {
        planner.resetManeuverPlanner();
      });
      return planner;
    })();
  }
  return loading;
}

/**
 * Open the planner on a body.
 *
 * @param {?number} bodyId - Which body, or null for the first available
 * @returns {Promise<void>}
 */
export async function openManeuverFor(bodyId = null) {
  const planner = await ensureManeuverPlanner();
  planner.openManeuverPlanner(bodyId);
}

/**
 * Listen for the inspector asking for the planner. Called once from start-up.
 *
 * The listener is what keeps the dependency one-way: ui.js announces, this
 * module answers, and nothing in the coordinator has to know that the planner
 * exists.
 *
 * @returns {void}
 */
export function watchForManeuver() {
  window.addEventListener('gravitasManeuverRequested', event => {
    openManeuverFor(event.detail?.bodyId ?? null).catch(err =>
      console.error('The maneuver planner could not be loaded:', err)
    );
  });
}

/** @returns {boolean} Whether the planner has been loaded */
export const maneuverPlannerLoaded = () => loading !== null;
