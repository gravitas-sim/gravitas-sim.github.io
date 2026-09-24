# Moving the notebook off localStorage

A price, not a plan. Nothing here has been built.

`js/notebook/store.js` is a synchronous, Storage-like module behind a
`setBackend(impl)` seam. The question asked was what it would cost to put
IndexedDB behind that seam, given that an async backend needs a hydrate-at-boot
plus a write-behind facade rather than a swap.

The answer has three parts, and they are very different sizes. The plumbing is
small and mostly already there. The call-site churn is moderate and entirely
mechanical. The third part is not an engineering cost at all — it is a change in
what the application is allowed to tell a student — and it is the only part
worth spending a decision on.

---

## 1. What the seam actually has to carry

The module exports ten things. **Four of them touch the backend:**

| Export | Touches storage | Note |
| --- | --- | --- |
| `load()` | yes | one `getItem`, then `JSON.parse` |
| `save(entries)` | yes | size checks first, then one `setItem` |
| `clear()` | yes | one `removeItem` |
| `isAvailable()` | yes | probe write, probe remove |
| `report(entries)` | **no** | pure over the argument; never reads storage |
| `setBackend`, `SCHEMA_VERSION`, `KEY`, `LIMITS`, `FAILURE` | no | constants and the seam itself |

`report()` being pure matters more than it looks: it is what the status line
calls on every render, so the hot path in the panel does no I/O today and would
do none after the migration either.

**Production importers: one.** `js/notebookPanel.js`, with three call sites —
`store.load()` inside `loadNotebook()`, `store.save()` inside `persist()`, and
`store.report()` inside `statusHtml()`. `persist()` is then called from five
places and `loadNotebook()` from exactly one.

`clear()` and `isAvailable()` have **no production callers at all** — only tests
reach them. That is either dead surface to delete or a latent feature; either
way it is not migration work.

Test surface: `tests/notebook.test.js` (one sync fake, installed in four
places) and four e2e specs, of which one installs a refusing fake and three call
`nb.load()` inside `page.evaluate`.

## 2. The hydrate point already exists, and is already awaited

This is the single fact that makes the estimate smaller than the shape of the
problem suggests.

`js/notebookBridge.js: ensureNotebook()` is already an async function. It
awaits `ensureDeferredMessages()`, then awaits two dynamic imports, and only
then calls `panel.ensurePanel()` — which is the one and only caller of
`loadNotebook()`.

So there is no boot rearrangement to do. `await panel.hydrate()` goes in front
of `panel.ensurePanel()` and nothing above it changes. No caller of
`ensureNotebook()` learns anything new, because it was already a promise.

Contrast the alternative, where the panel loads synchronously and hydration has
to be threaded up through three layers of callers. That is the version of this
job that costs a fortnight. This is not that version.

## 3. What has to be written

| Piece | Kind | Rough size |
| --- | --- | --- |
| `js/notebook/idb.js` — open, get, set, remove; `versionchange` handling; error mapping onto the existing `FAILURE` vocabulary | new file | 150–200 lines |
| `store.js` facade — module cache, `hydrate()`, coalescing write-behind queue, flush on `pagehide`, `setAsyncBackend()`, a `NOT_HYDRATED` reason | edit | ~100 added, ~30 changed |
| `notebookPanel.js` — call `hydrate()`, carry `pending` on `lastSave`, render a pending state, re-render when a write settles | edit | 30–40 lines |
| `notebookBridge.js` — one `await` | edit | 2 lines |
| i18n — `nb.save.pending`, `nb.save.not-hydrated`, en and es | edit | 4 keys |
| One-time migration — read the localStorage envelope, write it to IDB, keep the old copy until that write settles, then remove it | new | ~40 lines |
| `tests/notebook.test.js` — an async fake, hydrate-before-read, coalescing, settle-after-failure, flush-on-hide | edit | ~150 lines |
| Four e2e specs — an awaited read helper in place of bare `nb.load()` | edit | ~12 lines total |

**Keep `setBackend` for the synchronous shape and add `setAsyncBackend` beside
it.** Overloading one setter to sniff which shape it was handed would mean
rewriting five working test fakes to prove a detection branch that exists only
to avoid adding a second export.

Two to three focused days for the notebook, tests included.

## 4. The part that is not plumbing

`save()` today returns a verdict, and the panel renders it synchronously. Five
failure modes:

- `TOO_MANY`, `TOO_LARGE`, `TOTAL_EXCEEDED` — size checks over the in-memory
  array. **Still synchronous after the migration.**
- `QUOTA`, `UNAVAILABLE` — come from the write itself. **These become deferred.**

So `save()` would return optimistically and the real answer would arrive later.
That needs a third UI state the panel does not have — "in memory, not yet
confirmed" — and a re-render when it settles. That is the only genuinely new
*behavior* in the whole job, and it is a regression in one specific respect:

> Today, a student who is told their evidence was saved has had it written.
> After the migration, they have been told it was *accepted*.

The window is small — a coalesced write, flushed on `pagehide` — but IndexedDB
transactions do not reliably survive page teardown, so the window is real and
cannot be closed by care alone. The obvious backstop, mirroring the envelope to
localStorage, defeats the purpose: escaping the shared 5 MB budget is the reason
to move.

Two honest positions, and this is the decision:

1. Accept a bounded loss window, say so in the status line, and keep the
   download-to-file escape hatch prominent.
2. Do not move, on the grounds that "your evidence is yours" is the feature.

## 5. What the move actually buys, and whether it is needed

localStorage is one ~5 MB budget shared by fourteen keys — lesson progress, the
saved simulation, the experiment store, the notebook, and ten small ones. The
notebook is capped at 1 MB and 60 entries, and `store.js` says why: the cap is
sized "to bite on a runaway figure rather than on a term's work."

IndexedDB would lift that cap by orders of magnitude and drop the JSON
round-trip. **If the current cap is not binding, that buys nothing today.** It
is worth measuring a real term's notebook before spending the durability
argument above on headroom nobody is using.

The stronger case is not the notebook's own size but that it stops competing
with *lesson progress* for the same 5 MB — which is the failure `store.js`
already warns about, because it surfaces somewhere else entirely and nobody
traces it back here.

## 6. `js/experiments/store.js` is the same seam again

It carries its own `setBackend`, the same `FAILURE` vocabulary, a multi-key
layout (`gravitas_experiment_<id>` plus an index) and a `migrate()` at
`SCHEMA_VERSION: 3`. One production importer, `js/experiments/bench.js`.

Migrating one store and not the other leaves two patterns in a codebase whose
comments say, in this exact place, that the answers are "deliberately the same
so there is one pattern in the codebase rather than two." Its multi-key layout
is more work per key but has no write-behind problem of its own beyond the one
above. Add roughly 1.5–2 days.

## 7. The staging that unblocks the most for the least

The call-site churn and the durability risk are separable, and they should be
separated:

**Stage 1 — async-shaped API, synchronous backend.** Make `load()`, `save()`
and `clear()` return promises, still backed by localStorage. Every call site,
test fake and e2e read moves to the async shape. The write is still synchronous
inside the promise, so there is no loss window and no pending state: the verdict
is real when the promise resolves.

**Stage 2 — IndexedDB behind the seam.** A new file plus the write-behind
policy, with no consumer changes at all.

Stage 1 is where all of the churn lives and it carries none of the risk. It is
also the whole of what a caller needs in order to depend on an async store —
so if this migration gates other work, **Stage 1 alone unblocks it**, and
Stage 2 can wait for evidence that the cap is binding.

Stage 1: about a day. Stage 2: the rest of the table above, whenever there is a
reason.
