// =============================================================================
// The showcase page's content and its demonstration links
// -----------------------------------------------------------------------------
// /teaching/ is addressed to people deciding whether to adopt Gravitas, which
// makes two kinds of defect worse here than anywhere else in the product: a
// number that is not true, and a link that does not open what the card beside
// it says it opens. Both are what this file is about.
//
// The link check is a decode, not a byte comparison. Two Node versions can
// disagree about whether a sixty-byte payload is worth deflating and both
// answers are correct links; what must not vary is what the link MEANS, so
// every fragment is decoded and held to the spec it came from.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CYCLE,
  JOURNEY,
  INSTRUMENTS,
  DEMOS,
  PATTERNS,
  EVIDENCE,
  SECTIONS,
} from '../js/data/teaching.js';
import { DEMO_LINKS, SCENARIO_COUNT } from '../js/data/teachingGenerated.js';
import { EN_TEACHING } from '../js/i18n/en.teaching.js';
import { ES_TEACHING } from '../js/i18n/es.teaching.js';
import { decodePayload } from '../js/shareState.js';
import { SCENARIO_INFO } from '../js/data/scenarioInfo.js';
import { DEFAULT_SETTINGS } from '../js/appState.js';
import { MANIFEST } from '../js/data/investigations/manifest.js';
import { MANIFEST as MANIFEST_ES } from '../js/data/investigations/manifest.es.js';
import { LENGTHS, lengthOf } from '../js/data/investigations/sequences.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(REPO, 'teaching/index.html'), 'utf8');

describe('the two catalogues are shadows of each other', () => {
  test('every id in English exists in Spanish, and the other way round', () => {
    expect(Object.keys(ES_TEACHING).sort()).toEqual(
      Object.keys(EN_TEACHING).sort()
    );
  });

  test('nothing is left untranslated by copying the English through', () => {
    // Proper nouns and the two endonyms are the same word in both languages,
    // which is not a failure to translate. Everything else differing is.
    const shared = new Set([
      'teach.lang.en',
      'teach.lang.es',
      'teach.foot.home',
    ]);
    const identical = Object.keys(EN_TEACHING).filter(
      id => !shared.has(id) && EN_TEACHING[id] === ES_TEACHING[id]
    );
    expect(identical).toEqual([]);
  });

  test('the ids are all in the page-specific namespace', () => {
    // The showcase page has its own catalogue precisely so that its hundred
    // strings never reach the application's start-up download. An id without
    // the prefix is one somebody meant to put in the other catalogue.
    const stray = Object.keys(EN_TEACHING).filter(
      id => !id.startsWith('teach.')
    );
    expect(stray).toEqual([]);
  });

  test('every placeholder in English has the same one in Spanish', () => {
    const holes = text => (String(text).match(/\{(\w+)\}/g) || []).sort();
    for (const id of Object.keys(EN_TEACHING)) {
      expect({ id, holes: holes(ES_TEACHING[id]) }).toEqual({
        id,
        holes: holes(EN_TEACHING[id]),
      });
    }
  });
});

