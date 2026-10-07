# Toolchain policy

How Gravitas picks and moves the versions of what it is built, tested and
shipped with. The rules are few so that one maintainer can keep them. The ones
that can be checked by a program are checked
(`tests/platformBaseline.test.js`); the rest are a calendar entry.

## Node

- **Track the LTS line.** The floor is the oldest Node release still in
  maintenance; the development machine runs the current Active LTS. The two are
  allowed to differ, and the gate has found real differences (WebCrypto
  realms, gzip byte counts, `10 ** x`, regular-expression property escapes).
  Anything that has to match byte for byte is checked on CI's version, not on
  the Mac's.
- **Three places say which version, and they agree:** `.nvmrc`, the `NODE_VERSION`
  of `.github/workflows/ci.yml`, and `engines.node` in `package.json` (a floor,
  so `>=`). The test fails if `.nvmrc` and CI disagree, or if the floor is above
  either.
- **Where it stands (2026-10-06).** All three say 20. Node 20 reached its
  scheduled end of life in April 2026, so the floor now trails the policy.
  Moving CI, `.nvmrc` and the floor to 22 is the first item of the next
  checkpoint rather than part of this document, because it changes what CI
  proves and the Node 20 and 24 differences above are exactly what a move can
  expose. It should not wait for the calendar if a security advisory names 20.

## Exact pins

An **exact version, no range**, for anything that produces bytes a student
downloads, or whose version decides what a committed file or a browser test
contains. A range here means two builds of one commit can differ.

| Package | Why exact |
| --- | --- |
| `three` | Vendored into `vendor/three/` by `npm run vendor`; the bytes the 3-D views load |
| `chart.js` | Vendored into `vendor/chartjs/`; stays until the staged plotting migration removes it (D-PLOT-01 in [`DECISION_REGISTER.md`](DECISION_REGISTER.md); its last stage needs Carl) |
| `@fontsource/inter`, `@fontsource/poppins`, `@fontsource/roboto-mono` | The faces in `vendor/fonts/` are generated from them |
| `esbuild` | Produces `dist/`, the production bundle every route budget measures |
| `playwright`, `@playwright/test` | The version selects the browser builds the support statement names ([`SUPPORT.md`](SUPPORT.md)) |
| `axe-core`, `@axe-core/playwright` | The accessibility verdicts depend on the rule set |
| `acorn`, `js-yaml` | Parsers whose output the checks and generators commit |

`npm run vendor:check` fails CI when a vendored file is not what its pinned
package would produce, so "pinned in `package.json`" and "what the site loads"
cannot drift. The test also holds this table to `package.json`: every package
named here is exact, and every dependency of the shipped runtime
(`dependencies`) is named here.

## Ranges

Caret ranges, with the lockfile fixing what is installed, for development
tooling whose output is not committed: `jest` and its environment, `eslint` and
its plugins, `prettier` (a new Prettier can reformat generated files, which the
gate then reports; that is the reason for the quarterly checkpoint and not for
an exact pin), `@jest/globals`, `@eslint/js`.
[`.github/dependabot.yml`](.github/dependabot.yml) groups the ones that must
move together and opens each major version as its own pull request.

## The quarterly checkpoint

First week of January, April, July and October. It is a pull request that
changes versions and nothing else, and **the gate is its acceptance test**:
the pull request is green on the complete gate or it does not merge. A version
that needs a test edited, a threshold moved or a budget raised is a decision
with its own row in the decision register, not an update.

1. **Node.** Check the release schedule; move the floor, `.nvmrc` and CI if the
   oldest supported line has gone end of life.
2. **Advisories.** `npm run deps:audit`, then read what it reports and what it
   ignores (the list in `tools/deps-audit.mjs` is shorter than it was or says why
   not).
3. **Tooling.** `npm outdated`; take the ranges, take each major separately.
4. **Pinned packages.** For each exact pin, read the release notes, bump it,
   run `npm run vendor`, review the regenerated bundles, and run
   `npm run support:sync` if Playwright moved (the browser builds in the
   support statement come from it).
5. **Vendored code.** Is each vendored dependency still needed? Chart.js is
   retired only by the staged migration in D-PLOT-01; nothing else is vendored.
6. **Record it.** A line in `CHANGELOG.md` naming what moved and what was held,
   and why.

The monthly Dependabot pull requests are the input to step 3 and nothing more:
they are read at the checkpoint, not merged as they arrive.
