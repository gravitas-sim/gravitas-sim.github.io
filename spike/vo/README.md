# Archive and Virtual Observatory spike: Prompt 18 evidence

**This is not production code.** It is not deployed or linked from the site,
and nothing in `js/` imports it. `tests/spikeNotShipped.test.js` already
covers every directory under `spike/`. The decision is in
[`VO_ARCHIVE_GATE.md`](../../VO_ARCHIVE_GATE.md), which you should read first.
This file only says how to re-run the evidence.

## What is here

| File | What it does |
| --- | --- |
| `net.js` | `fetchLimited()`: one bounded request, with every failure named: blocked, timeout, rateLimited, unavailable, refused, tooLarge, wrongType, offList |
| `votable.js` | `parseVotable()`: TABLEDATA only, strict. It refuses a DOCTYPE, a service error, or a binary serialization, and keeps a `long` as its digits |
| `archive.js` | The workflow. Sesame name, then Gaia DR3 source by cone, then epoch photometry, then `gravitas.observation/1`. It uses a curated table descriptor and TCB→TDB |
| `cache.js` | The stale-answer policy: fresh, refreshed, stale with its age, or changed by content |
| `fitsBounded.js` | The header limits a FITS file from the network needs before `tools/data-packs/fits.mjs` reads it |
| `demo.html`, `demo.js` | The workflow against the live CDS, by hand |
| `probe.html` | One public GET to each of eleven archive endpoints: which answer a page on another origin |
| `probe-csp.html`, `probe-csp.js` | Whether a meta Content-Security-Policy holds an allowlist on a static host |
| `fixtures/` | Sesame's answer for SU Dra, and SU Dra's Gaia DR3 epoch photometry from VizieR (2026-09-26) |
| `test/` | 41 `node:test` tests, offline: the failure modes and the conversion |
| `measure/` | Bundle cost, low-end memory and time, hostile XML in three engines, CSP and the live workflow in three engines |
| `evidence/` | What `measure/` and the probes wrote, as committed |

## Re-running it

From the repository root, after `npm ci`:

```bash
node --test spike/vo/test/*.test.mjs
```

```bash
node spike/vo/measure/bundle.mjs
```

```bash
node spike/vo/measure/xml-hostile.mjs --json spike/vo/evidence/xml-hostile.json
```

The memory run needs the raw TESS sector 15 light curve of SU Dra (see
`extensions/su-dra-tess-s15/README.md`), and nothing else heavy running:

```bash
GRAVITAS_PACKS_CACHE=/path/to/cache node spike/vo/measure/memory.mjs --json spike/vo/evidence/memory-chromium.json
```

The live pieces need a static server at the repository root on port 4291:

```bash
python3 -m http.server 4291 --bind 127.0.0.1
```

Then open `http://localhost:4291/spike/vo/probe.html` or `demo.html`, or run:

```bash
node spike/vo/measure/csp-engines.mjs --json spike/vo/evidence/csp-engines.json
```

```bash
node spike/vo/measure/live-engines.mjs --json spike/vo/evidence/live-engines.json
```

The live runs send one name (SU Dra) and small ADQL queries to CDS, and one
HEAD request to MAST's public S3 bucket. The probe also sends one GET to each
of the other services it lists.
