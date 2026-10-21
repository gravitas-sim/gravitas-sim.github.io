#!/usr/bin/env node
// =============================================================================
// Is every translation still a translation of the English it stands beside?
// -----------------------------------------------------------------------------
//   node tools/i18n-freshness.mjs                 check, and say what is stale
//   node tools/i18n-freshness.mjs --write         stamp new and edited
//                                                 translations, date new stale
//   node tools/i18n-freshness.mjs --confirm KEY…  the English changed and the
//                                                 translation is still right
//   node tools/i18n-freshness.mjs --json          the report as data
//   --fail-on-age                                 also fail on a recorded entry
//                                                 stale past the grace period
//                                                 (a manual or release-time
//                                                 command, never required CI)
//   --ledger DIR and --today YYYY-MM-DD           for tests: another ledger,
//                                                 and what day it is
//
// `npm run i18n:check` runs this beside the id audit, so the gate asks it.
//
// The ledger is tools/i18n-freshness/<source>.json; tools/i18n-ledger.mjs says
// what a row is and why `--write` cannot launder a stale entry; the sources are
// read by tools/i18n-sources.mjs. Packs carry their own digest (`esOf`) and are
// only reported here. TRANSLATION.md is the contract and the workflow.
//
// KEY may end in `*` to mean every key that starts with what comes before it
// (`--confirm 'catalog:es/lib.*'`). A confirmation is a diff in the ledger that
// a reviewer reads, which is why it is a command and not a default.
// =============================================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GRACE_DAYS,
  LEDGER_FORMAT,
  daysBetween,
  drift,
  evaluate,
  isoDate,
  plan,
} from './i18n-ledger.mjs';
import { allRows, packTexts } from './i18n-sources.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LEDGER_DIR = path.join(ROOT, 'tools', 'i18n-freshness');

/** The file a source's ledger lives in: `catalog:es` is `catalog-es.json`. */
export const ledgerFile = (source, dir = LEDGER_DIR) =>
  path.join(dir, `${source.replace(':', '-')}.json`);

/** One source's ledger rows, or none when it has no file yet. */
export function readLedger(source, dir = LEDGER_DIR) {
  const file = ledgerFile(source, dir);
  if (!existsSync(file)) return { rows: {}, baseline: null };
  const doc = JSON.parse(readFileSync(file, 'utf8'));
  return { rows: doc.rows ?? {}, baseline: doc.baseline ?? null };
}

/** The text of one source's ledger file. */
export function ledgerText(source, rows, baseline) {
  return `${JSON.stringify({ format: LEDGER_FORMAT, source, baseline, rows }, null, 2)}\n`;
}

const BASELINE_NOTE =
  'Every translation present on this date was taken as written against the English it stood beside. That records no review.';

/**
 * Judge every source against its ledger.
 *
 * @param {object} [options] - What to read
 * @param {string} [options.today] - ISO date
 * @param {string} [options.dir] - Ledger directory
 * @param {{sources: Map, missing: object}} [options.current] - Rows, if already read
 * @param {string[]} [options.confirm] - Keys (`source/key`, `*` suffix allowed) to re-stamp
 * @returns {Promise<{today: string, sources: object[], problems: string[], writes: Map<string,string>, packs: object, missing: object}>}
 */
export async function freshness({
  today = process.env.GRAVITAS_I18N_TODAY ?? isoDate(),
  dir = process.env.GRAVITAS_I18N_LEDGER_DIR ?? LEDGER_DIR,
  current,
  confirm = [],
  packs: shipped,
  failOnAge = false,
} = {}) {
  const { sources, missing } = current ?? (await allRows());
  const report = {
    today,
    dir,
    sources: [],
    problems: [],
    writes: new Map(),
    missing,
    current: sources,
  };
  for (const [name, rows] of sources) {
    const { rows: ledger, baseline } = readLedger(name, dir);
    const wanted = confirm
      .filter(c => c.startsWith(`${name}/`))
      .map(c => c.slice(name.length + 1));
    const keys = rows
      .map(r => r.key)
      .filter(k =>
        wanted.some(w =>
          w.endsWith('*') ? k.startsWith(w.slice(0, -1)) : k === w
        )
      );
    const state = evaluate(rows, ledger, today);
    const planned = plan(rows, ledger, today, keys);
    const off = drift(ledger, planned);
    report.sources.push({
      name,
      entries: rows.length,
      state,
      drift: off,
      confirmed: keys.length,
    });
    report.writes.set(
      name,
      ledgerText(
        name,
        planned,
        baseline ?? { date: today, note: BASELINE_NOTE }
      )
    );
    if (state.bad.length)
      report.problems.push(
        `${name}: ${state.bad.length} ledger rows are not in the row format`
      );
    // Age alone never fails the check CI runs: a commit that was green must not
    // turn red because a calendar moved. Only the explicit flag does.
    if (failOnAge && state.expired.length)
      report.problems.push(
        `${name}: ${state.expired.length} entries have been stale for more than ${GRACE_DAYS} days`
      );
    if (off.length)
      report.problems.push(
        `${name}: the ledger is not what \`node tools/i18n-freshness.mjs --write\` would leave (${off.length} rows: ` +
          `${state.unrecorded.length} new or retranslated, ${state.orphan.length} removed, ${off.length - state.unrecorded.length - state.orphan.length} newly stale)`
      );
  }
  const packs = shipped ?? (await packTexts());
  report.packs = {};
  for (const p of packs)
    report.packs[p.state] = (report.packs[p.state] ?? 0) + 1;
  report.packList = packs.filter(p => p.state === 'stale');
  if (report.packs.undated)
    report.problems.push(
      `${report.packs.undated} pack texts have a Spanish text and no esOf (the digest the composer and the course builder write)`
    );
  if (report.packList.length)
    report.problems.push(
      `${report.packList.length} pack texts are stale (their esOf is not the digest of their English)`
    );
  return report;
}

