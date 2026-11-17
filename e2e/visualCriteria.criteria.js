// =============================================================================
// Visual criteria I-8 and I-9: can a student see the scene, and read what it says?
// -----------------------------------------------------------------------------
// The direction DESIGN_SYSTEM.md writes ("Visual direction") says a visual
// change is judged by what a student can read (perception), whether they can
// find their way (orientation) and whether it is better to look at
// (appearance, judged on captures, never here). This spec states the first two
// as measurements on the pilot states, before any prompt changes what they
// measure:
//
//   I-8   layout. At 375x812 and 412x915, during a step that uses the scene,
//         the lesson's bound bodies are in view outside every panel and at
//         least a third of the viewport height is unobscured canvas, or one
//         announced action reaches that state. At 768x1024 the step and the
//         scene are both readable side by side. At desktop widths the bound
//         bodies sit outside every panel (the desktop clause).
//   I-9   drawing. Arrow length rises with the speed it shows and the legend
//         states its scale; a trail spans a time that does not follow the
//         frame rate; plot ticks are at least 11 px and labels 12 px. (The
//         label and selection clauses on the main canvas passed and moved to
//         e2e/bodyLabels.spec.js, in the suite.)
//
// On demand, not in CI. These tests state what the 3.0 pilots are measured
// against, and most of the pilot states miss it: they FAIL, and that is the
// result (tests/fixtures/visual-baseline.json, "criteria", holds the numbers).
// They are not run by the browser suite and are not marked as expected
// failures: the suite's skip policy rightly refuses a red test recorded as
// green, and a test added to CI as non-fatal would be a weakened gate. They run
// with
//
//   npm run e2e:criteria
//
// and the prompt that makes a criterion pass on its pilots moves that test into
// the suite (a `.spec.js` file with a README row) in the same change, so from
// then on a regression fails CI in the ordinary way. What is measured is the
// number the criterion names; the judges are in tools/visual-criteria.mjs and
// are shown to pass and to fail in tests/visualCriteria.test.js, and two cases
// here show the harness passing on a clear layout and failing on a covered one.
//
// The pilot states open as a student opens them (the lesson's link, the
// lesson's progress written with the step's sid), not through the authoring
// preview, because the preview lays the page out differently.
// =============================================================================

/* global requestAnimationFrame */
import { test, expect } from './fixtures.js';
import {
  LESSON_PILOTS,
  DRAWING_STATES,
  PHONE_SIZES,
  TABLET_SIZE,
  DESKTOP_SIZES,
  SCENE_ACTION_NAME,
  ARROW_RATIO_FACTOR,
  TRAIL_FRAME_RATES,
  installCanvasTextRecorder,
  openLessonStep,
  measureLayoutInPage,
  measureVelocityArrow,
  measureTrailSpan,
  readCanvasText,
  readSvgPlotText,
  judgeLayout,
  judgeArrows,
  judgeTrailSpans,
  judgePlotType,
  judgeSeriesWithoutColour,
} from '../tools/visual-criteria.mjs';

test.describe('I-8: the scene is in view while the student works', () => {
  const sizes = [
    ...PHONE_SIZES.map(s => ({ ...s, kind: 'phone' })),
    { ...TABLET_SIZE, kind: 'tablet' },
    ...DESKTOP_SIZES.map(s => ({ ...s, kind: 'desktop' })),
  ];
  for (const pilot of LESSON_PILOTS) {
    for (const size of sizes) {
      const title = `${pilot.id} at ${size.width}x${size.height}`;
      test(title, async ({ page }) => {
        await page.setViewportSize({
          width: size.width,
          height: size.height,
        });
        await openLessonStep(page, pilot);
        let m = await page.evaluate(measureLayoutInPage);
        let verdict = judgeLayout(m, {
          kind: size.kind,
          subject: pilot.subject,
        });
        // "or one announced action reaches that state": a control named like
        // the pattern in tools/visual-criteria.mjs, pressed once.
        if (!verdict.pass) {
          const action = page
            .locator('#investigationPanel')
            .getByRole('button', { name: SCENE_ACTION_NAME });
          if (await action.count()) {
            await action.first().click();
            await page.evaluate(
              () =>
                new Promise(r =>
                  requestAnimationFrame(() => requestAnimationFrame(r))
                )
            );
            m = await page.evaluate(measureLayoutInPage);
            verdict = judgeLayout(m, {
              kind: size.kind,
              subject: pilot.subject,
            });
          }
        }
        expect(verdict.reasons, JSON.stringify(m.bodies)).toEqual([]);
      });
    }
  }
});

