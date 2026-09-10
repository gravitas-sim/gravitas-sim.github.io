// =============================================================================
// The speaker, and what it is honest about
// -----------------------------------------------------------------------------
// The waveform arithmetic and the buffer rendering are tested without a browser
// in tests/gwAudio.test.js. What needs one is the part a reader meets: that
// nothing makes a sound before they ask for one, that the icon distinguishes
// permitted from playing, that turning the sound off stops what is playing,
// and that the panel behind the icon says which of two entirely different
// things it would be playing.
//
// Web Audio in headless Chromium produces no sound anybody can hear, but the
// graph is real: contexts start, buffers are created and sources report their
// own ending. Everything asserted below is state the application computes, not
// state it is told.
// =============================================================================

import { test, expect } from './fixtures.js';

const speaker = page => page.locator('#sonificationToggle');

/**
 * Empty the world.
 *
 * The sandbox's voices track orbiting bodies, so in a populated scenario
 * turning the sound on genuinely does start something audible - which is the
 * right answer and the wrong one for testing the silent state. Blank
 * Simulation is the reader's own control for an empty universe.
 */
const emptyWorld = async page => {
  await page.locator('#cleanSimBtn').click();
  await page.waitForTimeout(600);
};
const panel = page => page.locator('#soundPanel');

/** What the control says about itself, in one read. */
const controlState = page =>
  page.evaluate(() => {
    const b = document.getElementById('sonificationToggle');
    const p = document.getElementById('soundPanel');
    return {
      state: b.dataset.state,
      glyph: b.querySelector('.readout-icon-glyph').textContent,
      label: b.getAttribute('aria-label'),
      expanded: b.getAttribute('aria-expanded'),
      panelHidden: p.hidden,
      status: document.getElementById('soundPanelState')?.textContent || '',
      mode: document.getElementById('soundPanelMode')?.textContent || '',
      now: document.getElementById('soundPanelNow')?.textContent || '',
    };
  });

/** Whether any AudioContext has been created at all. */
const contextExists = page =>
  page.evaluate(async () => {
    const m = await import('/js/audio.js');
    return m.audioContext() !== null;
  });

