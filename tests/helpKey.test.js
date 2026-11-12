import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { explainButtonFor, pressHere } from '../js/explainers.js';
import { createPlot } from '../js/plot/plot.js';
import { provenanceLines, problemNote } from '../js/investigations/guidance.js';

// =============================================================================
// Contextual help (Roadmap III, Prompt 286): H presses the explain button of the
// panel focus is in; the problem note carries where the record came from.
// =============================================================================

/** jsdom has no layout: say a button is shown. */
const show = root =>
  root
    .querySelectorAll('button')
    .forEach(b =>
      Object.defineProperty(b, 'offsetParent', { get: () => document.body })
    );

describe('H explains the panel in front of you', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="a"><button class="plot-help" id="ha">What am I looking at?</button><input id="fa" /><button id="xa">x</button></section>
      <section id="b"><button class="plot-help" id="hb">What am I looking at?</button><button id="xb">x</button></section>`;
    show(document.body);
  });

  test('the button is the one of the panel focus is in, else the first on the page', () => {
    expect(explainButtonFor(document.getElementById('xb')).id).toBe('hb');
    expect(explainButtonFor(document.getElementById('xa')).id).toBe('ha');
    expect(explainButtonFor(document.body).id).toBe('ha');
    document.getElementById('hb').hidden = true;
    expect(explainButtonFor(document.getElementById('xb')).id).toBe('ha');
  });

  test('pressing clicks it and leaves focus on it, so a second press closes it', async () => {
    const hb = document.getElementById('hb');
    const clicked = jest.fn();
    hb.addEventListener('click', clicked);
    document.getElementById('xb').focus();
    expect(await pressHere()).toBe(true);
    expect(clicked).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(hb);
    await pressHere();
    expect(clicked).toHaveBeenCalledTimes(2);
  });

  test('with no panel on screen it says so, in the page’s language', async () => {
    document.body.innerHTML = '<div id="srStatus" aria-live="polite"></div>';
    expect(await pressHere()).toBe(false);
  });

  test('a page with no shortcut list gets the key from its first plot', async () => {
    delete document.documentElement.dataset.helpKey;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.innerHTML = '';
    document.body.append(svg);
    createPlot(svg, {
      number: v => String(v),
      labels: {},
      explain: 'plot-measure',
    });
    show(document.body);
    const help = document.querySelector('.plot-help');
    expect(help).not.toBeNull();
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'h', bubbles: true })
    );
    for (let i = 0; i < 50 && !document.querySelector('.explainer'); i++)
      await new Promise(r => setTimeout(r, 20));
    expect(document.querySelector('.explainer')).not.toBeNull();
    expect(help.getAttribute('aria-expanded')).toBe('true');
    // Typing into a field is not a request for help.
    document.body.insertAdjacentHTML('beforeend', '<input id="t" />');
    help.click();
    await new Promise(r => setTimeout(r, 50));
    document
      .getElementById('t')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true }));
    await new Promise(r => setTimeout(r, 50));
    expect(document.querySelector('.explainer')).toBeNull();
  });
});

describe('the problem note says where the record came from', () => {
  test('instrument, family, data, scenario, seed and changed settings', () => {
    const lines = provenanceLines({
      tool: { id: 'depth-size', pack: 'tess-au-mic-s1' },
      setup: { scenario: 'sun-earth', seed: 7, settings: { speed: 2, g: 1 } },
    });
    expect(lines).toEqual([
      'Instrument: depth-size (explainer family: transit)',
      'Data: pack tess-au-mic-s1',
      'Scenario: sun-earth, seed 7, settings changed: speed, g',
    ]);
    expect(provenanceLines({ title: 'a step with neither' })).toEqual([]);
  });

  test('it is in the note, above what the reader expected', async () => {
    const note = await problemNote({
      lesson: {
        id: 'the-metallicity-term',
        title: 'The Metallicity Term',
        steps: [{ sid: 's1', tool: { id: 'plz-metallicity' } }],
      },
      n: 0,
      total: 1,
      depth: 1,
      spent: 60,
      link: async () => '',
    });
    const lines = note.split('\n');
    expect(lines).toContain(
      'Instrument: plz-metallicity (explainer family: variablesII)'
    );
    expect(lines.at(-1)).toBe('What I expected instead: ');
  });
});
