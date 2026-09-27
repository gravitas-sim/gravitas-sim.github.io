#!/usr/bin/env node
// =============================================================================
// Studio round-trip spike: the browser half of the measurements
// -----------------------------------------------------------------------------
// node spike/studio/browser.mjs   (after harness.mjs)
//
// T14: bundles core.mjs with its parser for the browser and measures it.
// T4:  in a Chromium page, replays the change set with that bundle, and runs
//      the authoring rules on the edited lesson held only in memory, with the
//      inputs a browser can gather; compares with author:check on the patched
//      tree before any regeneration (harness.mjs).
// T5:  opens the edited lesson in the application's own runner, from memory,
//      through the registry's door (provideLessonLoaders), and loads the
//      edited scenario through a share payload: no file written.
// Disposable prototype code.
// =============================================================================

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import * as esbuild from 'esbuild';
import { chromium } from 'playwright';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(REPO, 'spike/studio/out');
const evidencePath = path.join(REPO, 'spike/studio/evidence.json');
const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
const PORT = 4395;
const pass = (id, ok, detail) => {
  evidence[id] = { pass: Boolean(ok), ...detail };
  process.stdout.write(`${id} ${ok ? 'PASS' : 'FAIL'}\n`);
};

// --- T14: the Studio core and its parser, bundled for a page of their own ---------------

await esbuild.build({
  entryPoints: [path.join(REPO, 'spike/studio/core.mjs')],
  bundle: true,
  format: 'esm',
  minify: true,
  target: ['es2022'],
  outfile: path.join(OUT, 'studio.bundle.js'),
});
const bundle = readFileSync(path.join(OUT, 'studio.bundle.js'));
const sizes = { minifiedKB: +(bundle.length / 1024).toFixed(1), gzipKB: +(gzipSync(bundle).length / 1024).toFixed(1) };

// --- A server over the untouched worktree ----------------------------------------------

