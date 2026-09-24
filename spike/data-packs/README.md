# Observation data-pack gate: disposable prototype

Evidence for [OBSERVATION_DATA_PACK_GATE.md](../../OBSERVATION_DATA_PACK_GATE.md)
(Prompt 11). Nothing here is imported by the application, and none of it is
meant to merge.

| File | What it is |
|---|---|
| `schema.mjs` | `gravitas.observation-data-pack/1` and its validator |
| `observation.mjs` | the in-memory observation, and the two pack decoders |
| `import.mjs` | CSV/JSON student-file import into the same observation |
| `fits.mjs` | the FITS reader the TESS tool uses (headers, scalar BINTABLE columns) |
| `build-tess-pack.mjs` | TESS SPOC light curve to pinned derivative and manifest |
| `build-rv-pack.mjs` | HARPS RV bank series to pinned derivative and manifest |
| `retrofit.mjs` | the seven datasets Gravitas ships, as manifests, validated |
| `spike.test.mjs` | `node --test spike/data-packs/spike.test.mjs` |
| `out/` | the two derivatives and their manifests, as committed |

Raw products are never committed. To rebuild from the archives:

```bash
node spike/data-packs/build-tess-pack.mjs --cache /path/to/cache --fetch
```

```bash
node spike/data-packs/build-rv-pack.mjs --cache /path/to/cache --fetch
```

```bash
P11_CACHE=/path/to/cache node --test spike/data-packs/spike.test.mjs
```

Without `P11_CACHE` the two reproduction tests skip; the other 23 need no
network and no cache.
