# Platform package gate: acceptance thresholds

Fixed before any prototype code exists on this branch, and not edited after.
Every result in PLATFORM_PACKAGE_RFC.md is judged against these as written.

The prototype describes exactly three unlike built-in capabilities with one
manifest format, `gravitas.capability-package/1`:

- **instrument**: the power-law gravity instrument family (`js/powerLawWidgets.js`
  and the model it draws, `js/powerLawGravity.js`, `js/powerLawLab.js`);
- **authentic data**: the SDSS DR18 stellar spectra (`js/data/spectra/` and
  their provenance record);
- **guided investigation**: _What If Gravity Were Not Inverse Square?_
  (`js/data/investigations/power-law-gravity.js`, its Spanish shadow and
  instructor guidance), which depends on the instrument package.

## Thresholds

| #   | Question                                      | Pass when                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Can one format describe all three?            | One schema validates all three manifests: identity and version, compatible Gravitas API range, routes, models, widget families, scenarios, investigations, translations, data packs, assets, citations and licenses, offline policy, authoring metadata, validation requirements and migrations - with no field specific to one of them. |
| T2  | Is a declarative package safe?                | The validator rejects every manifest that would make a data or lesson package execute code (a module, entry point, script URL or function anywhere outside a built-in package), and the loader has no path from package content to `import()` of a URL the package names. Both are shown by tests on hostile manifests.                  |
| T3  | Does the validator reject malformed packages? | At least eight distinct malformed manifests are rejected with a message naming the field: missing identity, bad version, incompatible API range, unknown kind, undeclared dependency, dependency cycle, duplicate public id, executable field in a declarative package.                                                                  |
| T4  | Source mode                                   | The three capabilities are found and loaded through their manifests with the site served from the sources, and their existing browser specs pass unchanged.                                                                                                                                                                              |
| T5  | Production build                              | The same with `dist/`: hashed chunk names appear in no manifest, public API, saved state or share link (checked by test), and the specs that run against `dist/` pass.                                                                                                                                                                   |
| T6  | Offline                                       | Every asset the three manifests declare is in the service-worker precache when the precache is generated from them, and the existing offline test for a lazily loaded instrument passes.                                                                                                                                                 |
| T7  | Authoring and validation                      | `author:check` gives the same findings when the investigation is registered from its manifest; each validation requirement a manifest declares resolves to an existing check, and `validation:check` passes.                                                                                                                             |
| T8  | Documentation generation                      | A capability listing generated from the manifests (identity, version, citations, licenses) agrees with what `NOTICE`, `LICENSES.md` and the documented counts say for those three.                                                                                                                                                       |
| T9  | Cost                                          | Start-up bytes and requests unchanged in both configurations; every route within `tools/route-budgets.json`; the deferred total grows by no more than 2.0 KB, inside the untouched 4180 KB ceiling (5.4 KB of headroom at the base) - no budget raised.                                                                                  |
| T10 | Migration                                     | A manifest at version 1 is migrated to a version 2 and back under a declared migration, and old saved work and share links for the investigation still open.                                                                                                                                                                             |

## Verdict rules

- **A (proceed)**: every threshold passes.
- **B (staged)**: T1, T2, T3, T5 and T9 pass, and each other failure has a named,
  bounded production task. The first production slice is exactly these three
  capabilities and what they need, with adapters for everything else.
- **C (stop)**: T2 or T9 cannot be met, or any of the three needs an
  executable escape hatch to be described. The dependent package lane stops
  and the roadmap is revised.
- A threshold that could not be measured is reported as unmeasured and counts
  as not passed.
