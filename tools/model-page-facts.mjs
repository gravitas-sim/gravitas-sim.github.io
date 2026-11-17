#!/usr/bin/env node
// =============================================================================
// Input events from the top of the model page to three named facts
// -----------------------------------------------------------------------------
// Development only, outside the gate (a browser run). For each fact it counts
// the input events a reader needs from the top of /model/ until the sentence is
// wholly in view, using only the page's visible controls (no browser find), at
// 1366x800 and 375x812, in English and in Spanish:
//
//   pointer    a click or tap on a link or a closed disclosure's summary, or
//              one PageDown (a scroll of the viewport height less 40 px). The reader goes
//              to the visible in-page link that lands nearest before the
//              sentence and gets closer than where they are; with none, a
//              PageDown. A closed disclosure that holds such a link is opened
//              by one click on its summary when its summary is in view.
//   keyboard   Tab presses from the top to the same link (every focusable
//              element counts, the header and the shell controls included),
//              one Enter on it and, when the sentence is still out of view,
//              PageDowns. A closed disclosure on the way costs its Enter, and
//              its links are then counted as tab stops.
//
// The facts and the sentences that count (the first words and the last):
//   a  the default integrator, symplectic Euler        section gravity
//   b  the transit fit's default limb-darkening law     section transit-fitting
//   c  the two reasons a run is not time-reversible     section irreversible
//
//   node tools/model-page-facts.mjs --label before   record under "before"
//   node tools/model-page-facts.mjs --label after    record under "after"
//   node tools/model-page-facts.mjs --print          print, write nothing
//
// The record is docs/model-page-facts.json. The numbers are a snapshot of one
// machine under the conditions the file states.
// =============================================================================

/* global NodeFilter */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettierNamespace from 'prettier';
import { serveStatic } from './static-server.mjs';

const prettier = prettierNamespace.format
  ? prettierNamespace
  : prettierNamespace.default;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RECORD = 'docs/model-page-facts.json';
const LIMIT = 400;

export const VIEWPORTS = [
  { id: '1366x800', width: 1366, height: 800, touch: false },
  { id: '375x812', width: 375, height: 812, touch: true },
];
export const LOCALES = ['en', 'es'];

/** The three facts: the section they live in and the sentence, per language. */
export const FACTS = [
  {
    id: 'a',
    name: 'The default integrator is symplectic Euler',
    section: 'gravity',
    sentence: {
      en: ['That ordering matters', 'into an orbit.'],
      es: ['Ese orden importa', 'en una órbita.'],
    },
  },
  {
    id: 'b',
    name: "The transit fit's default limb-darkening law is quadratic",
    section: 'transit-fitting',
    sentence: {
      en: ['The default is the', 'q1 and q2 fitted.'],
      es: ['La predeterminada es', 'q1 y q2 ajustados.'],
    },
  },
  {
    id: 'c',
    name: 'The two reasons a run is not time-reversible',
    section: 'irreversible',
    sentence: {
      en: ['There are two separate reasons', 'The first is the integrator.'],
      es: ['Hay dos razones distintas', 'La primera es el integrador.'],
    },
  },
];

/**
 * Runs in the page. Tags the sentence's range and answers geometry questions
 * for the walk. Everything is read from the live DOM at each step.
 */
