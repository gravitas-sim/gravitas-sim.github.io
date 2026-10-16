# Classroom services: the product, privacy and service-boundary gate

**Status: decided under delegation, 2026-09-29.** Carl's standing instruction
is to run the roadmap in order while he is away and decide each gate by its
own thresholds. He also approved running this gate ahead of Prompts 35-39.
The verdicts rest on the evidence below, and each names the condition that
would reverse it.

| Track | Verdict |
|---|---|
| **Live sessions** | **C.** The run condition is not met: no external instructor has named coordination as an adoption blocker, and two are required. The prototype passed every technical threshold (T1-T9). That is recorded as evidence for a reopened gate, not as permission to build. |
| **Persistence** (progress or responses stored by a service) | **C.** No named use case needs it. Browser-local storage and the file-based hand-in already cover every shipped workflow. |
| **Accounts** | **C.** The public core never requires one. Institutional identity could only come through a verified LTI launch, and LTI is C. |
| **LTI 1.3** | **C.** There is no named institution, no LMS technical contact and no hosting plan. The design is recorded below for when they exist. |

**What follows:**
- Prompt 41 (live-session protocol) and Prompt 42 (collaborative groups) are skipped, since both need a live-session A.
- Prompt 43 (LTI pilot) is skipped, since it needs an LTI pass and a named institution.
- The standalone application is unchanged, and nothing is deployed.

