// =============================================================================
// Five GWOSC mergers
// -----------------------------------------------------------------------------
// What is tested here is not that js/gwEventWidgets.js agrees with itself. It
// is that the committed strain has the properties the lesson asserts about it,
// and that those properties are checkable against something outside this
// project:
//
//   - the record and the data agree, file against file, checksum for checksum;
//   - the time axis, the sample rate and the band are what the record says,
//     read from the samples rather than from the record;
//   - what the instrument measures sits where the discovery papers put the
//     same signals, each claim with the paper it comes from;
//   - the one comparison the lesson makes between the data and the lab's model
//     is a property of the data and not of the map, which an injected chirp of
//     known frequency, read back through the same procedure, decides;
//   - the numbers the lesson prints are the numbers the instrument gives;
//   - nothing asks the archive for anything at run time.
//
// The noise estimate and the time-frequency map themselves are tested against
// inputs of known spectrum in tests/gwPsd.test.js.
// =============================================================================

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  BEFORE_MERGER,
  CITATION,
  EVENTS,
  EVENT_IDS,
  decodeEvent,
} from '../js/data/gw/gwoscEvents.js';
import { PROVENANCE, RECORDS } from '../js/data/gw/gwoscEventsProvenance.js';
import {
  GW_EVENT_WIDGETS,
  measureEvent,
  detectorFrameChirpMass,
  withInterval,
} from '../js/gwEventWidgets.js';
import { qScan, loudestFrequencyAt, signalEnd } from '../js/gw/qscan.js';
import { frequencyAt, timeToCoalescence } from '../js/gw/waveform.js';
import { fft, nextPowerOfTwo } from '../js/gw/fft.js';
import { whenWidgetsReady, getWidget, widgetDefaults } from '../js/widgets.js';
import LISTENING from '../js/data/investigations/listening-to-spacetime.js';
import LISTENING_ES from '../js/data/investigations/es/listening-to-spacetime.js';
import { mergeTranslation } from '../js/data/investigations/i18n.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = rel => readFileSync(path.join(REPO, rel), 'utf8');

/** The events in the order they were recorded. */
const RECORDED = ['GW150914', 'GW170817', 'GW190412', 'GW190521', 'GW190814'];

/** The row whose label is this, from a readout. */
const row = (rows, label) => rows.find(r => r.label === label);

beforeAll(async () => {
  await whenWidgetsReady();
});

