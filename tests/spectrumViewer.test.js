import { describe, test, expect } from '@jest/globals';
import MOTION from '../js/data/investigations/lines-and-motion.js';
import DEEPER from '../js/data/investigations/depth/lines-and-motion.js';
import { gradeAnswer, checkAnswer } from '../js/answerCheck.js';
import {
  LIGHT_MODELS,
  MOTION_VALUES,
  viewerMeasurement,
} from '../tools/authoring/lightModels.mjs';
import {
  lightReady,
  spectrumFacts,
  LIGHT_WIDGETS,
  SOURCES,
} from '../js/lightWidgets.js';
import {
  SYNTH_STARS,
  SYNTH_LINES,
  syntheticFlux,
  syntheticGrid,
  deepestDips,
  VIEW_LINES,
} from '../js/light/model.js';
import { LINES } from '../js/data/radiation/lines.js';
import * as SDSS from '../js/data/spectra/sdssSpectra.js';
import { velocityFromZ } from '../js/kernels/radiation/doppler.js';

// =============================================================================
// The spectrum viewer and "Lines and Motion" (Roadmap II, Prompt 83, part 2)
// -----------------------------------------------------------------------------
// The viewer runs the measurement node on a spectrum; these tests hold what it
// reports to the truth where there is one (the synthetic stars' hidden speeds),
// to the catalogue where there is one (the real stars), and the lesson's own
// checkers to the viewer's numbers, so the lesson cannot drift from the screen.
// =============================================================================

const step = (lesson, sid) => lesson.steps.find(s => s.sid === sid);
const C = 299792.458;

describe('the synthetic stars', () => {
  test('the pipeline recovers the hidden speed within a few uncertainties', () => {
    for (const star of SYNTH_STARS) {
      for (const id of ['h-alpha', 'h-beta', 'h-gamma', 'ca2-k']) {
        const m = viewerMeasurement(star.id, id);
        // Within 3 sigma, and the sigma is honest about how well it is known.
        expect(Math.abs(m.velocity - star.vKmS)).toBeLessThan(
          3 * m.velocityError
        );
        expect(m.velocityError).toBeGreaterThan(0);
      }
    }
  });

  test('the shift is the relativistic Doppler shift of the rest wavelength', () => {
    // A noiseless line: the flux minimum falls at rest x (1 + z).
    const star = { vKmS: 120, snr: 1e12, seed: 1 };
    const rest = SYNTH_LINES[0].rest;
    const x = syntheticGrid(rest);
    const y = syntheticFlux(x, star);
    const low = x[y.indexOf(Math.min(...y))];
    const z = Math.sqrt((1 + 120 / C) / (1 - 120 / C)) - 1;
    expect(Math.abs(low - rest * (1 + z))).toBeLessThanOrEqual(0.5);
  });

  test('the same seed draws the same spectrum, and another does not', () => {
    const x = syntheticGrid(6564.6);
    const a = syntheticFlux(x, SYNTH_STARS[0]);
    const b = syntheticFlux(x, SYNTH_STARS[0]);
    const c = syntheticFlux(x, { ...SYNTH_STARS[0], seed: 5 });
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(Array.from(a)).not.toEqual(Array.from(c));
  });

  test('the model’s rest wavelengths are the line list’s', () => {
    for (const L of SYNTH_LINES) {
      const line = LINES.find(l => l.id === L.id);
      expect(L.rest).toBeCloseTo(line.vacuum * 10, 2);
    }
    expect(VIEW_LINES.map(v => v.id)).toEqual(SYNTH_LINES.map(l => l.id));
  });
});

describe('the real stars', () => {
  test('the pack carries z and its error for each, as the manifest has them', () => {
    for (const id of SDSS.SPECTRUM_IDS) {
      const s = SDSS.decodeSpectrum(id);
      expect(Number.isFinite(s.z)).toBe(true);
      expect(s.zErr).toBeGreaterThan(0);
    }
  });

  test('the A star’s H-beta agrees with the catalogue to about two sigma', () => {
    const m = viewerMeasurement('a', 'h-beta');
    const cat = SDSS.decodeSpectrum('a').z * C;
    expect(Math.abs(m.velocity - cat)).toBeLessThan(2 * m.velocityError);
    // ... and H-alpha, whose wings reach the continuum window, a little less well.
    const ha = viewerMeasurement('a', 'h-alpha');
    expect(Math.abs(ha.velocity - cat)).toBeLessThan(3 * ha.velocityError);
  });

  test('the dips are named for the star: hydrogen in A, calcium in G', () => {
    const top = id => {
      const s = SDSS.decodeSpectrum(id);
      return deepestDips(
        Array.from(SDSS.wavelengths()),
        Array.from(s.flux),
        LINES,
        5
      );
    };
    const a = top('a');
    expect(a.slice(0, 4).every(d => d.line.species === 'H')).toBe(true);
    expect(top('g')[0].line.id).toBe('ca2-k');
    // Ca II H is never named: it is less than a pixel from H-epsilon.
    for (const id of SDSS.SPECTRUM_IDS)
      expect(top(id).some(d => d.line.id === 'ca2-h')).toBe(false);
  });
});

