import { describe, test, expect, beforeEach } from '@jest/globals';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  AREAS,
  FAMILY_AREA,
  groupAnchor,
  kernelTable,
  linksFor,
  whereChecked,
} from '../js/explain/where.js';
import { FAMILY_IDS, toggleExplainer } from '../js/explainers.js';

// =============================================================================
// Where to check the physics (Roadmap III, Prompt 286)
// -----------------------------------------------------------------------------
// Every directory of js/kernels has a row; each row's document exists, its model
// page section is on the page, and its validation groups are the ones the
// validation page prints. Every explainer family that stands for physics leads
// to a row, and the Teach table prints them all.
// =============================================================================

const REPO = path.resolve(import.meta.dirname, '..');
const read = f => readFileSync(path.join(REPO, f), 'utf8');
const groups = new Set(
  JSON.parse(read('validation/data.json')).checks.map(c => c.group)
);
const model = read('model/index.html');

describe('the table is the repository', () => {
  test('every directory of js/kernels has a row', () => {
    const dirs = readdirSync(path.join(REPO, 'js/kernels'), {
      withFileTypes: true,
    })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    const have = AREAS.filter(a => a.kernel).map(a => a.id);
    expect(have.sort()).toEqual(dirs.sort());
  });

  test('each area has a document, both names, and a model section and groups that exist', () => {
    const ids = AREAS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of AREAS) {
      expect({ id: a.id, doc: existsSync(path.join(REPO, a.doc)) }).toEqual({
        id: a.id,
        doc: true,
      });
      expect(a.en.length).toBeGreaterThan(2);
      expect(a.es.length).toBeGreaterThan(2);
      if (a.model)
        expect({ id: a.id, there: model.includes(`id="${a.model}"`) }).toEqual({
          id: a.id,
          there: true,
        });
      for (const g of a.groups)
        expect({ id: a.id, g, there: groups.has(g) }).toEqual({
          id: a.id,
          g,
          there: true,
        });
    }
  });

  test('every family of explainers that stands for physics leads to an area', () => {
    const ids = new Set(AREAS.map(a => a.id));
    for (const [family, area] of Object.entries(FAMILY_AREA)) {
      expect(Object.keys(FAMILY_IDS)).toContain(family);
      expect(ids.has(area)).toBe(true);
    }
    // The ones with no area are the ones that are not a model of physics.
    const without = Object.keys(FAMILY_IDS).filter(k => !FAMILY_AREA[k]);
    expect(without.sort()).toEqual(['claim', 'jovian']);
  });

  test('the validation page gives each group the anchor the links use', () => {
    const page = read('js/validationPage.js');
    expect(page).toContain('id="g-${esc(slug(g.name))}"');
    expect(groupAnchor('Lensing II: enclosed mass, images and arcs')).toBe(
      'g-lensing-ii-enclosed-mass-images-and-arcs'
    );
  });
});

describe('what a reader sees', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('an explainer ends with where it is checked, in the reader’s language', async () => {
    document.body.innerHTML =
      '<header id="h"><button id="b"></button></header>';
    const host = document.getElementById('h');
    expect(
      await toggleExplainer(document.getElementById('b'), 'tidal', host)
    ).toBe(true);
    const line = host.nextElementSibling.querySelector('.where-checked');
    expect(line.textContent).toContain('Where this is checked');
    expect(line.querySelector('a[href="/model/#tides"]')).not.toBeNull();
    expect(
      line.querySelector('a[href="/validation/#g-tidal-disruption"]')
    ).not.toBeNull();
    expect(line.querySelector('a[href$="TIDAL_KERNEL.md"]')).not.toBeNull();
    expect(whereChecked('claim', 'en')).toBeNull();
    expect(whereChecked('tidal', 'es').textContent).toContain(
      'Dónde se comprueba'
    );
  });

  test('the Teach table lists every kernel with a link to its document', () => {
    const table = kernelTable('en').querySelector('table');
    const rows = [...table.tBodies[0].rows];
    expect(rows).toHaveLength(AREAS.length);
    for (const row of rows) {
      expect(row.cells[3].querySelector('a').href).toContain('.md');
    }
    const lensing = rows.find(
      r => r.cells[0].textContent === 'Gravitational lensing'
    );
    expect(lensing.cells[1].querySelector('a').getAttribute('href')).toBe(
      '/model/#lensing'
    );
    expect(lensing.cells[2].querySelector('a').getAttribute('href')).toMatch(
      /^\/validation\/#g-lensing-ii/
    );
    const none = rows.find(r => r.cells[0].textContent === 'Cosmology');
    expect(none.cells[1].textContent).toMatch(/No section yet/);
    expect(kernelTable('es').querySelector('th').textContent).toBe('Área');
  });

  test('links lead to a model section, a validation table and the document', () => {
    const lens = AREAS.find(a => a.id === 'lensing');
    expect(linksFor(lens, 'en').map(l => l.text)).toEqual([
      'the model page',
      'the validation table',
      'the kernel document',
    ]);
  });
});
