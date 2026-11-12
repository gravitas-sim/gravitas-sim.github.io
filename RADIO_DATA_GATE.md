# The radio data-rights gate

Roadmap III, Prompt 239. A gate on data rights, not on physics: for each radio source Prompt 240 would pack, it
records the terms as read, the basis accepted or none, the transformation and the attribution, the lessons that
depend on it, and a verdict A, B or C. **Nothing is shipped here, nothing is fetched for shipping, and no basis is
inherited from another source.** The record will be one decision-register row per source and per redistribution
form (the rows land in Phase 2, with the verdicts).

This file is written in two commits. **This one (Phase 1) fixes the accepted bases, the decision rules, the
candidates and the evidence to collect, before any source page has been read.** No licence term, no page content
and no published number appears in it; every one that will appear is quoted, in Phase 2, from a file Carl retrieved
and whose SHA-256 is recorded. The second commit adds the readings, the verdict table and the register rows.

## 1. What is decided, and what it releases

| Verdict | Meaning (7.5.3, 7.5.4) | Releases |
| --- | --- | --- |
| **A** | The source, in the stated form, ships under an accepted basis (section 2) | Prompt 240 packs it, on 157's contract, with its rights row |
| **B** | The intended product does not pass, and an **alternative product** does: a different survey or host, a public-domain product of the same kind, or a reduced form with its own decision. The alternative is read under the same rules and has its own row | 240 packs the alternative only, under its own row |
| **C** | Nothing of the source ships | 241 or 242 builds a labelled synthetic generator with a truth manifest, and that is the pack |

A B is never "fewer rows" or "a smaller subset" of the same product under the same unread terms. A verdict binds
only the product, version and form it names.

Run condition (checked in Phase 1): 232 CONTINUE AS PLANNED (D-R10-232-01, merged to `v3` as 57b65157, DELEGATED);
157's kinds (`image`, `image-sequence`, `grid`) landed (#399, DATA_PACKS.md "Image, image-sequence and grid
kinds"); no other branch or PR for 239 exists. The base is `v3` 0cff54ad, CI green on that push.

## 2. The accepted bases (committed first)

A source passes only on one of these. The right-hand column is what the data-pack tooling already has; a basis with
no mechanism is not usable by a gate verdict, because adding one is a schema and register decision that belongs to
Carl.

| Basis | Pack `license.status` (closed list, `tools/data-packs/schema.mjs`) | Accepted when |
| --- | --- | --- |
| Public domain | `public-domain` (or `cc0`) | The page states the product is a work of a government or mission with no copyright (NASA mission data), or is dedicated to the public domain (CC0). Public domain attaches to the producer: a third party's data on a NASA host, or a mirror of someone else's table, go by the third party's terms |
| CC BY | `cc-by-4.0` | The page or the file states CC BY **4.0**. Another CC BY version has no status in the closed list, so it is not accepted by this gate; it is recorded as "basis accepted, no status", and 240 does not pack it until Carl decides |
| CC BY-SA | none | **No labelled mechanism exists.** Not accepted; recorded as C for that source unless an alternative passes |
| Non-commercial | `cc-by-nc-3.0-igo` only | The one existing mechanism is the Gaia exception (D-RAD-01, D-GAIA-01): `license.nonCommercial: true`, labelled where shown, a pack of its own, removable, never a contributed-package licence. A radio source under any other NC licence has no mechanism and is not accepted |
| "No licence stated, credited" | `no-license-stated` (and `attribution-requested` where a page asks to be cited) | Only as **its own recorded decision for that source and form**, on the evidence in rule 4, never inherited from D-SKY-02, D-RIGHTS-04 or from the practice of crediting CDS tables |
| Anything else (restricted, registration or permission required, "contact before publication", no derivatives, field-of-use limits) | `restricted`, or none | Never accepted |

## 3. The decision rules (committed before any source is read)

1. **Identify the product.** A verdict names the exact product and version: the host's release string, the DOI or
   catalogue identifier, the file names, their sizes and any published checksums. If the retrieved evidence does not
   pin a version, the source cannot be A or B.
2. **Read every layer, and the strictest governs.** The data host's terms or licence page; the dataset's own page,
   README or release statement and any licence keyword in a file header; the journal's licence line for the paper when
   a table or the description comes from it; and, for a mirror, both the mirror and the original. A statement on any
   layer that restricts redistribution fails the basis, whatever the others say. A mirror's terms never replace the
   original's.
3. **A requires all of:** an accepted basis (section 2) stated by a page that was read; the stated terms permit
   redistributing a derived, reduced subset from a static site, cached for offline use, with attribution; no
   condition Gravitas cannot meet (registration, a permission request, notification of use, an embargo, no
   derivatives, a field-of-use limit other than the labelled mechanism of section 2); the product identified (rule 1);
   the quoted sentences, the retrieval date and the file hash recorded.
4. **"No licence stated, credited" needs this evidence, per source and form:** every layer of rule 2 read and
   silent on redistribution, with the locations listed (host terms page, dataset page, README, repository licence
   file where one exists, file header, journal licence line); the citation or acknowledgement request quoted exactly;
   a recommendation that the credit, the retrieval date and the transformation ship in the manifest; the statement that
   this is an acceptance of a risk by decision and not a licence. Any restriction anywhere removes the basis.
