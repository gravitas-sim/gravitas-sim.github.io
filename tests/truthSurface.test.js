// =============================================================================
// The claims the documentation makes, against the code that makes them true
// -----------------------------------------------------------------------------
// Most factual numbers in this repository are generated: `npm run docs:check`
// compares every `<!--fact:-->` marker and every ATTRIBUTE_FACTS pattern against
// the source, and fails when they disagree. That machinery covers counts.
//
// This file covers the handful of claims it cannot: facts stated in prose, as
// words rather than digits, or as a description of behaviour. Each one here was
// found wrong, or found right only by luck, during the v2 truth-surface audit:
//
//   the integrator        paper.md said the sandbox integrates "with a
//                         velocity-Verlet integrator and an optional
//                         fourth-order Runge-Kutta scheme". The default is
//                         symplectic Euler and there are three schemes, so the
//                         paper named the wrong one and omitted the one that
//                         runs.
//   the softening floor   /model/ says the floor is five length units by
//                         default. DEFAULT_SETTINGS says zero, which means "no
//                         scenario has an opinion" and resolves to five. The
//                         page is right and the setting reads as though it is
//                         wrong, which is how two other branches of this work
//                         came to state the opposite.
//   Barnes-Hut adoption   PERFORMANCE_OPTIMIZATIONS_SUMMARY.md said physics is
//                         handed to the worker "when the body count justifies
//                         it". Nothing does that. It is an opt-in checkbox.
//   the demonstrations    the teaching page and the paper both say "six", as a
//                         word, which no numeric fact can substitute.
//
// These are tripwires, not a framework. Each fails loudly enough to name the
// prose that has to change with it.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = f => readFileSync(path.join(here, '..', f), 'utf8');

describe('the integrators the documentation names', () => {
  const physics = read('js/physics.js');

  test('there are exactly three, and the default is symplectic Euler', () => {
    const list = /const INTEGRATORS = \[([^\]]+)\]/.exec(physics)?.[1];
    expect(list).toBeTruthy();
    const names = list.split(',').map(s => s.trim().replace(/^'|'$/g, ''));
    expect(names).toEqual(['Symplectic Euler', 'Velocity Verlet', 'RK4']);
    // The fallback in activeIntegrator(), which is also the documented default.
    expect(physics).toMatch(
      /INTEGRATORS\.includes\(want\) \? want : 'Symplectic Euler'/
    );
    expect(physics).toMatch(/integrator: 'Symplectic Euler'/);
    expect(read('js/appState.js')).toMatch(/integrator: 'Symplectic Euler'/);
  });

  test('every document that names a default names that one', () => {
    // paper.md is the one that got this wrong, and it is the one a reviewer
    // reads. If the default ever changes, these three have to move together.
    for (const f of ['paper.md', 'README.md', 'PHYSICS_VALIDATION.md']) {
      const text = read(f).toLowerCase();
      expect(text).toContain('symplectic euler');
    }
    expect(read('paper.md')).toMatch(/symplectic Euler by default/);
  });
});

describe('the softening floor the model page quotes', () => {
  const physics = read('js/physics.js');

  test('the effective default really is five length units', () => {
    expect(physics).toMatch(/const MIN_INTERACTION_DISTANCE = 5\.0;/);
    // Zero in the settings means "use the constant", not "no floor". This is
    // the line that makes /model/'s "five simulation length units by default"
    // true, and reading the setting alone makes it look false.
    expect(physics).toMatch(
      /return Number\.isFinite\(v\) && v > 0 \? v : MIN_INTERACTION_DISTANCE;/
    );
    // Wrapped across lines in the page, so matched with flexible whitespace.
    expect(read('model/index.html')).toMatch(
      /five simulation length units by\s+default/
    );
  });
});

describe('what the performance summary claims is adopted', () => {
  const physics = read('js/physics.js');

  test('Barnes-Hut is opt-in, with no body-count heuristic', () => {
    // If this ever becomes automatic, the summary's wording has to change back.
    expect(physics).toMatch(/use_barnes_hut: false/);
    expect(read('js/appState.js')).toMatch(/use_barnes_hut: false/);
    const active = /const isBarnesHutActive = \(\) =>([\s\S]*?);/.exec(
      physics
    )?.[1];
    expect(active).toBeTruthy();
    expect(active).toContain('use_barnes_hut === true');
    expect(active).not.toMatch(/length|count|>=|>\s*\d/);
    const summary = read('PERFORMANCE_OPTIMIZATIONS_SUMMARY.md');
    expect(summary).toContain('There is\n   no body-count heuristic');
    expect(summary).toContain('_built,\n   not adopted_');
    // The old wording survives in that entry, quoted as the thing that was
    // wrong, so this checks the correction rather than the absence of a phrase.
  });
});

describe('counts that are spelled as words', () => {
  test('there are six teaching demonstrations', async () => {
    const { DEMOS } = await import('../js/data/teaching.js');
    // Spelled "six" in teaching/index.html (heading, button, two meta
    // descriptions) and in paper.md. A numeric fact marker cannot substitute a
    // word, so this is the tripwire instead.
    expect(DEMOS.length).toBe(6);
    expect(read('teaching/index.html')).toContain('Six demonstrations');
    expect(read('paper.md')).toContain('six demonstrations');
  });

  test('the bundled stellar grid matches the generated fact', async () => {
    const { TRACK_IDS } = await import('../js/stellar/tracks.js');
    // The page said "Seven" over a list of eight. The count is generated now,
    // but the list of masses beside it is prose and still has to agree.
    expect(TRACK_IDS).toHaveLength(8);
    const page = read('model/index.html');
    expect(page).toContain('<!--fact:stellarTracks-->8<!--/fact-->');
    expect(page).toContain('0.2, 0.5,');
    expect(page).toContain('1, 2, 5, 10, 20 and 40 solar masses');
  });
});
