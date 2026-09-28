/**
 * @jest-environment jsdom
 */
// =============================================================================
// The focus trap in js/dialog.js, when the browser's Tab skips the buttons
// -----------------------------------------------------------------------------
// Safari's default Tab moves only between text fields and pop-up menus. The
// trap used to wrap only when Tab was pressed on the panel's last control, and
// in the precise-placement form that is Done, a button - so a Safari reader
// never pressed Tab there, and Tab from the mass field went on into the page
// behind the form. e2e/accessibilityParity.spec.js shows it in a real WebKit,
// but only on macOS: CI's WebKit runs on Linux, where Tab visits every control.
//
// jsdom has no Tab navigation of its own, which is what makes this testable
// everywhere. A test dispatches the keydown and then moves focus itself,
// exactly where the browser's default action would have put it. jsdom has no
// layout either, so offsetParent - which focusable() reads to skip anything
// not rendered - is given the parent node.
// =============================================================================

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { openDialog, closeDialog } from '../js/dialog.js';

const offsetParent = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'offsetParent'
);

let panel;
const $ = id => document.getElementById(id);

/** A Tab as the browser delivers it, on whatever has focus. */
const tab = ({ shift = false } = {}) => {
  const event = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  });
  document.activeElement.dispatchEvent(event);
  return event;
};

/** Let the Tab's task end, as a later key press would find it. */
const nextTask = () => new Promise(resolve => setTimeout(resolve));

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return this.parentNode;
    },
  });
  // A field before the form and one after it: the page behind.
  document.body.innerHTML = `
    <input id="before" type="text">
    <div id="form" hidden>
      <select id="type"><option>Star</option></select>
      <input id="x" type="text">
      <input id="mass" type="text">
      <button id="add" type="button">Add body</button>
      <button id="done" type="button">Done</button>
    </div>
    <input id="after" type="text">`;
  panel = $('form');
  openDialog(panel, { trigger: $('before'), initialFocus: '#type' });
});

afterEach(() => {
  closeDialog(panel);
  document.body.innerHTML = '';
  if (offsetParent) {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', offsetParent);
  }
});

describe('a Tab cannot leave an open dialog', () => {
  test('forward from the last field, it wraps to the first control', () => {
    // Safari's route: the next text field after #mass is outside the form.
    $('mass').focus();
    const event = tab();
    expect(event.defaultPrevented).toBe(false); // the browser still moves it
    $('after').focus();
    expect(document.activeElement).toBe($('type'));
  });

  test('backward out of the form, it wraps to the last control', () => {
    $('x').focus();
    tab({ shift: true });
    $('before').focus();
    expect(document.activeElement).toBe($('done'));
  });

  test('a move that stays inside is left to the browser', () => {
    $('x').focus();
    tab();
    $('mass').focus();
    expect(document.activeElement).toBe($('mass'));
  });

  test('the edges are still wrapped by the trap itself', () => {
    $('done').focus();
    expect(tab().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe($('type'));
    expect(tab({ shift: true }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe($('done'));
  });
});

describe('what the trap leaves alone', () => {
  test('focus moved outside without a Tab, as a click behind the form does', () => {
    // The precise-placement form has no scrim, so the page behind it stays
    // in reach of a pointer on purpose.
    $('after').focus();
    expect(document.activeElement).toBe($('after'));
  });

  test('a Tab that has already been acted on', async () => {
    $('mass').focus();
    tab();
    await nextTask();
    $('after').focus();
    expect(document.activeElement).toBe($('after'));
  });

  test('a click that follows a Tab before its task has ended', () => {
    // Under load a click can overtake the timer. The Tab's own move stayed
    // inside, so the move after it is the click's, and is left where it went.
    $('x').focus();
    tab();
    $('mass').focus();
    $('after').focus();
    expect(document.activeElement).toBe($('after'));
  });

  test('a dialog that has been closed', () => {
    $('mass').focus();
    closeDialog(panel);
    $('mass').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    );
    $('after').focus();
    expect(document.activeElement).toBe($('after'));
  });
});

describe("Safari's route through the toolbar", () => {
  // After the last field Safari stops on, its Tab leaves the page for the
  // browser's toolbar, and nothing in the page has focus. Its next Tab brings
  // focus back in at the first text field on the page, which over a lesson is
  // behind Settings and the builder. No focusin marks the trip out, so the
  // Tab's timer is what has to notice it.
  const toToolbar = async () => {
    $('mass').focus();
    tab();
    $('mass').blur();
    await nextTask();
  };

  test('focus coming back into the page is sent to the first control', async () => {
    await toToolbar();
    $('before').focus();
    expect(document.activeElement).toBe($('type'));
  });

  test('a click after the trip is left alone', async () => {
    await toToolbar();
    $('before').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    $('before').focus();
    expect(document.activeElement).toBe($('before'));
  });
});

describe('a click inside the panel', () => {
  // A click on anything that does not take focus itself puts focus on its
  // nearest focusable ancestor, and Safari does not focus a clicked button at
  // all. That ancestor used to be <body>, where the panel's keydown listener
  // could not hear Escape. Now it is the panel.
  test('leaves focus on the panel, so Escape still closes it', () => {
    expect(panel.getAttribute('tabindex')).toBe('-1');
    panel.focus();
    expect(document.activeElement).toBe(panel);
    panel.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
    );
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe($('before'));
  });

  test('and Shift+Tab from the panel wraps to the last control', () => {
    panel.focus();
    expect(document.activeElement).toBe(panel);
    expect(tab({ shift: true }).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe($('done'));
  });
});
