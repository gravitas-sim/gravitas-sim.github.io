# Security

## What Gravitas is, in security terms

A static site. There is no server, no database, no account system and no
session: GitHub Pages serves files, and everything else happens in the reader's
browser. Nothing a reader does is sent anywhere, because there is nowhere to
send it. Progress, settings and saved worlds live in that browser's own storage
and are never transmitted.

That removes most of the categories a security policy usually covers, and it is
worth saying plainly rather than leaving a reader to infer it.

## What is actually sensitive

**The instructor materials.** `instructors/materials.enc.json` is published,
because everything here is published. It is AES-GCM ciphertext with a key
derived from a shared passphrase through PBKDF2-SHA256 at 600,000 iterations,
and the browser decrypts it in memory when an instructor types the passphrase.

This means the security of the answer keys is exactly the strength of that
passphrase against an offline attack on a file anyone can download. That is a
deliberate trade — a static site cannot gate content any other way — and it is
documented in [`RELEASE.md`](RELEASE.md) rather than hidden. If you believe the
construction is weaker than described, that is a report I want.

The passphrase itself is never in this repository, never in CI, and never in a
build log.

## Reporting a vulnerability

**Please do not open a public issue.**

Email <Carl.Ziegler@sfasu.edu> with `[Gravitas security]` in the subject. Or, if
you prefer GitHub's own channel, use
[private vulnerability reporting](https://github.com/gravitas-sim/gravitas-sim.github.io/security/advisories/new)
on the repository.

Please include what you found, how to reproduce it, and what you think the
impact is. A proof of concept helps but is not required to make a report worth
sending.

**What to expect.** An acknowledgment within a week. An assessment, and a fix or
an explanation of why it is not one, within thirty days for anything I can act
on. If the report is valid I will credit you in the changelog unless you would
rather I did not.

This is a one-maintainer academic project, not a vendor with an on-call rota. I
would rather set that expectation honestly than publish a response time I cannot
keep.

## In scope

- Anything that lets published content execute unintended code in a reader's
  browser.
- Anything that weakens the instructor-bundle encryption below what is described
  above, or that exposes plaintext instructor content.
- Anything in the build, release or deploy path that could publish something
  other than the reviewed commit — the gate is described in
  [`RELEASE.md`](RELEASE.md).
- A dependency vulnerability that actually reaches the shipped bundle. `npm
  audit` runs in CI and in the release gate for both production and development
  trees.

## Out of scope

- The passphrase being guessable because somebody chose a weak one. That is an
  operational choice, and the documentation says what it costs.
- Anything requiring a reader to paste attacker-supplied code into their own
  console.
- Reports from automated scanners with no demonstrated impact on this
  deployment.
