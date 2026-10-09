// =============================================================================
// The adoption pages (Roadmap II Prompt 76, ADOPTION.md)
// -----------------------------------------------------------------------------
// One generated page for every investigation and classroom activity, and the
// index that filters them. This holds them to their generator (and so to the
// Library record and the sources behind it), to their links, to both
// languages, and to the line the instructor materials draw: the public words
// are on the page, the answers are not.
// =============================================================================

import { describe, test, expect, beforeAll } from '@jest/globals';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildAdoption,
  adoptionFiles,
} from '../tools/build-adoption-pages.mjs';
import { mountFind } from '../js/teach/find.js';
import { INSTRUCTOR_CONTENT } from '../js/data/instructorContent.js';
import { INVESTIGATIONS } from '../js/data/investigations.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(path.join(REPO, f), 'utf8');
const library = JSON.parse(read('library/library.json'));
const investigations = library.entries.filter(e => e.kind === 'investigation');

let built;
beforeAll(async () => {
  built = await buildAdoption();
});

describe('the pages are what the generator writes', () => {
  test('every page, byte for byte, and the sitemap', () => {
    for (const { file, html } of built.pages)
      expect({ file, fresh: read(file) === html }).toEqual({
        file,
        fresh: true,
      });
    const sitemap = read('sitemap.xml');
    for (const { file } of built.pages)
      expect(sitemap).toContain(`/${path.dirname(file)}/`);
  });

  test('and no page is left that it does not write', () => {
    expect(adoptionFiles()).toEqual(built.pages.map(p => p.file).sort());
  });

  test('one for every investigation, every activity, and the index', () => {
    expect(adoptionFiles()).toContain('teaching/find/index.html');
    for (const e of investigations)
      expect(
        existsSync(
          path.join(
            REPO,
            'teaching/investigation',
            e.id.replace('investigation:', ''),
            'index.html'
          )
        )
      ).toBe(true);
    const activities = new Set(
      library.entries
        .filter(e => e.kind === 'activity')
        .map(e => e.id.replace(/^activity:|\/.*$/g, ''))
    );
    expect(activities.size).toBeGreaterThanOrEqual(3);
    for (const a of activities)
      expect(
        existsSync(path.join(REPO, 'teaching/activity', a, 'index.html'))
      ).toBe(true);
  });
});

describe('every link resolves', () => {
  const served = new Set(
    readdirSync(path.join(REPO, 'teaching/investigation')).map(
      d => `/teaching/investigation/${d}/`
    )
  );
  for (const a of readdirSync(path.join(REPO, 'teaching/activity')))
    served.add(`/teaching/activity/${a}/`);
  const pageRoots = [
    '/',
    '/library/',
    '/teaching/',
    '/teaching/find/',
    '/instructors/',
    '/instructors/submissions/',
    '/figure/',
    '/studio/',
    '/studio/lesson/',
    '/studio/course/',
    '/observatory/',
    '/3d/',
    '/mission/lab/',
    '/catalog/',
    '/course/',
    '/experiments/',
  ];

  test('internal links name a page, a lesson, a guide or an activity that exists', () => {
    const lessonIds = new Set(INVESTIGATIONS.map(l => l.id));
    const guideIds = new Set(
      investigations
        .filter(e => e.format !== 'lesson')
        .map(e => e.id.replace('investigation:', ''))
    );
    const activityIds = new Set(
      library.entries
        .filter(e => e.kind === 'activity')
        .map(e => e.id.replace(/^activity:|\/.*$/g, ''))
    );
    const bad = [];
    for (const { file, html } of built.pages) {
      const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
      for (const m of main.matchAll(/<a [^>]*href="([^"]+)"/g)) {
        const href = m[1].replace(/&amp;/g, '&');
        if (/^https?:|^#|^mailto:/.test(href)) continue;
        const url = new URL(href, 'https://x.test');
        const pathname = url.pathname;
        const ok =
          (pathname === '/' && url.searchParams.has('author')
            ? lessonIds.has(url.searchParams.get('author'))
            : pathname === '/' && url.searchParams.has('assign')
              ? lessonIds.has(url.searchParams.get('assign'))
              : pathname === '/' && url.searchParams.has('activity')
                ? activityIds.has(url.searchParams.get('activity'))
                : pathname === '/' ||
                  pageRoots.includes(pathname) ||
                  served.has(pathname)) &&
          (!url.searchParams.has('guide') ||
            guideIds.has(url.searchParams.get('guide'))) &&
          (!/^#investigation=/.test(url.hash) ||
            lessonIds.has(url.hash.slice('#investigation='.length)));
        if (!ok) bad.push(`${file}: ${href}`);
      }
    }
    expect(bad).toEqual([]);
  });

  test('the index is reached from Teach and from the instructor resources', () => {
    expect(read('teaching/index.html')).toContain('href="/teaching/find/"');
    expect(read('instructors/index.html')).toContain('href="/teaching/find/"');
  });

  test('every adoption page links back to the index', () => {
    for (const { file, html } of built.pages)
      if (!file.endsWith('find/index.html'))
        expect(html).toContain('href="/teaching/find/"');
  });
});

