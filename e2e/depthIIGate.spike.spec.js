// =============================================================================
// Depth II gate, criterion 2 (spike only, never merged)
// -----------------------------------------------------------------------------
// DEPTH_II_GATE.md: with answers and a reading saved, the reader switches from
// core to quantitative, commits the held prediction on the prototype step,
// runs the variation once, and switches back to core. Nothing saved may be
// lost, and the core scene afterwards must equal the scene before any of it,
// compared directly on the full state: bodies, clock, settings, camera.
// =============================================================================

import { readFileSync } from 'node:fs';
import { test, expect, openMore } from './fixtures.js';

const TOL = JSON.parse(
  readFileSync(
    new URL('../tests/fixtures/depth-ii/thresholds.json', import.meta.url),
    'utf8'
  )
).criteria['2'];

const ID = 'weighing-stars';
const AT = 'one-on-your-own';

/** The full state, in a form that compares. */
const snap = page =>
  page.evaluate(async () => {
    const physics = await import('/js/physics.js');
    const app = await import('/js/appState.js');
    const bodies = [
      ...physics.bh_list,
      ...physics.stars,
      ...physics.planets,
      ...physics.gas_giants,
      ...physics.asteroids,
      ...physics.comets,
      ...physics.neutron_stars,
      ...physics.white_dwarfs,
    ]
      .map(b => {
        const s = b.get_state();
        return {
          id: b.id,
          x: s.pos?.x ?? b.pos.x,
          y: s.pos?.y ?? b.pos.y,
          vx: s.vel?.x ?? b.vel.x,
          vy: s.vel?.y ?? b.vel.y,
          m: b.mass,
        };
      })
      .sort((a, b) => a.id - b.id);
    return {
      bodies,
      clock: physics.getSimulationTime(),
      settings: JSON.parse(JSON.stringify(app.SETTINGS)),
      camera: { zoom: app.state.zoom, x: app.state.pan.x, y: app.state.pan.y },
      paused: app.state.paused,
    };
  });

