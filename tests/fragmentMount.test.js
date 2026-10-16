// =============================================================================
// Mounting a family's markup at its host, and taking it out again
// -----------------------------------------------------------------------------
// js/i18n/dom.js mountFragment()/unmountFragment() (INDEX_DECOMPOSITION.md).
// What every family relies on: the markup lands where index.html's host
// stands - same parent, same place - translated before anyone sees it; it is
// never inserted twice, and never beside a copy a page already has; and
// unmounting removes every node it inserted and aborts the signal the family
// handed to every listener it added outside it. Then, per family, the same
// round trip on the real markup: present only while mounted, no duplicate id.
// e2e/fragments.spec.js does it in the application, with listeners counted.
// =============================================================================

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

import {
  fragmentMounted,
  loadFragment,
  mountFragment,
  unmountFragment,
} from '../js/i18n/deferredMessages.js';
import { registerMessages, setLocale } from '../js/i18n/index.js';
import { FRAGMENTS, fragmentMarkup } from '../tools/index-fragments.mjs';

const PAGE = `
  <main id="before"></main>
  <template data-host="probe"></template>
  <footer id="after"></footer>`;

const MARKUP = `<!-- a comment that travels with it -->
<div id="probePanel" role="region" aria-labelledby="probeTitle">
  <h2 id="probeTitle" data-i18n="test.fragment.title">Probe</h2>
  <button id="probeButton" data-i18n-title="test.fragment.hint" title="Hint">x</button>
</div>
<p id="probeNote">note</p>
`;

beforeEach(() => {
  document.body.innerHTML = PAGE;
  registerMessages('en', {
    'test.fragment.title': 'The probe',
    'test.fragment.hint': 'Press it',
  });
  registerMessages('es', {
    'test.fragment.title': 'La sonda',
    'test.fragment.hint': 'Púlsalo',
  });
});

afterEach(async () => {
  unmountFragment('probe');
  await setLocale('en', { persist: false });
});

describe('mountFragment', () => {
  test('puts the markup where the host stands, in its order', () => {
    expect(mountFragment('probe', MARKUP)).toBeInstanceOf(AbortSignal);
    const order = [...document.body.children].map(e => e.id || e.tagName);
    expect(order).toEqual([
      'before',
      'TEMPLATE',
      'probePanel',
      'probeNote',
      'after',
    ]);
    expect(fragmentMounted('probe')).toBe(true);
  });

  test('translates it as it goes in', async () => {
    await setLocale('es', { persist: false });
    mountFragment('probe', MARKUP);
    expect(document.getElementById('probeTitle').textContent).toBe('La sonda');
    expect(document.getElementById('probeButton').title).toBe('Púlsalo');
  });

  test('never twice', () => {
    expect(mountFragment('probe', MARKUP)).not.toBeNull();
    expect(mountFragment('probe', MARKUP)).toBeNull();
    expect(document.querySelectorAll('#probePanel')).toHaveLength(1);
  });

  test('never beside a copy the page already has', () => {
    document.body.insertAdjacentHTML('beforeend', '<p id="probeNote"></p>');
    expect(mountFragment('probe', MARKUP)).toBeNull();
    expect(document.getElementById('probePanel')).toBeNull();
    expect(document.querySelectorAll('#probeNote')).toHaveLength(1);
  });

  test('declines a page without the host', () => {
    document.body.innerHTML = '<main></main>';
    expect(mountFragment('probe', MARKUP)).toBeNull();
    expect(document.getElementById('probePanel')).toBeNull();
  });
});

describe('unmountFragment', () => {
  test('removes every node it inserted, and only those', () => {
    const before = document.body.innerHTML;
    mountFragment('probe', MARKUP);
    expect(unmountFragment('probe')).toBe(true);
    expect(document.body.innerHTML).toBe(before);
    expect(fragmentMounted('probe')).toBe(false);
    expect(unmountFragment('probe')).toBe(false);
  });

  test("aborts the family's signal, which takes its outside listeners with it", () => {
    const signal = mountFragment('probe', MARKUP);
    let heard = 0;
    window.addEventListener('test-fragment', () => heard++, { signal });
    window.dispatchEvent(new Event('test-fragment'));
    unmountFragment('probe');
    window.dispatchEvent(new Event('test-fragment'));
    expect(signal.aborted).toBe(true);
    expect(heard).toBe(1);
  });

  test('leaves the host, so the family can mount again', () => {
    mountFragment('probe', MARKUP);
    unmountFragment('probe');
    expect(mountFragment('probe', MARKUP)).not.toBeNull();
    expect(document.querySelectorAll('#probePanel')).toHaveLength(1);
  });
});

describe('loadFragment', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test('fetches js/fragments/<name>.html against the document', async () => {
    const asked = [];
    globalThis.fetch = async url => {
      asked.push(String(url));
      return { ok: true, status: 200, text: async () => MARKUP };
    };
    expect(await loadFragment('probe')).toBe(MARKUP);
    expect(asked).toEqual([
      new URL('js/fragments/probe.html', document.baseURI).href,
    ]);
  });

  test('fails loudly rather than mounting an error page', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 404,
      text: async () => 'Not found',
    });
    await expect(loadFragment('probe')).rejects.toThrow(/404/);
  });
});

describe.each(FRAGMENTS.map(f => [f.host, f]))('the %s fragment', (host, f) => {
  const markup = fragmentMarkup(f);
  const page = `<template data-host="${host}"></template>`;

  test('is in the page only while mounted, and with no duplicate id', () => {
    document.body.innerHTML = page;
    for (const id of f.ids) expect(document.getElementById(id)).toBeNull();

    expect(mountFragment(host, markup)).not.toBeNull();
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    for (const id of f.ids) expect(document.getElementById(id)).not.toBeNull();

    expect(unmountFragment(host)).toBe(true);
    expect(document.body.innerHTML).toBe(page);
  });
});
