/**
 * @jest-environment jsdom
 */
// =============================================================================
// A dialog closed before its first frame, in js/dialog.js
// -----------------------------------------------------------------------------
// openDialog() shows the panel at once and takes the `hidden` class off on the
// next animation frame, so the opening transition runs from the closed state.
// closeDialog() puts the class back and hides the panel when the transition
// ends - unless the class has gone again by then, which it reads as a reopen.
//
// An Escape that arrived before the open's first frame was closed first, and
// then the late frame took the class off. finish() saw no class and never set
// `hidden`, so the panel stayed on screen, inert and dead to input. Under load,
// Playwright's Escape beats the frame often enough to fail
// e2e/settingsDialog.spec.js "Escape closes it and puts focus back on the
// trigger" with `Received: visible`.
//
// Frames are held in a queue here and run by hand, so the order is the test's
// to choose, and the 600 ms fallback is run by fake timers. jsdom has no
// layout, so offsetParent - which focusable() reads to skip anything not
// rendered - is given the parent node.
// =============================================================================

import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { openDialog, closeDialog } from '../js/dialog.js';

const offsetParent = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'offsetParent'
);
const realFrame = window.requestAnimationFrame;

let panel;
let frames;
const $ = id => document.getElementById(id);

/** Run every frame asked for so far. */
const frame = () => frames.splice(0).forEach(callback => callback(0));

/** Escape as the browser delivers it, on whatever has focus. */
const escape = () =>
  document.activeElement.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
  );

/** What a reader would find, in the terms the e2e test asserts. */
const state = () => ({
  hidden: panel.hidden,
  hasClass: panel.classList.contains('hidden'),
  inert: panel.hasAttribute('inert'),
});

const open = () =>
  openDialog(panel, { trigger: $('trigger'), initialFocus: '#first' });

beforeEach(() => {
  jest.useFakeTimers();
  frames = [];
  window.requestAnimationFrame = callback => frames.push(callback);
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() {
      return this.parentNode;
    },
  });
  // As index.html ships a closed panel: hidden, inert, and with the class.
  document.body.innerHTML = `
    <button id="trigger" type="button">Settings</button>
    <div id="panel" class="hidden" hidden inert>
      <input id="first" type="text">
      <button id="apply" type="button">Apply</button>
    </div>`;
  panel = $('panel');
});

afterEach(() => {
  jest.useRealTimers();
  window.requestAnimationFrame = realFrame;
  document.body.innerHTML = '';
  if (offsetParent) {
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', offsetParent);
  }
});

describe('a close that comes before the first frame', () => {
  test('Escape before the frame leaves the panel hidden, not stranded', () => {
    open();
    escape();
    expect(document.activeElement).toBe($('trigger'));
    frame(); // the open's late frame
    jest.runAllTimers(); // the close's fallback: no transition ever ran
    expect(state()).toEqual({ hidden: true, hasClass: true, inert: true });
  });

  test('and the next open is an ordinary one', () => {
    open();
    closeDialog(panel, 'escape');
    frame();
    jest.runAllTimers();
    open();
    frame();
    expect(state()).toEqual({ hidden: false, hasClass: false, inert: false });
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement).toBe($('first'));
  });
});

describe('what the frame still does', () => {
  test('an open that reaches its frame animates out when closed', () => {
    open();
    frame();
    expect(state()).toEqual({ hidden: false, hasClass: false, inert: false });
    closeDialog(panel, 'escape');
    // Still laid out while the closing transition runs, but out of reach.
    expect(state()).toEqual({ hidden: false, hasClass: true, inert: true });
    panel.dispatchEvent(new Event('transitionend'));
    expect(panel.hidden).toBe(true);
  });

  test('an open during the closing transition is ignored, and the close finishes', () => {
    // openDialog returns early while `hidden` is false, which it still is
    // until the transition ends. Nothing asks for a frame, and nothing takes
    // the class off under the close.
    open();
    frame();
    closeDialog(panel, 'escape');
    open();
    expect(frames).toHaveLength(0);
    jest.runAllTimers();
    expect(state()).toEqual({ hidden: true, hasClass: true, inert: true });
  });
});
