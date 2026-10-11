// U2: which pages can reach the module, by the import graph. The module would
// live at js/composer/assist.js and be imported dynamically by js/composerPage.js
// and by nothing else, so a page can load it exactly when its graph (static and
// dynamic imports) reaches js/composerPage.js. Writes results-tree.json.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const files = execFileSync('git', ['ls-files', '*.html'], { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .filter(f => !f.startsWith('history/'));
const IMP =
  /(?:import|export)\s*(?:[^'"();]*?\sfrom\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
const DYN = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
const cache = new Map();
const deps = file => {
  if (cache.has(file)) return cache.get(file);
  let out = [];
  if (existsSync(file)) {
    const src = readFileSync(file, 'utf8');
    const dyn = new Set([...src.matchAll(DYN)].map(m => m[1]));
    for (const m of src.matchAll(IMP)) {
      const spec = m[1] || m[2];
      if (!spec || !spec.startsWith('.')) continue;
      out.push({
        to: path.posix.normalize(
          path.posix.join(path.posix.dirname(file), spec)
        ),
        dynamic: dyn.has(spec) && !m[1],
      });
    }
  }
  cache.set(file, out);
  return out;
};
const reach = entries => {
  const seen = new Set();
  const stack = [...entries];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    for (const d of deps(f)) stack.push(d.to);
  }
  return seen;
};
const entriesOf = html => {
  const dir = path.posix.dirname(html);
  const src = readFileSync(html, 'utf8');
  return [...src.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)]
    .map(m => m[1])
    .filter(s => !/^https?:/.test(s))
    .map(s =>
      path.posix.normalize(
        s.startsWith('/') ? s.slice(1) : path.posix.join(dir, s)
      )
    );
};
const TARGET = 'js/composerPage.js';
const rows = files.map(f => ({
  page: f,
  reaches: reach(entriesOf(f)).has(TARGET),
}));
const reaching = rows.filter(r => r.reaches).map(r => r.page);
const importers = [
  ...new Set(
    execFileSync('git', ['grep', '-l', '-E', 'composerPage\\.js'], {
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean)
  ),
];
const result = {
  pagesChecked: rows.length,
  pagesThatCanReachTheModule: reaching,
  everyReachingPageIsStudio: reaching.every(p => p.startsWith('studio/')),
  filesNamingComposerPage: importers.filter(
    f => f.startsWith('js/') || f.endsWith('.html')
  ),
};
writeFileSync(
  new URL('./results-tree.json', import.meta.url),
  JSON.stringify(result, null, 2) + '\n'
);
console.log(JSON.stringify(result, null, 2));
