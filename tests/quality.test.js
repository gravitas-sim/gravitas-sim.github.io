import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  sampleFrame,
  resetSamples,
  currentTier,
  setTier,
  measuredFps,
  qualityReport,
  renderScale,
  populationCaps,
  renderOverrides,
  onTierChange,
  TIERS,
} from '../js/quality.js';

// =============================================================================
// The quality tier
// -----------------------------------------------------------------------------
// The classifier is pure arithmetic over frame intervals, which makes it
// testable without a browser - and worth testing there, because the failure
// modes are all statistical: demoting a fast machine because a tab was
// backgrounded, flapping between tiers, or never demoting at all because a
// single fast frame kept the mean up.
// =============================================================================

/** Feed n frames at a steady rate, starting from a clean slate. */
function run(fps, frames, { start = 1000 } = {}) {
  const dt = 1000 / fps;
  for (let i = 0; i < frames; i++) sampleFrame(start + i * dt);
}

beforeEach(() => {
  setTier('auto');
  setTier('full');
  setTier('auto');
  resetSamples();
});

describe('it measures the frame rate rather than guessing at it', () => {
  test('nothing is decided before there is enough evidence', () => {
    run(10, 30);
    // Ten frames a second is dreadful, but thirty samples inside the warm-up is
    // not a measurement of the machine, it is a measurement of start-up.
    expect(currentTier()).toBe('full');
  });

  test('the reported rate matches the frames fed in', () => {
    run(60, 200);
    expect(measuredFps()).toBeGreaterThan(58);
    expect(measuredFps()).toBeLessThan(62);
  });

  test('a slow machine is demoted', () => {
    run(20, 300);
    expect(currentTier()).toBe('low');
    expect(measuredFps()).toBeLessThan(25);
  });

  test('a fast machine is left alone', () => {
    run(60, 400);
    expect(currentTier()).toBe('full');
  });

  test('a machine just under the threshold is demoted, just over is not', () => {
    run(30, 300);
    expect(currentTier()).toBe('low');

    resetSamples();
    setTier('auto');
    setTier('full');
    setTier('auto');
    run(34, 300);
    expect(currentTier()).toBe('full');
  });
});

describe('interruptions are not slow frames', () => {
  test('a backgrounded tab does not demote a fast machine', () => {
    // rAF stops in a hidden tab. The resumption looks like one enormous frame,
    // and counting it would demote a machine for being minimised.
    let t = 1000;
    for (let i = 0; i < 200; i++) {
      t += 1000 / 60;
      sampleFrame(t);
    }
    t += 45_000; // two thirds of a minute in another tab
    sampleFrame(t);
    for (let i = 0; i < 200; i++) {
      t += 1000 / 60;
      sampleFrame(t);
    }
    expect(currentTier()).toBe('full');
    expect(measuredFps()).toBeGreaterThan(55);
  });

  test('one long hitch does not outvote a hundred good frames', () => {
    let t = 1000;
    for (let i = 0; i < 100; i++) {
      t += 1000 / 60;
      sampleFrame(t);
    }
    // 400ms: inside the outlier cutoff, so it is counted - and the median has
    // to absorb it where a mean would not. A mean over this window would read
    // about 21fps and demote the machine.
    t += 400;
    sampleFrame(t);
    for (let i = 0; i < 100; i++) {
      t += 1000 / 60;
      sampleFrame(t);
    }
    expect(currentTier()).toBe('full');
  });

  test('a zero or negative interval is ignored rather than dividing by it', () => {
    run(60, 200);
    const before = measuredFps();
    sampleFrame(1000); // a timestamp that goes backwards
    sampleFrame(1000); // and one that does not advance
    expect(Number.isFinite(measuredFps())).toBe(true);
    expect(measuredFps()).toBeGreaterThan(before * 0.5);
  });
});

describe('it does not flap between tiers', () => {
  test('a demoted machine is not promoted on the first fast frames', () => {
    run(20, 300);
    expect(currentTier()).toBe('low');

    // The tier did its job and the machine is now fast. That must not
    // immediately undo it, or the reader gets a strobe.
    run(60, 150, { start: 100_000 });
    expect(currentTier()).toBe('low');
  });

  test('a sustained recovery is eventually promoted', () => {
    run(20, 300);
    expect(currentTier()).toBe('low');
    // The dwell is eight seconds of sustained good frames, so 700 at 60fps
    // (11.7s) clears it and the 500 an earlier version of this test used did
    // not. Stated in time rather than frames on purpose: the promotion should
    // take the same eight seconds whether the machine recovered to 50fps or
    // to 144.
    run(60, 700, { start: 100_000 });
    expect(currentTier()).toBe('full');
  });

  test('promotion takes about the dwell, not a fixed number of frames', () => {
    run(20, 300);
    expect(currentTier()).toBe('low');
    // Six seconds at 120fps is 720 frames - more than the run above - and must
    // still not promote, because it is less than eight seconds.
    run(120, 720, { start: 200_000 });
    expect(currentTier()).toBe('low');
  });

  test('a machine hovering between the thresholds stays put', () => {
    run(20, 300);
    expect(currentTier()).toBe('low');
    // 40fps: above the demote line, below the promote line. Neither.
    run(40, 600, { start: 100_000 });
    expect(currentTier()).toBe('low');
  });
});

