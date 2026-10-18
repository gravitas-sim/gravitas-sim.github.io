// =============================================================================
// What the service worker precaches, measured
// -----------------------------------------------------------------------------
// Read from the committed sw-manifest.js, the list a browser actually installs,
// and from the files it names: how many, of which kinds, and how large, raw
// and as gzip at level 6 (what a typical server sends). OFFLINE_AND_LOW_END.md
// quotes these through tools/docs-facts.mjs, because the table it had typed
// said 190 files long after the manifest listed 601.
// =============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { idleGroupOf } from './build-service-worker.mjs';

/** The arrays sw-manifest.js assigns, by name. */
function arrays(text) {
  const out = {};
  for (const m of text.matchAll(
    /self\.__GRAVITAS_PRECACHE_(\w+) = \[([\s\S]*?)\];/g
  ))
    out[m[1]] = [...m[2].matchAll(/'\.\/([^']+)'/g)].map(x => x[1]);
  const warm = /self\.__GRAVITAS_LOCALE_WARM = (\{[\s\S]*?\});/.exec(text);
  const localeWarm = {};
  if (warm)
    for (const m of warm[1].matchAll(/['"]?(\w+)['"]?:\s*\[([\s\S]*?)\]/g))
      localeWarm[m[1]] = [...m[2].matchAll(/'\.\/([^']+)'/g)].length;
  return { ...out, localeWarm };
}

const KINDS = [
  ['JavaScript', /\.m?js$/],
  ['Images', /\.(webp|png|jpe?g|svg|ico|gif)$/],
  ['Stylesheets', /\.css$/],
  ['Fonts', /\.(woff2?|ttf|otf)$/],
  // The panels' markup, which each family fetches as it mounts
  // (INDEX_DECOMPOSITION.md): HTML, but not a page anyone opens.
  ['Panel markup', /(^|\/)js\/fragments\/[^/]+\.html$/],
  ['Pages', /\.html$/],
];

/**
 * @param {string} root - The repository
 * @returns {{files: number, core: number, optional: number, bytes: number,
 *   gzip: number, kinds: Array<{kind: string, files: number, bytes: number, gzip: number}>,
 *   localeWarm: Record<string, number>}}
 */
export function precacheInventory(root) {
  const text = readFileSync(path.join(root, 'sw-manifest.js'), 'utf8');
  const a = arrays(text);
  const core = a.CORE || [];
  const optional = a.OPTIONAL || [];
  const idle = a.IDLE || [];
  const all = [...core, ...optional, ...idle];
  const kinds = [
    ...KINDS.map(([kind]) => ({ kind, files: 0, bytes: 0, gzip: 0 })),
    { kind: 'Other', files: 0, bytes: 0, gzip: 0 },
  ];
  let bytes = 0;
  let gzip = 0;
  for (const rel of all) {
    const file = path.join(root, rel);
    const size = statSync(file).size;
    const z = gzipSync(readFileSync(file), { level: 6 }).length;
    const i = KINDS.findIndex(([, re]) => re.test(rel));
    const k = kinds[i < 0 ? kinds.length - 1 : i];
    k.files++;
    k.bytes += size;
    k.gzip += z;
    bytes += size;
    gzip += z;
  }
  const idleGroups = {};
  for (const rel of idle) {
    const g = (idleGroups[idleGroupOf(rel) ?? 'Other'] ??= {
      files: 0,
      gzip: 0,
    });
    g.files++;
    g.gzip += gzipSync(readFileSync(path.join(root, rel)), { level: 6 }).length;
  }
  return {
    files: all.length,
    idleGroups,
    core: core.length,
    optional: optional.length,
    idle: idle.length,
    bytes,
    gzip,
    kinds: kinds.filter(k => k.files > 0),
    localeWarm: a.localeWarm,
  };
}

// Tenths of a megabyte, or tens of kilobytes under one, so the document moves
// when the precache does and not every time a precached file gains a line.
const mb = n =>
  n >= 1048576
    ? `${(n / 1048576).toFixed(1)} MB`
    : `${Math.max(10, Math.round(n / 10240) * 10)} KB`;

/**
 * The gzip total in whole megabytes. Gzip's output differs by a few kilobytes
 * between zlib versions - Node 20's and Node 24's disagreed at the tenth - so
 * a checked document quotes it only this coarsely, and never per kind. It is
 * the whole megabytes the transfer exceeds (a floor, quoted as "more than"):
 * a rounded figure flips between the two Nodes whenever the total sits near a
 * half megabyte, which is where it was when this was changed, and a floor only
 * flips near a whole one.
 */
export const gzipMB = inv => Math.floor(inv.gzip / 1048576);

/** The table OFFLINE_AND_LOW_END.md shows, and the transfer times from its gzip total. */
export function precacheTable(inv) {
  const rows = inv.kinds.map(
    k => `| ${k.kind} | ${k.files} | ${mb(k.bytes)} |`
  );
  const secs = mbps => Math.round((gzipMB(inv) * 1048576 * 8) / (mbps * 1e6));
  return [
    '',
    '| | Files | Raw |',
    '| --- | ---: | ---: |',
    ...rows,
    `| **Total** | **${inv.files}** | **${mb(inv.bytes)}** |`,
    '',
    `Of those, ${inv.core} are core (the install fails without them), ${inv.optional} optional (installed with them; a missing one is reported and costs nothing) and ${inv.idle} idle (installed after activation, when the browser is idle; a missing one costs that page its offline copy and is fetched again on the next open). The first-visit install is the core and the optional files: ${inv.core + inv.optional} files.`,
    '',
    `Gzipped, as Pages serves it, the whole is about ${gzipMB(inv)} MB.`,
    '',
    '| Link | Precache transfer |',
    '| --- | --- |',
    `| 10 Mbps | ~${secs(10)} s |`,
    `| 3 Mbps | ~${secs(3)} s |`,
    `| 1.5 Mbps | ~${secs(1.5)} s |`,
    '',
  ].join('\n');
}

/**
 * What each page promises offline, from the manifest's tiers and the
 * capability packages' declarations (Prompt 147). A page that needs a file
 * which is not in the first-visit install says when it is available.
 * @param {string} root - The repository
 * @param {ReturnType<typeof precacheInventory>} inv - The inventory
 * @returns {string} Markdown, for a fact block
 */
export function promisesTable(root, inv) {
  const dir = path.join(root, 'capabilities');
  const rows = readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => JSON.parse(readFileSync(path.join(dir, f), 'utf8')))
    .map(m => {
      const by = {};
      for (const a of m.assets || []) by[a.offline] = (by[a.offline] || 0) + 1;
      const n = k => by[k] || 0;
      const when = n('idle')
        ? `after the first visit settles (${n('idle')} idle files)`
        : n('core') + n('optional')
          ? 'from the first visit'
          : 'in the application itself';
      return `| \`${m.id}\` | ${m.title.en} | ${n('core')} | ${n('optional')} | ${n('idle')} | ${when} |`;
    });
  const groups = Object.entries(inv.idleGroups).map(
    ([g, v]) => `| ${g} | ${v.files} | ${Math.round(v.gzip / 1024)} KB |`
  );
  return [
    '',
    '| Package | What it provides | Core | Optional | Idle | Works offline |',
    '| --- | --- | ---: | ---: | ---: | --- |',
    ...rows,
    '',
    'The idle tier, by surface (gzip level 6):',
    '',
    '| Surface | Files | Gzip |',
    '| --- | ---: | ---: |',
    ...groups,
    '',
  ].join('\n');
}
