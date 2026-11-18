// What the acceptance map must say about a lesson's canvas. A lesson that
// declares a canvas kind lists its kinds in docs/lesson-acceptance.json
// (`canvas`, sorted), so starting or stopping to declare one is a reviewed
// change; a portrait is a picture, so no step that holds one may read a
// measurement off the scene. Pure over data the audit gathered, so
// tests/lessonCanvas.test.js can hand it a lesson built to fail.

import { canvasKinds, canvasProblems } from '../js/lesson/canvasKind.js';

/**
 * @param {object} inv - The lesson
 * @param {object} entry - Its acceptance entry
 * @param {Array<object>} steps - Its steps in the scene catalog (`canvas`, `kinds`)
 * @returns {Array<string>} One sentence per disagreement
 */
export function canvasAcceptance(inv, entry, steps) {
  const out = canvasProblems(inv).map(p => `${inv.id}: ${p}`);
  const kinds = canvasKinds(inv);
  const said = entry?.canvas ?? [];
  if (kinds.join() !== said.join())
    out.push(
      `${inv.id}: its steps declare canvas [${kinds}], the acceptance map says [${said}]`
    );
  for (const s of steps)
    if (s.canvas === 'portrait' && s.kinds.includes('engine-measurement'))
      out.push(
        `${inv.id}: ${s.sid} is a portrait but reads a measurement off the scene`
      );
  return out;
}
