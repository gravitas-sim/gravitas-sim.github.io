// =============================================================================
// The Common Cartridge export (Roadmap III Prompt 169)
// -----------------------------------------------------------------------------
// js/instructorCartridge.js, its words and panel, against the profile it names:
// the IMS Thin Common Cartridge Profile v1.0 over Common Cartridge v1.3
// (tools/cartridge-profile.mjs holds the rules, from the published documents).
//
//   - every built-in course, in both languages, with and without the notes for
//     instructors, builds a cartridge the profile accepts, and every link in it
//     is the link the course makes and opens what the item names;
//   - the archive is a valid stored ZIP of the manifest and the web link files,
//     the same bytes twice, read back by a reader that shares nothing with the
//     writer;
//   - a set of broken manifests is refused, rule by rule;
//   - the real schemas are not in this repository (their licence needs a
//     registration nobody here may make), so the schema verdict is a record
//     (tests/fixtures/common-cartridge/validation.json) written by
//     `npm run cartridge:validate` against the downloaded schemas; this test
//     fails when the cartridges changed after the last run;
//   - the import status is exactly the owner's report for every platform, and the same four
//     rows are in COURSE_PACKS.md, Teach, the adopter's guide and the evidence
//     record: nothing says more than the table.
// =============================================================================

import './galacticFetch.js';
import { describe, test, expect, beforeAll } from '@jest/globals';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { existsSync, readFileSync } from 'node:fs';
import { TextDecoder, TextEncoder } from 'node:util';
import { URL } from 'node:url';

import { BUILTIN_COURSES } from '../js/data/courses/index.js';
import { itemsOf, validateCoursePack } from '../js/course/pack.js';
import { estimate } from '../js/course/review.js';
import { LESSONS, courseApi, courseFacts } from '../js/course/api.js';
import {
  COMFORTABLE_URL_LENGTH,
  courseLink,
  itemLink,
  readCourseFragment,
} from '../js/course/links.js';
import { courseManifest } from '../js/course/manifest.js';
import { loadInvestigation } from '../js/data/investigations/registry.js';
import { decodeTagged } from '../js/shareState.js';
import { DATASETS } from '../js/course/datasets.js';
import {
  PROFILE,
  NS as WRITER_NS,
  buildCartridge,
  cartridgeBytes,
  crc32,
  duration,
  esc,
  itemTitle,
  linksOf,
  manifestLike,
  zipStored,
} from '../js/instructorCartridge.js';
import {
  IMPORT_STATUS,
  REPORT_BASIS,
  WORDS,
  reportCaveat,
  statusStatement,
  tr,
} from '../js/instructorCartridgeText.js';
import {
  LONG_LINK,
  openCartridgePanel,
} from '../js/instructorCartridgeView.js';
import {
  MUTATIONS,
  NS,
  checkCartridge,
  versionFree,
} from '../tools/cartridge-profile.mjs';

// jsdom has neither; the cartridge's modules use the browser's.
globalThis.TextEncoder ??= TextEncoder;
globalThis.TextDecoder ??= TextDecoder;

const { document, DOMParser } = globalThis;
const ROOT = 'https://gravitas-sim.online/';
const parse = text => new DOMParser().parseFromString(text, 'application/xml');
const sha = text => createHash('sha256').update(text).digest('hex');
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const COURSES = Object.keys(BUILTIN_COURSES);
/** Built, profile-checked, but not in the recorded schema run (D-R10-206-08, D-R10-216-06). */
const UNVALIDATED = [
  'astronomy-semester',
  'observing-lab', // rebuilt around the observing sequence (Prompt 216, D-R10-216-06)
  'solar-system-and-the-sun',
  'stellar-astrophysics', // built around the stellar closeout (Prompt 224, D-R10-224-04)
  'upper-level-modules',
];
const LOCALES = ['en', 'es'];

/** Every course's pack, facts, links and manifest, and every cartridge built from it. */
const built = [];
const packs = new Map();

