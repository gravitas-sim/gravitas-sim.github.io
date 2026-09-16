// =============================================================================
// A staged value a student can get back to
// -----------------------------------------------------------------------------
// Some steps stage a control at a value no slider tick will ever land on. The
// mass of Sagittarius A* is log10(4.3e6) and the control moves in steps of
// 0.05; a real object does not arrange itself on a grid. `author:check` used to
// warn about every one of those, on the grounds that a student who drags the
// slider cannot get back - and the answer is not to round the mass of a black
// hole, it is to make sure there is a way back.
//
// The way back is the preset button the widget already renders. js/authoring/
// rules.js now accepts an off-grid value when a preset of the same widget sets
// that control to that exact number, which is a claim about what a student can
// do. This is the test of that claim, made both ways a student can make it:
// with a pointer, and from the keyboard alone.
//
// The observable is the <output> beside the slider, not the slider's own value.
// An <input type="range"> snaps what it holds to its own grid, so it reports
// the nearest tick whatever it was set to; the number the student reads is
// rendered from the widget's real value. Asserting on the input would have
// compared 4.5 million with 4.5 million and passed over a broken preset.
// =============================================================================

import { test, expect } from './fixtures.js';

const slider = page =>
  page.locator('#investigationToolControls [data-tool="logm"]');
const readout = page =>
  page.locator('#investigationToolControls [data-tool-out="logm"]');
const sgrPreset = page =>
  page
    .locator('#investigationToolPresets .inv-preset')
    .filter({ hasText: /Sagittarius/i });

/**
 * What the student reads beside the slider, with its spaces normalized.
 *
 * The readouts are typeset - see NUMBER_TYPOGRAPHY.md - so the gap in
 * "4.3 million M\u2609" is a narrow no-break space rather than U+0020, and a
 * comparison against a plain string fails on characters that look identical in
 * the failure message. Only the whitespace is touched; the digits and the unit
 * are the assertion.
 */
const shown = async page =>
  (await readout(page).innerText()).replace(/\s+/gu, ' ').trim();

test.describe('an off-grid staged value can be recovered', () => {
  test.beforeEach(async ({ page, app }) => {
    // black-holes step 21: the bh-thermo instrument, staged at Sagittarius A*.
    // The authoring preview is the entry point author:check itself prints, and
    // renders the same tool panel a reader gets.
    await app.boot({ url: '/?author=black-holes&step=21' });
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect(slider(page)).toBeVisible();
  });

  // Without this the two below would prove nothing: if the staged mass were on
  // the grid, dragging to the nearest tick would return to it by itself and a
  // preset that did nothing at all would still pass.
  test('dragging really cannot get back to the staged value', async ({
    page,
  }) => {
    const staged = await shown(page);
    expect(staged).toMatch(/4\.3 million/);

    const min = Number(await slider(page).getAttribute('min'));
    const step = Number(await slider(page).getAttribute('step'));
    const onGrid = Number(await slider(page).inputValue());
    const ticks = (onGrid - min) / step;
    expect(Math.abs(ticks - Math.round(ticks))).toBeLessThan(1e-6);

    // The nearest tick is a different mass, and the student can see that it is.
    await slider(page).fill(String(onGrid));
    await slider(page).dispatchEvent('input');
    await expect.poll(() => shown(page)).not.toBe(staged);
  });

  test('with a pointer', async ({ page }) => {
    const staged = await shown(page);

    await slider(page).fill('3');
    await slider(page).dispatchEvent('input');
    await expect.poll(() => shown(page)).toBe('1,000 M☉');

    await expect(sgrPreset(page), 'the widget offers the way back').toHaveCount(
      1
    );
    await sgrPreset(page).click();

    await expect.poll(() => shown(page)).toBe(staged);
  });

  test('from the keyboard alone', async ({ page }) => {
    const staged = await shown(page);

    await slider(page).focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => shown(page), { timeout: 5_000 }).not.toBe(staged);

    // Tab forward until the preset has focus. Bounded, so a control that can
    // never be reached fails here rather than hanging.
    let reached = false;
    for (let i = 0; i < 25 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => {
        const el = document.activeElement;
        return Boolean(
          el?.classList?.contains('inv-preset') &&
          /Sagittarius/i.test(el.textContent || '')
        );
      });
    }
    expect(reached, 'the preset is reachable by Tab').toBe(true);

    await page.keyboard.press('Enter');
    await expect.poll(() => shown(page), { timeout: 5_000 }).toBe(staged);
  });
});
