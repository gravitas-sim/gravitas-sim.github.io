// =============================================================================
// The inspector's content and the mass controls
// -----------------------------------------------------------------------------
// What the object inspector says about a body and what it lets the reader
// change: the per-kind info, the view model the panel renders, the black hole
// appearance toggles, the mass slider and the changes of kind a mass change can
// cause, and the pinned comparison cards. Moved out of js/ui.js unchanged
// (Prompt 107, slice 7); it never imports ui.js. The two things it needs from
// the application, marking the world hand-edited and cutting an equal-areas
// overlay, are asked of the command bus (js/appState.js).
//
// The object-type glyphs live here too: that module had one importer, and a
// new file on a route costs a request.
// =============================================================================
import {
  renderDetails,
  patchDetails,
  splitIdentity,
  ensureChartReady,
  updateEnergyChart,
  energyChartReady,
  clearEnergyChart,
} from './inspectorPanel.js';
import {
  getBlackHoleInfo,
  getStarInfo,
  getPlanetInfo,
  getGasGiantInfo,
  getAsteroidInfo,
  getNeutronStarInfo,
  getWhiteDwarfInfo,
  getGalaxyInfo,
  getCometInfo,
  PLANET_RADIUS,
  GAS_GIANT_RADIUS,
  STAR_OBJ_RADIUS,
  NEUTRON_STAR_RADIUS,
  WHITE_DWARF_RADIUS,
  ASTEROID_RADIUS,
} from './inspectorInfo.js';
import {
  JUPITER_MASSES_PER_SOLAR_MASS,
  EARTH_MASSES_PER_JUPITER_MASS,
} from './constants.js';
import { formatNumber } from './format.js';
import { ENVIRONMENT, ENVIRONMENTS } from './blackHole/appearance.js';
import {
  bh_list,
  planets,
  stars,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  barycenterBodies,
  SOLAR_MASS_UNIT,
  EARTH_MASS_UNIT,
  HALLEY_MASS_UNIT,
  CERES_MASS_UNIT,
  JUPITER_MASS_UNIT,
  Planet,
  GasGiant,
  Asteroid,
  StarObject,
  BlackHole,
  NeutronStar,
  clearObjectEnergyHistory,
} from './physics.js';
import { debugLog, solarHTML } from './utils.js';
import {
  WORLD,
  BARYCENTER,
  OBJECT,
  setFrame,
  frameOriginVelocity,
  resolveFrameOrigin,
  frameState,
} from './referenceFrame.js';
import { t } from './i18n/index.js';
import { formatSpeed, formatDistance } from './units.js';
import { state, SETTINGS, current_scenario_name, command } from './appState.js';

const markWorldTouched = command('markWorldTouched');
const computeAreaSweep = command('computeAreaSweep');

/**
 * Check whether an object is still part of the running simulation.
 * Objects leave via absorption, merging or off-screen culling, any of which
 * can happen while a panel still holds a reference to them.
 * @param {Object} object - Physics object to test
 * @returns {boolean} True if the object is still simulated
 */
export const isObjectStillInSimulation = object => {
  if (!object) return false;
  if (object.alive === false) return false;
  return (
    bh_list.includes(object) ||
    planets.includes(object) ||
    stars.includes(object) ||
    gas_giants.includes(object) ||
    asteroids.includes(object) ||
    comets.includes(object) ||
    neutron_stars.includes(object) ||
    white_dwarfs.includes(object)
  );
};

/**
 * The per-type info function, in one place.
 *
 * Three separate switch statements used to spell this mapping out character for
 * character: the live tick, the transformation path and the mass-change path.
 * Adding a ninth object type meant remembering all three.
 *
 * @param {object} object - The body
 * @param {string} type - Its type name
 * @returns {object|null} Info for the inspector
 */
export const objectInfoFor = (object, type) => {
  switch (type) {
    case 'BlackHole':
      return getBlackHoleInfo(object);
    case 'Star':
      return getStarInfo(object);
    case 'NeutronStar':
      return getNeutronStarInfo(object);
    case 'WhiteDwarf':
      return getWhiteDwarfInfo(object);
    case 'Planet':
      return getPlanetInfo(object);
    case 'GasGiant':
      return getGasGiantInfo(object);
    case 'Comet':
      return getCometInfo(object);
    case 'Asteroid':
      return getAsteroidInfo(object);
    case 'Galaxy':
      return getGalaxyInfo(object);
    default:
      return null;
  }
};

/**
 * Attach the overlay toggles after a rebuild.
 *
 * Both toggles used to be wired twice over, once in the selection path and
 * once in the transformation path, each with its own copy of the handler and
 * an extra click target on a header row that no longer exists. One button, one
 * handler, one place.
 */
/**
 * The black hole's appearance controls.
 *
 * Every one of them writes to the object's appearance and nothing else. There
 * is deliberately no path from here to a mass, a position or a velocity: the
 * whole point of the separation this block belongs to is that a viewing
 * choice cannot become a physical one.
 */
const wireBlackHoleAppearance = () => {
  const bh = state.selectedObject?.object;
  const isHole = state.selectedObject?.type === 'BlackHole';

  const env = document.getElementById('bhEnvironment');
  if (env && isHole && bh) {
    env.onchange = () => {
      bh.setAppearance({ environment: env.value });
    };
  }

  const tilt = document.getElementById('bhInclination');
  const tiltOut = document.getElementById('bhInclinationOut');
  if (tilt && isHole && bh) {
    tilt.oninput = () => {
      const deg = tilt.valueAsNumber;
      bh.setAppearance({ inclinationDeg: deg });
      if (tiltOut) tiltOut.textContent = `${deg}\u00b0`;
    };
  }

  const explain = document.getElementById('bhExplain');
  if (explain) {
    explain.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const next = !SETTINGS.bh_explain_view;
      SETTINGS.bh_explain_view = next;
      explain.setAttribute('data-state', next ? 'on' : 'off');
      explain.setAttribute('aria-checked', next ? 'true' : 'false');
      explain.textContent = next
        ? t('settings.toggle.on')
        : t('settings.toggle.off');
    };
  }
};

