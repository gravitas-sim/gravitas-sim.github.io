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
   `/Users/carl/Desktop/Gravitas/scratch-data/gate239/` (outside every repository); the record states that, with the
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

Phase 1 (this commit): bases, rules, candidates, fallbacks, evidence list. No source read. Phase 2 (after Carl's files
arrive): sections 9 (the readings), 10 (the verdict table), the register rows, `DOCUMENTS.md`, the pull request into
`v3` labelled `invisible`.
