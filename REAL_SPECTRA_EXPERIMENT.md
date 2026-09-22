# Four real spectra: experiment and integration

The experiment was built on `feat/real-spectra-preintegration` from `v2` at
`e967cc0af82f9fffc7de07a3af584f5e88fcc043` (head `ee62d22`). It was integrated
on `feat/real-spectra` from the green v1.1 `v2` at
`3b8ce8fa652e567ece1f284c68daf49dce2d059e`, which carries #16, #17 and #20, by
replaying its changes rather than merging the stale branch. See **Integration**
at the end for what changed on the way in.

This document is the decision record the experiment is to be judged against,
and the classroom gate in it was written before the implementation was
declared to work.

---

## The question

Not "can Gravitas contain a spectrograph?" — it plainly can. The question is:

> Do four real spectra add something educationally important beyond the
> temperature-and-color representation the lesson already has?

`starColor()` turns a temperature into a color, and `A Universe of Stars` spends
twenty-nine screens teaching a student to read temperature and luminosity off a
diagram. If four observed spectra only let a student do the same thing in a
prettier way, they are not worth a feature.

## What was built

Four observed spectra, one each of A, G, K and M, behind two small widgets and
six lesson steps in the existing `a-universe-of-stars`. No synthetic spectra, no
instrument model, no spectrograph mode, no sampler, no engine change.

| piece | what it is |
| --- | --- |
| `tools/build-sdss-spectra.mjs` | acquisition: fetch, checksum, validate, trim, thin, emit |
| `.sdss-cache/` | gitignored CSV cache, like `.gw-cache` and `.mist-cache` |
| `js/data/spectra/sdssSpectra.js` | generated, committed: provenance + int16 flux |
| `js/stellar/spectrumIndex.js` | air/vacuum, window mean, band depth, TiO5 — one implementation |
| `js/stellarSpectraWidgets.js` | two widgets; loads the data by dynamic import |
| six steps in `a-universe-of-stars` | screens 30–35, before the summative question |

## The four, and why these four

The selection rule was fixed before any spectrum was plotted. It is a rule about
the catalog, not about how a curve looks.

1. `class = 'STAR'`, `zWarning = 0`.
2. `plate < 3510` — the SDSS legacy spectrograph rather than BOSS, so all four
   share one instrument, one wavelength grid, one resolution and one flux
   calibration. The comparison is then between stars and not between
   spectrographs.
3. One class each, at a subtype not adjacent to a class boundary, because at a
   boundary the letter itself is what is in doubt.
4. Of those, the highest `snMedian`.
5. After selection, check in the data that the class's defining signature is
   actually there.

Step 5 changed the M star and is worth recording. The highest-signal M dwarf in
the archive is an M0V, and its published TiO5 index is 0.887 against 0.940 for
the K star — a six per cent difference in the one feature that *defines* class M
in the MK system. It is not a feature a student could find. Step 3 excludes
subtype 0 for exactly this reason and the rule lands instead on an M1 whose
TiO5 is 0.657. That was a measured decision, not a preference about a picture.

| | plate–MJD–fiber | `subClass` | `elodieSpType` | Teff | S/N | observed |
| --- | --- | --- | --- | --- | --- | --- |
| A | 3138–54740–433 | A0 | A1V | 7852 K | 108 | 2008-10-01 |
| G | 3128–54776–178 | G2 | G5 | 5625 K | 127 | 2008-11-06 |
| K | 3121–54749–511 | K3 | K3V | 4775 K | 116 | 2008-10-10 |
| M | 2871–54536–245 | M1 | M2Vvar | 3980 K | 87 | 2008-03-11 |

Two independent pipeline classifications agree on the letter in all four cases.
No class here was inferred from a color. The A star's pipeline surface gravity
is 3.18 and its metallicity −1.67, so it is very probably not a main-sequence A
dwarf; the lesson calls it an A-type star and never a dwarf.

## What is visible in the data, and what the lesson can therefore claim

Band depth, in per cent, measured on the committed data:

| | Ca II K | Hβ | Na I D | TiO 7050 |
| --- | --- | --- | --- | --- |
| A (A0) | 3.4 | 36.6 | 3.7 | 1.9 |
| G (G2) | 56.1 | 14.4 | 9.0 | 1.8 |
| K (K3) | 52.6 | 9.0 | 23.0 | 0.2 |
| M (M1) | 21.9 | 4.8 | 52.6 | 13.5 |

Three findings shaped the lesson:

**The continuum alone orders all four.** The ratio of flux at 4,100 Å to flux at
8,100 Å runs 3.376 / 1.791 / 0.459 / 0.101 — a thirty-fold spread. A student can
rank these four by color at a glance, and screen 31 asks them to, on purpose.
Any design in which the classification task is solvable this way would be a
failure of the experiment, so the lesson establishes the color result first and
then removes it.

**Inside a window the continuum carries nothing.** Across 4,780–4,950 Å the blue
fifth over red fifth ratio is 1.031 / 1.036 / 1.054 for A, G and K — all three
within two per cent of each other and of flat. Across 6,950–7,250 Å all four are
within four per cent. The color cue is genuinely gone at that scale, and it is
gone by zooming, which transforms nothing.

**Two of the four features are not monotonic in temperature.** Hydrogen peaks at
A and falls away on both sides of it; calcium is nearly absent in the A star,
enormous in the G and K, and down again in the M. A quantity that rises and
falls cannot be recovered from a temperature, even in principle, because the
mapping is not one-to-one. That is the sharpest claim four spectra can support
and it is what screens 32 and 34 are built on.

## Six steps, and what each is for

Screens 30–35, placed **before** `the-argument` so that the lesson's summative
question stays the last thing it asks.

| # | sid | type | job |
| --- | --- | --- | --- |
| 30 | `spectra-the-light-itself` | read | these are measurements; the canvas is still the model |
| 31 | `spectra-color-is-enough-here` | choice | color works, and it is what `starColor()` knows |
| 32 | `spectra-two-features` | measure | Hβ and Ca II K ×4, in a window with no color in it |
| 33 | `spectra-name-the-star` | choice | classify one star with no color on the screen |
| 34 | `spectra-what-color-cannot-give` | short | the general statement, in the student's words |
| 35 | `spectra-four-is-four` | read | what four examples do and do not establish |

Screen 33 is the load-bearing one. Its four options each name a class *and* the
evidence for it, and three of them state a number the readout contradicts. It is
answerable only by reading features, because `spectra-identify` has no
whole-spectrum setting: the continuum slope is not on the screen at all.

## What this does not establish

Four spectra are four spectra. One star per letter, chosen for signal-to-noise
rather than sampled from anything; another A star would give different numbers;
O, B and F are absent. Nothing here supports a statement about what A stars in
general do, and screen 35 says so at length.

The distinction between real observed quantities, stellar models and synthetic
populations is kept. Every readout on both widgets opens with a row saying these
are observations, the scene audit records the dataset with `origin:
'observation'` beside MIST's `origin: 'computed-grid'`, and screen 30 says in as
many words that the three stars on the canvas are not the four in the panel.

---

## The classroom gate

**This has not been run. No student has used these screens. Nothing in this
branch is evidence about student behavior, and no telemetry was added to
manufacture any.**

The gate is written here, in advance, so that the answer cannot be adjusted
afterwards to fit what was built.

### The question the gate answers

> Can students solve the classification task from continuum color or slope
> alone, or do they actually need and use the absorption features?

### The protocol

