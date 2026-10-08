# Onboarding, guidance and what next

Roadmap II, Prompt 73. A designed path in for a first-time student, and a
designed path on for a finished one. Nothing here sends anything anywhere.

## Flow map

```text
first visit
  splash -> Home (storage/update notice first, if any)
              |- introduction, 3 screens inside Home:
              |    what this is -> three ways in -> where work is saved
              |    Next / Back / Skip / arrow keys; each screen is announced
              |    ends (finish, skip, Escape, close) -> gravitas_orientation_seen_v1
              |- Home proper (Enter the sandbox | Start an investigation | tour)
         -> scenario card (once Home closes)
         -> touch tips (first touch on a clear screen)          [order: Prompt 52]

in an investigation
  where line   "Step 4 of 23 · Quantitative · 12 min of 35-45 min"
               time is the lesson open and in view, kept in the saved progress
               (`spent`, seconds; additive, absent when zero)
  Help         keys, one button per docked instrument's explainer,
               "Make the problem note": investigation, step, link to the step,
               app build, platform API, browser, screen. Shown, never sent.
  wrong answer a named trap (`misconceptions` with `option`) in both locales

finish
  report actions (PDF, progress file, token)            [unchanged]
  What next:  deeper depth, if the investigation has one
              next entry of the Library sequence the student came from
              next item of the course they came from, and the course page
              My work, the Library

course
  course home  "n of m investigations finished", Continue, a status on each
  My work      unit counts (Prompt 69), as before
```

## Where the student came from

`gravitas_next_context` (localStorage, not exported, not student work) holds one
record, left when a link is followed and believed only when the investigation
just finished is in it:

- `{k: 'seq', id}` from the Library's sequence groups and the lesson browser's
  sequences. The next entry is read from `library/library.json`, so a guide in
  a sequence is offered as readily as an investigation.
- `{k: 'course', home, t, i, items: [[lesson, depth, title], ...]}` from the
  course home. A next item that is not an investigation links to the course page.

## Misconception notes

The mechanism is Prompt 71's (`misconceptions: [{id, option, say}]`, shown after
a wrong choice, never the key; `author:check` refuses a leak). Authored now,
in English and Spanish, where an instructor guide names a wrong turn on a
choice: Twelve Nights (the Sun moves), Binary Star Planets (the finer step is
always right), Can You Detect This Planet? (a planet, not "not constant").
The other guides' wrong turns are the inventory for Prompt 97.

## Budget accounting (no ceiling moved)

The deferred total was 4179.7 of 4180 KB and the lesson routes in the sources
had under 1 KB. What this prompt needed was found, not asked for:

| Change | Deferred | Lesson route, sources |
|---|---:|---:|
| Introduction, where line, `spent`, Help, What next (code) | +4.6 KB | +2.9 KB |
| `tools/prose-whitespace.mjs`: the build folds the line wrapping of lesson prose (no source changes, so no fingerprint moves; `tests/proseWhitespace.test.js` holds `prose()` equal on every literal) | -106 KB | none (sources unchanged) |
| Long explanatory comments in `js/investigations.js` cut to their summary | none | -6.2 KB |

Result: deferred 4080.0 of 4180 KB, initial 791.1 of 830, every route inside its
ceiling. The words of the new surfaces are in markup (`gs-en`/`gs-es`, free) and
in `data-en`/`data-es` templates, not in the catalogs.
