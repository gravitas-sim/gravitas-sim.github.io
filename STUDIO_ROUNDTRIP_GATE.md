# Studio round-trip architecture gate

**Status: decided, A (proceed), within the scope below.** Carl's standing
instruction covered this gate, so the verdict was **not reviewed** before
anything came after it. It is recorded here as evidence to be read, not as a
decision anybody signed.

The prototype code stays on `spike/studio-roundtrip-gate`:

- `spike/studio/`: `core.mjs`, `harness.mjs`, `browser.mjs` and
  `supplement.mjs`;
- every measurement is in `spike/studio/evidence.json`.

This document is the decision record.

## The question

Can a browser Studio import, edit, validate, preview and export Gravitas
content without a lossy conversion of its sources and without a second
registry?

**The answer, measured:** yes, for editing the data of existing lessons and
scenarios in place. Here the Studio never converts anything:

- it parses the repository's own file;
- it changes literals, data-only array elements and object keys at the
  parser's source ranges;
- it carries every function, comment and helper byte for byte.

The answer is **no** (outside what this gate licenses) for editing code, which
the Studio does not do at all. It is **not yet** for creating a new lesson or
scenario, which today means writing code in a registry.

## Scope of the prototype

Fixed in commit `7044167` before any prototype code existed, and unchanged
since.

- **One scenario: _Alien Dyson Swarm Collapse._**
  - Its settings are the `applyPreset` branch in `js/scenarios.js`.
  - Its tags and thumbnail are in `js/data/scenarioInfo.js`.
  - Its title and summary are in `js/i18n/en.js` and `js/i18n/es.js`.
  - It has no hand-built geometry in `js/world/build.js`, and no lesson uses
    it.
- **One short investigation: _Twelve Nights_.**
  - Its files are `js/data/investigations/twelve-nights.js`, its Spanish
    shadow `js/data/investigations/es/twelve-nights.js`, and its entry in
    `js/data/instructorContent.js`.
  - It has 13 steps, and its only code is three `validate` functions.
- **The edit script** every threshold below is measured on is fixed here and
  not changed afterwards:
  1. Reword a step's title and body.
  2. Reword one option of a choice step.
  3. Change a measure field's hint and a numeric step's tolerance.
  4. Insert a new read step, and a new choice question with an answer.
  5. Delete a step.
  6. Change two of the scenario's settings, its English title and one tag.

  Each lesson edit is made to the English source; what it implies for the
  Spanish shadow and the instructor entry is part of what is measured.

## Thresholds

Verbatim from `7044167`.

| # | Question | Pass when |
| --- | --- | --- |
| T1 | Identity | Importing and exporting every file in scope with no edit gives byte-identical files. |
| T2 | Lossless edits | After the edit script, every byte outside the edited literals is unchanged. Re-parsing shows no syntax-tree change but the edited literals and inserted literal-only nodes. Comments, functions and helper constants survive. |
| T3 | One registry | The Studio reads and writes only the existing source files. It keeps no content store beyond an undo log bound to the sources' hashes. Its export is a repository patch that `git apply` accepts cleanly, and after which the existing commands regenerate every derived artifact. |
| T4 | Validation parity | The authoring rules run on the edited lesson inside the Studio give the same findings (rule ids and step indices) as `npm run author:check -- --lesson=twelve-nights --json` on the patched file. |
| T5 | Preview | In a browser, without writing a file, the edited lesson opens in the application's own lesson runner and the edited scenario loads in the sandbox, each showing the edited text or setting. |
| T6 | Existing answer primitives only | Every answer check in the edited content is one the application already has: a choice index, a numeric answer with its tolerance, or a rubric. The Studio offers no way to create or edit a function. The three `validate` functions survive byte-identical and are shown as read-only. |
| T7 | Stable ids and downstream effects | No edit changes an existing sid. New sids are valid and unique. For each edit, the Studio's report of fingerprint changes (and so of which assignment links and submissions will flag a step) matches an independent computation with `stepFingerprint`. |
| T8 | Translation | Every English edit to a translated string marks its Spanish counterpart stale. After an insertion or deletion the shadow stays aligned: every Spanish step still translates the English step with the same sid, checked through `mergeTranslation`. |
| T9 | Instructor boundary | After the insertion and deletion, every step-numbered instructor reference still names the step it named before, or is listed for review. The Studio never handles the passphrase, the ciphertext or any rendered instructor document, and its export contains none of them. |
| T10 | Malicious imports | At least ten hostile inputs are refused before anything is evaluated, each with a reason. They include: a function in an edit, an added import or call, a getter, a `__proto__` key, a template with expressions, markup or a `javascript:` URL in text, an oversize file or string, a file not shaped like a repository lesson, and an edit log for other sources. No user-supplied code is ever evaluated: the only module evaluated for preview is the repository's own, re-verified equal to it but for its literals. |
| T11 | Undo, redo, crash recovery | Undoing every edit restores byte-identical sources. The edit log survives serialization and a reload, and replays to the same bytes. A log recorded against other sources is refused. |
| T12 | Change format and migration | The edit log is a versioned JSON change set that replays to the same patch, and a change set in an older version migrates under a declared migration. |
| T13 | Diff review | The export gives a text diff and a semantic diff: per step, each field's old and new value, fingerprint changes, stale translations and instructor references. For the edit script each lists exactly the changes the other does. |
| T14 | Cost | No byte is added to any existing route. The Studio core and its parser together are at most 200 KB minified, on a page of their own. |