describe('provenance', () => {
  test('names the archive, its licence, its attribution and both catalogs', () => {
    const a = PROVENANCE.archive;
    expect(a.url).toBe('https://gwosc.org');
    expect(a.license).toMatch(/CC BY 4\.0/);
    expect(a.attribution).toMatch(/Gravitational Wave Open Science Center/);
    expect(a.catalogs['GWTC-1-confident'].doi).toMatch(/10\.7935\/82H3-HH23/);
    expect(a.catalogs['GWTC-2.1-confident'].doi).toMatch(/10\.7935\/qf3a-3z67/);
    expect(a.retrieved).toMatch(/^\d{4}-\d{2}-\d{2} UTC$/);
  });

  test('says which of its numbers are observed, measured, copied and modelled', () => {
    const e = PROVENANCE.evidence;
    expect(e.observedStrain).toMatch(/Measured by the LIGO detectors/);
    expect(e.measuredFromStrain).toMatch(/Computed by this project/);
    expect(e.measuredFromStrain).toMatch(/not the merger time/);
    expect(e.catalogValue).toMatch(/Gravitas did not measure any of them/);
    expect(e.model).toMatch(/Labelled as a model/);
    expect(e.illustration).toMatch(/None/);
  });

  test('records why the chirp mass is not measured here', () => {
    expect(PROVENANCE.notDone.join(' ')).toMatch(/No chirp-mass estimate/);
    expect(PROVENANCE.notDone.join(' ')).toMatch(/No template, matched filter/);
  });

  test('every rejected candidate says why, and none of them is shipped', () => {
    for (const r of PROVENANCE.selection.rejected) {
      expect(r.why.length).toBeGreaterThan(40);
      expect(EVENT_IDS).not.toContain(r.id);
    }
  });

  test('every event names its versions, both detectors and the one it uses', () => {
    for (const id of EVENT_IDS) {
      const r = RECORDS[id];
      expect(r.values.json).toMatch(
        new RegExp(`^https://gwosc\\.org/eventapi/json/[^/]+/${id}/v\\d+/$`)
      );
      expect(r.strainRelease.json).toMatch(new RegExp(`/${id}/v\\d+/$`));
      expect(Object.keys(r.detectors).sort()).toEqual(['H1', 'L1']);
      expect(r.chosen).toBe(EVENTS[id].detector);
      expect(r.detectors[r.chosen].excluded).toBeNull();
      // The runtime copy names the same versions the record does.
      expect(EVENTS[id].catalogVersion).toContain(r.values.catalog);
      expect(EVENTS[id].strainVersion).toContain(r.strainRelease.catalog);
    }
  });

  test('a detector with a documented glitch in its window is not the one drawn', () => {
    for (const g of PROVENANCE.documentedGlitches) {
      expect(g.source).toMatch(/^https:\/\/gwosc\.org\/events\//);
      const r = RECORDS[g.event];
      expect(r.chosen).not.toBe(g.detector);
      expect(r.detectors[g.detector].excluded).toBeTruthy();
    }
  });
});

describe('checksums', () => {
  test('the strain the browser loads is the strain the record checksums', () => {
    for (const id of EVENT_IDS) {
      const digest = createHash('sha256')
        .update(Buffer.from(EVENTS[id].data, 'base64'))
        .digest('hex');
      expect(digest).toBe(RECORDS[id].payloadSha256);
    }
  });

  test('every source file is pinned by a distinct SHA-256 and a byte count', () => {
    const seen = new Set();
    for (const id of EVENT_IDS) {
      for (const d of Object.values(RECORDS[id].detectors)) {
        expect(d.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(seen.has(d.sha256)).toBe(false);
        seen.add(d.sha256);
        expect(d.bytes).toBeGreaterThan(1_000_000);
        // A 32-second, 4 kHz GWOSC release, and the file name says so.
        expect(d.url).toMatch(/_GWOSC_4KHZ_R1-\d+-32\.txt\.gz$/);
        expect(d.url).toContain(`-${d.gpsStart}-32`);
        expect(d.samples).toBe(32 * 4096);
      }
    }
    expect(seen.size).toBe(2 * EVENT_IDS.length);
    expect(PROVENANCE.size.sourceFiles).toBe(seen.size);
  });

  test('the recorded payload size is the payload', () => {
    const total = EVENT_IDS.reduce((n, id) => n + EVENTS[id].data.length, 0);
    expect(PROVENANCE.size.payloadBase64Bytes).toBe(total);
  });

  test('the catalog numbers in the browser are the ones the build pinned', () => {
    // Read from the build tool's own source rather than from anything it
    // generated: the literal is what was checked against GWOSC's JSON.
    const tool = source('tools/build-gwosc-events.mjs');
    for (const id of EVENT_IDS) {
      const block = tool.slice(tool.indexOf(`id: '${id}'`));
      const c = EVENTS[id].catalog.chirp_mass_source;
      expect(block).toMatch(
        new RegExp(`chirp_mass_source: \\{\\s*value: ${c.value},`)
      );
      // `1249852257.0` in the literal is 1249852257 once parsed.
      expect(block).toMatch(new RegExp(`gps: ${EVENTS[id].gps}(\\.0+)?,`));
    }
  });
});

describe('when the archive is unavailable or wrong, the build says so', () => {
  // The tool, run as the release gate runs it, against a cache it is handed
  // instead of the real one. No network: an empty cache with --offline is what
  // a failed download leaves behind, and a cache of the wrong bytes is what a
  // truncated download, an error page served as a file or a silently
  // re-released one would.
  const run = (cache, ...args) =>
    spawnSync(process.execPath, ['tools/build-gwosc-events.mjs', ...args], {
      cwd: REPO,
      encoding: 'utf8',
      env: { ...process.env, GRAVITAS_GWOSC_CACHE: cache },
    });
  const names = EVENT_IDS.flatMap(id =>
    Object.values(RECORDS[id].detectors).map(d => d.url.split('/').pop())
  );
  let empty;
  let corrupt;
  beforeAll(() => {
    empty = mkdtempSync(path.join(tmpdir(), 'gwosc-empty-'));
    corrupt = mkdtempSync(path.join(tmpdir(), 'gwosc-corrupt-'));
    for (const name of names) {
      writeFileSync(path.join(corrupt, name), '<html>503 Service Unavailable');
    }
  });
  afterAll(() => {
    rmSync(empty, { recursive: true, force: true });
    rmSync(corrupt, { recursive: true, force: true });
  });

  test('with no sources, the provenance check fails rather than passing on structure', () => {
    const r = run(empty, '--check', '--require-sources');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/Provenance NOT verified/);
  });

  test('with no sources, the quick check passes but never claims the provenance', () => {
    const r = run(empty, '--check');
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/PROVENANCE NOT VERIFIED/);
    expect(r.stdout).not.toMatch(/provenance verified/);
  });

  test('an offline build with nothing cached refuses, and writes nothing', () => {
    const before = source('js/data/gw/gwoscEvents.js');
    const r = run(empty, '--offline');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/is not in .* and --offline was given/);
    expect(source('js/data/gw/gwoscEvents.js')).toBe(before);
  });

  test('bytes that are not the pinned ones are refused by their checksum', () => {
    const r = run(corrupt, '--check', '--require-sources');
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/expected [0-9a-f]{64}/);
    expect(r.stdout).not.toMatch(/provenance verified/);
  });
});

