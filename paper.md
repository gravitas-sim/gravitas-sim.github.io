---
title: 'Gravitas: a browser-based gravitational sandbox and guided-investigation suite for introductory astronomy'
tags:
  - astronomy education
  - physics education
  - N-body simulation
  - orbital mechanics
  - exoplanets
  - open educational resources
  - JavaScript
authors:
  - name: Carl Ziegler
    orcid: 0000-0002-0619-7639
    affiliation: 1
affiliations:
  - name: Department of Physics, Engineering and Astronomy, Stephen F. Austin State University, Nacogdoches, TX 75962, USA
    index: 1
date: <!-- OWNER: submission date, e.g. 15 September 2026 -->
bibliography: paper.bib
---

# Summary

Gravitas is a browser-based gravitational sandbox and a suite of guided
investigations for introductory and general-education astronomy. It ships 59
configurable scenarios drawn from real and idealized systems, and 24
investigations totalling 683 steps in which a student predicts an outcome,
changes one thing, measures the result, and revises the prediction against what
they measured. It runs entirely client-side as a static site, requires no
account and no installation, works offline after a first visit, and encodes any
simulation state into a shareable URL.

The distinguishing commitment is that the software says what it is doing. A
public validation page reports 286 checks of the physics engine against
analytic results, published values and independent integrations, each with its
measured error and each labelled by the kind of evidence it rests on; a public
model page states what the simulation represents and, at equal length, what it
does not. Every instrument in the interface distinguishes a measurement from a
model from an illustration, and the investigations ask students to make that
distinction themselves.

# Statement of need

Interactive simulation is well established in physics instruction, and the
evidence that carefully designed simulations support conceptual learning is
substantial [@Wieman:2008; @Perkins:2006]. Astronomy has been less well served
than mechanics or electromagnetism. The systems are large, slow and unreachable;
the quantities that matter — a semi-major axis, a radial-velocity
semi-amplitude, a transit depth — are inferred rather than seen; and the
reasoning that connects an observation to a claim about a distant object is
precisely the part a static figure cannot show.

Existing astronomy simulations tend to fall into one of two groups. Research
codes such as REBOUND [@Rein:2012] are accurate and general, and assume a user
who can already write Python and already knows what to integrate. Classroom
applets are approachable and typically closed: a black box that produces the
right picture, with no account of the model behind it, no way to check it, and
often no way to get a student's work out of it.

Gravitas is built for the gap between those. It asks no installation and no
programming, and it is not a black box: the model is documented, the physics is
validated in public with measured errors, and the boundary between what is
computed and what is drawn is stated on screen rather than left for a student to
guess. That last property is the pedagogical point as much as the engineering
one. A student who cannot tell a simulation's illustration from its measurement
has not been taught to evaluate a model, and evaluating models is a large part of
what astronomy is.

The second need is adoption cost. An instructor considering a new tool is
weighing it against the preparation time it will take. Gravitas is designed so
that the answer is close to zero: open a URL, and the investigation carries its
own objectives, its own instructor guide, its own answer key, and a reproducible
link to the exact state being discussed.

# Intended learners and course settings

The investigations are written for students in introductory astronomy and
general-education science courses, including those with no calculus and no
programming. They assume arithmetic, reading a graph, and willingness to write a
sentence explaining a result. Six of the 22 are marked for a more advanced
audience and suit an astrophysics majors' course or an upper-division lab.

The intended settings are a lecture demonstration (single scenarios, opened from
a link), a lab or recitation session (one investigation, 20–90 minutes each), and
independent work (a student opens an investigation and submits the report it
generates). The material is published in English and Spanish, and every
user-facing string exists in both.

# Instructional design: predict, test, measure, revise, explain

Every investigation follows the same five-part cycle, and the ordering is
enforced by the software rather than left to the author's discipline.

**Predict.** The student commits to an answer before seeing any evidence. The
commitment is held: the interface does not reveal whether it was right, and
cannot, because the verdict is produced by a later step that names this one.

**Test.** The student changes one thing. Scenario states are seeded and
reproducible, so a comparison is a controlled comparison and an A/B bench exists
to make that explicit — capture a world, change one parameter, restore, compare.

**Measure.** The student reads a number off an instrument rather than being told
it. Measurements are captured to a notebook that records, for each reading, the
model it came from and the stage at which it was taken.

**Revise.** The prediction is settled by the experiment. The student is shown
their own earlier answer against what they measured and is asked, explicitly,
whether it still stands.

**Explain.** Each investigation ends on a synthesis step that asks for an account
in the student's own words, marked against a rubric that credits connections
rather than coverage.

An automated authoring checker enforces the structural half of this: that a
prediction names the step that settles it, that a graded question has a
tolerance that actually rejects something, that a worked explanation is preceded
by staged hints, that a numeric question declares its unit, and that a lesson
ends on a closing summary rather than mid-question. The release gate fails on
any of these.

# Functionality and the instructor adoption path

The sandbox integrates gravitational N-body motion with a choice of three
schemes — symplectic Euler by default, velocity Verlet, and fourth-order
Runge–Kutta — and supports point masses, stars, planets, small bodies, black
holes and compact-object binaries. The default is first-order and symplectic
rather than higher-order and not: every scenario is tuned against it, and the
validation suite measures each scheme's convergence order and shows that the
two symplectic schemes hold their energy error bounded over sixty orbits while
Runge–Kutta accumulates.
Instruments include an object inspector, an energy and angular-momentum
conservation readout, a reference-frame selector, a tidal-field visualizer, a
rotation-curve fitter, a radial-velocity and transit workspace, a
gravitational-wave laboratory and a stellar-evolution panel.

