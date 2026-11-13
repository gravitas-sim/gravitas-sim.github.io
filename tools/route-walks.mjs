#!/usr/bin/env node
// =============================================================================
// The walk from a lesson link to its first accepted reading
// -----------------------------------------------------------------------------
// Development only. For each pilot lesson this opens the student's link
// (`/#investigation=<id>`) in headless Chromium under a committed device
// profile, over the repository's compressed static server, and then does what a
// student does until the lesson accepts a measurement: it answers or reads each
// step on the way, reaches the first step of type `measure`, takes the reading
// from the place a student takes it (the instrument's readout, or the live
// scene), types it into the step's boxes, and waits for the step's own check
// (`.inv-check.is-ok`) to accept it. The time is measured in the page, from the
// start of the navigation to the moment the check turns green.
//
// Why it exists. A redesigned pilot lesson is judged on whether it takes a
// student longer to reach a first accepted reading than the 3.0 lesson did (the
// pilot criterion PC4: at most 1.25 times the 3.0 walk on desktop, and the walk
// completes on the phone profile). This file records the 3.0 walk; a pilot
// re-runs it on its own lesson. The recipes below are the 3.0 lessons' own
// first measure steps, written against what those steps ask for, so a pilot
// that moves its first measure step must update the recipe for that lesson and
// say so.
//
// What it does not do. It does not think: the answers to prediction and
// question steps on the way are the first option, because the walk is about
// the route, not the reasoning, and Next does not wait for a right answer. It
// reads values the instrument or the scene prints; it never takes them from the
// lesson's answer. It is a proxy for a student's path and never claims a
// student's pace.
//
//   node tools/route-walks.mjs                       both profiles, three runs
//   node tools/route-walks.mjs --profile throttled-desktop --runs 1
//   node tools/route-walks.mjs --lessons ios-fire --json out.json
// =============================================================================

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveStatic } from './static-server.mjs';
import {
  PROFILES,
  contextFor,
  launchFor,
  spread,
  throttle,
  withQuality,
} from './route-harness.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** "9.33 × 10¹³ W" -> 9.33e13; "1,401 K" -> 1401; null when no number. */
export function scientific(text) {
  const sup = {
    '⁰': 0,
    '¹': 1,
    '²': 2,
    '³': 3,
    '⁴': 4,
    '⁵': 5,
    '⁶': 6,
    '⁷': 7,
    '⁸': 8,
    '⁹': 9,
  };
  const clean = String(text)
    .replace(/−/g, '-')
    .replace(/(\d),(?=\d{3}(\D|$))/g, '$1');
  const m = clean.match(
    /(-?\d+(?:\.\d+)?)(?:\s*[×x]\s*10([⁻-]?)([⁰¹²³⁴⁵⁶⁷⁸⁹]+|\d+))?/
  );
  if (!m) return null;
  let value = Number(m[1]);
  if (m[3]) {
    const digits = [...m[3]].map(c => (c in sup ? sup[c] : c)).join('');
    value *= 10 ** (Number(digits) * (m[2] ? -1 : 1));
  }
  return value;
}

/** The instrument's rows on this step: label -> text, once they have stopped changing. */
async function readout(page) {
  await page.locator('#investigationTool').waitFor({ state: 'visible' });
  const rows = () =>
    page.evaluate(() =>
      Object.fromEntries(
        [
          ...document.querySelectorAll(
            '#investigationToolReadout .inv-tool-row'
          ),
        ]
          .map(r => [
            r.querySelector('dt')?.textContent?.trim() ?? '',
            r.querySelector('dd')?.textContent?.trim() ?? '',
          ])
          .filter(([k]) => k)
      )
    );
  // A slow page draws the instrument, then fills its rows: read until two
  // reads 400 ms apart agree and there is something in them.
  let last = JSON.stringify(await rows());
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(400);
    const now = JSON.stringify(await rows());
    if (now === last && now !== '{}') return JSON.parse(now);
    last = now;
  }
  return JSON.parse(last);
}

