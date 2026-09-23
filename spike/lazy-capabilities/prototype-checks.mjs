#!/usr/bin/env node
// =============================================================================
// Spike: the failure, retry and offline behavior of a lazily loaded family
// -----------------------------------------------------------------------------
// Disposable checks for LAZY_CAPABILITIES_GATE.md, against a tree served the way
// GitHub Pages serves this site - the committed sources, unbundled:
//
//   M9  the transit family's module is made to fail; the instrument step must
//       say so in a status region and offer a focused retry; once the request
//       is allowed again, the retry must draw the instrument without a reload
//   M7  a visit online lets the service worker install; offline, a reload of
//       Transit Photometry must still reach and draw its instrument
//
//   node spike/lazy-capabilities/prototype-checks.mjs <tree> <port>
// =============================================================================

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const [tree, portArg] = process.argv.slice(2);
const PORT = Number(portArg || 4405);
const BASE = `http://127.0.0.1:${PORT}`;
const LESSON = '/#investigation=transit-photometry';
const TOOL_STEP = 5;

const server = spawn(
  process.execPath,
  [
    path.join(ROOT, 'tools/static-server.mjs'),
    '--root',
    path.resolve(tree),
    '--port',
    String(PORT),
  ],
  { stdio: 'ignore' }
);
await new Promise(r => setTimeout(r, 800));

const results = {};
const seen = () => localStorage.setItem('gravitas_welcome_seen_v1', '1');

async function toToolStep(page) {
  await page.waitForFunction(() => {
    const p = document.getElementById('investigationPanel');
    return p && !p.hidden;
  });
  for (let s = 0; s < TOOL_STEP; s++)
    await page.locator('#investigationNext').click();
}
const drawn = page =>
  page.waitForFunction(
    () => {
      const panel = document.getElementById('investigationTool');
      const note = document.getElementById('investigationToolNote');
      const controls = document.querySelectorAll(
        '#investigationToolControls input'
      );
      return (
        panel &&
        !panel.hidden &&
        note.getAttribute('role') !== 'status' &&
        controls.length > 0
      );
    },
    null,
    { timeout: 30_000 }
  );

const browser = await chromium.launch();
try {
  // M9: failure, a named status message, a focused retry, and recovery.
  {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.addInitScript(seen);
    const page = await context.newPage();
    let blocked = true;
    await page.route('**/js/transitWidgets.js', route =>
      blocked ? route.abort('failed') : route.continue()
    );
    await page.goto(BASE + LESSON, { waitUntil: 'domcontentloaded' });
    await toToolStep(page);
    await page.waitForFunction(() => {
      const note = document.getElementById('investigationToolNote');
      return note && /could not be loaded/.test(note.textContent);
    });
    const failed = await page.evaluate(() => {
      const note = document.getElementById('investigationToolNote');
      const button = document.querySelector(
        '#investigationToolControls button'
      );
      return {
        role: note.getAttribute('role'),
        text: note.textContent,
        retry: button?.textContent || null,
        focused: document.activeElement === button,
      };
    });
    blocked = false;
    await page.keyboard.press('Enter');
    await drawn(page);
    results.M9 = {
      failed,
      recoveredWithoutReload: true,
      pass:
        failed.role === 'status' &&
        failed.retry === 'Try again' &&
        failed.focused,
    };
    await context.close();
  }

  // M7: online first visit installs the service worker; then offline.
  {
    const context = await browser.newContext({ serviceWorkers: 'allow' });
    await context.addInitScript(seen);
    const page = await context.newPage();
    await page.goto(BASE + LESSON, { waitUntil: 'domcontentloaded' });
    await page
      .waitForFunction(
        () => navigator.serviceWorker?.controller !== null || false,
        null,
        {
          timeout: 60_000,
        }
      )
      .catch(() => {});
    // Give the install its precache; a controlled page is the signal.
    await page.reload({ waitUntil: 'domcontentloaded' });
    const controlled = await page.evaluate(() =>
      Boolean(navigator.serviceWorker?.controller)
    );
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    let ok = false;
    try {
      await toToolStep(page);
      await drawn(page);
      ok = true;
    } catch {
      ok = false;
    }
    results.M7 = {
      controlledBeforeOffline: controlled,
      drawnOffline: ok,
      pass: controlled && ok,
    };
    await context.close();
  }
} finally {
  await browser.close();
  server.kill();
}
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
