import { describe, test, expect, jest } from '@jest/globals';

import {
  EMBED_CHOICES,
  EMBED_DEFAULTS,
  embedParams,
  parentOrigin,
  readEmbedOptions,
} from '../js/embedOptions.js';
import {
  MAX_MESSAGE_CHARS,
  MAX_STATE_CHARS,
  PROTOCOL,
  REQUESTS,
  message,
  readMessage,
} from '../js/embedMessages.js';
import { figureMarkup, embedSnippet } from '../js/embedMarkup.js';
import { resetFigure, startEmbedBridge } from '../js/embedBridge.js';
import { THEMES } from '../js/theme.js';
import { LOCALES } from '../js/i18n/index.js';
import { encodePayload } from '../js/shareState.js';

// =============================================================================
// gravitas-embed/1: what an embed URL may ask, and what a page may send
// -----------------------------------------------------------------------------
// The public integration surface (EMBEDDING.md), held here without a browser:
// the options a figure's URL is read for, the messages it accepts and refuses,
// the markup the builder writes, and the bridge's rule for whom it obeys. The
// cross-origin and sandboxed parents themselves are e2e/embedContract.spec.js.
// =============================================================================

const PARENT = 'https://course.example.edu';

describe('what an embed URL may ask for', () => {
  test('a plain ?embed=1 reads no options at all, as before the contract', () => {
    const read = readEmbedOptions('?embed=1&theme=daylight&parent=' + PARENT);
    expect(read.version).toBe(0);
    expect(read.options).toEqual(EMBED_DEFAULTS);
  });

  test('ev=1 reads each option from its closed list', () => {
    const read = readEmbedOptions(
      `?embed=1&ev=1&lang=es&theme=daylight&controls=none&motion=reduced&quality=low&reset=authored&parent=${encodeURIComponent(PARENT)}`
    );
    expect(read).toEqual({
      version: 1,
      ignored: [],
      options: {
        lang: 'es',
        theme: 'daylight',
        controls: 'none',
        motion: 'reduced',
        quality: 'low',
        reset: 'authored',
        parent: PARENT,
      },
    });
  });

  test('a value outside its list is ignored, and says so', () => {
    const read = readEmbedOptions(
      '?embed=1&ev=1&theme=<script>&lang=fr&controls=all&quality=ultra'
    );
    expect(read.options).toEqual(EMBED_DEFAULTS);
    expect(read.ignored.sort()).toEqual([
      'controls',
      'lang',
      'quality',
      'theme',
    ]);
  });

  test('a later contract version is read as the plain embed', () => {
    expect(readEmbedOptions('?embed=1&ev=2&theme=deep').version).toBe(0);
  });

  test('the lists are the application themes and languages', () => {
    expect([...EMBED_CHOICES.theme].sort()).toEqual(
      THEMES.map(t => t.id).sort()
    );
    expect([...EMBED_CHOICES.lang].sort()).toEqual(
      LOCALES.map(l => l.id).sort()
    );
  });

  test('the builder writes what the figure reads back, defaults left out', () => {
    const options = {
      ...EMBED_DEFAULTS,
      theme: 'observatory',
      reset: 'authored',
      parent: PARENT,
    };
    const params = embedParams(options);
    expect(params).toEqual([
      ['embed', '1'],
      ['ev', '1'],
      ['theme', 'observatory'],
      ['reset', 'authored'],
      ['parent', PARENT],
    ]);
    expect(readEmbedOptions(new URLSearchParams(params)).options).toEqual(
      options
    );
  });
});

describe('a parent origin', () => {
  test('is an https origin, or http on this machine', () => {
    expect(parentOrigin('https://course.example.edu')).toBe(
      'https://course.example.edu'
    );
    expect(parentOrigin('https://course.example.edu:8443/')).toBe(
      'https://course.example.edu:8443'
    );
    expect(parentOrigin('http://localhost:4199')).toBe('http://localhost:4199');
    expect(parentOrigin('http://127.0.0.1:8080')).toBe('http://127.0.0.1:8080');
  });

  test('and nothing else', () => {
    for (const bad of [
      'null',
      '*',
      '',
      'http://course.example.edu',
      'https://course.example.edu/page',
      'https://course.example.edu?x=1',
      'https://user:pw@course.example.edu',
      'javascript:alert(1)',
      'file:///etc/passwd',
      'data:text/html,hi',
      `https://${'a'.repeat(250)}.example`,
      undefined,
      42,
    ]) {
      expect({ bad, got: parentOrigin(bad) }).toEqual({ bad, got: null });
    }
  });
});

