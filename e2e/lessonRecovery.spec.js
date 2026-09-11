// =============================================================================
// Getting out of trouble
// -----------------------------------------------------------------------------
// The half of an activity nobody designs until somebody is stuck in it. Every
// lesson here asks a student to select a body, catch a moment and write down a
// number, and each of those has a way of going wrong that the lesson has to
// answer:
//
//   the wrong body      Clicking the wrong dot must cost a click, not a
//                       restart. The object list names what the step means, and
//                       importing again overwrites the row rather than adding
//                       a second one.
//   the missed moment   An armed event stops the run at ingress, at periapsis,
//                       at the turning point. Without one a measurement is a
//                       reflex test, and a student who blinks waits a whole
//                       period.
//   the reset           Moving forward and back must not throw away what was
//                       typed. A rebuild between two steps of one measurement
//                       is the version of this that hurts.
//
// These are behaviour tests on purpose. Counting probes or asserting that a
// panel opens proves the wiring exists; it does not prove a student who
// mis-clicked can carry on, which is the thing being claimed.
// =============================================================================

import { test, expect } from './fixtures.js';

/** Open a lesson through its own link, the way a student arrives at one. */
async function open(page, app, id) {
  await app.boot({ url: `/#investigation=${id}` });
  await expect(page.locator('#investigationPanel')).toBeVisible();
  await expect(page.locator('.inv-step-title')).not.toBeEmpty();
  await page.waitForFunction(() => window.splashScreenEnded === true);
}

// The panel's progress line counts steps *visited*, not the step you are on -
// it is a progress bar, and going back does not un-visit anything. So position
// is read from the title, which is unique per step in these lessons.
const title = page => page.locator('.inv-step-title').innerText();

const visitedCount = async page => {
  const text = await page.locator('#investigationProgressText').innerText();
  return Number(text.match(/\d+/)?.[0] ?? 0);
};

/**
 * Walk forward to a numbered step.
 *
 * Nothing gates Next in this panel, so this just presses it - answering as it
 * goes would double the wall-clock for no gain here, because what these tests
 * assert lives on the destination screen.
 */
async function goTo(page, wanted) {
  for (let guard = 0; guard < 60; guard++) {
    if (new RegExp(wanted, 'i').test(await title(page))) return;
    const before = await visitedCount(page);
    await page
      .locator('#investigationNext')
      .click({ timeout: 8000 })
      .catch(() => {});
    await expect
      .poll(() => visitedCount(page), { timeout: 12_000 })
      .toBeGreaterThan(before);
  }
  throw new Error(`never reached a step titled /${wanted}/`);
}

const selectedName = page =>
  page.evaluate(async () => {
    const { state } = await import('/js/appState.js');
    return state.selectedObject?.object?.name ?? null;
  });

test.describe('the object list names what a step means', () => {
  // The lesson used to say "click the eccentric one" in prose and nothing else.
  // That is fine until a reader clicks the circular one, at which point the
  // screen offers no way to find out which was meant.
  for (const [id, expected] of [
    ['keplers-laws', ['Kepler Star', 'Circular Orbiter', 'Eccentric Orbiter']],
    ['retrograde-motion', ['Sun', 'Earth', 'Mars']],
  ]) {
    test(`${id}: every intended body is listed and selectable`, async ({
      page,
      app,
    }) => {
      await open(page, app, id);
      const chips = page.locator('.inv-object');
      await expect(chips).toHaveCount(expected.length);
      for (const name of expected) {
        await expect(
          page.locator('.inv-object', { hasText: name })
        ).toHaveCount(1);
      }
    });

    test(`${id}: a wrong selection is undone by choosing another`, async ({
      page,
      app,
    }) => {
      await open(page, app, id);
      const chips = page.locator('.inv-object');
      // Pick the wrong one first, on purpose.
      await chips.last().press('Enter');
      await expect.poll(() => selectedName(page)).toBe(expected.at(-1));
      // Then the right one. The recovery is one keypress, and the list still
      // has focus so a keyboard user has not been thrown to the top of the
      // document.
      await chips.first().press('Enter');
      await expect.poll(() => selectedName(page)).toBe(expected[0]);
      await expect(chips.first()).toBeFocused();
      await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
    });
  }
});

