# Instructor-side AI assistance gate

**Status: decided under delegation, not reviewed.** Carl asked for each gate to be
decided on its recommendation. This verdict is evidence, not a signed decision;
the register rows are DELEGATED, "pending Carl's ratification", until he reviews
them.

**Verdict: C for all three uses.** Gravitas gains no AI assistance: no drafted
hint, no drafted Spanish, no suggested distractor, and no code that calls a
model. The null option is adopted: the composer's translation status (missing,
stale, done), the authoring rules and the evidence the pilots produce stay the
way an instructor gets help. Nothing student-facing was ever in scope.

**Base:** `v2` at `22b5aa15`. **Thresholds:**
[`spike/ai/THRESHOLDS.md`][thr], committed at `8945cb60` before any prototype
existed. **Prototype and evidence:** branch `spike/ai`, in [`spike/ai/`][spike]
(result commit `16244a06`); it is disposable and will not merge. This PR is the
decision record and the register rows only.

[thr]: https://github.com/gravitas-sim/gravitas-sim.github.io/blob/8945cb60/spike/ai/THRESHOLDS.md
[spike]: https://github.com/gravitas-sim/gravitas-sim.github.io/tree/16244a06a7ef74e91c4778e20ca7dfce0593c0fa/spike/ai

## Why C, in one paragraph

The guard rails can be built. A prototype library enforced every rule the
thresholds set that code can enforce: nothing but the instructor's own text is
sent, a draft is a draft until accepted and changes exactly one text, silence on
every failure, off by default, 2.8 KB gzipped, kept out of the precache by one
pattern. What fails is everything around the code. A hint or a distractor cannot
be drafted under the number rule without refusing most of what authors write
(62% of the built-in hint texts and 24% of the built-in distractors state a
number). The pack format refuses a record of where a draft came from. A call
from the composer page is blocked by the page's own Content-Security-Policy, and
opening the page to an instructor's endpoint would end the policy's meaning.
Nobody has asked for any of this: no pilot evidence exists, no issue is open. And the
one thing that decides whether a model's draft is any good, a named reviewer
rating real drafts from a real model, could not be run here. No threshold was
moved.

## The thresholds, and what was measured

Criterion numbers are those of `THRESHOLDS.md`. "Not run" is never "passed".

| Criterion | Threshold | Measured | Result |
|---|---|---|---|
| U1. No student data leaves | 0 requests with a byte of a saved-state fixture, 0 keys outside the allow-list | 9,278 requests built from the corpus and 233 bodies that reached the stand-in: 0 and 0 | pass |
| U2. No student surface depends on it | 0 other pages reach the module; student pages' policy unchanged | 1 of 117 pages reaches the one file that would load it (`studio/lesson/`); `tools/csp.mjs --check` passes | pass |
| U3. No vendor, no key | 0 hostnames, keys, vendor names; a second body shape works through at most 2 adapters | 0, 0, 0; chat and plain shapes both work; 2 adapters | pass |
| U4. A draft is a draft, checked, diffable | 20 of 20 scripted drafts per use classified right; reject leaves the pack byte-identical; accept changes one text | 20, 20, 20 of 20 (first run 59 of 60: see below); 0 of 60 scripted calls changed the pack; accept changed exactly one text in 1,857 of 1,857 checks (the pack gains only its record) | pass |
| U5. Reproducible and attributed | the same prompt twice; all five provenance fields recorded in the pack | prompts identical in 1,326 of 1,326; 29 of 29 accepted drafts carry the five fields; the pack validator refuses the record as a top-level field (`unknownField`) and inside a text (`textLocale`) | **fail** |
| U6. Off by default, absent from the precache, free to students | flag off in fresh storage; one exclusion pattern keeps it out; at most 6.0 KB gzip; no route differs | off with no storage, no store and a throwing store; one pattern returns the manifest to its base version (`24c516789faf`), 3 service-worker suites (28 tests) pass; 2.8 KB minified gzip (4.7 KB as source); a one-line lazy import left every route's figure unchanged at the tool's 0.1 KB (a commented two-line import moved the composer route from 491.1 to 491.2 KB, over its 491.1 ceiling) | pass |
| U7. Silent degradation | 24 of 24 (8 failures, 3 uses) leave the pack byte-identical, throw nothing, return what disabled returns | 24 of 24 | pass |
| U8. The policy keeps its meaning | no page gains an origin the repository does not name | the composer page's `connect-src` is `'self' blob:`; in Chromium a call to an endpoint on another port failed and the endpoint received 0 requests. An in-page call fails; copying a prompt out and pasting drafts in makes no call | **fail** (in-page) |
| U9. The cost is the instructor's | 0 project-held endpoints; the character count shown in 3 of 3 uses | 0; 3 of 3 | pass |
| V. The number rule is viable | at least 80% of reference-good texts pass | hints 305 of 812 (37.6%); Spanish 7,052 of 7,476 (94.3%); distractors 756 of 990 (76.4%) | hints **fail**, Spanish pass, distractors **fail** |
| E. Evidence of need | at least 1 named instructor or author reports it | 0: no pilot document exists in the tree, 0 issues, discussions are off | **fail** |
| Q1, Q2. Quality, stability | 90% accept or minor edit on 30 inputs per use, 0 false claims; 90% stable | **not run**: needs a paid endpoint and an external reviewer | not run |

Verdict rules (from `THRESHOLDS.md`): A needs every criterion, B needs every U,
V and E, and Q unless the slice makes no model call; C is everything else.

| Use | Failing criteria | Verdict |
|---|---|---|
| H. Drafting hints, feedback and named mistakes | U5, U8, V, E; Q not run | **C** |
| S. Drafting Spanish with the staleness digest | U5, U8, E; Q not run | **C** |
| D. Suggesting distractors | U5, U8, V, E; Q not run | **C** |
| N. The null option | not a candidate; it is what remains | adopted |