describe('the reader can overrule the measurement', () => {
  test('a forced tier is not undone by the sampler', () => {
    setTier('low');
    expect(currentTier()).toBe('low');
    run(60, 500);
    expect(currentTier()).toBe('low');
    expect(qualityReport().auto).toBe(false);
  });

  test('forcing full survives a slow machine', () => {
    setTier('full');
    run(10, 500);
    expect(currentTier()).toBe('full');
  });

  test('auto hands the decision back', () => {
    setTier('low');
    setTier('auto');
    expect(qualityReport().auto).toBe(true);
    run(60, 500);
    // Already at low, and a promotion needs its dwell; the point is only that
    // the sampler is deciding again.
    expect(TIERS).toContain(currentTier());
  });

  test('an unknown tier is refused rather than applied', () => {
    setTier('full');
    setTier('potato');
    expect(currentTier()).toBe('full');
  });

  test('a change notifies subscribers exactly once', () => {
    const seen = [];
    const off = onTierChange(t => seen.push(t));
    setTier('low');
    setTier('low');
    setTier('full');
    off();
    setTier('low');
    expect(seen).toEqual(['low', 'full']);
  });
});

describe('what the tier actually changes', () => {
  test('the full tier changes nothing', () => {
    setTier('full');
    expect(renderScale()).toBe(1);
    expect(populationCaps()).toBeNull();
    expect(renderOverrides()).toBeNull();
  });

  test('the low tier draws fewer pixels', () => {
    setTier('low');
    expect(renderScale()).toBeLessThan(1);
    // Worth stating as pixels rather than as a scale: 0.7 is about half.
    expect(renderScale() ** 2).toBeLessThan(0.55);
    expect(renderScale() ** 2).toBeGreaterThan(0.4);
  });

  test('the low tier caps the generic populations only', () => {
    setTier('low');
    const caps = populationCaps();
    expect(caps.num_asteroids).toBeLessThan(200);
    // Only body counts. star_density and trail_length used to be returned here
    // too, and because the caller applied this object by assigning it into the
    // live SETTINGS, that made a slow machine rewrite the reader's document -
    // which then travelled out through share links and the A/B bench hash.
    // They are presentation, they are read at draw time, and they now live in
    // renderOverrides() where a read-time override actually reaches them.
    for (const key of Object.keys(caps)) {
      expect(key).toMatch(/^num_/);
    }
  });

  test('the presentation keys are overrides, not caps', () => {
    setTier('low');
    const off = renderOverrides();
    expect(off.trail_length).toBeLessThan(15);
    expect(off.star_density).toBeLessThan(3000);
  });

  test('the low tier switches off the full-screen effects', () => {
    setTier('low');
    const off = renderOverrides();
    expect(off.show_object_lensing).toBe(false);
    expect(off.lensing_quality).toBe('off');
    expect(off.show_gravitational_waves).toBe(false);
  });
});

describe('it never asks the browser what it is', () => {
  test('the module reads no user-agent or device hints', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('js/quality.js', 'utf8');
    // The whole design rests on this. A user-agent check would make the tier a
    // property of the label on the box rather than of the frame rate.
    for (const hint of [
      'userAgent',
      'deviceMemory',
      'hardwareConcurrency',
      'platform',
      'userAgentData',
    ]) {
      // Allowed in prose, not in code: strip comments before looking.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toContain(hint);
    }
  });
});

describe('the classifier works at every frame rate, not just slow ones', () => {
  test('a 150fps machine is still judged', () => {
    // The bug this guards: a full 120-sample window at 150fps spans 0.8s, so a
    // rule that required both a full window *and* two seconds of it could never
    // fire on a fast machine. The tier simply stopped being chosen above about
    // 60fps, which is silent and invisible - the tier just never changed.
    setTier('low');
    setTier('auto');
    resetSamples();
    run(150, 2000);
    expect(measuredFps()).toBeGreaterThan(140);
    expect(currentTier()).toBe('full');
  });

  test('a 15fps machine is judged on time rather than on frame count', () => {
    resetSamples();
    // 60 frames at 15fps is four seconds - well past the span gate and well
    // short of a 120-frame window. It must still demote.
    run(15, 60);
    expect(currentTier()).toBe('low');
  });
});
