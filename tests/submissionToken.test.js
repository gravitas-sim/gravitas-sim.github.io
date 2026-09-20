// =============================================================================
// The return channel, both ways back
// -----------------------------------------------------------------------------
// A submission token has two routes home and they fail differently. The printed
// block on the last page of a lab report survives a student photographing it or
// pasting it into a text box, and arrives with line breaks in it. The copy in
// the PDF's /Keywords entry arrives as bytes and cannot be mangled by whatever
// did the copying - but it goes through the PDF string path, and that path very
// nearly ate it.
//
// The test that matters most here is the underscore one. toWinAnsi() ends by
// collapsing runs of underscores, because in prose "R__star" is the seam
// between a subscript marker and a symbol name. In base64url "__" is two
// significant characters, and a token carrying one came back a character short
// and decoded to nothing. Roughly one token in two contains a double
// underscore, so this was not an edge case, it was most of them.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import {
  COMFORTABLE_TOKEN_LENGTH,
  SUBMISSION_SCHEMA,
  answersOf,
  buildSubmission,
  encodeSubmission,
  isSubmissionToken,
  normalizeToken,
  readSubmissionToken,
  validateSubmission,
} from '../js/submission/submissionToken.js';
import { buildBackup } from '../js/investigations/progressBackup.js';
import { toWinAnsi } from '../js/pdf.js';

const lesson = {
  id: 'keplers-laws',
  title: "Kepler's Laws",
  steps: [
    { sid: 'one', type: 'predict', title: 'A prediction' },
    { sid: 'two', type: 'measure', title: 'A measurement', unit: 'days' },
    { sid: 'three', type: 'read', title: 'Just reading' },
  ],
};

const sample = (responses = {}) =>
  buildSubmission({
    backup: buildBackup({
      lesson,
      responses,
      attempts: { one: 2, two: 1 },
      visited: ['one', 'two', 'three'],
      stepSid: 'three',
      startedAt: '2026-09-01T10:00:00.000Z',
      studentName: 'A Student',
    }),
    assignmentId: 'lab-4',
    rosterId: 'ASTR1403-02',
    fallbackLocale: 'es',
  });

describe('a token goes out and comes back', () => {
  test('round-trips through encode and read', async () => {
    const { token } = await encodeSubmission(sample({ one: 'because' }));
    expect(isSubmissionToken(token)).toBe(true);
    const back = await readSubmissionToken(token);
    expect(back.ok).toBe(true);
    expect(back.submission.a).toBe('lab-4');
    expect(back.submission.r).toBe('ASTR1403-02');
    expect(back.submission.b.lesson.id).toBe('keplers-laws');
  });

  test('survives the line breaks a printed block comes back with', async () => {
    const { token } = await encodeSubmission(sample({ one: 'because' }));
    // What a copy off the last PDF page delivers: groups of eight separated by
    // spaces, eight groups to a line.
    const groups = token.match(/.{1,8}/g) || [];
    const printed = groups
      .map((g, i) => g + ((i + 1) % 8 === 0 ? '\n' : ' '))
      .join('');
    const back = await readSubmissionToken(printed);
    expect(back.ok).toBe(true);
    expect(back.submission.b.progress.responses.one).toBe('because');
  });

  test('strips whitespace and nothing else', () => {
    // '-' and '_' are base64url alphabet. A reader that stripped "separators"
    // would corrupt one token in three.
    expect(normalizeToken(' s1z a-b_c \n d ')).toBe('s1za-b_cd');
    expect(normalizeToken('#s1zabc')).toBe('s1zabc');
  });
});

describe('the PDF string path does not eat it', () => {
  test('toWinAnsi collapses double underscores, so the token must not use it', () => {
    // Pinning the behaviour rather than changing it: the collapse is right for
    // prose and is why /Keywords goes through tokenSafe() instead.
    expect(toWinAnsi('R__star')).toBe('R_star');
    expect(toWinAnsi('a__b___c')).toBe('a_b_c');
  });

  test('a token containing a double underscore survives /Keywords', async () => {
    const { createDocument } = await import('../js/pdf.js');
    // Constructed rather than hoped for: a real token only contains '__' about
    // half the time, so a test that used one would pass at random.
    const token = 's1zAAAA__BBBB--CCCC___DDDD';
    const doc = createDocument({ title: 'T', keywords: token });
    doc.heading('x');
    const bytes = doc.build();
    const text = Buffer.from(bytes).toString('latin1');
    const found = /\/Keywords \(([^)]*)\)/.exec(text);
    expect(found).toBeTruthy();
    expect(found[1]).toBe(token);
  });
});

