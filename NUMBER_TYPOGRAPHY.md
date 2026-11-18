# Number typography

Gravitas is a tool for reading numbers off a screen, and until now its numbers
were formatted wherever they happened to be printed. The interface around them
had been rebuilt twice; they still read as though a programmer had written them.

Everything is now decided in one place, [`js/format.js`](js/format.js).

## The rules

**Scientific notation is written the way it is written on a blackboard.**
`1.99 × 10³⁰`, not `1.99e+30`. The exponent uses Unicode superscript digits
rather than markup, so one implementation serves HTML, canvas `fillText` and the
PDF export. Nothing in the interface prints a float's own exponent form any
more; the only two survivors are the CSV export, which is meant to be read by a
machine, and one developer console log.

**Significant figures, not decimal places.** Three by default. A fixed decimal
count is wrong at both ends: it printed `0.00` for a small planet and
`100039.2 M☉` for a black hole in the same interface.

Trailing zeros are kept, because that is what a significant figure means. One
solar mass measured to three figures is `1.00`, not `1`. It is also what lets a
column line up: `1`, `0.75` and `80` share no decimal point, while `1.00`,
`0.750` and `80.0` do.

**A real multiplication sign and a real minus sign,** not the letter x and the
hyphen. `withUnit` will typeset a leading hyphen for a caller that formatted its
own value, so a lesson widget keeping a decimal count its text depends on still
gets the typography.

**A non-breaking space between a value and its unit,** symbol or word alike.
These are readout items, not sentences: `29.5` on one line and `km` on the next
is never what was wanted.

**Tabular figures wherever numbers are stacked.** A `1` is narrower than a `7`,
so a live readout shifts sideways as its own values change and the eye has to
re-find the decimal point on every update. Widget readouts and the speed display
already had this; the object inspector, the live HUD and the energy panel did
not.

## Spanish: the decimal comma (Prompt 282)

Spanish writes a decimal comma and, from five digits, groups with a narrow
no-break space (`12 345,6`, but `1234,5`: the SI and the RAE). `formatNumber`,
`decimal`, `scientific`, `fixed`, `withUncertainty` and `plural` take a
`locale`. A caller that names none follows the page's own `lang`, which every
page sets from the stored choice, so a page in Spanish prints the comma at every
one of the formatter's call sites without each learning to ask; a script with no
page (Node, a worker, the generators) is English unless its caller says
otherwise. An interval is `[1,222; 1,246]` in Spanish because its comma is taken.

What the comma does not reach: a CSV, a saved record, a link and a JSON export
never come through this module and keep the point; the 440 or so `toFixed` and
`toPrecision` calls the number ratchet still counts print a point in Spanish
until they move (the ratchet only falls); the instructor bundle's Spanish text
is generated with an explicit locale or none, as its build has no page.
What a student types is read by `js/answerParse.js` in both marks, with the
locale recorded beside the answer: `0,910` is 0.91 where the answer was typed in
Spanish and 910 where it was typed in English, which is why the ambiguous
`1.234` is refused rather than guessed. `parseFormatted(text, locale)` reads the
comma back for a test. The decision and its evidence are register row
D-R10-282-01.

## Lesson prose: numbers and formulas in running text

Numbers in lesson prose are written by hand, so the rules live where the prose
is rendered, in `typeset` in [`js/lessonMarkup.js`](js/lessonMarkup.js), and
apply to every lesson in both languages, including the feedback a lesson builds
in code.

- **A number never ends a line apart from the word after it.** A digit (or a
  superscript, as in 10<sup>13</sup>) followed by a space and a letter, a
  percent sign or a degree sign gets a no-break space, and so does a scale
  word (`million`, `millones`) before its unit. This is wider than a list of
  units on purpose: it cannot miss a unit, and holding "3 planets" together
  harms nothing.
- **A hyphen before a digit is a minus** (U+2212), after a space or a bracket.
  A range ("3-5") and a name ("Kepler-10") keep their hyphen.
- **An operator stays with the term before it.** `=`, `≈`, `∝`, `÷`, `−` and
  `±` take a no-break space before them, so a line never starts with one; a
  multiplication sign takes narrow no-break spaces on both sides.