const rowValue = (rows, match) => {
  const key = Object.keys(rows).find(k => match.test(k));
  if (!key)
    throw new Error(`no readout row matching ${match}: ${Object.keys(rows)}`);
  return scientific(rows[key]);
};

/** Move a tool's range control to a value, as a student's drag would. */
async function setTool(page, id, value) {
  const box = page.locator(`#invTool-${id}`);
  await box.fill(String(value));
  await box.dispatchEvent('change');
}

/**
 * The pilots. `measureSid` is the first step of type `measure` in the 3.0
 * lesson; `watch` maps a step on the way to a function that reads something
 * there (a step's instrument shows what the measure step later asks for);
 * `readings(page, seen)` returns {field: text} for the measure step, read the
 * way a student reads them; `note` says what the step is when it is not a
 * reading of the scene.
 */
export const PILOTS = {
  'keplers-laws': {
    measureSid: 'measure-the-two-orbits',
    // The readout of a clicked body: eccentricity and the two distances, in AU
    // as the lesson's units are (scene units are hundredths of an AU).
    async readings(page) {
      return page.evaluate(async () => {
        const ls = await import('/js/lessonScene.js');
        const phys = await import('/js/physics.js');
        const ui = await import('/js/ui.js');
        const orb = await import('/js/orbital.js');
        const primaries = [
          ...phys.bh_list,
          ...phys.stars,
          ...phys.neutron_stars,
          ...phys.white_dwarfs,
        ];
        const el = role => {
          const body = ls.roleBody(role);
          const primary = orb.dominantPrimary(
            body,
            primaries.filter(p => p !== body)
          );
          return orb.orbitalElements(
            body,
            primary,
            ui.SETTINGS.gravitational_constant
          );
        };
        const c = el('circular');
        const e = el('eccentric');
        return {
          circ_e: c.e.toFixed(3),
          ecc_e: e.e.toFixed(3),
          ecc_peri: (e.periapsis * 0.01).toFixed(2),
          ecc_apo: (e.apoapsis * 0.01).toFixed(2),
        };
      });
    },
  },
  'transit-photometry': {
    measureSid: 'measure-the-dip',
    // The step's own route: wait until the light curve has shown a transit,
    // then press "Copy the last transit", which fills both boxes. The time
    // includes the wait for that transit, as a student's does.
    async act(page) {
      const button = page.getByRole('button', {
        name: /Copy the last transit/i,
      });
      const first = page
        .locator('#investigationBody input[data-field]')
        .first();
      // A transit that is still being drawn copies as a bottom equal to the
      // baseline, and the step says it is too shallow; the student presses the
      // button again after the next one. So does the walk, until the step's
      // own check accepts the copy.
      const accepted = page.locator('#investigationBody .inv-check.is-ok');
      const until = Date.now() + 150_000;
      while (Date.now() < until) {
        await button.click();
        await page.waitForTimeout(500);
        if ((await first.inputValue()) && (await accepted.count())) break;
        await page.waitForTimeout(1500);
      }
      return {
        copied: await page
          .locator('#investigationBody input[data-field]')
          .evaluateAll(els => els.slice(0, 2).map(e => e.value)),
      };
    },
  },
  'measuring-the-moon': {
    measureSid: 'scale-from-the-disc',
    // The step names the two end positions; the instrument reports the length
    // and the scale they give.
    async readings(page) {
      await setTool(page, 'x1', 3);
      await setTool(page, 'x2', 496);
      const rows = await readout(page);
      return {
        pair: String(rowValue(rows, /length|pair/i)),
        scale: String(rowValue(rows, /scale/i)),
      };
    },
  },
  'ios-fire': {
    measureSid: 'heating-at-the-maximum',
    async readings(page) {
      const rows = await readout(page);
      return {
        power: (rowValue(rows, /^heating/i) / 1e13).toFixed(2),
        orbit: (rowValue(rows, /energy in one orbit/i) / 1e19).toFixed(2),
      };
    },
  },
  'tides-that-move-the-moon': {
    measureSid: 'the-moons-recession',
    async readings(page) {
      const rows = await readout(page);
      return {
        rate: String(rowValue(rows, /recession now/i)),
        day: String(rowValue(rows, /lengthening now/i)),
      };
    },
  },
  'weighing-stars': {
    measureSid: 'a-practice-run',
    // The 3.0 lesson's first measure step is a practice run whose boxes are
    // told: "put 2 in both". It is the first accepted reading of the lesson as
    // it stands, and a pilot that replaces it names its own.
    note: 'practice step: the lesson gives the two numbers',
    async readings() {
      return { a: '2', p: '2' };
    },
  },
};

