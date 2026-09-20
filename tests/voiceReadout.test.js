// =============================================================================
// The text equivalent, and the one property that makes it worth having
// -----------------------------------------------------------------------------
// A readout that agrees with the audio is useful. A readout that agrees with
// the audio *because it cannot disagree* is the thing being built here, and the
// difference is a second derivation: the moment js/ui.js computes an orbital
// frequency of its own, the printed number and the played pitch are two facts
// that happen to match today.
//
// So this file checks the arithmetic, and then checks the wiring - that the
// readout's only source is getVoicedBodies(), which is the array the
// oscillators themselves follow.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describeVoices } from '../js/sonify/voiceReadout.js';
import { periodToCents } from '../js/sonify/law.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = f => readFileSync(path.join(root, f), 'utf8');

/** A target shaped the way js/audio.js shapes them. */
const voice = (type, period) => ({
  type,
  orbitalFrequency: 1 / period,
  intensity: 0.5,
});

describe('what the tones stand for', () => {
  test('the fastest body is the reference and everything is measured from it', () => {
    const { rows, referencePeriod } = describeVoices([
      voice('GasGiant', 4),
      voice('Planet', 1),
      voice('Star', 2),
    ]);
    expect(referencePeriod).toBe(1);
    expect(rows.map(r => r.type)).toEqual(['Planet', 'Star', 'GasGiant']);
    expect(rows[0].isReference).toBe(true);
    expect(rows.slice(1).every(r => !r.isReference)).toBe(true);
    // Ascending period, so every interval is positive and the reader never has
    // to hold a sign convention while holding three numbers.
    expect(rows.every(r => r.cents >= 0)).toBe(true);
  });

  test('a 2:1 period ratio is reported as an octave', () => {
    const { rows } = describeVoices([voice('Planet', 1), voice('Star', 2)]);
    expect(rows[1].ratio).toBe(2);
    expect(rows[1].cents).toBe(1200);
  });

  test('the three numbers in a row agree with each other', () => {
    // period, ratio and cents are three views of one fact. If they ever stop
    // agreeing, one of them is being computed somewhere else.
    const { rows, referencePeriod } = describeVoices([
      voice('Planet', 0.37),
      voice('GasGiant', 1.913),
      voice('Star', 11.86),
    ]);
    for (const row of rows) {
      expect(row.ratio).toBeCloseTo(row.period / referencePeriod, 12);
      expect(row.cents).toBeCloseTo(
        periodToCents(row.period, referencePeriod),
        12
      );
    }
  });

  test('a body with no orbital frequency is dropped, not given an infinite period', () => {
    // A body at rest, and one sitting exactly at the origin. Both are ordinary
    // sandbox states and the audio gives them no pitch either.
    const { rows } = describeVoices([
      voice('Planet', 2),
      { type: 'Star', orbitalFrequency: 0 },
      { type: 'Star', orbitalFrequency: NaN },
      { type: 'Star', orbitalFrequency: Infinity },
      null,
    ]);
    expect(rows.map(r => r.type)).toEqual(['Planet']);
    expect(rows.every(r => Number.isFinite(r.period))).toBe(true);
  });

  test('nothing voiced is an empty list rather than an exception', () => {
    for (const input of [[], null, undefined, [{ orbitalFrequency: 0 }]]) {
      expect(describeVoices(input)).toEqual({ rows: [], referencePeriod: 0 });
    }
  });

  test('a body with no type still gets a row', () => {
    const { rows } = describeVoices([{ orbitalFrequency: 0.5 }]);
    expect(rows).toHaveLength(1);
    // A key the feature layer can translate, rather than a class name or the
    // word "Object" going in front of a reader.
    expect(rows[0].type).toBe('Star');
  });

  test('two bodies on the same period are both reported, both as reference', () => {
    // A co-orbital pair. Neither is "the" reference and the interval between
    // them is zero, which is the honest answer rather than a tie-break.
    const { rows } = describeVoices([voice('Star', 3), voice('Planet', 3)]);
    expect(rows).toHaveLength(2);
    expect(rows.every(r => r.isReference)).toBe(true);
    expect(rows.every(r => r.cents === 0)).toBe(true);
  });
});

describe('the readout and the audio cannot drift apart', () => {
  const ui = read('js/ui.js');
  const audio = read('js/audio.js');

  test('the published name is a type key, not a class name', () => {
    // obj_type is absent on half the classes and wrong on a transformed body;
    // constructor.name is whatever the minifier decided. Both reached the
    // panel as "BlackHole" in front of a reader before this was tagged from
    // the source list instead.
    expect(audio).not.toMatch(/label: obj\.obj_type/);
    expect(audio).toMatch(/typed\(bh_list, 'BlackHole'\)/);
    expect(ui).toMatch(/typeName\(row\.type\)/);
  });

  test('js/audio.js publishes what it is actually voicing', () => {
    expect(audio).toMatch(/export \{[\s\S]*?\bgetVoicedBodies\b/);
    // Returns the cached targets rather than re-selecting bodies, so the
    // snapshot is of what is playing and not of what would be chosen now.
    expect(audio).toMatch(
      /getVoicedBodies = \(\)[\s\S]{0,400}cachedVoiceTargets/
    );
  });

  test('the snapshot is empty when nothing is being voiced', () => {
    // Muted, or the gravitational-wave lab has the bus. Reporting the last
    // targets in either state would describe a sound that is not happening.
    expect(audio).toMatch(
      /getVoicedBodies = \(\)\s*=>\s*\n?\s*signalActive \|\| muted/
    );
  });

  test('js/ui.js reads the voices only through that accessor', () => {
    expect(ui).toMatch(/getVoicedBodies\b/);
    // The failure this guards: someone computes speed/(2*PI*r) in the panel
    // because it is three lines, and the printed period silently stops being
    // the one the oscillator is following.
    const withoutComments = ui
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(withoutComments).not.toMatch(/orbitalFrequency\s*=/);
  });

  test('the readout is not announced continuously', () => {
    // The voices are re-chosen several times a second. A polite live region
    // over them interrupts a screen reader without pause and makes the panel
    // unusable for the one person it exists for, so the section is plain
    // content that holds still while it is read.
    const html = read('index.html');
    const section = html.slice(
      html.indexOf('id="soundPanelVoices"'),
      html.indexOf('</section>', html.indexOf('id="soundPanelVoices"'))
    );
    expect(section.length).toBeGreaterThan(50);
    expect(section).not.toMatch(/aria-live/);
    expect(section).not.toMatch(/role="(alert|status|log)"/);
  });

  test('both catalogs carry every string the panel asks for', () => {
    const en = read('js/i18n/en.deferred.js');
    const es = read('js/i18n/es.deferred.js');
    for (const key of [
      'sound.voices.title',
      'sound.voices.reference',
      'sound.voices.row',
      'sound.voices.none',
      'sound.voices.note',
    ]) {
      expect(en).toContain(`'${key}'`);
      expect(es).toContain(`'${key}'`);
    }
  });

  test('no translated string carries markup', () => {
    // These go in through textContent, so a tag in a translation renders as
    // literal angle brackets. That has happened here before.
    const en = read('js/i18n/en.deferred.js');
    const es = read('js/i18n/es.deferred.js');
    for (const catalog of [en, es]) {
      for (const line of catalog.split('\n')) {
        if (!line.includes('sound.voices.')) continue;
        expect(line).not.toMatch(/<[a-z/]/i);
      }
    }
  });
});