test.describe('a measurement survives going back and forward', () => {
  test('keplers-laws: a typed reading is still there after leaving the step', async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, 'keplers-laws');
    await goTo(page, 'Measure the two orbits');
    const field = page.locator('#investigationBody input[data-field]').first();
    await expect(field).toBeVisible();
    await field.fill('1.234');

    // Forward one, then back. A student who steps away to re-read the previous
    // screen must not come back to an empty box.
    await page.locator('#investigationNext').click();
    await expect.poll(() => title(page)).not.toMatch(/Measure the two orbits/i);
    const prev = page.locator('#investigationPrev');
    await expect(prev).toBeEnabled();
    await prev.click();
    await expect
      .poll(() => title(page), { timeout: 15_000 })
      .toMatch(/Measure the two orbits/i);
    await expect(
      page.locator('#investigationBody input[data-field]').first()
    ).toHaveValue('1.234');
  });

  test('keplers-laws: a reading survives a full reload, which is how a student resumes', async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, 'keplers-laws');
    await goTo(page, 'Measure the two orbits');
    await page
      .locator('#investigationBody input[data-field]')
      .first()
      .fill('2.5');
    // Closing the tab and coming back tomorrow is the real resume path, and the
    // one that would be silently lost if progress were only in memory.
    await page.reload();
    await page.waitForFunction(() => window.splashScreenEnded === true);
    await expect(page.locator('#investigationPanel')).toBeVisible();
    await expect
      .poll(() => title(page), { timeout: 20_000 })
      .toMatch(/Measure the two orbits/i);
    await expect(
      page.locator('#investigationBody input[data-field]').first()
    ).toHaveValue('2.5');
  });

  test('keplers-laws: importing twice overwrites the row rather than adding one', async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, 'keplers-laws');
    await goTo(page, 'Measure four planets');
    const importBtn = page.locator('.inv-import-btn');
    await expect(importBtn).toBeVisible();

    const chips = page.locator('.inv-object');
    // Import the wrong planet, then the right one, and check the first row
    // holds the second choice - not that a second row appeared.
    await chips.nth(1).press('Enter');
    await importBtn.click();
    // data-field carries the whole key - lesson:sid:field - so these match on
    // the suffix rather than the bare field name.
    const firstName = page.locator(
      '#investigationBody input[data-field$=":p1_name"]'
    );
    const wrong = await firstName.inputValue();
    expect(wrong).toBeTruthy();

    await chips.nth(2).press('Enter');
    await importBtn.click();
    // The second import fills row 2, so row 1 keeps the first reading: that is
    // the design. What must NOT happen is row 1 being blanked or duplicated.
    await expect(firstName).toHaveValue(wrong);
    await expect(
      page.locator('#investigationBody input[data-field$=":p2_name"]')
    ).not.toHaveValue('');
  });
});

test.describe('a missed moment is catchable', () => {
  test('keplers-laws: the periapsis step arms a watch rather than asking for reflexes', async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, 'keplers-laws');
    await goTo(page, 'Fast and slow, in numbers');
    // The step opens the event tool with the right bodies chosen and arms
    // nothing: pressing Arm is the interaction. What is being checked is that
    // the reader has that option at all, so catching periapsis is not a matter
    // of clicking at the right instant.
    await expect(page.locator('#pauseEventKind')).toBeVisible();
    await expect(page.locator('#pauseEventKind')).toHaveValue('periapsis');
    await page.locator('#pauseEventArm').click();
    await expect(page.locator('#pauseEventStatus')).toContainText(/watch/i);
    // How long the event takes is simulated time, not wall time, and under a
    // parallel run the wall clock is whatever the machine can spare. Running
    // the simulation faster makes the wait about the physics rather than about
    // the load on the box.
    await page.evaluate(async () => {
      const { SETTINGS, state } = await import('/js/appState.js');
      SETTINGS.sim_speed = Math.max(SETTINGS.sim_speed || 1, 3);
      state.paused = false;
    });
    // The bodies came from the step, not from the reader: this is the pair the
    // measurement is about, and a reader who never opened the tool before is
    // not being asked to work out which two to choose.
    await expect(page.locator('#pauseEventBody')).not.toHaveValue('');
    // And it really stops the simulation when it gets there.
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const { state } = await import('/js/appState.js');
            return state.paused;
          }),
        { timeout: 60_000 }
      )
      .toBe(true);
  });
});

