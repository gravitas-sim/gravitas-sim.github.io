# Bringing a FITS frame or a picture into the Observatory

Prompt 188 (Roadmap III, R13). The Observatory's file input takes a FITS image
(`.fits`, `.fit`, `.fts`), a PNG or a JPEG, reads it on this device, says what the
file claims and what it will and will not allow, and opens it as an image
observation. Nothing is uploaded, fetched or stored anywhere but where the
reader saves it. The limits, the refusal corpus and the thresholds were written
down and committed before the code that meets them (`tools/image-import-cases.mjs`,
commit aa4eb2c7); they were not moved afterwards.

## What a file may be

| File | Reader | What it can become |
| --- | --- | --- |
| FITS image (the integer and floating BITPIX values the 157 reader takes; one primary or image HDU) | `js/dataKinds/fits.js` through `fitsJob.js` (Prompt 157), on the worker pool | Quantitative only when the pixel contract says so. The header's claims (BUNIT, exposure, saturation, gain, WCS) are shown with their cards and are the reader's to confirm. |
| PNG (gray, gray+alpha, RGB, RGBA and palette, at the depths PNG allows for each; plain or Adam7) | `js/dataKinds/raster.js`, decoded by the browser in a Worker (`rasterJob.js`) | Display-only. Always. |
| JPEG (8-bit Huffman: baseline, extended sequential or progressive; 1 to 4 components) | the same | Display-only. Always. |

A picture is a stretched, gamma-encoded, often lossy rendering. Its values are
not a measure of light and its pixels carry no world coordinates, so the import
says so, refuses photometry and astrometry for it in the contract's own words
(`permits` in `js/dataKinds/contract.js`), and still lets the reader mark it,
which is what a picture is good for (a count, a distance with a reference pair).
The pixel value is Rec. 601 luma of the decoded frame drawn over white; an
orientation tag the decoder applied (a phone's rotated photograph) is recorded
in the image's history as a rotation and does not count as a size mismatch.

## What the reader may state

All optional, all ordinary text fields with their effect written beside them:

- **Time of the exposure with its scale** (UTC, TT, TDB, or "local"). A time with
  no scale is not shown as a time. Effect: the marks panel shows it with its
  scale and the ledger record carries it.
- **Pixel scale, arcseconds per pixel.** Kept with the image and in the saved
  record. It does not make marks measure on the sky; that needs a FITS WCS or a
  reference pair the reader marks.
- **Orientation** (angle of north, which side east is on). Kept as the reader's
  statement; nothing computes with it in this release.
- **The pixels are** light, or display levels / unknown; with the unit,
  calibration state, exposure, saturation, gain, read noise and linear range.
  Each value copied from a header is labelled the header's, each typed one the
  reader's. The verdict list (marks, photometry, astrometry) is `permits` run on
  the sidecar these fields build, and "still missing" names what photometry
  lacks.

## The bounds

Written before the code (`BOUNDS` in `tools/image-import-cases.mjs`), enforced in
that order: size, structure, pixels, then decode.

| Bound | Value |
| --- | --- |
| File size, refused before one byte is read | 33,647,040 bytes (a 2,048 x 2,048 BITPIX -64 frame and its headers) |
| Axis / pixels | 8,192 per side / 4,194,304 in all |
| Decoded memory | 8 bytes per pixel, 64 MiB per page, declared to the pool ledger before the job starts (PNG and JPEG also declare the decoder's RGBA frame: file + 12 x pixels) |
| Decode | on the worker pool, never on the page thread; a cancelled read terminates its realm |
| Refusal in Node | under 250 ms per file; under 1 MiB of ArrayBuffer growth |
| Refusal in the page | under 2,000 ms from the file chosen to the refusal on screen |
| Largest frame, chosen to form shown | under 5,000 ms |
| Cancelled read | ledger 0 B, Worker terminated within 2 s, heap within 8 MiB of before |

A PNG's header is checked chunk by chunk (IHDR length and CRC, the colour type
and depth pairs PNG allows, PLTE for a palette, IDAT before IEND, nothing after
IEND) and a JPEG's marker by marker (segment lengths, the frame header's
component count and length, EOI) before a decoder is asked anything; the width
and height come from the header, are bounded, and the decoder must agree (an
exception for the orientation swap). A decompression bomb is therefore refused
from 20 bytes of data and allocates nothing.

