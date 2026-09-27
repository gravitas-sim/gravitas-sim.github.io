# Studio round-trip architecture gate

**Status: in progress.** This commit fixes the scope, the thresholds and the
verdict rules before any prototype code exists on
`spike/studio-roundtrip-gate`. Results and the verdict are judged against them
as written here.

## The question

Can a browser Studio import, edit, validate, preview and export Gravitas
content without a lossy conversion of its sources and without a second
registry?

## Scope of the prototype

- **One scenario: _Alien Dyson Swarm Collapse._** Its settings are the
  `applyPreset` branch in `js/scenarios.js`; its tags and thumbnail are in
  `js/data/scenarioInfo.js`; its title and summary are in `js/i18n/en.js` and
  `js/i18n/es.js`. It has no hand-built geometry in `js/world/build.js` and no
  lesson uses it.
- **One short investigation: _Twelve Nights_.** That is
  `js/data/investigations/twelve-nights.js`, its Spanish shadow
  `js/data/investigations/es/twelve-nights.js`, and its entry in
  `js/data/instructorContent.js`. It has 13 steps, and its only code is three
  `validate` functions.
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

- **A (proceed):** every threshold passes.
- **B (staged):** T1, T2, T3, T6 and T10 pass, and every other failure has a
  named, bounded production task. Production begins with the passing subset.
- **C (stop):** T1, T2, T3 or T10 fails. Content cannot round-trip without
  loss or without a second registry, or an import cannot be made safe. Studio
  production pauses; the standalone Orbital System Builder may proceed if its
  own scientific gate is met.
- A threshold that could not be measured is reported as unmeasured, and
  counts as not passed.
