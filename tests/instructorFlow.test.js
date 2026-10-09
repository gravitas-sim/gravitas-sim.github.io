// =============================================================================
// The instructor flow: the kit's words, readers, handout and reuse check
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';

import { WORDS, tr } from '../js/teach/kitText.js';
import { NOTES, PLATFORMS } from '../js/teach/lmsNotes.js';
import {
  frameMarkup,
  handoutMarkup,
  linkMarkup,
  pasteText,
} from '../js/teach/handout.js';
import {
  activitiesOf,
  fragmentOf,
  readSource,
  reuseCheck,
  rosterOf,
} from '../js/teach/activity.js';
import { assignmentLink } from '../js/assignments/assignmentLink.js';
import { buildAssignment } from '../js/assignments/assignment.js';
import { stepFingerprint } from '../js/investigations/progressBackup.js';
import { RETIRED } from '../tools/glossary.mjs';
import { qrCode, qrSvg } from '../js/kit/qr.js';
import { BUILTIN_COURSES } from '../js/data/courses/index.js';
import { kepler } from './gradebookFixtures.js';

const holes = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
const STUDENT_IDS = id => /^(handout|paste|item|qr|kind)\./.test(id);

describe('the kit’s words', () => {
  test('the two languages have the same ids and the same placeholders', () => {
    expect(Object.keys(WORDS.es).sort()).toEqual(Object.keys(WORDS.en).sort());
    for (const id of Object.keys(WORDS.en))
      expect({ id, holes: holes(WORDS.es[id]) }).toEqual({
        id,
        holes: holes(WORDS.en[id]),
      });
  });

  test('what a student reads uses none of the retired words, in either language', () => {
    const found = [];
    for (const lang of ['en', 'es'])
      for (const [id, text] of Object.entries(WORDS[lang]))
        if (STUDENT_IDS(id))
          for (const r of RETIRED)
            if (r[lang].test(text.replace(/\{\w+\}/g, ' ')))
              found.push(`${lang} ${id}: ${r.id}`);
    expect(found).toEqual([]);
  });

  test('every page word in the kit is a word the module defines', () => {
    const html = readFileSync('teaching/kit/index.html', 'utf8');
    for (const m of html.matchAll(/data-k(?:-label)?="([\w.]+)"/g))
      expect(WORDS.en[m[1]]).toEqual(expect.any(String));
  });

  test('the page’s own text uses none of the retired words', () => {
    const html = readFileSync('teaching/kit/index.html', 'utf8')
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]+>/g, ' ');
    for (const r of RETIRED) expect(r.en.test(html)).toBe(false);
  });

  test('each platform has the same number of steps in both languages, and claims no integration', () => {
    for (const p of PLATFORMS) {
      expect(NOTES.es[p][1].length).toBe(NOTES.en[p][1].length);
      expect(NOTES.en[p][1].join(' ')).not.toMatch(/LTI tool that|integrat/i);
    }
    expect(tr('en', 'lms.note')).toContain('not an LTI tool');
    expect(tr('es', 'lms.note')).toContain('ni es una herramienta LTI');
  });
});

describe('the handout', () => {
  const what = {
    title: 'Week 3 <script>',
    intro: 'Do these "first".',
    rows: ['Step one', 'Step <b>two</b>'],
    link: 'https://gravitas-sim.online/?roster=A%26B#a1zXYZ',
    svg: qrSvg(qrCode('https://gravitas-sim.online/'), { label: 'code' }),
    roster: 'PHYS 101',
    hint: 'your login',
    kind: 'activity',
    steps: 2,
  };
  test.each(['en', 'es'])(
    'in %s: the link, the steps and the hand-in, all escaped',
    loc => {
      const html = handoutMarkup(loc, what);
      expect(html).toContain(`lang="${loc}"`);
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script');
      expect(html).toContain('Step &lt;b&gt;two&lt;/b&gt;');
      expect(html).toContain('PHYS 101');
      expect(html).toContain('your login');
      expect(html).toContain('<svg');
      expect(html).toContain(tr(loc, 'handout.finish.text').slice(0, 20));
    }
  );
  test('the two languages differ', () => {
    expect(handoutMarkup('en', what)).not.toBe(handoutMarkup('es', what));
  });
  test('the text to paste carries the link and says what to type as a name', () => {
    expect(
      pasteText('en', { kind: 'activity', link: 'L', hint: 'your login' })
    ).toContain('type your login where it asks for your name');
    expect(pasteText('es', { kind: 'course', link: 'L', hint: '' })).toContain(
      'su nombre'
    );
  });
  test('markup is escaped and the frame keeps its box', () => {
    expect(linkMarkup('https://x.test/?a=1&b="2"', 'T"')).toContain(
      '&amp;b=&quot;2&quot;'
    );
    expect(frameMarkup('https://x.test/', 'T')).toContain('padding-top:75%');
  });
});