beforeAll(async () => {
  for (const id of COURSES) {
    const pack = await BUILTIN_COURSES[id]();
    const facts = await courseFacts(pack, {
      load: lesson => loadInvestigation(lesson, 'en'),
    });
    const links = await linksOf(pack, {
      itemsOf,
      itemLink,
      courseLink,
      root: ROOT,
    });
    const manifest = courseManifest(pack, facts, {
      links: links.items,
      course: links.course,
    });
    packs.set(id, { pack, facts, links, manifest });
    for (const locale of LOCALES)
      for (const notes of [false, true])
        built.push({
          id,
          locale,
          notes,
          cartridge: buildCartridge(pack, manifest, {
            locale,
            notes,
            name: item => itemTitle(item, facts, locale),
          }),
        });
  }
}, 180_000);

const filesOf = c => new Map(c.parts.map(p => [p.path, p.text]));

describe('the profile', () => {
  test('is the Thin Common Cartridge profile v1.0 over Common Cartridge v1.3, and says so', () => {
    expect(PROFILE).toMatchObject({
      name: 'Thin Common Cartridge',
      schema: 'IMS Thin Common Cartridge',
      schemaVersion: '1.3.0',
      profileVersion: '1.0',
      base: 'Common Cartridge 1.3',
      extension: 'imscc',
    });
    expect(WRITER_NS).toEqual({ ...NS, xsi: expect.any(String) });
    const doc = read('COURSE_PACKS.md');
    for (const must of [
      'Thin Common Cartridge Profile v1.0',
      'Common Cartridge v1.3',
      'imscp_v1p1',
      '.imscc',
    ])
      expect(doc).toContain(must);
  });

  test('a link longer than the comfortable length is warned about at the length the app uses', () => {
    expect(LONG_LINK).toBe(COMFORTABLE_URL_LENGTH);
  });
});

