# Classroom service-boundary gate: specification and thresholds

Prompt 40. This file is committed before any prototype code exists. Its
thresholds and verdict rules do not move once a measurement has been taken.

## The question

Gravitas is a static site. Nothing a reader does is sent anywhere
(SECURITY.md). Could an optional, minimal service add these things without
breaking that for everyone else?
- ephemeral live sessions;
- group membership;
- instructor broadcasts;
- consented progress summaries;
- reconnect;
- later, LTI launches and grade return.

Four tracks are decided separately: **live sessions**, **persistence**,
**accounts** and **LTI**. A pass on one never implies a pass on another.

## The baseline every option is compared with

This is what already works with no service:
- **Assignment links** (`js/assignments/`) carry the scenario, the steps and
  a roster id in the URL.
- **The student's lab report** carries a submission token
  (`js/submission/submissionToken.js`). The student hands it in through the
  LMS the class already uses, as a file or pasted text.
- **The review page** (`submissions/`) grades a pile of tokens offline and
  exports CSV and JSON (`js/submission/results.js`).
- **Course packs** (`/course/`) deliver a whole course as a link or a file.

So "LMS-only integration", in its file-based form, is already shipped. The
gate asks what a service would add beyond it, and at what cost.

## Run conditions (from the roadmap, not relaxed here)

- **Live sessions:** two external instructors who name coordination as an
  adoption blocker. A bounded pilot host and an operating plan are needed
  before any build (Prompt 41).
- **LTI:** one named institution with an LMS technical contact.
- **Persistence and accounts:** a named use case that requires them.

The evidence for each is checked at the time of writing. It is recorded in
the gate document with its source: the repository's issues, discussions and
pull requests, and the project's own records.

## Prototype limits

- Synthetic users only, on loopback (127.0.0.1).
- Nothing is deployed, and no real student data is used.
- The prototype uses Node's built-in modules only: no npm packages. The
  WebSocket server is written against RFC 6455 on `node:http` and
  `node:crypto`. The synthetic clients use Node's built-in `WebSocket`.
- The WebRTC probe uses Playwright's Chromium, already a dev dependency.
- The prototype stays on this spike branch. The decision PR is one document.

## Thresholds

Measured on the development machine (an Intel Core i5-10500, 12 threads,
24 GB, macOS; corrected after commit ac27cc2 named it wrongly as Apple
Silicon, with no threshold changed), which is stated beside every number. A loopback number is a floor on latency, never a
prediction of it over a campus network.

| Id | Property | Pass when |
|---|---|---|
| T1 | Concurrency | One Node process holds **40 sessions × 36 clients (1,440 connections)**, while every instructor broadcasts once a second and every student sends a 1 Hz status. Broadcast fan-out latency, instructor send to student receive: **p95 ≤ 100 ms and p99 ≤ 250 ms**. |
| T2 | Memory | Resident memory grows by **≤ 150 KB per connection** at the T1 load. |
| T3 | Reconnect | Over **100 random drop-and-rejoin trials**, a student who misses commands while disconnected rejoins with **exactly** the instructor's command log: sequence 1..n, no gap, no duplicate, equal log digest. Every trial is exact, and each rejoin completes within **1 s** of the socket reopening. |
| T4 | Late join | A client joining after **200 commands** reaches the same log digest, and its replay takes **≤ 200 ms**. |
| T5 | Session guessing | A guessed join code alone never grants membership. Either an instructor must admit each join, or the computed chance of any successful guess against the live code set in a 60-minute session is **≤ 1e-6**. The design ceiling is 1,000 simultaneous sessions and 1,000 attacking addresses, each at the per-address rate limit. The rate limit is shown to be enforced. |
| T6 | Malicious payloads | Of **10,000 fuzzed messages** (malformed JSON, oversized, wrong types, unknown kinds, prototype keys, deep nesting, forged roles), **100% are refused with a typed error**. There are 0 server crashes, 0 relays to another client, and the median honest round trip stays within **±20%** of its unfuzzed value. |
| T7 | Instructor privilege | A student connection's attempt at **every** instructor-only command is refused: 100%. |
| T8 | Retention | A session's state is gone within **60 s** of its end, and no session outlives a **4-hour** hard limit, shown with an injected clock. |
| T9 | WebRTC | A DataChannel pair between two Chromium pages, signaled through the prototype, connects within **p95 ≤ 2 s** on loopback over 20 trials. Recorded with it: the connections a mesh and a star need, and that NAT traversal needs STUN/TURN, a service in its own right. |
| T10 | Cost | Not a pass/fail measurement. It is the memory and CPU per connection from T1 and T2, turned into the instance a pilot of a given size needs. Every assumption is stated, and no price is quoted as fact. |

## Verdict rules, fixed now

- **Live sessions:**
  - **A:** T1-T9 pass, and the live-session run condition is met with a named pilot host and operator.
  - **B:** T1-T9 pass and the run condition is met, but there is no operator. Then only a staged specification is licensed, no service.
  - **C:** The run condition is not met, whatever the measurements say. The measurements are kept as evidence for a reopened gate, and the conditions that reopen it are written down.
  - If a threshold fails, the verdict is C, with the failure named.
- **Persistence (server-side storage of progress or responses):**
  - **A:** Only with a named use case that browser-local storage and the file-based hand-in cannot meet.
  - **C:** Otherwise.
  - There is no B.
- **Accounts:** The public core never requires one.
  - **A** for institutional identity only, through a verified LTI launch, and only if LTI is A.
  - **C:** Otherwise.
- **LTI:**
  - **A:** The LTI run condition is met, a hosting and operating plan exists, and the design passes the threat model below.
  - **B:** Design only, when the run condition is met but no host exists.
  - **C:** The run condition is not met. The design is recorded for when it is.

## What the gate document must contain

The comparison: WebRTC with signaling and relay, WebSocket authoritative
sessions, and LMS-only integration.

Threat models:
- impersonation;
- session guessing;
- malicious payloads;
- instructor privilege;
- cross-course leakage;
- retention;
- minors;
- abuse;
- denial of service;
- compromised clients.

Also:
- the FERPA and institutional-review questions, asked and not answered, with no claim of compliance;
- explicit data flows;
- retention defaults;
- deletion and export behaviour;
- operational ownership.

It ends with the four verdicts and the conditions that would change each.
