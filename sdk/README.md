# The Gravitas Extension SDK

A command line, a small library and three formats for contributors who want to
add to Gravitas without learning its internals first:

- **observation data packs:** measured data with its record;
- **course packs:** sequences of lessons Gravitas already has;
- **capability packages:** new instruments.

The SDK scaffolds an extension, checks it the way a reviewer would, tests it
against Gravitas's public API, and packs it into one deterministic archive.

It does not install anything into a running copy of Gravitas, and it never
will for code. An executable package is reviewed, vendored into this repository
and compiled with everything else. A package a reader imports is always
declarative: data and text, never script. That is the security boundary the
platform draws ([PLATFORM_PACKAGE_RFC.md](../PLATFORM_PACKAGE_RFC.md)), and
the SDK enforces it rather than working around it.

## The three types

| Type | Kind | What it holds | What Gravitas does with it today |
|---|---|---|---|
| `data-pack` | declarative | one observation: a `gravitas.observation-data-pack/1` record (`pack.json`) and its encoded series (`series.json`) | validated, tested and archived by the SDK. A maintainer turns an accepted one into a built-in pack ([DATA_PACKS.md](../DATA_PACKS.md)) |
| `course-pack` | declarative | a `gravitas.course-pack/1` sequence (`course.json`): units of existing lessons, by id, with notes, in every declared language | validated, tested and archived. Gravitas does not read course packs at run time yet; the course-pack builder will |
| `capability` | built-in | an instrument family: one JavaScript module and its manifest | validated and contract-tested by the SDK, then reviewed and vendored by a maintainer |

Every extension is a directory with `gravitas-extension.json` at its root. That
file is a `gravitas.capability-package/1` manifest, the same format as the
packages in [`capabilities/`](../capabilities/). The type is what it
`provides`: `dataPacks`, `courses` or `widgetFamilies`, exactly one.

## The workflow, from nothing to a pull request

The examples in [`examples/`](examples/) went through exactly these steps.

**1. Scaffold.**

```bash
npm run sdk -- init course-pack my-course
```

This writes `extensions/my-course/` (or `--dir <path>`). A course pack and a
capability start valid. A data pack starts as a record with every field present
and empty, because the SDK will not invent data; the next step lists what to
fill in.

**2. Write it, and validate as you go.**

```bash
npm run sdk -- validate extensions/my-course
```

Each finding names the file, the line and column, and the field. Here are two
of the fixtures:

```text
sdk/fixtures/course-content/course.json:21:16  error  units[0].title.es: is missing: every string needs every declared locale
sdk/fixtures/course-content/course.json:40:21  error  units[0].lessons[2].lesson: Gravitas has no lesson "no-such-lesson"
sdk/fixtures/course-content: course-pack, 2 errors
sdk/fixtures/wrong-platform/gravitas-extension.json:7:15  error  gravitas: accepts ^2.0.0; this Gravitas implements platform 1.0.0
sdk/fixtures/wrong-platform: course-pack, 1 error
```

Errors fail the command. Warnings are what a reviewer will ask about, such as
a title with no Spanish, or a capability that still waits to be vendored.
`--json` prints the findings as data.

**3. Preview.**

```bash
npm run sdk -- inspect sdk/examples/finding-exoplanets --preview
```

```text
example.finding-exoplanets 1.0.0  course-pack (declarative)  platform ^1.0.0
  title      en: Finding exoplanets: a five-lesson sequence | es: Encontrar exoplanetas: una secuencia de cinco lecciones
  provides   courses: finding-exoplanets
  asset      course.json  data, offline optional, 2254 B, 4cfd01027681
  licence    course.json: CC-BY-4.0
  findings   0 errors, 0 warnings
  unit       Two ways to see a planet you cannot see
               transit-photometry: Finding Planets by Their Shadows
               radial-velocity: Finding Planets by Their Tug
  ...
```

What the preview shows depends on the type:

- **Data pack:** the series' range and a sparkline of it.
- **Capability:** each instrument's readout at its default controls.
- **Course pack:** the units, with each lesson's title as Gravitas shows it.

A capability draws in the browser only once it is vendored; see below.

**4. Test.**