export const wireInspectorOverlayToggles = () => {
  wireBlackHoleAppearance();

  const hzBtn = document.getElementById('hzToggleBtn');
  if (hzBtn) {
    hzBtn.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const obj = state.selectedObject?.object;
      if (!obj) return;
      const next = !obj.showHabitableZone;
      obj.showHabitableZone = next;
      hzBtn.setAttribute('data-state', next ? 'on' : 'off');
      hzBtn.setAttribute('aria-checked', next ? 'true' : 'false');
      hzBtn.textContent = next
        ? t('settings.toggle.on')
        : t('settings.toggle.off');
    };
  }

  const frameBtn = document.getElementById('frameToggleBtn');
  if (frameBtn) {
    frameBtn.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const obj = state.selectedObject?.object;
      if (!obj) return;
      const current = frameState();
      const isOn = current.mode === OBJECT && current.objectId === obj.id;
      setFrame(isOn ? WORLD : OBJECT, isOn ? null : obj.id);
    };
  }

  const sweepBtn = document.getElementById('sweepToggleBtn');
  if (sweepBtn) {
    sweepBtn.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const obj = state.selectedObject?.object;
      if (!obj) return;
      const isOn =
        state.areaSweepOverlay.active &&
        state.areaSweepOverlay.objectId === obj.id;
      const set = on => {
        sweepBtn.setAttribute('data-state', on ? 'on' : 'off');
        sweepBtn.setAttribute('aria-checked', on ? 'true' : 'false');
        sweepBtn.textContent = on
          ? t('settings.toggle.on')
          : t('settings.toggle.off');
      };
      if (isOn) {
        state.areaSweepOverlay.active = false;
        state.areaSweepOverlay.wedges = [];
        state.areaSweepOverlay.orbitPoints = [];
        set(false);
        return;
      }
      const data = computeAreaSweep(obj);
      if (!data) return;
      state.areaSweepOverlay.active = true;
      state.areaSweepOverlay.parentId = data.parentId;
      state.areaSweepOverlay.parent = data.parent;
      state.areaSweepOverlay.objectId = data.objectId;
      state.areaSweepOverlay.wedges = data.wedges;
      state.areaSweepOverlay.orbitPoints = data.orbitPoints;
      set(true);
    };
  }
};

/**
 * Resolve everything the inspector needs to draw, for one object.
 *
 * The panel used to be built twice from two near-identical blobs of string
 * concatenation: once when a new object was selected, and again when a mass
 * change transformed one object type into another. The two had already drifted
 * apart. This is the one place that decides what the inspector shows.
 *
 * @param {object} object - The selected body
 * @param {string} type - Its type name
 * @param {object} info - Output of the per-type info function
 * @returns {object|null} A view model for js/objectInspector.js
 */
