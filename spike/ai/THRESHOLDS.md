# Prompt 120 thresholds: instructor-side AI assistance

Fixed on 2026-10-11, before any prototype code exists, on `v2` at `22b5aa15`.
No threshold below is changed after a measurement. A verdict these thresholds
cannot reach is C. This file is the only place a threshold lives; the gate
document quotes it.

Read before writing this: `tools/csp.mjs` (every page's `connect-src` is a
closed list of origins named in the repository), `tools/build-service-worker.mjs`
(the whole of `js/` is walked into the precache core), `js/composer/compile.js`
(`digest`, `collectTexts`, the `{en, es, esOf}` text shape),
`js/authoring/rules.js` (`scaffoldProblems`, the `content/hint-leak` rule) and
`js/answerFeedback.js` (the deterministic hint ladder). Criterion U8 rests on
the first of these and was written knowing it.

## What is evaluated

Three uses, all instructor-side, none of them reaching a student unreviewed:

- **H**: drafting a hint ladder, outcome-class feedback or a named mistake for a step.
- **S**: drafting the Spanish of a text, with the English digest (`esOf`) attached.
- **D**: suggesting distractors for a choice question.
- **N**, the null option: none of this. The deterministic path is the composer's
  translation status (missing, stale, done), the authoring rules, and the
  evidence the instructor and author pilots (Prompts 115 and 116) produce.

No student-facing tutor, chat or grader is evaluated. It is out of scope and
the gate document says why.

## The reference corpus

Taken from the tree at the base SHA, by code in `spike/ai/corpus.mjs`, so a
reader can rerun it.

- H: every string in a built-in step's `hints` (the array form and the
  `concept`/`method` form), `feedback` values and `misconceptions` texts, in
  the lessons and the example pack.
- S: every English and Spanish pair of the built-in Spanish shadows and the
  example pack.
- D: every option of a built-in choice question other than its answer.

A use whose corpus has fewer than 30 texts is reported "insufficient" and is C.

## Criteria

A criterion is **U** (universal: it must pass for the use to be A or B), **V**
(viability), **E** (evidence of need) or **Q** (quality, which needs a real
model).

### U1. No student data leaves the browser

Requests are built from an allow-list of fields of the instructor's own pack
(a text, its path, its kind, the digest). A saved state fixture holding
student work (responses, a name, a hint log, a notebook entry) is present in
the same storage during every build. Over the corpus, per use: 0 requests
carry a byte of the fixture, and 0 carry a key outside the allow-list.

### U2. No network dependency for any student surface

By the static import graph from every page's entry script other than the
composer page and the studio pages: 0 reach the assist module. The student
pages' Content-Security-Policy text is byte-identical to the base's.

### U3. No vendor lock-in, no shipped key

The module contains no hostname, no key, no vendor or model name, and no
default endpoint (a literal scan, 0 matches). With an endpoint of a second
shape (a bare `{prompt}` to `{text}` form beside the chat-completion form)
the same module works through a declared adapter table of at most 2 entries.

### U4. A draft is a draft, checked, and diffable

Per use, 20 scripted drafts from a loopback stand-in endpoint: 10 that must be
refused (a stated number, the expected value, a number word in English or
Spanish, a wrong shape, a script or any markup other than `sup`, `sub` and
`em`, over the length limit) and 10 clean ones. All 20 classified correctly
for the use to pass; one miss fails it.

The number rule R-NUM: refuse any draft containing a digit (Unicode Nd), or an
English or Spanish number word (zero to twenty, thirty to ninety, hundred,
thousand, million, billion; cero to veinte, treinta to noventa, cien, ciento,
mil, millón). For S the Spanish may contain exactly the digit strings of its
English source (decimal comma or point normalised) and no more, and number
words only up to the English source's count of number words.

Drafts are stored beside the text they would replace, marked `draft`, and the
pack is unchanged until accept: reject leaves the pack byte-identical; accept
changes exactly the one text and its `esOf`. Both are verified by a
byte comparison over every corpus text. The rules of `author:check`
(`scaffoldProblems`, the translation shape rules) run on an accepted draft
unchanged.

### U5. Reproducible and attributed

The prompt builder is deterministic (the same inputs give the same bytes, over
the corpus, twice). Every accepted draft records, in the pack, the prompt
version, the prompt digest, the model string the endpoint returned, the
parameters sent, and the time; 100% of accepted drafts carry all five.

### U6. Off by default, absent from the precache, free to the student

The flag is absent in a fresh storage and the module reports disabled. The
precache core list, regenerated with the module in the tree, does not contain
it, and the change needed to keep it out is one exclusion pattern. The module
is at most 6.0 KB gzip. A student's bytes on every route are unchanged
(`node tools/route-budget.mjs` reports no route differing from the base).

### U7. Silent degradation

Eight failure modes (timeout, HTTP 500, network error, non-JSON body, empty
body, oversize body, refused by the draft checks, abort) for each of the three
uses: 24 of 24 leave the pack byte-identical, throw nothing the caller sees,
and return the same value (`null`) the disabled module returns.

### U8. The Content-Security-Policy keeps its meaning

No page's `connect-src` gains an origin that is not a literal in the
repository, and none gains `https:`, `*` or a scheme source. An instructor-
supplied endpoint is by definition not a literal in the repository, so a use
that calls it from a page that has the policy fails U8 unless the call is made
from a separate page and origin with its own written policy, as the compute
page is. A use that makes no call (the instructor copies a prompt out and
pastes drafts in) passes U8.

### U9. The cost is the instructor's

The module sends nothing to a service the project pays for or holds an account
with, and shows the instructor, before any call, the number of characters it
will send. Literal scan: 0 project-held endpoints; the character count is
shown in 3 of 3 uses.

### V. Viability of the number rule

The rule exists because a model's number is a claim the platform cannot
check. It is viable for a use only if it does not forbid what authors
actually write. Per use, over the reference corpus (S with its translation
allowance): at least 80% of the reference-good texts pass R-NUM.

### E. Evidence of need

At least one named instructor or author, in a recorded pilot (Prompts 115,
116 or 117) or a filed issue, reports an unmet need for the use. Counted from
the tree at the base SHA and the repository's issues and discussions on the
day of the gate. Fewer than 1 fails the use for A and B.

### Q. Quality (needs a real model and an external reviewer)

Q1. On 30 pinned inputs per use, an instructor-supplied endpoint's drafts are
rated "accept or minor edit" by a named external reviewer in at least 90%,
with 0 drafts stating a false scientific claim. Q2. Over 5 repeats of the 30,
the share of inputs whose accepted/refused outcome is stable is at least 90%.

Q1 and Q2 need a paid model endpoint and an external person. This session has
neither, and may not call a model provider. They are recorded as **not run**,
never as passed.

## Verdict rule, per use

- **A**: every U, V, E and Q criterion passes.
- **B**: every U, V and E criterion passes, and Q passes or is inapplicable
  because the slice makes no model call from Gravitas. The verdict names the
  slice; it authorises that slice only.
- **C**: anything else, including any use whose Q criteria are not run and
  whose slice calls a model.

## What the prototype is, and is not

A library and a Node harness against a loopback stand-in endpoint with scripted
replies. It calls no model provider, holds no key and sends nothing off the
machine. It measures the enforcement criteria (U1 to U9, V). It cannot measure
Q, and a stand-in's replies say nothing about a real model's. No panel is
built: the criteria that need one (accessibility of the panel, Spanish parity of
its words, focus order) are requirements for a build prompt, not results here.
