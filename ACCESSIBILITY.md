# Accessibility

Gravitas targets **WCAG 2.2 Level AA**. This is what has been done, what is
checked automatically, and — the part worth reading — what the visual
simulation cannot offer regardless of effort.

The scoped conformance report, a status for each WCAG 2.1 and 2.2 A and AA criterion with the method behind it, is [ACCESSIBILITY_CONFORMANCE.md](ACCESSIBILITY_CONFORMANCE.md). It is generated from `tools/conformance/*.json`, is the project's own evaluation rather than an external audit, and `tests/conformance.test.js` fails when its list of limitations and the one below disagree.

## What is checked, on every run

<!-- a11y-shard:table -->
| Check | Covers |
| --- | --- |
| `e2e/accessibility.spec.js` | axe-core over every page of the navigation inventory and the application's own surfaces and states: <!--fact:axeSurfaces-->60<!--/fact--> surfaces × <!--fact:locales-->2<!--/fact--> languages × <!--fact:axeAllThemes-->4<!--/fact--> themes (Midnight, Deep space, Observatory red, Daylight) — <!--fact:axeRuns-->480<!--/fact--> runs; a page added to the inventory with no named surface gets a run of its own |
| `e2e/accessibilityManual.spec.js` | Focus order, focus traps, Escape, focus restoration, heading order, landmarks, reflow, reduced motion, and the canvas description |
| `e2e/a11ySweep.spec.js` | Sweep I (Prompt 278): every surface of the walk inventory by keyboard and by single presses, in both languages (no trap, every stop named and on screen, every pressable control reached, the primary task done by its key); the view pads, the windows moved and sized without a drag, the observer's angle, a run of rows in the Observatory |
| `e2e/a11ySweepII.spec.js` | Sweep II (Prompt 279): every page's outline against a record, in both languages; one test for each focus pattern; every page at rest with reduced motion, by the system and by the reader's own setting; every page at 320 CSS pixels; every page under forced colors; no checkbox or radio under 24 px |
| `e2e/chartDescription.spec.js` | Descriptions of series charts (Prompt 280): a bounded description for each chart, held answers kept out of it, the keyboard-triggered sound and its stop |
| `e2e/a11y3dMission.spec.js` | The 3-D lab and the mission page by keyboard (Prompt 281): Describe the view by Tab and by one press, in both languages and withheld while a guide step asks for a measurement; the camera's announcements; the transfer window as a grid walked by arrows, announced by each cell's label, marked on the picture, and moved by one press |
| `e2e/accessibilityParity.spec.js` | The text equivalents: what the visual simulation shows is also in the page as text, against the built tree |
| `tests/motionInventory.test.js`, `tests/designRatchet.test.js` | Every keyframes and every scheduler in the sources is in the motion inventory with what it does under reduced motion; the contrast of every token pair in each of the four themes, which may only rise |
| `tests/a11yNet.test.js`, `tests/interactionContract.test.js` | The net: every page of the navigation inventory has an axe run in every theme and both languages, a walk and an outline; every spec named a11y* or accessibility* is in this shard; every registered interaction surface keeps its walks in a spec of the shard |
| `tests/lab3dDescribe.test.js`, `tests/missionWindowGrid.test.js`, `tests/plotDescribe.test.js` | The descriptions and the grid as pure functions: the 3-D scene's bounded description and its held rule, the transfer window's cursor, a chart's description and its coverage |
<!-- /a11y-shard:table -->

The table above is written from `tools/a11y-shard.json` (`node tools/a11y-shard.mjs write`), and
`tests/a11yNet.test.js` fails when it is stale. The first two run in the CI accessibility job, the
rest in the sharded browser suite and the Jest job. The axe run uses the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
`wcag22aa` and `best-practice` rule sets, and **disables no rules** on any page of the
site but one: `region` (content inside landmarks) is switched off for the preserved
original-version page (`history-original`), which is kept as it was, with no shell
and no landmarks, until the surface-retirement decision says whether it is kept
(`tools/a11y-shard.json`, `axeExempt`, names the reason; every other rule runs on
it). There were
two candidates for exemption during the pass and neither survived it: each was
a real defect with a real fix.

The surfaces, named as the spec names them: front door, sandbox, settings rail,
scenario gallery, object inspector, investigations browser, active
investigation, lesson measurement screen, share dialog, A/B bench, observing
panels, lecture mode, model page, instructor portal, teaching page, figure
builder, evaluation kit, glossary, validation report, observatory, catalog, library,
library by sequence, library browse, all filters, library topic, library item, my work, experiment runner, scenario studio, investigation composer, course builder,
investigations in a course, course home, 3-D kernel diagnostics, 3-D lab, 3-D lab, the view described (Prompt 281), 3-D lab guide, mission
diagnostics, mission diagnostics, the window as a table (Prompt 281), mission lab, submission review, the two term surfaces of Prompt 168:
course builder, a course as it comes (Prompt 168), distribution kit, a new term (Prompt 168), and the three
surfaces of Prompt 164: library, your collections; kit, the collection editor; course home, a collection, and the two Common Cartridge panels of Prompt 169: course builder, the Common Cartridge panel (Prompt 169), distribution kit, the Common Cartridge panel (Prompt 169), and the two activity list panels of Prompt 174: course builder, the activity list panel with its outcomes (Prompt 174), distribution kit, the activity list panel (Prompt 174), and the two first-week surfaces of Prompt 277: front door, first-week mode; front door, the introduction in a first week, five places. (The figure builder is checked
without its live preview, which is the application in a frame and is
checked as the surfaces above.) That list
and the count above both come from the `SURFACES` array in the spec — the count through `npm run docs:sync`, the names by hand,
and `tests/accessibilityDocs.test.js` fails if a surface is in the array and
not in the prose.

Both languages, because a Spanish string is often longer than its English
original and because `lang` has to follow the interface or a screen reader
pronounces Spanish with an English voice. More than one theme, because
contrast is a property of the palette and passing in Midnight says nothing
about Daylight: the pages with the shared shell offer all four in their
theme switch, so all four are checked there (Prompt 50).

