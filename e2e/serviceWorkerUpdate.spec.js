// =============================================================================
// One revision at a time
// -----------------------------------------------------------------------------
// The failure this file exists for is not "the update is slow". It is that a
// returning browser could run a page assembled from two builds at once.
//
// The old shape of sw.js answered navigations network first and put what came
// back into its own cache. That cache is named for the hash of the files the
// *old* install put in it, and every precached module in it is still the old
// one - so after a deploy, a reload fetched the new index.html, cached it
// beside the old modules, and served a document whose deployment marker said
// one thing while the code running underneath it was another. Nothing in the
// suite could see that, because nothing in the suite had two builds.
//
// So this makes two. A miniature site is served out of a temporary directory
// with the real sw.js and the real js/offline.js copied into it, and every
// other byte under the test's control. Version A is installed and activated,
// the directory is swapped to version B, and the questions that matter get
// asked of a real worker in a real browser:
//
//   - does a waiting update leave A coherent, including across a reload
//   - can any sequence produce a B shell with A modules
//   - does accepting the update produce a coherent B, once, in every open tab
//   - does a missing CORE file stop the new version activating
//   - does a missing OPTIONAL file cost only the picture
//
// The fixture is deliberately not the real application: an application is a bad
// instrument. What is real here is the worker, the registration client, and the
// browser's own update machinery.
// =============================================================================

import { test, expect } from './fixtures.js';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/* global navigator */

test.use({ serviceWorkers: 'allow' });

const ROOT = new URL('..', import.meta.url).pathname;

/** The files a fixture build is made of, given a version letter. */
function build(letter) {
  return {
    'index.html': `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Fixture ${letter}</title>
<meta name="gravitas-revision" content="${letter}">
<link rel="stylesheet" href="./app.css"></head>
<body>
<div id="updateBadge" class="update-badge" role="status" aria-live="polite" hidden>
  <span data-i18n="update.ready">A new version is ready</span>
  <button type="button" id="updateBadgeApply">Reload</button>
  <button type="button" id="updateBadgeDismiss" aria-label="Not now">&times;</button>
</div>
<p id="shell">shell ${letter}</p>
<p id="module">module: <span id="from">?</span></p>
<img id="thumb" src="./images/scenarios/one.webp" alt="">
<script type="module">
  import { LETTER } from './app.js';
  document.getElementById('from').textContent = LETTER;
  window.__moduleLetter = LETTER;
  import('./offline.js').then(m => { window.__offline = m; return m.initOffline(); });
</script>
</body></html>`,
    'app.js': `export const LETTER = '${letter}';\n`,
    'app.css': `#shell { color: ${letter === 'A' ? 'rebeccapurple' : 'teal'}; }\n`,
    'images/scenarios/one.webp': `fake thumbnail ${letter}\n`,
  };
}

/** Core is everything the application needs; the picture is optional. */
const CORE = ['./index.html', './app.js', './app.css', './offline.js'];
const OPTIONAL = ['./images/scenarios/one.webp'];

/** The manifest the real sw.js imports, for one set of file contents. */
function manifest(files, offlineSource) {
  const digest = createHash('sha256');
  for (const [path, body] of Object.entries({
    ...files,
    'offline.js': offlineSource,
  })) {
    digest.update(path);
    digest.update(createHash('sha256').update(body).digest());
  }
  const version = digest.digest('hex').slice(0, 12);
  return `self.__GRAVITAS_CACHE_VERSION = 'gravitas-${version}';
self.__GRAVITAS_PRECACHE_BYTES = 1;
self.__GRAVITAS_PRECACHE_CORE = ${JSON.stringify(CORE)};
self.__GRAVITAS_PRECACHE_OPTIONAL = ${JSON.stringify(OPTIONAL)};
self.__GRAVITAS_PRECACHE = ${JSON.stringify([...CORE, ...OPTIONAL])};
self.__GRAVITAS_LOCALE_WARM = {};
`;
}

/**
 * A site whose contents the test owns.
 *
 * `serve` decides what every request gets, so a build can be swapped between
 * one navigation and the next, and one path can be made to fail without
 * touching the others.
 */
