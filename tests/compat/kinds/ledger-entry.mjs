import { submissionFor } from './_submission.mjs';

// The evidence ledger a token carries (ev: digest, ids, total, rows). It is
// never stored alone. Reader: checkEvidence -> verified | partial | mismatch.
export default {
  id: 'ledger-entry',
  label: 'ledger entry (inside a token)',
  format: 'gravitas.ledger/1',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'ignored',
  async make(load) {
    const { submission } = await submissionFor(load, { evidence: true });
    return submission.ev;
  },
  async read(load, ev) {
    const { checkEvidence } = await load('js/submission/ledgerDigest.js');
    const r = await checkEvidence(ev);
    return { accepted: r.state === 'verified', problems: [r.state], value: r };
  },
  async rewrite(load, ev) {
    return ev;
  },
};