describe('reading an Activity or a Course', () => {
  const base = 'https://gravitas-sim.online/';
  const activity = buildAssignment({
    lesson: kepler,
    chosen: [
      kepler.steps.find(s => s.type === 'question' || s.options)?.sid ??
        kepler.steps[3].sid,
    ],
    title: 'Week 3',
    intro: 'Before Friday.',
    fingerprint: stepFingerprint,
    now: new Date('2026-09-01T00:00:00Z'),
  });

  test('a link, with a class code, a bare fragment and a file all read the same activity', async () => {
    const { url, fragment } = await assignmentLink(activity, base);
    for (const input of [
      url,
      `${url}`.replace(base, `${base}?roster=C1`),
      `#${fragment}`,
      JSON.stringify(activity),
    ]) {
      const r = await readSource(input);
      expect(r.ok).toBe(true);
      expect(r.kind).toBe('activity');
      expect(r.activity.i).toBe(activity.i);
    }
    expect(rosterOf(`${base}?roster=C1#${fragment}`)).toBe('C1');
    expect(fragmentOf(url)).toBe(`#${fragment}`);
  });

  test('refuses what is not one, with a named reason', async () => {
    expect((await readSource('hello')).reason).toBe('notJson');
    expect((await readSource('{"a":1}')).reason).toBe('unknownKind');
    expect((await readSource('x'.repeat(600 * 1024))).reason).toBe('tooLarge');
    expect((await readSource('#a1zAAAA')).ok).toBe(false);
  });

  test('a course file names its activities with their course and unit', async () => {
    const pack = await BUILTIN_COURSES['intro-astronomy']();
    const r = await readSource(JSON.stringify(pack));
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('course');
    const found = activitiesOf(r, 'en');
    for (const f of found) {
      expect(f.id).toMatch(/\S/);
      expect(f.course).toMatch(/\S/);
      expect(f.unit).toMatch(/\S/);
    }
  });

  test('an unchanged activity checks clean, and a rewritten or removed step is found and re-issued under a new id', () => {
    const clean = reuseCheck(
      activity,
      kepler,
      stepFingerprint,
      null,
      new Date('2027-01-10')
    );
    expect(clean.clean).toBe(true);
    const sid = activity.s[0];
    const edited = {
      ...kepler,
      steps: kepler.steps.map(s =>
        s.sid === sid ? { ...s, type: 'other-type' } : s
      ),
    };
    const changed = reuseCheck(
      activity,
      edited,
      stepFingerprint,
      null,
      new Date('2027-01-10')
    );
    expect(changed.changed).toBe(1);
    expect(changed.clean).toBe(false);
    expect(changed.reissued.i).not.toBe(activity.i);
    expect(changed.reissued.c).toBe('2027-01-10');
    expect(changed.reissued.f[0]).not.toBe(activity.f[0]);
    const gone = reuseCheck(
      activity,
      {
        ...kepler,
        steps: kepler.steps.filter(s => !activity.s.includes(s.sid)),
      },
      stepFingerprint,
      null
    );
    expect(gone.missing).toBe(activity.s.length);
    expect(gone.reissued).toBeNull();
  });
});

describe('the kit is a registered page', () => {
  test('in the build, the sitemap and the route budgets', () => {
    expect(readFileSync('build.js', 'utf8')).toContain("'teaching/kit'");
    expect(readFileSync('build.js', 'utf8')).toContain(
      "entryPoints: ['js/teach/kit.js']"
    );
    expect(readFileSync('sitemap.xml', 'utf8')).toContain('/teaching/kit/');
    const b = JSON.parse(readFileSync('tools/route-budgets.json', 'utf8'));
    expect(b.routes.sources['teach-kit']).toBeDefined();
    expect(b.routes.build['teach-kit']).toBeDefined();
  });
  test('Teach links it, the activity builder opens it and the adoption pages add to a course', () => {
    expect(readFileSync('teaching/index.html', 'utf8')).toContain(
      'href="/teaching/kit/"'
    );
    expect(
      readFileSync('js/assignments/assignmentBuilder.js', 'utf8')
    ).toContain('/teaching/kit/');
    expect(
      readFileSync('teaching/investigation/keplers-laws/index.html', 'utf8')
    ).toContain('/studio/course/?add=keplers-laws');
  });
});
