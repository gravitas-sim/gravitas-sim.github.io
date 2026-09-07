#!/usr/bin/env node
// =============================================================================
// npm run budget  /  npm run budget:check
// -----------------------------------------------------------------------------
// A ceiling on what a first-time visitor downloads before Gravitas draws
// anything, and a record of why the ceiling is where it is.
//
// The number that matters is the initial download: the CSS plus the JavaScript
// that the entry point pulls in eagerly. Everything else - the lessons, the
// instruments, three.js, Chart.js, the validation worker - is deferred behind a
// dynamic import and arrives only if a reader asks for the feature. That split
// is the architecture's main performance claim, and a budget on the total build
// size would not defend it: adding a megabyte of lazily-loaded lesson content
// is fine, and moving one kilobyte of it into the entry chunk is not.
//
// So there are two budgets, and the deferred one is deliberately loose. The
// tight one is on the initial download, because that is the number a 2019
// Chromebook on a school connection actually waits for.
//
// Raising a budget
// -----------------------------------------------------------------------------
// Edit BUDGETS below, in the same commit as the change that needs the room, and
// say in `reason` what was added and why it belongs in the initial download.
// The reason is printed by `npm run budget`, so the history of this file is a
// readable account of where the start-up cost went. That is the whole mechanism:
// growth is allowed, unexplained growth is not.
// =============================================================================

import { readFile } from 'node:fs/promises';

const check = process.argv.includes('--check');

/**
 * The ceilings, in kilobytes.
 *
 * `headroom` is the slack above the measured size at the time the budget was
 * last set. Small on the initial download so that a regression is caught while
 * it is still one change rather than ten.
 */
const BUDGETS = [
  {
    id: 'initial',
    label: 'Initial download (CSS + eager JS)',
    limit: 830,
    reason:
      'Was 743 KB when this budget was first asked for. The application had ' +
      'already grown to 771 KB on its own - the extracted state module, the ' +
      'authoring rules, the offline and quality-tier code. Self-hosting the ' +
      'fonts added the @font-face block to the stylesheet (+2.8 KB), and the ' +
      'accessibility pass added the canvas description module, the focus trap ' +
      'and their strings (+5.8 KB), for 780 KB. The observing lesson took it ' +
      'to 799.5 KB, at which point the note here said the remaining headroom ' +
      'was a change or two and not a year. It was one change: the correctness ' +
      'pass over lesson progress and observing sessions added stable step ids ' +
      'and their versioned migration, the session store, the separation of ' +
      'invalidation from sampling permission, quality flags on measurements, ' +
      'and about forty strings in each locale - all of it in modules that load ' +
      'at start-up. Raised to 830 KB, which is where it stays until something ' +
      'is taken *out*: the next feature that wants room here should be looking ' +
      'for a module to defer rather than for another thirty kilobytes. ' +
      'Neither three.js nor Chart.js is in here; both are deferred.\n\n' +
      'The reliability check took it to 831.7 KB, over. Rather than ask for ' +
      'another two kilobytes, the 92 bench.* strings went out to the deferred ' +
      'catalogue: the bench is loaded on first press and most visitors never ' +
      'press it, so its prose was being downloaded by everyone who loads the ' +
      'site. bench.error.load stays behind, because it is what the bridge says ' +
      'when that import fails. 826.3 KB, and the rule above held.\n\n' +
      'That instruction was then tested and honoured. The binary, gravity ' +
      'assist and RV-analysis work took this to 868 KB, and the answer was ' +
      'four deferrals rather than a bigger number: the two scenario-specific ' +
      'panels now arrive with their scenarios, the export dialog and every CSV ' +
      'builder behind it arrive on the first press of the export button, and ' +
      'the twelve kilobytes of prose those panels needed moved into a second ' +
      'catalogue that registers itself when they load. 868 KB back to 828 KB, ' +
      'against a baseline of 821.8 KB before the work started.',
  },
  {
    id: 'deferred',
    label: 'Deferred JavaScript (lazy chunks)',
    limit: 2790,
    reason:
      'Jumped from 1369 KB to 2105 KB when three.js and Chart.js stopped being ' +
      'CDN requests and became bundled chunks. That is the point of the change ' +
      'rather than a regression - the bytes were always downloaded, they were ' +
      'just downloaded from jsdelivr - and none of it is in the initial ' +
      'download. Loose on purpose: a new lesson or instrument belongs here.\n\n' +
      'Raised from 2400 to 2550 for two reasons that are both the system ' +
      'working. Two investigations and their instruments were added, which is ' +
      'exactly what this budget is loose for; and about forty kilobytes ' +
      'arrived here by being taken OUT of the start-up path, which is the ' +
      'trade the initial budget above asks every new feature to make. Raising ' +
      'this number to absorb something that should have been deferred would ' +
      'be the opposite, and is not what happened.\n\n' +
      'Raised again from 2550 to 2650 on the same accounting. The manoeuvre ' +
      'planner and the Hohmann lesson are a new instrument and a new lesson, ' +
      'which is what the paragraph above says this budget is loose for; and ' +
      'the 112 inv.* strings that arrived here did so by leaving the start-up ' +
      'path, which took the initial download from 833.3 KB to 825.7. Two of ' +
      'those three numbers moved because something was deferred rather than ' +
      'added, and the initial budget above was not touched.\n\n' +
      'Raised again from 2650 to 2760 on the same accounting, for the ' +
      'evidence notebook. The panel, the capture helpers, the PDF report and ' +
      'the store are a new instrument, which is what this budget is loose ' +
      'for, and every byte of them is behind js/notebookBridge.js - a 2 KB ' +
      'eager module that is a rail button and nothing else. The trade the ' +
      'initial budget demands was made in the same change: the resW, chaosW ' +
      'and energyW widget catalogues moved out of the start-up path, where ' +
      'nothing could render them - js/widgets.js is reached only from the ' +
      'lazy js/investigations.js - and the initial download went DOWN from ' +
      '829.7 KB to 828.6 KB across a feature that added a panel, a report ' +
      'writer and 4.7 KB of CSS. The initial limit was not touched.\n\n' +
      'Raised from 2760 to 2790 for the release-preparation pass, and this ' +
      'one is bug-fix weight rather than a new instrument, so it is itemised ' +
      'rather than waved through. Measured against a190265: +5.4 KB deferred, ' +
      'from clamping the Monte Carlo refinement to its search bounds and ' +
      'keeping the grid fit as a floor; the generation token, inputs key and ' +
      'named run outcomes; the notebook provenance fields the clock fix needs ' +
      '(sim units, the conversion factor, the revision source) and the ' +
      'recorded-provenance precedence; and the prose for all of it in two ' +
      'languages. The initial download moved 822.2 to 823.5 KB and its limit ' +
      'was NOT touched - it still has six kilobytes of headroom, which is the ' +
      'budget that governs what a first-time visitor actually downloads. ' +
      'Nothing was deferred to make this number work and nothing was ' +
      'removed to fit under it.',
  },
];

