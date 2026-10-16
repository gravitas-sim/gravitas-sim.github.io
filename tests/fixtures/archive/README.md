# Archive answers, as CDS gave them

Two answers, saved on 2026-09-26 for `tests/archive.test.js` and
`e2e/archive.spec.js`. No test reaches the network; these stand in for it.

| File | What | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `sesame-su-dra.xml` | CDS Sesame, `SU Dra` | 1,179 | `8d9a7ff5adecf8dbba317b0493ac702c35ecd570fc1550caacae65199e623981` |
| `gaia-epphot-su-dra.vot` | VizieR TAP, `I/355/epphot`, Source 1058066262817534336, 04:40 UTC | 13,431 | `9020b015e2c8d2a89c720a7ebf2efc9c5f939216d18b11949d295a38780c4930` |

The epoch photometry is Gaia DR3 data: **CC BY-NC 3.0 IGO, credit
ESA/Gaia/DPAC** (Gaia Collaboration, Vallenari et al. 2023, A&A 674, A1).
It is kept here for tests, non-commercially. Like every committed file it
is in the tree the deploy publishes (`tools/prepare-pages.mjs` exports the
whole commit), but nothing in `js/` imports it, nothing links to it, and the
service worker does not precache it. CC BY-NC permits that copy, with the
credit above. Its content digest,
`eaaa345e…da6f`, is the one Chromium, Firefox and WebKit computed from live
answers (VO_ARCHIVE_GATE.md).