```bash
npm run sdk -- test sdk/examples/kepler-third-law
```

The tests run the extension against the public API, as Gravitas will use it:

- **Data pack:** the series decodes with `observationOf()` and is clean. Its
  record's `validation.rule` is re-run: `folded-depth`, a transit's depth at
  the published period, or `harmonic-period`, a pulsating star's period from
  a Fourier series near the published one.
- **Course pack:** every lesson opens in every declared language.
- **Capability:** the module exports the widgets it declares, and each one
  meets the instrument contract. That means an id, a title and a note;
  controls with a range and a default inside it; `draw`; and `readout` and
  `compute` that run at the defaults.

**5. Pack.**

```bash
npm run sdk -- pack sdk/examples/finding-exoplanets --out dist-ext
```

```text
dist-ext/example.finding-exoplanets-1.0.0.gxp  1760 bytes  sha256 907f50e354ad6921859772f3b7074ba57826b64aaee98eab8686f9b3e7251669
```

The same files always give the same bytes, so the checksum identifies the
contents. `validate`, `test` and `inspect` all accept a `.gxp` as well as a
directory.

**6. Open a pull request.** Put the extension under `extensions/<id>/`.
`npm run sdk:check` validates and tests every extension there and every
example here. It is the `sdk-extensions` step of the release gate, and the
check an extension's `validation` names (`registry:sdk-extensions`). Say in the
PR:

- where the data or the text came from;
- the licence;
- for a data pack, the `sdk test` output.

For a data pack, the transformation script (`build.mjs`) goes in the pull
request. It is code, so it is never part of the archive.

## Writing each type

**A data pack**

A data pack is two files and a script:

- `pack.json`, the record: every field [DATA_PACKS.md](../DATA_PACKS.md)
  lists.
- `series.json`: `{ PACK, SERIES }`, where `PACK` is exactly the record's
  runtime fields and `SERIES` is in an encoding `observationOf()` reads
  (`binned-relative-flux/1` today).
- A transformation script that writes both from a pinned raw input.

The record is checked by the same validator as Gravitas's own packs. It
refuses the following:

- synthetic data;
- restricted data;
- a status that is not a licence, without a stated `basis`;
- an unpinned raw input;
- a transformation without a version;
- a time series without a time system;
- a derived file whose size or SHA-256 is not the record's.

The example [`tess-hd209458-one-transit`](examples/tess-hd209458-one-transit/)
is one transit, cut from Gravitas's own TESS pack. It is read through
`installedDataPack()` and pinned by that pack's checksum, so its chain runs
back to the file MAST served.

**A course pack**

A course pack is `course.json`: `locales`, a `title`, an optional `summary`,
and `units` of `{ lesson, teacherNote?, studentNote? }`, where `lesson` is a
Gravitas lesson id (`publicIds().lessons`).

- **Languages:** every string exists in every declared locale.
- **Text only:** no markup and no URLs.
- **No repeats:** a lesson appears once.

The example is [`finding-exoplanets`](examples/finding-exoplanets/).

**A capability**

A capability is one module exporting an array of instruments, declared as a
`code` asset, and a `widgetFamilies` entry naming the widget ids and a
`builtin:widgets/<id>` entry.

- **Imports:** an instrument that imports nothing is entirely within the SDK's
  promises. One that imports a Gravitas module gets a warning, because nothing
  promises that module will stay the same.
- **Language:** its strings are English. Translation goes through Gravitas's
  catalogs, which are not public yet.

The example is [`kepler-third-law`](examples/kepler-third-law/).

## What `validate` checks

| Check | What fails |
|---|---|
| Format | not JSON; a field the format does not have; a missing required field; a bad id or version |
| Declarative boundary | a declarative extension that names code, a `builtin:` reference, a script path, a `data:` or `javascript:` URL, or a fetchable URL outside `url`/`doi` |
| Type | provides no type, or more than one; the wrong `kind` for its type |
| API compatibility | a `gravitas` range this platform does not satisfy; a `requires` package that is not installed or not in range; a `uses` id Gravitas does not have |
| Public ids | a package id, data-pack id, course id or instrument id Gravitas already has |
| Licences and provenance | an asset no licence covers; a data pack's record failing its validator, or not matching its series file byte for byte |
| Localization | a course string missing a declared locale; a locale Gravitas has no interface in. A title without Spanish is a warning |
| Offline | an asset that is not there; a declarative asset marked `core` (a failed fetch must never break the install for everybody); `locale` on anything but a translation |
| Validation references | a `validation` check that names no release-gate step and no existing test |

