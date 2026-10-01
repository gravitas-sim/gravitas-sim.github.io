// =============================================================================
// Every row of the Settings panel: a section, words, a reader and a stable id
// -----------------------------------------------------------------------------
// js/settingsSchema.js is the panel. A row is held here to four things:
//
//   a section    it names one of SETTING_SECTIONS, and each section has rows;
//                there is one "Visuals", where there used to be two
//   words        its label and its section's heading in both catalogs, and a
//                help text, setHelp.<key>, in both deferred catalogs
//   a reader     some module other than the panel and the lists of defaults
//                reads the setting - "Record Simulation" was a switch nothing
//                read, and stayed in the panel for years
//   a stable id  its key is a setting in DEFAULT_SETTINGS, and so is every
//                key the panel has stopped showing, because share links,
//                scenario presets and saved lessons name settings by key
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  SETTING_ITEMS,
  SETTING_SECTIONS,
  helpId,
  itemsOf,
  sectionLabelId,
} from '../js/settingsSchema.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import { EN } from '../js/i18n/en.js';
import { ES } from '../js/i18n/es.js';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';

/** Keys the panel used to show and no longer does. Each still opens. */
const RETIRED = [
  'preset_scenario',
  'record_simulation',
  'input_object_type',
  'show_bh_glow',
  'star_base_color',
];

const keys = SETTING_ITEMS.map(item => item.key);

describe('sections', () => {
  test('every row names a section, and every section has rows', () => {
    const ids = SETTING_SECTIONS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of SETTING_ITEMS)
      expect([item.key, ids.includes(item.section)]).toEqual([item.key, true]);
    for (const id of ids)
      expect([id, itemsOf(id).length > 0]).toEqual([id, true]);
  });

  test('one Visuals, and the numerical method and performance under Advanced', () => {
    expect(SETTING_SECTIONS.filter(s => s.id === 'visuals')).toHaveLength(1);
    const advanced = SETTING_SECTIONS.filter(s => s.advanced).map(s => s.id);
    expect(advanced).toEqual(['accuracy', 'performance']);
    expect(itemsOf('accuracy').map(i => i.key)).toContain('integrator');
    // The advanced sections come last, so the disclosure that holds them is
    // one block at the foot of the panel.
    const order = SETTING_SECTIONS.map(s => Boolean(s.advanced));
    expect(order.indexOf(true)).toBe(order.length - advanced.length);
  });

  test('each setting is shown once', () => {
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('words', () => {
  test.each(SETTING_ITEMS.map(i => [i.key, i]))(
    '%s has a label in both languages',
    (key, item) => {
      expect(EN[item.labelId]).toEqual(expect.any(String));
      expect(ES[item.labelId]).toEqual(expect.any(String));
    }
  );

  test('every section has a heading in both languages', () => {
    for (const { id } of SETTING_SECTIONS) {
      expect([id, typeof EN[sectionLabelId(id)]]).toEqual([id, 'string']);
      expect([id, typeof ES[sectionLabelId(id)]]).toEqual([id, 'string']);
    }
  });

  test.each(keys)('%s has a help text in both languages', key => {
    const en = EN_DEFERRED[helpId(key)];
    const es = ES_DEFERRED[helpId(key)];
    expect(en).toEqual(expect.any(String));
    expect(es).toEqual(expect.any(String));
    // A translation, not a copy of the English.
    expect(es).not.toBe(en);
  });

  test('no help text for a setting the panel does not show', () => {
    const ids = new Set(keys.map(helpId));
    for (const catalog of [EN_DEFERRED, ES_DEFERRED]) {
      const extra = Object.keys(catalog).filter(
        id => id.startsWith('setHelp.') && !ids.has(id)
      );
      expect(extra).toEqual([]);
    }
  });
});

describe('readers', () => {
  // Where a setting is declared, defaulted, listed or stamped by a preset is
  // not where it is read.
  const DECLARING = new Set([
    'js/settingsSchema.js',
    'js/appState.js',
    'js/data/settingKeys.js',
  ]);
  const sources = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'i18n' && entry.name !== 'vendor') walk(rel);
      } else if (entry.name.endsWith('.js') && !DECLARING.has(rel)) {
        sources.push(readFileSync(rel, 'utf8'));
      }
    }
  };
  walk('js');
  /**
   * A read: property access (SETTINGS.key, physicsSettings.key, s['key']), or
   * an accessor called with the key - render.js's q('lensing_quality'), the
   * world builder's pop('num_stars').
   */
  const isRead = key => {
    const access = new RegExp(
      `\\.${key}\\b|\\[['"]${key}['"]\\]|\\w\\(\\s*['"]${key}['"]`
    );
    return sources.some(text => access.test(text));
  };

  test.each(keys)('%s is read by the application', key => {
    expect(isRead(key)).toBe(true);
  });

  test('the switch that was removed had no reader', () => {
    // The evidence for taking it out, kept: if something starts reading it,
    // it belongs back in the panel.
    expect(isRead('record_simulation')).toBe(false);
  });
});

describe('stable ids', () => {
  test.each(keys)('%s is a setting', key => {
    expect(key in DEFAULT_SETTINGS).toBe(true);
  });

  test.each(RETIRED)('%s, no longer shown, still is', key => {
    expect(keys).not.toContain(key);
    expect(key in DEFAULT_SETTINGS).toBe(true);
  });
});
