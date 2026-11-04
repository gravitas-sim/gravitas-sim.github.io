# Cluster dynamics (Prompt 237)

The kernel in `js/kernels/dynamics/`: the times a stellar system takes to cross itself, to forget its starting
point, to sort its stars by mass and to lose them; the drag that slows a heavy body moving through lighter ones; and
the virial theorem's mass of a cluster from the speeds of its stars. Pure modules, not imported by any shipped page.
The validation contract was committed before any module existed (`tests/fixtures/dynamics/thresholds.json`); the gate
that decides whether the engine's own cluster runs may be shown as evidence is `DYNAMICS_REFERENCE_GATE.md`.

## What this is, and what it is not

It is a set of relations a student can compute with and a measurement that says "not constrained" when the data cannot
carry it. It is not an N-body code, not a model of any real cluster, and not evidence that the engine relaxes like a
real cluster: the engine's regression distributions (Prompt 137) are regression bounds, not relaxation evidence, and
the engine is planar and softened. Quantitative cluster evolution is shown only beside the independent reference
runs of the gate.

Units: parsecs, kilometres per second, solar masses, megayears. G is never typed: it is derived from the IAU 2015
nominal GM of the Sun, the astronomical unit and the parsec as 648000/pi astronomical units (`constants.js`), the
same definitions the oracle uses.

## The relations

Every function returns a record, `{ status: 'ok', value, unit, relation, assumes }` or a refusal
`{ status: 'refused', code, why }`; the `assumes` list is what a report must print beside the number.