describe('the runtime copy and the record', () => {
  test('no module in the application imports the record', () => {
    const walk = dir =>
      readdirSync(path.join(REPO, dir), { withFileTypes: true }).flatMap(e =>
        e.isDirectory()
          ? walk(path.join(dir, e.name))
          : e.name.endsWith('.js')
            ? [path.join(dir, e.name)]
            : []
      );
    const importers = walk('js')
      .filter(f => !f.startsWith(path.join('js', 'data', 'gw')))
      .filter(f => source(f).includes('gwoscEventsProvenance'));
    expect(importers).toEqual([]);
  });

  test('the readout can still name its source and its licence', () => {
    expect(CITATION).toMatch(/GWOSC/);
    expect(CITATION).toMatch(/CC BY 4\.0/);
    expect(CITATION).toMatch(/GWTC-1 and GWTC-2\.1/);
  });

  test('the committed data stays small enough to be a lesson and not an archive', () => {
    // Thirteen megabytes of source become this. The windows are what the
    // lesson reads plus a margin, and a change that widened them would show
    // here before it showed in the bundle budget.
    const bytes = Buffer.byteLength(source('js/data/gw/gwoscEvents.js'));
    expect(bytes).toBeLessThan(64 * 1024);
    expect(PROVENANCE.size.sourceBytes).toBeGreaterThan(12_000_000);
  });
});