An imported frame of more than 200,000 pixels cannot be written as a workspace
file the application can read back (the workspace writes every pixel as text and
reads back that many rows), so JSON and CSV saving is switched off for it, with the
reason beside the buttons, until anything else is opened. A smaller frame
is saved with its file's digest, sidecar and marks (the 179 rule) and read back.

## The refusals

Every refusal is a sentence in both languages (`obs.imp.no.<code>`) with the
reader's own English message beside it (a computed message is never translated).
The 37 codes are the reader's 28 (`not-fits`, `truncated`, `header-too-large`,
`card-malformed`, `duplicate-card`, `missing-card`, `dimension-overflow`,
`nonfinite-header`, `axis-invalid`, `hdu-unsupported`, `bitpix-unsupported`,
`compressed`, `axes-unsupported`, `too-large`, `file-too-large`, `too-many-hdus`,
`no-image`, `scale-invalid`, `blank-invalid`, `nonfinite-pixel`, the four `wcs-*`
codes, `canceled`, `empty-file`, `unknown-format`), the pictures' (`png-malformed`,
`jpeg-malformed`, `raster-unsupported`, `undecodable`, `dimension-mismatch`,
`no-decoder`), and the pool's (`unreadable`, `timeout`, `resourceLimit`,
`workerFailed`), plus a fallback. The corpus is 73 FITS cases
(`tests/fixtures/imageImport/fits-refusals.json`: the 157 corpus plus non-FITS
inputs, each with its reader code, import code, stage and message) and 51
PNG and JPEG refusals with 10 acceptances, all built by committed deterministic
generators (no file was downloaded). Three need a real decoder and are
browser-only.

## Measured

On one machine, Node 24 and Chromium, no gate beyond the bounds:

| Leg | Threshold | Value | Verdict |
| --- | --- | --- | --- |
| Corpus in Node (121 files) | 250 ms each, < 1 MiB ArrayBuffer growth | slowest 8.2 ms; growth none (net negative, earlier buffers collected) | pass |
| Corpus in the page (124 files, en and es) | 2,000 ms each | slowest 100 ms (en), 108 ms (es) | pass |
| Over-size file | 0 bytes read | 0 | pass |
| 2,048 x 2,048 BITPIX -64, chosen to shown | 5,000 ms | 4,491 ms (the margin is 10 percent; opened as an observation in a further 4,537 ms) | pass, tight |
| Cancel and close (`npm run probe:import-cancel`, both profiles) | ledger 0 B, Worker ended, heap within 8 MiB | 0 B, 1/1 ended, 1.19 to 1.32 MiB | pass |
| Hostile PNG decode against an authentic frame | needs a frame from Prompt 189 | NOT RUN until 189 | open |

The first run of the cancel probe failed: the 33 MiB it measured was the test
double's own 1.5 s timer holding the file, not the application. The procedure
now waits for the timer; the bound is unchanged.

## The CI timing factor

The two page timings (the largest frame chosen to shown, 5,000 ms; each refusal in the page, 2,000 ms) were committed first, as plain bounds, in aa4eb2c7, and they are the local standard: `e2e/imageImport.spec.js` holds them as written. After the largest frame was measured at 4,491 ms locally (a 10 percent margin), commit ecfbbad1 added a factor of 2 when `process.env.CI` is set, so a slower, noisier shared runner is not a false failure. That factor was added after the measurement, not before it. Carl allowed it (chat 2026-10-23, AskUserQuestion, "Allow 2x on CI (Recommended)"): "Keep the committed bounds as the local standard, and double them only on CI runners, which are slower and noisy (the 4,491 ms local figure leaves just 10% margin). State it in the register row and PR. Same practice as 179's T6 loaded-runner factor." `GRAVITAS_IMAGE_TIMING_FACTOR` overrides it by hand and is set nowhere in `.github/`; CI cannot raise it.

## Decisions

See D-R10-59 in `DECISION_REGISTER.md`.

## Where it is

`js/dataKinds/raster.js`, `rasterJob.js`, `fitsWorker.js` (both jobs);
`js/observatory/imageImport.js` (the panel, the sidecar builder, the save guard),
lazy; `js/i18n/{en,es}.imageImport.js`, lazy; the Observatory page opens it with
one `import()`. The shared chunks are in `NEVER_PRECACHED`: a first visit
downloads none of it. The Spanish is unread by a fluent reader.
