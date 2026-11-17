// =============================================================================
// What the canvas behind a lesson is for
// -----------------------------------------------------------------------------
// A lesson or a step says `canvas: 'scene' | 'portrait' | 'quiet'`. What has to
// be true of that, checked here:
//
//   - none stated is today: nothing is read, nothing on the page changes;
//   - a declaration holds until the next one, then the lesson's own is the
//     default, and a declaration the lesson cannot honour is a stated problem;
//   - a portrait is described as a picture and holds the clock; a quiet canvas
//     empties the world, folds the rail and the playback bar behind toggles a
//     keyboard can press, and leaving at any step hands all of it back;
//   - the acceptance map follows the declaration, and a portrait that reads a
//     measurement off the scene is refused.
// The wiring into the lesson panel is e2e/lessonCanvas.spec.js.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  CANVAS,
  canvasAt,
  canvasKinds,
  canvasProblems,
} from '../js/lesson/canvasKind.js';
import {
  clockStep,
  enterCanvas,
  leaveCanvas,
  ownsWorld,
} from '../js/lessonCanvas.js';
import { canvasAcceptance } from '../tools/canvas-acceptance.mjs';
import { registerCommands } from '../js/appState.js';
import { setLocale } from '../js/i18n/index.js';
import { StarObject, getWorldGeneration, stars } from '../js/physics.js';
import { KEY_RAIL_SECTIONS } from '../js/names.js';

const stage = { stars: [{ role: 'a', name: 'A', teffK: 5772, lumSun: 1 }] };
const lesson = (steps, extra = {}) => ({ id: 'x', steps, ...extra });

describe('the declaration', () => {
  test('is three kinds, and none stated is nothing', () => {
    expect(CANVAS).toEqual(['scene', 'portrait', 'quiet']);
    const inv = lesson([{ sid: 'a', stage }, { sid: 'b' }]);
    expect(canvasAt(inv, 0)).toBeNull();
    expect(canvasKinds(inv)).toEqual([]);
    expect(canvasProblems(inv)).toEqual([]);
  });

  test('holds until the next declaration, then the lesson default', () => {
    const inv = lesson(
      [
        { sid: 'a', canvas: 'quiet' },
        { sid: 'b' },
        { sid: 'c', canvas: 'portrait', picture: 'Io', stage },
        { sid: 'd' },
      ],
      { canvas: 'scene' }
    );
    expect(canvasAt(inv, 1).kind).toBe('quiet');
    expect(canvasAt(inv, 2)).toMatchObject({ kind: 'portrait', picture: 'Io' });
    expect(canvasAt(inv, 3)).toMatchObject({ kind: 'portrait', at: 2 });
    expect(canvasAt(lesson([{ sid: 'a' }], { canvas: 'quiet' }), 0).kind).toBe(
      'quiet'
    );
    expect(canvasKinds(inv)).toEqual(['portrait', 'quiet']);
  });

  test('says what it cannot honour', () => {
    const quietStage = lesson([{ sid: 'a', canvas: 'quiet', stage }]);
    expect(canvasProblems(quietStage)[0]).toMatch(
      /quiet canvas stages nothing/
    );
    const bare = lesson([{ sid: 'a', canvas: 'scene' }]);
    expect(canvasProblems(bare)[0]).toMatch(/needs a stage, bind or setup/);
    const noPicture = lesson([{ sid: 'a', canvas: 'portrait', stage }]);
    expect(canvasProblems(noPicture)[0]).toMatch(/needs `picture`/);
    const odd = lesson([{ sid: 'a', canvas: 'loud' }]);
    expect(canvasProblems(odd)[0]).toMatch(/not one of/);
    // A setup carried from an earlier step is a scene in force, quiet between.
    const carried = lesson([
      { sid: 'a', setup: { scenario: 'solar-system' }, canvas: 'scene' },
      { sid: 'b', canvas: 'quiet' },
      { sid: 'c', canvas: 'scene' },
    ]);
    expect(canvasProblems(carried)).toEqual([]);
  });

  test('a portrait holds the clock as a reading step does', () => {
    const step = { type: 'measure', tool: { id: 'x' } };
    expect(clockStep(step, 'portrait')).toEqual({ type: 'read' });
    expect(clockStep(step, 'scene')).toBe(step);
    expect(clockStep(step, null)).toBe(step);
  });
});

