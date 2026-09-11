// =============================================================================
// What the Listen button actually asks the audio engine for
// -----------------------------------------------------------------------------
// tests/gwAudio.test.js already checks renderAudio against arguments handed to
// it directly, and it passed throughout the bug this file exists for. The bug
// was not in the renderer: it was in what the widget passed. The lab
// normalised every playback against the signal's own loudest moment, so
// doubling the distance halved the strain, halved the reference with it, and
// produced an identical sound. Three distances, three plots differing by a
// factor of four, and one audio amplitude - and the ratio the lesson asks the
// student to hear was the one quantity the normalisation removed.
//
// So everything here goes through the widget: press its action, capture the
// arguments it chose, and render with those.
//
// A note on what the ratios mean. 1 : 0.5 : 0.25 in sample amplitude is a
// statement about amplitude and nothing else. It is NOT a ratio of perceived
// loudness - halving an amplitude is nothing like halving how loud something
// sounds - and no message in the interface claims that it is.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import { getWidget, widgetDefaults } from '../js/widgets.js';
import { setSignalAudio } from '../js/widgetRuntime.js';
import { renderAudio } from '../js/gw/audioRender.js';
import { DEFAULT_GAIN } from '../js/gwAudio.js';
import { referenceStrainFor, PRESETS } from '../js/gwLab.js';

/**
 * Render exactly as js/gwAudio.js would.
 *
 * That module adds the playback gain and the device's sample rate on top of
 * whatever the widget asked for. Rendering without them would be testing a
 * different call than the one the button makes, which is the mistake this
 * whole file exists to avoid.
 */
const renderAsPlayed = (timeline, opts) =>
  renderAudio(timeline, { gain: DEFAULT_GAIN, ...opts, sampleRate: 48000 });

/** A canvas whose every 2D method exists and does nothing. */
function stubCanvas() {
  const gradient = { addColorStop() {} };
  const ctx = new Proxy(
    {},
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== 'string') return undefined;
        if (/^create(Linear|Radial|Conic)Gradient$/.test(prop))
          return () => gradient;
        if (prop === 'measureText') return () => ({ width: 30 });
        return () => undefined;
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );
  return {
    clientWidth: 420,
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
  };
}

/** Press Listen at one distance and report what the widget asked for. */
function listenAt(distance, spec = {}) {
  const asked = [];
  setSignalAudio({
    play: (timeline, opts) => {
      asked.push({ timeline, opts });
      return { ok: true };
    },
    stop: () => {},
    isPlaying: () => false,
    currentMapping: () => null,
  });
  const w = getWidget('gw-lab');
  const step = { preset: 'bbh', autoplay: false, ...spec };
  const v = widgetDefaults(w, {});
  w.reset(v, { autorun: false, spec: step });
  v.distance = distance;
  w.draw(stubCanvas(), v, undefined, step);
  w.act('listen', v, step);
  expect(asked.length).toBe(1);
  return asked[0];
}

/** The loudest sample in a rendered buffer. */
const peakSample = rendered => {
  let peak = 0;
  for (const s of rendered.samples) peak = Math.max(peak, Math.abs(s));
  return peak;
};

