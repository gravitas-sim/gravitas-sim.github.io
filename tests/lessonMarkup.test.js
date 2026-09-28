// =============================================================================
// Lesson markup: an entity is a character on screen, and never a way in
// -----------------------------------------------------------------------------
// prose() escaped the & of every entity before it let its four tags back in,
// so Twelve Nights opened on "one star: HD&nbsp;209458, from La&nbsp;Silla",
// and five lessons and their Spanish showed "&rsquo;" and "&deg;" as letters.
// The PDFs had been fixed for the same thing by a table whose comment said the
// browser was always right. Nothing had asked the browser.
//
// So these tests render through the real prose() into a real DOM and read the
// text back, the way a student reads it. An assertion on the HTML string would
// have passed all along.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INVESTIGATIONS, getInvestigation } from '../js/data/investigations.js';
import {
  ENTITIES,
  decodeEntities,
  escapeHtml,
  prose,
} from '../js/lessonMarkup.js';
import { plainText } from '../js/answerKey.js';
import { buildLabReport } from '../js/labReport.js';
import { checkAnswer } from '../js/answerCheck.js';
import { toWinAnsi } from '../js/pdf.js';

const ES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../js/data/investigations/es'
);

/** Anything that still looks like an entity after rendering. */
const LEFTOVER =
  /&(?:[a-zA-Z][a-zA-Z0-9]{1,31}|#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6});/g;

/** Render lesson prose the way the step body does, and read it back. */
function rendered(text) {
  const el = document.createElement('div');
  el.className = 'inv-step-body';
  el.innerHTML = `<p>${prose(text)}</p>`;
  return el;
}

const shown = text => rendered(text).textContent;

/** Every string anywhere in a lesson definition, with where it sits. */
function* strings(value, at = '') {
  if (typeof value === 'string') yield [at, value];
  else if (Array.isArray(value)) {
    for (const [i, v] of value.entries()) yield* strings(v, `${at}[${i}]`);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      yield* strings(v, at ? `${at}.${k}` : k);
    }
  }
}

const SPANISH = await Promise.all(
  readdirSync(ES_DIR)
    .filter(f => f.endsWith('.js'))
    .sort()
    .map(async f => [
      `es/${f.replace(/\.js$/, '')}`,
      (await import(path.join(ES_DIR, f))).default,
    ])
);

const LESSONS = [...INVESTIGATIONS.map(inv => [inv.id, inv]), ...SPANISH];

describe('a step with entities, on screen', () => {
  // The step the bug was found on, read back as a student reads it.
  test('Twelve Nights opens on HD 209458 at La Silla, not on their entities', () => {
    const inv = getInvestigation('twelve-nights');
    const text = shown(inv.steps[0].body);
    expect(text).toContain('one star: HD\u00a0209458, from La\u00a0Silla');
    expect(text).toContain('8\u00a0m/s each');
    expect(text).toContain('+18.9\u00b0');
    expect(text).not.toContain('&nbsp;');
    expect(text.match(LEFTOVER)).toBeNull();
  });

  test('its Spanish does the same', async () => {
    const es = (await import(path.join(ES_DIR, 'twelve-nights.js'))).default;
    const text = shown(es.steps[0].body);
    expect(text).toContain('HD\u00a0209458');
    expect(text.match(LEFTOVER)).toBeNull();
  });

  test.each([
    ['Kepler&rsquo;s law', 'Kepler\u2019s law'],
    ['4,100&nbsp;&#8491;', '4,100\u00a0\u212b'],
    ['&#x2014;', '\u2014'],
    ['hydrogen &beta;', 'hydrogen \u03b2'],
    ['M(&lt;r) = v\u00b2\u00b7r / G', 'M(<r) = v\u00b2\u00b7r / G'],
    ['Chenciner, A. &amp; Montgomery, R.', 'Chenciner, A. & Montgomery, R.'],
    ['Tools &gt; Frame', 'Tools > Frame'],
    // A no-break space has to outlive prose()'s whitespace pass, which folds
    // every \s run - and \s matches U+00A0 - into one ASCII space.
    ['HD&nbsp;&nbsp;209458', 'HD\u00a0\u00a0209458'],
    // Each reference is decoded once: this is a lesson writing about "&lt;".
    ['&amp;lt; is how HTML writes it', '&lt; is how HTML writes it'],
    // An entity nobody listed survives, visibly, rather than being guessed at.
    ['&unknownthing; survives', '&unknownthing; survives'],
  ])('prose(%j) reads %j', (source, reads) => {
    expect(shown(source)).toBe(reads);
  });

  test('the four tags still work around an entity', () => {
    const el = rendered(
      '<strong>La&nbsp;Silla</strong> at <em>f</em>&nbsp;&plusmn;&nbsp;1'
    );
    expect(el.querySelector('strong').textContent).toBe('La\u00a0Silla');
    expect(el.textContent).toBe('La\u00a0Silla at f\u00a0\u00b1\u00a01');
  });
});

describe('an entity is never a way in', () => {
  // The four tags are let back in by matching their escaped form. An entity
  // that decodes to "<" is decoded after that, and escaped again, so it can
  // only ever be text.
  test.each([
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    '&#60;img src=x onerror=alert(1)&#62;',
    '&#x3c;img src=x onerror=alert(1)&#x3e;',
    '&lt;strong&gt;written about, not bold&lt;/strong&gt;',
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
  ])('%j makes no element', source => {
    const el = rendered(source);
    expect([...el.querySelectorAll('p *')].map(n => n.tagName)).toEqual([]);
    expect(el.textContent).toBe(decodeEntities(source));
  });

  test('a lesson may still bold a word', () => {
    expect(
      [...rendered('<strong>a</strong>').querySelectorAll('p *')].map(
        n => n.tagName
      )
    ).toEqual(['STRONG']);
  });
});