function installProbe({ sentence, section }) {
  const lang = document.documentElement.lang === 'es' ? 'es' : 'en';
  const [from, to] = sentence[lang];
  const spans = [
    ...document.querySelectorAll(`#${section} ~ * .gs-${lang}, .gs-${lang}`),
  ];
  const shown = el => el.getClientRects().length > 0;
  // The sentence is found in the first visible span of the language that holds
  // the first words, from the section's own heading onwards.
  const head = document.getElementById(section);
  const startTop = head.getBoundingClientRect().top + window.scrollY;
  const norm = s => s.replace(/\s+/g, ' ');
  let found = null;
  for (const span of spans) {
    if (!shown(span)) continue;
    const y = span.getBoundingClientRect().top + window.scrollY;
    if (y < startTop - 1) continue;
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let text = '';
    const map = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const raw = n.nodeValue;
      for (let i = 0; i < raw.length; i++) {
        const c = raw[i];
        if (/\s/.test(c) && (text === '' || text.endsWith(' '))) continue;
        text += /\s/.test(c) ? ' ' : c;
        map.push([n, i]);
      }
      nodes.push(n);
    }
    const a = text.indexOf(norm(from));
    if (a < 0) continue;
    const b = text.indexOf(norm(to), a);
    if (b < 0) continue;
    const end = b + norm(to).length - 1;
    const range = document.createRange();
    range.setStart(map[a][0], map[a][1]);
    range.setEnd(map[end][0], map[end][1] + 1);
    found = range;
    break;
  }
  window.__factRange = found;
  return Boolean(found);
}

/** Per step: the sentence's place and the links that could be used. */
function probeState({ section }) {
  const vh = window.innerHeight;
  const range = window.__factRange;
  const rects = [...range.getClientRects()].filter(r => r.width > 0);
  const top = Math.min(...rects.map(r => r.top));
  const bottom = Math.max(...rects.map(r => r.bottom));
  const inView = top >= 0 && bottom <= vh;
  const docY = top + window.scrollY;
  const shown = el => el.getClientRects().length > 0;
  const links = [];
  for (const a of document.querySelectorAll('a[href^="#"]')) {
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const target = id ? document.getElementById(id) : null;
    if (!target || !shown(a) || !shown(target)) {
      // A link inside a closed disclosure: record it with the summary to open.
      const det = a.closest('details:not([open])');
      if (det && target && shown(target)) {
        const r = det.querySelector('summary').getBoundingClientRect();
        links.push({
          id,
          y: target.getBoundingClientRect().top + window.scrollY,
          visible: false,
          summaryX: r.left + Math.min(r.width / 2, 40),
          summaryTop: r.top,
          summaryBottom: r.bottom,
          summaryIndex: [
            ...document.querySelectorAll('a[href], button, summary, select'),
          ].indexOf(det.querySelector('summary')),
        });
      }
      continue;
    }
    // A link that wraps is clicked on its first line: the middle of the whole
    // box can fall in the gap beside it.
    const r = a.getClientRects()[0];
    links.push({
      id,
      y: target.getBoundingClientRect().top + window.scrollY,
      visible: r.top >= 0 && r.bottom <= vh && r.height > 0,
      index: [
        ...document.querySelectorAll('a[href], button, summary, select'),
      ].indexOf(a),
      x: r.left + Math.min(r.width / 2, 40),
      yc: r.top + r.height / 2,
      text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    });
  }
  return {
    inView,
    docY,
    scrollY: window.scrollY,
    vh,
    max: document.documentElement.scrollHeight - vh,
    links,
    section,
    sectionY:
      document.getElementById(section).getBoundingClientRect().top +
      window.scrollY,
  };
}

/** PageDowns (scrolls of the viewport height less 40 px) until the sentence is wholly in view. */
function pageDowns() {
  const range = window.__factRange;
  const vh = window.innerHeight;
  for (let n = 0; n < 400; n++) {
    const rects = [...range.getClientRects()].filter(r => r.width > 0);
    const top = Math.min(...rects.map(r => r.top));
    const bottom = Math.max(...rects.map(r => r.bottom));
    if (top >= 0 && bottom <= vh) return n;
    const before = window.scrollY;
    window.scrollBy(0, vh - 40);
    if (window.scrollY === before) return null;
  }
  return null;
}

