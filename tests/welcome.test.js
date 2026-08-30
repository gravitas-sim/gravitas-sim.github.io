import { describe, test, expect, beforeEach, jest } from '@jest/globals';

import {
  WELCOME_SEEN_KEY,
  isWelcomeSeen,
  markWelcomeSeen,
  resetWelcomePreference,
  hasDeepLinkDestination,
  shouldShowWelcome,
  cardSummary,
  featuredScenarios,
  previewInvestigations,
} from '../js/welcome.js';
import {
  FEATURED_SCENARIO_KEYS,
  ENTRY_CARDS,
  AUDIENCES,
  RESOURCE_LINKS,
} from '../js/data/welcome.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';

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

describe('featured scenarios come from the live catalog', () => {
  test('every featured key exists in SCENARIO_INFO', () => {
    // The one way this gallery can rot: a scenario renamed in scenarios.js and
    // scenarioInfo.js while the front door keeps pointing at the old name.
    for (const key of FEATURED_SCENARIO_KEYS) {
      expect(SCENARIO_INFO[key]).toBeTruthy();
      expect(typeof SCENARIO_INFO[key].title).toBe('string');
      expect(typeof SCENARIO_INFO[key].summary).toBe('string');
    }
  });

  test('there are six, and no duplicates', () => {
    expect(FEATURED_SCENARIO_KEYS).toHaveLength(6);
    expect(new Set(FEATURED_SCENARIO_KEYS).size).toBe(6);
  });

  test('every featured scenario shows the catalog thumbnail', () => {
    // Not its own artwork: the front door and the gallery show one image per
    // scenario, from one path in the catalog.
    for (const card of featuredScenarios()) {
      expect(card.info.thumbnail).toBe(SCENARIO_INFO[card.key].thumbnail);
      expect(card.info.thumbnail).toMatch(/^images\/scenarios\/.+\.webp$/);
    }
  });

  test('titles and summaries are read, not restated', () => {
    const cards = featuredScenarios();
    expect(cards).toHaveLength(6);
    for (const card of cards) {
      const info = SCENARIO_INFO[card.key];
      expect(card.title).toBe(info.title);
      // The card text must be an opening slice of the catalog summary, never a
      // rewrite: edit scenarioInfo.js and the front door follows. Whitespace is
      // normalized on both sides because the trim rejoins sentences with a
      // single space.
      const flat = t => String(t).replace(/\s+/g, ' ').trim();
      expect(flat(info.summary).startsWith(flat(card.summary))).toBe(true);
    }
  });

  test('a card summary is trimmed to an opening sentence or two', () => {
    // A short opener reads as a fragment, so it keeps the next sentence.
    expect(cardSummary('One short thing. Then another. And a third.')).toBe(
      'One short thing. Then another.'
    );
    // A long one stands alone.
    expect(
      cardSummary(
        'A sentence long enough that it stands on its own two feet without help. Second.'
      )
    ).toBe(
      'A sentence long enough that it stands on its own two feet without help.'
    );
    expect(cardSummary('No terminator here')).toBe('No terminator here');
    expect(cardSummary('')).toBe('');
    expect(cardSummary(undefined)).toBe('');
  });

  test('a decimal point does not end a sentence', () => {
    // The catalog is full of "1.4 M_sun" and "0.5 AU". Splitting on a bare
    // period put "Two neutron stars (1." on the neutron-star card.
    expect(
      cardSummary(
        'Two neutron stars (1.4 M☉ each) spiral toward each other in a death dance. Then more.'
      )
    ).toBe(
      'Two neutron stars (1.4 M☉ each) spiral toward each other in a death dance.'
    );
    expect(
      cardSummary('It sits at 0.72 AU and gets 1.9 Earths of light.')
    ).toBe('It sits at 0.72 AU and gets 1.9 Earths of light.');
  });

  test('every card summary is short enough for a card', () => {
    for (const card of featuredScenarios()) {
      expect(card.summary.length).toBeGreaterThan(20);
      expect(card.summary.length).toBeLessThan(240);
    }
  });

  test('a renamed scenario costs one card, not the gallery', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const original = SCENARIO_INFO[FEATURED_SCENARIO_KEYS[0]];
    delete SCENARIO_INFO[FEATURED_SCENARIO_KEYS[0]];
    try {
      const cards = featuredScenarios();
      expect(cards).toHaveLength(5);
      expect(warn).toHaveBeenCalled();
    } finally {
      SCENARIO_INFO[FEATURED_SCENARIO_KEYS[0]] = original;
      warn.mockRestore();
    }
  });
});

describe('the routing out of the front door', () => {
  test('lesson previews come from the real investigation registry', () => {
    const preview = previewInvestigations(INVESTIGATIONS, 3);
    expect(preview).toHaveLength(3);
    preview.forEach((p, i) => {
      expect(p.title).toBe(INVESTIGATIONS[i].title);
      expect(p.subtitle).toBe(INVESTIGATIONS[i].subtitle);
      expect(p.steps).toBe(INVESTIGATIONS[i].steps.length);
    });
  });

  test('no second copy of the scenario or lesson catalog exists', async () => {
    // js/data/welcome.js may carry keys and presentation, never the truth.
    const source = await import('node:fs').then(fs =>
      fs.readFileSync(new URL('../js/data/welcome.js', import.meta.url), 'utf8')
    );
    for (const key of FEATURED_SCENARIO_KEYS) {
      // The key appears once, in the featured list and the art map. The
      // catalog's own title and summary must not.
      expect(source).not.toContain(SCENARIO_INFO[key].summary);
    }
    for (const inv of INVESTIGATIONS) {
      expect(source).not.toContain(inv.summary);
    }
  });

  test('the entry cards route through actions the module implements', () => {
    // Every card's action must be one welcome.js knows how to run; a typo here
    // is a button that silently does nothing.
    const known = new Set([
      'enter',
      'investigations',
      'instructors',
      'scenarios',
      'tour',
      'reset',
    ]);
    for (const card of ENTRY_CARDS) {
      expect(known.has(card.action)).toBe(true);
      expect(card.cta.length).toBeGreaterThan(3);
    }
    // The three doors the brief calls for, in order.
    expect(ENTRY_CARDS.map(c => c.id)).toEqual([
      'sandbox',
      'investigations',
      'instructors',
    ]);
  });

  test('the audience block names students, instructors and everyone else', () => {
    expect(AUDIENCES).toHaveLength(3);
    const titles = AUDIENCES.map(a => a.title.toLowerCase()).join(' ');
    expect(titles).toContain('student');
    expect(titles).toContain('instructor');
  });
});

describe('outbound links point at pages that exist', () => {
  test('every resource link resolves to a file in this repository', async () => {
    const fs = await import('node:fs');
    for (const link of Object.values(RESOURCE_LINKS)) {
      // "/model/" is served as model/index.html by GitHub Pages.
      const path = new URL(`..${link.href}index.html`, import.meta.url);
      expect(fs.existsSync(path)).toBe(true);
      expect(link.label.length).toBeGreaterThan(3);
    }
  });

  test('no link is an invented PDF or an off-site placeholder', () => {
    for (const link of Object.values(RESOURCE_LINKS)) {
      expect(link.href).toMatch(/^\/[a-z]+\/$/);
      expect(link.href).not.toMatch(/\.pdf$/i);
      expect(link.href).not.toMatch(/^https?:/i);
    }
  });
});