describe('a message from a page', () => {
  const base = { protocol: PROTOCOL, version: 1 };

  test('each request type is read, with its id', () => {
    for (const type of ['ping', 'play', 'pause', 'reset']) {
      expect(readMessage({ ...base, type, id: 'r1' })).toEqual({
        ok: true,
        type,
        id: 'r1',
      });
    }
    expect(readMessage({ ...base, type: 'load', state: '#1zAbC_-9' })).toEqual({
      ok: true,
      type: 'load',
      id: null,
      state: '1zAbC_-9',
    });
  });

  test('is refused when it is not one', () => {
    const cases = [
      [null, 'bad-message'],
      ['play', 'bad-message'],
      [[base], 'bad-message'],
      [new Date(), 'bad-message'],
      [{ ...base, protocol: 'other', type: 'play' }, 'bad-message'],
      [{ ...base, version: 2, type: 'play' }, 'unsupported-version'],
      [{ ...base, type: 'navigate' }, 'unknown-type'],
      [{ ...base, type: 'play', extra: 1 }, 'bad-message'],
      [{ ...base, type: 'play', state: '1zAbc' }, 'bad-message'],
      [{ ...base, type: 'play', id: 'x'.repeat(65) }, 'bad-message'],
      [{ ...base, type: 'play', id: '<b>' }, 'bad-message'],
      [{ ...base, type: 'load' }, 'bad-state'],
      [
        { ...base, type: 'load', state: 'https://evil.example/#1z' },
        'bad-state',
      ],
      [
        { ...base, type: 'load', state: `1z${'a'.repeat(MAX_STATE_CHARS)}` },
        'bad-state',
      ],
      [
        { ...base, type: 'ping', pad: 'x'.repeat(MAX_MESSAGE_CHARS) },
        'bad-message',
      ],
    ];
    for (const [data, code] of cases) {
      expect({
        data: String(data).slice(0, 40),
        code: readMessage(data).code,
      }).toEqual({
        data: String(data).slice(0, 40),
        code,
      });
    }
  });

  test('a cyclic object is refused, not thrown', () => {
    const cyclic = { ...base, type: 'play' };
    cyclic.self = cyclic;
    expect(readMessage(cyclic)).toMatchObject({
      ok: false,
      code: 'bad-message',
    });
  });

  test('what the figure sends carries the protocol and version', () => {
    expect(message('ack', { id: 'a' })).toEqual({
      protocol: PROTOCOL,
      version: 1,
      type: 'ack',
      id: 'a',
    });
    expect(REQUESTS).toEqual(['ping', 'play', 'pause', 'reset', 'load']);
  });
});

