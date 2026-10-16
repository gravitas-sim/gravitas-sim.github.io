// =============================================================================
// One-off: move the investigation flow out of instructorContent.js into
// js/data/instructorFlow.js, keyed by step sid instead of a "18-22" range.
// Kept so the conversion is reproducible and reviewable; a second run finds no
// flow blocks in instructorContent.js and does nothing.
//
// Why a module of its own: the instructor portal imports instructorContent.js
// statically and its route is measured; the flow is read only by the guide
// builder, so it leaves the route (Prompt 79).
// =============================================================================
import { readFile, writeFile } from 'node:fs/promises';
import { INSTRUCTOR_CONTENT } from '../js/data/instructorContent.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import { readFlow } from '../js/instructorFlow.js';

const FILE = 'js/data/instructorContent.js';
const old = {
  format: 'gravitas.instructor-flow',
  formatVersion: 1,
  lessons: {},
};
for (const inv of INVESTIGATIONS) {
  const flow = INSTRUCTOR_CONTENT[inv.id]?.flow;
  if (flow) old.lessons[inv.id] = flow;
}
if (!Object.keys(old.lessons).length) {
  console.log('no flow blocks left in instructorContent.js; nothing to do');
  process.exit(0);
}
const r = readFlow(
  old,
  id => INVESTIGATIONS.find(i => i.id === id)?.steps ?? []
);
if (!r.ok || r.notes.length) throw new Error(r.message ?? r.notes.join('\n'));

const header = `// =============================================================================
// What students do, screen by screen: the flow table of each instructor guide
// -----------------------------------------------------------------------------
// Each block runs from one step sid to another, so inserting or moving a step
// cannot slide a block onto the wrong screens (the old key was a range of
// 1-based numbers, "18-22"). js/instructorFlow.js reads it through
// readVersioned, still reads the number-keyed /1 form, and works out the
// printed range from the lesson as it is. Not imported by any route. Generated
// once from instructorContent.js by tools/migrate-flow.mjs; edited by hand
// since, and tests/instructorDocs.test.js holds every lesson's flow to
// covering each step once.
// =============================================================================
`;
const doc = {
  format: 'gravitas.instructor-flow',
  formatVersion: 2,
  lessons: r.doc.lessons,
};
await writeFile(
  'js/data/instructorFlow.js',
  `${header}\nexport default ${JSON.stringify(doc, null, 2)};\n`
);

const lines = (await readFile(FILE, 'utf8')).split('\n');
const out = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i] === '    flow: [') {
    while (lines[i] !== '    ],') i++;
    continue;
  }
  out.push(lines[i]);
}
await writeFile(FILE, out.join('\n'));
console.log(
  Object.values(doc.lessons).reduce((n, l) => n + l.length, 0),
  'flow blocks moved'
);
