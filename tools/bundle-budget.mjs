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

import { judge, readReference } from './budget-environment.mjs';

const check = process.argv.includes('--check');

if (process.argv.includes('--print-environment')) {
  console.log(`node ${process.versions.node}, zlib ${process.versions.zlib}`);
  process.exit(0);
}
const reference = readReference();
const verdict = judge(reference, process.versions, {
  strictFlag: process.argv.includes('--strict'),
  ci: process.env.GITHUB_ACTIONS === 'true',
});

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
      'catalog: the bench is loaded on first press and most visitors never ' +
      'press it, so its prose was being downloaded by everyone who loads the ' +
      'site. bench.error.load stays behind, because it is what the bridge says ' +
      'when that import fails. 826.3 KB, and the rule above held.\n\n' +
      'That instruction was then tested and honored. The binary, gravity ' +
      'assist and RV-analysis work took this to 868 KB, and the answer was ' +
      'four deferrals rather than a bigger number: the two scenario-specific ' +
      'panels now arrive with their scenarios, the export dialog and every CSV ' +
      'builder behind it arrive on the first press of the export button, and ' +
      'the twelve kilobytes of prose those panels needed moved into a second ' +
      'catalog that registers itself when they load. 868 KB back to 828 KB, ' +
      'against a baseline of 821.8 KB before the work started.\n\n' +
      'NOT raised for /teaching/, which is worth recording because it is a ' +
      'whole public page: 828.6 KB before it, 829.0 KB after. Its share of ' +
      'this number is four hundred and sixty bytes, and all of it is the two ' +
      'front-door strings that link to it. Everything else about the page is ' +
      'outside the entry graph by construction - js/teachingPage.js is compiled ' +
      'to its own file the way the instructor portal and the validation page ' +
      'are, its hundred-odd strings are in js/i18n/en.teaching.js rather than ' +
      "in the application's catalog, and css/teaching.css is built to its " +
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
    label: 'Deferred JavaScript (lazy chunks, gzipped)',
    limit: 2236.5,
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
      'Raised again from 2550 to 2650 on the same accounting. The maneuver ' +
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
      'and energyW widget catalogs moved out of the start-up path, where ' +
      'nothing could render them - js/widgets.js is reached only from the ' +
      'lazy js/investigations.js - and the initial download went DOWN from ' +
      '829.7 KB to 828.6 KB across a feature that added a panel, a report ' +
      'writer and 4.7 KB of CSS. The initial limit was not touched.\n\n' +
      'Raised from 2760 to 2790 for the release-preparation pass, and this ' +
      'one is bug-fix weight rather than a new instrument, so it is itemized ' +
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
      'Raised from 2790 to 2860 for the observing-schedule feature, itemized ' +
      'from a fresh build rather than estimated. The Design the Schedule ' +
      'lesson is 17.5 KB and its Spanish shadow 15.3 KB; js/rvCompare.js is ' +
      '4.1 KB and js/rvScheduleControls.js 3.1 KB; the instructor guide entry ' +
      'is about 11 KB inside the portal chunk, and the rvsched.* prose about ' +
      '4.5 KB across two catalogs. A lesson and an instrument is exactly ' +
      'what the paragraph at the top of this reason says this budget is ' +
      'loose for. The trade the initial budget demands was made in the same ' +
      "change and in the same direction: the schedule fields' prose and the " +
      'rules behind them left the start-up path for js/rvScheduleControls.js ' +
      'and the deferred catalog - the synthetic run is opt-in and its ' +
      'section is hidden until it is switched on, which is the moment the ' +
      'panel registers them - and the initial download came back from ' +
      '832.9 KB to 829.8 KB. The initial limit was NOT touched.\n\n' +
      "Raised from 2860 to 2900 for the binary lesson's parameter sweep, " +
      'itemized from a fresh build against 2849.3 KB before it. The six new ' +
      'lesson steps are 15.9 KB of English and 14.6 KB of Spanish - the ' +
      'lesson chunks went 31.8 to 47.7 and 31.5 to 46.1 - and ' +
      "js/experiments/binarySweep.js with the panel's sweep controls and the " +
      'notebook capture is the rest, with about 6 KB of prose in two ' +
      'catalogs. A lesson and an instrument is what the paragraph at the ' +
      'top of this reason says this budget is loose for. The initial download ' +
      "did NOT move: its share of this work is the sweep section's styling, " +
      "and the section is built out of the panel system's existing classes " +
      'so that share is three merged selectors and nothing else. 829.9 KB ' +
      'before, 830.0 KB after, against an untouched 830.0 limit.\n\n' +
      'Raised from 2900 to 2960 for the gravity-assist lesson\u2019s retained ' +
      'comparison and its optional sweep, itemized from two fresh builds: ' +
      '2886.6 KB before, 2948.8 KB after. The English lesson chunk went ' +
      '19.8 to 31.8 KB and its Spanish shadow 19.3 to 29.7 - six new screens ' +
      'and three rewritten ones - and the instructor guide entry took ' +
      'instructorPortal.js from 313.0 to 322.0 KB. The two deferred prose ' +
      'catalogs grew 9.7 and 9.2 KB, and are counted twice because ' +
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
      'deferred prose catalogs grew 12.3 and 11.6 KB and are counted twice, ' +
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
      'work, which is entirely eager: 3028.6 KB, 51.4 KB of room.\n\n' +
      'Raised from 3080 to 3250 for the gravitational-wave work, and this ' +
      'one is itemized in two halves because two different things happened.\n\n' +
      'The first half is a debt. Three commits went in with the release gate ' +
      'deferred - the teaching-data validation fix, the classroom activities ' +
      'and the conservation-diagnostics pass - and nobody ran this check ' +
      'against them. Measured from a fresh build at each commit: 3044.1 KB at ' +
      '34bd6f4, the last green gate, and 3103.5 KB three commits later. That ' +
      '59.4 KB was already over the 3080 limit before the work below started, ' +
      'and it is recorded here rather than folded silently into the new ' +
      'number. It is two lessons\u2019 worth of activity content, guides and ' +
      'worksheets in two languages, which is what this budget is loose for; ' +
      'the omission was running the check, not the content.\n\n' +
      'The second half is the gravitational-wave lab: 3103.5 to 3189.2 KB. ' +
      'The waveform model, the timeline, the transform, the seeded noise and ' +
      'the overlap are about 14 KB; the lab panel, its drawing and its state ' +
      'about 22 KB; the bundled GW150914 figure data 23 KB, which is eight ' +
      'published traces at 4096 Hz and is the only reason anything in this ' +
      'feature can be called a measurement; and the prose about 20 KB across ' +
      'two catalogs. A lesson and an instrument is what the paragraph at ' +
      'the top of this reason says this budget is loose for, and the 24-step ' +
      'lesson itself is still to come, which is what the headroom is for.\n\n' +
      'The trade the initial budget demands was made, and it more than paid ' +
      'for itself. The speaker panel, its styling and its state machine added ' +
      'about 7.5 KB of eager JavaScript and CSS, which would have taken the ' +
      'start-up download from 833.8 to 841.3 KB. Nothing was raised. What ' +
      'paid for it was thirteen kilobytes of instrument labels - the ' +
      'dark-matter, transit and black-hole widget families, 243 strings in ' +
      'two languages - which were in the start-up catalog and could not be ' +
      'rendered from it: all three modules are reachable only through ' +
      'js/widgets.js, which only the lazy lesson engine imports. Each now ' +
      'calls ensureDeferredMessages() itself, the way chaosW and resW already ' +
      'did. The initial download is 828.6 KB against an untouched 830.0 ' +
      'limit - lower than the 828.5 KB it was at the last green gate to ' +
      'within a tenth of a kilobyte, across a feature that added a panel, a ' +
      'popover, two instruments and a bundled dataset.\n\n' +
      'Raised again from 3250 to 3350 for the lesson those two instruments ' +
      'exist to serve: 3189.2 to 3280.2 KB, measured from a fresh build. ' +
      'Twenty-four steps of English and their Spanish shadow are about 60 KB ' +
      'between the two lesson chunks; the instructor guide entry is about ' +
      '18 KB inside the portal chunk, which is where every other guide already ' +
      'lives; the notebook capture helper and the gravitational-wave evidence ' +
      'strings are the rest. A lesson is the first thing the paragraph at the ' +
      'top of this reason says this budget is loose for.\n\n' +
      'The initial download did NOT move and its limit was NOT touched: ' +
      '828.6 KB before the lesson and 829.0 KB after, against 830.0. The four ' +
      'hundred bytes are the lesson id in the manifest and its subject tag in ' +
      'the browse metadata, which is the whole of a nineteenth lesson\u2019s ' +
      'share of what a first-time visitor downloads.' +
      '\n\nRaised from 3350 to 3420 for the stellar model and the Stellar ' +
      'Lab: 3280.2 to 3382.6 KB, measured from a fresh build either side. ' +
      'The 102.4 KB is accounted for down to the kilobyte. Fifty-five and a ' +
      'half of it is the model - 46.2 KB of that a single file, the seven ' +
      'thinned MIST tracks in js/data/stellar/mistTracks.js, which is a ' +
      'dataset rather than code and is the reason the tracks were thinned at ' +
      'all. Twenty-seven is the lab itself, two thirds of it the three ' +
      'widgets. The remaining twenty is a hundred and seventy labels in each ' +
      'of two languages, in the deferred half of the catalog where every ' +
      'other instrument\u2019s prose lives.\n\n' +
      'The initial download went DOWN, from 830.0 to 825.7 KB against a limit ' +
      'that has not moved. The lab itself is reachable only through ' +
      'js/widgets.js and cost the start-up path five bytes; what bought the ' +
      'rest was 6.3 KB of stylesheet for classes no HTML or script names any ' +
      'more - the old .sonification-panel among them, replaced by the speaker ' +
      'popover, and the mobile object-type rail, the energy-stats block and ' +
      'the light-curve controls, all of which outlived their markup. ' +
      'tools/ has no dead-CSS check; the sweep that found them was a scan ' +
      'for class names no .js, .html or .mjs in the tree mentions, either ' +
      'literally or as a template-assembled prefix.' +
      '\n\nRaised from 3420 to 3500 for the lesson the lab exists to serve: ' +
      '3382.6 to 3464.2 KB. Twenty-eight steps of English are 44.2 KB and ' +
      'their Spanish shadow 27.6 KB, in two chunks neither of which a visitor ' +
      'fetches unless they open this lesson; the instructor guide is another ' +
      '22.5 KB of source inside the portal chunk, where every other guide ' +
      'already lives. A lesson is the first thing the paragraph at the top of ' +
      'this reason says this budget is loose for, and this is the twentieth.' +
      '\n\nThe initial download did NOT move and its limit was NOT touched: ' +
      '825.7 KB before the lesson and 825.8 after, against 830.0. The hundred ' +
      'bytes are the lesson id in the manifest and its two tags in the browse ' +
      'metadata.' +
      '\n\nRaised from 3500 to 3560 for the evolutionary playback: 3466.3 to ' +
      '3505.1 KB. Fifteen of the thirty-nine is the playback widget, thirteen ' +
      'is a hundred and thirty labels in two languages, six is the endpoint ' +
      'prescriptions and their citations, and four is an eighth MIST track. ' +
      'That last one is the only entry here that is data rather than code, ' +
      'and it is there because a black hole asserted from a mass cut would ' +
      'be teaching the opposite of what the sources say: the 40 solar-mass ' +
      'track is where they agree, and it cost 3.8 KB to stop guessing.\n\n' +
      'The initial download did NOT move and its limit was NOT touched: ' +
      '825.8 KB either side, against 830.0. Every module above is reachable ' +
      'only through js/widgets.js.' +
      '\n\nRaised from 3560 to 3650 for the second stellar lesson: 3513.5 to ' +
      '3601.9 KB. Fifty of the eighty-eight is thirty-four steps of English, ' +
      'thirty-five is their Spanish shadow, and twenty-two is the instructor ' +
      'guide inside the portal chunk. Neither lesson chunk is fetched unless ' +
      'somebody opens that lesson. This is the twenty-first, and a lesson is ' +
      'the first thing the paragraph at the top of this reason says this ' +
      'budget is loose for.\n\n' +
      'The initial download did NOT move and its limit was NOT touched: ' +
      '825.8 KB either side, against 830.0.' +
      '\n\nRaised from 3650 to 3760 for the beginner gravitational-wave lesson, and this one carries a deferral in the other direction. Measured from a fresh build at 418f142: 3608.4 to 3730.7 KB. Of the 122.3 KB, 37 is the lesson chunk itself and 28 its Spanish shadow - twenty-four screens of prose neither of which a visitor fetches unless they open the lesson - and 17 is the instructor guide inside the portal chunk where every other guide already lives. This is the twenty-second lesson, and a lesson is the first thing the paragraph at the top of this reason says this budget is loose for.' +
      '\n\nThe remaining 12.6 KB arrived here on purpose, out of the budget above. lessonFn.* is every sentence a lesson computes - 133 probe rows and answer-checking messages, keyed by what they say - and it was in the start-up catalog where nothing could render it: js/i18n/lesson.js is its only reader, js/investigations.js its only importer, and js/investigationsLoader.js already awaits the deferred catalog before initInvestigations(). Every visitor was downloading all 133 in order to render none.' +
      '\n\nSo the initial download went DOWN across this lesson, and below where it started: 829.8 KB at 418f142, 832.2 KB with the lesson in and the limit breached by 2.2, and 819.6 KB once lessonFn moved - against a limit that has not moved. A dead-CSS sweep was tried first and found nothing; the previous pass had already taken it.' +
      '\n\nRaised from 3760 to 3800 for the main-scene pass over five existing lessons - Weighing the Stars, Black Holes by the Numbers, Finding Planets by Their Tug, The Goldilocks Question and Can You Detect This Planet? Measured from the previous entry: 3730.7 to 3768.1 KB. Most of the 37.4 is prose. The five lessons gained scene instructions, model-limit notes and probe readouts in English and again in Spanish; the instructor guides gained expectations for the new screens and a rewritten model-notes section each, inside the portal chunk where every other guide already lives; and the two new notebook entries - a binary orbit measured off the scene, and a run of horizon trials - brought about forty strings in each of two deferred catalogs, which validationWorker.js bundles as well and so counts twice.' +
      "\n\nRaised from 3800 to 3830 for finishing A Universe of Stars, measured against 0b3a81c: 3781.7 to 3804.5 KB. Two thirds of it is Spanish. The Spanish shadow went 27.7 to 36.6 KB - two new screens, and the star names, which had never been translated: a name is read out on the canvas, in the object list, on the comparison card and in a capture, so twenty-five stage blocks now carry one. The English lesson went 46.8 to 50.9 for the same two screens plus a written explanation on the radius-ratio step. The instrument chunk took 4.0 KB for the shared sample: one resolver both the canvas and the comparison card read, pins that carry an identity, the focus control, and the population panel driving the scene's own brightness cut. The instructor guide took 2.4 KB and the two prose catalogs 2.1, which validationWorker.js bundles as well and so counts again." +
      "\n\nThe initial download did NOT move and its limit was not touched: 821.3 KB before, 821.6 after, against 830.0. Its share of this work is three lines - the control rail counted into the stage fit, the selection-change repaint in the lesson runtime, and the guard that stops a press on the inspector's own header being read as a drag." +
      '\n\nThe code is the small half. js/lesson/barycenter.js is 4.6 KB of pure arithmetic, and the four new stage kinds in js/lessonStage.js - a star pair, a black hole with orbiters, an equal-mass comparison and a star with elliptical planets - are about 9 KB between them. All of it is behind js/widgets.js and js/investigations.js, which only the lazy lesson engine imports.' +
      '\n\nRaised from 3830 to 3870 for finishing the two gravitational-wave lessons, measured against the previous entry: 3804.5 to 3846.4 KB. The beginner lesson gained three screens - a static mass, a pulsing sphere and a binary, each one staged rather than described - and split the observatory screen in two; with its Spanish shadow behind it that is about half the total. js/lesson/gwWavefronts.js is 4.4 KB of pure geometry, and the widget half that drives it - the source selector, the amplification control, the L-shaped arms, and the polarisation and component rows - is another 6. The instructor guide took 4.5 KB inside the portal chunk. The rest is prose in two catalogs, which validationWorker.js bundles as well and so counts twice; the source and polarisation rows are long on purpose, because they are where the lesson says what the model did and did not decide.' +
      "\n\nRaised from 3870 to 3890 for the prediction loops and the legibility pass, measured against the previous entry: 3846.4 to 3874.1 KB. Itemised, because this one is neither a lesson nor an instrument and so is not what the paragraph at the top says this budget is loose for. About twenty-two of it is the loop work: seven new steps across six lessons with their Spanish shadows behind them, the instructor expectations for the two new measurements, and the held-prediction machinery - eighty reveal declarations, the verdict block that shows a reader what they predicted against what happened, and its strings in two catalogs, which validationWorker.js bundles as well and so counts twice. The remaining five are accessibility: every plotted point is now also a row in a table beside the chart, and the object list's role chips are translated - sixty labels in each language, which is the largest single item here and is the price of not showing a Spanish reader an English word beside a Spanish name. Half of what those sixty would have cost was paid back in the same change: the label is derived from the key where derivation is right, and a chip whose label would only repeat the body's own name is not drawn at all.\n\nThe initial download was NOT raised and ended this work inside its untouched limit: 826.7 KB before, 829.4 after, against 830.0. The sixty role labels went to the deferred catalog rather than the start-up one the moment they pushed it over - only the lesson engine reads them, and it is lazy - which is the trade that budget asks every new feature to make.\n\nAnd then put back to 3870, because the /teaching/ pass found the saving that pays for all of it and more. js/activities/activityBridge.js imported the whole showcase page's catalog - its cycle, its journey, its instrument descriptions, its demonstrations, its access notes and its evaluation template, in both languages - in order to put a title on an assignment. None of that prose can be rendered by the application. The `teach.activity.*` half is js/i18n/en.activities.js now and the bridge imports only that; ./en.teaching.js spreads it back in, so the page and every test that reads one catalog are unchanged. 3900.9 KB to 3839.8, which is 30 below the number this was before the raise. The raise above is left on the record rather than deleted: it was real while it stood, and the accounting is worth more than a tidy history." +
      '\n\nThe initial download stayed inside its untouched limit, and the trade this budget asks for was made in the same change: 826.7 KB of 830.0. Its share of the work is the wavefront painter in js/render.js and one overlay slot in js/appState.js. What pays for them went the other way - the five summary.life.* sentences moved out of the start-up catalog into the deferred one, because a lesson overlay is the only thing that reads them and a visitor who never opens a lesson was downloading all five in both languages in order to render none.' +
      '\n\nThe initial download was NOT raised and had room: 819.6 KB before this pass and 821.1 after, against an untouched 830.0. Its share is the barycenter overlay in js/render.js, one state slot, the probe-context accessors, and two options in the event-watch markup - the parts that genuinely have to be there before a lesson opens.' +
      '\n\nRaised from 3870 to 3880 for the v1.0.0 instructor pass, measured at ' +
      '3874.0 KB. Two items, both of them content this budget says it is loose ' +
      'for. Five investigations gained the closing summary every other lesson ' +
      'already had - radial-velocity, what-is-a-gravitational-wave, ' +
      'listening-to-spacetime, a-universe-of-stars and lives-of-stars, each ' +
      'with its Spanish shadow: 9.7 KB of English and 8.8 KB of Spanish source. ' +
      'And js/data/activityTeaching.js went from 10.5 KB to 35.3 KB, which is ' +
      'the larger half: three of the six activity formats had no teaching ' +
      'entry at all and their generated guides printed with no launch link, no ' +
      'setup, no beats and no rubric, and all six gained the preparation, ' +
      'reset, live-simulation, misconception, recovery, accessibility and ' +
      'worksheet-mapping sections the guides now carry. It reaches this budget ' +
      'through dist/js/instructorPortal.js, which is a separate bundle the ' +
      'simulation never loads.\n\n' +
      'The initial download went DOWN in the same change, from 832.3 KB to ' +
      '811.0, against a limit that still has not moved. css/page.css - the ' +
      'stylesheet for /model/, /instructors/, /validation/ and /teaching/, of ' +
      'which index.html links not one rule - had been concatenated into ' +
      'css/app.css all along, so 21 KB of document-page styling was part of ' +
      'what a first-time visitor to the sandbox waited for. It is a page ' +
      'stylesheet now, like css/teaching.css before it. That is the trade this ' +
      'budget asks for: a dashboard fix wanted two kilobytes, and what it got ' +
      'was a sheet deferred rather than a ceiling raised.' +
      '\n\nRaised from 3880 to 3950 for the spherical-astronomy module and ' +
      'the one lesson built on it, measured at 3930.3 KB. Four items, three ' +
      'of them the content this budget says it is loose for. ' +
      'js/observingWindow.js is 43.9 KB of source, and more than half of ' +
      'that is the header and the JSDoc rather than code: the truncated ' +
      'lunar series is a hundred lines of coefficients and the rest is the ' +
      'argument for why time is an argument there and never a reading. Its ' +
      'widget is 15.5 KB, the lesson 28.7 with a 17.0 KB Spanish shadow ' +
      'behind it, and the instructor guide 12.0 inside the portal chunk, ' +
      'which the simulation never loads.\n\nNone of it is reachable from ' +
      'the entry graph, and the chain is short enough to check by hand: the ' +
      'module is imported by the widget, the widget by js/widgets.js, and ' +
      'js/widgets.js by js/investigations.js, which only the lazy lesson ' +
      'engine imports.\n\nThe initial download did NOT move and its limit ' +
      'was not touched: 811.0 KB against 830.0, exactly where it stood ' +
      'before this work. That is the whole of what deferring it was for - a ' +
      'visitor who never opens a lesson downloads none of the above.' +
      '\n\nRaised from 3880 to 3900 for the accessibility-parity pass, measured at ' +
      '3891.0 KB against 3874.1 before it. This one is raised rather than paid ' +
      'for, and the accounting is here because the rule above says to look for ' +
      'a module to defer first. There was nothing to defer: every byte of this ' +
      'work is already behind a dynamic import and none of it is in the ' +
      'start-up path. Itemised, 16.9 KB: js/precisePlacement.js is 6.4 KB, the ' +
      'form that lets a reader build a system by typing a position, a velocity ' +
      'and a mass instead of clicking and dragging; its strings are 2.6 KB of ' +
      'English and 2.7 of Spanish; js/seriesTable.js is 2.1 KB, which renders ' +
      'the numbers behind the light curve, the radial-velocity trace and the ' +
      'rotation curve as a table a screen reader can read; and the rest is the ' +
      'rotation-curve exporter, the one instructional plot that had no CSV.\n\n' +
      'Raised from 3960 to 4030 at integration, for the power-law gravity ' +
      'lesson, which is an accepted v1.1 teaching feature rather than ' +
      'unexplained growth. The arithmetic, all of it from fresh builds of the ' +
      'combined tree: #16 and #17 together measure 3952.4 KB, the power-law ' +
      'work adds 68.9, and the total is 4021.3. 4030 is the next round number ' +
      'above that, and it leaves 8.7 KB rather than the 1.3 that a ceiling of ' +
      '4022 would leave on a figure that generated artifacts alone can move.' +
      '\n\nItemised against the source: js/powerLawGravity.js is 27.8 KB - ' +
      'the model, its potential, the RK4 integrator the lesson measures with, ' +
      'and a header that argues for the reference radius at more length than ' +
      'it implements it - js/powerLawLab.js 12.1 and js/powerLawWidgets.js ' +
      '13.1. The lesson is 33.1 KB of English with a 28.2 KB Spanish shadow, ' +
      'twenty-one screens of which six carry an instrument, and the instructor ' +
      'guide is 158 lines inside the portal chunk, which the simulation never ' +
      'loads. The prose catalogs are counted twice, because validationWorker.js ' +
      'bundles them as well.' +
      '\n\nThe laziness and duplication audit the rule above asks for was done ' +
      'before this was raised and found nothing to reclaim. No power-law ' +
      'module is eager: the chain is js/widgets.js to powerLawWidgets.js to ' +
      'powerLawLab.js to powerLawGravity.js, and js/widgets.js is reached only ' +
      'from the lazy js/investigations.js. The model is bundled exactly once - ' +
      'checked by probing the built chunks for apsidalPrecessionNearCircular ' +
      'and expectedKeplerSlope, which appear in the lesson chunk and nowhere ' +
      'else, so it is not in validationWorker.js the way the prose is. All ' +
      'three modules are reachable and used, so there is no dead file to drop. ' +
      'The one string this lesson adds to js/i18n/en.deferred.js, which four ' +
      'bundles embed, is a lesson count that project-metadata.mjs derives.' +
      '\n\nThe initial download is constrained separately and was not raised: ' +
      '816.5 KB against an untouched 830.0, up 0.1 KB from the tree before ' +
      'this lesson. A visitor who never opens it downloads none of the above.\n\n' +
      'The strings cost four times that before they were moved. ' +
      'js/i18n/en.deferred.js is embedded in four separate bundles - the lazy ' +
      'chunks, the instructor portal, the validation worker - so fifty strings ' +
      'added there are downloaded four times by the reader who needs them and ' +
      'three times by readers who cannot reach the feature at all. They are ' +
      'js/i18n/en.placement.js now, imported by the two lazy modules and ' +
      'registered for the one locale in use, which is the split ' +
      'js/i18n/en.activities.js made for the same reason. Four copies to one.\n\n' +
      'The initial download was NOT raised and did not need to be: 811.0 KB ' +
      'before, 813.0 after, against an untouched 830.0. Its share is the rail ' +
      'button, its two strings, and fromCsv() in js/csv.js - which is what lets ' +
      'a table render the exporter’s own output instead of building rows of ' +
      'its own, so the table on screen and the file a reader downloads cannot ' +
      'be two derivations that disagree.' +
      '\n\nRaised from 3950 to 3960 at integration, and this one is not a ' +
      'feature asking for room - it is arithmetic. The two paragraphs above ' +
      'were each measured on their own branch against a 3874.1 KB baseline, ' +
      'and each fits the ceiling it asked for: the spherical-astronomy work ' +
      'measures 3935.9 of the 3950 it justified, the accessibility-parity work ' +
      '3891.0 of its 3900. Together on the integrated tree they measure ' +
      '3952.4, which is 2.4 KB over the higher of the two. Nothing unexplained ' +
      'grew; the sum of two approved costs is simply larger than either.\n\n' +
      'The laziness audit that the rule above asks for was done before raising ' +
      'this rather than after. Every module either feature added is behind a ' +
      'dynamic import - js/precisePlacement.js, js/seriesTable.js, ' +
      'js/place/preciseFields.js, both placement catalogs, js/observingWindow.js ' +
      'and its widget - and the static import closure from js/main.js reaches ' +
      'none of them. No module became eager: the initial download moved 813.7 ' +
      'to 816.4 KB, which is the rail button, its two strings and fromCsv(), ' +
      'against an untouched 830.0 limit. There was no duplication to recover: ' +
      'the accessibility pass had already removed the largest one it found, ' +
      'moving fifty strings out of js/i18n/en.deferred.js, which four separate ' +
      'bundles embed, into a catalog loaded once.\n\n' +
      'So the honest description of this raise is that v1.1 ships two accepted ' +
      'features whose costs were each accounted for separately, and 3960 is ' +
      'where their sum lands with seven kilobytes to spare. The power-law ' +
      'gravity lesson is deferred to v1.2 for exactly this reason: adding it ' +
      'as well measures about 4005 KB, which is a third feature asking for a ' +
      'third raise, and that is the point at which the rule above says to look ' +
      'for something to defer instead.\n\n' +
      'Raised from 4030 to 4080 for four observed stellar spectra, approved by ' +
      'the owner at integration after the audit below. The arithmetic, from ' +
      'fresh builds: the v1.1 tree measures 4021.3 KB, the spectra as first ' +
      'written add 57.8, one cleanup takes back 6.3, and the total is 4073.0. ' +
      '4080 is the next round number above it and leaves 7.0 KB, the same ' +
      'margin 4030 was chosen for. It is a raise and not a fit: the 4020 this ' +
      'feature was first authorised against predates the power-law lesson, and ' +
      'the v1.1 baseline alone was already over it.' +
      '\n\nItemised by esbuild metafile attribution rather than by probing ' +
      'built files for strings - a probe for a widget id had counted the ' +
      'lesson steps, which name it, as duplicated widget code. The data is ' +
      '15.5 KB in a chunk of its own, reached only by a dynamic import in ' +
      'js/stellarSpectraWidgets.js; the widget and js/stellar/spectrumIndex.js ' +
      'are 9.2 KB, in the widget-registry chunk and nowhere else; the six ' +
      'lesson screens are 12.0 KB of English and 8.9 of Spanish; and the ' +
      'specW strings are 6.6 across the two deferred catalogs. The lesson ' +
      'steps are also in submissionReview.js and the strings in ' +
      'validationWorker.js, for the reasons they always are, and neither of ' +
      'those bundles is counted here.' +
      '\n\nThe audit took one thing back and declined one. Taken: the ' +
      'spectra provenance record - archive, selection, transformations, ' +
      'checksums, 8.4 KB - was inside the lazy data chunk and nothing in the ' +
      'browser read it, so it is js/data/spectra/sdssSpectraProvenance.js now, ' +
      'generated and verified with the data and imported by nothing in js/, ' +
      'which a test enforces. The chunk went from 23.8 KB to 15.8. Declined: ' +
      'moving the specW strings into a feature catalog, as the placement work ' +
      'did. It would save nothing here - the only copy it removes is the one ' +
      'in validationWorker.js - and a lesson widget, unlike a dialog, cannot ' +
      'await its own catalog before it is drawn, so a screen reader could ' +
      'announce a message id as a control label on a resumed lesson.' +
      '\n\nThe data is not thinned to fit. Three samples to one costs at most ' +
      '1.32 percentage points of band depth in the features the lesson uses, ' +
      'against a smallest contrast it asks a reader to see of about six; ' +
      'four to one would cost 2.0, a third of that contrast. The initial ' +
      'download is untouched: 816.5 KB of 830.0 before this feature and after ' +
      'it, and a visitor who never opens the lesson browser downloads none of ' +
      'the above.' +
      '\n\nRaised from 4080 to 4180 for five real mergers in Listening to ' +
      'Spacetime, approved by the owner after the itemisation below. From ' +
      'fresh builds: 4076.8 KB with the lazy-instrument slice, 4174.6 with ' +
      'this lab, 97.8 more. By esbuild metafile attribution: 54.1 KB is the ' +
      'strain - thirty-two seconds from one detector for each of five events, ' +
      'whitened, decimated to 1024 Hz and quantised to 16 bits under a guard ' +
      "that moves the lesson's slice table by under 1%, in a chunk of its own " +
      'behind a dynamic import; 25.8 is seven new screens, 13.5 of English and ' +
      '12.3 of Spanish; 7.5 is the instrument and its constant-Q map ' +
      '(js/gwEventWidgets.js, js/gw/qscan.js); 8.3 is its strings in the two ' +
      'deferred catalogs; the rest is chunk overhead. The 19 KB provenance ' +
      'record is imported by nothing in js/ and is not counted.' +
      '\n\nDeclined: cutting GW170817 from 6.5 s to 3 s. It saves about 7 KB, ' +
      'costs the screen that contrasts its faint track with a brighter noise ' +
      'patch four seconds away, and would still need a raise. The instrument ' +
      'is lazy, and so is the older gravitational-wave family it shares ' +
      'helpers with, so a visitor who opens any other lesson loads less than ' +
      'before this lab, not more (tools/route-budgets.json). The initial ' +
      'download is untouched: 816.6 KB of 830.0 before and after. 4180 leaves ' +
      '5.4 KB.' +
      '\n\nNOT raised for the Orbital System Builder (Prompt 28), measured ' +
      'from fresh builds against c626aa3: 4178.8 KB before, 4179.6 after. By ' +
      'esbuild metafile the builder is 48.5 KB - the panel 18.5 with its own ' +
      'stylesheet, its arithmetic 10.2, its strings 8.7 of English and 9.7 of ' +
      "Spanish, and 1.5 of chunk overhead and the button's Spanish - and it " +
      'is paid for by vendoring only the three.js the 3-D view uses. ' +
      'tools/vendor-deps.mjs re-exported the whole library, and the ' +
      'pre-bundled file had lost the side-effect-free hint that would have ' +
      'let esbuild drop what the view never touches: 529.1 KB of three.js ' +
      "in the 3-D view's chunk became 481.4 (-47.7), and the view draws what " +
      'it drew. That leaves 0.4 KB here. The initial download went 819.4 to ' +
      "820.1 KB against an untouched 830.0: the button, the coordinator's kit " +
      'for the builder and two share-link fixes.' +
      '\n\nThen 13.6 KB back, measured from fresh builds against 4351077: ' +
      '4179.6 KB to 4166.0. The English catalog carried 139 lessonFn.* ' +
      'entries - the sentences a lesson computes - and every one of them was ' +
      'keyed on its own text, so js/i18n/lesson.js, which returns a ' +
      'sentence unchanged when the locale has no entry, rendered exactly the ' +
      'same English without them. They are gone; the Spanish translations ' +
      'keep the same ids. Every lesson route is 13.6 KB lighter with them, ' +
      'because the lesson engine awaits this catalog before its first step.\n\n' +
      'Then 49.7 KB back, measured from fresh builds: 4164.5 KB to 4114.8, ' +
      'with no ceiling touched. esbuild writes every non-ASCII character as an ' +
      'escape by default - six bytes for an em dash, four for an accented ' +
      'vowel - and the Spanish catalogs and lesson shadows are made of them. ' +
      'build.js now sets charset: utf8 for the application bundle, so the ' +
      'characters are written as themselves, two or three bytes each. Module ' +
      'scripts are always decoded as UTF-8, so it is the same program. The ' +
      'figure is the raw bytes this budget counts; compressed, the escapes ' +
      'were already cheap, so the saving on the wire is a good deal smaller. ' +
      'The initial download went 796.8 to 796.2 KB.' +
      '\n\nRaised from 4180 to 4300 for the light and spectra lessons ' +
      '(Prompt 83) and the science prompts queued behind them, on the ' +
      "owner's direct instruction 'go with option 1' after the itemised " +
      'proposal: the lesson Color and Temperature and its instruments took ' +
      'the deferred total from 4108.5 to 4174.0 KB with the remaining parts ' +
      'of the prompt (a spectrum viewer and two lessons, about 100 KB) still ' +
      'to come. Every byte is behind a dynamic import; the initial download ' +
      'is untouched. Further raises are itemised the same way.' +
      '\n\nMeasured gzipped from 2026-10-09 (Carl approved the change in the ' +
      'queue session), not raw. Every limit above this paragraph is in raw ' +
      'kilobytes. Raw bytes had stopped tracking what a reader downloads: ' +
      'writing catalog key prefixes once (#209) took 45.7 KB off the raw total ' +
      'and almost nothing off the wire, so recoveries bought room the reader ' +
      'never saw. The figure is each deferred chunk gzipped on its own at ' +
      "zlib's default level, as a static host serves it, summed by build.js " +
      'into .build-report.json (deferredJsGzipBytes). At v2 6277240 the ' +
      'deferred JavaScript was 4174.0 KB raw and 1513.0 KB gzipped (Node 24; ' +
      'Node 20, which CI runs, compresses about 0.2% smaller). The limit keeps ' +
      'exactly the room the 4300 KB raw ceiling gave: 1513.0 x 4300 / 4174.0 = ' +
      '1558.7, rounded up to 1559. The raw total is still printed beside it, ' +
      'and is still what the README quotes, because raw sizes are the same on ' +
      'every Node.' +
      '\n\nRaised from 1559 to 1573.8 KB gzipped for What a Spectrum Is Made Of ' +
      'and the Kirchhoff demonstrator (Prompt 83, part 3), measured at ' +
      '1,611,524 bytes (1573.75 KB; 4330.9 KB raw) after merging v2. Under ' +
      "the owner's standing size-budget approval (CLAUDE.md, 2026-10-10); " +
      'D-BUDGET-04. The initial download is untouched (789.0 of 830 KB).' +
      '\n\nRaised from 1573.8 to 1637.9 KB gzipped for the five sky ' +
      'investigations (Prompt 89) with their Spanish, depths, instrument family ' +
      'and guides, measured at 1,677,161 bytes (1637.85 KB; 4492.4 KB raw) ' +
      'after merging v2 ce3d2e8. Under the same standing approval; ' +
      'D-BUDGET-07.' +
      '\n\nRaised from 1637.9 to 1693.6 KB gzipped for Prompt 92 part 2 (D-BUDGET-09, the standing size-budget approval): the galactic instrument family (js/galacticWidgets.js, the galactic model and its words) and three investigations with their Spanish and depth files, which the composer, course-packs, course-builder, kit and submission bundles each carry. The three Gaia and rotation-curve packs are fetched sidecar files (gaia/*.json) and are in no bundle. Measured 1,734,208 bytes gzipped after merging v2 ae4815f, 1693.56 KB, an overrun of 55.66 KB (1,733,851 bytes, 1693.21 KB, on the branch before the merge); with the rows in modules, copied into three bundles, the overrun was 112.55 KB.' +
      '\n\nRaised from 1736.2 to 1773.6 KB gzipped for Prompt 94 (D-BUDGET-13, the standing size-budget approval): the lensing instrument family (js/lensingWidgets.js, its words and the lensing kernel) and three investigations with their Spanish and depth files, which the composer, course-packs, course-builder, kit and submission bundles each carry. Measured 1,816,142 bytes gzipped after merging v2 797c7c6 (#248), 1773.58 KB, an overrun of 37.38 KB. No authentic light curve ships, so there is no data pack to move out.' +
      '\n\nRaised from 1773.6 to 1811.5 KB gzipped for Prompt 95 (D-BUDGET-15, the standing size-budget approval): the interiors instrument family (js/interiorsWidgets.js, its words and the stellar kernel with its Worker) and three investigations with their Spanish and depth files, which the composer, course-packs, course-builder, kit and submission bundles each carry. Measured 1,854,886 bytes gzipped after merging v2 cc30621e (#249), 1811.41 KB, an overrun of 37.8 KB. No data pack ships, so there is nothing to move to a sidecar.' +
      '\n\nRaised from 1811.5 to 1870.3 KB gzipped for Prompt 96 part 2 (D-BUDGET-17, the standing size-budget approval): the variable-star instrument family (js/variableWidgets.js, its words and the variables kernel) and four investigations with their Spanish and depth files, which the composer, course-packs, course-builder, kit and submission bundles each carry. Measured 1870.3 KB gzipped (5089.9 KB raw) after merging v2 782b326, an overrun of 58.8 KB. The two TESS light curves, the Cepheid table and the class sample are fetched sidecar files (variables/*.json) and are in no bundle.' +
      '\n\nRaised from 1870.3 to 1872 KB gzipped for the cosmology kernel, ' +
      'its lazy pack loaders and the forward model (Prompt 91, part 1), ' +
      'measured at 1,916,873 bytes (1871.95 KB; 5093.6 KB raw) after merging ' +
      "v2 3d655eb. Under the owner's standing size-budget approval (CLAUDE.md, " +
      '2026-10-10); D-BUDGET-19. The packs themselves are sidecar files.' +
      '\n\nRaised from 1872 to 1927.4 KB gzipped for Prompt 91 part 2 (D-BUDGET-20, the standing size-budget approval): the cosmology instrument family (js/cosmologyWidgets.js and its words), four investigations with their Spanish and depth files and the First Rung step, which the composer, course-packs, course-builder, kit and submission bundles each carry. Measured 1,973,616 bytes gzipped (1927.36 KB, 5233.9 KB raw) after merging v2 b888735, an overrun of 55.36 KB. The four data packs are fetched sidecar files (cosmology/*.json) and are in no bundle.' +
      '\n\nRaised from 1927.4 to 1935.7 KB gzipped for Prompt 97 (D-BUDGET-22, the standing size-budget approval): the six named sequences with their reasons and depth labels in both languages, ten ladders and feedback texts on numeric steps in ten investigations and their Spanish shadows, the short-route derivation in the assignment builder, and the three course packs (js/data/courses/*.js, lazy files the course home, builder and composer routes carry). Measured 1,982,123 bytes gzipped (1935.67 KB, 5258.4 KB raw) after merging v2 916f933, an overrun of 8.27 KB.' +
      '\n\nRaised from 1935.7 to 1938.6 KB gzipped for Prompt 86 (D-BUDGET-24, the standing size-budget approval): the detector kernel and the ccd forward model, which the forward-model registry carries into the bundles that import it. Measured 1,985,098 bytes gzipped (1938.57 KB, 5266.0 KB raw), an overrun of 2.87 KB. The detector instruments are not registered until a lesson uses them (D-CALIB-02).' +
      '\n\nRaised from 1938.6 to 1986.2 KB gzipped for Prompt 86 part 2 (D-BUDGET-25, the standing size-budget approval): the detector instrument family (js/detectorWidgets.js and its words), three investigations with their Spanish and depth files, and their instructor content, which the composer, course-packs, course-builder, kit and submission bundles each carry. Measured 1986.1 KB gzipped (5396.6 KB raw, rounded up to 1986.2), an overrun of 47.6 KB.' +
      '\n\nRaised from 1986.2 to 1988.3 KB gzipped for the Pantheon+ pack record (js/data/observations/pantheonPlusHd.js, its citations and licence record, a lazy chunk behind loadPantheonPlus; D-RIGHTS-04 and D-BUDGET-27, the standing size-budget approval). Measured 2,035,956 bytes gzipped (1988.24 KB, 5400.9 KB raw) after merging v2 78f44b4, an overrun of 2.04 KB. The 1,701 rows are a fetched sidecar (cosmology/pantheon-plus-hd.json) and are in no bundle.' +
      '\n\nLowered from 1988.3 to 1973.8 KB gzipped by the budget-recovery pass (D-BUDGET-28): esbuild wrote a sourceMappingURL comment at the end of every chunk, a 40-byte hash that does not compress, about 36.8 bytes gzipped on each of the 401 deferred chunks. build.js now emits the maps without the comment (sourcemap: external); the .map files are still written. Measured 2,021,119 bytes gzipped (1973.75 KB, 5384.1 KB raw), 14,758 bytes fewer than the 2,035,877 of v2 707f278f. The initial download also fell, 789.0 to 786.8 KB; its 830 KB ceiling was not touched.' +
      '\n\n' +
      'The formula language (Prompt 100) took the deferred total from 1973.8 ' +
      'KB (D-BUDGET-28) to 1987.9 KB gzipped (5417.5 KB raw), 14.1 KB: the ' +
      'language itself is 5.8 KB (tools/formula-size.mjs), the question grader ' +
      '0.4 KB more, and the rest is its words in two languages, the ' +
      'Observatory and notebook forms, the composer field and the derived ' +
      'entry. The initial download did not move (789.0 KB). D-BUDGET-29, under ' +
      'the standing size-budget approval in the project CLAUDE.md.' +
      '\n\n' +
      'Raised from 1987.9 to 1988.0 KB gzipped for Prompt 101 (D-BUDGET-COMPUTE-01, ' +
      'the standing size-budget approval): the compute-capsule notebook source ' +
      'and its words in the deferred catalogs, on top of the formula language.\n\n' +
      'The 3-D lab on the platform (Prompt 105) took it from 1988.0 to 1989.2 ' +
      "KB gzipped (5421.1 KB raw), 1.2 KB: the lab's evidence panel and its " +
      'words, the scenario-pack link reader, the embed bridge, the forward ' +
      "models' 3-D bridge, the course pack's guide items and the 3-D " +
      'comparison source. The initial download did not move (786.8 KB). ' +
      'D-BUDGET-30, under the standing size-budget approval in the project ' +
      'CLAUDE.md.' +
      '\n\n' +
      'Raised from 1989.2 to 2004.5 KB gzipped for Prompt 102 ' +
      '(D-BUDGET-COMPUTE-02, the standing size-budget approval): two ' +
      'notebooks and their inputs, two investigations with their Spanish ' +
      'shadows and instructor guides, and one course-pack unit, in the ' +
      'deferred catalogs and lesson chunks, measured after merging v2 at ' +
      '4a7d3ed (5463.1 KB raw). The initial download did not move (786.8 KB).' +
      '\n\nDeclarative scenario geometry (Prompt 108, slice 1) took it from 2004.5 ' +
      'to 2006.4 KB gzipped (5468.8 KB raw), 1.9 KB: the geometry validator and the pack compiler for it (js/scenarioPack.js), the Studio words for the block, and the table and expander in js/scenarios.js, less the hand-built blocks they replace in js/world/build.js. The initial download did not move (787.5 KB). D-BUDGET-GEOM-01, under the standing size-budget approval in the project CLAUDE.md.' +
      '\n\nPrompt 107 slice 1 (the investigation chooser moved to ' +
      'js/investigations/browser.js, no behavior change) took it from 2006.4 ' +
      'to 2006.8 KB gzipped (5469.0 KB raw), 0.4 KB: the new module boundary. ' +
      'The initial download did not move (787.5 KB). D-BUDGET-31, under the ' +
      "standing size-budget approval in the project's CLAUDE.md." +
      '\n\n' +
      'Raised from 2006.8 to 2030.3 KB gzipped for the compute packages ' +
      '(D-BUDGET-COMPUTE-03, the standing size-budget approval, measured ' +
      'overrun 23.5 KB): three notebooks and their catalogue entries, three ' +
      'investigations with their Spanish shadows and instructor guides, and ' +
      'three course-pack items, in the deferred catalogs and lesson chunks. ' +
      '5533.5 KB raw. The initial download did not move.' +
      '\n\nPrompt 106 (the mission lab and Sky Lab on the platform), measured on v2 at 65ee9c3, took it from 2030.3 to 2030.7 KB gzipped (5534.7 KB raw), 0.4 KB: the made-record, notebook, My work, course and figure-builder readers for a mission and the words for them, with the evidence panel and address code kept as lazy files of their own. The initial download did not move (787.5 KB). D-BUDGET-32, under the standing size-budget approval in the project CLAUDE.md.' +
      '\n\nPrompt 107 slice 2 (the finish flow and report moved to ' +
      'js/investigations/finish.js, no behavior change), measured on v2 at ' +
      '31320aa, took it from 2030.7 to 2031.7 KB gzipped (5536.1 KB raw), ' +
      '1.0 KB: one more lazy chunk, and the report writer compresses apart from ' +
      'its former neighbors. The initial download did not move (787.5 KB). ' +
      'D-BUDGET-33, under the standing size-budget approval in the ' +
      "project's CLAUDE.md." +
      '\n\nPrompt 108, slice 2 (six scenarios declared as data), measured on v2 at dde3b92, took it from 2031.7 to 2032.6 KB gzipped (5538.6 KB raw, measured 2032.541), 0.9 KB (D-BUDGET-GEOM-02, the standing size-budget approval; measured on Node 24, CI on Node 20 reads lower). The declarations, validator branches and expander are in js/scenarios.js and js/scenarioPack.js; about 370 lines of hand-built blocks left js/world/build.js. No request ceiling moved.' +
      '\n\nPrompt 108, slice 3 (ten laboratory scenarios declared as data), measured on v2 at 5eaf6ef8, took it from 2032.6 to 2033.2 KB gzipped (5540.8 KB raw, measured 2033.168 on Node 24 against 2032.533 for v2 itself; CI on Node 20 reads lower), 0.6 KB (D-BUDGET-GEOM-03, the standing size-budget approval). The rule parameters, the declaration rows and the expander changes are in js/world/build.js, js/scenarios.js and js/scenarioPack.js; about 650 lines of hand-built blocks left js/world/build.js. No request ceiling moved.' +
      '\n\nPrompt 108, slice 4 (nine scenarios declared as data: the galaxy discs, the cluster, the belts, a tidal disruption and two black hole scenarios), measured on v2 at d065a21, took it from 2033.2 to 2033.4 KB gzipped (5540.7 KB raw, measured 2033.379 on Node 24 after a fresh node build.js; v2 itself measures 2032.971; CI on Node 20 reads lower), 0.2 KB (D-BUDGET-GEOM-04, the standing size-budget approval). Seven named rules and their parameters are in js/world/build.js and js/scenarioGeometry.js; about 470 lines of hand-built blocks left js/world/build.js. No request ceiling moved.' +
      '\n\nPrompt 112 (the schedule comparison searches in the inference Worker, js/rvCompareSearch.js), measured on v2 at e8ea9a2, took it from 2033.4 to 2034.0 KB gzipped (5541.3 KB raw, measured 2033.919 on Node 24), one new lazy module and the call into it. The initial download is 792.7 KB of 830.0. D-BUDGET-PERF-01, under the standing size-budget approval in the project CLAUDE.md.' +
      '\n\nPrompt 108, slice 5 (five placement-entangled scenarios declared as data: a place stage, three rules, the validator for both), measured on v2 at 73c8290, took it from 2034.0 to 2034.2 KB gzipped (5542.1 KB raw, measured 2034.127 on Node 24 after a fresh node build.js on the branch merged with v2 at 73c8290; v2 itself measures 2033.865 the same way; CI on Node 20 reads lower), 0.2 KB (D-BUDGET-GEOM-05, the standing size-budget approval). About 90 lines of hand-built blocks left js/world/build.js, which the application loads at start-up (initial download 792.6 KB); the validator and the rule schemas are in js/scenarioGeometry.js, which the Studio loads. No request ceiling moved.' +
      '\n\nPrompt 107 step 2b slice 2 (the planet, gas giant, asteroid, debris, comet and black hole drawers moved out of js/physics.js into js/bodyDraw.js; the spatial hash folded into js/physics.js), measured on v2 at 5cb03b4, took it from 2034.2 to 2034.3 KB gzipped (5542.4 KB raw, measured 2034.263 on Node 24 after a fresh node build.js on the branch merged with v2; v2 itself measures 2034.110; CI on Node 20 reads lower), 0.1 KB (D-DECOMP-11, the standing size-budget approval in the project CLAUDE.md). The initial download is 792.7 KB of 830.0; no request ceiling moved.' +
      "\n\nPrompt 108, slice 7 (the tidal disruption's stub as a place rule, the Studio group's reworded label and caution in both languages), measured on v2 at 2bea147, took it from 2034.3 to 2034.4 KB gzipped (5542.5 KB raw, measured 2034.365 on Node 24 after a fresh node build.js on the branch merged with v2; v2 itself measures 2034.266; CI on Node 20 reads lower), 0.1 KB (D-BUDGET-GEOM-07, the standing size-budget approval in the project CLAUDE.md). The initial download is 793.0 KB of 830.0; no request ceiling moved." +
      '\n\nPlot stage 3b (the energy chart, the light curve and the radial-velocity trace ported to js/plot/chart.js, D-PLOT-02), measured on v2 at 93737a56, took it from 2034.4 to 2041.0 KB gzipped (the CI build, on Node 22, measures 2,089,945 bytes gzipped, 2040.962 KB, an overrun of 6.6 KB rounded up to 0.1; the local Node 24 build, which compresses larger, measured 2042.244 KB, 5560.0 KB raw, after merging v2; v2 itself measures 2034.2) (D-PLOT-04, the standing size-budget approval in the project CLAUDE.md): the series chart (js/plot/chart.js, 6.2 KB gzipped), its words (js/i18n/en.chart.js and es.chart.js, registered by js/plot/mount.js in one chunk with the chart) and its PNG (js/plot/export.js, 1.3) are lazy chunks fetched when a chart is built, and the mount is the rest. Chart.js is still shipped for the bench charts, so nothing came back yet; stage 4 removes it. The initial download fell, 793.7 to 791.4 KB of 830.0; no request ceiling moved.' +
      '\n\nPrompt 127 (the accessible HTML report builder, js/htmlReport.js, and its download button), measured on CI Node 22 at run 39035194510, took it from 2041.0 KB to 2044.395 KB gzipped (2,093,460 bytes), an overrun of 3,476 bytes; the limit is raised to 2044.4 KB under the standing approval for size budgets (D-R9-09).' +
      '\n\nPrompt 190 (the claim instrument family, js/claimWidgets.js and its words, and the three measurement investigations in four shared files), measured on a Node 22 scratchpad copy of the branch merged with v3 at d61da28b, took it from 2044.4 to 2045.322 KB gzipped (the CI figure on the PR head, 2,094,410 bytes; 2,094,385 on the local Node 22 copy), an overrun of 944 bytes over the 2044.4 KB ceiling; the limit is raised to 2045.4 KB under the standing approval for size budgets (D-R10-67). The initial download is unchanged at 817,209 bytes; no request ceiling moved.' +
      '\n\nPrompt 191 (the imaging instrument family, js/imagingWidgets.js and its words, and the three image investigations in the four shared files), measured on CI Node 22 at run 40186699085: 2,155,188 bytes gzipped (2104.7 KB), an overrun of 60,848 bytes over the 2,094,340 of v3; the limit is raised to 2104.7 KB under the standing approval for size budgets (D-R10-72). The family is built once per page bundle that reaches js/widgets.js (the app, composer and course-packs), three copies of about 31 KB, as every lazy family is (claimWidgets: three of about 8 KB); the initial download is 817,251 bytes; no request ceiling moved.' +
      '\n\nPrompt 193 (the Jupiter-moons instrument family, js/jovianWidgets.js and its words, the satellite kernel in js/satellites/, and the investigation Weighing Jupiter From Its Moons in four satellite-sequence files), measured on CI Node 22 at run 40214303517 on 4bb5ad5e: 2,183,239 bytes gzipped (2132.1 KB), an overrun of 28,027 bytes (27.4 KB) over the 2104.7 KB limit; the limit is raised to 2132.1 KB under the standing approval for size budgets of 2026-10-10 (D-R10-74), exactly the measured overrun rounded up to 0.1 KB. The family is built once per page bundle that reaches js/widgets.js, as every lazy family is; the initial download is 798.1 KB; no request ceiling moved.' +
      '\n\nPrompt 200, the rest (the atmosphere instrument family, js/atmosphereWidgets.js and its words, the two atmosphere investigations in four shared files and the validation group), measured on CI Node 22 at run 40316540024 on a13f4a04: 2,204,958 bytes gzipped (2153.3 KB), an overrun of 21.2 KB over the 2132.1 KB limit (the first measurement, run 40272601891 on bb7aa5a0, was 2,204,689 bytes; the sequence prose added since, trimmed again, is the difference); the limit is raised to 2153.3 KB under the standing approval for size budgets of 2026-10-10 (D-R10-82), exactly the measured overrun rounded up to 0.1 KB. The family is built once per page bundle that reaches js/widgets.js; the initial download is 798.1 KB.' +
      '\n\nPrompt 195 part 3 (the crater instrument family, js/craterWidgets.js and its words, and the three crater investigations in the four shared measurement-sequence files), measured on CI Node 22 at run 40501328919 on 3b634512: 2,262,141 bytes gzipped (2209.1 KB), an overrun of 57,162 bytes (55.8 KB) over the 2153.3 KB limit; the limit is raised to 2209.2 KB under the standing approval for size budgets of 2026-10-10 (D-R10-86), exactly the measured overrun rounded up to 0.1 KB. The family is built once per page bundle that reaches js/widgets.js; the initial download is 798.1 KB; no request ceiling moved.' +
      '\n\nPrompt 204, part 2 (the ring and tide instrument family, js/tidesWidgets.js and its words, the three investigations Why Rings?, Tides That Move the Moon and Io’s Fire appended to the four shared satellite-sequence files, the two scale-model scenarios Ring Gap and Roche Pass in js/world/tidalSystems.js and js/data/tidePresets.js, and the registration data), measured on Node 22 on the tree merged with v3 at 0209abc0 (the Node 22 build of its first run, before the merge, matched CI to 2 bytes): 2,290,099 bytes gzipped (2236.5 KB), an overrun of 27.3 KB over the 2209.2 KB limit; the limit is raised to 2236.5 KB under the standing approval for size budgets of 2026-10-10 (D-R10-89), exactly the measured overrun rounded up to 0.1 KB, to be confirmed on CI. The family is built once per page bundle that reaches js/widgets.js; the initial download is 801.6 KB of 830.0.',
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
if (report.deferredJsGzipBytes === undefined) {
  console.error(
    '.build-report.json has no deferredJsGzipBytes: it was written by an\n' +
      'older build. Run `npm run build` again.'
  );
  process.exit(2);
}
const measured = {
  initial: report.initialDownloadBytes / 1024,
  deferred: report.deferredJsGzipBytes / 1024,
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
  const raw =
    budget.id === 'deferred'
      ? `  (${kb(report.deferredJsBytes / 1024)} raw)`
      : '';
  // The exact figure the KB column rounds, so a ceiling can be computed from
  // the true value: gzipped bytes for the deferred total, bytes for the other.
  const exact = {
    initial: report.initialDownloadBytes,
    deferred: report.deferredJsGzipBytes,
  }[budget.id];
  console.log(
    `  ${budget.label}\n` +
      `    ${kb(size)} of ${kb(budget.limit)}  (${pct.toFixed(0)}%)  ${state}${raw}\n` +
      `    ${exact.toLocaleString('en-US')} bytes${budget.id === 'deferred' ? ' gzipped' : ''}`
  );
  if (!check) console.log(`    ${budget.reason}\n`);
}

if (over && !verdict.strict) {
  // Not the figure the gate judges: say so, and say what would be.
  console.warn(
    `\n${over} budget(s) read over here, as ADVISORY only: this environment differs from the one the gate is measured in (${verdict.differences.join('; ')}${verdict.zlibRecorded ? '' : '; the reference zlib is not recorded yet'}). The gate is CI's figure, measured in Node ${reference.nodeMajor}; rerun there, or pass --strict to fail on this one.`
  );
  process.exit(0);
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
