# Architecture gate: declarative validation notation

**Status:** evidence and decision memo. Nothing here is implemented, and nothing
here should be merged into `v2`.

**Branch:** `scratch/declarative-validation-gate` (experimental, do not merge)

**Base SHA:** `887449984f162743a8cc0e950a1f1ee12c27dbf0`
— `v2` at 2026-09-21 12:25:22 -0500, *"Merge remote-tracking branch
'origin/fix/pluto-check-kind' into v2"*.

A separate v1.1 integration was actively modifying `v2` while this gate ran, so
every number below is measured against that fixed snapshot in a clean worktree
created from it. §10.8 lists what to re-check once the integration lands.

---

## The question

> Is the language required by real Gravitas validation logic still small and
> declarative enough to be human-reviewable, or does faithfully representing the
> existing validations require creating and maintaining a real programming
> language?

The proposal under test: replace JavaScript `validate` function bodies in
investigations with a declarative notation, so that a shared / commons-style
lesson format can rest on the claim

> *"A reviewer can read the document and see what it does."*

The gate does not assume that proposal is good. It takes the hardest validation
logic already in the repository, translates it by hand into the smallest
notation that can hold it, and reports what that notation turned out to be.

---

## Summary of findings

| | |
|---|---|
| `validate` bodies in the corpus | **81**, all inline, none a named reference |
| `probe` sites | **79** (an 80th grep hit is a comment) |
| Probes that are a bare reference to a named helper | **48 of 79** (61%) |
| Distinct helper definitions referenced | **16**, totalling 466 lines |
| Total helper references | **56** |
| `ctx` API surface a probe can reach | **41 members**, 406 lines |
| Bodies needing multi-branch early return | **81 of 81** |
| Bodies needing local bindings | **45 of 81** |
| Bodies needing a collection operation | **38 of 81** |
| Minimum notation discovered | **~46 core forms + ~51 builtins**, 8 value types |
| Verdict | **C — REJECT** as scoped; **B — NARROW** only under a stated design change (§10.7) |

The historical figure of "48 of 80 probes" is confirmed against this snapshot:
48 of 79 real probe sites, the 80th grep match being prose inside a comment in
`js/data/investigations/tides.js:1033`.

---

# 1. The corpus

## 1.1 Method

All 31 files under `js/data/investigations/` were scanned, and every `validate:`
and `probe:` value extracted by brace/paren matching with string, template and
comment skipping. Nothing was sampled by hand, and no source file was modified.

Each `validate` body was scored on the feature axes the gate names. Weights
were assigned once, before reading any body, and favour the features that force
an interpreter to grow: fold (6), destructuring (4), map/filter/some/every (4),
shared-helper call (4), spread (3), early `return null` (3), `toFixed` (3),
local bindings (2), conditionals (2), interpolation (2), and so on, with a small
per-line term (0.25) so that length alone cannot dominate.

Scores ranged from **23.1** (floor) to **166.3**, median **44**.

## 1.2 The ten hardest

| # | Score | Investigation | Step `sid` | Source |
|---|---|---|---|---|
| 1 | 166.3 | Kepler's Laws | `fast-and-slow-in-numbers` | `js/data/investigations/keplers-laws.js:447` |
| 2 | 138.4 | Kepler's Laws | `measure-four-planets` | `js/data/investigations/keplers-laws.js:677` |
| 3 | 113.0 | Tides | `four-distances` | `js/data/investigations/tides.js:442` |
| 4 | 108.1 | Tides | `three-masses` | `js/data/investigations/tides.js:617` |
| 5 | 103.0 | The Goldilocks Question | `write-the-three-down` | `js/data/investigations/goldilocks-question.js:271` |
| 6 | 100.3 | Kepler's Laws | `weigh-trappist-1-yourself` | `js/data/investigations/keplers-laws.js:1000` |
| 7 | 94.6 | Transit Photometry | `time-two-transits` | `js/data/investigations/transit-photometry.js:761` |
| 8 | 81.5 | Kepler's Laws | `measure-the-two-orbits` | `js/data/investigations/keplers-laws.js:284` |
| 9 | 80.2 | Transit Photometry | `recover-the-real-planet` | `js/data/investigations/transit-photometry.js:1231` |
| 10 | 75.3 | Listening to Spacetime | `test-distance` | `js/data/investigations/listening-to-spacetime.js:761` |

The tides validation the brief names is still at line 442, ranks **3rd**, and
still does every one of the things the brief recalled: builds an array of pairs,
filters with destructuring, returns `null` early, uses `.some`, `.map`,
`.reduce`, `Math.max(...) - Math.min(...)`, and interpolates a `.toFixed(2)`
result into its success message. It is included.

Four of the ten come from `keplers-laws.js`. That concentration is real and not
an artefact of sampling: that lesson carries 5 validations, two of which are the
only two in the entire corpus that read the live simulation.

## 1.3 What each one does, and what makes it hard

**E1 — `four-distances`, Tides** (rank 3). Four (distance, tidal-strength)
pairs typed by the student. Keeps the finite ones; bails to `null` under two
rows; rejects non-positive values; computes `t·d³` for each row, its mean, and
the relative spread `(max−min)/mean`; warns above 0.35; otherwise reports
success with the mean to two decimal places.
*Hard because:* array-of-pairs literal, destructuring in a filter predicate,
`.some`, `.map`, `.reduce`, spread into `Math.max`/`Math.min`, three derived
quantities in sequence, early `null`, interpolated `toFixed`.

**E2 — `measure-four-planets`, Kepler's Laws** (rank 2). Up to eight planets,
each contributing `a` and `P` under **computed field names** `p${i}_a` /
`p${i}_P`. Filters finite rows, rejects non-positive, computes `P²/a³` per row
and the relative spread, then branches on row count ≥ 3 and spread > 0.5.
*Hard because:* dynamic key construction from a loop index, a range literal,
record construction inside a `map`, fold, spread into `Math.min`/`Math.max`
**called again inside the message**, and `(spread*100).toFixed(0)`.

**E3 — `fast-and-slow-in-numbers`, Kepler's Laws** (rank 1). Two speeds and
optionally two distances. Guards finiteness, positivity and ordering; then
queries the live world for the body named `Eccentric` and its orbital elements;
then runs a **nested, fall-through block** on the optional distances (swap check,
then an eccentricity cross-check against `el.e` at 25% tolerance); then computes
`(1+e)/(1−e)`, compares to the speed ratio at 15% tolerance, and produces one of
three differently-worded diagnostics.
*Hard because:* it is the only body with a nested conditional group that can
fall through to the enclosing sequence; `Math.max(el.e, 1e-6)` is `max` on two
scalars where everything else is `max` of a list; it reads host objects
(`ctx.find` → body, `ctx.elements` → record); and it interpolates three
separately-formatted numbers into each of four messages.

**E4 — `three-masses`, Tides** (rank 4). Structurally E1 with `s/m` instead of
`t·d³` and a 0.25 threshold.

**E5 — `write-the-three-down`, Goldilocks** (rank 5). Structurally E1 with
`s·d²` and a literal (non-interpolated) success message.

**E6 — `weigh-trappist-1-yourself`, Kepler's Laws** (rank 6). Computes
`a³/(P/365.25)²`, compares against a named constant 0.0898 at ±0.008, and on
failure assembles a sentence out of a **direction word** chosen by ternary and a
**hint chosen from a five-branch chain**.
*Hard because:* `**`, a mutable local reassigned through an if/else-if ladder,
`toPrecision(3)`, embedded `<strong>`, and a user-facing message built by
**concatenating independently-chosen localizable fragments**.

**E7 — `time-two-transits`, Transit Photometry** (rank 7). Period from two
timestamps and an orbit count; catches the classic off-by-one by comparing the
stated orbit count against the difference of the two transit numbers; then three
overlapping numeric windows around 3.5, 7 and 1.8 days.
*Hard because:* the message contains `${gap === 1 ? 'time' : 'times'}` — a
**pluralization decision inside an interpolation slot** — plus `<strong>` and
string concatenation across lines.

**E8 — `measure-the-two-orbits`, Kepler's Laws** (rank 8). Periapsis and
apoapsis distances; checks ordering, then reads the live orbit's semi-major axis
and compares it to the mean of the two readings at 10%.
*Hard because:* host-object access again, a unit conversion (`el.a * 0.01`), and
the same derived quantity recomputed in three places.

**E9 — `recover-the-real-planet`, Transit Photometry** (rank 9). Two transit
depths; derives a radius from `sqrt(d_blend/1.2146)·1.155·109.198`, a ratio, and
a corrected radius; success needs **four** simultaneous window conditions.
*Hard because:* three unexplained magic constants, `sqrt`, a four-conjunct
condition, `<em>` in a message, and an ordering dependency — `rp` is computed
*before* the percentage-vs-fraction guard, so the `isFinite` check is what
catches a bad input.

**E10 — `test-distance`, Listening to Spacetime** (rank 10). Three strain
amplitudes and two cutoff frequencies. Uses `.every(Number.isFinite)` **point
free**, `.some(x => x <= 0)`, a negated two-sided range `!(r > 1.6 && r < 2.4)`,
and ends by returning `null` when everything passes.
*Hard because:* it needs lambdas in plain expression position, and it passes a
builtin *as a value*.

## 1.4 The shape of the whole corpus

Classifying all 81 bodies:

| Family | n | Score range | What it needs |
|---|---|---|---|
| A. scalar checks, literal messages | **33** | 23.1 – 80.2 | comparisons, `isFinite`, ordered rules |
| B. scalar checks + interpolated message | **10** | 40.9 – 100.3 | + interpolation, `toFixed` |
| C. collection ops, no fold | **32** | 26.8 – 75.3 | + lists, lambdas, `map`/`filter`/`some`/`every` |
| D. row-set + fold + spread-of-derived | **4** | 103 – 138.4 | + fold, spread, destructuring |
| E. reads the live world | **2** | 81.5 – 166.3 | + host objects, nested fall-through blocks |