## What was wrong, and what changed

**Contrast.** Every one of the nineteen contrast failures traced to a single
token, `--text-muted`, which measured between 2.98:1 and 4.48:1 depending on
the surface under it. It is now 4.5:1 or better in all four themes. Two more
followed: the Daylight accent put white text at 4.10:1, and the "on" state of a
toggle rendered at 4.04:1 because it is drawn at less than full opacity over a
tinted background — a reminder that a token passing in isolation is not the
same as the pixels passing.

**`aria-labeledby`.** Six sections of the front door used a misspelling of
`aria-labelledby`, so none of them had the accessible name the markup was
trying to give them.

**A panel hidden from assistive technology.** The 3-D viewport carried
`aria-hidden="true"` while containing two real buttons. They stayed in the tab
order, so a keyboard reader could focus the close button and be told nothing at
all about it. The attribute is gone; `display: none` hides the panel from
everyone when it is shut, which is the correct mechanism and the only one
needed.

**Landmarks.** The page had none — a skip link and an `h1`, and then forty
top-level `div`s. Everything outside a dialog was outside a landmark. The
simulation is now `<main>`, and the readout, the scenario card, the transport,
the pinned cards and the observing panels are named regions.

**Two roles that promised behavior that did not exist.** The control rail and
the lecture bar declared `role="toolbar"`, which tells a screen-reader user to
expect a single tab stop and arrow-key navigation between the controls. Neither
implements that, and in lecture mode the arrow keys do something else entirely
— they step the sequence. Both are named regions now, which is both true and a
landmark.

**Escape did not work from a text field.** The keyboard shortcut layer ignored
every key when focus was in an input, Escape included. The share dialog opens
with the URL focused and the gallery has a search box, so in both cases a
keyboard reader who had reached the field could not dismiss the dialog with the
key everyone tries first. Escape is now the one key exempt from that guard; a
field that wants it takes it with `stopPropagation()`, which the settings filter
already did.

**Three modals did not trap focus.** The gallery, the share dialog and the
investigations browser all declared `aria-modal="true"` and let Tab walk out
into a control rail the reader could not see. The front door had a correct
implementation, and it became a shared trap that cycled Tab within the dialog,
marked the rest of the page `inert` and restored focus to whatever opened it.

**One module for every modal (Prompt 52).** That trap was a second one beside
`js/dialog.js`, and six more modals had neither: export, the lesson finish, the
black-hole masses, the lecture sequence and the shortcut list kept focus
nowhere in particular, and none of them gave it back. Every modal now opens
through `js/dialog.js`, and `tests/dialogInventory.test.js` fails on one that
does not. Its `isolate` option is the old trap's inert background, except that
it leaves live regions alone, so what `#srStatus` says over a dialog is heard,
and on the way out it puts back only what it changed: the old release took
`inert` off every child of `<body>`, closed dialogs included. The modules on
the start-up path fetch `js/dialog.js` on the first open, primed when the
pointer reaches the button or focus does, so it costs no route anything.

**Two ways out of Settings and the System Builder.** Both are opened by
`js/dialog.js`, which listens for Escape and Tab on the panel itself. A click on
the panel's text put focus on `<body>` in every browser, and so did a click on
any of its buttons in Safari, which does not focus a clicked button. From there
Escape did nothing and Shift+Tab walked into the page behind. The panel now
takes focus itself. Separately, Safari's default Tab leaves a dialog for the
toolbar after the last field it stops on, and its next Tab comes back in at the
first text field on the page. Over a lesson that was the lesson's answer boxes,
behind the modal. Until 2026-09-28 nothing stopped it; that return now goes to
the start of the dialog.

**Target size.** Sliders presented a 7-pixel-tall target across their whole
width; the inspector's help affordances were 16px and checkboxes 15px. All are
at least 24×24 now. The sliders keep their thin visual track — the element grew
and its background is clipped to the content box. On a touch screen
(`pointer: coarse`) every control the application, the shell and the page
components draw is at least 44×44, the AAA size of 2.5.5, and
`e2e/responsiveLayout.spec.js` measures it on the phone and tablet projects.
A pinch on the canvas zooms the simulation, which takes the gesture for itself
(`touch-action: none`); anywhere else it zooms the page, and the viewport tag
never forbids that.

**Reduced motion.** `css/tokens.css` collapsed the duration tokens, which
covered `components.css`. It did not cover `styles.css`, which animates with
literal durations and had four loops that never stopped. It does now.

**Two headings competing for the top level.** The splash wordmark was an `h1`
alongside the page's own. It is a paragraph.

**Empty and offline states (Prompt 57, F and G).** An empty list now says what
to press: the Observatory archive and fit panel, the experiments results, a
catalog search that finds nothing, the instructor filter, the validation page
when its results file cannot be read, and the teaching notes export. They are
`.ui-state.is-empty` blocks in both languages, static text a reader meets in
place, not announced. The offline note is one block the shell stamps into every
page: when the connection drops it is inserted once into a `role="status"`
region (so a screen reader hears it once), it lists the pages the service worker
precaches (read from `sw-manifest.js`, not hand-written, with the idle-tier
pages named separately as arriving once the first visit has installed), says any
other page needs a connection and offline takes the reader to the application,
and goes when the connection returns. Its Dismiss button
and Escape close it. `e2e/offlineStates.spec.js` and `e2e/emptyStates.spec.js`
induce each state; `e2e/accessibility.spec.js` covers the touched pages.

## Sweep I: every surface by keyboard and by one pointer (Prompt 278)

The interaction contract ([INTERACTION.md](INTERACTION.md)) registered four
surfaces and six gaps. This sweep walked the rest: every surface of the
navigation inventory, in both languages, with real key presses and single
presses in a browser (`e2e/a11ySweep.spec.js`, `e2e/walk.js`). The walks are
tests, so they stay.