The fixtures in [`fixtures/`](fixtures/) are one broken extension per rule.
[`fixtures/expected.json`](fixtures/expected.json) lists each finding they
produce, down to the line.

## The archive format, `gravitas.extension-archive/1`

A `.gxp` file is a POSIX ustar archive, gzip-compressed.

- **Order:** entries are sorted, with `gravitas-extension.json` first.
- **Constant headers:** every entry is a regular file, with mode 0644, uid
  and gid 0, empty owner names and mtime 0. The gzip header's mtime is 0 and
  its OS byte is 255.
- **CHECKSUMS:** the last entry has one `sha256  path` line per other entry.
- **What goes in:** the manifest, every declared asset, and a `README.md`
  and `LICENSE` if present.
- **Refusals:** reading refuses a link, a directory entry, an absolute or `..`
  path, a duplicate, and a file that does not match its checksum.

Any `tar` can list it:

```text
-rw-r--r--  0 0      0         695 Dec 31  1969 gravitas-extension.json
-rw-r--r--  0 0      0         527 Dec 31  1969 README.md
-rw-r--r--  0 0      0        2254 Dec 31  1969 course.json
-rw-r--r--  0 0      0         244 Dec 31  1969 CHECKSUMS
```

## The public API

[`lib/api.mjs`](lib/api.mjs) is the only module an extension, a
transformation script or a test should import. [`types/index.d.ts`](types/index.d.ts)
declares all of it, and the contract suite fails if the two differ.

| Export | What it is |
|---|---|
| `SDK_VERSION` | this SDK, `1.2.0` |
| `PLATFORM_API` | the platform API this Gravitas implements, `1.0.0` |
| `FORMATS` | each format this SDK reads and writes, with its version |
| `EXTENSION_TYPES`, `LOCALES` | the three types and their kinds; the interface languages (`en`, `es`) |
| `publicIds()` | every lesson, instrument, scenario, data pack, course and package id, and each lesson's title in each language |
| `acceptsPlatform(range)` | whether a `gravitas` range accepts this platform |
| `installedDataPack(id)` | an installed pack's record, runtime module and decoded observation |
| `observationOf(pack)`, `checkObservation(o)` | the decoder every pack shares, and the check that a series is clean |
| `readFits(bytes)` | a FITS file's header-data units: header cards, and a binary table's columns (1.2.0) |
| `binTessLightCurve(units, opts)` | a TESS SPOC light curve masked, normalized, binned and encoded as every built-in pack is; with `fluxStepPpm`, as `binned-relative-flux/2` (1.2.0) |

The JSON formats have JSON Schemas (draft 2020-12) in [`schemas/`](schemas/)
for editors. The schemas describe structure. The validators are the
authority, because some rules span fields, and the contract suite checks
that the two agree.

`tests/sdkContract.test.js` is the contract suite. It drives only the command
line and this API, and it fails if an example or the suite itself imports
anything else.

## Vendoring: what a maintainer does with an accepted extension

- **A data pack** becomes a built-in pack. The steps are "Adding a pack" in
  [DATA_PACKS.md](../DATA_PACKS.md): an entry in
  `tools/build-data-packs.mjs`, the runtime module in `js/data/observations/`,
  the record in `data-packs/`, and a package in `capabilities/`.
- **A capability** is added by these steps:
  1. Move the module into `js/`.
  2. Add its `builtin:` line to `js/platform/builtins.js`.
  3. Register the family in `js/widgets.js`.
  4. Move its manifest into `capabilities/`, with repository paths.
  5. Route its strings through the catalogs.
  6. Run `npm run capabilities`.
- **A course pack** waits for the course-pack builder, which will read the
  format as it is. Until then it is reviewed and archived.

## Compatibility