describe('every built-in course', () => {
  test('there are six courses, each built in two languages with and without notes', () => {
    expect(COURSES.sort()).toEqual([
      'astronomy-semester',
      'intro-astronomy',
      'observing-lab',
      'solar-system-and-the-sun',
      'stellar-astrophysics',
      'upper-level-modules',
    ]);
    expect(built).toHaveLength(24);
  });

  test('every cartridge conforms to the profile', () => {
    for (const { id, locale, notes, cartridge } of built) {
      const problems = checkCartridge(
        parse,
        cartridge.manifest,
        filesOf(cartridge)
      );
      expect({ id, locale, notes, problems }).toEqual({
        id,
        locale,
        notes,
        problems: [],
      });
    }
  });

  test('one module for each unit, one link for each item, and nothing left out', () => {
    for (const { id, cartridge } of built) {
      const { pack, manifest } = packs.get(id);
      const items = itemsOf(pack).length;
      const noted = pack.units.filter(u =>
        u.items.some(i => i.teacherNote)
      ).length;
      expect(cartridge.left).toEqual([]);
      expect(cartridge.counts.modules).toBe(pack.units.length + 1);
      expect(cartridge.counts.links).toBe(
        items + 1 + (pack.teacherGuide ? 1 : 0) + noted
      );
      expect(manifest.items).toHaveLength(items);
    }
  });

  test('every link is the link the course makes, in the cartridge’s language, and opens what the item names', async () => {
    let checked = 0;
    for (const { id, locale, cartridge } of built) {
      const { pack, manifest } = packs.get(id);
      const files = filesOf(cartridge);
      const href = rid => {
        const d = parse(files.get(`r-${rid}.xml`));
        return d.documentElement
          .getElementsByTagNameNS(NS.wl, 'url')[0]
          .getAttribute('href');
      };
      for (const { item } of itemsOf(pack)) {
        const made = manifest.items.find(m => m.id === item.id).links;
        const url = href(item.id);
        expect(url).toBe(made[locale] || made.en);
        const u = new URL(url);
        expect(u.protocol).toBe('https:');
        switch (item.kind) {
          case 'lesson':
            expect(u.hash.startsWith(`#investigation=${item.lesson}`)).toBe(
              true
            );
            expect(LESSONS.some(l => l.id === item.lesson)).toBe(true);
            break;
          case 'assignment': {
            const { payload } = await decodeTagged('a', u.hash, 2);
            expect(payload.l).toBe(item.lesson);
            expect(payload.s).toEqual(item.steps);
            break;
          }
          case 'dataset':
            expect(u.search).toBe(`?open=${item.dataset}`);
            expect(DATASETS.some(d => d.id === item.dataset)).toBe(true);
            break;
          case 'guide':
            expect(u.search.startsWith(`?guide=${item.guide}`)).toBe(true);
            break;
          case 'scenario':
            expect(u.hash.length).toBeGreaterThan(8);
            break;
          case 'reading':
            expect(url).toBe(
              item.cite.url ||
                `https://doi.org/${item.cite.doi.split('/').map(encodeURIComponent).join('/')}`
            );
            break;
        }
        checked += 1;
      }
      // The course home link carries the whole pack.
      expect(
        await readCourseFragment(new URL(href('course-home')).hash)
      ).toEqual(pack);
    }
    expect(checked).toBeGreaterThan(400);
  });

  test('the packs are valid and the titles are real words, not ids', () => {
    for (const [id, { pack, facts }] of packs) {
      expect(validateCoursePack(pack, courseApi())).toEqual([]);
      for (const locale of LOCALES)
        for (const { item } of itemsOf(pack)) {
          const title = itemTitle(item, facts, locale);
          expect(title.trim().length).toBeGreaterThan(3);
          expect({
            id,
            item: item.id,
            ok: title !== item.id && title !== item.guide,
          }).toEqual({ id, item: item.id, ok: true });
        }
    }
  });

  test('the cartridge’s own text follows the language: Spanish carries no English frame words', () => {
    for (const { locale, cartridge, notes } of built) {
      expect(cartridge.manifest).toContain(
        `<lomm:language>${locale}</lomm:language>`
      );
      expect(cartridge.file.endsWith(`-${locale}.imscc`)).toBe(true);
      const own = tr(locale, 'c.rights');
      expect(cartridge.manifest).toContain(esc(own));
      if (locale === 'es') {
        expect(cartridge.manifest).not.toContain('Course home');
        expect(cartridge.manifest).not.toContain(WORDS.en['c.guide.title']);
        expect(cartridge.manifest).toContain(tr('es', 'c.home'));
      }
      if (locale === 'en' && !notes)
        expect(cartridge.manifest).not.toMatch(/Notas para/);
    }
  });

  test('the cartridge is the same text twice, with no date and no student in it', () => {
    const { pack, facts, manifest } = packs.get('intro-astronomy');
    const again = buildCartridge(pack, manifest, {
      locale: 'en',
      notes: false,
      name: item => itemTitle(item, facts, 'en'),
    });
    const first = built.find(
      b => b.id === 'intro-astronomy' && b.locale === 'en' && !b.notes
    ).cartridge;
    expect(again.manifest).toBe(first.manifest);
    expect(
      Buffer.from(cartridgeBytes(again)).equals(
        Buffer.from(cartridgeBytes(first))
      )
    ).toBe(true);
    expect(first.manifest).not.toMatch(
      /\b20\d\d-\d\d-\d\d\b|localStorage|student@|roster/i
    );
  });

  test('the kit’s path (links and times, no manifest module) makes the same cartridge as the builder’s', async () => {
    for (const id of COURSES) {
      const { pack, facts, links, manifest } = packs.get(id);
      const like = manifestLike(pack, links, estimate(pack, facts), itemsOf);
      for (const locale of LOCALES) {
        const opts = {
          locale,
          notes: true,
          name: item => itemTitle(item, facts, locale),
        };
        expect(buildCartridge(pack, like, opts).manifest).toBe(
          buildCartridge(pack, manifest, opts).manifest
        );
      }
    }
  });
});

