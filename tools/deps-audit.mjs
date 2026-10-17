#!/usr/bin/env node
// =============================================================================
// The dependency audit
// -----------------------------------------------------------------------------
// Two halves, the same two CI has always run:
//
//   every dependency   no advisory at moderate or above, except the ones named
//                      in tools/deps-audit-exceptions.json, each with its
//                      basis and an expiry date; an expired one fails loudly.
//   production only    `npm audit --omit=dev`, with no exceptions at all.
//
// Why an exception list at all: `npm audit` has none, and an advisory with no
// patched release cannot be cleared by a lockfile change. Without the list, one
// such advisory under a dev-only tool turns every branch red until upstream
// ships, and a red audit step skips the documentation checks after it. With
// it, the advisory is named, its reason is recorded here, and any other
// advisory still fails the step.
//
// An entry is removed as soon as a patched release exists and the lockfile can
// move to it. The script says so when an ignored advisory is no longer
// reported at all.
// =============================================================================

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EXCEPTIONS = JSON.parse(
  readFileSync(new URL('./deps-audit-exceptions.json', import.meta.url), 'utf8')
).exceptions;

/** Advisories the full-tree audit passes over, keyed by GHSA id, with why. */
export const IGNORED = new Map(EXCEPTIONS.map(e => [e.id, e.reason]));

/**
 * Exceptions whose expiry date is today or earlier. An exception is a bounded
 * decision: when its date comes it is renewed with a fresh basis or removed,
 * and until then the audit fails loudly instead of passing it over quietly.
 */
export function expired(exceptions = EXCEPTIONS, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  return exceptions.filter(e => e.expires <= today);
}

const LEVELS = ['info', 'low', 'moderate', 'high', 'critical'];

/** Every distinct advisory in an `npm audit --json` report. */
export function advisories(report) {
  const found = new Map();
  for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via ?? []) {
      // A string names another vulnerable package, whose own entry carries
      // the advisory; only objects are advisories.
      if (typeof via !== 'object' || via === null) continue;
      const id = /GHSA-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}/.exec(
        via.url ?? ''
      )?.[0];
      const key = id ?? `npm-${via.source}`;
      found.set(key, {
        id: key,
        name: via.name,
        severity: via.severity,
        title: via.title,
        url: via.url,
      });
    }
  }
  return [...found.values()];
}

/** Split a report's advisories at or above `level` into failing and ignored. */
export function judge(report, { level = 'moderate', ignored = IGNORED } = {}) {
  const floor = LEVELS.indexOf(level);
  const all = advisories(report).filter(
    a => LEVELS.indexOf(a.severity) >= floor
  );
  return {
    failing: all.filter(a => !ignored.has(a.id)),
    ignored: all.filter(a => ignored.has(a.id)),
    unreported: [...ignored.keys()].filter(id => !all.some(a => a.id === id)),
  };
}

function fullTree() {
  const run = spawnSync('npm', ['audit', '--json'], { encoding: 'utf8' });
  let report;
  try {
    report = JSON.parse(run.stdout);
  } catch {
    process.stderr.write(run.stderr || run.stdout);
    console.error('npm audit --json did not return a report.');
    return false;
  }
  if (report.error) {
    console.error(
      `npm audit failed: ${report.error.summary ?? JSON.stringify(report.error)}`
    );
    return false;
  }
  const { failing, ignored, unreported } = judge(report);
  const lapsed = expired();
  for (const e of lapsed) {
    console.error(
      `EXPIRED ${e.id} (expired ${e.expires}): renew it in tools/deps-audit-exceptions.json with a fresh basis and a new date, or remove it.`
    );
  }
  for (const a of ignored) {
    console.log(
      `ignored ${a.id} (${a.name}, ${a.severity}): ${IGNORED.get(a.id)}`
    );
  }
  for (const id of unreported) {
    console.log(
      `${id} is ignored but no longer reported; remove it from tools/deps-audit-exceptions.json.`
    );
  }
  if (lapsed.length) return false;
  if (failing.length) {
    for (const a of failing) {
      console.error(
        `${a.severity} ${a.id} in ${a.name}: ${a.title}\n  ${a.url}`
      );
    }
    console.error(
      `${failing.length} advisor${failing.length === 1 ? 'y' : 'ies'} at moderate or above. Run \`npm audit\` for the dependency paths.`
    );
    return false;
  }
  console.log(
    'Full tree: no advisories at moderate or above beyond the ignored ones.'
  );
  return true;
}

function productionTree() {
  return (
    spawnSync('npm', ['audit', '--omit=dev'], { stdio: 'inherit' }).status === 0
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const full = fullTree();
  const production = productionTree();
  process.exit(full && production ? 0 : 1);
}
