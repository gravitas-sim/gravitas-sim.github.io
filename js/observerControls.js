// =============================================================================
// The observer control, built once and reused
// -----------------------------------------------------------------------------
// Every observing panel shows the same two sliders, and they must all be the
// same two sliders. Three panels with three independent inclination controls
// would be three different observers, and a student who set the light curve
// face-on and then read a full-amplitude radial-velocity curve would have been
// taught something false by the interface itself.
//
// So: this builds the control block into whatever panel asks for it, writes
// straight through to js/observerGeometry.js, and subscribes to that module so
// every other copy of the control moves at the same time.
//
// Wording is for a student who has never met a celestial coordinate system.
// "Position angle" and "Inclination" are the terms they will meet in the
// literature, so they are the labels. The plain-language explanation of each is
// carried as the slider's title and as visually-hidden text referenced by
// aria-describedby: a screen reader and a hovering mouse both get it, and it
// does not cost 120 vertical pixels in a panel that has to share the screen
// with two other instruments. What stays visible is the word for the current
// tilt - "Edge-on", "Nearly face-on" - which is the part that changes.
// =============================================================================

import {
  getPositionAngle,
  getInclination,
  setPositionAngle,
  setInclination,
  onObserverChange,
} from './observerGeometry.js';

const POSITION_ANGLE_HELP =
  'Where around the system you are standing. This changes when things line up, not how strong the signals are.';
const INCLINATION_HELP =
  'How tilted the orbit looks from here. 90° is edge-on, seen from the side; 0° is face-on, seen from above.';

/**
 * Build an observer control block inside a host element.
 *
 * Safe to call for several panels at once: each gets its own sliders, and all
 * of them are kept in step through the shared observer's change event.
 *
 * @param {HTMLElement} host - Element to fill
 * @param {object} [options] - Which controls to show
 * @param {boolean} [options.inclination] - Include the inclination slider
 * @returns {Function} Teardown, which unsubscribes and empties the host
 */
export function mountObserverControls(host, { inclination = true } = {}) {
  if (!host) return () => {};

  host.innerHTML = `
    <div class="obs-control-row">
      <label class="obs-control-label" for="${host.id}-pa">
        Position angle
        <span class="obs-control-value" data-pa-value>0°</span>
      </label>
      <input type="range" id="${host.id}-pa" class="obs-control-slider"
             data-pa-slider
             min="0" max="360" step="1" value="0"
             aria-describedby="${host.id}-pa-help"
             title="${POSITION_ANGLE_HELP}" />
      <p class="obs-control-help visually-hidden" id="${host.id}-pa-help">${POSITION_ANGLE_HELP}</p>
    </div>
    ${
      inclination
        ? `<div class="obs-control-row">
      <label class="obs-control-label" for="${host.id}-inc">
        Inclination
        <span class="obs-control-value" data-inc-value>90°</span>
      </label>
      <input type="range" id="${host.id}-inc" class="obs-control-slider"
             data-inc-slider
             min="0" max="90" step="1" value="90"
             aria-describedby="${host.id}-inc-help"
             title="${INCLINATION_HELP}" />
      <div class="obs-tilt" aria-hidden="true"><span data-tilt-disc></span></div>
      <p class="obs-control-help">
        <span data-inc-word>Edge-on</span>
      </p>
      <p class="obs-control-help visually-hidden" id="${host.id}-inc-help">
        ${INCLINATION_HELP}
      </p>
    </div>`
        : ''
    }
  `;

  // Selected by data attribute rather than by id: the ids exist to tie each
  // label and its help text to its input for assistive technology, and turning
  // an arbitrary host id into a valid selector needs CSS.escape, which is not
  // available everywhere this runs.
  const paSlider = host.querySelector('[data-pa-slider]');
  const paValue = host.querySelector('[data-pa-value]');
  const incSlider = host.querySelector('[data-inc-slider]');
  const incValue = host.querySelector('[data-inc-value]');
  const incWord = host.querySelector('[data-inc-word]');
  const tiltDisc = host.querySelector('[data-tilt-disc]');

  /**
   * Describe an inclination in words.
   *
   * The slider is not the only channel: a student using a screen reader, and a
   * student who simply has not learned to read a tilt off a number, both get
   * the same information from the label.
   *
   * @param {number} deg - Inclination in degrees
   * @returns {string} A short phrase
   */
  const describeInclination = deg => {
    if (deg >= 88) return 'Edge-on';
    if (deg >= 70) return 'Nearly edge-on';
    if (deg >= 40) return 'Tilted';
    if (deg >= 12) return 'Nearly face-on';
    return 'Face-on';
  };

  const render = () => {
    const pa = getPositionAngle();
    const inc = getInclination();
    if (paSlider && document.activeElement !== paSlider) {
      paSlider.value = String(Math.round(pa));
    }
    if (paValue) paValue.textContent = `${Math.round(pa)}°`;
    if (incSlider && document.activeElement !== incSlider) {
      incSlider.value = String(Math.round(inc));
    }
    if (incValue) incValue.textContent = `${Math.round(inc)}°`;
    if (incWord) incWord.textContent = describeInclination(inc);
    if (tiltDisc) {
      // A disc seen at the same tilt: full circle face-on, a line edge-on.
      // Inclination cannot honestly be shown by the 2-D observer arrow on the
      // simulation, so it gets its own small picture instead of being faked.
      const squash = Math.cos((inc * Math.PI) / 180);
      tiltDisc.style.transform = `scaleY(${Math.max(0.04, squash).toFixed(3)})`;
    }
  };

  paSlider?.addEventListener('input', e =>
    setPositionAngle(parseFloat(e.target.value))
  );
  incSlider?.addEventListener('input', e =>
    setInclination(parseFloat(e.target.value))
  );

  const unsubscribe = onObserverChange(render);
  render();

  return () => {
    unsubscribe();
    host.innerHTML = '';
  };
}