One class, one session, using the evaluation mechanisms the project already has
(`evaluation/`, the notebook fields, and the instructor's own observation). Ten
to twenty students is enough; this is a yes/no question about whether an
affordance gets used, not an effect size.

Record, per student, four things:

1. **Did they open the feature view?** Whether the `window` control was moved
   off its opening position on screen 33 — observable from the instructor's
   position, because the plot changes shape visibly.
2. **What evidence did they cite?** Screen 34 is a short written answer and its
   rubric already distinguishes the two cases: an answer naming a feature and a
   value, against an answer resting only on one curve being bluer than another.
   Collect these; they are the primary record.
3. **Does the classification survive with the color cue removed?** Screen 33 is
   already this condition — the instrument shows no continuum. Compare the
   proportion correct there with the proportion correct on screen 31, which is
   the color-only control.
4. **Can they name a feature afterwards?** One verbal question at the end of the
   session: *"what in the spectrum told you?"* Record whether the answer names
   a feature — hydrogen, calcium, sodium, the titanium oxide band — or restates
   a color.

### The criterion, fixed in advance

**The spectra have earned further development if all three hold:**

- more than half the class moves the wavelength control on screen 33 before
  answering; **and**
- more than half the screen 34 answers cite a named feature and a measured
  value rather than a color; **and**
- accuracy on screen 33, where no color is available, is not markedly worse
  than on screen 31, where color is all there is — that is, removing the color
  cue does not break the task.

**They have not, if either of these holds:**

- students answer screen 33 correctly without ever changing the window, from
  memory of which curve was reddest on screen 30; **or**
- the screen 34 answers are overwhelmingly about color, and the rubric's
  rejected answer is the modal one.

### What follows from each outcome

**If the criterion is not met:** real spectra have not yet justified a larger
spectrograph feature. The synthetic and instrument half of the larger proposal
should **not** be built. The four spectra may still be worth keeping as six
screens — they cost nothing at start-up — but they would not be evidence for
anything more.

**If the criterion is met:** students used line and band information they could
not have obtained from `starColor()`, and that is evidence for considering the
next stage. It is not by itself a decision to build it.

---

## Where the data is, and when it is fetched

*As measured on the experiment's base, `e967cc0`. The chunk sizes changed on
integration - the data chunk is now 15.8 KB, not 24 - and the current figures
are under **Integration**; the loading behaviour described here did not.*

Measured, not assumed, by `e2e/stellarSpectra.spec.js`:

- **Not in the initial download.** 811.1 KB before this branch and 811.1 KB
  after, against an untouched 830 KB limit. The entry graph does not reach any
  of it.
- **In a chunk of its own.** `dist/js/chunk-POKDLEVR.js`, 24 KB. The widget code
  is duplicated into `validationWorker.js`, `instructorPortal.js` and
  `submissionReview.js` the way every widget family's code is; the thirteen
  kilobytes of flux is not, which is the whole reason the data module is behind
  a dynamic import rather than a static one.
- **Fetched when the lesson browser opens**, not when this lesson is picked, and
  exactly once. The browser button loads `js/investigations.js`, which imports
  the widget registry, which imports this family, whose module scope starts the
  import.

That last point is the honest limit of the laziness and it is a deliberate
trade. Deferring the import to the widget's own first draw would be stricter,
and cannot currently be done well: a widget has no way to ask the lesson engine
to repaint, so a panel that mounted before the data landed would sit on its
waiting state until the reader moved a control. Twenty-four kilobytes fetched
alongside the lesson catalog is the better of the two available behaviours. The
same fire-and-forget module-scope import is what `js/widgets.js` already does
for `ensureDeferredMessages()`, for the same reason.

## The cadence audit, re-checked against a moving `v2`

`v2` advanced from `e967cc0` to `60de44a` while this branch was being written,
and two of the files the audit in SANDBOX_INSTRUMENTS.md quotes are among what
moved: `js/timestep.js` and `js/render.js`. The audit was therefore re-checked
against the newer tree rather than left resting on the base.

It holds unchanged. The `substepPlan` edit on `v2` is about a *backward* step:
`!(dtSim > cap)` was true for every negative advance, so a reversed run was
integrated in one uncapped leap. The fix takes the magnitude for the substep
count and lets the sign ride along. The load-bearing line is byte for byte what
it was:

```js
return { substeps, step: dtSim / substeps, capped: wanted > MAX_SUBSTEPS };
```

`step` is still `dtSim / ceil(|dtSim| / cap)` — bounded by the cap, almost never
equal to it — and `gameLoop` still reads
`const dt_seconds = fixedStepSeconds || measured;`. `max_timestep` is a
numerical-accuracy ceiling on the newer tree too.

## Notes the experiment left, and what became of them

- **Deferred budget.** The experiment measured +58 KB against a 3880 ceiling.
  On the v1.1 baseline the figure is +51.7 KB against 4030 after one cleanup,
  and it is the decision this integration stops at - see **Budget** below.
- **Manifest headroom.** Obsolete: #17 replaced the flat 16 KB limit with a
  per-entry rule, and the lesson summary is back to its natural wording.
- **Instructor bundle.** `instructors/materials.enc.json` is encrypted with a
  passphrase this work was told not to use, so it cannot be regenerated here and
  is stale with respect to the six new screens' instructor notes. Whoever holds
  the passphrase should run `npm run build:instructors` and commit the bundle
  with its manifest.
- **Rebase conflicts.** Predicted two textual unions in the deferred catalogs and
  the e2e README; in the event the catalogs merged cleanly and the two real
  conflicts were `js/widgets.js` and the namespace allowlist. Both are recorded
  under **Integration**.
- **The scene audit labels these steps `model-result`** as well as
  `imported-data`. Still true, and still pre-existing: `ownModel` is true for any
  non-live widget with controls, so the GW lesson's observed strain is labeled
  the same way. It deserves its own change rather than a side effect of this one.

---

## Integration onto v1.1

### How the changes were carried

Replayed onto `3b8ce8f`, not merged. The experiment's hand-written hunks were
applied three-way; the two files that genuinely conflicted - `js/widgets.js` and
the deferred-namespace allowlist in `tests/i18n.test.js` - were both cases of
each side adding a line, and were resolved as the union, keeping v2's observing
and power-law families. Every generated file (the two manifests, the scene
catalog and record, `manual/facts.tex`, `sw-manifest.js`, and the counts in
README, CHANGELOG and CONTRIBUTING) was taken from v2 and regenerated from the
combined tree rather than copied; the experiment's diffs to the three prose
documents were checked first and were entirely inside `<!--fact-->` markers.

### Provenance, re-verified - with the archive half down

On 2026-09-22 SDSS's spectrum service was returning `502 Bad Gateway` after
holding each connection for about 122 s; every other SDSS host answered. A fresh
re-download was therefore not possible. Provenance was verified by three routes
that do not depend on that service:

1. **The catalog, live.** SkyServer's SQL service returned all four `specObjID`s
   with the recorded plate-MJD-fiber, `class = 'STAR'`, `zWarning = 0`, and
   `subClass` / `elodieSpType` exactly as recorded: A0/A1V, G2/G5, K3/K3V,
   M1/M2Vvar.
2. **The original bytes.** The four CSVs fetched on 2026-09-21 are still in the
   experiment's gitignored cache, and each matches its recorded SHA-256 and size.
3. **Reconstruction.** On the combined tree, `npm run spectra:provenance`
   regenerates the committed data byte for byte from those bytes.

The outage also exposed a defect in the acquisition tool, now fixed: its fetch
had no deadline, so a hung archive stalled the build two minutes per spectrum.
It now aborts after 60 s. The M-star choice is unchanged, and is stated here as
what it is: a **curated teaching selection**. The highest-signal M dwarf was
passed over because its TiO band was too weak to teach the distinction; these
four are examples, not an unbiased sample of anything.

### A correction to the experiment's own bundle finding

The experiment reported roughly 24 KB of spectra widget code duplicated into the
worker and portal bundles. That was wrong, and it was my probe that was wrong:
it searched built files for `spectra-identify`, which is also a tool id inside
the lesson steps. Attributing bytes with esbuild's metafile instead shows each
piece exactly where it should be:

| module | bundle(s) | KB | why |
| --- | --- | --- | --- |
| spectra data | its own lazy chunk | 15.5 | dynamic import; nowhere else |
| widget + `spectrumIndex` | the widget-registry chunk | 9.2 | once |
| lesson, en / es | lesson chunks, and `submissionReview.js` | 12.0 / 8.9 | review bundles every lesson to read answers - legitimate |
| `specW` strings, en / es | deferred catalogs, and `validationWorker.js` | about 3.3 each | the worker embeds the deferred catalogs |
| instructor content | `instructorPortal.js` | 2.2 | the flow and expectations for the six screens |

The deferred budget counts only the application's split output, so the worker,
portal and review copies are real bytes but not budgeted ones.

### The one cleanup, and one that was declined

**Done: the provenance record left the lazy chunk.** No browser module read the
spectra's `PROVENANCE`, and it plus the per-spectrum audit fields were 8.4 KB of
the 23 KB chunk every reader of the lesson downloaded. It is now
`js/data/spectra/sdssSpectraProvenance.js`: generated by the same run, checked by
the same command, cross-checked against the data by payload checksum, and
imported by nothing in `js/` - a test says so, and the browser spec asserts it is
never requested. The data chunk went from 23,760 to 15,839 bytes. The readout
gained a one-line source citation in its place, as the GW lab has.

**Declined: moving the `specW` strings into a feature catalog**, as #16 did with
`en.placement.js`. It would save 6.6 KB, all of it in `validationWorker.js`,
which the budget does not count. And it would cost correctness: the lesson
engine awaits the deferred catalog *before* it mounts a lesson panel, and a
feature catalog would race that, so a student resuming straight into screen 31
could hear a screen reader announce `specW.control.window` as a slider's label.
#16's dialog avoids the race by awaiting its catalog before it renders; a lesson
widget cannot.

### Accessibility, against #16

#16 changed two surfaces - typed body placement, and tables for the three
observing plots in the export dialog. It did not change lesson widgets, whose
text equivalent is still the readout rows the canvas's `aria-label` points to.
So the spectra widgets stay on that convention rather than bolting a second
table system onto a lesson screen, and fill its one gap: each depth now states
the stretch of spectrum it was measured over and what it was measured against,
not just a centre wavelength. A reader who cannot see the shaded band has, in
text, the feature, its window, its reference windows, the measured depth, the
archive identity and source, and - once revealed - both classifications.

### The manifest

#17 replaced the flat 16 KB manifest limit with a per-entry rule (mean under
800 bytes, none over 1,400). The experiment had shortened this lesson's summary
to fit the old limit, and in doing so dropped "supergiants" from it. The
natural wording is restored: this entry is 930 bytes in English and 971 in
Spanish.

