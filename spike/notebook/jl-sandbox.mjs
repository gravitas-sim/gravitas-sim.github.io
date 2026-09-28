// Spike: whether JupyterLite runs in an opaque-origin sandbox.
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await (await browser.newContext()).newPage();
const errors = [];
page.on('console', m => m.type() === 'error' && errors.push(m.text().slice(0, 200)));
await page.goto('http://127.0.0.1:4634/spike/notebook/jl-sandbox.html', { waitUntil: 'networkidle', timeout: 120_000 }).catch(() => {});
await page.waitForTimeout(10_000);
const frame = page.frames().find(f => f.url().includes('jupyterlite'));
const state = await frame?.evaluate(() => ({ origin: self.origin, shell: !!document.querySelector('#jp-main-dock-panel, .jp-LabShell'), text: document.body.innerText.slice(0, 200) })).catch(e => ({ failed: e.message.slice(0, 200) }));
console.log(JSON.stringify({ state, errors: [...new Set(errors)].slice(0, 6) }));
await browser.close();
