// =============================================================================
// Teach: the instructor's collection editor (Roadmap III Prompt 164)
// =============================================================================

import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test } from '@jest/globals';
import { mountMaker } from '../js/library/collectionMaker.js';
import { readCollections, toggleSaved } from '../js/library/collections.js';
import { readCourseFragment } from '../js/course/links.js';
import { validateCoursePack } from '../js/course/pack.js';
import { courseApi } from '../js/course/api.js';

const library = JSON.parse(readFileSync('library/library.json', 'utf8'));
const byId = new Map(library.entries.map(e => [e.id, e]));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = 'en';
  document.body.innerHTML = '<div id="host"></div>';
  globalThis.fetch = async () => ({ ok: true, json: async () => library });
});

const open = async ids => {
  for (const id of ids) toggleSaved(byId.get(id));
  const host = document.getElementById('host');
  await mountMaker(host);
  return host;
};
const type = (host, selector, value) => {
  const n = host.querySelector(selector);
  n.value = value;
  n.dispatchEvent(new Event('input', { bubbles: true }));
};
const press = async (host, selector) => {
  host.querySelector(selector).click();
  await new Promise(r => setTimeout(r, 20));
};
const SET = [
  'investigation:tides',
  'scenario:solar-system',
  'dataset:tess-light-curve',
];

describe('with nothing saved', () => {
  test('says where to save, and offers no link', async () => {
    const host = await open([]);
    expect(host.querySelector('a[href="/library/"]')).not.toBe(null);
    expect(host.querySelector('#coll-link-make')).toBe(null);
  });
});

describe('with items saved', () => {
  test('lists each in the order saved, with a depth only where one applies', async () => {
    const host = await open(SET);
    const rows = [...host.querySelectorAll('[data-item]')];
    expect(rows.map(r => r.dataset.item)).toEqual([
      'lesson-tides',
      'scenario-solar-system',
      'dataset-tess-light-curve',
    ]);
    expect(rows.map(r => !!r.querySelector('select'))).toEqual([
      true,
      false,
      false,
    ]);
  });

  test('refuses a link before it has a title', async () => {
    const host = await open(SET);
    await press(host, '#coll-link-make');
    expect(host.querySelector('[data-role="status"]').textContent).toMatch(
      /Name the collection/
    );
    expect(host.querySelector('#coll-link').value).toBe('');
  });

  test('makes a link that holds a valid collection, with the note, depth and order', async () => {
    const host = await open(SET);
    type(host, '[data-f="title.en"]', 'Tides, three ways');
    type(host, '#coll-note-en-0', 'Start here.');
    const depth = host.querySelector('#coll-depth-0');
    depth.value = 'quantitative';
    depth.dispatchEvent(new Event('change', { bubbles: true }));
    await press(host, '[data-item="dataset-tess-light-curve"] [data-act="up"]');
    await press(host, '#coll-link-make');
    const url = host.querySelector('#coll-link').value;
    expect(url).toMatch(/\/course\/#c2z/);
    const made = await readCourseFragment(url.split('#')[1]);
    expect(validateCoursePack(made, courseApi())).toEqual([]);
    expect(made.profile).toBe('collection');
    expect(made.id).toBe('tides-three-ways');
    expect(made.locales).toEqual(['en']);
    expect(made.units[0].items.map(i => i.id)).toEqual([
      'lesson-tides',
      'dataset-tess-light-curve',
      'scenario-solar-system',
    ]);
    expect(made.units[0].items[0]).toMatchObject({
      depth: 'quantitative',
      studentNote: { en: 'Start here.' },
    });
  });

  test('keeps order, notes and depth on the saved collection as they change', async () => {
    const host = await open(SET);
    type(host, '#coll-note-en-1', 'Run it twice.');
    await press(host, '[data-item="lesson-tides"] [data-act="down"]');
    const items = readCollections().saved.units[0].items;
    expect(items.map(i => i.id)).toEqual([
      'scenario-solar-system',
      'lesson-tides',
      'dataset-tess-light-curve',
    ]);
    expect(items[0].studentNote).toEqual({ en: 'Run it twice.' });
  });

  test('removes an item from the list and from the saved collection', async () => {
    const host = await open(SET);
    await press(host, '[data-item="lesson-tides"] [data-act="remove"]');
    expect(host.querySelectorAll('[data-item]')).toHaveLength(2);
    expect(readCollections().saved.units[0].items).toHaveLength(2);
  });

  test('asks for every text in Spanish once one has it, and makes no Spanish up', async () => {
    const host = await open(SET);
    type(host, '[data-f="title.en"]', 'Tides');
    type(host, '[data-f="title.es"]', 'Mareas');
    type(host, '#coll-note-en-0', 'Start here.');
    await press(host, '#coll-link-make');
    expect(host.querySelector('[data-role="status"]').textContent).toMatch(
      /Missing: note 1/
    );
    expect(host.querySelector('#coll-link').value).toBe('');
    type(host, '#coll-note-es-0', 'Empieza aquí.');
    await press(host, '#coll-link-make');
    const made = await readCourseFragment(
      host.querySelector('#coll-link').value.split('#')[1]
    );
    expect(made.locales).toEqual(['en', 'es']);
    expect(made.title.es).toBe('Mareas');
    expect(made.title.esOf).toMatch(/^[0-9a-f]{8}$/);
    expect(validateCoursePack(made, courseApi())).toEqual([]);
  });

  test('never uses the id of the student’s own collection', async () => {
    const host = await open(SET);
    type(host, '[data-f="title.en"]', 'Saved items');
    await press(host, '#coll-link-make');
    const made = await readCourseFragment(
      host.querySelector('#coll-link').value.split('#')[1]
    );
    expect(made.id).toBe('saved-items-shared');
  });
});