5. **Unread is C.** A page that could not be retrieved, is unreadable, is a script shell with no text, or contradicts
   another layer without the strictest reading being clear, counts as not read. The source is C, as D-LENS-01 and
   D-CALIB-01 were; nothing is assumed and no term is supplied from memory.
6. **B is a second source, fully read.** The alternative appears as its own row, passes rules 1 to 5, and must carry
   what the lesson needs (rule 8). The primary's row says C and points to the alternative's row.
7. **One row per source and per form.** Forms are separate decisions: a pass for a folded profile does not license a
   dynamic spectrum; a pass for a single cited number does not license the table; a pass for the reduced spectra does
   not license the raw cubes. A transformation (thinning, resampling, unit conversion, cropping, binning) does not
   change the terms of what it transforms; the manifest carries the credit and the statement that the data were
   changed.
8. **Scientific fit is checked, and it is not a rights argument.** An A or B product must carry the facts Prompt 240's
   sidecar needs, or the lesson it serves is C: for HI, the velocity frame and the solar-motion convention behind it
   (LSR), the beam, the channel width and velocity coverage, the brightness unit, and coverage of sightlines inside the
   solar circle near the plane (tangent points exist only there); for a dynamic spectrum, the channel frequencies, the
   sample time, the time scale, the frequency reference and the observing epoch; for a catalog, the version, the
   period and dispersion-measure columns with their units and a reference per row. A candidate that lacks a fact is
   recorded with the lack. Size, convenience and consistency with earlier rows decide nothing.
9. **Retrieval.** The session does not fetch. Carl retrieves the pages and evidence files into
   a scratch directory outside every repository; the record states that, with the
   retrieval date from his `retrieved.tsv` and each file's SHA-256. Only short quotations and hashes enter the
   repository, never the files. A page changed since retrieval is not re-read from memory.
10. **Fallback is stated per dataset before the verdict**, so a C is never improvised (section 5).

## 4. The candidates, the exact product each would be, and the form

"Exact product and version" is recorded from the retrieved evidence in Phase 2; a version string is never written
here from memory. The names below are the roadmap's.

