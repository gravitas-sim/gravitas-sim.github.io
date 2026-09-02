// =============================================================================
// Rendering the object inspector
// -----------------------------------------------------------------------------
// The inspector used to be built by string concatenation inside ui.js, and
// rebuilt ten times a second: every stat row had its innerHTML replaced on each
// tick, which threw away and recreated DOM for values that had not changed and
// closed any disclosure the user had opened.
//
// This module owns the markup and nothing else. It is handed a plain view model
// - already resolved by ui.js, which is the part that knows about state, units
// and the simulation - and returns HTML, or patches values into DOM that already
// exists. No imports from ui.js, so no cycle.
//
// The two entry points are deliberately separate:
//
//   renderDetails(view)        build once, when the selection changes
//   patchDetails(root, view)   ten times a second, touching only text nodes
//
// The second one is why an open "About this object" stays open while the
// numbers beside it keep moving.
// =============================================================================

/**
 * Escape text for safe interpolation into markup.
 *
 * Object names can come from scenario data and from a user renaming a body, so
 * they are not trusted to be markup-free.
 *
 * @param {*} value - Any value
 * @returns {string} HTML-safe text
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Split a display title into the emoji that leads it and the name that follows.
 *
 * The existing info functions return a title with the icon already glued to the
 * front. The redesigned header shows them as separate elements so the name can
 * truncate without taking the icon with it.
 *
 * @param {string} icon - Icon supplied by the info function
 * @param {string} title - Title supplied by the info function
 * @returns {{icon: string, name: string}} The two halves
 */
export function splitIdentity(icon, title) {
  const raw = String(title ?? '').trim();
  const lead = String(icon ?? '').trim();
  // Some info functions repeat the icon inside the title.
  const name =
    lead && raw.startsWith(lead) ? raw.slice(lead.length).trim() : raw;
  return { icon: lead, name: name || 'Object' };
}

/**
 * The mass control: label, slider and readout on one row.
 *
 * The old version was a centered "Object Mass" heading, a full-width slider, a
 * glowing value badge and a permanent line of text reading "Hover for mass
 * adjustment tips". That is four rows for one control. The explanation now
 * hangs off a help affordance instead of occupying the panel forever.
 *
 * @param {object} mass - View model for the control
 * @returns {string} HTML
 */
function renderMass(mass) {
  if (!mass) return '';
  const help =
    'Drag to change this object&#39;s mass. More mass means stronger gravity, and a large enough change can turn one kind of object into another.';
  return `
    <div class="insp-mass">
      <span class="insp-mass-label">
        <label for="massSlider">Mass</label>
        <button type="button" class="insp-help" aria-label="About the mass control" title="${help}">i</button>
      </span>
      <input
        type="range"
        id="massSlider"
        min="${mass.min}"
        max="${mass.max}"
        step="${mass.step}"
        value="${mass.value}"
        data-object-id="${escapeHtml(mass.objectId)}"
        aria-label="Object mass"
      />
      <output class="insp-mass-value" id="massValueDisplay" for="massSlider">${mass.display}</output>
    </div>`;
}

/**
 * The property table.
 *
 * A two-column grid rather than one row element per property: the label and the
 * value are separate grid children, which is what lets the value column align
 * on its own edge without a fixed label width.
 *
 * @param {Array} groups - Groups of rows
 * @returns {string} HTML
 */
function renderProps(groups) {
  const parts = ['<div class="insp-props">'];
  for (const group of groups) {
    if (group.title) {
      parts.push(`<div class="insp-group">${escapeHtml(group.title)}</div>`);
    }
    for (const row of group.rows) {
      const tip = row.tooltip ? ` title="${escapeHtml(row.tooltip)}"` : '';
      // One row element rather than two grid children: the separator then runs
      // the full width of the panel instead of stopping either side of the
      // column gap, which read as a stack of boxes rather than a table.
      parts.push(
        `<div class="insp-prop"${tip}>` +
          `<span class="insp-prop-label">${escapeHtml(row.label)}</span>` +
          `<span class="insp-prop-value" data-prop="${escapeHtml(row.key)}">${row.value}</span>` +
          `</div>`
      );
    }
  }
  parts.push('</div>');
  return parts.join('');
}

/**
 * The overlay toggles, gathered into one section.
 *
 * Previously each of these was its own bordered block with a paragraph of
 * explanation underneath, which together came to most of a screen. The
 * explanation is still one click away.
 *
 * @param {Array} overlays - Toggle view models
 * @returns {string} HTML
 */