Cross-cutting counts:

- **81 of 81** bodies have three or more exit points. Multi-way branching is the
  floor, not the ceiling — even the three joint-simplest bodies (score 23.1) are
  *guard → `null`; threshold → warn; else → ok*.
- **45 of 81** bind at least one intermediate result.
- **44 of 81** return `null` early.
- **38 of 81** use a collection operation.
- **19 of 81** interpolate; **17** format with `toFixed`/`toPrecision`/`toExponential`.
- **4** use fold, **4** destructure, **4** use spread.
- **2** take `(v, ctx)` and read the live world; the other 79 are pure functions
  of the student's typed fields.

That last line is the one genuinely encouraging number in the corpus: validation
is almost entirely pure. It is also the number that makes §5 hard, because the
*probes* — which the same notation would have to serve — are the opposite.

---

# 2. Shared probe helpers

## 2.1 Recomputed counts

| | Historical | This snapshot |
|---|---|---|
| Probe sites | 80 | **79** |
| Probes that are a bare named-helper reference | 48 | **48** |
| Share | 60% | **61%** |

The 80th historical site is a comment at `js/data/investigations/tides.js:1033`
describing the merge of two `probe` keys, not a probe.

Counting calls made from *inside* inline bodies as well as bare references,
**16 distinct helper definitions** (466 lines, ~2,117 tokens) serve
**56 references**.

No `validate` body is a named reference. All 81 are inline. Whatever a
declarative format does about reuse, it must do it for probes first.

## 2.2 The three most-reused

### 1. `runRows` — `binary-star-planets.js`, **9 steps**

`run-the-default`, `run-it-at-030`, `run-the-sweep`, `resolve-the-edge`,
`energy-drift-as-a-screen`, `the-case-that-matters`, `run-the-circumbinary`,
`sweep-the-circumbinary`, `where-the-fit-disagrees`.

Reads bound roles, names them, reads the last recorded experiment, and asks
`ctx.runMatchesScene(run)` whether that run still describes the current scene.
That last value is **three-valued** — `true`, `false`, or `null` meaning "recorded
before runs carried a world stamp" — and all three produce different text, with
`emphasis` set on `fresh === false` specifically and not on `!fresh`.

### 2. `zoneRows` — `goldilocks-question.js`, **6 steps**

`now-put-it-round-the`, `the-wider-definition-on-the`, `crossing-the-edges`,
`reading-the-fraction`, `watch-it-run`, `take-the-readings-yourself`.

Falls back from `ctx.selected` to the first bound role, asks
`ctx.habitability(...)`, and formats five rows from a record three levels deep
(`h.bounds.innerAU`), with interpolation in a **label** as well as in values.

### 3. `runRows` — `design-the-schedule.js`, **5 steps**

`set-the-run-up`, `run-both-schedules`, `break-your-own-result`,
`lose-a-fortnight`, `type-the-dates`.

**This definition is byte-identical to #1.** So is a fourth, `runRows` in
`gravity-assist.js` (4 steps). Three files, one 30-line function, `md5
e62168ec072ec373205f147eb6700f94` in all three, serving **18** probe sites.

That is worth stating plainly: **the duplication problem §5 is about already
exists in the JavaScript, and JavaScript's module scope has capped it at three
copies rather than eighteen.** A declarative format without definitions would
uncap it.

Because two of the top three are the same function, a fourth distinct helper is
translated below as a stress case.

### Stress case: `photometry` — `transit-photometry.js`, **4 steps**

Builds a row list, **conditionally appending** two rows when a complete transit
exists and a different single row when it does not, with `String()` coercion and
two different decimal precisions.

### Parameterisation is already load-bearing

Two helpers in the corpus take arguments, and both matter for §5:

- `fixed = (v, n = 3) => (Number.isFinite(v) ? v.toFixed(n) : '-')`
  — a null-safe formatter with a **default argument**, used by 3 probes in
  `keplers-laws.js`.
- `tideRows(ctx, { onRole = 'earth', byRole = 'moon', trueRatio = null } = {})`
  — **named arguments with defaults**, used 3 times. One call passes
  `onRole: 'star', byRole: 'hole'` to retarget the whole computation; two pass a
  **58-word user-facing sentence** as the `trueRatio` argument. The result is
  **spliced** into a larger row list with `...`.

So in the current corpus a shared definition already needs parameters, default
values, named arguments, prose passed across the call boundary, and result
splicing.

## 2.3 Translated / index-aligned content

`mergeTranslation` in `js/data/investigations/i18n.js` lays a Spanish *shadow*
over an English lesson. Two of its rules decide this gate:

```js
if (typeof base === 'function') return base;   // machinery, never translated
...
if (STRUCTURAL.has(key)) continue;             // 30+ keys a shadow may not touch
```

Because a probe and a validator are functions, **a shadow cannot reach inside
them at all**. Confirmed empirically: no file under
`js/data/investigations/es/` contains a `message`, `level`, `validate` or
`probe` key.

Their strings are instead translated at runtime by `lessonText()` in
`js/i18n/lesson.js`, which keys on a **slug of the English string itself**
(first six words plus total length). 133 such `lessonFn.*` keys exist in both
`en.deferred.js` and `es.deferred.js`, so this path is live and populated.

It has a sharp edge. The key is computed *after* interpolation, so the
student's own numbers land in the key:

```
"Your ratio of 2.31 matches …"   →  lessonFn.yourRatioOf231Matches61
"Your ratio of 2.32 matches …"   →  lessonFn.yourRatioOf232Matches61
"Your ratio of 10.50 matches …"  →  lessonFn.yourRatioOf1050Matches62
```

Of the 293 `message:` values inside `validate` bodies, **264 are plain literals**
(translatable this way), **28 are templates carrying an interpolation slot**
(not translatable this way), and one — E7's — is assembled by concatenating a
template with a literal. **19 of the 81 bodies** interpolate at all.

**What this means for the proposal.** Moving validations from functions to data
does not leave the translation architecture where it is. It moves roughly 300
strings across the machinery/words boundary that `mergeTranslation` is built on:

- *Upside, and it is real:* interpolated messages become translatable, because
  the template can be translated before substitution rather than after. That is
  a genuine gain the current design cannot reach.
