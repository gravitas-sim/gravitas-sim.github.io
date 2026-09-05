import { readFileSync, readdirSync } from 'node:fs';
import { applyPreset } from '../js/scenarios.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';

// =============================================================================
// Every setting a scenario writes must have a home in DEFAULT_SETTINGS.
// -----------------------------------------------------------------------------
// applyPreset starts each load with Object.assign(SETTINGS, fresh_defaults),
// where fresh_defaults is a copy of DEFAULT_SETTINGS. A key that is not in that
// object is therefore a key no scenario can reset: whatever the last scenario
// set for it survives into the next one.
//
// This is how the dark-matter halo escaped. Milky Way Rotation switched it on,
// and it then stayed on through every scenario loaded afterwards, silently
// changing the force law in all of them - including the Solar System, whose
// Keplerian rotation curve is the measurement the dark-matter lesson opens by
// trusting. Nothing failed loudly; the numbers were simply wrong.
// =============================================================================

/**
 * Slice an object literal out of a source file, braces matched.
 *
 * Reads the source rather than importing it because the module graph above
 * js/appState.js needs a browser. Brace-matched rather than line-matched, so
 * the slice ends at the literal's own closing brace.
 *
 * @param {string} source - File contents
 * @param {string} declaration - e.g. 'export const DEFAULT_SETTINGS = {'
 * @returns {string} The literal, from its opening brace to its closing one
 */
function objectLiteral(source, declaration) {
  const start = source.indexOf(declaration);
  if (start < 0) throw new Error(`${declaration} not found`);
  const open = start + declaration.length - 1;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error(`${declaration} is not brace-balanced`);
}

const literal = objectLiteral(
  readFileSync(new URL('../js/appState.js', import.meta.url), 'utf8'),
  'export const DEFAULT_SETTINGS = {'
);

// Evaluated, not regex-scraped, so the tests below can check the values a
// scenario is reset to and not only that the keys exist. DEFAULT_SETTINGS is a
// literal of literals; anything else in there fails loudly here.
const DEFAULTS = new Function(`return (${literal});`)();
const defaults = new Set(Object.keys(DEFAULTS));

const scenarioNames = Object.keys(SCENARIO_INFO);

/** Run one preset and report which keys it wrote. @param {string} name - Scenario */
function keysWrittenBy(name) {
  // Deliberately empty defaults: anything present afterwards was written by the
  // preset itself rather than inherited.
  const settings = { preset_scenario: name };
  applyPreset(settings, {}, { zoom: 1, pan: { x: 0, y: 0 } });
  return Object.keys(settings);
}

describe('the defaults object itself', () => {
  test('was found and looks like itself', () => {
    expect(defaults.size).toBeGreaterThan(40);
    expect(defaults.has('preset_scenario')).toBe(true);
    expect(defaults.has('gravitational_constant')).toBe(true);
  });

  test('the catalog is not empty, or this suite proves nothing', () => {
    expect(scenarioNames.length).toBeGreaterThan(20);
  });
});

// Keys that presets write and DEFAULT_SETTINGS does not carry.
//
// Empty, and meant to stay that way. It held ten keys when this suite was
// written - preset_zoom, habitable_zone_optimism, the neutron-star masses, the
// Kessler micro-stars, satellites_are_dyson, bh_layout and test_star_slingshot
// - each a latent version of the halo bug. Nine now have an entry in
// DEFAULT_SETTINGS, so applyPreset resets them like everything else; the tenth,
// satellites_are_dyson, turned out to be a cosmetic flag that nothing read and
// was removed rather than given a default.
//
// A new name here means someone taught a scenario to write a setting that no
// other scenario can undo. Give the key a default in js/appState.js instead.
const KNOWN_ORPHANS = new Set([]);

// The nine that used to be on that list and still exist. Named here so the
// tests below can show that each one is now reset rather than inherited - the
// property the pinned list was standing in for. satellites_are_dyson was the
// tenth; it set a "draw these as satellites" flag that no renderer read, the
// scenario that wrote it works without it, and it is gone.
const FORMER_ORPHANS = [
  'preset_zoom',
  'habitable_zone_optimism',
  'use_individual_ns_masses',
  'ns_masses',
  'num_micro_stars',
  'micro_star_mass',
  'micro_star_high_velocity',
  'bh_layout',
  'test_star_slingshot',
];

/** A settings object as the app starts with one. @returns {Object} Settings */
const fresh = () => JSON.parse(JSON.stringify(DEFAULTS));

/** A throwaway camera, so probing a preset cannot move a real one. @returns {Object} View state */
const view = () => ({ zoom: 1, pan: { x: 0, y: 0 } });

