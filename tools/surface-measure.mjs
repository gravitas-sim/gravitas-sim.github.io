#!/usr/bin/env node
// =============================================================================
// Page length and the first real action, measured the same way every run
// -----------------------------------------------------------------------------
// Development only, outside the gate (a browser run). Opens every measured
// state the surface ledger declares (docs/surface-ledger.json, `measure`) in
// headless Chromium with service workers blocked, at 1366x800 and 375x812, in
// English and in Spanish, and records for each:
//
//   height               the page's scroll height in viewport heights
//   words                the words of document.body.innerText
//   h1, h2, h3           heading counts
//   toc                  whether a contents list is present
//   hscroll              whether the page scrolls sideways
//   primary_*            the text and the document y of the control the row's
//                        primary action names, by selector, whatever its element
//   keyboard_tabs        Tab presses from the top of the page to reach it
//   scroll_viewports     viewport-height scrolls to bring it on screen
//   first_link_proxy_*   the first link or button of the main region outside
//                        navigation, header, footer, breadcrumbs, dialogs and
//                        skip links. A proxy, never reported as the primary
//                        action.
//
// Each state is set up and asserted before anything is recorded: the storage
// keys it seeds (and that the others are absent), the element that proves it is
// ready (awaited, never a timer alone; `splashScreenEnded` on application
// routes) and, where the row names a primary action, that the control exists
// and is not covered. A state that cannot be set up is recorded with its error;
// nothing is guessed.
//
//   node tools/surface-measure.mjs                 measure all, write the record
//   node tools/surface-measure.mjs --only <text>   rows whose id or path contain text
//   node tools/surface-measure.mjs --print         print, write nothing
//
// The record is docs/surface-measurements.json, with the commit, date and
// versions it was measured under, as `measuredAt` does in tools/surface-gate.json.
// Numbers are a snapshot of one machine: compare two runs only on the same
// conditions, which the file states.
// =============================================================================

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettierNamespace from 'prettier';
import { serveStatic } from './static-server.mjs';

const prettier = prettierNamespace.format
  ? prettierNamespace
  : prettierNamespace.default;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RECORD = 'docs/surface-measurements.json';

export const VIEWPORTS = [
  { id: '1366x800', width: 1366, height: 800, touch: false },
  { id: '375x812', width: 375, height: 812, touch: true },
];
export const LOCALES = ['en', 'es'];

const SEED_KEYS = {
  welcome: 'gravitas_welcome_seen_v1',
  orientation: 'gravitas_orientation_seen_v1',
};
const TAB_LIMIT = 250;
let version = '';

/** The measured states of the ledger, in order. */
export function measuredStates(ledger) {
  return ledger.rows.flatMap(r =>
    (r.measure ?? []).map(m => ({ ...m, row: r.id }))
  );
}

/** A first-week record as the course home leaves one (as e2e/sweepOpen.js does). */
function weekOf(ids, library) {
  return {
    v: 1,
    id: 'week-one',
    t: { en: 'Week one', es: 'Semana uno' },
    items: ids.map(id => {
      const e = library.entries.find(x => x.id === id);
      const lesson = e.format === 'lesson' ? id.split(':')[1] : null;
      return {
        t: e.title,
        h: e.route,
        ...(lesson ? { l: lesson, n: e.steps } : {}),
      };
    }),
  };
}

