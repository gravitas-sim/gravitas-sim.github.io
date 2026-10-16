/**
 * @jest-environment jsdom
 */
// =============================================================================
// A dialog inside a backdrop, in js/dialog.js
// -----------------------------------------------------------------------------
// Most of the application's modals are a role="dialog" box inside a full-screen
// backdrop: the gallery, the lesson browser, export, the lesson finish, share,
// the lecture sequence. Each used to show and hide its backdrop, close on a
// press on it and (three of them, through js/focusTrap.js) make the page behind
// inert, in its own words. These are the options that do it once:
//
//   backdrop   what is shown and hidden; a press on it, not on the box, closes
//   isolate    the rest of the page inert while the dialog is open
//
// and the three smaller ones the conversions needed: an initial focus that is
// an element or a function rather than a selector, a close that leaves focus
// to its caller, and a close that cannot be reported twice.
//
// jsdom has no layout, so offsetParent - which the trap reads to skip anything
// not rendered - is given the parent node, as in tests/dialog.test.js.
// =============================================================================

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { openDialog, closeDialog, isOpen } from '../js/dialog.js';

const offsetParent = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'offsetParent'
);

const $ = id => document.getElementById(id);
let closes;

/** Open the gallery-shaped dialog, as js/scenarioBrowser.js does. */
const open = (extra = {}) =>
  openDialog($('box'), {
    backdrop: $('backdrop'),
    isolate: true,
    trigger: $('trigger'),
    initialFocus: $('search'),
    onClose: reason => closes.push(reason),
    ...extra,
  });

beforeEach(() => {
  closes = [];
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return this.parentNode;
    },
  });
  // As index.html ships one: the backdrop hidden, inert, and with the class
  // that hides it outright. A closed Settings panel beside it, inert already,
  // and the polite region every announcement goes to.
  document.body.innerHTML = `
    <style>#backdrop.hidden { display: none; }</style>
    <main id="page"><button id="trigger" type="button">Gallery</button></main>
    <div id="settings" hidden inert><input id="setting"></div>
    <p id="srStatus" role="status" aria-live="polite"></p>
    <div id="backdrop" class="hidden" hidden inert>
      <div id="box" role="dialog" aria-modal="true">
        <button id="chip" type="button">Close</button>
        <input id="search" type="search">
        <button id="card" type="button">Solar System</button>
      </div>
    </div>`;
  $('trigger').focus();
});

afterEach(() => {
  document.body.innerHTML = '';
  if (offsetParent) {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', offsetParent);
  }
});

describe('a backdrop', () => {
  test('is what opens: shown, not inert, and laid out at once', () => {
    open();
    const backdrop = $('backdrop');
    expect(backdrop.hidden).toBe(false);
    expect(backdrop.hasAttribute('inert')).toBe(false);
    // Its class hides it with display: none, so it comes off now rather than
    // on the next frame: the first control cannot take focus in a box that is
    // not rendered.
    expect(backdrop.classList.contains('hidden')).toBe(false);
    expect(document.activeElement).toBe($('search'));
    // The box is the dialog; the backdrop is not a second one.
    expect($('box').getAttribute('aria-modal')).toBe('true');
    expect(backdrop.hasAttribute('role')).toBe(false);
    expect(isOpen($('box'))).toBe(true);
  });

  test('a press on it closes the dialog, and a press inside does not', () => {
    open();
    $('card').click();
    expect(isOpen($('box'))).toBe(true);
    $('backdrop').click();
    expect(isOpen($('box'))).toBe(false);
    expect(closes).toEqual(['backdrop']);
    expect(document.activeElement).toBe($('trigger'));
  });

  test('closing hides it at once when the class hides it outright', () => {
    open();
    closeDialog($('box'), 'escape');
    const backdrop = $('backdrop');
    // No transition can run on display: none, so nothing waits for one.
    expect(backdrop.hidden).toBe(true);
    expect(backdrop.hasAttribute('inert')).toBe(true);
    expect(backdrop.classList.contains('hidden')).toBe(true);
    expect($('box').hidden).toBe(false);
  });

  test('and the next open is an ordinary one, straight after', () => {
    open();
    closeDialog($('box'));
    open();
    expect(isOpen($('box'))).toBe(true);
    expect(document.activeElement).toBe($('search'));
  });

  test('Escape inside the box closes it with its reason', () => {
    open();
    $('search').dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
    );
    expect(closes).toEqual(['escape']);
    expect($('backdrop').hidden).toBe(true);
  });
});

describe('isolate', () => {
  test('makes the page behind inert while the dialog is open', () => {
    open();
    expect($('page').hasAttribute('inert')).toBe(true);
    expect($('page').getAttribute('aria-hidden')).toBe('true');
    expect($('backdrop').hasAttribute('inert')).toBe(false);
  });

  test('but not a live region: what is said over a dialog is heard', () => {
    open();
    expect($('srStatus').hasAttribute('inert')).toBe(false);
    expect($('srStatus').hasAttribute('aria-hidden')).toBe(false);
  });

  test('puts back only what it changed', () => {
    // js/focusTrap.js took inert off every child of <body> on release, which
    // opened Settings' closed panel to the tab order behind its back.
    open();
    closeDialog($('box'));
    expect($('page').hasAttribute('inert')).toBe(false);
    expect($('page').hasAttribute('aria-hidden')).toBe(false);
    expect($('settings').hasAttribute('inert')).toBe(true);
  });

  test('and puts it back before focus goes home', () => {
    // Focus sent to a trigger that is still inert goes nowhere.
    open();
    closeDialog($('box'));
    expect(document.activeElement).toBe($('trigger'));
  });

  test('is not the default: precise placement keeps the world in reach', () => {
    openDialog($('box'), { backdrop: $('backdrop'), trigger: $('trigger') });
    expect($('page').hasAttribute('inert')).toBe(false);
    closeDialog($('box'));
  });
});

describe('the smaller options', () => {
  test('initialFocus may be a function, asked once the dialog is shown', () => {
    let shown = null;
    open({
      initialFocus: () => {
        shown = !$('backdrop').hidden;
        return $('card');
      },
    });
    expect(shown).toBe(true);
    expect(document.activeElement).toBe($('card'));
  });

  test('a function that finds nothing falls back to the first control', () => {
    open({ initialFocus: () => null });
    expect(document.activeElement).toBe($('chip'));
  });

  test('returnFocus: false leaves focus to the caller, never in the box', () => {
    // Opening a lesson from its card: the lesson panel takes focus next.
    open();
    $('card').focus();
    closeDialog($('box'), 'close', { returnFocus: false });
    expect(document.activeElement).not.toBe($('trigger'));
    expect($('box').contains(document.activeElement)).toBe(false);
  });

  test('a second close is not reported a second time', () => {
    // Escape closes it, and the application's own Escape after it asks again.
    open();
    closeDialog($('box'), 'escape');
    closeDialog($('box'), 'close');
    expect(closes).toEqual(['escape']);
  });

  test('a dialog never opened here cannot be closed here', () => {
    // A box inside a backdrop is not hidden itself; closing it would hide it,
    // and the next open would show an empty backdrop.
    closeDialog($('box'));
    expect($('box').hidden).toBe(false);
    expect($('box').classList.contains('hidden')).toBe(false);
    expect(closes).toEqual([]);
  });
});
