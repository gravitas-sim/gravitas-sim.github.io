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
//         frame rate. (The label clause on the main canvas lives in
//         canvasLegibility.spec.js, and the plot clause, ticks at least 11 px
//         and titles 12 px with marker shapes, in plotReadingSize.spec.js.)
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
  DEVICE_PIXEL_RATIOS,
  CUE_LUMA_STEP,
  SCENE_ACTION_NAME,
  ARROW_RATIO_FACTOR,
  TRAIL_FRAME_RATES,
  installCanvasTextRecorder,
  openLessonStep,
  measureLayoutInPage,
  readMainCanvasLabels,
  measureSelectionCue,
  measureVelocityArrow,
  measureTrailSpan,
  judgeLayout,
  judgeLabels,
  judgeCue,
  judgeArrows,
  judgeTrailSpans,
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

test.describe('I-9: arrows and trails mean what they show', () => {
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

  // The plot clause (ticks, titles, marker shapes) passes on both pilot plots
  // and is the suite's: e2e/plotReadingSize.spec.js.
});

// -----------------------------------------------------------------------------
// The main canvas, criterion I-9 (labels and the selection cue)
// -----------------------------------------------------------------------------
// The sandbox canvas draws its labels in backing-store pixels with no scaling
// for the display (js/quality.js renderScale makes the store larger on a HiDPI
// screen and the context is not scaled to match), so a font of 10 px covers 10
// CSS pixels on an ordinary screen and about 5 on a display with a ratio of 2.
// e2e/canvasLegibility.spec.js records that baseline in CI as a ratchet; these
// are the criteria it is measured against. A label belongs to a body when its
// anchor is within reach of one; a symbol glyph after a mass belongs to the
// label before it.
// -----------------------------------------------------------------------------

const MAIN_STATES = [
  ...LESSON_PILOTS.filter(p => p.subject === 'scene'),
  { ...LESSON_PILOTS[3] },
  { id: 'keplers-wedges', ...DRAWING_STATES.wedges },
];
const CUE_ROLE = {
  'keplers-2nd-law': 'eccentric',
  'keplers-wedges': 'eccentric',
  'transit-lab': 'planet',
  'weighing-stars-binary': 'a',
  'galilean-resonance': 'star',
};

for (const dpr of DEVICE_PIXEL_RATIOS) {
  test.describe(`I-9: main canvas labels at device pixel ratio ${dpr}`, () => {
    test.use({ deviceScaleFactor: dpr });
    for (const state of MAIN_STATES) {
      const open = async page => {
        await page.addInitScript(installCanvasTextRecorder);
        await page.setViewportSize({ width: 1366, height: 800 });
        await openLessonStep(page, state);
        return page.evaluate(readMainCanvasLabels);
      };
      test(`body labels: ${state.id}`, async ({ page }) => {
        const r = await open(page);
        expect(
          r.bodyLabels.length,
          'the scene drew body labels'
        ).toBeGreaterThan(0);
        const v = judgeLabels(r.bodyLabels);
        expect(
          { small: v.small, overlaps: v.overlaps },
          `canvas scale ${r.canvasScale.toFixed(2)}`
        ).toEqual({ small: [], overlaps: [] });
      });
      test(`other canvas text: ${state.id}`, async ({ page }) => {
        const r = await open(page);
        expect(r.otherText.length, 'the scene drew other text').toBeGreaterThan(
          0
        );
        const v = judgeLabels(r.otherText);
        expect(
          { small: v.small, overlaps: v.overlaps },
          `canvas scale ${r.canvasScale.toFixed(2)}`
        ).toEqual({ small: [], overlaps: [] });
      });
    }
  });
}

test.describe('I-9: the selected body is marked on the canvas', () => {
  for (const state of MAIN_STATES) {
    test(`cue: ${state.id}`, async ({ page }) => {
      await page.addInitScript(installCanvasTextRecorder);
      await page.setViewportSize({ width: 1366, height: 800 });
      await openLessonStep(page, state);
      const m = await page.evaluate(measureSelectionCue, {
        role: CUE_ROLE[state.id],
        lumaStep: CUE_LUMA_STEP,
      });
      expect(m.selected, 'the body was selected').toBe(true);
      expect(
        judgeCue(m).pass,
        `${m.changed} pixels changed in luminance (frame noise ${m.noise})`
      ).toBe(true);
    });
  }
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
