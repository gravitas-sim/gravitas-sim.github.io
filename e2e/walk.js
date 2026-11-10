// =============================================================================
// The keyboard walk every surface is held to (Prompt 278)
// -----------------------------------------------------------------------------
// e2e/a11ySweep.spec.js walks each surface of the walk inventory
// (tools/interaction-contract.json, `inventory`) with this: real Tab presses
// from the top of the page until focus comes round again, recording every stop.
// The findings are facts about the page, judged by the spec:
//
//   trap      focus stopped moving before it came round (WCAG 2.1.2)
//   unnamed   a stop with no accessible name (4.1.2)
//   offscreen a stop whose box is empty or outside the viewport while it has
//             focus: toBeVisible() passes for a control below the fold, so the
//             box is what is asserted (2.4.7, 2.4.11)
//   skipped   a control a pointer can press that Tab never reached (2.1.1)
//
// Self-contained functions run in the page; nothing here imports the app.
// =============================================================================

import { stepKey } from './keyboard.js';

/** What the page reports about the element that has focus. */
async function describeFocus() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement)
    return null;
  // A skip link slides in when it takes focus: its box is read where it
  // comes to rest, not where the transition began.
  await Promise.all(
    (el.getAnimations?.() || []).map(a => a.finished.catch(() => {}))
  );
  const text = node =>
    [...node.childNodes]
      .map(n => {
        if (n.nodeType === 3) return n.textContent;
        if (n.nodeType !== 1) return '';
        const s = getComputedStyle(n);
        if (s.display === 'none' || s.visibility === 'hidden') return '';
        if (n.getAttribute('aria-hidden') === 'true') return '';
        return n.getAttribute('aria-label') || n.getAttribute('alt') || text(n);
      })
      .join(' ');
  const byId = ids =>
    (ids || '')
      .split(/\s+/)
      .filter(Boolean)
      .map(id => {
        const n = document.getElementById(id);
        return n ? text(n) : '';
      })
      .join(' ');
  const name = (
    byId(el.getAttribute('aria-labelledby')) ||
    el.getAttribute('aria-label') ||
    (el.labels && [...el.labels].map(text).join(' ')) ||
    (el.closest('label') ? text(el.closest('label')) : '') ||
    text(el) ||
    el.getAttribute('title') ||
    el.getAttribute('alt') ||
    (['submit', 'button', 'reset'].includes(el.type) ? el.value : '') ||
    ''
  )
    .replace(/\s+/g, ' ')
    .trim();
  const r = el.getBoundingClientRect();
  const onScreen =
    r.width > 0 &&
    r.height > 0 &&
    r.bottom > 0 &&
    r.right > 0 &&
    r.top < window.innerHeight &&
    r.left < window.innerWidth;
  if (!el.dataset.walk)
    el.dataset.walk = String((window.__walk = (window.__walk || 0) + 1));
  return {
    key: el.dataset.walk,
    tag: el.tagName.toLowerCase(),
    type: el.type || '',
    id: el.id || '',
    name: name.slice(0, 80),
    onScreen,
    box: [r.left, r.top, r.width, r.height].map(Math.round),
  };
}

/** The controls a pointer can press, for the comparison with the Tab stops. */
function pressable() {
  const shown = el => {
    if (el.closest('[inert], [hidden], [aria-hidden="true"]')) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      if (n.tagName === 'DETAILS' && !n.open && !el.closest('summary'))
        return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const out = [];
  const radios = new Set();
  for (const el of document.querySelectorAll(
    'a[href], button, input, select, textarea, summary, [tabindex="0"], [role="button"], [role="link"]'
  )) {
    if (el.disabled || el.type === 'hidden') continue;
    if (el.getAttribute('tabindex') === '-1') continue;
    if (!shown(el)) continue;
    // One radio of a group is its Tab stop; the arrows reach the others.
    if (el.type === 'radio') {
      const group = `${el.form?.id || ''}/${el.name}`;
      if (radios.has(group)) continue;
      radios.add(group);
      const members = [
        ...document.querySelectorAll(`input[type="radio"][name="${el.name}"]`),
      ];
      out.push({
        radio: true,
        reached: members.some(m => m.dataset.walk),
        what: `radio ${el.name}`,
      });
      continue;
    }
    out.push({
      reached: Boolean(el.dataset.walk),
      what: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''} "${(
        el.getAttribute('aria-label') ||
        el.textContent ||
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40)}"`,
    });
  }
  return out;
}

/** How many presses in a row one element may keep focus before it is a trap. */
const within = stop =>
  stop.tag === 'iframe'
    ? 250
    : /^(date|time|datetime-local|month|week)$/.test(stop.type)
      ? 8
      : 2;

/**
 * Press Tab from the top of the page until focus comes round again.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} browserName
 * @param {{max?: number}} [options]
 * @returns {Promise<{stops: object[], trap: ?string, unnamed: string[],
 *   offscreen: string[], skipped: string[], wrapped: boolean}>}
 */
export async function tabWalk(page, browserName, { max = 1500 } = {}) {
  const key = stepKey(browserName);
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    window.scrollTo(0, 0);
  });
  const stops = [];
  const seen = new Set();
  let wrapped = false;
  let trap = null;
  let still = 0;
  let away = 0;
  let last = null;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    const stop = await page.evaluate(describeFocus);
    if (!stop) {
      // Focus is on the page itself or on the browser's own controls, between
      // the last control and the first. The round ends when a stop repeats;
      // a page that never gives focus back has lost it.
      if (++away > 5) break;
      continue;
    }
    away = 0;
    if (stop.key === last) {
      // The same element again: Tab did not move focus out of it. A date
      // field holds a stop for each of its parts and a frame holds its own
      // document's stops, so those are given the presses they need.
      if (++still >= within(stop)) {
        trap = `${stop.tag}${stop.id ? '#' + stop.id : ''} "${stop.name}"`;
        break;
      }
      continue;
    }
    still = 0;
    last = stop.key;
    if (seen.has(stop.key)) {
      wrapped = true;
      break;
    }
    seen.add(stop.key);
    stops.push(stop);
  }
  const label = s => `${s.tag}${s.id ? '#' + s.id : ''} "${s.name}"`;
  const reach = await page.evaluate(pressable);
  return {
    stops,
    wrapped,
    trap,
    unnamed: stops.filter(s => !s.name).map(label),
    offscreen: stops
      .filter(s => !s.onScreen)
      .map(s => `${label(s)} at ${s.box}`),
    skipped: reach.filter(r => !r.reached).map(r => r.what),
  };
}

/**
 * Press Tab until a control has focus.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} browserName
 * @param {string} selector - The control to reach
 * @param {{max?: number}} [options]
 * @returns {Promise<number>} Presses it took, or -1 when Tab never reached it
 */
export async function tabTo(page, browserName, selector, { max = 400 } = {}) {
  const key = stepKey(browserName);
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press(key);
    const there = await page.evaluate(
      s => document.activeElement?.matches?.(s) === true,
      selector
    );
    if (there) return i;
  }
  return -1;
}
