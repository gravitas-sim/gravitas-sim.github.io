# The formula language

A closed language for a derived column or quantity: a student writes a formula over numbers they already have, and Gravitas computes it, checks every unit, and propagates the uncertainty. Nothing a student types is ever run as code. The text is read into a tree by a hand-written recursive-descent parser and the evaluator walks the tree; the module contains no `eval` and no `Function` constructor, and `tests/formula.test.js` reads its source to prove so.

The code is `js/formula/` (`parse.js`, `units.js`, `engine.js`; `grade.js` for questions; `evidence.js` for the envelope). It is pure: no DOM, browser and Node alike.

## The grammar

```text
expr   = term { ("+" | "-") term }
term   = unary { ("*" | "/") unary }
unary  = ("-" | "+") unary | power
power  = atom [ "^" unary ]            right-associative: 2^3^2 is 2^9, -2^2 is -4
atom   = number [ "[" unit "]" ] | name | "{" id "}" | call | "(" expr ")"
call   = name "(" [ arg { sep arg } ] ")"
arg    = expr | 'unit'                 a quoted unit, only in to(x, 'km/s')
```

- **Numbers** are read by the shared reader (`js/answerParse.js`) in the locale's convention: `1.5` in English, `1,5` in Spanish. Because a comma is then a decimal mark, arguments are separated by `;` in both languages and by `,` also in English. `×`, `·`, `÷`, `−` and the superscripts `²` and `³` are read as their ASCII forms.
- **A unit** follows its number in square brackets, `5[km/s]`: a registry id or spelling, optionally with a power of ten as data write one (`1e-17 erg/s/cm2/Angstrom`).
- **A name** is letters, digits and `_`, not starting with a digit: a constant, or the id of a column or quantity. An id with other characters (`flux-err`, `orbit.period`) is written in braces, `{flux-err}`. A name that is a constant is the constant; the braces always read the column.
- **Functions**: `sqrt`, `log10`, `ln`, `exp`, `abs`; `sin`, `cos`, `tan` (radians), `sind`, `cosd`, `tand` (degrees); `asin`, `acos`, `atan` (radians out), `asind`, `acosd`, `atand` (degrees out); `min`, `max`, `mean` over a column; `to(x, 'unit')`.
- **Constants** (a pinned table, CODATA 2018 and the IAU nominal values the units registry holds): `G`, `c`, `k_B`, `h`, `sigma_SB`, `M_sun`, `R_sun`, `AU`, `pc`, `day`, `year`. `G` and `sigma_SB` are treated as exact.
- **Not in the language**: assignment, conditionals, loops, strings (but the quoted unit in `to`), property access, user-defined functions.

Limits: 400 characters, 200 tokens, 150 nodes, 20 levels of nesting, 40 characters in a literal, 20,000 rows. Every refusal is a `FormulaError` with a `code` (`CODES`), `vars` and, where it is about some of the text, `at`; `js/i18n/en.formula.js` words each in both languages.

## Units

Every registry dimension (`js/formula/units.js` `DIMS`) is written as exponents of the SI base units, counts and pixels, with the factor from the registry's base unit into coherent SI; a test holds the table to the registry. A value is held in coherent SI while it is computed, so a kilometer over a meter is 1000 with no conversion code.

- A sum is of one dimension. `a + t` for a length and a time is refused, naming the sub-expression and both dimensions in SI (`m`, `s`).
- A logarithm or exponential takes a dimensionless number, and an exponent is a plain number the formula states. A power may give whole and half powers of a unit, not other fractions.
- Angles are dimensionless, as in SI, but an angle is carried as one: `sin(x)` takes radians, `sind(x)` degrees, and an angle added to a plain number is refused (`1 + 30[deg]`) rather than read as either.
- A magnitude (`mag`), a logarithm (`dex`) and a simulation unit add and subtract with their own kind and may be scaled by a plain number (`g - 5[mag] * log10(d / 10[pc])`, the distance modulus); they are never multiplied by a quantity.
- A unit that is not stated is never guessed: a column with none is refused until its unit is stated.
- `to(x, 'unit')` writes a quantity in a unit of the same dimension, a registry unit or a product and quotient of them with whole powers (`'yr^2/AU^3'`). A flux per wavelength does not become a flux per frequency, and a magnitude converts to nothing else, because their dimensions differ.
- The result carries a registry unit (an input's own where the formula only rescales it, else the registry's unit of its dimension), is flagged dimensionless, or says it has no registry unit (a time squared per length cubed). A column needs a registry unit; to make a plain number of such a quantity, divide by unit literals: `(P / 1[yr])^2 / (a / 1[AU])^3`.