describe('the markup a page pastes', () => {
  const src = 'https://gravitas-sim.github.io/?embed=1&ev=1#1zAbc';

  test('with nothing but a title is the share dialog snippet, unchanged', () => {
    const plain = figureMarkup({
      src,
      title: 'T',
      aspect: { w: 16, h: 10 },
    });
    expect(plain).not.toMatch(/<figure|<figcaption/);
    expect(plain).toMatch(/padding-top:62\.5000%/);
    expect(embedSnippet({ url: src })).toMatch(/^<div style=/);
  });

  test('escapes every piece of text a person typed', () => {
    const html = figureMarkup({
      src: `${src}"><script>`,
      title: 'A "title" <b>',
      aspect: { w: 4, h: 3 },
      caption: 'Orbits & <img src=x onerror=alert(1)>',
      fallback: {
        href: 'https://gravitas-sim.github.io/#1zAbc',
        text: '<Open>',
      },
    });
    expect(html).not.toMatch(/<script|<img|<b>|<Open>/);
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
    expect(html).toContain('A &quot;title&quot; &lt;b&gt;');
    expect(html).toContain('Orbits &amp; &lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('>&lt;Open&gt;</a>');
    expect(html).toMatch(/padding-top:75\.0000%/);
    expect(html).toMatch(/^<figure style="margin:0;">/);
  });
});

// A window that is framed by a parent whose postMessage is recorded, and
// whose own message listener can be driven with any origin and source.
function framedWindow() {
  const listeners = new Set();
  const sent = [];
  const parent = { postMessage: (data, target) => sent.push({ data, target }) };
  let timer = null;
  const win = {
    parent,
    addEventListener: (type, fn) => type === 'message' && listeners.add(fn),
    removeEventListener: (type, fn) => listeners.delete(fn),
    setInterval: fn => (timer = fn),
    clearInterval: () => (timer = null),
  };
  const deliver = (data, { origin = PARENT, source = parent } = {}) =>
    listeners.forEach(fn => fn({ data, origin, source }));
  return { win, parent, sent, deliver, tick: () => timer?.(), listeners };
}

const services = () => {
  let paused = false;
  return {
    setPlaying: jest.fn(p => (paused = !p)),
    applySharePayload: jest.fn(),
    loadScenarioByKey: jest.fn(),
    isPaused: () => paused,
    scenario: () => 'Solar System',
  };
};

const flush = () => new Promise(r => setTimeout(r, 0));
const req = (type, extra = {}) => ({
  protocol: PROTOCOL,
  version: 1,
  type,
  ...extra,
});

describe('the bridge', () => {
  test('with no parent origin it announces itself to anyone, and listens to nobody', () => {
    const f = framedWindow();
    startEmbedBridge({
      options: { ...EMBED_DEFAULTS },
      authored: null,
      services: services(),
      win: f.win,
    });
    expect(f.sent).toEqual([
      { data: message('ready', { requests: [] }), target: '*' },
    ]);
    expect(f.listeners.size).toBe(0);
  });

  test('obeys the configured parent, and answers it alone', async () => {
    const f = framedWindow();
    const s = services();
    startEmbedBridge({
      options: { ...EMBED_DEFAULTS, parent: PARENT },
      authored: null,
      services: s,
      win: f.win,
    });
    expect(f.sent[0]).toEqual({
      data: message('ready', { requests: [...REQUESTS], running: true }),
      target: PARENT,
    });
    f.deliver(req('pause', { id: 'p1' }));
    await flush();
    expect(s.setPlaying).toHaveBeenCalledWith(false);
    expect(f.sent.slice(1)).toEqual([
      { data: message('ack', { id: 'p1' }), target: PARENT },
      { data: message('status', { running: false }), target: PARENT },
    ]);
    expect(f.sent.every(m => m.target === PARENT)).toBe(true);
  });

  test('drops, without an answer, messages from another origin or window', async () => {
    const f = framedWindow();
    const s = services();
    startEmbedBridge({
      options: { ...EMBED_DEFAULTS, parent: PARENT },
      authored: null,
      services: s,
      win: f.win,
    });
    const before = f.sent.length;
    f.deliver(req('pause'), { origin: 'https://evil.example' });
    f.deliver(req('pause'), { origin: 'null' });
    f.deliver(req('pause'), { source: { postMessage() {} } });
    await flush();
    expect(s.setPlaying).not.toHaveBeenCalled();
    expect(f.sent.length).toBe(before);
  });

  test('answers a malformed message from its parent with an error, and does nothing', async () => {
    const f = framedWindow();
    const s = services();
    startEmbedBridge({
      options: { ...EMBED_DEFAULTS, parent: PARENT },
      authored: null,
      services: s,
      win: f.win,
    });
    f.deliver({ ...req('play'), id: 'x1', extra: true });
    f.deliver(req('load', { id: 'l1', state: '1zNotAPayload' }));
    await flush();
    await flush();
    expect(s.setPlaying).not.toHaveBeenCalled();
    expect(s.applySharePayload).not.toHaveBeenCalled();
    expect(f.sent.slice(-2).map(m => m.data)).toEqual([
      message('error', { id: 'x1', code: 'bad-message' }),
      message('error', { id: 'l1', code: 'bad-state' }),
    ]);
  });

  test('loads a real share state, and tells the page when a reader pauses', async () => {
    const f = framedWindow();
    const s = services();
    startEmbedBridge({
      options: { ...EMBED_DEFAULTS, parent: PARENT },
      authored: null,
      services: s,
      win: f.win,
    });
    const state = await encodePayload({ v: 1, s: 'Binary Pair', seed: 'abc' });
    f.deliver(req('load', { id: 'l2', state }));
    await flush();
    await flush();
    expect(s.applySharePayload).toHaveBeenCalledWith(
      expect.objectContaining({ s: 'Binary Pair' })
    );
    s.setPlaying(false); // the reader, not the page
    f.tick();
    expect(f.sent.at(-1).data).toEqual(message('status', { running: false }));
  });

  test('Reset returns to the authored state, or to its scenario', async () => {
    const authored = await encodePayload({ v: 1, s: 'Binary Pair', seed: 'x' });
    const s = services();
    await resetFigure({ reset: 'authored', authored, services: s });
    expect(s.applySharePayload).toHaveBeenCalledWith(
      expect.objectContaining({ s: 'Binary Pair', seed: 'x' })
    );
    await resetFigure({ reset: 'scenario', authored, services: s });
    expect(s.loadScenarioByKey).toHaveBeenCalledWith('Binary Pair');
    await resetFigure({ reset: 'authored', authored: null, services: s });
    expect(s.loadScenarioByKey).toHaveBeenLastCalledWith('Solar System');
  });

  test('is inert when the figure is not framed', () => {
    const win = { parent: null };
    win.parent = win;
    expect(() =>
      startEmbedBridge({
        options: { ...EMBED_DEFAULTS, parent: PARENT },
        authored: null,
        services: services(),
        win,
      })
    ).not.toThrow();
  });
});
