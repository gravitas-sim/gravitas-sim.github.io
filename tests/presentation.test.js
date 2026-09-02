import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  MODES,
  getPresentationMode,
  setPresentationMode,
  onPresentationChange,
  isEmbed,
  isLecture,
  isNormal,
  embedRequested,
  withEmbedParam,
} from '../js/presentation.js';
import { embedSnippet, EMBED_ASPECT } from '../js/embed.js';
import { parseSequence } from '../js/lecture.js';
import { setLocale } from '../js/i18n/index.js';

// Presentation mode is a string, a class on <body> and an event. What is worth
// testing is the two things it must never do - touch the simulation, or corrupt
// a share link - and the one composition rule the embed feature rests on.

beforeEach(async () => {
  setPresentationMode('normal');
  await setLocale('en', { persist: false });
});

describe('the presentation shell', () => {
  test('starts in the ordinary sandbox', () => {
    expect(getPresentationMode()).toBe('normal');
    expect(isNormal()).toBe(true);
    expect(isEmbed()).toBe(false);
    expect(isLecture()).toBe(false);
  });

  test('marks the body so the layout is entirely CSS', () => {
    setPresentationMode('embed');
    expect(document.body.classList.contains('presentation-embed')).toBe(true);
    expect(document.body.getAttribute('data-presentation')).toBe('embed');

    setPresentationMode('lecture');
    // The previous mode's class must go, or two shells would be applied at once.
    expect(document.body.classList.contains('presentation-embed')).toBe(false);
    expect(document.body.classList.contains('presentation-lecture')).toBe(true);

    setPresentationMode('normal');
    expect(document.body.className).not.toMatch(/presentation-/);
    expect(document.body.getAttribute('data-presentation')).toBe('normal');
  });

  test('an unknown mode resolves to normal rather than throwing', () => {
    setPresentationMode('kiosk');
    expect(getPresentationMode()).toBe('normal');
    expect(MODES).toEqual(['normal', 'embed', 'lecture']);
  });

  test('tells its listeners what changed, and only when it changed', () => {
    const seen = [];
    const off = onPresentationChange((mode, previous) =>
      seen.push([previous, mode])
    );
    setPresentationMode('lecture');
    setPresentationMode('lecture');
    setPresentationMode('normal');
    off();
    setPresentationMode('embed');
    expect(seen).toEqual([
      ['normal', 'lecture'],
      ['lecture', 'normal'],
    ]);
  });

  test('a failing listener does not leave the mode half-applied', () => {
    const off = onPresentationChange(() => {
      throw new Error('bad listener');
    });
    expect(() => setPresentationMode('embed')).not.toThrow();
    expect(getPresentationMode()).toBe('embed');
    off();
  });
});

describe('reading embed=1 out of the URL', () => {
  test('recognises the parameter wherever it sits in the query', () => {
    expect(embedRequested('?embed=1')).toBe(true);
    expect(embedRequested('?a=1&embed=1')).toBe(true);
    expect(embedRequested('?embed=1&a=1')).toBe(true);
    expect(embedRequested('?a=1&embed=1&b=2')).toBe(true);
    expect(embedRequested('?embed=true')).toBe(true);
    // A bare `?embed` is a request for embed mode; nobody writes it to mean no.
    expect(embedRequested('?embed=')).toBe(true);
  });

  test('honours an explicit no, so a template can leave the parameter in', () => {
    expect(embedRequested('?embed=0')).toBe(false);
    expect(embedRequested('?embed=false')).toBe(false);
    expect(embedRequested('?embed=no')).toBe(false);
  });

  test('is absent by default and cannot be tripped by a similar name', () => {
    expect(embedRequested('')).toBe(false);
    expect(embedRequested('?embedded=1')).toBe(false);
    expect(embedRequested('?theme=daylight')).toBe(false);
  });
});

describe('composing embed=1 with a share link', () => {
  const PAYLOAD = '#1reyJ2IjoxLCJzIjoiS3VpcGVyIEJlbHQifQ';

  test('adds the parameter and leaves the payload untouched', () => {
    const url = withEmbedParam(`https://gravitas-sim.online/${PAYLOAD}`);
    expect(url).toBe(`https://gravitas-sim.online/?embed=1${PAYLOAD}`);
    // The fragment is where the share codec lives, and it must come through
    // byte for byte: a payload is base64 and one changed character is a link
    // that will not open.
    expect(url.slice(url.indexOf('#'))).toBe(PAYLOAD);
  });

  test('keeps every parameter a link already carried, in order', () => {
    const url = withEmbedParam(
      `https://gravitas-sim.online/?utm_source=lms&lang=es${PAYLOAD}`
    );
    expect(url).toContain('utm_source=lms');
    expect(url).toContain('lang=es');
    expect(url).toContain('embed=1');
    expect(url.indexOf('utm_source')).toBeLessThan(url.indexOf('lang='));
    expect(url.slice(url.indexOf('#'))).toBe(PAYLOAD);
  });

  test('replaces rather than duplicates a parameter already there', () => {
    const url = withEmbedParam('https://gravitas-sim.online/?embed=0');
    expect(url.match(/embed=/g)).toHaveLength(1);
    expect(embedRequested(new URL(url).search)).toBe(true);
  });

  test('can take the parameter away again, which is the full-size link', () => {
    const embedded = `https://gravitas-sim.online/?embed=1${PAYLOAD}`;
    const full = withEmbedParam(embedded, { embed: false });
    expect(full).toBe(`https://gravitas-sim.online/${PAYLOAD}`);
    expect(embedRequested(new URL(full).search)).toBe(false);
  });

  test('a relative link keeps its shape rather than becoming absolute', () => {
    // The share dialog builds absolute URLs, but the embed link in the corner
    // of an embed is relative, and turning it absolute would hard-code the
    // development host into a page served from anywhere else.
    const out = withEmbedParam('./#1reyJ2IjoxfQ');
    expect(out.startsWith('http')).toBe(false);
    expect(out).toContain('embed=1');
    expect(out.endsWith('#1reyJ2IjoxfQ')).toBe(true);
  });

  test('something genuinely unparseable comes back untouched', () => {
    expect(withEmbedParam('http://[')).toBe('http://[');
  });
});

