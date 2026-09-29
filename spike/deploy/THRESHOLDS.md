# Deploy-model gate (Roadmap II, Prompt 109, Part 2): thresholds

Fixed before this gate's prototype measurements. Two models are compared: the
**tree** (today: the committed tree is published, tools/prepare-pages.mjs) and
the **build** (dist/ from `node build.js` is published).

- **T1 start-up.** The build cuts the front door's JavaScript by at least 50%
  of its bytes and 30% of its requests, and each of the four measured lesson
  routes' bytes by at least 40%.
- **T2 offline.** The build's service worker installs from its own precache,
  and a reader who has opened it once can open it offline.
- **T3 committed artifacts.** The build needs no more committed generated
  artifacts than the tree does.
- **T4 tests.** The browser suite that can judge the published build covers
  at least 90% of the tests the source suite runs.
- **T5 instructor bundle.** The build can publish the encrypted instructor
  bundle without the passphrase reaching any job but the one that publishes.
- **T6 updates.** In the build, a deploy changes the precache version exactly
  when a published file changes, as it does in the tree.

**A** (switch to publishing the build, with a staged plan) needs T1-T6. **B**
(a hybrid: publish the tree, and precompute its artifacts in CI) is the
verdict when T1 passes and the build cannot yet be judged by the suite (T4)
or kept offline (T2). **C** (keep the tree as it is) otherwise.