An instructor's path through it is deliberately short:

1. Open <https://gravitas-sim.online/teaching/>, which describes the
   instructional cycle and offers six demonstrations as embedded, reproducible
   figures.
2. Pick an investigation from the browser; each card carries its duration, level,
   step count and objectives.
3. Retrieve the instructor guide, learning objectives and answer key from the
   instructor area. The bundle is encrypted and published with the site, because
   the site is static and there is no server to gate it; the passphrase is
   obtained from the author.
4. Share a link. Any state — a scenario, a lesson step, a configured instrument
   — encodes itself into a URL, so "the case I mean" is a paste rather than a
   description.
5. Collect the report the student's notebook produces, which carries their
   measurements and the provenance of each.

# Scientific scope, and what is not modelled

The scope is Newtonian gravity in two dimensions plus a set of explicitly
prescribed non-gravitational models, and the boundary is documented rather than
implied. Relativistic dynamics are not simulated; the black-hole material is
Schwarzschild geometry evaluated in closed form [@Schwarzschild:1916] and
labelled as such. Gravitational-wave inspirals use a leading-order
point-mass model [@Peters:1964] that stops before merger, and the application
says where it stops. Stellar evolution is read from the MIST model grids
[@Dotter:2016; @Choi:2016; @Paxton:2011] rather than computed; remnant outcomes
beyond a white dwarf are quoted prescriptions with their sources attached.
Habitable-zone boundaries follow @Kopparapu:2013. Modified Newtonian dynamics
[@Milgrom:1983] is offered as a selectable alternative force law in three galaxy
scenarios, using the interpolating function of @Famaey:2005, and is disabled
everywhere a galactic acceleration scale would not apply.

Real detector data is used where illustration would mislead: the
gravitational-wave material includes strain released by the Gravitational Wave
Open Science Center for GW150914 [@Abbott:2016], processed by a recorded,
reproducible pipeline.

# Accessibility, offline use and low-end hardware

The interface targets WCAG 2.2 Level AA. An automated axe-core sweep runs over
15 surfaces in two languages and two themes — 60 runs — with no rule disabled,
and a second suite covers focus order, focus traps, Escape handling, focus
restoration, heading order, landmarks, reflow, reduced motion and the canvas
description. Automated checks are a floor rather than a ceiling, and the
accessibility documentation says so explicitly.

Because the deployment target includes classrooms with unreliable networks and
old machines, the application precaches its shell, its modules and its
scenario thumbnails through a service worker whose cache name is a hash of the
precached contents, so a partially updated build cannot activate. The initial
download is held under a fixed budget enforced by the release gate; the budget
has never been raised.

# Testing and validation

Gravitas is tested at three levels. A unit suite covers the modules. A browser
suite runs in full in Chromium, against both the sources and the production
build; a tagged cross-engine subset of it runs in Firefox and WebKit. A physics validation suite runs 286 checks and publishes the
result: each check names what it compares, the kind of evidence it rests on —
analytic, integrated, published, approximation or empirical — and its measured
error. The public validation page is generated from the suite that ran, not
transcribed from it.

A release gate runs 47 checks covering formatting, linting, module architecture,
authoring rules including lesson-quality warnings, internal links, dependency
audits, the unit and browser suites, the physics validation, bundle budget and
composition, and the currency of every generated artifact. It additionally
restores the repository from `git archive` into an empty directory and rebuilds
it there, which is the only check that can notice a file the build needs and the
archive does not carry.

**What has not been done, and the distinction matters.** The validation above is
technical and design validation: that the physics is correct within stated
tolerances, that the interface is usable by the criteria named, and that the
investigations satisfy a documented set of authoring rules. It is not evidence
of learning. No formal classroom deployment has taken place, no learning gains
have been measured, and no student outcome data exists. Claims of educational
effectiveness would be unsupported and none are made here. A classroom
evaluation is planned;
<!-- OWNER: if a specific evaluation is planned, describe it in one sentence —
     course, term, instrument, approximate n. If nothing is scheduled, delete
     the clause after the semicolon and end the sentence at "planned". -->
its design and results will be reported separately.

# Project history and acknowledgment

Gravitas began as a SURE project at Stephen F. Austin State University and was
funded by the SFA COSM.
<!-- OWNER: add the award number here if one exists; otherwise leave as prose. -->

<!-- OWNER: one or two sentences on the development history if you want them —
     when it started, what it was originally for, what changed. Optional. -->

# Availability

Gravitas is developed at
<https://github.com/gravitas-sim/gravitas-sim.github.io> and runs at
<https://gravitas-sim.online>. The software is MIT licensed; the original
educational text and figures are CC BY 4.0. Third-party components retain their
own licenses, recorded in `NOTICE`.

Version 1.0.0 is archived at
<!-- OWNER: insert the Zenodo *version* DOI once minted — not the concept DOI,
     and not a placeholder. See RELEASING.md, "Two DOIs". This sentence must not
     be published with a DOI-shaped string that does not resolve. -->

# References
