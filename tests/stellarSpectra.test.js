// =============================================================================
// Four observed spectra
// -----------------------------------------------------------------------------
// What is tested here is not that the arithmetic in js/stellar/spectrumIndex.js
// agrees with itself. It is that the committed data has the properties the
// lesson asserts about it, and that those properties are checkable against
// something outside this project:
//
//   - the dip a label points at is where the label points, measured by finding
//     the minimum in the data rather than by re-running the index;
//   - a published band index, defined by somebody else, puts the M star inside
//     class M and the other three outside it;
//   - the air-to-vacuum conversion reproduces textbook vacuum wavelengths;
//   - the numbers the lesson prints in its own prose are the numbers the data
//     gives, so a lesson cannot go stale against its instrument;
//   - every checksum in the provenance is the checksum of what is beside it.
//
// The one thing deliberately NOT tested is band depth against band depth. A
// test that measured a feature with bandDepth() and compared it with a number
// this project computed with bandDepth() would pass on any data at all.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  GRID,
  SPECTRA,
  SPECTRUM_IDS,
  CITATION,
  decodeSpectrum,
  wavelengths,
  wavelengthAt,
} from '../js/data/spectra/sdssSpectra.js';
import {
  PROVENANCE,
  RECORDS,
} from '../js/data/spectra/sdssSpectraProvenance.js';
import {
  SPECTRAL_FEATURES,
  airToVacuum,
  vacuumToAir,
  bandDepth,
  tioFiveIndex,
  featureById,
} from '../js/stellar/spectrumIndex.js';
import { whenWidgetsReady, getWidget, widgetDefaults } from '../js/widgets.js';
import {
  SPECTRA_WIDGETS,
  TAGS,
  ID_TAGS,
  IDENTIFY_ORDER,
} from '../js/stellarSpectraWidgets.js';
import A_UNIVERSE_OF_STARS from '../js/data/investigations/a-universe-of-stars.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = rel => readFileSync(path.join(REPO, rel), 'utf8');

/**
 * The four feature labels, as a reader sees them.
 *
 * Written out rather than read back from the message catalog on purpose: a
 * test that asked the catalog what the label is would pass on any label at
 * all, including an untranslated message id.
 */
const FEATURE_LABELS = ['Ca II K', 'H\u03b2', 'Na I D', 'TiO'];

/** The spectrum each letter is stored under. */
const byLetter = Object.fromEntries(
  SPECTRUM_IDS.map(id => [SPECTRA[id].letter, id])
);

