// =============================================================================
// One-off: move the instructor expectations out of instructorContent.js into
// js/data/instructorExpectations.js, keyed by step sid instead of the 1-based
// step number. Kept so the conversion is reproducible and reviewable; a second
// run finds no number-keyed blocks and does nothing.
//
// Why a module of its own: sid keys cost 4.8 KB on the instructor-portal
// route, which statically imports instructorContent.js and is at its ceiling.
// Nothing on a route reads expectations (only the answer-key PDF, built by
// tools), so the record leaves the route and the route gets lighter.
// =============================================================================
import { readFile, writeFile } from 'node:fs/promises';
import { INSTRUCTOR_CONTENT } from '../js/data/instructorContent.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';

const FILE = 'js/data/instructorContent.js';
const lessons = {};
for (const inv of INVESTIGATIONS) {
  const e = INSTRUCTOR_CONTENT[inv.id]?.expectations;
  if (!e || !Object.keys(e).length) continue;
  lessons[inv.id] = {};
  for (const [n, text] of Object.entries(e)) {
    const step = inv.steps[Number(n) - 1];
    if (!step) throw new Error(`${inv.id}: no step ${n}`);
    lessons[inv.id][step.sid] = text;
  }
}
const doc = {
  format: 'gravitas.instructor-expectations',
  formatVersion: 2,
  lessons,
};
const header = `// =============================================================================
// What an instructor should expect to see at a step, by lesson and step sid
// -----------------------------------------------------------------------------
// Keyed by the step's sid, so inserting or reordering a step cannot slide an
// expectation onto the wrong screen (the old key was the 1-based step number).
// js/instructorExpectations.js reads it through readVersioned and still reads
// the number-keyed /1 form. Not imported by any route: the answer-key PDF and
// the author check read it. Generated once from instructorContent.js by
// tools/migrate-expectations.mjs; edited by hand since.
// =============================================================================
`;
await writeFile(
  'js/data/instructorExpectations.js',
  `${header}\nexport default ${JSON.stringify(doc, null, 2)};\n`
);

const lines = (await readFile(FILE, 'utf8')).split('\n');
const out = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i] === '    expectations: {') {
    while (lines[i] !== '    },') i++;
    continue;
  }
  out.push(lines[i]);
}
await writeFile(FILE, out.join('\n'));
console.log(
  Object.values(lessons).reduce((n, l) => n + Object.keys(l).length, 0),
  'expectations moved'
);