export const buildInspectorView = (object, type, info) => {
  if (!info) return null;
  const identity = splitIdentity(info.icon, info.title);

  // Ordinary objects get one ungrouped table; a section heading for four rows
  // costs more vertical space than it saves. Bodies with a lot to say - black
  // holes especially - get their extras grouped so the list stays scannable.
  const rows = info.stats.map((stat, i) => ({
    key: `s${i}`,
    label: String(stat.label).replace(/:\s*$/, ''),
    value: stat.value,
    tooltip: getStatTooltip(stat.label, type, stat.tooltipKey),
  }));

  // While a frame is active, the world-frame speed above is true but not what
  // the picture is showing: the view has the origin sitting still. Rather than
  // silently changing what "Velocity" means, add the relative one beside it and
  // say in the label what it is relative to.
  const originVel = frameOriginVelocity(barycenterBodies());
  const frameOrigin = resolveFrameOrigin(barycenterBodies());
  const frameLabel = () => {
    const frame = frameState();
    return frame.mode === BARYCENTER
      ? 'barycenter'
      : barycenterBodies().find(b => b.id === frame.objectId)?.name ||
          'the frame';
  };

  // Where the body is in the frame, not in the scenario's coordinates. Without
  // these two rows the frame is something you can only look at: the picture
  // shows Mars looping and the numbers beside it still describe a circle round
  // the Sun. A direction and a distance are also what an observer on the origin
  // body would actually record, which is what makes them the measurable ones.
  if (frameOrigin && object !== null && object.pos) {
    const dx = object.pos.x - frameOrigin.now.x;
    const dy = object.pos.y - frameOrigin.now.y;
    const sep = Math.hypot(dx, dy);
    if (sep > 0) {
      const against = frameLabel();
      let bearing = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (bearing < 0) bearing += 360;
      rows.push({
        key: 'frameSeparation',
        label: `Distance from ${against}`,
        value: formatDistance(sep),
        tooltip:
          'How far this body is from the reference frame\u2019s origin right now.',
      });
      rows.push({
        key: 'frameBearing',
        label: `Direction from ${against}`,
        value: `${bearing.toFixed(1)}\u00b0`,
        tooltip:
          'Which way this body lies as seen from the frame\u2019s origin, measured anticlockwise from the positive x axis. Watch this number rather than the picture to catch the moment a body reverses direction.',
      });
    }
  }

  if (originVel && object.vel) {
    const against = frameLabel();
    const relative = Math.hypot(
      object.vel.x - originVel.x,
      object.vel.y - originVel.y
    );
    rows.push({
      key: 'frameRelativeSpeed',
      label: `Speed vs ${against}`,
      value: formatSpeed(relative),
      tooltip:
        'How fast this body is moving in the reference frame the view is currently in. The velocity above is measured in the scenario\u2019s own coordinates and does not change when the frame does.',
    });
  }

  const groups =
    rows.length > 9
      ? [{ rows: rows.slice(0, 6) }, { title: 'More', rows: rows.slice(6) }]
      : [{ rows }];

  const overlays = [];
  if (type === 'Star') {
    overlays.push({
      id: 'hzToggleBtn',
      label: t('overlay.habitableZone'),
      on: !!object.showHabitableZone,
      help: 'The range of orbital distances where a rocky planet with a suitable atmosphere could hold liquid water. Inside it is where to look, not a measurement that a world is habitable. Edges follow Kopparapu et al. (2013) from this star\u2019s luminosity and temperature.',
    });
  }
  // Every body can host a frame, so this row is unconditional. It is the one
  // control that changes what all the other numbers on screen mean, which is
  // why it says so in its own help text rather than only in the rail.
  overlays.push({
    id: 'frameToggleBtn',
    label: t('overlay.referenceFrame'),
    on: frameState().mode === OBJECT && frameState().objectId === object.id,
    help: 'Re-express every position, and every trail, as this body would see them. Unlike Follow Mode, which only moves the camera, this redraws the recorded paths: put the Solar System into Earth\u2019s frame and Mars traces a loop that doubles back on itself.',
  });

  const sweepScenarios = [
    'solar-system',
    'earth-moon-system',
    'keplers-2nd-law',
  ];
  if (
    ORBITING_TYPES.includes(type) &&
    sweepScenarios.includes(current_scenario_name)
  ) {
    overlays.push({
      id: 'sweepToggleBtn',
      label: t('overlay.equalAreaSweep'),
      on:
        state.areaSweepOverlay.active &&
        state.areaSweepOverlay.objectId === object.id,
      help: 'Kepler\u2019s second law, drawn. Each wedge covers the same amount of time: thin and long near the star where the object moves fast, wide and short far away where it moves slowly. The areas are equal.',
    });
  }

  return {
    icon: identity.icon,
    name: identity.name,
    kind: String(type || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toUpperCase(),
    mass: massControlModel(object, type),
    groups,
    overlays,
    appearance: type === 'BlackHole' ? appearanceModel(object) : null,
    about: info.description || '',
  };
};

/**
 * The "Appearance and environment" block, for a black hole.
 *
 * Everything in it is a display choice, which is the reason it is a separate
 * disclosure rather than more rows in the table above: the numbers up there -
 * the Schwarzschild radius, the density, the Hawking temperature - are
 * computed from the mass, and nothing offered here can change one of them.
 *
 * @param {object} bh - The selected black hole
 * @returns {object} The model js/objectInspector.js renders
 */
const appearanceModel = bh => {
  const a = bh.appearance || {};
  return {
    title: t('inspector.bh.appearance'),
    note: t('inspector.bh.appearanceNote'),
    environmentLabel: t('inspector.bh.environment'),
    environment: a.environment || ENVIRONMENT.QUIESCENT,
    environments: ENVIRONMENTS.map(value => ({
      value,
      label: t(`inspector.bh.env.${value}`),
    })),
    inclinationLabel: t('inspector.bh.inclination'),
    inclinationDeg: Math.round(a.inclinationDeg ?? 62),
    explainLabel: t('inspector.bh.explain'),
    explain: Boolean(SETTINGS.bh_explain_view),
    scaleNote: t('inspector.bh.scaleNote'),
  };
};

/**
 * Write the identity into the header.
 *
 * @param {object} view - The view model
 */
/** Object kinds that orbit something, and so can be given a burn. */
const ORBITING_TYPES = ['Planet', 'GasGiant', 'Asteroid', 'Comet'];

export const paintInspectorHeader = view => {
  const icon = document.getElementById('inspectorIcon');
  const title = document.getElementById('inspectorTitle');
  const kind = document.getElementById('inspectorKind');
  if (icon && icon.textContent !== view.icon) icon.textContent = view.icon;
  if (title && title.textContent !== view.name) {
    title.textContent = view.name;
    title.title = view.name;
  }
  if (kind && kind.textContent !== view.kind) kind.textContent = view.kind;

  // Offered only for something that is actually in orbit around something.
  // A burn on a star at the center of its own system is not a maneuver, and
  // the planner has nothing to draw for it.
  const burn = document.getElementById('inspectorManeuver');
  if (burn) {
    burn.hidden = !ORBITING_TYPES.includes(state.selectedObject?.type);
  }
};

const massControlModel = (object, type) => {
  debugLog('Creating mass slider for:', type, object);
  let currentMass, minMass, maxMass, massUnit, massLabel;

  switch (type) {
    case 'BlackHole':
      currentMass = object.mass / SOLAR_MASS_UNIT;
      minMass = 0.1;
      maxMass = 1000;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Star':
      currentMass = object.massInSuns || object.mass / SOLAR_MASS_UNIT;
      minMass = 0.08; // Lower minimum to allow very low mass stars
      maxMass = 100;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'NeutronStar':
      currentMass = object.massInSuns || object.mass / SOLAR_MASS_UNIT;
      minMass = 1.0;
      maxMass = 3.0;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'WhiteDwarf':
      currentMass = object.massInSuns || object.mass / SOLAR_MASS_UNIT;
      minMass = 0.1;
      maxMass = 1.4;
      massUnit = 'M<sub class="solar-sub">\u2609</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Planet':
      currentMass = object.massInEarths || object.mass / EARTH_MASS_UNIT;
      minMass = 0.01;
      maxMass = 10;
      massUnit = 'M<sub class="solar-sub">\u2295</sub>';
      massLabel = 'Object Mass';
      break;
    case 'GasGiant':
      currentMass = object.massInJupiters || object.mass / JUPITER_MASS_UNIT;
      minMass = 0.1;
      maxMass = 100; // Extended to allow transformation to star (threshold is 80 M♃)
      massUnit = 'M<sub class="solar-sub">\u2643</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Asteroid':
      currentMass = object.mass / EARTH_MASS_UNIT;
      minMass = 0.0001;
      maxMass = 0.1;
      massUnit = 'M<sub class="solar-sub">\u2295</sub>';
      massLabel = 'Object Mass';
      break;
    case 'Comet':
      currentMass = object.massInComets ?? object.mass / HALLEY_MASS_UNIT;
      minMass = 0.001;
      maxMass = 1.0;
      massUnit = 'C';
      massLabel = 'Object Mass';
      break;
    default:
      return null;
  }

  // Returns a view model rather than markup: js/objectInspector.js owns the
  // HTML now, and the ranges and units are the part that belongs here, next to
  // the object types they describe. massLabel is no longer rendered - the
  // control is labeled "Mass" in one compact row - but the switch above still
  // sets it, so it is read here to keep the linter honest about the branch.
  void massLabel;
  return {
    objectId: object.id ?? 'unknown',
    min: minMass,
    max: maxMass,
    step: (maxMass - minMass) / 100,
    value: currentMass,
    display: `${formatNumber(currentMass, { sig: 3 })} ${massUnit}`,
  };
};

/**
 * Set up event listeners for the mass slider
 */
export const setupMassSliderListeners = () => {
  const massSlider = document.getElementById('massSlider');
  const massValueDisplay = document.getElementById('massValueDisplay');

  if (!massSlider || !massValueDisplay) {
    return;
  }

  // Flag to track if slider is being dragged
  let isDragging = false;

  const updateMass = () => {
    const newMass = massSlider.valueAsNumber;
    if (!isFinite(newMass) || newMass <= 0) return;
    const object = state.selectedObject.object;
    const type = state.selectedObject.type;
    // Editing a mass by hand puts the world beyond what its seed rebuilds.
    markWorldTouched();

    // Skip mass update if we're in the middle of a transformation
    if (state.isTransforming) {
      return;
    }

    // Update the object's mass and check for transformation
    const newType = updateObjectMass(object, type, newMass);

    // Clear the energy chart since mass change invalidates energy history
    // This ensures the chart shows fresh data with the new mass
    if (energyChartReady()) {
      debugLog('Clearing energy chart due to mass change');
      clearEnergyChart();
    }

    // If object type changed, refresh the entire inspector and stop processing
    if (newType && newType !== type) {
      debugLog(`Object transformed from ${type} to ${newType}!`);

      // Set transformation flag to prevent mass updates during the process
      state.isTransforming = true;

      // Update the selected object type
      state.selectedObject.type = newType;

      // Reset the slider value to prevent immediate further transformation
      // For gas giant to star transformation, set slider to the star's actual mass
      if (type === 'GasGiant' && newType === 'Star') {
        // Use the new star object, not the old gas giant object
        const starObject = state.selectedObject.object;
        const massInSolarMasses =
          starObject.massInSuns || starObject.mass / SOLAR_MASS_UNIT;
        // Temporarily set the slider value to the correct star mass
        setTimeout(() => {
          const newSlider = document.getElementById('massSlider');
          if (newSlider) {
            newSlider.value = massInSolarMasses;
            const massValueDisplay =
              document.getElementById('massValueDisplay');
            if (massValueDisplay) {
              massValueDisplay.innerHTML = solarHTML(
                massInSolarMasses.toFixed(3)
              );
            }
          }
        }, 100);
      }

      // Refresh the inspector with new object type
      const inspectorContent = document.getElementById('inspectorContent');
      if (inspectorContent) {
        // A mass change turned this object into something else. Same builder,
        // same renderer as a fresh selection: this path used to carry its own
        // copy of the markup and the two had already drifted apart.
        const info = objectInfoFor(state.selectedObject.object, newType);
        if (!info) return;

        const view = buildInspectorView(
          state.selectedObject.object,
          newType,
          info
        );
        const detailsTabContent = document.getElementById('detailsTab');
        if (view && detailsTabContent) {
          paintInspectorHeader(view);
          detailsTabContent.innerHTML = renderDetails(view);
          setupMassSliderListeners();
          wireInspectorOverlayToggles();
        }

        // Energy tab should still be intact since we only updated details tab
        // Just ensure chart is ready for the new object
        if (energyChartReady()) {
          debugLog('Ensuring chart is ready for transformed object');
          ensureChartReady();
          updateEnergyChart();
        }

        // Show transformation notification
        showTransformationNotification(type, newType);

        // Clear transformation flag after everything is set up
        setTimeout(() => {
          state.isTransforming = false;
        }, 200);
      }
      return; // Stop processing after transformation
    } else {
      // No transformation, just update the display
      let massUnit;
      switch (type) {
        case 'BlackHole':
        case 'Star':
        case 'NeutronStar':
        case 'WhiteDwarf':
          massUnit = 'M<sub class="solar-sub">\u2609</sub>';
          break;
        case 'Planet':
        case 'Asteroid':
          massUnit = 'M<sub class="solar-sub">\u2295</sub>';
          break;
        case 'GasGiant':
          massUnit = 'M<sub class="solar-sub">\u2643</sub>';
          break;
        case 'Comet':
          massUnit = 'C';
          break;
      }

      // massUnit carries <sub> markup, so this must be innerHTML - textContent
      // escaped it and rendered the tags literally.
      massValueDisplay.innerHTML = `${newMass.toFixed(3)} ${massUnit}`;

      // Update the stats display to reflect the new mass
      const inspectorContent = document.getElementById('inspectorContent');
      if (inspectorContent && state.selectedObject) {
        const info = objectInfoFor(
          state.selectedObject.object,
          state.selectedObject.type
        );
        if (!info) return;

        // Values only, through the same patcher the live tick uses. This block
        // used to write the old .stat-row markup by hand, which stopped
        // matching the DOM the moment the panel was redesigned.
        const view = buildInspectorView(
          state.selectedObject.object,
          state.selectedObject.type,
          info
        );
        const detailsTabContent = document.getElementById('detailsTab');
        if (view && detailsTabContent) {
          paintInspectorHeader(view);
          if (!patchDetails(detailsTabContent, view)) {
            detailsTabContent.innerHTML = renderDetails(view);
            setupMassSliderListeners();
            wireInspectorOverlayToggles();
          }
        }
      }
    }
  };

  // Update on slider change
  massSlider.addEventListener('input', updateMass);
  massSlider.addEventListener('change', updateMass);

  // Prevent inspector updates while dragging
  massSlider.addEventListener('mousedown', () => {
    isDragging = true;
    state.sliderDragging = true; // Global flag for inspector updates
  });

  massSlider.addEventListener('mouseup', () => {
    isDragging = false;
    state.sliderDragging = false;
  });

  massSlider.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      state.sliderDragging = false;
    }
  });
};

