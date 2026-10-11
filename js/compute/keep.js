// =============================================================================
// A capsule kept in My work, and read back from a file
// -----------------------------------------------------------------------------
// A lazy module: the compute page loads it when a result is kept. A kept run is
// a notebook entry (js/notebook/artifactEntry.js) holding the run's envelope
// (gravitas.artifact/1), whose source digest is the digest of the input it
// read, and whose engine fingerprint names the runtime and the notebook's
// hash, so the report cites it like any other result: what made it, from
// what, and on which engine. The capsule file itself is the full record; the
// entry's title says which run it is by the first 12 characters of its digest.
// =============================================================================

import { artifactEntry } from '../notebook/artifactEntry.js';
import { SOURCE } from '../notebook/entry.js';
import { load, save } from '../notebook/store.js';

/**
 * The entry for a verified capsule.
 * @param {object} capsule
 * @param {object} envelope - The capsule's envelope, parsed and checked
 * @param {object} entry - The catalogue entry (for the quantities' words)
 * @param {(l: {en: string, es: string}) => string} say - Picks the page language
 * @returns {object} A notebook entry
 */
export function capsuleEntry(capsule, envelope, entry, say) {
  const label = Object.fromEntries(
    entry.outputs.envelope.quantities.map(q => [q.id, say(q.label)])
  );
  const env = {
    ...envelope,
    made: {
      ...envelope.made,
      engineFingerprint: `${capsule.runtime.name}-${capsule.runtime.version}/${capsule.notebook.cellsSha256.slice(0, 12)}`,
    },
    source: {
      ...envelope.source,
      digest: capsule.inputs[0].sha256.slice(0, 64),
    },
  };
  return artifactEntry({
    source: SOURCE.COMPUTE_CAPSULE,
    envelope: env,
    title: `${say(entry.title)} (${capsule.digest.slice(0, 12)})`.slice(0, 120),
    labels: { quantity: q => label[q.id] ?? q.id },
    context: { page: 'compute' },
  });
}

/**
 * Append an entry to the student's notebook.
 * @param {object} entry
 * @returns {{ok: true} | {ok: false, reason: string}}
 */
export function keepEntry(entry) {
  const loaded = load();
  if (!loaded.ok) return { ok: false, reason: loaded.reason };
  const saved = save([...loaded.entries, entry]);
  return saved.ok ? { ok: true } : { ok: false, reason: saved.reason };
}