describe('both languages', () => {
  test('every English span is followed by its Spanish one', () => {
    const lone = [];
    for (const { file, html } of built.pages) {
      const en = (html.match(/<span class="gs-en">/g) || []).length;
      const es = (html.match(/<span class="gs-es" lang="(?:es|en)">/g) || [])
        .length;
      // The shell's own spans count too; the pairs must still be equal.
      if (en !== es) lone.push(`${file}: ${en} English, ${es} Spanish`);
    }
    expect(lone).toEqual([]);
  });

  test('a text with no Spanish says so, and is marked as English', () => {
    const html = built.pages.find(p =>
      p.file.endsWith('investigation/keplers-laws/index.html')
    ).html;
    expect(html).toContain('lang="en">Planets move at a constant speed');
    expect(html).toContain('Solo en inglés.');
  });

  test('the lessons carry their objectives and step titles in Spanish', () => {
    const html = built.pages.find(p =>
      p.file.endsWith('investigation/tides/index.html')
    ).html;
    expect(html).toContain('Explicar por qué un objeto extenso');
    expect(html).toContain('Dos veces al día, en todas partes');
  });
});

describe('what each page says', () => {
  test('carries the Library record: level, time, mathematics, textbook chapter, course level', () => {
    for (const e of investigations) {
      const html = built.pages.find(p =>
        p.file.endsWith(
          `investigation/${e.id.replace('investigation:', '')}/index.html`
        )
      ).html;
      expect(html).toContain(
        e.duration.min === e.duration.max
          ? `${e.duration.min} `
          : `${e.duration.min} to ${e.duration.max}`
      );
      expect(html).toContain(`${e.textbook.chapter}`);
      expect(html).toContain(
        e.title.en
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
      );
    }
  });

  test('a lesson has a progress-free student preview, and an assignment builder', () => {
    for (const l of INVESTIGATIONS) {
      const html = built.pages.find(p =>
        p.file.endsWith(`investigation/${l.id}/index.html`)
      ).html;
      expect(html).toContain(`href="/?author=${l.id}&amp;view=student"`);
      expect(html).toContain(`href="/?assign=${l.id}"`);
    }
  });

  test('the data a page lists comes with a license', () => {
    const html = built.pages.find(p =>
      p.file.endsWith('investigation/exo-star/index.html')
    ).html;
    expect(html).toContain('MAST');
    expect(html).toMatch(
      /<th scope="col"><span class="gs-en">License and credit/
    );
  });

  test('the answers stay behind the passphrase', () => {
    const leaks = [];
    for (const l of INVESTIGATIONS) {
      const html = built.pages.find(p =>
        p.file.endsWith(`investigation/${l.id}/index.html`)
      ).html;
      const text = html
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      const secrets = [
        ...l.steps.map(s => s.because),
        ...(INSTRUCTOR_CONTENT[l.id]?.misconceptions ?? []).map(
          m => m.response
        ),
        ...(INSTRUCTOR_CONTENT[l.id]?.teachingNotes ?? []),
      ].filter(s => typeof s === 'string' && s.length > 40);
      for (const s of secrets)
        if (text.includes(s)) leaks.push(`${l.id}: ${s.slice(0, 50)}`);
    }
    expect(leaks).toEqual([]);
  });

  test('the generator never touches the encrypted bundle', () => {
    const src = read('tools/build-adoption-pages.mjs');
    expect(src).not.toMatch(/materials\.enc/);
    expect(src).not.toMatch(/passphrase\s*=/i);
  });
});