**What a walk is.** Tab from the top of the page until focus comes round:
focus is never trapped, every stop has a name, every stop's box is inside the
viewport while it has focus, and every control a pointer can press is one of
the stops. Then Tab to the page's primary control and press its key; something
a reader can notice must change. 33 pages, each in English and in Spanish; the
printed manual is a PDF and is not walked.

**What the walks found, and what changed.**

- **A dialog that ended in a disclosure never gave it focus.** `js/dialog.js`
  listed what Tab may land on without `summary`, so in the investigation
  browser the last card's "Learning objectives" was skipped: Tab wrapped one
  press early, and Shift+Tab from the top went past it. The list now holds a
  disclosure's summary.
- **A row selected from the keyboard did not say so.** In the Observatory's
  table Space selected the row and the count read "1 selected", but no row was
  marked (`aria-selected`, the highlight) until something else redrew the
  table; Escape cleared the selection the same way. The table now marks its
  own rows.
- **A pressed A both armed a placement and panned** (conflict K2). With a type
  armed it now arms the placement only; the arrows always pan.
- **The spacetime view's camera had only a drag.** Its orbit, zoom and pan are
  the vendored OrbitControls, which Prompt 155's scan of pointer listeners
  could not see. It has a pad now (turn, tilt, move, zoom), and the contract
  names such sites by hand.
- **The spacetime view's header and corner answered a mouse and nothing
  else**: no touch, no key. Its Move and Size buttons do both.

**What was built for the six gaps Prompt 155 recorded** (all activated; a
failure is a failure now):

| Gap | What a reader has now |
| --- | --- |
| Keyboard zoom in the sandbox | The view pad in Tools: zoom in and out, about the center of the view, with Tab and Enter. `-` and `=` stay the simulation's speed |
| Pan with one pointer | The same pad: four buttons, each one step of what the arrow keys do |
| The 3-D lab's free orbit | A pad under the view: four arrows that turn or move the view (a select says which) and two that zoom |
| The observer's handle | Nothing was missing: the Position angle slider every observing panel carries sets the same angle. Prompt 155 looked in two files that do not build it. Walked now |
| Moving a window | A Move button in the header of the inspector, of a pinned card and of the spacetime view: press it, then press where the corner goes; or the arrow keys, in the three nudge sizes. The spacetime view also has Size |
| A run of rows without a held key | **Select a run of rows** under the Observatory's table: press it, then the last row |

