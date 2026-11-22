// =============================================================================
// Reset, restart and discard: one vocabulary
// -----------------------------------------------------------------------------
// "Reset the scene" never touches answers. "Start this investigation over"
// deletes them, says how many, offers a backup first and can be undone until the
// investigation closes. These tests pin the words (one key set, both languages,
// the same phrase in the control, its name, the help and the dialog) and the
// record: a restart removes exactly the investigation's saved answers, an undo
// puts them back, and nothing is written anywhere the record did not go.
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import { readFileSync, readdirSync } from 'node:fs';
import { EN } from '../js/i18n/en.js';
import { ES } from '../js/i18n/es.js';
import { EN_RESET as EN_LATE } from '../js/i18n/en.reset.js';
import { ES_RESET as ES_LATE } from '../js/i18n/es.reset.js';
import { EN_CANVAS } from '../js/i18n/en.canvas.js';
import { ES_CANVAS } from '../js/i18n/es.canvas.js';
import {
  bindPersistence,
  drafts,
  earlierFor,
  forgetKept,
  keepEarlier,
  load,
  save,
  sessionProgress,
} from '../js/investigations/stepView.js';
import { railLeavesScene, resetSaid, syncReset } from '../js/lessonFrame.js';
import { setLocale } from '../js/i18n/index.js';
// Registers the canvas kinds' words, as a lesson that declares a canvas does.
import '../js/lessonCanvas.js';
import { countSaved, ask, forget } from '../js/investigations/restart.js';

// The control's own words are in the base catalogs; the rest arrive late
// (js/investigations/vocabulary.js). Together they are the one reset vocabulary.
const own = c =>
  Object.fromEntries(Object.entries(c).filter(([k]) => k.startsWith('reset.')));
const EN_RESET = { ...own(EN), ...EN_LATE };
const ES_RESET = { ...own(ES), ...ES_LATE };
const SCENE = 'Reset the scene';
const OVER = 'Start this investigation over';
const lessonHtml = readFileSync('js/fragments/lesson.html', 'utf8');
const finishHtml = readFileSync('js/fragments/lesson-finish.html', 'utf8');

const lesson = {
  id: 'tides',
  steps: [
    { sid: 'intro', type: 'read', title: 'Intro', body: 'Read.' },
    { sid: 'guess', type: 'question', kind: 'numeric', title: 'Guess' },
    {
      sid: 'take',
      type: 'measure',
      title: 'Take',
      fields: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    },
  ],
};

