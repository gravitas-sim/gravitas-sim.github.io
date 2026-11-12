// =============================================================================
// Cohesion II: discovery at scale (Roadmap III Prompt 287)
// -----------------------------------------------------------------------------
// The science phases tripled the content under Prompt 161's model. This holds
// what the second pass decided: the sequences overlap by no more than the
// committed share, a topic page divides a long list into sub-topics inside the
// same page, the recommended starts are first-use entries, the Library's index
// stays inside its committed size, a folded sequence's old id still resolves,
// and every card, link, filter and control the ledger judged has its verdict
// and its register row. The ceilings live in tools/navigation-inventory.json
// (ceilings.scale); a later prompt that needs more raises one with a register
// row. Structure only: none of this says a visitor understands anything.
// =============================================================================

import { describe, expect, test } from '@jest/globals';
import { readFileSync, statSync } from 'node:fs';
import { MAX_TOPIC_ROWS, topicView } from '../js/library/views.js';
import { SEQUENCE_ALIASES } from '../js/data/sequenceAliases.js';

const file = rel => new URL(`../${rel}`, import.meta.url);
const read = rel => readFileSync(file(rel), 'utf8');
const LIB = JSON.parse(read('library/library.json'));
const INV = JSON.parse(read('tools/navigation-inventory.json'));
const LEDGER = JSON.parse(read('tools/cohesion-ledger.json'));
const SCALE = INV.ceilings.scale;
const BY_ID = new Map(LIB.entries.map(e => [e.id, e]));

describe('the sequences', () => {
  const pairs = [];
  for (const [i, a] of LIB.sequences.entries())
    for (const b of LIB.sequences.slice(i + 1)) {
      const shared = a.entries.filter(id => b.entries.includes(id)).length;
      const smaller = Math.min(a.entries.length, b.entries.length);
      if (shared)
        pairs.push({ a: a.id, b: b.id, percent: (100 * shared) / smaller });
    }

  test(`no two share more than ${SCALE.sequenceOverlapPercent} percent of the smaller one`, () => {
    const over = pairs.filter(p => p.percent > SCALE.sequenceOverlapPercent);
    expect(over).toEqual([]);
  });

  test('every pair over half is a judged pair in the ledger, with its verdict and the percent as measured', () => {
    const judged = LEDGER.overlaps.filter(o => o.verdict !== 'CONSOLIDATE');
    const half = pairs.filter(p => p.percent >= 50);
    expect(half.map(p => [p.a, p.b, Math.round(p.percent)]).sort()).toEqual(
      judged.map(o => [o.a, o.b, o.percent]).sort()
    );
    for (const o of judged) expect(o.verdict).toBe('KEEP');
  });

  test('Stars, in depth is the second tier of Light and stars, and its old id still resolves', () => {
    expect(SEQUENCE_ALIASES['stars-in-depth']).toBe('light-and-stars');
    expect(LIB.sequences.some(s => s.id === 'stars-in-depth')).toBe(false);
    expect(LIB.sequenceAliases['stars-in-depth']).toBe('light-and-stars');
    const light = LIB.sequences.find(s => s.id === 'light-and-stars');
    expect(light.entries).toHaveLength(25);
    expect(light.tiers).toEqual([{ id: 'deeper', at: 13 }]);
    // The path is what the sequence was; nothing of either was dropped.
    expect(new Set(light.entries).size).toBe(25);
  });

  test('every alias names a sequence that exists, and no sequence still carries an alias id', () => {
    const ids = new Set(LIB.sequences.map(s => s.id));
    for (const [from, to] of Object.entries(SEQUENCE_ALIASES)) {
      expect(ids.has(to)).toBe(true);
      expect(ids.has(from)).toBe(false);
    }
  });

  test('a tier starts inside its sequence, and only a sequence with entries on both sides has one', () => {
    for (const s of LIB.sequences)
      for (const t of s.tiers ?? []) {
        expect(t.at).toBeGreaterThan(0);
        expect(t.at).toBeLessThan(s.entries.length);
      }
  });
});

