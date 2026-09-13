// =============================================================================
// The playhead and the speaker describe the same moment
// -----------------------------------------------------------------------------
// The lab's playhead and its Listen button ran on unrelated clocks. renderAudio
// takes a t0 and defaults it to the timeline's start, and nothing passed
// anything else - so pressing Listen with the playhead two thirds of the way
// through a chirp played the chirp from the beginning.
//
// The arithmetic is proved exactly in tests/gwTransport.test.js. What is proved
// here is the wiring: that the sound a browser actually starts is a window of
// the signal beginning where the playhead is, and that everything which moves
// the playhead moves the sound with it.
//
// What is deliberately not asserted: that the audio clock and the animation
// clock stay locked. They are not meant to. The visual playhead advances at the
// preset's own rate so an inspiral can be watched; the audio compresses the
// whole signal into about three seconds because a chirp at the visual rate is
// inaudible. The readout says so. The claim under test is about the origin, not
// the tempo - see js/gw/transport.js.
// =============================================================================

import { test, expect } from './fixtures.js';

const LESSON = 'what-is-a-gravitational-wave';
// The chirp: a full inspiral in the lab, with a playhead to drag and a Listen
// control. The step this transport exists for.
const STEP = 'The chirp';

/**
 * Open the lesson that carries the lab, from a clean progress slate.
 *
 * Sound is permitted first, before the lesson panel is on screen. The panel is
 * a full-height aside that covers the speaker control, so a reader who wants to
 * listen turns the sound on and then opens the lesson - and a test that tried
 * it the other way round spent fifteen seconds failing to click through the
 * panel's own title.
 */
async function openLesson(page, app, { locale, sound = false } = {}) {
  await app.boot();
  if (sound) await permitSound(page);
  await page.evaluate(() => {
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('gravitas_investigation_')) localStorage.removeItem(k);
      }
    } catch {
      /* a private window has no storage, which is fine here */
    }
  });
  if (locale) {
    await page.evaluate(async name => {
      const i18n = await import('/js/i18n/index.js');
      await i18n.setLocale(name, { persist: false });
    }, locale);
  }
  await page.evaluate(async id => {
    const loader = await import('/js/investigationsLoader.js');
    await (await loader.ensureInvestigations()).openInvestigation(id);
  }, LESSON);
  await expect(page.locator('#investigationPanel')).toBeVisible();
}

/** Walk to the step with a given title. */
async function goTo(page, title) {
  for (let n = 0; n < 40; n++) {
    if ((await page.locator('.inv-step-title').innerText()) === title) return;
    // "Finish" means the walk has run off the end, and clicking it opens a
    // dialog that swallows the next click - which turns a wrong step title
    // into a confusing timeout instead of a clear failure.
    const next = page.locator('#investigationNext');
    if ((await next.innerText()).trim() === 'Finish') break;
    await next.click();
    await page.waitForTimeout(80);
  }
  throw new Error(`never reached "${title}"`);
}

/**
 * Let the lab make a sound: the reader's own permission, through the speaker.
 *
 * Two controls, not one. The speaker icon opens the panel; the toggle inside it
 * is what actually permits sound. Clicking only the icon leaves the application
 * muted, which is correct behaviour and was worth discovering here rather than
 * in a test that silently proved nothing.
 */
async function permitSound(page) {
  await page.locator('#sonificationToggle').click();
  await page.locator('#soundPanelToggle').click();
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const a = await import('/js/audio.js');
        return a.getSonificationState().muted;
      })
    )
    .toBe(false);
}

/** The lab's own state, and what the audio layer says it is playing. */
const transport = page =>
  page.evaluate(async () => {
    const w = await import('/js/gwWidgets.js');
    const gwAudio = await import('/js/gwAudio.js');
    const lab = w.activeLab();
    const mapping = gwAudio.currentMapping();
    return {
      cursorT: lab ? lab.cursorT : null,
      tStart: lab?.timeline?.tStart ?? null,
      tEnd: lab?.timeline?.tEnd ?? null,
      playing: Boolean(lab?.playing),
      audioPlaying: gwAudio.isPlaying(),
      owner: gwAudio.currentOwner(),
      // Where the buffer that is playing actually starts, in signal time.
      audioT0: mapping ? mapping.t0 : null,
      speed: mapping ? mapping.speed : null,
    };
  });

/** Put the playhead at a fraction of the span, through the lab's own seek. */
async function seekTo(page, fraction) {
  await page.evaluate(async f => {
    const w = await import('/js/gwWidgets.js');
    const lab = await import('/js/gwLab.js');
    const state = w.activeLab();
    // Stop the picture first. The step autoplays, so a cursor put somewhere
    // and then left alone does not stay there - it runs to the end, and a
    // Listen pressed at the end renders a few milliseconds of signal that is
    // over before anything can observe it. A reader who wants to hear a
    // particular moment pauses, drags, and then presses Listen, which is what
    // this reproduces.
    state.playing = false;
    lab.seekFraction(state, f);
  }, fraction);
}

/**
 * Press one of the lab's controls, the way a reader does.
 *
 * js/investigations.js renders each action as a button carrying its id in
 * data-tool-action, so this clicks the real control rather than reaching past
 * it into the widget - which is the point, since what is under test is the
 * wiring between the control and the sound.
 */
async function press(page, id) {
  const button = page.locator(
    `#investigationToolActions [data-tool-action="${id}"]`
  );
  await expect(button).toBeVisible();
  await button.click();
}