describe('the words, one key set in both languages', () => {
  const keys = c => Object.keys(c).sort();
  const holes = m =>
    (typeof m === 'string' ? m : m.other).match(/\{\w+\}/g)?.sort() ?? [];

  test('English and Spanish have the same keys, and the same placeholders', () => {
    expect(keys(ES_RESET)).toEqual(keys(EN_RESET));
    for (const k of keys(EN_RESET)) {
      const [en, es] = [EN_RESET[k], ES_RESET[k]];
      expect(typeof es).toBe(typeof en);
      if (typeof en === 'object')
        expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
      expect(holes(es)).toEqual(holes(en));
    }
    expect(keys(ES_CANVAS)).toEqual(keys(EN_CANVAS));
  });

  test('the two actions are named once, in the words of the roadmap', () => {
    expect(EN_RESET['reset.scene']).toBe(SCENE);
    expect(EN_RESET['reset.restart']).toBe(OVER);
    expect(ES_RESET['reset.scene']).toBe('Restablecer la escena');
    expect(ES_RESET['reset.restart']).toBe(
      'Empezar esta investigación de nuevo'
    );
  });

  test('the scene reset says answers are not changed, in every line that names a scene reset', () => {
    for (const [c, said] of [
      [EN_RESET, 'Your answers are not changed.'],
      [ES_RESET, 'Tus respuestas no cambian.'],
      [EN_CANVAS, 'Your answers are not changed.'],
      [ES_CANVAS, 'Tus respuestas no cambian.'],
    ])
      for (const k of keys(c).filter(
        k => /^reset\.(scene\.hint|did\.)/.test(k) || /canvas\.reset/.test(k)
      ))
        expect(c[k]).toContain(said);
  });

  test("a restart's tooltip and dialog say it deletes, asks first and can be undone", () => {
    expect(EN_RESET['reset.restart.hint']).toMatch(/Deletes .*saved answers/);
    expect(EN_RESET['reset.restart.hint']).toMatch(/undo/);
    expect(EN_RESET['reset.ask.go']).toMatch(/^Discard/);
    expect(EN_RESET['reset.ask.scene']).toMatch(/scene is reset too/);
    expect(EN_RESET['reset.ask.assigned']).toMatch(/instructor/);
    expect(ES_RESET['reset.ask.go']).toMatch(/^Descartar/);
  });

  test('"discard" appears only where something is truly lost', () => {
    const where = Object.entries(EN_RESET)
      .filter(([, v]) => /discard/i.test(JSON.stringify(v)))
      .map(([k]) => k);
    expect(where).toEqual([
      'reset.ask.lost',
      'reset.ask.lost.mem',
      'reset.ask.go',
    ]);
  });

  test('the student words are activity and investigation, never lesson', () => {
    for (const c of [EN_RESET, ES_RESET, EN_CANVAS, ES_CANVAS])
      expect(JSON.stringify(c)).not.toMatch(/\blesson|\blecci[oó]n/i);
  });

  test('no third phrase names either action anywhere in the English catalogs', () => {
    const dir = 'js/i18n';
    const third =
      /Restart (this|the) investigation|Reset this investigation|Reset the investigation|Start over\b|Restart\b.*answers/;
    for (const f of readdirSync(dir).filter(f => /^en\..*\.js$/.test(f)))
      expect(readFileSync(`${dir}/${f}`, 'utf8')).not.toMatch(third);
  });
});

describe('the markup takes its words from the keys', () => {
  const used = html => [
    ...html.matchAll(/data-(?:i18n|late)(?:-title)?="([^"]+)"/g),
  ];

  test('every key the fragments name exists in both languages', () => {
    for (const [, key] of [...used(lessonHtml), ...used(finishHtml)].filter(
      ([, k]) => k.startsWith('reset.')
    )) {
      expect(EN_RESET).toHaveProperty([key]);
      expect(ES_RESET).toHaveProperty([key]);
    }
  });

  test('the reset control shows its label, whose text is its name', () => {
    const button =
      /<button id="investigationResetScenario"[\s\S]*?<\/button>/.exec(
        lessonHtml
      )[0];
    expect(button).toContain('data-i18n="reset.scene"');
    expect(button).not.toMatch(/aria-label|data-said|title=/);
    expect(button).toContain(SCENE);
  });

  test('the restart control, the help and the dialog use the two phrases', () => {
    expect(lessonHtml).toMatch(
      /id="investigationReset"[\s\S]*?data-late-title="reset\.restart\.hint"[\s\S]*?data-late="reset\.restart"/
    );
    const help = lessonHtml.slice(lessonHtml.indexOf('reset.help.title'));
    expect(help).toContain('data-i18n="reset.scene"');
    expect(help).toContain('data-late="reset.restart"');
    expect(finishHtml).toContain('data-late="reset.ask.title"');
    expect(finishHtml).toContain('data-late="reset.ask.backup"');
    expect(finishHtml).toContain('data-late="reset.ask.go"');
  });

  test('the progress row keeps the reason as text where the control is off', () => {
    expect(lessonHtml).toContain('id="investigationResetWhy"');
  });
});

describe('counting what a restart will delete, from the record', () => {
  const k = (...p) => ['tides', ...p].join(':');

  test('an answer is a step answered, a reading is a field of a measure', () => {
    const table = {
      [k('guess')]: '0.91',
      [k('guess', 'locale')]: 'en',
      [k('take', 'a')]: '3',
      [k('take', 'b')]: '4',
      [k('take', 'b', 'src')]: 'instrument',
      [k('take', 'c')]: '  ',
      [k('intro', 'shown')]: true,
      [k('guess', 'tool', 'x')]: '2',
    };
    expect(countSaved(lesson, table)).toEqual({
      answers: 1,
      readings: 2,
      n: 3,
    });
  });

  test('answers kept from an earlier version and answers to other investigations', () => {
    const now = { [k('guess')]: '1', 'other:guess': '9' };
    const earlier = { [k('gone-step')]: '7', [k('guess')]: '1' };
    expect(countSaved(lesson, now, earlier)).toMatchObject({ n: 2 });
    expect(countSaved(lesson, {})).toEqual({ answers: 0, readings: 0, n: 0 });
  });
});

