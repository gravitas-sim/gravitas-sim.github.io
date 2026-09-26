# Astronomy archives and the Virtual Observatory: gate

**Status: decided under delegation, not reviewed.** Carl asked for the roadmap
to run in order while he was away, with each gate decided on its
recommendation. These verdicts are evidence, not a signed decision. Each one
names the evidence it rests on and the condition that would reverse it.

| Piece | Verdict |
|---|---|
| **Discovery**: a name, to a position, to a catalog row | **B**: CDS only (Sesame and VizieR TAP), opt-in, one curated table at a time; the first is Gaia DR3 epoch photometry |
| **Direct download** of archive products | **C**: no path from a discovery service a page can reach to a product it can fetch; curated packs stay the route |
| **FITS** from the network | **C**, because direct download is C. Local-file import stays where [OBSERVATION_DATA_PACK_GATE.md](OBSERVATION_DATA_PACK_GATE.md) left it, with three new preconditions |
| **VOTable** | **B**: TABLEDATA only, strict, on the main thread, answers capped at 512 KB |
| **Sky view** (Aladin Lite) | **C**: 2,335 KiB, a license that is not settled, and live tiles on every pan; link out instead |

Nothing here stops a lane that has no other route. Prompt 19 runs for the two
B pieces only, discovery and VOTable, as the slice specified below. Prompt 20
goes ahead with curated packs whatever Prompt 19 does. The built-in lessons
never touch any of this, and they stay reproducible offline.

