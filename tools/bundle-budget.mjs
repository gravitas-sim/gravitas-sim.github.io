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
    label: 'Deferred JavaScript (lazy chunks)',
    limit: 4180,
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
      'fresh builds: 4076.4 KB with the lazy-instrument slice, 4174.2 with ' +
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
      '5.8 KB.',
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