/**
 * Update an object's mass and recalculate related properties
 * @param {Object} object - The physics object to update
 * @param {string} type - The type of object
 * @param {number} newMass - The new mass value
 * @returns {string|null} The new object type if transformation occurred, null otherwise
 */
const updateObjectMass = (object, type, newMass) => {
  let newType = null;

  // Clear energy history when mass changes to prevent invalid data
  // Energy calculations depend on mass, so old energy data becomes invalid
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(
      `Clearing energy history for object ${object.id} due to mass change`
    );
    clearObjectEnergyHistory(object.id);
  }

  switch (type) {
    case 'BlackHole':
      object.mass = newMass * SOLAR_MASS_UNIT;
      object.updateRadius(); // Update Schwarzschild radius
      break;
    case 'Star':
      debugLog(`DEBUG: Star mass update: newMass = ${newMass} solar masses`);
      object.mass = newMass * SOLAR_MASS_UNIT;
      object.massInSuns = newMass;
      debugLog(
        `DEBUG: Star mass updated: mass = ${object.mass} units, massInSuns = ${object.massInSuns}`
      );
      // Recalculate star properties based on mass
      object.radius = Math.pow(newMass, 0.8) * STAR_OBJ_RADIUS;
      object.temperature = 3000 + (newMass - 0.2) * 4000;
      object.luminosity = Math.pow(newMass, 3.5);

      // Check if star should become a black hole (mass > 20 M☉)
      if (newMass > 20.0) {
        debugLog(
          `DEBUG: Star mass ${newMass} exceeds black hole threshold 20.0 - transforming to black hole`
        );
        newType = 'BlackHole';
        // Transform star to black hole
        transformStarToBlackHole(object);
      }
      break;
    case 'NeutronStar':
      object.mass = newMass * SOLAR_MASS_UNIT;
      object.massInSuns = newMass;
      // Neutron stars have relatively constant radius
      object.radius = NEUTRON_STAR_RADIUS;

      // Check if neutron star should become a black hole (mass > 3 M☉)
      if (newMass > 3.0) {
        newType = 'BlackHole';
        // Transform neutron star to black hole
        transformNeutronStarToBlackHole(object);
      }
      break;
    case 'WhiteDwarf':
      object.mass = newMass * SOLAR_MASS_UNIT;
      object.massInSuns = newMass;
      // White dwarf radius decreases with mass (inverse relationship)
      object.radius = Math.max(
        WHITE_DWARF_RADIUS * Math.pow(newMass, -0.33),
        2
      );

      // Check if white dwarf should become a neutron star (mass > 1.4 M☉ - Chandrasekhar limit)
      if (newMass > 1.4) {
        newType = 'NeutronStar';
        // Transform white dwarf to neutron star
        transformWhiteDwarfToNeutronStar(object);
      }
      break;
    case 'Planet':
      object.mass = newMass * EARTH_MASS_UNIT;
      object.massInEarths = newMass;
      // Recalculate planet radius based on mass
      object.radius = Math.pow(newMass, 0.3) * PLANET_RADIUS;
      object.calculateDensity();

      // Check if planet should become a gas giant (mass > 10 M⊕)
      if (newMass > 10.0) {
        newType = 'GasGiant';
        // Transform planet to gas giant
        transformPlanetToGasGiant(object);
      }
      break;
    case 'GasGiant':
      object.mass = newMass * JUPITER_MASS_UNIT;
      object.massInJupiters = newMass;
      object.massInEarths = newMass * EARTH_MASSES_PER_JUPITER_MASS;
      // Recalculate gas giant radius and type
      object.radius = Math.pow(newMass, 0.2) * GAS_GIANT_RADIUS;
      object.calculateGiantType();

      // Check if gas giant should become a star (mass > 80 M♃)
      if (newMass > 80.0) {
        newType = 'Star';
        // Transform gas giant to star
        transformGasGiantToStar(object);
      }
      break;
    case 'Asteroid':
      object.mass = newMass * EARTH_MASS_UNIT;
      // The slider works in Earth masses, so the Ceres count the class carries
      // has to be recomputed from it. Leaving it behind is how a body ends up
      // gravitating as one thing and being labeled as another.
      object.massInCeres = object.mass / CERES_MASS_UNIT;
      // Asteroid radius scales with mass
      object.radius = Math.pow(newMass * 1000, 0.33) * ASTEROID_RADIUS;

      // Check if asteroid should become a planet (mass > 0.1 M⊕)
      if (newMass > 0.1) {
        newType = 'Planet';
        // Transform asteroid to planet
        transformAsteroidToPlanet(object);
      }
      break;
    case 'Comet':
      // Halley masses to simulation units. This was a second hardcoded copy of
      // the same wrong 0.1 the Comet constructor carried.
      object.mass = newMass * HALLEY_MASS_UNIT;
      object.massInComets = newMass;
      // Comet radius scales with mass
      object.radius = Math.pow(newMass * 10, 0.33) * 2;

      // Check if comet should become an asteroid (mass > 1.0 C)
      if (newMass > 1.0) {
        newType = 'Asteroid';
        // Transform comet to asteroid
        transformCometToAsteroid(object);
      }
      break;
  }

  return newType;
};