describe('a controlled comparison keeps its ratios', () => {
  beforeEach(() => setSignalAudio(null));

  test('the reference does not follow the distance', () => {
    const refs = [400, 800, 1600].map(d => listenAt(d).opts.referenceStrain);
    expect(new Set(refs).size).toBe(1);
    expect(refs[0]).toBeGreaterThan(0);
  });

  test('but the strain does', () => {
    const peaks = [400, 800, 1600].map(
      d => listenAt(d).timeline.meta.peakStrain
    );
    expect(peaks[0] / peaks[1]).toBeCloseTo(2, 1);
    expect(peaks[1] / peaks[2]).toBeCloseTo(2, 1);
  });

  test('so the rendered samples come out 1 : 0.5 : 0.25', () => {
    // Rendered for real, with exactly the arguments the widget chose. This is
    // an amplitude ratio and not a loudness ratio.
    const rendered = [400, 800, 1600].map(d => {
      const { timeline, opts } = listenAt(d);
      return renderAsPlayed(timeline, opts);
    });
    const peaks = rendered.map(peakSample);
    expect(peaks[0]).toBeGreaterThan(0.05);
    expect(peaks[1] / peaks[0]).toBeCloseTo(0.5, 2);
    expect(peaks[2] / peaks[0]).toBeCloseTo(0.25, 2);
  });

  test('and nothing clips at any of them', () => {
    for (const d of [400, 800, 1600]) {
      const { timeline, opts } = listenAt(d);
      const out = renderAsPlayed(timeline, opts);
      expect(out.mapping.clippedSamples).toBe(0);
      expect(peakSample(out)).toBeLessThanOrEqual(1);
    }
  });

  test('the headroom covers three times the default before anything clips', () => {
    // The gain leaves room above the reference, and this is where that room
    // runs out. Checked rather than asserted.
    const { timeline, opts } = listenAt(150);
    expect(renderAsPlayed(timeline, opts).mapping.clippedSamples).toBe(0);
  });

  test('and beyond it the engine clamps and says so, rather than hiding it', () => {
    // No fixed reference can cover this control's whole range: the closest
    // setting is forty times louder than the preset's default. Clamping is the
    // honest answer and the readout carries the count.
    const { timeline, opts } = listenAt(20);
    const out = renderAsPlayed(timeline, opts);
    expect(out.mapping.clippedSamples).toBeGreaterThan(0);
    let peak = 0;
    for (const v of out.samples) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThanOrEqual(1);
  });

  test('the mapping records the reference it actually used', () => {
    const { timeline, opts } = listenAt(800);
    const out = renderAsPlayed(timeline, opts);
    expect(out.mapping.normalise).toBe('fixed');
    expect(out.mapping.referenceStrain).toBeCloseTo(
      referenceStrainFor('bbh'),
      30
    );
    // And the strain it measured, so a capture can carry both.
    expect(out.mapping.peakStrain).toBeGreaterThan(0);
    expect(out.mapping.peakStrain).toBeLessThan(out.mapping.referenceStrain);
  });
});

describe('a step can pin the reference itself', () => {
  beforeEach(() => setSignalAudio(null));

  test('an explicit referenceStrain wins', () => {
    const asked = listenAt(400, { referenceStrain: 2e-21 });
    expect(asked.opts.referenceStrain).toBe(2e-21);
  });

  test('and the ratios still hold against it', () => {
    const peaks = [400, 800].map(d => {
      const { timeline, opts } = listenAt(d, { referenceStrain: 2e-21 });
      return peakSample(renderAsPlayed(timeline, opts));
    });
    expect(peaks[1] / peaks[0]).toBeCloseTo(0.5, 2);
  });
});

describe('peak-normalised listening is a separate, opt-in mode', () => {
  beforeEach(() => setSignalAudio(null));

  test('a step asks for it by name', () => {
    expect(listenAt(400).opts.normalise).toBe('fixed');
    expect(listenAt(400, { listen: 'peak' }).opts.normalise).toBe('peak');
  });

  test('and in that mode every distance does reach full scale', () => {
    // Which is the right answer to "what does this waveform sound like" and
    // the wrong answer to "which of these is louder". Both modes exist so
    // that neither question has to borrow the other's normalisation.
    const peaks = [400, 1600].map(d => {
      const { timeline, opts } = listenAt(d, { listen: 'peak' });
      return peakSample(renderAsPlayed(timeline, opts));
    });
    expect(peaks[1] / peaks[0]).toBeCloseTo(1, 2);
  });
});

describe('every preset has a reference of its own', () => {
  test('one per preset, all positive, none shared', () => {
    const refs = PRESETS.map(p => referenceStrainFor(p.id));
    for (const r of refs) expect(r).toBeGreaterThan(0);
    expect(new Set(refs).size).toBe(PRESETS.length);
  });

  test('and it does not change when the lab is driven', () => {
    const before = referenceStrainFor('bbh');
    listenAt(1600);
    listenAt(120);
    expect(referenceStrainFor('bbh')).toBe(before);
  });
});
