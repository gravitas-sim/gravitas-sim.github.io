// =============================================================================
// The claims the evidence kit makes about itself
// -----------------------------------------------------------------------------
// Four of these are promises made to an instructor who is about to put this in
// front of students, and a promise with no check behind it is worth nothing:
//
//   nothing is transmitted     no fetch, XHR, sendBeacon or WebSocket anywhere
//                              in the page or anything it imports
//   nothing identifies anyone  no name, email, institution or student-number
//                              field, and no column for one
//   it works on paper          every item is in the static HTML, so a machine
//                              with JavaScript blocked still prints the forms
//   it does not overclaim      the word "validated" never appears as a claim,
//                              and the summary tool prints no verdict
//
// The rest is the ordinary round-trip and malformed-input work.
// =============================================================================

import { describe, test, expect } from '@jest/globals';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CONCEPT_COLUMNS,
  CONCEPT_ITEMS,
  EVALUATION_KIND,
  EVALUATION_SCHEMA,
  FIDELITY_ITEMS,
  USABILITY_ITEMS,
  scoreConcept,
} from '../js/data/evaluation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const read = f => readFileSync(path.join(root, f), 'utf8');
const html = read('evaluation/index.html');
/**
 * The page with its entities decoded, for comparing item text against it.
 * An item stem containing a quotation mark is escaped in the markup, so a raw
 * substring search would report it missing when it is there.
 */
const htmlText = html
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&rsquo;/g, '\u2019')
  .replace(/&mdash;/g, '\u2014');