**What is said.** The sandbox's zoom ("Zoom 2.34 times"), the 3-D camera
("Looking from 21° above the reference plane, 306° around it. The view is 1.2
times as tall as the system.") and a window move are each said once, when the
pressing stops, in the page's language. A pan says nothing: a picture moved.

**What the sweep did not do.**

- It judges the state a page opens in, and the states the walks open
  themselves. A panel or dialog reached only after other choices is covered
  where a named spec opens it.
- It does not judge whether a focus indicator can be seen, whether the order
  is the meaningful one, or anything a screen reader says. No assistive
  technology was used and no person took part.
- Six pages stay in English with Spanish chosen (the instructor portal, the
  evaluation kit, the model, validation and glossary pages, and the
  original-version page). Five of them carry Spanish text and a language
  switch that stores the choice but is not read when the page opens. Recorded
  in the walk inventory (`spanish: false`) for Prompt 282.
- On a phone the rail is a menu that closes after any press inside it
  (`js/ui.js`), so each press of the sandbox's view pad means opening the menu
  and Tools again. One press works; a run of them is slow. Seen on a 393 px
  viewport and not changed here: exempting the pad, as the object picker's
  button is exempt, belongs to Prompt 283 (the touch pattern).
- WebKit and Firefox: the walks ran in Chromium. On macOS, WebKit's Tab skips
  buttons and links unless Option is held (`e2e/keyboard.js`), which the walk
  helper allows for; it was not run there in this sweep.
- The Spanish strings added here are unreviewed by a fluent reader.

## Sweep II: structure, focus, motion, reflow, forced colors, contrast (Prompt 279)

Sweep I asked whether every control can be reached and pressed. This one asks
the five questions the conformance report still answered "partially": is each
page's structure sound, does focus go somewhere that exists, does motion stop
when a reader asks, does a page survive 400% zoom, and does it survive the
system palette. The checks are tests (`e2e/a11ySweepII.spec.js`,
`tests/motionInventory.test.js`, `tools/design-ratchet.mjs`) and stay. They
judge the 32 pages of the walk inventory (the original-version page is
exempt, with its reason in `tools/page-outlines.json`), in English and in
Spanish where a language matters, in Chromium.

**Structure.** Each page's outline (its one h1, its headings as a sequence of
levels, its landmarks in order, with the name of every navigation, search and
form) is a record, `tools/page-outlines.json`, and the page is held to it. It
records structure, not wording, so a new section does not move it and a new
level or a renamed navigation does. Held on every page, in both languages: one
h1 (a dialog holds none), no heading that skips a level, no empty heading, one
main, every navigation, region, complementary and search named, no name used
twice, and Spanish has English's levels and landmark roles in the same order.
*The audit found nothing to fix.* The two things worth knowing: the
instructor portal places an h2 ("Start here") before its h1, which breaks no
level and which this sweep does not reorder, because changing a page's order is
what it was told not to do; and four forms (the experiment runner's, the
figure builder's, the feedback form's on the teaching page, the portal's login)
have no accessible name, which makes them forms and not landmarks and is
recorded, not changed.

**Focus.** One test for each pattern: a dialog takes focus inside it and gives
it back to its trigger (the settings; the investigations browser), opening a
lesson puts focus on its title and a step change leaves it on a control that is
still there (never on the body), opening an observation puts it on the
observation's title, a disclosure keeps it on its summary, a rail panel keeps
it on the control that opened it. *No defect.* The helper of Prompt 155 does
what INTERACTION.md says it does everywhere the tests look; they look at the
patterns, not at every instance of one, and `tests/dialogInventory.test.js`
holds the dialogs.

**Motion.** `tools/motion-inventory.json` lists every source of time-based
change in the sources: the 16 keyframes, all stopped by the two blanket rules
under `prefers-reduced-motion` and under the reader's `data-motion`; and 33
scripts, each with what it does when motion is reduced (`content`, with its
pause control; `follows`; `opt-in`; or one that moves nothing). A Jest test
fails on a keyframes or a scheduler that is not listed, on one listed that is
gone, on one that says it follows the setting and does not read it. The pages
are run with reduced motion, by the system and by the reader's choice:
none has a running animation or a transition.
*Found and fixed.* Two literals beat the blanket rules: a transition written
`!important` on the scenario card's close button, and the settings tooltips'
inline styles; both are on the motion tokens now. Four families of lesson
instruments (the launch, the binary orbits, the habitable-zone orbit, the
galaxy flyby) started running by themselves whatever the setting; a step now
opens them still under reduced motion and Step by step, and Run starts them
(`autoruns`, `js/widgets.js`). *Found and not fixed:* six instruments (the four
resonance instruments and the two exoplanet instruments) advance a phase on
every frame with no Run control and no check of the setting; giving them one
changes the instruments, which a content prompt may, and the inventory names
them with a proposal. And the reader's own Settings, Motion choice reaches the
application and no other page (`override` in the inventory); the other pages
follow the system setting only, which they all honour. The proposal is three
lines in the shell's head script, which re-stamps 178 pages and their CSP
hashes, so it is recorded for a stamping PR (D-R10-279-04).

**Zoom and reflow.** A 1280 pixel window at 400% is 320 CSS pixels. Every page,
in both languages, and the Observatory with an observation open and a lesson
open beside the sandbox, is loaded at 320 px and must put nothing beyond the
viewport except inside a scroll container of its own (a table's wrapper), a
canvas or an svg. Found and fixed: the validation page's document measured
1,121 px wide, because parts placed absolutely inside its tables (a hidden
label, the bars) were not contained by the wrapper that scrolls the table, so
the wrapper is now their containing block; and the investigations browser's
cards in Spanish were 49 px wider than the panel, with the time chip clipped, a
grid column that could not shrink below its content and a nowrap flag longer
than the card. The lesson panel and the Observatory were already one column.

**Forced colors.** Every page is loaded under `forced-colors: active`.
Every button, select, textarea and text field has an edge unless it reads as a
link, a disclosure, a file picker's button or a column's sort control (their
words carry the meaning); every pressed, selected, checked or current button,
link or tab has a mark that is not a color (the system's selection color on its
edge and an underline); and the first six Tab stops of the Library, the
Observatory and the sandbox draw a focus ring. Found and fixed: the close
button of the scenario card and the validation page's Run button had no edge
(`border: none` where a transparent border is drawn by the system palette); and
the current place in the shell's navigation was marked by a color alone. A
plot (an svg) keeps its palette (`forced-color-adjust: none`): its series are
told apart by color, the palette would collapse them to one, and each plot's
data is a table. The roadmap's "high-contrast palette toggle" was not built
(D-R10-279-03): a plot is light marks on a dark ground, the object hues on that
ground are measured at 3:1 or better in every theme, and a toggle is a setting,
a catalog string in both languages and bytes on every route for a reader the
system palette already serves.

**Contrast.** The design ratchet measures 216 foreground and ground pairs in
each of the four themes (text on the four surfaces; the accent, status colors
and focus ring; a label on its button's face; the object hues on the sky) and
holds each to its WCAG minimum, 4.5:1 for text and 3:1 for the focus ring and
a graphic, and to the figure recorded: a ratio may fall nowhere and rise only by
re-recording. *Found and fixed:* Deep's muted text on its raised surface
(4.38:1, now 4.80), Daylight's accent on its raised surface (4.29:1, now 4.88),
Daylight's warning on its page and raised surfaces (4.47:1 and 4.11:1, now 5.07
and 4.67). The measure is of tokens; what is drawn over a canvas is the canvas
harness's (`e2e/canvasLegibility.spec.js`), and axe's contrast run covers the
text of every page in every theme.

**Target size.** The design system's checkbox and radio is 24 CSS pixels, for
every one on every page (`css/components.css`; `DESIGN_SYSTEM.md`). The 13 px
boxes the instructor checkpoint recorded as Z-1 (the builders, the review, the
figure builder, the 3-D and mission labs, the evaluation kit's 161) are
gone, and the test fails on any under 24 px, on every page and in the lesson
panel and the settings dialog.

**Target size, measured on every control (Prompt 283).**
`e2e/mobileSweep.spec.js` measures every shown pointer target of the 32 pages,
the 7 states and six more surfaces at a phone and a tablet with touch emulation
and holds each to 24 CSS pixels, or to the spacing, inline or user-agent
exception of 2.5.8, as `tools/touch-targets.json` records. It found the
attribution links at 15 pixels beside the open rail and made them 24. The 44
pixel touch size is recorded (`under44`), not required, outside the regions
`e2e/responsiveLayout.spec.js` holds to it. Chromium only, emulated; no real
touch screen was used.

**What this sweep did not do.** It ran in Chromium: forced-colors emulation and
the transparent-border behaviour are Chromium's, and Firefox on Windows is the
engine that most needs it. No assistive technology was used and no person took
part. 400% zoom is the 320 px width, not a browser's zoom with its text
scaling; text spacing (1.4.12) and a window 256 px high were not tested.
Whether an order or a name is the right one is not judged. The Spanish strings
this sweep added: none.

## Startup: one splash per genuine startup (Prompt 124)

The splash is a startup event, not a page event. Six outcomes, then the
mechanism that produces them.

**Semantics.**
- (a) The first full load of the site in a browsing context that has not shown the splash in this visit: the splash.
- (b) Any other full load reached from inside the site, including returning to the sandbox, back and forward with or without a bfcache restore, and a deep link followed from inside: no splash.
- (c) A reload of a page that already showed it: no splash.
- (d) A new tab the reader opens from outside (a typed address, a bookmark, an external link): a genuine startup.
- (e) A tab duplicated, or opened by the site itself: not a genuine startup.
- (f) A script that fails, or a splash that never finishes: a visible, usable shell within six seconds, no spinner, nothing hidden for ever.

**What distinguishes them.** Four signals were weighed:
- The navigation type (`performance.getEntriesByType('navigation')`) separates reloads and back or forward from a fresh navigation, and cannot tell a typed address from a link.
- The referrer separates an internal link (the site's own origin) from a typed address (empty) or an external link, and is empty for a duplicated tab and absent when a browser trims it.
- A per-tab token in `sessionStorage` survives a reload and is copied into a duplicated tab, which is exactly (c) and (e), and is absent in a new tab, which is (d); on its own it would also treat a tab that left for another site and came back by typing as the same visit, and it is unavailable when storage is blocked.
- `pageshow.persisted` matters only for a bfcache restore, which runs no script at all: the page returns as it was left, so (b) holds without reading it.

No one signal gets all six right, so the rule is their conjunction: a startup is a `navigate`-type load, with no own-origin referrer, and no token. Any other load skips. Storage blocked: the type and referrer decide alone.

**Mechanism.** An inline script in `index.html`'s head decides before the first paint and writes `html[data-startup]`: `splash`, `skip`, or `failsafe`. While the attribute is `splash` and the splash is in the page, the shell is hidden (`css/styles.css`), so the navigation is never seen ahead of the splash. Every other load runs the same one reveal path with no time: the animation is cut to nothing and `animationend` is sent once the page has booted, so `window.splashScreenEnded`, the welcome gate and the orientation keep their flags and their order. A timer in the same inline script, independent of `main.js`, sets `failsafe` after six seconds if the sequence has not ended; the splash is then removed from view and the shell shown. The six seconds is a bound on failure, not a duration the sequence depends on.

**Reduced motion.** The splash's delays are cut to nothing and the sequence reveals the shell at once; nothing moves. The branding appears for a frame at most.

A frame loaded with `?embed=` is always a startup: it is a document inside someone else's page, the Figure builder's preview among them, and its own start must not depend on the host's visit.

`e2e/startupLifecycle.spec.js` asserts each outcome as the reader sees it, in Chromium, and the bfcache-sensitive ones in Firefox and WebKit. A duplicated tab cannot be made from a browser driver, so the inherited `sessionStorage` token is what is simulated.

## The canvas

The simulation canvas has an accessible name and points, through
`aria-describedby`, at a textual equivalent that is kept current by
`js/canvasSummary.js`:

> Scenario: Solar System. Running. 32 bodies: 1 star, 4 planets, 4 gas giants,
> 16 asteroids, 7 comets. Nothing is selected. Measurements are in the
> simulation readout region.

It reports the four things the canvas shows at a glance: which system is
loaded, whether it is running, what is in it, and what is selected.

**It is deliberately not a live region.** The simulation changes sixty times a
second and a live region attached to it would produce a stream of speech no
reader could interrupt — worse than silence, because it would also drown out
the announcements that matter. The description is read when a reader moves to
the canvas. Discrete events — a scenario loading, a pause, a selection — go to
a separate polite live region, and only when the reader caused them.
`e2e/accessibilityManual.spec.js` watches that region for six seconds of
ordinary running and fails if it is written to more than once.

## The sound

The sandbox makes sound, and it is worth being exact about what kind of thing
that sound is, because "the simulation is sonified" is routinely read as a
claim about accessibility and here it is not one.

`js/audio.js` maps a body's orbital frequency to a pitch, compresses it through
`log2(1 + f * 40)`, and then **quantizes the result onto a five-note scale** so
that an arbitrary collection of orbits sounds like music rather than like a
siren. That is the right design for an ambient soundtrack and it disqualifies
the sound as a measuring instrument: the quantization is not invertible, so two
orbits several percent apart can arrive at the same note. Nobody can get a
number back out of it, sighted or not, because the number is no longer in
there.

**What was added.** The sound panel now prints the quantity the tones are
computed from. Opening it on the default scenario gives:

> **What the tones stand for**
>
> - Highest voice, Black hole. Period 61.4 d. Every interval below is measured
>   from this one.
> - Black hole. Period 61.5 d, 1.001× the highest voice, 1.1 cents below it.
> - Rocky planet. Period 131 d, 2.125× the highest voice, 1304.9 cents below
>   it.

Those two black holes are 1.1 cents apart. No five-note scale preserves that
and no listener could hear it, which is the clearest possible statement of why
the printed version is not a transcription of the audible one. It is not a
description of the sound; it is the thing the sound is about, delivered
losslessly.

It cannot drift away from what is playing. `getVoicedBodies()` in `js/audio.js`
returns the same array the oscillators are following, `describeVoices` in
`js/soundPanel.js` turns it into periods and intervals, and that panel (wired
by `js/ui.js`) renders it and computes nothing of its own. `tests/voiceReadout.test.js` fails if it ever starts to,
and `e2e/sonifyTextEquivalent.spec.js` compares the printed periods and
intervals against the live array in the browser.

**It is deliberately not a live region**, for the same reason the canvas
description is not. The voices are re-chosen several times a second; a polite
live region over them would interrupt a screen reader without pause and make
the panel unusable for exactly the reader it exists for. It is plain content
that holds still while it is read — the panel fills it when it opens and does
nothing at all while it is closed.

### What none of this establishes

**The sonification has never been tested with a screen reader or with a blind
or low-vision user.** Not with NVDA, not with JAWS, not with VoiceOver, and not
with a student. No claim is made anywhere in this project that a blind student
can use the sandbox, and this section exists so that the absence of such a
claim is deliberate and visible rather than an oversight a reader has to infer.

What is actually established, and the limit of each:

| claim | evidence | what it does not show |
| --- | --- | --- |
| The period-to-pitch encoding preserves the quantity | 8 checks in `js/validation/groups/sonification-law.js`, "Sonification law" | Nothing about the audible sound, which is quantized and lossy |
| A non-audio path to the same facts exists | `e2e/sonifyTextEquivalent.spec.js` | Nothing about whether it is findable, readable or useful |
| The panel has no machine-detectable violation | axe-core, no rules disabled | Nothing about whether a screen reader user can operate it |

There is also no automated check that *could* establish the missing thing. axe
has no rule for sonification and WCAG has no success criterion that says an
audio encoding of a quantity must be invertible — 1.1.1 and 1.2.1 are about
alternatives existing, not about how much information an encoding throws away.
So the gap here is not one more test away; it needs people.

**What would count as evidence**, cheapest first: the author with the monitor
off and VoiceOver on, for an hour; the three screen readers on the platforms
they actually run on, which disagree with each other in ways that matter; a
paid expert assistive-technology user doing a think-aloud walkthrough, which is
the single highest-value step on this list; and finally task-based sessions
with students, measuring whether a task was completed rather than whether the
audio was liked. The instruments for the last of those belong with the rest of
the evaluation kit in `evaluation/`, not here.

Until that happens, the honest sentence — the one that may be used in a paper,
a grant or a course description — is this: *the sandbox's sonification is
implemented and is deliberately lossy; a separate period-to-cents law is
verified to be information-preserving and is not what the speakers play; a text
equivalent of the underlying periods exists and is checked against the array the
oscillators are actually following; and none of it has been tested with
screen-reader users.*

The previous version of that sentence said "its encoding is verified to be
information-preserving", which is true of `js/sonify/law.js` and false of the
thing a listener hears. The rest of this section is careful about that
distinction — the table above says in as many words that the five validation
checks establish "nothing about the audible sound, which is quantized and
lossy" — and the one sentence written to be quoted outside the project was the
one that blurred it.

## Descriptions of a chart and the series sound (Prompt 280)

**What it is.** `js/plot/describe.js` computes a description from a chart's own
arrays and writes it from templates in English and Spanish. It names a shape
and its numbers: a straight trend (slope with its uncertainty and R squared), a
step (where, how big), a pattern that repeats (period, middle value,
semi-amplitude, repeats in view), a dip or a rise (depth, duration, and, when
three or more come at even spacings, their period), a constant, or none of
those; a scatter's correlation (Pearson r with a Fisher interval) and its
straight-line slope; the highest and lowest value and where they are. Every
threshold is a named constant (`LIMITS`). Numbers with an uncertainty are
written in the style of Prompts 150 and 151, "X ± Y (from the scatter of the
points)", an asymmetric interval as "X +U −L". The Spanish is unreviewed by a
fluent speaker.

**What it never does.** It never says what a shape means: a dip is "a dip", not
a transit; a pattern that repeats is "a pattern that repeats", not an orbit.
The vocabulary has no such word, and a test reads every template in both
languages against a list of the words the lessons use as their answers. It
never gives away a held prediction. A lesson step that has not yet revealed
its result is marked (`data-answer-held` on the lesson panel, from `js/lesson/held.js`, which is
also what the test uses): while it is, the chart's description is the number of
points and the range of x, which the axes already print, and the sound is
refused, because a pitch contour tells the shape as surely as a sentence does.
A test goes through every one of the 195 predictions the 124 shipped
investigations hold and checks that the mark is on from the prediction's step to
the step before its reveal, and that the held description is the same whatever
the data do.

**Where it is.** Every series chart carries its description as its accessible
description (`aria-describedby`), computed when the chart takes focus and a
moment after its last draw (a series that grows fifteen times a second is
described when somebody asks, not fifteen times a second). When a chart is
first focused a disclosure appears under it: the description as text, a button
to play the series as sound and the mapping written out. `S` on a focused chart
plays, `Escape` stops. The code is a lazy chunk, fetched once a chart that is
on a screen has drawn; `access: false` keeps it from a chart.

**The sound.** `js/sonify/series.js` is one deterministic mapping for any time
series or spectrum: time is x (6 seconds across the range, in at most 48
equal slices, 24 at the low quality tier), pitch is the mean value of a slice,
linear in cents from 220 Hz at the lowest to 880 Hz at the highest, so equal
steps in value are equal musical intervals, and a slice with no data is a
short tick, never a held note. The text beside the sound states the range, and
says that values closer than the value spanning `DISTINGUISHABLE_CENTS` (10
cents, a working figure of `js/sonify/law.js`, not a measurement of any listener)
are not assumed to sound different. The same arrays give the same samples, to
the bit; `js/sonify/buffer.js` is the buffer and the stop the gravitational-wave
audio shares with it (its mapping is unchanged, and so are its tests). There was
no spectrum sonification in the application to move: a spectrum is this map with
wavelength as x.

**What is established, and what is not.**

| claim | evidence | what it does not show |
| --- | --- | --- |
| The description is a function of the data, computed the same way every time | `tests/plotDescribe.test.js`: synthetic series with known truth, input order, both languages | Nothing about whether a description is useful |
| Its stated uncertainties cover the truth at about the stated rate | the same suite, 200 seeded draws per shape: one sigma covers at least 55% and two sigma at least 90% | The data of a lesson are not these draws |
| It names no interpretation and gives no held answer away | the vocabulary test; the test over 195 held predictions | That no other path leaks an answer |
| The sound is the stated mapping, deterministic, and its pitches read back from the samples | `tests/sonifySeries.test.js`; three checks added to "Sonification law" | Nothing about the audible sound |
| The controls work from a keyboard | `tests/plotAccess.test.js`, `e2e/chartDescription.spec.js` | Nothing about whether a screen reader user can find or use them |

No blind or low-vision user has validated the descriptions or the series sound.
The evidence-status record says UNKNOWN (`chart-descriptions-sonification`), and
nothing here upgrades it on the strength of a test. What would count: a named
accessibility practitioner and at least one blind or low-vision screen-reader
user (Roadmap III, Appendix A), working from the description, the table and the
sound on three charts.

## The 3-D lab, the mission page and the net under them (Prompt 281)

**The 3-D lab.** The lab's semantic scene was already there: the list of who
orbits whom, the table of positions and speeds, the table of orbital elements
(a, e, i, node, periapsis, period), the frame sentence, the run-mode line with
its integrator, step or tolerance, and the camera sentence said once the
pressing stops. This adds one action, **Describe the view** (a button in "What
is in the view", `js/lab3d/view/describe.js`, a bundle of its own loaded on the
first press). It says, in at most a dozen sentences: the run mode with its
numbers (Kepler-only, N-body with its scheme and step or tolerance, or a
precomputed run with its source, and the tick), the clock, how many bodies are
live and the names of the first six, the frame, reference plane and projection
as the page words them, where the camera looks from, the body farthest from the
center of mass, the first four orbits (a, e, i about their primary) and the
mutual inclination of the first three pairs of orbits that share a primary,
then "and N more" with the table named for the rest. It reads the numbers the
tables read (`labApi.exact()`), never pixels. It states and never interprets.
**While a guide step is asking for a typed measurement** (the guide panel's
Reveal control is on screen) the orbit numbers and the inclinations are left
out and the description says so: the numbers would settle the step before the
reader's instrument did. That is Prompt 280's held rule applied to the one panel
of the lab that holds an answer. There is no new key: the button is reached by
Tab and pressed with Enter or Space, or by one press.

**The mission page.** The porkchop is a picture; its text said only the best
cell. **Show the grid as a table** (`js/mission/windowGrid.js`, loaded on first
use) opens the same grid as an ARIA grid: one row for each departure date, one
column for each flight time, the total delta-v in each cell, or the reason the
solver refused it. One Tab stop; the arrows move a cursor one cell, Page Up and
Page Down ten departures, Home and End to the first and last flight time,
Control with Home or End to the first and last cell; a press on a cell moves it
there; a button returns it to the cheapest cell, where it starts. Each cell's
label is its whole meaning ("Departure 2024-08-12, flight 210 days: total 5.43
km/s"), so the cursor is announced by the cell it lands on and the same
sentence is written under the table; the picture marks the cell with a white
square with a dark edge. A window can hold 40,000 cells, so the table draws
only seven rows and seven columns around the cursor and says how many there are
(`aria-rowcount`, `aria-colcount`, `aria-rowindex`, `aria-colindex`).

**What was not built, and why.** Prompt 272's gate returned C: it delivered the
window-and-budget kernel and its validation record and no panel, because the
consumers rule (no panel until its gate passes) held the porkchop panel, the
budget panel and the geometry panel back. So there is no budget ledger table
and no geometry panel text to make accessible, and none was built here. The
transfer-window grid that exists (the mission page's own, from Prompt 38) is
what got its table. When a budget panel or a geometry panel lands, it adds a
`states` entry to the walk inventory, an axe surface and a row of the table
below, and `tests/a11yNet.test.js` is what notices if it does not.

**The net.** Four lists have to agree about the pages of the site, and
`tests/a11yNet.test.js` holds them together through `tools/a11y-shard.mjs`:
the navigation inventory, the axe spec, the walk inventory and the outline
record. Every page of the inventory has an axe run in every theme (Midnight,
Deep space, Observatory red, Daylight) and both languages: the spec names the
pages it opens in a state of their own (`covers`), and **gives every other page
of the inventory a run of its own**, so a page added to the inventory is
checked without anyone adding it to the spec, and a page with no walk row or
no outline fails a test. (Before this, the application's own surfaces ran in
two themes and eight pages of the inventory had no run.) A spec named
`a11y*` or `accessibility*` that `tools/a11y-shard.json` does not list fails;
so does `npm run a11y` disagreeing with the file, a registered interaction
surface with no keyboard walk, and the table "What is checked" above going
stale: it is written from the configuration (`node tools/a11y-shard.mjs
write`). The CI accessibility job runs the axe and manual specs; the walks,
sweeps and descriptions run in the sharded browser suite, whose shards
`tools/e2e-shards.mjs` plans by measured duration (a test it has not timed is
planned at its file's median).

| Task | By keyboard | Said by | Axe state |
| --- | --- | --- | --- |
| Hear the 3-D lab's view | Tab to Describe the view, Enter (`e2e/a11y3dMission.spec.js`) | a polite live region, bounded, withheld orbit numbers while a guide step asks | `3-D lab, the view described (Prompt 281)` |
| Look from another side | the camera's arrows, + and - (278) | the camera sentence, once the pressing stops | `3-D lab` |
| Walk the porkchop | Tab to Show the grid as a table, the arrows, Page Up and Page Down, Home and End | each cell's label, and the line under the table | `mission diagnostics, the window as a table (Prompt 281)` |
| Read the budget or the geometry | not built (Prompt 272 returned C) | | |

**What is not established.** No blind or low-vision user, and no assistive
technology other than the browser's own accessibility tree (Playwright's role
and label reads), has used any of this. The grid is an ARIA grid: how a screen
reader announces a virtualized grid, and whether the cell label repeats what
the row and column headers say, is what a person with a screen reader would
find out. Spanish is unreviewed by a fluent reader. The evidence-status record
is unchanged.

## Honest limitations

These are real and are not going to be fixed by more ARIA.

**A sentence is not a simulation.** "Four planets on elliptical orbits" is not
equivalent to watching them move, and no textual description makes it so. What
the description can do — and does — is make the *state* legible, which is what
almost every control in the interface acts on. A reader who cannot see the
canvas can still load a scenario, pause it, select a body, read its measured
properties as text in the inspector, and work through an investigation.

**The orbital motion itself does not stop for `prefers-reduced-motion`.** It is
the content, not decoration; a planetarium that will not move is a picture.
Every decorative animation stops, and the simulation can be paused from the
transport bar or the space bar — a real control rather than a media query.
Settings has a Motion choice for a reader who wants more: Reduced applies the
same stop on a device that did not ask for it, and Step by step also starts the
simulation paused, so nothing moves until the reader steps it or presses play
(INTERACTION.md, "Reduced motion"). Two things are not yet true of that choice:
it reaches the application and no other page, and six lesson instruments (the
four resonance ones and the two exoplanet ones) start moving by themselves with
no Run control; both are in `tools/motion-inventory.json` with their proposals.

**The shape of a curve is described by a template that no blind or low-vision reader has validated.** The light curve, the radial-velocity trace, the
energy chart and the bench's two charts are one component
(`js/plot/chart.js`): a named, focusable group with the values by arrow keys,
a legend of real buttons and a text alternative. The rotation curve is still
drawn to a canvas. Their numbers are available as a table: the export dialog
offers each series as a table — proper column headings with units, the
independent variable as a row header, reachable and scrollable from a keyboard
— beside the CSV download that was already there. Every table is rendered from
the bytes the exporter writes, so the table, the file and the plot cannot be
three derivations that disagree, and a long series is evenly sampled with the
sampling stated in the caption rather than silently truncated. Since Prompt 280
every series chart also carries a description of its shapes, and can be played
as a sound; the section above says what that is and is not.

**Direct manipulation has a keyboard equivalent, but not a pointer's.** Two
different things were wrong here and only one has been fixed. Placing a body
from the keyboard has worked for some time — `A` arms it, the arrow keys aim,
Enter commits — but it is an *aiming* interface: the aim is in canvas pixels,
so where the body lands depends on the zoom and the pan, and there was no way
to set a mass at all. Operable without a pointer is not the same as usable
without sight. **Precise placement**, beside Add object, is the other half: a
form that takes a type, a position, a velocity and a mass as numbers, with the
unit named on every field and each error attached to the field it is about. It
calls the same `placeBody()` the canvas does, so a typed body is
indistinguishable from a clicked one — same list, same share link, same undo
button — and `e2e/accessibilityParity.spec.js` asserts that by comparing the
two share payloads.

In Safari, Tab moves only between text fields and menus unless "Press Tab to
highlight each item" is turned on, so the rail's buttons, Precise placement
among them, are reached with Option+Tab. Inside the form, Enter in any of the
number fields adds the body and Escape closes it, so plain Tab is enough there.
Until 2026-09-28 Tab from the last field in Safari left the form for the page
behind it, and over a lesson that meant its answer boxes; `js/dialog.js` now
sends that move back to the start of the form.

The **Orbital System Builder**, in the Scenario section, takes a whole system the same way:
each companion's primary, mass and orbit as labeled fields, with every error
on its own field and a table of the orbits as the text equivalent of its
preview drawing. `e2e/systemBuilder.spec.js` runs axe over it, checks that
Escape returns focus to its button and that it fits a 375-pixel screen, and
reads its labels in Spanish.

What remains is the gesture itself. Dragging to *feel* how fast a throw is,
and seeing the velocity arrow grow as you drag, has no keyboard equivalent and
will not get one; the form gives you the number instead of the feel.

[INTERACTION.md](INTERACTION.md) is the rule for every drag now: each needs a
single-pointer alternative, and a test that a typed launch equals a recorded
drag holds this one to it. The drags that still have none (panning the view,
the 3-D camera's free orbit, the observer's handle, moving a pinned card) are
listed there and run as pending acceptance checks.

**The attribution links in the footer are under 24×24.** They are inline text
links in a sentence, which WCAG 2.5.8 explicitly exempts. Enlarging them would
mean changing a line of running text into a row of buttons.

**Automated checks are a floor, not a ceiling.** <!--fact:axeRuns-->480<!--/fact--> clean axe runs mean no
machine-detectable violation on those surfaces in those states. They do not
mean the application is pleasant to use with a screen reader, and nothing here
substitutes for testing with one. Nothing in this pass was made to pass by
hiding a control from assistive technology; where that had already happened, it
was removed.

## The generated PDFs

The instructor guides, answer keys, activity guides and student worksheets are
produced by this project's own PDF writer (`js/pdf.js`). What they do and do not
provide is worth stating plainly, because a document that is merely *readable*
is often described as accessible and these are not the same claim.

**What they provide.** A document title, an author, a subject and a language
(`/Lang en-US`) in the file's own properties, so a reader application announces
them correctly rather than guessing. Selectable, searchable, copyable text —
nothing is an image of words. Consistent headings, page numbers and a footer
naming the document on every page. A restrained palette that still separates in
grayscale, for the copies that come off a departmental printer.

**What they do not provide.** The files are **not tagged**: they carry no
`/StructTreeRoot`, so there is no semantic structure tree, no reading order
declared to assistive technology, no table header associations and no alt text.
They are therefore **not PDF/UA conformant**, and this documentation does not
claim they are. A screen reader will read them, in the order the text was drawn,
which for these documents is the order it should be read in — but that is a
property of how they happen to be laid out rather than a guarantee the file
makes.

Tagging is a substantial change to the writer rather than a flag to set, and
adding a half-implemented structure tree would be worse than none: it would make
the files *claim* a reading order they had not earned. `tests/instructorMaterials.test.js`
holds this section to what the files actually contain, so the day tagging is
added the test fails and this text has to be updated with it.

**The student's own reports are different.** The lab report and the evidence report are written as tagged PDFs (headings, lists, tables and figures with alternative text), and the lab report is also offered as an accessible web page from the finish dialog (Prompt 127): one document with its headings in order, a table of the numbers behind every plot, a text alternative on every figure, no script, and a print stylesheet. `e2e/htmlReport.spec.js` downloads it and runs axe on the file itself. No PDF/UA validator has been run on the tagged PDFs, so their conformance is not claimed; the instructor documents stay untagged, as above.

**If a tagged document is needed today**, the same content is on the web in HTML,
which is tagged by construction: the investigations at
[gravitas-sim.online](https://gravitas-sim.online), and the public teaching and
model pages. The PDFs are a convenience for printing and for handing out, not the
only route to the material.

## Running the checks

```bash
npm run a11y            # all of them
npm run a11y:axe        # axe only, all <!--fact:axeRuns-->480<!--/fact--> combinations
npm run a11y:manual     # keyboard, focus, reflow, reduced motion, the canvas
npm run a11y:sweep2     # outlines, focus patterns, motion, 320 px reflow, forced colors, target size
node tools/design-ratchet.mjs   # contrast in the four themes (and the colour, !important counts)
```

<!-- Listed in DOCUMENTS.md. -->