describe('starting over, and undoing it', () => {
  const KEY = 'gravitas_investigation_tides';
  let st;
  let host;
  let went;
  let dialog;
  let key;
  let saved;

  const stored = () => JSON.parse(localStorage.getItem(KEY));
  const el = id => document.getElementById(id);
  /** Let the restart's awaited scene rebuild finish. */
  const flush = () => new Promise(r => setTimeout(r, 0));

  beforeEach(() => {
    document.body.innerHTML = `${lessonHtml}${finishHtml}`;
    dialog = el('investigationRestart');
    dialog.showModal = () => dialog.setAttribute('open', '');
    dialog.close = () => dialog.removeAttribute('open');
    localStorage.clear();
    sessionProgress.clear();
    went = [];
    key = KEY;
    saved = true;
    st = {
      step: 2,
      responses: {
        'tides:guess': '0.91',
        'tides:take:a': '3',
        'tides:take:b': '4',
        'tides:take:b:src': 'instrument',
      },
      attempts: { 'tides:guess': 2 },
      visited: new Set(['intro', 'guess', 'take']),
      startedAt: '2026-11-15T00:00:00.000Z',
      assigned: false,
    };
    host = {
      state: () => ({
        active: lesson,
        stepIndex: st.step,
        key,
        saved,
        ...st,
      }),
      put: p => {
        Object.assign(st, p);
        save();
      },
      // The real one is async where a stage has to load first.
      go: async (i, rebuild) => {
        await Promise.resolve();
        went.push([i, rebuild]);
        st.step = i;
        st.visited.add(lesson.steps[i].sid);
        save();
      },
      kept: { drafts, earlierFor, forgetKept, keepEarlier },
    };
    bindPersistence({
      state: () => ({
        active: lesson,
        stepIndex: st.step,
        responses: st.responses,
        attempts: st.attempts,
        visited: st.visited,
        startedAt: st.startedAt,
        depthChoice: 'core',
        deepest: 'core',
        spent: 0,
        progressNotes: [],
      }),
      authoring: () => false,
      assigned: () => false,
      assignmentKey: () => 'unused',
      els: () => ({}),
      clock: () => {},
    });
    forgetKept('tides');
    save();
  });

  afterEach(() => {
    forget();
    document.body.innerHTML = '';
  });

  const go = async () => {
    ask(host);
    el('investigationRestartGo').click();
    await flush();
  };
  const undo = async () => {
    el('investigationUndoGo').click();
    await flush();
  };

  test('the dialog counts the record, and names the assignment only for one', () => {
    ask(host);
    expect(el('investigationRestartN').textContent).toBe('3');
    expect(el('investigationRestartParts').textContent).toBe(
      'Answers: 1. Readings: 2.'
    );
    expect(el('investigationRestartAssigned').hidden).toBe(true);
    expect(el('investigationRestartBackup').hidden).toBe(false);
    expect(el('investigationRestartGo').textContent).toBe(
      'Discard answers and start over'
    );
    expect(dialog.getAttribute('aria-describedby')).toBe(
      'investigationRestartSummary'
    );
    expect(
      el('investigationRestartSummary').contains(el('investigationRestartN'))
    ).toBe(true);
    const base = host.state;
    host.state = () => ({ ...base(), assigned: true });
    ask(host);
    expect(el('investigationRestartAssigned').hidden).toBe(false);
  });

  test('with nothing saved the dialog says only that the place resets, and offers no backup', () => {
    st.responses = {};
    ask(host);
    expect(el('investigationRestartCount').hidden).toBe(true);
    expect(el('investigationRestartNone').hidden).toBe(false);
    expect(el('investigationRestartParts').hidden).toBe(true);
    expect(el('investigationRestartBackup').hidden).toBe(true);
    expect(el('investigationRestartLost').textContent).toBe(
      EN_RESET['reset.ask.progress']
    );
    expect(el('investigationRestartGo').textContent).toBe(OVER);
  });

  test('where the browser will not keep the answers the dialog does not say "from this device"', () => {
    saved = false;
    ask(host);
    expect(el('investigationRestartLost').textContent).toBe(
      EN_RESET['reset.ask.lost.mem']
    );
    expect(el('investigationRestartLost').textContent).not.toMatch(
      /from this device/
    );
  });

  test('asking changes nothing; confirming removes exactly the saved answers and resets the scene', async () => {
    const before = localStorage.getItem(KEY);
    ask(host);
    expect(localStorage.getItem(KEY)).toBe(before);
    expect(went).toEqual([]);

    await go();
    expect(stored().responses).toEqual({});
    expect(stored().attempts).toEqual({});
    // Only the first step, which the restart itself opened.
    expect(stored().visited).toEqual(['intro']);
    // A restart goes to step 1 and rebuilds its scene.
    expect(went).toEqual([[0, true]]);
    expect(el('investigationUndo').hidden).toBe(false);
    expect(el('investigationUndo').hasAttribute('role')).toBe(false);
    expect(el('investigationUndoText').textContent).toMatch(
      /^Started over\. 3 saved answers and readings were deleted/
    );
  });

  test('the record is written the moment the restart empties it, before a staged scene has loaded', async () => {
    let release;
    const gate = new Promise(r => (release = r));
    const slow = host.go;
    host.go = async (...a) => {
      await gate;
      return slow(...a);
    };
    ask(host);
    el('investigationRestartGo').click();
    await flush();
    // The scene is still loading; the record already says nothing is saved.
    expect(stored().responses).toEqual({});
    expect(el('investigationUndo').hidden).toBe(true);
    release();
    await flush();
    expect(el('investigationUndo').hidden).toBe(false);
    expect(stored().visited).toEqual(['intro']);
  });

  test('undo puts the whole record back, and keeps what was answered since', async () => {
    const before = stored();
    await go();
    st.responses['tides:guess'] = '1.5';
    st.responses['tides:intro:newer'] = 'x';
    await undo();
    expect(went.at(-1)).toEqual([2, true]);
    expect(st.responses).toMatchObject({
      'tides:take:a': '3',
      'tides:take:b': '4',
      'tides:take:b:src': 'instrument',
      'tides:guess': '1.5',
      'tides:intro:newer': 'x',
    });
    // The guess was answered again, so its step wins whole: no old tries beside the new answer.
    expect(st.attempts).toEqual({});
    expect([...st.visited].sort()).toEqual(['guess', 'intro', 'take']);
    expect(stored().startedAt).toBe(before.startedAt);
    expect(stored().responses['tides:take:a']).toBe('3');
    expect(el('investigationUndo').hidden).toBe(true);
  });

  test('undo merges a step at a time: a step answered since wins whole and never mixes readings', async () => {
    await go();
    // One new reading of the measure step; its old b and src must not come back beside it.
    st.responses['tides:take:a'] = '9';
    st.attempts['tides:take'] = 1;
    await undo();
    expect(st.responses['tides:take:a']).toBe('9');
    expect(st.responses).not.toHaveProperty(['tides:take:b']);
    expect(st.responses).not.toHaveProperty(['tides:take:b:src']);
    // The step not touched since comes back, with its tries.
    expect(st.responses['tides:guess']).toBe('0.91');
    expect(st.attempts).toEqual({ 'tides:guess': 2, 'tides:take': 1 });
  });

  test('instrument values written since do not make a step newer', async () => {
    await go();
    st.responses['tides:take:tool:x'] = '2';
    await undo();
    expect(st.responses).toMatchObject({
      'tides:take:a': '3',
      'tides:take:b': '4',
      'tides:take:tool:x': '2',
    });
  });

  test('undo keeps newer typed text over the older', async () => {
    drafts({ 'tides:guess': '0,9', 'tides:other': 'old' });
    await go();
    expect(drafts()).toEqual({});
    drafts({ 'tides:guess': '1,5' });
    await undo();
    expect(drafts()).toEqual({ 'tides:guess': '1,5', 'tides:other': 'old' });
  });

  test('a second restart keeps the first undo: nothing answered in between changes nothing', async () => {
    const before = JSON.parse(localStorage.getItem(KEY));
    await go();
    await go();
    expect(el('investigationUndoGo').hidden).toBe(false);
    await undo();
    expect(st.responses).toMatchObject(before.responses);
    expect(st.step).toBe(2);
    expect(st.attempts).toEqual(before.attempts);
  });

  test('a second restart after answering holds both records, newer steps whole', async () => {
    await go();
    st.responses['tides:guess'] = '7';
    st.attempts['tides:guess'] = 1;
    st.step = 1;
    await go();
    expect(el('investigationUndoText').textContent).toMatch(
      /^Started over\. 3 saved answers and readings were deleted/
    );
    await undo();
    expect(st.responses).toMatchObject({
      'tides:guess': '7',
      'tides:take:a': '3',
      'tides:take:b': '4',
    });
    expect(st.attempts).toEqual({ 'tides:guess': 1 });
  });

  test('undo restores the record byte for byte when nothing was answered since', async () => {
    const before = localStorage.getItem(KEY);
    await go();
    await undo();
    const after = stored();
    expect(after.responses).toEqual(JSON.parse(before).responses);
    expect(after.attempts).toEqual(JSON.parse(before).attempts);
    expect(after.visited.sort()).toEqual(JSON.parse(before).visited.sort());
  });

  test('closing the investigation drops the deleted record; undo then does nothing', async () => {
    await go();
    forget();
    await undo();
    expect(st.responses).toEqual({});
    expect(el('investigationUndo').hidden).toBe(true);
  });

  test('another record open (an investigation opened without closing this one) is never overwritten by an undo', async () => {
    await go();
    key = 'gravitas_investigation_other';
    st.responses = { 'other:x': '1' };
    await undo();
    expect(st.responses).toEqual({ 'other:x': '1' });
    expect(el('investigationUndo').hidden).toBe(true);
    // And a restart there does not fold the first record into its own undo.
    key = KEY;
    await go();
    key = 'gravitas_investigation_other';
    st.responses = { 'other:y': '2' };
    await go();
    key = KEY;
    await undo();
    expect(st.responses).toEqual({});
  });

  test('the deleted record is held in memory only: no storage holds it', async () => {
    await go();
    // The progress record and the resume line are what a restart writes.
    expect(Object.keys(localStorage).sort()).toEqual([KEY, 'gravitas_resume']);
    const everywhere = JSON.stringify([
      ...Object.entries(localStorage),
      ...Object.entries(sessionStorage),
    ]);
    expect(everywhere).not.toContain('instrument');
    expect(everywhere).not.toContain('0.91');
  });

  test('typed drafts and the answers kept from an earlier version go and come back', async () => {
    keepEarlier('tides', { responses: { 'tides:gone': '7' }, attempts: {} });
    drafts({ 'tides:guess': '0,9' });
    await go();
    expect(drafts()).toEqual({});
    expect(earlierFor('tides')).toBeUndefined();
    await undo();
    expect(drafts()).toEqual({ 'tides:guess': '0,9' });
    expect(earlierFor('tides').responses).toEqual({ 'tides:gone': '7' });
    expect(load('tides', lesson).responses).toMatchObject({
      'tides:take:a': '3',
    });
  });

  test('with nothing saved a restart resets the scene and the place, and an undo gives the place back', async () => {
    st.responses = {};
    st.attempts = {};
    save();
    await go();
    expect(went).toEqual([[0, true]]);
    expect(el('investigationUndoGo').hidden).toBe(false);
    expect(el('investigationUndoText').textContent).toMatch(
      /^Started over\. Nothing had been saved, so only your place was reset/
    );
    await undo();
    expect(st.step).toBe(2);
    expect([...st.visited].sort()).toEqual(['guess', 'intro', 'take']);
  });
});