/** What the page says about itself. Runs in the page; nothing here is imported. */
function inPage(primarySelector) {
  const vh = window.innerHeight;
  const rendered = el => el.getClientRects().length > 0;
  const root = document.documentElement;
  const height = Math.max(root.scrollHeight, document.body.scrollHeight);
  const words = (document.body.innerText.match(/\S+/g) || []).length;
  const count = tag =>
    [...document.querySelectorAll(tag)].filter(rendered).length;
  const main = document.querySelector('main') || document.body;
  const anchors = list =>
    [...list.querySelectorAll('a[href^="#"]')].filter(
      a => a.getAttribute('href').length > 1
    ).length;
  const toc =
    Boolean(
      document.querySelector(
        'nav.doc-toc, nav.ad-toc, [data-toc], nav[aria-label*="contents" i], nav[aria-label*="on this page" i], nav[aria-label*="índice" i], nav[aria-label*="en esta página" i]'
      )
    ) || [...main.querySelectorAll('nav, ul, ol')].some(l => anchors(l) >= 5);

  const textOf = el =>
    (
      el.getAttribute('aria-label') ||
      el.innerText ||
      el.value ||
      el.getAttribute('placeholder') ||
      el.getAttribute('title') ||
      ''
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
  const place = el => {
    const r = el.getBoundingClientRect();
    return { y: Math.round(r.top + window.scrollY), h: Math.round(r.height) };
  };

  const excluded =
    'nav, header, footer, dialog, [role="dialog"], [role="navigation"], [role="banner"], [role="contentinfo"], .skip-link, .breadcrumb, [class*="crumb"], [aria-hidden="true"], [hidden], [inert]';
  const proxy = [...main.querySelectorAll('a[href], button')].find(
    el => rendered(el) && !el.closest(excluded)
  );

  let primary = null;
  if (primarySelector) {
    const el = document.querySelector(primarySelector);
    if (!el) primary = { error: 'the control is absent' };
    else if (!rendered(el)) primary = { error: 'the control is not rendered' };
    else {
      const p = place(el);
      const text = textOf(el);
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2
      );
      const covered = !(hit && (el.contains(hit) || hit.contains(el)));
      window.scrollTo(0, 0);
      primary = { text, ...p, covered };
    }
  }
  return {
    height_viewports: Math.round((height / vh) * 10) / 10,
    scroll_height_px: height,
    words,
    h1: count('h1'),
    h2: count('h2'),
    h3: count('h3'),
    toc,
    hscroll: root.scrollWidth > root.clientWidth + 1,
    lang: root.lang,
    storage: {
      welcome: window.localStorage.getItem('gravitas_welcome_seen_v1'),
      orientation: window.localStorage.getItem('gravitas_orientation_seen_v1'),
    },
    first_link_proxy: proxy ? { text: textOf(proxy), ...place(proxy) } : null,
    primary,
    viewport_height: vh,
  };
}