describe('provenance', () => {
  test('says these are observations, not models', () => {
    expect(PROVENANCE.kind).toBe('observation');
    expect(PROVENANCE.what).toMatch(/measurements of four real stars/i);
    expect(PROVENANCE.what).toMatch(/nothing here is a model/i);
    expect(PROVENANCE.what).toMatch(/synthetic/i);
  });

  test('carries every field a reader needs to find the data again', () => {
    for (const field of [
      'archive',
      'catalogQuery',
      'selection',
      'classification',
      'grid',
      'units',
      'transformations',
      'notDone',
      'size',
      'thinning',
      'caveats',
    ]) {
      expect(PROVENANCE[field]).toBeTruthy();
    }
    expect(PROVENANCE.archive.acknowledgement).toMatch(/Sloan/);
    expect(PROVENANCE.archive.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PROVENANCE.units.wavelength).toMatch(/vacuum/i);
    expect(PROVENANCE.units.flux).toMatch(/erg/);
  });

  test('every spectrum names its archive identity and its observation date', () => {
    for (const id of SPECTRUM_IDS) {
      const s = RECORDS[id];
      expect(String(s.specObjID)).toMatch(/^\d+$/);
      expect(s.plate).toBeGreaterThan(0);
      expect(s.mjd).toBeGreaterThan(50000);
      expect(s.fiberID).toBeGreaterThan(0);
      expect(s.observed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isFinite(s.ra)).toBe(true);
      expect(Number.isFinite(s.dec)).toBe(true);
      expect(s.url).toMatch(/^https:\/\/dr18\.sdss\.org\//);
      expect(s.sourceSamples).toBeGreaterThan(GRID.count);
    }
  });

  test('two independent classifications agree on the letter', () => {
    for (const id of SPECTRUM_IDS) {
      const s = SPECTRA[id];
      expect(s.subClass.startsWith(s.letter)).toBe(true);
      expect(s.elodieSpType.startsWith(s.letter)).toBe(true);
    }
    expect(SPECTRUM_IDS.map(id => SPECTRA[id].letter)).toEqual([
      'A',
      'G',
      'K',
      'M',
    ]);
  });

  test('records what was done to the numbers, and what was not', () => {
    const steps = PROVENANCE.transformations.map(t => t.step);
    expect(steps).toEqual(['trim', 'bin', 'quantise']);
    for (const t of PROVENANCE.transformations) {
      expect(t.from).toBeTruthy();
      expect(t.to).toBeTruthy();
      expect(t.why).toBeTruthy();
      expect(t.parameters).toBeTruthy();
    }
    // The four things a spectrum bundle is most likely to have done quietly.
    const notDone = PROVENANCE.notDone.join(' ').toLowerCase();
    for (const word of ['smoothing', 'normalisation', 'continuum', 'rest']) {
      expect(notDone).toContain(word);
    }
  });

  test('the recorded bin factor is the one the grid actually has', () => {
    const bin = PROVENANCE.transformations.find(t => t.step === 'bin');
    // SDSS samples at log step 1e-4. The stored grid must be an exact whole
    // multiple of it, and that multiple must be the factor the record claims.
    const factor = GRID.logStep / 1e-4;
    expect(factor).toBeCloseTo(Math.round(factor), 9);
    expect(bin.parameters).toContain(String(Math.round(factor)));
    expect(GRID.count * Math.round(factor)).toBeLessThanOrEqual(
      Math.min(...SPECTRUM_IDS.map(id => RECORDS[id].sourceSamples))
    );
  });

  test('the thinning cost is recorded per feature and is small', () => {
    for (const f of SPECTRAL_FEATURES) {
      expect(PROVENANCE.thinning.worstShiftPP[f.id]).toBeLessThan(3);
    }
    // Smaller than the smallest contrast the lesson asks a reader to see,
    // which is the G star's hydrogen against the K star's - about 5 points.
    expect(PROVENANCE.thinning.worstOverall).toBeLessThan(2);
  });
});

describe('checksums', () => {
  test('the data the browser loads is the data the record checksums', () => {
    // Across the two files: the flux from the module the widget imports, the
    // checksum from the record nothing imports. If either were regenerated
    // without the other, this is what fails.
    for (const id of SPECTRUM_IDS) {
      const digest = createHash('sha256')
        .update(Buffer.from(SPECTRA[id].data, 'base64'))
        .digest('hex');
      expect(digest).toBe(RECORDS[id].payloadSha256);
    }
  });

  test('every source checksum is a SHA-256 and they are all distinct', () => {
    const seen = new Set();
    for (const id of SPECTRUM_IDS) {
      const s = RECORDS[id];
      expect(s.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(seen.has(s.sourceSha256)).toBe(false);
      seen.add(s.sourceSha256);
    }
  });
});

describe('the runtime copy and the record', () => {
  test('the browser copy carries what the widget reads, and nothing it could present as provenance', () => {
    const allowed = new Set([
      'letter',
      'subClass',
      'elodieSpType',
      'elodieTEff',
      'plate',
      'mjd',
      'fiberID',
      'observed',
      'url',
      'count',
      'scale',
      'data',
    ]);
    for (const id of SPECTRUM_IDS) {
      expect(Object.keys(SPECTRA[id]).filter(k => !allowed.has(k))).toEqual([]);
      // ...and what it does carry agrees with the record.
      for (const k of allowed) {
        if (k === 'data' || k === 'scale') continue;
        expect(SPECTRA[id][k]).toEqual(RECORDS[id][k]);
      }
      expect(RECORDS[id].data).toBeUndefined();
    }
  });

  test('no module in the application imports the record, so it is never shipped', () => {
    // The whole reason it is a separate file. A single import from js/ would
    // put its 8 KB back into the lesson's chunk without failing anything else.
    const walk = dir =>
      readdirSync(path.join(REPO, dir), { withFileTypes: true }).flatMap(e =>
        e.isDirectory()
          ? walk(path.join(dir, e.name))
          : e.name.endsWith('.js')
            ? [path.join(dir, e.name)]
            : []
      );
    const importers = walk('js')
      .filter(f => !f.startsWith(path.join('js', 'data', 'spectra')))
      .filter(f => source(f).includes('sdssSpectraProvenance'));
    expect(importers).toEqual([]);
  });

  test('the readout can still name its source', () => {
    expect(CITATION).toMatch(/SDSS DR18/);
    expect(CITATION).toMatch(/Almeida et al\. 2023/);
  });
});

describe('the grid and the flux', () => {
  test('wavelength increases, everywhere, on one shared axis', () => {
    const lam = wavelengths();
    expect(lam.length).toBe(GRID.count);
    for (let i = 1; i < lam.length; i++) {
      expect(lam[i]).toBeGreaterThan(lam[i - 1]);
    }
    expect(lam[0]).toBeCloseTo(GRID.firstA, 2);
    expect(lam[lam.length - 1]).toBeCloseTo(GRID.lastA, 2);
    expect(wavelengthAt(0)).toBeCloseTo(lam[0], 9);
  });

  test('the range covers the optical window the features sit in', () => {
    const lam = wavelengths();
    expect(lam[0]).toBeLessThan(3900);
    expect(lam[lam.length - 1]).toBeGreaterThan(7250);
  });

  test('every flux value is finite, and none is negative', () => {
    for (const id of SPECTRUM_IDS) {
      const s = decodeSpectrum(id);
      expect(s.flux.length).toBe(GRID.count);
      for (let i = 0; i < s.flux.length; i++) {
        expect(Number.isFinite(s.flux[i])).toBe(true);
        expect(s.flux[i]).toBeGreaterThan(0);
      }
    }
  });

  test('all four decode onto the same axis', () => {
    for (const id of SPECTRUM_IDS) {
      const s = decodeSpectrum(id);
      expect(s.logStart).toBe(GRID.logStart);
      expect(s.step).toBe(GRID.logStep);
    }
  });
});

describe('air and vacuum', () => {
  // The conversion is where a mislabeled line comes from, so it is checked
  // against wavelengths anybody can look up rather than against itself.
  test('reproduces published vacuum wavelengths', () => {
    expect(airToVacuum(6562.8)).toBeCloseTo(6564.61, 1);
    expect(airToVacuum(4861.33)).toBeCloseTo(4862.69, 1);
    expect(airToVacuum(3933.66)).toBeCloseTo(3934.78, 1);
    expect(airToVacuum(5892.94)).toBeCloseTo(5894.6, 1);
  });

  test('the inverse is an inverse', () => {
    for (const air of [3900, 4861.33, 5892.94, 6562.8, 9000]) {
      expect(vacuumToAir(airToVacuum(air))).toBeCloseTo(air, 3);
    }
  });

  test('the shift is large enough to matter and is not zero', () => {
    // 1.8 Angstroms at H-alpha. A bundle that forgot the conversion would
    // measure a Balmer line almost two Angstroms off its center.
    expect(airToVacuum(6562.8) - 6562.8).toBeGreaterThan(1.5);
    expect(airToVacuum(6562.8) - 6562.8).toBeLessThan(2.5);
  });
});

describe('a labeled feature is where the label says it is', () => {
  /** The wavelength of the deepest sample inside a window, in air. */
  const troughAir = (spec, loAir, hiAir) => {
    const lo = airToVacuum(loAir);
    const hi = airToVacuum(hiAir);
    let best = Infinity;
    let at = NaN;
    for (let i = 0; i < spec.flux.length; i++) {
      const lam = wavelengthAt(i);
      if (lam < lo || lam > hi) continue;
      if (spec.flux[i] < best) {
        best = spec.flux[i];
        at = vacuumToAir(lam);
      }
    }
    return at;
  };

  // Which star each line is unmistakable in. A test that looked for Ca II K in
  // the A star would be looking for something that is not there, which is
  // itself one of the lesson's claims.
  const WHERE = [
    { feature: 'cak', letter: 'G', tolerance: 6 },
    { feature: 'hbeta', letter: 'A', tolerance: 6 },
    { feature: 'nad', letter: 'M', tolerance: 6 },
  ];

  test.each(WHERE)(
    '$feature has its deepest point at its stated wavelength in the $letter star',
    ({ feature, letter, tolerance }) => {
      const f = featureById(feature);
      const spec = decodeSpectrum(byLetter[letter]);
      // Searched over a span several times the line window, so finding the
      // center is a result and not a consequence of where we looked.
      const at = troughAir(spec, f.centerAir - 25, f.centerAir + 25);
      expect(Math.abs(at - f.centerAir)).toBeLessThan(tolerance);
    }
  );

  test('every feature window sits inside the committed wavelength range', () => {
    const lam = wavelengths();
    for (const f of SPECTRAL_FEATURES) {
      const lo = airToVacuum(Math.min(f.line[0], f.blue[0], f.red[0]));
      const hi = airToVacuum(Math.max(f.line[1], f.blue[1], f.red[1]));
      expect(lo).toBeGreaterThan(lam[0]);
      expect(hi).toBeLessThan(lam[lam.length - 1]);
    }
  });

  test('the TiO band is a drop across a head, not a dip in a continuum', () => {
    // The M star's flux just redward of 7,100 A must be below its flux just
    // blueward of it, and the other three must not do that. Measured directly
    // off the samples rather than through the index.
    const meanBetween = (spec, loAir, hiAir) => {
      const lo = airToVacuum(loAir);
      const hi = airToVacuum(hiAir);
      let sum = 0;
      let n = 0;
      for (let i = 0; i < spec.flux.length; i++) {
        const lam = wavelengthAt(i);
        if (lam >= lo && lam <= hi) {
          sum += spec.flux[i];
          n++;
        }
      }
      return sum / n;
    };
    const drop = letter => {
      const s = decodeSpectrum(byLetter[letter]);
      return meanBetween(s, 7080, 7130) / meanBetween(s, 7000, 7045);
    };
    expect(drop('M')).toBeLessThan(0.92);
    for (const letter of ['A', 'G', 'K']) {
      expect(drop(letter)).toBeGreaterThan(0.95);
    }
  });
});

describe('a published index, defined elsewhere, agrees', () => {
  // Reid, Hawley & Gizis 1995 calibrate spectral type against TiO5 as roughly
  // Sp(M) = 8.2 - 10.775 * TiO5 over 0.2 < TiO5 < 1.0. The point of using it
  // is that nothing about its definition came from this project.
  test('TiO5 puts the M star inside class M and the others outside', () => {
    const tio5 = letter => tioFiveIndex(decodeSpectrum(byLetter[letter]));
    expect(tio5('M')).toBeLessThan(0.7);
    const subtype = 8.2 - 10.775 * tio5('M');
    expect(subtype).toBeGreaterThan(1);
    expect(subtype).toBeLessThan(6);
    for (const letter of ['A', 'G', 'K']) {
      expect(tio5(letter)).toBeGreaterThan(0.9);
    }
  });

  test('the recorded TiO5 on each spectrum is that index', () => {
    for (const id of SPECTRUM_IDS) {
      expect(tioFiveIndex(decodeSpectrum(id))).toBeCloseTo(RECORDS[id].tio5, 3);
    }
  });
});

describe('the claims the lesson makes about the data', () => {
  const depth = (letter, feature) =>
    bandDepth(decodeSpectrum(byLetter[letter]), featureById(feature)) * 100;

  test('hydrogen falls all the way from A to M', () => {
    const h = ['A', 'G', 'K', 'M'].map(l => depth(l, 'hbeta'));
    for (let i = 1; i < h.length; i++) expect(h[i]).toBeLessThan(h[i - 1]);
    // And by enough to see: the lesson says eightfold.
    expect(h[0] / h[3]).toBeGreaterThan(6);
  });

  test('calcium rises and then falls, which is the lesson its own step is about', () => {
    const c = ['A', 'G', 'K', 'M'].map(l => depth(l, 'cak'));
    expect(c[1]).toBeGreaterThan(c[0]);
    expect(c[1]).toBeGreaterThan(c[3]);
    expect(c[3]).toBeGreaterThan(c[0]);
    // Not a monotone function of temperature: two of the four bracket a third.
    expect(c[0]).toBeLessThan(10);
  });

  test('sodium climbs all the way from A to M', () => {
    const n = ['A', 'G', 'K', 'M'].map(l => depth(l, 'nad'));
    for (let i = 1; i < n.length; i++) expect(n[i]).toBeGreaterThan(n[i - 1]);
  });

  test('the G star and the K star are separated by a feature, not by a color', () => {
    // The step that asks a reader to name star S turns on this margin.
    expect(depth('K', 'nad') / depth('G', 'nad')).toBeGreaterThan(2);
    expect(depth('G', 'hbeta') / depth('K', 'hbeta')).toBeGreaterThan(1.4);
  });

  test('the numbers the lesson prints are the numbers the data gives', () => {
    // Hand-written in the lesson prose and validate() thresholds. If the data
    // is ever regenerated differently, this is what says the words went stale.
    const expected = {
      hbeta: { A: 36.6, G: 14.4, K: 9.0, M: 4.8 },
      cak: { A: 3.4, G: 56.1, K: 52.6, M: 21.9 },
      nad: { A: 3.7, G: 9.0, K: 23.0, M: 52.6 },
      tio: { A: 1.9, G: 1.8, K: 0.2, M: 13.5 },
    };
    for (const [feature, byL] of Object.entries(expected)) {
      for (const [letter, value] of Object.entries(byL)) {
        expect(depth(letter, feature)).toBeCloseTo(value, 0);
      }
    }
  });
});

describe('nothing reaches the network at run time', () => {
  const FILES = [
    'js/data/spectra/sdssSpectra.js',
    'js/data/spectra/sdssSpectraProvenance.js',
    'js/stellarSpectraWidgets.js',
    'js/stellar/spectrumIndex.js',
  ];

  test.each(FILES)('%s makes no request', rel => {
    const text = source(rel);
    expect(text).not.toMatch(/\bfetch\s*\(/);
    expect(text).not.toMatch(/XMLHttpRequest/);
    expect(text).not.toMatch(/importScripts/);
  });

  test('the archive appears only as recorded provenance, never as a load', () => {
    const text = source('js/data/spectra/sdssSpectra.js');
    // The URLs are in the file - they have to be, that is the provenance - but
    // every one of them is inside a string in SPECTRA and none is an argument
    // to anything.
    expect(text).toMatch(/dr18\.sdss\.org/);
    expect(text).not.toMatch(/\(\s*['"`]https?:/);
  });
});

describe('the data is loaded only when it is needed', () => {
  test('the registry does not pull the spectra in statically', () => {
    const registry = source('js/widgets.js');
    expect(registry).not.toMatch(/data\/spectra/);
  });

  test('the widget reaches the data through a dynamic import only', () => {
    const text = source('js/stellarSpectraWidgets.js');
    expect(text).toMatch(
      /import\(\s*'\.\/data\/spectra\/sdssSpectra\.js'\s*\)/
    );
    // No static form of the same specifier anywhere in the file.
    expect(text).not.toMatch(/import\s[^(]*from\s*'\.\/data\/spectra/);
  });

  test('no other module in the application imports the spectra', () => {
    const offenders = [];
    for (const rel of ['js/widgets.js', 'js/investigations.js', 'js/main.js']) {
      if (source(rel).includes('data/spectra')) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});

describe('the instruments', () => {
  beforeAll(async () => {
    await whenWidgetsReady();
  });

  test('both are registered and findable by the ids the lesson names', () => {
    expect(getWidget('spectra-compare')).toBeTruthy();
    expect(getWidget('spectra-identify')).toBeTruthy();
    expect(SPECTRA_WIDGETS).toHaveLength(2);
  });

  test('neither reads the simulation', () => {
    for (const w of SPECTRA_WIDGETS) {
      expect(w.live).toBeFalsy();
      expect(w.animated).toBe(false);
    }
  });

  test('every control can be driven from the keyboard', () => {
    for (const w of SPECTRA_WIDGETS) {
      expect(w.controls.length).toBeGreaterThan(0);
      for (const c of w.controls) {
        // The lesson engine's arrow-key handler moves a control by c.step and
        // clamps to c.min / c.max, so a control missing any of these cannot be
        // operated without a pointer.
        expect(Number.isFinite(c.min)).toBe(true);
        expect(Number.isFinite(c.max)).toBe(true);
        expect(c.step).toBeGreaterThan(0);
        expect(c.max).toBeGreaterThan(c.min);
        expect(c.value).toBeGreaterThanOrEqual(c.min);
        expect(c.value).toBeLessThanOrEqual(c.max);
        expect(typeof c.label).toBe('string');
        expect(c.label.length).toBeGreaterThan(0);
        // Every reachable position has a name, so a screen reader is never
        // told the setting is "3".
        for (let v = c.min; v <= c.max; v += c.step) {
          const shown = c.format ? c.format(v) : String(v);
          expect(typeof shown).toBe('string');
          expect(shown.length).toBeGreaterThan(0);
          expect(shown).not.toMatch(/^specW\./);
        }
      }
    }
  });

  test('the readout is a complete text equivalent of the picture', () => {
    const w = getWidget('spectra-compare');
    const rows = w.readout(widgetDefaults(w, {}), undefined, {});
    const text = rows.map(r => `${r.label} ${r.value}`).join(' | ');
    // It says what kind of thing is being shown...
    expect(text).toMatch(/[Oo]bservation/);
    // ...names all four stars...
    for (const tag of TAGS) expect(text).toContain(tag);
    // ...carries every feature's measured value for every one of them...
    const starRows = rows.filter(r => /%/.test(r.value));
    expect(starRows).toHaveLength(4);
    for (const row of starRows) {
      for (const label of FEATURE_LABELS) expect(row.value).toContain(label);
      expect(row.value.match(/\d+\.\d%/g)).toHaveLength(
        SPECTRAL_FEATURES.length
      );
    }
    // ...and states the limit, on every screen.
    expect(text).toMatch(/[Nn]ot an atlas/);
    expect(text).not.toMatch(/specW\./);
  });

  test('the readout carries the numbers a reader needs with no canvas at all', () => {
    const w = getWidget('spectra-identify');
    for (let star = 1; star <= 4; star++) {
      const rows = w.readout(widgetDefaults(w, { star }), undefined, {});
      const labels = rows.map(r => r.label);
      // One row per feature, whichever window is on screen: the question is
      // which star this is, and a reader must not have to see the plot to
      // gather the same evidence.
      for (const label of FEATURE_LABELS) expect(labels).toContain(label);
      const measured = rows.filter(r => /% deep/.test(r.value));
      expect(measured).toHaveLength(SPECTRAL_FEATURES.length);
      // Each one says where it was measured, not just how deep it was.
      for (const row of measured) expect(row.value).toMatch(/near [\d,]+ /);
      expect(rows.map(r => r.value).join(' ')).toMatch(/plate \d+/);
    }
  });

  test('each depth says which stretch of spectrum it is about, in the text', () => {
    // Written out from the windows the lesson declares, not read back from the
    // widget: a reader who cannot see the shaded band needs the numbers that
    // define it, and this is what says they are there.
    const w = getWidget('spectra-identify');
    const rows = w.readout(widgetDefaults(w, { star: 4 }), undefined, {});
    const text = label => rows.find(r => r.label === label).value;
    expect(text('Ca II K')).toMatch(/3,927\u20133,940/);
    expect(text('Ca II K')).toMatch(/3,895\u20133,915/);
    expect(text('Ca II K')).toMatch(/3,944\u20133,952/);
    expect(text('TiO')).toMatch(/7,080\u20137,130/);
    expect(text('TiO')).toMatch(/band head/);
    for (const row of rows.filter(r => /% deep/.test(r.value))) {
      expect(row.value).toMatch(/in air/);
    }
    expect(rows.map(r => r.value).join(' ')).toMatch(/SDSS DR18/);
  });

  test('the answer is held until the control asks for it', () => {
    const w = getWidget('spectra-identify');
    const held = w.readout(
      widgetDefaults(w, { star: 4, reveal: 0 }),
      undefined,
      {}
    );
    const shown = w.readout(
      widgetDefaults(w, { star: 4, reveal: 1 }),
      undefined,
      {}
    );
    expect(held.map(r => r.value).join(' ')).not.toMatch(/\bG2\b/);
    expect(shown.map(r => r.value).join(' ')).toMatch(/\bG2\b/);
  });

  test('the two instruments do not share anonymous names', () => {
    // "Star W" in one and "star W" in the other would be read as the same
    // star, and they are not: the two present the four in different orders.
    for (const tag of TAGS) expect(ID_TAGS).not.toContain(tag);
    expect(IDENTIFY_ORDER).toHaveLength(4);
    expect(new Set(IDENTIFY_ORDER).size).toBe(4);
    expect([...IDENTIFY_ORDER].sort()).toEqual([...SPECTRUM_IDS].sort());
  });

  test('neither instrument tells the four apart by temperature colour', () => {
    // The whole experiment is whether a reader uses the features. A curve
    // painted with starColor() would answer the question for them.
    const text = source('js/stellarSpectraWidgets.js');
    expect(text).not.toMatch(/starColor/);
    expect(text).not.toMatch(/hexForTemperature/);
  });
});

describe('the lesson steps', () => {
  const steps = A_UNIVERSE_OF_STARS.steps;
  const spectra = steps.filter(s => s.sid.startsWith('spectra-'));

  test('there are between four and six of them, in one contiguous block', () => {
    expect(spectra.length).toBeGreaterThanOrEqual(4);
    expect(spectra.length).toBeLessThanOrEqual(6);
    const first = steps.findIndex(s => s.sid.startsWith('spectra-'));
    expect(steps.slice(first, first + spectra.length)).toEqual(spectra);
  });

  test('the block sits before the summative question, not after it', () => {
    // `the-argument` is what this lesson asks last: it puts the opening
    // prediction back and is marked as the summative piece. A coda with three
    // graded screens after it would give the lesson two endings, which is what
    // tests/stellarLoops.test.js exists to prevent.
    const last = steps.findIndex(s => s.sid === 'spectra-four-is-four');
    const argument = steps.findIndex(s => s.sid === 'the-argument');
    expect(last).toBeGreaterThan(0);
    expect(argument).toBeGreaterThan(last);
    const graded = ['predict', 'question', 'measure'];
    expect(
      steps.slice(argument + 1).filter(s => graded.includes(s.type))
    ).toEqual([]);
  });

  test('each names an instrument that exists, and sets it through values', () => {
    for (const step of spectra) {
      const w = getWidget(step.tool.id);
      expect(w).toBeTruthy();
      expect(step.tool.values).toBeTruthy();
      for (const key of Object.keys(step.tool.values)) {
        expect(w.controls.some(c => c.id === key)).toBe(true);
      }
    }
  });

  test('each stages the scene deliberately rather than inheriting one', () => {
    // A step with no stage inherits whatever the previous step left, so
    // leaving these blank would have put four real spectra beside three
    // modeled stars with nothing saying they are different things. It also
    // keeps the star-sizes activity's `scenario: null` claim true.
    for (const step of spectra) {
      expect(step.stage).toBeTruthy();
      expect(step.stage.stars).toHaveLength(3);
    }
  });

  test('the screen that introduces the spectra says the canvas is not them', () => {
    const opening = spectra[0];
    expect(opening.body).toMatch(/not these four/i);
    expect(opening.body).toMatch(/modeled/i);
  });

  test('the identification step really is unanswerable from a colour', () => {
    const step = spectra.find(s => s.sid === 'spectra-name-the-star');
    expect(step.tool.id).toBe('spectra-identify');
    const w = getWidget('spectra-identify');
    // This instrument has no whole-spectrum setting at all, so the continuum
    // slope a reader would rank by is not on the screen.
    const win = w.controls.find(c => c.id === 'window');
    expect(win.min).toBeGreaterThan(0);
    // And the star it asks about is the one the archive calls G.
    const id = IDENTIFY_ORDER[step.tool.values.star - 1];
    expect(SPECTRA[id].letter).toBe('G');
    expect(step.options[step.answer]).toMatch(/^a G star/);
  });

  test('the measurement step accepts the truth and rejects a scrambled reading', () => {
    const step = spectra.find(s => s.sid === 'spectra-two-features');
    const depth = (letter, feature) =>
      bandDepth(decodeSpectrum(byLetter[letter]), featureById(feature)) * 100;
    const truth = {
      hw: depth('A', 'hbeta'),
      hx: depth('G', 'hbeta'),
      hy: depth('K', 'hbeta'),
      hz: depth('M', 'hbeta'),
      cw: depth('A', 'cak'),
      cx: depth('G', 'cak'),
      cy: depth('K', 'cak'),
      cz: depth('M', 'cak'),
    };
    expect(step.validate(truth).level).toBe('ok');
    // Hydrogen the wrong way round.
    expect(step.validate({ ...truth, hw: truth.hz, hz: truth.hw }).level).toBe(
      'error'
    );
    // Calcium read as if it rose with temperature.
    expect(step.validate({ ...truth, cx: 1, cz: 90 }).level).toBe('error');
    // Nothing entered at all.
    expect(step.validate({}).level).toBe('warn');
  });

  test('every graded step has an answer that indexes its own options', () => {
    for (const step of spectra) {
      if (step.kind !== 'choice') continue;
      expect(step.options[step.answer]).toBeTruthy();
      expect(step.because.length).toBeGreaterThan(80);
    }
  });

  test('the lesson says out loud that four spectra are four spectra', () => {
    const closing = spectra[spectra.length - 1];
    expect(closing.type).toBe('read');
    expect(closing.body).toMatch(/not an atlas/i);
    expect(closing.body).toMatch(/not a (representative )?(survey|sample)/i);
  });

  test('the coda keeps observations and models apart', () => {
    const opening = spectra[0];
    expect(opening.body).toMatch(/calculation/i);
    expect(opening.body).toMatch(/measurement/i);
  });
});
