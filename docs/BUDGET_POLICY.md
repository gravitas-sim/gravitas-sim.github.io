# Budget policy (Prompt 133): proposed values, switched off

Nothing here changes a ceiling or a measured value. `tools/budget-policy.json`
says `"mode": "exact"`, which is today's behavior; the values below are
**proposals for the owner to adopt or change in writing**. Tooling:
`tools/budget-policy.mjs` (check, rebaseline), `tools/growth-ledger.json`,
`tools/data-budget.mjs` and `tools/data-budget.json`; tests in
`tests/budgetPolicy.test.js`; `npm run budget:policy` and `npm run budget:data`.

## The one-line switch

In `tools/budget-policy.json`, change `"mode": "exact"` to `"declared"`, in the
same pull request that makes `tools/bundle-budget.mjs` take its deferred limit
from the policy. `npm run budget:policy` fails in `"declared"` mode until the
two agree. Adopting it **lowers** the deferred ceiling from 2044.4 KB to the
core, 1985.8 KB; growth then needs allowance the owner has granted.

## Workflow ceilings (never move except by the owner's explicit decision)

| Ceiling | Proposed value | Today |
| --- | --- | --- |
| Initial download | 830.0 KB | 830.0 KB |
| Deferred core | 1985.8 KB | 2044.4 KB (one ceiling) |
| Front door, sandbox | 2103.3 KB, 105 requests | the same |
| Kepler | 3342.9 KB, 143 | the same |
| Transit | 3354.9 KB, 143 | the same |
| Power law | 3320.2 KB, 143 | the same |
| Largest lesson | 3452.4 KB, 145 | the same |
| Observatory, one observation open | read from `tools/route-budgets.json` | the same |

## The optional-growth allowance (granted per release, by the owner)

| | Proposed |
| --- | --- |
| Per-release cap | 20.0 KB |
| Cumulative cap | 58.6 KB (core 1985.8 + 58.6 = today's 2044.4) |
| Granted so far | 0.0 KB |

The 58.6 KB is the room Prompts 131 and 132 freed (60,033 B of deferred
JavaScript, `PLOT_COMPONENT.md`, Stage 4). A grant is
`node tools/budget-policy.mjs rebaseline --kb N --release R --tranche T
--allocation A --reason "..." --label "ceiling increase"`, in a clean tree, never
in CI, and it only ever changes the allowance and the ledger.

## The data plane (`tools/data-budget.json`)

| Ceiling | Proposed | Measured (Mac, Node 24, advisory) |
| --- | --- | --- |
| Observation packs, raw | 325,632 B | 295,875 B |
| Observation packs, gzip | 101,376 B | 91,546 B |
| First-visit precache, gzip | 5,175,296 B | 4,704,529 B |
| Idle precache, gzip | 1,972,224 B | 1,792,571 B |
| Workers at once, low-end | 2 | 2 (the pool's cap) |
| Aggregate worker memory, low-end | 256,000,000 B | 256,000,000 B (the pool's cap) |
| Decoded image memory per page | 67,108,864 B | not measured (probe: Prompt 157) |
| IndexedDB plus cache | 209,715,200 B | not measured (real profile: Prompt 153) |

## The pinned measurement environment

Already in place before this prompt: `tools/budget-environment.mjs` and
`tools/budget-environment.json` (Node major from `.nvmrc`, plus the zlib
recorded in the JSON). A figure from another environment prints as advisory,
there is no tolerance, and CI is always strict. **Still open:** the recorded zlib
is `null`, because it needs `--print-environment` on CI's Node 22, which no
session here can run; until it is committed the comparison uses the Node major
alone. A separately named `measurement-environment.json` was not added: a second
file would say the same thing in two places.

## The first allocation table (for the checkpoint, 160, to complete)

| Source | Figure |
| --- | --- |
| Net saving from 132 | 60,033 B (Chart.js 60,022 B gross) |
| Deferred now (CI, after #348) | 2,033,427 B of 2,093,466 B ceiling |
| Engine request ledger (D-R7-02) | authorized remainder per route: read from `tools/route-budgets.json` at the checkpoint |
| Foundations' measured costs (146-159) | pending: each adds a measured cost; 160 reads them |

| Tranche | May draw | Drawn |
| --- | --- | --- |
| T1A | for 160 to set | 0 KB |
| T1B | for 160 to set | 0 KB |
