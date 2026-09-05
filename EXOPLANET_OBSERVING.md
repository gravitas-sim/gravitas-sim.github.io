# The exoplanet observing system

Gravitas could already measure a planet's radius from a transit. It can now
measure the same planet's mass from its star's wobble, combine the two into a
density, and place the result against the habitable zone the Goldilocks lesson
already models. That is the full inference chain of exoplanet characterization,
end to end, in one interface.

This document covers what was built, the decisions worth knowing about, and what
was deliberately left undone.

---

## One observer, three instruments

The light curve used to own an `observerAngleDeg` and the arrow that set it. That
was the right shape while photometry was the only measurement that depended on
where you stood. It stops being the right shape the moment three instruments have
to agree.

[`js/observerGeometry.js`](js/observerGeometry.js) is now the single source of
truth, and it holds two quantities that are not the same thing:

**Position angle** is the old observer angle: which way around the orbital plane
you are standing. It decides *when* conjunction happens, and for a circular orbit
it changes no amplitude at all.

**Inclination** is how tilted the orbit looks from here. 90° is edge-on, 0° is
face-on. This is the quantity that scales the radial-velocity amplitude, opens or
closes the astrometric ellipse, and decides whether a transit happens.

### A 3-D viewing geometry over a 2-D model

The dynamics stay planar. Gravity is still integrated in the z = 0 plane and this
work did not change that. What is three-dimensional is the *observing* geometry: a
line-of-sight unit vector is built analytically from the two angles,

```
n  = ( sin i cos φ ,  sin i sin φ ,  cos i )
e1 = ( -sin φ , cos φ , 0 )
e2 = n × e1
```

and any simulated position or velocity is projected onto it. That is enough for a
correct projected separation, a correct line-of-sight velocity and a correct sky
position, without a 3-D N-body rewrite.

The reason this refactor was safe: at i = 90° those formulas reduce **term for
term** to the arithmetic `lightCurve.js` already used. Backward compatibility is
proven rather than hoped for, and there is a test asserting agreement to twelve
decimal places.

Inclination now genuinely drives the light curve. Measured on the running app:

| inclination | 90° | 89° | 87° | 85° | 80° |
| --- | --- | --- | --- | --- | --- |
| transit depth | 1.825% | 1.818% | 1.739% | 1.505% | none |

No fake opacity. The planet's projected chord slides off the disc, and the cutoff
near 85–86° matches the real geometry of HD 209458.

---

## The instruments

**Radial Velocity** projects the observed star's actual simulated velocity onto
the shared line of sight and plots it against time. It reports the **half-range**
of the samples taken, ½(max − min), not the peak-to-peak range — conflating
those is the commonest factor-of-two error in the subject. For HD 209458 b, a
circular single-planet system observed over a full cycle, that half-range is the
semi-amplitude: **84.0 m/s against an analytic 83.9**.

The panel says "half-range observed so far" until it has watched the curve turn
around at both extremes and cross its own midline twice, because until then the
number is a lower bound. It keeps saying "half-range" afterwards, because the
half-range equals K only for a single planet on a circular orbit: an eccentric
orbit's velocity curve is not a sinusoid, and two planets give a superposition.

**Astrometry** plots the star's path on the sky about the barycenter. It reports
the **largest star–barycenter separation observed**, in AU and as an angle,
keeping the two visibly separate because distance changes the second and never
the first. That maximum is not in general the semi-major axis of the reflex
orbit: the barycenter sits at a *focus*, so on an eccentric orbit the largest
offset is the apoapsis distance a(1 + e). The astrometric signature α = a_star/d
quoted in the literature uses a_star, and recovering that from a path needs an
orbit fit the panel does not attempt — the lesson's model widget computes α from
known elements instead, which is a different kind of claim and is labelled as
one.

Both take one sample every 60 ms rather than every frame, hold bounded arrays, and
do no work at all when closed.

### They agree, and that is the point

Measured across an inclination sweep with both panels open:

| inclination | RV half-range | 84 × sin i | max angular offset | sky path |
| --- | --- | --- | --- | --- |
| 90° | 84.0 m/s | 84.0 | 0.566 µas | line |
| 60° | 72.8 m/s | 72.7 | 0.566 µas | ellipse |
| 30° | 42.0 m/s | 42.0 | 0.566 µas | ellipse |
| 0° | **0.0 m/s** | 0.0 | **0.566 µas** | circle |