describe('the time axis, the sample rate and the band, read from the samples', () => {
  test('every event decodes to its stated length at 1024 Hz', () => {
    for (const id of EVENT_IDS) {
      const e = decodeEvent(id);
      expect(e.sampleRate).toBe(1024);
      expect(e.samples).toHaveLength(e.count);
      const r = RECORDS[id];
      expect(e.count).toBe(r.keptSamples);
      expect(e.count / e.sampleRate).toBeCloseTo(
        r.window.before + r.window.after,
        6
      );
    }
  });

  test('the first sample sits on the source grid, the stated time before the catalog time', () => {
    for (const id of EVENT_IDS) {
      const e = EVENTS[id];
      const r = RECORDS[id];
      const src = r.detectors[e.detector];
      // An integer number of source samples after the file's first one: the
      // window was cut on the 4096 Hz grid, not interpolated. t0 is recorded
      // to the microsecond, which is 0.004 of a source sample, so that is the
      // tolerance; an interpolated cut would be off by up to a half.
      const offset = (e.t0 - src.gpsStart) * 4096;
      expect(Math.abs(offset - Math.round(offset))).toBeLessThan(0.0041);
      expect(e.t0).toBeCloseTo(r.window.gpsStart, 5);
      // Within one output sample of the requested edge.
      expect(Math.abs(e.gps - r.window.before - e.t0)).toBeLessThanOrEqual(
        1 / e.sampleRate
      );
    }
  });

  test('every sample is finite, and the noise is unit variance away from the merger', () => {
    for (const id of EVENT_IDS) {
      const e = decodeEvent(id);
      expect(e.samples.every(Number.isFinite)).toBe(true);
      // The first second, which for every event is before anything clears
      // the noise.
      const n = e.sampleRate;
      let sum = 0;
      for (let i = 0; i < n; i++) sum += e.samples[i] ** 2;
      const sigma = Math.sqrt(sum / n);
      expect(sigma).toBeGreaterThan(0.8);
      expect(sigma).toBeLessThan(1.25);
    }
  });

  test('nothing is left above the whitening band, so decimation could not alias', () => {
    // Measured on the decoded samples, not read from the record: the power
    // between 400 Hz and the 512 Hz Nyquist frequency, as a fraction of all
    // of it.
    for (const id of EVENT_IDS) {
      const e = decodeEvent(id);
      const n = nextPowerOfTwo(e.count);
      const re = new Float64Array(n);
      const im = new Float64Array(n);
      re.set(e.samples);
      fft(re, im, false);
      let above = 0;
      let all = 0;
      for (let k = 1; k < n / 2; k++) {
        const p = re[k] ** 2 + im[k] ** 2;
        all += p;
        if ((k * e.sampleRate) / n > 410) above += p;
      }
      expect(above / all).toBeLessThan(0.01);
      expect(RECORDS[id].decimation.powerAboveNewNyquist).toBeLessThan(1e-3);
    }
  });

  test('the band the record states is the band that is there', () => {
    for (const id of EVENT_IDS) {
      expect(EVENTS[id].band).toEqual([20, 400]);
      expect(RECORDS[id].whitening.band).toEqual([20, 400]);
    }
  });
});