describe('nothing is transmitted', () => {
  test('the page and its module contain no network call', () => {
    // The module graph is small and flat - the kit imports one data module -
    // so reading both sources is a complete check rather than a sample.
    // Comments stripped first. The module's header names these APIs in order
    // to promise it does not call them, and a scan that counted its own
    // documentation as a violation would force the promise to go unwritten.
    const strip = src =>
      src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const sources = [
      strip(read('js/evaluationKit.js')),
      strip(read('js/data/evaluation.js')),
    ];
    for (const src of sources) {
      for (const api of [
        'fetch(',
        'XMLHttpRequest',
        'sendBeacon',
        'WebSocket',
        'EventSource',
        'navigator.connection',
      ]) {
        expect(src).not.toContain(api);
      }
    }
  });

  test('the page markup posts nowhere', () => {
    // A <form action> would submit on Enter even with no JavaScript at all,
    // which is exactly the case this page is built for.
    expect(html).not.toMatch(/<form/i);
    expect(html).not.toMatch(/action\s*=/i);
    expect(html).not.toMatch(/https?:\/\/(?!localhost)/);
  });

  test('the built bundle contains no network call either', () => {
    // Source is what a reviewer reads; the bundle is what a browser runs. If
    // dist/ has not been built this is skipped rather than passing vacuously.
    const bundle = path.join(root, 'dist', 'js', 'evaluationKit.js');
    if (!existsSync(bundle)) return;
    const built = readFileSync(bundle, 'utf8');
    for (const api of ['XMLHttpRequest', 'sendBeacon', 'WebSocket']) {
      expect(built).not.toContain(api);
    }
    // `fetch(` can appear inside a minified identifier, so this looks for a
    // call on the global rather than the substring.
    expect(built).not.toMatch(/\bfetch\s*\(/);
  });
});

describe('nothing identifies anyone', () => {
  const FORBIDDEN =
    /\b(name|email|e-mail|surname|forename|student\s*(id|number)|institution|school|address|phone|dob|birth\s*date)\b/i;

  test('no instrument item asks for an identifier', () => {
    for (const item of [
      ...FIDELITY_ITEMS,
      ...CONCEPT_ITEMS,
      ...USABILITY_ITEMS,
    ]) {
      const text = `${item.label || ''} ${item.stem || ''} ${item.hint || ''}`;
      expect({ id: item.id, text, hit: FORBIDDEN.test(text) }).toEqual({
        id: item.id,
        text,
        hit: false,
      });
    }
  });

  test('the export has no column for one', () => {
    for (const col of CONCEPT_COLUMNS) expect(FORBIDDEN.test(col)).toBe(false);
    expect(CONCEPT_COLUMNS).toContain('participant');
  });

  test('no input on the page collects one', () => {
    // Catches an <input name="email"> added later without touching the data.
    const inputs = html.match(/<(input|textarea|select)[^>]*>/gi) || [];
    for (const tag of inputs) {
      expect({ tag, hit: FORBIDDEN.test(tag) }).toEqual({ tag, hit: false });
    }
    expect(html).not.toMatch(/autocomplete\s*=\s*"(name|email|tel)"/i);
  });
});

describe('it works on paper', () => {
  test('every item appears in the static HTML', () => {
    // The page is the printable artifact. If an item exists only in the data
    // module, a machine with JavaScript blocked prints a form missing a
    // question and nobody notices until the class has taken it.
    for (const item of CONCEPT_ITEMS) {
      expect(htmlText).toContain(item.stem.slice(0, 40));
      for (const option of item.options) {
        expect(htmlText).toContain(option.slice(0, 30));
      }
    }
    for (const item of FIDELITY_ITEMS) expect(htmlText).toContain(item.label);
    for (const item of USABILITY_ITEMS) expect(htmlText).toContain(item.stem);
  });

  test('the answer key is not in the page a class is handed', () => {
    // The key lives in the data module and the JSON template. Printing it here
    // would be the one mistake that cannot be undone after the fact.
    expect(html).not.toMatch(/\banswer\s*[:=]\s*\d/);
    expect(html).toContain('not printed here');
  });

  test('the tools panel is hidden until JavaScript reveals it', () => {
    expect(html).toMatch(/id="ekTools"[^>]*\bhidden\b/);
  });
});

describe('it does not overclaim', () => {
  test('the page calls the instrument a pilot and says it is unvalidated', () => {
    expect(html).toMatch(/pilot instruments/i);
    expect(html).toMatch(/has not been through item analysis/i);
    expect(html).toMatch(/no measured learning gain/i);
  });

  test('the page never claims validation', () => {
    // "not been ... validation against" is the honest usage; a bare claim is
    // what this forbids.
    expect(html).not.toMatch(/\b(is|are|has been)\s+validated\b/i);
  });

  test('the summary tool prints no verdict', () => {
    const tool = read('tools/evaluation-summary.mjs');
    expect(tool).not.toMatch(/\bp-?value\b(?!.*not)/i);
    expect(tool).not.toMatch(/significant(ly)?\b(?!.*never|.*no\b)/i);
    expect(tool).toMatch(/Nothing below is a finding/);
  });

  test('research ethics and institutional review are stated', () => {
    expect(html).toMatch(/institutional review/i);
    expect(html).toMatch(/Gravitas transmits nothing/i);
    expect(html).toMatch(
      /classroom improvement is not automatically research/i
    );
  });
});

describe('scoring and schema', () => {
  test('scores a complete sheet', () => {
    const perfect = Object.fromEntries(
      CONCEPT_ITEMS.map(i => [i.id, String(i.answer)])
    );
    const s = scoreConcept(perfect);
    expect(s.correct).toBe(CONCEPT_ITEMS.length);
    expect(s.answered).toBe(CONCEPT_ITEMS.length);
  });

  test('counts blanks as unanswered rather than wrong', () => {
    const partial = Object.fromEntries(
      CONCEPT_ITEMS.map((i, n) => [i.id, n < 3 ? String(i.answer) : ''])
    );
    const s = scoreConcept(partial);
    expect(s.answered).toBe(3);
    expect(s.correct).toBe(3);
    expect(s.perItem[CONCEPT_ITEMS[5].id]).toBeNull();
  });

  test('every item has a key inside its own option list', () => {
    for (const item of CONCEPT_ITEMS) {
      expect(Number.isInteger(item.answer)).toBe(true);
      expect(item.answer).toBeGreaterThanOrEqual(0);
      expect(item.answer).toBeLessThan(item.options.length);
      expect(item.from).toBeTruthy();
    }
  });

  test('the four assessed domains are evenly covered', () => {
    const counts = {};
    for (const i of CONCEPT_ITEMS)
      counts[i.domain] = (counts[i.domain] || 0) + 1;
    expect(Object.keys(counts).sort()).toEqual([
      'illustration',
      'measurement',
      'model',
      'orbital',
    ]);
    expect(new Set(Object.values(counts)).size).toBe(1);
  });
});

describe('the summary tool reads what the page writes', () => {
  const tool = path.join(root, 'tools', 'evaluation-summary.mjs');
  const run = (...args) =>
    execFileSync(process.execPath, [tool, ...args], { encoding: 'utf8' });

  const csv = rows => [CONCEPT_COLUMNS.join(','), ...rows].join('\n') + '\n';
  const sheet = (occasion, code, correctCount) =>
    CONCEPT_COLUMNS.map(col => {
      if (col === 'schema') return String(EVALUATION_SCHEMA);
      if (col === 'instrument') return 'concept';
      if (col === 'occasion') return occasion;
      if (col === 'participant') return code;
      const item = CONCEPT_ITEMS.find(i => i.id === col);
      const index = CONCEPT_ITEMS.indexOf(item);
      return String(
        index < correctCount
          ? item.answer
          : (item.answer + 1) % item.options.length
      );
    }).join(',');

  test('round-trips a CSV the exporter would produce', () => {
    const file = path.join(root, 'tmp-eval-roundtrip.csv');
    const text = csv([
      sheet('pre', 'brisk-comet-41', 3),
      sheet('post', 'brisk-comet-41', 9),
      sheet('pre', 'warm-nebula-07', 4),
      sheet('post', 'warm-nebula-07', 8),
    ]);
    writeFileSync(file, text);
    try {
      const out = run(file, '--json');
      const summary = JSON.parse(out);
      expect(summary.counts.sheets).toBe(4);
      expect(summary.counts.paired).toBe(2);
      expect(summary.paired.meanPre).toBeCloseTo(3.5, 6);
      expect(summary.paired.meanPost).toBeCloseTo(8.5, 6);
      expect(summary.paired.meanChange).toBeCloseTo(5, 6);
      expect(summary.problems).toEqual([]);
    } finally {
      unlinkSync(file);
    }
  });

  test('reports collisions instead of merging them', () => {
    const file = path.join(root, 'tmp-eval-collide.csv');
    writeFileSync(
      file,
      csv([
        sheet('pre', 'same-code-11', 3),
        sheet('pre', 'same-code-11', 5),
        sheet('post', 'same-code-11', 9),
      ])
    );
    try {
      const summary = JSON.parse(run(file, '--json'));
      expect(summary.counts.paired).toBe(0);
      expect(summary.collisions.length).toBe(1);
      expect(summary.collisions[0]).toContain('same-code-11');
    } finally {
      unlinkSync(file);
    }
  });

  test('accounts for missing answers rather than dropping them', () => {
    const file = path.join(root, 'tmp-eval-missing.csv');
    const row = sheet('pre', 'quiet-pulsar-88', 12).split(',');
    row[4] = '';
    row[5] = '';
    writeFileSync(file, csv([row.join(',')]));
    try {
      const summary = JSON.parse(run(file, '--json'));
      expect(summary.missing.blankItems).toBe(2);
      expect(summary.missing.sheetsWithAny).toBe(1);
    } finally {
      unlinkSync(file);
    }
  });

  test('refuses a newer schema and a foreign document', () => {
    const newer = path.join(root, 'tmp-eval-newer.json');
    writeFileSync(
      newer,
      JSON.stringify({
        kind: EVALUATION_KIND,
        schema: EVALUATION_SCHEMA + 1,
        records: [],
      })
    );
    const foreign = path.join(root, 'tmp-eval-foreign.json');
    writeFileSync(
      foreign,
      JSON.stringify({ kind: 'something.else', records: [] })
    );
    try {
      expect(JSON.parse(run(newer, '--json')).problems[0]).toMatch(/schema/);
      expect(JSON.parse(run(foreign, '--json')).problems[0]).toMatch(
        /not a Gravitas evaluation export/
      );
    } finally {
      unlinkSync(newer);
      unlinkSync(foreign);
    }
  });

  test('names a malformed CSV rather than throwing', () => {
    const bad = path.join(root, 'tmp-eval-bad.csv');
    writeFileSync(bad, 'not,a,header\n1,2,3\n');
    try {
      const summary = JSON.parse(run(bad, '--json'));
      expect(summary.problems[0]).toMatch(/header/);
      expect(summary.counts.sheets).toBe(0);
    } finally {
      unlinkSync(bad);
    }
  });

  test('says nothing about change when there are no pairs', () => {
    const file = path.join(root, 'tmp-eval-unpaired.csv');
    writeFileSync(file, csv([sheet('pre', '', 3), sheet('post', '', 9)]));
    try {
      const text = run(file);
      expect(text).toMatch(/No paired sheets, so no change is reported/);
      expect(JSON.parse(run(file, '--json')).paired).toBeNull();
    } finally {
      unlinkSync(file);
    }
  });
});
