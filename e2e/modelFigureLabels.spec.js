// =============================================================================
// Labels of a figure drawn from the model stay inside its picture
// -----------------------------------------------------------------------------
// An orbit's apsis and focus labels sit beside points that move with the
// eccentricity and the turn of the orbit, and Spanish labels are longer. For
// every eccentricity 0, 0.5 and 0.9 and every turn 0, 90 and 200 degrees (and
// three impact parameters of a transit), in both languages, every label's box
// (SVG getBBox, grown by half its outline) is inside the 320 by 240 view box
// and clear of the other labels. The figure's numbers are tested against the
// integrator in tests/modelFigures.test.js; this measures the page.
// No shipped lesson uses a figure yet, so the lesson is a draft stored the way
// the composer's preview stores one.
//
// @covers:model-figures
// =============================================================================

import { test, expect } from './fixtures.js';

const ECCENTRICITIES = [0, 0.5, 0.9];
const TURNS = [0, 90, 200];
const IMPACTS = [0, 0.5, 0.9];

const orbitStep = (e, omegaDeg) => ({
  sid: `orbit-${String(e).replace('.', 'p')}-${omegaDeg}`,
  type: 'read',
  title: `Orbit e ${e} turn ${omegaDeg}`,
  body: 'An orbit drawn from its constants.',
  figure: { from: 'orbit', params: { a: 100, e, omegaDeg }, lengthUnit: 'au' },
});
const transitStep = b => ({
  sid: `transit-${String(b).replace('.', 'p')}`,
  type: 'read',
  title: `Transit b ${b}`,
  body: 'A transit drawn from its constants.',
  figure: { from: 'transit', params: { k: 0.1, b } },
});
const STEPS = [
  ...ECCENTRICITIES.flatMap(e => TURNS.map(t => orbitStep(e, t))),
  ...IMPACTS.map(transitStep),
];
const LESSON = {
  id: 'draft-model-figure-labels',
  title: 'Figure labels',
  subtitle: 'Every label inside its picture',
  duration: '5 min',
  level: 'Introductory astronomy',
  summary: 'A fixture of orbits and transits drawn from constants.',
  thumbnail: 'images/scenarios/solar-system.webp',
  objectives: ['See the labels fit'],
  steps: STEPS,
};

/** Every label's box in view-box units, and whether it is inside and clear of the others. */
const measure = svg =>
  svg.evaluate(el => {
    const [, , W, H] = el.viewBox.baseVal
      ? [0, 0, el.viewBox.baseVal.width, el.viewBox.baseVal.height]
      : [0, 0, 320, 240];
    const grow = 1.5; // half the 3 px outline the labels are painted with
    const boxes = [...el.querySelectorAll('text')].map(t => {
      const b = t.getBBox();
      return {
        text: t.textContent,
        x0: b.x - grow,
        y0: b.y - grow,
        x1: b.x + b.width + grow,
        y1: b.y + b.height + grow,
      };
    });
    const outside = boxes.filter(
      b => b.x0 < 0 || b.y0 < 0 || b.x1 > W || b.y1 > H
    );
    const overlaps = [];
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1)
          overlaps.push([a.text, b.text]);
      }
    return { count: boxes.length, outside, overlaps, W, H };
  });

for (const language of ['en', 'es'])
  test(`every label of every figure is inside its picture, in ${language}`, async ({
    page,
    app,
  }) => {
    await page.addInitScript(
      ([lesson, lang]) => {
        localStorage.setItem(
          'gravitas_composer_preview',
          JSON.stringify({
            lesson,
            shadow: { steps: lesson.steps.map(() => ({})) },
          })
        );
        localStorage.setItem('gravitas_locale', lang);
      },
      [LESSON, language]
    );
    await app.boot({
      url: '/?author=draft-model-figure-labels&view=student&step=1',
    });
    for (const [i, step] of STEPS.entries()) {
      await expect(page.locator('.inv-step-title')).toHaveText(step.title);
      const svg = page.locator(
        `figure[data-model-figure="${step.sid}"] svg[role="img"]`
      );
      await expect(svg).toBeVisible();
      const m = await measure(svg);
      expect(m.count, step.sid).toBeGreaterThanOrEqual(3);
      expect(m.outside, `${language} ${step.sid} outside`).toEqual([]);
      expect(m.overlaps, `${language} ${step.sid} overlaps`).toEqual([]);
      if (i < STEPS.length - 1)
        await page.locator('#investigationNext').click();
    }
  });
