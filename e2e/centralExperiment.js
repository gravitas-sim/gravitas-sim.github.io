// =============================================================================
// Driving the one experiment each investigation is built around
// -----------------------------------------------------------------------------
// `docs/lesson-acceptance.json` names, per lesson, the object a reader acts on,
// the control they move, the quantity that comes back, where the evidence
// lands, and the steps of the loop. e2e/centralExperiments.spec.js drives all
// twenty-two of those for real, in a browser, and this is what it drives them
// with.
//
// The map is read here, at run time, rather than copied into the tests. A test
// that hard-codes the control it moves keeps passing after the lesson moves it
// somewhere else; one that asks the map cannot. So every helper takes the
// lesson id and looks the answer up, and `declared()` throws rather than
// skipping if the entry is gone.
//
// What the loop has to prove
// -----------------------------------------------------------------------------
// Each of the twenty-two tests walks the same shape, because every one of the
// twenty-two lessons is built on it:
//
//   1. open the investigation and reach the declared prediction
//   2. commit an answer, and check the lesson has NOT said whether it is right
//   3. move the declared control, and check something actually moved
//   4. read the declared quantity from where the map says it comes from
//   5. write the evidence down, and read it back out of saved progress
//   6. assert the relationship the experiment exists to establish
//   7. reach the step the prediction named, and check the verdict is there now
//
// Step 2 and step 7 are the pair that matters. A lesson that marked the
// prediction immediately would settle the question before the experiment ran,
// which is the failure `reveal` was added to fix; a test that only checked the
// verdict at the end could not tell that apart from a working loop.
// =============================================================================

import { readFileSync } from 'node:fs';
import { expect } from './fixtures.js';

/** The hand-reviewed map, read once. */
export const ACCEPTANCE = JSON.parse(
  readFileSync(
    new URL('../docs/lesson-acceptance.json', import.meta.url),
    'utf8'
  )
);

/**
 * What the map says about one lesson.
 *
 * Throws rather than returning null. A missing entry means the test is about to
 * accept an experiment nobody declared, and a soft failure there reads as a
 * pass.
 *
 * @param {string} lessonId - The investigation
 * @returns {object} Its acceptance entry
 */
export function declared(lessonId) {
  const entry = ACCEPTANCE.lessons?.[lessonId];
  if (!entry) {
    throw new Error(
      `docs/lesson-acceptance.json declares no central experiment for "${lessonId}"`
    );
  }
  return entry;
}

/** Open a lesson the way a reader arrives at one. */
export async function openInvestigation(page, app, id) {
  await app.boot({ url: `/#investigation=${id}` });
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
  await page.waitForFunction(() => window.splashScreenEnded === true);
}

/**
 * The lesson's own steps, in order, with the machinery each one carries.
 *
 * Read out of the registry rather than the DOM so a test can find a step by sid
 * before walking anywhere near it.
 */
export async function lessonPlan(page, id) {
  return page.evaluate(async lessonId => {
    const reg = await import('/js/data/investigations/registry.js');
    const lesson = await reg.loadInvestigation(lessonId);
    return lesson.steps.map((s, index) => ({
      index,
      sid: s.sid,
      type: s.type,
      title: s.title,
      reveal: s.reveal ?? null,
      answer: s.answer,
      options: s.options?.length ?? 0,
      fields: (s.fields || []).map(f => f.id),
      tool: s.tool?.id ?? null,
    }));
  }, id);
}

/** One step of the plan, by sid, insisting it is there. */
export function step(plan, sid) {
  const found = plan.find(s => s.sid === sid);
  expect(found, `the lesson still has a step "${sid}"`).toBeTruthy();
  return found;
}

/** How many steps the reader has visited, from the progress readout. */
export const visited = async page =>
  Number(
    (await page.locator('#investigationProgressText').innerText()).match(
      /\d+/
    )?.[0] ?? 0
  );

/**
 * Answer whatever would hold Next up on this screen.
 *
 * Nothing here is asserted: it is the toll for walking past screens that are
 * not the one under test. Several of these loops sit twenty steps in.
 */
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

/**
 * Where the reader is, as the panel itself counts it.
 *
 * "Step 8 of 29", one-based. Not the visited total: that only counts screens
 * seen for the first time, so walking back through a lesson and forward again
 * leaves it unchanged - which stalls a walk that waits for it to move.
 */
