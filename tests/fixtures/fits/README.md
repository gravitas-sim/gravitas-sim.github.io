# TESS light-curve headers, as MAST served them

The headers of the two TESS light curves the data packs are built from, kept
for `tests/fitsHeaderBounds.test.js`. The files themselves are 2 MB each and
are not in the repository. Each is pinned by its checksum where it is used,
and read from `.packs-cache/` by `npm run packs:provenance`.

| File | From | Used by | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `tess2022244194134-s0056-0000000420814525-0243-s_lc.headers.txt` | HD 209458 (TIC 420814525), sector 56: 2,039,040 bytes, SHA-256 `1b76b4a4b73e24954fa6e29a7e28a174685113ecdbad1bf10ef0e7b766ce99e9` | `tools/build-data-packs.mjs` | 16,654 | `39ae6103f31af47c2feaf8a7971e3efe548e6f185658b7a923c0c315e78cbea8` |
| `tess2019226182529-s0015-0000000142848794-0151-s_lc.headers.txt` | SU Dra (TIC 142848794), sector 15: 1,906,560 bytes, SHA-256 `feea6b25dd3d2a9762365b4fd4588887640076381999a43f53f87bd892e6e4a0` | `extensions/su-dra-tess-s15` | 16,306 | `2aba07322009afddf9a00064b8599606cc419c4ed54a6596cc405ed0c79f70aa` |

Each line is one 80-character card, with its trailing spaces removed, and
`END` closes each of a file's three headers (the primary header,
`LIGHTCURVE` and `APERTURE`). Padding each line back to 80 characters and
each header to whole 2,880-byte blocks gives the file's header blocks byte
for byte. This was checked against the pinned files on 2026-09-26. The test
rebuilds each file around zero-filled data units of the sizes the headers
state, and checks that the result is as long as the pinned file.

These are NASA mission data, released without restriction on reuse. See the
TESS section of [NOTICE](../../../NOTICE).
