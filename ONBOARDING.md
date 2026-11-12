# Onboarding, guidance and what next

Roadmap II, Prompt 73. A designed path in for a first-time student, and a
designed path on for a finished one. Nothing here sends anything anywhere.

## Flow map

```text
first visit
  splash -> Home (storage/update notice first, if any)
              |- introduction, 3 screens inside Home:
              |    what this is -> five places -> where work is saved
              |    Next / Back / Skip / arrow keys; each screen is announced
              |    ends (finish, skip, Escape, close, a destination followed)
              |      -> gravitas_orientation_seen_v1
              |- Home proper (where to start | the five places | tour)
         -> scenario card (once Home closes)
         -> touch tips (first touch on a clear screen)          [order: Prompt 52]

first week (a collection marked "first week", opened by its link)   [Prompt 277]
  /course/#c3z...  -> the course home keeps the list (gravitas_first_week)
                   -> /#home: splash -> Home in its first-week mode
              |- the list, in order, the place to continue marked
              |- the introduction inside the first item (first visit: shown
              |    there; afterwards: on request)
              |- the five destinations' names, once (the bar, or below the
              |    list where the bar folds them behind Menu)
              |- "Leave the first week" (one press) -> Home proper
         an item followed -> Home closes; the item opens
         a plain visit    -> Home again, the place to continue moved on
         every item done  -> Home proper, with one line saying so

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

## The introduction, for the five destinations (Prompt 277)

Three screens still, in the same place in the first run (the splash, Home, the
scenario card, the touch tips; the welcome gate and the splash lifecycle are
unchanged). The second screen is now the five destinations: each one's name,
its one line and its one action, written into `js/fragments/home.html` by
`node tools/navigation.mjs write` from `tools/navigation-inventory.json`, so
the introduction, Home's five places and NAVIGATION.md cannot say different
things. Skip is on the first two screens as before; a destination followed
from the second screen ends the introduction as leaving Home does. Each screen
is announced through the live region (its number and its heading).

## The first-week mode (Prompt 277)

A mode of Home for the first week of a course: one list and nothing else.

**How a student gets there.** An instructor makes a collection in the
distribution kit (`/teaching/kit/#collections`), ticks "First week" and hands
out the link. The collection is a course package with `profile: "collection"`
and `firstWeek: true` (COURSE_PACKS.md); its link is the ordinary course home
link. The course home reads and checks the package as it always does, resolves
it into the one record Home needs (`js/library/firstWeek.js`: each item's
title in the languages it has, its address from the site's root, and for an
investigation its id, depth and step count), keeps it under
`gravitas_first_week` and goes to `/#home`. Where the browser cannot keep the
record, in a preview as a student, or when the collection was opened from a
file, the course home shows the collection as usual, with a button that does
the same on request.

**What Home shows.** The collection's title; its items in order (up to seven:
the format's limit, and the committed ceiling `home.firstWeekItems`), the
first one not done marked as the place to start or continue; the introduction
inside the first item; the five destinations' names, once (in the shell's bar,
or under the list at 1200 px and narrower, where the bar folds them behind
Menu); and one control that leaves the mode. Home's lede, its recommended
starts, its five places with their lines and its foot are not shown. Seven
items fit one screen with no scroll at 1280 by 800 and at 390 by 844 with the
Library's own titles in both languages (`e2e/firstWeek.spec.js`); a longer
title can still wrap past that.

**Done, and continue.** An investigation is done when every step was seen (its
own progress record, read and never written here); a scenario, a dataset or a
3-D or mission investigation is done once it was opened from the list, and is
labeled "Opened", not "Finished". Following an item also leaves the
finish panel its way on (`gravitas_next_context`, as the course home does), so
"What next" offers the next item and the way back to the list.

**How long it lasts.** While the record is kept, a plain visit to `/` opens
Home (js/welcomeGate.js), whether or not Home was seen before; a link to an
investigation, a world or anything else opens what it names, as always. The
mode ends when every item is done (Home says so once, and the record is
dropped) or when the student presses "Leave the first week" (one press; Home
is all of itself again, and the instructor's link opens the list anew). A
record Home cannot show (another version, an address that is not on this
site) is dropped without a word and Home opens as itself.

**What the collection says of the panels.** `more: "open"` or `"shut"` on a
first-week collection (the activity's field of Prompt 167, on a collection)
sets how the More sections of the investigation and instrument panels start
for a student in the mode. The order is what it was: the student's own last
choice, then an activity's, then the first-week collection's, then the
depth's default. It does not reach Settings or a plot.

**Not built, said plainly.** A disclosure state for a collection that is not a
first week (a lesson link has no room for it and the next-step record goes
stale); a first-week mode set by an activity (an activity is one item, and a
collection cannot hold one); anything that needs the prerequisites, hint
ladder or attempts record of Prompt 276's second part.

### Screen inventory

| Screen | Where | What is on it |
|---|---|---|
| First week, the list | Home, `/#home` or a plain visit while the record is kept | Wordmark; "Your first week" and the collection's title; up to seven items in order, the next one as the primary button ("Start:" or "Continue:"), done ones marked "Finished" or "Opened"; "Show the introduction" in the first item; the five names under the list at 1200 px and narrower; "Leave the first week: show all of Home"; the close button |
| First week, the introduction | Inside the first item, on a first visit or on request | "Introduction, screen n of 3", the screen, Skip (screens 1 and 2), Back, Next or "Start exploring"; the other items stay below it |
| Introduction 1 | Home on a first visit (or inside a first week's first item) | What Gravitas is |
| Introduction 2 | the same | Five places: each destination's name, one line and one action |
| Introduction 3 | the same | Where your work is saved |
| Home after leaving | Home | One line ("You left the first week ...") above Home as it always is |
| Home after the list is done | Home | One line naming the finished list, above Home as it always is |
| Course home, a first week from a file | `/course/` | The collection as usual, with "Open as a first week on Home" |
| The kit's collection editor | `/teaching/kit/#collections` | One paragraph on the first week; a "First week" group: the tick, and how the panels' More sections start |

Spanish for every string above was written by the project and has not been
read by a fluent Spanish reader.

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

<!-- Listed in DOCUMENTS.md. -->
