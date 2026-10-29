// What students do, screen by screen: the flow table of each instructor guide.
// Each block runs from one step sid to another, so moving a step cannot slide a
// block onto the wrong screens. Read by js/instructorFlow.js (readVersioned);
// not imported by any route; from tools/migrate-flow.mjs.
import { INSTRUCTOR as MEASUREMENT } from './investigations/depth/measurement-sequence.js';
import { INSTRUCTOR as SATELLITE } from './investigations/depth/satellite-sequence.js';
import { INSTRUCTOR as ATMOSPHERE } from './investigations/depth/atmosphere-sequence.js';
import { INSTRUCTOR as PLANETS } from './investigations/planets-sequence.js';
import { INSTRUCTOR as EXPOSURE } from './investigations/exposure-sequence.js';
import { INSTRUCTOR as STRATEGY } from './investigations/strategy-sequence.js';
import { INSTRUCTOR as TELESCOPE } from './investigations/telescope-sequence.js';
import { INSTRUCTOR as SATURATED_STAR } from './investigations/saturated-star-sequence.js';

export default {
  format: 'gravitas.instructor-flow',
  formatVersion: 2,
  lessons: {
    ...MEASUREMENT.flow,
    ...SATELLITE.flow,
    ...ATMOSPHERE.flow,
    ...PLANETS.flow,
    ...EXPOSURE.flow,
    ...STRATEGY.flow,
    ...TELESCOPE.flow,
    ...SATURATED_STAR.flow,
    'the-suns-motion': [
      {
        from: 'from-stars-to-velocities',
        to: 'measure-the-sun',
        text: 'Parallax, proper motion and radial velocity make a velocity in space. Students predict what a still crowd looks like from a moving Sun and measure the Sun’s U, V and W from Gaia stars within 100 pc.',
      },
      {
        from: 'why-v-is-big',
        to: 'measure-farther',
        text: 'V is largest because the stars lag the Galaxy’s rotation; using more stars from farther away shrinks the error.',
      },
      {
        from: 'the-lsr-problem',
        to: 'state-the-assumption',
        text: 'Two published values for the Sun’s V against the LSR disagree by 8 km/s. Students record both, see the apex move, and write which they assume.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: a velocity, its uncertainty, a lag, and an assumption.',
      },
    ],
    'the-rotating-disk': [
      {
        from: 'a-wave-in-the-proper-motions',
        to: 'speed-at-the-sun',
        text: 'A double wave in longitude: students predict it, measure the Oort constants, see why the fit needs weights, and turn A − B into the Sun’s circular speed.',
      },
      {
        from: 'the-rotation-curve',
        to: 'fit-with-a-halo',
        text: 'The measured rotation curve against a model: stars and gas alone fit it badly, a halo ten times better.',
      },
      {
        from: 'where-the-halo-matters',
        to: 'say-what-it-assumes',
        text: 'Where the halo matters and what the comparison assumes.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what the data showed and what it assumed.',
      },
    ],
    'cluster-membership': [
      {
        from: 'a-cluster-in-a-field',
        to: 'a-label-or-a-probability',
        text: 'A cluster is a clump in proper motion. Students predict it, measure its motion and member count, and meet membership as a probability.',
      },
      {
        from: 'move-the-threshold',
        to: 'does-the-color-agree',
        text: 'Moving the threshold hardly changes the count; a color-magnitude diagram the fit never used confirms the members.',
      },
      {
        from: 'read-the-distance',
        to: 'one-sentence',
        text: 'A distance from the mean parallax, what it leaves out, and a written reason for a probability.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what the data showed and what it assumed.',
      },
    ],
    'who-gets-counted': [
      {
        from: 'a-survey-counts-what-it-sees',
        to: 'predict-what-is-missed',
        text: 'A survey counts what it can see. Students predict what a shallow survey misses.',
      },
      {
        from: 'count-a-shallow-survey',
        to: 'what-the-deep-survey-misses',
        text: 'Counts at limits 14 and 18, and the finding that everything missed is faint.',
      },
      {
        from: 'how-far-can-it-see',
        to: 'the-average-star',
        text: 'How far a Sun-like star and a red dwarf can be counted, and the counted stars average four and a half magnitudes brighter than the truth.',
      },
      {
        from: 'counts-by-magnitude',
        to: 'a-count-is-not-a-census',
        text: 'The counts split at the limit; a written reply to a friend who reads the catalog as a census.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: a count of what was found is not a census of what is there.',
      },
    ],
    'why-the-bright-ones-win': [
      {
        from: 'the-same-survey-by-distance',
        to: 'why-it-grows',
        text: 'Bias by shells of distance: predicted, measured and explained.',
      },
      {
        from: 'standard-candles',
        to: 'double-the-scatter',
        text: "Standard candles: the measured bias against Malmquist's closed form, and what doubling the scatter does.",
      },
      {
        from: 'a-second-bias',
        to: 'raise-the-cut',
        text: 'Trusting well-measured parallaxes makes stars look closer and fainter; a stricter cut costs most of the sample.',
      },
      {
        from: 'say-what-follows',
        to: 'say-what-follows',
        text: 'A written statement of which bias a naive average ignores and one way to avoid it.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: both biases come from selection, not measurement.',
      },
    ],
    'extending-an-experiment': [
      {
        from: 'twenty-planets',
        to: 'how-well-can-twenty-place-an-edge',
        text: 'The experiment’s twenty planets, how the notebook classifies them, and a prediction about the edge before anything runs.',
      },
      {
        from: 'the-fit',
        to: 'why-the-sample-differs',
        text: 'Run the notebook, read the edge and two fractions; a uniform population and why the sample differs from it.',
      },
      {
        from: 'move-the-definition',
        to: 'what-moved-it',
        text: 'Change the cutoff and see one reclassified planet move the edge.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what the interval covers and what it does not.',
      },
    ],
    'refitting-a-transit': [
      {
        from: 'same-model-another-route',
        to: 'how-close',
        text: 'The same model on the same points by another route, and a prediction about how close the answer will be.',
      },
      {
        from: 'the-fit',
        to: 'sigma-and-profile',
        text: 'Run the notebook and read the five fitted numbers; the sigma and the profile interval.',
      },
      {
        from: 'why-they-differ',
        to: 'why-they-differ',
        text: 'Why a profile interval can be lopsided where a covariance sigma is symmetric.',
      },
      {
        from: 'hold-the-limb-darkening',
        to: 'what-is-not-counted',
        text: 'Hold the limb darkening fixed and see the sigma fall and the value move; what the scaled sigmas do not count.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what the route changes and what holding a parameter fixed does.',
      },
    ],
    'two-periodograms': [
      {
        from: 'two-ways-to-look-for-a-period',
        to: 'the-tallest-peak',
        text: 'Lomb-Scargle and box least squares, and a prediction about the tallest peak.',
      },
      {
        from: 'the-two-periods',
        to: 'why-half',
        text: 'Run the notebook and read the two best periods; why Lomb-Scargle peaks at a harmonic.',
      },
      {
        from: 'the-box',
        to: 'against-the-fit',
        text: "The best box, and the box period against the fitted one in the fit's uncertainties.",
      },
      {
        from: 'what-a-grid-step-is',
        to: 'what-a-grid-step-is',
        text: 'Why a grid step is not an uncertainty.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what a periodogram answers and what it does not.',
      },
    ],
    'sampling-a-posterior': [
      {
        from: 'what-a-sampler-does',
        to: 'how-wide',
        text: "What a posterior and a sampler are, and a prediction about the interval's width.",
      },
      {
        from: 'the-draws',
        to: 'did-it-converge',
        text: 'Run the notebook, read the medians and widths, then the convergence diagnostics.',
      },
      {
        from: 'profile-and-posterior',
        to: 'why-narrower',
        text: "Posterior against profile, and why both are narrower than the fit panel's sigma.",
      },
      {
        from: 'refuse-a-short-run',
        to: 'refuse-a-short-run',
        text: 'A 1,000-step run is refused, and what the refusal says.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what the interval is conditional on, and what a sampler that refuses is worth.',
      },
    ],
    'integrators-in-practice': [
      {
        from: 'one-system-four-steps',
        to: 'which-loses-most',
        text: 'The four methods, the energy drift, and a prediction before anything runs.',
      },
      {
        from: 'four-drifts',
        to: 'why-bounded',
        text: 'Run the notebook on Kepler-16 and read four drifts; why the symplectic one stays bounded.',
      },
      {
        from: 'halve-the-step',
        to: 'halve-the-step',
        text: 'Halve the step: fourfold for second order, far more for fourth order.',
      },
      {
        from: 'the-engine',
        to: 'phase-luck',
        text: 'The same step as the application’s engine, and why one symplectic number is a point on a curve.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what the drifts say and what they do not.',
      },
    ],
    'the-completeness-curve': [
      {
        from: 'a-survey-that-fades',
        to: 'why-raw-is-low',
        text: 'Raw counts against the known luminosity function, and why faint bins fall short.',
      },
      {
        from: 'correct-the-fade',
        to: 'is-it-one',
        text: 'Weighting by effective volume recovers the truth within its Poisson error.',
      },
      {
        from: 'when-it-cannot-help',
        to: 'the-catalog-own-magnitudes',
        text: 'Three stars cannot carry a bin; catalog magnitudes leave a 60 percent bias.',
      },
      {
        from: 'state-the-residual',
        to: 'state-the-residual',
        text: 'A report with an assumption, an agreement and a residual bias.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: the corrected value, its error, its assumption and its bias.',
      },
    ],
    'what-a-spectrum-is-made-of': [
      {
        from: 'a-hot-solid',
        to: 'measure-two-clouds',
        text: 'A hot dense source makes a continuum. Students predict what a cooler cloud in front of it does, then measure the H-alpha line center with the cloud cooler and hotter than the source.',
      },
      {
        from: 'what-flipped-it',
        to: 'same-temperature',
        text: 'The same gas made a dark line and a bright one, so temperature and not the gas set the sign. A cloud alone makes bright lines; at the source’s own temperature it makes none.',
      },
      {
        from: 'why-cool-absorbs',
        to: 'flash-spectrum',
        text: 'A written explanation of why a cool cloud still makes dark lines, then two real cases: the Sun’s dark lines say cooler gas lies over hotter, and the eclipse flash shows the same gas bright against dark sky.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: three kinds of spectrum from one piece of physics.',
      },
    ],
    'lines-and-motion': [
      {
        from: 'light-by-wavelength',
        to: 'calcium-in-the-g-star',
        text: 'A real spectrum has dark lines in it, and the line list names them. Students read hydrogen in the A star and calcium in the G star, and see that which lines show depends on temperature.',
      },
      {
        from: 'predict-the-shift',
        to: 'doppler-arithmetic',
        text: 'A motion moves every line. Students predict the direction, measure two shifts on synthetic stars, read the sign as a direction and turn a shift into a speed by hand.',
      },
      {
        from: 'star-three',
        to: 'sideways-motion',
        text: 'A shift smaller than its uncertainty is not a detection, and a sideways motion leaves no mark: what a spectrum can and cannot say about motion.',
      },
      {
        from: 'one-sentence',
        to: 'what-you-worked-out',
        text: 'A written plan to settle star 3, and the close.',
      },
    ],
    'color-and-temperature': [
      {
        from: 'everything-glows',
        to: 'three-peaks',
        text: 'A blackbody and its peak. Students predict how heating moves the peak, then measure three peaks and see that peak times temperature is constant.',
      },
      {
        from: 'peak-of-4000',
        to: 'temperature-from-peak',
        text: 'Wien’s law in both directions: a peak from a temperature, and a temperature from a peak.',
      },
      {
        from: 'why-not-green',
        to: 'temperature-from-color',
        text: 'The Sun’s green peak and why it does not look green, then a color index as a thermometer: three B − V readings and a temperature recovered from a color.',
      },
      {
        from: 'real-stars-differ',
        to: 'what-you-worked-out',
        text: 'The limits of a blackbody as a model of a star, a written comparison of the two methods, and the close.',
      },
    ],
    'keplers-laws': [
      {
        from: 'eight-minutes-of-arc',
        to: 'what-sits-at-the-other',
        text: 'Tycho’s data and Kepler’s problem, then the anatomy of an ellipse with an eccentricity slider. Ends with the empty second focus.',
      },
      {
        from: 'measure-the-two-orbits',
        to: 'why-the-speed-changes',
        text: 'The second law. Students measure both orbits, watch the equal-area wedges, then measure speed at periapsis and apoapsis and write down why it changes.',
      },
      {
        from: 'kepler-s-third-law',
        to: 'what-the-constant-depends-on',
        text: 'The third law. Four planets are tabulated from the live Solar System, plotted automatically, and the constant is worked out and then used to predict a period.',
      },
      {
        from: 'what-newton-added',
        to: 'where-kepler-s-version-breaks',
        text: 'Newton’s correction. Students weigh TRAPPIST-1 from one planet’s orbit, then weigh a second star, and identify where Kepler’s version breaks.',
      },
      {
        from: 'where-this-leaves-you',
        to: 'where-this-leaves-you',
        text: 'A closing summary rather than a question: the shape of an orbit, the speed-for-distance trade, the power law recovered from the students’ own eight measurements, and a star weighed from naked-eye positions recorded before the telescope.',
      },
    ],
    'retrograde-motion': [
      {
        from: 'the-wandering-stars',
        to: 'watch-from-outside-first',
        text: 'The phenomenon is stated as history and then as a measurement: five wandering stars, and the fact that the only measurable quantity was a direction. Students then watch the system from outside and confirm for themselves that neither planet ever reverses. Everything that follows is about reconciling those two screens.',
      },
      {
        from: 'the-two-orbits',
        to: 'how-fast-each-one-goes',
        text: 'The two orbits are measured off the inspector and converted to angular speeds. The multiple-choice step in the middle is there to make students say out loud that the inner planet is the faster one, which is the entire mechanism and is easy to skate past.',
      },
      {
        from: 'the-synodic-period',
        to: 'a-lap-gained',
        text: 'The synodic period, computed twice. Step 9 uses the reciprocal formula, step 10 the rate of degrees gained. Students who get two different answers have usually put the longer period first in the subtraction.',
      },
      {
        from: 'before-you-look',
        to: 'what-the-trails-are-doing',
        text: 'A prediction is committed to before anything changes, then reference frames are introduced, then a screen explaining what the trails are actually doing. The last of these matters more than it looks: students who think the picture is being redrawn artistically will not accept the loop as evidence.',
      },
      {
        from: 'put-yourself-on-earth',
        to: 'nearest-and-furthest',
        text: 'The frame is switched and the loop appears. Students then put numbers on it: the direction from Earth running backwards, and the distance to Mars reaching a clear minimum and maximum. The direction readout is the observable the whole investigation rests on.',
      },
      {
        from: 'bright-and-backwards-together',
        to: 'say-it-in-your-own',
        text: 'The geometry is pinned down. Brightness and reversal are shown to be the same event, the reversal is located at opposition, the overtaking analogy is given, and students write the explanation in their own words. This short-answer step is the assessment center of the investigation.',
      },
      {
        from: 'what-it-cost-to-explain',
        to: 'counting-the-machinery',
        text: 'Ptolemy. The epicycle is presented as a device that worked rather than as a mistake, and students find the one-year period that a geocentric model has to accept as a coincidence, then count the twenty separate devices the five planets needed.',
      },
      {
        from: 'and-what-about-the-sun',
        to: 'which-one-is-moving',
        text: 'The Sun is examined in Earth’s frame, where it traces a clean annual circle with no loop, and students are then asked directly whether the loop proves heliocentrism. The intended answer is that it does not, and this is the step most likely to generate discussion.',
      },
      {
        from: 'frames-are-not-all-equal',
        to: 'why-tycho-found-nothing',
        text: 'What actually settles the question: the fictitious forces a geocentric frame requires, and stellar parallax. Tycho’s null result is treated as sound reasoning with an inadequate instrument, which gives a transferable investigation about what a non-detection constrains.',
      },
      {
        from: 'how-long-does-a-loop',
        to: 'what-you-did',
        text: 'A final measurement of the length of the retrograde episode, a prediction about Jupiter that students can check against the formula, and a closing screen that names the transferable question: measured against what?',
      },
    ],
    'transit-photometry': [
      {
        from: 'a-firefly-beside-a-lighthouse',
        to: 'where-the-depth-comes-from',
        text: 'Why planets are found indirectly, the five main methods, and a first transit watched live on HD 209458.',
      },
      {
        from: 'try-it-on-some-real',
        to: 'correct-it-and-get-a',
        text: 'Depth to radius. Students explore the depth–size relation, measure the real dip, discover the naive radius is too big, and correct it for limb darkening.',
      },
      {
        from: 'the-shape-of-the-dip',
        to: 'what-the-method-misses',
        text: 'The shape of the dip, viewing geometry and transit probability, ending in a written answer about survey bias.',
      },
      {
        from: 'getting-the-period',
        to: 'what-a-transit-cannot-tell',
        text: 'Timing. Two transits give a period; the period gives the orbit and an equilibrium temperature.',
      },
      {
        from: 'the-planet-changes-size-with',
        to: 'why-the-depth-moves',
        text: 'Transmission spectroscopy: the planet changes size with color.',
      },
      {
        from: 'things-that-are-not-planets',
        to: 'what-it-does-to-a',
        text: 'False positives and dilution. A hidden companion is found, imaged, and corrected for, recovering the true planet radius.',
      },
      {
        from: 'what-you-did-and-where',
        to: 'what-you-did-and-where',
        text: 'A closing summary rather than a question: one depth turned into a radius, then made more accurate three times over — limb darkening divided out, the impact parameter understood, and a star nobody could see corrected for.',
      },
    ],
    'orbital-energy': [
      {
        from: 'how-hard-would-you-have',
        to: 'where-is-the-line',
        text: 'The cannonball experiment. Students predict, fire at low and high speed, hunt for the dividing line, and identify what happens at it.',
      },
      {
        from: 'what-is-actually-deciding-this',
        to: 'what-stays-put',
        text: 'The reframing. Energy bars are introduced, the sign of the total is read, and students confirm it stays constant around a real orbit.',
      },
      {
        from: 'escape-speed',
        to: 'a-common-misunderstanding',
        text: 'Escape speed, and the misconception that gravity stops.',
      },
      {
        from: 'somewhere-else-entirely',
        to: 'three-shapes-one-law',
        text: 'What changes escape speed: mass, then starting distance. Ends with the three orbit shapes.',
      },
      {
        from: 'something-that-came-from-outside',
        to: 'what-you-worked-out',
        text: 'ʻOumuamua. Students check its energy themselves and decide in writing whether it will return.',
      },
    ],
    'weighing-stars': [
      {
        from: 'you-cannot-put-a-star',
        to: 'where-does-it-sit',
        text: 'Both stars move, and there is a fixed point between them. Ends with the barycenter of an equal-mass pair.',
      },
      {
        from: 'make-one-of-them-heavier',
        to: 'one-more-to-be-sure',
        text: 'Unequal masses. The balance point shifts toward the heavier star; the see-saw makes the mass ratio visible and then quantitative.',
      },
      {
        from: 'what-kepler-found-and-what',
        to: 'newton-s-version-and-what',
        text: 'Kepler’s third law and Newton’s correction, then a side-by-side comparison showing that the heavier pair orbits faster at the same separation.',
      },
      {
        from: 'a-practice-run',
        to: 'stop-and-look-at-what',
        text: 'The central measurement. Students practice on a known pair, then measure a mystery binary’s separation and period with a stopwatch and weigh it.',
      },
      {
        from: 'back-to-the-balance-point',
        to: 'the-answer',
        text: 'Splitting the total between the two stars using the balance point, and the reveal.',
      },
      {
        from: 'somebody-really-did-this',
        to: 'what-you-can-now-say',
        text: 'Sirius, measured from real observations, then a star with a planet, then one worked independently.',
      },
    ],
    'black-holes': [
      {
        from: 'not-a-hole-and-not',
        to: 'thirty-kilometers-is-not-very',
        text: 'What a black hole is not, what "size" could mean, and the event horizon at a fixed scale against familiar lengths.',
      },
      {
        from: 'now-make-it-heavier',
        to: 'the-rule-you-just-found',
        text: 'The mass experiment. Students record three trials, watch the points land on a straight line through the origin, and only then meet R_s ∝ M.',
      },
      {
        from: 'squeezing-and-getting-away',
        to: 'the-right-answer-for-the',
        text: 'Squeezing the Sun until the escape speed reaches c, followed by the careful statement that this is the right answer for the wrong reason.',
      },
      {
        from: 'which-one-is-denser',
        to: 'where-the-room-comes-from',
        text: 'The density surprise: prediction, ladder, then the zero-counting explanation.',
      },
      {
        from: 'which-one-is-hotter',
        to: 'colder-not-hotter',
        text: 'Hawking temperature, introduced cautiously, with a logarithmic thermometer.',
      },
      {
        from: 'then-what-happens-to-it',
        to: 'longer-and-then-much-longer',
        text: 'Evaporation lifetime on a bar chart that counts zeros rather than years.',
      },
      {
        from: 'from-city-sized-to-solar',
        to: 'it-has-a-name',
        text: 'Mass classes, a four-object lineup at clearly labeled separate scales, and the reveal that the mystery object is Sagittarius A*.',
      },
    ],
    'radial-velocity': [
      {
        from: 'the-planet-you-already-measured',
        to: 'watch-it-grow',
        text: 'The planet from the transit investigation returns, with the history that it was found by its star’s wobble first. Students predict which body moves, then use the reflex-motion instrument to see both orbiting the barycenter and to discover that more planet mass means a bigger stellar orbit.',
      },
      {
        from: 'light-carries-the-answer',
        to: 'toward-away-toward-again',
        text: 'Absorption lines and the Doppler shift are introduced from scratch, with the restriction that only line-of-sight motion produces a shift. The rv-observer instrument connects the star’s position on its orbit to the curve that motion produces.',
      },
      {
        from: 'open-the-real-instrument',
        to: 'read-k-off-the-panel',
        text: 'Students open the live Radial Velocity panel on the Exoplanet Characterization Lab scenario, watch a real curve build over two orbits, measure the period, and learn the definition of K before reading it off the panel.',
      },
      {
        from: 'what-would-make-k-bigger',
        to: 'weigh-hd-209458-b',
        text: 'A controlled experiment: hold everything fixed and change only planet mass. Students discover the linear relationship, then use it in reverse to weigh HD 209458 b from the K they measured.',
      },
      {
        from: 'now-tilt-the-whole-system',
        to: 'what-a-transit-adds',
        text: 'The inclination problem. The same planet is tilted and the reported mass falls away as sin i. M sin i is named, and students reason out why a transiting planet escapes the ambiguity.',
      },
      {
        from: 'a-face-on-system',
        to: 'different-methods-different-planets',
        text: 'Astrometry as the complementary method. Students tilt a system from edge-on to face-on and watch the sky path open from a line into a circle while the radial-velocity signal dies, then explore how distance and orbit size govern detectability.',
      },
      {
        from: 'bring-the-transit-back',
        to: 'where-does-hd-209458-b',
        text: 'The payoff. Transit radius and radial-velocity mass are combined into a bulk density, and the characterization panel adds stellar flux and habitable-zone context from the same habitability module The Goldilocks Question uses.',
      },
      {
        from: 'three-candidates',
        to: 'what-you-can-now-say',
        text: 'Three candidate planets, designed so that no single measurement identifies the best one. A short-answer step asks what is still unknown, and the investigation closes on the idea that combination, not any one technique, is what characterization consists of. The last screen is a closing summary: the chain from reflex motion to a density and a place on a diagram, and what a habitable-zone placement does not say.',
      },
    ],
    'goldilocks-question': [
      {
        from: 'what-does-earth-get-from',
        to: 'what-the-graph-says',
        text: 'Insolation is introduced with Earth as the unit. Students predict what doubling the distance does, measure three distances with the instrument and the graph on the same screen, and read the curve their own points make.',
      },
      {
        from: 'the-star-is-not-running',
        to: 'writing-it-down-then-using',
        text: 'Only now the explanation. Students step a shell outward one astronomical unit at a time and read off the areas 1, 4, 9, 16 before the inverse-square relation is written down, then apply it at an unfamiliar distance.',
      },
      {
        from: 'leave-the-planet-change-the',
        to: 'dim-stars-close-bands',
        text: 'The star changes instead of the planet. Students find that insolation tracks luminosity, then meet the habitable zone as a band and watch it move by a factor of fifty as the star changes.',
      },
      {
        from: 'saying-it-carefully',
        to: 'the-mars-problem',
        text: 'The careful definition, then the live Solar System with the zone drawn on it. Students classify four real worlds and then write a short answer about the one that makes the definition mean something: Mars is inside the zone and bone dry.',
      },
      {
        from: 'the-two-edges',
        to: 'venus-by-the-rule-you',
        text: 'What sets each edge, the conservative and optimistic prescriptions side by side, and the same comparison run on the live Solar System. Ends with an inverse-square calculation for Venus.',
      },
      {
        from: 'a-year-on-a-circular',
        to: 'reading-the-fraction',
        text: 'Orbits. A circular year gives a flat starlight curve; an eccentric one does not. Students watch the planet cross a zone boundary and interpret the fraction of the year spent inside.',
      },
      {
        from: 'a-real-system-forty-light',
        to: 'take-the-readings-yourself',
        text: 'TRAPPIST-1, with the real measured luminosity: a prediction, the diagram, the live seven-planet simulation, and a measurement screen where students take the readings themselves instead of being told the answer.',
      },
      {
        from: 'the-question-the-name-invites',
        to: 'what-you-worked-out',
        text: 'The turn. Does being inside the zone establish anything about the planet? Three candidates with similar insolation and different everything else, a follow-up-target choice, an unfamiliar case, and the synthesis.',
      },
    ],
    'missing-mass': [
      {
        from: 'two-ways-to-weigh-a',
        to: 'which-arrangement-gives-a-flat',
        text: 'A rotation curve is established as a tool before it is used as a result. Students rearrange a fixed amount of mass four ways in the "Where the mass is" instrument and watch the curve change shape, then commit in a choice step to which arrangement produces a flat curve. Nothing about dark matter has been mentioned yet.',
      },
      {
        from: 'the-solar-system-plotted',
        to: 'what-the-slope-means',
        text: 'The Solar System, plotted live from the simulation. Students read the fitted exponent off the Rotation Curve panel and then reason out, in a multiple-choice step, why it comes to -0.5. This is the case where light and motion agree, and it is the reference the rest of the investigation is measured against.',
      },
      {
        from: 'what-the-speed-tells-you',
        to: 'measure-the-enclosed-mass-yourself',
        text: 'The relation is worked backwards. The "What the speed tells you about the mass" instrument shows a curve and its enclosed mass together with a draggable radius marker, a choice step draws out what a flat curve requires, and then students record the enclosed mass at four radii and plot it. The four points fall on a straight line through the origin, which is what "proportional to radius" looks like.',
      },
      {
        from: 'now-a-galaxy',
        to: 'measure-the-real-curve',
        text: 'The prediction and the observation. Students predict the curve of a galaxy built on the assumption that light traces mass, measure it, then meet Rubin and Ford’s result in the same disc with the speeds telescopes actually find, and measure that too. The visible mass is identical in both; only the motion differs.',
      },
      {
        from: 'now-do-what-the-astronomers',
        to: 'why-a-heavier-disc-cannot',
        text: 'The fitting exercise begins, and this is the heart of the investigation. Students are handed a measured curve with error bars and a stellar disc with two free parameters, and asked to reproduce the data. They cannot. Step 15 has them record their own best attempt, and step 16 asks why a heavier disc does not rescue it: the shortfall is the wrong shape, not the wrong size.',
      },
      {
        from: 'now-add-the-halo',
        to: 'how-much-of-it-is',
        text: 'The halo goes in. Two more sliders, a fit that closes to within the measurement errors, and a numeric step in which students divide their own fitted halo mass by their own visible mass. The answer, about 3.4, is a number they produced rather than received.',
      },
      {
        from: 'what-the-halo-is-holding',
        to: 'take-the-halo-away-from',
        text: 'What the halo is holding. A single star is launched on a circular orbit at the speed a real galaxy gives it and the halo is switched off underneath it; then the same experiment runs on ninety stars in the live simulation and the disc unwinds from the outside in.',
      },
      {
        from: 'forty-years-earlier',
        to: 'measure-the-simulated-cluster',
        text: 'Zwicky and the Coma Cluster. The history is introduced, then students work the virial theorem on the real Coma Cluster in an instrument where both classic arithmetic mistakes are selectable, and only then switch to simulation units and record the member count, speed spread and radius of the simulated cluster by hand.',
      },
      {
        from: 'weigh-the-cluster-by-its',
        to: 'now-compare',
        text: 'The cluster calculation. Two numeric steps take students from the virial theorem to a dynamical mass and then to its ratio against the visible mass.',
      },
      {
        from: 'a-different-way-to-read',
        to: 'does-the-curve-decide',
        text: 'The other explanation, in four screens. MOND is introduced as what it is - an empirical observation that rotation curves stop falling at a particular acceleration, turned into a law - and then put on the same twelve measurements the halo was fitted to. Students discover that both reproduce the curve inside its error bars, that the halo spent three fitted numbers doing it and MOND spent one, and that the two disagree about how heavy the stellar disc is. A numeric step has them apply v⁴ = G M a₀ by hand, and a short-answer step asks what the curve can and cannot settle. Expect the question "so which one is right?" here; the honest answer is that this measurement does not say, and the step exists to make that a finding rather than a dodge. Nothing in the investigation asserts that either explanation is correct, and the answer key credits students who reach for evidence outside rotation curves.',
      },
      {
        from: 'what-have-you-actually-shown',
        to: 'where-it-stands',
        text: 'What it all establishes. A short-answer step asks what has and has not been shown, the mass-budget instrument puts the result in cosmological context, and the investigation closes on where the evidence stands and what remains unknown.',
      },
    ],
    tides: [
      {
        from: 'twice-a-day-everywhere',
        to: 'what-a-tide-actually-is',
        text: 'The Earth-Moon system live, then the three-arrow panel. Students see that the pulls differ by seven percent, predict why there are two bulges, and are shown the subtraction that produces them. Ends with the definition of a tide as a difference.',
      },
      {
        from: 'bring-the-companion-closer',
        to: 'what-the-mass-graph-says',
        text: 'The two scaling relationships, each predicted and then measured. Four distances give the inverse cube (with a straighten-the-curve transform on the plot); three masses give simple proportionality. The expression 2GMR/d³ appears at step 12, after the distance measurement and before the mass one.',
      },
      {
        from: 'the-sun-against-the-moon',
        to: 'say-it-in-your-own',
        text: 'Applying both relationships. Students predict the Sun-versus-Moon contest, read seven real tides off a logarithmic comparison chart, meet tidal locking and heating conceptually, and write the far-side bulge in their own words.',
      },
      {
        from: 'what-holds-a-moon-together',
        to: 'what-a-roche-limit-does',
        text: 'Disruption. Stretch is set against a body’s own surface gravity as two bars, the crossing point is measured and named as the Roche limit, the material is varied to show the limit moving, and a full screen is given to what a Roche limit does not predict.',
      },
      {
        from: 'the-extreme-case-running-live',
        to: 'what-you-worked-out',
        text: 'The extreme case: the live tidal disruption scenario with its modeling honestly described, the tidal-radius-against-horizon panel and the hundred-million-solar-mass crossover, then the written synthesis and the summary.',
      },
    ],
    'butterfly-effect': [
      {
        from: 'a-word-that-has-been',
        to: 'what-zero-proves',
        text: 'The three-star lab, introduced, then the reproducibility control: two runs changing nothing, which come out identical. Establishes determinism before anything diverges. Ends by asking what exactly zero proves, and the answer is narrower than most students expect.',
      },
      {
        from: 'a-control-before-the-interesting',
        to: 'linear-in-numbers',
        text: 'The two-body control. The Binary Pair scenario given a 1,500 km nudge separates steadily and linearly; the instrument declines to report an e-folding time and says the growth is proportional to time. This is the section to protect if time is short.',
      },
      {
        from: 'back-to-the-triangle',
        to: 'buying-more-time',
        text: 'The three-body case. Lagrange’s equilateral solution, Gascheau’s stability criterion, and why three equal masses make it unstable. Students measure the e-folding time from the shaded log-linear interval and work out the predictability horizon and what improving the measurement buys.',
      },
      {
        from: 'the-objection-you-should-have',
        to: 'reading-the-verdict',
        text: 'The numerical control. Repeat at half the simulation speed and with a different integrator, record each, and read the refinement verdict. Includes the hypothetical of an unresolved result and what to report about it.',
      },
      {
        from: 'not-every-three-body-system',
        to: 'what-you-established',
        text: 'What chaos is not: the Trojan asteroids and the figure-eight orbit as stable three-body configurations, a sorting question, a short-answer synthesis, a free exploration of perturbation size, then the real-world reach of the result, the sources, and the summary.',
      },
    ],
    'when-orbits-lock': [
      {
        from: 'four-moons-and-a-suspicious',
        to: 'where-do-the-line-ups',
        text: 'The four Galilean moons. Students predict the Io–Europa ratio, measure all four periods, and meet the counter-example: the tidiest ratio in the system belongs to the moon that is not resonant. Ends on why small-integer ratios are dense enough to be worthless as evidence.',
      },
      {
        from: 'watch-the-line-ups',
        to: 'the-resonant-angle',
        text: 'Conjunctions. A prediction most students get wrong - that line-ups cluster in a fixed direction in the sky - followed by the measurement showing they drift, and the explanation: the orbits themselves precess, so a direction in the sky is the wrong thing to measure.',
      },
      {
        from: 'the-laplace-argument',
        to: 'one-percent',
        text: 'The resonant angle, built from mean longitudes and longitudes of periapsis, then applied to the Laplace argument. The instrument moves through three verdicts as the run lengthens; students are told to start it and read on. Closes with the algebra showing that 180 degrees means the three moons are never all in conjunction.',
      },
      {
        from: 'break-it',
        to: 'the-orbit-that-crosses-and',
        text: 'The paired control and the awkward case. Europa moved one percent out and the argument circulates in forty-seven Io orbits. Then Callisto’s 7:3, which stays inconclusive for the whole run, and the question of what that establishes.',
      },
      {
        from: 'measure-pluto-s-resonance',
        to: 'sixty-degrees-ahead',
        text: 'Pluto and Neptune. The crossing orbits, the 3:2, the libration measured in ninety seconds, the conjunctions clustered at Pluto’s aphelion, and the one line of algebra that connects the two. A third body on nearly the same orbit but outside the resonance circulates and is scattered.',
      },
      {
        from: 'the-rotating-frame',
        to: 'what-you-can-and-cannot',
        text: 'The Trojans in the rotating frame: an exact equilibrium, a real tadpole libration, an unstable equilibrium that departs, and a non-co-orbital body whose ratio is closer to 7:5 than Pluto’s is to 3:2. The distinction between an equilibrium and a stable equilibrium is the target here.',
      },
      {
        from: 'the-report-you-would-write',
        to: 'where-this-goes',
        text: 'The four cases sorted two ways - by how good the ratio is, and by whether they are resonant - which give different orders. Then a referee-style question about a paper that overclaims, and the closing survey: Kirkwood gaps, plutinos, Io’s volcanism, and resonant chains as evidence for migration.',
      },
    ],
    'detect-this-planet': [
      {
        from: 'twelve-nights',
        to: 'what-decides-whether-you-find',
        text: 'The framing: twelve nights, one star, and the question of whether the schedule would find a planet rather than whether one is there. Students commit to which of four choices matters most before seeing any data.',
      },
      {
        from: 'schedule-a-twelve-nights-one',
        to: 'what-have-you-established',
        text: 'Schedule A - twelve measurements across one orbit - in the survey-schedule instrument. Students read phase coverage, scatter and chi-square, then face the key question: the most this establishes is that the velocity is not constant.',
      },
      {
        from: 'schedule-b-twelve-nights-thirty',
        to: 'why-it-failed',
        text: 'Schedule B, the same twelve measurements at 3.52-day intervals. Students predict, observe the folded panel collapse into two bins, record the numbers, and work out that the cadence is one orbital period.',
      },
      {
        from: 'the-third-knob',
        to: 'ambiguous-evidence',
        text: 'Precision isolated: a Neptune on the good schedule is invisible at 8 m/s and obvious at 1 m/s. Then the ambiguous-evidence question, which is the investigation’s hardest and the one most worth discussing aloud.',
      },
      {
        from: 'do-it-to-the-real',
        to: 'take-the-data-with-you',
        text: 'The synthetic observing run in the live Radial Velocity panel, against the simulated star, followed by the CSV export. Schedule A completes in about thirteen seconds of wall clock.',
      },
      {
        from: 'the-limits-of-finding-nothing',
        to: 'the-limits-of-finding-nothing',
        text: 'A written question on the limits of a nondetection: what a flat dataset excludes, and what it leaves open.',
      },
      {
        from: 'the-other-way-to-find-one',
        to: 'how-deep-is-an-earth',
        text: 'The turn to transits. The depth of a transit is a ratio of areas, and students compute the 84 ppm an Earth would make across the Sun - a number that comes back at step 23 as a planet TESS cannot reach.',
      },
      {
        from: 'the-noise-budget',
        to: 'the-floor',
        text: 'The noise budget instrument, opening on a Kepler hot Jupiter at a depth-over-noise of 587. Students predict what the same planet does from three nights on the ground, then watch it fall to about 4 - and then find that three hundred nights take it to 31, but no further than a ceiling of 49.',
      },
      {
        from: 'white-noise-and-red-noise',
        to: 'assumptions-of-the-model',
        text: 'Three noise terms rather than two and why they scale differently, then what the model is pretending - the middle term is treated as perfectly correlated within a transit and perfectly independent between them, and reality is neither. The second of these is the screen to slow down on.',
      },
      {
        from: 'read-two-budgets',
        to: 'why-more-nights-do-not-help',
        text: 'A measurement of both budgets side by side, then the question that names the ceiling: two of the three terms average down and one does not, which is why three hundred nights bought a factor of eight rather than ten and why it stops at 49.',
      },
      {
        from: 'the-edge-of-what-tess-can-do',
        to: 'what-would-it-take',
        text: 'Three real TESS cases in order of difficulty: Pi Mensae c at 10.5, TOI-700 d at 2.7 after a year of sectors, and an Earth twin at 0.6 whose ceiling is 2.8 - unreachable however long anyone observes. Then what would actually have to change.',
      },
      {
        from: 'what-you-decided-before-you',
        to: 'what-you-decided-before-you',
        text: 'The closing statement, now covering both halves: the radial-velocity failure could have been repaired by observing differently, and the photometric one only by lowering the persistent floor.',
      },
    ],
    'design-the-schedule': [
      {
        from: 'eight-nights',
        to: 'set-the-run-up',
        text: 'The framing - eight nights, one star, the times to be decided in advance - and the setup of the live panel: baseline 24.673 d, uncertainty 8 m/s, seed schedule-1, regular cadence, eight observations. Have students write down the schedule checksum the note prints.',
      },
      {
        from: 'predict-the-comb',
        to: 'run-both-schedules',
        text: 'The prediction, collected before anything is observed, then the comparison run itself. This is the long screen: about seven simulated orbits. It is a good moment to poll the room on the prediction and to point out that the second arm is not a second run.',
      },
      {
        from: 'read-the-comparison',
        to: 'is-irregular-better',
        text: 'Reading the two arms, then the two questions that decide what the reading is worth: what a window peak of 100% means, and what one draw of each schedule does and does not establish. The second is the harder one and the one worth discussing aloud.',
      },
      {
        from: 'break-your-own-result',
        to: 'break-your-own-result',
        text: 'Changing the noise seed and running again, to separate the geometric failure of the comb from the luck in the irregular arm.',
      },
      {
        from: 'predict-the-weather',
        to: 'type-the-dates',
        text: 'The run as it actually arrives: a weather gap typed into the panel, which drops epochs and can break the control, and then a hand-typed list of times, which is also where students discover that unreadable entries are reported rather than dropped.',
      },
      {
        from: 'the-range-you-searched',
        to: 'what-you-decided',
        text: 'What a number has to be quoted with - the range searched, the schedule, the seed - and the closing statement that a schedule is not administration around a sampled measurement but the measurement itself.',
      },
    ],
    'binary-star-planets': [
      {
        from: 'two-suns',
        to: 'what-survived-will-mean',
        text: 'The system and the vocabulary. Two stars of 1.0 and 0.5 solar masses, 10 AU apart at e = 0.4, every parameter stated rather than generated. Students commit to a prediction for the stable radius, and are told before measuring anything that a finished run will be reported as "survived this integration" and why that is not "stable".',
      },
      {
        from: 'run-the-default',
        to: 'why-so-quiet',
        text: 'The quiet run: the planet at 0.15 separations for twenty binary periods, about half a minute of wall clock. Students record four numbers and answer why the companion barely matters at that radius - proximity, not mass.',
      },
      {
        from: 'move-it-out',
        to: 'ejected-means-what',
        text: 'The planet moved to 0.30. It is ejected within about three binary periods after one close pass. Students predict first, then measure when it left, then work out why positive energy alone is not enough to call something an ejection.',
      },
      {
        from: 'work-out-the-boundary',
        to: 'what-the-fit-assumes',
        text: 'The published boundary. Students compute a_c = 0.177 separations from the fit and find their two runs on either side of it, then answer which of four departures from the fit’s assumptions would most clearly put a real system outside its scope. (Inclination, because the fit is two-dimensional and Kozai-Lidov is not in it.)',
      },
      {
        from: 'a-harder-question',
        to: 'energy-drift-as-a-screen',
        text: 'The turn. What a timestep is, why a close approach is where it fails, and the energy screen - demonstrated by running 0.50 separations, which starts the planet almost on top of the companion and produces a refusal rather than a result.',
      },
      {
        from: 'predict-the-sweep',
        to: 'is-it-resolved',
        text: 'The sweep. Students predict the trend, run the same twenty-period experiment at five radii with everything else held fixed, read the outcomes off the table and the plot, and then re-run the trial at the change of outcome at half the step. It replaces three manual runs and the copying that went with them: the machine time is about the same, four to seven minutes, and it is spent discussing the prediction rather than typing. The plot deliberately draws no line through the points.',
      },
      {
        from: 'the-case-that-matters',
        to: 'report-it',
        text: 'The case the investigation is built around. 0.25 separations, run at timesteps of 1.0, 0.5 and 0.25. The outcome changes; the energy drift stays under a part in a million throughout. Students record all three, choose what to report, meet the convergence rule, and write two or three sentences reporting the configuration honestly. This is the longest stretch and should not be rushed.',
      },
      {
        from: 'around-both',
        to: 'how-without-a-pass',
        text: 'Circumbinary planets. Kepler-16b as the real example, a prediction about which direction the danger lies, then one explore covering 4.0 separations (survives) and 2.0 (ejected in about 3.4 periods with no close encounter at all), a measurement of both, and the question about what drove it out.',
      },
      {
        from: 'circumbinary-boundary',
        to: 'who-is-wrong',
        text: 'The circumbinary boundary at 3.6 separations, then the deliberate disagreement: 3.0 and 2.5 both survive forty periods although the fit excludes them, with excursions to 14 and 25 separations. Students are asked who is wrong, and the answer is neither - forty periods is four thousandths of what the fit was calibrated on.',
      },
      {
        from: 'the-strongest-claim',
        to: 'what-you-can-say',
        text: 'The strongest claim the work supports, written out in full so students can see how long an honest one is, and a closing summary of every result together with the three things the model leaves out: it is flat, the planet is a test particle, and the stars are points drawn ten times life size.',
      },
    ],
    'gravity-assist': [
      {
        from: 'voyager-left-faster',
        to: 'which-side-gains',
        text: 'Voyager 2 arriving at Jupiter at 10 km/s and leaving at 26 with its engines off, then the stripped-down version on screen and why it has no star. Students commit to which side of the planet gains before running anything.',
      },
      {
        from: 'fly-the-gaining-pass',
        to: 'the-vector-addition',
        text: 'The gaining pass, flown by hand, about nine seconds of wall clock. Students record all four speeds, face the central question, and are given the vector addition. This is the part to slow down for.',
      },
      {
        from: 'the-other-side',
        to: 'why-not-mirror-image',
        text: 'The retained comparison: both sides at once, about a minute of wall clock, both results kept on screen. Then three numbers off the table, then why the loss is smaller than the gain - which is geometry rather than physics and catches almost everybody.',
      },
      {
        from: 'the-ceiling',
        to: 'the-planets-frame-is-two-frames',
        text: 'The ceiling of twice the approach speed, the recoil and the momentum ledger, where the energy actually came from, and then the sharpest screen in the investigation: whose frame, exactly, and what survives a change of one.',
      },
      {
        from: 'sweep-the-impact-parameter',
        to: 'explain-the-sweep',
        text: 'Optional, about five minutes, three of them the sweep running. Five impact parameters on the gaining side, and the question of whether the biggest turn must give the biggest gain. Skip the whole block if the period is short; nothing after it depends on it.',
      },
      {
        from: 'now-with-a-sun',
        to: 'what-this-leaves-out',
        text: 'The same encounter with a star, the residuals it introduces, what they mean, and the three things the model leaves out.',
      },
    ],
    'hohmann-transfer': [
      {
        from: 'the-problem',
        to: 'try-radial',
        text: 'The problem, then a prediction about pushing straight outward, then a preview of a radial burn that leaves the angular momentum untouched. Nothing is applied yet; the planner previews without changing the world.',
      },
      {
        from: 'transverse-is-the-lever',
        to: 'why-slower-further-out',
        text: 'Why transverse is the lever and why the change appears on the far side, then measuring the two circular speeds and asking why the outer body is slower. Straightforward, and worth moving through briskly.',
      },
      {
        from: 'the-transfer-ellipse',
        to: 'first-burn-size',
        text: 'The transfer ellipse, its semi-major axis, the departure speed from vis-viva, and the size of the first burn. This is the arithmetic core - budget half the investigation time here and let students check each other.',
      },
      {
        from: 'apply-the-first-burn',
        to: 'where-the-change-appeared',
        text: 'Applying the first burn and reading where the orbit changed. The preview should show apoapsis at 2.5 AU before they press Apply; a student whose preview disagrees has mistyped, and Undo restores the whole world.',
      },
      {
        from: 'transfer-time',
        to: 'read-the-arc',
        text: 'The transfer time from Kepler’s third law, the coast itself, and the prediction about doing nothing on arrival. The coast takes about 423 simulated days; use the speed control rather than waiting.',
      },
      {
        from: 'second-burn-size',
        to: 'when-this-is-true',
        text: 'The second burn, circularizing, the total cost, why both burns were accelerations, and what the whole answer depended on. The last screen is the one to leave time for.',
      },
    ],
    'lagrange-points': [
      {
        from: 'two-stars-and-a-speck',
        to: 'predict-forbidden',
        text: 'The system, the rotating frame, the normalization, and a prediction about whether speeding up opens or closes the forbidden region. Set the units carefully here - every number later is in them.',
      },
      {
        from: 'the-jacobi-constant',
        to: 'why-conserved-matters',
        text: 'The Jacobi constant, reading it twice to see it hold, and what a conserved quantity is worth when the trajectory is unsolvable. Screen 6 is the conceptual center of the first half.',
      },
      {
        from: 'five-places',
        to: 'critical-order',
        text: 'The five points, the equilateral geometry of L4, and the ordering of the critical values. Brisk; the arithmetic is one line.',
      },
      {
        from: 'open-the-neck',
        to: 'accessible-not-reachable',
        text: 'Open the L1 neck with a burn, and predict what an open neck licenses. Everyone opens it differently, which is deliberate and is why the next two screens exist.',
      },
      {
        from: 'predict-same-region-same-path',
        to: 'watch-it-not-cross',
        text: 'The controlled version, and the heart of the second act: one tracer, one place, one speed, two directions, so the accessible region is identical by construction and the trajectory is the only thing left that can differ. About a minute of running. Budget time here and resist resolving the ambiguity beyond what the runs show - "did not cross in two periods" is the whole finding.',
      },
      {
        from: 'stability-is-different',
        to: 'trojans',
        text: 'Stability as a third question, the surprise that L4 and L5 are stable at maxima, and the Trojans. This is the part students remember.',
      },
      {
        from: 'break-it',
        to: 'three-claims',
        text: 'Break the assumptions deliberately and watch the overlay refuse, then the eccentric case, then the three claims restated side by side. Leave time for the last screen.',
      },
    ],
    'what-is-a-gravitational-wave': [
      {
        from: 'travel-without-shining',
        to: 'what-has-to-change',
        text: 'What has to be happening — Screen 1 is a prediction and is designed to be got wrong; do not resolve it early, and make sure it is written down, because screen 27 comes back to it. Screen 4 is the conceptual core of this quarter: the pulsating sphere emits nothing, and students who answer "B, because it is moving" have exposed the misconception the screen exists for. Spend a minute there. Screens 3 to 5 are the argument, and screen 4 is where it lands: an enormous amount of motion — a sphere swelling and shrinking — and nothing leaves it. Take a show of hands before revealing that one; "it is moving, so it radiates" is the answer most of a room gives, and it is the misconception the investigation exists to remove. The canvas shows each source in turn because the control puts it there.',
      },
      {
        from: 'watch-the-pair',
        to: 'follow-a-disturbance-outward',
        text: 'The source and its rhythm — Screen 6 is the one to slow down on. Students reliably answer "a full orbit"; the half-orbit answer, and the reason for it - two identical objects swapped over look the same - is what makes the factor of two on screen 16 land rather than being a fact to memorize. Screen 7 introduces the ring overlay and says plainly that the speed is slowed and the rings are not matter.',
      },
      {
        from: 'freely-floating-markers',
        to: 'can-space-carry-a-sound',
        text: 'What arrives — The physical heart of the investigation. Screen 11 is the one students most often need help with: the markers are not carried along, and the water-cork analogy is the one place a water analogy helps. Screen 12 is where the exaggeration is admitted, and it is worth pausing on the atom-across-an-astronomical-unit comparison. Screen 14 heads off "we heard the black holes" before anybody says it.',
      },
      {
        from: 'slower-pair-faster-pair',
        to: 'where-the-calculation-stops',
        text: 'Shrinking orbits and the chirp — Screen 16 is the only counting exercise and it is worth the time: students count orbits on the canvas and peaks on the plot themselves and get two. Screen 17 draws the line between the energy argument and the sandbox’s own illustrative damping, which matters because the rest of Gravitas uses the latter. Screen 19 establishes that the plot ends because the model was switched off, not because anything happened.',
      },
      {
        from: 'different-compact-pairs',
        to: 'what-two-observatories-recorded',
        text: 'Other pairs, distance, and a measurement — Screen 21 is a clean controlled comparison - only the distance moves, and the frequency does not - and its validator checks the factor of two. Screen 22 is the payoff: the L-shape follows from the transverse stretch and squeeze the students have already watched, and the published trace is the first and only observation in the investigation.',
      },
      {
        from: 'design-one-small-experiment',
        to: 'what-you-worked-out',
        text: 'Their own experiment, and the story — Screen 26 is deliberately open and deliberately small: one variable, two readings, and a statement of what was held fixed. Screen 27 is the assessment. Read the revisit of screen 1 as carefully as the explanation - a student who can say why their first answer was wrong has done the investigation. The last screen is a closing summary of the five things the investigation established.',
      },
    ],
    'listening-to-spacetime': [
      {
        from: 'an-unlabeled-signal',
        to: 'find-your-way-around',
        text: 'An unlabeled signal, a prediction about what made it, then the reveal and the three-kinds-of-picture screen. Screen 2 is the one to slow down on: if a class leaves without the distinction between the animation, the schematic and the plots, the rest lands differently. Screen 3 is controls practice and can be brisk.',
      },
      {
        from: 'predict-as-it-tightens',
        to: 'explain-the-chirp',
        text: 'The chirp, measured. A prediction, the wave overlay, the two-per-orbit count, two frequency readings, a saved evidence capture at 50 Hz, and a written explanation. The counting exercise at screen 6 takes longer than it looks and is worth the time.',
      },
      {
        from: 'predict-heavier',
        to: 'the-one-mass-that-matters',
        text: 'Mass. A prediction about time in band, the first controlled comparison, a three-way table, and the chirp-mass surprise. Screen 13 lands best if students have not been told the answer at screen 11.',
      },
      {
        from: 'predict-twice-as-far',
        to: 'edge-on',
        text: 'Distance and geometry. The vertical scale is pinned across screens 15 and 16 so the comparison is honest; screen 16 is where the degeneracy appears and it is the hardest idea in the investigation.',
      },
      {
        from: 'three-sources',
        to: 'where-the-model-stops',
        text: 'The three presets side by side, then the limits screen. Screen 18 is a multiple-choice question but it is really the conceptual close of the model half.',
      },
      {
        from: 'add-the-noise',
        to: 'looks-like-is-not-enough',
        text: 'Noise, and what a similarity number is and is not. Expect this pair to generate the most discussion in the room.',
      },
      {
        from: 'what-they-actually-recorded',
        to: 'model-against-measurement',
        text: 'The real data. Students find the seven-millisecond shift and the sign flip themselves before the readout confirms them, then see the residual. Do not shortcut the finding.',
      },
      {
        from: 'five-recordings',
        to: 'measured-or-supplied',
        text: 'Five more mergers, read from open strain. The measurement screen and the ranking prediction are the core: students rank four pairs by chirp mass from a frequency they read themselves, before any catalog value is on the screen, and the catalog confirms it. Budget twenty minutes. Screen 27 is where the class learns why the highest signal-to-noise event is the one with nothing measurable on its map, and screen 29 asks the question the whole block is for: what was measured here, and what was supplied.',
      },
      {
        from: 'your-own-experiment',
        to: 'where-this-leaves-you',
        text: 'The open challenge and the written conclusion. Budget fifteen minutes: the challenge is the only screen with no right answer and it is where the experimental-control habit either shows up or does not. The last screen is a closing summary: what the chirp fixes, what it leaves open, and why a chirp is not a detection.',
      },
    ],
    'a-universe-of-stars': [
      {
        from: 'three-stars-no-labels',
        to: 'measure-the-radius-ratio',
        text: 'Four words that are not synonyms — The opening prediction is designed so that every "they go together" answer is wrong about these particular stars. Do not resolve it early; screen 2 reveals the numbers and screens 4 to 6 build the relation that explains them. Screen 3 is free exploration of color and is deliberately ungraded.',
      },
      {
        from: 'the-two-axes',
        to: 'lines-of-constant-radius',
        text: 'The diagram, and what a point on it means — All five screens are in free-cursor mode. Expect the reversed temperature axis to catch most of the room on screen 7; the validation catches a student who moved the wrong way and says why. Screen 11 turns on the constant-radius reference lines, which are straight lines on these axes - worth showing on the board as log L = 2 log R + 4 log T.',
      },
      {
        from: 'switch-to-modeled-stars',
        to: 'what-the-trend-covers',
        text: 'The main sequence, and its limits — Screens 13 and 15 are the quantitative core. Screen 16 is a short written answer and the first place the investigation checks whether "main sequence" has landed as a stage rather than a category. If time is short, screen 15 can be demonstrated from the front rather than done individually.',
      },
      {
        from: 'two-red-stars',
        to: 'classify-from-position',
        text: 'Everything that is not on the main sequence — The strongest fifteen minutes in the investigation. Screen 17 has two stars of identical color differing by a factor of 426 in radius. Screen 20 is a prediction and the one to hold the room on: a hot star that is faint has to be tiny, and the fourth option - "you cannot tell without the mass" - is the habit the whole investigation is trying to break. Take a show of hands before revealing it. Screen 21 needs the age slider paced by phase, which the step sets automatically; the tip invites students to switch it back and watch the whole post-main-sequence collapse into a sliver.',
      },
      {
        from: 'predict-who-lives-longer',
        to: 'measure-the-lifetimes',
        text: "Why the big ones go first — Screen 22 is a prediction most students get wrong for a good reason, and the discussion is better if they commit first. Screen 23 carries the investigation's one genuinely unverifiable number and says so: no 0.2 solar-mass star has ever finished its main sequence anywhere.",
      },
      {
        from: 'a-population',
        to: 'find-a-counterexample',
        text: 'A population, counted twice, and a challenge — One population, one histogram and one canvas across screens 25 to 28; only the cut changes, and it now moves the canvas as well as the plot. Screen 26 is the prediction and it is worth a show of hands - "almost none" is the answer nearly nobody offers before seeing it. The written answer on screen 28 is the one worth collecting; see the rubric, and in particular the wrong answer it rejects. Screen 29 is open and accepts either counterexample; the validation recognizes both and nudges a student whose two stars break neither rule.',
      },
      {
        from: 'spectra-the-light-itself',
        to: 'spectra-four-is-four',
        text: "What a color cannot tell you — The only part of this investigation built on observations. Four real SDSS spectra, and an argument in four moves: screen 31 shows that a color works, screen 32 removes the color and shows that a feature still separates the four, screen 33 asks for a classification with no color on the screen at all, and screen 34 asks for the general statement in the student's own words. The one to hold the room on is the calcium column on screen 32: it rises from the A star to the G star and falls again to the M star, and a quantity that rises and falls cannot be recovered from a temperature. That is the whole argument, and it is not an argument about instruments being nicer. Screen 33 is the one to watch students do rather than collect - see the classroom check below. Say once, out loud, that these four are measurements and that the eight tracks behind the first twenty-nine screens are not.",
      },
      {
        from: 'the-argument',
        to: 'what-the-diagram-is-for',
        text: 'The argument, and the summary — Screen 36 puts the step 1 prediction back on screen and is the summative piece. The last screen is a closing summary: the five quantities, what the main sequence fixes, what a position on the diagram does not, and the one point the spectra added that no model in this investigation could.',
      },
    ],
    'lives-of-stars': [
      {
        from: 'three-futures',
        to: 'arriving',
        text: 'Before there is a star — The opening prediction is worth protecting: do not resolve it, and note that the two wrong answers about the small and the Sun-like star are corrected at screens 22 and 18 respectively. Screen 2 is the cloud, which carries no numbers at all, and the readout says why - that refusal is the investigation, not a gap. All three stars now stand on the main canvas rather than only on the comparison card, and they are half way through their own main sequences - the same FRACTION of a life, not the same age. That is the deliberate contrast with screen 23, which lines two stars up at the same number of years and gets a completely different picture. Name the difference here; a class that misses it reads screen 23 as contradicting this one.',
      },
      {
        from: 'the-sun-today',
        to: 'core-in-envelope-out',
        text: 'The long part, and what ends it — Screen 8 is where a student sees that the Sun has already brightened by a third since it arrived, which kills the picture of a star sitting at one point for ten billion years. Screen 10 is the core-hydrogen prediction and the most important single screen in the investigation; give it time before revealing.',
      },
      {
        from: 'predict-direction',
        to: 'how-long-was-each-part',
        text: 'Giant, ejection, cinder — Screen 16 exists to stop the tidy story: after helium ignites the star does not carry on getting bigger and redder, it drops and loops back. Screen 18 is the "the Sun will explode" correction. Screen 21 is the duration comparison and is the one to keep if you are short of time.',
      },
      {
        from: 'predict-the-red-dwarf',
        to: 'massive-versus-sun',
        text: 'The two ends of the mass range — Screen 22 is the red dwarf, and the point is that almost nothing happens to it. Screen 23 is explicitly a same-age comparison and says so - the distinction between comparing at the same age and at the same fraction of a life is set up here and used again at screen 33.',
      },
      {
        from: 'supergiant-and-burning',
        to: 'the-black-hole',
        text: 'What the heavy ones do — Screen 27 is a written answer about iron and is the hardest question in the investigation. Screens 29 and 31 are the two endpoint cases, and the contrast between them is deliberate: one is confident, one is a range spanning a factor of three with no bright supernova expected.',
      },
      {
        from: 'read-the-descriptions',
        to: 'what-you-followed',
        text: 'Reading it back — Screen 32 has "not enough information" as its correct answer, which students find harder than any of the physics. Screen 33 is the open challenge and screen 34 the summative piece, which requires naming a limitation of the models. The last screen is a closing summary: mass to luminosity to lifetime, what is left behind, and what these models do not model.',
      },
    ],
    'twelve-nights': [
      {
        from: 'the-allocation',
        to: 'measure-the-window',
        text: 'The allocation, and measuring what it actually buys: five hours a night, walking 3.9 minutes earlier each time. The drift is the number everything later depends on.',
      },
      {
        from: 'predict-the-comb',
        to: 'measure-the-window-power',
        text: 'Predict the comb, then see it in the spectral window, and measure how far the peak falls when the full width of the window is used instead of its middle.',
      },
      {
        from: 'why-not-one-day',
        to: 'why-not-one-day',
        text: 'Why the peak sits at the sidereal day and not at one cycle a day. Worth not rushing: it is the evidence that the comb was imposed rather than chosen.',
      },
      {
        from: 'predict-which-plan-wins',
        to: 'read-what-you-got',
        text: 'Commit both plans to the live spectrograph, in sequence with one seed, and read an alias off one of them.',
      },
      {
        from: 'sixty-nights-would-not-help',
        to: 'what-the-sky-decided',
        text: 'What nine more weeks would have bought, what would actually fix it, and what a period has to be quoted with before anybody else can check it.',
      },
    ],
    'power-law-gravity': [
      {
        from: 'the-exactly',
        to: 'predict-does-small-matter',
        text: 'What is being changed, and why it needs an anchor. Step 2 is the conceptual one and should not be rushed; step 3 is a held prediction about whether a 2.5% change in n could matter.',
      },
      {
        from: 'first-look-at-the-orbit',
        to: 'what-closes-an-orbit',
        text: 'The precession experiment. Students step through four exponents and watch the ellipse stop closing, including a shallower-than-Newton case that precesses backwards. Ends on Bertrand’s theorem.',
      },
      {
        from: 'predict-is-it-the-computer',
        to: 'the-refinement-verdict',
        text: 'Is it real? A prediction, then a four-timestep refinement, then the verdict. The n = 2 control reading zero at every timestep is what stops the refinement result being vacuous.',
      },
      {
        from: 'predict-period-and-distance',
        to: 'why-the-slope-and-not-something-else',
        text: 'The quantitative half. Four measured slopes, a linear pattern, a numeric prediction at an exponent not measured, and then the question of why the slope in particular is worth measuring rather than anything else.',
      },
      {
        from: 'predict-what-breaks',
        to: 'and-energy',
        text: 'What does not break. A prediction most students get wrong, the conservation readouts at two exponents, the reason the two survive, and the potential-energy trap.',
      },
      {
        from: 'two-lists',
        to: 'the-honest-caveat',
        text: 'Synthesis: the two lists, the n = 3 stability boundary and why the instrument stops short of it, one closing question about method, and an explicit statement of what the model is and is not.',
      },
    ],
    'the-turning-sky': [
      {
        from: 'a-sky-that-turns',
        to: 'predict-tomorrow',
        text: 'The two coordinate systems and the instrument, then a held prediction of tomorrow’s rising time.',
      },
      {
        from: 'rise-shift',
        to: 'a-month-on',
        text: 'Students measure Arcturus’s rising time on night 0 and night 30 and use the shift for a month.',
      },
      {
        from: 'why-four-minutes',
        to: 'sidereal-clock',
        text: 'The cause, in a choice, and the same four minutes in the sidereal clock.',
      },
      {
        from: 'height-at-the-meridian',
        to: 'never-sets',
        text: 'Meridian altitude from declination and latitude, and a circumpolar star.',
      },
      {
        from: 'one-sentence',
        to: 'what-you-worked-out',
        text: 'A written explanation of the changing evening sky, and the close.',
      },
    ],
    'the-sun-through-the-year': [
      {
        from: 'a-sun-that-moves',
        to: 'predict-noon-height',
        text: 'The ecliptic and obliquity, the instrument, and a held prediction of the June–December noon difference.',
      },
      {
        from: 'three-noons',
        to: 'what-if-the-tilt',
        text: 'Three noon altitudes at 40 degrees north, and the effect of a smaller tilt.',
      },
      {
        from: 'three-day-lengths',
        to: 'distance-is-not-it',
        text: 'Day length at three latitudes and the distance trap.',
      },
      {
        from: 'equinox-longitude',
        to: 'one-sentence',
        text: 'The Sun’s ecliptic longitude and a written account of a world with no tilt.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close of the investigation, with what was worked out.',
      },
    ],
    'phases-and-eclipses': [
      {
        from: 'a-moon-that-changes',
        to: 'predict-the-quarter',
        text: 'Elongation and the instrument, and a held prediction for the quarter phase.',
      },
      {
        from: 'four-phases',
        to: 'phase-from-elongation',
        text: 'Four lit fractions, then the formula (1 − cos E)/2.',
      },
      {
        from: 'predict-the-eclipses',
        to: 'eclipse-table',
        text: 'A held prediction of eclipse frequency, then counting the possible eclipses of two half years.',
      },
      {
        from: 'months-between',
        to: 'why-not-every-month',
        text: 'The interval between the March and September eclipses and the cause, the tilted orbit.',
      },
      {
        from: 'one-sentence',
        to: 'what-you-worked-out',
        text: 'A written explanation of eclipse seasons, and the close.',
      },
    ],
    'wanderers-on-the-sky': [
      {
        from: 'five-wanderers',
        to: 'predict-the-loop',
        text: 'The two panels, and a held prediction of Mars’s motion.',
      },
      {
        from: 'retrograde-window',
        to: 'two-views-one-event',
        text: 'Finding the loop’s dates, the elongation at the fastest westward motion and the same event from above.',
      },
      {
        from: 'venus-elongation',
        to: 'the-inner-limit',
        text: 'Venus’s greatest elongation and the circular-orbit limit.',
      },
      {
        from: 'jupiter-loop',
        to: 'when-retrograde',
        text: 'Jupiter’s loop and the rule for outer planets.',
      },
      {
        from: 'one-sentence',
        to: 'what-you-worked-out',
        text: 'A written explanation of apparent backward motion, and the close.',
      },
    ],
    'plan-a-night': [
      {
        from: 'the-brief',
        to: 'dark-hours',
        text: 'The brief and the dark in two seasons.',
      },
      {
        from: 'airmass-at-thirty',
        to: 'why-limit-airmass',
        text: 'An airmass and why observers limit it.',
      },
      {
        from: 'what-the-moon-costs',
        to: 'count-the-targets',
        text: 'The cost of the Moon and counting worthwhile targets.',
      },
      {
        from: 'tighten-the-limit',
        to: 'write-the-plan',
        text: 'A stricter airmass and the written plan.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close of the investigation, with what was worked out.',
      },
    ],
    'bending-light': [
      {
        from: 'a-mass-turns-light',
        to: 'the-suns-limb',
        text: 'A mass turns light by 4GM/(c²b); the Sun’s limb bends it 1.75 arcseconds.',
      },
      {
        from: 'predict-the-far-ray',
        to: 'the-far-ray',
        text: 'A ray a hundred times farther out: predicted, then measured at a hundredth the angle.',
      },
      {
        from: 'ten-times-the-mass',
        to: 'what-1919-showed',
        text: 'Ten times the mass, ten times the bending, and what the 1919 eclipse decided between 1.75 and 0.88.',
      },
      {
        from: 'where-the-formula-fails',
        to: 'where-the-formula-fails',
        text: 'A black hole case where the weak-field formula cannot be trusted.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what was worked out and where it stops.',
      },
    ],
    'einstein-rings-and-arcs': [
      {
        from: 'a-lens-makes-a-ring',
        to: 'predict-the-ring',
        text: 'A lens makes a ring; students predict the size of a star’s.',
      },
      {
        from: 'a-star-ring',
        to: 'a-galaxy-ring',
        text: 'The Einstein radius of a star, about a milliarcsecond, and of a galaxy, about an arcsecond.',
      },
      {
        from: 'weigh-the-lens',
        to: 'weigh-the-lens',
        text: 'A one-arcsecond ring at a gigaparsec holds 2.5 × 10^11 solar masses.',
      },
      {
        from: 'move-the-source',
        to: 'an-isothermal-galaxy',
        text: 'Two images for a point mass (total 2.18) and for an isothermal galaxy (total 4).',
      },
      {
        from: 'why-arcs',
        to: 'why-arcs',
        text: 'Why most lensed galaxies are arcs and not rings.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: a ring is a mass scale.',
      },
    ],
    'a-lens-passing-by': [
      {
        from: 'a-star-brightens',
        to: 'predict-the-peak',
        text: 'A passing lens brightens a star; students predict the peak.',
      },
      {
        from: 'the-peak',
        to: 'a-faster-lens',
        text: 'The peak (10.04), the crossing time (16.6 days) and what twice the speed does.',
      },
      {
        from: 'one-curve-three-lenses',
        to: 'can-the-curve-weigh-the-lens',
        text: 'Three lenses, one curve: the light curve fixes the crossing time only.',
      },
      {
        from: 'blended-light',
        to: 'a-star-with-a-size',
        text: 'Blended light lowers the peak to 5.5; a finite star caps it at 20.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what a curve fixes and what it leaves open.',
      },
    ],
    'inside-a-star': [
      {
        from: 'weight-and-pressure',
        to: 'predict-the-center',
        text: 'Weight against pressure fixes a star; students predict how dense the center is.',
      },
      {
        from: 'the-suns-center',
        to: 'half-the-mass',
        text: 'The Sun as a polytrope: 76 g/cm³ and 11.8 million kelvin at the center, half the mass inside 0.28 of the radius.',
      },
      {
        from: 'twice-the-mass',
        to: 'why-the-center-is-hot',
        text: 'Twice the mass in the same size doubles the temperature; why the center is hot from weight alone.',
      },
      {
        from: 'a-red-dwarf',
        to: 'no-concentration',
        text: 'A red dwarf is less concentrated (6 times), a uniform ball not at all.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: the shape of the balance and what the model leaves out.',
      },
    ],
    'scaling-the-main-sequence': [
      {
        from: 'stars-as-scaled-copies',
        to: 'predict-the-slope',
        text: 'Stars as scaled copies; students predict whether the models follow the exponent.',
      },
      {
        from: 'the-prediction',
        to: 'low-mass-stars',
        text: 'Massive stars follow L ∝ M³ to 5 percent; low-mass stars are a unit shallower than predicted.',
      },
      {
        from: 'the-wrong-law',
        to: 'why-no-single-exponent',
        text: 'The wrong opacity gives six times the scatter; why no single exponent holds.',
      },
      {
        from: 'radius-scaling',
        to: 'lifetimes',
        text: 'The radius prediction is the weaker; lifetimes follow M ÷ L.',
      },
      {
        from: 'the-suns-clock',
        to: 'the-suns-clock',
        text: 'A nuclear clock for the Sun, 13.9 Gyr, against MIST’s 9.9.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: scaling says what to expect, the residuals how far to trust it.',
      },
    ],
    'the-limit': [
      {
        from: 'a-star-held-up-by-electrons',
        to: 'a-typical-dwarf',
        text: 'A star held up by degenerate electrons; a typical dwarf is 0.6 solar masses in 8,900 km.',
      },
      {
        from: 'predict-the-squeeze',
        to: 'a-dense-dwarf',
        text: 'Students predict that squeezing gives more mass and less radius; 1.37 solar masses in 2,470 km.',
      },
      {
        from: 'the-ceiling',
        to: 'why-a-limit',
        text: 'The mass climbs toward 1.456 and never passes; relativistic electrons explain why.',
      },
      {
        from: 'hydrogen-would-be-different',
        to: 'an-iron-core',
        text: 'The limit goes as 1/μₑ²: 5.8 for hydrogen, 1.26 for iron.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: heavier is smaller, and the limit emerges.',
      },
    ],
    'the-beat-of-a-star': [
      {
        from: 'a-star-that-repeats',
        to: 'the-first-period',
        text: 'A star that repeats; a period search gives 0.6604 days with a narrow peak.',
      },
      {
        from: 'fold-it',
        to: 'fold-it',
        text: 'Folding and a bootstrap give 0.66041 ± 0.00015 days and a 0.71 mag amplitude.',
      },
      {
        from: 'predict-twice-the-period',
        to: 'a-slightly-wrong-period',
        text: 'Students predict twice the period shows the shape twice; 2 percent off smears the fold.',
      },
      {
        from: 'a-second-star',
        to: 'why-the-error-is-bigger',
        text: 'Eta Aquilae: 7.226 ± 0.030 days from 3.7 cycles; the peak is wide.',
      },
      {
        from: 'predict-once-a-night',
        to: 'once-a-night',
        text: 'Students predict the once-a-night result; the highest peak is at 1.97 days.',
      },
      {
        from: 'the-false-periods',
        to: 'why-aliases',
        text: 'The aliases at 1.945 and 0.398 days; sampling once a day cannot tell them from the star.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close, and what is left out.',
      },
    ],
    'leavitts-law': [
      {
        from: 'brighter-and-slower',
        to: 'predict-the-trend',
        text: 'Brighter and slower; students predict the line rises to the right.',
      },
      {
        from: 'the-calibration',
        to: 'how-tight',
        text: 'Slope −3.29, zero point 12.60, scatter 0.089, dust left 0.040.',
      },
      {
        from: 'why-wesenheit',
        to: 'the-tenfold-step',
        text: 'Why a Wesenheit magnitude; a tenfold step in period is 3.3 magnitudes.',
      },
      {
        from: 'why-one-galaxy',
        to: 'why-one-galaxy',
        text: 'Why the fit is made in one galaxy.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close, and what is left out.',
      },
    ],
    'the-first-rung': [
      {
        from: 'sliding-the-relation',
        to: 'a-maser-galaxy',
        text: 'Sliding the relation; NGC 4258 is 7.59 Mpc.',
      },
      {
        from: 'predict-the-maser-check',
        to: 'the-maser-check',
        text: 'Students predict agreement with masers; 29.397 ± 0.032 against 29.403 ± 0.051.',
      },
      {
        from: 'the-budget',
        to: 'what-limits-it',
        text: 'The budget: host scatter 0.043 and the Cloud’s distance 0.026 dominate.',
      },
      {
        from: 'another-galaxy',
        to: 'another-galaxy',
        text: 'M101 comes out at 6.95 megaparsecs, 8 percent nearer.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close; the Hubble-constant link is not made.',
      },
    ],
    'which-kind-of-variable': [
      {
        from: 'five-kinds-of-star',
        to: 'read-the-table',
        text: 'The five kinds; the period alone gives 83.3 percent and loses the binaries.',
      },
      {
        from: 'why-the-eclipsers-are-lost',
        to: 'add-the-amplitude',
        text: 'Why binaries are lost; students predict the amplitude helps them most.',
      },
      {
        from: 'the-shape',
        to: 'what-a-single-number-hides',
        text: 'The shape reaches 99.2 percent; one number hides the weakest kind.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: synthetic, balanced, stylised.',
      },
    ],
    'the-expanding-universe': [
      {
        from: 'a-line-through-the-origin',
        to: 'hubbles-slope',
        text: 'A line through the origin; Hubble’s 24 nebulae give 424 ± 42 km/s/Mpc, six times today’s value.',
      },
      {
        from: 'does-it-need-the-origin',
        to: 'does-it-need-the-origin',
        text: 'The free-intercept slope, 454 ± 75, differs by well under one error.',
      },
      {
        from: 'a-modern-sample',
        to: 'a-modern-sample',
        text: '197 supernovae out to z = 0.1 give 66.33 ± 0.24.',
      },
      {
        from: 'predict-further-out',
        to: 'further-out',
        text: 'Students predict the slope falls; out to z = 0.5 it is 59.35 ± 0.20 (955 objects).',
      },
      {
        from: 'why-it-changes',
        to: 'why-it-changes',
        text: 'Twenty-two errors apart: a line is the wrong shape beyond small redshift.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close, and what is not done.',
      },
    ],
    'standard-candles': [
      {
        from: 'a-candle-and-its-distance',
        to: 'the-sample',
        text: 'A candle and its distance; 1,829 supernovae, chi-square 1688 for 1827.',
      },
      {
        from: 'predict-a-calibration-error',
        to: 'a-calibration-error',
        text: 'Students predict the Hubble constant falls; a tenth of a magnitude is 66.85, a 4.5 percent fall.',
      },
      {
        from: 'the-degeneracy',
        to: 'the-degeneracy',
        text: 'The chi-square does not move: the supernovae cannot see the scale.',
      },
      {
        from: 'the-rung-below',
        to: 'the-rung-below',
        text: 'An error of 0.051 mag in the rung below passes on 2.4 percent.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: errors are handed up the ladder.',
      },
    ],
    'the-shape-of-expansion': [
      {
        from: 'a-curve-through-the-diagram',
        to: 'a-curve-through-the-diagram',
        text: 'The curve is the expansion’s history; the residual picture subtracts an empty universe.',
      },
      {
        from: 'predict-matter-only',
        to: 'a-matter-only-universe',
        text: 'Students predict a matter-only curve lies below the supernovae; chi-square 3303, 1615 above the best fit.',
      },
      {
        from: 'the-best-fit',
        to: 'the-best-fit',
        text: 'Ωm = 0.361, interval 0.349 to 0.372.',
      },
      {
        from: 'the-usual-value',
        to: 'what-the-interval-leaves-out',
        text: '0.30 is 30.9 above (5.6 sigma); the interval leaves out the shared errors.',
      },
      {
        from: 'predict-the-degeneracy',
        to: 'the-degeneracy-check',
        text: 'Moving the absolute magnitude by 0.15 mag leaves chi-square at 1687.9 and moves H0 to 65.33.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close, and the assumptions.',
      },
    ],
    'where-galaxies-live': [
      {
        from: 'a-slice-of-the-universe',
        to: 'the-whole-strip',
        text: '363 galaxies out to 170 Mpc, 2,911 out to 500 Mpc.',
      },
      {
        from: 'predict-the-clumping',
        to: 'the-clumping',
        text: 'Students predict clumping; the variance over mean is 9.79, where chance gives 1.',
      },
      {
        from: 'predict-the-thinning',
        to: 'the-thinning',
        text: 'Students predict the far density is lower; 15,800 near and 4,860 far per million cubic Mpc.',
      },
      {
        from: 'why-it-thins',
        to: 'why-it-thins',
        text: 'The thinning is the flux limit, not a void.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close, and what is not done.',
      },
    ],
    'what-a-ccd-records': [
      {
        from: 'three-calibration-frames',
        to: 'the-flat',
        text: 'Bias 500.4 counts and read noise 8.05 electrons; dark 0.100 electron a second; flat corner 76.2 percent and gain 1.52.',
      },
      {
        from: 'predict-the-flat',
        to: 'what-the-flat-does',
        text: 'Students predict the flat raises star B; 47,296 raw and 54,083 calibrated against a truth of 53,988.',
      },
      {
        from: 'divide-not-subtract',
        to: 'divide-not-subtract',
        text: 'The flat is a sensitivity: it multiplies, so it is divided last.',
      },
      {
        from: 'cosmic-rays',
        to: 'the-saturated-star',
        text: '4 cosmic-ray pixels flagged and 13 saturated; star D is 39 percent short with a small error bar.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close: what each frame removes, and what the synthetic camera leaves out.',
      },
    ],
    'signal-noise-and-exposure': [
      {
        from: 'the-ccd-equation',
        to: 'what-limits-the-bright-star',
        text: 'V = 15 in 60 s: 33,631 electrons, noise 220.6, signal-to-noise 152.5, limited by the star’s own photons.',
      },
      {
        from: 'predict-four-times',
        to: 'four-times-longer',
        text: 'Students predict twice the quality for four times the exposure; 320.7, a ratio of 2.10.',
      },
      {
        from: 'a-faint-star',
        to: 'why-more-than-double',
        text: 'V = 19 goes from 2.64 to 8.11 for four times the exposure: the read noise is paid once per frame.',
      },
      {
        from: 'exposure-for-the-target',
        to: 'faintest-star',
        text: '40.4 s in a suburb and 89.4 s under a bright moon for a signal-to-noise of 100; faintest star V = 19.33, 0.96 mag fainter in four times the time.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close, and what the calculator leaves out.',
      },
    ],
    'a-variable-star-from-frames': [
      {
        from: 'forty-frames',
        to: 'where-the-wander-comes-from',
        text: 'The star alone scatters by 0.070 mag; the comparison star wanders in step with it, so the cause is common to all stars.',
      },
      {
        from: 'against-the-comparison',
        to: 'against-the-comparison',
        text: 'The check star against the comparison scatters by 0.0088 mag, 8.0 times less.',
      },
      {
        from: 'predict-the-curve',
        to: 'the-sine',
        text: 'Students predict a smooth variation; period 0.1223 d and amplitude 0.0417 mag.',
      },
      {
        from: 'is-it-real',
        to: 'is-it-real',
        text: 'The amplitude is more than twenty errors and about four times the check star’s scatter.',
      },
      {
        from: 'what-you-worked-out',
        to: 'what-you-worked-out',
        text: 'The close, and what the synthetic series leaves out.',
      },
    ],
  },
};