/**
 * Transform a star into a black hole
 * @param {Object} object - The star object to transform
 */
const transformStarToBlackHole = object => {
  debugLog('Star transforming into black hole!');
  // Preserve position and velocity
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming star ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  // Create new black hole
  const blackHole = new BlackHole(pos, mass, vel);
  blackHole.name = object.name || 'Transformed Black Hole';

  // Replace the star in the stars array
  const starIndex = stars.indexOf(object);
  if (starIndex !== -1) {
    stars.splice(starIndex, 1);
    bh_list.push(blackHole);

    // Update the selected object reference
    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = blackHole;
      state.selectedObject.type = 'BlackHole';
    }
  }
};

/**
 * Transform a neutron star into a black hole
 * @param {Object} object - The neutron star object to transform
 */
const transformNeutronStarToBlackHole = object => {
  debugLog('Neutron star transforming into black hole!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(
      `Clearing energy history for transforming neutron star ${object.id}`
    );
    clearObjectEnergyHistory(object.id);
  }

  const blackHole = new BlackHole(pos, mass, vel);
  blackHole.name = object.name || 'Transformed Black Hole';

  const nsIndex = neutron_stars.indexOf(object);
  if (nsIndex !== -1) {
    neutron_stars.splice(nsIndex, 1);
    bh_list.push(blackHole);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = blackHole;
      state.selectedObject.type = 'BlackHole';
    }
  }
};

