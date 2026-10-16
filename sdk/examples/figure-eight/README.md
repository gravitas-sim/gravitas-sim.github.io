# Three stars on one figure eight

A scenario-pack extension: three equal stars chasing each other round a single
figure-eight orbit, the choreography Chenciner and Montgomery proved exists.

The initial conditions are the published ones (Chenciner & Montgomery 2000,
for G = 1 and unit masses), scaled to Gravitas: one solar mass per star, one
AU per unit of length, at the sandbox's G = 2. One period is then 141.45
simulation time units, and the scenario's step is a two-thousandth of it. In
the engine the three stars come back within a unit of where they started after
each of the first three periods, and no two come closer than 68 units.

It was written with the Scenario Studio (/studio/) and wrapped with

```bash
npm run sdk -- init scenario-pack figure-eight --from figure-eight.json
```

`npm run sdk -- test sdk/examples/figure-eight` builds its world under its
seed, runs it, and builds it again to check it is the same world.
