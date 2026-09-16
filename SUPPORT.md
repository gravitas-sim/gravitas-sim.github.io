# Getting help

Gravitas is maintained by one person alongside a teaching load, so the honest
answer about response times is "within a week or two, usually". What follows is
where to put each kind of question so it gets seen.

## I found something wrong

[Open an issue.](https://github.com/gravitas-sim/gravitas-sim.github.io/issues/new)

The three things that make a bug fixable here:

1. **A share link.** Nearly every state in Gravitas encodes itself into the URL
   — press Share, copy the link, paste it in. That is usually the whole
   reproduction.
2. **Which browser, and roughly which version.** The simulation is a canvas and
   a lot of float arithmetic; Firefox and Safari do sometimes differ from
   Chrome, and knowing which one you are on saves a round trip.
3. **What you expected instead.** For a physics question especially: "the orbit
   drifted" and "the orbit drifted *more than I think it should*" are different
   reports, and the second one is the useful one.

If a number looks wrong, [`PHYSICS_VALIDATION.md`](PHYSICS_VALIDATION.md) and
[/validation/](https://gravitas-sim.online/validation/) list what has been
checked against what, with the measured error. That page may answer the question
faster than I can, and if it disagrees with what you are seeing, that is a good
bug report on its own.

## I want to use this in a course

No permission needed and nothing to ask for. The teaching material is CC BY 4.0
— see [`LICENSES.md`](LICENSES.md) — so you can put an investigation in a course
pack, translate it, cut it in half, or build something else out of it, as long
as you say where it came from.

- [/teaching/](https://gravitas-sim.online/teaching/) is the page written for
  this: how the investigations are structured, what a student submits, and six
  demonstrations you can open as embedded figures.
- [/instructors/](https://gravitas-sim.online/instructors/) has the guides,
  learning objectives and answer keys. It asks for a passphrase, because the
  answer keys are in it. Email me for it.
- The user manual is [`Gravitas_User_Manual.pdf`](Gravitas_User_Manual.pdf).

If you do use it with a class I would genuinely like to hear how it went,
including if it went badly. There is no classroom evaluation of this software
yet and the first real account of one would be worth more than any feature.

## I have a question that is not a bug

[Start a discussion](https://github.com/gravitas-sim/gravitas-sim.github.io/discussions)
if discussions are enabled on the repository, or open an issue and label it a
question. Either is fine; an issue is never the wrong place.

## I want to change something

[`CONTRIBUTING.md`](CONTRIBUTING.md) covers the setup, the checks, the module
boundaries and how to add a scenario, an investigation or a language. Read the
section on the checks before you start: the release gate is thorough and it is
much less annoying to run it early than to meet it at the end.

## I found a security problem

Do not open an issue. [`SECURITY.md`](SECURITY.md) says how to report it.

## I want to cite this

[`CITATION.cff`](CITATION.cff), and the "Citing Gravitas" section of
[`README.md`](README.md). GitHub renders the CFF as a "Cite this repository"
button on the repository page.

## Contact

Carl Ziegler — <Carl.Ziegler@sfasu.edu>
Department of Physics, Engineering and Astronomy, Stephen F. Austin State
University.
