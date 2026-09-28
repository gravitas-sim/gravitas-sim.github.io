// Spike: which Workers an opaque-origin sandboxed frame may start, per engine.
import { chromium, firefox, webkit } from '@playwright/test';
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  const page = await (await browser.newContext()).newPage();
  const msgs = [];
  page.on('console', m => msgs.push(m.text().slice(0, 160)));
  await page.goto('http://127.0.0.1:4634/spike/notebook/host.html?runner=runner-worker.html&notebook=hostile-shape.ipynb');
  const frame = await (async () => { for (let i = 0; i < 50; i++) { const f = page.frames().find(x => x !== page.mainFrame()); if (f) return f; await new Promise(r => setTimeout(r, 100)); } })();
  const result = await frame.evaluate(async () => {
    const tryWorker = (make) => new Promise(ok => {
      try {
        const w = make();
        const t = setTimeout(() => ok('no answer'), 3000);
        w.onmessage = e => { clearTimeout(t); ok(`answered ${e.data}`); w.terminate(); };
        w.onerror = e => { clearTimeout(t); ok(`error: ${e.message || 'event'}`); };
      } catch (e) { ok(`threw ${e.name}: ${e.message.slice(0, 100)}`); }
    });
    const blob = (type) => URL.createObjectURL(new Blob(["postMessage(typeof importScripts + ' ' + self.origin)"], { type: 'text/javascript' }));
    return {
      classicBlob: await tryWorker(() => new Worker(blob())),
      moduleBlob: await tryWorker(() => new Worker(blob(), { type: 'module' })),
      dataUrl: await tryWorker(() => new Worker("data:text/javascript,postMessage('data')")),
    };
  }).catch(e => ({ failed: e.message.slice(0, 200) }));
  console.log(name, JSON.stringify(result), msgs.filter(m => /worker|CSP|Content Security|Refused/i.test(m)).slice(0, 3));
  await browser.close();
}