describe('every setting is actually read by something', () => {
  // The other half of the contract the suite above checks. That one says a
  // setting a scenario writes must exist in DEFAULT_SETTINGS so the next
  // scenario can reset it. This one says a setting that exists must be
  // mentioned somewhere else, because a setting nothing reads is a promise the
  // application does not keep.
  //
  // Kessler Cascade is why. Its preset set num_micro_stars, micro_star_mass and
  // micro_star_high_velocity, all three were in DEFAULT_SETTINGS, and a comment
  // beside them said they were "handled in initialization". Nothing read them.
  // The card promised "hundreds of micro-stars orbiting chaotically, colliding
  // and ejecting like a debris cloud" and the scenario built a single black
  // hole in an empty sky - which is what its committed thumbnail showed, for as
  // long as it shipped.
  //
  // The test is deliberately blunt: does the key appear anywhere in the source
  // other than the declaration itself and js/scenarios.js, which only assigns?
  // Excluding the presets is the point - a key mentioned nowhere but the
  // declaration and the preset that writes it is exactly the dead setting this
  // is looking for, and including scenarios.js would have let the original
  // failure through. A
  // key can be read through `SETTINGS.x`, through the physics module's own
  // settings object, through a destructure, through the settings-panel
  // descriptor list or through a share-link codec, and enumerating those forms
  // in regexes produced more false alarms than findings. Mere mention is a weak
  // condition, and it is still strong enough to catch a setting that is written
  // and then forgotten - which is the whole failure mode.
  const sourceText = (() => {
    const root = new URL('../', import.meta.url);
    const seen = [];
    const walk = dir => {
      for (const entry of readdirSync(new URL(dir, root), {
        withFileTypes: true,
      })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.'))
          continue;
        const next = dir + entry.name + (entry.isDirectory() ? '/' : '');
        if (entry.isDirectory()) walk(next);
        // scenarios.js is where the presets assign; a mention there is a write
        // and proves nothing about anyone reading it.
        else if (next === 'js/scenarios.js') continue;
        else if (/\.(js|mjs|html)$/.test(entry.name)) {
          seen.push(readFileSync(new URL(next, root), 'utf8'));
        }
      }
    };
    walk('js/');
    seen.push(readFileSync(new URL('index.html', root), 'utf8'));
    // Remove the declaration itself, so a key that appears only there is not
    // counted as being used by it.
    return seen.join('\n').split(literal).join('\n');
  })();

  test('no setting is declared and then never mentioned again', () => {
    const dead = [...defaults].filter(
      key => !new RegExp('\\b' + key + '\\b').test(sourceText)
    );
    expect(dead).toEqual([]);
  });

  test('the scan can actually tell, or it proves nothing', () => {
    // A key nothing could possibly mention must be reported, otherwise the
    // test above would pass even with the detection broken.
    expect(
      new RegExp('\\b' + 'setting_that_does_not_exist_anywhere' + '\\b').test(
        sourceText
      )
    ).toBe(false);
    // ...and a key that plainly is used must not be.
    expect(new RegExp('\\bgravitational_constant\\b').test(sourceText)).toBe(
      true
    );
  });
});