async function site() {
  const dir = join(
    tmpdir(),
    `gravitas-sw-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  await mkdir(join(dir, 'images', 'scenarios'), { recursive: true });
  const swSource = await readFile(join(ROOT, 'sw.js'), 'utf8');
  const offlineSource = await readFile(join(ROOT, 'js', 'offline.js'), 'utf8');

  let files = build('A');
  let broken = new Set();

  const write = async () => {
    for (const [path, body] of Object.entries(files)) {
      await writeFile(join(dir, path), body);
    }
    await writeFile(join(dir, 'offline.js'), offlineSource);
    await writeFile(join(dir, 'sw.js'), swSource);
    await writeFile(
      join(dir, 'sw-manifest.js'),
      manifest(files, offlineSource)
    );
  };
  await write();

  const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.webp': 'image/webp',
  };

  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const rel = path === '/' ? '/index.html' : path;
    if (broken.has(rel)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('gone');
      return;
    }
    try {
      const body = await readFile(join(dir, rel.slice(1)));
      const ext = rel.slice(rel.lastIndexOf('.'));
      res.writeHead(200, {
        'content-type': TYPES[ext] || 'application/octet-stream',
        // A worker update is decided by bytes, not by a browser cache.
        'cache-control': 'no-cache, no-store, must-revalidate',
      });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('missing');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;

  return {
    origin,
    /** Swap every file to another build, and regenerate the manifest. */
    async release(letter) {
      files = build(letter);
      await write();
    },
    /** Make one path 404 for every later request. */
    breakPath(rel) {
      broken.add(rel);
    },
    async close() {
      await new Promise(resolve => server.close(resolve));
      await rm(dir, { recursive: true, force: true });
    },
  };
}

/** Wait until a worker is controlling and has finished precaching. */
async function activated(page) {
  await page.waitForFunction(
    () => navigator.serviceWorker.controller !== null,
    null,
    { timeout: 30_000 }
  );
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const status = await window.__offline?.cacheStatus(2000);
          return status?.coreComplete === true;
        }),
      { timeout: 30_000 }
    )
    .toBe(true);
}

/** What revision the page is actually made of, shell and module separately. */
const revision = page =>
  page.evaluate(() => ({
    shell: document
      .querySelector('meta[name="gravitas-revision"]')
      ?.getAttribute('content'),
    module: window.__moduleLetter ?? null,
    version: null,
  }));

/** The version string the controlling worker reports. */
const workerVersion = page =>
  page.evaluate(async () => {
    const status = await window.__offline?.cacheStatus(2000);
    return status?.version ?? null;
  });

test.describe('a returning browser never mixes two revisions', () => {
  test('version A installs, activates and serves a coherent A', async ({
    page,
  }) => {
    const fixture = await site();
    try {
      await page.goto(fixture.origin);
      await activated(page);
      await page.reload();
      await activated(page);
      expect(await revision(page)).toMatchObject({ shell: 'A', module: 'A' });
    } finally {
      await fixture.close();
    }
  });

  test('a waiting B leaves A whole, and a reload cannot mix them', async ({
    page,
    context,
  }) => {
    const fixture = await site();
    try {
      await page.goto(fixture.origin);
      await activated(page);
      const versionA = await workerVersion(page);

      // A second tab, because a classroom has several and the swap has to be
      // safe in all of them.
      const second = await context.newPage();
      await second.goto(fixture.origin);
      await activated(second);

      await fixture.release('B');
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg.update();
      });

      // B installs and waits. The badge says so, without taking focus.
      await expect
        .poll(() => page.evaluate(() => window.__offline?.updateReady?.()), {
          timeout: 30_000,
        })
        .toBe(true);
      await expect(page.locator('#updateBadge')).toBeVisible();
      expect(
        await page.evaluate(() => document.activeElement?.id || 'body')
      ).not.toBe('updateBadgeApply');

      // The whole point. A reload while B waits must produce A everywhere -
      // this is the exact sequence that used to serve a B shell with A modules.
      await page.reload();
      await activated(page);
      const after = await revision(page);
      expect(after.shell, 'the shell is still A').toBe('A');
      expect(after.module, 'and so are the modules').toBe('A');
      expect(await workerVersion(page)).toBe(versionA);

      // Offline, the same answer.
      await context.setOffline(true);
      await page.reload();
      await activated(page);
      expect(await revision(page)).toMatchObject({ shell: 'A', module: 'A' });
      await context.setOffline(false);

      await second.close();
    } finally {
      await fixture.close();
    }
  });

  test('postponing keeps A, and accepting gives a coherent B in every tab', async ({
    page,
    context,
  }) => {
    const fixture = await site();
    try {
      await page.goto(fixture.origin);
      await activated(page);
      const versionA = await workerVersion(page);

      const second = await context.newPage();
      await second.goto(fixture.origin);
      await activated(second);

      await fixture.release('B');
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg.update();
      });
      await expect
        .poll(() => page.evaluate(() => window.__offline?.updateReady?.()), {
          timeout: 30_000,
        })
        .toBe(true);

      // Not now: the message goes, the update does not, and A keeps running.
      await page.locator('#updateBadgeDismiss').click();
      await expect(page.locator('#updateBadge')).toBeHidden();
      expect(await revision(page)).toMatchObject({ shell: 'A', module: 'A' });
      expect(
        await page.evaluate(() => window.__offline?.updateReady?.()),
        'the update is still there, just not being announced'
      ).toBe(true);

      // Anything holding unsaved state is told before the page goes. Lesson
      // progress is already written on every answer - e2e/lessonRecovery.spec.js
      // covers a reading surviving a full reload, which is what this is - but
      // the hook has to exist and fire, or that guarantee rests on luck.
      await page.evaluate(() => {
        window.__beforeUpdate = 0;
        window.addEventListener('gravitasBeforeUpdate', () => {
          window.__beforeUpdate++;
          window.sessionStorage.setItem('fixture-state', 'kept');
        });
      });

      // Now accept it. Both tabs are controlled by the worker that is about to
      // be replaced, so both must come back as B.
      await Promise.all([
        page.waitForEvent('load', { timeout: 60_000 }),
        second.waitForEvent('load', { timeout: 60_000 }),
        page.evaluate(() => window.__offline.applyUpdate()),
      ]);

      await activated(page);
      await activated(second);
      expect(await revision(page)).toMatchObject({ shell: 'B', module: 'B' });
      expect(await revision(second)).toMatchObject({ shell: 'B', module: 'B' });
      const versionB = await workerVersion(page);
      expect(versionB).not.toBe(versionA);
      expect(await workerVersion(second)).toBe(versionB);

      // The flush ran before the reload, and what it wrote is still there on
      // the other side of the version change.
      expect(
        await page.evaluate(() =>
          window.sessionStorage.getItem('fixture-state')
        ),
        'state written before the update survived it'
      ).toBe('kept');

      await second.close();
    } finally {
      await fixture.close();
    }
  });

  test('a missing core file stops the new version activating @covers:sw.core', async ({
    page,
  }) => {
    const fixture = await site();
    try {
      await page.goto(fixture.origin);
      await activated(page);
      const versionA = await workerVersion(page);

      // B is published, but one of its modules will not serve.
      await fixture.release('B');
      fixture.breakPath('/app.js');
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg.update().catch(() => {});
      });

      // Nothing waits, because nothing installed. Half of B is not a version.
      await page.waitForTimeout(4000);
      expect(
        await page.evaluate(() => window.__offline?.updateReady?.()),
        'a version missing a module never becomes available'
      ).toBe(false);

      // And the reader is still on a whole A, online and offline.
      await page.reload();
      await activated(page);
      expect(await revision(page)).toMatchObject({ shell: 'A', module: 'A' });
      expect(await workerVersion(page)).toBe(versionA);
    } finally {
      await fixture.close();
    }
  });

  test('a missing thumbnail costs the picture, not the version @covers:sw.optional', async ({
    page,
    errors,
  }) => {
    const fixture = await site();
    try {
      await page.goto(fixture.origin);
      await activated(page);
      const versionA = await workerVersion(page);

      // Which resource failed has to come off the network: the console message
      // for a 404 does not name the URL, so filtering the console alone could
      // not tell this test's deliberate failure from somebody else's.
      const notFound = [];
      page.on('response', r => {
        if (r.status() === 404) notFound.push(new URL(r.url()).pathname);
      });

      await fixture.release('B');
      fixture.breakPath('/images/scenarios/one.webp');
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg.update();
      });

      await expect
        .poll(() => page.evaluate(() => window.__offline?.updateReady?.()), {
          timeout: 30_000,
        })
        .toBe(true);

      await Promise.all([
        page.waitForEvent('load', { timeout: 60_000 }),
        page.evaluate(() => window.__offline.applyUpdate()),
      ]);
      await activated(page);

      expect(await revision(page)).toMatchObject({ shell: 'B', module: 'B' });
      expect(await workerVersion(page)).not.toBe(versionA);
      // The application is complete; the picture is the only casualty and the
      // worker said so rather than swallowing it.
      const status = await page.evaluate(() =>
        window.__offline.cacheStatus(2000)
      );
      expect(status.coreComplete).toBe(true);
      expect(status.cachedCount).toBeLessThan(status.precacheCount);

      // The missing picture is the point of this test, and the browser logs a
      // 404 for it. Assert that it really happened, then take it out of the
      // collection the suite-wide "no console errors" check reads - so that
      // check keeps its teeth for everything this test did not ask to break.
      expect(
        notFound,
        'the thumbnail, and only the thumbnail, failed to load'
      ).toEqual(['/images/scenarios/one.webp']);
      const generic404 = /Failed to load resource.*404/;
      expect(
        errors.consoleErrors.every(t => generic404.test(t)),
        `only the 404 was logged: ${errors.consoleErrors.join(' | ')}`
      ).toBe(true);
      errors.consoleErrors = [];
    } finally {
      await fixture.close();
    }
  });
});
