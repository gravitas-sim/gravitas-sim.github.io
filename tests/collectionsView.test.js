// =============================================================================
// The controls of saved items and kept collections (Roadmap III Prompt 164)
// =============================================================================

import { readFileSync } from 'node:fs';
import '../js/library/collectionsDeps.js';
import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  drawCollections,
  mountKeep,
  mountSave,
} from '../js/library/collectionsView.js';
import {
  keepCollection,
  readCollections,
  toggleSaved,
} from '../js/library/collections.js';

const library = JSON.parse(readFileSync('library/library.json', 'utf8'));
const byId = new Map(library.entries.map(e => [e.id, e]));
const t = (id, v = {}) =>
  `${id}${Object.keys(v).length ? ` ${JSON.stringify(v)}` : ''}`;
const pick = x => x?.en ?? '';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

const itemPage = id => {
  document.body.innerHTML = `<div id="box"><article class="lib-item"><h2>x</h2><p>y</p></article></div>`;
  const box = document.getElementById('box');
  mountSave(box, byId.get(id), { t });
  return box;
};

describe('the Save button of an item page', () => {
  test('saves, says so, and takes it out again; pressed state follows', () => {
    const box = itemPage('investigation:tides');
    const b = box.querySelector('[data-save]');
    expect(b.getAttribute('aria-pressed')).toBe('false');
    b.click();
    expect(b.getAttribute('aria-pressed')).toBe('true');
    expect(box.querySelector('.lib-save-note').textContent).toBe(
      'lib.save.done'
    );
    expect(readCollections().saved.units[0].items[0].lesson).toBe('tides');
    b.click();
    expect(b.getAttribute('aria-pressed')).toBe('false');
    expect(readCollections().saved).toBe(null);
  });

  test('is there when an item is already saved, and absent where a collection cannot hold it', () => {
    toggleSaved(byId.get('investigation:tides'));
    expect(
      itemPage('investigation:tides')
        .querySelector('[data-save]')
        .getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      itemPage('course:intro-astronomy').querySelector('[data-save]')
    ).toBe(null);
  });

  test('is not added twice by a second mount', () => {
    const box = itemPage('investigation:tides');
    mountSave(box, byId.get('investigation:tides'), { t });
    expect(box.querySelectorAll('.lib-save')).toHaveLength(1);
  });
});

describe('your collections', () => {
  const host = () => {
    document.body.innerHTML = '<div id="h"></div>';
    return document.getElementById('h');
  };
  const draw = (h, redraw) =>
    drawCollections(h, { t, pick, byId, redraw: redraw ?? (() => {}) });

  test('draws the saved items with a link to each and a Remove button on each', () => {
    toggleSaved(byId.get('investigation:tides'));
    toggleSaved(byId.get('scenario:solar-system'));
    const h = host();
    expect(draw(h)).toBe(1);
    expect(h.querySelectorAll('a.lib-link')).toHaveLength(2);
    expect(h.querySelectorAll('[data-remove]')).toHaveLength(2);
    expect(h.querySelector('a[href="/teaching/kit/#collections"]')).not.toBe(
      null
    );
  });

  test('removes one item and asks the page to redraw, once however often it is drawn', () => {
    toggleSaved(byId.get('investigation:tides'));
    toggleSaved(byId.get('investigation:keplers-laws'));
    const h = host();
    let redraws = 0;
    const again = () => {
      redraws++;
      draw(h, again);
    };
    draw(h, again);
    draw(h, again);
    draw(h, again);
    h.querySelector('[data-remove="lesson-tides"]').click();
    expect(redraws).toBe(1);
    expect(readCollections().saved.units[0].items.map(i => i.id)).toEqual([
      'lesson-keplers-laws',
    ]);
  });

  test('draws a kept collection under its own title, and lets go of it', () => {
    const pack = JSON.parse(
      JSON.stringify(library.starts.find(s => s.collection).collection)
    );
    expect(keepCollection(pack)).toBe(true);
    const h = host();
    expect(draw(h)).toBe(1);
    expect(h.querySelector('h3').textContent).toBe(pack.title.en);
    h.querySelector('[data-drop]').click();
    expect(readCollections().received).toEqual([]);
  });

  test('draws nothing when there is nothing', () => {
    expect(draw(host())).toBe(0);
  });
});

describe('the Keep button of the course home', () => {
  test('keeps nothing until it is pressed, then keeps and releases', () => {
    const pack = library.starts.find(s => s.collection).collection;
    document.body.innerHTML = '<p id="k"></p>';
    const k = document.getElementById('k');
    mountKeep(k, pack, { t });
    expect(readCollections().received).toEqual([]);
    const b = k.querySelector('button');
    expect(b.getAttribute('aria-pressed')).toBe('false');
    b.click();
    expect(readCollections().received.map(r => r.pack.id)).toEqual([pack.id]);
    expect(b.getAttribute('aria-pressed')).toBe('true');
    expect(k.querySelector('.ch-keep-note').textContent).toBe(
      'courseHome.keep.done'
    );
    b.click();
    expect(readCollections().received).toEqual([]);
  });
});