describe('one table, and it agrees with HTML', () => {
  // jsdom's parser carries the full HTML entity table. Each name here must
  // mean what it means to a browser, or the panel and the PDF would agree
  // with each other and both be wrong.
  test.each(Object.entries(ENTITIES))(
    '&%s; is %j, as HTML says',
    (name, ch) => {
      const el = document.createElement('div');
      el.innerHTML = `&${name};`;
      expect(el.textContent).toBe(ch);
      expect(shown(`&${name};`)).toBe(ch);
      expect(decodeEntities(`&${name};`)).toBe(ch);
    }
  );

  test('escapeHtml leaves nothing for the parser to read as markup', () => {
    const el = document.createElement('div');
    el.innerHTML = escapeHtml('<b>&amp;</b>');
    expect(el.textContent).toBe('<b>&amp;</b>');
  });
});

describe('every lesson, English and Spanish', () => {
  // A lesson that uses an entity the table lacks shows its name on screen
  // and in the PDF. This names the lesson and the place, so the fix is to add
  // one line to ENTITIES, not to hunt.
  test.each(LESSONS)('%s uses only entities the table knows', (id, lesson) => {
    const unknown = [];
    for (const [at, text] of strings(lesson)) {
      for (const ref of text.match(LEFTOVER) || []) {
        if (decodeEntities(ref) === ref) unknown.push(`${at}: ${ref}`);
      }
    }
    expect({ id, unknown }).toEqual({ id, unknown: [] });
  });

  test.each(LESSONS)('%s shows no entity in any step', (id, lesson) => {
    const found = [];
    for (const [i, step] of (lesson.steps || []).entries()) {
      for (const [at, text] of strings(step)) {
        const left = shown(text).match(LEFTOVER);
        if (left) found.push(`steps[${i}].${at}: ${left.join(' ')}`);
      }
    }
    expect({ id, found }).toEqual({ id, found: [] });
  });
});

describe('the PDFs read the same table', () => {
  test('plainText() folds the no-break space to ASCII, for the standard fonts', () => {
    expect(plainText('HD&nbsp;209458 &mdash; La&nbsp;Silla')).toBe(
      'HD 209458 \u2014 La Silla'
    );
  });

  // The lab report had its own plain(), and it never decoded anything: a
  // student who picked "Sun&rsquo;s" handed in a PDF that said so.
  const decode = bytes => new TextDecoder('latin1').decode(bytes);
  const drawn = pdf =>
    [...decode(pdf).matchAll(/\(((?:\\.|[^()\\])*)\)\s*Tj/g)]
      .map(m => m[1].replace(/\\([()\\])/g, '$1'))
      .join(' ');

  /** An option that carries an entity, where there is one, so it is printed. */
  const entityOption = (step, otherwise) => {
    const i = step.options.findIndex(o => /&[a-zA-Z#][a-zA-Z0-9]*;/.test(o));
    return i >= 0 ? i : otherwise;
  };

  function reportFor(inv, answers = {}) {
    const responses = {};
    const stepIdFor = i => inv.steps[i].sid || `s${i}`;
    for (const [i, step] of inv.steps.entries()) {
      const id = stepIdFor(i);
      // A wrong choice prints the right one too, so both are lesson text here.
      if (step.options)
        responses[id] = entityOption(
          step,
          step.type === 'predict' ? 0 : step.answer
        );
      else if (step.kind === 'numeric') responses[id] = step.answer;
      else if (step.kind === 'short')
        responses[id] = answers.short ?? 'An answer.';
      for (const f of step.fields || []) responses[`${id}:${f.id}`] = '1';
    }
    return drawn(
      buildLabReport({
        investigation: inv,
        name: 'A Student',
        responses,
        attempts: {},
        visited: new Set(inv.steps.keys()),
        startedAt: '2026-09-27T12:00:00Z',
        stepIdFor,
        checkAnswer,
        decodeEntities,
      })
    );
  }

  test.each(INVESTIGATIONS.map(inv => [inv.id, inv]))(
    '%s: no entity reaches the lab report',
    (id, inv) => {
      expect({ id, found: reportFor(inv).match(LEFTOVER) }).toEqual({
        id,
        found: null,
      });
    }
  );

  test('a prediction written with an entity prints its character', () => {
    const inv = getInvestigation('a-universe-of-stars');
    const step = inv.steps.find(s => s.sid === 'predict-hot-and-faint');
    const option = step.options[entityOption(step, -1)];
    expect(option).toContain('Sun&rsquo;s');
    const report = reportFor(inv);
    expect(report).toContain(toWinAnsi(plainText(option)));
    expect(report).toContain("About the Sun's");
  });

  // What a student wrote is theirs. The completion code is a checksum over
  // it, so decoding "&lt;" in an answer would change both the print and the
  // code the instructor checks it against.
  test('a student answer that says "&lt;" is printed as typed', () => {
    const inv = INVESTIGATIONS.find(i => i.steps.some(s => s.kind === 'short'));
    expect(reportFor(inv, { short: 'r &lt; a, so &amp; it' })).toContain(
      'r &lt; a, so &amp; it'
    );
  });
});
