#!/bin/sh
# Downloads the Yale Bright Star Catalogue (CDS V/50) for the spike. Not committed.
# usage: fetch-catalogue.sh <dir>
set -e
d="${1:?directory}"
mkdir -p "$d"
base=https://cdsarc.cds.unistra.fr/ftp/V/50
for f in ReadMe catalog.gz notes.gz; do curl -sSL -o "$d/V_50_${f}" "$base/$f"; done
gunzip -f "$d/V_50_catalog.gz" "$d/V_50_notes.gz"
shasum -a 256 "$d"/V_50_catalog "$d"/V_50_notes