- *Downside:* the shadow now walks into the expression tree. `mergeTranslation`
  merges any key the base already has that is not in `STRUCTURAL`, so every
  keyword of the new notation — `when`, `then`, `else`, `let`, `where`, `as`,
  `to`, `level`, `from`, `op` — becomes a key a Spanish shadow can silently
  overwrite. `STRUCTURAL` grows from 30 entries to 30 plus the entire vocabulary
  of the language, and the authoring rule `i18n/machinery` ("a translation never
  replaces machinery") becomes a rule about a grammar rather than a key list.
- `translationCoverage` counts strings, so every lesson's translatable-string
  total jumps by however many expression strings the notation uses, distorting
  the `i18n/coverage` figures that `author:check` gates on.

## 2.4 What happens to reuse in a declarative format

A declarative document has no lexical scope and no function values. The 56
references become either 56 inlined copies (§5A) or 16 named definitions plus a
call mechanism (§5B). There is no third option that preserves behaviour, because
the behaviour being shared is *computation*, not *content*.

---

# 3. Hand translation

## 3.0 The notation

The smallest thing that held all thirteen examples. It is presented in YAML
because that is the proposal's assumed surface; §6 addresses what the YAML
hides.

A `validate` or `probes.<name>` is a **block**: an ordered list of clauses.
A clause is one of

| Clause | Meaning |
|---|---|
| `let: {name: expr, …}` | bind names, in order, scoped to the rest of the block |
| `when: expr` + `then: <result \| block>` | if true, produce the result, or enter the nested block |
| `else: <result \| block>` | otherwise |
| `return: expr` | produce a value |
| `emit: record` | append a row to the implicit output list (probes only) |

A **result** is `null`, or a record `{level, message}`.

Expressions are written infix inside strings. `"…"` in an expression position is
an expression; a message is a template where `{ }` marks a substitution slot.
(§6 shows why that distinction is a problem, not a detail.)

Builtins used below: `isFinite`, `count`, `sum`, `max`, `min`, `abs`, `sqrt`,
`join`, `truthy`, `fixed(x,n)`, `precision(x,n)`, `exponential(x,n)`, `str(x)`,
and the collection forms `map` / `filter` / `some` / `every` / `find`, each
taking `from:`, `as:` and `where:`/`to:`.

Two things are stated up front because they are discoveries, not conveniences:

1. **`as:` + `where:` is a lambda.** Naming a parameter and writing an
   expression over it is an anonymous function regardless of the syntax.
2. **Clause order is semantic.** `let` bindings must sit where the JavaScript
   put them, because `sum([])/0` is `NaN` and `max([])` is `−Infinity`. Either
   the block is a *statement sequence*, or bindings must be *lazy*. Both are
   programming-language features; the translations below use sequencing, because
   laziness is harder to review, not easier.

---

## E1 — `four-distances` (Tides, rank 3)

```yaml
validate:
  in: [v]
  do:
    - let:
        rows:
          filter:
            from: [[v.d1, v.t1], [v.d2, v.t2], [v.d3, v.t3], [v.d4, v.t4]]
            as: [d, t]
            where: "isFinite(d) && isFinite(t)"

    - when: "count(rows) < 2"
      then: null

    - when: { some: { from: rows, as: [d, t], where: "d <= 0 || t <= 0" } }
      then:
        level: error
        message: "Distances and tidal strengths are both positive numbers."

    # Every reading should satisfy tide x distance^3 = 1 at unit mass.
    - let:
        products: { map: { from: rows, as: [d, t], to: "t * d * d * d" } }
        mean:     "sum(products) / count(products)"
        spread:   "(max(products) - min(products)) / mean"

    - when: "spread > 0.35"
      then:
        level: warn
        message: >-
          These do not all sit on one relationship. The usual cause is a
          strength read at a different distance from the one beside it: check
          each row against the slider position that produced it.

    - else:
        level: ok
        message: >-
          Every one of your readings satisfies stretch × distance × distance ×
          distance = {fixed(mean, 2)}. Distance appears three times. Nobody told
          you that; it is in your own numbers.
```

`sum` is offered as a builtin so this example avoids `fold(products, 0, (a,b) -> a+b)`.
All four folds in the corpus are sums, so the builtin suffices *today*; the
first author who needs a product or an argmax needs `fold` and an explicit
two-parameter lambda. Recorded in the ledger as essential-in-principle.

---

## E2 — `measure-four-planets` (Kepler's Laws, rank 2)

```yaml
validate:
  in: [v]
  do:
    - let:
        rows:
          filter:
            from:
              map:
                from: [1, 2, 3, 4, 5, 6, 7, 8]
                as: i
                to: { a: "v['p' ++ i ++ '_a']", P: "v['p' ++ i ++ '_P']" }
            as: r
            where: "isFinite(r.a) && isFinite(r.P)"

    - when: "count(rows) < 2"
      then: null

    - when: { some: { from: rows, as: r, where: "r.a <= 0 || r.P <= 0" } }
      then: { level: error, message: "Distances and periods must both be positive." }

    - let:
        ks:     { map: { from: rows, as: r, to: "(r.P * r.P) / (r.a * r.a * r.a)" } }
        spread: "(max(ks) - min(ks)) / (sum(ks) / count(ks))"

    - when: "count(rows) >= 3 && spread > 0.5"
      then:
        level: warn
        message: >-
          Your P²/a³ values range from {fixed(min(ks), 2)} to {fixed(max(ks), 2)}.
          For planets around the same star they should all be close to each
          other. Check whether a period was read in days rather than years, or a
          distance mixed up between two planets.

    - when: "count(rows) >= 3"
      then:
        level: ok
        message: >-
          All {count(rows)} of your P²/a³ values agree to within
          {fixed(spread * 100, 0)}%. That constancy across planets of wildly
          different sizes is Kepler's third law. Add more planets and watch the
          fitted line tighten.

    - else: null
```

`v['p' ++ i ++ '_a']` is the single most consequential line in this document.
It is **dynamic member access on a key built by string concatenation**. Three
things follow:

- A reviewer can no longer read off which fields a validation consumes. The
  field set is **not directly statically enumerable from the declarative
  document without evaluating its expression and control flow** — the key is
  produced by concatenation over a bound loop variable, so recovering the set
  means running the `map` that builds it. Here that evaluation is cheap and
  total (a literal eight-element range), so a tool could recover the set; the
  point is that it must *evaluate* to do so, and nothing in the notation
  guarantees the next such expression will be as tractable.
- The interpreter must define what a missing key yields. JavaScript answers
  `undefined`, `Number.isFinite(undefined)` is `false`, and the filter quietly
  drops the row. That silence is the *intended* behaviour here — it is how
  "fill in as many planets as you like" works.
- The notation needs string concatenation in expression position, and a range
  literal, neither of which any other example demanded.

Interpolation slots also contain **calls** (`min(ks)`), not just names. So the
slot grammar is the full expression grammar.

---

## E3 — `fast-and-slow-in-numbers` (Kepler's Laws, rank 1)

```yaml
validate:
  in: [v, ctx]
  do:
    - when: "!isFinite(v.v_peri) || !isFinite(v.v_apo)"
      then: null

    - when: "v.v_peri <= 0 || v.v_apo <= 0"
      then:
        level: error
        message: 'Speeds have to be positive. Read the "Speed now" value, which is a magnitude.'

    - when: "v.v_peri < v.v_apo"
      then:
        level: warn
        message: >-
          Your "closest" speed is lower than your "furthest" speed. That is the
          wrong way round for any bound orbit. Check which reading you took
          where, using the distance to tell them apart.

    - let:
        body: "ctx.find('Eccentric')"
        el:   "body ? ctx.elements(body) : null"

    - when: "!el"
      then: null

    # Nested block. If neither clause inside fires, control FALLS THROUGH
    # to the `let expected` clause below.
    - when: "isFinite(v.r_peri) && isFinite(v.r_apo)"
      then:
        - when: "v.r_peri >= v.r_apo"
          then:
            level: warn
            message: >-
              The distance you recorded at closest approach is not smaller than
              the one at the far point, so the two readings are swapped or both
              came from the same end. The tool stops at whichever event it was
              armed for - check that the second arm was apoapsis.

        - let:
            eFromR: "(v.r_apo - v.r_peri) / (v.r_apo + v.r_peri)"

        - when: "abs(eFromR - el.e) / max(el.e, 1e-6) > 0.25"
          then:
            level: warn
            message: >-
              Your two distances imply an eccentricity of {fixed(eFromR, 3)},
              but this orbit's is {fixed(el.e, 3)}. Both have to come from the
              paused state at each event, measured from the star.

    - let:
        expected: "(1 + el.e) / (1 - el.e)"
        ratio:    "v.v_peri / v.v_apo"
        err:      "abs(ratio - expected) / expected"

    - when: "err <= 0.15"
      then:
        level: ok
        message: >-
          Your ratio of {fixed(ratio, 2)} matches (1+e)/(1−e) =
          {fixed(expected, 2)} for this orbit's eccentricity of
          {fixed(el.e, 3)}. That relation falls straight out of angular
          momentum being conserved.

    - when: "ratio < 1.2"
      then:
        level: warn
        message: >-
          A ratio of {fixed(ratio, 2)} is close to 1, which would mean the
          planet barely changes speed, but this orbit has e = {fixed(el.e, 3)},
          so the ratio should be near {fixed(expected, 2)}. You have probably
          caught it twice at similar distances. Pause when "Distance from star"
          is at its smallest, then again at its largest.

    - else:
        level: warn
        message: >-
          Your ratio is {fixed(ratio, 2)}, but for e = {fixed(el.e, 3)} it
          should be about (1+e)/(1−e) = {fixed(expected, 2)}. Double-check both
          readings: pausing a little before or after the true extreme is the
          usual cause.
```

This example alone forces four constructs nothing else needs:

1. **Nested block with fall-through.** The inner group is a JavaScript `if { }`
   whose clauses may all decline to return. A flat decision table cannot express
   it without duplicating the outer guard onto every inner rule *and* making
   `eFromR` lazy so it does not divide by zero when the guard is false. The
   notation therefore has nested scopes and structured control flow. It is not a
   table.
2. **`max` overloaded.** `max(el.e, 1e-6)` is two scalars; `max(products)` in E1
   is a list. Either two builtins with confusable names, or one variadic builtin
   whose behaviour on a single list argument must be specified.
3. **Host objects in the value model.** `ctx.find` returns a simulation body and
   `ctx.elements` returns a derived record. Neither is a number, string, list or
   record the notation itself can construct.
4. **Truthiness.** `body ? … : null` and `!el` test objects, not booleans. The
   interpreter must publish a truthiness table, and §5 will show it must
   distinguish `null` from `false`.

---

## E4 — `three-masses` (Tides, rank 4)

```yaml
validate:
  in: [v]
  do:
    - let:
        rows:
          filter:
            from: [[v.m1, v.s1], [v.m2, v.s2], [v.m3, v.s3]]
            as: [m, s]
            where: "isFinite(m) && isFinite(s)"

    - when: "count(rows) < 2"
      then: null

    - when: { some: { from: rows, as: [m, s], where: "m <= 0 || s <= 0" } }
      then:
        level: error
        message: "Masses and tidal strengths are both positive numbers."

    - let:
        ratios: { map: { from: rows, as: [m, s], to: "s / m" } }
        mean:   "sum(ratios) / count(ratios)"
        spread: "(max(ratios) - min(ratios)) / mean"

    - when: "spread > 0.25"
      then:
        level: warn
        message: >-
          Stretch ÷ mass is not coming out the same for every row. Check that
          the distance slider stayed put while you changed the mass: moving both
          at once hides the relationship you are looking for.

    - else:
        level: ok
        message: >-
          Stretch ÷ mass is {fixed(mean, 2)} for every row you filled in. A
          constant ratio is what a straight line through the corner looks like
          in a table.
```

## E5 — `write-the-three-down` (Goldilocks, rank 5)

```yaml
validate:
  in: [v]
  do:
    - let:
        rows:
          filter:
            from: [[v.d1, v.s1], [v.d2, v.s2], [v.d3, v.s3]]
            as: [d, s]
            where: "isFinite(d) && isFinite(s)"

    - when: "count(rows) < 2"
      then: null

    - when: { some: { from: rows, as: [d, s], where: "d <= 0 || s <= 0" } }
      then:
        level: error
        message: "Distances and starlight are both positive numbers."

    # Every row should satisfy S x d^2 = 1 for a one-solar-luminosity star.
    - let:
        products: { map: { from: rows, as: [d, s], to: "s * d * d" } }
        spread:   "(max(products) - min(products)) / (sum(products) / count(products))"

    - when: "spread > 0.35"
      then:
        level: warn
        message: >-
          These do not all sit on the same relationship. Check that each
          starlight value was read at the distance beside it.

    - else:
        level: ok
        message: >-
          Every one of your readings satisfies starlight x distance x distance =
          1. That is the pattern, already in your own numbers.
```

**E1, E4 and E5 are the same program three times**, differing only in field
names, the derived expression (`t·d³`, `s/m`, `s·d²`), the threshold (0.35,
0.25, 0.35) and the prose. E2 is a fourth instance with dynamic field names.

This is the strongest argument in the corpus *for* definition-and-reference —
and simultaneously the clearest evidence that what would be shared is a
**parameterised function over an expression**, since the differing part is `to:`
itself. Sharing
it requires passing an expression as an argument. That is a higher-order
function.

---

## E6 — `weigh-trappist-1-yourself` (Kepler's Laws, rank 6)

```yaml
validate:
  in: [v]
  do:
    - when: "!isFinite(v.w_a) || !isFinite(v.w_Pd)"
      then: null

    - when: "v.w_a <= 0 || v.w_Pd <= 0"
      then: { level: error, message: "Both values must be positive." }

    - let:
        TRUE_MASS: 0.0898
        M: "v.w_a ** 3 / (v.w_Pd / 365.25) ** 2"

    - when: "!isFinite(M)"
      then: null

    - when: "abs(M - TRUE_MASS) <= 0.008"
      then:
        level: ok
        message: >-
          {fixed(M, 4)} solar masses. That is TRAPPIST-1: the published value is
          0.0898, one of the smallest stars known and barely above the limit for
          hydrogen fusion. You have weighed a star forty light years away from
          two numbers read off its planets. Try a different planet and you
          should get the same answer, because they all orbit the same mass.

    # Name the direction and diagnose from the *inputs* rather than from the
    # size of the miss.
    - let:
        dir: "M > TRUE_MASS ? 'too high' : 'too low'"
        off: "M / TRUE_MASS"
        hint:
          cond:
            - when: "v.w_a > 0.5"
              then: >-
                The semi-major axis looks too large. Every orbit here is under
                0.07 AU, so the value should start 0.0 something.
            - when: "v.w_Pd < 0.5"
              then: >-
                The period looks too small for days. The readout gives days, and
                the shortest year in this system is about 1.5 of them.
            - when: "v.w_Pd > 100"
              then: >-
                The period looks too large for days. The longest year here is
                about 19 of them.
            - when: "off > 3 || off < 0.33"
              then: >-
                Out by more than a factor of three, which usually means a and P
                were read from different planets.
            - else: "Check that a and P came from the same planet."

    - return:
        level: warn
        message: >-
          That works out to {precision(M, 3)} solar masses, which is
          <strong>{dir}</strong>. {hint}
```

The final clause is `return`, not `else`, and the reason is a defect found while
writing it. A `let` clause sits between the last `when` and the final result, so
`else` would have had to reach back past a binding to find its `when`. Every
other translation here happens to put `else` immediately after a `when`, which
hides the question. A real specification has to answer it — does `else` bind to
the nearest preceding `when` in the block, or only to an immediately preceding
one? — and that is a dangling-else rule, i.e. exactly the sort of grammar
decision this notation was supposed to avoid needing.

The JavaScript uses a mutable `let hint` reassigned through an if/else-if
ladder. Rewriting it as a `cond` **expression** is semantically equivalent and
avoids assignment — at the cost of a second conditional construct: `when`/`then`
in *clause* position and `cond` in *value* position now both exist.

The localization consequence is worse than the syntax. `dir` and `hint` are
user-facing sentence **fragments** chosen at runtime and concatenated into a
frame. In Spanish, "demasiado alto" must agree with the noun it modifies, and
the frame `que es <strong>{dir}</strong>` fixes a gender the fragment cannot
know. Fragment assembly is a localization anti-pattern, and the notation makes
it the natural way to write this.

---

## E7 — `time-two-transits` (Transit Photometry, rank 7)

```yaml
validate:
  in: [v]
  do:
    - let: { P: "(v.t2 - v.t1) / v.n" }

    - when: "!isFinite(P)"
      then: null

    - when: "P < 0"
      then:
        level: error
        message: "The second stamp has to come after the first. Swap them, or take a fresh pair."

    - when: "v.n < 1"
      then: { level: error, message: "At least one orbit has to pass between two transits." }

    # The classic off-by-one: transit 2 to transit 5 is three orbits, not four.
    - let: { gap: "v.n2 - v.n1" }

    - when: "isFinite(gap) && gap > 0 && v.n != gap"
      then:
        level: warn
        message: >-
          You recorded transit {v.n1} and transit {v.n2}, so the planet went
          round <strong>{gap}</strong> {gap == 1 ? 'time' : 'times'} in between,
          not {v.n}. Count the gaps between the transits, not the transits
          themselves.

    - when: "P > 3.2 && P < 3.9"
      then:
        level: ok
        message: >-
          About 3.5 days. The published period of HD 209458 b is 3.5247 days,
          known to better than a tenth of a second from two decades of transits.

    - when: "P > 6.5 && P < 7.5"
      then:
        level: warn
        message: >-
          That is twice the period: a transit went by between your two stamps
          and was not counted. Put 2 in the orbits box.

    - when: "P > 1.5 && P < 2.1"
      then:
        level: warn
        message: >-
          That is about half the period. Check that both stamps were taken at
          the bottom of a transit and not one at a transit and one at the
          secondary eclipse halfway between.

    - else:
        level: warn
        message: >-
          Expected something near 3.5 days. Check that the orbit count matches
          the difference between the two transit numbers in the readout.
```

`{gap == 1 ? 'time' : 'times'}` puts a **conditional inside an interpolation
slot** to pick a plural form. Every serious message-formatting system (ICU, Fluent)
treats plural selection as a first-class construct precisely because languages
have more than two forms — Spanish has two, Polish three, Arabic six. This
notation would inherit the problem *and* hard-code English's two-form answer
into the lesson document, where a translator cannot fix it.

---

## E8 — `measure-the-two-orbits` (Kepler's Laws, rank 8)

```yaml
validate:
  in: [v, ctx]
  do:
    - when: "!isFinite(v.ecc_peri) || !isFinite(v.ecc_apo)"
      then: null

    - when: "v.ecc_peri <= 0 || v.ecc_apo <= 0"
      then: { level: error, message: "Distances have to be positive numbers." }

    - when: "v.ecc_peri > v.ecc_apo"
      then:
        level: warn
        message: "Closest approach is larger than furthest distance: these look swapped."

    # The semi-major axis is the mean of the two extremes, so it is a free
    # check that the student read both off the same orbit.
    - let:
        body: "ctx.find('Eccentric')"
        el:   "body ? ctx.elements(body) : null"

    - when: "!el"
      then: null

    - let:
        trueA: "el.a * 0.01"
        meanR: "(v.ecc_peri + v.ecc_apo) / 2"
        err:   "abs(meanR - trueA) / trueA"

    - when: "err < 0.1"
      then:
        level: ok
        message: >-
          That averages to {fixed(meanR, 2)} AU, which matches the semi-major
          axis the simulation reports. The mean of the two extremes <em>is</em>
          a: that is what "semi-major axis" means.

    - else:
        level: warn
        message: >-
          Your two distances average to {fixed(meanR, 2)} AU, but this orbit's
          semi-major axis is about {fixed(trueA, 2)} AU. Check you read both
          values from the same body.
```

The JavaScript recomputes `(v.ecc_peri + v.ecc_apo) / 2` in three places; the
translation binds it once as `meanR`. Pure arithmetic, so this is an equivalence
rather than a change — noted because it is the only place any translation here
departs from the source's literal structure.

---

## E9 — `recover-the-real-planet` (Transit Photometry, rank 9)

```yaml
validate:
  in: [v]
  do:
    - let:
        ratio: "v.d_clean / v.d_blend"
        rp:    "sqrt(v.d_blend / 1.2146) * 1.155 * 109.198"

    - when: "!isFinite(ratio) || !isFinite(rp)"
      then: null

    - when: "v.d_clean > 1 || v.d_blend > 1"
      then:
        level: error
        message: "Both depths are fractions, not percentages: 1.1% goes in as 0.011."

    - when: "ratio <= 1"
      then:
        level: error
        message: >-
          The blended depth has to be the <em>shallower</em> of the two. Check
          you have not put them in the wrong boxes.

    - let: { corrected: "rp * sqrt(ratio)" }

    - when: "ratio > 1.4 && ratio < 1.95 && corrected > 13.5 && corrected < 17.5"
      then:
        level: ok
        message: >-
          That is the result. The blended curve says about 12 Earth radii; the
          correction of roughly ×1.28 takes it back to about 15.5, which is the
          1.38 Jupiter radii you measured before the companion was there. The
          implied contrast should land near Δm = 0.5, which is what the
          companion actually is.

    - when: "ratio > 1.95"
      then:
        level: warn
        message: >-
          The ratio is larger than this companion can produce. Re-read the
          blended depth: it should be near 0.011, not near half the clean value.

    - else:
        level: warn
        message: >-
          Expected a ratio near 1.63 and a corrected radius near 15.5 R⊕. Check
          both depths came from the bottom of a dip rather than a shoulder.
```

The `let` **must** stay above the percentage guard. In the JavaScript, `rp` is
computed before that check, and a negative `d_blend` produces `NaN` from `sqrt`,
which the `isFinite` guard then catches. Hoist or reorder the bindings and the
error the student sees changes. This is a concrete case where clause order is
load-bearing and a reviewer must know it.

---

## E10 — `test-distance` (Listening to Spacetime, rank 10)

```yaml
validate:
  in: [v]
  do:
    - when: "!every([v.h_400, v.h_800, v.h_1600], x -> isFinite(x))"
      then:
        level: warn
        message: >-
          Read the amplitude at all three distances. The readout gives it on the
          line marked "Strain amplitude" - not "Strain now", which is the
          instantaneous signed value and passes through zero twice a cycle.

    - when: "some([v.h_400, v.h_800, v.h_1600], x -> x <= 0)"
      then:
        level: error
        message: >-
          An amplitude cannot be zero or negative. That is the signature of
          having read "Strain now", which is the signed value at one instant:
          use the "Strain amplitude" line instead.

    - let: { r: "v.h_400 / v.h_800" }

    - when: "!(r > 1.6 && r < 2.4)"
      then:
        level: warn
        message: >-
          Your ratio is {fixed(r, 2)}. Doubling the distance should halve the
          strain, so this should come out near 2.

    - when: "!isFinite(v.f_end_400) || !isFinite(v.f_end_1600)"
      then: { level: warn, message: "Record where the model stops at each distance too." }

    - when: "abs(v.f_end_400 - v.f_end_1600) > 1"
      then:
        level: warn
        message: >-
          Those two should be the same number. The frequency at which the model
          stops depends on the masses, not on how far away you are.

    - else: null
```

Here `every` and `some` take an **inline lambda in expression position**
(`x -> …`), where E1/E2/E4/E5 used the structured `from:`/`as:`/`where:` form.
Either the notation supports both spellings of the same thing, or one is
rewritten into the other. Both spellings are lambdas. **Lambdas are essential;
there is no version of this corpus without them.**

---

## H1 — `runRows` (binary-star-planets, 9 refs; identical in 2 more files)

```yaml
probes:
  runRows:
    in: [ctx]
    do:
      - let:
          named:
            filter:
              from: { map: { from: "ctx.roles() ?? []", as: r, to: "ctx.role(r)?.name" } }
              as: n
              where: "truthy(n)"

      - emit:
          label: "On the canvas"
          value: "count(named) > 0 ? join(named, ', ') : 'nothing bound yet'"

      - let: { run: "ctx.experiment()" }

      - when: "!run"
        then:
          - emit: { label: "Last run", value: "none yet" }
          - return: rows

      - let: { fresh: "ctx.runMatchesScene(run)" }

      - emit: { label: "Last run", value: "run.name ?? 'unnamed'" }

      - emit:
          label: "Does it still describe this scene?"
          value:
            cond:
              - when: "fresh == null"
                then: "cannot tell — it was recorded before runs carried a world stamp"
              - when: "fresh"
                then: "yes"
              - else: "NO — the scene has been rebuilt since, so re-run before comparing"
          emphasis: "fresh == false"

      - return: rows
```

New machinery, all of it essential:

- **An output accumulator.** `emit` appends to an implicit `rows`. That is
  mutable state — a writer effect — inside a "declarative" document. The
  alternative is conditional list concatenation, which is H4's problem.
- **Three-valued logic.** `fresh` is `true`, `false` or `null`, and all three
  branches differ. `emphasis: fresh == false` is deliberately *not* `!fresh`,
  because `null` must not emphasise. Any truthiness rule that collapses `null`
  and `false` silently changes this lesson's behaviour.
- `?.` and `??`, because `ctx.role(r)` may return nothing for an unbound role —
  a case `js/authoring/rules.js` deliberately tests for.

---

## H2 — `zoneRows` (goldilocks-question, 6 refs)

```yaml
probes:
  zoneRows:
    in: [ctx]
    do:
      # Whatever the reader has selected, and failing that the first world this
      # step bound.
      - let:
          fallback: "find(map(ctx.roles() ?? [], r -> ctx.role(r)), b -> truthy(b))"
          h:        "ctx.habitability(ctx.selected ?? fallback)"

      - when: "!h"
        then:
          return:
            - { label: "Selected", value: "click a planet on the canvas to read it" }

      - return:
          - label: "Planet"
            value: "h.planet.name ?? 'unnamed'"
          - label: "Distance from its star"
            value: "{fixed(h.distanceAU, 3)} AU"
          - label: "Starlight it receives"
            value: "{fixed(h.insolation, 2)} Earths"
          - label: "Zone ({h.model})"
            value: "{fixed(h.bounds.innerAU, 2)} to {fixed(h.bounds.outerAU, 2)} AU"
          - label: "Which puts it"
            value: "h.label"
```

Look at the last two `value:` lines. `"{fixed(…)} to {fixed(…)} AU"` is a
**template**; `"h.label"` is an **expression**. They are the same YAML type. A
reader — and a parser — cannot tell them apart without a rule, and any rule you
pick is a trap:

- *Everything is a template:* then `"h.label"` prints the literal text `h.label`.
- *Everything is an expression:* then `"click a planet on the canvas to read it"`
  is parsed as a program.
- *Sigils (`=expr` vs plain text):* workable, and it means every string in every
  lesson now has a meaning that depends on its first character. A translator who
  drops the sigil produces a lesson that displays source code.

This is not a syntax quibble. It is the point at which "reading the document"
requires knowing the evaluation rules, which is the claim under test.

Also note `h.bounds.innerAU` — three-deep access into a host record — and
interpolation inside a **label**, not just a value.

---

## H3 — `runRows` (design-the-schedule, 5 refs)

Byte-identical to H1. Its translation is byte-identical to H1's translation.

That is the finding, not a shortcut. Under **definition + reference** these
remain two identical definitions in two documents (or one, if the commons grows
a cross-document import — see §5C). Under **duplication** they become fourteen
copies between them, plus four more from `gravity-assist.js`.

---

## H4 — `photometry` (transit-photometry, 4 refs) — stress case

```yaml
probes:
  photometry:
    in: [ctx]
    do:
      - let: { a: "ctx.photometry()" }

      - emit: { label: "Baseline, out of transit", value: "{fixed(a.baseline, 6)}" }
      - emit: { label: "Complete transits recorded", value: "{str(a.seen)}" }

      - when: "a.last"
        then:
          - emit:
              label: "Transit {a.last.seq}: bottom"
              value: "{fixed(a.last.bottom, 6)}"
              emphasis: true
          - emit:
              label: "Transit {a.last.seq}: mid-time"
              value: "{fixed(a.last.mid, 4)} days"
        else:
          - emit: { label: "Waiting for a complete transit", value: "..." }

      - emit: { label: "Clock", value: "{fixed(ctx.days(), 4)} days" }
      - return: rows
```

This is where `emit` earns its place: the row list is built by **conditional
append**, and the trailing "Clock" row comes after the branch. Expressing it as
a pure concatenation of conditional lists is possible, but produces a nested
expression with an empty-list branch that is markedly less readable than the
JavaScript. Either way the notation needs **conditional list construction**.

Note also `{str(a.seen)}` — the JavaScript calls `String(a.seen)` explicitly
while every other row relies on implicit number→string coercion. The
interpreter has to specify coercion either way; making it explicit here is
faithful to the source.

---

# 4. Language-feature ledger

Cumulative over the thirteen translations. "First required by" is the earliest
example in the order translated. "Essential" means the corpus cannot be
expressed without it; "convenience" means an equivalent exists at some cost in
readability or builtin count.

| # | Construct | First required by | Used in | Essential? |
|---|---|---|---|---|
| 1 | number / string / boolean / null literals | E1 | 13 | essential |
| 2 | variable reference | E1 | 13 | essential |
| 3 | field lookup `a.b` | E1 | 13 | essential |
| 4 | deep field lookup `a.b.c` | H2 | 4 | essential |
| 5 | arithmetic `+ − × ÷` | E1 | 13 | essential |
| 6 | exponent `**` | E6 | 1 | essential (or a `pow` builtin) |
| 7 | comparison `< ≤ > ≥ == !=` | E1 | 13 | essential |
| 8 | boolean `&& \|\| !` | E1 | 13 | essential |
| 9 | parenthesised grouping | E1 | 13 | essential |
| 10 | scientific-notation literal (`1e-6`) | E3 | 1 | convenience |
| 11 | ordered conditional clauses (`when`/`then`/`else`) | E1 | 13 | essential |
| 12 | early exit with a result | E1 | 13 | essential |
| 13 | early exit with `null` | E1 | 10 | essential |
| 14 | local bindings (`let`) | E1 | 12 | essential |
| 15 | **clause ordering is semantic** (or laziness) | E1 | 10 | essential |
| 16 | **nested block with fall-through** | E3 | 1 | essential |
| 17 | conditional *expression* (ternary) | E3 | 5 | essential |
| 18 | **multi-branch conditional expression** (`cond`) | E6 | 2 | essential |
| 19 | truthiness of non-booleans | E3 | 5 | essential |
| 20 | **three-valued `null` ≠ `false`** | H1 | 1 | essential |
| 21 | optional chaining `?.` | H1 | 1 | convenience |
| 22 | nullish coalescing `??` | H1 | 3 | convenience |
| 23 | list literal | E1 | 8 | essential |
| 24 | record literal | E1 | 13 | essential |
| 25 | integer range literal | E2 | 1 | convenience |
| 26 | **dynamic key lookup `v[expr]`** | E2 | 1 | essential |
| 27 | string concatenation `++` | E2 | 1 | essential |
| 28 | **lambda / anonymous function** | E1 | 9 | essential |
| 29 | destructuring lambda parameters | E1 | 4 | convenience (index access) |
| 30 | `map` | E1 | 6 | essential |
| 31 | `filter` | E1 | 6 | essential |
| 32 | `some` | E1 | 5 | essential |
| 33 | `every` | E10 | 2 | essential |
| 34 | `find` | H2 | 2 | essential |
| 35 | `count` / length | E1 | 5 | essential |
| 36 | `sum` (specialised fold) | E1 | 4 | essential |
| 37 | general `fold` with a 2-ary lambda | — | 0 today | essential in principle |
| 38 | `max` / `min` over a list | E1 | 4 | essential |
| 39 | `max` over two scalars (overload) | E3 | 1 | essential |
| 40 | `join` | H1 | 1 | essential |
| 41 | `abs` | E3 | 6 | essential |
| 42 | `sqrt` | E9 | 1 | essential |
| 43 | `isFinite` | E1 | 13 | essential |
| 44 | `truthy` | H1 | 2 | convenience |
| 45 | string interpolation | E1 | 9 | essential |
| 46 | **arbitrary expressions in a slot** | E2 | 6 | essential |
| 47 | **conditional in a slot (plurals)** | E7 | 1 | essential |
| 48 | interpolation in a *label*, not only a value | H2 | 2 | essential |
| 49 | `fixed(x, n)` | E1 | 8 | essential |
| 50 | `precision(x, n)` | E6 | 1 | essential |
| 51 | `exponential(x, n)` | tideRows | 1 | essential |
| 52 | explicit `str(x)` coercion | H4 | 1 | essential |
| 53 | embedded HTML in messages | E6 | 4 | essential (present today) |
| 54 | **named definition + reference** | H1 | 3 defs / 20 refs | essential |
| 55 | **definition parameters** | `tideRows` | 2 defs | essential |
| 56 | default parameter values | `fixed`, `tideRows` | 2 defs | essential |
| 57 | named / keyword arguments | `tideRows` | 1 def | convenience |
| 58 | splicing a call result into a list (`...`) | `tideRows` | 1 | essential |
| 59 | **output accumulator (`emit`)** | H1 | 3 | essential (or #60) |
| 60 | conditional list construction | H4 | 2 | essential |
| 61 | **host objects in the value model** | E3 | 5 | essential |
| 62 | **host function calls (`ctx.*`)** | E3 | all probes | essential |

**Tally: 62 constructs, of which 53 are essential.** Nine are conveniences, and
removing all nine buys a less readable document, not a smaller semantics.

Constructs the corpus did **not** require, which is worth recording because it
bounds the language from above: no loops, no recursion, no user-defined types,
no mutation of bindings (after rewriting E6's ladder as `cond`), no exceptions,
no async, no regular expressions, no date arithmetic, no sorting, no
higher-order *user* functions (only builtins take lambdas), and no imports
between lesson documents.

---

# 5. The shared-helper problem

## A. Duplication — inline the definition into every step

Measured on the real corpus, all 16 referenced helpers:

| | Today | Strategy A |
|---|---|---|
| Definitions | 16 | 56 inlined copies |
| Lines of helper logic | 466 | **1,631** |
| Tokens | ~2,117 | ~7,266 |
| References | 56 one-word | — |

**Cost: +1,165 lines (+250%), +~5,149 tokens.**

For the three sampled helpers specifically:

| Helper | Refs | Def lines | Duplicated lines |
|---|---|---|---|
| `runRows` (binary-star-planets) | 9 | 30 | 270 |
| `zoneRows` (goldilocks-question) | 6 | 26 | 156 |
| `runRows` (design-the-schedule) | 5 | 30 | 150 |
| *(plus `runRows`, gravity-assist)* | 4 | 30 | 120 |

**Maintenance risk.** One behaviour change touches **56 sites instead of 16**.
The `runRows` family alone becomes 18 edits where today it is 3.

**Divergence risk — not hypothetical.** The three `runRows` definitions are
byte-identical *today* because each is a single module-scope constant that a
maintainer edits once per file. Move to 18 step-level copies and the first
partial edit produces a lesson where some steps say "cannot tell — it was
recorded before runs carried a world stamp" and others do not. Nothing in the
build would catch it: `author:check` validates each step independently, and
there is no rule that two steps' probes must agree.

**Effect on translated / index-aligned shadows.** Under the current design,
helper strings are translated once by content, via `lessonText`'s slug key: 18
identical copies of `'nothing bound yet'` collapse to **one** `lessonFn.*` entry.
That survives duplication — content-keying is indifferent to how many copies
exist. What does *not* survive is the Spanish shadow: once these strings are
data rather than function bodies, `mergeTranslation` walks them, and the shadow
must now carry 18 index-aligned copies at 18 distinct step positions. The es/
files currently contain zero of these strings. Every inserted or reordered step
shifts the array indices those 18 copies live at, which is exactly the failure
mode the shadow's index alignment already makes expensive.

## B. Definition + reference

```yaml
probes:
  tideRows:
    in: [ctx, { onRole: 'earth', byRole: 'moon', trueRatio: null }]
    do: …

steps:
  - sid: what-a-tide-is
    probe: { use: tideRows }
  - sid: the-disruption
    probe: { use: tideRows, with: { onRole: 'star', byRole: 'hole' } }
```

Working through what the real corpus forces this to support:

| Requirement | Forced by | Verdict |
|---|---|---|
| **Parameters?** | `fixed(v, n)`, `tideRows(ctx, opts)` | **Yes**, already |
| **Default values?** | `n = 3`; `onRole = 'earth'` | **Yes**, already |
| **Named / keyword arguments?** | `tideRows(ctx, { trueRatio: … })` | **Yes**, already |
| **Access to world/state?** | every one of the 16 helpers takes `ctx` | **Yes** — 41 host members |
| **Arguments that are prose?** | `trueRatio:` is a 58-word sentence | **Yes** — and it must be localizable at the *call site* |
| **Local bindings inside a definition?** | `runRows` binds `named`, `run`, `fresh` | **Yes** |
| **Calls to other helpers?** | not in this corpus (`fixed` is called from probes, never from another helper) | **Not yet** — and nothing prevents it |
| **Locale-independent result values?** | numbers reach the answer key and `validation:check` | **Yes** — values must be stable |
| **Locale-specific messages?** | every helper returns display text | **Yes** |
| **Splicing results into a caller's list?** | `...tideRows(ctx, {…})` | **Yes** |

**At what point is this a function system?** At the first row. A definition with
named parameters, default values, keyword arguments, its own local bindings, a
host-state parameter, and a result spliced into its caller **is a function**.
Writing it under a `probes:` key and calling the call site `use:` changes the
spelling, not the semantics. The moment "can a helper call a helper?" is
answered *yes* — and there is no principled reason to answer *no* — the
interpreter needs a call stack, a recursion bound, and a cycle detector.

Two further consequences the syntax hides:

- **Namespacing.** `runRows` is defined three times in three lessons. A flat
  commons-wide `probes:` map collides on the first three lessons imported. So
  the format needs per-document scope, and a cross-document import mechanism if
  H1 and H3 are ever to be genuinely shared rather than copied.
- **Prose arguments break the translation model twice.** `trueRatio`'s sentence
  is (a) a call-site argument, so the shadow must translate *arguments*, and (b)
  identical at two call sites, so content-keying and index-keying disagree about
  whether it is one string or two.

## C. A third design: keep the function, constrain the host

Materially different from both: leave validations and probes as JavaScript, and
make them *safe to run* rather than *safe to read*.

The repository is already most of the way there. `js/authoring/rules.js`
(1,417 lines) executes every probe and every validator against a **deliberately
hostile stub `ctx`** — nothing selected, no bodies, every role unbound, no
spectrograph pointed at anything, no habitable zone — and reports the ones that
throw. Rules `ref/probe` ("a probe is a function, and survives being called")
and `interaction/validate` ("a validator accepts the author's own hint values")
are exactly the properties a commons would want. The gap for untrusted
contributions is capability and resource containment, not expressiveness — a
worker with no DOM, no network, a frozen `ctx` façade and a time budget closes
it, and costs an evaluator's worth of work rather than a language's.

This does not deliver "a reviewer can read the document". It delivers "a
reviewer does not have to". §7 argues that is the more honest goal.

---

# 6. What the notation actually is

It is not a schema with a few expressions. Characterising honestly:

- **Not a data schema.** A schema constrains shapes. This has binding forms,
  scoping, ordered evaluation, nested blocks with fall-through, lambdas and
  user-defined parameterised definitions.
- **Not CEL.** CEL is close on the expression half — it has literals,
  arithmetic, comparison, lists, maps, macros for `map`/`filter`/`exists`/`all`,
  and a documented cost model. But CEL deliberately has **no statements, no
  early return, no user-defined functions, and no user-defined bindings beyond
  the `cel.bind` macro**. The corpus needs all four: 81 of 81 bodies branch to
  three or more exits, 45 bind intermediates, 20 probe references resolve through
  the three sampled named definitions, and two of the corpus's definitions
  (`fixed`, `tideRows`) take parameters with defaults. This is strictly larger
  than CEL.
- **Close to Starlark, minus mutation and loops.** Starlark is a real
  programming language with a specification, and that is the point.
- **Most precisely:** a strict, first-order, dynamically-typed functional
  language with a statement sequence, early return, three-valued nullability, a
  writer effect for probes, string templating with embedded expressions, and a
  41-member host FFI.
- **And it is JavaScript semantics rewritten in YAML** in the places that matter
  most: truthiness, `null` vs `false`, `NaN` propagation through `isFinite`
  guards, `undefined` from a missing dynamic key, and `Math.max()` on an empty
  list. Every one of those is load-bearing in at least one translation above,
  and each would have to be re-specified — identically — or the lessons change
  behaviour.

## Minimum semantic surface

| Category | Count | Detail |
|---|---|---|
| Primitive expression forms | **16** | literal, variable, field access, dynamic index, call, unary (2), binary (~13 operators across 4 groups), ternary, `cond`, lambda, list, record, template, range, grouping, host-object access |
| Collection operators | **11** | `map`, `filter`, `some`, `every`, `find`, `count`, `sum`, `fold`, `max`, `min`, `join` |
| Control-flow constructs | **7** | clause sequence, `when`/`then`, `else`, nested block with fall-through, `let` sequencing, `return`, `return null` |
| Formatting / string constructs | **7** | interpolation slot, expression-in-slot, conditional-in-slot, `fixed`, `precision`, `exponential`, `str` |
| Definition / reference constructs | **5** | definition, parameters, defaults, keyword arguments, reference-with-arguments (+ namespacing) |
| **Core total** | **46** | |
| Value types | **8** | number, string, boolean, null, list, record, lambda, host-object |
| Host builtins | **~51** | 41 `ctx` members + ~10 math/format |

**Simple syntax is not simple semantics.** Every construct above could be
written in YAML punctuation and would still need a specification, an
implementation, a test suite and a compatibility promise. YAML's contribution is
that `- when:` looks friendlier than `if (`. It contributes nothing to the 46
forms beneath.

And the syntax is not even simple. §H2 showed that YAML cannot distinguish an
expression from a literal string without a sigil convention. The two escape
routes are both worse:

- **Fully structured, no text parser:** `t * d * d * d` becomes
  `{mul: [t, {mul: [d, {mul: [d, d]}]}]}`. E3's condition
  `abs(eFromR - el.e) / max(el.e, 1e-6) > 0.25` becomes roughly fifteen nested
  maps across a dozen lines. This removes the parser and destroys the
  reviewability claim in the same stroke.
- **Infix strings, as used above:** readable, and it means shipping a real
  expression parser with a grammar, precedence table, error recovery and source
  locations — plus a YAML parser, which the project does not currently have.

---

# 7. Reviewability and security

## 7.1 Testing the claim

For each of the ten, can a reviewer who understands the lesson but did *not*
implement the expression engine verify the six properties? Scored against the
same reviewer reading the current JavaScript.

| # | Step | Data read | Calculations | Pass/fail conditions | Collection ops | Shared defs | Message shown | vs JS |
|---|---|---|---|---|---|---|---|---|
| 1 | `fast-and-slow-in-numbers` | ✗ | ~ | ~ | n/a | ✓ | ~ | **worse** |
| 2 | `measure-four-planets` | **✗** | ~ | ✓ | ~ | ✓ | ~ | **worse** |
| 3 | `four-distances` | ✓ | ~ | ✓ | ~ | ✓ | ~ | same |
| 4 | `three-masses` | ✓ | ~ | ✓ | ~ | ✓ | ~ | same |
| 5 | `write-the-three-down` | ✓ | ~ | ✓ | ~ | ✓ | ✓ | same |
| 6 | `weigh-trappist-1-yourself` | ✓ | ✓ | ✓ | n/a | ✓ | **✗** | worse |
| 7 | `time-two-transits` | ✓ | ✓ | ✓ | n/a | ✓ | ~ | same |
| 8 | `measure-the-two-orbits` | ✗ | ✓ | ✓ | n/a | ✓ | ✓ | same |
| 9 | `recover-the-real-planet` | ✓ | ~ | ✓ | n/a | ✓ | ✓ | same |
| 10 | `test-distance` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | same |

✓ verifiable by reading · ~ verifiable only with the evaluation rules in hand ·
✗ not verifiable by reading alone: recovering the answer requires evaluating the
document's expressions or control flow

**Where the declarative version is genuinely better:** nowhere in this corpus.

**Where it is worse:**

- **E2, "what data does this read?"** `v['p' ++ i ++ '_a']` means the field set
  is not directly statically enumerable from the document; recovering it
  requires evaluating the expression that builds each key. The JavaScript has
  exactly the same property — but the JavaScript never claimed otherwise, and
  `author:check`'s `ref/field` rule ("compute and validate read fields the step
  itself declares") handles it *dynamically*, which is a check that would have
  to be rebuilt against the notation.
- **E1/E3/E9, "what calculations?"** A reviewer must know that clause order is
  semantic and that `let` is not hoisted. In E9 the wrong reading gives the
  wrong error message; in E1 it gives `NaN`/`−Infinity`. The JavaScript makes
  this obvious by being a statement sequence people already know how to read.
- **E6, "what message?"** The displayed sentence is assembled from a ternary
  fragment and a five-branch `cond`, neither visible at the message. The
  JavaScript is not better, but it is not worse either — and it does not carry a
  claim that reading it is sufficient.
- **E3, "what conditions?"** The nested fall-through block is the hardest thing
  in the corpus to read in either language, and in YAML the "if nothing here
  fires, continue outside" rule is invisible — there is no closing brace to see
  it at.

**The claim as stated does not survive the corpus.** For the four easiest of the
ten it holds about as well as reading the JavaScript. For the rest, "read the
document and see what it does" is true only for a reviewer who has internalised
the evaluation rules — which is the same reviewer who can read the JavaScript.

## 7.2 What an interpreter would have to protect against

Not implemented; enumerated.

- **Unbounded iteration.** No loops exist in the corpus, so the risk enters only
  through collection operators over attacker-sized inputs and through nesting. A
  `filter` inside a `map` inside a `some` is `O(n³)` and is expressible today.
- **Excessive allocation.** `map` over a range literal allocates. E2's
  `[1..8]` is harmless; `[1..100000000]` is one character away and looks the
  same to a reviewer.
- **Recursion.** Absent today, but §5B answers "can a helper call a helper?"
  with *yes, eventually*. A call graph then needs cycle detection, and `use:`
  references need a depth bound.
- **Expensive nested collection operations.** Related to the first, but distinct
  in review: the cost of `some(rows, r -> some(other, o -> …))` is invisible in
  YAML because the nesting reads as indentation.
- **Giant inputs.** `v` comes from student-typed fields, bounded by the step's
  declared field list — *except* where dynamic keys are used. The world side is
  `ctx.bodies()`, which in `a-universe-of-stars` is a stellar population.
- **Access to unintended state.** The `ctx` façade has 41 members, and some are
  **not pure**: `selectId` changes the selection, `showEvolutionScene` and
  `showWavefronts` drive the renderer. A declarative document whose expressions
  can reach those members can move the simulation. The façade would need
  splitting into a read-only projection, which is work on `js/investigations.js`
  regardless of notation.
- **Nondeterminism.** `ctx.clock()`, `ctx.days()` and `ctx.time` read simulation
  time, and per the repo's own note the integration step follows the frame rate.
  Two evaluations of the same probe legitimately differ. Any caching or
  memoisation in the interpreter would be observable.
- **Implementation / version drift.** The corpus depends on JavaScript's
  `toFixed` rounding, `NaN` propagation, `undefined` from missing keys, and
  `Math.max()` returning `−Infinity` on empty input. Every one must be pinned by
  specification, or a lesson authored against v1 of the interpreter grades
  differently under v2. This is the compatibility promise a published commons
  makes hardest to break.

## 7.3 What the declarative format does *not* change

The message path is already safe. `js/investigations.js:2881` renders through
`prose()`, which HTML-escapes everything and then re-permits only `<strong>`,
`<em>`, `<sub>` and `<sup>`. Row labels and values go through `escape()`.

So the injection surface a commons would worry about is **already closed**, in
the place that matters, by an allow-list. The declarative format neither
improves nor degrades it. What a declarative format *would* offer is confinement
of the *logic* — and §5C notes that confinement is obtainable from a worker
boundary without inventing a language.

---

# 8. Maintenance commitment

Gravitas is maintained by one person. Its runtime dependency list is
**two packages** — `chart.js` and `three` — against 18 devDependencies, 22
lessons, and 18 `*:check` scripts among 83 npm scripts already wired into the
release gate.

Accepting this notation makes the following permanent project infrastructure:

| Item | Why it is permanent |
|---|---|
| **YAML parser** | The project has none today. Either a dependency (breaking the two-runtime-dependency posture, since lessons load in the browser) or hand-rolled. |
| **Expression parser** | Grammar, precedence, associativity, error recovery. §6's alternative — fully structured JSON — trades it for unreviewable documents. |
| **AST / schema** | 46 core forms, versioned. |
| **Evaluator** | Strict, first-order, with a writer effect, three-valued nullability, and a call stack once helpers can call helpers. |
| **Type / value model** | 8 types, with coercion, truthiness and equality specified — because the corpus depends on the specifics. |
| **Builtin library** | ~51 entries: 41 `ctx` members re-exposed as a read-only projection, plus math and formatting. Every one needs a signature and an arity/overload rule (`max` is both). |
| **Diagnostics** | An authoring error in a document must say what is wrong. Today a broken validator throws and `rules.js` reports it with a JavaScript stack. |
| **Source locations** | Line/column through YAML → AST → evaluation, or diagnostics are unusable. |
| **Tests** | The corpus has 81 validators and 79 probes; equivalence tests against the JavaScript for each, plus a spec suite for the 46 forms. |
| **Versioning** | Lesson documents declare a notation version. |
| **Migration rules** | Adding or changing a form needs a migration for every published document. |
| **Compatibility guarantees** | A published commons lesson must grade identically in five years. This is the heaviest item and cannot be walked back. |
| **Security / resource limits** | Everything in §7.2. |
| **Localization interaction** | `STRUCTURAL` grows from 30 keys to 30 plus the notation's keyword set; `i18n/machinery` becomes a grammar rule; `translationCoverage` totals shift; the interpolation-key problem (§2.3) becomes solvable, which is the one real gain. |
| **Authoring rules** | `ref/probe`, `ref/field`, `interaction/validate` and `interaction/compute` are currently implemented by *executing* the JavaScript against a hostile stub. All four need re-implementing against the AST. |
| **Documentation** | A language reference, separate from the lesson-authoring guide. |

**Which of A or B is this?**

Not **A** (a small data schema we could reasonably own). A data schema is what
`js/authoring/instructorSchema.js` is, and what the 43 rules in `rules.js`
enforce over lesson *content*. That is comfortably ownable and already owned.

This is **B**: inventing a programming language and adopting it as permanent
foundation. The distinguishing test is the compatibility promise. A schema can
be changed with a migration script over 22 files in one repository. A language
that third parties have published lessons in cannot, because the lessons are the
point of the commons and their authors are not in the room.

---

# 9. Repository changes

This document, on `scratch/declarative-validation-gate`, created fresh from
`887449984f162743a8cc0e950a1f1ee12c27dbf0` in a clean worktree. No parser, no
interpreter, no runtime code, no schema migration, no converted lesson, no
change to any investigation, no change to any JavaScript validation, no new
dependency. No existing Gravitas worktree was used and `.instructor-password`
was not read or copied.

---

# 10. Verdict

### 10.1 What is the smallest notation that faithfully represents the thirteen real examples?

A strict, first-order, dynamically-typed functional language with a statement
sequence and early return, ordered `let` bindings whose position is semantic,
nested blocks that fall through, lambdas, conditional expressions in both clause
and value position, three-valued nullability, string templates containing
arbitrary expressions, parameterised named definitions with defaults and keyword
arguments, an output accumulator for probes, and a 41-member host FFI.

**62 constructs, 53 of them essential.**

### 10.2 What semantic features does it require?

**46 core forms** — 16 primitive expression forms, 11 collection operators,
7 control-flow constructs, 7 formatting/string constructs, 5
definition/reference constructs — over **8 value types**, plus **~51 builtins**.

Plus a specification pinning JavaScript's behaviour for truthiness, `null` vs
`false`, `NaN` propagation, missing-key `undefined`, `toFixed` rounding, and
`max` on an empty list. All six are load-bearing in the translations above.

### 10.3 How does it handle shared helpers without copy/paste divergence?

Only by having functions. Duplication costs **+1,165 lines (+250%)** across the
16 real helpers and turns 16 edit sites into 56 — and, uniquely, forces the
Spanish shadow to carry 18 index-aligned copies of strings it currently carries
zero of.

Definition-and-reference avoids that, and the real corpus already requires it to
support parameters, default values, keyword arguments, host-state access, local
bindings, prose passed as an argument, result splicing, and per-document
namespacing (`runRows` is defined three times). That is a function system with
`function` spelled `probes:`.

### 10.4 Is it materially easier to review than the JavaScript it replaces?

**No.** On the ten hardest cases it is better on none, the same on six, and
worse on four. The two things that most resist review by reading — dynamically
constructed field names (E2), where the field set is not directly statically
enumerable without evaluating the expression that builds it, and
order-dependent bindings (E1, E3, E9) — survive translation intact, and the
third, nested fall-through (E3), gets harder to see because YAML has no closing
brace.

### 10.5 Would implementing it mean Gravitas now owns a programming language?

**Yes.** Parser, AST, evaluator, value model, builtin library, diagnostics,
source locations, spec suite, versioning, migrations and a compatibility promise
to third-party authors — added to a project with two runtime dependencies and
one maintainer.

### 10.6 Does the original security argument for the commons still hold?

**Not as stated.** "A reviewer can read the document and see what it does" is
true for the easy half of the corpus and false for the hard half — and it is the
hard half that carries the pedagogy, since E1/E4/E5 and E2 are precisely the
"the pattern is already in your own numbers" moments the lessons are built
around.

A *different* and defensible argument does survive: a declarative document
cannot reach `fetch`, `document` or the prototype chain, so it is safe to
**execute** without being read. That is confinement, not reviewability, and §5C
observes it is obtainable from a worker boundary plus a read-only `ctx`
projection — work that is needed anyway (seven `ctx` members mutate state) and
that costs an evaluator rather than a language.

Separately: the XSS surface a commons would worry about is already closed by the
`prose()` allow-list at `js/investigations.js:1978`. The declarative format does
not improve it.

### 10.7 Disposition

## **C — REJECT**, for the proposal as scoped.

Faithful conversion of the existing corpus requires a programming language — 46
core forms, 51 builtins, 8 value types, a compatibility promise to external
authors — whose maintenance and review burden exceeds the benefit, and whose
headline benefit (reviewability) the corpus shows does not materialise.

**The distinction between REJECT and NARROW turns on one design choice**, and it
is not a choice about the notation. It is:

> **What does the commons do with a contributed lesson whose validation does not
> fit the declarative subset?**

- **If it must accept JavaScript for those**, then the commons still executes
  untrusted JavaScript, the security argument is unchanged by the notation, and
  the declarative subset is authoring ergonomics — worth having, perhaps, but
  not worth a language, and it should be justified on its own terms.
- **If it forbids JavaScript**, then contributed lessons cannot do what
  **48 of 81** existing validations do (families B, C, D and E), including every
  multi-row "find the pattern in your own numbers" step — the pedagogical centre
  of Tides, Goldilocks and Kepler's Laws. A commons that cannot express the
  lessons Gravitas already ships is not a commons for Gravitas.

**NARROW is supportable only under a third, narrower framing:** a small
decision-table schema for **family A** (33 of 81 — guard, thresholds, literal
messages, ~8 constructs), offered as an *authoring* convenience with no security
claim attached, with JavaScript remaining the general mechanism and no commitment
that the subset will ever grow. Family A's messages are all literal, so they also
gain proper shadow-file translation. That is a data schema of the kind §8 calls
**A**, and the project could own it.

The moment that subset is asked to cover family B (interpolation, +7 forms), or
C (lambdas and collection operators, +11), the ledger reopens and the answer
returns to C.

### Decision as accepted

Recorded as settled, 2026-09-21:

1. **Full declarative conversion is rejected as scoped.**
2. **A small declarative subset may someday be useful** as an authoring
   convenience for simple validations. It is **not a security boundary**, and it
   is **not part of v1.1**.
3. **Existing complex validation remains trusted JavaScript.**
4. **The worker / read-only-`ctx` alternative of §5C is not authorised now.** It
   is recorded here as the cheaper route to confinement should that goal ever be
   taken up on its own terms — not as work this gate schedules.

Nothing in this document is a plan of record for implementation.

### 10.8 Confidence after the v1.1 integration

The structural findings are robust. They rest on properties that a lesson merge
does not move: that every validator branches to three or more exits, that
validation is almost entirely pure while probes are not, that helpers already
take parameters and defaults, that `mergeTranslation` refuses to enter functions,
and that `lessonKey` slugs post-interpolation. New lessons add cases; they do
not remove these.

The *counts* will move, and a new lesson can only move them toward REJECT, since
a lesson is added with its own validators and helpers.

**Re-check before treating the verdict as final** — against `v2` after the
integration settles:

1. **New or changed `validate` bodies**, particularly in the four branches this
   snapshot shows merged or pending: `fix/pluto-check-kind`,
   `fix/author-new-format`, `feat/tree-validation`, `feat/power-law-gravity-lab`.
   Re-run the ranking; if anything scores above 166, read it — it will need
   forms this ledger does not have.
2. **Whether any 23rd lesson landed.** The manifest holds 22, and the size
   ceilings are reportedly full at 22; a new lesson changes both the corpus and
   the budget that §5A's +1,165 lines would have to fit inside.
3. **The probe/helper counts.** `48 of 79` and `16 definitions / 56 references`
   should be recomputed. A new lesson that copies `runRows` a fourth time
   strengthens §5A; one that introduces a *parameterised* helper strengthens
   §5B.
4. **Any change to `js/data/investigations/i18n.js`** — specifically the
   `typeof base === 'function'` guard and the `STRUCTURAL` set. §2.3 is the
   load-bearing localization finding and it lives in those two places.
5. **Any change to `js/i18n/lesson.js`'s `lessonKey`.** If interpolated messages
   gain stable keys by some other route, the one real localization gain of a
   declarative format (§10.6) shrinks further.
6. **Any change to the `ctx` façade in `js/investigations.js`** (41 members,
   `probeContext`). If the read-only projection §5C describes gets built for
   other reasons, option C becomes cheaper still.
7. **`js/authoring/rules.js`** — if `ref/probe`, `ref/field`,
   `interaction/validate` or `interaction/compute` change, §5C's "the dynamic
   check already exists" claim needs re-reading.

If all seven come back unchanged in kind, the verdict stands as written.

### 10.9 Postscript — first tranche checked

`v2` advanced from `8874499` to `e967cc0` while this gate was being written, in
six commits: the return channel (a submission token and lab report) and the
classroom evidence kit.

Checked against the seven watch points above:

| Watch point | Status `8874499..e967cc0` |
|---|---|
| Any `validate` or `probe` body under `js/data/investigations/` | **unchanged** — no file touched |
| A 23rd lesson | **no** — `manifest.js` unchanged, still 22 |
| Probe / helper counts | **unchanged** — no investigation file touched |
| `js/data/investigations/i18n.js` (`typeof function` guard, `STRUCTURAL`) | **unchanged** |
| `js/i18n/lesson.js` (`lessonKey`) | **unchanged** |
| `probeContext` / the `ctx` façade in `js/investigations.js` | **unchanged** — the diff adds a submission-token block only, and does not touch `probeContext`, `validateStep` or `prose` |
| `js/authoring/rules.js` | **unchanged** |

So the first tranche of the v1.1 integration moved none of them, and every
number in this document still describes `v2` as of `e967cc0`. The confidence
statement in §10.8 stands, and the remaining exposure is whatever lands after
this point — chiefly `feat/tree-validation` and `feat/power-law-gravity-lab`,
which are the two unmerged branches whose names suggest new validation logic.
