// Measures C1-C4 of spike/platform-shell/CRITERIA.md on the two prototype
// pages. Run from the worktree root: node spike/platform-shell/measure.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { serveStatic } from '../../tools/static-server.mjs';

const PORT = Number(process.env.PORT || 4320);
const OUT = 'spike/platform-shell/results';
mkdirSync(OUT, { recursive: true });
const server = await serveStatic({ root: process.cwd(), port: PORT });
const base = `http://127.0.0.1:${PORT}`;
const inventory = JSON.parse(readFileSync('spike/platform-shell/inventory.json', 'utf8'));
const routes = Object.keys(inventory);
const PAGES = [
  ['teaching', '/teaching/'],
  ['observatory', '/observatory/?open=tess-light-curve'],
];
const THEMES = ['midnight', 'deep', 'observatory', 'daylight'];
const result = { c1: {}, c2: {}, c3: [], c4: [] };

// C2: the module as served.
for (const f of ['js/shell.js', 'css/shell.css']) {
  const b = readFileSync(f);
  result.c2[f] = { raw: b.length, gzip: gzipSync(b, { level: 6 }).length };
}

const browser = await chromium.launch();
const fresh = async (opts = {}, init = {}) => {
  const ctx = await browser.newContext({ serviceWorkers: 'block', ...opts });
  await ctx.addInitScript(s => {
    try {
      localStorage.setItem('gravitas_welcome_seen_v1', '1');
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
    } catch {}
  }, init);
  return ctx;
};

// C1: every route two activations away, by mouse, keyboard and touch.
for (const [name, url] of PAGES) {
  for (const mode of ['mouse', 'keyboard', 'touch']) {
    const ctx = await fresh(mode === 'touch' ? { hasTouch: true, isMobile: false } : {});
    const page = await ctx.newPage();
    await page.goto(base + url);
    await page.locator('.gs-nav').waitFor();
    const reached = new Map();
    const groups = page.locator('.gs-nav > ul > li > button');
    for (let i = 0; i < (await groups.count()); i++) {
      const g = groups.nth(i);
      if (mode === 'mouse') await g.click();
      else if (mode === 'touch') await g.tap();
      else {
        await g.focus();
        await page.keyboard.press('Enter');
      }
      const links = page.locator(`#${await g.getAttribute('aria-controls')} a`);
      for (let j = 0; j < (await links.count()); j++) {
        const a = links.nth(j);
        if (mode === 'keyboard') {
          // Reached by Tab from the group button: focus movement, not an activation.
          await g.focus();
          for (let k = 0; k <= j; k++) await page.keyboard.press('Tab');
          const focused = await page.evaluate(() => document.activeElement?.getAttribute('href'));
          if (focused !== (await a.getAttribute('href'))) continue;
        } else if (!(await a.isVisible())) continue;
        const href = new URL(await a.getAttribute('href'), base).pathname;
        reached.set(href, 2);
      }
    }
    const missing = routes.filter(r => !reached.has(r));
    result.c1[`${name}/${mode}`] = { reached: reached.size, missing };
    await ctx.close();
  }
}

// C3: axe on the shell, every theme and both languages.
for (const [name, url] of PAGES) {
  for (const theme of THEMES) {
    for (const locale of ['en', 'es']) {
      const ctx = await fresh({}, { gravitas_theme: theme, gravitas_locale: locale });
      const page = await ctx.newPage();
      await page.goto(base + url);
      await page.locator('.gs-nav').waitFor();
      await page.locator('.gs-nav > ul > li > button').first().click();
      const shell = await new AxeBuilder({ page })
        .include('.gs-shell')
        .include('.gs-foot')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const whole = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      result.c3.push({
        page: name,
        theme,
        locale,
        shell: shell.violations.map(v => `${v.id} (${v.nodes.length})`),
        page_: whole.violations.map(v => `${v.id} (${v.nodes.length})`),
      });
      await ctx.close();
    }
  }
}

// C4: no horizontal overflow at four widths; screenshots with the menu open.
for (const [name, url] of PAGES) {
  for (const width of [375, 768, 1024, 1440]) {
    const ctx = await fresh({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(base + url);
    await page.locator('.gs-nav').waitFor({ state: 'attached' });
    await page.waitForTimeout(1500);
    const overflow = await page.evaluate(
      () => document.scrollingElement.scrollWidth - window.innerWidth
    );
    if (width < 768) await page.locator('.gs-toggle').click();
    await page.locator('.gs-nav > ul > li > button').first().click();
    await page.screenshot({ path: `${OUT}/${name}-${width}.png` });
    result.c4.push({ page: name, width, overflowPx: overflow });
    await ctx.close();
  }
}

await browser.close();
await server.close?.();
writeFileSync(`${OUT}/measure.json`, `${JSON.stringify(result, null, 1)}\n`);
console.log(JSON.stringify(result, null, 1));
process.exit(0);
