/**
 * @jest-environment jsdom
 */
// =============================================================================
// The first press of a rail button that fetches its panel
// -----------------------------------------------------------------------------
// The button stays focusable while the code arrives (a disabled button drops
// the keyboard focus), a second press meanwhile does nothing, the wait and a
// failure are announced, and a failed fetch can be pressed again.
// =============================================================================

/* global document, setTimeout, console */
import { describe, test, expect, jest } from '@jest/globals';
import { watchForPanel } from '../js/instrumentGate.js';

const setup = () => {
  document.body.innerHTML =
    '<div id="srStatus"></div><button id="panelBtn">Panel</button>';
  return document.getElementById('panelBtn');
};

describe('watchForPanel', () => {
  test('keeps focus and ignores a second press while loading', async () => {
    const button = setup();
    let release;
    const load = jest.fn(
      () => new Promise(resolve => (release = () => resolve({})))
    );
    const open = jest.fn();
    watchForPanel({ buttonId: 'panelBtn', load, open });

    button.focus();
    button.click();
    button.click();
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(document.activeElement).toBe(button);
    expect(document.getElementById('srStatus').textContent).not.toBe('');
    expect(load).toHaveBeenCalledTimes(1);

    release();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(open).toHaveBeenCalledTimes(1);
    expect(button.hasAttribute('aria-busy')).toBe(false);
  });

  test('a failed fetch is reported and the next press tries again', async () => {
    const button = setup();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const load = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce({});
    const open = jest.fn();
    watchForPanel({ buttonId: 'panelBtn', load, open });

    button.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(open).not.toHaveBeenCalled();
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(
      document.getElementById('gravitasToast')?.textContent ?? ''
    ).not.toBe('');

    button.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(load).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