## Uncertainty

First order, for uncorrelated inputs, each with a standard deviation. Every number carries its partial derivative with respect to each input, so a quantity used twice (`x - x`, `x * x`) is differentiated once and correctly, not added in quadrature as two inputs. The basis is `derived`.

- An input with **no** uncertainty gives a result with none, and the result says which input lacked it. It is never treated as exact.
- An input with an **interval** uncertainty is refused, and the message points at the bootstrap in the analysis lab.
- `min`, `max` and `mean` carry the standard error of the mean (and the argmin's or argmax's sigma), over rows that are present and not masked. An aggregate that shares an input with the rest of the formula (`x / mean(x)`) is correlated with it: the value is computed and the uncertainty is withheld, with the reason.
- Constants and literals are exact. A value outside a function's domain has no value (NaN) and is counted, never zero.

## Where students use it

- **The Observatory**: "By a formula…" in the changes panel adds a column. The change is `{op: 'formula', id, name, formula, locale}`: the text and the locale it was typed in, so a saved session replays to the same column in either language. The column keeps its formula (`derived`) and, where every input has an uncertainty, gets an uncertainty column. The engine is a lazy module (`js/observatory/formulaPanel.js`); a saved session that holds a formula loads it before it is replayed.
- **The notebook**: "Derive a quantity by a formula" names the numbers the notebook holds as `q1`, `q2`, …, and keeps the result as an entry (`derived-quantity`) whose envelope records the formula, the entries and quantities it read with a digest of each, and the rule (`js/notebook/derivedEntry.js`).
- **The Investigation Composer**: an inline numeric question may carry `formula: {expr, of, tolerancePct}` in place of `answer` and `tolerance` (`js/formula/grade.js`). `of` names fields of earlier measure steps as `step.field`; the expected value is computed from what each student measured when the answer is graded, in the question's unit. The pack validator reads the formula against the units of those fields. Until the student has measured, the question is not graded rather than marked wrong. The answer key gives the rule, not a number. A bank item cannot carry one: it cannot see the steps whose fields a formula reads.

## The evidence

`derivationEnvelope()` (`js/formula/evidence.js`) makes a `gravitas.artifact/1`: source kind `analysis`, id `formula`, a digest over the formula and its inputs; `provenance.derivation` with the formula, the locale, the rule (`first-order-uncorrelated`, or why there is none) and each input by id and digest; the quantity with origin `derived` and, where there is one, a sigma uncertainty with the basis `derived`. The basis is a new member of an enum, so the format stays version 1 (`FORMATS.md`).

## What it costs

Measured by `node tools/formula-size.mjs` (esbuild, minified, gzipped, the shared number reader, the registry, the envelope and the hash excluded): the language (`engine.js`) is 5,808 bytes and the question grader (`grade.js`) 6,228 bytes. `tests/formula.test.js` holds the ceilings, 6,144 and 6,656 (D-FORMULA-01). Everything is behind a dynamic import: no page loads it until a reader asks for a formula, opens a saved session that holds one, opens the notebook's form, or opens a lesson with a formula question.

## Not done

- A formula over a bank item's variants, and over more than the six fields a question reads.
- Correlated inputs (a covariance), and a derived column's evidence record as its own notebook entry (the notebook's form covers numbers; the column records its formula and inputs in the saved observation).
- Pairwise `min(a; b)`: `min`, `max` and `mean` take a column.