async function measureOne(context, base, state, viewport, locale, library) {
  const page = await context.newPage();
  const out = {
    id: `${state.row}#${state.id}`,
    row: state.row,
    state: state.id,
    path: state.path,
    viewport: viewport.id,
    locale,
  };
  try {
    const storage = { gravitas_locale: locale };
    for (const s of state.seeds) if (SEED_KEYS[s]) storage[SEED_KEYS[s]] = '1';
    if (state.firstWeek)
      storage.gravitas_first_week = JSON.stringify(
        weekOf(state.firstWeek, library)
      );
    await page.addInitScript(entries => {
      try {
        for (const [k, v] of entries) window.localStorage.setItem(k, v);
      } catch {
        /* storage unavailable */
      }
    }, Object.entries(storage));
    await page.goto(base + state.path, { waitUntil: 'load' });
    const app = state.path === '/' || /^\/[?#]/.test(state.path);
    if (app)
      await page.waitForFunction(
        () => window.splashScreenEnded === true,
        null,
        {
          timeout: 30_000,
        }
      );
    const ready = state.ready || (app ? '.ui-container.showUI' : 'main');
    await page.waitForSelector(ready, { state: 'visible', timeout: 30_000 });
    if (app && state.id === 'home')
      await page.waitForFunction(
        () =>
          document
            .getElementById('welcomeDialog')
            ?.contains(document.activeElement),
        null,
        { timeout: 30_000 }
      );
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(250);

    const got = await page.evaluate(inPage, state.primary?.selector ?? null);
    // The state is what the row declared: the seeds are in storage and the
    // others are not.
    for (const key of ['welcome', 'orientation']) {
      const want = state.seeds.includes(key) ? '1' : null;
      if (got.storage[key] !== want)
        throw new Error(
          `state not as declared: ${SEED_KEYS[key]} is ${JSON.stringify(got.storage[key])}, the row declares ${JSON.stringify(want)}`
        );
    }
    if (got.primary?.error)
      throw new Error(
        `primary action ${state.primary.selector}: ${got.primary.error}`
      );
    if (got.primary?.covered)
      throw new Error(
        `primary action ${state.primary.selector} is covered where it sits`
      );

    // The walk to it: Tab from the top of the page, then scrolls of one viewport.
    let tabs = null;
    let scrolls = null;
    if (state.primary) {
      await page.evaluate(() => {
        document.activeElement?.blur?.();
        window.scrollTo(0, 0);
      });
      for (let i = 1; i <= TAB_LIMIT; i++) {
        await page.keyboard.press('Tab');
        const there = await page.evaluate(s => {
          const el = document.querySelector(s);
          return Boolean(
            el &&
            (document.activeElement === el ||
              el.contains(document.activeElement))
          );
        }, state.primary.selector);
        if (there) {
          tabs = i;
          break;
        }
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      scrolls = await page.evaluate(sel => {
        const vh = window.innerHeight;
        const el = document.querySelector(sel);
        let n = 0;
        while (n < 400) {
          const r = el.getBoundingClientRect();
          if (r.top >= 0 && r.bottom <= vh) break;
          const before = window.scrollY;
          window.scrollBy(0, vh);
          n += 1;
          if (window.scrollY === before) break;
        }
        window.scrollTo(0, 0);
        return n;
      }, state.primary.selector);
    }
    Object.assign(out, {
      height_viewports: got.height_viewports,
      scroll_height_px: got.scroll_height_px,
      words: got.words,
      h1: got.h1,
      h2: got.h2,
      h3: got.h3,
      toc: got.toc,
      hscroll: got.hscroll,
      lang: got.lang,
      primary_selector: state.primary?.selector ?? null,
      primary_text: got.primary?.text ?? null,
      primary_y_px: got.primary?.y ?? null,
      primary_y_viewports: got.primary
        ? Math.round((got.primary.y / got.viewport_height) * 10) / 10
        : null,
      keyboard_tabs: tabs,
      scroll_viewports: scrolls,
      first_link_proxy_text: got.first_link_proxy?.text ?? null,
      first_link_proxy_y_px: got.first_link_proxy?.y ?? null,
      error: null,
    });
    if (state.primary && tabs === null)
      out.note = `Tab did not reach the control in ${TAB_LIMIT} presses`;
  } catch (err) {
    out.error = String(err.message || err)
      .split('\n')[0]
      .slice(0, 300);
  } finally {
    await page.close();
  }
  return out;
}

const git = args =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

async function format(text) {
  const options = JSON.parse(
    readFileSync(path.join(ROOT, '.prettierrc.json'), 'utf8')
  );
  return prettier.format(text, { ...options, parser: 'json' });
}

async function main(argv) {
  const ledger = JSON.parse(
    readFileSync(path.join(ROOT, 'docs/surface-ledger.json'), 'utf8')
  );
  const library = JSON.parse(
    readFileSync(path.join(ROOT, 'library/library.json'), 'utf8')
  );
  const onlyAt = argv.indexOf('--only');
  const only = onlyAt >= 0 ? argv[onlyAt + 1] : null;
  const states = measuredStates(ledger).filter(
    s => !only || `${s.row}#${s.id} ${s.path}`.includes(only)
  );
  const server = await serveStatic({ root: ROOT, port: 0 });
  const base = server.url.replace(/\/$/, '');
  const browser = await chromium.launch();
  const rows = [];
  try {
    for (const viewport of VIEWPORTS) {
      for (const locale of LOCALES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          hasTouch: viewport.touch,
          isMobile: viewport.touch,
          deviceScaleFactor: 1,
          serviceWorkers: 'block',
        });
        for (const state of states) {
          const r = await measureOne(
            context,
            base,
            state,
            viewport,
            locale,
            library
          );
          rows.push(r);
          process.stderr.write(
            `${r.error ? 'x' : '.'} ${r.id} ${viewport.id} ${locale}${r.error ? `  ${r.error}` : ''}\n`
          );
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  const record = {
    format: 'gravitas.surface-measurements/1',
    measuredAt: {
      commit: git(['rev-parse', '--short=8', 'HEAD']),
      treeClean: git(['status', '--porcelain', '--untracked-files=no']) === '',
      date: new Date().toISOString().slice(0, 10),
      node: process.version,
      chromium: version,
      playwright: JSON.parse(
        readFileSync(
          path.join(ROOT, 'node_modules/playwright/package.json'),
          'utf8'
        )
      ).version,
      note: 'A snapshot of one machine under the conditions below; compare two runs only when those match. Page length is the scroll height in viewport heights.',
    },
    conditions: {
      viewports: VIEWPORTS.map(v => v.id),
      locales: LOCALES,
      theme: 'the default theme, light colour scheme',
      deviceScaleFactor: 1,
      serviceWorkers: 'blocked',
      server: 'tools/static-server.mjs: no compression, no caching',
      network: 'unthrottled, local',
      keyboard: `Tab presses from the top of the page, at most ${TAB_LIMIT}`,
      touch:
        'The phone viewport is an emulated touch device; the scroll count is scripted, one window.scrollBy of one viewport height per step, not a real touch gesture.',
      firstLinkProxy:
        'the first a[href] or button of the main region outside navigation, header, footer, breadcrumbs, dialogs and skip links; never the primary action',
    },
    rows,
    summary: {
      states: states.length,
      rows: rows.length,
      errors: rows.filter(r => r.error).length,
    },
  };
  const text = await format(JSON.stringify(record));
  if (argv.includes('--print')) process.stdout.write(text);
  else writeFileSync(path.join(ROOT, RECORD), text);
  (argv.includes('--print') ? console.error : console.log)(
    `${record.summary.rows} rows for ${states.length} states, ${record.summary.errors} with an error${argv.includes('--print') ? '' : `; wrote ${RECORD}`}`
  );
  return 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const b = await chromium.launch();
  version = b.version();
  await b.close();
  process.exit(await main(process.argv.slice(2)));
}
