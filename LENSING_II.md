# Lensing II: the mass inside an Einstein radius, image inversions and the arc radius (Prompt 251, Part A)

The kernel half of Prompt 251, as an invisible pull request (label `invisible` + documentation, into `v3`).
It extends the lensing kernel of Prompt 94 (`GRAVITATIONAL_LENSING.md`) with what an arc measurement needs: lens
distances from redshifts, the mass inside an Einstein radius and its alternative input (the dispersion of a
singular isothermal sphere), the image positions and their inversions, the radius of an arc measured as a circle
through marked points, and the mass with its statistical interval or its model-limited bracket. The validation
contract was committed before any of it existed (`tests/fixtures/lensing2/thresholds.json`, `29b4f276`; two amendments
before the first validator run, no bound moved).

Part B (the time-delay model, the finite-source fit) is in `LENSING_DELAYS_GATE.md`.

## What is built and what is not

Built, in `js/kernels/lensing/enclosed/` (pure modules, SI inside, no DOM, no clock):

| Module | What it holds |
|---|---|
| `distances.js` | `lensDistances` (D_l, D_s, D_ls in metres from two redshifts and a flat cosmology, with refusals), `sigmaCritical` |
| `mass.js` | `enclosedMass` (pi Sigma_cr (theta_E D_l)^2), `massFromDispersion` (the SIS alternative input), `sisProjectedMass`, re-exports of the SIS Einstein angle and dispersion of `lens.js` |
| `images.js` | `pointImagePositions`, `sisImagePositions`, `invertImages` (one image on each side of the lens, SIS or point model, the other model's value beside it), `modelDisagreement` |
| `arc.js` | `fitArc` (the geometric circle through marked points, fixed or free centre, covariance, extent, refusals), `arcExtent` |
| `arcMass.js` | `massFromArc` (the mass from an arc's angular radius, `ring` or `arc`, statistical interval or model-limited bracket, refusals) |
| `synthetic.js` | `syntheticArc`, `ensembleWorld`: labelled synthetic arcs and worlds with a truth manifest |

Not built, because the consumers rule of Carl's 2026-11-05 ruling is unmet (no go-ahead for panels, lessons or viewers
until their gates pass): the lensing mode of the image panel, the cluster-image pack (157), the upper depth of "Einstein
Rings and Arcs", the model-page section, any lesson, instructor material, Spanish string or pack. The extension is imported
by no shipped module (`js/kernels/lensing/index.js` does not re-export it) and is `NEVER_PRECACHED` with its validation
group, so it adds no byte to any bundle (D-R10-251-01).

Prompt 249's result that the run condition names, "the arc radius measured on the image panel", does not exist on `v3`:
249 landed a kernel without an image panel and with the SDSS image terms not confirmed (D-R10-249-01, D-R10-249-02). The
arc-radius measurement here therefore takes marked points from the caller (pixel coordinates and the caller's pixel scale);
the leg that measures an arc on an authentic lensing image is NOT RUN with a fetch request (E2, below). The kernel's results
use the vocabulary of Prompt 150 (`status` 'ok', 'not-constrained', 'refused', asymmetric intervals, a separate model-limited
term); nothing is yet wired to the artifact envelope, there being no consumer.

## The rules (`thresholds.json`, `analysisRule`, the equations in short)

* **R2, the mass.** For an axially symmetric lens the Einstein radius is where the mean convergence is one, so the projected
  mass inside it is exactly `M(<theta_E) = pi Sigma_cr (theta_E D_l)^2 = c^2 theta_E^2 D_l D_s / (4 G D_ls)` with
  `Sigma_cr = c^2 D_s / (4 pi G D_l D_ls)`, whatever the profile inside. It is the total mass in the cylinder, dark and luminous.
  The mass-sheet transformation preserves the critical curves, so this mass is not what the sheet makes uncertain (the delays are, see the
  gate). A real lens is not axially symmetric; the ellipticity and shear correction to the circle is stated and not priced.
* **R3, the alternative input.** The SIS has `theta_E = 4 pi (sigma/c)^2 D_ls/D_s` and projected mass `pi sigma^2 R / G`;
  the two forms of the mass agree at `R = theta_E D_l`. The sigma is the dispersion of the lens's mass; a stellar dispersion is not assumed
  equal to it and no factor between them is tested (E3).
* **R4, the arc radius.** The geometric least-squares circle, Gauss-Newton from the algebraic start; the per-coordinate sigma is
  the caller's and has no default; fixed centre (the radius is the weighted mean distance, with the first-order term from the
  centre's declared sigma, which a full ring cancels and a short arc does not) or free centre (covariance from the Jacobian). A free fit
  with under five points, or with sigma_r / r above 0.25, is 'not-constrained'.
* **R5, the interval.** `[M(theta_E - z s), M(theta_E + z s)]` at a two-sided level, asymmetric because M goes as theta_E squared.
  Redshifts carry no uncertainty and the cosmology is the caller's; a list of alternative cosmologies is reported as a separate
  model-limited spread and never folded in.
* **R6, a single arc.** The outer image of an SIS sits at `theta_E (1 + y)`, so an arc's radius is an upper bound of theta_E. With the
  caller's `sourceOffsetMax` y_max the mass lies in `[M(r/(1+y_max) - 2s), M(r + 2s)]`; without it y_max is 1 (a quarter to the full
  mass of the radius) and no narrow interval is offered. The narrow interval is returned as `statisticalIfOnAxis` and is not the mass.
* **R7 and R8, refusals.** No lens redshift, or none for the source: 'not-constrained' with the angular radius only. A source not
  behind the lens, a non-flat cosmology, a non-positive H0 and a negative density: 'refused'. Nothing is defaulted.
* **R9, the images.** One image each side of the lens: SIS `theta_E = (theta_+ + |theta_-|)/2`, point lens `sqrt(theta_+ |theta_-|)`; the pair cannot tell
  them apart and the kernel returns both, with their ratio (the arithmetic over the geometric mean of the two separations, at least one: how far the SIS overstates a point lens's theta_E). Same-side positions are refused, one image is a bound (`theta_E` at most the image's distance), not a value.

Domain and assumptions, all of them: a thin lens in one plane, a flat Lambda-CDM universe with no radiation (the cosmology kernel's own neglect, 0.5 percent
in distance at the redshifts used), an axially symmetric lens (the mass formula) or an SIS (the dispersion), a known or fitted centre, point images or marked
points with Gaussian position errors. Not modelled: external shear, ellipticity, a second lens plane, substructure, a source with its own structure shifting
the arc's apparent radius, magnification bias, the lens's own light. Solar-mass figures use the tree's rounded solar mass, which differs from astropy's by
0.03 percent (R2 below); every mass leg is in kilograms.

## The synthetic worlds

Every world is SYNTHETIC and carries its truth manifest (`ensembleWorld`): theta_E log-uniform in 3 to 30 arcsec (AM1), z_l in [0.1, 0.6], z_s = z_l + [0.5, 2], pixel
scale 0.1 arcsec, 1 pixel noise per coordinate declared to the fit, a centre jittered about the middle of a 512 pixel frame, the dispersion derived from theta_E and reported.
The validation cosmology is H0 = 70, Om = 0.3, OL = 0.7: round numbers, a claim about nothing.

## Validation contract and measured table (Node 22.23.4, `npm run lensing2:validate`)

Part A rows (27): 20 pass, 0 fail, 3 reported (C4, R1, R2), 4 NOT RUN (B6, E1, E2, E3). Kernel verdict by the committed function: **A** (the closed forms, the oracle legs
that ran, the refusals and the coverage legs pass); product verdict NOT ESTABLISHED (B6, E1, E2, E3 NOT RUN); the consumers clause is unmet. Part B's merged-code legs are in the gate document.

| Leg | What | Measured | Bound | Result |
|---|---|---|---|---|
| A1 | critical density, closed form | 0 | 1e-12 | pass |
| A2 | enclosed mass: two closed forms, the existing point form, theta_E^2 scaling | 4.3e-16 | 1e-12 | pass |
| A3 | SIS: theta_E from sigma, round trip, mass from sigma equals mass from radius | 3.1e-16 | 1e-12 | pass |
| A4 | image positions solve the lens equations, scale with theta_E, SIS magnification | 8.9e-16 | 1e-12 | pass |
| A5 | image inversion round trip; SIS-over-point factor | 1.4e-15 | 1e-12 | pass |
| A6 | noise-free arcs 360, 180, 90 degrees: fixed and free centre | 3.6e-16 radius, 2.7e-14 px centre | 1e-8, 1e-6 px | pass |
| A7 | interval structure (ends, asymmetry, width 4 z s / theta_E) | 3.7e-16 | 1e-12 | pass |
| B1 | D_l, D_s, D_ls against astropy | 9e-15 | 1e-9 | pass |
| B2 | Sigma_cr and mass against the oracle's quadrature of the SIS density | 1.6e-10 | 1e-8 | pass |
| B3 | image positions and magnifications against brentq and a numerical Jacobian | 3.3e-16, 1e-9 | 1e-10, 1e-6 | pass |
| B4 | 20 noisy arcs: free circle fit against scipy least_squares | radius 4.4e-10, centre 9.8e-8 px, sigma 1e-9 | 1e-6, 1e-5, 1e-4 | pass |
| B5 | mass interval against 400000 Monte Carlo draws | 2.2e-4 (0.68), 1.4e-4 (0.95) | 2e-3, 3e-3 | pass |
| B6 | cited independent lens-modelling tool | NOT RUN | 1e-6 | not run |
| C1 | 400 rings, free centre: coverage of the 0.68 and 0.95 intervals | 0.6825, 0.945 | [0.610, 0.750], [0.917, 0.983] | pass |
| C2 | 400 partial arcs (100 to 200 degrees), free centre | 0.6675, 0.925; 0 refused | same bands, refused at most 0.5 | pass |
| C3 | 400 off-axis single arcs: the bracket of R6 contains the truth | 1.0 | at least 0.97 | pass |
| C4 | the same worlds, the narrow on-axis interval | 0.005 (0.68), 0.0125 (0.95) | none | reported |
| D1 to D5 | no redshift, geometry, short arcs (1.0 refused; 0 of the rings), image pairs, the bracket | all as committed | | pass |
| E1, E2, E3 | published cluster, arc on an authentic image, measured dispersion | NOT RUN | | not run |
| R1, R2 | CPU time 0.5 s; tree solar mass against astropy's | reported 3.0e-4 | none | reported |

What C4 teaches, and C3 is for: the narrow interval an arc's radius gives is wrong for an off-axis source (it covers the truth in 0.5 and 1.25
percent of the worlds, because the arc sits at theta_E (1 + y)); the honest answer is the bracket, which covers all 400, and which is wide. That is the pedagogical point
of "what the SIS assumes".