function renderOverlays(overlays) {
  if (!overlays.length) return '';
  const rows = overlays
    .map(
      o => `
      <div class="insp-toggle-row">
        <span id="${o.id}Label">${escapeHtml(o.label)}</span>
        <button type="button" class="insp-help" aria-label="About ${escapeHtml(o.label)}" title="${escapeHtml(o.help)}">i</button>
        <button
          type="button"
          id="${o.id}"
          class="toggle-button"
          data-state="${o.on ? 'on' : 'off'}"
          role="switch"
          aria-checked="${o.on ? 'true' : 'false'}"
          aria-labelledby="${o.id}Label"
        >${o.on ? 'On' : 'Off'}</button>
      </div>`
    )
    .join('');
  return `
    <div class="insp-overlays">
      <div class="insp-overlays-title">Overlays</div>
      ${rows}
    </div>`;
}

/**
 * The description, collapsed.
 *
 * This block was the single largest contributor to the panel's height, shown in
 * full for every object whether or not anyone was reading it.
 *
 * @param {string} description - HTML description
 * @returns {string} HTML
 */
function renderAbout(description) {
  if (!description) return '';
  return `
    <details class="insp-about">
      <summary>About this object</summary>
      <div class="insp-about-body">${description}</div>
    </details>`;
}

/**
 * Build the whole Details panel.
 *
 * @param {object} view - The view model
 * @returns {string} HTML
 */
export function renderDetails(view) {
  return (
    renderMass(view.mass) +
    renderProps(view.groups) +
    renderOverlays(view.overlays ?? []) +
    renderAbout(view.about)
  );
}

/**
 * Decide where the inspector should rest, given what else is on screen.
 *
 * Kept pure and separate from the measuring so it can be checked at sizes that
 * are awkward to drive a real browser to. The caller passes rectangles; this
 * returns a point.
 *
 * The stylesheet used to own this as a fixed inset from the right edge, which
 * is correct on a wide screen and wrong on a narrow one: between roughly 620
 * and 760 pixels of width that inset puts the panel's left edge across the
 * readout overlay in the top left corner. Measuring finds that case; a
 * constant cannot.
 *
 * Dock right, against the rail if the rail is a right-hand column and against
 * the window edge otherwise. If that crosses the readout, drop below it.
 *
 * There is no third case where the panel tucks in beside the readout at the
 * same height: reaching it would mean the panel's left edge is inside the
 * readout and there is room to the readout's right for the whole panel, and
 * those two cannot both be true.
 *
 * @param {object} opts - Geometry
 * @param {number} opts.viewportWidth - Window width in px
 * @param {number} opts.viewportHeight - Window height in px
 * @param {number} opts.panelWidth - Panel width in px
 * @param {number} opts.panelHeight - Panel height in px
 * @param {?object} opts.hud - Readout rect, or null when hidden
 * @param {?object} opts.rail - Control rail rect, or null when hidden
 * @param {number} [opts.gap] - Breathing room in px
 * @param {number} [opts.preferredTop] - Resting top in px
 * @returns {{left: number, top: number, maxHeight: number}} Where to put it,
 *   and how tall it may be there
 */
const MIN_INSPECTOR_HEIGHT = 260;

export function computeDockPosition({
  viewportWidth,
  viewportHeight,
  panelWidth,
  panelHeight,
  hud,
  rail,
  gap = 12,
  preferredTop = 96,
}) {
  // Below about 1180px the rail stops being a right-hand column and becomes a
  // full-width sheet. Treating that as a blocker would leave nowhere to go.
  const railBlocks = rail && rail.left > viewportWidth * 0.5;
  const rightLimit = railBlocks ? rail.left - gap : viewportWidth - gap;

  let top = preferredTop;
  let left = rightLimit - panelWidth;

  const crossesHud =
    hud &&
    left < hud.right + gap &&
    top < hud.bottom &&
    top + panelHeight > hud.top;

  if (crossesHud) top = hud.bottom + gap;
  top = Math.max(gap, top);

  // Going below the readout on a short window would hang the panel's bottom
  // half off the screen, so the panel gets a height budget for where it landed
  // rather than a position it cannot use. It already scrolls internally.
  let maxHeight = viewportHeight - top - gap;
  if (maxHeight < MIN_INSPECTOR_HEIGHT) {
    maxHeight = MIN_INSPECTOR_HEIGHT;
    top = Math.max(gap, viewportHeight - gap - maxHeight);
  }

  return {
    left: Math.round(Math.max(gap, left)),
    top: Math.round(top),
    maxHeight: Math.round(maxHeight),
  };
}

