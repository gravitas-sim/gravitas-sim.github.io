// Depth II gate, criterion 1: each artifact made by the v3.0 build, read by
// the v3.0 build (control) and by this tree. Spike only.
import path from 'node:path';
import { archiveOld, run, V3_COMMIT, REPO } from '../harness.js';
const DIR = path.join(REPO, 'tests', 'compat', 'depth-ii');
const old = archiveOld(V3_COMMIT);
const out = {};
try {
  for (const kind of ['progress-record', 'assignment-link', 'course-pin', 'submission-token']) {
    const made = run(old.tree, kind, 'make', undefined, DIR);
    if (!made.ok) { out[kind] = { made: made.error }; continue; }
    out[kind] = {
      control: run(old.tree, kind, 'read', made.value, DIR),
      spike: run(REPO, kind, 'read', made.value, DIR),
    };
  }
} finally {
  old.cleanup();
}
console.log(JSON.stringify(out, null, 1));