The oracle (`tools/lensing2-oracle/oracle.py`; Python 3.9.22, numpy 1.26.4, scipy 1.13.1, astropy 6.0.1; no Gravitas code) gets its distances and constants from astropy,
the mass by quadrature of the SIS profile (a different route from the critical-density form), image roots from brentq and magnifications from a numerical Jacobian, circle fits from
scipy `least_squares` started at the centroid, and the interval from 400000 draws. Its inputs file is written by `make-inputs.mjs` from the committed thresholds and the kernel's
labelled generator (points only, never an expected value). **Order of events, stated plainly:** the thresholds were committed first, then the amendments, then the oracle was run
and its results committed, then the kernel and the validator were committed; the kernel module files were written in the working tree before the oracle ran (they are not a
function of it), and the only run of the kernel before the validator was a smoke test of a throwaway seed that printed a radius and a mass. No oracle input depends on a kernel result.

## What the cited-tool leg (B6) and the authentic legs (E1 to E3) need: files for Carl to fetch

Nothing was fetched and no published Einstein radius, mass, dispersion, redshift, catalogue value or licence term was typed. The lens-modelling tool is not installed
(no lenstronomy, glafic or similar on this machine) and installing one is a download, so B6 is NOT RUN. The requests, each to be saved under
`tests/fixtures/lensing2/authentic/` with a `SOURCES.json` giving the source, the terms as read from a saved copy and the retrieval date; any object or tool named below is
a suggestion from memory, unverified, and Carl may choose others:

1. **B6, the independent tool.** One lens-modelling code Carl is willing to install in a throwaway environment (for example one of the widely used open-source ones;
   unverified), its version, and its output for an SIS and for a point-mass lens at each redshift pair and Einstein angle listed in
   `tests/fixtures/lensing2/oracle-inputs.json` (`redshiftPairs`, `thetaEArcsec`, the validation cosmology): the Einstein radius it returns for a given velocity dispersion or mass
   and the mass it computes inside that radius, with the tool's licence saved. File `tool-pin.json`: `{tool, version, cosmology, cases: [{zl, zs, thetaEArcsec, massKg}]}`.
2. **E1, a published cluster.** One lensing cluster's published Einstein radius for a stated source redshift, and the paper's mass inside it, with the lens and source redshifts, the cosmology
   the paper used, the paper's uncertainties and the table or page they come from, from a source whose terms allow the numbers to be committed (a per-source rights
   decision, 7.5 rule 4). File `cluster.json`: `{cluster, zl, zs, thetaEArcsec, sigmaThetaEArcsec, massMsun, sigmaMassMsun, cosmology, citation, table}`. The contract is fixed: the kernel's mass
   inside the published radius against the published mass within two published sigma; nothing is tuned.
3. **E2, an arc on an authentic image.** A public-domain image of a lensing cluster (a space-agency release whose terms Carl reads and saves), its pixel scale from the image's header or release notes,
   the marked points of one arc (pixel coordinates, three to a dozen, with the position sigma Carl chooses and states) and the lens centre, and the published arc radius or Einstein radius of that cluster.
   File `arc-marks.json`. The image itself is a 157 pack decision (packs have 0 B of room; a sidecar no precache tier reads, counting only its manifest, is the Prompt 220 pattern).