describe('what the instrument measures, against the papers that reported these events', () => {
  test('GW150914 sweeps upward through the band the discovery paper gives', () => {
    // Abbott et al. 2016, Phys. Rev. Lett. 116, 061102, section II: over the
    // last 0.2 s the signal rises from 35 to 150 Hz, where the amplitude
    // peaks.
    const m = measureEvent('GW150914');
    const read = m.slices.filter(s => s.tau <= 0.1).map(s => s.freq);
    expect(read.every(f => f !== null && f >= 35 && f <= 150)).toBe(true);
    expect(read[1]).toBeGreaterThan(read[0]);
    // And the model and the catalog together put it in band for about that
    // long from 35 Hz.
    const t = timeToCoalescence(35, detectorFrameChirpMass(EVENTS.GW150914));
    expect(t).toBeGreaterThan(0.12);
    expect(t).toBeLessThan(0.25);
  });

  test('GW190521 is short and low, as its discovery paper describes it', () => {
    // Abbott et al. 2020, Phys. Rev. Lett. 125, 101102: a short transient of
    // about 0.1 s and around four cycles, between 30 and 80 Hz.
    const m = measureEvent('GW190521');
    const at = tau => m.slices.find(s => s.tau === tau).freq;
    expect(at(0.05)).toBeGreaterThan(30);
    expect(at(0.05)).toBeLessThan(80);
    for (const tau of [1, 0.5, 0.3, 0.2, 0.1]) expect(at(tau)).toBeNull();
  });

  test('GW170817 is the long one: the model and the catalog agree with its paper', () => {
    // Abbott et al. 2017, Phys. Rev. Lett. 119, 161101: about 100 s in the
    // detectors' band, from 24 Hz, and a combined signal-to-noise ratio of
    // 32.4.
    const e = EVENTS.GW170817;
    const t = timeToCoalescence(24, detectorFrameChirpMass(e));
    expect(t).toBeGreaterThan(80);
    expect(t).toBeLessThan(120);
    const snr = e.catalog.network_matched_filter_snr.value;
    expect(Math.abs(snr - 32.4) / 32.4).toBeLessThan(0.05);
    // And pixel by pixel there is nothing to measure, which is the lesson's
    // point about it.
    const m = measureEvent('GW170817');
    expect(m.end).toBeNull();
    expect(m.slices.every(s => s.freq === null)).toBe(true);
  });

  test('the Hanford noise at 100 Hz in 2015 is the level its discovery paper shows', () => {
    // Abbott et al. 2016, Phys. Rev. Lett. 116, 061102, Fig. 3: around 1e-23
    // per root hertz near 100 Hz. Taken to a factor of two either side.
    const m = measureEvent('GW150914');
    expect(m.noiseAt100).toBeGreaterThan(5e-24);
    expect(m.noiseAt100).toBeLessThan(2e-23);
  });

  test('the noise curve has the shape of a LIGO detector, with no line mistaken for it', () => {
    // Steep below 50 Hz and flat within a factor of two from 100 to 400 Hz,
    // for every event: a single spectral line reported as the floor - the
    // 300 Hz mains harmonic at Hanford did exactly that before the band
    // median - fails the second half.
    for (const id of EVENT_IDS) {
      const { freq, value } = EVENTS[id].asd;
      const at = f => value[freq.indexOf(f)];
      expect(at(20)).toBeGreaterThan(5 * at(100));
      const floor = [100, 150, 200, 300, 400].map(at);
      expect(Math.max(...floor) / Math.min(...floor)).toBeLessThan(2);
    }
  });

  test('the measured order of frequencies is the catalog order of chirp masses', () => {
    // The ranking the lesson asks for, done here with the answer the catalog
    // gives. Detector frame, because that is what sets a frequency.
    const measured = RECORDED.filter(
      id => measureEvent(id).slices.find(s => s.tau === 0.05).freq !== null
    );
    const byFrequency = [...measured].sort(
      (a, b) =>
        measureEvent(a).slices.find(s => s.tau === 0.05).freq -
        measureEvent(b).slices.find(s => s.tau === 0.05).freq
    );
    const byMass = [...measured].sort(
      (a, b) =>
        detectorFrameChirpMass(EVENTS[b]) - detectorFrameChirpMass(EVENTS[a])
    );
    expect(byFrequency).toEqual(byMass);
    expect(byMass[0]).toBe('GW190521');
  });
});

describe('the disagreement with the model is in the data, not the map', () => {
  // A leading-order chirp of known frequency at every instant, added to unit
  // white noise and read back by exactly the procedure the widget uses: the
  // same rows, the same Q, the same end-finding, the same slice.
  const lcg = seed => {
    let s = seed >>> 0;
    const u = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 2 ** 32;
    };
    return () =>
      Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
  };
  const injectAndRead = (mc, amp, seed) => {
    const fs = 1024;
    const n = 3072;
    const tEnd = 2.5;
    const gauss = lcg(seed);
    const x = new Float64Array(n);
    for (let i = 0; i < n; i++) x[i] = gauss();
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const tau = tEnd - i / fs;
      if (tau <= 0) break;
      const f = frequencyAt(tau, mc);
      if (f > 400) break;
      if (f < 20) continue;
      phase += (2 * Math.PI * f) / fs;
      x[i] += amp * Math.cos(phase);
    }
    const scan = qScan(x, { sampleRate: fs, fMin: 30, fMax: 400, rows: 48 });
    const end = signalEnd(scan, tEnd - 0.2, tEnd + 0.1).time;
    return [0.1, 0.05].map(tau => {
      const read = loudestFrequencyAt(scan, end - tau).freq;
      const truth = frequencyAt(tau + (tEnd - end), mc);
      return (read - truth) / truth;
    });
  };
  const errors = [];
  for (const mc of [30.69, 15.29, 6.42]) {
    for (const amp of [3, 5, 8]) {
      for (const seed of [1, 2, 3, 4, 5]) {
        errors.push(...injectAndRead(mc, amp, seed * 7919));
      }
    }
  }

  test('the map reads a pure leading-order chirp back within a sixth, both ways', () => {
    // The lesson says "within a sixth of the frequency that was put in, as
    // often above as below". This is where that sentence comes from.
    expect(errors.every(Number.isFinite)).toBe(true);
    expect(Math.max(...errors.map(Math.abs))).toBeLessThan(1 / 6);
    expect(errors.some(e => e > 0.05)).toBe(true);
    expect(errors.some(e => e < -0.05)).toBe(true);
  });

  test('GW190814 is further below the model than the map ever misreads', () => {
    // "More than a quarter below the model", as the lesson puts it.
    const m = measureEvent('GW190814');
    const read = m.slices.find(s => s.tau === 0.05).freq;
    const model = frequencyAt(0.05, detectorFrameChirpMass(EVENTS.GW190814));
    const shortfall = (model - read) / model;
    expect(shortfall).toBeGreaterThan(0.25);
    expect(shortfall).toBeGreaterThan(Math.max(...errors.map(Math.abs)));
  });

  test('GW150914 agrees with the model within what the map can resolve', () => {
    const m = measureEvent('GW150914');
    for (const tau of [0.1, 0.05]) {
      const read = m.slices.find(s => s.tau === tau).freq;
      const model = frequencyAt(tau, detectorFrameChirpMass(EVENTS.GW150914));
      expect(Math.abs(read - model) / model).toBeLessThan(0.1);
    }
  });
});

