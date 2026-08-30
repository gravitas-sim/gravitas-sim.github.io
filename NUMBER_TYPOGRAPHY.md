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
- `js/energyChartNew.js` and `js/investigations.js` format chart axes and
  tooltips.

## What was deliberately left alone

**Lesson widgets keep their own decimal counts.** A transit depth shown to four
decimals is a pedagogical choice tied to the lesson text and to what a student is
asked to type in. Converting those to significant figures would change displayed
values in six investigations to fix a typographic problem they do not have. Their
*units* were made consistent; their precision was not touched.

**Positional coordinates keep one decimal place.** A position in simulation units
is a location on a grid, not a measurement, and a coordinate pair reads better
when both halves are formatted the same way regardless of magnitude.

**The CSV export does not come through this module.** `js/dataExport.js` writes
numbers for a spreadsheet and a Colab notebook to parse. Typographic characters
would break both.

**`commas()` in `js/blackHolePhysics.js` stays.** It asks for an exact number of
decimal places rather than significant figures, which is what a few prose labels
want.
