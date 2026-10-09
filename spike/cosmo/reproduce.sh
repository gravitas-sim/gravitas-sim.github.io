#!/bin/sh
# R4: every builder run twice, derivative hashes compared. Run from spike/cosmo.
set -e
for b in hubble1929 des-sn sdss-slice coma faber-jackson cepheids; do node build-$b.mjs >/dev/null; done
rm -f derived/*.try.json
shasum -a 256 derived/*.json > /tmp/cosmo-run1.sha
for b in hubble1929 des-sn sdss-slice coma faber-jackson cepheids; do node build-$b.mjs >/dev/null; done
rm -f derived/*.try.json
shasum -a 256 derived/*.json > /tmp/cosmo-run2.sha
cmp /tmp/cosmo-run1.sha /tmp/cosmo-run2.sha && echo "byte-identical on two runs"
cat /tmp/cosmo-run2.sha