/** Print the report; returns the lines. */
export function render(report, { limit = 12 } = {}) {
  const out = [];
  out.push(
    `Translation freshness (grace ${GRACE_DAYS} days, today ${report.today})`
  );
  for (const s of report.sources) {
    const { state: st } = s;
    out.push(
      `  ${s.name.padEnd(12)} ${String(s.entries).padStart(5)} entries: ${st.fresh.length} fresh, ${st.stale.length} stale in grace, ` +
        `${st.expired.length} recorded stale past grace, ${st.unrecorded.length} to stamp, ${st.orphan.length} removed`
    );
    for (const item of [...st.expired, ...st.stale].slice(0, limit))
      out.push(
        `      stale ${item.key}${item.sample.where ? ` [${item.sample.where}]` : ''}${item.since ? ` since ${item.since} (${daysBetween(item.since, report.today)} d)` : ' (not recorded)'}: ` +
          `${String(item.sample.en).slice(0, 60)}`
      );
    for (const key of st.unrecorded.slice(0, 3))
      out.push(`      to stamp ${key}`);
  }
  const p = report.packs;
  out.push(
    `  packs        ${Object.values(p).reduce((a, b) => a + b, 0)} texts: ${p.fresh ?? 0} fresh, ${p.stale ?? 0} stale, ` +
      `${p.undated ?? 0} undated, ${p['no-field'] ?? 0} in a format with no digest field (a /1 course pack), ${p.missing ?? 0} not yet translated`
  );
  for (const [locale, keys] of Object.entries(report.missing))
    out.push(
      `  catalog ${locale}: ${keys.length} English entries with no translation`
    );
  return out;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  const take = flag => {
    const i = args.indexOf(flag);
    return i < 0 ? null : args[i + 1];
  };
  const confirm = [];
  const ci = args.indexOf('--confirm');
  if (ci >= 0)
    for (const a of args.slice(ci + 1))
      if (!a.startsWith('--')) confirm.push(a);
  if (confirm.length && !args.includes('--write')) {
    console.error('--confirm re-stamps the ledger: use it with --write');
    process.exit(2);
  }
  const dir = take('--ledger') ? path.resolve(take('--ledger')) : undefined;
  const failOnAge = args.includes('--fail-on-age');
  const report = await freshness({
    today: take('--today') ?? undefined,
    dir,
    confirm,
    failOnAge,
  });
  if (args.includes('--write')) {
    mkdirSync(report.dir, { recursive: true });
    for (const [name, text] of report.writes) {
      const file = ledgerFile(name, report.dir);
      if (!existsSync(file) || readFileSync(file, 'utf8') !== text) {
        writeFileSync(file, text);
        console.log(`wrote ${path.relative(ROOT, file)}`);
      }
    }
    const again = await freshness({ today: report.today, dir, failOnAge });
    console.log(render(again).join('\n'));
    process.exit(again.problems.length ? 1 : 0);
  }
  if (args.includes('--json')) {
    console.log(
      JSON.stringify(
        {
          today: report.today,
          problems: report.problems,
          packs: report.packs,
          sources: report.sources.map(s => ({
            name: s.name,
            entries: s.entries,
            ...Object.fromEntries(
              Object.entries(s.state).map(([k, v]) => [k, v.length])
            ),
          })),
        },
        null,
        2
      )
    );
    process.exit(report.problems.length ? 1 : 0);
  }
  console.log(render(report).join('\n'));
  if (report.problems.length) {
    console.log('\nFAILED');
    for (const p of report.problems) console.log(`  ${p}`);
    console.log(
      '\nSee TRANSLATION.md: translate the entry, or confirm the English change did not alter the meaning.'
    );
  }
  process.exit(report.problems.length ? 1 : 0);
}