/**
 * Transform a white dwarf into a neutron star
 * @param {Object} object - The white dwarf object to transform
 */
const transformWhiteDwarfToNeutronStar = object => {
  debugLog('White dwarf transforming into neutron star!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(
      `Clearing energy history for transforming white dwarf ${object.id}`
    );
    clearObjectEnergyHistory(object.id);
  }

  const neutronStar = new NeutronStar(pos, vel, mass / SOLAR_MASS_UNIT);
  neutronStar.name = object.name || 'Transformed Neutron Star';

  const wdIndex = white_dwarfs.indexOf(object);
  if (wdIndex !== -1) {
    white_dwarfs.splice(wdIndex, 1);
    neutron_stars.push(neutronStar);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = neutronStar;
      state.selectedObject.type = 'NeutronStar';
    }
  }
};

/**
 * Transform a planet into a gas giant
 * @param {Object} object - The planet object to transform
 */
const transformPlanetToGasGiant = object => {
  debugLog('Planet transforming into gas giant!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass / JUPITER_MASS_UNIT; // Convert to Jupiter masses

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming planet ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  const gasGiant = new GasGiant(pos, vel, mass);
  gasGiant.name = object.name || 'Transformed Gas Giant';

  const planetIndex = planets.indexOf(object);
  if (planetIndex !== -1) {
    planets.splice(planetIndex, 1);
    gas_giants.push(gasGiant);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = gasGiant;
      state.selectedObject.type = 'GasGiant';
    }
  }
};

/**
 * Transform a gas giant into a star
 * @param {Object} object - The gas giant object to transform
 */
const transformGasGiantToStar = object => {
  debugLog('Gas giant transforming into star!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming gas giant ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  // Jupiter masses to solar masses. Both conversions run off the shared
  // constants, so the transformation conserves gravitational mass exactly;
  // with the old 50-units-per-Jupiter figure it silently shed 98% of it.
  const massInJupiters =
    object.massInJupiters || object.mass / JUPITER_MASS_UNIT;
  const massInSolarMasses = massInJupiters / JUPITER_MASSES_PER_SOLAR_MASS;

  // Create star with the converted mass in simulation units
  const star = new StarObject(pos, vel, massInSolarMasses);
  star.name = object.name || 'Transformed Star';

  // Ensure the star has the correct mass properties
  star.massInSuns = massInSolarMasses;
  star.mass = massInSolarMasses * SOLAR_MASS_UNIT;

  const ggIndex = gas_giants.indexOf(object);
  if (ggIndex !== -1) {
    gas_giants.splice(ggIndex, 1);
    stars.push(star);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = star;
      state.selectedObject.type = 'Star';
    }
  }
};

/**
 * Transform an asteroid into a planet
 * @param {Object} object - The asteroid object to transform
 */
const transformAsteroidToPlanet = object => {
  debugLog('Asteroid transforming into planet!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };
  const mass = object.mass / EARTH_MASS_UNIT;

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming asteroid ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  const planet = new Planet(pos, vel, mass);
  planet.name = object.name || 'Transformed Planet';

  const asteroidIndex = asteroids.indexOf(object);
  if (asteroidIndex !== -1) {
    asteroids.splice(asteroidIndex, 1);
    planets.push(planet);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = planet;
      state.selectedObject.type = 'Planet';
    }
  }
};

/**
 * Transform a comet into an asteroid
 * @param {Object} object - The comet object to transform
 */
const transformCometToAsteroid = object => {
  debugLog('Comet transforming into asteroid!');
  const pos = { x: object.pos.x, y: object.pos.y };
  const vel = { x: object.vel.x, y: object.vel.y };

  // Clear energy history for the old object before transformation
  if (object && object.id !== undefined && object.id !== null) {
    debugLog(`Clearing energy history for transforming comet ${object.id}`);
    clearObjectEnergyHistory(object.id);
  }

  // Built at the mass it already had, in the unit the class counts in, rather
  // than built at the default and then overwritten: assigning .mass afterwards
  // left massInCeres describing a different object from the one gravity saw.
  const asteroid = new Asteroid(pos, vel, object.mass / CERES_MASS_UNIT);
  asteroid.name = object.name || 'Transformed Asteroid';

  const cometIndex = comets.indexOf(object);
  if (cometIndex !== -1) {
    comets.splice(cometIndex, 1);
    asteroids.push(asteroid);

    if (state.selectedObject && state.selectedObject.object === object) {
      state.selectedObject.object = asteroid;
      state.selectedObject.type = 'Asteroid';
    }
  }
};
/**
 * Show a notification when an object transforms
 * @param {string} oldType - The previous object type
 * @param {string} newType - The new object type
 */