async function pointerWalk(page, fact) {
  const route = [];
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.activeElement?.blur?.();
  });
  for (let n = 0; n < LIMIT; n++) {
    const s = await page.evaluate(probeState, fact);
    if (s.inView) return { events: n, route };
    // Links that land nearest before the sentence and make progress.
    const lands = l => l.y <= s.docY + 1 && l.y > s.scrollY + s.vh * 0.5;
    const usable = s.links.filter(lands).sort((p, q) => q.y - p.y);
    const best = usable[0];
    if (best && best.visible) {
      await page.mouse.click(best.x, best.yc);
      route.push(`click "${best.text}" (#${best.id})`);
    } else if (best && best.summaryTop >= 0 && best.summaryBottom <= s.vh) {
      await page.mouse.click(
        best.summaryX,
        (best.summaryTop + best.summaryBottom) / 2
      );
      route.push('open the contents disclosure');
    } else {
      await page.mouse.move(5, 5);
      await page.evaluate(() => window.scrollBy(0, window.innerHeight - 40));
      route.push('PageDown');
    }
    await page.waitForTimeout(60);
  }
  return { events: null, route };
}

/** Runs in the page: the cheapest keyboard route to a link that lands before the sentence. */
function keyboardPlan() {
  const range = window.__factRange;
  const rects = [...range.getClientRects()].filter(r => r.width > 0);
  const docY = Math.min(...rects.map(r => r.top)) + window.scrollY;
  const vh = window.innerHeight;
  const stop =
    'a[href], button, summary, select, input, textarea, [tabindex]:not([tabindex="-1"])';
  const rendered = el =>
    el.getClientRects().length > 0 && !el.disabled && el.tabIndex >= 0;
  const tabs = [...document.querySelectorAll(stop)].filter(rendered);
  let best = null;
  for (const a of document.querySelectorAll('a[href^="#"]')) {
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const target = id ? document.getElementById(id) : null;
    if (!target || target.getClientRects().length === 0) continue;
    const y = target.getBoundingClientRect().top + window.scrollY;
    if (!(y <= docY + 1 && y > vh * 0.5)) continue;
    let cost;
    let how;
    const det = a.closest('details:not([open])');
    if (det) {
      const summary = det.querySelector('summary');
      const inside = [...det.querySelectorAll('a[href], button')];
      cost = tabs.indexOf(summary) + 1 + 1 + inside.indexOf(a) + 1 + 1;
      how = 'Tab to the contents disclosure, Enter, Tab to the link, Enter';
    } else {
      const i = tabs.indexOf(a);
      if (i < 0) continue;
      cost = i + 1 + 1;
      how = `Tab x${i + 1}, Enter`;
    }
    const entry = {
      id,
      y,
      cost,
      how,
      text: (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    };
    // The link that lands nearest before the sentence; the cheaper of equals.
    if (
      !best ||
      entry.y > best.y + 1 ||
      (Math.abs(entry.y - best.y) <= 1 && entry.cost < best.cost)
    )
      best = entry;
  }
  return best;
}

async function keyboardWalk(page, fact) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.activeElement?.blur?.();
  });
  const s = await page.evaluate(probeState, fact);
  if (s.inView) return { events: 0, route: [] };
  const plan = await page.evaluate(keyboardPlan);
  let events = 0;
  const route = [];
  if (plan) {
    events += plan.cost;
    route.push(`${plan.how} "${plan.text}" (#${plan.id})`);
    // The link's target is brought to the top of the view.
    await page.evaluate(id => {
      for (const d of document.querySelectorAll('details'))
        if (d.querySelector(`a[href="#${id}"]`)) d.open = true;
      document.getElementById(id).scrollIntoView();
    }, plan.id);
  }
  const k = await page.evaluate(pageDowns);
  if (k === null) return { events: null, route };
  if (k) {
    events += k;
    route.push(`PageDown x${k}`);
  }
  return { events, route };
}

const git = args =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

async function format(text) {
  const options = JSON.parse(
    readFileSync(path.join(ROOT, '.prettierrc.json'), 'utf8')
  );
  return prettier.format(text, { ...options, parser: 'json' });
}

