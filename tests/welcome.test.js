import { describe, test, expect, beforeEach } from '@jest/globals';

import {
  WELCOME_SEEN_KEY,
  isWelcomeSeen,
  markWelcomeSeen,
  resetWelcomePreference,
  hasDeepLinkDestination,
  shouldShowWelcome,
  unfinishedLessons,
} from '../js/welcome.js';
import { readFileSync } from 'node:fs';

/**
 * Replace window.localStorage for one test.
 * @param {Object|null} impl - Stub, or null to make every access throw
 */
function withStorage(impl) {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      if (impl === null) throw new DOMException('denied', 'SecurityError');
      return impl;
    },
  });
}

/** A working in-memory localStorage. */
function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    _map: map,
  };
}

beforeEach(() => {
  withStorage(memoryStorage());
  window.location.hash = '';
});

describe('the first-visit preference', () => {
  test('a brand new visitor has not seen it', () => {
    expect(isWelcomeSeen()).toBe(false);
    expect(shouldShowWelcome()).toBe(true);
  });

  test('entering the sandbox records it, and the next visit skips', () => {
    const store = memoryStorage();
    withStorage(store);

    markWelcomeSeen();

    expect(store.getItem(WELCOME_SEEN_KEY)).toBe('1');
    expect(isWelcomeSeen()).toBe(true);
    expect(shouldShowWelcome()).toBe(false);
  });

  test('the key is versioned, so a redesign can show it once more', () => {
    // Guards against someone quietly switching to a generic key: "seen" would
    // collide with anything else in the app's storage, and an unversioned key
    // makes a deliberate re-show impossible.
    expect(WELCOME_SEEN_KEY).toBe('gravitas_welcome_seen_v1');
    expect(WELCOME_SEEN_KEY).toMatch(/_v\d+$/);
  });

  test('the preference can be reset, and the door comes back', () => {
    const store = memoryStorage({ [WELCOME_SEEN_KEY]: '1' });
    withStorage(store);
    expect(shouldShowWelcome()).toBe(false);

    expect(resetWelcomePreference()).toBe(true);

    expect(store.getItem(WELCOME_SEEN_KEY)).toBe(null);
    expect(shouldShowWelcome()).toBe(true);
  });

  test('it does not share a key with any other stored preference', () => {
    const store = memoryStorage({
      gravitas_theme: 'daylight',
      mobile_instructions_shown: 'true',
    });
    withStorage(store);

    markWelcomeSeen();

    expect(store.getItem('gravitas_theme')).toBe('daylight');
    expect(store.getItem('mobile_instructions_shown')).toBe('true');
    expect(store._map.size).toBe(3);
  });
});

describe('when storage is unavailable', () => {
  test('nothing throws and the visitor is treated as new', () => {
    withStorage(null);

    // A visitor in private mode, or with site data blocked, still gets a
    // working front door: it opens, it closes, the dismissal simply will not
    // survive the reload.
    expect(() => isWelcomeSeen()).not.toThrow();
    expect(() => markWelcomeSeen()).not.toThrow();
    expect(() => resetWelcomePreference()).not.toThrow();

    expect(isWelcomeSeen()).toBe(false);
    expect(shouldShowWelcome()).toBe(true);
    expect(resetWelcomePreference()).toBe(false);
  });

  test('a storage that reads but refuses to write does not throw', () => {
    withStorage({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
      removeItem: () => {},
    });

    expect(() => markWelcomeSeen()).not.toThrow();
  });
});

