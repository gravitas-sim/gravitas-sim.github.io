# Results

Revision `16d0f24` (tip of `v2`). Chromium 151.0.7922.34. 4 Mbit/s down,
80 ms RTT, CPU x4, 1366x768, HTTP cache disabled, fresh context per trial,
service worker blocked. Both candidates staged from the same commit and served
by the same gzipping server.

## Primary: time to first interactive lesson step (ms)

| trial | A current (unbundled) | B built (dist/) |
| --- | --- | --- |
| 1 | 5970 | 4275 |
| 2 | 5840 | 4362 |
| 3 | 5829 | 4365 |
| 4 | 5814 | 4395 |
| 5 | 6180 | 4300 |
| 6 | 6014 | 4184 |
| 7 | 5752 | 4278 |
| **median** | **5840** | **4300** |
| p25 / p75 | 5814 / 5970 | 4275 / 4362 |
| min / max | 5752 / 6180 | 4184 / 4395 |

**Built minus current: -1541 ms. -26.4%.** The distributions do not overlap:
the slowest B trial (4395) is faster than the fastest A trial (5752).

## Secondary diagnostics (median)

| | A current | B built |
| --- | --- | --- |
| first contentful paint | 3356 ms | 2388 ms |
| requests | 177 | 80 |
| transferred (gzip) | 1591 KB | 779 KB |
| decoded | 4764 KB | 2113 KB |
| files in staged tree | 748 | 483 |

## Returning student, current deployment, service worker installed

Seven independent measurements, each a fresh process and a fresh context that
installs the worker and takes one measured trial: 3794, 3850, 3930, 3949, 3958,
4022, 4037 ms. **Median 3949 ms**, p25 3930, p75 3958, 0 KB transferred, still
177 requests every time.

The worker saves a returning student 1891 ms against a cold first visit, and a
returning student on the current deployment (3949 ms) still reaches the step
351 ms sooner than a first-time student would on the built tree (4300 ms).
What it cannot save is the 177 requests and the module parsing: with every byte
already in the cache the page still takes 4.0 s to reach an interactive step.
That cost is structural to shipping 177 modules and is the part a built tree
would remove, so the built tree should help the returning case too. Not measured
directly: candidate B has no service worker, because `dist/` ships no `sw.js` or
`sw-manifest.js` at all, and generating a correct one is a deliverable of the
rewrite rather than something to fake in a benchmark.
