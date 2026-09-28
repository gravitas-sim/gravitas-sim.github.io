// Spike: write the TESS HD 209458 light curve as the gravitas.observation/1
// the Observatory exports, for the bridge's host page to hand the notebook.
import { writeFileSync } from 'node:fs';
import { openFixture } from '../../js/observatory/fixtures.js';
import { validateObservation } from '../../js/observatory/schema.js';
import { observationJson } from '../../js/observatory/export.js';

const o = await openFixture('tess-light-curve');
const problems = validateObservation(o);
if (problems.length) throw new Error(JSON.stringify(problems.slice(0, 3)));
// The Observatory's own export: what a reader would download.
writeFileSync(
  new URL('./observation.json', import.meta.url),
  observationJson(o, { source: o, changes: [] })
);
console.log(o.title, o.columns.map(c => `${c.id}:${c.role}:${c.unit}:${c.values.length}`).join(' '));
