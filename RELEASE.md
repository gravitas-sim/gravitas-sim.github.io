# Releasing Gravitas

The site is [gravitas-sim.online](https://gravitas-sim.online), served by GitHub
Pages from this repository. This document is the release path, the settings that
need an owner to change them, and how to verify and undo a deployment.

## What was wrong

Pages was configured to **deploy from a branch** — `main`, root. GitHub publishes
the commit as soon as it lands, and there is no way to make that conditional:
Pages deploys a commit, not a verdict about one. So CI and the live site were
independent, and at `521e64f` the site went live while CI was failing both the
formatting check and the bundle budget.

Nothing about that was a bug in CI. CI worked and reported the failure. It simply
had no relationship to publishing.

## The release path now

Publishing is a job in `.github/workflows/ci.yml` that runs **after** the
aggregate `ci` job and only on a push to `main`. It publishes the repository tree
exactly as committed — not `dist/`.

That last point is deliberate. The site is served **unbundled from the root**: the
service worker precaches root paths by name, and `dist/` is a bundled variant
whose job is to be tested, not shipped. Publishing it would be a different site,
not a safer way to ship this one.

The job never runs a build. `npm run build:ci` rewrites
`instructors/materials.enc.json` with a throwaway key so that a pull request from
a fork can prove the pipeline still runs; that output cannot be decrypted by
anyone. A deploy that regenerated it would publish an instructor area nobody can
open. So the deploy regenerates nothing, and `tools/verify-release.mjs` refuses
the tree if a throwaway bundle reached it by some other route.

### When it declines to publish

In every case the previous successful deployment stays exactly where it is.
GitHub Pages serves the last successful deployment until a new one replaces it;
a skipped or failed deploy tears nothing down.

| Situation                     | What happens                                                                                                                                                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A CI job **failed**           | `needs: [ci]` is not satisfied, so `deploy` is skipped.                                                                                                                                                                                                                                                                  |
| A run was **cancelled**       | Same path — a cancelled dependency is not a success.                                                                                                                                                                                                                                                                     |
| A job was **skipped**         | Treated as not-success by `needs`. On a push to `main` every aggregated job is unconditional, so this should not arise; it is handled rather than assumed away.                                                                                                                                                          |
| The commit was **superseded** | Two pushes in quick succession both run to completion, and can finish out of order. Before publishing, the job compares `github.sha` against the current tip of `main`. If they differ it records a notice and stops, without failing — being overtaken is a normal outcome, and the newer commit's own run will deploy. |

### What is checked before anything goes live

`tools/verify-release.mjs` runs against the checkout. It refuses to publish when:

- `instructors/materials.enc.json` is missing, unreadable, or marked
  `unpublishable` — the marker a throwaway CI build now writes into itself.
- Any file named in `sw-manifest.js` is absent from the tree. A missing precache
  entry fails the service-worker install for **every** visitor at once, so this
  is checked before publishing rather than discovered afterwards.
- `index.html` is missing.
- The deploy revision marker is missing or does not name a commit.

Then a second, blunter check: `git status --porcelain` must be clean. If any step
ever rewrites a tracked file — which is exactly how a throwaway instructor bundle
would reach the site — the deploy fails instead.

You can run the same check locally before pushing:

```bash
node tools/verify-release.mjs . --no-revision
```

`--no-revision` waives the deploy marker, which only exists on a deployed tree.

### Finding out what is live

Every deployment writes `deployed-revision.json` into the site root:

```bash
curl -s https://gravitas-sim.online/deployed-revision.json
```

It carries the commit SHA, the ref, the run id and attempt, and the timestamp.
The same details go into the run's job summary.

---

## Owner actions required

These cannot be done from the repository contents and need someone with admin
rights on it. **Until the first one is done, the workflow's deploy job will fail
at the `deploy-pages` step and the site will continue to be published from the
branch, ungated.**

### 1. Change the Pages source to GitHub Actions

_Settings → Pages → Build and deployment → Source: **GitHub Actions**_

This is the change that makes gating possible at all. It stops GitHub publishing
`main` automatically and hands publishing to the workflow.

The custom domain and its HTTPS certificate are unaffected — they are properties
of the Pages site, not of its source.

### 2. Confirm the `github-pages` environment

_Settings → Environments → `github-pages`_

Switching the source creates this environment. Two things are worth setting on
it:

- **Deployment branches:** restrict to `main`, so no other ref can publish.
- **Required reviewers:** optional. Adding one turns every deployment into a
  manual approval, which is a reasonable choice for a teaching site with an
  audience, and an annoying one otherwise. Not enabled by default here.

### 3. Branch protection on `main`

_Settings → Branches → Add rule for `main`_

The workflow gate stops a **failing** commit from being published. It does not
stop one from being merged, and the two are worth separating: a red commit on
`main` is still a red commit even if it never goes live.

- Require status checks to pass before merging, and select the **`CI`** check —
  the aggregate job, not the individual ones. It is the job that already knows
  how to treat skipped and cancelled dependencies.
- Do not add `Deploy to Pages` as a required check. It only runs on pushes to
  `main`, so requiring it on pull requests would block every merge for ever.

### 4. Instructor materials passphrase

The deploy publishes the committed `instructors/materials.enc.json`. It does not
rebuild it, so **the committed bundle is what students and instructors get**. To
publish new instructor content:

```bash
GRAVITAS_INSTRUCTOR_PASSPHRASE='…' npm run build:instructors
git add instructors/materials.enc.json
git commit -m "Rebuild instructor materials"
```

Run this on a machine that has the real passphrase, and check the diff before
committing: a bundle built without it is marked `unpublishable` and the deploy
will refuse it.

> The committed bundle is currently **stale**. It predates the binary-stability,
> gravity-assist, radial-velocity, reliability, sweep, manoeuvre and
> restricted-three-body content, so the guides for those lessons are not yet in
> the published archive. Rebuilding it is the outstanding owner action here.

---

## Verifying a deployment

1. **The run.** Actions → the run for your commit → the `Deploy to Pages` job.
   Its summary names the commit and the URL. If the job is grey, read the `CI`
   job: something did not pass, and nothing was published.
2. **The revision.** `curl -s https://gravitas-sim.online/deployed-revision.json`
   and check `commit` is the SHA you expect.
3. **The site.** Load it, open a lesson, and confirm the service worker installs
   — DevTools → Application → Service Workers should show one activated, and
   Cache Storage a `gravitas-…` cache with the precached files in it. A failed
   install here means a precached file is missing, which the deploy check should
   have caught; if it did not, that is a gap in `tools/verify-release.mjs` worth
   closing.
4. **Offline.** DevTools → Network → Offline, then reload. The application should
   boot and run. `e2e/selfContained.spec.js` covers this against the build, but
   the live site is the one that matters.

## Rolling back

Nothing here is destructive, and there are three routes depending on how quickly
you need it.

### Fastest: re-deploy a known-good commit

_Actions → CI → Run workflow_ does not help, because `workflow_dispatch` runs do
not deploy (the job requires `github.event_name == 'push'`). Instead:

```bash
git revert --no-edit <bad-sha>
git push origin main
```

The revert is a new commit, runs the full CI, and deploys if it passes. This is
the route to prefer: the repository and the site stay in agreement.

### Immediate: republish the previous deployment

_Settings → Pages_ lists recent deployments, and the GitHub API can re-activate
an earlier one:

```bash
gh api -X POST \
  repos/gravitas-sim/gravitas-sim.github.io/pages/deployments/<deployment-id>/cancel
```

Use this only to stop a deployment in flight. To put an older revision back, the
supported route is to push a commit — a re-activated old deployment and a `main`
that disagrees with it is a state nobody can reason about later.

### If the deploy path itself is broken

Set _Settings → Pages → Source_ back to **Deploy from a branch → `main` / (root)**.
The site returns to publishing every push immediately and ungated — which is the
behaviour this document exists to replace, so treat it as a temporary measure and
record why it was needed.

## What is tested, and where

| Check                                  | Where                                    |
| -------------------------------------- | ---------------------------------------- |
| The refusals in the release verifier   | `tests/verifyRelease.test.js`            |
| That the deploy job is actually gated  | `tests/releaseWorkflow.test.js`          |
| That the committed tree is publishable | `tests/verifyRelease.test.js`, last case |

The workflow tests read `.github/workflows/ci.yml` and assert its structure —
that `deploy` needs `ci`, that it carries no `always()`, that every publishing
step is behind the supersession check, that it uploads the root rather than
`dist/`, and that it runs no build. Those are properties an ordinary review would
miss: adding `always()` to a job's `if` is a small, plausible-looking edit that
would restore exactly the behaviour of the `521e64f` incident.
