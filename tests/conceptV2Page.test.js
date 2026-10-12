/**
 * @jest-environment jsdom
 */
// The page half of concept/2: the kit's version switch writes one version's
// columns, names it in the instrument column, and never mixes the two
// versions' answers in a single export. The static forms are in
// tests/conceptV2.test.js; this drives the enhancement.

import { describe, test, expect, beforeAll } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  CONCEPT_COLUMNS,
  CONCEPT_V2_COLUMNS,
  CONCEPT_V2_INSTRUMENT,
} from '../js/data/evaluation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const page = readFileSync(
  path.join(here, '..', 'evaluation', 'index.html'),
  'utf8'
);

const downloads = [];

beforeAll(async () => {
  document.body.innerHTML = page.slice(
    page.indexOf('<main'),
    page.indexOf('</main>') + 7
  );
  URL.createObjectURL = blob => {
    downloads.push(blob);
    return 'blob:test';
  };
  URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = () => {};
  await import('../js/evaluationKit.js');
});

const lastCsv = async () => {
  const text = await downloads[downloads.length - 1].text();
  const [header, row] = text.trim().split('\n');
  return { header: header.split(','), row: row.split(',') };
};

describe('the kit exports one concept version at a time', () => {
  test('a radio group sits under every v1 and v2 item', () => {
    expect(document.querySelectorAll('#q01 input[type=radio]')).toHaveLength(4);
    expect(document.querySelectorAll('#r16 input[type=radio]')).toHaveLength(4);
  });

  test('version 1 is the default and carries no v2 column', async () => {
    document.getElementById('q01-1').click();
    document.getElementById('r01-2').click();
    document.getElementById('ekCsv').click();
    const { header, row } = await lastCsv();
    expect(header).toEqual([...CONCEPT_COLUMNS]);
    expect(row[header.indexOf('instrument')]).toBe('concept');
    expect(row[header.indexOf('q01')]).toBe('1');
  });

  test('choosing the draft writes only its columns and names it', async () => {
    const select = document.getElementById('ekVersion');
    select.value = CONCEPT_V2_INSTRUMENT;
    select.dispatchEvent(new Event('change'));
    document.getElementById('ekCsv').click();
    const { header, row } = await lastCsv();
    expect(header).toEqual([...CONCEPT_V2_COLUMNS]);
    expect(row[header.indexOf('instrument')]).toBe('concept/2');
    expect(row[header.indexOf('r01')]).toBe('2');
    expect(header.some(h => /^q\d\d$/.test(h))).toBe(false);
  });

  test('the JSON concept record carries the draft ids and no v1 ids', async () => {
    document.getElementById('ekJson').click();
    const doc = JSON.parse(await downloads[downloads.length - 1].text());
    const concept = doc.records.find(r => r.instrument === 'concept/2');
    expect(concept.r01).toBe('2');
    expect(Object.keys(concept).some(k => /^q\d\d$/.test(k))).toBe(false);
  });
});
