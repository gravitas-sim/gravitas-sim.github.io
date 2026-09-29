# Classroom service-boundary spike (Prompt 40)

Disposable evidence for `CLASSROOM_SERVICE_GATE.md`. It is never merged, and
nothing here is deployed. Every run uses synthetic users on 127.0.0.1.

- `SPEC.md`: the thresholds and verdict rules, committed before any code (ac27cc2).
- `ws.mjs`: the server side of RFC 6455, on `node:http` and `node:crypto`.
- `protocol.mjs`: every message a client may send, and the check each must pass.
- `server.mjs`: the relay. Sessions live in memory, a join code only knocks, the instructor admits, the command log is hash-chained, and there are rate limits and retention.
- `client.mjs`: a synthetic client on Node's built-in `WebSocket`.

The runs (each prints JSON; the recorded outputs are in `results/`):

| Script | Thresholds | Command |
|---|---|---|
| `load.mjs` | T1, T2 | `node load.mjs 4430 40 35 60` |
| `reconnect.mjs` | T3, T4 | `node reconnect.mjs 4391` |
| `abuse.mjs` | T5, T6, T7 | `node abuse.mjs 4470` (uses three ports) |
| `retention.mjs` | T8 | `node retention.mjs 4420` |
| `webrtc.mjs` | T9 | `node webrtc.mjs 4441`; `--default` keeps Chrome's mDNS hiding |

Two changes were made after a first run, and neither moved a threshold:
- **abuse.mjs:** the honest round trip's baseline was taken cold, and the
  fuzzed run came out 22% faster than it. A discarded warm-up pass now comes
  first.
- **SPEC.md:** named the wrong machine, and is corrected.
