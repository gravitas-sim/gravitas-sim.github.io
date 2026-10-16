# Importing from an archive

The Observatory can fetch one kind of real data live, in the reader's own
browser: a star's **Gaia DR3 epoch photometry**, found by name at **CDS**
(Strasbourg). It is the one live-data path in Gravitas, and it is deliberately
narrow. [VO_ARCHIVE_GATE.md](VO_ARCHIVE_GATE.md) is the decision behind it and
the evidence for each limit below.

Nothing here touches a lesson. Lessons read curated data packs, which are part
of the site and work offline ([DATA_PACKS.md](DATA_PACKS.md)). The import is an
opt-in panel in the Observatory, "Or find a star's Gaia epochs at CDS (live,
opt-in)". Its code loads only when a reader opens it.

## What it does

1. **A name.** The reader types a name, and nothing is sent until they press
   Find. Then the name goes to CDS **Sesame**, which answers with a position
   (it asks SIMBAD, NED and VizieR).
2. **The Gaia DR3 sources there,** within 2″, from CDS **VizieR TAP**
   (`I/355/gaiadr3`), brightest first, with Gaia's variability flag. The query
   is built from Sesame's numbers, never from the reader's text. There is also
   a plain link to the same position in Aladin Lite at CDS. It opens their
   site in a new tab, and costs this page nothing.
3. **Its epoch photometry,** from VizieR TAP (`I/355/epphot`), reviewed before
   it is used. The review shows:
   - every field, with its unit or "not stated", its UCD and its description;
   - the row count, the service's status, the size, and when it was
     retrieved;
   - the SHA-256 of the bytes and of the table's content;
   - the license, and what the conversion will do;
   - a plot.
4. **Open** hands a `gravitas.observation/1` to the workspace, in the G, BP
   or RP band. From there it is like any other observation: select, mask,
   fold, save.

## Exactly what is supported

| | |
|---|---|
| Services | CDS Sesame (`https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV`) and CDS VizieR TAP (`https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync`), synchronous ADQL, `FORMAT=votable` |
| Versions seen when this was built (2026-09-26) | VizieR TAP answered as `TAPVizieR-Vollt/1.1.3`, TAP 1.1, VOTable 1.3; Sesame 4.x |
| Tables | `I/355/gaiadr3` (the cone) and `I/355/epphot` (the epochs): Gaia DR3 only |
| Serialization | VOTable TABLEDATA only. BINARY, BINARY2 and FITS are refused by name |
| Anything else | not supported: no SIMBAD, no other VizieR table, no MAST, no FITS from the network, no products, no sky view. Each would need its own curated descriptor and its own review |

## The request policy

All of it is in `js/archive/cds.js` and `js/archive/net.js`:

- **Two origins,** `https://cds.unistra.fr` and
  `https://tapvizier.cds.unistra.fr`. The list is checked before each request
  and again where a redirect ended. The Observatory's meta
  Content-Security-Policy (`connect-src`) names the same two, so the browser
  refuses anything else whatever the code does. `tests/archive.test.js` holds
  the two lists equal.
- **No cookie and no referrer** on any request (`credentials: 'omit'`,
  `referrerPolicy: 'no-referrer'`).
- **Limits:**
  - Sesame's answer may be 64 KB and a TAP answer 512 KB, counted as the
    bytes stream in: VizieR sends no `Content-Length`.
  - Every request has 20 s.
  - The cone asks for 5 rows and the epochs for 2,000.
  - The cap on a TAP answer exists because a VOTable is parsed on the main
    thread (`DOMParser` does not exist in a Worker): 512 KB is about 160 ms
    on a low-end device. SU Dra's answer is 13 KB.
