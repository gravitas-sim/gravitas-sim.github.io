# Satellite ephemeris and Jupiter's moons

Prompt 193 (Roadmap III, tranche T2, R14). The four Galilean moons about Jupiter from JPL Horizons as
a lazily fetched pack, a cadence designed so that Io's period is not aliased, a synthetic image
sequence rendered by the forward models, a kernel that fits each moon and weighs Jupiter with
Kepler's third law, and one investigation, "Weighing Jupiter From Its Moons"
(`weighing-jupiter`, three depths, English and Spanish). The register row is D-R10-74
(`DECISION_REGISTER.md`).

## The pack

`ephemeris-packs/galilean-2025-11.json` is the manifest; `sky/galilean-moons.json` is the pack (a
sidecar, JSON, 19.5 KB: no module, so no route budget counts it); `tests/fixtures/galilean/galileanCheck.json`
is the held-out check set. It is built by the existing pipeline, `tools/build-ephemeris.mjs`, which now reads
several manifests (`--only galilean` limits a run to this one; a plain `--fetch` fills every pack's cache, as
CI's provenance job does).

| Fact | Value |
| --- | --- |
| Source | NASA/JPL Horizons API 1.2, satellite theory `jup365_merged` (Jacobson), retrieved 2026-10-25 |
| Query | `COMMAND` 501, 502, 503, 504; `CENTER` `500@599` (Jupiter's centre); `EPHEM_TYPE=VECTORS`, `VEC_TABLE=2`, `REF_PLANE=ECLIPTIC`, `REF_SYSTEM=ICRF`, `VEC_CORR=NONE`, `OUT_UNITS=KM-S`, `CSV_FORMAT=YES` |
| Window | 2025-11-20 00:00 to 2025-12-30 00:00 TDB, 1 hour steps (961 rows each, fitted); the held-out set is offset by 30 minutes (960 rows, never fitted) |
| Pin | the SHA-256 of each answer's data rows (between `$$SOE` and `$$EOE`), in the manifest; the header facts (target, frame, units, type) are compared with the manifest |
| Encoding | Chebyshev series per segment and axis fitted to positions and velocities: Io 1 day degree 11, Europa 2 days degree 11, Ganymede 4 days degree 11, Callisto 5 days degree 11 |
| Measured against Horizons (held out) | position at most 0.016 km (Io), 0.22 (Europa), 0.44 (Ganymede), 1.7 (Callisto); velocity at most 1.2e-4 km/s; the stated bounds are in the manifest and `ephemeris:check` holds the check set to them |
| Rights | the manifest's licence status is `no-license-stated` as for the planetary pack, with the exact requests and checksums recorded so the original states can be found; the terms as served were read on 2026-10-25 (the Horizons manual states that all four access paths "can be automated"; NASA's media guidelines allow factual use with NASA acknowledged as the source) and are quoted in the manifest's `termsAsServed`; nothing found forbids a one-off pinned credited derivative for teaching. The roadmap calls Horizons output public domain; the manifest keeps the more careful wording |
| Credit | Satellite states from NASA/JPL Horizons (Solar System Dynamics group) |
| Where it loads | `/sky/galilean-moons.json`, fetched when the lesson's instruments open; **never precached** (`NEVER_PRECACHED`), because the data plane's ceilings are Carl's (packs 781 B of gzip room, first-visit 810 B, idle 274 B) and `tools/data-budget.json` is untouched. The lesson needs one online visit before it works offline |

`npm run ephemeris:check` covers both packs offline; `npm run ephemeris:provenance` rebuilds each from
its cached Horizons answers byte for byte (the cache is gitignored; CI fetches it).

## The kernel (`js/satellites/`)

- `galilean.js`: reads the pack with `js/mission/ephemeris.js` and the planetary pack with the sky kernel's
  planet source; the line of sight to Jupiter, light-time corrected; Jupiter's pole (IAU working group 2018);
  each moon's offset from Jupiter as seen from the Earth, x along the planet's projected equator (east
  positive), y along its projected pole, z along the line of sight, in Jupiter radii (71,492 km, the radius
  Horizons states) at the moment the light left. No circular orbit and no edge-on view is assumed.
- `cadence.js`: the observing plan (Kitt Peak as a stated example site, nautical night, Jupiter above 25
  degrees: three hourly nights, 5 to 7 December, 21 frames; a nightly frame at 08:00 UT on the other nights,
  six nights lost to weather by a seeded draw: 30 frames); the alias analysis (a signal at f cycles a day
  sampled every dt days looks like |f + k/dt|; Io at 0.565 a day against a Nyquist frequency of 0.5 looks
  like 0.435 a day, 2.3002 days); the sky frame's turning (`frameRate`, about -0.083 degrees a day over the
  window) and the sidereal correction `siderealPeriod`.
- `sequence.js`: 51 synthetic frames rendered by the CCD forward model (`js/forward/models/ccd.js`): Jupiter's
  disk, the four moons at their ephemeris positions with their magnitudes (5.0, 5.3, 4.6, 5.65), seeing (a
  seeded image motion of 0.03 Jupiter radii per moon), photon and read noise, 3 arcseconds a pixel, east to
  the right, the projected pole up. Frames are made on the page, never stored; each is labelled synthetic in
  its truth manifest. `measureFrame` centroids each moon near the overlay's predicted position and finds
  Jupiter's centre from the disk.
- `weigh.js`: `fitSinusoid` (a chi-square scan over frequency, the best refined by golden section,
  uncertainties from the Jacobian, scaled by the reduced chi-square when it exceeds 1, every other period
  that fits as well listed with its chi-square difference, refusals in words), `kepler` (GM = 4 pi^2 a^3 /
  P^2 with the cube and the square propagated), `combine` (weighted mean and chi-square of the four).

