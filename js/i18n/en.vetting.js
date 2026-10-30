// The vetting panel's words, in English (Prompt 228). Every candidate is synthetic and the
// panel says so; the verdict and reason words are fixed text, so they translate by key.
export const EN_VETTING = {
  'vetW.title': 'Vetting a candidate',
  'vetW.note':
    'A dip that repeats is only a candidate. Three tests try to reject it: do odd and even transits have the same depth, is there a second eclipse half an orbit later, and is the light that dips at the target’s position. Each test says pass, fail or inconclusive, and inconclusive is an answer of its own: the data could not decide. A candidate that no test rejects is not validated. Every candidate here is synthetic: a model made it, and the truth can be shown.',
  'vetW.control.candidate': 'Candidate',
  'vetW.control.plots': 'Show the plots',
  'vetW.control.view': 'Plot',
  'vetW.control.truth': 'Show what made it',
  'vetW.cand.0': 'A: a clean dip',
  'vetW.cand.1': 'B: deep and shallow dips',
  'vetW.cand.2': 'C: a dip and a second dip',
  'vetW.cand.3': 'D: a clean dip, no frames',
  'vetW.cand.4': 'E: a clean dip, with frames',
  'vetW.cand.5': 'F: a faint dip',
  'vetW.cand.6': 'G: a clean dip, close neighbor',
  'vetW.cand.7': 'H: a noisy dip',
  'vetW.view.0': 'odd and even transits',
  'vetW.view.1': 'half an orbit later',
  'vetW.view.2': 'where the light dips',
  'vetW.on': 'on',
  'vetW.off': 'off',
  'vetW.axis.offset': 'Time from the dip’s center, in transit durations',
  'vetW.axis.flux': 'Relative flux',
  'vetW.axis.x': 'Pixel x',
  'vetW.axis.y': 'Pixel y',
  'vetW.legend.odd': 'Odd transits',
  'vetW.legend.even': 'Even transits',
  'vetW.legend.half': 'Half an orbit later',
  'vetW.legend.target': 'Target star',
  'vetW.legend.dic': 'Where the light dips',
  'vetW.legend.neighbor': 'Neighbor (truth)',
  'vetW.verdict.pass': 'pass',
  'vetW.verdict.fail': 'fail',
  'vetW.verdict.inconclusive': 'inconclusive',
  'vetW.verdict.notRun': 'not run',
  'vetW.reason.depths-agree':
    'the odd and even depths agree, and the test could have seen a difference',
  'vetW.reason.depths-differ': 'odd and even transits have different depths',
  'vetW.reason.too-few-transits': 'too few transits of one parity to compare',
  'vetW.reason.no-signal': 'no dip is detected at the stated ephemeris',
  'vetW.reason.low-power':
    'the data are too noisy to exclude what the test looks for',
  'vetW.reason.no-coverage': 'the data do not cover half an orbit later',
  'vetW.reason.deep-secondary':
    'a second eclipse that deep is not a planet’s own light',
  'vetW.reason.detected-below-limit':
    'a faint second eclipse, shallow enough for a planet’s own light',
  'vetW.reason.not-detected':
    'no second eclipse, and the test could have seen a deep one',
  'vetW.reason.on-target':
    'the dip is at the target’s position, and a source beyond the exclusion radius would have shown',
  'vetW.reason.off-target':
    'the light that dips is not at the target’s position',
  'vetW.reason.too-few-frames': 'too few frames in or out of transit',
  'vetW.reason.no-difference-signal':
    'the difference image is too faint to place the dip',
  'vetW.reason.centroid-edge': 'the target is too near the edge of the frame',
  'vetW.row.candidate': 'Candidate',
  'vetW.v.candidate':
    '{n} light-curve points every 3 minutes, {s} percent noise per point, repeating every {p} d; {f}',
  'vetW.v.frames': '{n} frames of a 17 by 17 pixel stamp',
  'vetW.v.noFrames': 'no frames were taken',
  'vetW.row.oddEven': 'Test 1: odd and even depths',
  'vetW.v.oddEven':
    '{v}: {r}. Depths {a} and {b} percent, difference {d} ± {s} percent ({z} sigma); it could see a difference of {m} percent, {q} percent of the depth',
  'vetW.v.oddEvenNone': '{v}: {r}',
  'vetW.row.secondary': 'Test 2: a second eclipse',
  'vetW.v.secondary':
    '{v}: {r}. Depth at half an orbit later {d} ± {s} percent; it would have seen {u} percent, {q} percent of the primary',
  'vetW.v.secondaryNone': '{v}: {r}',
  'vetW.row.centroid': 'Test 3: where the light dips',
  'vetW.v.centroid':
    '{v}: {r}. The dip is {d} pixels from the target ({z} sigma); a source farther than {x} pixels would have shown',
  'vetW.v.centroidNone': '{v}: {r}',
  'vetW.v.centroidNotRun':
    'not run: no frames were taken, so this test says nothing',
  'vetW.row.overall': 'Overall',
  'vetW.overall.rejected':
    'Rejected: at least one test fails. This is not a planet on this evidence.',
  'vetW.overall.survives':
    'Not rejected: every test that ran passed. That is not validation: the tests rule out some false positives and leave others.',
  'vetW.overall.undecided':
    'Undecided: no test fails, but at least one could not decide. Say what would decide it.',
  'vetW.row.rates': 'What the thresholds do',
  'vetW.v.rates':
    'On seeded synthetic ensembles: a real planet’s transits are rejected by test 1 in {a} percent and by test 2 in {b} percent; a blend of unequal stars passes test 1 in {c} percent and a binary’s second eclipse passes test 2 in {d} percent; the frames reject a planet on its own target in {e} percent and pass a neighbor’s blend in {f} percent',
  'vetW.row.record': 'Record',
  'vetW.v.record':
    '{n} quantities with their uncertainties ({k}); the verdicts are in its provenance',
  'vetW.row.truth': 'What made it',
  'vetW.truth.clean':
    'A planet: a dip of a star that has one planet, nothing else.',
  'vetW.truth.alternating':
    'A blend: a binary of two unequal stars, behind or beside the target, at twice the period. Its deeper eclipses are the odd dips and its shallower ones the even dips; its light is 2 percent of the total.',
  'vetW.truth.secondary':
    'A binary on the target itself, at the period shown: its second eclipse is half an orbit later, at half the primary’s depth.',
  'vetW.truth.twin':
    'A blend: a binary of two equal stars at twice the period. Every dip is the same depth and there is no second eclipse at half the period: the light curve cannot tell it from a planet.',
  'vetW.truth.twin-frames':
    'The same blend, with frames: the binary is a neighbor 1.6 pixels from the target.',
  'vetW.truth.faint':
    'A planet, in noise 80 times larger than the clean candidate’s, and faint frames.',
  'vetW.truth.close':
    'The same equal-star blend, but the binary is 0.15 pixel from the target, closer than the frames can separate.',
  'vetW.truth.marginal':
    'A planet whose odd transits are 10 percent deeper and whose even transits 10 percent shallower than the average: a 20 percent difference, in noise 30 times the clean candidate’s.',
  'vetW.row.assumes': 'Assumes',
  'vetW.a':
    'Synthetic data with white noise; a circular orbit (the second eclipse is searched at half an orbit); the ephemeris given; one neighbor in the frames; no detector effects. A pass rules out what the test could see and nothing else.',
};