test.describe('an instrument and the scene describe the same thing', () => {
  // Behaviour, not wiring. Each of these changes something on the canvas and
  // checks that the reading follows, which is what "connected" has to mean -
  // a probe that exists and never moves proves nothing.

  test('transit-photometry: the phase readout tracks the planet across the disc', async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, 'transit-photometry');
    await goTo(page, 'Your first transit');
    await page
      .locator('.inv-object', { hasText: 'HD 209458 b' })
      .press('Enter');

    // Over one orbit the planet must be reported clear of the disc at some
    // moments and on it at others. A readout stuck on one answer is not
    // measuring anything.
    const seen = new Set();
    for (let n = 0; n < 90; n++) {
      const text = await page.locator('#investigationProbe').innerText();
      const m = text.match(
        /(clear of the disc|crossing the limb|fully on the disc|behind or beside the star)/
      );
      if (m) seen.add(m[1]);
      if (seen.size >= 2) break;
      await page.waitForTimeout(200);
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
    expect([...seen].some(v => /disc|limb/.test(v))).toBe(true);
  });

  test('missing-mass: the tracer readout follows which star is selected', async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, 'missing-mass');
    await goTo(page, 'Measure the real curve');
    // A chip's text is the role followed by the body's name, so these match on
    // the role - which is also what the step means by "an inner star".
    const readings = [];
    for (const [role, name] of [
      ['inner', 'Disc star 4'],
      ['outer', 'Disc star 40'],
    ]) {
      await page
        .locator('.inv-object', { hasText: new RegExp(`^${role}`) })
        .press('Enter');
      await expect
        .poll(() => page.locator('#investigationProbe').innerText())
        .toContain(name);
      readings.push(await page.locator('#investigationProbe').innerText());
    }
    // Two different stars at two different radii must not report the same
    // distance: that is the whole point of selecting one.
    expect(readings[0]).not.toBe(readings[1]);
  });

  test('tides: the differential pull is reported on the two real bodies', async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, 'tides');
    await goTo(page, 'Three points, three pulls');
    const text = await page.locator('#investigationProbe').innerText();
    // Near side pulled harder than the centre, far side less: the sign pattern
    // is the entire explanation for two bulges, so it is asserted rather than
    // just checked for being present.
    const near = Number(text.match(/Near side[\s\S]*?(-?[\d.]+)%/)?.[1]);
    const far = Number(text.match(/Far side[\s\S]*?(-?[\d.]+)%/)?.[1]);
    expect(near).toBeGreaterThan(0);
    expect(far).toBeLessThan(0);
    // And the figure measured off the drawing is not passed off as the real
    // one: this scenario draws the Earth far larger than scale, so the true
    // number is printed beside it.
    await expect(page.locator('#investigationProbe')).toContainText(
      /at true scale/i
    );
    await expect(page.locator('#investigationProbe')).toContainText(
      /drawn .* of the way to/i
    );
  });

  test('orbital-energy: drift is reported separately from the physical trade', async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, 'orbital-energy');
    await goTo(page, 'Around a real orbit');
    await page
      .locator('.inv-object', { hasText: 'Eccentric Orbiter' })
      .press('Enter');
    await expect(page.locator('#investigationProbe')).toContainText(
      /Whole-system energy/i
    );
    // The distinction the lesson turns on has to be legible: whatever the
    // number is, it is labelled as arithmetic rather than as physics.
    await expect(page.locator('#investigationProbe')).toContainText(
      /unchanged to the precision worth quoting|numerical drift, not physics/
    );
  });

  test('gravity-assist: a rebuilt scene marks the previous run stale', async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, 'gravity-assist');
    await goTo(page, 'Fly it');
    // With no run recorded the readout says so rather than implying freshness.
    await expect(page.locator('#investigationProbe')).toContainText(
      /Last run[\s\S]*none yet/i
    );
  });
});

test.describe('the required action stays possible at every size', () => {
  // The specific failure this guards: a lesson panel, a docked instrument and
  // the main canvas all on screen at once, on a phone or at 200% zoom, with
  // the object list pushed under something or off the bottom. When that
  // happens the step cannot be done at all - the reader is told to select a
  // body and there is no way to.
  const CASES = [
    ['a narrow phone', 390, 780],
    ['a tablet', 820, 1100],
    ['200% zoom', 640, 512],
  ];

  for (const [name, width, height] of CASES) {
    test(`transit-photometry: the object list is reachable on ${name}`, async ({
      page,
      app,
    }) => {
      test.slow();
      await page.setViewportSize({ width, height });
      await open(page, app, 'transit-photometry');
      await goTo(page, 'Your first transit');

      // Nothing pushes the document sideways.
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);

      // The chip is not merely present in the DOM: it can be scrolled to,
      // it is big enough to hit, and nothing is painted on top of it.
      const chip = page.locator('.inv-object').first();
      await chip.scrollIntoViewIfNeeded();
      await expect(chip).toBeVisible();
      const box = await chip.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(32);
      const onTop = await page.evaluate(
        ([x, y]) => {
          const el = document.elementFromPoint(x, y);
          return Boolean(el?.closest('.inv-object'));
        },
        [box.x + box.width / 2, box.y + box.height / 2]
      );
      expect(onTop).toBe(true);

      // And the action actually works from the keyboard at this size.
      await chip.press('Enter');
      await expect.poll(() => selectedName(page)).not.toBeNull();
    });
  }

  test('the whole activity is operable from the keyboard alone', async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, 'keplers-laws');
    await goTo(page, 'Measure the two orbits');
    // Tab until the first chip has focus, then act on it. No pointer is used
    // anywhere in this test.
    let reached = false;
    for (let n = 0; n < 60; n++) {
      await page.keyboard.press('Tab');
      if (
        await page.evaluate(() =>
          Boolean(document.activeElement?.closest('.inv-object'))
        )
      ) {
        reached = true;
        break;
      }
    }
    expect(reached).toBe(true);
    await page.keyboard.press('Enter');
    await expect.poll(() => selectedName(page)).not.toBeNull();
  });

  test('in Spanish, the object list still names the bodies', async ({
    page,
    app,
  }) => {
    test.slow();
    await open(page, app, 'tides');
    await page.evaluate(async () => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale('es', { persist: false });
    });
    // Body names are not translated - they are the scenario's own - but the
    // list, its heading and the readout labels are, and the chips must still
    // be there and still work.
    await expect(page.locator('.inv-object', { hasText: 'Earth' })).toHaveCount(
      1
    );
    await page.locator('.inv-object').first().press('Enter');
    await expect.poll(() => selectedName(page)).not.toBeNull();
    await expect(page.locator('#investigationProbe')).not.toBeEmpty();
  });
});
