# Getting help

Gravitas is maintained by one person alongside a teaching load, so the honest
answer about response times is "within a week or two, usually". What follows is
where to put each kind of question so it gets seen.

## I found something wrong

[Open an issue.](https://github.com/gravitas-sim/gravitas-sim.github.io/issues/new)

**Which browsers.** The two most recent major versions of Chrome and Edge,
Firefox and Safari, on desktop and on phones and tablets: see
[Supported browsers and devices](#supported-browsers-and-devices) for what that
promises and what is tested where.

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

## Supported browsers and devices

**What "supported" means.** The browser can load the application, run the
sandbox and every guided investigation, and show the same numbers as
the reference browser; and a bug that is reproducible there is treated as a bug.
Anything older may work and gets no promise. Where a capability is missing, the
application detects that and degrades as the inventory below says, rather than
failing in silence.

**The versions.** The two most recent major versions of Chromium-based browsers
(Chrome and Edge), Firefox and Safari; the same generation of Safari on iOS and
iPadOS and of Chrome on Android. The code needs ES2022 and module Workers.

**What is tested, where.** Chromium runs the whole browser suite on every
change; Firefox and WebKit (Safari's engine) run the cross-browser profile on
every push and weekly, because most of the suite is arithmetic that is the same
in every engine. The phone and tablet rows are Playwright's device emulation in
Chromium, so they test layout and touch, not Safari on an iPad or a real
low-end phone. Real devices are not in CI; a report from one is welcome and
counts. The low-end quality tier (`js/quality.js`) measures frame rate rather
than sniffing a device, and [`OFFLINE_AND_LOW_END.md`](OFFLINE_AND_LOW_END.md)
says it has not been validated on real low-end hardware.

This table is generated from the projects in `playwright.config.js` and the
locked Playwright's browser builds (`npm run support:sync`), so it cannot drift
from what CI runs:

<!-- browser-support:begin -->
Playwright 1.62.1 is locked, and these are the builds it drives:

| Project | Engine build | Profile | Runs | When |
| --- | --- | --- | --- | --- |
| `chromium` | Chromium 151 | Desktop Chrome, 1440×900 | The whole suite | Every change |
| `firefox` | Firefox 153 | Desktop Firefox, 1440×900 | The `@cross-browser` profile | Every push, and weekly |
| `webkit` | WebKit 26 | Desktop Safari, 1440×900 | The `@cross-browser` profile | Every push, and weekly |
| `mobile-chrome` | Chromium 151 | Pixel 7 (Chrome on Android), 412×839, touch | The phone layout and every lesson walked | Every change |
| `tablet` | Chromium 151 | iPad Mini geometry, 768×1024, touch | The tablet layout, and every lesson walked | Layout on every change, the walk weekly |
<!-- browser-support:end -->

### Feature detection

The capabilities the code checks for, where it checks, and what happens without
them. Each row is held to the code by a test: a detection that is removed, or a
new use of one of these APIs with no row, fails the build.

<!-- feature-inventory:begin -->
| Capability | Used for | Where the code checks | Without it |
| --- | --- | --- | --- |
| Web Workers (module Workers) | Barnes–Hut gravity, the chart feed, the validation suite, the experiment runner, the Mission lab, the 3-D lab and the Observatory fitter. | `js/physics.js`, `js/ui.js`, `js/validationPage.js`, `js/experimentsPage.js`, `js/missionPage.js`, `js/missionLabPage.js`, `js/lab3dPage.js`, `js/lab3dLab.js`, `js/observatory/fitPanel.js` | Optional uses degrade: gravity is summed on the main thread, charts update directly, and the validation and experiment pages say they cannot run here. The Mission lab, the 3-D lab and the Observatory fitter have no main-thread fallback and need module Workers. |
| IndexedDB | Saved work (the storage layer), the Catalog, and the reader’s cache of archive answers. | `js/storage/index.js`, `js/catalog/store.js`, `js/archive/cache.js` | Saved work falls back to localStorage, then to memory, and says so: work in memory is gone when the tab closes. The Catalog and the archive cache fall back to memory. |
| WebGL | The 3-D view in the sandbox and the picture in the 3-D lab. | `js/view3d.js`, `js/lab3d/view/scene.js`, `js/lab3dLab.js` | The 3-D views say so and stay empty. Every number is still in the tables, and the 2-D sandbox does not use WebGL. |
| OffscreenCanvas | Not used. | not used | Nothing to fall back from: Workers send numbers to the page and the page draws, so no canvas is ever transferred. |
| Service Workers | The offline copy of the site. | `js/offline.js` | The site works online as usual and offers no offline copy. It is also skipped on file:// and on a page that opted out. |
| Compression Streams | Shorter share links. | `js/shareState.js` | A link is made uncompressed (a marker byte says so) and still opens in every browser. Reading a compressed link needs DecompressionStream and says so if it is missing. |
| MediaRecorder and canvas captureStream | Recording a clip of the simulation. | `js/utils.js`, `js/capture.js`, `js/ui.js` | The record button is hidden. Nothing else depends on it, and Playwright’s WebKit is one build where it is hidden. |
| Web Audio | Sonification and the optional sounds. | `js/audio.js`, `js/gwAudio.js` | No sound. Every sonification has a text equivalent on the page. |
| BroadcastChannel | Telling other tabs that saved work changed. | `js/storage/index.js` | Other open tabs do not hear about a change until they reload; nothing is lost. |
| Web Crypto (a secure context) | The instructor portal’s decryption and the SHA-256 digests that check downloaded files. | `js/instructorPortal.js`, `js/hash.js`, `js/archive/net.js`, `js/catalog/archive.js`, `js/lab3d/kernel.js`, `js/measure/pipeline.js` | No fallback is implemented: it needs https or localhost. The student-facing simulations do not depend on it. |
<!-- feature-inventory:end -->
