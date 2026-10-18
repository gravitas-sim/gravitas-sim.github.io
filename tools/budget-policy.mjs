// =============================================================================
// The budget policy: workflow ceilings, an optional-growth allowance, a ledger
// -----------------------------------------------------------------------------
//   node tools/budget-policy.mjs check                validate the policy and ledger
//   node tools/budget-policy.mjs rebaseline --kb N --release R --tranche T \
//        --allocation A --reason "..." --label "ceiling increase"
//                                                     grant allowance (never automatic)
//
// Prompt 133. Every slice used to spend a register row on a 0.1 KB raise. This
// replaces that with a policy that does nothing until Carl switches it on
// (`mode` in tools/budget-policy.json: "exact" today, "declared" when adopted):
//
//   workflow ceilings   what a student waits for. They never move except by
//                       Carl's explicit decision, and nothing here can move them.
//   allowance           room for lazy families and packs, capped per release
//                       and cumulatively, granted by Carl at a checkpoint and
//                       recorded in tools/growth-ledger.json with the running
//                       total.
//
// A re-baseline is a ceiling increase. The command is the only writer of the
// ledger, applies to the allowance only, refuses on a dirty tree, refuses to run
// in CI, refuses without the label "ceiling increase", and refuses any grant
// that would put the effective ceiling below the measurement. All of the rules
// are the pure functions below; the command line only reads and writes files.
// =============================================================================

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const POLICY_FILE = path.join(ROOT, 'tools', 'budget-policy.json');
export const LEDGER_FILE = path.join(ROOT, 'tools', 'growth-ledger.json');
export const MODES = ['exact', 'declared'];
export const LABEL = 'ceiling increase';

const round1 = n => Math.round(n * 10) / 10;

export const readPolicy = (file = POLICY_FILE) =>
  JSON.parse(readFileSync(file, 'utf8'));
export const readLedger = (file = LEDGER_FILE) =>
  JSON.parse(readFileSync(file, 'utf8'));

/** The deferred ceiling in force: the workflow core plus what Carl has granted. */
export function effectiveDeferredKb(policy) {
  return round1(
    policy.workflowCeilings.deferredCoreKb + policy.allowance.grantedKb
  );
}

/** Ledger entries must add up, and add up to what was granted. */
export function ledgerTotals(ledger) {
  let running = 0;
  const problems = [];
  const perRelease = {};
  for (const [i, e] of ledger.entries.entries()) {
    for (const f of [
      'kb',
      'release',
      'tranche',
      'allocation',
      'reason',
      'runningKb',
    ])
      if (e[f] === undefined || e[f] === '')
        problems.push(`ledger entry ${i + 1} has no ${f}`);
    running = round1(running + e.kb);
    if (e.runningKb !== running)
      problems.push(
        `ledger entry ${i + 1} says the running total is ${e.runningKb} KB; it is ${running}`
      );
    perRelease[e.release] = round1((perRelease[e.release] || 0) + e.kb);
  }
  return { totalKb: running, perRelease, problems };
}

/**
 * Everything wrong with a policy and its ledger. Empty means consistent. Valid
 * in either mode: "exact" is a policy that is switched off, not an invalid one.
 */
export function validate({
  policy,
  ledger,
  realDeferredKb = null,
  measuredDeferredKb = null,
}) {
  const problems = [];
  if (!MODES.includes(policy.mode))
    problems.push(
      `mode must be one of ${MODES.join(', ')}; it is ${policy.mode}`
    );
  const { allowance, workflowCeilings } = policy;
  const t = ledgerTotals(ledger);
  problems.push(...t.problems);
  if (allowance.grantedKb > allowance.capCumulativeKb)
    problems.push('the granted allowance exceeds the cumulative cap');
  if (t.totalKb > allowance.grantedKb)
    problems.push(
      `the ledger records ${t.totalKb} KB drawn against ${allowance.grantedKb} KB granted`
    );
  for (const [release, kb] of Object.entries(t.perRelease))
    if (kb > allowance.capPerReleaseKb)
      problems.push(
        `release ${release} drew ${kb} KB; the per-release cap is ${allowance.capPerReleaseKb}`
      );
  if (
    measuredDeferredKb !== null &&
    effectiveDeferredKb(policy) < measuredDeferredKb
  )
    problems.push(
      `the effective deferred ceiling ${effectiveDeferredKb(policy)} KB is below the measurement ${measuredDeferredKb} KB`
    );
  if (
    policy.mode === 'declared' &&
    realDeferredKb !== null &&
    realDeferredKb !== effectiveDeferredKb(policy)
  )
    problems.push(
      `in "declared" mode the deferred ceiling in tools/bundle-budget.mjs (${realDeferredKb} KB) must equal the policy's (${effectiveDeferredKb(policy)} KB)`
    );
  if (
    workflowCeilings.deferredCoreKb + allowance.capCumulativeKb <
    workflowCeilings.deferredCoreKb
  )
    problems.push('negative allowance');
  return problems;
}

/**
 * The ceilings that rose between two maps of name to kilobytes (or to
 * {kb, requests}). In "declared" mode any entry here is a failure.
 */
