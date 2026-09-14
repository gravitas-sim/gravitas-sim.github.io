# Gravitas showcase paper

This directory contains a rewritten, two-column AASTeX manuscript presenting
Gravitas as a teaching environment rather than as a programming project.

## Files

- gravitas-showcase.tex — manuscript source
- references.bib — references used by the manuscript
- FIGURE_CAPTURE_GUIDE.md — exact plan for the four release screenshots
- figures/ — create this directory and add the four PNG files listed below

The LaTeX source compiles before the figures are present. Each missing image is
replaced by a labelled box that describes the required screenshot.

## Build

Use an AASTeX 6.3.1 installation or upload this directory to Overleaf with the
AASTeX template files available.

    pdflatex gravitas-showcase
    bibtex gravitas-showcase
    pdflatex gravitas-showcase
    pdflatex gravitas-showcase

## Before submission

1. Finish the v1.0.0 checks and tag the release.
2. Archive that tagged release with Zenodo.
3. Replace both explicit placeholders near the top of gravitas-showcase.tex:
   - ZENODO-DOI-PLACEHOLDER
   - ZENODO-RECORD-URL-PLACEHOLDER
4. Replace the same DOI placeholder in references.bib.
5. Add the author's ORCID to the author command if desired.
6. Capture the four figures from the tagged release using
   FIGURE_CAPTURE_GUIDE.md.
7. Confirm that the release still contains 59 scenarios, 22 investigations, and
   631 investigation steps. Update the three macros if the release differs.
8. Replace the source snapshot SHA with the tagged release commit.
9. Add any funding or institutional acknowledgment that applies.
10. Compile and inspect the two-column PDF for table or figure overflow.
11. Package the TeX source, bibliography, and four PNG figures for arXiv.

## Editorial position

The manuscript deliberately avoids claiming measured learning gains because
Gravitas has not yet been evaluated in a controlled classroom study. It instead
makes verifiable claims about the activities, tools, access model, scientific
scope, and validation supplied by the v1 release. This is more credible for an
arXiv software/education paper and leaves a clear route to a later education
research article based on classroom evidence.
