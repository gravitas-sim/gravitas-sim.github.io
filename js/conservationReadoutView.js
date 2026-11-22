// =============================================================================
// The conservation check in the readout panel
// -----------------------------------------------------------------------------
// The integrator, the energy this world's model conserves (or why it conserves
// none, js/engine/conservation.js), the all-pairs energy as its own named
// line, angular momentum, when the reference was taken, the change at the
// last engine event, and every reason the scene is not closed. Moved out of
// js/render.js, which builds the rest of the panel, without a change of
// behaviour beyond the model lines.
// =============================================================================

import { t, registerMessages } from './i18n/index.js';
import { EN_ENERGYREADOUT } from './i18n/en.energyReadout.js';
import { ES_ENERGYREADOUT } from './i18n/es.energyReadout.js';
import { formatTime } from './units.js';

registerMessages('en', EN_ENERGYREADOUT, true);
registerMessages('es', ES_ENERGYREADOUT, true);

// The same escaping js/render.js uses for the rest of the panel.
const escapeHtml = v =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The conservation check's markup.
 * @param {object} drift - conservationDrift()
 * @returns {string} HTML
 */
export function conservationReadoutHtml(drift) {
  const pct = v =>
    !Number.isFinite(v) ? '\u2014' : `${v >= 0 ? '+' : ''}${v.toPrecision(3)}%`;
  // An absolute change, for the case where a relative one cannot be
  // formed. Two significant figures: it is an order-of-magnitude fact.
  const abs = v =>
    !Number.isFinite(v) ? '\u2014' : `${v >= 0 ? '+' : ''}${v.toPrecision(2)}`;

  const rows = [
    [
      t('readout.integrator'),
      t(
        `settings.option.integrator.${drift.integrator
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}`
      ),
    ],
  ];

  // Energy and angular momentum, each either as a percentage of the
  // reference or - when the reference was itself the near-cancellation of
  // much larger terms - as the change itself, said plainly.
  // The energy this world's model conserves, measured since its last
  // event, or why it conserves none; then the all-pairs sum, which every
  // world has and few conserve, as its own named line.
  const model = drift.model;
  const field = model.fixedField ? 'fixedField' : 'energy';
  rows.push(
    !model.conserved
      ? [
          t('readout.model.none'),
          t('readout.model.reason', {
            reason: t(`readout.model.reason.${model.failure}`),
          }),
        ]
      : model.conditioned
        ? [t(`readout.model.${field}`), pct(model.drift)]
        : [t(`readout.model.${field}Change`), abs(model.change)]
  );
  rows.push(
    drift.energyConditioned
      ? [t('readout.drift.allPairs'), pct(drift.energyDrift)]
      : [t('readout.drift.allPairsChange'), abs(drift.energyChange)]
  );
  rows.push(
    drift.angularConditioned
      ? [t('readout.drift.angular'), pct(drift.angularDrift)]
      : [t('readout.drift.angularChange'), abs(drift.angularChange)]
  );

  // When the reference was taken. A drift figure with no interval attached
  // is not a measurement, and a reader who rebaselines has to be able to
  // see that they did.
  rows.push([t('readout.drift.since'), formatTime(drift.baselineTime)]);

  const illConditioned = !drift.energyConditioned || !drift.angularConditioned;

  return (
    // <details> rather than a title attribute: an explanation reachable
    // only by hovering is unreachable by keyboard and unreachable on a
    // touch screen, and this one is the difference between a number and a
    // number somebody can act on.
    `<div class="readout-conservation">
       <h3 class="readout-conservation-title">${escapeHtml(t('readout.conservation.title'))}</h3>
       <dl class="readout-metrics is-diagnostics">${rows
         .map(
           ([k, v]) =>
             `<div class="readout-metric"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`
         )
         .join('')}</dl>${
         model.event
           ? `<p class="readout-caveat">${escapeHtml(
               t('readout.model.event', {
                 change: abs(model.event.change),
                 event: t(`readout.model.event.${model.event.kind}`),
               })
             )}</p>`
           : ''
       }${
         illConditioned
           ? `<p class="readout-caveat">${escapeHtml(t('readout.conservation.illConditioned'))}</p>`
           : ''
       }${
         // Every reason, not the first one. A scene can have a static hole
         // and imposed decay and merging at once, and naming one of the
         // three invites the reader to blame the integrator for the other
         // two.
         drift.caveats.length
           ? `<ul class="readout-caveats">${drift.caveats
               .map(c => `<li>${escapeHtml(t(c))}</li>`)
               .join('')}</ul>`
           : `<p class="readout-caveat">${escapeHtml(t('readout.conservation.closed'))}</p>`
       }
     </div>`
  );
}
