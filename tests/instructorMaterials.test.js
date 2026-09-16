import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { INVESTIGATIONS, getInvestigation } from '../js/data/investigations.js';
import {
  INSTRUCTOR_CONTENT,
  instructorContentFor,
} from '../js/data/instructorContent.js';
import {
  answerKeyFor,
  verifyKey,
  gradedEntries,
  questionCounts,
  entryFor,
  plainText,
} from '../js/answerKey.js';
import { checkAnswer, toleranceFor } from '../js/answerCheck.js';
import {
  instructorGuide,
  answerKeyDocument,
  adoptersGuide,
  curriculumMap,
} from '../js/instructorDocs.js';
import { checkInstructorCatalog } from '../js/authoring/instructorSchema.js';
import { toWinAnsi } from '../js/pdf.js';
import { plural } from '../js/format.js';
import { ACTIVITIES } from '../js/data/activities.js';
import { activityWorksheet } from '../js/activityDocs.js';
import { activityLaunchUrl } from '../js/activities/activityBridge.js';
import { EN_TEACHING } from '../js/i18n/en.teaching.js';

describe('answer keys are derived, not written', () => {
  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: every derived answer is accepted by the site',
    (id, inv) => {
      // The one guarantee that matters: a key handed to a class agrees with the
      // website that class is using.
      expect(verifyKey(inv)).toEqual([]);
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: one key entry per step, numbered from one',
    (id, inv) => {
      const key = answerKeyFor(inv);
      expect(key.entries).toHaveLength(inv.steps.length);
      expect(key.entries[0].step).toBe(1);
      expect(key.entries.at(-1).step).toBe(inv.steps.length);
      expect(key.title).toBe(inv.title);
      expect(key.duration).toBe(inv.duration);
    }
  );

  test('a multiple-choice entry carries the option list and the right index', () => {
    const inv = getInvestigation('black-holes');
    // By sid, not by position. This read `inv.steps[12]` with a comment naming
    // the step it expected to find there; one step inserted above it and the
    // test would have gone on passing against a different question, with the
    // comment still describing the old one.
    const index = inv.steps.findIndex(
      s => s.sid === 'the-right-answer-for-the'
    );
    expect(index).toBeGreaterThanOrEqual(0);
    const step = inv.steps[index];
    expect(step.kind).toBe('choice');
    const e = entryFor(step, index);
    expect(e.category).toBe('graded');
    expect(e.options).toHaveLength(step.options.length);
    expect(e.answerIndex).toBe(step.answer);
    expect(e.answerText).toBe(plainText(step.options[step.answer]));
    expect(checkAnswer(step, e.answerIndex)).toBe(true);
  });

  test('a numeric entry quotes the tolerance the site actually applies', () => {
    for (const inv of INVESTIGATIONS) {
      for (const [i, step] of inv.steps.entries()) {
        if (step.kind !== 'numeric') continue;
        const e = entryFor(step, i);
        expect(e.tolerance).toBe(toleranceFor(step));
        // The stated range is exactly the accepted range, at both ends.
        expect(checkAnswer(step, e.acceptedLow)).toBe(true);
        expect(checkAnswer(step, e.acceptedHigh)).toBe(true);
        expect(
          checkAnswer(step, e.acceptedLow - Math.abs(e.tolerance) * 0.01 - 1e-9)
        ).toBe(false);
      }
    }
  });

  test('markup never reaches the printed page', () => {
    for (const inv of INVESTIGATIONS) {
      const key = answerKeyFor(inv);
      const text = JSON.stringify(key);
      expect(text).not.toMatch(/<strong>|<em>|<sub>|<sup>|\\\\n/);
    }
  });

  test('prediction steps are separated from graded ones', () => {
    // A prediction is recorded but never marked wrong, and a key that presents
    // one as a graded question invites an instructor to grade it.
    const counts = questionCounts(getInvestigation('black-holes'));
    expect(counts.predictions).toBe(5);
    const key = answerKeyFor(getInvestigation('black-holes'));
    for (const e of gradedEntries(key)) {
      expect(['graded', 'prediction']).toContain(e.category);
    }
  });
});