export const PILOT_IDS = Object.keys(PILOTS);

// --- the walk ------------------------------------------------------------------

/** Where the reader is: "Step 8 of 29" -> 8. */
const position = async page =>
  Number(
    (await page.locator('.inv-step-count').innerText()).match(/\d+/)?.[0] ?? 0
  );

/** Answer whatever would hold Next up on this screen (the first thing offered). */
async function nudge(page) {
  const boxes = page.locator('#investigationBody input[type="checkbox"]');
  for (let i = 0; i < (await boxes.count()); i++) {
    const box = boxes.nth(i);
    if (!(await box.isChecked())) await box.check().catch(() => {});
  }
  const fields = page.locator('#investigationBody input[data-field]');
  for (let i = 0; i < (await fields.count()); i++) {
    const field = fields.nth(i);
    if (!(await field.inputValue())) await field.fill('1').catch(() => {});
  }
  const open = page.locator('#investigationBody .inv-option:not([disabled])');
  if (await open.count())
    await open
      .first()
      .click()
      .catch(() => {});
}

/** Fill the step's boxes. */
async function enter(page, lessonId, sid, values) {
  for (const [field, text] of Object.entries(values)) {
    const box = page.locator(
      `#investigationBody [data-field="${lessonId}:${sid}:${field}"]`
    );
    await box.fill(String(text));
    await box.dispatchEvent('input');
    await box.dispatchEvent('change');
  }
}

/**
 * One walk. Returns the milliseconds from the start of the navigation to the
 * link's usable lesson, and to the first accepted reading, both read from the
 * page's clock; `steps` is how many steps were passed on the way.
 */
export async function walkOnce(
  browser,
  server,
  lessonId,
  profile,
  { locale = 'en', limitMs = 400_000, plan } = {}
) {
  const pilot = PILOTS[lessonId];
  const index = plan.findIndex(s => s.sid === pilot.measureSid);
  if (index < 0) throw new Error(`${lessonId} has no step ${pilot.measureSid}`);
  const context = await contextFor(browser, profile, server.url, {
    serviceWorkers: 'block',
    locale,
  });
  const page = await context.newPage();
  const out = { usableMs: null, acceptedMs: null, steps: index, error: null };
  try {
    await throttle(page, profile);
    await page.goto(withQuality(`/#investigation=${lessonId}`, profile), {
      waitUntil: 'domcontentloaded',
      timeout: limitMs,
    });
    await page.waitForFunction(
      () =>
        window.__holds('visible', '#investigationNext') && performance.now(),
      null,
      { polling: 'raf', timeout: limitMs }
    );
    out.usableMs = await page.evaluate(() => performance.now());
    const seen = {};
    const deadline = Date.now() + limitMs;
    for (let guard = 0; guard < 200; guard++) {
      if (Date.now() > deadline) throw new Error('walk timed out');
      const at = await position(page);
      const here = plan[at - 1];
      if (here && pilot.watch?.[here.sid] && !(here.sid in seen))
        seen[here.sid] = await pilot.watch[here.sid](page);
      if (at - 1 === index) break;
      await nudge(page);
      await page
        .locator('#investigationNext')
        .click({ timeout: 20_000 })
        .catch(() => {});
      await page.waitForFunction(
        n =>
          Number(
            document
              .querySelector('.inv-step-count')
              ?.textContent.match(/\d+/)?.[0]
          ) !== n,
        at,
        { timeout: 30_000, polling: 'raf' }
      );
    }
    const values = pilot.act
      ? await pilot.act(page)
      : await pilot.readings(page, seen);
    out.values = values;
    if (!pilot.act) await enter(page, lessonId, pilot.measureSid, values);
    await page.waitForSelector('#investigationBody .inv-check.is-ok', {
      timeout: 30_000,
    });
    out.acceptedMs = await page.evaluate(() => performance.now());
    out.values = values;
  } catch (e) {
    out.error = String(e.message).split('\n')[0].slice(0, 160);
    out.check = await page
      .locator('#investigationBody .inv-check')
      .innerText({ timeout: 2000 })
      .catch(() => null);
    out.attempted = await page
      .evaluate(
        () => document.querySelector('.inv-step-title')?.textContent ?? null
      )
      .catch(() => null);
  } finally {
    await context.close();
  }
  return out;
}