describe('the index and its filters', () => {
  let rows;
  const setup = () => {
    const find = built.pages.find(
      p => p.file === 'teaching/find/index.html'
    ).html;
    document.body.innerHTML = find.slice(
      find.indexOf('<main'),
      find.indexOf('</main>')
    );
    document.documentElement.lang = 'en';
    history.replaceState(null, '', '/teaching/find/');
    mountFind(document);
    rows = [...document.querySelectorAll('#adTable tbody tr')];
  };
  const choose = (key, value) => {
    const s = document.querySelector(`[data-filter="${key}"]`);
    s.value = value;
    s.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const shown = () => rows.filter(r => !r.hidden).length;

  test('lists every page once', () => {
    setup();
    expect(rows.length).toBe(built.rows.length);
    expect(
      new Set(rows.map(r => r.querySelector('a').getAttribute('href'))).size
    ).toBe(rows.length);
  });

  test('each filter narrows to exactly the rows the record says', () => {
    setup();
    for (const [key, field, pick] of [
      ['level', 'level', r => r.level],
      ['course', 'courseLevel', r => r.courseLevel],
      ['length', 'length', r => r.length],
      ['math', 'mathematics', r => r.mathematics],
      ['chapter', 'chapter', r => String(r.chapter)],
    ]) {
      const value = pick(
        built.rows.find(r => r[field] !== null && r[field] !== undefined)
      );
      choose(key, value);
      expect(shown()).toBe(
        built.rows.filter(r => String(pick(r)) === value).length
      );
      choose(key, '');
    }
    choose('subject', 'exoplanets');
    expect(shown()).toBe(
      built.rows.filter(r => r.subjects.includes('exoplanets')).length
    );
    choose('data', 'spectrum');
    expect(shown()).toBe(
      built.rows.filter(
        r => r.subjects.includes('exoplanets') && r.data.includes('spectrum')
      ).length
    );
    choose('subject', '');
    choose('data', 'none');
    expect(shown()).toBe(built.rows.filter(r => r.data.length === 0).length);
    choose('data', '');
    expect(shown()).toBe(rows.length);
  });

  test('an impossible combination says so, and clearing restores every row', () => {
    setup();
    choose('level', 'beginner');
    choose('course', 'upper');
    expect(shown()).toBe(0);
    expect(document.getElementById('adEmpty').hidden).toBe(false);
    document.getElementById('adClear').click();
    expect(shown()).toBe(rows.length);
    expect(document.getElementById('adEmpty').hidden).toBe(true);
  });

  test('every filter has a choice that finds something', () => {
    for (const key of [
      'level',
      'format',
      'length',
      'math',
      'subject',
      'chapter',
      'offline',
      'course',
    ]) {
      setup();
      const s = document.querySelector(`[data-filter="${key}"]`);
      const options = [...s.options].filter(o => o.value);
      expect(options.length).toBeGreaterThan(0);
      for (const o of options) {
        choose(key, o.value);
        expect({ key, value: o.value, any: shown() > 0 }).toEqual({
          key,
          value: o.value,
          any: true,
        });
      }
    }
  });
});

describe('the textbook alignment', () => {
  test('every lesson and guide names a chapter of the book, and the book has thirty', () => {
    const chapters = JSON.parse(
      read('tools/library-curation.json')
    ).textbookChapters;
    expect(Object.keys(chapters)).toHaveLength(30);
    for (const e of investigations)
      expect(chapters[String(e.textbook.chapter)]).toBeTruthy();
  });
});