const showTransformationNotification = (oldType, newType) => {
  // Clear energy chart when object transforms
  if (energyChartReady()) {
    debugLog('Clearing energy chart due to object transformation');
    clearEnergyChart();
  }

  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'transformation-notification';
  notification.innerHTML = `
        <div class="transformation-content">
            <span class="transformation-icon">✨</span>
            <span class="transformation-text">${oldType} → ${newType}</span>
        </div>
    `;

  // Add to page
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add('visible');
  }, 100);

  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove('visible');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 3000);
};

// Helper: Get tooltip text for object properties
function getStatTooltip(statLabel, _objectType, key) {
  // A few rows carry a stable key rather than relying on their English label.
  // The table below is keyed by that label, which means it has never produced
  // a tooltip in Spanish at all; the keyed rows are translated properly, and
  // the rest are a pre-existing gap this pass did not widen.
  if (key === 'radius') return t('inspector.tip.radius');
  if (key === 'rings') return t('inspector.tip.rings');
  const tooltips = {
    Mass: 'Total mass. Determines gravitational strength and orbital dynamics.',
    // Superseded by inspector.tip.radius for every row that carries the key.
    // It used to say "Affects collision detection and visual appearance",
    // which put the two on the same footing - and they are not on the same
    // footing: the number here drives the physics, and what is drawn is a
    // compressed illustration of it.
    Radius: 'Physical size. Affects collision detection and visual appearance.',
    Position: 'Current location in simulation space (x, y coordinates).',
    Velocity:
      'Speed and direction of movement. Determines kinetic energy and trajectory.',
    Speed: 'Magnitude of velocity (how fast the object is moving).',
    Distance: 'Distance from center of simulation or reference point.',
    'Orbital Period': 'Time for one complete orbit around primary object.',
    'Escape Velocity':
      'Minimum speed needed to escape gravitational influence.',
    'Surface Gravity': "Gravitational acceleration at object's surface.",
    Density: 'Mass per unit volume. Determines how compact the object is.',
    Temperature: 'Surface temperature (for stars and some planets).',
    'Surface Temperature':
      "Temperature at star's surface. Determines color and spectral type.",
    Luminosity: 'Total energy output per second (for stars).',
    Age: 'How long the object has existed in simulation.',
    'Life Expectancy': 'Estimated remaining lifetime (for stars).',
    Lifespan:
      'Total expected lifetime of the star. More massive stars live shorter lives.',
    'Spectral Type':
      'Star classification (O, B, A, F, G, K, M). Based on temperature and color.',
    'Event Horizon':
      'Boundary around black hole from which nothing can escape.',
    'Schwarzschild Radius':
      'Event horizon radius. Point of no return where escape velocity equals light speed.',
    'Escape Velocity at Rs':
      'Escape speed at Schwarzschild radius. Always equals light speed (100%).',
    'Average Density':
      'Mass per volume within event horizon. Extremely high density.',
    'Hawking Temperature':
      'Temperature of Hawking radiation. Smaller black holes are hotter.',
    'Hawking Lifetime':
      'Time until complete evaporation via Hawking radiation. Larger holes live longer.',
    'ISCO Period':
      'Orbital period at Innermost Stable Circular Orbit (3x Schwarzschild radius).',
    Type: 'Classification: Primordial, Stellar-Mass, Intermediate, or Supermassive.',
    'Accretion Rate': 'Rate at which matter falls into a black hole.',
    Spin: 'Rotational angular momentum of the object.',
    'Magnetic Field': "Strength of the object's magnetic field.",
    Atmosphere: 'Presence and composition of gaseous envelope.',
    Composition: "Chemical makeup of the object's material.",
    'Trail Length':
      "Number of positions recorded in the object's motion trail.",
    'Collision Count': 'Number of times this object has collided with others.',
    Energy: 'Total mechanical energy (kinetic + potential).',
    'Angular Momentum': "Rotational momentum around the object's axis.",
    'Tidal Force': 'Gravitational force gradient across the object.',
    'Roche Limit':
      'Distance at which tidal forces would break apart the object.',
    'Hill Sphere':
      "Region where the object's gravity dominates over other bodies.",
  };

  return tooltips[statLabel] || null;
}

// =============================================================================
// Object-type glyphs
// -----------------------------------------------------------------------------
// The eight things a reader can add, drawn as SVG rather than typed as emoji.
//
// Emoji were the wrong tool for this in three separate ways. They are drawn by
// the operating system, so the picker was Apple's glossy cartoons on a Mac, a
// flat Fluent set on Windows and, on a Linux machine without an emoji font,
// eight identical tofu boxes - a control whose entire job is to distinguish
// eight things. They have different advance widths, so the labels beside them
// started at eight different x positions and the list read as ragged. And two
// of the eight had no usable emoji at all: a white dwarf was a gemstone and a
// neutron star was a lightning bolt, which are pictures of other things.
//
// These are drawn in the same language as the canvas: the same object-class
// hues from css/tokens.css, the same shapes js/physics.js draws - a star with a
// corona, a gas giant with bands and a ring, an irregular asteroid, a comet
// with a nucleus and a tail, a black hole as a dark disc inside a bright ring.
// They are 16x16, one size, so the column is straight.
//
// They are decoration in the accessibility sense and always carry aria-hidden:
// every place that shows one also shows the type's name as text. An icon is
// never the only thing distinguishing one row from another.
// =============================================================================

/**
 * The glyphs, keyed by the object type names js/ui.js uses.
 *
 * Written as complete <svg> strings rather than assembled from parts: they are
 * constants, they are small, and a template that produced them would be harder
 * to read than the eight pictures it produced. `currentColor` is deliberately
 * absent - each glyph carries its own class hue so the set stays legible on
 * the accent-colored armed button as well as on a panel.
 */
