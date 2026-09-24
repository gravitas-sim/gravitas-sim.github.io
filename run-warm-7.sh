#!/bin/bash
# Seven fully independent warm measurements: each run installs the service
# worker into a fresh context and takes one measured trial. Independent
# contexts are stricter than reusing one, and they sidestep the state carried
# between trials that stalled the looped version.
: > warm-samples.txt
for i in $(seq 1 7); do
  TRIALS=1 node bench/bench-warm.mjs 2>&1 | grep "warm trial 1" | sed "s/^/run $i: /" | tee -a warm-samples.txt
done
