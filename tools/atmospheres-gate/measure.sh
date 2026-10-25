#!/bin/zsh
# T1: bytes, requests, tiers and routes on Node 22 copies (Prompt 199 spike).
# usage: measure.sh <scratch dir> <node22 binary>
set -o pipefail
S=$1; N=$2
SPIKE=/Users/carl/Desktop/Gravitas/worktrees/p199-spike
NM=/Users/carl/Desktop/Gravitas/worktrees/p165/node_modules
BASE_SHA=5a4bd68335afc4ab2a90c4899121e34b60352750
rm -rf $S/base $S/whole $S/noesc; mkdir -p $S/base
git -C $SPIKE archive $BASE_SHA | tar -x -C $S/base
rsync -a --exclude node_modules --exclude .git --exclude dist --exclude test-results --exclude '.build-report.json' $SPIKE/ $S/whole/
rsync -a $S/whole/ $S/noesc/
for d in base whole noesc; do ln -s $NM $S/$d/node_modules; done
# the variant without the escape instrument: its import, its widget and its id
python3 - <<PY
p='$S/noesc/js/atmosphereWidgets.js'
s=open(p).read()
import re
s=re.sub(r"import \{ escapeControls[^;]*;\n","",s)
a=s.index("const ESCAPE = {"); b=s.index("export const ATMOSPHERE_WIDGETS")
s=s[:a]+s[b:]
s=s.replace("[BALANCE, PROFILE, ESCAPE]","[BALANCE, PROFILE]")
open(p,'w').write(s)
PY
(cd $S/noesc && $N tools/capability-registries.mjs >/dev/null 2>&1)
for d in base whole noesc; do
  ( cd $S/$d && $N tools/build-service-worker.mjs > $S/$d.sw.log 2>&1; echo "sw $d exit $?" )
  ( cd $S/$d && $N build.js > $S/$d.build.log 2>&1; echo "build $d exit $?" )
  cp $S/$d/.build-report.json $S/$d.report.json
done
for d in base whole; do
  ( cd $S/$d && $N tools/data-budget.mjs > $S/$d.data.log 2>&1; echo "data $d exit $?" )
  ( cd $S/$d && $N tools/route-budget.mjs --report > $S/$d.routes.log 2>&1; echo "routes $d exit $?" )
done