- **Variables are italic and units upright.** A single-letter variable in a
  formula is written `<em>a</em>`, with real subscripts and superscripts
  (`<em>P</em><sup>2</sup> = <em>a</em><sup>3</sup>`), not `P²` in plain text
  and not `a x e`, `sqrt()` or "a cubed". `<em>` is used rather than a new tag
  because every consumer that flattens prose to plain text (the answer keys,
  the lab report, the recovery notice) already removes it.
- **A name the interface shows keeps the interface's spelling.** `k2` in the
  tides lesson is the label of a control, so the prose says `k2`;
  `R_Jupiter` is the unit a field prints and stays as it is.

`tests/lessonTypography.test.js` renders the five pilot lessons in both
languages and fails on a number parted from its unit, a hyphen standing for a
minus, a spelled-out operator or an upright variable beside an operator.

The body of a lesson step is 14 px (`--text-base`) where its column is 350 px or
wider and 13 px (`--text-sm`) below, in lines capped at 36em: the measured
line lengths, and the reason, are in register row D-R4-339-01.

## Where the threshold sits

Scientific notation is used outside the range `1e-3` to `1e5`. The lower bound is
where leading zeros start to outnumber digits, the upper where a grouped integer
stops being readable at a glance. The choice is made on the *rounded* value:
99999 to three figures is 100000, which belongs on the other side of a threshold
it has just crossed.

## The API

```js
formatNumber(value, { sig = 3, sci, compact })  // "1.23 × 10⁶", "1,230"
scientific(value, sig, compact)                 // always a power of ten
decimal(value, sig)                             // always grouped decimal
tickLabel(value, sig = 2)                       // shortest readable: "10⁻⁴"
withUnit(value, symbol, options)                // binds the two together
superscript(n)                                  // 30 -> "³⁰"
parseFormatted(text)                            // back to a number, for tests
```

`tickLabel` is the one place a mantissa of exactly 1 is dropped: `10⁶` rather
than `1.00 × 10⁶`. On a chart axis a dozen labels compete for room and nothing is
being compared digit by digit. Everywhere else the mantissa is kept, because
alignment is the whole point.

## What consumes it

- `js/units.js` provides `sig`, `formatDistance`, `formatMass`, `formatSpeed`,
  `formatTime`, `formatEnergy`. This is the widest path: the object inspector,
  the probe rows, most widget readouts.
- `js/physics.js` draws the mass labels next to objects on the canvas. These
  were `toFixed(1)` and `toFixed(2)`, which is where `100039.2 M☉` came from.
- `js/blackHolePhysics.js` used to carry its own superscript table and its own
  scientific-notation routine. That is how the same quantity came to be written
  two ways in one interface. It now delegates, and keeps only its own choice of
  precision, which is deliberate: `4.3 million M☉` reads better than
  `4.30 million M☉` and these are prose-shaped labels.
- `js/pdf.js` formats axis ticks. `toWinAnsi` folds a run of superscripts into
  `^30` for the standard PDF fonts, which it already did correctly. A non-breaking
  space is now measured as a space rather than as a letter, so a bound value and
  unit no longer read as wider than they print.
- `js/inspectorPanel.js` and `js/investigations.js` format chart axes and
  tooltips.

## What was deliberately left alone

**Lesson widgets keep their own decimal counts.** A transit depth shown to four
decimals is a pedagogical choice tied to the lesson text and to what a student is
asked to type in. Converting those to significant figures would change displayed
values in every investigation that has a widget in it, to fix a typographic
problem they do not have. Their *units* were made consistent; their precision was
not touched.

**Positional coordinates keep one decimal place.** A position in simulation units
is a location on a grid, not a measurement, and a coordinate pair reads better
when both halves are formatted the same way regardless of magnitude.

**The CSV export does not come through this module.** `js/dataExport.js` writes
numbers for a spreadsheet and a Colab notebook to parse. Typographic characters
would break both.

**`commas()` in `js/blackHolePhysics.js` stays.** It asks for an exact number of
decimal places rather than significant figures, which is what a few prose labels
want.

<!-- Listed in DOCUMENTS.md. -->