### Cadence

Re-checked on `3b8ce8f`. Nothing in `js/timestep.js`, `js/render.js` or
`js/physics.js` has changed since the last check, and the measurement reproduces
exactly. `max_timestep` is still a numerical-accuracy ceiling, not an instrument
clock; `SANDBOX_INSTRUMENTS.md` stands as written.

### Budget - the owner decision this integration stops at

```
baseline v2 (3b8ce8f)          4021.3 KB   ceiling 4030.0
spectra, as replayed          +  57.8      4079.3
after the provenance split    -   6.3      4073.0 KB
                                           +43.0 over the current ceiling
                                           +53.0 over the authorised 4020
initial download               816.5 -> 816.5 KB   (830 untouched)
committed spectrum data        19.0 KB runtime + 12.2 KB provenance (source)
```

The authorisation of 4020 KB was written before #20 raised the ceiling to 4030,
and the v1.1 baseline alone is 4021.3 - so no version of this feature, however
small, could have met it. The irreducible part is the lesson content itself
(20.9 KB across two languages), the widget (9.2) and its strings (6.6); the data
is 15.5 KB of it, thinned no further than the science allows. The smallest
sensible ceiling that would carry it is **4080 KB**: 7.0 KB of headroom, the
same margin the 4030 figure was chosen for. It has not been raised.