describe('the iframe snippet', () => {
  const URL_WITH_PAYLOAD =
    'https://gravitas-sim.online/#1reyJ2IjoxLCJzIjoiS3VpcGVyIEJlbHQifQ';

  test('embeds the given state, with embed=1 added', () => {
    const html = embedSnippet({
      url: URL_WITH_PAYLOAD,
      scenario: 'Kuiper Belt',
    });
    const src = html.match(/src="([^"]+)"/)[1];
    expect(src).toContain('?embed=1#');
    expect(src.slice(src.indexOf('#'))).toBe(
      URL_WITH_PAYLOAD.slice(URL_WITH_PAYLOAD.indexOf('#'))
    );
  });

  test('carries the attributes an LMS editor needs to render it', () => {
    const html = embedSnippet({
      url: URL_WITH_PAYLOAD,
      scenario: 'Kuiper Belt',
    });
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('allowfullscreen');
    // Width and height as attributes as well as CSS: a sanitiser that strips
    // `style` would otherwise leave a 300x150 default iframe.
    expect(html).toMatch(/width="\d+"/);
    expect(html).toMatch(/height="\d+"/);
    expect(html).toContain('width:100%');
  });

  test('names the scenario in an accessible title', () => {
    const html = embedSnippet({
      url: URL_WITH_PAYLOAD,
      scenario: 'Kuiper Belt',
    });
    expect(html).toContain('title="Gravitas simulation: Kuiper Belt"');
  });

  test('the title is translated with the rest of the interface', async () => {
    await setLocale('es', { persist: false });
    const html = embedSnippet({
      url: URL_WITH_PAYLOAD,
      scenario: 'Kuiper Belt',
    });
    expect(html).toContain('title="Simulación de Gravitas: Kuiper Belt"');
    await setLocale('en', { persist: false });
  });

  test('falls back to a generic title when no scenario is named', () => {
    const html = embedSnippet({ url: URL_WITH_PAYLOAD });
    expect(html).toContain('title="Gravitas interactive simulation"');
  });

  test('holds its aspect with padding rather than aspect-ratio', () => {
    // A course page may render inside a webview that predates aspect-ratio;
    // padding-top has worked everywhere since 2010.
    const html = embedSnippet({ url: URL_WITH_PAYLOAD });
    const pad = Number(html.match(/padding-top:([\d.]+)%/)[1]);
    expect(pad).toBeCloseTo((EMBED_ASPECT.h / EMBED_ASPECT.w) * 100, 3);
  });

  test('escapes the URL it is given rather than letting it close the tag', () => {
    const html = embedSnippet({
      url: 'https://example.com/?x="><script>alert(1)</script>',
      scenario: '"><b>',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&quot;');
  });
});

describe('parsing a lecture sequence', () => {
  const A = '#1reyJ2IjoxLCJzIjoiU29sYXIgU3lzdGVtIn0';
  const B = '#1zeyJ2IjoxLCJzIjoiS3VpcGVyIEJlbHQifQ';

  test('takes whole URLs and keeps their order', () => {
    const { links, rejected } = parseSequence(
      `https://gravitas-sim.online/${A}\nhttps://gravitas-sim.online/${B}`
    );
    expect(links).toEqual([A, B]);
    expect(rejected).toBe(0);
  });

  test('takes bare fragments too, with or without the hash', () => {
    const { links } = parseSequence(`${A}\n${B.slice(1)}`);
    expect(links).toEqual([A, B]);
  });

  test('ignores blank lines rather than counting them as failures', () => {
    const { links, rejected } = parseSequence(`\n\n${A}\n   \n${B}\n`);
    expect(links).toEqual([A, B]);
    expect(rejected).toBe(0);
  });

  test('reports the lines that were not links, and keeps the rest', () => {
    // A lecturer pasting from a document brings numbering and stray words with
    // them; rejecting the whole paste over a "3." would make it unusable.
    const { links, rejected } = parseSequence(
      `1. ${A}\nsome notes here\n2. ${B}\nhttps://example.com/not-gravitas`
    );
    expect(links).toEqual([A, B]);
    expect(rejected).toBe(2);
  });

  test('an empty paste is empty rather than an error', () => {
    expect(parseSequence('')).toEqual({ links: [], rejected: 0 });
    expect(parseSequence(null)).toEqual({ links: [], rejected: 0 });
  });
});