/** Collapses runs of PageDown in a route for the record. */
function compact(route) {
  const out = [];
  for (const step of route) {
    const last = out[out.length - 1];
    if (step === 'PageDown' && last && /^PageDown/.test(last)) {
      const n = Number(/x(\d+)$/.exec(last)?.[1] ?? 1) + 1;
      out[out.length - 1] = `PageDown x${n}`;
    } else out.push(step);
  }
  return out;
}

async function main(argv) {
  const at = argv.indexOf('--label');
  const label = at >= 0 ? argv[at + 1] : null;
  if (!argv.includes('--print') && !['before', 'after'].includes(label))
    throw new Error('pass --label before, --label after or --print');
  const onlyAt = argv.indexOf('--only');
  const only = onlyAt >= 0 ? argv[onlyAt + 1] : null;
  const server = await serveStatic({ root: ROOT, port: 0 });
  const base = server.url.replace(/\/$/, '');
  const browser = await chromium.launch();
  const version = browser.version();
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
          reducedMotion: 'reduce',
        });
        await context.addInitScript(l => {
          try {
            window.localStorage.setItem('gravitas_locale', l);
          } catch {
            /* storage unavailable */
          }
        }, locale);
        for (const fact of FACTS) {
          if (only && !`${fact.id} ${viewport.id} ${locale}`.includes(only))
            continue;
          const page = await context.newPage();
          const row = {
            fact: fact.id,
            viewport: viewport.id,
            locale,
          };
          try {
            await page.goto(`${base}/model/`, { waitUntil: 'load' });
            await page.waitForSelector('main', { state: 'visible' });
            await page.waitForLoadState('networkidle').catch(() => {});
            await page.waitForTimeout(200);
            const ok = await page.evaluate(installProbe, fact);
            if (!ok) throw new Error('the sentence is not on the page');
            const p = await pointerWalk(page, fact);
            const k = await keyboardWalk(page, fact);
            row.pointer_events = p.events;
            row.keyboard_events = k.events;
            row.pointer_route = compact(p.route);
            row.keyboard_route = compact(k.route);
          } catch (err) {
            row.error = String(err.message || err)
              .split('\n')[0]
              .slice(0, 300);
          }
          await page.close();
          rows.push(row);
          if (only) console.error(JSON.stringify(row, null, 1));
          process.stderr.write(
            `${row.error ? 'x' : '.'} ${fact.id} ${viewport.id} ${locale} pointer ${row.pointer_events} keyboard ${row.keyboard_events}${row.error ? ` ${row.error}` : ''}\n`
          );
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  const measured = {
    commit: git(['rev-parse', '--short=8', 'HEAD']),
    treeClean: git(['status', '--porcelain', '--untracked-files=no']) === '',
    date: new Date().toISOString().slice(0, 10),
    node: process.version,
    chromium: version,
    rows,
  };
  if (argv.includes('--print')) {
    process.stdout.write(JSON.stringify(measured, null, 2));
    return 0;
  }
  const file = path.join(ROOT, RECORD);
  const record = existsSync(file)
    ? JSON.parse(readFileSync(file, 'utf8'))
    : {
        format: 'gravitas.model-page-facts/1',
        facts: FACTS.map(f => ({
          id: f.id,
          name: f.name,
          section: f.section,
          sentence: f.sentence,
        })),
        conditions: {
          viewports: VIEWPORTS.map(v => v.id),
          locales: LOCALES,
          serviceWorkers: 'blocked',
          motion:
            'reduced, so a link jumps and a count is not a scroll animation',
          server: 'tools/static-server.mjs: no compression, no caching',
          event:
            'a click or tap, a Tab or Enter press, or one PageDown (a scroll of the viewport height less 40 px, the usual page step); the sentence counts when its whole range is inside the viewport',
          limit: `a walk that has not finished in ${LIMIT} events is recorded as null`,
        },
      };
  record[label] = measured;
  writeFileSync(file, await format(JSON.stringify(record)));
  console.log(`wrote ${RECORD} (${label}): ${rows.length} rows`);
  return 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exit(await main(process.argv.slice(2)));
}