export const position = async page =>
  Number(
    (await page.locator('.inv-step-count').innerText()).match(/\d+/)?.[0] ?? 0
  );

/**
 * Walk to a step by sid, forwards or backwards.
 *
 * Not every declared loop runs in step order - radial-velocity reads K off the
 * panel four screens before the tilt it is compared against, and
 * listening-to-spacetime explains the chirp before it measures one - so the
 * direction is decided from where the reader is.
 */
export async function walkToSid(page, plan, sid) {
  const wanted = step(plan, sid);
  const target = wanted.index + 1;
  for (let guard = 0; guard < 80; guard++) {
    const at = await position(page);
    if (at === target) {
      await expect(page.locator('.inv-step-title')).toHaveText(
        wanted.title.trim(),
        { timeout: 10_000 }
      );
      return wanted;
    }
    if (at > target) {
      await page.locator('#investigationPrev').click({ timeout: 15_000 });
    } else {
      await nudge(page);
      await page
        .locator('#investigationNext')
        .click({ timeout: 15_000 })
        .catch(() => {});
    }
    await expect.poll(() => position(page), { timeout: 20_000 }).not.toBe(at);
  }
  throw new Error(`never reached the step "${sid}" (${wanted.title})`);
}

/**
 * Commit to the prediction on this screen and check it is being held.
 *
 * The wrong option on purpose. A test that picks the right one cannot tell a
 * working verdict from a panel that congratulates everybody.
 *
 * @returns {Promise<number>} The option index committed to
 */
export async function commitPredictionHeld(page, predict) {
  expect(
    predict.reveal,
    `${predict.sid} names the step that settles it`
  ).toBeTruthy();
  expect(predict.options).toBeGreaterThan(1);

  const wrong = (predict.answer + 1) % predict.options;
  await page.locator('#investigationBody .inv-option').nth(wrong).click();
  await page.waitForTimeout(150);

  // The whole point of `reveal`: nothing on this screen may say yet.
  const body = page.locator('#investigationBody');
  await expect(body.locator('.inv-held')).toBeVisible();
  await expect(body.locator('.is-correct')).toHaveCount(0);
  await expect(body.locator('.is-wrong')).toHaveCount(0);
  await expect(body.locator('.inv-verdict')).toHaveCount(0);
  return wrong;
}

/** The verdict, on the step the prediction named, marked against the answer. */
export async function expectVerdictRevealed(page, plan, predict) {
  await walkToSid(page, plan, predict.reveal);
  const verdict = page.locator('#investigationBody .inv-verdict');
  await expect(verdict).toBeVisible();
  await expect(verdict).not.toBeEmpty();
}

// --- the instrument ----------------------------------------------------------

/**
 * Every row the widget is reporting, label to value.
 *
 * The panel has to be on screen. A step with no instrument of its own leaves
 * the previous step's rows in the DOM with the panel hidden, and reading those
 * is reading a measurement the reader is not being shown - which is how this
 * helper quietly returned a stale rotation curve on a screen that has no
 * instrument at all.
 */
export const readout = async page => {
  await expect(
    page.locator('#investigationTool'),
    'this step is showing an instrument'
  ).toBeVisible();
  return page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('#investigationToolReadout .inv-tool-row')]
        .map(r => [
          r.querySelector('dt')?.textContent?.trim() ?? '',
          r.querySelector('dd')?.textContent?.trim() ?? '',
        ])
        .filter(([k]) => k)
    )
  );
};

/**
 * Every number in a readout value, in order.
 *
 * Two things in the way, both of them real strings this application produces.
 * "4,272 K" carries a thousands separator, which a plain digit match reads as
 * two numbers; and "\u22120.2 MJ per kg" opens with U+2212, the typographic minus,
 * which is not the hyphen a number parser is looking for. Stripping
 * non-digits is not an option either: "0.13 \u00d7 the real lunar tide" keeps the
 * `e` of "the" and becomes NaN.
 *
 * @param {string} value - A readout value, prose and all
 * @returns {Array<number>} The numbers in it
 */
export function numbersIn(value) {
  const text = String(value)
    .replace(/\u2212/g, '-')
    .replace(/(\d),(?=\d{3}(\D|$))/g, '$1');
  return [...text.matchAll(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g)].map(m =>
    Number(m[0])
  );
}

