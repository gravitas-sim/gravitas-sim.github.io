// =============================================================================
// The first sketch stays as it was
// -----------------------------------------------------------------------------
// history/original/index.html is the first Gravitas: the single file that
// commit a5d08fc put online in July 2025. It is served at /history/original/
// as a working page, and the one way in is a single unexplained word, "origin",
// at the end of /model/'s footer.
//
// It is an archive, not a page to maintain. Its old bugs, its Google Fonts
// import and its styling are the point, so nothing may modernize it - not a
// formatter sweep, not a find-and-replace across *.html, not a build step.
//
// One change was made on purpose, and only one: the two lines that wired Save
// State and Load State to their handlers are gone. The page is here to show
// what Gravitas looked like, not to keep saves, and those two handlers wrote
// to the same localStorage key today's application reads its own save from.
// The buttons are still drawn and do nothing. The first test proves that is
// the whole difference - put the two lines back and the result is the blob
// a5d08fc recorded - and pins the file as served, so a change of one more
// byte fails it. The right response to that failure is to restore the file,
// not to update the hash.
//
// The rest keep it out of the way. The deploy stamps no revision into it, the
// service worker does not precache it, and nothing the application loads at
// start-up refers to it, so a visitor pays for its 66 KB only by following
// the link. e2e/historyOriginal.spec.js walks that link in a browser, against
// both the sources and dist/.
// =============================================================================

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = 'history/original/index.html';
const HREF = '/history/original/';

/** The commit that added the original, and the blob it recorded. */
const SOURCE_COMMIT = 'a5d08fc72cae60762765977f419225fb40e6c400';
const SOURCE_BLOB = 'fe77fdc0afc47d0d3f24e93a690043bb4dee950e';

/** The file as served: the original without the two lines below. */
const SERVED_BLOB = '959822c4e570db8317f00072b26121c4f2568d46';
const UNWIRED = [
  "    document.getElementById('saveBtn').onclick = save_simulation_state;\n",
  "    document.getElementById('loadBtn').onclick = load_simulation_state;\n",
].join('');
/** The line they followed, and still follow in a5d08fc. */
const BEFORE_UNWIRED = "    document.getElementById('resetAllBtn').onclick";

const read = f => readFileSync(path.join(REPO, f), 'utf8');

/**
 * The id git gives a file's contents: SHA-1 over a "blob <size>\0" header and
 * the bytes. Computed rather than asked of git, so the check holds in a
 * tarball or a shallow clone that has never seen a5d08fc.
 *
 * @param {Buffer} bytes - File contents
 * @returns {string} Hex object id
 */
function blobId(bytes) {
  return createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');
}

/** A string array out of build.js, which cannot be imported (see docPages). */
function buildList(name) {
  const text = read('build.js');
  const start = text.indexOf(`const ${name} = [`);
  expect(start).toBeGreaterThan(-1);
  const body = text.slice(start, text.indexOf('];', start));
  return [...body.matchAll(/'([^']+)'/g)].map(m => m[1]);
}