**Base:** `v2` at `bb72842` (Prompt 17 merged; the tree is the one CI passed
as #66's head `4671364`). **Prototype:** branch `spike/vo-archive-gateway` at `6832783`,
in [`spike/vo/`](https://github.com/gravitas-sim/gravitas-sim.github.io/tree/6832783/spike/vo).
It is disposable and will not merge. This PR is the decision record only.

---

## The question

A reader types the name of a star and gets its real data in the Observatory,
with its provenance. Five architectures could do that from a static site:

| Architecture | Works on GitHub Pages | Reproducible offline | Reaches | Role |
|---|---|---|---|---|
| **Build-time ingestion** (`tools/data-packs/`, Prompts 12 and 17) | yes | yes | any archive, because a maintainer's machine has no CORS | **the route for lessons**, unchanged |
| **A same-origin curated mirror** | only as committed files, which is a data pack by another name. A proxying mirror needs a server Gravitas does not have | yes, for committed files | what was mirrored | not a separate architecture |
| **Direct requests to CORS-enabled archives** | yes | no: it is live | **CDS only**, measured below | **B** for discovery |
| **IVOA TAP, ObsCore and DataLink** | TAP at CDS, yes. ObsCore and DataLink, no: the ObsCore service probed (MAST's) refuses a page, and DataLink's links point into archive download services that refuse one too (MAST's) | no | VizieR and SIMBAD tables | TAP at CDS, inside discovery |
| **An established sky component** (Aladin Lite) | as a 2.3 MB script and live tiles | no | CDS HiPS surveys | **C**; link out |

A third-party CORS proxy was considered and rejected without a prototype. It
would send every reader's queries through an operator Gravitas does not know.
It could change any answer. And it would make the proxy, not the archive, the
source.

## Which archives answer a page on another origin

One small public GET to each service, without credentials, from
`http://localhost:4291` in Chromium 152
([`evidence/cors-chromium.json`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/6832783/spike/vo/evidence/cors-chromium.json)).
Each blocked service was then asked the same question by `curl`, which has no
CORS, to separate "refuses a page" from "down"
([`evidence/cors-headers-curl.txt`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/6832783/spike/vo/evidence/cors-headers-curl.txt)):

| Service | A page gets | Why |
|---|---|---|
| CDS Sesame (name resolver) | **200** | `Access-Control-Allow-Origin: *` |
| CDS VizieR TAP | **200** | `*` |
| CDS SIMBAD TAP | **200** | `*` |
| CDS HiPS (Aladin's tiles) | **200** | `*` |
| MAST public S3 bucket (TESS products) | **200** (HEAD, 1,906,560 bytes, `application/fits`) | `*` |
| MAST TAP / ObsCore (CAOM) | blocked | answers 200 and a VOTable, with no CORS header; an `OPTIONS` request gets 405 |
| MAST Download API | blocked | 302 to the S3 bucket, and the 302 carries no CORS header |
| NASA Exoplanet Archive TAP | blocked | 200, no CORS header |
| ESA Gaia archive TAP | blocked | 200, no CORS header |
| IRSA TAP | blocked | 200, no CORS header |
| HEASARC TAP | blocked | 200, no CORS header |

The consequence shapes every verdict. **CDS is the only open discovery
service.** The one open product host, MAST's bucket, can be reached only by a
page that already knows the exact key, and the services that would tell it
the key are the closed ones.

A page cannot tell a CORS refusal from being offline. Both reject with the
same `TypeError`, by design, and only the developer console names the cause.
So the error a reader sees has to name both.

## The prototype workflow

The workflow runs from SU Dra, the RR Lyrae star of the `su-dra-tess-s15`
pack, to its Gaia DR3 epoch photometry as a `gravitas.observation/1`. It has
five bounded steps:

1. **Resolve** the name with Sesame (64 KB limit). This gives RA 174.48586°,
   Dec +67.32974°, type RR*, from SIMBAD.
2. **Discover** the Gaia DR3 source with VizieR TAP (`I/355/gaiadr3`), in a
   2″ cone with `MAXREC` 5. The query is built from Sesame's numbers only; the
   reader's text never reaches ADQL.
3. **Inspect** its epoch photometry (`I/355/epphot`, `MAXREC` 2000). This
   returned 47 rows in 13,431 bytes. The page shows every field with its
   unit, UCD and description, the row count, the status and the SHA-256.
4. **Select** a band: G, BP or RP.
5. **Convert** to `gravitas.observation/1`. The conversion takes 1 ms and
   records:
   - the query URL, the final URL, the byte count, and two checksums (below),
     in `source.retrieval`;
   - the retrieval time, the license, the credit and the citation;
   - every transformation, as `reductions`.

Live, the workflow gives the same observation in all three engines
([`evidence/live-engines.json`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/6832783/spike/vo/evidence/live-engines.json)):

- The id is `import:gaia-dr3-1058066262817534336-G@eaaa345eb58c`, with 47
  points, in Chromium, Firefox and WebKit.
- Each step took 0.2 to 0.8 s, set by the network.
- jsdom computes the same content digest from the committed fixture.

The observation passes the Observatory's own `validateObservation`. It also
survives `observationJson` and `read` with its retrieval record intact,
which is a test on the spike branch.

**Is it the star?** A string-length period search over 0.3 to 1.2 d
(450,000 trial periods) was run on the 47 converted epochs, which span 902.2
days. Its global minimum is at **0.660428 d**. Monson et al. 2017 give
0.66042001 d, and the TESS pack's own fit is 0.660408 d. So the times,
magnitudes and ordering survived the conversion.

### What the service does not say

VizieR describes `TimeG` as `JD-2455197.5`, in `d`. Gaia's DR3 data model
([`epoch_photometry`](https://gea.esac.esa.int/archive/documentation/GDR3/Gaia_archive/chap_datamodel/sec_dm_photometry/ssec_dm_epoch_photometry.html))
says it is **barycentric JD in TCB − 2 455 197.5**. VizieR gives `FG` and `e_FG` no
unit at all. The data model says **e⁻ s⁻¹**. VizieR's `rights_uri` points to
VizieR's own license page, not to Gaia's **CC BY-NC 3.0 IGO**.

So generic VO metadata is not enough to convert a table honestly. Each
accepted table needs a **curated descriptor** that carries what the service
does not, each fact cited:

- the time zero, scale and format;
- the units a field must have;
- the license, credit and citation.

The conversion uses the service's metadata only as a check. A unit the
service does state must agree with the descriptor, or the conversion stops.

The times are converted from TCB to TDB by IAU 2006 Resolution B3, and the
conversion is recorded:

- The difference is 19.08 s in 2016 (11.25 s at J2000, which a test checks).
- That is small beside a 0.66-day pulsation.
- It is a whole bin of a transit's ingress, so it is never left as "unknown".

The magnitude errors are 1.0857 × `e_FG`/`FG`. BP and RP have no errors in this
table, and the observation says so rather than drawing none.

## Failure modes

The prompt names eight failures. Every one is a test in
`spike/vo/test/` (41 tests, offline, `node --test`), and every one is
reported to the reader by name.

| Failure | What happens | Test |
|---|---|---|
| **Unavailable archive** | HTTP 5xx is `unavailable`, and the body is never parsed | `an unavailable archive (HTTP 503)...` |
| **CORS rejection** | `blocked`, with a message naming both causes. Measured live against six services | `a CORS rejection is reported as blocked...` |
| **Huge result** | refused by `Content-Length` before a byte is read. An answer with no length is counted as it streams and stopped at the limit. `OVERFLOW` (the service stopped at `MAXREC`) is kept, and the observation says "this is not every epoch" | three tests |
| **Malformed VOTable** | refused by name, with one code each: not XML, not a VOTable, a service error inside a 200, a binary serialization, a row of the wrong width, no fields, more than one table, any DOCTYPE. An unparseable number is null, never NaN | `malformed VOTables are refused by name`, and three more |
| **Malformed FITS metadata** | refused by name: no END card, a table past the end of the file, a bad TFORM, the wrong row width, not FITS. A hostile NAXIS, a NAXISn product past the file, a BITPIX FITS does not define, and too many units are refused before anything is allocated | `spike/vo/test/fits.test.mjs`, 6 tests |
| **Rate limiting** | HTTP 429 is `rateLimited`, carrying the service's `Retry-After` | `rate limiting (HTTP 429)...` |
| **Redirects** | followed, and the final URL recorded. The origin list is checked before the request and again where the redirect ended, so a redirect off the list is refused unread | three tests |
| **Mixed units** | a unit the service states that the descriptor does not expect stops the conversion. The cases tested are `Gmag` in mJy, `TimeG` in s, and `FG` in W/m²/nm. The unit the data model gives (e⁻/s) is accepted when it is stated | `mixed units...` |
| **Stale cached results** | a fresh copy is used and says so. An old one is refreshed. When the archive is down, an old one is offered as stale, with its age and the reason, never silently. A changed answer is marked changed, with the old checksum | four tests |
| **Timeout** | `timeout` after the limit, via `AbortController` | `no answer within the limit is a timeout` |

## What the prototype caught

Each of these was found by running the prototype, and each is now a rule for
production:

1. **A `long` is not a number.** Gaia source ids are 19 digits, past the
   2⁵³ a double holds exactly. `Number()` rounds `1058066262817534336`
   (SU Dra) to `1058066262817534300`, which is no star at all. The spike's
   own cone-query test caught the rounded id being handed to the epoch query.
   The parser keeps a `long` as its digits.
2. **The bytes' checksum is not the data's identity.** Prompt 11 found that
   VizieR's TSV answers date themselves. Its TAP answers do too, and add a
   fresh table name. The same 47 rows, asked for twice 1.5 s apart, came back
   with two byte checksums
   ([`evidence/live-workflow-chromium.json`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/6832783/spike/vo/evidence/live-workflow-chromium.json)).
   So an observation records two checksums:
   - the **SHA-256 of the bytes**, which records this retrieval;
   - a **content digest** over the fields and rows, which is its identity
     and its id.

   The content digest was identical across Chromium, Firefox, WebKit and
   jsdom, and across requests 18 minutes apart. It is the live-import form of
   the canonical-form pin in
   [OBSERVATION_DATA_PACK_GATE.md](OBSERVATION_DATA_PACK_GATE.md). That pin is
   over the data rows; this digest is over the fields and the rows, because a
   unit that changed would be a different observation.
3. **An unresolved entity is an empty cell, silently.** No engine resolves
   an external entity, but the document then parses with that cell empty. A
   VOTable never needs a DOCTYPE, so any DOCTYPE is refused.
4. **`tools/data-packs/fits.mjs` trusts NAXIS.** The reader hands `NAXIS` to
   `Array.from` before checking it against the file. From a 2,880-byte file,
   in Node with a 512 MB heap (orders of magnitude, not a benchmark):

   | `NAXIS` | Time | Heap |
   |---:|---:|---:|
   | 10⁶ | 0.46 s | 26 MB |
   | 10⁷ | 5.4 s | 123 MB |
   | 5 × 10⁷ | 32 s | 421 MB |
   | 2 × 10⁹ | out of memory | out of memory |

   This is harmless today, because the reader only sees files a maintainer
   downloaded and pinned. In a browser, it would freeze or crash a tab.
   `fitsBounded.js` walks the headers first and refuses the file before
   anything is allocated. It costs 4.5 KiB together with the reader.
5. **Sesame answers `text/plain`.** A strict XML content-type check would
   refuse a good answer. The check has to be per service.
6. **VizieR TAP sends no `Content-Length`.** A size limit that reads only the
   header passes an answer of any size. The limit has to count bytes as they
   stream.

## Bundle cost

The spike modules were minified as `build.js` minifies them (esbuild,
es2022), in the KiB that `tools/bundle-budget.mjs` counts:

| Piece | Minified | gzip |
|---|---:|---:|
| resolve, discover, VOTable, convert (`archive.js` with `net.js` and `votable.js`) | 9.50 KiB | 4.26 KiB |
| stale-cache policy (`cache.js`) | 0.83 KiB | 0.48 KiB |
| bounded FITS reader (`fitsBounded.js` with `fits.mjs`) | 4.51 KiB | 2.10 KiB |
| all of it | 14.69 KiB | 6.41 KiB |
| Aladin Lite 3.8.2 (`dist/aladin.min.js`, WASM embedded as base64) | **2,335 KiB** | 821 KiB |

The accepted slice (discovery, VOTable, cache) is about 10.3 KiB before its
interface and its strings. With them, estimate 15 KiB. Which ceiling that
lands in depends on where the code lives, and there are three:

| Ceiling | What it counts | On `bb72842` | The slice, in the Observatory behind a click |
|---|---|---|---|
| The application's deferred JavaScript (`tools/bundle-budget.mjs`) | lazy chunks reachable from `js/main.js` only | 4,177.1 of 4,180.0 KB | **nothing**: the Observatory is its own esbuild entry (`build.js`) |
| The `/observatory/` route (`tools/route-budgets.json`) | what a fresh visit downloads | ceilings 97.2 KB (build) and 189.6 KB (sources) | **the button and its strings only**: the panel is a dynamic import |
| The service-worker precache (`sw-manifest.js`) | every file under `js/`, as core | 446 files, 11,637 KB; no ceiling | about 15 KiB, 0.13% |

So the slice fits, on one condition: none of it may leak into the
application's graph or into the Observatory's opening download.

- If the application's deferred total moves, the code leaked into
  `js/main.js`'s graph.
- If the Observatory route moves by more than its button, the panel is not
  lazy, or its strings were put in the catalog the page opens with.

The Prompt 19 slice below makes both of these acceptance criteria. Nothing is
added to the initial download.

The first draft of this section put the slice in the 4,180 KB ceiling with
2.9 KiB to spare, and concluded it did not fit. That was wrong: that ceiling
does not count the Observatory.

Aladin Lite, lazily loaded the same way, would count against neither route.
It would still be 2.3 MB in every reader's offline install, a fifth more than
today, unless a capability package declared it `none`.

## Low-end memory and time

Measured in Chromium with the CPU throttled 4× (DevTools' low-end mobile),
the heap read by CDP after a forced collection, and the load average at 2.4 on
12 cores. Three runs each; the ranges are the spread
([`evidence/memory-chromium.json`](https://github.com/gravitas-sim/gravitas-sim.github.io/blob/6832783/spike/vo/evidence/memory-chromium.json)):

| Case | Parse | Convert | Held after |
|---|---:|---:|---:|
| VOTable at the 2 MB limit (9,407 rows) | 650–692 ms | 70–77 ms | < 0.4 MB JS heap |
| VOTable of 512 KB (2,395 rows) | 158–163 ms | 18–23 ms | < 0.1 MB |
| TESS SPOC light curve, 1.9 MB FITS, bounded read (18,757 rows) | 38–50 ms | n/a | < 0.3 MB |

While a 2 MB answer is parsed, the XML Document costs **25 MB** of renderer
memory. That was measured by renderer RSS with five documents held, because
Blink's heap is not in `JSHeapUsedSize`. It is freed when the rows are read.

`DOMParser` does not exist in a Worker, so a VOTable is parsed on the main
thread. A 2 MB answer would block the page for about 0.7 s on a low-end
device. So production caps a TAP answer at **512 KB**, which blocks for about
160 ms.

Gaia epoch photometry is far below that cap. SU Dra's answer is 13 KB, and a
source with 300 epochs would be about 67 KB (212 bytes a row, 3.5 KB of
header).

## Security and privacy model

| Threat | Control | Evidence |
|---|---|---|
| A hostile answer: XML | `DOMParser` in every engine resolves no external entity: no file read, no request made. Every engine stops a "billion laughs" expansion in 4 to 67 ms. Any DOCTYPE is refused anyway. Only TABLEDATA is read | `evidence/xml-hostile.json`, three engines |
| A hostile answer: FITS | headers bounded before allocation (NAXIS ≤ 999, the NAXISn product ≤ the file, BITPIX one of six values, ≤ 16 units, ≤ 100 header blocks) | `fits.test.mjs`, and the NAXIS measurement above |
| A large answer | byte limits counted while streaming (Sesame 64 KB, TAP 512 KB), a 20 s timeout, `MAXREC` on every query, `OVERFLOW` surfaced | tests |
| A moved or subverted service | an origin allowlist, checked before the request and after redirects. Also a meta **Content-Security-Policy** `connect-src` naming the same origins: GitHub Pages sets no headers, but all three engines honor a meta `connect-src`. They refused SIMBAD and MAST S3 (both CORS-open, neither listed) with a `connect-src` violation, and let the listed services through | `evidence/csp-engines.json` |
| Injection into ADQL | a query is built from numbers Sesame returned and from a source id matching `^\d{1,20}$`. The reader's text goes only to Sesame, URL-encoded | `a Gaia source id is digits, or no query is sent` |
| A plausible but wrong answer | the curated descriptor pins fields and units, and a stated unit that disagrees stops the conversion. The observation keeps the query and both checksums | `mixed units` |
| Stale data presented as current | the retrieval time is on every observation. A cached answer says how old it is. A changed answer is a different id, so a figure made from the old one still names the old one | cache tests |
| Leaking the reader's context | `credentials: 'omit'` and `referrerPolicy: 'no-referrer'` on every request. A Gravitas URL can carry an assignment code, and no referrer means it never reaches CDS | `every request omits credentials and the referrer` |
| Third-party code | none. Every script is Gravitas's own, served from its origin, and no inline script: the CSP above forbids that too, and the spike's own probe had to move its script out to run | `probe-csp.html` |

**What leaves the reader's browser, and only after they press the button:**

- the name they typed, sent to CDS Sesame;
- the position Sesame returned, and then a Gaia source id, sent to CDS VizieR.

CDS is in Strasbourg. Like any server, it sees the reader's IP address and
browser. The page says so, and names CDS, before the button. Nothing is sent to
Gravitas, which has no server to send it to. The cache is the reader's own
IndexedDB.

**Licensing.** Gaia DR3 data are CC BY-NC 3.0 IGO, credited to ESA/Gaia/DPAC.

- The reader's browser fetches the data from CDS for the reader's own use.
  Gravitas does not redistribute it.
- The license, credit and citation travel inside the observation, and into
  every figure and export made from it.
- The curated catalog's license allowlist (`tools/catalog.mjs`) does not
  accept NC terms, so an import can never become a catalog pack. That is
  deliberate.
- The two fixtures on the spike branch are 14.6 KB of CDS answers, kept for
  tests. They carry the same terms.

**Offline.**

- No lesson and no built-in dataset reads any of this. `build.js` names
  nothing in `spike/`, and `tests/spikeNotShipped.test.js` (5 tests, passing
  on the spike branch) says so.
- A live import needs the network, and says so when it fails.
- A cached answer is offered offline as stale, with its date.

## The verdicts, and what would reverse them

**Discovery: B.** CDS answers a page, and the full workflow works in three
engines with every failure named. B, not A, because:

- only one data center is reachable;
- each table needs a curated descriptor to be converted honestly.

It would become **C** if CDS stops sending CORS headers, if the live contract
test in Prompt 19 fails, or if the import cannot be kept out of the
Observatory's opening download. It
would move toward **A** if MAST's TAP or the ESA Gaia archive opens CORS.
Re-run `probe.html` to check.

**Direct download: C.** The only open product host is reachable only by a
page that already knows the key, and nothing a page can reach tells it the
key. Fetching curated keys live would add a network dependency to what a
committed pack already does offline. **The alternative** is the existing
build-time packs.

This reverses to **B** if MAST's TAP/ObsCore, or its Download API's redirect,
starts sending a CORS header. Then discovery-to-product becomes a chain a page
can follow.

**FITS from the network: C.** It follows from direct download.

The earlier gate's **B** for a browser import of a light curve the reader
downloaded themselves still stands. That route has no CORS problem, because
the reader's own navigation fetched the file. It now carries three
preconditions from this gate:

- header bounds before allocation (finding 4);
- a byte limit;
- `TZERO` handled, which Prompt 17 did.

**VOTable: B.** TABLEDATA only, strict, main thread, a 512 KB cap. It would
become **A** (all serializations, larger answers) only with a Worker-side
parser, which a demonstrated need for answers over 512 KB would have to
justify first.

**Sky view: C.** Aladin Lite is the established component, maintained by
CDS. But:

- it is 2,335 KiB, 821 gzipped. It is lazy-loadable, but it would be a fifth
  more on every reader's offline install unless it were kept out of it;
- its license is not settled. The 3.8.2 package's `LICENSE` file is the
  LGPL-3.0, while its `package.json` declares `GPL-3`. Bundling it would
  mean settling which one applies first;
- loading it from a CDN would run third-party code with the page's
  privileges;
- every pan sends tile requests to CDS HiPS servers.

**The alternative** is a plain link to Aladin Lite at CDS with the target's
coordinates, for example
`https://aladin.cds.unistra.fr/AladinLite/?target=174.48586%20%2B67.32974&fov=0.2`.
It costs zero bytes and runs no third-party code, and the reader chooses to go.

This reverses only if a lesson needs a sky view inside Gravitas, the
license is settled, and Carl decides the weight and the tile traffic are
worth it. Writing a sky atlas is out of scope, as the prompt says.

## What Prompt 19 builds from this

Prompt 19's roadmap text applies unchanged. This is the slice it implements,
the "named archive, protocol and file formats accepted by the gate":

```text
PROMPT 19 SLICE (from VO_ARCHIVE_GATE.md): CDS discovery and VOTable import

Accepted: CDS Sesame (name to position) and CDS VizieR TAP (ADQL, synchronous,
FORMAT=votable, TABLEDATA only), for ONE curated table: Gaia DR3 epoch
photometry, I/355/gaiadr3 for the cone and I/355/epphot for the epochs. Nothing
else: no SIMBAD, no other VizieR table, no FITS from the network, no products,
no sky view.

Budget, as acceptance criteria: the import code and its strings load only
when the reader asks for the import (an e2e test counts the requests before
and after the click); the application's deferred total does not move; the
/observatory/ route ceilings hold, with the button as the only addition. No
ceiling is raised. If any of these fails, STOP and report the measurement.

Where: an "Import from an archive" action in the Observatory, lazy-loaded
behind the reader's click, never on a lesson route. It opens to a disclosure
naming CDS and what will be sent, before anything is sent.

Requests (one shared module): origin allowlist https://cds.unistra.fr and
https://tapvizier.cds.unistra.fr, checked before the request and at the final
URL; a meta Content-Security-Policy with the same connect-src on the page that
hosts the action; credentials 'omit', referrerPolicy 'no-referrer'; byte
limits counted while streaming (Sesame 64 KB, TAP 512 KB); 20 s timeout;
MAXREC on every query (5 for the cone, 2000 for epochs); content type checked
per service (Sesame answers text/plain). Errors by code: blocked (naming both
CORS and no network), timeout, rateLimited (with Retry-After), unavailable,
refused, tooLarge, wrongType, offList.

Queries: ADQL built only from Sesame's numbers and a source id matching
^\d{1,20}$. The reader's text goes only to Sesame, URL-encoded.

Parsing: TABLEDATA only; refuse any DOCTYPE, QUERY_STATUS=ERROR (with the
service's text), BINARY/BINARY2/FITS, a row of the wrong width; keep a long as
its digits; OVERFLOW surfaced in the review and in the observation.

Conversion: a curated, cited descriptor for I/355/epphot. Times TimeG/BP/RP +
2455197.5, BJD in TCB, converted to TDB by IAU 2006 B3 and recorded. G errors
1.0857 x e_FG/FG with FG, e_FG in e-/s from the data model. A unit the service
states that disagrees stops the conversion. Output a gravitas.observation/1
that validateObservation accepts: origin 'observed', source.kind 'import',
object with frame ICRS, license CC BY-NC 3.0 IGO, credit ESA/Gaia/DPAC via CDS
VizieR, the DR3 citation, and source.retrieval {url, finalUrl, bytes, sha256,
contentSha256, rows, overflow}; the id carries the content digest, not the
bytes' checksum.

Review before import (accessible): the resolved position and resolver, the
candidate sources, every field with its unit or "not stated", the row count,
the status, both checksums, the license and the reductions, and a plot; the
reader imports or cancels. Keyboard and screen-reader operable; strings in
en and es.

Cache: IndexedDB, keyed by query; fresh for 7 days; stale answers offered
only with their age and the reason; changed-by-content answers flagged.
Lessons never read it.

Tests: mocked contract tests for every failure above; a live-sandbox contract
test against CDS that is not in the default gate (the network is not a test
dependency) but runs on demand and records its date; malicious-input and
resource-limit tests; the Observatory round trip (validate, export, read);
offline behavior; measured route and bundle cost. Run the full gate once and
open the PR with the exact services, table, versions and fallback behavior.
```

## Findings to act on, outside this gate

- **Harden `tools/data-packs/fits.mjs` headers** (finding 4). It is not
  urgent while the reader only sees pinned maintainer downloads, but it must
  land before any browser reads a FITS file. The checks and tests are in
  `spike/vo/fitsBounded.js` and `spike/vo/test/fits.test.mjs`.
- **Offer the link-out.** A "View this position in Aladin Lite at CDS" link on
  an observation with coordinates is zero bytes and needs no gate. It could
  ride along with any Observatory change.

## Downloads made for this gate

| File | Source | Bytes | SHA-256 | Kept |
|---|---|---:|---|---|
| `fixtures/sesame-su-dra.xml` | CDS Sesame, `SU Dra` | 1,179 | `8d9a7ff5adecf8dbba317b0493ac702c35ecd570fc1550caacae65199e623981` | spike branch |
| `fixtures/gaia-epphot-su-dra.vot` | VizieR TAP, `I/355/epphot`, Source 1058066262817534336, 2026-09-26 04:40 UTC | 13,431 | `9020b015e2c8d2a89c720a7ebf2efc9c5f939216d18b11949d295a38780c4930` (content `eaaa345e…da6f`) | spike branch |
| `aladin.min.js`, Aladin Lite 3.8.2 | jsDelivr | 2,390,952 | `6152005667eaf28ca70bc6fefc40d7d44a342683f09707e7a9f0e931d19ed4cd` | measured, not committed |
| TESS sector 15 light curve of SU Dra | MAST, already cached for Prompt 17 | 1,906,560 | `feea6b25…e4a0` | reused, not committed |

The probes made one small request to each service in the CORS table, and the
live runs repeated the SU Dra workflow in three engines. Nothing from those
was kept except the measurements under `spike/vo/evidence/`.

## How to reproduce

On the spike branch, after `npm ci`:

```bash
node --test spike/vo/test/*.test.mjs
```

```bash
node spike/vo/measure/bundle.mjs
```

```bash
node spike/vo/measure/xml-hostile.mjs
```

```bash
GRAVITAS_PACKS_CACHE=/path/to/cache node spike/vo/measure/memory.mjs
```

The live probes need `python3 -m http.server 4291 --bind 127.0.0.1` at the
repository root; then open `spike/vo/probe.html` or `demo.html`, or run
`node spike/vo/measure/csp-engines.mjs` and
`node spike/vo/measure/live-engines.mjs`. `spike/vo/README.md` lists every
file.