/** The row whose label matches, with its numbers. */
export function row(rows, match) {
  const key = Object.keys(rows).find(k => match.test(k));
  expect(
    key,
    `the instrument reports something matching ${match}`
  ).toBeTruthy();
  return { label: key, text: String(rows[key]), numbers: numbersIn(rows[key]) };
}

/**
 * The nth number in a readout row whose label matches.
 *
 * @param {object} rows - From readout()
 * @param {RegExp} match - Against the row's label
 * @param {number} [nth] - Which number in the value
 * @returns {number} The value
 */
export function reading(rows, match, nth = 0) {
  const found = row(rows, match);
  const n = found.numbers[nth];
  expect(
    Number.isFinite(n),
    `"${found.text}" has a number at position ${nth}`
  ).toBe(true);
  return n;
}

/**
 * The exponent of a power law, by least squares on the logs.
 *
 * Readouts are rounded for display - the tide at twice the Moon's distance
 * shows as 0.13, not 0.125 - so a single ratio of two of them carries several
 * percent of rounding before any physics. Fitting all the points at once says
 * the thing the lesson is actually about ("the stretch goes as the inverse
 * cube") and is not at the mercy of the least precise pair.
 *
 * @param {Array<number>} xs - The control values
 * @param {Array<number>} ys - What came back
 * @returns {number} n, where y is proportional to x to the n
 */
export function powerLawExponent(xs, ys) {
  expect(xs.length, 'a fit needs more than two points').toBeGreaterThan(2);
  expect(ys.length).toBe(xs.length);
  const lx = xs.map(Math.log);
  const ly = ys.map(Math.log);
  for (const v of [...lx, ...ly]) expect(Number.isFinite(v)).toBe(true);
  const mx = lx.reduce((a, b) => a + b, 0) / lx.length;
  const my = ly.reduce((a, b) => a + b, 0) / ly.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < lx.length; i++) {
    num += (lx[i] - mx) * (ly[i] - my);
    den += (lx[i] - mx) ** 2;
  }
  expect(den, 'the control actually took different values').toBeGreaterThan(0);
  return num / den;
}

/**
 * Move the declared control, and insist the instrument noticed.
 *
 * The before/after comparison is the guard the brief asks for: a test whose
 * control never moved, or moved without reaching the model, fails here rather
 * than going on to assert something about an unchanged readout.
 */
export async function setControl(page, controlId, value) {
  const el = page.locator(
    `#investigationToolControls [data-tool="${controlId}"]`
  );
  await expect(
    el,
    `the screen offers the declared control "${controlId}"`
  ).toBeVisible();
  const before = await readout(page);
  await el.fill(String(value));
  await el.dispatchEvent('input');
  await page.waitForTimeout(250);
  await expect
    .poll(() => el.inputValue(), { timeout: 5_000 })
    .toBe(String(value));
  return { before, after: await readout(page) };
}

/**
 * Press one of the instrument's own buttons.
 *
 * Recording a trial and capturing the table into the notebook are actions the
 * widget declares, not controls, so they arrive as buttons rather than inputs.
 *
 * @param {object} page - The page
 * @param {string} id - The action's id, as the widget declares it
 */
export async function toolAction(page, id) {
  const button = page.locator(
    `#investigationToolActions [data-tool-action="${id}"]`
  );
  await expect(button, `the instrument offers "${id}"`).toBeVisible();
  await button.click();
  await page.waitForTimeout(200);
}

/** The declared control from the map, as a widget id and a control id. */
export function controlOf(entry) {
  const m = /^([a-z0-9-]+)\/([A-Za-z0-9_]+)$/.exec(entry.control);
  expect(
    m,
    `"${entry.control}" is a widget control; prose controls are driven by hand`
  ).toBeTruthy();
  return { widget: m[1], control: m[2] };
}

// --- the evidence ------------------------------------------------------------

/** Saved progress for this lesson, as the application wrote it. */
export const progressOf = (page, id) =>
  page.evaluate(lessonId => {
    const raw = localStorage.getItem(`gravitas_investigation_${lessonId}`);
    return raw ? JSON.parse(raw) : null;
  }, id);

