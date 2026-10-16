// =============================================================================
// Opening an installed catalog pack in the observatory
// -----------------------------------------------------------------------------
// Loaded only when the observatory is opened from the catalog
// (?installed=<package id>), so a visitor who installs nothing never fetches
// it or its messages. It imports nothing the observatory starts with: the
// page hands over what it needs, the way it hands the fit panel its views,
// because a module both reach would leave the page's bundle for a chunk every
// visitor fetches (js/observatory/fitPanel.js says more).
// =============================================================================

import { openStore } from './store.js';
import { EN_CATALOG } from '../i18n/en.catalog.js';
import { ES_CATALOG } from '../i18n/es.catalog.js';

/**
 * An installed data pack's module, as its runtime copy holds it.
 * @param {string} id - An installed package's id
 * @returns {Promise<{module: {PACK: object, SERIES: object},
 *   citations: object[], version: string}|null>} Null when it is not installed
 */
export async function installedPack(id) {
  const store = await openStore();
  const record = await store.get(id);
  if (!record || record.type !== 'data-pack') return null;
  const d = record.manifest.provides.dataPacks[0];
  return {
    module: JSON.parse(record.files[d.file]),
    citations: record.manifest.citations || [],
    version: record.version,
  };
}

/**
 * Open it in the observatory, or say why not.
 * @param {string} id
 * @param {{open: Function, status: Function, t: Function,
 *   registerMessages: Function}} page - The observatory's own
 * @param {Function} toObservation - fixtures.js lightCurveObservation()
 */
export async function openInstalled(id, page, toObservation) {
  page.registerMessages({ en: EN_CATALOG, es: ES_CATALOG });
  page.status(page.t('cat.opening'));
  try {
    const got = await installedPack(id);
    if (!got) {
      page.status(page.t('cat.openMissing', { id }));
      return;
    }
    page.open(
      await toObservation(got.module, {
        citations: got.citations,
        idPrefix: 'installed',
      })
    );
  } catch (err) {
    page.status(page.t('cat.openFailed', { why: err.message }));
  }
}
