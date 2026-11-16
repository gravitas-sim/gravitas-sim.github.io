// =============================================================================
// Early module fetches, held to what a browser does with them
// -----------------------------------------------------------------------------
// tools/modulepreload.mjs picks each page's links from its static import
// closure. tests/modulepreload.test.js holds the list to the rule; this holds
// the rule to the browser, on the pages where the closure is deepest:
//
//   - every module in the page's static closure was fetched by the browser
//     (so the walk misses none: a module the walk does not know is an import
//     form it cannot read);
//   - none was fetched twice by the page's own document (a link whose address
//     differed from the import's would fetch the file again; a frame the page
//     embeds fetches its own copies and is not counted);
//   - every linked module is one the page really used.
//
// Source tree only: dist/ is bundled and its pages carry no links.
// =============================================================================

import { test, expect } from './fixtures.js';
import { readFileSync } from 'node:fs';
import { closureLevels, pageEntries } from '../tools/modulepreload.mjs';

test.skip(
  process.env.GRAVITAS_E2E_TARGET === 'dist',
  'dist pages are bundled and carry no links'
);

const PAGES = [
  { page: 'index.html', url: '/' },
  { page: 'index.html', url: '/#investigation=keplers-laws' },
  { page: 'teaching/index.html', url: '/teaching/' },
  { page: 'figure/index.html', url: '/figure/' },
];

for (const { page: file, url } of PAGES) {
  test(`${url} fetches its static closure once, and every link is used`, async ({
    page,
  }) => {
    // The page's own document only: a page that embeds the application in a
    // frame (the figure builder) fetches the application's modules again there.
    const fetched = [];
    page.on('request', req => {
      const u = new URL(req.url());
      if (
        req.frame() === page.mainFrame() &&
        u.pathname.startsWith('/js/') &&
        u.pathname.endsWith('.js')
      )
        fetched.push(u.pathname.slice(1));
    });
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    const html = readFileSync(file, 'utf8');
    const closure = closureLevels(pageEntries(file, html)).flat();
    const linked = [
      ...html.matchAll(/rel="modulepreload" href="\/([^"]+)"/g),
    ].map(m => m[1]);

    expect(closure.filter(f => !fetched.includes(f))).toEqual([]);
    const twice = fetched.filter((f, i) => fetched.indexOf(f) !== i);
    expect(twice).toEqual([]);
    expect(linked.filter(f => !fetched.includes(f))).toEqual([]);
  });
}