export function raisedCeilings(before, after) {
  const value = v => (typeof v === 'number' ? { kb: v } : v);
  const raised = [];
  for (const [name, now] of Object.entries(after)) {
    const was = before[name];
    if (was === undefined) continue;
    const a = value(was);
    const b = value(now);
    for (const k of ['kb', 'requests'])
      if (typeof a[k] === 'number' && typeof b[k] === 'number' && b[k] > a[k])
        raised.push(`${name} ${k}: ${a[k]} to ${b[k]}`);
  }
  return raised;
}

/**
 * Grant allowance for one release. Pure: returns the new policy and ledger or
 * throws; the caller writes them. Only the allowance can change.
 * @param {{policy: object, ledger: object}} state
 * @param {{kb: number, release: string, tranche: string, allocation: string, reason: string, label: string}} request
 * @param {{dirty: boolean, ci: boolean, measuredDeferredKb?: number|null, workflow?: string|null}} context
 */
export function rebaseline(
  { policy, ledger },
  request,
  { dirty, ci, measuredDeferredKb = null, workflow = null }
) {
  if (workflow)
    throw new Error(
      `Refusing: ${workflow} is a workflow ceiling, and a re-baseline cannot move one`
    );
  if (ci)
    throw new Error(
      'Refusing: a re-baseline is never run automatically or in CI'
    );
  if (dirty)
    throw new Error(
      'Refusing: the working tree is not clean; commit or discard first, so the ledger diff is the whole change'
    );
  if (request.label !== LABEL)
    throw new Error(
      `Refusing: a re-baseline is a ceiling increase and must be labelled "${LABEL}"`
    );
  for (const f of ['release', 'tranche', 'allocation', 'reason'])
    if (!request[f]) throw new Error(`Refusing: --${f} is required`);
  if (!(request.kb > 0))
    throw new Error(
      'Refusing: the grant must be a positive number of kilobytes'
    );
  const { allowance } = policy;
  const before = ledgerTotals(ledger);
  const released = round1(
    (before.perRelease[request.release] || 0) + request.kb
  );
  if (released > allowance.capPerReleaseKb)
    throw new Error(
      `Refusing: release ${request.release} would draw ${released} KB, over the per-release cap ${allowance.capPerReleaseKb}`
    );
  const granted = round1(allowance.grantedKb + request.kb);
  if (granted > allowance.capCumulativeKb)
    throw new Error(
      `Refusing: ${granted} KB granted would pass the cumulative cap ${allowance.capCumulativeKb}`
    );
  const next = {
    ...policy,
    allowance: { ...allowance, grantedKb: granted },
  };
  if (
    measuredDeferredKb !== null &&
    effectiveDeferredKb(next) < measuredDeferredKb
  )
    throw new Error(
      'Refusing: the result would leave the ceiling below the measurement'
    );
  const entry = {
    kb: request.kb,
    release: request.release,
    tranche: request.tranche,
    allocation: request.allocation,
    reason: request.reason,
    runningKb: round1(before.totalKb + request.kb),
  };
  return {
    policy: next,
    ledger: { ...ledger, entries: [...ledger.entries, entry] },
  };
}

const arg = name => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

function deferredLimitInSource() {
  const text = readFileSync(
    path.join(ROOT, 'tools', 'bundle-budget.mjs'),
    'utf8'
  );
  const m = /id: 'deferred',[\s\S]*?limit: ([0-9.]+)/.exec(text);
  return m ? Number(m[1]) : null;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const policy = readPolicy();
  const ledger = readLedger();
  if (command === 'check') {
    const problems = validate({
      policy,
      ledger,
      realDeferredKb: deferredLimitInSource(),
    });
    for (const p of problems) console.error(`policy: ${p}`);
    if (problems.length) process.exit(1);
    console.log(
      policy.mode === 'exact'
        ? 'Budget policy: switched off (mode "exact"); files are consistent.'
        : `Budget policy: "declared"; deferred ceiling ${effectiveDeferredKb(policy)} KB (${policy.allowance.grantedKb} KB of allowance granted).`
    );
  } else if (command === 'rebaseline') {
    const dirty =
      execFileSync('git', ['status', '--porcelain'], {
        cwd: ROOT,
        encoding: 'utf8',
      }).trim() !== '';
    try {
      const out = rebaseline(
        { policy, ledger },
        {
          kb: Number(arg('kb')),
          release: arg('release'),
          tranche: arg('tranche'),
          allocation: arg('allocation'),
          reason: arg('reason'),
          label: arg('label'),
        },
        {
          dirty,
          ci:
            process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true',
          workflow: arg('workflow') || null,
        }
      );
      writeFileSync(POLICY_FILE, JSON.stringify(out.policy, null, 2) + '\n');
      writeFileSync(LEDGER_FILE, JSON.stringify(out.ledger, null, 2) + '\n');
      console.log(
        `Granted ${arg('kb')} KB for ${arg('release')}. Review the diff and open a pull request labelled "${LABEL}".`
      );
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  } else {
    console.error(
      'usage: budget-policy.mjs check | rebaseline --kb N --release R --tranche T --allocation A --reason "..." --label "ceiling increase"'
    );
    process.exit(2);
  }
}