describe('the notes for instructors', () => {
  test('are not in the cartridge unless asked for, and then only on a link for instructors', () => {
    const { pack } = packs.get('intro-astronomy');
    const texts = itemsOf(pack)
      .map(x => x.item.teacherNote?.en)
      .filter(Boolean);
    expect(texts.length).toBeGreaterThan(0);
    const off = built.find(
      b => b.id === 'intro-astronomy' && b.locale === 'en' && !b.notes
    ).cartridge;
    const on = built.find(
      b => b.id === 'intro-astronomy' && b.locale === 'en' && b.notes
    ).cartridge;
    for (const t of texts) {
      expect(off.manifest).not.toContain(esc(t));
      expect(on.manifest).toContain(esc(t));
    }
    // Each place the text appears is a resource whose only role is Instructor.
    const doc = parse(on.manifest);
    for (const r of doc.getElementsByTagNameNS(NS.cp, 'resource')) {
      const roles = [...r.getElementsByTagNameNS(NS.lomr, 'value')].map(
        v => v.textContent
      );
      const holds = texts.some(t => r.textContent.includes(t));
      if (holds) expect(roles).toEqual(['Instructor']);
      else
        expect(roles).toEqual(
          /^r-(notes-|teacher-guide)/.test(r.getAttribute('identifier'))
            ? ['Instructor']
            : ['Learner', 'Instructor']
        );
    }
  });
});

describe('the archive', () => {
  /** A reader that shares nothing with the writer: the end record, the central directory, the local headers. */
  function unzip(bytes) {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let e = bytes.length - 22;
    while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e -= 1;
    expect(e).toBeGreaterThanOrEqual(0);
    const count = v.getUint16(e + 10, true);
    let at = v.getUint32(e + 16, true);
    const out = [];
    for (let i = 0; i < count; i++) {
      expect(v.getUint32(at, true)).toBe(0x02014b50);
      const method = v.getUint16(at + 10, true);
      const crc = v.getUint32(at + 16, true);
      const size = v.getUint32(at + 20, true);
      const nameLen = v.getUint16(at + 28, true);
      const extra = v.getUint16(at + 30, true);
      const comment = v.getUint16(at + 32, true);
      const local = v.getUint32(at + 42, true);
      const name = new TextDecoder().decode(
        bytes.subarray(at + 46, at + 46 + nameLen)
      );
      expect(v.getUint32(local, true)).toBe(0x04034b50);
      const start =
        local +
        30 +
        v.getUint16(local + 26, true) +
        v.getUint16(local + 28, true);
      out.push({
        name,
        method,
        crc,
        data: bytes.subarray(start, start + size),
        date: v.getUint16(at + 14, true),
      });
      at += 46 + nameLen + extra + comment;
    }
    return out;
  }
  /** CRC-32 one bit at a time: no table, nothing in common with crc32(). */
  function slowCrc(data) {
    let c = 0xffffffff;
    for (const b of data) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  test('holds the manifest first, then one XML file for each link, stored, with their own checksums', () => {
    for (const { cartridge } of built) {
      const entries = unzip(cartridgeBytes(cartridge));
      expect(entries.map(e => e.name)).toEqual([
        'imsmanifest.xml',
        ...cartridge.parts.map(p => p.path),
      ]);
      expect(entries).toHaveLength(cartridge.counts.links + 1);
      for (const e of entries) {
        expect(e.method).toBe(0);
        expect(e.date).toBe(0x21);
        expect(e.crc).toBe(slowCrc(e.data));
      }
      expect(new TextDecoder().decode(entries[0].data)).toBe(
        cartridge.manifest
      );
      const bytes = new Map(
        entries.map(e => [e.name, new TextDecoder().decode(e.data)])
      );
      const files = new Map(
        [...bytes].filter(([n]) => n !== 'imsmanifest.xml')
      );
      expect(
        checkCartridge(parse, bytes.get('imsmanifest.xml'), files)
      ).toEqual([]);
    }
  });

  test('crc32 is ZIP’s, and an empty or odd name survives', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
    const z = unzip(
      zipStored([
        { path: 'données.xml', bytes: new TextEncoder().encode('<a/>') },
      ])
    );
    expect(z[0].name).toBe('données.xml');
  });
});