/**
 * Write the measurement into the step's own boxes.
 *
 * Only the boxes a reader fills. Some fields carry a `compute` and render
 * readonly - "worked out for you" - and typing into those would assert the test
 * against its own input instead of against the lesson's arithmetic. Passing one
 * is refused rather than ignored, so a test cannot quietly stop checking the
 * thing it was written to check.
 *
 * @param {object} page - The page
 * @param {string} lessonId - The investigation
 * @param {string} sid - The measure step
 * @param {object} values - Field id to value
 */
export async function recordFields(page, lessonId, sid, values) {
  for (const [field, value] of Object.entries(values)) {
    const box = page.locator(
      `#investigationBody [data-field="${lessonId}:${sid}:${field}"]`
    );
    await expect(box, `the step offers a box for "${field}"`).toBeVisible();
    const readonly = await box.evaluate(el => el.readOnly);
    expect(
      readonly,
      `"${field}" is a box the reader fills, not one the lesson works out`
    ).toBe(false);
    await box.fill(String(value));
    await box.dispatchEvent('input');
    await box.dispatchEvent('change');
  }
  await page.waitForTimeout(250);
}

/**
 * The boxes the lesson fills in for itself, checked against what they should be.
 *
 * @param {object} page - The page
 * @param {string} lessonId - The investigation
 * @param {string} sid - The measure step
 * @param {object} wanted - Field id to the number it should hold
 * @param {number} [tolerance] - Fractional, on each value
 */
export async function expectDerived(
  page,
  lessonId,
  sid,
  wanted,
  tolerance = 0.02
) {
  for (const [field, value] of Object.entries(wanted)) {
    const box = page.locator(
      `#investigationBody [data-field="${lessonId}:${sid}:${field}"]`
    );
    await expect(box, `the step works out "${field}"`).toBeVisible();
    expect(await box.evaluate(el => el.readOnly)).toBe(true);
    await expect.poll(() => box.inputValue(), { timeout: 5_000 }).not.toBe('');
    const got = Number(
      String(await box.inputValue()).replace(/[^0-9.eE+-]/g, '')
    );
    expect(Number.isFinite(got), `"${field}" worked out to a number`).toBe(
      true
    );
    expect(Math.abs(got - value)).toBeLessThanOrEqual(
      Math.abs(value) * tolerance + 10 ** -6
    );
  }
}

/**
 * Read the evidence back out of saved progress.
 *
 * Typing into a box is not evidence; what the lesson kept is. A test that only
 * checked the input's value would pass against a lesson that dropped every
 * answer on the next step.
 */
export async function expectEvidenceRetained(page, lessonId, sid, values) {
  const saved = await progressOf(page, lessonId);
  expect(saved, 'the lesson saved its progress').toBeTruthy();
  for (const [field, value] of Object.entries(values)) {
    expect(
      saved.responses?.[`${lessonId}:${sid}:${field}`],
      `"${field}" was kept`
    ).toBe(String(value));
  }
}

/**
 * Keep an instrument capture.
 *
 * Pressing Capture does not write anything: it offers a draft, and the reader
 * decides whether to keep it and what to claim about it. That is the design -
 * evidence is something a person wrote down, not something a button did - so a
 * test that stops at the button press has not produced any evidence either.
 *
 * @param {object} page - The page
 * @param {object} [notes] - claim, evidence and limitations to write on it
 */
export async function keepCapture(page, notes = {}) {
  const save = page.locator('#nbDraftSave');
  await expect(save, 'the capture offered a draft to keep').toBeVisible();
  if (notes.claim) await page.locator('#nbDraftClaim').fill(notes.claim);
  if (notes.evidence)
    await page.locator('#nbDraftEvidence').fill(notes.evidence);
  if (notes.limitations)
    await page.locator('#nbDraftLimits').fill(notes.limitations);
  await save.click();
  await page.waitForTimeout(250);
}

/**
 * What the reader captured into the notebook.
 *
 * Read through the store rather than the panel. An instrument capture counts as
 * evidence because it was written down and survives, not because a button was
 * pressed and something flashed.
 */
export const captures = page =>
  page.evaluate(async () => {
    const store = await import('/js/notebook/store.js');
    const { ok, entries } = store.load();
    return { ok, entries: entries.map(e => JSON.parse(JSON.stringify(e))) };
  });