/** The lesson's step list, read in Node from the same files the page loads. */
export async function planOf(lessonId) {
  const reg = await import(resolve(ROOT, 'js/data/investigations/registry.js'));
  const lesson = await reg.loadInvestigation(lessonId);
  return lesson.steps.map(s => ({ sid: s.sid, type: s.type }));
}

// --- the CLI -------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const valueOf = (flag, fallback) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const profileIds = valueOf(
    '--profile',
    'throttled-desktop,mid-range-phone'
  ).split(',');
  const runs = Number(valueOf('--runs', '3'));
  const ids = valueOf('--lessons', PILOT_IDS.join(',')).split(',');
  const locale = valueOf('--locale', 'en');
  const jsonPath = valueOf('--json', null);
  const { chromium } = await import('playwright');
  const server = await serveStatic({
    root: ROOT,
    gzip: true,
    cacheHeaders: true,
  });
  const record = { when: new Date().toISOString(), runs, locale, walks: {} };
  try {
    for (const profileId of profileIds) {
      const profile = PROFILES[profileId];
      const browser = await launchFor(chromium, profile);
      record.chromium = browser.version();
      try {
        for (const id of ids) {
          const plan = await planOf(id);
          const raw = [];
          for (let i = 0; i < runs; i++) {
            const w = await walkOnce(browser, server, id, profile, {
              locale,
              plan,
            });
            raw.push(w);
            console.error(
              `${profileId} ${id} run ${i + 1}/${runs}: ` +
                (w.error
                  ? `FAILED ${w.error}`
                  : `usable ${(w.usableMs / 1000).toFixed(1)} s, accepted ${(w.acceptedMs / 1000).toFixed(1)} s`)
            );
          }
          record.walks[`${profileId}/${id}`] = {
            steps: raw[0].steps,
            usableMs: spread(raw.map(r => r.usableMs)),
            acceptedMs: spread(raw.map(r => r.acceptedMs)),
            completed: raw.filter(r => r.acceptedMs != null).length,
            runs: raw.length,
            errors: [...new Set(raw.map(r => r.error).filter(Boolean))],
            values: raw.find(r => r.values)?.values ?? null,
          };
        }
      } finally {
        await browser.close();
      }
    }
  } finally {
    server.close();
  }
  if (jsonPath) writeFileSync(jsonPath, `${JSON.stringify(record, null, 2)}\n`);
  const rows = [
    '| Profile | Lesson | Steps passed | Link to usable (s) | Link to first accepted reading (s), median (min to max) | Completed |',
    '|---|---|---:|---:|---:|---:|',
  ];
  for (const [key, w] of Object.entries(record.walks)) {
    const [profileId, id] = key.split('/');
    const f = v => (v == null ? 'n/a' : (v / 1000).toFixed(1));
    rows.push(
      `| ${profileId} | ${id} | ${w.steps} | ${f(w.usableMs.median)} | ` +
        (w.acceptedMs.n
          ? `${f(w.acceptedMs.median)} (${f(w.acceptedMs.min)} to ${f(w.acceptedMs.max)})`
          : `not completed: ${w.errors[0] ?? ''}`) +
        ` | ${w.completed}/${w.runs} |`
    );
  }
  console.log(rows.join('\n'));
}

const invokedDirectly =
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) await main();
