# Contributing to Gravitas

Gravitas is a teaching tool before it is a piece of software. The bar for a
change is not "does it work" but "does it teach the right thing, and can an
instructor trust it in front of a class". That shapes most of what follows.

Issues and pull requests are welcome. If you are not sure whether something is
wanted, open an issue first — it is cheaper than a rejected branch.

---

## Getting set up

Node 18 or newer (developed on 24).

```bash
npm install
npm run dev          # serves the repository root at http://localhost:8003
```

The unbundled ES modules run straight from disk, so there is no build step in
the development loop. `npm run build` exists for publishing, not for working.

---

## The checks

Everything CI runs, you can run:

```bash
npm test                  # jest: physics, data, formatting of numbers, i18n parity
npm run lint              # eslint (prettier runs inside it)
npm run format:check      # prettier, for the files it owns
npm run docs:check        # the counts in the docs still match the source
npm run build             # a production bundle must still build
```

Depending on what you touched:

```bash
npm run validate:physics  # any change to js/physics.js or a tolerance
npm run e2e               # any change to the interface
npm run validate:scenarios  # any change to a scenario's initial conditions
npm run thumbnails:check  # any change to how a scenario looks
```

Two things worth knowing before you run the browser suite:

- `npx playwright install chromium` once, first.
- The suite reuses an existing dev server on its port. If you have a second
  checkout of this repository serving port 4173, your run will silently test
  _that_ one. `GRAVITAS_E2E_PORT=4199 npm run e2e` gives you a private server.

---

## Conventions

**CSS is layered.** The order is `tokens, base, legacy, components, overrides`.
Component rules beat legacy rules on layer order alone, which is why nothing in
`components.css` needs `!important`. Colour belongs in `tokens.css`; no other
stylesheet should carry a hex value.

**One source of truth per fact.** A scenario's title, summary, concept tags and
thumbnail live in `js/data/scenarioInfo.js`, and every surface — the gallery,
the settings dropdown, the instructor materials — reads from there. The same
holds for lesson content and the habitable-zone model. Several tests exist only
to enforce this.

**User-visible text is a message id.** Strings live in `js/i18n/en.js` and are
reached with `t('rail.screenshot')` from JavaScript or `data-i18n="..."` from
HTML. `js/i18n/es.js` carries the Spanish. A key added to one catalog and not
the other fails `npm test`.

**Comments say why.** The codebase is unusually heavily commented and the
comments are about decisions, not mechanics — why the handles are stored in
world coordinates, why the integrator default cannot change. A comment that
restates the line below it will be asked about in review.

