// The application page's quality verdict, for the pages that never render the
// simulation (the Observatory): they call adoptVerdict() once before they
// compute, and never exceed it. js/quality.js writes the key (STORAGE.md).
import { KEY_QUALITY_VERDICT, qualityReport, setTier } from './quality.js';

/** How long a stored verdict is believed, in milliseconds. */
export const VERDICT_MAX_AGE_MS = 3600000;

let adopted = false;

/** @returns {?('low'|'full')} The stored tier; null when absent, stale or unusable */
export function storedVerdict(now = Date.now()) {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY_QUALITY_VERDICT));
    const age = now - v.at;
    return (v.tier === 'low' || v.tier === 'full') &&
      age >= 0 &&
      age <= VERDICT_MAX_AGE_MS
      ? v.tier
      : null;
  } catch {
    return null;
  }
}

/**
 * Take the stored verdict once. It only lowers the tier, and leaves alone a page
 * that renders frames and a tier somebody has already forced.
 *
 * @returns {boolean} Whether it lowered the tier
 */
export function adoptVerdict(now = Date.now()) {
  if (adopted) return false;
  adopted = true;
  const r = qualityReport();
  if (r.framesSeen || !r.auto || r.tier === 'low') return false;
  if (storedVerdict(now) !== 'low') return false;
  setTier('low');
  return true;
}