describe('the first sketch is kept as it was', () => {
  test(`it is the index.html of ${SOURCE_COMMIT.slice(0, 7)} without its Save and Load wiring, and nothing else`, () => {
    const bytes = readFileSync(path.join(REPO, PAGE));
    expect(bytes.length).toBe(67184);
    expect(blobId(bytes)).toBe(SERVED_BLOB);

    // The two lines go back after the line they followed, and what comes out
    // is the original, byte for byte.
    const text = bytes.toString('latin1');
    expect(text).not.toContain(UNWIRED);
    const at = text.indexOf(BEFORE_UNWIRED);
    expect(at).toBeGreaterThan(-1);
    const after = text.indexOf('\n', at) + 1;
    const restored = Buffer.from(
      text.slice(0, after) + UNWIRED + text.slice(after),
      'latin1'
    );
    expect(restored.length).toBe(67328);
    expect(blobId(restored)).toBe(SOURCE_BLOB);

    // Which leaves two buttons with nothing behind them: still drawn, never
    // wired, and the only code that touches storage unreachable.
    expect(text).toContain(
      '<button id="saveBtn" class="ui-button">Save State</button>'
    );
    expect(text).toContain(
      '<button id="loadBtn" class="ui-button">Load State</button>'
    );
    expect(text.match(/getElementById\('(save|load)Btn'\)/g)).toBeNull();
    for (const handler of ['save_simulation_state', 'load_simulation_state']) {
      expect(text.split(handler).length - 1).toBe(1);
    }
  });

  test('the build copies it rather than processing it', () => {
    // DOC_PAGES rewrite their stylesheet links on the way into dist/.
    expect(buildList('ARCHIVAL_PAGES')).toContain('history/original');
    expect(buildList('DOC_PAGES')).not.toContain('history/original');
  });

  test('the deploy does not stamp it', async () => {
    // Everything but these is published exactly as committed.
    const { STAMPED_PAGES, ALLOWED_CHANGES } =
      await import('../tools/prepare-pages.mjs');
    expect(STAMPED_PAGES).not.toContain(PAGE);
    expect(ALLOWED_CHANGES).not.toContain(PAGE);
  });
});

describe('the first sketch is fetched only by following its link', () => {
  test('the service worker does not precache it', async () => {
    const { buildManifest } = await import('../tools/build-service-worker.mjs');
    const { paths } = await buildManifest();
    expect(paths.filter(p => p.startsWith('history/'))).toEqual([]);
    expect(read('sw-manifest.js')).not.toContain('history/');
  });

  test('nothing the application loads refers to it', () => {
    // index.html and every module under js/: the shell, the start-up bundle
    // and every chunk it can split into.
    const walk = dir =>
      readdirSync(path.join(REPO, dir), { withFileTypes: true }).flatMap(e =>
        e.isDirectory()
          ? walk(`${dir}/${e.name}`)
          : e.name.endsWith('.js')
            ? [`${dir}/${e.name}`]
            : []
      );
    const referring = ['index.html', ...walk('js')].filter(f =>
      read(f).includes('history/original')
    );
    expect(referring).toEqual([]);
  });

  test('the sitemap leaves it for readers to find', () => {
    expect(read('sitemap.xml')).not.toContain('history/');
  });
});

describe('one quiet link reaches it, the last word of /model/', () => {
  const html = read('model/index.html');
  const footer = html.slice(
    html.indexOf('<footer class="gs-foot">'),
    html.indexOf('</footer>')
  );

  test('the model page links it once, at the end of its footer', () => {
    const at = html.indexOf(`href="${HREF}"`);
    expect(at).toBeGreaterThan(-1);
    expect(html.indexOf(`href="${HREF}"`, at + 1)).toBe(-1);

    // Not in the document's text, where a sentence would have to explain it,
    // and not in the header's navigation: the last item of the footer row,
    // after the license, with nothing following it.
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    expect(main).not.toContain(HREF);
    expect(footer).toContain(`href="${HREF}"`);
    expect(footer.slice(footer.indexOf(`href="${HREF}"`))).not.toMatch(
      /<a\b|<span\b/
    );
  });

  test('it is an ordinary link: one word, focusable and unstyled', () => {
    const tag = footer.match(/<a\b[^>]*href="\/history\/original\/"[^>]*>/)[0];
    // No class, tabindex, target or aria override: it reads, focuses and
    // behaves like the footer links beside it, and says nothing about where
    // it goes.
    expect(tag).toBe(`<a href="${HREF}">`);
    const name = footer
      .slice(footer.indexOf(tag) + tag.length)
      .match(/^([^<]*)<\/a>/)[1]
      .trim();
    expect(name).toBe('origin');
  });

  test('no other page links it', () => {
    const others = [
      'index.html',
      ...buildList('DOC_PAGES')
        .filter(d => d !== 'model')
        .map(d => `${d}/index.html`),
    ];
    expect(others.filter(page => read(page).includes(HREF))).toEqual([]);
  });
});