describe('the reset control and the rail, named for what they touch', () => {
  const button = () => document.getElementById('investigationResetScenario');
  const why = () => document.getElementById('investigationResetWhy');
  const rail = [
    ['refreshScenarioBtn', 'rail.refreshScenario', 'Restart Scenario'],
    ['resetAllBtn', 'rail.resetAll', 'Reset Settings and Scenario'],
    ['cleanSimBtn', 'rail.cleanSim', 'Clear All Bodies'],
  ];

  beforeEach(async () => {
    document.body.innerHTML = `${lessonHtml}${rail
      .map(
        ([id, key, text]) =>
          `<button id="${id}" title="${text} hint" data-i18n-title="${key}.hint" data-i18n="${key}">${text}</button>`
      )
      .join('')}`;
    await setLocale('en', { persist: false });
  });

  afterEach(async () => {
    railLeavesScene(false);
    await setLocale('en', { persist: false });
    document.body.innerHTML = '';
  });

  test('on: the label is the name, the tooltip says answers are not changed', () => {
    syncReset({ scene: true, tool: false });
    expect(button().disabled).toBe(false);
    expect(button().textContent.replace(/\s+/g, ' ').trim()).toBe(`↺ ${SCENE}`);
    expect(button().title).toBe(
      "Rebuilds this step's scene. Your answers are not changed."
    );
    expect(button().hasAttribute('aria-describedby')).toBe(false);
    expect(why().hidden).toBe(true);
  });

  test('off where nothing is set up: disabled, with the reason as visible text', () => {
    syncReset({ scene: false, tool: false });
    expect(button().disabled).toBe(true);
    expect(button().getAttribute('aria-describedby')).toBe(
      'investigationResetWhy'
    );
    expect(why().hidden).toBe(false);
    expect(why().textContent).toMatch(
      /off on this step.*no scene or instrument/
    );
    syncReset({ scene: false, tool: true });
    expect(button().disabled).toBe(false);
    expect(why().hidden).toBe(true);
  });

  test('a picture or a quiet canvas names what it rebuilds in the tooltip only', () => {
    syncReset({ scene: true, tool: true, kind: 'portrait' });
    expect(button().title).toMatch(/^Rebuilds this step's picture\./);
    syncReset({ scene: false, tool: true, kind: 'quiet' });
    expect(button().title).toMatch(/^Rebuilds this step's instrument\./);
    expect(button().textContent).toContain(SCENE);
  });

  test('what it did is said as the scene, the instrument or both', async () => {
    expect(await resetSaid({ scene: true, tool: false })).toBe(
      EN_RESET['reset.did.scene']
    );
    expect(await resetSaid({ scene: false, tool: true })).toBe(
      EN_RESET['reset.did.tool']
    );
    expect(await resetSaid({ scene: true, tool: true })).toBe(
      EN_RESET['reset.did.both']
    );
  });

  test('the rail leaves the scene inside an investigation, and is handed back after', async () => {
    railLeavesScene(true);
    for (const [id, , text] of rail) {
      expect(document.getElementById(id).textContent).toBe(
        `Leave this investigation's scene: ${text}`
      );
      expect(document.getElementById(id).title).toMatch(
        /^Leaves this investigation's scene\. /
      );
      expect(document.getElementById(id).hasAttribute('data-i18n')).toBe(false);
    }
    await setLocale('es', { persist: false });
    expect(document.getElementById('cleanSimBtn').textContent).toMatch(
      /^Salir de la escena de esta investigación: /
    );
    railLeavesScene(false);
    for (const [id, key] of rail) {
      const el = document.getElementById(id);
      expect(el.dataset.i18n).toBe(key);
      expect(el.dataset.i18nTitle).toBe(`${key}.hint`);
      expect(el.textContent).not.toMatch(/investigaci[oó]n/i);
    }
  });

  test('in Spanish the control, its reason and its tooltip are Spanish', async () => {
    await setLocale('es', { persist: false });
    syncReset({ scene: false, tool: false });
    expect(button().textContent).toContain('Restablecer la escena');
    expect(why().textContent).toMatch(
      /^Restablecer la escena no está disponible/
    );
    syncReset({ scene: true, tool: false });
    expect(button().title).toBe(
      'Reconstruye la escena de este paso. Tus respuestas no cambian.'
    );
  });
});