- **Parsing is strict** (`js/archive/votable.js`). The parser refuses:
  - a DOCTYPE;
  - a service error inside a 200 (with the service's words);
  - a row of the wrong width;
  - more or fewer than one table.

  A `long` keeps its digits, because a Gaia source id rounded by `Number()`
  is another star. A number the datatype cannot hold is missing, never zero.

## Every failure, and what the reader sees

| Code | When | The reader is told |
|---|---|---|
| `blocked` | the browser could not reach CDS | either the service no longer allows this site, or the network is down; a page cannot tell which |
| `timeout` | no answer in 20 s | so |
| `rateLimited` | HTTP 429 | to try again after the service's Retry-After, **if CDS exposes it**: a page on another origin sees only the CORS-safelisted headers, so otherwise "in a minute" |
| `unavailable`, `refused` | HTTP 5xx, other 4xx | the status |
| `tooLarge` | over the byte limit | the limit |
| `wrongType` | not a table | so |
| `offList` | a request or redirect off the list | where it went |
| `serviceError`, `votable` | VizieR's error, or an answer that is not a readable table | the service's words, or so |
| `units` | a unit the service states that the descriptor does not expect | which field, which unit, which was expected: nothing is converted |
| `canceled` | the reader pressed Cancel | Canceled |

## What the observation carries

`js/archive/gaiaEpochs.js` converts with a **curated descriptor**, because
VizieR's own metadata is not enough to convert Gaia honestly:

- **Times:** VizieR says `TimeG` is `JD-2455197.5`. Gaia's data model says it
  is barycentric JD in **TCB** minus 2 455 197.5. So times are that plus
  2455197.5, converted to **TDB** by IAU 2006 Resolution B3. The difference is
  about 19 s in DR3's window.
- **Errors:** VizieR gives `FG` and `e_FG` no unit. The data model says e⁻/s.
  So the G errors are 1.0857 × `e_FG`/`FG`. BP and RP have no errors in this
  table, and the observation says so.
- **Units:** a unit the service does state must agree with the descriptor, or
  the conversion stops.
- **Provenance:** `source.retrieval` holds the query URL, the final URL, the
  byte count and both SHA-256s, the row count and whether the service stopped
  at its row limit. It survives a save and a read-back.
  - The content digest, not the bytes' checksum, is the observation's
    identity. It is in its id. VizieR stamps every answer with the time it
    was asked, so the same rows come back as different bytes.
  - `retrieved` is when the bytes came from CDS, which for a cached answer is
    not now.
- **Credit:** ESA/Gaia/DPAC, served by CDS VizieR, with the DR3 citation.
- **License:** **CC BY-NC 3.0 IGO.** The reader's browser fetches the data
  for the reader's own use; Gravitas does not redistribute it, and the license
  travels in every save and figure made from it. The curated catalog does not
  accept NC terms, so an import can never become a catalog pack.

A magnitude axis is drawn brighter-up, as astronomers draw it.

## Offline, and old answers

Each answer is kept in the reader's own IndexedDB (`gravitas-archive`), by its
query:

- **A fresh answer** (under a week old) is used as it is, and the review says
  it came from this device.
- **An old answer** is asked for again. If CDS cannot be reached, the old one
  is offered **as stale**, with its age and the reason. So a star imported
  before can be opened offline.
- **A changed answer** is a different observation, and the review says so.
  "Changed" means the content changed, not the bytes.

Nothing in the cache leaves the device, and no lesson reads it.

## Privacy

After the reader presses Find, these are sent:

- the name they typed, to CDS Sesame;
- the position Sesame returned, and then a Gaia source id, to CDS VizieR.

CDS sees the reader's IP address and browser, as any server does, and the
panel says so, and names CDS, before the button. Nothing is sent to Gravitas,
which has no server. The panel's own link to Aladin Lite leaves the site only
when the reader follows it.

## Checking CDS still answers this way

```bash
npm run archive:live
```

This asks CDS the same three questions once, with Gravitas's own Origin, and
checks four things:

- that Sesame puts SU Dra where the saved answer does;
- that the cone finds its Gaia DR3 source;
- that its epoch photometry has the saved answer's content digest (DR3 is
  frozen, so a different digest is a real change) and still converts;
- that both services still send `Access-Control-Allow-Origin`.

It is not part of the gate, because the network is not a test dependency.
`tests/archive.test.js` and `e2e/archive.spec.js` hold every contract against
the saved answers in `tests/fixtures/archive/`. Run it when something looks
wrong, and before relying on the import for a class.