## Verdict rules

Verbatim from `7044167`.

- **A (proceed):** every threshold passes.
- **B (staged):** T1, T2, T3, T6 and T10 pass, and every other failure has a
  named, bounded production task. Production begins with the passing subset.
- **C (stop):** T1, T2, T3 or T10 fails. Content cannot round-trip without
  loss or without a second registry, or an import cannot be made safe. Studio
  production pauses; the standalone Orbital System Builder may proceed if its
  own scientific gate is met.
- A threshold that could not be measured is reported as unmeasured, and
  counts as not passed.

## The sources of truth today

A read-only audit of `623b61a`, which the design rests on.

- **Lessons** are JavaScript modules with no imports. Every one of the 24
  carries code:
  - 88 `validate` functions;
  - 79 `probe` functions, over a 57-member live context, several of whose
    members change the world;
  - `fields[].compute` in 8 lessons, `plot` functions in 5, and
    `importFromSelection` in 2;
  - module-level helper constants.

  None round-trips as JSON. A JSON form would also lose setup identity: 26
  re-declared setups in 10 lessons avoid a rebuild only because they are the
  same object (`js/investigations.js:3533`).
- **Scenarios** are code-dispatched. A branch of the `applyPreset` if-chain
  in `js/scenarios.js` holds each one's settings literals. There is no
  manifest: `SCENARIO_STRUCTURE`'s keys are the registry. Forty of the 59
  also have hand-built geometry in `js/world/build.js`.
- **Spanish** is an index-aligned shadow per lesson, merged by
  `mergeTranslation`. Inserting a step without editing the shadow misaligns
  every later step: 8 of 14 in this edit script.
- **Instructor content** keys expectations and flow by 1-based step number,
  and its prose names steps by number.
- **Derived artifacts** are regenerated by the existing commands, each with a
  check that fails when stale:
  - `manifest`, `audit:scene`, `docs:sync`, `teaching:data`, `sw:manifest`
    and `manual`;
  - the world golden;
  - `thumbnails`, `cards` and `build:instructors`.

## The design: edit the sources, never convert them

**Source-of-truth decision.** The repository files stay the only source of
truth, and there is one registry: the files the application already reads.

- The Studio parses a file with acorn (MIT, already a pinned dependency,
  used by `tools/add-step-ids.mjs` for the same kind of splice).
- It locates the object an edit belongs to:
  - the const a lesson default-exports;
  - the object a shadow exports;
  - a named entry of an exported object;
  - or the object literal a named `applyPreset` branch passes to
    `Object.assign`.
- It then applies four operations at source ranges:

  | Operation | What it does |
  | --- | --- |
  | `set` | a literal |
  | `insert` / `remove` | a data-only element of an array |
  | `rekey` | an object key |

**Validity after every edit.** After each edit, the file must still be the
same code:

- the same function text;
- the same comments;
- the same bytes outside the edited object;
- the same syntax-tree shape, with literals masked, once the structural
  edits are replayed on the base's shape.

**The Studio's own state** is a change set, `gravitas.studio-changes/1`:
the edits, with the SHA-256 of every source they were recorded against.
Undo and redo replay a shorter or longer prefix of it; crash recovery
replays it after a reload.

