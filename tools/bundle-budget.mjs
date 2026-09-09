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
      'against a baseline of 821.8 KB before the work started.\n\n' +
      'NOT raised for /teaching/, which is worth recording because it is a ' +
      'whole public page: 828.6 KB before it, 829.0 KB after. Its share of ' +
      'this number is four hundred and sixty bytes, and all of it is the two ' +
      'front-door strings that link to it. Everything else about the page is ' +
      'outside the entry graph by construction - js/teachingPage.js is compiled ' +
      'to its own file the way the instructor portal and the validation page ' +
      'are, its hundred-odd strings are in js/i18n/en.teaching.js rather than ' +
      "in the application's catalogue, and css/teaching.css is built to its " +
      'own stylesheet and linked only from that page instead of being ' +
      'concatenated into css/app.css, which is the half of this budget that ' +
      'the page would otherwise have grown. A document page can be as large ' +
      'as it needs to be; what it may not do is charge the simulation for it. ' +
      'The UI-coherence pass is the first thing to have done exactly that. ' +
      'It needed 6.2 KB it did not have: the eight object-type glyphs, the ' +
      'on-canvas placement status, the placement marker and velocity arrow ' +
      'and the strings for all of it came to 6.7 KB of eager JavaScript and ' +
      '1.9 KB of CSS, which took the initial download to 836.2 KB - over. ' +
      'Nothing was raised. What paid for it was js/welcome.js: eleven ' +
      'kilobytes of front door - entry cards, featured scenarios, audience ' +
      'copy, resource links - downloaded by every visitor in order to run ' +
      'isWelcomeSeen(), which reads one key out of localStorage. Those four ' +
      'small functions are js/welcomeGate.js now, js/main.js imports the ' +
      'layer itself only when it is about to be shown, and a returning ' +
      'visitor never fetches it. 824.7 KB against an untouched 830.0 limit.',
  },
  {
    id: 'deferred',
    label: 'Deferred JavaScript (lazy chunks)',
    limit: 3080,
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
      'removed to fit under it.\n\n' +
      'Raised from 2790 to 2860 for the observing-schedule feature, itemised ' +
      'from a fresh build rather than estimated. The Design the Schedule ' +
      'lesson is 17.5 KB and its Spanish shadow 15.3 KB; js/rvCompare.js is ' +
      '4.1 KB and js/rvScheduleControls.js 3.1 KB; the instructor guide entry ' +
      'is about 11 KB inside the portal chunk, and the rvsched.* prose about ' +
      '4.5 KB across two catalogues. A lesson and an instrument is exactly ' +
      'what the paragraph at the top of this reason says this budget is ' +
      'loose for. The trade the initial budget demands was made in the same ' +
      "change and in the same direction: the schedule fields' prose and the " +
      'rules behind them left the start-up path for js/rvScheduleControls.js ' +
      'and the deferred catalogue - the synthetic run is opt-in and its ' +
      'section is hidden until it is switched on, which is the moment the ' +
      'panel registers them - and the initial download came back from ' +
      '832.9 KB to 829.8 KB. The initial limit was NOT touched.\n\n' +
      "Raised from 2860 to 2900 for the binary lesson's parameter sweep, " +
      'itemised from a fresh build against 2849.3 KB before it. The six new ' +
      'lesson steps are 15.9 KB of English and 14.6 KB of Spanish - the ' +
      'lesson chunks went 31.8 to 47.7 and 31.5 to 46.1 - and ' +
      "js/experiments/binarySweep.js with the panel's sweep controls and the " +
      'notebook capture is the rest, with about 6 KB of prose in two ' +
      'catalogues. A lesson and an instrument is what the paragraph at the ' +
      'top of this reason says this budget is loose for. The initial download ' +
      "did NOT move: its share of this work is the sweep section's styling, " +
      "and the section is built out of the panel system's existing classes " +
      'so that share is three merged selectors and nothing else. 829.9 KB ' +
      'before, 830.0 KB after, against an untouched 830.0 limit.\n\n' +
      'Raised from 2900 to 2960 for the gravity-assist lesson\u2019s retained ' +
      'comparison and its optional sweep, itemised from two fresh builds: ' +
      '2886.6 KB before, 2948.8 KB after. The English lesson chunk went ' +
      '19.8 to 31.8 KB and its Spanish shadow 19.3 to 29.7 - six new screens ' +
      'and three rewritten ones - and the instructor guide entry took ' +
      'instructorPortal.js from 313.0 to 322.0 KB. The two deferred prose ' +
      'catalogues grew 9.7 and 9.2 KB, and are counted twice because ' +
      'validationWorker.js bundles both of them as well: that one chunk ' +
      'accounts for 18.9 KB of the total on its own. The rest is ' +
      'js/experiments/assistSweep.js, js/experiments/frameRate.js, the ' +
      "panel's two sections and the notebook capture. A lesson and an " +
      'instrument is what the paragraph at the top of this reason says this ' +
      'budget is loose for.\n\n' +
      'The initial download went DOWN across this work, 829.96 KB to ' +
      '829.90, and its limit was NOT touched. The new sections are built out ' +
      "of the panel system's existing classes, so their whole share of the " +
      'stylesheet is one selector added to an existing rule - and three dead ' +
      'selectors left behind by the binary sweep (.binary-sweep-field, ' +
      '.binary-sweep-status, .binary-sweep-table, none of them on any element ' +
      'in index.html) were deleted in the same change, which more than paid ' +
      'for it.\n\n' +
      'Raised from 2960 to 3030 for the controlled pairs in the chaos and ' +
      'Lagrange lessons: 2949.4 KB before, 3012.3 KB after, both from fresh ' +
      'builds. The Butterfly Effect lesson chunk went 19.8 to 32.0 KB and its ' +
      'Spanish shadow 19.3 to 30.0 - the guided actions replaced nine manual ' +
      'steps of prose with a longer explanation of what the numerical control ' +
      'now does and why the old instruction was wrong - and Where Can It Get ' +
      'To? went 16.3 to 20.0 and 17.0 to 20.8 for two new screens. The two ' +
      'deferred prose catalogues grew 12.3 and 11.6 KB and are counted twice, ' +
      'because validationWorker.js bundles both: that chunk alone accounts ' +
      'for 24.2 KB of the total. The rest is js/experiments/neckPair.js, ' +
      "js/experiments/chaosPair.js, the two panels' sections and the notebook " +
      'captures. Two lessons and an instrument is what the paragraph at the ' +
      'top of this reason says this budget is loose for.\n\n' +
      'The initial download did NOT move and its limit was NOT touched: ' +
      '829.9 KB before and after. Neither section brought any styling of its ' +
      "own - the Lagrange one reuses the assist sections' rule and the chaos " +
      "one is built from the bench panel's existing classes - so the " +
      'stylesheet is byte for byte what it was.\n\n' +
      'Raised from 3030 to 3080 for the body-rendering pass, and this one is ' +
      'the trade the initial budget asks for, made in the right direction. ' +
      'The level-of-detail system, the deterministic visual seeds, the two ' +
      'comet tails, the clipped planet and gas-giant surfaces and the ' +
      'compact-object cues put about twelve kilobytes into js/physics.js and ' +
      'three into js/bodyVisuals.js, all of it eager, which took the initial ' +
      'download to 840.7 KB - over. Nothing was raised to absorb that. What ' +
      'paid for it was a leak found while looking for the room: js/main.js ' +
      'statically imported setLessonLocale from the lesson registry, which ' +
      'pulls in the 12.5 KB English lesson manifest, so every visitor who ' +
      'opened the sandbox downloaded the card titles, durations and step ' +
      'counts of eighteen lessons in order to call one setter. It is a ' +
      'dynamic import now. Those 17.7 KB moved from the start-up path into ' +
      'this budget, and the one above went DOWN: 829.0 KB before the ' +
      'rendering work, 823.3 KB after it.\n\n' +
      'To be exact about what this raise is and is not: the 17.7 KB took the ' +
      'deferred total to 3028.6 KB, which is 1.4 KB under the old 3030 ' +
      'limit, not over it. The raise did not rescue a failing check - it ' +
      'bought margin that a budget sitting at 99.95 per cent of itself did ' +
      'not have, on a number that only ever moves in the direction this ' +
      'project wants it to. The measured figure is unchanged by the starfield ' +
      'work, which is entirely eager: 3028.6 KB, 51.4 KB of room.',
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