describe('the lesson’s answers are the instrument’s', () => {
  test('the arithmetic step is the kernel’s', () => {
    const s = step(MOTION, 'doppler-arithmetic');
    const model = LIGHT_MODELS['lines-and-motion/doppler-arithmetic'];
    const v = model.value();
    expect(Math.abs(v - s.answer)).toBeLessThanOrEqual(s.tolerance);
    expect(gradeAnswer(s, `${v} km/s`).correct).toBe(true);
    expect(checkAnswer(s, v + 2 * s.tolerance)).toBe(false);
    expect(
      gradeAnswer(s, `${String(v).replace('.', ',')} km/s`, { locale: 'es' })
        .correct
    ).toBe(true);
  });

  test('the measurement step accepts what the viewer shows, and not a dropped sign', () => {
    const s = step(MOTION, 'measure-one-shift');
    const v1 = MOTION_VALUES.star1Halpha();
    const v2 = MOTION_VALUES.star2Halpha();
    expect(s.validate({ v1, v2 }).level).toBe('ok');
    expect(s.validate({ v1, v2: -v2 }).level).toBe('error');
    expect(s.validate({ v1: v1 + 30, v2 }).level).toBe('error');
    for (const f of s.fields)
      expect(
        s.validate({ v1: 85, v2: -142, [f.id]: Number(f.hint) }).level
      ).toBe('ok');
  });

  test('the depth steps', () => {
    const q = id => step(DEEPER, id);
    expect(checkAnswer(q('fast-galaxy'), MOTION_VALUES.z01Relativistic())).toBe(
      true
    );
    expect(velocityFromZ(0.1)).toBeCloseTo(28487, 0);
    // The small-shift formula is the wrong answer, and is refused.
    expect(checkAnswer(q('fast-galaxy'), 0.1 * C)).toBe(false);
    expect(
      checkAnswer(q('two-lines-one-star'), MOTION_VALUES.star1Combined())
    ).toBe(true);
    expect(checkAnswer(q('how-wide-is-wide'), MOTION_VALUES.aHbetaEw())).toBe(
      true
    );
    expect(
      checkAnswer(q('a-real-star-two-lines'), MOTION_VALUES.aCombined())
    ).toBe(true);
  });

  test('star 3’s shift is smaller than its uncertainty on every Balmer line and Ca II K', () => {
    for (const id of ['h-alpha', 'h-beta', 'h-gamma', 'ca2-k']) {
      const m = viewerMeasurement('s3', id);
      expect(Math.abs(m.velocity)).toBeLessThan(2 * m.velocityError);
    }
    const ha = viewerMeasurement('s3', 'h-alpha');
    expect(Math.abs(ha.velocity)).toBeLessThan(ha.velocityError);
  });

  test('the catalogue and the combined A-star velocity differ by under two sigma of the combination', () => {
    const diff = Math.abs(
      MOTION_VALUES.aCombined() - MOTION_VALUES.aCatalogue()
    );
    expect(diff).toBeGreaterThan(10);
    expect(diff).toBeLessThan(2 * 10.4);
  });
});

describe('the viewer', () => {
  const W = LIGHT_WIDGETS.find(w => w.id === 'spectrum-viewer');

  test('its data arrive and its readout is the node’s', async () => {
    expect(await lightReady).toBe(true);
    const f = spectrumFacts({ src: 4, view: 1, line: 0 });
    expect(f.synthetic).toBe(true);
    expect(f.m.velocity).toBeCloseTo(MOTION_VALUES.star1Halpha(), 9);
    const rows = W.readout({ src: 4, view: 1, line: 0 });
    expect(rows.every(r => typeof r.value === 'string' && r.value)).toBe(true);
    const v = rows.find(r => /Velocity/.test(r.label));
    expect(v.value).toMatch(/^[−-]?\d+(\.\d+)? ± \d+(\.\d+)? km\/s$/);
  });

  test('a real star says so and shows the catalogue value; a synthetic one does not', async () => {
    await lightReady;
    const real = W.readout({ src: 0, view: 1, line: 1 });
    expect(real[0].value).toMatch(/^Observed/);
    expect(real.some(r => /catalog/.test(r.label))).toBe(true);
    const fake = W.readout({ src: 5, view: 1, line: 0 });
    expect(fake[0].value).toMatch(/^Computed/);
    expect(fake.some(r => /catalog/i.test(r.label))).toBe(false);
    // The hidden speed is never in a student's readout.
    expect(fake.map(r => r.value).join(' ')).not.toMatch(/-142\b|−142\b/);
  });

  test('the whole-spectrum view lists the deepest dips with the line list’s names', async () => {
    await lightReady;
    const rows = W.readout({ src: 0, view: 0, line: 0 });
    expect(rows.filter(r => /^Dip \d/.test(r.label))).toHaveLength(5);
    expect(rows.find(r => r.label === 'Dip 1').value).toMatch(/H-delta/);
  });

  test('a line the star does not have is reported as no line, not as a velocity', async () => {
    await lightReady;
    // Ca II K in the A star is too weak for the node to find an absorption.
    const rows = W.readout({ src: 0, view: 1, line: 3 });
    expect(rows.some(r => /No absorption line/.test(r.value))).toBe(true);
    expect(rows.some(r => /Velocity/.test(r.label))).toBe(false);
  });

  test('every source is selectable', () => {
    expect(SOURCES).toEqual(['a', 'g', 'k', 'm', 's1', 's2', 's3']);
    expect(W.controls.find(c => c.id === 'src').max).toBe(SOURCES.length - 1);
  });
});
