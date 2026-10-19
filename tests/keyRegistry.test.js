// =============================================================================
// js/names.js: the names Gravitas stores and announces itself under
// -----------------------------------------------------------------------------
// Prompt 107, step 2c. A name here is what a saved game, a share link, a
// student's storage and a listening module already hold, so three things are
// pinned: every value is the string it was before the module existed (the table
// below is that string, written out, never derived from the module); no name
// is spelled twice or left unused; and the 'gravitas*' literals still written
// inline are exactly the ones tools/key-registry-allowlist.json lists, which is
// a list that only shrinks.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import * as names from '../js/names.js';
import * as objectNames from '../js/data/objectNames.js';
import { setUnitMode } from '../js/units.js';
import {
  looseLiterals,
  scanTree,
  REGISTRY,
  EXEMPT,
} from '../tools/key-registry-scan.mjs';
import { costs, freeFiles } from '../tools/key-registry-free.mjs';
import { rewriteSource } from '../tools/key-registry-codemod.mjs';

/** Every name and the exact string it has always been. */
const PINNED = {
  KEY_UNITS: 'gravitas_units',
  KEY_MOTION: 'gravitas_motion',
  EV_SIMULATION_RESET: 'gravitasSimulationReset',
  EV_UNITS_CHANGED: 'gravitasUnitsChanged',
  EV_THEME_CHANGED: 'gravitasThemeChanged',
  EV_REQUEST_REBUILD: 'gravitasRequestRebuild',
  EV_MERGE: 'gravitasMerge',
  EV_COLLISION: 'gravitasCollision',
  EV_LOCALE_CHANGED: 'gravitasLocaleChanged',
  EV_SELECTION_CLEARED: 'gravitasSelectionCleared',
  EV_STOP_SIGNAL_AUDIO: 'gravitasStopSignalAudio',
  EV_ESCAPE: 'gravitasEscape',
  EV_SPEED_CHANGED: 'gravitasSpeedChanged',
  EV_PLACEMENT_ARMED: 'gravitasPlacementArmed',
  EV_OBJECT_PLACED: 'gravitasObjectPlaced',
  EV_WORKER_FAILED: 'gravitasWorkerFailed',
  EV_SIGNAL_AUDIO: 'gravitasSignalAudio',
  EV_MANEUVER_REQUESTED: 'gravitasManeuverRequested',
  EV_LIGHT_CURVE_TOGGLED: 'gravitasLightCurveToggled',
  EV_GALAXY_GRAVITY_CHANGED: 'gravitasGalaxyGravityChanged',
  EV_SETTINGS_APPLIED: 'gravitasSettingsApplied',
  EV_PRESENTATION_CHANGED: 'gravitasPresentationChanged',
  KEY_DASHED_PREFIX: 'gravitas-',
  KEY_META_BUILD: 'gravitas-build',
  KEY_PROTOCOL_EMBED: 'gravitas-embed',
  KEY_FORMAT_EXPERIMENT: 'gravitas-experiment',
  KEY_FORMAT_MANEUVER_LOG: 'gravitas-maneuver-log',
  KEY_META_REVISION: 'gravitas-revision',
  KEY_COURSE_LEVEL: 'gravitas_course_level',
  KEY_EXPERIMENT_PREFIX: 'gravitas_experiment_',
  KEY_EXPERIMENTS_INDEX: 'gravitas_experiments_index',
  KEY_INVESTIGATION_PREFIX: 'gravitas_investigation_',
  KEY_LECTURE_SEQUENCE: 'gravitas_lecture_sequence',
  KEY_NEXT_CONTEXT: 'gravitas_next_context',
  KEY_ORIENTATION_SEEN_V1: 'gravitas_orientation_seen_v1',
  KEY_RAIL_SECTIONS: 'gravitas_rail_sections',
  KEY_SIMULATION_SAVE: 'gravitas_simulation_save',
  KEY_THEME: 'gravitas_theme',
  KEY_WELCOME_SEEN_V1: 'gravitas_welcome_seen_v1',
  KEY_DB_ARCHIVE: 'gravitas-archive',
  KEY_DB_CATALOG: 'gravitas-catalog',
  KEY_PROTOCOL_COMPUTE: 'gravitas-compute',
  KEY_DB_STORE: 'gravitas-store',
  KEY_ASSIGNMENT_PREFIX: 'gravitas_assignment_',
  KEY_CAPABILITY_VERSIONS: 'gravitas_capability_versions',
  KEY_COMPOSER_PREFIX: 'gravitas_composer_',
  KEY_COMPOSER_PREVIEW: 'gravitas_composer_preview',
  KEY_COURSE_PREFIX: 'gravitas_course_',
  KEY_COURSE_PREVIEW: 'gravitas_course_preview',
  KEY_EVALUATION_DRAFT_PREFIX: 'gravitas_evaluation_draft_',
  KEY_EVALUATION_DRAFT_V1: 'gravitas_evaluation_draft_v1',
  KEY_EVIDENCE_NOTEBOOK: 'gravitas_evidence_notebook',
  KEY_EXPERIMENT: 'gravitas_experiment',
  KEY_EXPERIMENT_CHECKPOINT_PREFIX: 'gravitas_experiment_checkpoint_',
  KEY_GUIDES: 'gravitas_guides',
  KEY_INSTRUCTOR_KEY: 'gravitas_instructor_key',
  KEY_LAB3D_GUIDE_PREFIX: 'gravitas_lab3d_guide_',
  KEY_LAST_EXPORT: 'gravitas_last_export',
  KEY_LESSON_OBJECTS_OPEN: 'gravitas_lesson_objects_open',
  KEY_LOCALE: 'gravitas_locale',
  KEY_MADE_PREFIX: 'gravitas_made_',
  KEY_MISSIONLAB_PREFIX: 'gravitas_missionlab_',
  KEY_ORIENTATION_SEEN_PREFIX: 'gravitas_orientation_seen_',
  KEY_STORE_PREFIX: 'gravitas_store:',
  KEY_STUDENT_NAME: 'gravitas_student_name',
  KEY_STUDIO_PREFIX: 'gravitas_studio_',
  KEY_STUDIO_DRAFT_PREFIX: 'gravitas_studio_draft:',
  KEY_STUDIO_LAST: 'gravitas_studio_last',
  KEY_TEACHING_NOTES_PREFIX: 'gravitas_teaching_notes_',
  KEY_TEACHING_NOTES_V1: 'gravitas_teaching_notes_v1',
  KEY_WELCOME_SEEN_PREFIX: 'gravitas_welcome_seen_',
};

