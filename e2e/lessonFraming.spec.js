// =============================================================================
// Every lesson scene is framed, at a phone, a tablet and a laptop
// -----------------------------------------------------------------------------
// For every step that builds or binds a scene (a setup scenario, an engine or
// model-owned stage, a shelf, a bind), once the camera has settled, every body
// the step binds lies in the region the panels leave free, is drawn at least at
// the renderer's marker floor, and the bound bodies fill a fair share of that
// region. The list of steps is read from the lessons (tools/lesson-framing.mjs),
// so a new step that puts its bodies under a panel or off the screen fails here.
//
// @covers:lesson-canvas
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';
import {
  FRAMING_SIZES,
  distinctScenes,
  groupsOfScenes,
  knownMatches,
  measureLessons,
  openStepInPage,
  sceneSteps,
  startPage,
} from '../tools/lesson-framing.mjs';

const groups = groupsOfScenes(distinctScenes(sceneSteps(INVESTIGATIONS)));

// Steps that fail today, each with the reason and who owns the fix (a layout
// the framing cannot change). An unlisted failure fails the run; a listed step
// that passes is reported as an annotation, and its entry is removed on review.
const KNOWN = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/lesson-framing-known.json', import.meta.url),
    'utf8'
  )
).steps;

for (const size of FRAMING_SIZES) {
  test.describe(`scene framing at ${size.width}x${size.height}`, () => {
    for (const group of groups) {
      const first = group[0].lesson;
      const last = group[group.length - 1].lesson;
      test(`${first} to ${last}`, async ({ page }) => {
        test.setTimeout(480_000);
        await page.setViewportSize({ width: size.width, height: size.height });
        await startPage(page, '');
        const failures = [];
        const stale = [];
        for (const r of await measureLessons(page, group)) {
          const id = `${size.width}|${r.entry.lesson}|${r.entry.sid}`;
          if (!r.pass && !knownMatches(r.reasons, KNOWN[id]))
            failures.push(
              `${r.entry.lesson}/${r.entry.sid} [${r.entry.kind}]: ${r.reasons.join('; ')}${KNOWN[id] ? ` (listed as "${KNOWN[id].expect}")` : ''}`
            );
          if (r.pass && KNOWN[id])
            stale.push(`${id} passes: remove it from the known list`);
        }
        expect(failures).toEqual([]);
        // A listed step can pass on a run when it depends on where a body is in
        // its orbit; say so without failing, and remove the entry on review.
        for (const note of stale)
          test
            .info()
            .annotations.push({ type: 'known step passes', description: note });
      });
    }
  });
}

// Moving the camera must not rebuild a world, change its seed or move a body:
// one step of each kind of scene, the bodies compared before and after a fit
// taken in the same task (no frame runs between), and no body that was in the
// engine's keep region before a fit is outside it after.
test.describe('framing leaves the world as it is', () => {
  const kinds = ['setup', 'engine-stage', 'model-stage', 'shelf', 'bind'];
  const list = sceneSteps(INVESTIGATIONS);
  for (const kind of kinds) {
    const e = list.find(x => x.kind === kind);
    test(`${kind}: ${e.lesson}/${e.sid}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await startPage(page, '');
      await openStepInPage(page, e.lesson, e.sid);
      const result = await page.evaluate(async () => {
        const ls = await import('/js/lessonScene.js');
        const phys = await import('/js/physics.js');
        const frame = await import('/js/lessonFrame.js');
        const ui = await import('/js/ui.js');
        const utils = await import('/js/utils.js');
        const canvas = document.getElementById('simulationCanvas');
        // The engine drops a body far off the screen (js/engine/step.js): the
        // bodies it would drop at this camera, by id.
        const culled = () =>
          ls
            .allBodies()
            .filter(b =>
              utils.isOffscreen(
                b.pos,
                ui.state,
                canvas,
                20 * Math.max(1, ui.state.zoom)
              )
            )
            .map(b => b.id);
        const snap = () =>
          JSON.stringify([
            phys.getWorldGeneration(),
            ls
              .allBodies()
              .map(b => [
                b.id,
                b.name,
                b.pos.x,
                b.pos.y,
                b.vel.x,
                b.vel.y,
                b.mass,
                b.radius,
              ]),
          ]);
        const before = snap();
        const camera = JSON.stringify([ui.state.zoom, ui.state.pan]);
        const culledBefore = culled();
        frame.fitNow(frame.boundPoints().length ? frame.boundPoints() : []);
        frame.requestFit();
        frame.takeFit();
        const culledAfter = culled();
        frame.fitNow([
          { x: 1e3, y: -2e3, radius: 5 },
          { x: 0, y: 0, radius: 5 },
        ]);
        return {
          same: snap() === before,
          newlyCulled: culledAfter.filter(id => !culledBefore.includes(id)),
          moved: JSON.stringify([ui.state.zoom, ui.state.pan]) !== camera,
          bodies: ls.allBodies().length,
        };
      });
      expect(result.bodies).toBeGreaterThan(0);
      expect(result.same, 'bodies and world generation unchanged').toBe(true);
      expect(result.newlyCulled, 'a fit leaves no body to be culled').toEqual(
        []
      );
      expect(result.moved, 'the camera did move').toBe(true);
    });
  }
});