**Export.** It is a unified patch and the change set. A maintainer applies
the patch and runs the existing regeneration commands. The browser never
writes the repository, and never touches the instructor bundle.

**Preview uses the application's own doors:**

- **A lesson:** its edited module is imported from a `blob:` URL through
  `provideLessonLoaders(id, {lesson, translations})`, the registry's
  existing door for packaged lessons. The lesson then opens in the ordinary
  runner.
- **A scenario:** a share payload whose settings delta is the edit, which is
  the path a lesson step's `setup` takes. No scenario code is evaluated.

### Security model

- **Code is never edited, and never supplied.**
  - `set` refuses any path that ends at, or passes through, a function
    (`code`).
  - An edit value must be plain data: a finite number, a boolean, `null`,
    a string, or an array or plain object of those.
    - Keys may not be `__proto__`, `constructor` or `prototype`.
    - Getters are refused.
    - Nesting is at most 12 deep.
    - A string is at most 20,000 characters.
    - A string may carry only the four inline tags lesson prose renders
      (`strong`, `em`, `sub`, `sup`). A script, data or `vbscript:` URL is
      refused, and so is a control character.
  - A value written into a template literal is escaped (`` ` `` and `${`),
    so it cannot become an expression.
- **A whole file offered to the Studio**, a colleague's edited lesson for
  instance, is accepted only if every one of these holds:
  - it is at most 512 KB;
  - it parses;
  - it has the same imports as the repository's file (none, for a lesson);
  - it has the same function text, byte for byte;
  - it has the same shape once every data-only part is set aside;
  - every string passes the text rules.

  Anything else is refused before evaluation.
- **The only module ever evaluated** is the repository's own, patched by
  literal edits and re-verified as above.
- **A change set** recorded against other sources is refused (`base`).
- **Instructor boundary:**
  - The Studio edits `instructorContent.js`, which is already public
    plaintext served with the site.
  - It never reads or writes `.instructor-password`,
    `instructors/materials.enc.json` or its manifest, or any rendered PDF.
  - Its export contains none of them.
  - Rebuilding the encrypted bundle stays a maintainer step that needs the
    passphrase.

## What was built

On `spike/studio-roundtrip-gate`, at `e5ea0b1`:

| File | What it is |
| --- | --- |
| `spike/studio/core.mjs` | parse, locate, the four edit operations, `checkValue`, `checkImport`, `shapeOf` and `looseShapeOf`, `codeOf`, the change set with `replay`, `migrate`, and a line diff. Pure: browser and Node alike. |
| `spike/studio/harness.mjs` | runs the edit script and measures T1–T3 and T6–T13 in Node, and writes the patch, the change set, the semantic diff and `author:check`'s findings to `spike/studio/out/` |
| `spike/studio/browser.mjs` | bundles the core for the browser (T14), replays the change set in Chromium and runs the authoring rules there (T4), and previews both edits (T5) |
| `spike/studio/supplement.mjs` | the tolerance edit Twelve Nights cannot take, and the derived artifacts the scenario edit reaches |

Reproduce:

```bash
node spike/studio/harness.mjs
node spike/studio/browser.mjs
node spike/studio/supplement.mjs
```

## Results

| # | Result | Measured |
| --- | --- | --- |
| T1 | **pass** | All 7 files come back byte-identical from an empty change set, and all 7 are accepted by the import check. |
| T2 | **pass** | 20 edits across 6 files. For each file: bytes outside the edited object identical; function text, comments and masked shape identical; inserted text is data only. The lesson went from 29,346 to 26,401 bytes, and its three validators were untouched. Edit 3's tolerance half does not apply to Twelve Nights, which has no numeric answer; it was measured on Kepler's Laws instead (below). |
| T3 | **pass** | The patch is 15,345 bytes; `git apply` accepts it cleanly, and what it applies is byte-identical to the Studio's output. The existing commands then regenerate the rest (next table). |
| T4 | **pass** | In Chromium, the rules over inputs the page gathers (the edited lesson, shadow and instructor entry in memory) give exactly `author:check`'s findings on the patched tree: 2 errors, `agree/counts`, because the manifests still say 13 steps. Both disappear after `npm run manifest`. The replay took 73 ms in the page, the rules 31 ms. |
| T5 | **pass** | The edited lesson opened in the ordinary runner from memory: step 1 read "Twelve nights, and a catch", progress "1 of 14 steps", and step 5 was the inserted one. The edited scenario built 178 bodies, the world golden's 128 plus the 50 added stars, with `num_stars` 150 and `trail_length` 24. No page errors. |
| T6 | **pass** | Three validators, byte-identical, and editing one is refused (`code`). The Studio's only operations are set, insert, remove and rekey. The inserted question is graded by its choice index. |
| T7 | **pass** | No sid changed. The new sids are valid and unique. The predicted fingerprint changes equal `stepFingerprint`'s: two new steps, one deleted, the rest the same. Reworded text is not fingerprinted (see Findings). |
| T8 | **pass** | With the Studio's `null` insertions and deletion in the shadow, 0 steps are misaligned. Without them, 8 of 14 would be. Three stale Spanish strings are reported: the edited step's title and body, and the reworded option. |
| T9 | **pass** | The expectations follow their steps (10→12, 7→8, 6→7), and the flow ranges are renumbered (4-7, 8, 9-12). One range holds the deleted step, and 13 prose references name steps by number: all 14 are listed for review. One more "step N" in the lesson's own prose is listed too. No instructor bundle file is in the export. |
| T10 | **pass** | 19 hostile inputs, all refused with a reason: a function, `<img onerror>`, `</script>`, `javascript:`, `__proto__`, `constructor`, a getter, `Infinity`, an oversize string, editing a validator, an oversize file, an added import, a call where a literal was, a template with an expression, a getter in the file, a changed validator, a file that is not a lesson, `<iframe>` in an imported lesson, and a change set for other sources. A value with `` ` `` and `${` is written escaped and evaluates to the text. |
| T11 | **pass** | Undoing every edit restores byte-identical sources. Stepping back one edit and forward again gives the same bytes at every one of the 20 positions. The serialized log (3,419 bytes) replays to the same bytes, and a log for other sources is refused. |
| T12 | **pass** | The change set replays to the same patch. A version-0 change set (dotted paths, `set` only) migrates to version 1 and gives the same bytes. A newer version is refused. |
| T13 | **pass** | The semantic diff has 20 entries (below) and the text diff 128 changed lines. Every semantic change comes from an edit, and every edit appears in it. |
| T14 | **pass** | Core and acorn come to 129.2 KB minified, 37.5 KB gzipped, on a page of their own. No shipped module imports the spike, so no route changed. |

**Every threshold passes.**

### What the existing commands do with the patch (T3, on the patched tree)

| Artifact | Detected by | Regenerated by |
| --- | --- | --- |
| lesson manifests (`manifest.js`, `manifest.es.js`) | `agree/counts`, the manifest check | `npm run manifest` |
| scene audit (`docs/lesson-scene-*`) | `audit:scene:check` | `npm run audit:scene -- --write` |
| docs facts (README, `CITATION.cff`, …) | `docs:check` | `npm run docs:sync` |
| `sw-manifest.js` | `sw:check` | `npm run sw:manifest` |
| world golden | `e2e/worldConstruction.spec.js` (count 128 → 178) | `GRAVITAS_UPDATE_WORLD_GOLDEN=1` on that spec, which then passes |
| user manual | `manual:check` (steps 683 → 684) | `npm run manual`, which then passes |
| formatting | Prettier flags two files (long inserted strings, a longer title) | `npm run format` |
| scenario thumbnail | **not detected**: `thumbnails:check` checks presence only | `npm run thumbnails` |
| instructor bundle | `instructors:check` | `npm run build:instructors`, maintainer only (passphrase) |

`author:check` on the patched and regenerated tree: 24 lessons, 684 steps,
0 errors and 0 warnings.

### Supplementary: the tolerance edit

Measured on the first lesson with a numeric answer, Kepler's Laws, step
`use-the-law`. Doubling its tolerance (0.4 to 0.8):

- changed that step's fingerprint, so assignment links and submissions flag
  it;
- changed no other step's fingerprint;
- kept the lesson's code and masked shape identical.

## The complete semantic diff

From `spike/studio/out/semantic-diff.json`, the edit script's changes, file by
file. Old and new values are abridged where long.

**`js/data/investigations/twelve-nights.js`**

| Step (sid) | Change | Before | After |
| --- | --- | --- | --- |
| `the-allocation` | `title` | Twelve nights | Twelve nights, and a catch |
| `the-allocation` | `body` | A time allocation committee has given you **twelve nights** on one star: HD 209458, from **La Silla** … | A committee has given you **twelve nights** on HD 209458 from La Silla. The target never rises high: plan around that. |
| `measure-the-window` | `fields.0.hint` | 4.96 | 5.0 |
| `predict-the-comb` | `options.2` | one cycle per twenty days, the length of the run | A comb whose teeth drift by four minutes a night |
| `studio-inserted-read` | inserted, now step 5 | | read step |
| `studio-inserted-question` | inserted, now step 10 | | choice question, answer index 1 |
| `sixty-nights-would-not-help` | deleted | step 11 | |

**`js/data/investigations/es/twelve-nights.js`**

| Change | Where |
| --- | --- |
| `null` (not translated) inserted | steps index 4 |
| `null` inserted | steps index 9 |
| entry removed | the deleted step's index |
| **stale, for a translator** | `the-allocation.title`, `the-allocation.body`, `predict-the-comb.options.2` |

**`js/data/instructorContent.js`, entry `twelve-nights`**

| Change | From | To |
| --- | --- | --- |
| `expectations` key | 10 | 12 |
| `expectations` key | 7 | 8 |
| `expectations` key | 6 | 7 |
| `flow.1.steps` | 4-6 | 4-7 |
| `flow.2.steps` | 7 | 8 |
| `flow.3.steps` | 8-10 | 9-12 |
| **for review** | `flow.4` "11-13" | holds the deleted step |
| **for review** | 13 prose references | "step 11" in the overview; "Step 7" (key concepts); steps 1, 11 and 7 (misconceptions); steps 3, 1-7, 8-10, 11, 11, 12 and 11 (teaching notes); "Step 13" (discussion) |

**The scenario**

| File | Path | After |
| --- | --- | --- |
| `js/scenarios.js`, the Alien Dyson Swarm Collapse branch | `num_stars` | 150 (was 100) |
| `js/scenarios.js` | `trail_length` | 24 (was 18) |
| `js/i18n/en.js` | `scenario.Alien Dyson Swarm Collapse.title` | Alien Dyson Swarm Collapse, Revisited. The Spanish title becomes stale |
| `js/data/scenarioInfo.js` | `tags.1` | `orbits-kepler` (was `compact-objects`) |

**Fingerprints:**

- two new steps and one deleted step;
- every other step keeps its fingerprint, the reworded ones included;
- the Kepler's Laws supplement changes one.

## Verdict: A, proceed, within this scope

Every threshold passes, so the rules give **A**.

**What A licenses:** a browser Studio that edits the data of existing
lessons, their Spanish shadows, their instructor entries and scenarios in
place. It inserts and removes data-only steps graded by the existing
primitives; it validates with the authoring rules; it previews through the
application's own doors; and it exports a patch and a change set for a
maintainer to apply and regenerate.

**What A does not license:**

- **Editing code:** validators, probes, `compute`, `plot` functions or world
  geometry. The Studio shows these read-only. No expression language was
  designed, and none should be.
- **Creating a new lesson or scenario from the browser as it stands.** Both
  need code today: a loader line in `registry.js` and the barrel, and a new
  `applyPreset` branch. The migration plan below makes both data. Until then,
  a new lesson starts from `npm run author:new`, as now.
- **Publishing without a maintainer.** A patch still needs a person with the
  repository to apply it, run the regeneration, and rebuild the instructor
  bundle.

## Findings that production must handle

These are hazards the gate exposed. None fails a threshold, but each is a
place where a Studio edit is correct and still misleads someone.

1. **Editable data can disagree with read-only code.** The Studio changed
   step 3's hint from 4.96 to 5.0; its validator still tests
   `|windowHours − 4.96| > 0.3`. The Studio cannot see into the validator.
   It should list every literal a step's code mentions next to the fields
   that plausibly carry the same number, and warn when an edited value no
   longer matches one.
2. **Rewording is invisible to fingerprints.** A rewritten title, body or
   option wording under the same sid keeps its fingerprint. Saved answers
   and assignment links then carry the old answer to the new question in
   silence. The fingerprint (`stepFingerprint`) covers type, kind, tool,
   scenario, field ids, option count and the answer only. A Studio must at
   least say so on every text edit. A production change could add a hash of
   the prompt and options, which is a format change for progress backups.
3. **Spanish is aligned by index.** The Studio keeps it aligned by editing the
   shadow in lockstep. A hand edit outside the Studio still breaks it
   silently. Migration 2 below removes the hazard.
4. **Instructor prose names steps by number.** That cannot be renumbered
   safely; this lesson has 14 such references. The Studio lists them.
   Migration 3 removes the keyed ones.
5. **The registry memoizes a loaded lesson** (`loaded` in
   `js/data/investigations/registry.js`). A second preview of the same lesson
   in one page needs a way to clear it: a small production task.
6. **Thumbnails are checked for presence, not currency.** A scenario edit
   leaves a stale image that passes `thumbnails:check`.
7. **Export formatting.** The Studio writes values in the file's quoting
   style but does not wrap long lines; the patch needs `npm run format`.
   Running Prettier in the browser would cost several hundred KB and is not
   worth it.
8. **Bugs the audit found** in paths a Studio would build on:
   - **Confirmed:** the instructor submission results page looks answers up
     by bare sid while the engine stores `lesson:sid`, so real submissions
     grade as unanswered.
   - **Confirmed, live on main:** named entities in lesson prose
     (`HD&nbsp;209458`) render as literal text, because `prose()` escapes `&`
     first.
   - **Not verified:** measure fields are read with `Number()`, so a Spanish
     decimal comma may reach a validator as `NaN`; and tagged URL fragments
     have no inflation cap.

   Both confirmed bugs are flagged as separate tasks and listed in the v2
   release report.

## Migration plan

**The change set.** `gravitas.studio-changes/1` is versioned. A reader
migrates older versions under declared migrations (version 0 is
demonstrated) and refuses newer ones. Its base hashes make a change set
recorded against other sources inert rather than wrong.

**Source migrations** that would widen what the Studio can do, each optional
and each independent:

1. **Scenario presets as a data table.** Move each `applyPreset` branch's
   `Object.assign` literal into a `SCENARIO_PRESETS` object that
   `applyPreset` reads. New scenarios that need no hand-built geometry then
   become data, and the 40 geometry branches stay code. This touches
   `js/scenarios.js` only; it must keep the world golden byte-identical.
2. **Spanish shadows keyed by sid.** Merge by sid rather than index, with a
   fallback reading today's index-aligned shadows, so an insertion can
   never misalign a translation. Adding a source hash per string would make
   stale translations detectable outside the Studio too.
3. **Instructor expectations and flow keyed by sid.** The step-numbered keys
   become sids; the prose references stay prose, listed by the Studio.
4. **A lesson template for new lessons**, written by a Studio export the way
   `author:new` writes one today. Its registry lines are the one fixed code
   shape, generated rather than edited.

## Production shape, for Prompts 29 to 31

- **A page of its own,** `/studio/`, with its own entry and route budget.
  - It vendors acorn (MIT), at 129.2 KB minified or 37.5 KB gzipped with the
    core.
  - The application's routes are untouched.
- **Load:** the repository's files, fetched from the same origin and hashed.
- **Edit:** the four operations, with an undo stack that is the change set,
  kept in `localStorage` for crash recovery and bound to the base hashes.
- **Validate:** `checkCatalog` over inputs gathered in the page, as the
  spike did. Its findings equal `author:check`'s.
- **Preview:**
  - lessons through `provideLessonLoaders`, which needs cache clearing
    (finding 5);
  - scenarios through share payloads.
- **Review:** the semantic diff with fingerprints, stale translations and
  the instructor review list, then the text diff.
- **Export:**
  - `studio.patch`;
  - the change set;
  - a checklist of the regeneration commands its files need (the T3
    table).

  Import of a colleague's edited file goes through `checkImport`.
- **The Orbital System Builder (Prompt 28) is independent of this gate.**
  Prompt 29's visual scenario builder should write scenario presets through
  migration 1 rather than through the if-chain.

## Rejected alternatives

- **Converting lessons to JSON and back.** It loses the 88 validators, the 79
  probes and every comment and helper, and it changes setup identity in 10
  lessons, and so rebuild behavior.
- **A Studio registry or content store beside the repository's.** This is a
  second source of truth, which the question rules out.
- **Editing code in the browser.** It would evaluate code that no reviewer
  has seen, which the platform's security boundary forbids for anything
  that is not built in and reviewed.
- **A declarative validation language.** Ruled out by the roadmap. The
  existing primitives grade every new step the Studio can make.