4. **E3, a measured dispersion.** A lens's published stellar or galaxy velocity dispersion with its source, to compare with the SIS value its arc implies. File `dispersion.json`. No factor between the
   two dispersions is assumed.

## The failing leg

None in Part A. The one failing leg of this pull request is P2 of Part B (`LENSING_DELAYS_GATE.md`), on already-merged code.

## Open questions for Carl

1. The consumers rule: which of the image-panel lensing mode, the cluster pack, the upper depth of "Einstein Rings and Arcs" and the model section may be built, once E1 and E2 have data.
2. The files above (B6, E1 to E3), or a ruling that the kernel stands as a validated demonstration with the authentic legs left NOT RUN.
3. Whether a displayed solar-mass figure should use the tree's rounded solar mass (3.0e-4 above astropy's) or a more exact constant (a decision for `constants.js`, which this prompt does not touch).
4. P2 (in the gate document): the bound or the quadrature.

## Inherited limits to state in any claim built on this kernel

The mass is the total projected mass inside the Einstein circle, not the mass of a halo, and not a virial mass; an arc's radius is theta_E only for a source near the axis
(the bracket says how far), and a cluster is not an SIS; the interval is statistical and assumes the declared position errors and a known cosmology; no authentic lens, event or dispersion has
been analysed by this kernel.

## References (by name; cited from memory and unverified: Carl verifies them from the papers before any lesson cites them)

Schneider, Ehlers and Falco, *Gravitational Lenses* (1992), for the lens equation, the critical density, the SIS and the point lens; Narayan and Bartelmann, *Lectures on gravitational lensing*
(1996), for the Einstein-radius mass and the SIS dispersion relation; Refsdal (1964) and Falco, Gorenstein and Shapiro (1985) for the delay and the mass-sheet degeneracy (the gate document).

<!-- Listed in DOCUMENTS.md. -->