**Base:** `v2` at `2b63620` (#101 merged, CI green).

**Prototype:** branch `spike/classroom-service-boundary` at `662e542`, in
[`spike/classroom-service/`](https://github.com/gravitas-sim/gravitas-sim.github.io/tree/662e542/spike/classroom-service).
Its thresholds and verdict rules were committed before any code (`ac27cc2`).
It is disposable and will not merge. This PR is the decision record only.

---

## The question

Gravitas is a static site. Nothing a reader does is sent anywhere
(SECURITY.md). Could an optional, minimal service add any of these without
changing that for anyone who does not use it?
- ephemeral live sessions;
- group membership;
- instructor broadcasts;
- consented progress summaries;
- reconnect;
- later, LTI launches and grade return.

What would it cost to run, and what could go wrong?

## The baseline: what already works without a service

| Need | How it is met today |
|---|---|
| Send a class to a scenario or steps | An assignment link (`js/assignments/`) carries the scenario, the steps and a roster id |
| Deliver a course | A course pack, as a link or file (`/course/`) |
| Collect work | The student's lab report carries a submission token (`js/submission/submissionToken.js`), handed in through the LMS the class already uses |
| Grade and export | The review page grades the tokens offline, and exports CSV and JSON (`js/submission/results.js`) |
| Show everyone the same thing | A share link or an embed, opened at the same moment |

This is "LMS-only integration" in its file-based form, and it is shipped. A
service has to earn its place against it.

What a service would add that this cannot:
- **Timing:** an instructor moving the whole room at once.
- **Visibility:** seeing, during class, who is stuck.
- **Continuity:** a student who drops out rejoining where the room is.

## Run-condition evidence, checked 2026-09-29

| Condition | Evidence | Met |
|---|---|---|
| Two external instructors name coordination as an adoption blocker | 0 issues (open or closed), discussions off, and every pull request is the owner's or Dependabot's. There is no other record of an external instructor | No |
| One named institution with an LMS technical contact (LTI) | None | No |
| A named use case for service-side persistence | None: every shipped workflow keeps data in the browser or in a file the student hands in | No |
| A bounded pilot host and operating plan (Prompt 41) | None | No |

## The options compared

| | WebRTC, with signaling and relay | WebSocket, authoritative session | LMS-only |
|---|---|---|---|
| **Where session state lives** | In the browsers. The instructor's page is the hub of a star | The service holds the command log | Nowhere live. Files move through the LMS |
| **Servers still needed** | Signaling always. STUN for most networks, and TURN for any network where peers cannot reach each other | One relay | None for the file-based flow. LTI needs an OIDC and JWKS endpoint and a grade-service client (below) |
| **Connections for a class of 36** | Star 35, mesh 630 | 36 | 0 |
| **Measured on loopback** | DataChannel open p95 151 ms with mDNS hiding off. **0 of 3 opened with Chrome's default mDNS hiding** | Broadcast p95 1.5 ms at 1,440 connections | Not applicable |
| **What an instructor's dropped tab costs** | The room loses its hub | Nothing: the log is on the service, and the instructor resumes with a token | Nothing |
| **Privacy surface** | Peers learn each other's network addresses unless TURN relays everything | The service sees join codes, nicknames, step numbers and command links | The LMS, which the institution already governs |
| **Operational load** | Signaling, plus TURN bandwidth, which is the costly part | One small process, TLS and monitoring | None for Gravitas |

If a live-session gate is reopened, the recommendation is a **WebSocket
authoritative session** for commands and status, with no WebRTC. WebRTC does
not remove the server, it adds TURN for exactly the campus networks that block
direct traffic, and it hands every peer the others' addresses. The one thing
it would offer, peer-to-peer media, is not a Gravitas need.

## What the prototype is

About 580 lines for the relay itself, on Node's built-in modules, with no packages:
- **An RFC 6455 server** (`ws.mjs`): masked text frames only, a 16 KB frame limit, and the RFC's close codes for everything else.
- **A closed protocol** (`protocol.mjs`): ten client message types, each checked before a field is read. This is the same rule every Gravitas import follows: plain, small, known data, no prototype keys, bounded depth and size.
- **A relay** (`server.mjs`):
  - **Joining:** a 6-character join code from a 31-character alphabet puts a connection in a lobby, and **the instructor admits or refuses every knock**. A student who is admitted gets a random 128-bit token for resuming.
  - **The command log:** instructor commands are appended to a hash-chained log (seq, kind, body, time), so a client that rebuilds the chain knows it has exactly the server's log. Commands are links and small parameters (open a scenario or assignment, pause, resume, request a checkpoint, set groups, broadcast a line, mark a milestone), never simulation state.
  - **Student status** is a step number and a done flag, sent to the instructor only. A help request carries nothing else.
  - **Limits:** per-connection message rate (burst 40, 20 a second, closed with 1008 after 200 refusals), per-address joins (10 a minute), 60 members a session, and 4 KB messages (12 KB for a WebRTC session description).
  - **Retention:** a session is purged 30 s after it ends, and ended at a 4-hour hard limit.

## Thresholds and results

The machine is an Intel Core i5-10500 (12 threads), with 24 GB, macOS and
Node 24.4.0 (x64), and a load average of 3-4 from other work during the runs.
The numbers are loopback numbers: a floor on latency, never a prediction of
it over a campus network.

| Id | Threshold | Result | |
|---|---|---|---|
| T1 | 40 sessions × 36 clients (1,440 connections), 1 Hz broadcasts and statuses: fan-out p95 ≤ 100 ms, p99 ≤ 250 ms | p50 0.66, **p95 1.45, p99 1.99 ms** (max 14.1). 82,600 broadcasts and 82,575 statuses in 60 s, no errors. A repeat: p95 1.40, p99 1.86 | pass |
| T2 | ≤ 150 KB of resident memory per connection | **30.4 KB** (45.9 MB idle, 88.7 MB under load). Repeat 30.8 KB | pass |
| T3 | 100 drop-and-rejoin trials all exact, each rejoin ≤ 1 s | **100 of 100 exact**, all five students' chains equal to the server's, and no refusals. Rejoin p95 2.7 ms, max 4.2 ms | pass |
| T4 | A late join after ≥ 200 commands is exact in ≤ 200 ms | 702 entries replayed and exact in **3.7 ms** | pass |
| T5 | A guessed code alone never grants membership, and the join limit is enforced | **By admission.** A correctly guessed code only knocks: the knocker saw no log, was refused a status and was closed on the instructor's refusal. The per-address limit answered 10 of 30 rapid guesses and refused 20 | pass |
| T6 | 10,000 fuzzed messages: 100% typed refusals, 0 crashes, 0 relays to another client, honest median round trip within ±20% | **10,000 of 10,000 refused with a typed error.** 0 reached the honest student, and a valid command from another session's instructor stayed in that session. Median round trip 0.289, 0.265 during and 0.260 ms after | pass |
| T7 | A student's every instructor-only command refused | **11 of 11** (admit, refuse, end and each of the 7 command kinds), and the session stayed live | pass |
| T8 | Purged ≤ 60 s after the end, and none outlives 4 hours | Purged **at 30 s**, and the code then does not resolve. An abandoned session is live at 4 h less 1 ms, ended at 4 h, and gone 30 s later | pass |
| T9 | WebRTC DataChannel via the relay, p95 ≤ 2 s on loopback, 20 trials | 20 of 20, **p95 151 ms**, echo 0.5 ms. This needed mDNS hiding off: with Chrome's default, 0 of 3 opened | pass (with the caveat) |
| T10 | Cost model (not pass/fail) | Below | - |

**Beyond the thresholds, for scale:** 120 sessions (4,320 connections) ran at
p95 2.5 ms and p99 3.7 ms, using 20.4 KB a connection, 132 MB and 19% of one
core.

**Two corrections after a first run, neither to a threshold:**
- T6's first baseline was taken cold, so the fuzzed run came out 22% *faster* than it. A discarded warm-up was added.
- The specification had named the wrong machine.

Both are recorded in the spike's README.

## Cost (T10)

These are assumptions, not quotes:
- **Compute is not the cost.** At the measured 30 KB and about 0.06 ms of CPU per connection-second at 1 Hz, a pilot of five classes of 36 (180 connections) needs about 5 MB and about 1% of a core. The smallest instance any provider sells would hold 1,440 connections with room to spare.
- **Bandwidth is small.** A broadcast is about 150 bytes to 36 recipients once a second, about 5.4 KB/s a class, plus statuses of about 50 bytes each.
- **The cost is operational:**
  - a domain and TLS;
  - uptime during class hours;
  - monitoring and a log policy that keeps no personal data;
  - dependency and security updates;
  - an owner who answers when it is down in the middle of a lecture;
  - the privacy review below.
  - WebRTC would add TURN relay bandwidth, the one large per-user cost.

## The minimum service, if a gate reopens

**Data flows:**
- **Instructor → service:** "create". The service returns a join code and a resume token.
- **Student → service:** join code, plus an optional nickname the student types, which is never checked against anything. The service passes a knock to the instructor.
- **Instructor → service:** admit or refuse. An admitted student gets a resume token.
- **Instructor → service → students:** commands (links and small parameters), appended to the session's log.
- **Student → service → instructor only:** step number, done flag, a help request.
- **Nothing else crosses:**
  - no simulation state;
  - no written answer (a response reaches the instructor only through the existing hand-in, as the student chooses);
  - no name the service can verify;
  - no identifier from the application's storage;
  - no analytics.

**Retention defaults:**
- **In memory only:** nothing is written to disk.
- **When a session ends:** everything is purged 30 s later, and 4 hours is a hard limit.
- **Logs:** operational logs, if any, keep counts and error codes, never codes, tokens or nicknames.

**Deletion and export:**
- **Deletion** is automatic at the end, and an instructor can end a session at any time.
- **Export:** before ending, the instructor's page can save the session's command log and aggregate status as a local file. That is the debrief record, and it is the only export: the service keeps no copy to export later.

**Operational ownership:**
- **A named operator is required before any deployment:** who runs it, who is on call during class hours, who reviews incidents, and who decides to turn it off.
- **Gravitas's maintainer is not that operator by default.** Prompt 41's run condition exists for this reason.

## Threat model

| Threat | In the prototype | What remains |
|---|---|---|
| **Impersonation** | A resume token is 128 random bits and binds a connection to one member. A second connection with the token takes over and closes the first | A nickname is not identity. The instructor admits by what the knock says, so a student could type a classmate's name. Only an institutional launch (LTI) can say who someone is, and the console must never claim more |
| **Session guessing** | A code only knocks, and the instructor admits. Joins are limited per address | Codes are **not** secret: at 1,000 live sessions and 1,000 addresses each at the limit, an hour of guessing hits some live code with probability 0.49. Admission is the control, so the console must make unexpected knocks obvious and a session lockable |
| **Malicious payloads** | A closed protocol, checked before reading: 10,000 fuzzed messages all refused. Frames are capped at 16 KB | A production service needs the same refusal suite in CI, and a limit on connections per address |
| **Instructor privilege** | Every instructor-only command is refused from a student's connection (T7). Signaling is a star: never student to student | A stolen instructor token is the instructor, so it must never leave the instructor's page and must never go into a URL |
| **Cross-course leakage** | A session's commands reach only its own members. A foreign instructor's valid command stayed in its own session (T6) | Distinct courses are distinct sessions. There is no cross-session read path, and none should be added |
| **Retention** | In memory, purged at 30 s after the end, 4 hours at most (T8) | Proven here with an injected clock. A deployment must also be checked for crash dumps and hosting logs |
| **Minors** | No accounts, no names verified, no written work held | K-12 use raises parental-consent and COPPA-style questions. The default must stay nickname-optional, and the console should advise against real names |
| **Abuse** (spam, disruptive broadcasts, knock floods) | Message and join rate limits, closing after sustained abuse, a member cap. Only the instructor broadcasts | A knock flood on a known code is an annoyance the instructor must be able to stop, by locking the session or re-issuing the code |
| **Denial of service** | Per-connection and per-address limits, and bounded frames | One process on one host can be flooded from many addresses. That needs the hosting provider's protection, and the standalone app must never depend on the service being up |
| **Compromised clients** | The service trusts no client beyond its role. Status is two small fields, and commands are links the student's own Gravitas opens and checks like any link | A compromised instructor page can send the room to any link. The student's Gravitas must treat a session command exactly as a link it did not choose: open only Gravitas routes, and validate as for any import |

## Questions for an institution, asked and not answered

These are not a claim of compliance. They are what an institutional review
would need to answer before a pilot:
1. Is a nickname typed into a live session, together with step progress,
   an education record under FERPA once an instructor sees it? Does an
   in-memory, 30-second retention change that?
2. Who is the data controller: the instructor, the institution, or the
   service's operator? Does the institution need a data-processing agreement
   with the operator?
3. May students be asked to use a service the institution has not
   contracted? Must the session be optional for a grade?
4. For students under 13 (or the local age of consent), what consent is
   required for a nickname and progress to cross a network?
5. Does the institution's accessibility policy require a review of the
   console before classroom use? The console has not been built.
6. What incident notice would the institution expect if the service were
   compromised during a class?
7. For LTI:
   - which LMS and version;
   - which placements;
   - whether grade return is wanted at all;
   - whether an instructor must review every returned grade before it posts.

## LTI 1.3: the design, recorded for a future institution

**What a static site cannot do**, and so what a service would have to:
- **Login initiation:** OIDC third-party login initiation needs an endpoint to receive the platform's request and redirect with state and a nonce.
- **The launch:** receiving the `id_token` form post and validating the JWT against the platform's JWKS needs a server that holds state.
- **Keys:** the tool needs its own JWKS for its signed messages, and a private key it rotates.
- **Grades:** Assignment and Grade Services need an OAuth 2 client-credentials token and a server that holds it.

**The smallest design:**
- **Validation:** validate the launch (issuer, audience, nonce, expiry, deployment id, the platform's JWKS with rotation), then map `context` and `resource_link` to a Gravitas assignment link.
- **Deep Linking** returns an assignment or course-pack item.
- **Grade return** (AGS) posts a score only after the instructor reviews the submission in the existing review page, and only when the result is bound to the verified launch and assignment. A standalone submission token proves a browser produced the answers, never who.
- **No roster** (Names and Role Provisioning) unless a pilot's workflow truly needs one.
- **Storage:** the service stores only the launch-to-assignment mapping and each result it posted, with the instructor's decision, for audit and for export or deletion on request.

**Threats specific to LTI**, and the answer to each:

| Threat | Answer |
|---|---|
| Replayed launches | nonce and expiry |
| Forged launches | signature against the registered JWKS |
| Key compromise | rotation and a revocation path |
| Cross-course leakage | results keyed by deployment, context and resource link |
| Grade overwrite | posts are instructor-initiated, and the service refuses to overwrite a newer score without an explicit override |

**Open questions, answered only with a real institution:** the exact LMS and
version, the scopes, the data fields and the retention.

## The verdicts, and what would reverse them

- **Live sessions, C.** Reopens as a new gate when:
  - two external instructors, on the record, name live coordination as a reason they cannot adopt Gravitas;
  - a pilot host and operator are named.

  The measurements here then become the starting evidence. If reopened, the recommendation is the WebSocket authoritative design above, with a lockable lobby and a local-file debrief export.
- **Persistence, C.** Reopens only with a named use case that browser-local storage and the file-based hand-in cannot meet.
- **Accounts, C.** Does not reopen for the public core. Institutional identity reopens with LTI.
- **LTI, C.** Reopens when:
  - a named institution and LMS technical contact agree to a pilot;
  - a hosting and operating plan exists.

  Then B (design review) or A (build Prompt 43) is decided on the design above.

An LTI pass would not imply a live-session pass, and a live-session pass
would not imply LTI.

## How to reproduce

On the spike branch, in `spike/classroom-service/`, with the repository's
own dependencies installed (`npm ci`, for Playwright's Chromium):

```bash
node load.mjs 4430 40 35 60
node reconnect.mjs 4391
node abuse.mjs 4470
node retention.mjs 4420
node webrtc.mjs 4441
node webrtc.mjs 4444 --default
```

Each prints JSON with its verdicts. The recorded outputs are in `results/`.