describe('the page asks for messages that exist', () => {
  test('every data-i18n attribute in the HTML names a real id', () => {
    const asked = [...html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map(
      m => m[1]
    );
    expect(asked.length).toBeGreaterThan(30);
    expect(asked.filter(id => !(id in EN_TEACHING))).toEqual([]);
  });

  test('every id the structure implies exists in both languages', () => {
    const wanted = [
      ...SECTIONS.map(id => `teach.section.${id}`),
      ...CYCLE.flatMap(id => [
        `teach.cycle.${id}.verb`,
        `teach.cycle.${id}.student`,
        `teach.cycle.${id}.tool`,
      ]),
      ...JOURNEY.flatMap(id => [
        `teach.journey.${id}.title`,
        `teach.journey.${id}.text`,
      ]),
      ...INSTRUMENTS.flatMap(({ id }) => [
        `teach.instruments.${id}.name`,
        `teach.instruments.${id}.text`,
      ]),
      ...DEMOS.flatMap(({ id }) => [
        `teach.demo.${id}.question`,
        `teach.demo.${id}.instructor`,
        `teach.demo.${id}.predict`,
        `teach.demo.${id}.visible`,
      ]),
      ...PATTERNS.flatMap(({ id }) => [
        `teach.pattern.${id}.title`,
        `teach.pattern.${id}.text`,
        `teach.pattern.${id}.prep`,
        `teach.pattern.${id}.handin`,
      ]),
      ...EVIDENCE.flatMap(({ id }) => [
        `teach.evidence.${id}.name`,
        `teach.evidence.${id}.text`,
      ]),
    ];
    expect(wanted.filter(id => !(id in EN_TEACHING))).toEqual([]);
    expect(wanted.filter(id => !(id in ES_TEACHING))).toEqual([]);
  });

  test('nothing in either catalogue is unused', () => {
    // A dead entry is work a translator wasted, and on this page it is also a
    // sign that a section was removed and its prose left behind.
    const used = new Set([
      ...[...html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)].map(m => m[1]),
    ]);
    for (const file of ['js/teachingPage.js', 'js/teaching/i18n.js']) {
      const src = readFileSync(path.join(REPO, file), 'utf8');
      for (const m of src.matchAll(/'(teach\.[\w.]+)'/g)) used.add(m[1]);
      // Ids assembled from the structure: `teach.cycle.${id}.verb` and friends.
      for (const m of src.matchAll(/`(teach\.\w+)\.\$\{[\w.]+\}\.(\w+)`/g)) {
        used.add(`${m[1]}.*.${m[2]}`);
      }
      for (const m of src.matchAll(/`(teach\.\w+\.\w+)\.\$\{[\w.]+\}`/g)) {
        used.add(`${m[1]}.*`);
      }
    }

    const structural = new Set([
      ...SECTIONS.map(id => `teach.section.${id}`),
      ...CYCLE.map(id => `teach.cycle.${id}`),
      ...JOURNEY.map(id => `teach.journey.${id}`),
      ...INSTRUMENTS.map(({ id }) => `teach.instruments.${id}`),
      ...DEMOS.map(({ id }) => `teach.demo.${id}`),
      ...PATTERNS.map(({ id }) => `teach.pattern.${id}`),
      ...EVIDENCE.map(({ id }) => `teach.evidence.${id}`),
    ]);

    const isUsed = id => {
      if (used.has(id)) return true;
      const parts = id.split('.');
      // `teach.cycle.predict.verb` is reached as `teach.cycle.*.verb`.
      const stem = parts.slice(0, 3).join('.');
      const leaf = parts.slice(3).join('.');
      if (
        structural.has(stem) &&
        used.has(`${parts[0]}.${parts[1]}.*.${leaf}`)
      ) {
        return true;
      }
      return used.has(`${parts.slice(0, 2).join('.')}.*`);
    };

    expect(Object.keys(EN_TEACHING).filter(id => !isUsed(id))).toEqual([]);
  });
});

describe('the page states nothing it is not entitled to state', () => {
  const prose = Object.values(EN_TEACHING).join(' ');

  test('it does not claim an effect on learning', () => {
    // There is no study behind this product. A showcase page may say what the
    // software does; it may not say what it achieves.
    expect(prose).not.toMatch(
      /improves? learning|better (?:learning|outcomes|grades)|\bproven\b|research[- ]validated|evidence[- ]based (?:to|that)/i
    );
  });

  test('it does not declare itself accessible or standards-conformant', () => {
    // "Keyboard operable, and checked with axe-core" is a fact. "Accessible",
    // "WCAG AA" and "fully accessible" are conclusions nobody here has earned.
    expect(prose).not.toMatch(
      /fully accessible|wcag|section 508|screen[- ]reader friendly|works for (?:everyone|all users)/i
    );
  });

  test('no countable fact is written into the words', () => {
    // Counts are read from the manifest, the browse metadata and
    // validation/data.json at render time. A number typed into a sentence is a
    // number that goes stale, which is exactly the defect the page's own
    // fine print promises it does not have.
    const numbers = Object.entries(EN_TEACHING).filter(
      ([id, text]) =>
        // The demonstration prose says physical things - "one per cent", "the
        // fourth decimal place" - and the placeholders are filled at render
        // time. What is banned is a digit standing for a size of the catalogue.
        /\b\d+\b/.test(text) && !id.startsWith('teach.demo.')
    );
    expect(numbers.map(([id]) => id)).toEqual([]);
  });
});

