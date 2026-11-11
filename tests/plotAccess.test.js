/**
 * @jest-environment jsdom
 */
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';
import { JSDOM } from 'jsdom';

/* global document, window, setTimeout -- jsdom's, installed below */

// =============================================================================
// js/plot/access.js: the series chart's description and sound (Prompt 280)
// -----------------------------------------------------------------------------
// The chart carries its description as its accessible description; a
// disclosure that shows it, and the sound's button, appears when the chart takes
// focus; S plays the first series as sound and Escape stops it; a held
// prediction turns the description into the axes alone and refuses the sound;
// nothing makes a sound by itself; Spanish is the same in Spanish.
// =============================================================================

import { createChart } from '../js/plot/chart.js';
import { attach, heldNow, IDLE_MS } from '../js/plot/access.js';
import { EV_STOP_SIGNAL_AUDIO } from '../js/names.js';

let saved;
beforeAll(() => {
  saved = globalThis.document;
  globalThis.document = new JSDOM(
    '<!doctype html><html lang="en"><body></body></html>'
  ).window.document;
});
afterAll(() => {
  globalThis.document = saved;
});

const X = Array.from({ length: 120 }, (_, i) => i / 10);
const DIP = X.map(x => (x > 5 && x < 6.5 ? 0.9 : 1) + 0.001 * Math.sin(97 * x));

/** A mock AudioContext that records what it was asked. */
const sources = [];
class FakeAudio {
  constructor() {
    this.sampleRate = 8000;
    this.state = 'running';
    this.destination = {};
    FakeAudio.made++;
  }
  createBuffer(channels, length) {
    return { length, copyToChannel: jest.fn() };
  }
  createBufferSource() {
    const s = {
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      disconnect: jest.fn(),
      onended: null,
    };
    sources.push(s);
    return s;
  }
  close() {
    return Promise.resolve();
  }
}
FakeAudio.made = 0;

function make(opts = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const chart = createChart(host, { theme: false, ...opts });
  chart.draw({
    label: 'Brightness',
    xTitle: 'Time (d)',
    yTitle: 'Flux',
    series: [{ id: 'a', label: 'Star A', x: X, y: DIP }],
  });
  const access = attach(chart, host);
  const box = host.nextElementSibling;
  return { host, chart, svg: chart.element, access, box };
}

const key = (el, k, more = {}) =>
  el.dispatchEvent(
    new window.KeyboardEvent('keydown', {
      key: k,
      bubbles: true,
      cancelable: true,
      ...more,
    })
  );
const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  document.body.replaceChildren();
  document.documentElement.lang = 'en';
  sources.length = 0;
  FakeAudio.made = 0;
  window.AudioContext = FakeAudio;
});