/**
 * Drag the playhead the way a reader does.
 *
 * The slider carries data-tool="cursor" and js/investigations.js listens for
 * `input` on it, so setting the value and dispatching that event is the same
 * path a drag takes - which is what puts the transport on the control-driven
 * branch rather than the step-opening one.
 */
async function dragPlayheadTo(page, fraction) {
  const moved = await page.evaluate(f => {
    const slider = document.querySelector(
      '#investigationToolControls [data-tool="cursor"]'
    );
    if (!slider) return false;
    const lo = Number(slider.min || 0);
    const hi = Number(slider.max || 1);
    slider.value = String(lo + f * (hi - lo));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, fraction);
  expect(moved, 'the lab has a playhead slider to drag').toBe(true);
}

test.describe('Listen starts where the reader is looking', () => {
  test('a sound started from a nonzero cursor begins at that cursor', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    await openLesson(page, app, { sound: true });
    await goTo(page, STEP);

    const before = await transport(page);
    expect(before.tStart).not.toBeNull();
    expect(before.tEnd).toBeGreaterThan(before.tStart);

    // Two thirds of the way in: the case that used to play from the top.
    await seekTo(page, 2 / 3);
    const seeked = await transport(page);
    const wanted = seeked.tStart + (2 / 3) * (seeked.tEnd - seeked.tStart);
    expect(seeked.cursorT).toBeCloseTo(wanted, 6);

    await press(page, 'listen');
    await expect
      .poll(async () => (await transport(page)).audioPlaying)
      .toBe(true);

    const playing = await transport(page);
    // The sound begins at the playhead, not at the beginning of the signal.
    expect(playing.audioT0).toBeCloseTo(playing.cursorT, 6);
    expect(playing.audioT0).toBeGreaterThan(playing.tStart);
  });

  test('seeking while listening moves the sound to the new point', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    await openLesson(page, app, { sound: true });
    await goTo(page, STEP);

    await seekTo(page, 0.1);
    await press(page, 'listen');
    await expect
      .poll(async () => (await transport(page)).audioPlaying)
      .toBe(true);
    const first = await transport(page);

    // The reader drags the playhead somewhere else while it is sounding.
    await dragPlayheadTo(page, 0.7);
    const second = await transport(page);
    expect(second.audioT0).not.toBeCloseTo(first.audioT0, 3);
    expect(second.audioT0).toBeCloseTo(second.cursorT, 6);
  });

  test('pausing the picture stops the sound rather than running on without it', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    await openLesson(page, app, { sound: true });
    await goTo(page, STEP);

    await seekTo(page, 0.2);
    await press(page, 'listen');
    await expect
      .poll(async () => (await transport(page)).audioPlaying)
      .toBe(true);

    // Whatever the play control was showing, put the transport into "paused".
    await page.evaluate(async () => {
      const w = await import('/js/gwWidgets.js');
      w.activeLab().playing = true;
    });
    await press(page, 'play');
    const after = await transport(page);
    expect(after.playing).toBe(false);
    expect(after.audioPlaying).toBe(false);
  });

  test('replay takes the sound back to the start with the picture', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    await openLesson(page, app, { sound: true });
    await goTo(page, STEP);

    await seekTo(page, 0.6);
    await press(page, 'listen');
    await expect
      .poll(async () => (await transport(page)).audioPlaying)
      .toBe(true);

    await press(page, 'replay');
    const after = await transport(page);
    // Replay means start over *and run*, so the playhead is already a frame or
    // two past the start by the time this reads it. What matters is that it
    // went back to the beginning rather than staying where it was: a strict
    // equality here would be asserting that the transport had stopped.
    const span = after.tEnd - after.tStart;
    expect(after.cursorT - after.tStart).toBeLessThan(span * 0.05);
    expect(after.cursorT).toBeGreaterThanOrEqual(after.tStart);
    if (after.audioPlaying) {
      expect(after.audioT0 - after.tStart).toBeLessThan(span * 0.05);
    }
  });

  test('pressing Listen twice cannot leave two sounds running', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    await openLesson(page, app, { sound: true });
    await goTo(page, STEP);

    await seekTo(page, 0.3);
    await press(page, 'listen');
    await expect
      .poll(async () => (await transport(page)).audioPlaying)
      .toBe(true);
    // The second press is a stop, not a second sound.
    await press(page, 'listen');
    expect((await transport(page)).audioPlaying).toBe(false);
    await press(page, 'listen');
    await expect
      .poll(async () => (await transport(page)).audioPlaying)
      .toBe(true);

    const sources = await page.evaluate(async () => {
      const gwAudio = await import('/js/gwAudio.js');
      return gwAudio.state();
    });
    // One description of one thing playing: the module holds a single source.
    expect(sources.playing).toBe(true);
  });

  test('closing the lesson stops a sound it started', async ({
    page,
    app,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    await openLesson(page, app, { sound: true });
    await goTo(page, STEP);

    await seekTo(page, 0.4);
    await press(page, 'listen');
    await expect
      .poll(async () => (await transport(page)).audioPlaying)
      .toBe(true);

    await page.keyboard.press('Escape');
    await expect
      .poll(async () =>
        page.evaluate(async () => {
          const gwAudio = await import('/js/gwAudio.js');
          return gwAudio.isPlaying();
        })
      )
      .toBe(false);
  });
});