describe('a cartridge that breaks the profile is refused, rule by rule', () => {
  const base = () =>
    built.find(b => b.id === 'intro-astronomy' && b.locale === 'en' && !b.notes)
      .cartridge;
  const mutate = (change, rule) => {
    const c = base();
    const text = change(c.manifest);
    expect(text).not.toBe(c.manifest);
    const found = checkCartridge(parse, text, filesOf(c));
    expect(found.length).toBeGreaterThan(0);
    expect(found.some(m => m.includes(`[${rule}`))).toBe(true);
  };

  test.each(MUTATIONS.map(m => [m.name, m.change, m.rule]))(
    '%s',
    (_, change, rule) => mutate(change, rule)
  );

  test('a web link file that is not a web link, or has no address, or sits in a folder', () => {
    const c = base();
    const manifest = c.manifest;
    const files = filesOf(c);
    const first = c.parts[0].path;
    const swap = (path, text) => new Map([...files, [path, text]]);
    expect(
      checkCartridge(parse, manifest, swap(first, '<a/>')).some(m =>
        m.includes('TCC 4.3.4')
      )
    ).toBe(true);
    expect(
      checkCartridge(
        parse,
        manifest,
        swap(
          first,
          files.get(first).replace(/href="[^"]*"/, 'href="javascript:alert(1)"')
        )
      ).some(m => m.includes('http(s)'))
    ).toBe(true);
    const withExtra = new Map(files).set('sub/extra.xml', '<webLink/>');
    expect(
      checkCartridge(parse, manifest, withExtra).some(m =>
        m.includes('in a folder')
      )
    ).toBe(true);
  });
});

describe('the words', () => {
  test('both languages have every word, with the same slots', () => {
    expect(Object.keys(WORDS.es).sort()).toEqual(Object.keys(WORDS.en).sort());
    const slots = s => (s.match(/\{\w+\}/g) || []).sort().join();
    for (const id of Object.keys(WORDS.en))
      expect({ id, slots: slots(WORDS.es[id]) }).toEqual({
        id,
        slots: slots(WORDS.en[id]),
      });
  });

  test('minutes are said as the course home says them', () => {
    expect(duration({ lo: 40, hi: 40 }, 'en')).toBe('40 min');
    expect(duration({ lo: 25, hi: 40 }, 'es')).toBe('25–40 min');
    expect(duration({ lo: 270, hi: 270 }, 'en')).toBe('4.5 h');
    expect(duration({ lo: 270, hi: 270 }, 'es')).toBe('4,5 h');
    expect(duration(undefined, 'en')).toBe('');
  });

  test('markup in a text cannot leave the text', () => {
    expect(esc('a < b & "c" > \u0001d')).toBe(
      'a &lt; b &amp; &quot;c&quot; &gt; d'
    );
  });
});

