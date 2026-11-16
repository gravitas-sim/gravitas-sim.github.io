// =============================================================================
// What opening one lesson loads, read from the import graph
// -----------------------------------------------------------------------------
// The lesson engine (js/investigations.js) is on every lesson's route. What it
// imports statically is what every lesson downloads before its first step, so
// two groups are held out of that closure and stay out:
//
//   the star model   the stage and the stellar model behind it (js/lessonStage.js,
//                    js/stellarLab.js, the MIST tracks, the population sampler),
//                    fetched when a step that declares a stage is about to be
//                    shown (js/lesson/stageGate.js);
//   the catalogue    the cards of all lessons (the manifest, the browse and
//                    sequence data, the lesson browser itself), fetched when
//                    the browser is first opened (js/investigations/chooser.js)
//                    or when a page that lists lessons asks for them.
//
// Static edges only: a dynamic import() is exactly how these arrive later.
// e2e/lazyInstruments.spec.js holds the same from the page.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { importClosure } from '../tools/source-closure.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { files, dynamic } = importClosure({
  root: ROOT,
  entries: ['js/investigations.js'],
});

const STAR_MODEL = [
  'js/lessonStage.js',
  'js/stellarLab.js',
  'js/stellar/tracks.js',
  'js/stellar/population.js',
  'js/stellar/hr.js',
  'js/lesson/starState.js',
  'js/data/stellar/mistTracks.js',
];
const CATALOGUE = [
  'js/data/investigations/manifest.js',
  'js/data/investigations/registry.js',
  'js/data/investigations/browse.js',
  'js/data/investigations/browseData.js',
  'js/data/investigations/sequences.js',
  'js/investigations/browser.js',
];

describe('the lesson engine statically imports', () => {
  test('nothing of the star model', () => {
    expect(files.filter(f => STAR_MODEL.includes(f))).toEqual([]);
  });

  test('nothing of the catalogue of all lessons', () => {
    expect(files.filter(f => CATALOGUE.includes(f))).toEqual([]);
  });

  test('the doors that fetch them, and the lesson loaders it does need', () => {
    for (const door of [
      'js/lesson/stageGate.js',
      'js/investigations/chooser.js',
      'js/data/investigations/loaders.js',
    ])
      expect(files).toContain(door);
    expect(dynamic).toContain('js/lesson/stageGate.js -> ../lessonStage.js');
    expect(dynamic).toContain('js/investigations/chooser.js -> ./browser.js');
  });
});
