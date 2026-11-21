// =============================================================================
// The sandbox's frame loop waits for a lesson link's first screen
// -----------------------------------------------------------------------------
// js/main.js starts the frame loop (and offline support) through
// whenLessonShown() when the address bar names a lesson. The promise must hold
// while the lesson is opening, release when its panel (or the chooser) is
// shown, and never hold longer than its backstop, or a lesson that did not
// arrive would leave the sandbox standing still.
// =============================================================================

import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';

const PANEL = '<div id="investigationPanel" hidden></div>';
const BROWSER = '<div id="investigationBrowser" class="hidden"></div>';

jest.unstable_mockModule('../js/i18n/deferredMessages.js', () => ({
  loadFragment: async name => (name === 'lesson' ? PANEL + BROWSER : ''),
  mountFragment: (name, html) => {
    document.body.insertAdjacentHTML('beforeend', html);
    return null;
  },
  unmountFragment: () => true,
  ensureDeferredMessages: async () => {},
}));
jest.unstable_mockModule('../js/investigations.js', () => ({
  initInvestigations: () => {},
  teardownInvestigations: () => {},
  openBrowser: () => {},
}));

let whenLessonShown;

beforeAll(async () => {
  ({ whenLessonShown } = await import('../js/investigationsLoader.js'));
});

/** Whether a promise has settled, after a few turns of the event loop. */
async function settled(promise, turns = 8) {
  let done = false;
  promise.then(() => (done = true));
  for (let i = 0; i < turns; i++) await new Promise(r => setTimeout(r, 20));
  return done;
}

describe('whenLessonShown', () => {
  beforeEach(() => {
    window.location.hash = '';
    document.getElementById('investigationPanel')?.setAttribute('hidden', '');
    document.getElementById('investigationBrowser')?.classList.add('hidden');
  });

  test('resolves at once when the address names no lesson', async () => {
    window.location.hash = '#home';
    expect(await settled(whenLessonShown())).toBe(true);
  });

  test('holds while the lesson opens and releases when its panel is shown', async () => {
    window.location.hash = '#investigation=keplers-laws';
    const held = whenLessonShown(5000, 40);
    expect(await settled(held)).toBe(false);
    document.getElementById('investigationPanel').hidden = false;
    expect(await settled(held)).toBe(true);
  });

  test('answers the first click before it releases, once the panel is up', async () => {
    window.location.hash = '#investigation=keplers-laws';
    const held = whenLessonShown(5000, 60000);
    document.getElementById('investigationPanel').hidden = false;
    expect(await settled(held, 5)).toBe(false);
    window.dispatchEvent(new Event('click'));
    expect(await settled(held, 2)).toBe(true);
  });

  test('releases when the chooser is shown instead of a lesson', async () => {
    window.location.hash = '#investigation=keplers-laws';
    const held = whenLessonShown(5000, 40);
    expect(await settled(held)).toBe(false);
    document.getElementById('investigationBrowser').classList.remove('hidden');
    expect(await settled(held)).toBe(true);
  });

  test('never holds past its backstop', async () => {
    window.location.hash = '#investigation=keplers-laws';
    const held = whenLessonShown(120);
    expect(await settled(held, 3)).toBe(false);
    await held;
  });
});