HD 209458 b is on a circular orbit, so for this system the RV half-range is K
and the maximum offset is a_star; the columns can be read as those quantities
here, and could not be on an eccentric system.

The last row is the scientific point the lesson turns on, and the one most often
got wrong: **the astrometric signal does not vanish face-on.** Only its
projected shape changes. Radial velocity dies there and astrometry does not, which
is why the two methods are complementary rather than redundant.

Distance behaves correctly too: 48.3 pc → 483 pc shrinks the angle exactly ten
times, from 0.566 to 0.0566 µas, while the physical offset stays at
2.73 × 10⁻⁵ AU.

---

## The star has to actually move

Transit Lab pins its star. `star_only_gravity: true`, and the primary is placed at
rest so the light curve stays centered. That is harmless for photometry and
actively misleading for an RV panel: a student would read zero and conclude that
planets do not move their stars.

Two things follow.

**A new scenario.** The Exoplanet Characterization Lab initializes HD 209458 and
its planet in the center-of-mass frame with zero net momentum. Measured against
the analytic prediction, the simulated star reproduces K to **100.3%** at the
scenario's own speed.

**A refusal to fake it.** Pointed at a scenario whose star is pinned, the RV panel
reports no measurement at all and says why. It would otherwise have shown a
plausible −31 m/s, an artifact of subtracting a barycenter whose momentum is not
conserved. A believable wrong number is worse than none.

---

## One source of truth, enforced

The characterization panel does not recompute insolation or habitable-zone
boundaries. It calls [`js/habitability.js`](js/habitability.js), the same module
The Goldilocks Question uses, and there is a test asserting the two return
identical values across four stellar cases. Any future edit that inlines a copy
will fail it.

Similarly, [`js/data/exoplanetSystems.js`](js/data/exoplanetSystems.js) is the one
home for HD 209458's parameters, which were previously written out in three
places. And [`js/constants.js`](js/constants.js) now holds the physical constants:
`G_SI` had been declared three separate times and `SOLAR_MASS_KG` twice.

---

## The lesson

**Finding Planets by Their Tug**, 37 steps, sits between Shadows and Goldilocks in
the browser so the three read as a sequence. Each still stands alone.

It moves from *both bodies orbit the barycenter* through the Doppler shift, a live
RV curve, K, weighing the planet, the M sin i degeneracy and why a transit escapes
it, astrometry as the complementary method, and finally mass plus radius into a
density placed against the zone.

It ends on three candidate planets designed so that **no single column identifies
the best one**: B is in the zone but too light to be rock, C is rocky but thirty
times too irradiated, and only A is both. There is a test that fails if a future
edit ever makes the exercise answerable from one measurement.

---

## Panel coexistence

Three instruments will not fit stacked on any ordinary screen. When the column
runs out of room, the least recently used panels collapse to their title bar
rather than sliding off the top; clicking a collapsed panel brings it back and
collapses another. Verified with all three open at 1920×1080 down to 1024×768: no
overlap, nothing clipped, and the inclination slider always reachable in whichever
panel is expanded.

Two bugs found and fixed along the way. `offsetParent` is always `null` for a
`position: fixed` element, so the first open-check reported every panel closed and
the stack never formed. And the first height cap clipped the observer controls off
the bottom of the RV panel, which is the one control that must never become
unreachable; the chart is now the flexible region instead.

---

## What was deliberately not done

**No 3-D dynamics.** Mutual inclinations, nodal precession and the real
three-dimensional architecture of multi-planet systems are all absent. Only the
viewing geometry is three-dimensional, and the model page now says so.

**No noise model.** The lesson teaches the signal before the noise. Real
uncertainty bars would be a reasonable later addition and are noted on the model
page as absent.

**No instrument sensitivity claims.** The astrometry panel will happily show a
sub-microarcsecond signature. It does not claim any telescope could measure it,
and does not name missions.

**`JUPITER_MASS_UNIT` was left alone.** It is inconsistent with `SOLAR_MASS_UNIT`
by a factor of 52.4, so gas-giant masses displayed in Jupiter units are wrong
across the app. It is a pre-existing bug whose fix could change tuned scenarios,
so it wants its own change with a scenario sweep behind it. The new scenario and
data module sidestep it by converting through the solar mass.
