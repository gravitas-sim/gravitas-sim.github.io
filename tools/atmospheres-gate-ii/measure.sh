#!/bin/zsh
# T1: bytes, requests, tiers and routes on Node 22 copies (Prompt 201 spike). usage: measure.sh <scratch dir> <node22 binary>
set -o pipefail
S=$1; N=$2
SPIKE=/Users/carl/Desktop/Gravitas/worktrees/p201-spike
NM=/Users/carl/Desktop/Gravitas/worktrees/instructors-rebuild/node_modules
BASE_SHA=ab815f06
rm -rf $S/base $S/whole $S/ep; mkdir -p $S/base
git -C $SPIKE archive $BASE_SHA | tar -x -C $S/base
rsync -a --exclude node_modules --exclude .git --exclude dist --exclude test-results --exclude '.build-report.json' $SPIKE/ $S/whole/
rsync -a $S/whole/ $S/ep/
for d in base whole ep; do ln -s $NM $S/$d/node_modules; done
# the eclipse-and-phase variant: no bands instrument, no transmission kernel, no synthetic table, no bands words
python3 - <<PY
import re
d='$S/ep/'
p=d+'js/atmosphereWidgets.js'
s=open(p).read()
a=s.index('// <bands>'); b=s.index('// </bands>')+len('// </bands>')
s=s[:a]+s[b:]
s=s.replace('  bandDepth,\n','').replace('  SYNTHETIC_BANDS,\n','')
s=s.replace('[BALANCE, GREENHOUSE, SCALE, BANDS, ECLIPSE, PHASE]','[BALANCE, GREENHOUSE, SCALE, ECLIPSE, PHASE]')
# the eclipse and phase views do not use the bands
open(p,'w').write(s)
for lang in ('en','es'):
    p=d+'js/i18n/%s.atmospheres.js'%lang
    s=open(p).read()
    a=s.index('  // <bands>'); b=s.index('  // </bands>')+len('  // </bands>\n')
    s=s[:a]+s[b:]
    open(p,'w').write(s)
p=d+'js/widgets.js'
s=open(p).read()
s=s.replace("      'atmosphere-bands',\n","")
open(p,'w').write(s)
p=d+'js/kernels/atmospheres/index.js'
s=open(p).read()
s=s.replace("export * from './transmission.js';\n","").replace("export * from './bands.js';\n","")
open(p,'w').write(s)
import os
os.remove(d+'js/kernels/atmospheres/transmission.js'); os.remove(d+'js/kernels/atmospheres/bands.js')
PY
(cd $S/ep && $N tools/capability-registries.mjs >/dev/null 2>&1)
for d in base whole ep; do
  ( cd $S/$d && $N tools/build-service-worker.mjs > $S/$d.sw.log 2>&1; echo "sw $d exit $?" )
  ( cd $S/$d && $N build.js > $S/$d.build.log 2>&1; echo "build $d exit $?" )
  cp $S/$d/.build-report.json $S/$d.report.json
done
for d in base whole ep; do
  ( cd $S/$d && $N tools/data-budget.mjs > $S/$d.data.log 2>&1; echo "data $d exit $?" )
  ( cd $S/$d && $N tools/route-budget.mjs --report > $S/$d.routes.log 2>&1; echo "routes $d exit $?" )
done