| SDK | Platform API | capability-package | observation-data-pack | course-pack | extension-archive |
|---|---|---|---|---|---|
| 1.0.0 | 1.0.0 | 1 (with `provides.courses`) | 1 | 1 | 1 |
| 1.1.0 | 1.0.0 | 1 (with `provides.courses`) | 1, with `image` packs and the optional runtime fields `reductions` and `image` | 1 | 1 |
| 1.2.0 | 1.0.0 | 1 (with `provides.courses`) | 1, with the `binned-relative-flux/2` encoding and the `harmonic-period` check | 1 | 1 |

SDK 1.2.0 adds, and removes nothing, what the first extension built outside
the core needed (CATALOG.md, "What the SDK lacked"):

- **`readFits()` and `binTessLightCurve()`** in the public API. The SU
  Draconis pack's build script had no other way to read its MAST product, or
  to bin it as the built-in packs are binned, than to import `tools/`.
- **The `binned-relative-flux/2` encoding** (DATA_PACKS.md), for a star that
  varies by more than the 3.3% `/1` holds.
- **The `harmonic-period` check**, a pulsating star's period from a Fourier
  series near the published one, beside a transit's `folded-depth`.

SDK 1.1.0 adds, and removes nothing:

- **Image packs.** `dataType: "image"`, with an `image` block: width, height,
  a TAN world coordinate system and, for an image of bit fields, what each bit
  means and where that is documented. The first is the TESS light curve's
  aperture mask (`data-packs/tess-hd209458-s56-aperture.json`).
- **Two optional runtime fields.** A runtime copy may carry the manifest's
  `reductions`, so an interface can say what was reduced before the data
  arrived, and an image's `image` block, which an image must. A copy written
  for 1.0.0, without `reductions`, still validates: `validate` warns that an
  interface cannot show them.

**Deprecation policy**

- **Minor versions add; they never remove.** A new optional field, command,
  API export or check is a minor version. A new error in `validate` for
  something that was previously accepted counts as removal.
- **Removal takes two minor versions.** Anything to be removed or made
  stricter first becomes a warning that names the version in which it will
  become an error, for at least one minor version. The removal itself is a
  major version, with a migration note.
- **Format versions are strict.** A reader accepts only the format versions it
  implements. A format's version changes only with a change an old reader
  would misread, and the SDK then reads both versions for at least one major
  version.
- **The platform range is the contract.** An extension that says
  `"gravitas": "^1.0.0"` is refused, with a message, by a Gravitas whose
  platform is 2.0.0, rather than half working.

## What still stands in an independent author's way

These are the private APIs and missing pieces that stop someone outside the
repository from shipping an extension end to end:

1. **A declarative extension reaches readers only through the curated
   catalog.** Once a maintainer accepts it into `catalog/curation.json`, a
   reader installs it at `/catalog/` (CATALOG.md). There is still no way to
   import an archive nobody has reviewed, and that is on purpose.
2. **An instrument cannot be translated through a public API.** `t()` and the
   catalogs in `js/i18n/` are private, so an extension instrument's strings are
   English.
3. **An instrument cannot draw with Gravitas's canvas helpers through a public
   API.** `js/widgetCanvas.js`, `js/format.js` and the colour tokens are private.
   The example draws with the bare canvas, so it will not look like the
   built-in instruments.
4. **Registering an instrument family is a core edit.** It needs lines in
   `js/widgets.js` and `js/platform/builtins.js`.
5. **A lesson cannot be declarative.** Lessons carry functions (`validate`,
   `probe`), so there is no JSON lesson format. A course pack is as far as
   lesson content goes without code.
6. **A capability cannot be previewed in the running app without vendoring
   it.** `inspect --preview` is text.
7. **The SDK itself reads private modules**, such as the lesson manifest, the
   widget registry and the authoring inputs. `lib/api.mjs` is the seam: it can
   keep its promises while those change under it, but only if they are updated
   together, in this repository.
8. **A course cannot name a data pack.** `gravitas.course-pack/1` sequences
   lessons, so the pulsating-stars course names the SU Draconis pack in a
   note's words, and nothing checks that the pack exists.
9. **A data pack cannot bring its own check.** The SDK runs `folded-depth` and
   `harmonic-period`; a pack of another kind of variable needs another check
   added to the SDK, which is a core change.
