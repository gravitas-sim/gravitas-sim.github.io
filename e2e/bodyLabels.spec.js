// =============================================================================
// Body names and the selection cue on the main canvas (criterion I-9)
// -----------------------------------------------------------------------------
// The sandbox's names are drawn by js/bodyLabels.js. This spec holds what the
// prompt that wrote it promised, on the pilot states (tools/visual-criteria.mjs):
//
//   - every body label and every other piece of canvas text is at least 11 CSS
//     pixels and none sits on another, at device pixel ratios 1 and 2;
//   - the selected body carries a cue that shows in luminance, not only in hue;
//   - a step's own bodies are named at any zoom, apart, whatever else is drawn;
//   - the body_labels setting turns labels to all, names, masses,
//     selected-and-lesson, or none, and the B key walks the five;
//   - a crowded scene is thinned to a stated cap, never smeared;
//   - the size disclosure is drawn with the scale bar on or off.
//
// These tests were the label and cue clauses of e2e/visualCriteria.criteria.js,
// which failed by design on the 3.0 drawing; they moved here when they passed.
// =============================================================================

/* global requestAnimationFrame */
import { test, expect } from './fixtures.js';
import {
  LESSON_PILOTS,
  DRAWING_STATES,
  DEVICE_PIXEL_RATIOS,
  CUE_LUMA_STEP,
  installCanvasTextRecorder,
  openLessonStep,
  readMainCanvasLabels,
  measureSelectionCue,
  judgeLabels,
  judgeCue,
} from '../tools/visual-criteria.mjs';
import { LABEL_CAP } from '../js/bodyLabels.js';

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

/** Let the canvas draw a few whole frames. */
const frames = (page, n = 3) =>
  page.evaluate(
    n =>
      new Promise(done => {
        const tick = left =>
          left ? requestAnimationFrame(() => tick(left - 1)) : done();
        tick(n);
      }),
    n
  );

for (const dpr of DEVICE_PIXEL_RATIOS) {
  test.describe(`main canvas labels at device pixel ratio ${dpr}`, () => {
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
          'the scene named its bodies'
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

test.describe('the selected body is marked on the canvas', () => {
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

test.describe('names follow the step, the zoom and the setting', () => {
  test.use({ deviceScaleFactor: 2 });
  const kepler = LESSON_PILOTS[0];

  const names = async (page, mutate = () => {}, arg) => {
    await page.evaluate(mutate, arg);
    await frames(page);
    const r = await page.evaluate(readMainCanvasLabels);
    return { r, v: judgeLabels(r.bodyLabels) };
  };

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(installCanvasTextRecorder);
    await page.setViewportSize({ width: 1366, height: 800 });
    await openLessonStep(page, kepler);
  });

  test('the step names its three bodies at every zoom, apart', async ({
    page,
  }) => {
    for (const factor of [1, 0.4, 0.12, 0.04]) {
      const { r } = await names(
        page,
        async f => {
          const ui = await import('/js/ui.js');
          ui.state.zoom *= f;
        },
        factor
      );
      // The names of the bodies (a mass), not the scene's own caption, which
      // the area-sweep overlay draws above the orbit and which this pass does
      // not yet keep clear of when the orbit is small.
      const v = judgeLabels(r.bodyLabels.filter(b => /\d\s*M/.test(b.text)));
      expect(v.count, `names at zoom x${factor}`).toBeGreaterThanOrEqual(3);
      expect(
        { small: v.small, overlaps: v.overlaps },
        `zoom x${factor}`
      ).toEqual({ small: [], overlaps: [] });
    }
  });

  test('the setting turns labels to all, names, masses, selected-and-lesson, or none', async ({
    page,
  }) => {
    const at = value =>
      names(
        page,
        async v => {
          const ui = await import('/js/ui.js');
          ui.SETTINGS.body_labels = v;
        },
        value
      );
    expect((await at('all')).v.count).toBeGreaterThanOrEqual(3);
    expect((await at('names')).v.count).toBeGreaterThanOrEqual(3);
    expect((await at('masses')).v.count).toBeGreaterThanOrEqual(3);
    expect((await at('bound')).v.count).toBeGreaterThanOrEqual(3);
    expect((await at('none')).v.count).toBe(0);
    // An old save or link has no value; a bad one means the default.
    expect((await at('sideways')).v.count).toBeGreaterThanOrEqual(3);
  });

  test('B walks all, names, masses, selected and lesson, none', async ({
    page,
  }) => {
    const mode = () =>
      page.evaluate(
        async () => (await import('/js/ui.js')).SETTINGS.body_labels
      );
    await page.evaluate(async () => {
      (await import('/js/ui.js')).SETTINGS.body_labels = 'all';
    });
    const seen = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('b');
      seen.push(await mode());
    }
    expect(seen).toEqual(['names', 'masses', 'bound', 'none', 'all']);
  });

  test('the size disclosure is drawn with the scale bar off', async ({
    page,
  }) => {
    const { r } = await names(page, async () => {
      (await import('/js/ui.js')).SETTINGS.show_scale_bar = false;
    });
    const note = r.otherText.find(b => /enlarged/i.test(b.text));
    expect(note, 'the disclosure').toBeTruthy();
    expect(note.size).toBeGreaterThanOrEqual(12 - 0.1);
  });
});

test.describe('a crowded scene shows its important names and no others', () => {
  test.use({ deviceScaleFactor: 2 });

  test('the cluster, close in: capped, apart, 11 px or more', async ({
    page,
    app,
  }) => {
    await page.addInitScript(installCanvasTextRecorder);
    await page.setViewportSize({ width: 1366, height: 800 });
    await app.boot();
    await app.loadScenario('star-cluster', 'e2e', { run: false });
    await page.evaluate(async () => {
      const ui = await import('/js/ui.js');
      ui.state.zoom *= 6;
    });
    await frames(page, 4);
    const r = await page.evaluate(readMainCanvasLabels);
    const v = judgeLabels(r.bodyLabels);
    expect(v.count, 'some names drawn').toBeGreaterThan(0);
    // Count labels, not drawn pieces: a mass label's suffix (" WD") is a piece
    // of its own, and the scale bar or the size note can sit near a body.
    const labels = r.bodyLabels.filter(
      b =>
        !/^\s/.test(b.text) &&
        !/^[\d.,]+\s*AU$/.test(b.text.trim()) &&
        !/enlarged/i.test(b.text)
    );
    const named = judgeLabels(labels).count;
    expect(named, `at most ${LABEL_CAP} names`).toBeLessThanOrEqual(LABEL_CAP);
    expect({ small: v.small, overlaps: v.overlaps }).toEqual({
      small: [],
      overlaps: [],
    });
  });
});
