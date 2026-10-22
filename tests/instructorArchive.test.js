// =============================================================================
// The term's archive (Prompt 168, js/instructorArchive.js)
// -----------------------------------------------------------------------------
// One file holds the reports as they were handed in, the names that grouped
// them and the marks; it opens again through the same readers; a 2.0.0 page
// refuses it in words rather than misreading it.
// =============================================================================

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import {
  ARCHIVE_FORMAT,
  ARCHIVE_VERSION,
  MAX_REPORTS,
  archiveName,
  buildArchive,
  isArchiveText,
  readArchive,
} from '../js/instructorArchive.js';
import { WORDS, tr } from '../js/instructorTermText.js';
import { archiveOld, run } from './compat/harness.js';

const reports = [
  { label: 'ada.pdf', kind: 'pdf', thing: '#s2zAAAA' },
  { label: 'paste', kind: 'token', thing: '#s2zBBBB' },
  { label: 'ben.json', kind: 'backup', thing: { lesson: { id: 'x' } } },
];
const named = [
  { label: 'course.json', text: '{"format":"gravitas.course-pack"}' },
];
const NOW = new Date('2027-05-20T10:00:00Z');

describe('the archive file', () => {
  test('keeps each report as it was handed in, the names and the marks, and reads back', () => {
    const text = buildArchive({
      reports,
      named,
      marks: 'schema,submission\n',
      term: 'Spring 2027',
      now: NOW,
    });
    expect(isArchiveText(text)).toBe(true);
    const doc = JSON.parse(text);
    expect(doc.format).toBe(ARCHIVE_FORMAT);
    expect(doc.formatVersion).toBe(ARCHIVE_VERSION);
    expect(doc.savedAt).toBe(NOW.toISOString());
    const read = readArchive(text);
    expect(read.ok).toBe(true);
    expect(read.archive.term).toBe('Spring 2027');
    expect(read.archive.reports).toEqual(reports);
    expect(read.archive.named).toEqual(named);
    expect(read.archive.marks).toBe('schema,submission\n');
  });

  test('has no term or marks unless there are some', () => {
    const doc = JSON.parse(buildArchive({ reports, now: NOW }));
    expect('term' in doc).toBe(false);
    expect('marks' in doc).toBe(false);
    expect(doc.named).toEqual([]);
  });

  test('refuses what it cannot read, by reason', () => {
    const ok = JSON.parse(buildArchive({ reports, now: NOW }));
    const reason = x => readArchive(JSON.stringify(x)).reason;
    expect(readArchive('not json').reason).toBe('notJson');
    expect(reason({ ...ok, format: 'gravitas.made' })).toBe('wrongFormat');
    expect(reason([1])).toBe('wrongFormat');
    expect(reason({ ...ok, formatVersion: 2 })).toBe('newer');
    expect(reason({ ...ok, formatVersion: 'x' })).toBe('shape');
    expect(reason({ ...ok, reports: 'x' })).toBe('shape');
    expect(reason({ ...ok, reports: [{ kind: 'token', label: 'a' }] })).toBe(
      'shape'
    );
    expect(
      reason({ ...ok, reports: [{ kind: 'backup', label: 'a', backup: 'x' }] })
    ).toBe('shape');
    expect(
      reason({ ...ok, reports: [{ kind: 'zip', label: 'a', token: 'x' }] })
    ).toBe('shape');
    expect(reason({ ...ok, named: [{ text: 5 }] })).toBe('shape');
    expect(
      reason({
        ...ok,
        reports: Array.from({ length: MAX_REPORTS + 1 }, () => reports[0]),
      })
    ).toBe('tooMany');
  });

  test('is named for its term and its day', () => {
    expect(archiveName('Spring 2027', '2027-05-20')).toBe(
      'gravitas-archive-spring-2027-2027-05-20.json'
    );
    expect(archiveName('Otoño 2027', '2027-12-01')).toBe(
      'gravitas-archive-otono-2027-2027-12-01.json'
    );
    expect(archiveName(null, '2027-05-20')).toBe(
      'gravitas-archive-2027-05-20.json'
    );
  });
});

describe('the words', () => {
  test('both languages hold the same ids', () => {
    expect(Object.keys(WORDS.es).sort()).toEqual(Object.keys(WORDS.en).sort());
  });
  test('fill their slots, and fall back to English and then to the id', () => {
    expect(
      tr('es', 'archive.opened', { file: 'a.json', n: 3, marks: '' })
    ).toBe('Se abrió a.json: 3 entregas.');
    expect(tr('en', 'no.such.id')).toBe('no.such.id');
  });
});

describe('a page from 2.0.0', () => {
  let old;
  beforeAll(() => {
    old = archiveOld();
  });
  afterAll(() => old?.cleanup());

  test('reads the archive as a progress backup and refuses it in words', () => {
    const doc = JSON.parse(buildArchive({ reports, now: NOW }));
    const read = run(old.tree, 'progress-backup', 'read', doc);
    expect(read.ok).toBe(true);
    expect(read.value.accepted).toBe(false);
    expect(read.value.problems.join(' ')).toMatch(/\w/);
  });
});
