// SPIKE (Prompt 18): what each engine's DOMParser does with a hostile
// VOTable. An archive answer is someone else's XML; the question is whether
// parsing it can reach the network, the disk, or the reader's memory.
//
//   laughs     nested internal entities ("billion laughs"): 10^9 "lol"s
//   file       an external entity naming file:///etc/passwd
//   network    an external entity naming a URL on a server this script
//              runs, which records whether anything asked for it
//
// Run: node spike/vo/measure/xml-hostile.mjs [--json out]

import { chromium, firefox, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';

const hits = [];
const server = createServer((req, res) => {
  if (req.url.startsWith('/leak')) hits.push(req.url);
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<!doctype html><title>x</title>');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const vot = (dtd, td) =>
  `<?xml version="1.0"?><!DOCTYPE VOTABLE [${dtd}]><VOTABLE><RESOURCE><TABLE><FIELD name="a" datatype="char" arraysize="*"/><DATA><TABLEDATA><TR><TD>${td}</TD></TR></TABLEDATA></DATA></TABLE></RESOURCE></VOTABLE>`;
let laughs = '<!ENTITY l0 "lol">';
for (let i = 1; i <= 9; i++) laughs += `<!ENTITY l${i} "${`&l${i - 1};`.repeat(10)}">`;
const CASES = {
  laughs: vot(laughs, '&l9;'),
  file: vot('<!ENTITY x SYSTEM "file:///etc/passwd">', '&x;'),
  network: vot(`<!ENTITY x SYSTEM "${origin}/leak">`, '&x;'),
};

const results = [];
for (const [engineName, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch();
  const page = await browser.newPage();
  await page.goto(`${origin}/`);
  for (const [name, doc] of Object.entries(CASES)) {
    const before = hits.length;
    const out = await page.evaluate(doc => {
      const t0 = performance.now();
      const d = new DOMParser().parseFromString(doc, 'application/xml');
      const ms = performance.now() - t0;
      const err = d.getElementsByTagName('parsererror').length > 0;
      const td = d.getElementsByTagName('TD')[0]?.textContent ?? '';
      return { ms: Math.round(ms), parsererror: err, tdLength: td.length, passwd: /root:/.test(td) };
    }, doc);
    await page.waitForTimeout(300);
    results.push({ engine: engineName, case: name, ...out, requested: hits.length > before });
  }
  await browser.close();
}
server.close();
console.table(results);
const i = process.argv.indexOf('--json');
if (i > 0) writeFileSync(process.argv[i + 1], `${JSON.stringify({ at: new Date().toISOString(), results }, null, 2)}\n`);
