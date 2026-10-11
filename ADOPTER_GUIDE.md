# The adopter's guide and the newcomer docs test

Roadmap II, Prompt 114. An instructor who has never opened Gravitas needs to
know what to do in the first week and the first semester, what the software
will not do for them, and where to turn. That used to be answered in three
places that disagreed (the Teach page, the guide behind the passphrase and the
README), and the user manual predated every v2 surface.

## What there is

| Piece | Where | Written by |
|---|---|---|
| The adopter's guide, in English and Spanish | [`/teaching/guide/`](teaching/guide/) | `tools/build-adoption-pages.mjs`, with its counts read from `library/library.json` |
| The user manual, with the shell, the Library, My work, Courses, the 3-D lab, the mission lab, the Sky Lab and the instructor path | `Gravitas_User_Manual.pdf`, from `manual/` | by hand, with the counts as macros from `tools/docs-facts.mjs` |
| The link and path check | `e2e/adopterGuide.spec.js`, `tests/adopterGuide.test.js` | by hand |
| The newcomer test protocol (below) | this file | by hand |
| The listing kit | outside the repository, with the roadmaps | by hand, for Carl |

The guide is reached from Teach (under the quick start), from the public block
of the instructor resources, from the README and from SUPPORT.md. It has no
menu entry: a menu entry restamps every page and `index.html` has no room
(D-ADOPT-01, D-ADOPT-02).

## What the guide says, and what each claim rests on

| Claim | Rests on |
|---|---|
| Six steps in the first week: choose, preview, build an activity, post the link, collect, review | INSTRUCTOR_FLOW.md and the adoption pages; `e2e/adopterGuide.spec.js` follows the guide's own links through the first five and the review page |
| A class code names the class, not the student; review matches on the typed name when one code covers several names | `js/submissionReview.js` (P81 R-1 repaired); INSTRUCTOR_FLOW.md, "The roster id" |
| No accounts, no analytics, nothing uploaded, work stays in the browser | the Teach page's own text (`teach.access.offline.text`) and STORAGE.md |
| Not an LTI tool; the platform holds a link and receives a PDF | INSTRUCTOR_FLOW.md ("there is no LTI claim") |
| Times are estimates, none timed with a class; no classroom evaluation is published | the Teach page and SUPPORT.md; `tests/adopterGuide.test.js` fails if the sentence goes |
| Accessibility: keyboard, live region, text for every number, plots as tables, reduced motion, four themes; a canvas cannot be explored by touch | the Teach page's access section and ACCESSIBILITY.md |
| Guides and keys exist for the investigations that run in the simulation, keys per activity format, worksheets for activities | `instructors/materials.manifest.json` (`byKind`) |
| Response in a week or two, usually | SUPPORT.md |

The page makes no claim of learning gain, adopters or endorsement, and the
test holds it to that.

## The counts, once

The preprint says 22 investigations and the Library says 72. Both are right
about different things:

- 22 was the number of lessons at v1.0.0.
- The Library lists **72 investigations**: **55** lessons that run in the
  simulation and **17** guided investigations (10 in the Observatory, 4 in the
  3-D lab, 3 in the mission lab), plus 59 scenarios, 4 ready-made courses and 6
  cuts of 3 classroom activities.
- `tools/docs-facts.mjs` keeps `investigations` as the 55 lessons (the keys and
  the manual's table are per lesson) and adds `libraryInvestigations`,
  `guidedInvestigations` and `libraryCourses`, so a document can quote either.

A sentence for the paper, in the Library's terms: "Gravitas offers 72 guided
investigations (55 in the simulation, 17 in the Observatory and the 3-D and
mission labs) and 59 scenarios." `CITATION.cff`, `.zenodo.json` and `paper.md`
still say 55 investigations, which is the lesson count; whether to reword them
is Carl's (D-ADOPT-05).

## The newcomer docs test: protocol, and why it has not run

**Status: not run.** It needs one named person who has never used Gravitas, and
there is none; D-PLAN-02 skips any part of a prompt that needs an outside
person. No stumble has been observed, none is recorded here, and the guide is
not claimed to have been tested on a newcomer.

What did run (`e2e/adopterGuide.spec.js`) is narrower and says so: every link on
the page resolves on this site to a page with a heading; every in-page link
lands; the guide's own links lead from the index to an adoption page, the
preview link, the activity builder, the kit and the review page; the counts are
the Library's; the page speaks Spanish; nothing scrolls sideways at 375 px; and
axe finds nothing in either language at 375 and 1024 px. That finds link rot
and a path that no longer exists. It cannot find a sentence that misleads a
person, which is what the test below is for.

### The protocol

1. **Who.** One named person with no prior use of Gravitas who would teach or
   help teach an introductory astronomy or physics course: an instructor, a
   teaching assistant or a lab coordinator. Their own machine and browser. They
   consent to being observed and to notes being kept without their name.
   Research use of the notes, as opposed to fixing the guide, needs institutional
   review first.
2. **Materials.** The address of the guide and nothing else. No help from the
   observer except "keep thinking aloud", and a stuck person is told only
   "that is a stumble; what would you try next?"
3. **Tasks, in the guide's order.** Each is done from the guide alone:
   - T1. Say what Gravitas is and whether it suits a course you teach (the
     opening section).
   - T2. Choose one investigation for next week and say why.
   - T3. See it as a student would, without touching your own saved progress.
   - T4. Make an activity of about twenty minutes and get one link.
   - T5. Produce what you would give students: the handout or the code to scan.
   - T6. Say what a student hands in and how you would collect it.
   - T7. Open the review page and say what it would tell you about a class.
   - T8. Say what happens to student data, and where you would report a problem.
4. **Record**, per task: done without help (yes or no), time in minutes, the
   words the person used for the thing they were looking for, and each stumble
   with the sentence or control it happened at.
5. **Classify every stumble** as one of:
   - *documentation*: the guide is missing, wrong or unclear: fixed in the
     guide's generator in the same change;
   - *terminology*: the person's word is not the product's, or the product uses
     two words for one thing: fixed in the words, and checked against
     PLATFORM_MODEL.md;
   - *workflow*: the steps are in an order or a place a newcomer does not expect:
     a bounded fix PR;
   - *defect*: something does not work: an issue and a bounded fix PR.
6. **Report** the table of stumbles by class and task, the tasks done without
   help, and what was changed. A task done without help by one person is one
   observation, not a measure of the guide.

## The listing kit

The kit for Carl is outside the repository, beside the roadmaps, because it
holds text for accounts and forms that only he can submit (D-ADOPT-06). It has
the descriptions at several lengths, the metadata each of the AAS education
resource database, PhysPort and OER Commons asks for (and the questions that
only Carl can answer), the license statements, screenshots made from the shell
at a desktop and a phone width, the repository description and topics from
OWNER_ACTIONS.md, and the reconciled count statement above. Nothing in it is
submitted anywhere, and it claims no review, adopter or endorsement.

## Staged

- The newcomer test itself, and any fixes it finds.
- A Spanish user manual (D-ADOPT-03).
- A "Find content" or "Adopter's guide" entry in the shell menu (M-1 in the P81
  checkpoint).
- Instructor-note prose in Spanish, which the adoption pages still mark "In
  English only" (D-ADOPT-01).