test.describe('I-9: arrows, trails and plots mean what they show', () => {
  test('arrow length rises with speed (Kepler, the eccentric orbiter)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await openLessonStep(page, LESSON_PILOTS[0]);
    const slow = await page.evaluate(measureVelocityArrow, {
      role: 'eccentric',
      factor: 1,
    });
    const fast = await page.evaluate(measureVelocityArrow, {
      role: 'eccentric',
      factor: ARROW_RATIO_FACTOR,
    });
    expect(slow.drawn, 'an arrow was drawn').toBeGreaterThan(0);
    const v = judgeArrows({ slow: slow.shaftCssPx, fast: fast.shaftCssPx });
    expect(
      v.pass,
      `shaft ${slow.shaftCssPx?.toFixed(1)} px at speed 1, ${fast.shaftCssPx?.toFixed(1)} px at speed ${ARROW_RATIO_FACTOR}`
    ).toBe(true);
  });

  test('the legend states the arrow scale', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await openLessonStep(page, LESSON_PILOTS[0]);
    const r = await page.evaluate(measureVelocityArrow, {
      role: 'eccentric',
      factor: 1,
    });
    // A scale is a number with a speed unit ("1 cm = 5 km/s"). The pattern is
    // the criterion's wording, not a layout: Prompt 337 chooses the sentence.
    expect(r.legend).toMatch(/\d[\d.,]*\s*(km\/s|m\/s|AU\/(yr|y|d|day))/i);
  });

  test('a trail spans a time, whatever the frame rate', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await openLessonStep(page, LESSON_PILOTS[0]);
    const spans = [];
    for (const fps of TRAIL_FRAME_RATES)
      spans.push(await page.evaluate(measureTrailSpan, { fps }));
    const v = judgeTrailSpans(spans);
    expect(
      v.pass,
      `span ratio ${v.ratio.toFixed(2)}: ${spans
        .map(s => `${s.fps} fps -> ${s.span.toPrecision(3)}`)
        .join(', ')}`
    ).toBe(true);
  });

  test('plot type at reading size: the Kepler plot (canvas)', async ({
    page,
  }) => {
    await page.addInitScript(installCanvasTextRecorder);
    await page.setViewportSize({ width: 1366, height: 800 });
    await openLessonStep(page, {
      ...DRAWING_STATES.keplerPlot,
      lesson: DRAWING_STATES.keplerPlot.lesson,
    });
    await page.locator('#investigationPlotCanvas').scrollIntoViewIfNeeded();
    await expect
      .poll(async () => {
        const t = await page.evaluate(
          readCanvasText,
          'investigationPlotCanvas'
        );
        return t.texts.length;
      })
      .toBeGreaterThan(0);
    const r = await page.evaluate(readCanvasText, 'investigationPlotCanvas');
    expect(r.found, 'the plot canvas is on the step').toBe(true);
    const v = judgePlotType(r.texts);
    expect(
      v.pass,
      `ticks ${v.ticks}, smallest tick ${v.smallestTick} px, smallest label ${v.smallestLabel} px`
    ).toBe(true);
  });

  test('plot type at reading size: the transit light curve (SVG)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await openLessonStep(page, {
      ...DRAWING_STATES.transitCurve,
    });
    await expect(page.locator('#lightCurveChart svg')).toBeVisible({
      timeout: 20000,
    });
    await expect
      .poll(async () => {
        const t = await page.evaluate(readSvgPlotText, '#lightCurveChart svg');
        return t.texts.length;
      })
      .toBeGreaterThan(0);
    const r = await page.evaluate(readSvgPlotText, '#lightCurveChart svg');
    const v = judgePlotType(r.texts);
    expect(
      v.pass,
      `ticks ${v.ticks}, smallest tick ${v.smallestTick} px, smallest label ${v.smallestLabel} px`
    ).toBe(true);
    // The series clause: a plot with several series tells them apart by
    // marker shape, not by colour alone. (The light curve has one series, so
    // this holds trivially there; the judge is the same one 338 is held to.)
    const distinct = new Map();
    for (const s of r.series) distinct.set(s.colour, s);
    const series = judgeSeriesWithoutColour([...distinct.values()].slice(0, 1));
    expect(series.pass).toBe(true);
  });
});

test.describe('the harness can pass and can fail', () => {
  test('a clear layout passes: the binary at desktop width', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 800 });
    await openLessonStep(page, LESSON_PILOTS[2]);
    const m = await page.evaluate(measureLayoutInPage);
    expect(m.bodies.length).toBeGreaterThanOrEqual(2);
    const v = judgeLayout(m, { kind: 'desktop', subject: 'scene' });
    expect(v.reasons).toEqual([]);
  });

  test('a covered scene fails: Kepler at 375x812', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openLessonStep(page, LESSON_PILOTS[0]);
    const m = await page.evaluate(measureLayoutInPage);
    const v = judgeLayout(m, { kind: 'phone', subject: 'scene' });
    expect(v.pass, 'the measurement can fail').toBe(false);
    expect(v.reasons.length).toBeGreaterThan(0);
  });
});