const GLYPHS = Object.freeze({
  // A bright core inside a soft corona, which is what StarObject.draw paints.
  Star:
    '<circle cx="8" cy="8" r="6.5" fill="var(--hue-star)" opacity="0.22"/>' +
    '<circle cx="8" cy="8" r="3.6" fill="var(--hue-star)"/>',

  // A lit limb on one side, the way a rocky planet is shaded from its star.
  Planet:
    '<circle cx="8" cy="8" r="5.4" fill="var(--hue-planet)"/>' +
    // A crescent, not a half: the second arc has to bulge the other way or the
    // path retraces the first one and encloses nothing.
    '<path d="M8 2.6A5.4 5.4 0 0 1 8 13.4A7.4 7.4 0 0 0 8 2.6z" ' +
    'fill="#000" opacity="0.3"/>',

  // Bands and a ring, with the ring passing behind the disc at the top and in
  // front of it at the bottom - the occlusion GasGiant.draw gets right.
  GasGiant:
    '<circle cx="8" cy="8" r="4.9" fill="var(--hue-gasgiant)"/>' +
    '<path d="M3.3 6.6h9.4M3.3 9.4h9.4" stroke="#000" stroke-opacity="0.25" ' +
    'stroke-width="1.1" stroke-linecap="round"/>' +
    '<ellipse cx="8" cy="8" rx="7.2" ry="2.3" fill="none" ' +
    'stroke="var(--hue-gasgiant)" stroke-width="1.1" opacity="0.85" ' +
    'transform="rotate(-18 8 8)"/>',

  // Irregular on purpose: an asteroid is the one body that is not a circle.
  Asteroid:
    '<path d="M7.4 2.9l3.6 1.1 2.1 3-0.7 3.6-3.2 2.4-3.7-0.8-2.4-2.9 ' +
    '0.4-3.7z" fill="var(--hue-asteroid)"/>' +
    '<circle cx="6.6" cy="7.2" r="1" fill="#000" opacity="0.25"/>' +
    '<circle cx="9.9" cy="9.7" r="0.7" fill="#000" opacity="0.2"/>',

  // Nucleus, coma and a tail pointing away from the light - the geometry the
  // renderer uses, not a shooting star.
  Comet:
    '<path d="M9.8 6.2L15 1.6l-3.1 6.1z" fill="var(--hue-comet)" ' +
    'opacity="0.45"/>' +
    '<path d="M8.6 8.4L14.4 4l-4.2 5.7z" fill="var(--hue-comet)" ' +
    'opacity="0.3"/>' +
    '<circle cx="6.6" cy="9.4" r="3.4" fill="var(--hue-comet)" ' +
    'opacity="0.28"/>' +
    '<circle cx="6.6" cy="9.4" r="1.7" fill="var(--hue-comet)"/>',

  // Small and very bright, with a hard limb: a dwarf is Earth-sized and hot.
  WhiteDwarf:
    '<circle cx="8" cy="8" r="5.6" fill="var(--hue-dwarf)" opacity="0.16"/>' +
    '<circle cx="8" cy="8" r="2.3" fill="var(--hue-dwarf)"/>' +
    '<circle cx="8" cy="8" r="2.3" fill="none" stroke="var(--hue-dwarf)" ' +
    'stroke-width="0.7" opacity="0.9"/>',

  // A point with two beams. Not a lightning bolt: the thing that makes a
  // neutron star recognizable is the magnetic axis, and it is what the canvas
  // draws too.
  NeutronStar:
    '<path d="M8 8L4.4 2.2M8 8l3.6 5.8" stroke="var(--hue-neutron)" ' +
    'stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>' +
    '<ellipse cx="8" cy="8" rx="5.4" ry="2" fill="none" ' +
    'stroke="var(--hue-neutron)" stroke-width="0.8" opacity="0.4" ' +
    'transform="rotate(32 8 8)"/>' +
    '<circle cx="8" cy="8" r="1.9" fill="var(--hue-neutron)"/>',

  // The horizon is the black disc. The bright part is the ring around it, and
  // keeping those two separate is the same distinction the renderer makes.
  BlackHole:
    '<circle cx="8" cy="8" r="6" fill="none" stroke="var(--hue-blackhole)" ' +
    'stroke-width="1.5" opacity="0.55"/>' +
    '<ellipse cx="8" cy="8" rx="6.6" ry="2.1" fill="none" ' +
    'stroke="var(--hue-blackhole)" stroke-width="1.2" ' +
    'transform="rotate(-14 8 8)"/>' +
    '<circle cx="8" cy="8" r="3.3" fill="#05060a"/>',
});

/** The types that have a glyph, in no particular order. */
export const GLYPH_TYPES = Object.freeze(Object.keys(GLYPHS));

/**
 * Whether a type has a glyph.
 * @param {string} type - An object type name
 * @returns {boolean} True if hasGlyph
 */
export const hasGlyph = type => Object.hasOwn(GLYPHS, type);

/**
 * The SVG markup for one object type.
 *
 * Returns an empty string for an unknown type rather than throwing or
 * substituting something: a caller that has lost track of its type should show
 * the name it already has beside it, not a wrong picture.
 *
 * @param {string} type - An object type name, e.g. 'GasGiant'
 * @param {object} [options] - Options
 * @param {string} [options.className] - Class for the <svg> element
 * @returns {string} SVG markup, or '' for an unknown type
 */
export function glyphMarkup(type, { className = 'object-glyph' } = {}) {
  const body = GLYPHS[type];
  if (!body) return '';
  return (
    `<svg class="${className}" viewBox="0 0 16 16" width="16" height="16" ` +
    `aria-hidden="true" focusable="false">${body}</svg>`
  );
}

/**
 * The same thing as an element, for callers building DOM rather than strings.
 *
 * @param {string} type - An object type name
 * @param {object} [options] - Passed to glyphMarkup
 * @returns {?SVGElement} The glyph, or null for an unknown type
 */
export function glyphElement(type, options) {
  const markup = glyphMarkup(type, options);
  if (!markup) return null;
  const holder = document.createElement('div');
  holder.innerHTML = markup;
  return /** @type {?SVGElement} */ (holder.firstElementChild);
}