/** Every difference beyond the gate's tolerance, as paths. */
function differences(a, b, path = '', out = []) {
  if (typeof a === 'number' && typeof b === 'number') {
    const d = Math.abs(a - b);
    const scale = Math.max(Math.abs(a), Math.abs(b));
    if (!(d <= TOL.relative * scale || d < TOL.absolute))
      out.push(`${path}: ${a} vs ${b}`);
    return out;
  }
  if (a && b && typeof a === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) differences(a[k], b[k], `${path}.${k}`, out);
    return out;
  }
  if (a !== b)
    out.push(`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  return out;
}

test('criterion 2: a depth switch around a run loses nothing and puts the scene back', async ({
  page,
  app,
}) => {
  test.setTimeout(240_000);
  await app.boot();
  const seeded = await page.evaluate(
    async ({ ID, AT }) => {
      const reg = await import('/js/data/investigations/registry.js');
      const schema = await import('/js/investigations/progressSchema.js');
      const lesson = await reg.loadInvestigation(ID);
      const key = sid => schema.stepKey(ID, sid);
      const responses = {
        [key('how-would-you-do-it')]: '1',
        [key('where-does-it-sit')]: '0',
        [key('splitting-them-up')]: '1',
        // A reading on the measure step the prototype is laid after.
        [`${key(AT)}:a`]: '3',
        [`${key(AT)}:p`]: '3',
      };
      const upTo = lesson.steps.findIndex(s => s.sid === AT);
      localStorage.setItem(
        `gravitas_investigation_${ID}`,
        JSON.stringify(
          schema.writeProgress({
            lesson,
            responses,
            attempts: {},
            visited: lesson.steps.slice(0, upTo + 1).map(s => s.sid),
            stepSid: AT,
            startedAt: '2026-11-18T00:00:00.000Z',
            depth: 'core',
          })
        )
      );
      return responses;
    },
    { ID, AT }
  );
  await app.boot({ url: `/#investigation=${ID}` });
  await expect(page.locator('.inv-step-title')).toHaveText('One on your own', {
    timeout: 60_000,
  });
  // Let the stage settle, then hold the clock so "the scene with no run" is
  // one fixed state.
  await page.waitForFunction(async () => {
    const gate = await import('/js/lesson/stageGate.js');
    return gate.stagedStars().length >= 2;
  });
  await page.evaluate(async () => {
    const app = await import('/js/appState.js');
    app.state.paused = true;
  });
  await page.waitForTimeout(500);
  const before = await snap(page);

  // Core to quantitative, before the run.
  console.log(
    'BEFORE-DEEPER',
    JSON.stringify(
      await page.evaluate(async () => {
        const gate = await import('/js/lesson/stageGate.js');
        return { staged: gate.stagedStars().length, key: gate.stageKey() };
      })
    )
  );
  await openMore(page);
  await page.locator('#investigationDeeper').click();
  // From the step before a deeper one, Go deeper leads straight into it.
  await expect(page.locator('.inv-step-title')).toHaveText(
    'Make Star A lighter'
  );
  const probe = () =>
    page.evaluate(async () => {
      const gate = await import('/js/lesson/stageGate.js');
      const physics = await import('/js/physics.js');
      const app = await import('/js/appState.js');
      return {
        staged: gate.stagedStars().length,
        stars: physics.stars.length,
        key: gate.stageKey(),
        paused: app.state.paused,
      };
    });
  console.log('AFTER-DEEPER', JSON.stringify(await probe()));
  await page.waitForTimeout(3000);
  console.log('AFTER-DEEPER+3s', JSON.stringify(await probe()));
  // The held prediction: choosing an option commits it.
  await page.locator('[data-option="1"]').click();
  await expect(page.locator('[data-run-go]')).toBeEnabled({ timeout: 20_000 });
  await page.locator('[data-run-go]').click();
  const ran = await page
    .locator('[data-run-row="1"]')
    .waitFor({ timeout: 60_000 })
    .then(() => true)
    .catch(() => false);
  const ratio = ran
    ? await page.locator('[data-run-row="1"]').innerText()
    : null;
  const status = await page.locator('[data-runs-status]').innerText();

  // Quantitative to core, after the run.
  await openMore(page);
  await page.locator('#investigationShallower').click();
  await page.waitForTimeout(500);
  const after = await snap(page);

  const saved = await page.evaluate(
    ID => JSON.parse(localStorage.getItem(`gravitas_investigation_${ID}`)),
    ID
  );
  const responses = saved.responses || saved.progress?.responses || {};
  const lost = Object.keys(seeded).filter(k => responses[k] !== seeded[k]);
  const runRows = Object.keys(responses).filter(k => k.includes(':run:'));
  const prediction = responses[`${ID}:make-star-a-lighter`];
  const diff = differences(before, after);
  console.log(
    'C2',
    JSON.stringify({
      lost,
      runRows,
      prediction,
      ran,
      status,
      ratio,
      depthNow: saved.depth,
      diff: diff.slice(0, 20),
      diffCount: diff.length,
      bodies: before.bodies.length,
    })
  );
  expect(lost).toEqual([]);
  expect(prediction).toBeDefined();
  expect(runRows.length).toBe(1);
  expect(diff).toEqual([]);
});

test('control: Go deeper onto an existing stage-less deeper step', async ({
  page,
  app,
}) => {
  test.setTimeout(180_000);
  await app.boot();
  await page.evaluate(async ID => {
    const reg = await import('/js/data/investigations/registry.js');
    const schema = await import('/js/investigations/progressSchema.js');
    const lesson = await reg.loadInvestigation(ID);
    const upTo = lesson.steps.findIndex(s => s.sid === 'weigh-the-pair');
    localStorage.setItem(
      `gravitas_investigation_${ID}`,
      JSON.stringify(
        schema.writeProgress({
          lesson,
          responses: {},
          attempts: {},
          visited: lesson.steps.slice(0, upTo + 1).map(s => s.sid),
          stepSid: 'weigh-the-pair',
          startedAt: '2026-11-18T00:00:00.000Z',
          depth: 'core',
        })
      )
    );
  }, ID);
  await app.boot({ url: `/#investigation=${ID}` });
  await page.waitForFunction(async () => {
    const gate = await import('/js/lesson/stageGate.js');
    return gate.stagedStars().length >= 2;
  });
  await openMore(page);
  await page.locator('#investigationDeeper').click();
  await expect(page.locator('.inv-step-title')).toHaveText(
    'How sure is the total?'
  );
  await page.waitForTimeout(1500);
  const staged = await page.evaluate(async () => {
    const gate = await import('/js/lesson/stageGate.js');
    return gate.stagedStars().length;
  });
  console.log('CONTROL', JSON.stringify({ staged }));
});