const NAME_EXPORT = /^(KEY|EV|ID)_[A-Z0-9_]+$/;
const exported = () =>
  Object.keys(names)
    .filter(k => NAME_EXPORT.test(k))
    .sort();

const allowlist = JSON.parse(
  readFileSync('tools/key-registry-allowlist.json', 'utf8')
).loose;

describe('the registry', () => {
  test('every name is pinned to the string it had before', () => {
    expect(Object.fromEntries(exported().map(k => [k, names[k]]))).toEqual(
      PINNED
    );
  });

  test('values are unique and carry the gravitas prefix', () => {
    const values = exported().map(k => names[k]);
    expect(new Set(values).size).toBe(values.length);
    for (const v of values) expect(v).toMatch(/^gravitas/);
  });

  test('the prefix of a name says what it is', () => {
    for (const k of exported()) {
      if (k.startsWith('EV_')) expect(names[k]).toMatch(/^gravitas[A-Z]/);
      if (k.startsWith('KEY_')) expect(names[k]).toMatch(/^gravitas[_-]/);
      if (k.startsWith('ID_')) expect(names[k]).toMatch(/^gravitas[.-]/);
    }
  });

  test('every name is imported somewhere outside the registry', () => {
    const sources = [];
    const walk = dir => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (p.endsWith('.js') && p !== REGISTRY)
          sources.push(readFileSync(p, 'utf8'));
      }
    };
    walk('js');
    for (const k of exported())
      expect({ k, used: sources.some(s => s.includes(k)) }).toEqual({
        k,
        used: true,
      });
  });

  test('the object name pools moved with their data intact', () => {
    expect(Object.keys(objectNames.SPACE_OBJECT_NAMES).length).toBeGreaterThan(
      5
    );
    expect(objectNames.default).toBe(objectNames.SPACE_OBJECT_NAMES);
    // And names.js no longer carries them: any module may import the registry.
    expect(names.SPACE_OBJECT_NAMES).toBeUndefined();
    // The pools as v2 had them in js/data/objectNames.js: a hash of the whole
    // table, so a name changed, dropped or reordered fails here.
    const digest = createHash('sha256')
      .update(JSON.stringify(objectNames.SPACE_OBJECT_NAMES))
      .digest('hex')
      .slice(0, 16);
    expect(digest).toBe('61a542a615ec994a');
  });
});

describe('what the migrated modules still do', () => {
  test('setUnitMode stores under the old key and announces the old event', () => {
    const seen = [];
    const on = e => seen.push([e.type, e.detail.mode]);
    window.addEventListener('gravitasUnitsChanged', on);
    try {
      setUnitMode('simulation');
      expect(window.localStorage.getItem('gravitas_units')).toBe('simulation');
      setUnitMode('physical');
      expect(window.localStorage.getItem('gravitas_units')).toBe('physical');
    } finally {
      window.removeEventListener('gravitasUnitsChanged', on);
    }
    expect(seen).toEqual([
      ['gravitasUnitsChanged', 'simulation'],
      ['gravitasUnitsChanged', 'physical'],
    ]);
  });
});

