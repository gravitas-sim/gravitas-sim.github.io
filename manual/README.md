# The user manual

`Gravitas_User_Manual.pdf` at the repository root is built from the LaTeX in
this directory. The PDF is committed because it is a published artifact — an
instructor downloads it from the site — but it is an artifact: the source of
truth is here.

```bash
npm run manual         # regenerate the includes, compile, install the PDF
npm run manual:check   # does the shipped PDF still match the application?
```

## What is generated

Three of the files here are written by tooling and must not be hand-edited:

| File                 | Written by               | From                                   |
| -------------------- | ------------------------ | -------------------------------------- |
| `facts.tex`          | `tools/docs-facts.mjs`   | the catalog, the manifest, test output |
| `scenarios.tex`      | `tools/build-manual.mjs` | `js/data/scenarioInfo.js`              |
| `investigations.tex` | `tools/build-manual.mjs` | `js/data/investigations/manifest.js`   |

`gravitas-user-manual.tex` is the only file written by hand. If you catch
yourself typing a number into it, add a macro to `facts.tex` instead — that is
the whole reason the generator exists. Counts written by hand into a PDF are the
single most reliable way for documentation to go quietly wrong, because nobody
diffs a PDF.

## The toolchain

[Tectonic](https://tectonic-typesetting.github.io/), because it is one binary
with no TeX installation behind it and downloads only the packages the document
actually asks for:

```bash
brew install tectonic          # macOS
cargo install tectonic         # anywhere with Rust
```

The first build downloads packages and takes a couple of minutes; later builds
are seconds. CI does not build the manual — it checks that the committed PDF
still agrees with the application, which is the part that can rot.

## How the check works

The LaTeX writes the counts into the PDF's own keywords metadata:

```latex
\hypersetup{pdfkeywords={scenarios=\GravScenarios; investigations=\GravInvestigations; ...}}
```

`npm run manual:check` reads that line back out of the finished PDF and compares
it with the live catalog, so a scenario added without rebuilding the manual
fails the check instead of shipping a manual that quietly says 48 forever. It
also verifies the properties that make the PDF usable: a declared language,
extractable text, and a bookmark outline.

## Accessibility

The manual declares its language, embeds ToUnicode maps so its text extracts and
searches correctly, builds a bookmark outline from its heading structure, uses
no images (so there is nothing that needs alternative text), and colours its
links dark enough to hold contrast on paper and on screen.

It is **not** a tagged PDF. Tagging needs `\DocumentMetadata`, which needs a
LaTeX newer than the one in Tectonic's package bundle. If the bundle moves
forward, adding

```latex
\DocumentMetadata{lang=en-US, pdfstandard=ua-2, testphase={phase-III,title}}
```

as the first line is the change, and `manual:check` should then also assert
`/StructTreeRoot`. Until then the limitation is stated in the manual's own
Accessibility section rather than left for a reader to discover.
