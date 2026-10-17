#!/usr/bin/env node
// =============================================================================
// The pull-request class check (Roadmap III, Prompt 122)
// -----------------------------------------------------------------------------
// `main` deploys on every merge, so what may merge into it depends on the kind
// of change. INTEGRATION.md carries the model (a machine-readable block) and
// says what each class means; this reads a pull request's labels and target and
// answers whether the target is allowed.
//
//   invisible       no shipped behaviour changes; targets main
//   visible         a student can tell; targets the active train, or main only
//                   inside a window or with the `hotfix` label
//   instructional   the instructor bundle reads it (a flag beside the class);
//                   into main only while `instructors:check` is current
//
// A pull request into a train is exempt from the window and the ciphertext
// check. A pull request into any other branch is stacked work: it is judged
// when its prerequisite reaches main or a train.
//
// Usage (CI):  node tools/pr-class.mjs --fetch   reads the pull request's labels
//   live from the API (PR_REPO, PR_NUMBER, GH_TOKEN), because the event payload
//   is replayed unchanged by a re-run; without --fetch it reads
//   PR_LABELS     JSON array of label names
//   PR_BASE       the target branch
//   PR_AUTHOR     the author's login
//   PR_NOW        optional ISO instant (tests); default now
//   CHECKS_RESULT the result of the `checks` job (it runs instructors:check)
// =============================================================================

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLASSES = ['invisible', 'visible'];
const BOT_AUTHORS = new Set(['dependabot[bot]']);

/** The model block in INTEGRATION.md: integration branch, trains, windows. */
export function readModel(text) {
  const m =
    /<!--integration-model-->\s*([\s\S]*?)\s*<!--\/integration-model-->/.exec(
      text
    );
  if (!m) throw new Error('INTEGRATION.md has no integration-model block.');
  const model = JSON.parse(m[1]);
  for (const k of ['integrationBranch', 'trains', 'windows'])
    if (!(k in model)) throw new Error(`integration-model lacks "${k}".`);
  return model;
}

/** A train's branch: `train/<name>` unless the entry names one. */
export const trainBranch = t => t.branch || `train/${t.name}`;

/**
 * @returns {{ok: boolean, class: string|null, notes: string[], errors: string[]}}
 */
export function classify({
  labels,
  base,
  author = '',
  now = new Date(),
  checksResult = 'unknown',
  model,
}) {
  const errors = [];
  const notes = [];
  const has = name => labels.includes(name);
  const instructional = has('instructional');
  const hotfix = has('hotfix');
  let cls = CLASSES.filter(c => has(c));

  if (cls.length === 0 && BOT_AUTHORS.has(author)) {
    notes.push(`${author} opens dependency updates; treated as invisible.`);
    cls = ['invisible'];
  }
  if (cls.length !== 1) {
    errors.push(
      `Label the pull request with exactly one of ${CLASSES.join(' or ')} (found ${cls.length}).`
    );
    return { ok: false, class: null, notes, errors };
  }
  const [klass] = cls;

  if (base === model.integrationBranch) {
    const inWindow = model.windows.some(
      w => now >= new Date(w.from) && now <= new Date(w.to)
    );
    if (klass === 'visible' && !hotfix && !inWindow)
      errors.push(
        `A visible pull request into ${base} needs an open window or the hotfix label; it belongs on the active train.`
      );
    if (klass === 'visible' && hotfix)
      notes.push('hotfix: the window rule is waived for this pull request.');
    if (instructional && checksResult !== 'success')
      errors.push(
        `An instructional pull request into ${base} needs instructors:check current (the checks job returned '${checksResult}').`
      );
  } else if (
    model.trains.some(t => trainBranch(t) === base) ||
    base.startsWith('train/')
  ) {
    const train = model.trains.find(t => trainBranch(t) === base);
    if (!train) errors.push(`${base} is not a train INTEGRATION.md lists.`);
    else if (train.state !== 'open')
      errors.push(
        `${base} is ${train.state}; only an open train accepts work.`
      );
    else
      notes.push(
        `${base} is open: window and ciphertext checks do not apply here.`
      );
  } else {
    notes.push(
      `${base} is neither ${model.integrationBranch} nor a train: stacked work, judged when its prerequisite lands.`
    );
  }
  return { ok: errors.length === 0, class: klass, notes, errors };
}

function main() {
  const model = readModel(
    readFileSync(path.join(REPO, 'INTEGRATION.md'), 'utf8')
  );
  const result = classify({
    labels: process.argv.includes('--fetch')
      ? JSON.parse(
          execFileSync(
            'gh',
            [
              'api',
              `repos/${process.env.PR_REPO}/pulls/${process.env.PR_NUMBER}`,
              '--jq',
              '[.labels[].name]',
            ],
            { encoding: 'utf8' }
          )
        )
      : JSON.parse(process.env.PR_LABELS || '[]'),
    base: process.env.PR_BASE || '',
    author: process.env.PR_AUTHOR || '',
    now: process.env.PR_NOW ? new Date(process.env.PR_NOW) : new Date(),
    checksResult: process.env.CHECKS_RESULT || 'unknown',
    model,
  });
  for (const n of result.notes) console.log(n);
  for (const e of result.errors) console.error(`::error::${e}`);
  if (result.ok) console.log(`Class ${result.class}: allowed.`);
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
