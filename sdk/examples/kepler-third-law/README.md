# Kepler's third law, as one instrument

An example **capability** extension for the Gravitas Extension SDK
([sdk/README.md](../../README.md)): one instrument that gives a planet's year
from the size of its orbit and the mass of its star.

Executable code, so a maintainer reviews it and vendors it into Gravitas,
where it is compiled with everything else. It is never installed into a
running copy. `sdk validate` warns that its `builtin:` id is not registered
yet; that line is added when it is vendored.

```bash
npm run sdk -- test sdk/examples/kepler-third-law
```

```bash
npm run sdk -- inspect sdk/examples/kepler-third-law --preview
```

Its strings are English only. An instrument translates through Gravitas's
catalogs, which are not part of the SDK's public API yet.