| Dataset need | Candidate (form) | Product to be pinned | 240 would pack | Lessons that depend on it |
| --- | --- | --- | --- | --- |
| H1 Galactic HI spectra along a fixed set of longitudes | LAB, through CDS (H1a); HI4PI (H1b); GALFA-HI (H1c, covers only the sky Arecibo reached, so its coverage of the inner Galaxy is checked under rule 8 first) | the survey's release and the host's file or table identifiers | a `grid` (longitude by velocity), LSR frame, beam and longitude mask in the sidecar | 241: "The hydrogen line", "The rotation curve from scratch" |
| H2 an independent published tangent-velocity set for the same survey cut (241's validation oracle) | a published paper's table (H2a) | the paper, its table and its journal licence line | a pinned fixture, not a lesson dataset | 241's validation leg (b) |
| P1 a pulsar's folded profile at one or more frequencies | the EPN database (P1a); NASA NICER or Fermi pulsar products (P1b, public-domain candidates; no dispersion information in the high-energy bands) | the pulsar, the profile files or product identifiers, the observing frequency | a table or a short series of profile samples | 242: "A lighthouse in radio" (the fold) |
| P2 a dispersed pulse series with frequency resolution (the dynamic spectrum) | CSIRO's data access portal (P2a, Parkes observations); alternatives for Phase 2 if it fails: Breakthrough Listen open data (P2b), NANOGrav data on Zenodo (P2c) | the collection, DOI or record, the file names and sizes, one observation | an `image-sequence` (frequency by time) cut to a bounded size | 242: "A lighthouse in radio" (de-dispersion, the DM) |
| P3 a catalog dispersion measure and period for the pulsar the series shows | the same catalog as K1, or the discovery or timing paper's value | as K1 | a cited number in the manifest | 242 validation leg (e) |
| K1 a pulsar catalog's periods and dispersion measures | the ATNF Pulsar Catalogue (K1a); the Fermi LAT third pulsar catalog through NASA (K1b, public-domain candidate; the columns it carries are checked under rule 8); a published paper's table (K1c) | the catalogue version (its own version string), the columns used | a `catalog` table of a bounded subset | 242: the crude DM distance, the validation legs |

NASA's NICER and Fermi products serve folding only; they cannot carry a dispersion sweep. A public-domain alternative
for P2 therefore does not exist among the roadmap's candidates, which is why P2b and P2c are on the fetch list
beside P2a.

## 5. The fallback per dataset (stated before any verdict)

| Dataset | If every candidate is C |
| --- | --- |
| H1 | 241's synthetic HI spectrum generator (a stated rotation curve and disk model) is the pack, labelled synthetic, with its truth manifest; the "authentic" leg of 241's validation contract is recorded NOT RUN; the existing `milky-way-rotation-curve` pack is unchanged |
| H2 | 241's validation leg (b) is recorded NOT RUN or uses an analytic oracle stated by 241; no tangent-velocity number is typed from memory |
| P1 | 242's synthetic folded profile from its generator, labelled; or a NICER or Fermi folded profile if that product passes as its own B |
| P2 | 242's synthetic dispersed series, labelled, with its truth DM and period |
| P3, K1 | 242's synthetic pulsar parameters, or a catalog subset that passes as its own B; the leg (e) of 242 is NOT RUN for an authentic pulsar |

## 6. What each record will say (the evidence required per source and form)

Product, version, form; host and page titles; retrieval date and tool (Carl's `retrieved.tsv`); each file's name and
SHA-256; the exact sentences on use, redistribution, derivatives, citation and acknowledgement; the licence name,
version and text location if any; every layer of rule 2 with "silent" or "states" for each; the conflicts between
layers; the basis accepted or none; the transformation and the attribution string 240 would carry; the affected
lessons; the fallback; the verdict; the facts of rule 8 present or absent; the register row.

## 7. Register rows planned

One row per source and form (`D-R10-239-01` onward, in the order of the verdict table, each DELEGATED and pending
Carl's ratification, each citing the exact pages by retrieval date), and `D-R10-239-90` for the gate: the verdict
table, the rules of section 3 as committed, and the statement that nothing shipped.

## 8. Status of this file

Phase 1 (commit 521a772b): bases, rules, candidates, fallbacks and the evidence list, committed before any source was
read. Phase 2 (this commit): the readings (section 9), the verdict table (section 10), the consequences for 240 to
242 (section 11) and what would convert a C that is only a lack of evidence (section 12). Sections 1 to 7 are
unchanged. **Nothing ships from this prompt.** The verdicts rest on terms pages only: no data body and no file header
was retrieved, so every rule 8 fact (velocity frame, beam, channel frequencies, columns) is unverified for every
source, and the identification of an exact product (rule 1) is complete for one source only. The eleven C
verdicts that rest only on lack of evidence are not final declines: they reopen as a re-gate under these same rules
when the pages of section 12 are retrieved (section 10.0).

## 9. The readings

### 9.1 Retrieval and integrity

Carl's main session retrieved every page with curl between 2026-11-04T00:55Z and 00:59Z (the evening of 2026-11-03
local time) and wrote `retrieved.tsv` (URL, UTC time, HTTP status, final URL, file, SHA-256). This session fetched
nothing. It re-hashed the saved files: every file below matches its SHA-256 in the table. Pages were turned into text
for reading only; quotations are from the saved HTML or JSON. CDS and VizieR were unreachable (timeouts on every
attempt), so no CDS page exists for HI4PI or LAB; three further requests returned an error or a 404 and are listed
at the end of the table. `h2a-tangent/ads-anything.txt` is the HI4PI arXiv page again (same hash), not a source.

| File (under the scratch directory) | URL as requested | UTC | HTTP | SHA-256 |
| --- | --- | --- | --- | --- |
| `p1a-epn/epn-home.html` | http://www.epta.eu.org/epndb/ | 2026-11-04T00:58:30Z | 200 | `a5ce16c990e87f38bc6bbd523747310abac032122dffe04cb341494cee55144f` |
| `p2a-csiro/dap-atnf.html` | https://data.csiro.au/domain/atnf | 2026-11-04T00:58:33Z | 200 | `bccac225f87233bfec05f604f57b6f466e309abb228a3fb3e7f6821da472994c` |
| `k1a-atnf/psrcat-main.html` | https://www.atnf.csiro.au/research/pulsar/psrcat/ | 2026-11-04T00:58:33Z | 200 | `1f288f45f35c279b73eccfba45a1fa70bcf0e14e2531512f64df4743d6ea21b0` |
| `k1b-3pc/fssc.html` | https://fermi.gsfc.nasa.gov/ssc/ | 2026-11-04T00:58:36Z | 200 | `eb9ae1963f9de27ac23bef2bd4628f5e790fbd64bcc3778944d321eb8a484704` |
| `k1b-3pc/heasarc-home.html` | https://heasarc.gsfc.nasa.gov/ | 2026-11-04T00:58:36Z | 200 | `f4d868e2bd875bbcb8098cb1c8bed9c485aa6c6a1e891c89643d5db1f6900660` |
| `h1c-galfa/galfa-site.html` | https://sites.google.com/site/galfahi/ | 2026-11-04T00:58:37Z | 200 | `6df3b9d3dab8ea261705d2922e70f8f7fab9c91e803a3eceda265aba1330a4d0` |
| `p2c-nanograv/nanograv-data.html` | https://nanograv.org/science/data | 2026-11-04T00:58:37Z | 200 | `69a6987106a1cc08741182a830828f4cfaa4f8953dec8bbf13211d471332d348` |
| `h1b-hi4pi/arxiv-abs.html` | https://arxiv.org/abs/1610.06175 | 2026-11-04T00:59:02Z | 200 | `f927c3eae3451be19c8aca5a2b5645b093d142d21ee628164e23536a1514245f` |
| `k1b-3pc/arxiv-abs.html` | https://arxiv.org/abs/2307.11132 | 2026-11-04T00:59:02Z | 200 | `df89bce42530dfcf663556de16e8b291e1f279bfd793310f17020bc27d893cb0` |
| `h1a-lab/arxiv-abs.html` | https://arxiv.org/abs/astro-ph/0504140 | 2026-11-04T00:59:02Z | 200 | `c34b6548b2ff6ea25845634edb55da23c1b51b6ae82171b115453f64f51bdc59` |
| `h1b-hi4pi/lambda.html` | https://lambda.gsfc.nasa.gov/product/foreground/fg_hi4pi_info.html | 2026-11-04T00:59:02Z | 200 | `55088db8a06c890ed4a801154890e45f42d4b7f15227a645a3d37420b0511f9b` |
| `k1b-3pc/fssc-3pc.html` | https://fermi.gsfc.nasa.gov/ssc/data/access/lat/3rd_PSR_catalog/ | 2026-11-04T00:59:02Z | 200 | `68b3b8a36c11b04ddc815d10d6c7cee84bed14f31d8bd2e4ca162c114176ed23` |
| `p1a-epn/about.html` | https://psrweb.jb.man.ac.uk/epndb/about.html | 2026-11-04T00:59:02Z | 200 | `e6ca95c121d8122afa801dc31989b4015fb2cd5d7773e093695af7dc62ca256e` |
| `p2b-bl/bl.html` | https://breakthroughinitiatives.org/opendatasearch | 2026-11-04T00:59:02Z | 200 | `6d2596a676d593b08ad9d4f6a89b40618508b2582994a12ea07fc2fae4675653` |
| `p2c-nanograv/zenodo.json` | https://zenodo.org/api/records?q=NANOGrav%2015-year%20data%20set&size=5 | 2026-11-04T00:59:02Z | 200 | `794cfbf837704ef00cd9057cc92ecc6abc939ef6bcf16390eb35e27b12620d37` |
| `k1a-atnf/download.html` | https://www.atnf.csiro.au/research/pulsar/psrcat/download.html | 2026-11-04T00:59:02Z | 200 | `3b82ba38d7abfec7271ee52bfa34a3f23105cc82693dd9617d4514f7ec3d912d` |
| `h1a-lab/bonn.html` | https://www.astro.uni-bonn.de/en/radio-astronomy/lab-survey | 2026-11-04T00:59:02Z | 404 | `b00021a7f3b1bc3b76da078f790cd21421f0e3069f28c738983d4b065cac3834` |
| `k1b-3pc/nasa-policy.html` | https://www.nasa.gov/nasa-brand-center/images-and-media/ | 2026-11-04T00:59:23Z | 200 | `c549db11c350f5979e111146625090cd2f2024d02a7dbea721c0c232fc394eec` |
| `h1c-galfa/galfa-dr2.html` | https://sites.google.com/site/galfahi/data | 2026-11-04T00:59:23Z | 200 | `4fd4efdd9ef0d3c254206a2d477e0f8d79e3d814bcde6e018ef5d383eccb7bab` |
| `h1a-lab/lambda.html` | https://lambda.gsfc.nasa.gov/product/foreground/fg_lab_info.html | 2026-11-04T00:59:23Z | 404 | `446f9593b1461425519383d688d96f7106e7063147c37ead4825e36c050907ca` |
| `k1b-3pc/fssc-data-policy.html` | https://fermi.gsfc.nasa.gov/ssc/data/policy/ | 2026-11-04T00:59:23Z | 200 | `e40afb24fd6ac561ddd41df95760884abc1d93e34cad6d8dfff139a215c923ca` |
| `k1b-3pc/heasarc-policy.html` | https://heasarc.gsfc.nasa.gov/docs/heasarc/policy.html | 2026-11-04T00:59:23Z | 404 | `80b325528b11e9481bd99d0519493e90f566d83a192296779f0cbd548f7f787a` |
| `p1a-epn/epn-help.html` | https://psrweb.jb.man.ac.uk/epndb/help.html | 2026-11-04T00:59:23Z | 200 | `322a34615494c3d0a50470ea05f333f156b379d7c8bf5f87fef986b81609b38f` |
| `p2c-nanograv/zenodo-16051178.json` | https://zenodo.org/api/records/16051178 | 2026-11-04T00:59:23Z | 200 | `e16b9463bdbecf46d86a6d7cb790163f160466f3c5258bba1ba329e6dfea764a` |
| `k1a-atnf/csiro-copyright-real.html` | https://www.csiro.au/en/about/Policies/Legal/Copyright | 2026-11-04T00:59:30Z | 200 | `ee9dfe8d2e1e23762eabb2092a024914f155323ea9b14cfce605cae4b7a44cf1` |

Not retrieved or not saved: CDS J/A+A/594/A116 and VIII/76 and the VizieR licence page (timeout); the Bonn HI4PI page
(error); the CSIRO copyright and legal-notice addresses first tried (404; the pages were not kept, and the CSIRO
Legal Notice and Disclaimer that the ATNF page names was therefore never read); the CSIRO Data Access Portal
returned a script shell with no terms (the saved page's text is the portal's title only); nothing was fetched for
NICER, for the HI tangent-velocity table or for a published pulsar table.

### 9.2 What each page says, source by source

The retrieved evidence per source is given as the layers of rule 2 (host terms, dataset page or README, paper licence
line, file header) with what each says. Quotations are the decisive words only.

**HI4PI (rows 01 and 02).** Layers read: the LAMBDA product page `h1b-hi4pi/lambda.html` and the arXiv page of the
paper. The LAMBDA page describes a different product from the spectra: "the atomic neutral hydrogen (HI) column
density map derived from HI4PI", a HEALPix table with columns HPXINDEX, RA2000, DEC2000, GLON, GLAT and NHI, with
"Original Data Source: Centre de Données astronomiques de Strasbourg". Its copyright field reads: "Permission is
granted for publication and reproduction of this material for scientific and educational purposes." It also requests
that authors refer to the HI4PI publication and gives an acknowledgement text for the Parkes telescope and the EBHIS
data. The arXiv page gives the paper's identity (arXiv:1610.06175, A&A 594, A116) and its licence link, the arXiv
non-exclusive distribution licence, which is the licence of arXiv's copy of the text, not of the data. Missing: the CDS
catalogue page and ReadMe for the spectra (the form 240 would pack), the VizieR licence page, the Bonn host, the
journal's licence line, any file header. The spectra's own terms are therefore unread.

**LAB (row 03).** Layers read: the arXiv page only (arXiv:astro-ph/0504140, A&A, "assumed-1991-2003" arXiv licence
link, again the licence of the text). The LAMBDA address returned a 404 ("The site has been reworked"), the Bonn
address a 404, the CDS page was unreachable. No terms layer exists for LAB.

**GALFA-HI DR2 (row 04).** Layers read: the survey site and its data page. They state, as facts about the product,
"all of the data are public at" the Berkeley host, a channel spacing of 0.184 km/s, a resolution of 4 arcminutes,
tiles with wide and narrow cubes in V(LSR), and that DR1 and DR2 are available; they state no licence, no terms of
use and no acknowledgement text. Missing: the Berkeley data host's page or README, the article's licence line
(Peek et al. 2018), any header, and the survey's coverage of sightlines inside the solar circle near the plane (the
pages show the Arecibo sky on a figure but give no coverage limits in text).

**EPN database (row 06).** Layers read: the database's about and help pages and its home page. The index and every
profile page are script-loaded and were not retrieved. About page: "The data contained within this archive are
copyrighted to the authors of the original works." and "Most of the data are provided under one of two licences,
either the EPN Legacy Agreement or the CC Attribution 4.0 International licence." The Legacy Agreement is a
"good-will agreement by the authors" whose stated requirement is that "if you intend to use any of the data as part
of a publication, full credit MUST be given to the original authors"; it states no permission to redistribute. CC
BY 4.0 applies to "all new submissions", "identified with a 'CC' logo" per profile. The page adds that other licences
may apply and asks readers to contact the authors for uses a licence does not permit. The help page says the profiles
are for pulse shapes, are as-is, and may be averaged over epochs and rotated in phase. Missing: any profile page, so
no profile is identified, no licence status is read for any pulsar, and the frequencies and references are unknown.

**CSIRO Data Access Portal (row 09).** The saved page is a script shell; its text is "CSIRO Data Access Portal". No
collection, licence field, DOI or file list was read.

**Breakthrough Listen (row 10).** Layers read: the archive's search page. It states that the archive is public, that
files can be several gigabytes and that formats are technical; it gives no licence, no terms and no citation text,
and no pulsar observation was identified. Missing: the data-use or licence page and one observation's record.

**NANOGrav 15-year data set (rows 11 and 16).** Layers read: the NANOGrav data page and the Zenodo API record
`16051178`. The record states: title "The NANOGrav 15-Year Data Set", version "2.1.0", publication date 2025-07-17,
DOI 10.5281/zenodo.16051178, access_right "open", license id "cc-by-4.0", resource type dataset, and one file,
`NANOGrav15yr_PulsarTiming_v2.1.0.tar.gz`, 638,719,668 bytes, `md5:557d42dd8486a5f8272d90dec9b228a8`. Its description
(the release's own text) says the file holds "narrowband" and "wideband" TOAs and timing solutions for 68
millisecond pulsars, ASCII `.par` and `.tim` files, residual tables, correlation matrices and profile templates, and
cites Agazie et al. 2023, ApJL 951 L9 (DOI 10.3847/2041-8213/acda9a, arXiv:2306.16217). It contains no
frequency-by-time series of a single observation. The NANOGrav data page also lists other releases, among them a
profile-data release for PSR J1713+0747 in PSRFITS format and polarization profiles; none of them was retrieved.
Missing: the contents of a `.par` file (the period and dispersion-measure columns, their units, the reference), the
article's licence line, the release's `description.txt`.

**ATNF Pulsar Catalogue (row 13).** Layers read: the catalogue's query page (parameters P0, DM and others with
units), its download page and CSIRO's website Copyright page. Download page: current version "v2.9.0", archive
releases from v1.1, software under GPL version 3 or later, and: "The programs and databases remain the property of
the Australia Telescope National Facility, CSIRO, and are covered by the CSIRO Legal Notice and Disclaimer". It asks
for acknowledgement by citing Manchester, Hobbs, Teoh and Hobbs 2005 (AJ 129, 1993) and the catalogue address. The
CSIRO Copyright page says copyright in the material on the site "is owned by" CSIRO and third parties and "may only
be used in the ways described in this Copyright Notice": temporary copies, and a single copy for own information,
research or study if unchanged, and that "any other use of copyright material on this website is subject to first
receiving consent." The page is the CSIRO website's notice (its footer: 2015 to 2020), and the document the ATNF page
names, the Legal Notice and Disclaimer, was not read. Missing: that document, the psrcat README, the header lines of
`psrcat.db`.

**Fermi LAT third pulsar catalog (rows 07, 14 and 15).** Layers read: the FSSC catalogue page, the FSSC data policy
page, the HEASARC home page, NASA's media usage page, the arXiv page of the paper, and a 404 for a HEASARC policy
address. The FSSC page lists the data products (the main catalogue as FITS and Excel, timing models, SEDs, pulse
profile data in FITS and ASCII, a sensitivity map, README files for each) and a change log: revision 1 on 27 July
2023, revision 4 on 21 July 2025 (`3PC_CatalogData_20250718.tgz`, `3PC_ProfileData_20250718.tgz`); it carries no
statement of copyright, licence, public-domain status or acknowledgement. The FSSC data policy page describes release
timing only. NASA's media page says "NASA content" such as images, audio and video "generally are not subject to
copyright in the United States" and asks that NASA be acknowledged as the source; it speaks of media files, not of a
catalogue, and says third-party material is marked. The arXiv page of the paper (arXiv:2307.11132, ApJS) links the
licence `http://creativecommons.org/licenses/by/4.0/` as the licence of that text; it lists 159 authors from many
institutions, so the catalogue is a collaboration product and not shown to be a NASA work. Missing: the README files,
a FITS header, a HEASARC acknowledgement page, which paper tables carry period and dispersion measure, the journal's
licence line.

**Not read at all (rows 05 and 08):** NICER pulsar products, and the published tangent-velocity table.

## 10. The verdict table

Verdict by rule: **A** needs rule 3 (all of it); **B** is an alternative product that passes rules 1 to 5 as its own
row; **C** is anything that fails or was not read. "C, evidence" means the source is C under rule 5 or rule 1 because a
layer was not read, so that evidence could change it; "C, terms" means a layer that was read states a term outside
section 2. Retrieval dates are those of section 9.1.

| Row | Source and form | Product as far as pinned | Basis (section 2) | Verdict | Deciding rule and what is missing |
| --- | --- | --- | --- | --- | --- |
| D-R10-239-01 | HI4PI, reduced HI spectra (H1b, a `grid`) | the survey (arXiv:1610.06175, A&A 594, A116); the CDS table, release and files are not pinned | none read for the spectra | **C, evidence** | rules 1, 2, 5: the CDS page, the VizieR licence page and the host of the spectra were not retrieved; see row 02 for what a read layer says |
| D-R10-239-02 | HI4PI, the LAMBDA column-density map (a different product, not an H1 form) | LAMBDA product page, HEALPix table of NHI, original source CDS | a permission for "scientific and educational purposes" | **C, terms** | rule 3: a field-of-use limit with no labelled mechanism in section 2; also the product has no velocity axis, so it cannot serve 241; the strictest layer governs (rule 2) if the CDS spectra say more |
| D-R10-239-03 | LAB, reduced HI spectra (H1a) | arXiv:astro-ph/0504140; the data release and its host are not pinned | none read | **C, evidence** | rules 1, 2, 5: no terms layer retrieved (CDS unreachable, LAMBDA and Bonn 404) |
| D-R10-239-04 | GALFA-HI DR2, reduced HI spectra (H1c) | the survey's DR2 (Peek et al. 2018) on the Berkeley host; files not pinned | none stated by any page read | **C, evidence** | rules 2, 4, 5: the data host and the article licence line were not read, so "no licence stated" cannot be argued; coverage of the inner Galaxy near the plane is not stated in the pages (rule 8) |
| D-R10-239-05 | published HI tangent-velocity table, as 241's oracle (H2a) | none chosen | none | **C, evidence** | nothing retrieved; rule 1 |
| D-R10-239-06 | EPN database, folded profiles (P1a) | the database; no profile identified | CC BY 4.0 for a profile marked "CC"; the Legacy Agreement states no redistribution permission | **C, evidence** | rules 1, 3: the profile pages are script-loaded and not retrieved, so no pulsar, frequency, reference or per-profile licence is read; a Legacy-licensed profile would be C, terms |
| D-R10-239-07 | Fermi 3PC, pulse-profile data (P1b) | `3PC_ProfileData_20250718.tgz` named on the FSSC page, not retrieved | none stated for the product | **C, evidence** | rules 2, 4: the README, a header and the HEASARC acknowledgement page were not read; the media page does not cover data and the catalogue is a collaboration product |
| D-R10-239-08 | NICER pulsar products, folded profile (P1b) | none | none | **C, evidence** | nothing retrieved |
| D-R10-239-09 | CSIRO Data Access Portal, dispersed pulse series (P2a) | none | none | **C, evidence** | the portal needs scripts, no collection read |
| D-R10-239-10 | Breakthrough Listen open data, dispersed pulse series (P2b) | none; no pulsar observation identified | none stated | **C, evidence** | no terms page, no observation record read (rules 1, 2, 5) |
| D-R10-239-11 | NANOGrav 15-year Zenodo record, dispersed pulse series (P2c) | record 10.5281/zenodo.16051178, v2.1.0 | CC BY 4.0 (see row 16) | **C, no such product** | rights are not the obstacle: the record's description lists TOAs, timing solutions, residual tables and templates, and no frequency-by-time series |
| D-R10-239-12 | the period and dispersion measure of the pulsar a series shows (P3) | none: no series source passes | follows P2 | **C, no consumer** | with every P2 row C, 242's series is synthetic and its parameters are the generator's truth; no value is cited |
| D-R10-239-13 | ATNF Pulsar Catalogue, a table of periods and dispersion measures (K1a) | psrcat v2.9.0 (the download page's current version) | none | **C, terms** | rules 2, 3: the page says the database remains CSIRO's property under the CSIRO Legal Notice and Disclaimer, and the CSIRO Copyright page read limits use to a single unchanged copy and requires consent for other use; the governing Legal Notice was not read; the argument that numbers are facts is not a basis in section 2 |
| D-R10-239-14 | Fermi 3PC, catalogue table (K1b) | the revision-4 catalogue files named on the FSSC page, not retrieved | none stated for the product | **C, evidence** | rules 1, 2, 4: README, header, acknowledgement page not read |
| D-R10-239-15 | the 3PC paper's printed tables (K1c) | arXiv:2307.11132 | CC BY 4.0, stated by the arXiv page's licence link for that text | **C, evidence** | rule 1: which table carries period and dispersion measure, and the journal's licence line, were not read; the basis itself passes |
| D-R10-239-16 | NANOGrav 15-year data set, a table of periods and dispersion measures of its 68 pulsars (K1d) | Zenodo record 10.5281/zenodo.16051178, version 2.1.0 of 2025-07-17, `NANOGrav15yr_PulsarTiming_v2.1.0.tar.gz`, 638,719,668 bytes, md5 557d42dd8486a5f8272d90dec9b228a8 | **CC BY 4.0**, stated by the record's licence field, open access | **B** | rules 1 to 3 and 6: the alternative of row 13; its rule 8 facts (the period and DM columns, units, a reference per row) are unverified and every pulsar is a millisecond pulsar; 240 verifies a `.par` file before packing, and a missing column makes that column C |

Verdict counts: A 0, B 1 (row 16), C 15 (11 for lack of evidence, 2 for terms read, 2 because no such product or
consumer exists). Nothing is A.

### 10.0 Which C verdicts are final and which reopen

The fifteen C verdicts are of three kinds, and only one kind is a decline of the source.

- **Eleven C verdicts rest only on lack of evidence and are not final declines** (rows 01, 03, 04, 05, 06, 07, 08, 09,
  10, 14 and 15). The pages that would decide them were not retrieved, or were retrieved without a terms layer: CDS
  and VizieR were unreachable when Carl's main session fetched on 2026-11-03 (local; 2026-11-04 UTC), and the
  other pages named in section 12 were never saved. Nothing read for these sources states a term that fails a basis;
  the rules simply do not let an unread layer count (rule 5). Each of these **reopens as a re-gate when the missing
  pages are retrieved**: the same committed rules (section 3), the same bases (section 2) and the same verdict
  definitions apply, the new readings are recorded as a new section with their retrieval dates and SHA-256, and the
  row's verdict is replaced by a new register row that names the old one. No rule, basis or threshold is changed to
  admit them. What to retrieve, source by source, is section 12.
- **Two C verdicts rest on terms actually read** (rows 02 and 13): the LAMBDA HI4PI page's permission for "scientific
  and educational purposes" and the CSIRO property and copyright terms that the ATNF catalogue falls under. They are
  declines on the evidence in hand. They would change only if a layer not yet read states a basis of section 2 and
  no read layer contradicts it (rule 2: the strictest governs), or if Carl adds a mechanism or records a permission as
  its own decision.
- **Two C verdicts say there is no such product or consumer** (rows 11 and 12): the NANOGrav record holds no
  frequency-by-time series, and a single cited period and DM has no use while every dispersed-series row is C. They
  are not about rights, and they change only with a different product (a different record, section 12 item 10) or
  with a dispersed-series row that reaches A or B.

### 10.1 What row 16 would ship, and under what words

The transformation: the period (F0 or P0) and the dispersion measure of each pulsar, read from the `.par` files of the
pinned archive and written as a `catalog` table with the units the files give; no TOA, no template and no residual.
The attribution 240 carries: the NANOGrav 15-year data set, Agazie et al. 2023 (ApJL 951, L9, DOI
10.3847/2041-8213/acda9a) and the record's DOI, CC BY 4.0, with the statement that the table was extracted and
reformatted. Affected lessons: 242's catalogue-based work (the crude DM distance and the validation leg that compares
a pulsar's period and DM with a catalogue). The pack's `license.status` is `cc-by-4.0`, which exists in the closed list.
The raw pin is one 639 MB archive: 240 downloads it once under the record's checksum and extracts the table; the table
alone is small. Packs have no room (D-R10-232-01 term 3), so 240 ships it as the sidecar of that term or stops with a
named pack decision.

## 11. Consequences for 240, 241 and 242 (the C path)

- **240** packs row 16 only, after verifying its rule 8 facts. It packs no HI, no folded profile and no dispersed
  series: every such row is C.
- **241** has no HI pack: rows 01 to 05 are C, so by 241's own run condition the synthetic HI spectrum generator built
  there is the pack, labelled synthetic with its truth manifest; the authentic leg of its validation contract (e) is
  NOT RUN; its leg (b) uses an analytic oracle or is NOT RUN, because no tangent-velocity table was read (section 5).
  The existing `milky-way-rotation-curve` pack is unchanged. The structural problem found: HI4PI's only page read
  describes a column-density map, which cannot carry a velocity axis.
- **242** has no folded profile and no dispersed series: rows 06 to 12 are C, so its synthetic folded profile and
  dispersed series, labelled, are the packs; the validation leg (e) compares the synthetic pulsar with row 16's
  catalogue only if the pulsar chosen is one of the 68 (the generator's own truth is the series' truth either way); it
  is NOT RUN for an authentic pulsar and series.
- **Labelled synthetic packs needed (239's C path):** the HI spectra grid (241), the folded profile (242), the dispersed
  pulse series (242), and the series' period and dispersion measure (242). The catalogue is the only authentic radio
  dataset that can ship, and only as a B.
- Nothing in this gate is inherited by 243 (X-ray timing: its own HEASARC rights are recorded per product there).

## 12. What would turn a C that is only a lack of evidence into an A or B

Save under the same scratch directory, one folder per source id, as before (curl with the UTC time recorded, or the browser's saved page).
Rule 2 still applies: a read layer that restricts redistribution keeps the source at C whatever the others say.

1. **LAB (row 03)**, the likeliest HI source to pass: the CDS VIII/76 page and ReadMe and the VizieR licence page from
   a network where CDS answers; the Bonn host of the LAB data (find it from the link on the CDS page or the survey's
   page; the two addresses tried returned 404); the LAMBDA LAB page by its menu (the address tried returned 404); the
   A&A article page's licence line. Also the pinned file or table names and sizes, and the ReadMe's velocity frame,
   channel width and beam.
2. **HI4PI (row 01)**: the same CDS J/A+A/594/A116 page, ReadMe and files list, the survey's own host through the
   paper's data statement, and the journal licence line. Row 02's LAMBDA permission stays a "scientific and
   educational purposes" term, so this source is unlikely to reach A unless the CDS or the Bonn host states a basis
   in section 2 and no read layer contradicts it; the strictest layer governs.
3. **GALFA-HI (row 04)**: the Berkeley data host's page or README (the address on the survey site), any licence field
   of the data's repository record, the ApJS article licence line, and a written statement of the declination limits
   so the coverage near the plane can be checked.
4. **EPN (row 06)**: choose a bright pulsar; save the profile list page for it and one download page for a profile that
   shows the "CC" mark, its licence line, observing frequency and reference. The index is script-loaded, so save the
   browser's rendered page or the request the page makes for its index. Only a CC-marked profile can pass.
5. **CSIRO portal (row 09)**: the collection page of one Parkes pulsar observation (licence field, DOI, file names and
   sizes, access conditions) saved from the browser or the portal's JSON; and the CSIRO Legal Notice and Disclaimer
   page itself, which also decides row 13.
6. **ATNF (row 13)**: the CSIRO Legal Notice and Disclaimer (the link at the bottom of the catalogue's download page)
   and the psrcat README. Unlikely to pass: the Copyright page already read restricts use.
7. **3PC (rows 07, 14, 15)**: `README_Pulsars_3PC_Catalog+SEDs.txt` and `README_3PC_ProfileData.txt`, the first
   2880-byte header blocks of the catalogue FITS file, HEASARC's data-use and acknowledgement page (the policy address
   tried returned 404; use the link on the HEASARC pages), the paper's table list showing which table carries period and
   dispersion measure, and the ApJS article licence line.
8. **NICER (row 08)**: the HEASARC NICER page, the data-use text, and one pulsar product's page with its file list.
9. **Breakthrough Listen (row 10)**: the archive's data-use or licence statement and one pulsar observation's record.
10. **NANOGrav (row 16, and a possible P2 source)**: `description.txt` and one `.par` file from the archive, which
    can be streamed and cut without keeping the 639 MB (`curl -L URL | tar -xzO` of one member, then stop); the
    Zenodo records of the other NANOGrav releases that hold PSRFITS profile data (the J1713+0747 shape-change release,
    the polarization profiles), each with licence field, file names and sizes, as candidates for a frequency-resolved
    folded series.
11. **Tangent-velocity oracle (row 05)**: a paper's table chosen for 241, with its page and licence line.

## 13. Not done, and not claimed

No source was fetched or read by this session beyond the saved files; no licence term was supplied from memory; no
data, header or body was examined, so no scientific fact of a source is verified; nothing was packed or shipped; no
basis was carried from one source to another (row 16's CC BY 4.0 is its own record's, and no CDS-table or
D-SKY-02 reasoning was used anywhere). The rows are DELEGATED, pending Carl's ratification.

<!-- Listed in DOCUMENTS.md. -->