describe('nothing reaches the network at run time', () => {
  const FILES = [
    'js/data/gw/gwoscEvents.js',
    'js/data/gw/gwoscEventsProvenance.js',
    'js/gwEventWidgets.js',
    'js/gw/psd.js',
    'js/gw/qscan.js',
  ];

  test.each(FILES)('%s makes no request', rel => {
    const text = source(rel);
    expect(text).not.toMatch(/\bfetch\s*\(/);
    expect(text).not.toMatch(/XMLHttpRequest/);
    expect(text).not.toMatch(/importScripts/);
  });

  test('the archive appears in the browser copy only as a citation', () => {
    const text = source('js/data/gw/gwoscEvents.js');
    expect(text).not.toMatch(/https?:\/\//);
    expect(text).not.toMatch(/\(\s*['"`]https?:/);
  });
});

describe('the data is loaded only when it is needed', () => {
  test('the registry does not pull the strain in statically', () => {
    expect(source('js/widgets.js')).not.toMatch(/data\/gw\/gwosc/);
  });

  test('the widget reaches the data through a dynamic import only', () => {
    const text = source('js/gwEventWidgets.js');
    expect(text).toMatch(/import\(\s*'\.\/data\/gw\/gwoscEvents\.js'\s*\)/);
    expect(text).not.toMatch(/import\s[^(]*from\s*'\.\/data\/gw\/gwosc/);
  });

  test('the service worker precaches it, so a lesson opened once works offline', () => {
    expect(source('sw-manifest.js')).toContain("'./js/data/gw/gwoscEvents.js'");
  });
});

describe('the instrument', () => {
  const w = () => getWidget('gw-events');
  const read = values =>
    w().readout(widgetDefaults(w(), values), undefined, {});

  test('is registered, reads nothing from the simulation, and is not animated', () => {
    expect(w()).toBeTruthy();
    expect(GW_EVENT_WIDGETS).toHaveLength(1);
    expect(w().live).toBeFalsy();
    expect(w().animated).toBe(false);
  });

  test('every control can be driven from the keyboard, and every setting has a name', () => {
    for (const c of w().controls) {
      expect(Number.isFinite(c.min)).toBe(true);
      expect(Number.isFinite(c.max)).toBe(true);
      expect(c.step).toBeGreaterThan(0);
      expect(c.label.length).toBeGreaterThan(0);
      for (let v = c.min; v <= c.max; v += c.step) {
        const shown = c.format(v);
        expect(shown.length).toBeGreaterThan(0);
        expect(shown).not.toMatch(/^gwE\./);
      }
    }
    const event = w().controls.find(c => c.id === 'event');
    expect(event.max - event.min + 1).toBe(EVENT_IDS.length);
  });

  test('lists the events in the order they were recorded, not by mass', () => {
    expect(EVENT_IDS).toEqual(RECORDED);
    const gps = EVENT_IDS.map(id => EVENTS[id].gps);
    expect([...gps].sort((a, b) => a - b)).toEqual(gps);
  });

  test('the readout is a complete text equivalent of the map', () => {
    for (let event = 0; event < EVENT_IDS.length; event++) {
      const rows = read({ event, catalog: 0, model: 0 });
      const text = rows.map(r => `${r.label} ${r.value}`).join(' | ');
      expect(text).toContain(EVENT_IDS[event]);
      expect(row(rows, 'End of the chirp')).toBeTruthy();
      // Every slice the map can be read at, as a number or as a stated dash.
      const slices = row(
        rows,
        'Loudest frequency before the end (— is nothing louder than noise)'
      ).value;
      for (const tau of BEFORE_MERGER) expect(slices).toContain(`${tau} s:`);
      expect(text).not.toMatch(/gwE\./);
    }
    // The comparison across all five, as the lesson reads it.
    const rows = read({ event: 0, catalog: 0, model: 0 });
    expect(row(rows, 'All five, 0.05 s before the end').value).toBe(
      'GW150914 58 Hz, GW170817 —, GW190412 69 Hz, GW190521 55 Hz, GW190814 104 Hz'
    );
  });

  test('keeps its four kinds of number under four headings', () => {
    const rows = read({ event: 0, catalog: 1, model: 1 });
    const headings = rows.filter(r => r.emphasis).map(r => r.label);
    expect(headings).toEqual([
      'Observed strain',
      'Measured by Gravitas from the strain',
      'GWOSC catalog values (not measured here)',
      'Model',
    ]);
    const start = label => rows.findIndex(r => r.label === label);
    const measured = rows.slice(
      start('Measured by Gravitas from the strain'),
      start('GWOSC catalog values (not measured here)')
    );
    // Nothing the catalog supplies is among what was measured.
    for (const r of measured) {
      expect(r.value).not.toMatch(/M☉|Mpc|signal-to-noise/);
    }
    const catalog = rows.slice(
      start('GWOSC catalog values (not measured here)'),
      start('Model')
    );
    expect(catalog.map(r => r.value).join(' ')).toMatch(/M☉/);
    // The model says where its input came from.
    expect(row(rows, 'Leading-order track (dashed)').value).toMatch(
      /catalog chirp mass × \(1 \+ catalog redshift\)/
    );
  });

  test('holds the catalog until asked, and will not draw the model without it', () => {
    const held = read({ event: 0, catalog: 0, model: 1 });
    const text = held.map(r => r.value).join(' ');
    expect(text).not.toMatch(/M☉|Mpc/);
    expect(row(held, 'Leading-order track (dashed)').value).toMatch(
      /needs the catalog chirp mass/
    );
  });

  test('prints catalog intervals at the precision GWOSC published them', () => {
    const c = id => EVENTS[id].catalog;
    expect(withInterval(c('GW170817').chirp_mass_source)).toBe(
      '1.186 (+0.001 / −0.001)'
    );
    expect(withInterval(c('GW170817').mass_1_source)).toBe(
      '1.46 (+0.12 / −0.10)'
    );
    expect(withInterval(c('GW150914').chirp_mass_source)).toBe(
      '27.9 (+1.7 / −1.5)'
    );
    expect(withInterval(c('GW150914').luminosity_distance)).toBe(
      '470 (+140 / −160)'
    );
    // A zero-width interval is no interval, and a missing value says so.
    expect(withInterval(c('GW170817').redshift)).toBe('0.01');
    expect(withInterval(c('GW170817').total_mass_source)).toBe('not published');
  });
});

describe('the lesson steps', () => {
  const steps = LISTENING.steps;
  const coda = steps.filter(s => s.tool?.id === 'gw-events');
  const at = sid => steps.findIndex(s => s.sid === sid);

  test('seven screens in one block, straight after the published GW150914 traces', () => {
    expect(coda).toHaveLength(7);
    const first = steps.indexOf(coda[0]);
    expect(steps.slice(first, first + coda.length)).toEqual(coda);
    expect(first).toBe(at('model-against-measurement') + 1);
    expect(at('your-own-experiment')).toBe(first + coda.length);
  });

  test('the lesson still ends on its own question and its own summary', () => {
    const graded = ['predict', 'question', 'measure'];
    const lastGraded = steps.reduce(
      (n, s, i) => (graded.includes(s.type) ? i : n),
      -1
    );
    expect(steps[lastGraded].sid).toBe('what-the-signal-tells-you');
    expect(steps[steps.length - 1].sid).toBe('where-this-leaves-you');
  });

  test('each sets the instrument through controls it has, to values in range', () => {
    const w = getWidget('gw-events');
    for (const step of coda) {
      for (const [key, value] of Object.entries(step.tool.values)) {
        const c = w.controls.find(x => x.id === key);
        expect(c).toBeTruthy();
        expect(value).toBeGreaterThanOrEqual(c.min);
        expect(value).toBeLessThanOrEqual(c.max);
      }
    }
  });

  test('each stages the scene deliberately, and the first says what it is', () => {
    for (const step of coda) expect(step.stage?.binary).toBeTruthy();
    expect(coda[0].body).toMatch(/not any of these\s+five/i);
  });

  test('the catalog is held until the ranking has been committed', () => {
    const predict = steps.find(s => s.sid === 'rank-before-the-catalog');
    expect(predict.type).toBe('predict');
    expect(predict.reveal).toBe('what-the-catalog-says');
    for (const step of coda.slice(0, coda.indexOf(predict) + 1)) {
      expect(step.tool.values.catalog).toBe(0);
    }
    const reveal = steps.find(s => s.sid === 'what-the-catalog-says');
    expect(reveal.tool.values.catalog).toBe(1);
    // The answer is the heaviest pair, by the catalog.
    const heaviest = [...EVENT_IDS].sort(
      (a, b) =>
        detectorFrameChirpMass(EVENTS[b]) - detectorFrameChirpMass(EVENTS[a])
    )[0];
    expect(predict.options[predict.answer]).toMatch(new RegExp(`^${heaviest}`));
  });

  test('the measurement accepts what the instrument reads and rejects a swap', () => {
    const step = steps.find(s => s.sid === 'the-same-moment');
    const f = id => measureEvent(id).slices.find(s => s.tau === 0.05).freq;
    const truth = {
      f_150914: f('GW150914'),
      f_190412: f('GW190412'),
      f_190521: f('GW190521'),
      f_190814: f('GW190814'),
    };
    expect(step.validate(truth).level).toBe('ok');
    expect(
      step.validate({
        ...truth,
        f_150914: truth.f_190814,
        f_190814: truth.f_150914,
      }).level
    ).toBe('error');
    expect(step.validate({}).level).toBe('warn');
    // And the figures its messages print are the rounded measurements.
    const ok = step.validate(truth).message;
    for (const id of ['GW150914', 'GW190412', 'GW190521', 'GW190814']) {
      expect(ok).toContain(`${Math.round(f(id))}`);
    }
  });

  test('the question the whole block is for is asked in its own words', () => {
    const q = steps.find(s => s.sid === 'measured-or-supplied');
    expect(q.type).toBe('question');
    expect(q.prompt).toMatch(
      /^What did you measure from the strain, and what did GWOSC supply\?/
    );
    expect(q.rubric).toMatch(
      /Do NOT credit an answer that calls the chirp mass measured here/
    );
  });

  test('the Spanish lesson lines up with the English across the insertion', () => {
    const merged = mergeTranslation(LISTENING, LISTENING_ES);
    expect(LISTENING_ES.steps).toHaveLength(steps.length);
    const title = sid => merged.steps[at(sid)].title;
    expect(title('model-against-measurement')).toBe(
      'La medida, el modelo y lo que queda'
    );
    expect(title('five-recordings')).toBe('Cinco fusiones más, del archivo');
    expect(title('measured-or-supplied')).toBe('Qué vino de dónde');
    expect(title('your-own-experiment')).toBe('Haz que sea más difícil de ver');
  });
});
