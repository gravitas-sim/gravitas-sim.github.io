# The adopter's guide and the newcomer docs test

Roadmap II, Prompt 114. An instructor who has never opened Gravitas needs to
know what to do in the first week and the first semester, what the software
will not do for them, and where to turn. That used to be answered in three
places that disagreed (the Teach page, the guide behind the passphrase and the
README), and the user manual predated every v2 surface.

## What there is

| Piece | Where | Written by |
|---|---|---|
| The adopter's guide, in English and Spanish | [`/teaching/adopt/`](teaching/adopt/) | `tools/build-adoption-pages.mjs`, with its counts read from `library/library.json` |
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
| The guide leads with one built-in course in fifteen minutes: Teach, use as is, the link, students hand in, review, archive; next term from the saved file (a plan, never timed with a class) | `e2e/minimalInstructorPath.spec.js` performs the walk in both languages and with the CPU throttled; INSTRUCTOR_FLOW.md, "The minimal path and the next term" |
| Six steps in the first week: choose, preview, build an activity, post the link, collect, review | INSTRUCTOR_FLOW.md and the adoption pages; `e2e/adopterGuide.spec.js` follows the guide's own links through the first five and the review page |
| A class code names the class, not the student; review matches on the typed name when one code covers several names | `js/submissionReview.js` (P81 R-1 repaired); INSTRUCTOR_FLOW.md, "The roster id" |
| No accounts, no analytics, nothing uploaded, work stays in the browser | the Teach page's own text (`teach.access.offline.text`) and STORAGE.md |
| Not an LTI tool; the platform holds a link and receives a PDF | INSTRUCTOR_FLOW.md ("there is no LTI claim") |
| A course can be exported as a file for a course platform, and no more is claimed: Gravitas exports a Thin Common Cartridge; imports verified on: Canvas, Moodle, D2L, Blackboard (Canvas: VERIFIED, reported 2026-10-22; Moodle: VERIFIED, reported 2026-10-22; D2L: VERIFIED, reported 2026-10-22; Blackboard: VERIFIED, reported 2026-10-22). Reported by Carl in chat on 2026-10-22; the LMS versions, the cartridge imported and what imported were not supplied. | COURSE_PACKS.md ("Common Cartridge"); `tests/commonCartridge.test.js` holds the sentence equal on Teach, in the guide and in the evidence record |
| A course prints as a plan (units, items, links, depths, time bands, textbook chapters, objectives, what students hand in) in English or Spanish, to print or to paste; the time bands are editorial estimates with no observed class data, and an outcome matrix is the instructor's own mapping, not evidence of attainment | `e2e/activityList.spec.js`; COURSE_PACKS.md, "The printable activity list, the time bands and the outcomes"; `tests/timeBands.test.js` |
| Times are estimates, none timed with a class; no classroom evaluation is published | the Teach page and SUPPORT.md; `tests/adopterGuide.test.js` fails if the sentence goes |
| Accessibility: keyboard, live region, text for every number, plots as tables, reduced motion, four themes; a canvas cannot be explored by touch | the Teach page's access section and ACCESSIBILITY.md |
| Guides and keys exist for the investigations that run in the simulation, keys per activity format, worksheets for activities | `instructors/materials.manifest.json` (`byKind`) |
| Response in a week or two, usually | SUPPORT.md |

The page makes no claim of learning gain, adopters or endorsement, and the
test holds it to that.

## The counts, once

The preprint says 22 investigations and the Library says <!--fact:libraryInvestigations-->86<!--/fact-->. Both are right about different things:

- 22 was the number of lessons at v1.0.0.
- The Library lists **<!--fact:libraryInvestigations-->86<!--/fact--> guided
  investigations**: **<!--fact:investigations-->69<!--/fact-->** that run in the
  simulation and **<!--fact:guidedInvestigations-->17<!--/fact-->** in the
  Observatory (10), the 3-D lab (4) and the mission lab (3). It also lists
  courses, classroom activities and data sets, which are other counts.
- Scenarios are the same kind of case. The Library lists **<!--fact:libraryScenarios-->67<!--/fact--> scenarios**: the <!--fact:scenarios-->59<!--/fact--> sandbox scenarios that the README and the citation metadata call configurable scenarios, and <!--fact:systems3dScenarios-->8<!--/fact--> reference systems of the 3-D lab.
- `tools/docs-facts.mjs` keeps `investigations` as the lessons that run in the
  simulation (the keys, the step counts and the manual's table are per lesson)
  and adds `libraryInvestigations`, `guidedInvestigations` and
  `libraryCourses`, so a document can quote either. The citation metadata
  (`CITATION.cff`, `.zenodo.json`), the paper's Summary, the README and the
  adopter's page all say the Library's number first and the split after it, from
  `tools/project-metadata.mjs` and these facts, so one count holds everywhere
  and each statement names what it counts.

A sentence for the paper, in the Library's terms: "Gravitas offers <!--fact:libraryInvestigations-->86<!--/fact--> guided investigations
(<!--fact:investigations-->69<!--/fact--> in the simulation, 17 in the
Observatory and the 3-D and mission labs)." `CITATION.cff`, `.zenodo.json` and
`paper.md` now say it (D-ADOPT-05 left the rewording to Carl; D-R8-01 records
it).

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

## What your IT office will ask

The documents an institution asks for are in the repository, and each says what it is and is not.

| They ask | The answer | Where |
|---|---|---|
| What does it store, and where does student data go? | It stores a student's work in their own browser and sends nothing anywhere. There are no accounts, no analytics and no server of ours. Two optional features, a live archive lookup and the compute page, contact other sites only when a reader presses the control that says so. | [DATA_PROTECTION.md](DATA_PROTECTION.md) (Spanish: [DATA_PROTECTION.es.md](DATA_PROTECTION.es.md)) |
| Is it accessible? Do you have a VPAT or an ACR? | A scoped conformance report in the ACR form, with a status per WCAG 2.1 and 2.2 A and AA criterion. It is our own evaluation, not an external audit; no assistive-technology user has validated it; and it claims no conformance. | [ACCESSIBILITY_CONFORMANCE.md](ACCESSIBILITY_CONFORMANCE.md) |
| How is it secured, and how do we report a problem? | A static site with no server to attack; the instructor materials are encrypted files. Reports go to the maintainer. | [SECURITY.md](SECURITY.md) |
| Does it work offline or on a campus network that blocks things? | Pages work offline once opened, and the site needs only its own address, except the two optional features above. | [OFFLINE_AND_LOW_END.md](OFFLINE_AND_LOW_END.md) |
| Can a student hand work in without an account? | Yes: a report (PDF or an accessible web page), a submission token or a progress file, which the course's own system collects. | [INSTRUCTOR_FLOW.md](INSTRUCTOR_FLOW.md) |
| Is there a contract, an SLA or a support line? | No. It is a one-maintainer academic project under an open license; support is described in SUPPORT.md. | [SUPPORT.md](SUPPORT.md) |

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
  English only" (D-ADOPT-01). Prompt 170 added generated Spanish structured
  notes for every investigation (INSTRUCTOR_MATERIALS.md); they are not that
  prose, and the guide's languages row says what is and is not in Spanish.
