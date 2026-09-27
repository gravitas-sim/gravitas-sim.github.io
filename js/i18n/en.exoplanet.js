// =============================================================================
// The Exoplanet Observatory's guided investigations in English
// -----------------------------------------------------------------------------
// js/observatory/guides/exoplanet.js loads these with the suite, so the
// runner carries none of them. A step's words are gd.<guide>.<step>.{title,
// text}, with .ok and .no for a step that is checked and .opt.<option> for
// each choice (the ids are in js/observatory/guides/exoplanet.js). Paragraphs
// are separated by a blank line. {value} in an .ok message is the number the
// check found.
// =============================================================================

export const EN_EXOPLANET = {
  'gd.target.hd209458': 'HD 209458’s light curve',
  'gd.target.hd209458-aperture': 'HD 209458’s aperture image',
  'gd.target.kepler13-sap': 'Kepler-13’s collected (SAP) light curve',
  'gd.target.kepler13-pdcsap': 'Kepler-13’s corrected (PDCSAP) light curve',
  'gd.show.crowdHd': 'HD 209458: CROWDSAP',
  'gd.show.crowdK13': 'Kepler-13: CROWDSAP',
  'gd.show.shareA': 'Kepler-13A’s share of the pair’s light, from the catalog',
  'gd.show.adoptedRadius': 'HD 209458’s radius, adopted',
  'gd.show.depthOf': '{target}: depth',
  'gd.show.ppm': '{value} ± {error} parts per million',
  'gd.show.period': 'Period used',
  'gd.show.published': 'k {k}; R* {rs} R☉; Rp {rp} RJ',
  'gd.show.odd': 'Odd-numbered transits: depth',
  'gd.show.even': 'Even-numbered transits: depth',
  'gd.show.apart': 'Their difference, in units of its uncertainty',
  'gd.show.significance': 'The depth, in units of its uncertainty',
  'gd.show.sigmas': '{value} (it takes {limit} to count)',
  'gd.show.primary': 'The transit: depth',
  'gd.show.secondary': 'Half an orbit later: depth',
  'gd.show.epoch': 'Epoch of the deepest box',
  'gd.show.count': 'Transits in the light curve',
  'gd.show.simStar': 'The simulation’s star: radius',
  'gd.show.simPlanet': 'The simulation’s planet: radius',
  'gd.show.rsunRjup': 'Jupiter radii in one solar radius',
  'gd.show.simLink': 'Open the transit lesson in Gravitas',
  'gd.show.how.crowding':
    'HD 209458’s value is from the header of the SPOC file its pack was made from; Kepler-13’s is from its pack; A’s share is from the TESS Input Catalog’s magnitudes.',
  'gd.show.how.stellarRadius':
    'Adopted, not measured here: a light curve gives k, and the radius has to come from the star.',
  'gd.show.how.depths':
    'Computed in this page: the weighted mean flux within a quarter of a transit’s length of mid-transit, against the mean more than one transit’s length from it and from half an orbit later, at the adopted period and the epoch where the dip is deepest. The uncertainty includes noise correlated in time, measured from the light outside the transits.',
  'gd.show.how.published':
    'NASA Exoplanet Archive, Planetary Systems table, retrieved 2026-09-26: each analysis’s radius ratio, the star’s radius (solar radii) and the planet’s (Jupiter radii).',
  'gd.show.how.oddEven':
    'Computed in this page: the depth of the odd-numbered and of the even-numbered transits, each measured as the depths are in Investigation 4.',
  'gd.show.how.secondary':
    'Computed in this page: the same depth, measured half an orbit after the transit instead of at it.',
  'gd.show.how.count':
    'Computed in this page: the orbits in which the light curve has points inside the middle half of the transit.',
  'gd.show.how.simulation':
    'The simulation’s HD 209458 (js/data/exoplanetSystems.js), and the IAU’s nominal solar and Jovian radii.',
  'gd.exo-star.title': '1. Whose light is it?',
  'gd.exo-star.summary':
    'Quality flags, the pixels that were summed, and a second star in the same pixels.',
  'gd.exo-star.intro.title': 'Before the planet, the light',
  'gd.exo-star.intro.text':
    'A light curve is a record of the light that fell on a few pixels of a camera, cadence by cadence. Before it can say anything about a planet, you need to know three things: which cadences were kept, which pixels were summed, and whose light fell on them.\n\nYou will open HD 209458’s TESS light curve and the map of its aperture, and then Kepler-13, where the answer to the last question is two stars.',
  'gd.exo-star.open.title': 'Open HD 209458’s light curve',
  'gd.exo-star.open.text':
    'Open the TESS light curve of HD 209458 from sector 56, observed in September 2022. The observation’s details, beside the plot, list every reduction made before you see it, in order.',
  'gd.exo-star.open.ok':
    'Open. The list of reductions in its details is the light curve’s history.',
  'gd.exo-star.quality.title': 'What the quality flags removed',
  'gd.exo-star.quality.text':
    'TESS marks the cadences it does not trust in a QUALITY column: those taken while the spacecraft unloaded its reaction wheels, or while scattered light swamped the camera, among others. This pack drops every flagged cadence before it averages the rest into 20-minute bins.\n\nHow many cadences did the QUALITY mask drop? The reduction that begins “QUALITY:” says.',
  'gd.exo-star.quality.ok':
    '{value} cadences. The pack drops every flagged cadence rather than deciding which flags are harmless, and it says how many.',
  'gd.exo-star.quality.no':
    'That is not what the reductions say. Find the one that begins “QUALITY:” in the observation’s details.',
  'gd.exo-star.aperture.title': 'The pixels that were summed',
  'gd.exo-star.aperture.text':
    'Open HD 209458’s aperture image: each pixel’s flags say how the pipeline used it. In the measurement panel, choose “Aperture on the image”, measure “Pixels with a flag set”, pick the flag “in the optimal aperture, summed into the light curve”, and measure.\n\nThe light curve is the sum of those pixels, and so of every star whose light falls on them.',
  'gd.exo-star.aperture.ok':
    '{value} pixels. The tool also gives their area on the sky: the light of every star inside it is in this light curve.',
  'gd.exo-star.predict-share.title': 'Predict: two stars, one aperture',
  'gd.exo-star.predict-share.text':
    'Kepler-13 is a pair of stars about 1.2 arcseconds apart in the TESS Input Catalog, much closer together than the width of one TESS pixel, and nearly equally bright. Both fall in one aperture.\n\nPredict: how much of the light in Kepler-13’s aperture belongs to the brighter star, A?',
  'gd.exo-star.predict-share.opt.all':
    'All of it: the pipeline records only its target',
  'gd.exo-star.predict-share.opt.most': 'Most of it, over 80 percent',
  'gd.exo-star.predict-share.opt.half': 'About half',
  'gd.exo-star.predict-share.opt.quarter': 'About a quarter',
  'gd.exo-star.share.title': 'A’s share of the pair’s light',
  'gd.exo-star.share.text':
    'The TESS Input Catalog gives star A a TESS magnitude of 10.2306 and star B 10.4852 (Stassun et al. 2019). Magnitudes are logarithmic: a star Δm magnitudes fainter gives 10^(−0.4 Δm) times as much light.\n\nWhat fraction of the two stars’ light is A’s? Answer with a number between 0 and 1: A’s light divided by A’s and B’s together.',
  'gd.exo-star.share.ok':
    '{value}: barely more than half. B gives almost as much light as A.',
  'gd.exo-star.share.no':
    'Not quite. B gives 10^(−0.4 × 0.2546) times A’s light, so A’s share is 1 ÷ (1 + that).',
  'gd.exo-star.open-k13.title': 'Open Kepler-13’s light curve',
  'gd.exo-star.open-k13.text':
    'Open Kepler-13’s TESS light curve from sector 14, observed in July and August 2019, as it was collected: SAP flux, the sum of the aperture’s pixels before any correction. It is not built into Gravitas: the button installs it from the catalog into this browser, where it stays for offline use, and opens it.',
  'gd.exo-star.open-k13.ok':
    'Open. Its details have one reduction HD 209458’s do not: the pipeline’s estimate of whose light the aperture holds.',
  'gd.exo-star.crowdsap.title': 'What the pipeline says about crowding',
  'gd.exo-star.crowdsap.text':
    'SPOC, the pipeline that made this light curve, estimates how much of the aperture’s light is the target’s, from the catalog’s stars and a model of how each star’s light spreads over the pixels. It records that fraction as CROWDSAP.\n\nWhat is CROWDSAP for Kepler-13? The reduction that begins “crowding:” gives it.',
  'gd.exo-star.crowdsap.ok':
    '{value}. The pipeline gives Kepler-13A only about 55 percent of the light in the aperture.',
  'gd.exo-star.crowdsap.no':
    'That is not what the details say. Find the reduction that begins “crowding:”; the number follows CROWDSAP.',
  'gd.exo-star.why-not-equal.title': 'Why the two numbers differ',
  'gd.exo-star.why-not-equal.text':
    'CROWDSAP is close to the share of the pair’s light you worked out from the catalog, but not equal to it. Why?',
  'gd.exo-star.why-not-equal.opt.aperture':
    'The aperture holds only part of each star’s light, and fainter stars add a little',
  'gd.exo-star.why-not-equal.opt.noise':
    'CROWDSAP is measured from the light curve’s scatter, which is noisy',
  'gd.exo-star.why-not-equal.opt.wrong':
    'One of the two numbers must be a mistake',
  'gd.exo-star.why-not-equal.ok':
    'Yes. CROWDSAP counts only the light inside the aperture: how much of each star’s light falls there depends on where each sits on the pixels, and fainter catalog stars add some too. The magnitudes count all of both stars’ light.',
  'gd.exo-star.why-not-equal.no':
    'Look at what each number counts: the magnitudes count all of both stars’ light, and CROWDSAP only what falls inside the aperture.',
  'gd.exo-star.wrap.title': 'Clean and crowded',
  'gd.exo-star.wrap.text':
    'HD 209458’s aperture holds almost nothing but HD 209458; Kepler-13’s holds little more than half Kepler-13A. The pipeline’s corrected light curve, PDCSAP flux, subtracts the other stars’ share of the light using CROWDSAP; the collected SAP flux keeps it. So in a crowded aperture a transit in SAP flux is shallower, by the share of the light that is not its host’s. Investigation 4 measures by how much.',
  'gd.exo-find.title': '2. Find the transit',
  'gd.exo-find.summary': 'A box search, a period, an epoch and a fold.',
  'gd.exo-find.intro.title': 'A dip that repeats',
  'gd.exo-find.intro.text':
    'A transiting planet dims its star by the same amount, for the same time, once every orbit. A box search looks for exactly that: for each trial period it folds the light curve, finds the best box-shaped dip, and keeps the period whose dip stands out most.\n\nThe light curve is HD 209458’s: 28 days of it.',
  'gd.exo-find.predict-count.title': 'Predict: how many transits?',
  'gd.exo-find.predict-count.text':
    'HD 209458 b was found in 1999 from its star’s wobble, which gave an orbit of about three and a half days. Predict: how many of its transits could sector 56’s 28 days hold?',
  'gd.exo-find.predict-count.opt.one': 'One or two',
  'gd.exo-find.predict-count.opt.three': 'About three',
  'gd.exo-find.predict-count.opt.seven': 'Seven or eight',
  'gd.exo-find.predict-count.opt.twenty': 'Twenty or more',
  'gd.exo-find.search.title': 'Search for it',
  'gd.exo-find.search.text':
    'In the measurement panel, choose “Transit search (box least squares)” and measure with its default settings. It reports the best period, an epoch (a time of mid-transit), the box’s duration and depth, and how far the best peak stands above the rest of the search (SDE).',
  'gd.exo-find.search.ok': 'Found: a period of {value} days.',
  'gd.exo-find.period.title': 'The period',
  'gd.exo-find.period.text':
    'What period did the box search find, in days? Copy it from its result.',
  'gd.exo-find.period.ok': '{value} days.',
  'gd.exo-find.period.no':
    'That is not the search’s period. Copy the period from its result in the measurement panel.',
  'gd.exo-find.minutes-off.title': 'How close is one sector?',
  'gd.exo-find.minutes-off.text':
    'Stassun et al. (2017) give HD 209458 b’s period as 3.52474859 ± 0.00000038 days, from transits spread over many years. By how many minutes does your box search’s period differ from theirs? (A day is 1440 minutes; give the size of the difference.)',
  'gd.exo-find.minutes-off.ok':
    '{value} minutes. One sector holds about eight transits, so a period a minute off moves the last of them by about eight minutes, a small part of a transit three hours long: one sector pins the period only loosely, and the search’s grid of trial periods adds its own step.',
  'gd.exo-find.minutes-off.no':
    'Not quite: subtract one period from the other, then multiply by 1440.',
  'gd.exo-find.fold.title': 'Fold it',
  'gd.exo-find.fold.text':
    'Fold the light curve on the search’s period and epoch: its result has a button, “Fold at this period”, that does it. Folding lays every orbit on top of the first, so each transit falls at phase zero.',
  'gd.exo-find.fold.ok':
    'Folded at {value} days: the transits lie at phase zero, one on top of another.',
  'gd.exo-find.no-error.title': 'Where an uncertainty comes from',
  'gd.exo-find.no-error.text':
    'The box search gave a period, but no uncertainty for it. Where does a period’s uncertainty come from?',
  'gd.exo-find.no-error.opt.grid': 'The spacing of the search’s trial periods',
  'gd.exo-find.no-error.opt.fit':
    'A fit of a transit model, whose covariance gives each parameter a standard error',
  'gd.exo-find.no-error.opt.none': 'A period measured from data has none',
  'gd.exo-find.no-error.ok':
    'Yes. The trial spacing is how finely the search looked, not how well the data pin the period. A fit of a transit model, in Investigation 3, gives the period with an error, and says how far to trust it.',
  'gd.exo-find.no-error.no':
    'The spacing of the trial periods says how finely the search looked, not how well the data pin the period down.',
  'gd.exo-find.wrap.title': 'Found, not yet measured',
  'gd.exo-find.wrap.text':
    'A period, an epoch and a depth from a search: enough to say where the transits are, not yet what made them. A box has a depth; a planet has a size. Investigation 3 fits a model that knows the difference.',
  'gd.exo-fit.title': '3. Fit the transit',
  'gd.exo-fit.summary':
    'The radius ratio, what the data cannot separate, and the planet’s radius.',
  'gd.exo-fit.intro.title': 'A model of a transit',
  'gd.exo-fit.intro.text':
    'The fit panel’s transit model is a dark disk crossing a star that is brighter at its center than at its edge (limb darkening), on a circular orbit. Its parameters are the period and the epoch, the ratio k of the planet’s radius to the star’s, the orbit’s size in stellar radii (a/R*), how far from the star’s center the planet crosses (the impact parameter, b), and two limb-darkening parameters.\n\nThe fit finds the values that bring the model closest to the data, weighted by the data’s errors, and their uncertainties.',
  'gd.exo-fit.fit.title': 'Fit HD 209458’s transit',
  'gd.exo-fit.fit.text':
    'Open the fit panel on HD 209458’s light curve, not folded. Choose the transit model, leave the other stars’ share of the light at 0, and fit.',
  'gd.exo-fit.fit.ok': 'Fitted: k = {value}.',
  'gd.exo-fit.ratio.title': 'The radius ratio',
  'gd.exo-fit.ratio.text':
    'What radius ratio k did your fit find? Copy it from the table of results.',
  'gd.exo-fit.ratio.ok':
    '{value}. The planet covers k² of the star’s disk, but the star is brighter at its center than at its edge, so the depth is not exactly k²: that is why a fit, and not the depth alone, gives k.',
  'gd.exo-fit.ratio.no':
    'Copy k from the results table: the radius ratio’s row.',
  'gd.exo-fit.pair.title': 'What the data cannot separate',
  'gd.exo-fit.pair.text':
    'Look at the table “Which parameters the data separate” under the fit. A value near +1 or −1 means two parameters can trade against each other with almost no change to the fit. Which of these pairs does your fit correlate most strongly?',
  'gd.exo-fit.pair.opt.b-aRs': 'b and a/R*',
  'gd.exo-fit.pair.opt.k-t0': 'k and the epoch',
  'gd.exo-fit.pair.opt.P-t0': 'The period and the epoch',
  'gd.exo-fit.pair.opt.q1-P':
    'The first limb-darkening parameter and the period',
  'gd.exo-fit.pair.ok':
    'Yes. A wider orbit crossed near the star’s center lasts about as long as a closer one crossed nearer its edge, and this light curve barely tells the two apart. That is also why the fit warns that some parameters are poorly determined.',
  'gd.exo-fit.pair.no':
    'Find the entry in the table farthest from zero, and the two parameters it joins.',
  'gd.exo-fit.residuals.title': 'Are the residuals only noise?',
  'gd.exo-fit.residuals.text':
    'The fit reports beta: how much more the residuals scatter, averaged over the transit’s timescale, than independent noise would (Pont, Zucker and Queloz 2006). Beta near 1 means the residuals behave like white noise; above 1, they are correlated in time, and the uncertainties should grow with it.\n\nWhat is beta for your fit?',
  'gd.exo-fit.residuals.ok':
    'Beta = {value}. The results table’s column “Also by the correlated noise” allows for it: those are the uncertainties to quote.',
  'gd.exo-fit.residuals.no':
    'Copy beta from the list of statistics under the results table.',
  'gd.exo-fit.radius.title': 'From a ratio to a radius',
  'gd.exo-fit.radius.text':
    'k is a ratio: the planet’s radius is k times the star’s, and the star’s radius is not in the light curve. This guide adopts R* = 1.19 ± 0.02 solar radii (Stassun et al. 2017). Enter it and its uncertainty in the fit panel’s fields for the star’s radius, and fit again.',
  'gd.exo-fit.radius.ok':
    'Fitted with the star’s radius: the fit now derives the planet’s radius, Rp = {value} Jupiter radii, with the star’s uncertainty added to the fit’s.',
  'gd.exo-fit.planet-radius.title': 'The planet’s radius',
  'gd.exo-fit.planet-radius.text':
    'What planet radius Rp did the fit derive, in Jupiter radii?',
  'gd.exo-fit.planet-radius.ok':
    '{value} Jupiter radii. Stassun et al. (2017) give 1.39 ± 0.02.',
  'gd.exo-fit.planet-radius.no':
    'Copy Rp from the derived rows of the results table.',
  'gd.exo-fit.torres.title': 'Whose star?',
  'gd.exo-fit.torres.text':
    'Torres, Winn and Holman (2008) give the star’s radius as 1.155 solar radii instead. With your k, what would the planet’s radius be with their star? Rp = k × R*, and a solar radius is 9.7312 Jupiter radii.',
  'gd.exo-fit.torres.ok':
    '{value} Jupiter radii: a star 3 percent smaller makes the planet 3 percent smaller. A planet’s radius is only as good as its star’s, and no light curve can check the star’s.',
  'gd.exo-fit.torres.no': 'Multiply your k by 1.155 and by 9.7312.',
  'gd.exo-fit.wrap.title': 'What the fit decided, and what it assumed',
  'gd.exo-fit.wrap.text':
    'The light curve decided k and the transit’s shape, and decided a/R* and b only together. The planet’s radius took one more number, the star’s, adopted from the literature and carried with its uncertainty. The fit panel names every parameter as fitted, fixed or derived: that list is the honest statement of what the data decided.',
  'gd.exo-dilution.title': '4. A star that is not alone',
  'gd.exo-dilution.summary':
    'Kepler-13: a companion’s light hides much of the transit, and the light curve cannot say whose planet it is.',
  'gd.exo-dilution.intro.title': 'Two stars, one transit',
  'gd.exo-dilution.intro.text':
    'Kepler-13 is the pair from Investigation 1: two nearly equal stars, 1.2 arcseconds apart, in one TESS aperture. A planet transits one of them every 1.76 days. Here you measure how much the other star’s light hides of the transit, what that does to the planet’s size, and what the light curve alone cannot tell you.',
  'gd.exo-dilution.open-sap.title': 'Open the collected light curve',
  'gd.exo-dilution.open-sap.text':
    'Open Kepler-13’s SAP light curve: the aperture’s light as it was collected, every star’s in it.',
  'gd.exo-dilution.open-sap.ok': 'Open.',
  'gd.exo-dilution.open-pdcsap.title': 'Open the corrected light curve',
  'gd.exo-dilution.open-pdcsap.text':
    'Now open the PDCSAP light curve of the same sector: the same cadences, with the pipeline’s corrections, one of which subtracts the other stars’ share of the light on the assumption that the light that matters is the target’s, A’s.',
  'gd.exo-dilution.open-pdcsap.ok': 'Open. Compare the transit in each.',
  'gd.exo-dilution.predict-ratio.title': 'Predict: how much shallower?',
  'gd.exo-dilution.predict-ratio.text':
    'Predict: how does the transit’s depth in the collected (SAP) light compare with its depth in the corrected (PDCSAP) light?',
  'gd.exo-dilution.predict-ratio.opt.same':
    'The same: correcting the light cannot change a dip',
  'gd.exo-dilution.predict-ratio.opt.crowdsap':
    'Shallower, by about the factor CROWDSAP',
  'gd.exo-dilution.predict-ratio.opt.double': 'Twice as deep',
  'gd.exo-dilution.ratio.title': 'Both depths, measured alike',
  'gd.exo-dilution.ratio.text':
    'This page measures each transit’s depth the same way: the mean flux over the middle half of the transit against the mean well away from it, at the period 1.763588 days (Esteves et al. 2015) and the epoch where the dip is deepest. What is the SAP depth divided by the PDCSAP depth?',
  'gd.exo-dilution.ratio.ok':
    '{value}: close to CROWDSAP, 0.549. PDCSAP flux is SAP flux with the other stars’ share of the light taken out, which deepens the dip by 1 ÷ CROWDSAP.',
  'gd.exo-dilution.ratio.no':
    'Divide the SAP depth by the PDCSAP depth, both from the panel above.',
  'gd.exo-dilution.fit-raw.title': 'Fit the collected light',
  'gd.exo-dilution.fit-raw.text':
    'Fit the transit model to the SAP light curve with the other stars’ share of the light left at 0: as if every photon in the aperture came from the planet’s host.',
  'gd.exo-dilution.fit-raw.ok': 'Fitted: k = {value}.',
  'gd.exo-dilution.raw-ratio.title': 'The ratio, with the companion’s light in',
  'gd.exo-dilution.raw-ratio.text': 'What radius ratio k did that fit find?',
  'gd.exo-dilution.raw-ratio.ok':
    '{value}. Keep it: the last step sets it beside what others have published.',
  'gd.exo-dilution.raw-ratio.no': 'Copy k from the fit’s results table.',
  'gd.exo-dilution.dilute.title': 'How much light is not the host’s?',
  'gd.exo-dilution.dilute.text':
    'The fit panel’s “other stars’ share of the light” is the fraction of the aperture’s light that is not the host star’s: the model fills the transit in by that fraction. If the host is A, what is it, from CROWDSAP?',
  'gd.exo-dilution.dilute.ok': '{value}: one minus CROWDSAP.',
  'gd.exo-dilution.dilute.no':
    'It is the share that is not A’s: one minus CROWDSAP.',
  'gd.exo-dilution.fit-diluted.title': 'Fit it again, diluted',
  'gd.exo-dilution.fit-diluted.text':
    'Enter that share in the fit panel and fit the SAP light curve again.',
  'gd.exo-dilution.fit-diluted.ok':
    'Fitted: k = {value}, close to what the corrected light curve gives. Taking the companion’s light out of the data, as PDCSAP flux does, and putting it into the model, as the dilution does, are the same correction.',
  'gd.exo-dilution.if-b.title': 'What if the planet orbits B?',
  'gd.exo-dilution.if-b.text':
    'Suppose the planet orbits B instead. Then everything that is not B’s light dilutes its transit, and B has at most one minus CROWDSAP of the aperture’s light. Ignoring limb darkening, k ≈ √(depth ÷ the host’s share of the light).\n\nWith the SAP depth above, what is k if the host is B and all the light that is not A’s is B’s?',
  'gd.exo-dilution.if-b.ok':
    '{value}: larger than for A, and still the smallest it could be. A fainter host needs a bigger planet to make the same dip, and B’s radius is not A’s, so the planet’s radius would change again.',
  'gd.exo-dilution.if-b.no':
    'Divide the SAP depth by one minus CROWDSAP, then take the square root.',
  'gd.exo-dilution.which-star.title': 'Whose planet?',
  'gd.exo-dilution.which-star.text':
    'From this light curve alone, which star does the planet orbit?',
  'gd.exo-dilution.which-star.opt.a': 'A, the brighter star',
  'gd.exo-dilution.which-star.opt.b': 'B, the fainter star',
  'gd.exo-dilution.which-star.opt.cannot': 'The light curve cannot say',
  'gd.exo-dilution.which-star.ok':
    'Right. Both stars sit inside one pixel, and either could host a planet that makes this dip: a different planet for each. Deciding needs evidence that a light curve of both stars together cannot give. The published values above differ where this investigation says they must: the ratio runs from 0.065 to 0.087 and the radius from 1.41 to 2.30 Jupiter radii, because each analysis made its own choice of dilution and of the star’s radius.',
  'gd.exo-dilution.which-star.no':
    'What in the light curve could tell A’s transit from B’s, when both stars fall inside one pixel?',
  'gd.exo-dilution.wrap.title': 'A radius is a set of choices',
  'gd.exo-dilution.wrap.text':
    'One planet has published radius ratios from 0.065 to 0.087 and radii from 1.41 to 2.30 Jupiter radii. Your fits show where much of that range comes from: whose light is taken out, and whose star’s radius multiplies k. An undiluted fit to the collected light gives a ratio close to the smallest published one. When a result depends on a choice the data cannot make, the choice belongs in the result.',
  'gd.exo-planet.title': '5. Is it a planet?',
  'gd.exo-planet.summary':
    'Odd and even transits, half an orbit later, the simulation’s version, and what a transit cannot weigh.',
  'gd.exo-planet.intro.title': 'A dip is not yet a planet',
  'gd.exo-planet.intro.text':
    'Two stars eclipsing each other can make a dip that repeats, and so can such a pair whose light is blended with a brighter star’s. Before calling a dip a planet, astronomers test it with the light curve itself: are the odd and even transits alike, and is there a second dip half an orbit later? Then they ask what the light curve cannot tell them.',
  'gd.exo-planet.predict-binary.title': 'Predict: what gives a binary away?',
  'gd.exo-planet.predict-binary.text':
    'Predict: which of these would show that a dip comes from two stars eclipsing each other, not from a planet?',
  'gd.exo-planet.predict-binary.opt.secondary':
    'A second dip half an orbit later',
  'gd.exo-planet.predict-binary.opt.alternate':
    'Odd and even dips of different depths',
  'gd.exo-planet.predict-binary.opt.vshape':
    'A V-shaped dip instead of a flat-bottomed one',
  'gd.exo-planet.predict-binary.opt.all': 'Any of them',
  'gd.exo-planet.open.title': 'Open HD 209458’s light curve',
  'gd.exo-planet.open.text':
    'Open HD 209458’s light curve again: the next steps measure it.',
  'gd.exo-planet.open.ok': 'Open.',
  'gd.exo-planet.odd-even.title': 'Odd and even',
  'gd.exo-planet.odd-even.text':
    'Two unequal stars eclipsing each other, looked at with half their real period, alternate a deep dip and a shallow one. This page measures the odd-numbered transits and the even-numbered ones separately. Do they differ by more than three times the uncertainty of their difference?',
  'gd.exo-planet.odd-even.opt.equal':
    'No: odd and even are alike within their uncertainties',
  'gd.exo-planet.odd-even.opt.different': 'Yes: they differ',
  'gd.exo-planet.odd-even.ok':
    'That is what the data say. Alike within their uncertainties is no sign of two unequal stars; different would be one.',
  'gd.exo-planet.odd-even.no':
    'Compare their difference, in units of its uncertainty, with 3.',
  'gd.exo-planet.secondary.title': 'Half an orbit later',
  'gd.exo-planet.secondary.text':
    'Half an orbit after a transit, the planet passes behind its star. An eclipsing companion star would pass behind too, and its own share of the light would vanish. This page measures the depth half an orbit after the transit. Is there a dip there of more than three times its uncertainty?',
  'gd.exo-planet.secondary.opt.none': 'No',
  'gd.exo-planet.secondary.opt.dip': 'Yes',
  'gd.exo-planet.secondary.ok':
    'That is what the data say. A companion star’s eclipse would usually show here; a planet’s own light is far fainter than a star’s.',
  'gd.exo-planet.secondary.no':
    'Compare the depth, in units of its uncertainty, with 3.',
  'gd.exo-planet.blend.title': 'A star in the background?',
  'gd.exo-planet.blend.text':
    'A faint eclipsing binary in the same aperture could make a dip too, diluted by HD 209458’s light. SPOC’s CROWDSAP for this light curve is 0.99778908: that share of the aperture’s light is HD 209458’s, by the catalog, and the rest is every other cataloged star’s.\n\nWhat is the deepest dip those other stars could make, if all their light vanished at once? Give it as a fraction of the light.',
  'gd.exo-planet.blend.ok':
    '{value}: a fifth of a percent, against a transit of one and a half. No cataloged neighbor could make this dip, even eclipsed completely; only a star the catalog does not list could, which is why astronomers also look with sharper telescopes.',
  'gd.exo-planet.blend.no':
    'The other stars hold one minus CROWDSAP of the light.',
  'gd.exo-planet.simulation.title': 'The simulation’s HD 209458',
  'gd.exo-planet.simulation.text':
    'Gravitas’s transit lesson and its Transit Lab simulate HD 209458 with a star 1.155 solar radii across and a planet 1.38 Jupiter radii across: rounded values from the literature. What radius ratio k does the simulation use? A solar radius is 9.7312 Jupiter radii.',
  'gd.exo-planet.simulation.ok':
    '{value}. Set it beside the k your fit found in Investigation 3: the simulation is built from published values, your fit from this light curve, and they need not agree to the last digit.',
  'gd.exo-planet.simulation.no': 'Divide 1.38 by 1.155 × 9.7312.',
  'gd.exo-planet.mass.title': 'What a transit cannot weigh',
  'gd.exo-planet.mass.text':
    'The light curve gave HD 209458 b’s size. What would it take to find its mass, and with it its density?',
  'gd.exo-planet.mass.opt.transit': 'A longer light curve',
  'gd.exo-planet.mass.opt.rv':
    'The star’s radial velocity: its wobble toward and away from us as the planet orbits',
  'gd.exo-planet.mass.opt.depth': 'A more precise transit depth',
  'gd.exo-planet.mass.ok':
    'Yes. A transit gives a size; the star’s motion gives a mass (so, for planets pulling on one another, can the timing of their transits). Stassun et al. (2017) give HD 209458 b 0.73 ± 0.04 Jupiter masses, from radial velocities. No radial velocities of a transiting star ship with Gravitas yet, so here the planet’s density stays unmeasured; the radial-velocity lesson works with a simulated survey instead.',
  'gd.exo-planet.mass.no':
    'Which measurement responds to the planet’s pull on its star?',
  'gd.exo-planet.wrap.title': 'From photons to a planet',
  'gd.exo-planet.wrap.text':
    'From a record of photons you found a period, a radius ratio and, with an adopted star, a radius; you tested the dip against two ways an eclipsing binary gives itself away; and you saw a crowded aperture hide half a transit and leave its host undecided. What is left is the planet’s mass, which needs the star’s motion. Every number you checked came from the data by a stated method, or was adopted from a cited source and named as adopted.',
  'gd.suite.exoplanet.intro':
    'Five guides with real TESS light curves, meant to be done in order: whose light a light curve holds, finding a transit, fitting it, a star whose light is not all its own, and whether the dip is a planet at all. Each uses this page’s own tools, and every number a step checks comes from the data or from a cited source it names. The introductory path is the core; the advanced path adds steps to it.',
};