describe('scenario settings can all be reset', () => {
  test.each(scenarioNames)('%s writes no new orphan settings', name => {
    const orphans = keysWrittenBy(name).filter(
      k => !defaults.has(k) && !KNOWN_ORPHANS.has(k)
    );
    // Named in the failure so the fix is obvious: add the key to
    // DEFAULT_SETTINGS in js/ui.js, with the value it should reset to.
    expect(orphans).toEqual([]);
  });

  test('the pinned list has not grown, and may shrink', () => {
    const found = new Set();
    for (const name of scenarioNames) {
      for (const k of keysWrittenBy(name)) if (!defaults.has(k)) found.add(k);
    }
    for (const k of found) expect(KNOWN_ORPHANS.has(k)).toBe(true);
  });

  test('a value left over from a previous load never survives one', () => {
    // The whole invariant in one line, checked against every scenario: load a
    // scenario onto settings that hold a poison value for a key, and the key
    // comes back either as that scenario's own choice or as the default. Never
    // as the poison, which is what the previous scenario's value amounts to.
    const POISON = '__left_over__';
    const survived = [];
    for (const name of scenarioNames) {
      for (const key of FORMER_ORPHANS) {
        const settings = fresh();
        settings[key] = POISON;
        settings.preset_scenario = name;
        applyPreset(settings, DEFAULTS, view());
        if (settings[key] === POISON) survived.push(`${name}: ${key}`);
      }
    }
    // Listed by scenario and key, so a failure says which load leaked what.
    expect(survived).toEqual([]);
  });

  test.each(FORMER_ORPHANS)(
    '%s is back to its default in the scenario after the one that sets it',
    key => {
      const writers = scenarioNames.filter(n => keysWrittenBy(n).includes(key));
      expect(writers.length).toBeGreaterThan(0);

      // Poisoned first, so a preset that quietly stopped writing the key would
      // fail here rather than pass the sequence below by doing nothing.
      const settings = fresh();
      settings[key] = '__left_over__';
      settings.preset_scenario = writers[0];
      applyPreset(settings, DEFAULTS, view());
      expect(settings[key]).not.toBe('__left_over__');

      const next = scenarioNames.find(n => !writers.includes(n));
      if (next === undefined) {
        // preset_zoom: every scenario states it, so there is no successor that
        // would inherit one. It is in DEFAULT_SETTINGS for the day one of them
        // stops stating it, and the poison test above covers that day.
        expect(key).toBe('preset_zoom');
        return;
      }

      // Same settings object, carried across the load, as the running app does.
      settings.preset_scenario = next;
      applyPreset(settings, DEFAULTS, view());
      expect(settings[key]).toEqual(DEFAULTS[key]);
    }
  );

  test('the values chosen are the ones the rest of the app assumes', () => {
    // Each of these is asserted somewhere in js/ as a fallback or a threshold;
    // a default that disagreed with its reader would reset to a value the
    // reader then quietly overrode.
    expect(DEFAULTS.preset_zoom).toBe(1.5); // state.zoom fallback, ui.js
    expect(DEFAULTS.habitable_zone_optimism).toBeLessThan(1.3); // conservative
    expect(DEFAULTS.use_individual_ns_masses).toBe(false);
    expect(DEFAULTS.ns_masses).toEqual([]);
    expect(DEFAULTS.num_micro_stars).toBe(0);
    expect(DEFAULTS.micro_star_high_velocity).toBe(false);
    expect(DEFAULTS.bh_layout).not.toBe('parabolic-flyby'); // applyPresetLayout
    expect(DEFAULTS.test_star_slingshot).toBe(false);
  });

  test('the halo keys in particular are resettable', () => {
    // The specific escape this suite was written for.
    for (const key of [
      'galaxy_gravity',
      'halo_v_flat',
      'halo_core_radius',
      'galaxy_kpc_per_unit',
      'galaxy_msun_per_unit',
    ]) {
      expect(defaults.has(key)).toBe(true);
    }
  });

  test('a scenario that does not mention the halo leaves it alone', () => {
    // Which, given the defaults are reapplied first, means off.
    const written = keysWrittenBy('Solar System');
    expect(written).not.toContain('galaxy_gravity');
  });

  test('the three dark-matter scenarios each state their gravity explicitly', () => {
    // These must not rely on whatever the previous scenario happened to leave
    // behind: two of them need the halo and one must not have it, and each
    // says so.
    for (const name of [
      'Spiral Galaxy',
      'Milky Way Rotation',
      'Coma Cluster',
    ]) {
      const settings = { preset_scenario: name };
      applyPreset(settings, {}, { zoom: 1, pan: { x: 0, y: 0 } });
      expect(['newtonian', 'halo', 'mond']).toContain(settings.galaxy_gravity);
      expect(settings.halo_v_flat).toBeGreaterThan(0);
      expect(settings.halo_core_radius).toBeGreaterThan(0);
    }
  });

  test('only Spiral Galaxy runs without a halo, since it is the prediction', () => {
    const mode = name => {
      const s = { preset_scenario: name };
      applyPreset(s, {}, { zoom: 1, pan: { x: 0, y: 0 } });
      return s.galaxy_gravity;
    };
    expect(mode('Spiral Galaxy')).toBe('newtonian');
    expect(mode('Milky Way Rotation')).toBe('halo');
    expect(mode('Coma Cluster')).toBe('halo');
  });

  // MOND needs a declared physical scale to convert its acceleration constant
  // into simulation units, and only the galaxy scale models declare one. This
  // is the guard that keeps a galactic constant out of the Solar System.
  test('only the galaxy scale models declare a physical scale', () => {
    const scaled = [];
    for (const name of Object.keys(SCENARIO_INFO)) {
      if (name === 'None') continue;
      const s = { preset_scenario: name };
      applyPreset(s, {}, { zoom: 1, pan: { x: 0, y: 0 } });
      if (s.galaxy_kpc_per_unit > 0 || s.galaxy_msun_per_unit > 0) {
        scaled.push(name);
        // A half-declared scale would convert to a garbage a0, so both halves
        // are required together.
        expect(s.galaxy_kpc_per_unit).toBeGreaterThan(0);
        expect(s.galaxy_msun_per_unit).toBeGreaterThan(0);
      }
    }
    expect(scaled.sort()).toEqual([
      'Coma Cluster',
      'Milky Way Rotation',
      'Spiral Galaxy',
    ]);
  });
});