describe('the demonstrations', () => {
  test('there are about six of them', () => {
    // A gallery is a selection. Twelve cards is a catalogue, and the page
    // already links to the catalogue.
    expect(DEMOS.length).toBeGreaterThanOrEqual(5);
    expect(DEMOS.length).toBeLessThanOrEqual(8);
  });

  test('each names a lesson that is in the catalogue, in both languages', () => {
    for (const demo of DEMOS) {
      expect(MANIFEST.some(m => m.id === demo.lesson)).toBe(true);
      expect(MANIFEST_ES.some(m => m.id === demo.lesson)).toBe(true);
    }
  });

  test('no two of them are the same lesson', () => {
    const lessons = DEMOS.map(d => d.lesson);
    expect(new Set(lessons).size).toBe(lessons.length);
  });

  test('every one has a link, and every link belongs to one', () => {
    expect(Object.keys(DEMO_LINKS).sort()).toEqual(DEMOS.map(d => d.id).sort());
  });

  test('each link decodes to exactly the state its card describes', async () => {
    for (const demo of DEMOS) {
      const payload = await decodePayload(`#${DEMO_LINKS[demo.id]}`);
      expect(payload.s).toBe(demo.state.scenario);
      expect(payload.seed).toBe(demo.state.seed);
      expect(payload.d ?? {}).toEqual(demo.state.settings ?? {});
      // No bodies: a seeded link, rebuilt by re-running world generation under
      // the seed, which is what makes it reproducible rather than a snapshot.
      expect(payload.b).toBeUndefined();
    }
  });

  test('every one opens paused', async () => {
    // The page is about a prediction that comes before the evidence. A figure
    // already running has answered the question before the class was asked it,
    // and it is also the only thing on the page that would move unbidden.
    for (const demo of DEMOS) {
      const payload = await decodePayload(`#${DEMO_LINKS[demo.id]}`);
      expect(payload.p).toBe(1);
    }
  });

  test('each names a scenario that exists and settings that exist', () => {
    for (const demo of DEMOS) {
      expect(Object.hasOwn(SCENARIO_INFO, demo.state.scenario)).toBe(true);
      for (const key of Object.keys(demo.state.settings || {})) {
        expect(Object.hasOwn(DEFAULT_SETTINGS, key)).toBe(true);
      }
    }
  });
});

describe('the generated data is the data the generator would write', () => {
  test('the checked-in file is not stale', () => {
    // Run as the command rather than imported: the generator formats its
    // output with Prettier, which is not resolvable under the test runner in
    // the same way, and the command is what a developer and CI both run.
    expect(() =>
      execFileSync(
        process.execPath,
        ['tools/build-teaching-demos.mjs', '--check'],
        { cwd: REPO, stdio: 'pipe' }
      )
    ).not.toThrow();
  });

  test('the scenario count is the number of scenarios', () => {
    expect(SCENARIO_COUNT).toBe(Object.keys(SCENARIO_INFO).length);
  });
});

describe('the course patterns are honest about what fits', () => {
  test('every slot a pattern names is a real bucket', () => {
    for (const pattern of PATTERNS) {
      if (pattern.fit === null) continue;
      expect(LENGTHS).toContain(pattern.fit);
    }
  });

  test('no two patterns list the same slot', () => {
    // Two cards printing the identical list of lessons is a page that looks
    // padded, and it was: the lecture card used to claim the demonstration
    // bucket that the activity card is actually about.
    const slots = PATTERNS.map(p => p.fit).filter(Boolean);
    expect(new Set(slots).size).toBe(slots.length);
  });

  test('each named slot has at least one lesson in it today', () => {
    for (const pattern of PATTERNS) {
      if (!pattern.fit) continue;
      const fitting = MANIFEST.filter(m => lengthOf(m) === pattern.fit);
      expect(fitting.length).toBeGreaterThan(0);
    }
  });
});

describe('the links out of the page go somewhere', () => {
  test('every evidence link is a route in this repository or an absolute URL', () => {
    for (const { href } of EVIDENCE) {
      if (/^https?:/.test(href)) {
        expect(href).toMatch(/^https:\/\//);
        continue;
      }
      expect(
        existsSync(path.join(REPO, href.replace(/^\//, ''), 'index.html'))
      ).toBe(true);
    }
  });

  test('every instrument that offers further reading points at a page that has it', () => {
    for (const { href } of INSTRUMENTS) {
      if (!href) continue;
      const [route, fragment] = href.split('#');
      const file = path.join(REPO, route.replace(/^\//, ''), 'index.html');
      expect(existsSync(file)).toBe(true);
      if (fragment) {
        expect(readFileSync(file, 'utf8')).toContain(`id="${fragment}"`);
      }
    }
  });

  test('the page is indexable, unlike the instructor area', () => {
    // The whole point of this page is that a search committee or a colleague
    // can find it. A stray noindex would be a silent failure of its purpose.
    expect(html).not.toMatch(/name="robots"[^>]*noindex/);
    expect(readFileSync(path.join(REPO, 'sitemap.xml'), 'utf8')).toContain(
      '/teaching/'
    );
  });
});
