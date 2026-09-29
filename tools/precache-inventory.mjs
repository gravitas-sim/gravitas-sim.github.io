// =============================================================================
// What the service worker precaches, measured
// -----------------------------------------------------------------------------
// Read from the committed sw-manifest.js, the list a browser actually installs,
// and from the files it names: how many, of which kinds, and how large, raw
// and as gzip at level 6 (what a typical server sends). OFFLINE_AND_LOW_END.md
// quotes these through tools/docs-facts.mjs, because the table it had typed
// said 190 files long after the manifest listed 601.
// =============================================================================

import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

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
  const all = [...core, ...optional];
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
  return {
    files: all.length,
    core: core.length,
    optional: optional.length,
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

/** The table OFFLINE_AND_LOW_END.md shows, and the transfer times from its gzip total. */
export function precacheTable(inv) {
  const rows = inv.kinds.map(
    k => `| ${k.kind} | ${k.files} | ${mb(k.bytes)} | ${mb(k.gzip)} |`
  );
  const secs = mbps => Math.round((inv.gzip * 8) / (mbps * 1e6));
  return [
    '',
    '| | Files | Raw | Gzipped |',
    '| --- | ---: | ---: | ---: |',
    ...rows,
    `| **Total** | **${inv.files}** | **${mb(inv.bytes)}** | **${mb(inv.gzip)}** |`,
    '',
    `Of those, ${inv.core} are core (the install fails without them) and ${inv.optional} optional (a missing one is reported and costs nothing).`,
    '',
    '| Link | Precache transfer |',
    '| --- | --- |',
    `| 10 Mbps | ~${secs(10)} s |`,
    `| 3 Mbps | ~${secs(3)} s |`,
    `| 1.5 Mbps | ~${secs(1.5)} s |`,
    '',
  ].join('\n');
}