## The validation contract

`tests/fixtures/galilean/contract.json` was committed before any candidate output was inspected (commit
934c3eea; one amendment, the nightly sample moving from 05:00 to 08:00 UT because Jupiter does not clear the
plan's own 25-degree rule at 05:00, was made before any leg ran and is recorded in the file). `node
tools/galilean-validate.mjs` runs every leg and prints PASS, FAIL or NOT RUN; nothing in it restates a bound.

| Leg | Bound (committed first) | Measured | Verdict |
| --- | --- | --- | --- |
| a1 pack against Horizons | at most 5 km, 1e-3 km/s on the held-out set | 1.31 km, 8.9e-5 km/s | PASS |
| a2 geometry against an independent oracle | x and y within 0.002 R_J over 48 epochs | 0.0004 R_J | PASS (numpy, astropy 6.1.7 built-in Jupiter, raw hourly Horizons rows by cubic Hermite, `tools/galilean-oracle/oracle.py`) |
| b1 once-nightly alias | Io's alias and true period within chi-square 1; the others not aliased | 1.3e-7 | PASS |
| b2 designed cadence | every rival beaten by 100; period within 0.3 percent of reference | rivals beaten by 63,000 and more; **Callisto 0.40 percent** | **FAIL** (bound ignored the 1/n scaling of the frame effect) |
| c1 period and axis | apparent period within 0.25 percent; axis within 1 percent; corrected period within 0.05 percent | **Callisto apparent 0.40 percent**; axes within 0.11 percent; corrected within 0.023 percent | **FAIL** (the apparent-period bound only) |
| c2 mass | GM within 1.0 percent uncorrected, 0.5 corrected; scatter within 0.3 percent | **Callisto uncorrected 1.15 percent, scatter 0.62 percent**; corrected within 0.38 percent | **FAIL** |
| d1 coverage | one-sigma coverage 0.58 to 0.78 over 200 seeds | **Europa 0.875, Callisto 0.99, Ganymede amplitude 0.825**; Io 0.735 | **FAIL** (intervals too wide, not too narrow) |
| d2 mass ensemble | corrected GM within 3 sigma at least 95 percent | 1.00, 1.00, 0.995, 1.00 | PASS |
| e1 least squares | scipy `curve_fit` agrees within 1e-5 | 1e-10 | PASS |
| e2 inference core | the `rv-keplerian` fit of the same marks within 1e-3 | 1e-10 | PASS (a different code path, the same minimum) |
| f1 refusals | too few marks, span shorter than the period | refused in words | PASS |
| g1 frames | centroid within 0.15 pixel; digest stable | 0.042 pixel | PASS |

`tests/fixtures/galilean/failed-legs.json` records the four failing legs with their causes, and
`tests/galileanMoons.test.js` holds the failing set to that record. They are left failing, labelled. The
cause of b2, c1 and c2 is one thing: the sky frame the elongations are read in turns at about 0.083 degrees a
day because the Earth and Jupiter move, so a moon's apparent period differs from its orbital one by that
rate over the moon's own, 0.04 percent for Io and 0.38 percent for Callisto. The bounds were written without
that scaling. The diagnostic `x1.syncheck`, added after the failures and replacing nothing, shows the fitted
apparent period within 1.0e-4 to 2.3e-4 of the prediction for all four moons. The cause of d1 is the
misfit: a sinusoid is not the whole of x(t), so for the slower moons the reduced chi-square is large and the
interval is wider than the noise alone needs.

The mass from the designed sequence's measured marks: the four moons together give GM 127.38 +- 0.13 million
km^3/s^2 (chi-square 21.3 for 3, they disagree) without the correction and 126.85 +- 0.13 (chi-square 6.1,
p = 0.11, mass 1.901e27 kg) with it, against JPL's planet value of 126.69 million (+0.13 percent, 1.3 sigma).
The oblateness of Jupiter (a moon's apparent GM is high by 1.5 J2 (R/a)^2, 0.06 percent for Io) and a moon's
own mass (under 0.01 percent) are not removed.

## The investigation

"Weighing Jupiter From Its Moons" follows A Binary Star's Orbit in Observing and measuring. Core (7 steps):
who is who with the overlay as the check; how far Ganymede moves in two hours; Io's period and radius from
the sinusoid; the prediction and the demonstration that one frame a night gives Io 2.30 days. Quantitative
(4): Ganymede's period and radius, Kepler's law, the mass with its uncertainty, and the 2.9-sigma
disagreement with JPL. Advanced (5): the sky frame's turning, the four moons corrected, the north-south
offset seen 1.37 degrees above the equator, the alias by hand, Galileo's nights. The frames are labelled
synthetic in the first step, which links NASA's Jupiter moons page for a real picture; no authentic sequence
was used (none is cleared, and none was downloaded). Instruments: `js/jovianWidgets.js` (`moon-frames`,
`moon-fit`, `jupiter-weigh`); every stated number is recomputed in `tests/galileanMoons.test.js`.

## Limits

No astrometry on authentic frames, no authentic moving object, and the half-year parallax sign flip are
inherited limits; nothing here claims them. The frames' seeing is an assumed 0.03 Jupiter radii per mark.
The planetary pack's Jupiter is the system's barycentre, which differs from the planet's centre by less than
0.01 Jupiter radii. The pack covers 40 days; a request outside it is refused by `js/mission/ephemeris.js`.
