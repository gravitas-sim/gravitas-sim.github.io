// =============================================================================
// Course levels, and every setting the panel shows through a share link
// -----------------------------------------------------------------------------
// A course level (js/units.js) is a bundle of defaults, never a lock:
// introductory is exactly what the application did before there were levels,
// and the deeper ones turn the conservation readout on, open Advanced, and
// show more significant figures. Prompt 72 maps a level onto a lesson's
// depth, so each names one.
//
// The panel's rows are named by key in share links, scenario presets and
// saved lessons. A changed value of every one of them is carried by a link and
// comes back out of it unchanged.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';

import {
  COURSE_LEVELS,
  courseLevelDefaults,
  getCourseLevel,
  getReadoutDigits,
  getUnitMode,
  initUnits,
  setCourseLevel,
  setUnitMode,
  sig,
} from '../js/units.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import { SETTING_ITEMS } from '../js/settingsSchema.js';
import {
  buildPayload,
  decodePayload,
  encodePayload,
} from '../js/shareState.js';
import { EN } from '../js/i18n/en.js';
import { ES } from '../js/i18n/es.js';

const LEVELS = Object.keys(COURSE_LEVELS);

describe('the levels', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setCourseLevel('introductory');
    setUnitMode('physical');
  });

  test('introductory is what the application did before there were levels', () => {
    const intro = COURSE_LEVELS.introductory;
    expect(intro.conservation).toBe(
      DEFAULT_SETTINGS.show_conservation_diagnostics
    );
    expect(intro).toMatchObject({
      advancedOpen: false,
      units: 'physical',
      digits: 3,
      depth: 'core',
    });
  });

  test('each names a depth, a precision and a unit mode', () => {
    expect(LEVELS).toEqual(['introductory', 'majors', 'advanced']);
    expect(LEVELS.map(id => COURSE_LEVELS[id].depth)).toEqual([
      'core',
      'quantitative',
      'advanced',
    ]);
    for (const id of LEVELS) {
      const level = COURSE_LEVELS[id];
      expect(Number.isInteger(level.digits)).toBe(true);
      expect(['physical', 'simulation']).toContain(level.units);
    }
    // Deeper is never less precise.
    const digits = LEVELS.map(id => COURSE_LEVELS[id].digits);
    expect([...digits].sort((a, b) => a - b)).toEqual(digits);
  });

  test('choosing one sets the readouts, and is remembered', () => {
    setCourseLevel('majors');
    expect(getCourseLevel()).toBe('majors');
    expect(getReadoutDigits()).toBe(4);
    expect(sig(Math.PI)).toBe('3.142');
    expect(window.localStorage.getItem('gravitas_course_level')).toBe('majors');

    setCourseLevel('advanced');
    expect(getUnitMode()).toBe('simulation');
    expect(sig(Math.PI)).toBe('3.14159');
  });

  test('an unknown level changes nothing', () => {
    setCourseLevel('majors');
    setCourseLevel('graduate');
    expect(getCourseLevel()).toBe('majors');
    expect(courseLevelDefaults('graduate')).toBe(COURSE_LEVELS.introductory);
  });

  test('a later unit choice outlives a reload; the precision comes back', () => {
    setCourseLevel('advanced'); // simulation units, six figures
    setUnitMode('physical'); // the reader switches the units back
    initUnits();
    expect(getUnitMode()).toBe('physical');
    expect(getReadoutDigits()).toBe(6);
  });

  test('each has a name and a description in both languages', () => {
    for (const id of LEVELS) {
      for (const catalog of [EN, ES]) {
        expect(catalog[`settings.level.${id}`]).toEqual(expect.any(String));
        expect(catalog[`settings.level.${id}.hint`]).toEqual(
          expect.any(String)
        );
      }
    }
    expect(ES['settings.level.label']).toEqual(expect.any(String));
  });
});

describe('every row of the panel through a share link', () => {
  /** A value other than the default, of the row's own kind. */
  const changed = item => {
    const now = DEFAULT_SETTINGS[item.key];
    switch (item.type) {
      case 'bool':
        return !now;
      case 'option':
        return item.options.find(o => o !== now);
      case 'color':
        return now === '#123456' ? '#654321' : '#123456';
      default:
        return now === item.max ? item.min : item.max;
    }
  };

  test.each(SETTING_ITEMS.map(item => [item.key, item]))(
    '%s',
    async (key, item) => {
      const value = changed(item);
      expect(value).not.toEqual(DEFAULT_SETTINGS[key]);
      const settings = { ...DEFAULT_SETTINGS, [key]: value };
      const fragment = await encodePayload(
        buildPayload({ scenario: 'None', seed: 1, settings, DEFAULT_SETTINGS })
      );
      const payload = await decodePayload(fragment);
      expect(payload.d?.[key]).toEqual(value);
    }
  );
});