## What was built, and what it cannot say

A library (`spike/ai/assist.js`) and a Node harness. The library is given a
`fetch` and an endpoint by its caller and holds neither a key, a vendor name nor
a default address. The harness gives it a loopback stand-in with scripted
replies, so nothing left the machine and no model provider was called. The
stand-in's replies say nothing about a real model. The reference corpus is the
composer's own material: each of the 55 built-in investigations as the pack a
remix makes of it, plus the example pack (812 hint, feedback and named-mistake
texts; 7,476 English and Spanish pairs; 990 distractors).

**One correction, in the open.** The first run classified 59 of 60 scripted
drafts correctly. The miss was a draft I had labeled clean that contained the
word "one", a number word the rule refuses by its definition. The draft, not the
rule or the threshold, was wrong; it was reworded and the run repeated. The
first run's results are kept as `results-process-run1.json`.

## Findings that matter beyond the verdict

- **The number rule is the right rule, and it is expensive.** A draft that
  states a number is a claim the platform cannot check against the model page.
  But authors write numbers into hints (337 of 812 state a digit, 170 more a
  number word) and into distractors, which are often values. A drafting tool
  held to the rule would refuse most of the hints an author would want.
  English "one" and Spanish "uno" count as number words by the rule as written.
- **Translation survives the rule.** 94.3% of the existing human Spanish repeats
  the English's numbers and no more. The 424 it would refuse (71 for digits, 353
  for number words) are mostly the words "dos" and "ciento" (as in "por
  ciento", percent), which the rule's list counts and a translation uses freely. Spanish is the one use whose rule is viable, and
  also the one the composer already supports by hand with a visible status.
- **The format has no place for a draft's provenance.** An accepted draft needs
  its prompt version, prompt digest, model string, parameters and time recorded.
  `gravitas.investigation-pack/1` refuses an unknown field at the top and inside a
  text. Recording them is a format change under the governance of Prompt 61: a
  version, a schema, a reader for the old one, SDK parity.
- **The security policy is the real obstacle to an endpoint.** Every page's
  `connect-src` is a closed list (`tools/csp.mjs`; only the Observatory names
  outside hosts). An instructor's endpoint is not in the repository by
  definition. The remedies are a separate page and origin, as the compute page
  has (a second site to host and defend), or `https:` on the composer page,
  which undoes what Prompt 67 built.
- **The precache is a walk of `js/`.** A new module is in the precache unless
  excluded. One pattern in `tools/build-service-worker.mjs` does it and returns
  the manifest to its base version; it is the only generated-file effect.
- **The enforcement is cheap.** 2.8 KB gzipped, a dynamic import from the
  composer page only, nothing on any student route. This is not why the verdict
  is C.

## The privacy model, if a later gate reopens this

- The request is built from an allow-list: the text, its path, the step's kind,
  the language, the digest of the English and instructor-written
  context texts. It is built from the instructor's pack and takes nothing else
  as an argument; a saved-state fixture holding a student's name, answers,
  hint log and notebook was present during every build and never appeared.
- It is off by default and per browser. The platform ships no key and no
  address; the instructor types the address and pays for the call.
- Before any call the instructor sees the number of characters it will send
  (the prototype reports it; a build would show it and wait for a press).
- A refused, failed or timed-out call returns nothing and changes nothing.
- A draft is stored apart from the pack and applied only on accept, which
  changes one text.

## Why no student-facing AI tutor

None was evaluated, and none will be proposed from this gate. Everything a
student reads is checked by the same authoring rules, graded against a number
that the model page computes, and reviewed by a named person before it ships.
A tutor's reply cannot be: it is generated at the moment of reading, for one
student, unreviewed, from a model whose output the platform cannot reproduce.
Sending a student's words to a vendor breaks the privacy rule at the top of this
roadmap (nothing leaves the browser without an explicit opt-in) and the static
hosting model; a wrong explanation of a physical law is the one error the
platform is built never to make. The deterministic ladder of hints, feedback
and named mistakes (`SCAFFOLDING.md`) is the student-side answer.

## What would change this

- **S to B, as a paste route:** a named instructor or author reports, in a pilot
  or an issue, that writing the Spanish is what stops them; and the format gains
  a field for a draft's provenance (a format version under Prompt 61). The slice
  would make no call: the composer would offer the prompt to copy and a box to
  paste a draft into, where the draft is checked, marked and accepted as here.
  That slice passes U8, V and the Q exemption; it needs E and U5.
- **Any use to B with a call:** a separate page and origin with its own written
  policy, and Q1 and Q2 run by a named reviewer on a real endpoint.
- **H and D to anything:** the number rule relaxed for a use, with a reason, by
  Carl before a re-run. Never after.

## Not done

- Q1 and Q2 (quality and stability on a real model), for want of a paid
  endpoint and an external reviewer; skipped as the task directs, never
  recorded as passed.
- No panel was built; its accessibility, Spanish parity and focus order would
  be acceptance criteria of a build prompt, not results here.
- The corpus is the built-in material. No instructor-authored pack was
  available to try.

## Reproducing

From the spike branch: `node spike/ai/run-gate.mjs` (in-process measurements),
`node spike/ai/run-tree.mjs` (which pages reach the module),
`node spike/ai/run-csp.mjs` (the policy in Chromium, private ports only). The
precache and route figures come from adding the module as `js/composer/assist.js`
with the one exclusion pattern and one `import()` line, then
`node tools/build-service-worker.mjs` and
`node tools/route-budget.mjs --report --config=sources`, and discarding that
change. The results are in `spike/ai/results-*.json`.