describe('the acceptance map follows the declaration', () => {
  const inv = lesson([{ sid: 'a', canvas: 'quiet' }]);
  const steps = [{ sid: 'a', canvas: 'quiet', kinds: [] }];
  test('agrees, or says so', () => {
    expect(canvasAcceptance(inv, { canvas: ['quiet'] }, steps)).toEqual([]);
    expect(canvasAcceptance(inv, {}, steps)[0]).toMatch(/says \[\]/);
    expect(canvasAcceptance(inv, { canvas: ['portrait'] }, steps)[0]).toMatch(
      /declare canvas \[quiet\], the acceptance map says \[portrait\]/
    );
    // A stale entry for a lesson that no longer declares one.
    const none = lesson([{ sid: 'a' }]);
    expect(canvasAcceptance(none, { canvas: ['quiet'] }, [])[0]).toMatch(
      /declare canvas \[\]/
    );
    expect(canvasAcceptance(none, {}, [])).toEqual([]);
  });

  test('refuses a portrait that reads a measurement off the scene', () => {
    const p = lesson([{ sid: 'a', canvas: 'portrait', picture: 'Io', stage }]);
    const read = [
      { sid: 'a', canvas: 'portrait', kinds: ['engine-measurement'] },
    ];
    expect(canvasAcceptance(p, { canvas: ['portrait'] }, read)[0]).toMatch(
      /portrait but reads a measurement/
    );
    expect(
      canvasAcceptance(p, { canvas: ['portrait'] }, [
        { sid: 'a', canvas: 'portrait', kinds: ['model-result'] },
      ])
    ).toEqual([]);
  });
});