/**
 * Build a pinned comparison card for one object.
 *
 * Deliberately read-only: identity and numbers, no mass slider and no overlay
 * toggles. Two reasons. The controls in the main inspector are addressed by id
 * - #massSlider, #hzToggleBtn - and a second copy would collide with the first,
 * so every lookup would find whichever came earlier in the document. And when
 * you pin a card it is to hold a set of numbers still beside another set; a
 * second slider is not what the comparison needs.
 *
 * @param {object} view - The view model
 * @returns {string} HTML for the card's inner content
 */
export function renderPinnedCard(view) {
  return (
    `<div class="insp-pin-header">
       <span class="inspector-icon" aria-hidden="true">${escapeHtml(view.icon)}</span>
       <span class="inspector-identity">
         <span class="inspector-title" title="${escapeHtml(view.name)}">${escapeHtml(view.name)}</span>
         <span class="inspector-kind">${escapeHtml(view.kind)}</span>
       </span>
       <button type="button" class="inspector-close" data-pin-close
               aria-label="Close the pinned card for ${escapeHtml(view.name)}"
               title="Unpin">&times;</button>
     </div>` + renderProps(view.groups)
  );
}

/**
 * Update an already-rendered Details panel in place.
 *
 * Only text content is touched, and only where it differs. Nothing is
 * recreated, so focus, an open disclosure and a slider mid-drag all survive the
 * ten-per-second refresh.
 *
 * @param {HTMLElement} root - The details container
 * @param {object} view - The view model
 * @returns {boolean} True if the panel matched and was patched
 */
export function patchDetails(root, view) {
  if (!root) return false;
  const values = root.querySelectorAll('.insp-prop-value');
  const rows = view.groups.flatMap(g => g.rows);
  // A different object, or a different set of properties, needs a rebuild.
  if (values.length !== rows.length) return false;

  rows.forEach((row, i) => {
    const el = values[i];
    if (el.dataset.prop !== row.key) return;
    const next = String(row.value);
    if (el.innerHTML !== next) el.innerHTML = next;
  });

  const massValue = root.querySelector('#massValueDisplay');
  if (massValue && view.mass && massValue.innerHTML !== view.mass.display) {
    massValue.innerHTML = view.mass.display;
  }

  for (const o of view.overlays ?? []) {
    const btn = root.querySelector(`#${o.id}`);
    if (!btn) continue;
    const on = btn.getAttribute('data-state') === 'on';
    if (on !== o.on) {
      btn.setAttribute('data-state', o.on ? 'on' : 'off');
      btn.setAttribute('aria-checked', o.on ? 'true' : 'false');
      btn.textContent = o.on ? 'On' : 'Off';
    }
  }
  return true;
}

/**
 * Build the Energy panel.
 *
 * Four large cards became four aligned rows, and the chart lost its hardcoded
 * 500x300 canvas in favour of a container the panel can size.
 *
 * @returns {string} HTML
 */
export function renderEnergy() {
  const row = (label, id, tip) => `
    <div class="insp-prop" title="${escapeHtml(tip)}">
      <span class="insp-prop-label">${label}</span>
      <span class="insp-prop-value" id="${id}">—</span>
    </div>`;
  return `
    <div class="insp-props">
      ${row('Kinetic', 'currentKineticEnergy', 'Energy of motion: rises with mass and with the square of speed.')}
      ${row('Potential', 'currentPotentialEnergy', 'Energy of position in the gravitational field. More negative means more deeply bound.')}
      ${row('Total', 'currentTotalEnergy', 'Kinetic plus potential. A flat total means a stable orbit; a rising one means the object is being unbound.')}
      ${row('Samples', 'currentDataPoints', 'How many measurements have been recorded for this object.')}
    </div>
    <div class="insp-energy-head" style="margin-top: var(--space-3)">
      <span class="insp-energy-title">Energy history</span>
      <span class="insp-energy-actions">
        <button type="button" class="insp-icon-btn" id="refreshEnergyChart" aria-label="Refresh the energy chart" title="Refresh the chart">↻</button>
        <button type="button" class="insp-icon-btn" id="exportEnergyChart" aria-label="Export the energy chart as an image" title="Export as PNG">⇩</button>
      </span>
    </div>
    <div class="insp-energy-chart">
      <canvas id="energyChart"></canvas>
    </div>`;
}