describe('deep links are never intercepted', () => {
  // The exact fragment forms the app writes. share.js encodes
  // "#<n><z|r><payload>"; investigations.js reads "#investigation=<id>".
  const shared = '#1zeJyrVkrLz1eyUkrOSC0uUUgtSc7PLShKLS7JzM9TqgUAY_MJ8Q';
  const lesson = '#investigation=goldilocks-question';

  test('a shared simulation link is recognized', () => {
    expect(hasDeepLinkDestination(shared)).toBe(true);
    expect(hasDeepLinkDestination('#7r' + 'AAAA')).toBe(true);
  });

  test('an investigation link is recognized', () => {
    expect(hasDeepLinkDestination(lesson)).toBe(true);
    expect(hasDeepLinkDestination('#investigation=keplers-laws')).toBe(true);
    // The shell's Investigations entry names the chooser, not a lesson.
    expect(hasDeepLinkDestination('#investigations')).toBe(true);
    expect(hasDeepLinkDestination('#investigationsx')).toBe(false);
  });

  test('an ordinary root visit is not a deep link', () => {
    for (const h of ['', '#', '#top', '#mainControls', '#investigation=']) {
      expect(hasDeepLinkDestination(h)).toBe(false);
    }
  });

  test('an assignment is not covered by an introduction', () => {
    expect(shouldShowWelcome({ hash: shared, seen: false })).toBe(false);
    expect(shouldShowWelcome({ hash: lesson, seen: false })).toBe(false);
  });

  test('being bypassed by a deep link does not mark it seen', () => {
    const store = memoryStorage();
    withStorage(store);

    // A first-time visitor arriving on an instructor's link.
    expect(shouldShowWelcome({ hash: shared })).toBe(false);
    // Nothing was written: shouldShowWelcome only reads.
    expect(store.getItem(WELCOME_SEEN_KEY)).toBe(null);

    // Later, at the root URL, they still get the introduction.
    expect(shouldShowWelcome({ hash: '' })).toBe(true);
  });

  test('a returning visitor on a deep link is skipped for both reasons', () => {
    expect(shouldShowWelcome({ hash: shared, seen: true })).toBe(false);
  });
});

const read = f => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

describe('Home (Prompt 162): what it says, where to start, and the five places', () => {
  const home = read('js/fragments/home.html');
  const inv = JSON.parse(read('tools/navigation-inventory.json'));

  test('its sections are the orientation, where to start, the five places and the foot', () => {
    const ids = [...home.matchAll(/<section[^>]*?\bid="(wel\w+)"/g)].map(
      m => m[1]
    );
    expect(ids).toEqual(['welOrient', 'welContinue']);
    expect(home).toContain('id="welStart"');
    expect(home).toContain('id="welPlaces"');
  });

  test('it shows no count of content and no feature list', () => {
    expect(home).not.toMatch(/\(\d+\)/);
    expect(home).not.toContain('data-slot="scenario-count"');
    expect(home).not.toContain('data-lesson-count');
    for (const gone of [
      'wel-triad',
      'wel-scenarios',
      'wel-audiences',
      'wel-links',
      'welLibrary',
    ])
      expect(home).not.toContain(gone);
  });

  test('the recommended start is the committed list, one entry per audience, each acting or going somewhere', () => {
    const block =
      /<!-- first-week:home -->([\s\S]*?)<!-- \/first-week:home -->/.exec(
        home
      )[1];
    const items = block.match(/<li class="wel-start-item">/g) ?? [];
    expect(items).toHaveLength(inv.firstWeek.starts.length);
    for (const start of inv.firstWeek.starts) {
      expect(block.includes(start.audience.en)).toBe(true);
      expect(block.includes(start.audience.es)).toBe(true);
    }
    // the actions are ones welcome.js runs
    const source = read('js/welcome.js');
    for (const [, action] of block.matchAll(/data-action="(\w+)"/g))
      expect({ action, known: source.includes(`case '${action}'`) }).toEqual({
        action,
        known: true,
      });
  });

  test('every action Home offers is one the module implements', () => {
    const source = read('js/welcome.js');
    for (const [, action] of home.matchAll(/data-action="(\w+)"/g))
      expect({ action, known: source.includes(`case '${action}'`) }).toEqual({
        action,
        known: true,
      });
  });

  test('every link in Home goes to a page of this repository, or to the sandbox itself', () => {
    for (const [, href] of home.matchAll(/href="(\/[^"]*)"/g)) {
      const path = href.replace(/[#?].*$/, '');
      if (path === '/' || path.endsWith('.pdf')) continue;
      expect({
        href,
        page:
          readFileSync(new URL(`..${path}index.html`, import.meta.url), 'utf8')
            .length > 0,
      }).toEqual({ href, page: true });
    }
  });

  test('where was I: the lessons started and not finished, most recent first, at most three', () => {
    const catalog = [1, 2, 3, 4].map(n => ({
      id: `l${n}`,
      title: `L${n}`,
      stepCount: 5,
    }));
    const saved = {
      l1: { seen: 2, at: '2026-10-01' },
      l2: { seen: 5, at: '2026-10-02' },
      l3: { seen: 1, at: '2026-10-03' },
      l4: { seen: 3, at: '2026-10-04' },
    };
    const going = unfinishedLessons(catalog, id => saved[id]);
    expect(going.map(g => g.id)).toEqual(['l4', 'l3', 'l1']);
  });
});
