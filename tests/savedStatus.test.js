// =============================================================================
// Saved, and said so
// -----------------------------------------------------------------------------
// The status line says in words what is kept (answers, slider settings, hints),
// says once when saving is refused and why (a full disk and a browser that does
// not allow saving are different), puts the backup beside the refusal, and says
// once when it recovers. A note says the scene is rebuilt, only where a student
// has changed one. Both languages, the same words.
// =============================================================================

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { readFileSync } from 'node:fs';
import { EN_DEFERRED } from '../js/i18n/en.deferred.js';
import { ES_DEFERRED } from '../js/i18n/es.deferred.js';
import { EN_RESET } from '../js/i18n/en.reset.js';
import { ES_RESET } from '../js/i18n/es.reset.js';
import { registerMessages, setLocale, t } from '../js/i18n/index.js';
import {
  bindPersistence,
  save,
  sessionProgress,
} from '../js/investigations/stepView.js';
import { syncReset } from '../js/investigations/vocabulary.js';
import { state } from '../js/appState.js';

registerMessages('en', EN_DEFERRED, true);
registerMessages('es', ES_DEFERRED, true);

const lessonHtml = readFileSync('js/fragments/lesson.html', 'utf8');
const lesson = {
  id: 'tides',
  steps: [
    { sid: 'intro', type: 'read' },
    { sid: 'guess', type: 'question', kind: 'numeric' },
  ],
};

let at;
let visited;
const bind = () =>
  bindPersistence({
    state: () => ({
      active: lesson.closed ? null : lesson,
      stepIndex: at,
      responses: { 'tides:guess': '1' },
      attempts: {},
      visited,
      startedAt: null,
      depthChoice: 'core',
      deepest: 'core',
      spent: 0,
      progressNotes: [],
    }),
    authoring: () => false,
    assigned: () => false,
    assignmentKey: () => 'unused',
    els: () => ({
      saveStatus: document.getElementById('investigationSaveStatus'),
      backupDownload: document.getElementById('investigationBackupDownload'),
    }),
    clock: () => {},
  });

const status = () => document.getElementById('investigationSaveStatus');
const refuse = name => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw Object.assign(new Error('refused'), { name });
  });
};

beforeEach(async () => {
  document.body.innerHTML = lessonHtml;
  localStorage.clear();
  sessionProgress.clear();
  at = 0;
  visited = new Set(['intro']);
  await setLocale('en', { persist: false });
  bind();
});

afterEach(() => {
  jest.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('the status line', () => {
  test('says what is kept, with a way to My work, and does not announce the first save', () => {
    save();
    expect(status().dataset.state).toBe('saved');
    expect(status().textContent).toContain(
      'Your answers, slider settings and hints are saved on this device.'
    );
    expect(status().querySelector('a').getAttribute('href')).toBe('/my-work/');
    expect(status().getAttribute('aria-live')).toBe('off');
    expect(status().querySelector('button')).toBeNull();
  });

  test('a full disk and a browser that does not allow saving are told apart, each with the backup', () => {
    refuse('QuotaExceededError');
    save();
    expect(status().dataset.state).toBe('full');
    expect(status().textContent).toMatch(/storage is full/);
    expect(status().getAttribute('aria-live')).toBe('polite');
    expect(status().querySelector('button').textContent).toBe(
      'Download a backup of your work'
    );

    refuse('SecurityError');
    save();
    expect(status().dataset.state).toBe('unavailable');
    expect(status().textContent).toMatch(/private browsing/);
    expect(status().textContent).not.toMatch(/full/);
    expect(status().querySelector('button')).not.toBeNull();
  });

  test('the backup button is the existing backup action', () => {
    refuse('QuotaExceededError');
    save();
    const existing = document.getElementById('investigationBackupDownload');
    const pressed = jest.fn();
    existing.addEventListener('click', pressed);
    status().querySelector('button').click();
    expect(pressed).toHaveBeenCalledTimes(1);
  });

  test('a standing state is said once: the same outcome draws nothing again', () => {
    refuse('QuotaExceededError');
    save();
    const button = status().querySelector('button');
    save();
    save();
    expect(status().querySelector('button')).toBe(button);
  });

  test('recovery is said once, politely, and the button goes', () => {
    refuse('QuotaExceededError');
    save();
    jest.restoreAllMocks();
    save();
    expect(status().dataset.state).toBe('saved');
    expect(status().getAttribute('aria-live')).toBe('polite');
    expect(status().querySelector('button')).toBeNull();
  });

  test('both languages say the same three things', async () => {
    await setLocale('es', { persist: false });
    save();
    expect(status().textContent).toContain('se guardan en este dispositivo');
    refuse('QuotaExceededError');
    save();
    expect(status().textContent).toMatch(/lleno/);
    expect(status().querySelector('button').textContent).toBe(
      'Descargar una copia de tu trabajo'
    );
    refuse('SecurityError');
    save();
    expect(status().textContent).toMatch(/navegación privada/);
  });
});

describe('the note that the scene is rebuilt', () => {
  const note = () => status().nextElementSibling;
  const scene = { scene: true, tool: false };

  beforeEach(() => {
    jest.useFakeTimers();
    state.paused = false;
  });
  afterEach(() => {
    // Closing the investigation: the note's timer sees it and lets go.
    lesson.closed = true;
    jest.advanceTimersByTime(1100);
    lesson.closed = false;
    jest.useRealTimers();
    state.paused = false;
  });

  test('is not shown on a step where nothing has been changed', () => {
    syncReset(scene);
    jest.advanceTimersByTime(3000);
    expect(note()?.hidden ?? true).toBe(true);
  });

  test('appears, once, when the student pauses the run, and goes at the next step', () => {
    syncReset(scene);
    state.paused = true;
    jest.advanceTimersByTime(1100);
    expect(note().hidden).toBe(false);
    expect(note().getAttribute('role')).toBe('status');
    expect(note().textContent).toBe(EN_RESET['saved.scene.leave']);
    syncReset(scene);
    expect(note().hidden).toBe(true);
  });

  test('is not shown for a step without a scene, even when the run is paused', () => {
    syncReset({ scene: false, tool: true });
    state.paused = true;
    jest.advanceTimersByTime(3000);
    expect(note()?.hidden ?? true).toBe(true);
  });

  test('says on coming back that the scene is rebuilt and the answers are kept', () => {
    at = 1;
    visited = new Set(['intro', 'guess']);
    syncReset(scene);
    expect(note().hidden).toBe(false);
    expect(note().textContent).toBe(EN_RESET['saved.scene.back']);
    jest.advanceTimersByTime(3000);
  });

  test('both languages have both sentences, about the scene and the answers', () => {
    for (const k of ['saved.scene.leave', 'saved.scene.back']) {
      expect(typeof ES_RESET[k]).toBe('string');
      expect(t(k)).toBe(EN_RESET[k]);
    }
    expect(EN_RESET['saved.scene.back']).toMatch(
      /answers and readings are saved/
    );
    expect(ES_RESET['saved.scene.back']).toMatch(
      /respuestas y lecturas se guardan/
    );
  });
});