| Relation | Form | Assumptions and limits |
|---|---|---|
| Dynamical time | t_dyn = sqrt(R^3 / (G M)) | R and the mass inside it |
| Crossing time | t_cross = R / v | v the speed the question means (rms, not a line-of-sight component) |
| Half-mass relaxation (Spitzer's form) | t_rh = 0.138 N^(1/2) r_h^(3/2) / (m^(1/2) G^(1/2) ln(gamma N)) | N stars of one mean mass, in or near virial equilibrium; gamma stated by the caller (0.11 equal masses, 0.02 a mass spectrum, 0.4 the older choice); refused when ln(gamma N) < 1 (AM1) |
| Local relaxation (Chandrasekhar) | t_relax = v^3 / (8 pi G^2 m rho ln Lambda) | v the rms speed, rho the mass density, m the field-star mass; ln Lambda stated |
| Mass segregation | t_seg = (m_mean / m) t_rh | an order of magnitude (Spitzer 1969), for a star above the mean mass; printed with those words |
| Evaporation | t_ev = c t_rh, c = 300 cited | an order of magnitude for an isolated, tidally truncated cluster |
| Dynamical friction | dv/dt = -4 pi G^2 M rho ln Lambda f(X) / v^2, X = v / (sqrt 2 sigma), f(X) = erf X - 2X exp(-X^2) / sqrt(pi) | a body much heavier than the field stars, a Maxwellian uniform background, the wake not modelled; ln Lambda is an argument and has no default |
| Sinking in a singular isothermal sphere | t = (r_i^2 - r_f^2) v_c / (2 G M ln Lambda f(1)) | derived below; a circular orbit that stays nearly circular, M far below the enclosed mass |
| Coulomb logarithm | ln Lambda = ln(b_max / b_min) | refused unless b_max > b_min > 0 |
| Criterion | collisionless when T <= 0.1 t_rh, collisional when T >= t_rh, transitional between | a convention, printed as one; relaxation is gradual |
| Virial mass | M = eta sigma_los^2 R_h / G, eta = 32 / pi | below |

The sinking time is derived rather than cited. In a singular isothermal sphere rho = v_c^2 / (4 pi G r^2) and
sigma = v_c / sqrt 2, so a body on a circular orbit has X = 1 and the drag is G M ln Lambda f(1) / r^2 per unit mass,
with f(1) = 0.4276; the torque r F removes angular momentum M v_c r at that rate, so r dr/dt = -G M ln Lambda f(1) / v_c
and the time follows. Its 1.17 / ln Lambda is 1 / (2 f(1)).

The virial factor is derived too. For an isotropic Plummer sphere <v^2> = (3 pi / 32) G M / a, the line-of-sight
dispersion is one third of that, and the projected half-mass radius is a, so M = (32 / pi) sigma_los^2 R_h / G. The
oracle integrates the Jeans equation and the projected mass numerically and agrees to 4e-10 (leg A3).

Three coefficients of the cited relations (0.138; the two gammas; 300; the segregation factor of one) are written from
the cited texts by the author, no agent fetched the sources, and `CITED` in `constants.js` flags each `verify: true`
until Carl has checked it against the page.

## The virial mass of a cluster, with its interval and its refusals

`virialMass({ x, y, v, e, seed })` takes the members' projected positions (pc), line-of-sight velocities and errors
(km/s). The dispersion is the maximum-likelihood intrinsic dispersion with the errors (a root find, its Fisher error
alongside); R_h is the projected half-number radius about the centroid. The interval is a case bootstrap of the members
(the statistics kernel of Prompt 154, 400 draws, seeded) combined in the logarithm with a structure term of 0.15 (one
sigma, lognormal) for profiles that are not Plummer. **The structure term is an assumption, not a measurement**, and
every report carries it. Not constrained, with the reason named: fewer than 20 members; a dispersion not resolved at
4 times its Fisher error (the unresolved case is a measurement error as large as the dispersion); more than half of
the resamples unresolved. Refused: a non-finite value, a non-positive error, arrays of unequal length, a half-number
radius of zero.

The assumptions it prints: the members are a random sample with no foreground and no binaries inflating the
dispersion, the cluster is in virial equilibrium, pressure supported and not rotating, and R_h of the members stands
for the half-light radius.

## What a short run can and cannot show

A run of a few hundred bodies for a few tens of crossing times is some crossing times long and a few relaxation times
long at best: it can show the cluster settling, a first sorting of the heaviest stars toward the middle, and stars
leaving. It cannot show evaporation as the slow loss of a long-lived cluster (a real one takes hundreds of relaxation
times), it cannot show anything about a three-dimensional cluster (the engine is planar and its inner force is a
softened floor), and a single run says nothing because the system is chaotic: only ensemble means are comparable.
The starting velocities of the gate's family S are not a distribution-function equilibrium, so the escaped fraction at
early times is mostly the starting transient and is not claimed as two-body evaporation.

## Validation contract (section 7.5 item 8)

Committed in `tests/fixtures/dynamics/thresholds.json` before the kernel existed; the pinned table is
`tests/fixtures/dynamics/results.json`, the failing and not-run legs are in `failed-legs.json`, and
`npm run dynamics:validate` reruns the table.

RESULTS_TABLE

The suite group "Cluster dynamics" (`js/validation/groups/dynamics.js`, six checks) holds the closed forms, a sampled
Plummer virial factor, the sinking time against an integrated orbit and the 19-member refusal; it does not repeat the
legs that cross their bound.

## Supply format for leg B1

`tests/fixtures/dynamics/published-relaxation-times.json`:
`{ "source": "...", "retrieved": "YYYY-MM-DD", "terms": "...", "clusters": [ { "name": "...", "mass": solar masses,
"halfMassRadius": pc, "logTrhYears": number } ] }`, at least 10 clusters, fetched by Carl. The kernel's t_rh is
computed from the table's own mass and radius with a mean stellar mass of 0.4 solar masses and gamma 0.11 (both fixed in
the thresholds file before any table was seen) and must lie within 0.30 dex.

## References

Chandrasekhar 1942 (Principles of Stellar Dynamics) and 1943 (ApJ 97, 255); Spitzer 1969 (ApJ 158, L139), Spitzer and
Hart 1971 (ApJ 164, 399), Spitzer 1987 (Dynamical Evolution of Globular Clusters); Giersz and Heggie 1994 (MNRAS 268,
257) and 1996 (MNRAS 279, 1037); Binney and Tremaine 2008 (Galactic Dynamics); Aarseth, Henon and Wielen 1974 (A&A
37, 183) for the Plummer sampling; Makino and Aarseth 1992 (PASJ 44, 141) for the reference code's scheme.
