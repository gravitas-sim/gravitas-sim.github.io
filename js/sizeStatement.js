// =============================================================================
// The Sizes statement: what is drawn to scale and what is not
// -----------------------------------------------------------------------------
// Opened from the readout's Sizes button; fetched the first time it is asked
// for. Distances are to scale; sizes are not, and the table says by how much
// for the selected body, or for each kind of body present. The figures are
// js/sizeFacts.js's, the same ones the canvas description reads.
// =============================================================================

import { openDialog, closeDialog } from './dialog.js';
import { t, getLocale, registerMessages } from './i18n/index.js';
import { formatDistance } from './units.js';
import { SIM_UNITS_PER_AU } from './constants.js';
import { DISPLAY_MIN_PX } from './bodyVisuals.js';
import { sizeFacts, familyRows, timesText, familyName } from './sizeFacts.js';
import { state } from './appState.js';
import {
  stars,
  planets,
  gas_giants,
  asteroids,
  comets,
  neutron_stars,
  white_dwarfs,
  bh_list,
  galaxies,
  debris,
} from './physics.js';

const esc = s =>
  String(s).replace(
    /[&<>"']/g,
    c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]
  );

/** Every live body the statement can speak about. */
export const allBodies = () => [
  ...stars,
  ...planets,
  ...gas_giants,
  ...asteroids,
  ...comets,
  ...neutron_stars,
  ...white_dwarfs,
  ...bh_list,
  ...galaxies,
  ...debris,
];

function bodyTable(body) {
  const f = sizeFacts(body);
  const name = body.name || familyName(f.family);
  const cells = f.notModelled
    ? [name, t('sizes.notModelled'), '—', '—']
    : [
        name,
        f.realAu
          ? formatDistance(f.realAu * SIM_UNITS_PER_AU)
          : t('sizes.noReal'),
        formatDistance(f.modelRadius),
        f.drawnOverReal ? timesText(f.drawnOverReal) : t('sizes.noReal'),
      ];
  return `<table class="sizes-table"><caption>${esc(t('sizes.caption'))}</caption>
    <thead><tr>${['body', 'real', 'model', 'drawn'].map(k => `<th scope="col">${esc(t(`sizes.col.${k}`))}</th>`).join('')}</tr></thead>
    <tbody><tr><th scope="row">${esc(cells[0])}</th>${cells
      .slice(1)
      .map(c => `<td>${esc(c)}</td>`)
      .join('')}</tr></tbody></table>`;
}

function familyTable(rows) {
  if (!rows.length) return `<p>${esc(t('sizes.empty'))}</p>`;
  return `<table class="sizes-table"><caption>${esc(t('sizes.caption'))}</caption>
    <thead><tr><th scope="col">${esc(t('sizes.col.body'))}</th><th scope="col">${esc(t('sizes.col.drawn'))}</th></tr></thead>
    <tbody>${rows
      .map(
        r =>
          `<tr><th scope="row">${esc(
            `${familyName(r.family)} (${r.count})`
          )}</th><td>${esc(
            r.notModelled
              ? t('sizes.notModelled')
              : r.lo
                ? timesText(r.lo, r.hi)
                : t('sizes.noReal')
          )}</td></tr>`
      )
      .join('')}</tbody></table>`;
}

let panel = null;

/** The statement's words, fetched with it, for the language in use. */
async function ensureMessages() {
  const locale = getLocale();
  const m =
    locale === 'es'
      ? await import('./i18n/es.sizes.js')
      : await import('./i18n/en.sizes.js');
  registerMessages(locale, m.ES_SIZES || m.EN_SIZES);
}

/**
 * Open the statement.
 * @param {HTMLElement} [trigger] - Where focus returns on close
 * @returns {Promise<HTMLElement>} The dialog
 */
export async function openSizeStatement(trigger) {
  await ensureMessages().catch(() => {});
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'modal-panel sizes-statement';
    panel.id = 'sizesStatement';
    panel.setAttribute('aria-labelledby', 'sizesStatementTitle');
    panel.hidden = true;
    document.body.append(panel);
    panel.addEventListener('click', e => {
      if (e.target.closest('[data-act=close]')) closeDialog(panel);
    });
  }
  const selected = state.selectedObject?.object;
  panel.innerHTML = `<h2 id="sizesStatementTitle">${esc(t('sizes.title'))}</h2>
    <p>${esc(t('sizes.distances', { perAu: SIM_UNITS_PER_AU }))}</p>
    <p>${esc(t('sizes.notSizes'))}</p>
    ${selected ? bodyTable(selected) : familyTable(familyRows(allBodies()))}
    <p>${esc(t('sizes.collision', { floor: DISPLAY_MIN_PX }))}</p>
    <div class="ui-toolbar"><button type="button" class="ui-button" data-act="close">${esc(t('sizes.close'))}</button></div>`;
  openDialog(panel, {
    trigger,
    isolate: true,
    initialFocus: '[data-act=close]',
  });
  return panel;
}