describe('instructor content lines up with the lessons', () => {
  test('every implemented investigation has instructor content', () => {
    for (const inv of INVESTIGATIONS) {
      expect(instructorContentFor(inv.id)).toBeTruthy();
    }
  });

  test('no instructor content describes an investigation that does not exist', () => {
    for (const id of Object.keys(INSTRUCTOR_CONTENT)) {
      expect(getInvestigation(id)).toBeTruthy();
    }
  });

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: every section a guide needs is present and specific',
    (id, inv) => {
      const c = instructorContentFor(id);
      expect(c.topic).toBeTruthy();
      expect(c.placement.length).toBeGreaterThan(40);
      expect(c.overview.length).toBeGreaterThan(200);
      expect(c.priorKnowledge.length).toBeGreaterThanOrEqual(3);
      expect(c.keyConcepts.length).toBeGreaterThanOrEqual(3);
      expect(c.flow.length).toBeGreaterThanOrEqual(4);
      expect(c.features.length).toBeGreaterThanOrEqual(3);
      // The prompt asks for 3-6 misconceptions; fewer is not worth a section.
      expect(c.misconceptions.length).toBeGreaterThanOrEqual(4);
      // Arrays, asserted as arrays. `teachingNotes` was a single string in one
      // lesson, and every length assertion here passed over it because a
      // string has a `.length` too - 800 characters comfortably clears "at
      // least four", so a field that rendered as 590 one-character bullets in
      // the PDF looked fully populated from here.
      for (const [field, value] of Object.entries({
        priorKnowledge: c.priorKnowledge,
        flow: c.flow,
        features: c.features,
        misconceptions: c.misconceptions,
        teachingNotes: c.teachingNotes,
        discussion: c.discussion,
        extensions: c.extensions,
        keyConcepts: c.keyConcepts,
      })) {
        expect({ field, isArray: Array.isArray(value) }).toEqual({
          field,
          isArray: true,
        });
      }
      expect(c.teachingNotes.length).toBeGreaterThanOrEqual(4);
      for (const note of c.teachingNotes) {
        expect(typeof note).toBe('string');
        expect(note.length).toBeGreaterThan(40);
      }
      expect(c.discussion.length).toBeGreaterThanOrEqual(3);
      expect(c.extensions.length).toBeGreaterThanOrEqual(2);
      expect(c.modelNotes.length).toBeGreaterThan(120);
      for (const m of c.misconceptions) {
        expect(m.claim).toBeTruthy();
        expect(m.response.length).toBeGreaterThan(40);
      }
      for (const k of c.keyConcepts) {
        expect(k.heading).toBeTruthy();
        expect(k.body.length).toBeGreaterThan(80);
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: the flow covers every step exactly once',
    (id, inv) => {
      // A guide whose roadmap skips steps sends an instructor looking for a
      // section of the lesson that is not where the guide says it is.
      const seen = new Set();
      for (const block of instructorContentFor(id).flow) {
        const [a, b] = block.steps.split(/[–-]/).map(s => Number(s.trim()));
        const end = Number.isFinite(b) ? b : a;
        expect(a).toBeGreaterThanOrEqual(1);
        expect(end).toBeLessThanOrEqual(inv.steps.length);
        for (let n = a; n <= end; n++) {
          expect(seen.has(n)).toBe(false);
          seen.add(n);
        }
      }
      expect(seen.size).toBe(inv.steps.length);
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: every step an expectation names really is one that needs one',
    (id, inv) => {
      const c = instructorContentFor(id);
      for (const [num, text] of Object.entries(c.expectations || {})) {
        const step = inv.steps[Number(num) - 1];
        expect(step).toBeTruthy();
        // Expectations exist for screens where a student observes something:
        // measurements, activities, and reading screens that put something in
        // front of them. A pure-text screen has nothing to observe, so an
        // expectation attached to one is a mistake in the guide.
        //
        // "In front of them" is a panel instrument, a live probe readout, or
        // something drawn on the main scene. The last two were added when
        // lessons started using the canvas as the instrument: a reading screen
        // that draws a binary's balance point and prints both arm lengths is
        // exactly the kind of screen a guide should say what to expect on, and
        // the rule used to call it a pure-text screen because it had no `tool`.
        //
        // A graded question can be observable too, and the black-hole lesson's
        // equal-mass comparison is the case: the screen stages a star and a
        // hole of the same mass side by side and asks what that implies. What
        // a guide needs to say about it is what the two orbits do, which is an
        // expectation in every sense.
        const showsSomething = Boolean(
          step.tool || step.probe || step.stage || step.showBarycenter
        );
        const observable =
          step.type === 'measure' ||
          step.type === 'explore' ||
          ((step.type === 'read' || step.type === 'question') &&
            showsSomething);
        expect(observable).toBe(true);
        expect(text.length).toBeGreaterThan(30);
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: every measurement step has an expected observation',
    (id, inv) => {
      // A measure step with no stated expectation is the one place an
      // instructor is left without an answer to give.
      const c = instructorContentFor(id);
      for (const [i, step] of inv.steps.entries()) {
        if (step.type !== 'measure') continue;
        expect(c.expectations?.[i + 1]).toBeTruthy();
      }
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: teaching notes that cite a step cite one that exists',
    (id, inv) => {
      const c = instructorContentFor(id);
      const prose = [...c.teachingNotes, ...c.features.map(f => f.name)].join(
        ' '
      );
      for (const m of prose.matchAll(/steps? (\d+)(?:\s*[–-]\s*(\d+))?/gi)) {
        for (const n of [m[1], m[2]].filter(Boolean).map(Number)) {
          expect(n).toBeGreaterThanOrEqual(1);
          expect(n).toBeLessThanOrEqual(inv.steps.length);
        }
      }
    }
  );
});

describe('grading at the edge of a tolerance', () => {
  test('a value exactly on the stated boundary is accepted', () => {
    // 7.6 - 8 is -0.4000000000000004 in binary floating point, so an exact
    // boundary answer used to be rejected by four parts in 10^16.
    const step = { kind: 'numeric', answer: 8, tolerance: 0.4 };
    expect(checkAnswer(step, 7.6)).toBe(true);
    expect(checkAnswer(step, 8.4)).toBe(true);
    expect(checkAnswer(step, '7.6')).toBe(true);
  });

  test('the slack is far too small to accept a wrong answer', () => {
    const step = { kind: 'numeric', answer: 8, tolerance: 0.4 };
    expect(checkAnswer(step, 7.59)).toBe(false);
    expect(checkAnswer(step, 8.41)).toBe(false);
    expect(checkAnswer(step, 7)).toBe(false);
  });

  test('every quoted range is exactly the range the site accepts', () => {
    for (const inv of INVESTIGATIONS) {
      for (const [i, step] of inv.steps.entries()) {
        if (step.kind !== 'numeric') continue;
        const e = entryFor(step, i);
        expect(checkAnswer(step, e.acceptedLow)).toBe(true);
        expect(checkAnswer(step, e.acceptedHigh)).toBe(true);
        const pad = Math.abs(e.tolerance) * 0.01;
        expect(checkAnswer(step, e.acceptedLow - pad)).toBe(false);
        expect(checkAnswer(step, e.acceptedHigh + pad)).toBe(false);
      }
    }
  });
});

describe('plain text for a medium with no markup', () => {
  // A PDF has no markup, so an entity in a source string is not a character
  // there - it is the six letters "&rsquo;", and nineteen of those went out in
  // three answer keys. The browser was always right; only this path was wrong.
  test.each([
    ['Kepler&rsquo;s law', 'Kepler\u2019s law'],
    ['a&nbsp;b', 'a b'],
    ['1&ndash;2', '1\u20132'],
    ['&lt;tag&gt;', '<tag>'],
    ['A &amp; B', 'A & B'],
    ['&#8217;s', '\u2019s'],
    ['&#x2014;', '\u2014'],
    // &amp; is decoded last, so text that should read as a literal "&lt;"
    // stays one rather than becoming a "<".
    ['&amp;lt; stays literal', '&lt; stays literal'],
    // An entity nobody listed survives, visibly, rather than being guessed at.
    ['&unknownthing; survives', '&unknownthing; survives'],
  ])('plainText(%j)', (input, expected) => {
    expect(plainText(input)).toBe(expected);
  });
});

describe('counts agree with their nouns', () => {
  test.each([
    [1, 'written answer', '1 written answer'],
    [0, 'written answer', '0 written answers'],
    [4, 'written answer', '4 written answers'],
    [1, 'prediction', '1 prediction'],
    [2, 'analysis', '2 analyses'],
    [1200, 'step', '1,200 steps'],
  ])('plural(%i, %j)', (n, one, expected) => {
    const many = one === 'analysis' ? 'analyses' : undefined;
    expect(plural(n, one, many)).toBe(expected);
  });
});

describe('ACCESSIBILITY.md tells the truth about the PDFs', () => {
  const doc = readFileSync(
    path.join(process.cwd(), 'ACCESSIBILITY.md'),
    'utf8'
  );
  const guide = instructorGuide(getInvestigation('tides'), { version: 'T' });
  const raw = new TextDecoder('latin1').decode(guide);

  test('the document says the files are not tagged, and they are not', () => {
    expect(doc).toMatch(/not tagged/);
    expect(doc).toMatch(/not PDF\/UA conformant/);
    // The day somebody adds a structure tree, this fails and the sentence
    // above has to be rewritten rather than quietly becoming untrue in the
    // other direction - a document claiming less than it provides is still a
    // document nobody can rely on.
    expect(raw.includes('/StructTreeRoot')).toBe(false);
  });

  test('and what it claims the files DO provide, they do', () => {
    for (const field of ['/Title', '/Author', '/Subject', '/Lang']) {
      expect({ field, present: raw.includes(field) }).toEqual({
        field,
        present: true,
      });
    }
    expect(doc).toMatch(/Lang en-US/);
    expect(raw).toMatch(/\/Lang \(en-US\)/);
  });
});

describe('the test fixture cannot escape into a release', () => {
  const read = rel => readFileSync(path.join(process.cwd(), rel), 'utf8');

  // The fixture is a bundle of placeholder documents encrypted with a
  // passphrase printed in the source. It exists so the portal can be driven
  // end to end without the production secret, and the entire argument for
  // doing that rests on it never reaching anything a reader can fetch.
  test('the fixture directory is gitignored', () => {
    expect(read('.gitignore')).toMatch(/^\.instructor-fixture\/$/m);
  });

  test('git does not track anything in it', () => {
    const tracked = execFileSync('git', ['ls-files', '.instructor-fixture'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).trim();
    // Untracked is what keeps it out of `git archive`, which is what a
    // reviewer, a journal and Zenodo actually receive.
    expect(tracked).toBe('');
  });

  test('no build step names it', () => {
    for (const file of [
      'build.js',
      'tools/build-service-worker.mjs',
      'tools/prepare-pages.mjs',
    ]) {
      expect({
        file,
        mentions: read(file).includes('instructor-fixture'),
      }).toEqual({ file, mentions: false });
    }
  });

  test('the service-worker manifest does not precache it', () => {
    expect(read('sw-manifest.js')).not.toMatch(/instructor-fixture/);
  });

  // The builder may render one, but never over the published artifact.
  test('--fixture refuses to overwrite the production bundle', () => {
    let code = 0;
    try {
      execFileSync(
        'node',
        [
          'tools/build-instructor-materials.js',
          '--fixture',
          'instructors/materials.enc.json',
        ],
        { cwd: process.cwd(), stdio: 'pipe' }
      );
    } catch (err) {
      code = err.status;
    }
    expect(code).toBe(1);
  });

  test('the production bundle is not a throwaway or a fixture', () => {
    const bundle = JSON.parse(read('instructors/materials.enc.json'));
    expect(bundle.unpublishable).toBeUndefined();
    expect(bundle.cipher).toBe('AES-GCM');
    expect(bundle.kdf.iterations).toBeGreaterThanOrEqual(600_000);
  });
});

describe('student worksheets', () => {
  const decode = b => new TextDecoder('latin1').decode(b);
  const drawnOf = pdf =>
    [...decode(pdf).matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)].map(m =>
      m[1].replace(/\\([()\\])/g, '$1')
    );

  const sheets = [];
  for (const activity of ACTIVITIES) {
    for (const format of activity.formats) {
      if (format.context === 'projection') continue;
      sheets.push([`${activity.id}/${format.id}`, activity, format]);
    }
  }

  test('there are worksheets to check', () => {
    expect(sheets.length).toBeGreaterThan(0);
  });

  // A blank worksheet said "(no answer given)" under every question, because
  // the answer key and the worksheet shared one field renderer and the key's
  // empty-value text is meaningful where the worksheet's is absurd.
  test.each(sheets)(
    '%s: is blank space, not a filled-in answer key',
    (id, activity, format) => {
      const lesson = getInvestigation(activity.lesson);
      const drawn = drawnOf(
        activityWorksheet(activity, format, lesson, EN_TEACHING, {
          version: 'T',
        })
      );
      expect(drawn.filter(t => t.includes('no answer given'))).toEqual([]);
      for (const field of ['Name', 'Class', 'Date']) {
        expect({ id, field, present: drawn.includes(field) }).toEqual({
          id,
          field,
          present: true,
        });
      }
      // And it says where to open the thing, using the route helper's spelling.
      const wanted = activityLaunchUrl(activity.id, format.id);
      expect(drawn.some(t => t.includes(wanted))).toBe(true);
    }
  );
});

describe('instructor content matches the one schema', () => {
  const steps = Object.fromEntries(
    INVESTIGATIONS.map(inv => [inv.id, inv.steps.length])
  );

  test('the whole catalog is canonical', () => {
    expect(checkInstructorCatalog(INSTRUCTOR_CONTENT, steps)).toEqual([]);
  });

  // The checker has to fail on the shapes that actually shipped, or it is a
  // function that returns an empty array. Each of these is a real defect this
  // repository had: a features entry under keyConcepts' key names, a
  // teachingNotes string where an array belonged, and a flow range naming a
  // screen past the end of the lesson.
  test.each([
    [
      'a features entry using {heading, body}',
      c => ({
        ...c,
        features: [{ heading: 'A', body: 'B'.repeat(40) }, ...c.features],
      }),
      /features\[0\] has \{body, heading\}/,
    ],
    [
      'teachingNotes as a string',
      c => ({
        ...c,
        teachingNotes: 'One long note, not an array of them at all.',
      }),
      /teachingNotes must be an array.*one bullet per character/s,
    ],
    [
      'a flow entry using {title, detail}',
      c => ({
        ...c,
        flow: [
          { steps: '1', title: 'A', detail: 'B'.repeat(40) },
          ...c.flow.slice(1),
        ],
      }),
      /flow\[0\] has \{detail, steps, title\}/,
    ],
    [
      'a flow range past the end of the lesson',
      c => ({
        ...c,
        flow: [...c.flow, { steps: '900-901', text: 'C'.repeat(40) }],
      }),
      /flow names screen 900, and the lesson has \d+/,
    ],
    [
      'a blank cell',
      c => ({
        ...c,
        features: [{ name: 'A name', text: '' }, ...c.features.slice(1)],
      }),
      /features\[0\]\.text is empty/,
    ],
  ])('it catches %s', (_label, breakIt, expected) => {
    const broken = {
      ...INSTRUCTOR_CONTENT,
      'keplers-laws': breakIt(INSTRUCTOR_CONTENT['keplers-laws']),
    };
    const problems = checkInstructorCatalog(broken, steps);
    expect(problems.join('\n')).toMatch(expected);
  });
});

describe('the generated documents', () => {
  const decode = bytes => new TextDecoder('latin1').decode(bytes);
  const pageCount = pdf =>
    (decode(pdf).match(/\/Type\s*\/Page[^s]/g) || []).length;
  const isValidPdf = pdf => {
    const s = decode(pdf);
    return (
      s.startsWith('%PDF-') &&
      s.includes('xref') &&
      s.includes('startxref') &&
      s.trimEnd().endsWith('%%EOF')
    );
  };
  /** Every string the document actually draws. */
  const drawn = pdf =>
    [...decode(pdf).matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)].map(m =>
      m[1].replace(/\\([()\\])/g, '$1')
    );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: the instructor guide builds a valid PDF',
    (id, inv) => {
      const pdf = instructorGuide(inv, { version: 'Test 2026' });
      expect(isValidPdf(pdf)).toBe(true);
      expect(pageCount(pdf)).toBeGreaterThanOrEqual(3);
      const text = drawn(pdf).join(' ');
      // Every numbered section the template promises must actually appear.
      for (const heading of [
        '1. Overview',
        '2. Learning objectives',
        '3. Prior knowledge',
        '4. Key concepts',
        '5. Investigation flow',
        '6. Interactive features',
        '7. Common misconceptions',
        '8. Teaching notes',
        '9. Discussion questions',
        '10. Optional extensions',
        '11. Model notes',
      ]) {
        expect(text).toContain(heading);
      }
      expect(text).toContain(inv.duration);
    }
  );

  /**
   * The text the writer would actually draw for a string.
   *
   * js/pdf.js encodes to WinAnsi, and that is not a lossless view of the
   * source: a curly apostrophe comes back as "'", an en dash as "-", and
   * "2GMR/d³" is transliterated to "2GMR/d^3". Comparing raw source against
   * drawn bytes finds none of it and reports every table blank, which is the
   * opposite of the defect being looked for.
   *
   * The writer's own function is used rather than a copy of its table, so this
   * cannot drift from what the writer does.
   */
  const ascii = t =>
    toWinAnsi(String(t))
      .replace(/[\u0091\u0092\u2018\u2019]/g, "'")
      .replace(/[\u0093\u0094\u201c\u201d]/g, '"')
      .replace(/[\u0096\u0097\u2013\u2014]/g, '-')
      .replace(/\s+/g, ' ');
  /** The drawn text as one line, so a wrapped sentence still reads as one. */
  const flat = pdf => ascii(drawn(pdf).join(' '));
  /** The opening words of a string, for finding it in wrapped output. */
  const opening = (text, words = 5) =>
    ascii(text).trim().split(' ').slice(0, words).join(' ');

  // The sections were checked for their headings and not for their contents,
  // so five guides passed with a table that had a header row and nothing
  // under it. A heading is the easiest thing in the document to get right.
  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: the guide prints something under every heading',
    (id, inv) => {
      const c = instructorContentFor(id);
      const text = flat(instructorGuide(inv, { version: 'Test 2026' }));
      for (const [i, f] of c.flow.entries()) {
        expect({
          at: `flow[${i}]`,
          drawn: text.includes(opening(f.text)),
        }).toEqual({ at: `flow[${i}]`, drawn: true });
      }
      for (const [i, f] of c.features.entries()) {
        expect({
          at: `features[${i}].name`,
          drawn: text.includes(opening(f.name, 3)),
        }).toEqual({ at: `features[${i}].name`, drawn: true });
        expect({
          at: `features[${i}].text`,
          drawn: text.includes(opening(f.text)),
        }).toEqual({ at: `features[${i}].text`, drawn: true });
      }
      for (const [i, note] of c.teachingNotes.entries()) {
        expect({
          at: `teachingNotes[${i}]`,
          drawn: text.includes(opening(note)),
        }).toEqual({ at: `teachingNotes[${i}]`, drawn: true });
      }
      for (const [i, d] of c.discussion.entries()) {
        expect({
          at: `discussion[${i}]`,
          drawn: text.includes(opening(d)),
        }).toEqual({ at: `discussion[${i}]`, drawn: true });
      }
      expect(text).toContain(opening(c.overview));
      expect(text).toContain(opening(c.modelNotes));
    }
  );

  // `bullets()` iterates its argument, so a string reaches it as a sequence of
  // characters: one guide went out at 27 pages with 590 bullets reading "T",
  // "w", "o". A run of one-character draws is the signature.
  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: no bullet has exploded into single characters',
    (id, inv) => {
      for (const pdf of [
        instructorGuide(inv, { version: 'Test 2026' }),
        answerKeyDocument(inv, { version: 'Test 2026' }),
      ]) {
        // A run, not a count. An answer key legitimately draws a lone "1" as
        // somebody's answer; what no document does legitimately is draw five
        // single characters in a row, which is what a word looks like when a
        // string has been handed to a bullet list.
        let run = 0;
        let worst = 0;
        for (const t of drawn(pdf)) {
          run = /^[A-Za-z0-9]$/.test(t) ? run + 1 : 0;
          worst = Math.max(worst, run);
        }
        expect({ id, longestRunOfSingleCharacters: worst }).toEqual({
          id,
          longestRunOfSingleCharacters: worst > 4 ? 0 : worst,
        });
      }
    }
  );

  // An entity is markup that reached a medium with no markup in it. The PDF
  // says "don&rsquo;t" where the browser says "don’t".
  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: no HTML entity survives into the PDF',
    (id, inv) => {
      for (const [what, pdf] of [
        ['guide', instructorGuide(inv, { version: 'Test 2026' })],
        ['key', answerKeyDocument(inv, { version: 'Test 2026' })],
      ]) {
        const found = [
          ...new Set(
            flat(pdf).match(
              /&(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6});/g
            ) || []
          ),
        ];
        expect({ id, what, found }).toEqual({ id, what, found: [] });
      }
    }
  );

  // "1 written answers" appeared sixteen times, "1 predictions" four and
  // "1 graded questions" twice, because each was a literal with an "s" typed
  // after it. js/format.js now owns the grammar.
  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: no count disagrees with its noun',
    (id, inv) => {
      for (const [what, pdf] of [
        ['guide', instructorGuide(inv, { version: 'Test 2026' })],
        ['key', answerKeyDocument(inv, { version: 'Test 2026' })],
      ]) {
        const wrong = [
          ...new Set(
            flat(pdf).match(
              /\b1 (?:[a-z]+ )?(?:steps|screens|questions|answers|predictions|measurements|investigations|documents|activities)\b/g
            ) || []
          ),
        ];
        expect({ id, what, wrong }).toEqual({ id, what, wrong: [] });
      }
    }
  );

  // A downloaded PDF with no /Author and no /Subject is an untitled file by
  // nobody in a reader's library, and without /Lang a screen reader guesses
  // which language to pronounce it in.
  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: the PDF carries its own document properties',
    (id, inv) => {
      for (const [what, pdf] of [
        ['guide', instructorGuide(inv, { version: 'Test 2026' })],
        ['key', answerKeyDocument(inv, { version: 'Test 2026' })],
      ]) {
        const raw = new TextDecoder('latin1').decode(pdf);
        const field = name =>
          new RegExp(`/${name} \\(([^)]*)\\)`).exec(raw)?.[1] ?? '';
        expect({ id, what, author: field('Author') }).toEqual({
          id,
          what,
          author: 'Carl Ziegler',
        });
        expect({ id, what, lang: field('Lang') }).toEqual({
          id,
          what,
          lang: 'en-US',
        });
        expect(field('Title')).not.toBe('');
        expect(field('Subject').length).toBeGreaterThan(30);
        // Month-granular on purpose: a to-the-second stamp would make every
        // build differ from the last for no reason anybody wrote.
        expect(field('CreationDate')).toMatch(/^D:\d{6}01000000Z$/);
      }
    }
  );

  // "is not written yet" was true once. The lesson it referred to shipped.
  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: the guide makes no stale claim about unwritten material',
    (id, inv) => {
      const text = flat(instructorGuide(inv, { version: 'Test 2026' }));
      expect(text).not.toMatch(
        /not written yet|not yet written|coming soon|TODO|TBD/i
      );
    }
  );

  // A guide that says "screen 30" of a 28-screen lesson sends an instructor
  // looking for something that is not there.
  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: every screen the guide names is a screen the lesson has',
    (id, inv) => {
      const text = flat(instructorGuide(inv, { version: 'Test 2026' }));
      const over = [
        ...new Set(
          [...text.matchAll(/\b(?:screen|step)s?\s+(\d{1,3})\b/gi)].map(m =>
            Number(m[1])
          )
        ),
      ].filter(n => n > inv.steps.length);
      expect({ id, beyondTheEnd: over }).toEqual({ id, beyondTheEnd: [] });
    }
  );

  test.each(INVESTIGATIONS.map(i => [i.id, i]))(
    '%s: the answer key builds a valid PDF and covers every graded step',
    (id, inv) => {
      const pdf = answerKeyDocument(inv, { version: 'Test 2026' });
      expect(isValidPdf(pdf)).toBe(true);
      const text = drawn(pdf).join(' ');
      const key = answerKeyFor(inv);
      for (const e of key.entries) {
        if (e.category === 'reading') continue;
        expect(text).toContain(`Step ${e.step}:`);
      }
      // And the correct answer is actually printed, not merely referenced.
      for (const e of gradedEntries(key)) {
        if (!e.answerText) continue;
        expect(text).toContain(e.answerLabel + '. ');
      }
    }
  );

  test('reading-only steps are left out of the key', () => {
    const inv = getInvestigation('black-holes');
    const text = [
      ...new TextDecoder('latin1')
        .decode(answerKeyDocument(inv))
        .matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g),
    ]
      .map(m => m[1])
      .join(' ');
    const reading = answerKeyFor(inv).entries.filter(
      e => e.category === 'reading'
    );
    expect(reading.length).toBeGreaterThan(0);
    for (const e of reading) expect(text).not.toContain(`Step ${e.step}:`);
  });

  test('the adopter guide and curriculum map build and name every lesson', () => {
    for (const pdf of [
      adoptersGuide(INVESTIGATIONS, { version: 'Test 2026' }),
      curriculumMap(INVESTIGATIONS, { version: 'Test 2026' }),
    ]) {
      expect(isValidPdf(pdf)).toBe(true);
      // Titles are transliterated to WinAnsi, so both sides are reduced to
      // letters before comparing rather than guessing how an apostrophe lands.
      const letters = t => t.replace(/[^A-Za-z]/g, '');
      const text = letters(drawn(pdf).join(' '));
      for (const inv of INVESTIGATIONS) {
        expect(text).toContain(letters(plainText(inv.title)));
      }
    }
  });

  test('nothing reaches the page as an unmapped character', () => {
    // The PDF fonts are WinAnsi. Anything outside it becomes a literal "?", so
    // a stray unicode dash would print as a question mark in a document sent
    // to faculty.
    for (const inv of INVESTIGATIONS) {
      for (const pdf of [instructorGuide(inv), answerKeyDocument(inv)]) {
        for (const s of drawn(pdf)) {
          if (!s.includes('?')) continue;
          // A real question mark follows a word; a placeholder follows a space
          // or sits alone.
          expect(s).toMatch(/[A-Za-z0-9,'")\]]\s*\?/);
        }
      }
    }
  });

  test('documents are US Letter and carry a page number on every page', () => {
    const pdf = instructorGuide(getInvestigation('keplers-laws'));
    const s = decode(pdf);
    expect(s).toContain('/MediaBox [0 0 612 792]');
    const pages = pageCount(pdf);
    const numbered = (s.match(/Page \d+ of \d+/g) || []).length;
    expect(numbered).toBe(pages);
  });
});
