# Accessibility

Gravitas targets **WCAG 2.2 Level AA**. This is what has been done, what is
checked automatically, and — the part worth reading — what the visual
simulation cannot offer regardless of effort.

## What is checked, on every run

| Check | Covers |
| --- | --- |
| `e2e/accessibility.spec.js` | axe-core over <!--fact:axeSurfaces-->15<!--/fact--> surfaces × <!--fact:locales-->2<!--/fact--> languages × <!--fact:axeThemes-->2<!--/fact--> themes — <!--fact:axeRuns-->60<!--/fact--> runs |
| `e2e/accessibilityManual.spec.js` | Focus order, focus traps, Escape, focus restoration, heading order, landmarks, reflow, reduced motion, and the canvas description |

Both run in CI. The axe run uses the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`,
`wcag22aa` and `best-practice` rule sets, and **disables no rules**. There were
two candidates for exemption during the pass and neither survived it: each was
a real defect with a real fix.

The surfaces, named as the spec names them: front door, sandbox, settings rail,
scenario gallery, object inspector, investigations browser, active
investigation, lesson measurement screen, share dialog, A/B bench, observing
panels, lecture mode, model page, instructor portal, teaching page. That list
and the count above both come from the `SURFACES` array in the spec — the count through `npm run docs:sync`, the names by hand,
and `tests/accessibilityDocs.test.js` fails if a surface is in the array and
not in the prose.

Both languages, because a Spanish string is often longer than its English
original and because `lang` has to follow the interface or a screen reader
pronounces Spanish with an English voice. Both themes, because contrast is a
property of the palette and passing in Midnight says nothing about Daylight.

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
implementation; it is now `js/focusTrap.js` and all four use it. It cycles Tab
within the dialog, marks the rest of the page `inert`, and restores focus to
whatever opened it.

**Target size.** Sliders presented a 7-pixel-tall target across their whole
width; the inspector's help affordances were 16px and checkboxes 15px. All are
at least 24×24 now. The sliders keep their thin visual track — the element grew
and its background is clipped to the content box.

**Reduced motion.** `css/tokens.css` collapsed the duration tokens, which
covered `components.css`. It did not cover `styles.css`, which animates with
literal durations and had four loops that never stopped. It does now.

**Two headings competing for the top level.** The splash wordmark was an `h1`
alongside the page's own. It is a paragraph.

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
returns the same array the oscillators are following, `js/sonify/voiceReadout.js`
turns it into periods and intervals, and `js/ui.js` renders that and computes
nothing of its own. `tests/voiceReadout.test.js` fails if it ever starts to,
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
| The period-to-pitch encoding preserves the quantity | 5 checks in `tools/physics-checks.mjs`, "Sonification law" | Nothing about the audible sound, which is quantized and lossy |
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
a grant or a course description — is this: *sonification is implemented, its
encoding is verified to be information-preserving, a text equivalent exists and
is checked against it, and it has not been tested with screen-reader users.*

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

**Some measurements are only available by reading a chart.** The light curve,
the rotation curve and the radial-velocity trace are drawn to a canvas. Their
*numbers* are available as text in the readout and in the investigation
probes, and the lessons that depend on them ask for typed values rather than
for a visual judgment — but the shape of a curve is not currently narrated.
Investigation steps state their instructions and their expected measurements as
text, so a lesson is followable; the aesthetic reading of a curve is not.

**Direct manipulation has no keyboard equivalent.** Placing a body by clicking,
and dragging to set its velocity, are pointer gestures. The same systems can be
loaded from the gallery, from a share link, and from a lesson's own setup, and
every scenario in the catalog is reachable without the canvas — but building
an arbitrary system by hand is not currently a keyboard task.

**The attribution links in the footer are under 24×24.** They are inline text
links in a sentence, which WCAG 2.5.8 explicitly exempts. Enlarging them would
mean changing a line of running text into a row of buttons.

**Automated checks are a floor, not a ceiling.** <!--fact:axeRuns-->60<!--/fact--> clean axe runs mean no
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

**If a tagged document is needed today**, the same content is on the web in HTML,
which is tagged by construction: the investigations at
[gravitas-sim.online](https://gravitas-sim.online), and the public teaching and
model pages. The PDFs are a convenience for printing and for handing out, not the
only route to the material.

## Running the checks

```bash
npm run a11y            # both suites
npm run a11y:axe        # axe only, all 60 combinations
npm run a11y:manual     # keyboard, focus, reflow, reduced motion, the canvas
```
