// ===========================================================================
// The period-to-pitch law
// ---------------------------------------------------------------------------
// js/sonify/law.js is the one audio map in the project that does not throw
// anything away, and these checks are what that claim means.
//
// The existing sonification is the contrast worth stating. js/audio.js
// compresses orbital frequency through log2(1 + f*40) and then quantizes the
// result onto a minor pentatonic, which is a good soundtrack and a useless
// instrument: the compression is monotonic but the quantization is not
// invertible, so two orbits 6% apart can land on the same degree and a
// listener has no way back to either number. Nothing in this suite checks
// js/audio.js, because there is nothing there to check - it is not claiming
// to encode a quantity.
//
// This group checks four things about the law and one thing about its
// resolution. The first three test the implementation against a constant
// somebody can look up - 1200, 701.955 and 884.359 are how the octave, the
// just fifth and the just major sixth are printed in any tuning table - so a
// base-e logarithm or a mangled 1200 fails against a recognisable number
// rather than against a rearrangement of the same formula.
//
// They are `analytic` and not `data`, and the distinction is not pedantry.
// Those three values are 1200*log2(r) rounded; nobody measured them. A row
// labelled `data` renders as "published" on the validation page, which tells
// a reader this project compared itself against the literature - and here it
// did not. What it compared itself against is the definition of the cent.
//
// What none of this establishes is that a person heard anything. There is no
// machine check anywhere in this repository that can establish that, and the
// resolution check below is deliberately written so it cannot be mistaken for
// one.
// ===========================================================================

/**
 * Run this group's checks.
 *
 * @param {object} ctx - The loaded modules, `add` and `lab` (physicsChecks.js)
 */
export default async function run({ sonifyLaw, add }) {
  const octave = sonifyLaw.periodToCents(2, 1);

  add({
    group: 'Sonification law',
    kind: 'analytic',
    name: 'A 2:1 period ratio is exactly one octave',
    measured: octave,
    expected: 1200,
    unit: 'cents',
    tolerance: 0,
    why: 'Checked exactly, with no tolerance at all, because it is exact in IEEE 754 and must stay that way: Math.log2(2) is 1 to the bit, so 1200*log2(2) is 1200 to the bit. A tolerance here would hide the one arithmetic mistake that would be caught for free - a base-e logarithm left in place, or a 1200 that became 1200.0000001 through some algebraic rearrangement. The octave is the anchor every other interval is read against, so it is the one value in the group that is allowed no slack.',
    source:
      'The cent is 1/1200 of an octave - Ellis, appendix XX to Helmholtz, On the Sensations of Tone (2nd English edition, 1885).',
  });

  add({
    group: 'Sonification law',
    kind: 'analytic',
    name: 'A 3:2 period ratio is a just perfect fifth',
    measured: sonifyLaw.periodToCents(3, 2),
    expected: 701.955,
    unit: 'cents',
    tolerance: 1e-3,
    toleranceKind: 'absolute',
    why: 'What 701.955 is, exactly: 1200*log2(3/2) rounded to three decimals, which is how every tuning table prints the just fifth. It is not an independent measurement of anything and this check is not a comparison against the literature - it is the identity, written out to the precision a musician would recognise, so that a base-e logarithm or a 1200 that became something else fails against a number somebody can look up rather than against a rearrangement of the same formula. The implementation returns 701.9550008653874, agreeing to 9e-7 cents; the tolerance is the resolution of the printed figure rather than a bound on the arithmetic, because tightening it would only test how many digits somebody wrote down. A thousandth of a cent is about a ten-thousandth of the smallest interval any listener can hear.',
    source:
      'The cent is 1/1200 of an octave - Ellis, appendix XX to Helmholtz, On the Sensations of Tone (2nd English edition, 1885). The interval value is derived from that definition, not measured.',
  });

  add({
    group: 'Sonification law',
    kind: 'analytic',
    name: 'A 5:3 period ratio is a just major sixth',
    measured: sonifyLaw.periodToCents(5, 3),
    expected: 884.359,
    unit: 'cents',
    tolerance: 1e-3,
    toleranceKind: 'absolute',
    why: 'Same reasoning and the same tolerance as the fifth above, and here for a different purpose: the fifth is close enough to a simple fraction of an octave that a sign error or a factor of two can survive it, and the major sixth is not. 884.359 is 1200*log2(5/3) to three decimals - derived from the definition of the cent, like the fifth, rather than measured. Implementation returns 884.3587129994474.',
    source:
      'The cent is 1/1200 of an octave - Ellis, appendix XX to Helmholtz, On the Sensations of Tone (2nd English edition, 1885). The interval value is derived from that definition, not measured.',
  });

  // Round-trip across twelve orders of magnitude in period and four choices
  // of reference, because the error in log2 and pow is not uniform and a
  // single well-behaved pair would not show it.
  let worstRoundTrip = 0;
  for (const period of [
    1e-6, 4e-3, 0.1, 1, 1.5, 2, 3, 11.86, 365.25, 1e6, 1e12,
  ]) {
    for (const reference of [1e-3, 0.5, 1, 365.25]) {
      const error = sonifyLaw.roundTripError(period, reference);
      if (error > worstRoundTrip) worstRoundTrip = error;
    }
  }

  add({
    group: 'Sonification law',
    kind: 'analytic',
    name: 'The inverse recovers the period to machine precision',
    measured: worstRoundTrip,
    expected: 1e-14,
    unit: 'relative error, worst of 44 period/reference pairs',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'This is the property the module exists to have, so it is measured over a spread rather than at one convenient point: eleven periods from a microsecond-scale value to 1e12, against four references. The worst pair is 3.4e-15, which is about fifteen ulps and is the accumulated error of log2 followed by pow - there is no algebraic way to do better. The bound is 1e-14, three times the measured worst, which leaves room for a platform whose Math.log2 is a little less accurate than V8s while still failing instantly if quantization, clamping or a scale is ever introduced: the smallest such change would move this to 1e-3 or worse.',
  });

  // The resolution claim, phrased so that it cannot be read as a claim about
  // hearing. See DISTINGUISHABLE_CENTS in js/sonify/law.js.
  const nearOctave = sonifyLaw.periodToCents(1.98, 1);
  const gap = Math.abs(octave - nearOctave);

  add({
    group: 'Sonification law',
    kind: 'analytic',
    name: 'A 1% period error survives the map as a gap wider than the resolution floor',
    measured: sonifyLaw.DISTINGUISHABLE_CENTS / gap,
    expected: 1,
    unit: 'resolution floor / measured gap',
    tolerance: 0,
    toleranceKind: 'bound',
    why: 'A 1.98:1 ratio lands at 1182.60 cents, 17.40 cents below the octave, and the resolution floor the module publishes is 10 cents - so the floor is 0.57 of the gap and the distinction survives the encoding. Written as a ratio because the suite scores one-sided claims as "measured at or below expected" and the claim here is a floor. The 10 cents is a deliberately conservative working figure, roughly twice the few-cent pure-tone difference limen, and is NOT a measurement of any listener: what passes here is that the map did not collapse the distinction, not that anybody heard it. The second thing has no machine gate and this check must not be cited as one.',
  });
}