describe('the loose-literal ratchet', () => {
  test('the inline literals are exactly the allowlist', () => {
    const found = scanTree();
    // A new loose literal, or a count that went up.
    const grew = [];
    // An entry that no longer matches: moved into the registry or removed.
    const stale = [];
    for (const [file, counts] of Object.entries(found))
      for (const [v, n] of Object.entries(counts))
        if (n > (allowlist[file]?.[v] ?? 0))
          grew.push(
            `${file}: ${v} x${n}, allowed ${allowlist[file]?.[v] ?? 0}`
          );
    for (const [file, counts] of Object.entries(allowlist))
      for (const [v, n] of Object.entries(counts))
        if ((found[file]?.[v] ?? 0) < n)
          stale.push(
            `${file}: ${v} listed x${n}, found ${found[file]?.[v] ?? 0}`
          );
    expect({ grew, stale }).toEqual({ grew: [], stale: [] });
  });

  test('the scan reads code, not comments, paths or property names', () => {
    const src = `
      // 'gravitasInComment'
      import x from './gravitasPath.js';
      const o = { 'gravitasKey': 1, [ 'gravitasComputed' ]: 2 };
      const a = 'gravitasValue';
      const b = \`gravitasTemplate\`;
      const c = \`gravitas\${a}\`;
      const d = 'gravitas: a sentence';
      const e = 'gravitas-report.csv';
      f('gravitas_two', "gravitas.three");
    `;
    expect(
      looseLiterals(src)
        .map(s => s.value)
        .sort()
    ).toEqual(
      [
        'gravitasComputed',
        'gravitasTemplate',
        'gravitasValue',
        'gravitas_two',
        'gravitas.three',
      ].sort()
    );
  });
});

describe('the registry stays a leaf', () => {
  test('js/names.js imports nothing', () => {
    const src = readFileSync('js/names.js', 'utf8');
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/\bimport\(/);
  });
});

describe('the codemod (tools/key-registry-codemod.mjs)', () => {
  const run = (src, file = 'js/x/mod.js', kind = 'events') =>
    rewriteSource(src, file, kind);

  test('moves an event name used as one and adds the import', () => {
    const r = run(
      `import { a } from './a.js';\nwindow.addEventListener('gravitasMerge', f);\nwindow.dispatchEvent(new window.CustomEvent('gravitasMerge', {}));\nif (e.type === 'gravitasMerge') g();\n`
    );
    expect(r.moved).toBe(3);
    expect(r.src).toContain("import { EV_MERGE } from '../names.js';");
    expect(r.src).not.toMatch(/'gravitasMerge'/);
    expect(r.src).toContain('addEventListener(EV_MERGE, f)');
  });

  test('extends an import that is already there, sorted', () => {
    const r = run(
      `import { KEY_UNITS } from '../names.js';\nwindow.addEventListener('gravitasMerge', f);\nf(KEY_UNITS);\n`
    );
    expect(r.src).toContain(
      "import { EV_MERGE, KEY_UNITS } from '../names.js';"
    );
    expect(r.src.match(/from '..\/names.js'/g)).toHaveLength(1);
  });

  test('leaves an element id and a storage property alone', () => {
    const r = run(
      `document.getElementById('gravitasToast');\nconst d = localStorage.gravitasDebug ?? 'gravitasDebug';\n`
    );
    expect(r.moved).toBe(0);
    expect(r.left.sort()).toEqual(['gravitasDebug', 'gravitasToast']);
  });

  test('refuses a literal the registry does not know', () => {
    const r = run(`window.addEventListener('gravitasNotInTheRegistry', f);\n`);
    expect(r.moved).toBe(0);
    expect(r.unknown).toEqual(['gravitasNotInTheRegistry']);
  });
});

describe('what a module costs a page by importing the registry', () => {
  test('a module that no page loads costs no page, and is not called free', () => {
    expect(costs(['js/not-a-module.js'])).toEqual({ 'js/not-a-module.js': [] });
    expect(freeFiles(['js/not-a-module.js'])).toEqual([]);
  });

  test('a module no page reaches is not called free', () => {
    expect(freeFiles(['js/compute/frame/worker.js'])).toEqual([]);
  });

  test('a module that already imports the registry is free', () => {
    expect(freeFiles(['js/world.js'])).toEqual(['js/world.js']);
  });

  test('every exemption names a real file and says why', () => {
    for (const [file, why] of Object.entries(EXEMPT)) {
      expect(() => readFileSync(file, 'utf8')).not.toThrow();
      expect(why.length).toBeGreaterThan(40);
    }
  });
});