**Numbers in documentation are generated.** See
[Documentation](#documentation) below.

---

## Adding a scenario

Two places, both data:

1. **`js/data/scenarioInfo.js`** — the title, the summary a student reads, one
   to four concept tags from the fixed tag list, and a thumbnail path.
2. **`js/scenarios.js`** — a branch in `applyPreset` that transforms the
   settings object. It is a pure function of settings: it may not reach into
   the UI.

Then:

```bash
npm run thumbnails            # capture the thumbnail
npm run validate:scenarios    # conservation audit, in a real browser
npm run docs:sync             # the catalog count in the docs
```

A scenario has to demonstrate what its title claims within about thirty seconds
of loading, on a laptop, without the reader touching anything. If it needs a
paragraph of setup to be interesting, it is a lesson, not a scenario.

---

## Adding an investigation

A lesson is one module in `js/data/investigations/`, exporting a default object:

```js
export default {
  id: 'tides',
  title: 'Tides',
  subtitle: '…',
  duration: '35-45 min',
  level: 'Introductory astronomy',
  summary: '…',
  objectives: ['…'],
  steps: [
    /* … */
  ],
};
```

Each step has a `type`, and the five types are the whole vocabulary:

| `type`     | What it does                                                           |
| ---------- | ---------------------------------------------------------------------- |
| `read`     | Prose, optionally with a `setup` that loads a scenario                 |
| `predict`  | Asks for a commitment before anything is shown                         |
| `question` | A graded question: `options` and an `answer`, or a numeric `tolerance` |
| `measure`  | Hands over a `tool` and takes the reading, with a `validate`           |
| `explore`  | A free-form checklist against a `rubric`                               |

Rules that are not obvious:

- **Predict before reveal.** Every measured result is preceded by a `predict`
  step. A lesson that shows the answer first teaches nothing.
- **The lesson owns no physics.** A step measures what the engine produces. If
  a lesson needs a number the engine cannot produce, fix the engine.
- **Answers carry a tolerance and a reason.** `tolerance` is not a fudge
  factor; it is the precision the instrument can actually deliver.

After adding one:

```bash
npm run manifest    # regenerate the lesson-card manifest
npm test            # investigationRegistry.test.js will tell you if you forgot
npm run docs:sync   # lesson and step counts in the docs
```

The instructor guide and answer key for a new lesson are generated from it by
`npm run build:instructors` — you do not write them.

---

## Adding a language

The interface is fully extracted, so a new language is:

1. Copy `js/i18n/en.js` to `js/i18n/<code>.js` and translate the values. Keys,
   placeholders (`{n}`) and plural forms stay exactly as they are.
2. Add a row to `LOCALES` in `js/i18n/index.js` with the endonym and a one-line
   `coverage` sentence, written in that language, saying honestly how much is
   translated.
3. Optionally translate lessons: one file per lesson under
   `js/data/investigations/<code>/`, carrying words only. Arrays line up by
   index with the English and `null` means "not translated".

A lesson translation cannot reach a lesson's machinery — not a scenario name,
a seed, a widget id, a numeric answer or a probe — so a mistranslation can
change what a student reads but never what the simulation measures. Keep it
that way.

---

## Physics changes

Any change to `js/physics.js` needs `npm run validate:physics` before and after,
and the pull request should say which rows moved and by how much.

Tolerances are derived, not chosen: an integrated tolerance comes from the
integrator's measured convergence order, a published one from the precision the
source quotes. If you need to loosen a tolerance, the reason goes in the table
next to it.

The default integrator is Symplectic Euler and cannot change without re-tuning
every scenario, because each one was laid out against its error behaviour.

---

## Documentation

**Counts are generated.** Anything of the form

```markdown
**<!--fact:scenarios-->49<!--/fact--> built-in scenarios**
```

is written by `npm run docs:sync` from the catalog, the lesson manifest, the
test output or the build summary. Never edit the number by hand; run the sync.
One rule about placement: a marker must never be the first thing on a line.
Prettier reads a line-leading HTML comment as a block element and puts blank
lines around it, which splits the paragraph in three on the rendered page.
`docs:check` fails on it, so you will hear about it before a reader does.
`npm run docs:check` fails a pull request whose counts have drifted, and
`npm run docs:check -- --full` also verifies the ones that cost a test run.

**The user manual is LaTeX.** Source in `manual/`, built with `npm run manual`,
committed as `Gravitas_User_Manual.pdf`. Its counts come from the same
generator, as `manual/facts.tex`.

**Three documents are history, not description.**
`UI_PERFORMANCE_AUDIT.md`, `PERFORMANCE_OPTIMIZATIONS_SUMMARY.md` and
`SCENARIO_FIXES.md` record work that was done at a point in time, with the
measurements taken then. Do not update their numbers to match the present — the
numbers are the record. If a recommendation in one of them has since been
carried out, mark it as superseded and say where the work landed.

---

## Pull requests

- One change per pull request. A rename and a behaviour change in the same
  branch cannot be reviewed.
- Say what you measured. "Faster" is not reviewable; "trail pass 12.4 ms →
  6.9 ms on Star Cluster, `npm run perf`" is.
- New behaviour needs a test. Physics goes in `tests/`, anything a user can see
  goes in `e2e/`.
- If you changed what a student sees, say which lesson steps it affects.

CI runs formatting, lint, jest, the physics table, the link checker, the
documentation check, a production build, and the browser suite against both the
sources and the built artifact. Branch protection requires the aggregate `CI`
job.

---

## Licence

MIT, same as the project. By contributing you agree your work is released under
it.