describe('the topic pages', () => {
  const c = { t: k => k, pick: x => x.en, shown: LIB.kindShown };
  const lists = html => {
    // Each list with the number of rows it holds, and whether a sub-topic
    // heading sits directly above it.
    const out = [];
    const re = /(<h5>[\s\S]*?<\/h5>)?<ul class="lib-rows">([\s\S]*?)<\/ul>/g;
    for (const m of html.matchAll(re))
      out.push({
        rows: (m[2].match(/<li class="lib-row"/g) ?? []).length,
        sub: Boolean(m[1]),
      });
    return out;
  };

  test('the committed length is the one the page uses', () => {
    expect(SCALE.topicRowsUndivided).toBe(MAX_TOPIC_ROWS);
  });

  test('no undivided list is longer than the committed length, and no sub-topic longer than its own', () => {
    for (const s of LIB.subjects) {
      const { html } = topicView(LIB, s.id, c);
      for (const l of lists(html)) {
        if (l.sub) expect(l.rows).toBeLessThanOrEqual(SCALE.subtopicRows);
        else expect(l.rows).toBeLessThanOrEqual(SCALE.topicRowsUndivided);
      }
    }
  });

  test('a subject with more investigations of one level than the length is divided, and every investigation is listed once', () => {
    for (const s of LIB.subjects) {
      const { html } = topicView(LIB, s.id, c);
      const mine = LIB.entries.filter(
        e =>
          e.subjects?.includes(s.id) &&
          (LIB.kindShown[e.kind] ?? e.kind) === 'investigation'
      );
      const divided = html.includes('<h5>');
      const longest = Math.max(
        ...['beginner', 'intro'].map(
          level => mine.filter(e => e.level === level).length
        )
      );
      expect([s.id, divided]).toEqual([s.id, longest > MAX_TOPIC_ROWS]);
      for (const e of mine) {
        const links = html.split(`data-entry="${e.id}"`).length - 1;
        expect([e.id, links]).toEqual([e.id, 1]);
      }
    }
  });

  test('at least four subjects are divided today, which is why the rule exists', () => {
    const n = LIB.subjects.filter(s =>
      topicView(LIB, s.id, c).html.includes('<h5>')
    ).length;
    expect(n).toBeGreaterThanOrEqual(4);
  });
});

describe('the index', () => {
  test('library.json and the search index stay inside their committed size', () => {
    expect(statSync(file('library/library.json')).size).toBeLessThanOrEqual(
      SCALE.libraryJsonKb * 1024
    );
    expect(
      statSync(file('library/search-index.json')).size
    ).toBeLessThanOrEqual(SCALE.searchIndexKb * 1024);
  });
});

describe('the recommended starts', () => {
  const entries = LIB.starts.flatMap(g => g.entries.map(id => BY_ID.get(id)));

  test('are first-use entries: no prerequisite, one class period at most, a kind a student sees', () => {
    for (const e of entries) {
      expect([e.id, e.rel.pre ?? []]).toEqual([e.id, []]);
      if (e.kind !== 'course')
        expect([e.id, e.duration.max <= SCALE.startMinutes]).toEqual([
          e.id,
          true,
        ]);
      expect(Object.values(LIB.kindShown)).toContain(LIB.kindShown[e.kind]);
    }
  });

  test('name each entry once, and cover both a first look and a measurement', () => {
    const ids = entries.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(entries.some(e => e.kind === 'dataset')).toBe(true);
    expect(entries.some(e => e.kind === 'scenario')).toBe(true);
    expect(entries.some(e => e.kind === 'course')).toBe(true);
  });
});

describe('the ledger of what was added since 2.0.0', () => {
  const register = read('DECISION_REGISTER.md')
    .split('\n')
    .filter(l => l.startsWith('| D-R10-287-'));

  test('judges every item once with the decision function, and a verdict that is not KEEP says what was done', () => {
    const ids = LEDGER.items.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of LEDGER.items) {
      expect(LEDGER.verdicts).toContain(i.verdict);
      for (const k of ['place', 'evidence', 'exposure', 'action', 'since'])
        expect(`${i.id}:${k}:${Boolean(i[k])}`).toBe(`${i.id}:${k}:true`);
      if (i.verdict !== 'KEEP') expect(i.action.length).toBeGreaterThan(30);
    }
    // Nothing was retired: a capability is never removed, only a presentation.
    expect(LEDGER.items.some(i => i.verdict === 'RETIRE')).toBe(false);
  });

  test('every item has its own register row of ten fields, delegated, naming its verdict', () => {
    for (const i of LEDGER.items) {
      const row = register.find(l => l.startsWith(`| ${i.row} |`));
      expect([i.row, Boolean(row)]).toEqual([i.row, true]);
      const fields = row.split('|');
      expect(fields).toHaveLength(10);
      expect(fields[5]).toContain('DELEGATED');
      expect(fields[2]).toContain(`**${i.verdict}**`);
    }
  });

  test('the general rows 01 to 07 exist', () => {
    for (let n = 1; n <= 7; n++)
      expect(register.some(l => l.startsWith(`| D-R10-287-0${n} |`))).toBe(
        true
      );
  });
});
