// =============================================================================
// Keep a calibration in the notebook (Prompt 212)
// -----------------------------------------------------------------------------
// The panel's "keep" action: the solved night and its calibrated target as one
// gravitas.artifact envelope (js/instruments/photcal.js), in the evidence ledger
// as an artifact entry. The envelope's source is the synthetic night, named by
// the digest of its observations, so a later reader can tell which night it was.
// A separate lazy module so the panel does not carry the notebook until a
// student keeps something.
// =============================================================================

import { t } from './i18n/index.js';
import { sha256Hex } from './hash.js';
import { calibrationRecord } from './instruments/photcal.js';
import { artifactEntry } from './notebook/artifactEntry.js';
import { SOURCE } from './notebook/entry.js';
import {
  load as loadNotebook,
  save as saveNotebook,
} from './notebook/store.js';

/**
 * @param {{night: object, observations: object[], solution: object, calibrated: object, site: ?object, cfg: object}} view
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function keepCalibration(view) {
  const digest = await sha256Hex(JSON.stringify(view.observations)).catch(
    () => null
  );
  if (!digest) return { ok: false, reason: 'no-digest' };
  const envelope = calibrationRecord(view.solution, [view.calibrated], {
    id: `photometric-calibration-${digest.slice(0, 12)}`,
    source: {
      kind: 'forward-model',
      id: view.night.spec.seed,
      digest,
    },
    citations: view.site?.from?.sourceTitle
      ? [{ text: view.site.from.sourceTitle }]
      : [],
  });
  const entry = artifactEntry({
    source: SOURCE.PHOTOMETRIC_CALIBRATION,
    envelope,
    title: t('pcW.keep.title'),
    labels: {
      quantity: q =>
        q.id.startsWith('magnitude.')
          ? t('pcW.keep.q.magnitude')
          : t(`pcW.keep.q.${q.id}`),
    },
    context: { page: 'sandbox' },
  });
  const loaded = loadNotebook();
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  const saved = saveNotebook([...loaded.entries, entry]);
  return saved.ok ? { ok: true } : { ok: false, reason: saved.reason };
}
