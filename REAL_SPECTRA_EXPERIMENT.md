# Four real spectra: a pre-integration experiment

Branch `feat/real-spectra-preintegration`, based on `v2` at
`e967cc0af82f9fffc7de07a3af584f5e88fcc043`.

Not merged, not rebased, no pull request. This document is the decision record
the experiment is to be judged against, and the classroom gate in it was
written before the implementation was declared to work.

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

## Notes for whoever picks this up

- **The deferred bundle budget is exceeded by 56.4 KB.** It was not raised, per
  the terms of this experiment. See the report accompanying the branch.
- **The English investigation manifest has nine bytes of headroom** against its
  16 KB ceiling. Another lesson landing in `v2` will break it, and the fix is to
  shorten a `summary`, not to raise the ceiling.
- **`instructors/materials.enc.json` is stale** with respect to the six new
  steps. It is encrypted with a password this branch was told not to use, so it
  could not be regenerated here. Whoever rebases should run
  `npm run build:instructors` with the real password and commit the result.
- **The scene audit labels these steps `model-result`** as well as
  `imported-data`. That is a pre-existing coarseness — `ownModel` is true for
  any non-live widget with controls, so the GW lesson's observed strain is
  labeled the same way — and was left alone rather than changed on a
  pre-integration branch.
