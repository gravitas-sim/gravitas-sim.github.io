# One transit of HD 209458

An example **data-pack** extension for the Gravitas Extension SDK
([sdk/README.md](../../README.md)).

It holds one transit of the hot Jupiter HD 209458 b: 29 twenty-minute bins
cut from Gravitas's TESS sector 56 light curve (`tess-hd209458-s56-lc`), which
comes from the SPOC file MAST served. The bins are copied exactly as the
source encoded them, and folding them on the published period finds the
transit at its published depth.

| File | What it is |
|---|---|
| `gravitas-extension.json` | the extension's manifest: a declarative `gravitas.capability-package/1` |
| `pack.json` | the pack's record, `gravitas.observation-data-pack/1`: source, rights, the pinned input, every step, the check |
| `series.json` | the pack itself, `{ PACK, SERIES }`, which `observationOf()` decodes |
| `build.mjs` | the transformation that writes the two JSON files. Code, so it is part of the pull request and never part of the archive |

```bash
node sdk/examples/tess-hd209458-one-transit/build.mjs
```

```bash
npm run sdk -- test sdk/examples/tess-hd209458-one-transit
```

Rights: NASA mission data, public domain. Acknowledge TESS and MAST and cite
doi:10.17909/t9-nmc8-f686.