const server = spawn(process.execPath, ['tools/static-server.mjs', '--root', '.', '--port', String(PORT)], { cwd: REPO, stdio: 'ignore' });
await sleep(1500);
const base = `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch();

async function openApp() {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
    } catch {
      /* fine */
    }
  });
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.splashScreenEnded === true, null, { timeout: 60000 });
  if (await page.locator('#welcomeScreen').isVisible().catch(() => false)) await page.locator('#welcomeClose').click();
  return { page, errors };
}

try {
  // --- T4 and the lesson half of T5, in one page -------------------------------------------
  const { page, errors } = await openApp();
  const lessonSide = await page.evaluate(async () => {
    const S = await import('/spike/studio/out/studio.bundle.js');
    const changes = await (await fetch('/spike/studio/out/changes.json')).json();
    const LOCATORS = {
      'js/data/investigations/twelve-nights.js': { kind: 'lesson' },
      'js/data/investigations/es/twelve-nights.js': { kind: 'shadow' },
      'js/data/instructorContent.js': { kind: 'entry', object: 'INSTRUCTOR_CONTENT', key: 'twelve-nights' },
      'js/scenarios.js': { kind: 'preset', name: 'Alien Dyson Swarm Collapse' },
      'js/data/scenarioInfo.js': { kind: 'entry', object: 'SCENARIO_STRUCTURE', key: 'Alien Dyson Swarm Collapse' },
      'js/i18n/en.js': { kind: 'entry', object: 'EN', key: 'scenario.Alien Dyson Swarm Collapse.title' },
      'js/i18n/es.js': { kind: 'entry', object: 'ES', key: 'scenario.Alien Dyson Swarm Collapse.title' },
    };
    const files = {};
    for (const [f, locator] of Object.entries(LOCATORS))
      files[f] = { locator, source: await (await fetch(`/${f}`, { cache: 'no-store' })).text() };
    const t0 = performance.now();
    const r = await S.replay(changes, files);
    const replayMs = performance.now() - t0;
    // The same bytes Node produced.
    const same = {};
    for (const f of Object.keys(LOCATORS))
      same[f] = r.sources[f] === (await (await fetch(`/spike/studio/out/sources/${f}`, { cache: 'no-store' })).text());
    // The edited modules, evaluated from memory: the repository's own code,
    // literal-edited and re-verified.
    const blobImport = async text => import(URL.createObjectURL(new Blob([text], { type: 'text/javascript' })));
    const lesson = (await blobImport(r.sources['js/data/investigations/twelve-nights.js'])).default;
    const shadow = (await blobImport(r.sources['js/data/investigations/es/twelve-nights.js'])).default;
    const instructor = (await blobImport(r.sources['js/data/instructorContent.js'])).INSTRUCTOR_CONTENT;

    // T4: the inputs author:check gathers, gathered in the page.
    const { INVESTIGATIONS } = await import('/js/data/investigations.js');
    const { MANIFEST: en } = await import('/js/data/investigations/manifest.js');
    const { MANIFEST: es } = await import('/js/data/investigations/manifest.es.js');
    const { SCENARIO_INFO } = await import('/js/data/scenarioInfo.js');
    const { DEFAULT_SETTINGS } = await import('/js/appState.js');
    const W = await import('/js/widgets.js');
    await W.whenWidgetsReady();
    const { gradedSteps } = await import('/js/data/investigations/catalog.js');
    const { checkCatalog } = await import('/js/authoring/rules.js');
    const translations = { es: {} };
    const sources = {};
    for (const inv of INVESTIGATIONS) {
      const file = `js/data/investigations/es/${inv.id}.js`;
      translations.es[inv.id] = {
        file,
        data: inv.id === 'twelve-nights' ? shadow : (await import(`/${file}`)).default,
      };
      const lf = `js/data/investigations/${inv.id}.js`;
      sources[inv.id] = { file: lf, text: inv.id === 'twelve-nights' ? r.sources[lf] : await (await fetch(`/${lf}`)).text() };
    }
    const t1 = performance.now();
    const findings = checkCatalog({
      investigations: INVESTIGATIONS.map(i => (i.id === 'twelve-nights' ? lesson : i)),
      manifests: { en, es },
      instructor: { ...instructor },
      scenarios: SCENARIO_INFO,
      settingKeys: new Set(Object.keys(DEFAULT_SETTINGS)),
      widgets: W.allWidgets(),
      translations,
      sources,
      gradedSteps,
    }).filter(f => f.lesson === 'twelve-nights');
    const checkMs = performance.now() - t1;

    // T5: the edited lesson through the registry's own door, then opened.
    const reg = await import('/js/data/investigations/registry.js');
    const lessonUrl = URL.createObjectURL(new Blob([r.sources['js/data/investigations/twelve-nights.js']], { type: 'text/javascript' }));
    const shadowUrl = URL.createObjectURL(new Blob([r.sources['js/data/investigations/es/twelve-nights.js']], { type: 'text/javascript' }));
    reg.provideLessonLoaders('twelve-nights', { lesson: () => import(lessonUrl), translations: { es: () => import(shadowUrl) } });
    location.hash = '#investigation=twelve-nights';
    return {
      same,
      replayMs,
      checkMs,
      findings: findings.map(f => ({ level: f.level, rule: f.rule, lesson: f.lesson, step: f.step, message: f.message })),
      steps: lesson.steps.length,
    };
  });
  const title = page.locator('#investigationBody .inv-step-title').first();
  await title.waitFor({ timeout: 60000 });
  const firstTitle = await title.innerText();
  const progress = await page.locator('#investigationProgressText').innerText().catch(() => '');
  // Walk to the inserted read step (fifth) and confirm it is the Studio's.
  for (let i = 0; i < 4; i++) await page.locator('#investigationNext').click();
  await page.waitForTimeout(300);
  const fifthTitle = await page.locator('#investigationBody .inv-step-title').first().innerText();

  const node = evidence.T4node.beforeRegeneration.findings.map(f => ({ level: f.level, rule: f.rule, lesson: f.lesson, step: f.step, message: f.message }));
  const key = a => JSON.stringify([...a].map(f => JSON.stringify(f)).sort());
  pass('T4', key(lessonSide.findings) === key(node), {
    studioFindings: lessonSide.findings,
    authorCheckFindings: node,
    replayInPageMs: +lessonSide.replayMs.toFixed(1),
    rulesInPageMs: +lessonSide.checkMs.toFixed(1),
    bytesEqualNode: lessonSide.same,
  });

  // --- The scenario half of T5 ----------------------------------------------------------------
  const scene = await openApp();
  const scenario = await scene.page.evaluate(async () => {
    const { applySharePayload } = await import('/js/share.js');
    // What the build reports, straight after it: the black hole starts
    // swallowing stars on the next frame, so a later count measures the
    // scenario, not the edit.
    const built = applySharePayload({
      v: 1,
      s: 'Alien Dyson Swarm Collapse',
      seed: 'Alien Dyson Swarm Collapse',
      d: { num_stars: 150, trail_length: 24 },
    });
    const { SETTINGS } = await import('/js/appState.js');
    return {
      scenario: built.scenario,
      bodies: built.bodies,
      num_stars: SETTINGS.num_stars,
      trail_length: SETTINGS.trail_length,
    };
  });
  // The unedited scenario's bodies, from the world golden: 50 more stars now.
  const golden = JSON.parse(readFileSync(path.join(REPO, 'e2e/golden/world-construction.json'), 'utf8'));
  const entry = (golden.scenarios ?? golden)['Alien Dyson Swarm Collapse'];
  const goldenBodies = entry?.count ?? null;
  scenario.goldenBodies = goldenBodies;
  const lessonShown = firstTitle.includes('Twelve nights, and a catch') && /14/.test(progress) && fifthTitle.includes('A step the Studio inserted');
  const scenarioShown =
    scenario.scenario === 'Alien Dyson Swarm Collapse' &&
    scenario.num_stars === 150 &&
    scenario.trail_length === 24 &&
    Number.isInteger(goldenBodies) &&
    scenario.bodies === goldenBodies + 50;
  pass('T5', lessonShown && scenarioShown && errors.length === 0 && scene.errors.length === 0, {
    lesson: { firstTitle, progress, fifthTitle },
    scenario,
    pageErrors: [...errors, ...scene.errors],
    howTheLesson: 'provideLessonLoaders(id, {lesson, translations}) with blob-URL modules, before first open; the registry memoizes, so a second preview needs its cache cleared (a production task)',
    howTheScenario: 'a share payload whose settings delta is the edit: the path a lesson step’s setup takes; no code evaluated',
  });

  // --- T14 --------------------------------------------------------------------------------------
  pass('T14', sizes.minifiedKB <= 200, {
    ...sizes,
    appRoutesTouched: 'none: the spike adds no import to any shipped module',
  });
} finally {
  await browser.close();
  server.kill();
}
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