describe('every chart carries its description', () => {
  test('as its accessible description, from its data, before anyone asks', () => {
    const { svg } = make();
    const id = svg.getAttribute('aria-describedby');
    const text = document.getElementById(id).textContent;
    expect(text).toMatch(
      /^Chart: Brightness\. Flux against Time \(d\)\. 120 points/
    );
    expect(text).toMatch(/A dip near x = 5\.7/);
    expect(text).not.toMatch(/transit|eclipse/i);
    expect(text).toMatch(/Press S to hear this chart and Escape to stop/);
    expect(svg.getAttribute('aria-keyshortcuts')).toBe('S');
  });

  test('in Spanish when the page is', () => {
    document.documentElement.lang = 'es';
    const { svg } = make();
    const text = document.getElementById(
      svg.getAttribute('aria-describedby')
    ).textContent;
    expect(text).toMatch(
      /^Gráfico: Brightness\. Flux frente a Time \(d\)\. 120 puntos/
    );
    expect(text).toMatch(/Una caída cerca de x = 5,7/);
    expect(text).toMatch(/Pulsa S para escuchar este gráfico/);
  });

  test('hidden series are not described, and the description follows the data', () => {
    const { chart, svg, access } = make();
    chart.setHidden('a', true);
    access.touch();
    const id = svg.getAttribute('aria-describedby');
    access.refresh();
    expect(document.getElementById(id).textContent).not.toMatch(/dip/);
    chart.setHidden('a', false);
    access.touch();
    access.refresh();
    expect(document.getElementById(id).textContent).toMatch(/A dip/);
  });

  test('a draw is described when the chart settles, not on every draw', () => {
    jest.useFakeTimers();
    try {
      const { chart, svg, access } = make();
      const id = svg.getAttribute('aria-describedby');
      const first = document.getElementById(id).textContent;
      chart.draw({ series: [{ id: 'a', x: X, y: X.map(x => 2 * x) }] });
      access.touch();
      expect(document.getElementById(id).textContent).toBe(first);
      jest.advanceTimersByTime(IDLE_MS + 1);
      expect(document.getElementById(id).textContent).toMatch(/rise steadily/);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('the disclosure', () => {
  test('is hidden until the chart takes focus, then shows the description and the mapping', () => {
    const { svg, box } = make();
    expect(box.hidden).toBe(true);
    svg.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
    expect(box.hidden).toBe(false);
    expect(box.querySelector('summary').textContent).toBe(
      'Describe and hear this chart'
    );
    expect(box.textContent).toMatch(/A dip near x = 5\.7/);
    expect(box.textContent).toMatch(
      /Time is x: 6 seconds cover x from 0 to 11\.9/
    );
    expect(box.textContent).toMatch(/220 Hz/);
    expect(box.textContent).toMatch(/Not validated with listeners/);
    expect(box.querySelector('button').textContent).toBe('Play as sound');
  });
});

describe('the sound', () => {
  test('S plays, Escape stops, and nothing sounds before a key', async () => {
    const { svg, box } = make();
    expect(FakeAudio.made).toBe(0);
    key(svg, 's');
    await flush();
    expect(FakeAudio.made).toBe(1);
    expect(sources).toHaveLength(1);
    expect(sources[0].start).toHaveBeenCalledTimes(1);
    expect(box.querySelector('button').textContent).toBe('Stop the sound');
    key(svg, 'Escape');
    expect(sources[0].stop).toHaveBeenCalled();
    expect(box.querySelector('button').textContent).toBe('Play as sound');
  });

  test('the button toggles, and a key with a modifier is not S', async () => {
    const { svg, box } = make();
    key(svg, 's', { ctrlKey: true });
    await flush();
    expect(FakeAudio.made).toBe(0);
    box.querySelector('button').click();
    await flush();
    expect(sources[0].start).toHaveBeenCalled();
    box.querySelector('button').click();
    expect(sources[0].stop).toHaveBeenCalled();
  });

  test("it is announced, in the page's language", async () => {
    document.documentElement.lang = 'es';
    const { svg } = make();
    key(svg, 'S');
    await flush();
    expect(
      [...svg.parentElement.querySelectorAll('[role=status]')].pop().textContent
    ).toMatch(/Reproduciendo el gráfico como sonido, 6 segundos/);
  });

  test('another signal sound, a hidden tab or destroying the chart stops it', async () => {
    const { svg, access } = make();
    key(svg, 's');
    await flush();
    window.dispatchEvent(new window.CustomEvent(EV_STOP_SIGNAL_AUDIO));
    expect(sources[0].stop).toHaveBeenCalled();
    key(svg, 's');
    await flush();
    access.destroy();
    expect(sources[1].stop).toHaveBeenCalled();
  });

  test('says so when the browser has no audio, or no series can be played', async () => {
    delete window.AudioContext;
    const { svg } = make();
    key(svg, 's');
    await flush();
    expect(
      [...svg.parentElement.querySelectorAll('[role=status]')].pop().textContent
    ).toBe('This browser cannot play sound.');
    window.AudioContext = FakeAudio;
    const host = document.createElement('div');
    document.body.append(host);
    const chart = createChart(host, { theme: false });
    chart.draw({ series: [{ id: 'one', x: [1], y: [1] }] });
    attach(chart, host);
    key(chart.element, 's');
    await flush();
    expect(
      [...chart.element.parentElement.querySelectorAll('[role=status]')].pop()
        .textContent
    ).toMatch(/no series of at least two points/);
  });
});

describe('a held prediction', () => {
  const hold = () => {
    const step = document.createElement('div');
    step.id = 'investigationPanel';
    step.setAttribute('data-answer-held', '');
    document.body.classList.add('investigation-open');
    document.body.append(step);
    const remove = step.remove.bind(step);
    step.remove = () => {
      document.body.classList.remove('investigation-open');
      remove();
    };
    return step;
  };

  test('reduces the description to the axes and refuses the sound', async () => {
    const step = hold();
    expect(heldNow()).toBe(true);
    const { svg, box } = make();
    const text = document.getElementById(
      svg.getAttribute('aria-describedby')
    ).textContent;
    expect(text).toMatch(/120 points, x from 0 to 11\.9\./);
    expect(text).toMatch(
      /not described until the result of the prediction you made is shown/
    );
    expect(text).not.toMatch(/dip|lowest|highest|0\.9/i);
    svg.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
    expect(box.textContent).toMatch(
      /The sound is not available until the result/
    );
    expect(box.textContent).not.toMatch(/220 Hz/);
    expect(box.querySelector('button').disabled).toBe(true);
    key(svg, 's');
    await flush();
    expect(FakeAudio.made).toBe(0);
    expect(sources).toHaveLength(0);
    expect(
      [...svg.parentElement.querySelectorAll('[role=status]')].pop().textContent
    ).toMatch(/not available until the result/);
    step.remove();
  });

  test('is read again when the chart takes focus after the result is shown', () => {
    const step = hold();
    const { svg, box } = make();
    const id = svg.getAttribute('aria-describedby');
    expect(document.getElementById(id).textContent).not.toMatch(/dip/);
    step.remove();
    svg.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
    expect(document.getElementById(id).textContent).toMatch(
      /A dip near x = 5\.7/
    );
    expect(box.querySelector('button').disabled).toBe(false);
  });

  test('and the other way round: a description made before the hold is not read after it', () => {
    const { svg } = make();
    const id = svg.getAttribute('aria-describedby');
    expect(document.getElementById(id).textContent).toMatch(/dip/);
    const step = hold();
    svg.dispatchEvent(new window.FocusEvent('focusin', { bubbles: true }));
    expect(document.getElementById(id).textContent).not.toMatch(/dip/);
    step.remove();
  });
});

describe('the chart loads it', () => {
  test('a chart that is on a screen fetches it once it has drawn, and opts out with access: false', async () => {
    jest.useFakeTimers();
    try {
      const sized = o => {
        const host = document.createElement('div');
        document.body.append(host);
        const chart = createChart(host, { theme: false, ...o });
        Object.defineProperty(chart.element.parentElement, 'clientWidth', {
          value: 640,
        });
        chart.draw({ series: [{ id: 'a', x: X, y: DIP }] });
        return chart;
      };
      const on = sized();
      const off = sized({ access: false });
      const hidden = document.createElement('div');
      document.body.append(hidden);
      const unseen = createChart(hidden, { theme: false });
      unseen.draw({ series: [{ id: 'a', x: X, y: DIP }] });
      jest.advanceTimersByTime(1600);
      jest.useRealTimers();
      await new Promise(r => setTimeout(r, 200));
      expect(on.element.getAttribute('aria-describedby')).toMatch(/^ocDesc/);
      expect(off.element.getAttribute('aria-describedby')).toBeNull();
      expect(unseen.element.getAttribute('aria-describedby')).toBeNull();
      on.destroy();
      expect(document.querySelectorAll('.plot-access')).toHaveLength(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