describe('what it refuses', () => {
  test('names the reason rather than throwing', async () => {
    for (const [input, reason] of [
      ['', 'empty'],
      ['not a token at all', 'wrongKind'],
      ['a1zAAAA', 'wrongKind'],
      ['s1zZZZZ', 'corrupt'],
      // What a rich-text box does to a token: "--" becomes an em dash. Half
      // the shipped lessons produce a token containing "--", so this is the
      // common failure rather than an exotic one, and it must be named rather
      // than guessed at.
      ['s1zAAAA\u2014BBBB', 'mangled'],
      ['s1zAAAA\u2013BBBB', 'mangled'],
      ['s1zAAAA\u201cBBBB', 'mangled'],
    ]) {
      const back = await readSubmissionToken(input);
      expect(back.ok).toBe(false);
      expect(back.reason).toBe(reason);
    }
  });

  test('refuses a payload that decodes but is not a submission', () => {
    expect(validateSubmission(null).reason).toBe('notAnObject');
    expect(validateSubmission({ v: 1 }).reason).toBe('noBackup');
    expect(validateSubmission({ v: 1, b: {} }).reason).toBe('noLesson');
    expect(validateSubmission({ v: SUBMISSION_SCHEMA + 1, b: {} }).reason).toBe(
      'newerVersion'
    );
  });
});

describe('the answers it hands the instructor page', () => {
  test('carries the locale each answer was typed under', () => {
    const s = sample({
      one: 'porque',
      'one:locale': 'es',
      two: '1,5',
      'two:locale': 'es',
    });
    const answers = answersOf(s);
    expect(answers.map(a => a.sid).sort()).toEqual(['one', 'two']);
    expect(answers.every(a => a.locale === 'es')).toBe(true);
  });

  test('falls back for answers stored before the locale sub-key existed', () => {
    const answers = answersOf(sample({ one: 'because' }));
    // fallbackLocale, not 'en': the report and the instructor page have to
    // agree, and the report used whatever locale was in force.
    expect(answers[0].locale).toBe('es');
  });

  test('does not report the locale sub-keys as answers', () => {
    // They are storage. An instructor page that graded them would report a
    // failure rate over twice as many questions as the lesson has.
    const s = sample({
      one: 'a',
      'one:locale': 'en',
      two: '3',
      'two:locale': 'en',
    });
    expect(answersOf(s)).toHaveLength(2);
  });
});

describe('size, because it is pasted into things with limits', () => {
  test('a full 30-step lesson stays comfortably pasteable', async () => {
    // Every answerable step filled with a sentence, which is the worst case a
    // real submission reaches.
    const steps = Array.from({ length: 30 }, (_, i) => ({
      sid: `step-${i}`,
      type: i % 4 === 0 ? 'read' : 'predict',
      title: `Step ${i}`,
    }));
    const responses = {};
    for (const s of steps) {
      if (s.type === 'read') continue;
      responses[s.sid] =
        'The orbital period should increase because the semi-major axis is larger.';
      responses[`${s.sid}:locale`] = 'en';
    }
    const { length, comfortable, limit } = await encodeSubmission(
      buildSubmission({
        backup: buildBackup({
          lesson: { id: 'big', title: 'Big', steps },
          responses,
          attempts: {},
          visited: steps.map(s => s.sid),
          stepSid: 'step-29',
          startedAt: '2026-09-01T10:00:00.000Z',
          studentName: 'A Student With A Long Name',
        }),
        assignmentId: 'assignment-with-a-realistic-identifier-2026',
        rosterId: 'ASTR1403-02',
      })
    );
    expect(comfortable).toBe(true);
    expect(limit).toBe(COMFORTABLE_TOKEN_LENGTH);
    // Measured at about 1.6 KB. The bound is generous; what it catches is the
    // payload growing by an order of magnitude, which is what would happen if
    // step text or lesson prose ever started travelling in here.
    expect(length).toBeLessThan(4000);
  });
});