describe('the page', () => {
  const html = `
    <canvas id="simulationCanvas" role="img" aria-label="Gravitational simulation" aria-describedby="canvasSummary"></canvas>
    <button id="investigationResetScenario" aria-label="Reset the scene and instrument for this step" title="long title"></button>
    <div id="timelineBar"><button id="timelinePlay">Play</button></div>
    <button class="rail-section-toggle" id="railScenario" aria-expanded="true"></button>
    <button class="rail-section-toggle" id="railState" aria-expanded="false"></button>
    <div class="object-add" id="objectAdd"></div>`;
  const canvas = () => document.getElementById('simulationCanvas');
  const reset = () => document.getElementById('investigationResetScenario');
  const bar = () => document.getElementById('timelineBar');
  const fold = () => document.getElementById('timelineFold');
  const portrait = { kind: 'portrait', picture: 'Jupiter and Io' };
  const quiet = { kind: 'quiet', picture: '' };

  beforeEach(async () => {
    registerCommands({ hideObjectInspector: () => {} });
    document.body.innerHTML = html;
    delete document.body.dataset.lessonCanvas;
    localStorage.clear();
    // The accordion of js/controls.js: one section open, a click toggles it and
    // keeps the choice.
    for (const el of document.querySelectorAll('.rail-section-toggle'))
      el.addEventListener('click', () => {
        const was = el.getAttribute('aria-expanded') === 'true';
        for (const o of document.querySelectorAll('.rail-section-toggle'))
          o.setAttribute('aria-expanded', 'false');
        el.setAttribute('aria-expanded', String(!was));
        localStorage.setItem(KEY_RAIL_SECTIONS, JSON.stringify([el.id]));
      });
    stars.length = 0;
    leaveCanvas();
    await setLocale('en', { persist: false });
  });

  test('a portrait is described as a picture and restores on leaving', () => {
    enterCanvas(portrait);
    expect(document.body.dataset.lessonCanvas).toBe('portrait');
    expect(canvas().getAttribute('aria-label')).toBe(
      'Picture of Jupiter and Io, not a measurement.'
    );
    expect(canvas().hasAttribute('aria-describedby')).toBe(false);
    expect(reset().getAttribute('aria-label')).toBe(
      'Reset the picture and instrument for this step'
    );
    // A portrait changes nothing else: the rail is as it was, no bar toggle.
    expect(document.getElementById('railScenario').ariaExpanded).toBe('true');
    expect(fold()).toBeNull();
    leaveCanvas();
    expect(document.body.dataset.lessonCanvas).toBeUndefined();
    expect(canvas().getAttribute('aria-label')).toBe(
      'Gravitational simulation'
    );
    expect(canvas().getAttribute('aria-describedby')).toBe('canvasSummary');
    expect(reset().title).toBe('long title');
  });

  test('a scene and none stated leave the page alone', () => {
    const before = document.body.innerHTML;
    enterCanvas(null);
    expect(document.body.innerHTML).toBe(before);
    enterCanvas({ kind: 'scene', picture: '' });
    expect(canvas().getAttribute('aria-label')).toBe(
      'Gravitational simulation'
    );
    expect(fold()).toBeNull();
  });

  test('a quiet canvas empties the world and says so', () => {
    stars.push(new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1000));
    const generation = getWorldGeneration();
    enterCanvas(quiet);
    expect(stars).toHaveLength(0);
    expect(getWorldGeneration()).toBeGreaterThan(generation);
    expect(ownsWorld()).toBe(true);
    expect(canvas().getAttribute('aria-label')).toMatch(
      /No scene on this step/
    );
    expect(reset().getAttribute('aria-label')).toBe(
      'Reset the instrument for this step'
    );
    // Stays empty across the next quiet step, but empties again on a reset.
    stars.push(new StarObject({ x: 0, y: 0 }, { x: 0, y: 0 }, 1000));
    enterCanvas(quiet);
    expect(stars).toHaveLength(1);
    enterCanvas(quiet, true);
    expect(stars).toHaveLength(0);
  });

  test('the rail folds behind its toggles, and the choice is not kept', () => {
    localStorage.setItem(KEY_RAIL_SECTIONS, JSON.stringify(['railState']));
    enterCanvas(quiet);
    const open = [...document.querySelectorAll('[aria-expanded="true"]')];
    expect(
      open.filter(e => e.classList.contains('rail-section-toggle'))
    ).toEqual([]);
    expect(localStorage.getItem(KEY_RAIL_SECTIONS)).toBe(
      JSON.stringify(['railState'])
    );
    // A reader who opens a section during the lesson keeps it open.
    document.getElementById('railState').click();
    enterCanvas(quiet);
    expect(document.getElementById('railState').ariaExpanded).toBe('true');
    leaveCanvas();
    expect(document.getElementById('railState').ariaExpanded).toBe('true');
  });

  test('leaving mid-step hands the rail, the bar and the world back', () => {
    enterCanvas(quiet);
    expect(document.getElementById('railScenario').ariaExpanded).toBe('false');
    leaveCanvas();
    expect(document.getElementById('railScenario').ariaExpanded).toBe('true');
    expect(fold()).toBeNull();
    expect(bar().classList.contains('is-folded')).toBe(false);
    expect(ownsWorld()).toBe(false);
    expect(canvas().getAttribute('aria-label')).toBe(
      'Gravitational simulation'
    );
  });

  test('moving from quiet to a scene unfolds, and back folds again', () => {
    enterCanvas(quiet);
    enterCanvas({ kind: 'scene', picture: '' });
    expect(fold()).toBeNull();
    expect(document.getElementById('railScenario').ariaExpanded).toBe('true');
    enterCanvas(quiet);
    expect(document.getElementById('railScenario').ariaExpanded).toBe('false');
    expect(fold()).not.toBeNull();
  });

  test('the playback bar is one toggle a keyboard can press', () => {
    document.getElementById('timelinePlay').focus();
    enterCanvas(quiet);
    expect(bar().classList.contains('is-folded')).toBe(true);
    expect(fold().tagName).toBe('BUTTON');
    expect(fold().textContent).toBe('Playback');
    expect(fold().getAttribute('aria-expanded')).toBe('false');
    // The focus that stood on a folded control moved to the toggle.
    expect(document.activeElement).toBe(fold());
    fold().click();
    expect(bar().classList.contains('is-folded')).toBe(false);
    expect(fold().getAttribute('aria-expanded')).toBe('true');
    fold().click();
    expect(bar().classList.contains('is-folded')).toBe(true);
  });

  test('the words follow the language', async () => {
    enterCanvas(portrait);
    await setLocale('es', { persist: false });
    expect(canvas().getAttribute('aria-label')).toBe(
      'Imagen de Jupiter and Io, no una medida.'
    );
    await setLocale('en', { persist: false });
  });
});