/**
 * The numbers the build itself measured.
 *
 * Read rather than recomputed. Which chunks are eager is a property of the
 * import graph, build.js already walks it to print its summary, and a second
 * walk here would be a second definition of "initial download" that could
 * disagree with the first.
 */
async function buildReport() {
  try {
    return JSON.parse(await readFile('.build-report.json', 'utf8'));
  } catch {
    console.error(
      'No .build-report.json. Run `npm run build` first - the budget judges\n' +
        'what the build measured, it does not measure it again.'
    );
    process.exit(2);
  }
}

const report = await buildReport();
const measured = {
  initial: report.initialDownloadBytes / 1024,
  deferred: report.deferredJsBytes / 1024,
};

let over = 0;
const rows = [];
for (const budget of BUDGETS) {
  const size = measured[budget.id];
  const pct = (size / budget.limit) * 100;
  if (size > budget.limit) over++;
  rows.push({ budget, size, pct });
}

const kb = n => `${n.toFixed(1)} KB`;

console.log('Bundle budget\n');
for (const { budget, size, pct } of rows) {
  const state = size > budget.limit ? 'OVER' : 'ok';
  console.log(
    `  ${budget.label}\n` +
      `    ${kb(size)} of ${kb(budget.limit)}  (${pct.toFixed(0)}%)  ${state}`
  );
  if (!check) console.log(`    ${budget.reason}\n`);
}

if (over) {
  console.error(
    `\n${over} budget(s) exceeded.\n\n` +
      'If the growth is wanted, raise the limit in tools/bundle-budget.mjs in\n' +
      'the same commit and say in its `reason` what was added. If it is not,\n' +
      'the usual cause is a module that should have been behind a dynamic\n' +
      'import being reached from the entry graph. `npm run build` prints the\n' +
      'eager file count beside the size, and js/main.js is where to look.'
  );
  process.exit(1);
}

if (!check) console.log('Both budgets are within their limits.');
