// =============================================================================
// A link to an investigation that was merged into another or retired
// -----------------------------------------------------------------------------
// Loaded on demand, when `#investigation=<id>` names an id the registry does
// not have. js/data/retiredInvestigations.js says where it went: the successor
// opens with a notice saying so, or the student is told in words that the
// lesson was retired. An id that was never an investigation still says only
// that the link is unknown.
// =============================================================================

import { t } from '../i18n/index.js';
import { toast } from '../notify.js';
import {
  investigationIds,
  investigationMeta,
} from '../data/investigations/registry.js';
import { retiredInvestigation } from '../data/retiredInvestigations.js';
import { readJson } from '../storage/local.js';
import { KEY_INVESTIGATION_PREFIX } from '../names.js';
import { listEarlier } from './earlierView.js';
import { retiredAnswers } from './revisions.js';
import { ensureRevisionMessages } from './revisionText.js';

/**
 * What an unresolved id turns into.
 *
 * @param {string} id - The id in the address bar
 * @param {?string} depth - The depth the link asked for
 * @param {Function} open - openInvestigation of js/investigations.js
 * @param {object} [record] - The retired record (tests pass their own)
 * @returns {Promise<{status: 'unknown'|'moved'|'retired', to: ?string}>}
 */
export async function openRetired(id, depth, open, record) {
  const r = retiredInvestigation(id, new Set(investigationIds()), record);
  if (!r) {
    toast(t('inv.link.unknown'));
    return { status: 'unknown', to: null };
  }
  await ensureRevisionMessages();
  if (!r.to) {
    toast(t('rev.inv.retired', { release: r.release }));
    return { status: 'retired', to: null };
  }
  toast(
    t('rev.inv.moved', {
      release: r.release,
      title: investigationMeta(r.to)?.title || r.to,
    })
  );
  await Promise.resolve(open(r.to, { depth })).catch(() => {});
  // What the student saved under the old id, shown under its successor.
  const saved = readJson(`${KEY_INVESTIGATION_PREFIX}${id}`);
  await listEarlier(
    document.getElementById('investigationProgressNotice'),
    null,
    retiredAnswers(id, saved?.responses, r)
  );
  return { status: 'moved', to: r.to };
}