test.describe('nothing makes a sound on its own', () => {
  test('a fresh visit has no audio context and a muted speaker', async ({
    page,
    app,
  }) => {
    await app.boot();
    expect(await contextExists(page)).toBe(false);
    const s = await controlState(page);
    expect(s.state).toBe('muted');
    expect(s.glyph).toBe('🔇');
    expect(s.panelHidden).toBe(true);
  });

  test('opening the panel still creates no context', async ({ page, app }) => {
    await app.boot();
    await speaker(page).click();
    await expect(panel(page)).toBeVisible();
    expect(await contextExists(page)).toBe(false);
  });

  test('the lab refuses to play until sound is permitted, and says why', async ({
    page,
    app,
  }) => {
    await app.boot();
    const result = await page.evaluate(async () => {
      const [{ modelTimeline }, { play }] = await Promise.all([
        import('/js/gw/timeline.js'),
        import('/js/gwAudio.js'),
      ]);
      const tl = modelTimeline({
        m1: 36,
        m2: 29,
        distanceMpc: 410,
        inclinationDeg: 0,
        fStart: 20,
      });
      return play(tl, { speed: 0.3, mode: 'pitch', shiftHz: 150 });
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('muted');
    expect(await contextExists(page)).toBe(false);
  });
});

test.describe('the panel', () => {
  test('opens from the speaker and closes on Escape, returning focus', async ({
    page,
    app,
  }) => {
    await app.boot();
    await speaker(page).click();
    await expect(panel(page)).toBeVisible();
    expect((await controlState(page)).expanded).toBe('true');
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await expect(speaker(page)).toBeFocused();
  });

  test('is reachable and operable from the keyboard alone', async ({
    page,
    app,
  }) => {
    await app.boot();
    // The readout fades itself in, and the speaker is not focusable until it
    // has. click() waits for that on its own; press() does not, so the wait is
    // explicit here. press() then focuses before sending the key, which is
    // what a reader tabbing to the control does.
    await expect(speaker(page)).toBeVisible();
    await speaker(page).press('Enter');
    await expect(panel(page)).toBeVisible();
    // The switch takes focus on open, so Enter here turns the sound on.
    await expect(page.locator('#soundPanelToggle')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect
      .poll(async () => (await controlState(page)).state)
      .not.toBe('muted');
    await expect(page.locator('#soundPanelToggle')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('says that permission is not playback', async ({ page, app }) => {
    await app.boot();
    await speaker(page).click();
    // The panel's prose is in the deferred catalogue, so it arrives a moment
    // after the panel does. Polled rather than read once.
    await expect(page.locator('#soundPanelPermission')).toContainText(
      /does not mean something is playing/i
    );
  });

  test('names the mode and what is playing', async ({ page, app }) => {
    await app.boot();
    await speaker(page).click();
    await expect
      .poll(async () => (await controlState(page)).mode)
      .toBe('Simulation sounds');
    expect((await controlState(page)).now).toBe('Nothing');
  });
});

test.describe('the states are distinguished', () => {
  test('permitted but silent is not the same as playing', async ({
    page,
    app,
  }) => {
    await app.boot();
    await emptyWorld(page);
    await speaker(page).click();
    await page.locator('#soundPanelToggle').click();
    await expect
      .poll(async () => (await controlState(page)).state)
      .toBe('ready');
    const s = await controlState(page);
    expect(s.glyph).toBe('🔈');
    expect(s.label).toMatch(/nothing playing/i);
    expect(s.status).toMatch(/sound is permitted, not started/i);
    // ...and a context now exists, which is exactly the thing that must not by
    // itself have been treated as playback.
    expect(await contextExists(page)).toBe(true);
  });

  test('a populated sandbox with the sound on does report playing', async ({
    page,
    app,
  }) => {
    // The other side of the same distinction. Bodies are orbiting, the voices
    // are tracking them, and something genuinely is audible - so the icon says
    // so. This is the case the silent one above has to be told apart from.
    await app.boot();
    await speaker(page).click();
    await page.locator('#soundPanelToggle').click();
    await expect
      .poll(async () => (await controlState(page)).state)
      .toBe('playing');
    expect((await controlState(page)).mode).toBe('Simulation sounds');
  });

  test('playing a signal moves it to playing, and names the signal', async ({
    page,
    app,
  }) => {
    await app.boot();
    await emptyWorld(page);
    await speaker(page).click();
    await page.locator('#soundPanelToggle').click();
    await page.locator('#soundPanelPreview').click();
    await expect
      .poll(async () => (await controlState(page)).state)
      .toBe('playing');
    const s = await controlState(page);
    expect(s.glyph).toBe('🔊');
    expect(s.mode).toBe('Gravitational-wave signal');
    expect(s.now).toMatch(/gravitational-wave signal/i);
  });

  test('the sandbox comes back when the signal ends', async ({ page, app }) => {
    await app.boot();
    await speaker(page).click();
    await page.locator('#soundPanelToggle').click();
    await page.locator('#soundPanelPreview').click();
    await expect
      .poll(async () => (await controlState(page)).mode)
      .toBe('Gravitational-wave signal');
    await expect
      .poll(async () => (await controlState(page)).mode, { timeout: 20_000 })
      .toBe('Simulation sounds');
    const stillPlaying = await page.evaluate(async () => {
      const m = await import('/js/gwAudio.js');
      return m.isPlaying();
    });
    expect(stillPlaying).toBe(false);
  });

  test('the stop button is disabled until there is something to stop', async ({
    page,
    app,
  }) => {
    await app.boot();
    await speaker(page).click();
    await expect(page.locator('#soundPanelStop')).toBeDisabled();
    await page.locator('#soundPanelToggle').click();
    await page.locator('#soundPanelPreview').click();
    await expect(page.locator('#soundPanelStop')).toBeEnabled();
    await page.locator('#soundPanelStop').click();
    await expect
      .poll(async () => (await controlState(page)).mode)
      .toBe('Simulation sounds');
    await expect(page.locator('#soundPanelStop')).toBeDisabled();
  });
});

test.describe('muting', () => {
  test('turning the sound off stops a signal that is playing', async ({
    page,
    app,
  }) => {
    await app.boot();
    await speaker(page).click();
    await page.locator('#soundPanelToggle').click();
    await page.locator('#soundPanelPreview').click();
    await expect
      .poll(async () => (await controlState(page)).state)
      .toBe('playing');
    await page.locator('#soundPanelToggle').click();
    await expect
      .poll(async () => (await controlState(page)).state)
      .toBe('muted');
    const playing = await page.evaluate(async () => {
      const m = await import('/js/gwAudio.js');
      return m.isPlaying();
    });
    expect(playing).toBe(false);
  });

  test('M mutes from anywhere, without opening the panel', async ({
    page,
    app,
  }) => {
    await app.boot();
    await speaker(page).click();
    await page.locator('#soundPanelToggle').click();
    await expect
      .poll(async () => (await controlState(page)).state)
      .not.toBe('muted');
    await page.keyboard.press('Escape');
    await expect(panel(page)).toBeHidden();
    await page.locator('#simulationCanvas').press('m');
    await expect
      .poll(async () => (await controlState(page)).state)
      .toBe('muted');
  });
});

test.describe('one merger, one sound', () => {
  test('the ripple and the merge event do not both fire a bass drop', async ({
    page,
    app,
  }) => {
    // js/physics.js announces a black-hole merger twice: once by pushing a
    // gravity ripple and once by dispatching gravitasMerge. Both used to reach
    // triggerBassDrop, so one merger played two overlapping bass drops.
    await app.boot();
    await emptyWorld(page);
    await speaker(page).click();
    await page.locator('#soundPanelToggle').click();
    await expect
      .poll(async () => (await controlState(page)).state)
      .toBe('ready');

    const counted = await page.evaluate(async () => {
      const m = await import('/js/audio.js');
      const ctx = m.audioContext();
      let started = 0;
      const real = ctx.createOscillator.bind(ctx);
      ctx.createOscillator = () => {
        const osc = real();
        const realStart = osc.start.bind(osc);
        osc.start = (...a) => {
          started++;
          return realStart(...a);
        };
        return osc;
      };
      const at = { x: 123, y: -45 };
      const physics = await import('/js/physics.js');
      physics.gravity_ripples.push({
        ...at,
        time: Date.now(),
        created: performance.now(),
        duration: 3000,
        mass: 60,
        gw_strength: 1,
      });
      window.dispatchEvent(
        new window.CustomEvent('gravitasMerge', {
          detail: {
            type: 'merge',
            time: performance.now(),
            mergedMass: 60,
            position: at,
          },
        })
      );
      m.updateSonification(performance.now() + 1000);
      await new Promise(r => setTimeout(r, 250));
      ctx.createOscillator = real;
      return started;
    });

    // One bass drop is two oscillators - a sine and a triangle overtone - plus
    // whatever the three sonification voices did, which are created once at
    // start-up and not here. Two drops would be four.
    expect(counted).toBeGreaterThan(0);
    expect(counted).toBeLessThanOrEqual(2);
  });
});
