# The surface-retirement and consolidation gate

Roadmap III Prompt 165. The roadmap says surfaces whose existence is no longer justified should leave the site, and that "redirect for one release" is not a support policy. This document commits, before any surface is judged, the function that judges them, the five outcomes it can return, and the policy that protects the links and records people hold. The judgment of each surface is further down; nothing on the site changes in this prompt. Prompt 166 carries out the verdicts that Carl approves, one pull request each.

The decision function, its thresholds and the support periods are decision-register row D-R10-44. They are code in `tools/surface-gate.mjs` and are held to the evidence by `tests/surfaceGate.test.js`.

## What is committed first

The text of this section and the code of `tools/surface-gate.mjs` were committed before the evidence file `tools/surface-gate.json` existed (see the branch history). A threshold that a surface then failed was not moved to rescue it. If a threshold is wrong, the register row is the place to say so and the next gate uses the new one.

### The question asked of every surface

The same six questions, in the same order, for a page, a section of a page, a facet, an activity format and a stored format alike:

1. **Place in the navigation model.** Is it a destination's own first-action page; is it a menu entry that is not a destination; is it a section of a destination; is it a duplicate of one; is it none of these (documentation or a diagnostic)? The model is `NAVIGATION.md` and `tools/navigation-inventory.json`.
2. **Unique task.** Does it support a task that nothing else on the site supports? Answered `yes`, `partly` (another surface does most of it and the record says what is missing) or `no`, with the replacement named. An answer that cannot be given is `UNKNOWN` and the surface is kept.
3. **Evidence of use.** Links from shipped investigations, courses, activities and Library entries (counted, excluding the navigation's own places blocks, the footer and the sitemap, which exist for every surface); Library entries students open; and the referrer data Carl can read, which is recorded as UNKNOWN for every surface: Gravitas has no analytics by design (a static site; nothing leaves the browser), so no one on the project can say how often a page is opened. The absence of an UNKNOWN is never evidence of use, and an UNKNOWN is never evidence of disuse: only the two counted kinds decide, and the support periods below give the deprecated phase a purpose, which is to find out.
4. **Maintenance cost.** Six signals, each a number reached or not: source lines only the surface loads; test files that name it; generated artifacts that exist for it alone; catalog keys per language that only it uses; gzip kilobytes of its own files in the service worker's precache tiers; rows of the accessibility spec that open it. Cost is **material** when at least two reach their threshold (table below).
5. **Saved-state and link exposure.** Whether a student's or an instructor's record, a downloaded file or a shared link can point at it: stored formats and the links that carry state are listed by name.
6. **What the archive keeps regardless.** Everything. A retired capability leaves the site, not the history: the code stays in git (the `v2.0.0` tag and every later commit) and in the Zenodo deposit, and the release notes say what went where.

### The five outcomes, kept apart

The roadmap's review was right that these are three costs and not one:

- **GROUP**: the capability and its route stay; its *menu entry* moves under a destination. Cheap, reversible, no link breaks. (Prompt 162 already did this for the whole menu, so today GROUP matches no surface and a test proves it.)
- **CONSOLIDATE**: the *route* merges into a destination's page or a tool's tab; the old route redirects under the support policy. It changes what a bookmark does, so it needs a measured gain, not a tidier tree.
- **RETIRE**: the *capability* leaves the site. Code stays in history; the release notes say so; the old route becomes a page that says where the capability went.
- **FREEZE**: no new work; a notice says so; the surface stays and is judged again at the next checkpoint. This is the roadmap's B slice (a notice and a register note; the surface stays).
- **KEEP**: nothing changes. This is the roadmap's C consequence for a surface the gate cannot move (166 skips it) and the default for anything unproven.

### The decision function

Rules are tried in order; the first match wins; the rule id travels with the verdict.

| Rule | When | Verdict |
| --- | --- | --- |
| R0 | the unique-task test cannot be answered | KEEP |
| R1 | the surface is a destination's own first-action page | KEEP |
| R2 | the surface has a global-menu entry and is not a destination | GROUP |
| R3 | unique = yes | FREEZE (R3a) only if unused, nothing holds it or links to it, and cost is material; otherwise KEEP (R3b) |
| R4 | unique = no or partly, and no replacement is named | KEEP |
| R5 | unique = no, a replacement is named, nothing shipped uses it | **RETIRE** |
| R6 | unique = partly, a replacement is named, nothing shipped uses it | FREEZE (R6a) if cost is material; otherwise KEEP (R6b) |
| R7 | used, replaceable, and the merge into the named target is justified | **CONSOLIDATE** |
| R8 | used, replaceable, no justified merge | FREEZE (R8a) if cost is material; otherwise KEEP (R8b) |

A surface in use is never retired by the function. Retiring a used surface is a decision for Carl with a register row of its own, not an output of this table.

**Thresholds** (committed with the function; `THRESHOLDS` in the tool).

| Signal of cost | Reached at |
| --- | ---: |
| source lines only this surface loads | 1,500 |
| test files that name it | 3 |
| generated artifacts that exist for it alone | 2 |
| catalog keys per language that only it uses | 150 |
| gzip KB of its own files in the precache tiers | 20 |
| accessibility-spec rows that open it | 4 |

Material = at least two of the six. A merge is **justified** when it names a target, removes at least one route from the stamped set, does not raise any route's request ceiling, and measures at least one gain: 5 KB of gzip off the precache or a route, one choice fewer on a destination's default view, or one pair of duplicated modules named and removed.

**Why these numbers.** They are round figures about one order below the largest surface in the tree and above a typical document page; they are not fitted to a result. The two that matter most are the pairing (one signal is not material) and the merge rule's insistence on a measured gain, because the roadmap keeps lazy tool boundaries and stable URLs unless a measurement justifies moving them.

## The link-support policy

Adopted for the whole of Roadmap III (register row D-R10-44). It replaces "redirect for one release".

A route, a capability or a stored record is **deprecated**, then **read-only**, then **retired**:

| Phase | What works | Class L (a route or capability that holds nothing) | Class R (a saved record, a file a person can hold, a link that carries state) |
| --- | --- | --- | --- |
| Deprecated | everything, with a notice that names the replacement and the date the next phase starts | at least 6 months and 2 minor releases | at least 12 months and 2 minor releases |
| Read-only | the page or record opens and can be read, exported and printed; nothing new is written; a write is refused with an export path | at least 6 months and 1 minor release | at least 12 months and 1 minor release |
| Retired | a page at the old address, with no script, that names where the capability went and how to export what it held; the reader of a stored format is refused in words with an export path | indefinitely (a static page costs nothing) | indefinitely |

- **Counting.** A phase ends when both its months and its minor releases have passed. It is counted from the release that first carries the notice, never from a merge into `v3` or any train that is not deployed, because nobody has read the notice until the site has published it.
- **Class R is the support period of `FORMATS.md`** (decision D-R10-04: 12 months deprecated, 12 read-only, retirement announced in `CHANGELOG.md` one release ahead). The policy here is the same rule applied to routes and capabilities, and class L is shorter only because nothing a student made is lost when a route changes.
- **Announcement.** A retirement is named in `CHANGELOG.md` one release before it takes effect, and in the release notes of the release that carries it.
- **Records and shared links** are covered by the compatibility corpus of Prompt 134: before a writer stops writing a record, the corpus has a row that proves the reader still reads it, and a retirement that would make a 2.0.0 reader refuse or misread is a major-version boundary on the 3.0 train (Prompt 176).
- **Shortening a period** needs a register row that names the surface and the reason (a rights, safety or correctness defect). It never removes the retired page or the export path.
- **A retired surface's reader** is kept for the whole of its deprecated and read-only phases, and a stored format that nothing writes any longer keeps its reader until its class R periods have run.
- **What this does not promise.** It does not promise that a third party's page that links to Gravitas will be updated, and it does not promise any support period before the first release that carries a notice: today nothing is deprecated.

### What a verdict commits the site to

| Verdict | Prompt 166 does | Notice and periods |
| --- | --- | --- |
| KEEP | nothing; 166 skips the surface | none |
| FREEZE | adds a notice in both languages and a register note; no new content or capability | the notice carries no date; the surface is judged again at the next checkpoint (171, then 287) |
| GROUP | moves the menu entry under the destination's places block | none; no link changes |
| CONSOLIDATE | merges the route into the named target, in its own pull request, `visible` | the old route is class L or R as the evidence says and redirects for its periods |
| RETIRE | removes the capability from the site after the deprecated and read-only phases; the pull request that starts the phases only adds the notice | class L or R as the evidence says |

## The judgments

Written after the evidence was gathered; see the sections below.
