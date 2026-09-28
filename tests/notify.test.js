/**
 * @jest-environment jsdom
 */
// =============================================================================
// A repeated announcement is announced again, in js/notify.js
// -----------------------------------------------------------------------------
// announce() writes into #srStatus, a polite live region. It returned early
// when the message was the one it had last written, and nothing reset that, so
// a second identical message was dropped for good: a student who answered two
// lesson questions right in a row heard "Correct." once, and nothing at all
// the second time.
//
// Writing the words a live region already holds is no change either, so the
// repeat has to change the region to be read. It toggles a trailing no-break
// space, which a screen reader does not voice. What is asserted is therefore
// the sequence of states the region passes through: each one must differ from
// the one before, and read as the same words.
//
// The dedupe had a use, and `again` false keeps it for the caller that needs
// it: the "Scenario loaded" announcement fires on every world build, and a
// parameter sweep builds the same world once per trial.
// =============================================================================

import { describe, test, expect, beforeEach } from '@jest/globals';
import { announce, toast } from '../js/notify.js';

const NBSP = '\u00a0';

let region;
let states;
let observer;

/** Every state the live region has been left in, in order. */
const record = () => {
  states.push(region.textContent);
};

/** The next animation frame, so two calls are separate turns as clicks are. */
const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));

/** Settle the observer's queue into `states`. */
const flush = () => {
  if (observer.takeRecords().length) record();
};

beforeEach(() => {
  observer?.disconnect();
  document.body.innerHTML =
    '<p id="srStatus" role="status" aria-live="polite"></p>';
  region = document.getElementById('srStatus');
  states = [];
  observer = new MutationObserver(record);
  observer.observe(region, {
    childList: true,
    characterData: true,
    subtree: true,
  });
});

describe('announce()', () => {
  test('says a message again after an intervening frame', async () => {
    announce('Correct.');
    flush();
    await nextFrame();
    announce('Correct.');
    flush();

    expect(states).toHaveLength(2);
    expect(states[1]).not.toBe(states[0]);
    expect(states.map(s => s.trim())).toEqual(['Correct.', 'Correct.']);
  });

  test('says it every time, not only the second', async () => {
    for (let i = 0; i < 4; i++) {
      announce('Correct.');
      flush();
      await nextFrame();
    }
    expect(states).toHaveLength(4);
    for (let i = 1; i < states.length; i++) {
      expect(states[i]).not.toBe(states[i - 1]);
      expect(states[i].trim()).toBe('Correct.');
    }
  });

  test('writes a new message as it is, with nothing added', () => {
    announce('Correct.');
    announce('Correct.');
    announce('Answer recorded.');
    expect(region.textContent).toBe('Answer recorded.');
    announce('Correct.');
    expect(region.textContent).toBe('Correct.');
  });

  test('the only thing a repeat adds is a no-break space', () => {
    announce('Scenario loaded: Solar System');
    announce('Scenario loaded: Solar System');
    expect(region.textContent).toBe(`Scenario loaded: Solar System${NBSP}`);
  });

  test('again false says a repeat once, however often it is asked', async () => {
    for (let i = 0; i < 5; i++) {
      announce('Scenario loaded: Solar System', false);
      flush();
      await nextFrame();
    }
    expect(states).toEqual(['Scenario loaded: Solar System']);
  });

  test('again false still speaks when something else was said in between', () => {
    announce('Scenario loaded: Solar System', false);
    announce('Paused');
    announce('Scenario loaded: Solar System', false);
    expect(region.textContent).toBe('Scenario loaded: Solar System');
  });

  test('again false also knows a repeat that gained a space', () => {
    announce('Scenario loaded: Solar System');
    announce('Scenario loaded: Solar System');
    flush();
    const before = states.length;
    announce('Scenario loaded: Solar System', false);
    flush();
    expect(states).toHaveLength(before);
  });

  test('a page without the region is not an error', () => {
    document.body.innerHTML = '';
    expect(() => announce('Correct.')).not.toThrow();
    expect(() => announce('Correct.', false)).not.toThrow();
  });
});

describe('toast()', () => {
  test('a toast repeated after a frame is announced again', async () => {
    toast('Link copied.');
    flush();
    await nextFrame();
    toast('Link copied.');
    flush();

    expect(states).toHaveLength(2);
    expect(states[1]).not.toBe(states[0]);
    expect(states.map(s => s.trim())).toEqual(['Link copied.', 'Link copied.']);
    // The toast itself shows the words, not the space.
    expect(document.getElementById('gravitasToast').textContent).toBe(
      'Link copied.'
    );
  });
});
