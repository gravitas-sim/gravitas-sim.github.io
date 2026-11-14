// =============================================================================
// Course items that name something revised or retired (lazy)
// -----------------------------------------------------------------------------
// Loaded by ./api.js only when a course names an investigation the build no
// longer has, and by the builder only to word a review row that says a step or a
// lesson was replaced. The records are js/data/retiredInvestigations.js (an
// investigation) and a lesson's `retired` map (a step): CONTRIBUTING_CONTENT.md.
// =============================================================================

import { retiredInvestigation } from '../data/retiredInvestigations.js';
import { ensureRevisionMessages } from '../investigations/revisionText.js';
import { getLocale, t } from '../i18n/index.js';
import { wasIn } from '../investigations/revisions.js';

/**
 * Where each missing investigation went; a live successor's facts are loaded
 * into `lessons` too, so a reviewed upgrade can follow it.
 *
 * @returns {Promise<Map<string, object>>} By the id the course names
 */
export async function retiredFacts(ids, have, lessons, known, load, factsOf) {
  const out = new Map();
  for (const id of ids) {
    const r = have.has(id) ? null : retiredInvestigation(id, have);
    if (!r) continue;
    out.set(id, r);
    if (r.to && !lessons.has(r.to)) {
      if (!known.has(r.to)) known.set(r.to, factsOf(await load(r.to)));
      lessons.set(r.to, known.get(r.to));
    }
  }
  return out;
}

/**
 * A review row's revisions as sentences, for the instructor.
 *
 * @param {{revisedSteps?: Array<object>, retiredLesson?: object}} detail
 * @returns {Promise<Array<string>>} One sentence per revision
 */
export async function notes(detail) {
  await ensureRevisionMessages();
  const out = (detail.revisedSteps || []).map(r =>
    t(r.to ? 'rev.pin.step' : 'rev.pin.stepGone', {
      ...r,
      was: wasIn(r.was, getLocale()),
    })
  );
  const l = detail.retiredLesson;
  if (l)
    out.push(t(l.to ? 'rev.inv.pin' : 'rev.inv.pinGone', { ...l, to: l.to }));
  return out;
}