describe('what the cartridge says it has been imported into', () => {
  const BASIS =
    'verified by Carl, reported in chat 2026-10-22; LMS versions, the cartridge imported and what imported were not supplied';

  test('is exactly what the owner reported, and nothing is invented: four platforms, one basis, no date of import, version or screenshot', () => {
    expect(IMPORT_STATUS.map(r => r.lms)).toEqual([
      'Canvas',
      'Moodle',
      'D2L',
      'Blackboard',
    ]);
    expect(REPORT_BASIS).toBe(BASIS);
    for (const r of IMPORT_STATUS)
      expect(r).toEqual({
        lms: r.lms,
        status: 'VERIFIED',
        date: null,
        seen: null,
        reported: '2026-10-22',
        basis: BASIS,
      });
    // The panel's own words say the same basis in English, and the Spanish names the same facts.
    expect(WORDS.en['p.basis']).toBe(BASIS);
    expect(WORDS.es['p.basis']).toMatch(
      /Carl.*2026-10-22.*no se proporcionaron/
    );
    expect(Object.keys(IMPORT_STATUS[0]).sort()).toEqual(
      ['basis', 'date', 'lms', 'reported', 'seen', 'status'].sort()
    );
  });

  test('a row that claims a recorded import must carry its date and what appeared, and a row that is not verified carries nothing', () => {
    // The rule the table is held to for a later, recorded import.
    const recorded = {
      lms: 'Canvas',
      status: 'VERIFIED',
      date: '2027-01-05',
      seen: 'modules and links',
    };
    expect(recorded.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(recorded.seen.length).toBeGreaterThan(10);
    expect(
      statusStatement('en', [
        recorded,
        { lms: 'Moodle', status: 'NOT VERIFIED', date: null, seen: null },
      ])
    ).toBe(
      'exports a Thin Common Cartridge; imports verified on: Canvas (Canvas: VERIFIED 2027-01-05; Moodle: NOT VERIFIED)'
    );
    expect(
      statusStatement('es', [
        { lms: 'Moodle', status: 'NOT VERIFIED', date: null, seen: null },
      ])
    ).toBe(
      'exporta un Thin Common Cartridge; importaciones verificadas en: ninguna (Moodle: SIN VERIFICAR)'
    );
    expect(reportCaveat('en', [recorded])).toBe('');
  });

  test('is one sentence, the contract’s, in both languages, with the report’s caveat beside it', () => {
    expect(statusStatement('en')).toBe(
      'exports a Thin Common Cartridge; imports verified on: Canvas, Moodle, D2L, Blackboard (Canvas: VERIFIED, reported 2026-10-22; Moodle: VERIFIED, reported 2026-10-22; D2L: VERIFIED, reported 2026-10-22; Blackboard: VERIFIED, reported 2026-10-22)'
    );
    expect(statusStatement('es')).toBe(
      'exporta un Thin Common Cartridge; importaciones verificadas en: Canvas, Moodle, D2L, Blackboard (Canvas: VERIFICADO, informado el 2026-10-22; Moodle: VERIFICADO, informado el 2026-10-22; D2L: VERIFICADO, informado el 2026-10-22; Blackboard: VERIFICADO, informado el 2026-10-22)'
    );
    expect(reportCaveat('en')).toBe(
      'Reported by Carl in chat on 2026-10-22; the LMS versions, the cartridge imported and what imported were not supplied.'
    );
    expect(reportCaveat('es')).toBe(
      'Informado por Carl en el chat el 2026-10-22; no se proporcionaron las versiones de cada plataforma, el cartucho importado ni lo que se importó.'
    );
  });

  test('is the same in COURSE_PACKS.md’s table, Teach, the adopter’s guide, the evidence record and the panel', () => {
    const packs = read('COURSE_PACKS.md');
    const table = packs.slice(packs.indexOf('| Platform |'));
    const rows = table
      .split('\n')
      .slice(2, 2 + IMPORT_STATUS.length)
      .map(l =>
        l
          .split('|')
          .map(c => c.trim())
          .filter(Boolean)
      );
    expect(rows).toEqual(IMPORT_STATUS.map(r => [r.lms, r.status, r.basis]));
    for (const lang of ['en', 'es']) {
      const said = `Gravitas ${statusStatement(lang)}. ${reportCaveat(lang)}`;
      expect(read('teaching/index.html')).toContain(said);
      expect(read('teaching/adopt/index.html')).toContain(said);
    }
    const ev = JSON.parse(read('tools/evidence-status.json')).claims.find(
      c => c.id === 'cartridge-lms-import'
    );
    // The owner's report, not a recorded import: partial, never established.
    expect(ev).toMatchObject({ class: 'A', status: 'partial' });
    expect(ev.limitations).toContain(
      'each verified by Carl, reported in chat 2026-10-22; LMS versions, the cartridge imported and what imported were not supplied'
    );
    expect(ev.limitations).toContain(
      'Canvas: VERIFIED; Moodle: VERIFIED; D2L: VERIFIED; Blackboard: VERIFIED'
    );
    expect(ev.anchors.map(x => x.text)).toEqual([
      `${statusStatement('en')}`,
      `${statusStatement('en')}`,
    ]);
    const guideRow = read('ADOPTER_GUIDE.md')
      .split('\n')
      .find(l =>
        l.includes('exports a Thin Common Cartridge; imports verified on')
      );
    expect(guideRow).toContain(
      `Gravitas ${statusStatement('en')}. ${reportCaveat('en')}`
    );
  });

  test('is never more than the table: no sentence says a platform works', () => {
    for (const file of [
      'teaching/index.html',
      'teaching/adopt/index.html',
      'COURSE_PACKS.md',
      'ADOPTER_GUIDE.md',
      'js/instructorCartridgeText.js',
    ]) {
      const text = read(file);
      expect(text).not.toMatch(
        /(imports?|import) (cleanly|correctly|without)|works? (in|with|on) (Canvas|Moodle|D2L|Blackboard)|compatible with (Canvas|Moodle|D2L|Blackboard)|certified|1EdTech (conformant|certified)/i
      );
    }
  });
});

describe('the panel', () => {
  const host = () => {
    const el = document.createElement('section');
    document.body.append(el);
    return el;
  };
  const make = (over = {}) => {
    const { pack, facts, manifest } = packs.get('intro-astronomy');
    const saved = [];
    const ctx = {
      host: host(),
      source: () => pack,
      manifest: () => manifest,
      nameOf: (p, id) =>
        itemTitle(itemsOf(p).find(x => x.item.id === id).item, facts, ctx.lang),
      download: (...a) => saved.push(a),
      locale: () => ctx.lang,
      lang: 'en',
      ...over,
    };
    return { ctx, saved };
  };

  test('says what the file is, shows the table, and makes the file', () => {
    const { ctx, saved } = make();
    openCartridgePanel(ctx);
    const h = ctx.host;
    expect(h.querySelector('#cc-h').textContent).toBe(
      'Export a Common Cartridge'
    );
    expect(h.querySelector('#cc-status').textContent).toBe(
      `Gravitas ${statusStatement('en')}.`
    );
    expect(
      [...h.querySelectorAll('#cc-table tbody tr')].map(r => r.textContent)
    ).toEqual(
      IMPORT_STATUS.map(r => `${r.lms}${r.status}${WORDS.en['p.basis']}`)
    );
    expect(h.querySelector('#cc-count').textContent).toMatch(
      /^16 links in 5 modules\./
    );
    h.querySelector('#cc-go').click();
    expect(saved).toHaveLength(1);
    const [name, bytes, type] = saved[0];
    expect(name).toBe('intro-astronomy-en.imscc');
    expect(type).toBe('application/zip');
    expect(new TextDecoder().decode(bytes.subarray(30, 45))).toBe(
      'imsmanifest.xml'
    );
    expect(h.querySelector('#cc-made').textContent).toMatch(
      /^Saved intro-astronomy-en\.imscc: 16 links in 5 modules\.$/
    );
  });

  test('puts the notes in only when the box is ticked, and says it in Spanish on a Spanish page', () => {
    const { ctx, saved } = make({ lang: 'es' });
    openCartridgePanel(ctx);
    const h = ctx.host;
    expect(h.querySelector('#cc-h').textContent).toBe(
      'Exportar un Common Cartridge'
    );
    expect(h.querySelector('#cc-status').textContent).toBe(
      `Gravitas ${statusStatement('es')}.`
    );
    h.querySelector('#cc-go').click();
    const plain = new TextDecoder().decode(saved[0][1]);
    h.querySelector('#cc-notes').click();
    h.querySelector('#cc-go').click();
    const noted = new TextDecoder().decode(saved[1][1]);
    expect(noted.length).toBeGreaterThan(plain.length);
    expect(saved[0][0]).toBe('intro-astronomy-es.imscc');
  });

  test('offers no file while the course has problems', () => {
    const { ctx, saved } = make({ manifest: () => null });
    openCartridgePanel(ctx);
    expect(ctx.host.querySelector('#cc-go')).toBeNull();
    expect(ctx.host.querySelector('#cc-fix').textContent).toBe(
      tr('en', 'p.fixFirst')
    );
    expect(saved).toEqual([]);
  });

  test('closes, and a refresh while closed draws nothing', () => {
    const { ctx } = make();
    const panel = openCartridgePanel(ctx);
    ctx.host.querySelector('#cc-close').click();
    expect(ctx.host.hidden).toBe(true);
    panel.refresh();
    expect(ctx.host.textContent).toBe('');
  });
});

describe('the link the course home carries', () => {
  // What the digests in validation.json leave out, by design: the deflated
  // fragment, whose bytes differ between Node versions. Its content does not.
  test('opens the very course the cartridge was made from, in every cartridge', async () => {
    for (const b of built) {
      const part = b.cartridge.parts.find(p =>
        /\/course\/#c[A-Za-z0-9_-]{24,}"/.test(p.text)
      );
      expect(part).toBeDefined();
      const fragment = part.text.match(/\/course\/#(c[A-Za-z0-9_-]+)"/)[1];
      expect(await readCourseFragment(fragment)).toEqual(
        JSON.parse(JSON.stringify(packs.get(b.id).pack))
      );
    }
  });
});

describe('the record of the real schemas', () => {
  const dir = 'tests/fixtures/common-cartridge';

  test('names each source file with its address, size, SHA-256 and licence, and commits none of them', () => {
    const prov = JSON.parse(read(`${dir}/provenance.json`));
    expect(prov.profile).toBe(
      'Thin Common Cartridge Profile v1.0 over Common Cartridge v1.3'
    );
    expect(prov.committed).toBe(false);
    expect(prov.sources.length).toBeGreaterThanOrEqual(10);
    for (const s of prov.sources) {
      expect(s.url).toMatch(/^https:\/\/www\.imsglobal\.org\//);
      expect(s.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(s.bytes).toBeGreaterThan(1000);
      expect(s.retrieved).toBe('2026-10-22');
      expect(['schema', 'document', 'licence']).toContain(s.kind);
      expect(s.redistributed).toBe(false);
    }
    for (const f of ['xsd', 'html'])
      expect(existsSync(new URL(`../${dir}/${f}`, import.meta.url))).toBe(
        false
      );
    expect(prov.licence.quote).toContain('registration');
    expect(prov.membersOnly.length).toBeGreaterThan(0);
  });

  test('holds the verdict of the schema run for the cartridges as they are now', () => {
    const rec = JSON.parse(read(`${dir}/validation.json`));
    expect(rec.tool).toBe('tools/cartridge-validate.mjs');
    expect(rec.xmllint).toMatch(/libxml/);
    const key = ({ id, locale, notes }) =>
      `${id}/${locale}/${notes ? 'notes' : 'plain'}`;
    const have = new Map(rec.cartridges.map(c => [key(c), c]));
    // Prompt 206 (D-R10-206-08): three courses are not in the recorded run, and
    // the schemas are not here to repeat it: the new course, and the two whose
    // items or description Prompt 206 changed (so their manifests differ from
    // the recorded ones). They are held to the profile checker above, and to
    // nothing else, until a person with the 1EdTech schemas runs
    // tools/cartridge-validate.mjs --write. The evidence record says so.
    const validated = built.filter(b => !UNVALIDATED.includes(b.id));
    expect(validated).toHaveLength(built.length - UNVALIDATED.length * 4);
    expect(rec.cartridges.length).toBe(16);
    for (const b of validated) {
      const c = have.get(key(b));
      expect(c).toBeDefined();
      expect({ k: key(b), sha: c.manifestSha256 }).toEqual({
        k: key(b),
        sha: sha(b.cartridge.manifest),
      });
      expect(c.parts).toBe(b.cartridge.parts.length);
      expect(c.partsSha256).toBe(
        sha(
          b.cartridge.parts
            .map(p => `${p.path}\n${versionFree(p.text)}`)
            .join('\u0000')
        )
      );
      expect(c.manifestSchema).toBe('valid');
      expect(c.webLinkSchema).toBe('valid');
      expect(c.profile).toBe('valid');
    }
    // Every broken manifest is refused by the checker; where the schema refuses it
    // too, the two agree, and where only the profile does, the record says so.
    expect(rec.agreement.map(a => a.name)).toEqual(MUTATIONS.map(m => m.name));
    for (const a of rec.agreement) {
      expect(a.checker).toBe('refused');
      expect(['invalid', 'valid']).toContain(a.xmllint);
    }
    expect(
      rec.agreement.filter(a => a.xmllint === 'invalid').length
    ).toBeGreaterThanOrEqual(4);
  });

  test('the readable example is the cartridge as built', () => {
    const b = built.find(
      x => x.id === 'intro-astronomy' && x.locale === 'en' && !x.notes
    );
    expect(read(`${dir}/example-intro-astronomy-en.imsmanifest.xml`)).toBe(
      b.cartridge.manifest
    );
  });
});
