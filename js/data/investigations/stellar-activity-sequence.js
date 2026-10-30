// =============================================================================
// How Fast Does the Star Spin? and Flares (Prompt 220)
// -----------------------------------------------------------------------------
// Two investigations, each at three depths, in one module that also carries their Spanish
// words, their deeper steps and their instructor content: this is the one closure file the
// prompt adds (D-R10-220-06), because the shared sequence files sit at their line ceilings.
// The per-lesson path every loader builds from an id is a one-line re-export of a named export
// here, and the instructor modules read INSTRUCTOR. No imports: every number a step states is
// recomputed in tests/stellarActivityLessons.test.js from the instruments
// (js/activityWidgets.js over js/activityField.js and the kernel js/kernels/activity/). Every
// step carries a `sid`, an opaque stable id that student progress is keyed by.
//
// The data are the synthetic spotted star (truth in the panel) and two TESS light curves
// (AU Microscopii, EK Draconis). No age and no flare energy appears: Part B of the prompt was
// gated and its verdict is C (ACTIVITY_AGES_GATE.md), so one reading step says why.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'A young red dwarf', teffK: 3700, lumSun: 0.1 },
  ],
};
/** The spot panel: the synthetic star, one spot, the light curve. */
const SPOTS = (values = {}) => ({
  id: 'activity-spots',
  values: {
    lat: 30,
    size: 15,
    contrast: 0.65,
    inc: 70,
    second: 0,
    shear: 0,
    view: 0,
    ...values,
  },
});
/** The real-star panel: star 0 AU Microscopii, 1 EK Draconis; view 0 light, 1 periodogram, 2 and 3 folded. */
const PERIOD = (values = {}) => ({
  id: 'activity-period',
  values: { star: 0, view: 0, ...values },
});
/** The flare panel: view 0 a day, 1 one flare, largest first. */
const FLARE = (values = {}) => ({
  id: 'activity-flares',
  values: { view: 0, day: 9, flare: 1, ...values },
});
/** The frequency panel: source 0 AU Microscopii, 1 the synthetic star; floor 0 completeness, 1 scan, 2 all. */
const FFD = (values = {}) => ({
  id: 'activity-ffd',
  values: { source: 0, floor: 0, ...values },
});

export const HOW_FAST_DOES_THE_STAR_SPIN = {
  id: 'how-fast-does-the-star-spin',
  thumbnail: 'images/investigations/how-fast-does-the-star-spin.webp',
  title: 'How Fast Does the Star Spin?',
  subtitle:
    'Read a star’s rotation period from the dimming of its starspots, see why the light alone can leave a second answer open, and measure two real stars',
  duration: '14-28 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 16, section: null },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing', 'stars'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say why a spotted star’s light repeats once a turn, and read the period of the dimming from a light curve',
    'Say why the light alone can leave a second period open, and which one a pair of opposite spots makes',
    'Read the rotation period of a real star from a periodogram with its interval',
    'Say that the Sun and other stars turn faster at the equator than near the poles, and what that does to a period read from spots',
  ],
  steps: [
    {
      sid: 'a-spot-turns-with-the-star',
      stage: STAGE,
      type: 'read',
      title: 'A spot turns with the star',
      body: `A star is not a uniform disc. <strong>Starspots</strong> are cooler, darker patches, like the Sun&rsquo;s
             sunspots, and they ride on the surface as the star turns. When a spot faces us the star is a little
             fainter; as it turns over the limb the star brightens again; and the pattern repeats once every turn.
             \n\nThe panel turns a model star with one dark spot every 4.00 days and draws its light for 16 days,
             with a little noise. The line is the star without noise; the dots are what a telescope would record.
             The data are synthetic and the panel says so.`,
      tool: SPOTS(),
    },
    {
      sid: 'how-many-dips',
      stage: STAGE,
      type: 'predict',
      reveal: 'read-the-period',
      title: 'How many dips in a turn?',
      body: `The star turns once in 4.00 days and carries one dark spot, facing us at some moment and
             hidden behind the star half a turn later.`,
      prompt: 'In 16 days the light curve will show&hellip;',
      options: [
        'four dips, one each time the spot comes round: once a turn',
        'eight dips, one for the spot facing us and one for it hidden on the far side',
        'one long dip, since the spot stays on the star',
        'no dips: a spot is far too small to change a star’s light',
      ],
      answer: 0,
      hints: [
        'The spot dims the star only while it is on the side we see, and it is on that side once every turn.',
      ],
      because:
        'Four. The spot dims the star when it faces us and does nothing while it is on the far side, so there is one dip for every turn: 16 days is four turns of 4.00 days. Even a spot a few percent of the disc across dims the star by a few percent, which a space telescope measures easily.',
      tool: SPOTS(),
    },
    {
      sid: 'read-the-period',
      stage: STAGE,
      type: 'measure',
      title: 'Read the period',
      body: `The periodogram looks for the period that fits the light best. Read the <strong>period found</strong>
             and the <strong>dimming from the spots</strong>, from peak to trough.`,
      fields: [
        { id: 'a', label: 'Period found', unit: 'days', hint: '4.00' },
        {
          id: 'b',
          label: 'Dimming from the spots',
          unit: 'percent',
          hint: '2.7',
        },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 4.0, 0.05) && near(v.b, 2.75, 0.3)) {
          return {
            level: 'ok',
            message:
              'The period found is 4.00 days, the one the star was made with, and the spot dims it by about 2.7 percent. For this one-spot star the period of the dimming is the period of the turn.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the readout of the first panel without changing it: a period of 4.00 days and a dimming of about 2.7 percent.',
        };
      },
      tool: SPOTS(),
    },
    {
      sid: 'two-spots',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A second spot, on the far side',
      body: `Turn on <strong>Second spot, opposite side</strong>: a spot of the same size half a turn away from the
             first. The star still turns once in 4.00 days. The periodogram now peaks at 2.00 days, and the panel lists
             4.00 days as another period it could be.`,
      prompt:
        'What does this light curve alone say about the star’s rotation period?',
      options: [
        'The light repeats every 2.00 days, so the star turns in 2.00 days or in 4.00, and the light alone cannot say which',
        'The star turns in 2.00 days: the periodogram’s peak is the rotation period',
        'The star turns in 4.00 days, because that is what the panel says it was made with',
        'It has no rotation period, since two spots cancel each other',
      ],
      answer: 0,
      hints: [
        'With two equal spots opposite each other, what does the star look like half a turn later?',
      ],
      because:
        'Half a turn later the star looks the same, so the light repeats every 2.00 days. Whether the star turns in 2.00 days with one pattern or in 4.00 with two equal spots, the light is the same: the period of the dimming is one answer and twice it is the other, and only something beyond the light curve (a spectrum, a second star, the star’s size and speed) can choose. That is why the panel reports 4.00 days as not excluded rather than dropping it. The panel states what it was made with because it is synthetic; a real star does not.',
      misconceptions: [
        {
          id: 'peak',
          option: 1,
          say: 'The peak is the period of the dimming, which is the rotation period only when the pattern shows once a turn. Two equal spots make it show twice.',
        },
        {
          id: 'truth',
          option: 2,
          say: 'The truth is known here only because the data are synthetic. With a real star, the light curve is all there is, and it does not carry the answer.',
        },
      ],
      tool: SPOTS({ second: 1 }),
    },
    {
      sid: 'a-real-star',
      stage: STAGE,
      type: 'measure',
      title: 'A real star: AU Microscopii',
      body: `AU Microscopii is a young red dwarf, 32 light years away, and the TESS space telescope watched it for
             27 days. This is its periodogram. Read the <strong>rotation period</strong> and the
             <strong>other period it could be</strong>, in days.`,
      fields: [
        { id: 'a', label: 'Rotation period', unit: 'days', hint: '4.86' },
        {
          id: 'b',
          label: 'Other period it could be',
          unit: 'days',
          hint: '9.71',
        },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 4.856, 0.05) && near(v.b, 9.713, 0.1)) {
          return {
            level: 'ok',
            message:
              'About 4.86 days, with 9.71 days not excluded. Published analyses of all the TESS sectors give 4.85 ± 0.03 days; the 9.71-day possibility cannot be dismissed from this sector alone, because the two halves of the longer cycle look alike.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose AU Microscopii and the periodogram: the period is about 4.86 days and the other period it could be, twice that, about 9.71 days.',
        };
      },
      tool: PERIOD({ star: 0, view: 1 }),
    },
    {
      sid: 'the-sun-turns-unevenly',
      stage: STAGE,
      type: 'measure',
      title: 'The Sun, and stars like it, turn unevenly',
      body: `The Sun is not a solid wheel. Its sunspots near the equator go round in about 25 days and those
             near 60&deg; latitude take about 30 (see <em>The Turning Sun</em>). The panel can do the same to the
             model star: put the spot at <strong>60&deg;</strong> and the differential rotation at
             <strong>0.20</strong>, and read the period of the spot&rsquo;s latitude next to the equator&rsquo;s.`,
      fields: [
        { id: 'a', label: 'Period at the equator', unit: 'days', hint: '4.00' },
        {
          id: 'b',
          label: 'Period of the spot’s latitude',
          unit: 'days',
          hint: '4.71',
        },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 4.0, 0.05) && near(v.b, 4.706, 0.05)) {
          return {
            level: 'ok',
            message:
              'The equator turns in 4.00 days and the spot at 60 degrees in 4.71, and that is the period the periodogram finds. A period read from spots is the period of the spots’ latitude, which for a star that turns unevenly is not the equator’s.',
          };
        }
        return {
          level: 'error',
          message:
            'Set “Spot latitude” to 60 degrees and “Differential rotation, k” to 0.20: the equator’s period stays 4.00 days and the spot’s is about 4.71.',
        };
      },
      tool: SPOTS({ lat: 60, shear: 0.2 }),
    },
    {
      sid: 'why-no-age',
      stage: STAGE,
      type: 'read',
      title: 'What the period does not give',
      body: `A young star turns fast and slows down as it ages, so a spin period and a color have been used to
             estimate a star&rsquo;s age, a method called <strong>gyrochronology</strong>. This investigation stops
             at the period, on purpose. The published relations hold only for the stars and ages they were
             calibrated on, they scatter widely, and two of the best known disagree on one star by more than the
             intervals they state. Gravitas checked how often the interval it would state held on a synthetic
             sample, and the check fell short of the bar it had set in advance; so it does not state an age.
             \n\nThe period, its interval and the period it could be are what the light curve gives.
             The deeper levels read a second star, ask why the interval is wide and look at what the model leaves out.`,
      tool: PERIOD({ star: 1, view: 0 }),
    },
  ],
};

/** The deeper steps: quantitative (majors) and advanced (upper-level), after the core steps they hang on. */
export const HOW_FAST_DOES_THE_STAR_SPIN_DEEPER = {
  id: 'how-fast-does-the-star-spin',
  steps: [
    {
      sid: 'a-second-star',
      after: 'a-real-star',
      depth: 'quantitative',
      type: 'measure',
      title: 'A second star: EK Draconis',
      body: `EK Draconis is a young Sun-like star, watched for 27 days by TESS. Read its
             <strong>rotation period</strong> and the two ends of its <strong>95 percent interval</strong>.`,
      fields: [
        { id: 'a', label: 'Rotation period', unit: 'days', hint: '2.555' },
        {
          id: 'b',
          label: 'Lower end of the interval',
          unit: 'days',
          hint: '2.532',
        },
        {
          id: 'c',
          label: 'Upper end of the interval',
          unit: 'days',
          hint: '2.579',
        },
      ],
      validate: v => {
        if (![v.a, v.b, v.c].every(Number.isFinite)) return null;
        if (
          near(v.a, 2.555, 0.02) &&
          near(v.b, 2.532, 0.015) &&
          near(v.c, 2.579, 0.015)
        ) {
          return {
            level: 'ok',
            message:
              'A period of 2.555 days, with an interval from 2.532 to 2.579: wider, in days, than for AU Microscopii, because the spots’ signal is weaker (1.5 percent against 4.7) and the scatter around the fitted curve is correlated from point to point.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose EK Draconis and the periodogram: 2.555 days, with an interval of 2.532 to 2.579 days.',
        };
      },
      tool: PERIOD({ star: 1, view: 1 }),
    },
    {
      sid: 'why-the-interval-is-wider',
      after: 'a-second-star',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Why the interval is wide',
      body: `A periodogram peak has a width set by how many turns the data hold, and the interval the panel states
             is wider than that. EK Draconis is widened by a factor of 6.2, AU Microscopii by 2.9.`,
      prompt: 'What is the widening for?',
      options: [
        'The scatter around the fitted curve is correlated from point to point, as it is when spots change shape during the sector; neighbouring points are not independent evidence, so the period is less sure than the count of points suggests',
        'Bigger stars have wider intervals, and EK Draconis is bigger',
        'To allow for the star’s distance, which the period depends on',
        'To make the interval look more cautious than the data warrant',
      ],
      answer: 0,
      hints: [
        'A fit that treats every point as independent is too sure when the residuals run in long stretches above and below the curve.',
      ],
      because:
        'The fit treats the points as independent. When the residuals are correlated (a spot growing, fading or moving leaves stretches of data above or below the fitted curve) the real information is less than the number of points suggests, and the interval is widened by the factor the correlation of neighbouring residuals gives. The period does not depend on the distance, and the widening is not discretion: it is computed from the residuals.',
      misconceptions: [
        {
          id: 'distance',
          option: 2,
          say: 'A period is a time, measured the same from any distance.',
        },
        {
          id: 'cautious',
          option: 3,
          say: 'The factor is computed from the data, not chosen, and the validation of the interval’s coverage tested it on synthetic stars with known periods.',
        },
      ],
      tool: PERIOD({ star: 1, view: 1 }),
    },
    {
      sid: 'fold-it-twice',
      after: 'why-the-interval-is-wider',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Fold it twice',
      body: `To fold a light curve on a period is to lay every cycle on top of the last, by phase. The panel can
             fold AU Microscopii on its 4.86-day period and on twice that, 9.71 days. Try both.`,
      prompt: 'What does the 9.71-day fold show?',
      options: [
        'The two halves lie on top of each other within the noise, so the data cannot rule out 9.71 days as the rotation period',
        'The two halves differ, so 9.71 days is the true period',
        'The fold is empty, because 9.71 days is longer than the data',
        'The fold has two spots on it, so the star has two spots',
      ],
      answer: 0,
      hints: [
        'If the star turned in 9.71 days with two similar spots on opposite sides, the two halves of the cycle would look alike.',
      ],
      because:
        'The two halves agree (the panel’s test of whether they differ gives a chance of 0.63 of seeing a difference this large from noise alone), so the light shows one pattern per 4.86 days and does not tell a rotation of 4.86 days from one of 9.71 with two like spots. Only if the halves differed, as for unlike spots, would the longer period be shown. The 9.71-day cycle fits in the 27-day sector 2.8 times.',
      misconceptions: [
        {
          id: 'differ',
          option: 1,
          say: 'If the halves differed, the longer period would be the one the data prefer. Here they do not.',
        },
      ],
      tool: PERIOD({ star: 0, view: 3 }),
    },
    {
      sid: 'a-baseline-too-short',
      after: 'the-sun-turns-unevenly',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'An alias the data cannot test',
      body: `Go back to the model star with one spot. Its 16 days hold four turns of 4.00 days. The panel lists
             8.00 days as another period it could be, and says it cannot be tested.`,
      prompt: 'Why can the data not test 8.00 days?',
      options: [
        'A test needs the data to hold at least two cycles of the period tested, and 16 days hold fewer than two cycles of 8.00 days',
        'Because 8.00 days is not a multiple of 4.00',
        'Because the star does not turn that slowly',
        'Because the noise is too large',
      ],
      answer: 0,
      hints: [
        'To see whether the two halves of an 8.00-day cycle differ, you need two of the cycles.',
      ],
      because:
        'To say whether the odd and even dips differ you must see more than one cycle of the longer period, and 16 days are just under two cycles of 8.00. The panel then marks the longer period untestable instead of saying it is excluded or allowed. A longer sector, or the same star watched again, would test it.',
      tool: SPOTS(),
    },
    {
      sid: 'the-equator-from-a-spot',
      after: 'a-baseline-too-short',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'The equator from a spot',
      body: `The model star at 60&deg; with differential rotation 0.20 shows a period of 4.71 days in its light.`,
      prompt: 'Can you tell its equatorial period from the light curve alone?',
      options: [
        'No: the light gives the period of the spot’s latitude, and the equator’s follows only if the latitude and the differential rotation are known',
        'Yes: it is the same as the period in the light',
        'Yes: it is half the period in the light',
        'No, because a star with differential rotation has no period',
      ],
      answer: 0,
      hints: [
        'The model’s rule is P(lat) = P(equator) / (1 − k sin² lat). How many of these are known from the light?',
      ],
      because:
        'The period of the light is that of the spots, P(lat) = P(equator) / (1 − k sin² lat), and the light alone gives neither the latitude nor k. A star with several spots at several latitudes shows several periods and the periodogram’s peak is whichever is strongest. This is a stated limit of the model, and the period reported by the panel is the spots’ period, not a rotation period of the whole star.',
      misconceptions: [
        {
          id: 'same',
          option: 1,
          say: 'The two agree only for k = 0, a star that turns as a solid wheel.',
        },
      ],
      tool: SPOTS({ lat: 60, shear: 0.2 }),
    },
  ],
};

export const FLARES = {
  id: 'flares',
  thumbnail: 'images/investigations/flares.webp',
  title: 'Flares',
  subtitle:
    'Find the flares in a red dwarf’s light, measure how much light each gives out as an equivalent duration, and count flares by size',
  duration: '14-28 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 16, section: null },
  courseLevel: 'survey',
  mathematics: 'algebra',
  prerequisites: [],
  tags: ['observing', 'stars'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say what a flare looks like in a light curve and which part is quicker, the rise or the fall',
    'Say what an equivalent duration is, and read one with its uncertainty',
    'Count the flares of a real star and say how often they occur',
    'Say what the slope of the distribution of flares by size means, and why it depends on where the fit starts',
  ],
  steps: [
    {
      sid: 'a-flare-is-a-spike',
      stage: STAGE,
      type: 'read',
      title: 'A flare is a spike in the light',
      body: `A <strong>flare</strong> is a sudden release of magnetic energy in a star&rsquo;s atmosphere, the
             same kind of event as a solar flare. The star brightens within minutes and fades over a longer time.
             Red dwarfs flare often, and a flare can add more than a tenth of the star&rsquo;s light.
             \n\nThe panel shows one day of the light of AU Microscopii, a young red dwarf, from the TESS space
             telescope, with a reading every two minutes. The blue line is the star&rsquo;s quiet level, the
             dots are the light, and each ring marks a flare found by a rule: points at least three standard
             deviations above the quiet level, three or more in a row.`,
      tool: FLARE(),
    },
    {
      sid: 'rise-or-fall',
      stage: STAGE,
      type: 'predict',
      reveal: 'read-a-flare',
      title: 'Quicker up or quicker down?',
      body: `A flare brightens and then fades back to the star&rsquo;s quiet level.`,
      prompt: 'Which part of a flare is the quicker?',
      options: [
        'The rise: a few minutes up, and a longer, slowly fading tail',
        'The fall: the flare switches on slowly and ends abruptly',
        'Both take the same time, so a flare is symmetric',
        'It depends on the star, and no shape is typical',
      ],
      answer: 0,
      hints: [
        'Think of a fire: how quickly does it flare up compared with how long it takes to die down?',
      ],
      because:
        'The rise is the quicker: the light goes up within minutes and then falls over a longer time, with a long tail. Flares of different size share a common shape, a fast rise and a two-part decay, which is why a standard shape can be fitted to find a flare’s size.',
      tool: FLARE({ view: 1, flare: 2 }),
    },
    {
      sid: 'read-a-flare',
      stage: STAGE,
      type: 'measure',
      title: 'Read a flare',
      body: `The panel shows the second largest flare of AU Microscopii close up. Read its
             <strong>equivalent duration</strong> in seconds, its <strong>peak above the quiet level</strong> in
             percent and its <strong>width at half the peak</strong> in minutes.`,
      fields: [
        { id: 'a', label: 'Equivalent duration', unit: 's', hint: '118' },
        {
          id: 'b',
          label: 'Peak above the quiet level',
          unit: 'percent',
          hint: '3.5',
        },
        {
          id: 'c',
          label: 'Width at half the peak',
          unit: 'minutes',
          hint: '29',
        },
      ],
      validate: v => {
        if (![v.a, v.b, v.c].every(Number.isFinite)) return null;
        if (near(v.a, 118.3, 6) && near(v.b, 3.48, 0.2) && near(v.c, 29.4, 3)) {
          return {
            level: 'ok',
            message:
              'An equivalent duration of about 118 seconds (give or take 4), a peak 3.5 percent above the quiet level and a width at half the peak of about 29 minutes: a few percent brighter for a few tens of minutes.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the close-up view and “Flare, largest first” 2: about 118 seconds, a peak of 3.5 percent and about 29 minutes.',
        };
      },
      tool: FLARE({ view: 1, flare: 2 }),
    },
    {
      sid: 'what-is-an-equivalent-duration',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'What an equivalent duration is',
      body: `The flare you read has an equivalent duration of about 118 seconds.`,
      prompt: 'What does that number mean?',
      options: [
        'The time the star, at its quiet level, would take to give out the same light the flare added',
        'How long the flare lasted',
        'The time from the start of the flare to its peak',
        'The energy of the flare, in joules',
      ],
      answer: 0,
      hints: [
        'It is the area under the flare’s excess light, divided by the star’s quiet light, so it has the units of a time.',
      ],
      because:
        'The equivalent duration is the integral of the flare’s extra light divided by the quiet light, so it is the time the quiet star would need to give out the same light. It is not how long the flare lasts (about 29 minutes at half the peak here, longer in the tail), and it is a time in the telescope’s band, not an energy: turning it into one needs the star’s luminosity and the temperature of the flare, and Gravitas does not state either.',
      misconceptions: [
        {
          id: 'duration',
          option: 1,
          say: 'The flare’s duration is how long it lasts; the equivalent duration is a measure of how much light it adds, written as a time.',
        },
        {
          id: 'energy',
          option: 3,
          say: 'It would be an energy only after multiplying by the star’s luminosity in the band and correcting to all wavelengths, which needs more than this light curve gives.',
        },
      ],
      tool: FLARE({ view: 1, flare: 2 }),
    },
    {
      sid: 'count-the-flares',
      stage: STAGE,
      type: 'measure',
      title: 'Count the flares',
      body: `The second panel counts the flares of AU Microscopii by size. Read the <strong>number of flares
             found</strong> and work out how many there are <strong>a day</strong> on average.`,
      fields: [
        { id: 'a', label: 'Flares found', unit: '', hint: '76' },
        { id: 'b', label: 'Flares a day', unit: '', hint: '3.1' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 76, 1) && near(v.b, 3.09, 0.15)) {
          return {
            level: 'ok',
            message:
              'Seventy-six flares in 24.6 days of good data: about 3.1 a day, or one every eight hours. This is the number the rule finds; fainter flares are missed, so the true rate is at least this.',
          };
        }
        return {
          level: 'error',
          message:
            'Read the readout of the second panel: 76 flares in 24.6 days, 76 / 24.6 = 3.1 a day.',
        };
      },
      tool: FFD(),
    },
    {
      sid: 'a-time-not-an-energy',
      stage: STAGE,
      type: 'read',
      title: 'A time, not an energy',
      body: `Every number here is in the telescope&rsquo;s band, which covers roughly 600 to 1000 nanometers. A
             flare&rsquo;s energy would need the star&rsquo;s luminosity in that band and a correction for the rest
             of the spectrum, which depends on how hot the flare is. Gravitas checked a correction of that kind
             and found it depends too strongly on the temperature it assumes, so it states no flare energy:
             the equivalent duration is the measure.
             \n\nThe deeper levels fit the way flares are distributed by size, and ask what the fit can and cannot say.`,
      tool: FFD(),
    },
  ],
};

export const FLARES_DEEPER = {
  id: 'flares',
  steps: [
    {
      sid: 'the-slope',
      after: 'count-the-flares',
      depth: 'quantitative',
      type: 'measure',
      title: 'The slope',
      body: `Above a floor, the counts of flares of at least each size fall on a straight line on these
             logarithmic axes: a <strong>power law</strong> with slope α. The panel fits it above the
             size the telescope finds completely. Read α, its 95 percent interval, and the number of flares
             above the floor.`,
      fields: [
        { id: 'a', label: 'Slope α', unit: '', hint: '1.92' },
        { id: 'b', label: 'Lower end of the interval', unit: '', hint: '1.62' },
        { id: 'c', label: 'Upper end of the interval', unit: '', hint: '2.28' },
        { id: 'n', label: 'Flares above the floor', unit: '', hint: '29' },
      ],
      validate: v => {
        if (![v.a, v.b, v.c, v.n].every(Number.isFinite)) return null;
        if (
          near(v.a, 1.92, 0.08) &&
          near(v.b, 1.62, 0.1) &&
          near(v.c, 2.28, 0.1) &&
          near(v.n, 29, 1)
        ) {
          return {
            level: 'ok',
            message:
              'α = 1.92, with a 95 percent interval of 1.62 to 2.28, from 29 flares above a floor of 9 seconds. A slope near 2 is typical of flaring stars; the interval is wide because 29 flares are few.',
          };
        }
        return {
          level: 'error',
          message:
            'Use AU Microscopii with the floor at completeness: α about 1.92, interval 1.62 to 2.28, 29 flares.',
        };
      },
      tool: FFD(),
    },
    {
      sid: 'move-the-floor',
      after: 'the-slope',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Move the floor',
      body: `Set <strong>Floor of the fit</strong> to <em>none</em>. The slope falls from 1.92 to 1.27 and the
             line no longer follows the points.`,
      prompt: 'Why is the fit shallower when it includes the smallest flares?',
      options: [
        'The telescope misses part of the small flares, so there are fewer of them than the power law has, and the counts bend away below the floor',
        'Small flares follow a different law of physics',
        'The smallest flares are the most reliable, so they should count most',
        'The fit has more points, so it must be better',
      ],
      answer: 0,
      hints: [
        'A faint, short flare can hide in the noise. What does that do to the count at small sizes?',
      ],
      because:
        'Faint and short flares are found only in part or not at all, so the counts at small sizes fall below the power law and the fitted line is flattened. The completeness limit is the size above which the rule finds a flare completely in the panel’s injection test, and that is where the fit starts. More points are not better points.',
      tool: FFD({ floor: 2 }),
    },
    {
      sid: 'a-known-truth',
      after: 'move-the-floor',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'A fit with a known truth',
      body: `Switch the source to the synthetic star. Its flares were drawn from a power law of slope
             1.80, and the same rule and the same fit were run on its light curve: the fit returns 1.74, with a
             95 percent interval of 1.55 to 1.96.`,
      prompt: 'What does that say about the fit?',
      options: [
        'The interval contains the true slope, 1.80, as a 95 percent interval should about nineteen times in twenty: the method works when the truth is known',
        'The fit is wrong, because 1.74 is not 1.80',
        'The fit is exact, because the data are synthetic',
        'The interval is too wide to say anything',
      ],
      answer: 0,
      hints: [
        'A fit from a finite number of flares is a little off. Does the interval contain the truth?',
      ],
      because:
        'The fit is a maximum-likelihood slope from a finite count of flares, so it is not exactly the true slope; its 95 percent interval should contain the truth about nineteen times in twenty, and here it does. The validation of the method ran this on many synthetic stars. One star shows that it can work, not how often.',
      misconceptions: [
        {
          id: 'wrong',
          option: 1,
          say: 'A slope from 48 flares cannot equal the slope the population was drawn from; the interval says how far off it may be.',
        },
      ],
      tool: FFD({ source: 1 }),
    },
    {
      sid: 'the-floor-you-pick',
      after: 'a-known-truth',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'A floor chosen after looking',
      body: `Set <strong>Floor of the fit</strong> to <em>best fit</em> for AU Microscopii: the floor that
             makes the line follow the points best is 6.1 seconds, and the fit gives 1.98 (1.71 to 2.29) from 44 flares.`,
      prompt:
        'Is that a better measurement than 1.92 from the completeness limit?',
      options: [
        'No: the floor was chosen after looking at the data, which makes the interval too narrow, and the two agree within their intervals',
        'Yes: it uses more flares, so it is more precise',
        'Yes: a best fit is always the best measurement',
        'No: 1.98 is outside the first interval',
      ],
      answer: 0,
      hints: [
        'A floor picked by how well it fits is picked using the same data it is then used on.',
      ],
      because:
        'The completeness limit comes from an injection test on other data and does not depend on this light curve; the best-fitting floor is picked from it. A choice made by looking at the result is not counted in the interval, which therefore understates the uncertainty. 1.98 lies inside the first interval (1.62 to 2.28), so the two do not disagree.',
      misconceptions: [
        {
          id: 'outside',
          option: 3,
          say: '1.98 lies inside 1.62 to 2.28.',
        },
      ],
      tool: FFD({ floor: 1 }),
    },
    {
      sid: 'how-many-flares',
      after: 'the-floor-you-pick',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'How many flares for a slope',
      body: `The 95 percent interval on the slope from 29 flares runs from 1.62 to 2.28, about 0.67 wide.`,
      prompt:
        'About how many flares above the floor would halve the width of the interval?',
      options: [
        'About four times as many, 120 or so: the width falls as one over the square root of the number',
        'Twice as many, 58',
        'About 30 more',
        'No number would: the width cannot be reduced',
      ],
      answer: 0,
      hints: [
        'The error of a mean falls as one over the square root of the number of values.',
      ],
      because:
        'The error of a slope fitted by maximum likelihood goes as (α − 1) divided by the square root of the number of flares, so halving it takes four times the flares. For AU Microscopii that is about four times 27 days of good data, or a few more sectors.',
      tool: FFD(),
    },
  ],
};

export const HOW_FAST_DOES_THE_STAR_SPIN_ES = {
  title: '¿Con qué rapidez gira la estrella?',
  subtitle:
    'Lee el periodo de rotación de una estrella a partir de la atenuación de sus manchas, mira por qué la luz sola puede dejar abierta una segunda respuesta y mide dos estrellas reales',
  objectives: [
    'Decir por qué la luz de una estrella con manchas se repite una vez por vuelta, y leer el periodo de la atenuación en una curva de luz',
    'Decir por qué la luz sola puede dejar abierto un segundo periodo, y cuál produce un par de manchas opuestas',
    'Leer el periodo de rotación de una estrella real en un periodograma, con su intervalo',
    'Decir que el Sol y otras estrellas giran más deprisa en el ecuador que cerca de los polos, y qué hace eso a un periodo leído de las manchas',
  ],
  steps: [
    {
      title: 'Una mancha gira con la estrella',
      body: 'Una estrella no es un disco uniforme. Las <strong>manchas estelares</strong> son zonas más frías y oscuras, como las manchas solares, y viajan por la superficie mientras la estrella gira. Cuando una mancha nos mira, la estrella es un poco más tenue; al pasar el limbo, la estrella se aviva otra vez; y el patrón se repite una vez por vuelta.\n\nEl panel hace girar una estrella modelo con una mancha oscura cada 4,00 días y dibuja su luz durante 16 días, con un poco de ruido. La línea es la estrella sin ruido; los puntos son lo que registraría un telescopio. Los datos son sintéticos y el panel lo dice.',
    },
    {
      title: '¿Cuántos mínimos en una vuelta?',
      body: 'La estrella gira una vez en 4,00 días y lleva una mancha oscura, que nos mira en algún momento y queda oculta tras la estrella media vuelta después.',
      prompt: 'En 16 días la curva de luz mostrará&hellip;',
      options: [
        'cuatro mínimos, uno cada vez que la mancha vuelve: una vez por vuelta',
        'ocho mínimos, uno cuando la mancha nos mira y otro cuando está oculta en la cara lejana',
        'un solo mínimo largo, porque la mancha sigue en la estrella',
        'ninguno: una mancha es demasiado pequeña para cambiar la luz de una estrella',
      ],
      hints: [
        'La mancha atenúa la estrella solo mientras está en la cara que vemos, y está en esa cara una vez por vuelta.',
      ],
      because:
        'Cuatro. La mancha atenúa la estrella cuando nos mira y no hace nada mientras está en la cara lejana, así que hay un mínimo por vuelta: 16 días son cuatro vueltas de 4,00 días. Incluso una mancha de pocos por ciento del disco atenúa la estrella unos pocos por ciento, lo que un telescopio espacial mide con facilidad.',
    },
    {
      title: 'Lee el periodo',
      body: 'El periodograma busca el periodo que mejor ajusta la luz. Lee el <strong>periodo hallado</strong> y la <strong>atenuación por las manchas</strong>, de pico a valle.',
      fields: [
        { label: 'Periodo hallado' },
        { label: 'Atenuación por las manchas' },
      ],
    },
    {
      title: 'Una segunda mancha, en la cara lejana',
      body: 'Activa <strong>Segunda mancha, en el lado opuesto</strong>: una mancha del mismo tamaño media vuelta más allá de la primera. La estrella sigue girando una vez en 4,00 días. El periodograma tiene ahora su pico en 2,00 días, y el panel anota 4,00 días como otro periodo posible.',
      prompt:
        '¿Qué dice esta curva de luz sola sobre el periodo de rotación de la estrella?',
      options: [
        'La luz se repite cada 2,00 días, así que la estrella gira en 2,00 días o en 4,00, y la luz sola no puede decir cuál',
        'La estrella gira en 2,00 días: el pico del periodograma es el periodo de rotación',
        'La estrella gira en 4,00 días, porque eso dice el panel que se hizo con',
        'No tiene periodo de rotación, porque dos manchas se cancelan',
      ],
      hints: [
        'Con dos manchas iguales opuestas, ¿cómo se ve la estrella media vuelta después?',
      ],
      because:
        'Media vuelta después la estrella se ve igual, así que la luz se repite cada 2,00 días. Que la estrella gire en 2,00 días con un patrón o en 4,00 con dos manchas iguales da la misma luz: el periodo de la atenuación es una respuesta y su doble es la otra, y solo algo más allá de la curva de luz (un espectro, una segunda estrella, el tamaño y la velocidad de la estrella) puede elegir. Por eso el panel da 4,00 días como no excluido en vez de descartarlo. El panel dice con qué se hizo porque es sintético; una estrella real no lo dice.',
      misconceptions: [
        {
          say: 'El pico es el periodo de la atenuación, que es el periodo de rotación solo cuando el patrón aparece una vez por vuelta. Dos manchas iguales lo hacen aparecer dos veces.',
        },
        {
          say: 'La verdad se conoce aquí solo porque los datos son sintéticos. Con una estrella real, la curva de luz es todo lo que hay, y no trae la respuesta.',
        },
      ],
    },
    {
      title: 'Una estrella real: AU Microscopii',
      body: 'AU Microscopii es una enana roja joven, a 32 años luz, y el telescopio espacial TESS la observó durante 27 días. Este es su periodograma. Lee el <strong>periodo de rotación</strong> y el <strong>otro periodo que podría ser</strong>, en días.',
      fields: [
        { label: 'Periodo de rotación' },
        { label: 'Otro periodo que podría ser' },
      ],
    },
    {
      title: 'El Sol, y las estrellas como él, giran de forma desigual',
      body: 'El Sol no es una rueda sólida. Sus manchas cerca del ecuador dan la vuelta en unos 25 días y las que están cerca de los 60&deg; de latitud tardan unos 30 (mira <em>El Sol que gira</em>). El panel puede hacer lo mismo con la estrella modelo: pon la mancha a <strong>60&deg;</strong> y la rotación diferencial en <strong>0,20</strong>, y lee el periodo de la latitud de la mancha junto al del ecuador.',
      fields: [
        { label: 'Periodo en el ecuador' },
        { label: 'Periodo de la latitud de la mancha' },
      ],
    },
    {
      title: 'Lo que el periodo no da',
      body: 'Una estrella joven gira deprisa y se frena al envejecer, así que se han usado un periodo de giro y un color para estimar la edad de una estrella, un método llamado <strong>girocronología</strong>. Esta investigación se detiene en el periodo, a propósito. Las relaciones publicadas valen solo para las estrellas y edades con que se calibraron, tienen una dispersión grande, y dos de las más conocidas discrepan en una estrella más de lo que dicen sus intervalos. Gravitas comprobó con qué frecuencia se cumplía el intervalo que daría en una muestra sintética, y la comprobación quedó por debajo del listón que se había fijado de antemano; por eso no da una edad.\n\nEl periodo, su intervalo y el periodo que podría ser es lo que da la curva de luz. Los niveles más profundos leen una segunda estrella, preguntan por qué es ancho el intervalo y miran lo que el modelo deja fuera.',
    },
  ],
};

export const HOW_FAST_DOES_THE_STAR_SPIN_DEEPER_ES = {
  steps: [
    {
      title: 'Una segunda estrella: EK Draconis',
      body: 'EK Draconis es una estrella joven parecida al Sol, observada durante 27 días por TESS. Lee su <strong>periodo de rotación</strong> y los dos extremos de su <strong>intervalo del 95 por ciento</strong>.',
      fields: [
        { label: 'Periodo de rotación' },
        { label: 'Extremo inferior del intervalo' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    {
      title: 'Por qué el intervalo es ancho',
      body: 'El pico de un periodograma tiene una anchura que fija cuántas vueltas contienen los datos, y el intervalo que da el panel es más ancho que eso. EK Draconis se ensancha por un factor de 6,2 y AU Microscopii por 2,9.',
      prompt: '¿Para qué sirve el ensanchamiento?',
      options: [
        'La dispersión alrededor de la curva ajustada está correlacionada de un punto al siguiente, como ocurre cuando las manchas cambian de forma durante el sector; los puntos vecinos no son pruebas independientes, y el periodo es menos seguro de lo que sugiere el número de puntos',
        'Las estrellas mayores tienen intervalos más anchos, y EK Draconis es mayor',
        'Para tener en cuenta la distancia de la estrella, de la que depende el periodo',
        'Para que el intervalo parezca más cauto de lo que justifican los datos',
      ],
      hints: [
        'Un ajuste que trata cada punto como independiente está demasiado seguro cuando los residuos van en tramos largos por encima y por debajo de la curva.',
      ],
      because:
        'El ajuste trata los puntos como independientes. Cuando los residuos están correlacionados (una mancha que crece, se apaga o se mueve deja tramos de datos por encima o por debajo de la curva ajustada), la información real es menor que el número de puntos, y el intervalo se ensancha por el factor que da la correlación de los residuos vecinos. El periodo no depende de la distancia, y el ensanchamiento no es discrecional: se calcula a partir de los residuos.',
      misconceptions: [
        {
          say: 'Un periodo es un tiempo, medido igual desde cualquier distancia.',
        },
        {
          say: 'El factor se calcula con los datos, no se elige, y la validación de la cobertura del intervalo lo probó con estrellas sintéticas de periodo conocido.',
        },
      ],
    },
    {
      title: 'Pliégalo dos veces',
      body: 'Plegar una curva de luz a un periodo es poner cada ciclo encima del anterior, por fase. El panel puede plegar AU Microscopii a su periodo de 4,86 días y al doble, 9,71 días. Prueba las dos.',
      prompt: '¿Qué muestra el pliegue de 9,71 días?',
      options: [
        'Las dos mitades quedan una sobre otra dentro del ruido, así que los datos no pueden descartar 9,71 días como periodo de rotación',
        'Las dos mitades difieren, así que 9,71 días es el periodo verdadero',
        'El pliegue está vacío, porque 9,71 días es más largo que los datos',
        'El pliegue tiene dos manchas, así que la estrella tiene dos manchas',
      ],
      hints: [
        'Si la estrella girara en 9,71 días con dos manchas parecidas en lados opuestos, las dos mitades del ciclo se verían iguales.',
      ],
      because:
        'Las dos mitades coinciden (la prueba del panel sobre si difieren da una probabilidad de 0,63 de ver una diferencia así de grande solo por el ruido), así que la luz muestra un patrón cada 4,86 días y no distingue una rotación de 4,86 días de una de 9,71 con dos manchas parecidas. Solo si las mitades difirieran, como con manchas distintas, quedaría demostrado el periodo más largo. El ciclo de 9,71 días cabe 2,8 veces en el sector de 27 días.',
      misconceptions: [
        {
          say: 'Si las mitades difirieran, el periodo más largo sería el que prefieren los datos. Aquí no difieren.',
        },
      ],
    },
    {
      title: 'Un alias que los datos no pueden probar',
      body: 'Vuelve a la estrella modelo con una mancha. Sus 16 días contienen cuatro vueltas de 4,00 días. El panel anota 8,00 días como otro periodo posible, y dice que no se puede probar.',
      prompt: '¿Por qué no pueden probar los datos 8,00 días?',
      options: [
        'Una prueba necesita que los datos contengan al menos dos ciclos del periodo probado, y 16 días contienen menos de dos ciclos de 8,00',
        'Porque 8,00 días no es múltiplo de 4,00',
        'Porque la estrella no gira tan despacio',
        'Porque el ruido es demasiado grande',
      ],
      hints: [
        'Para ver si las dos mitades de un ciclo de 8,00 días difieren, hacen falta dos de esos ciclos.',
      ],
      because:
        'Para decir si los mínimos pares e impares difieren hay que ver más de un ciclo del periodo más largo, y 16 días son un poco menos de dos ciclos de 8,00. El panel marca entonces el periodo más largo como no comprobable en vez de decir que está excluido o permitido. Un sector más largo, o la misma estrella observada otra vez, lo probaría.',
    },
    {
      title: 'El ecuador a partir de una mancha',
      body: 'La estrella modelo a 60&deg; con rotación diferencial 0,20 muestra un periodo de 4,71 días en su luz.',
      prompt: '¿Puedes saber su periodo ecuatorial solo con la curva de luz?',
      options: [
        'No: la luz da el periodo de la latitud de la mancha, y el del ecuador se sigue solo si se conocen la latitud y la rotación diferencial',
        'Sí: es el mismo que el periodo de la luz',
        'Sí: es la mitad del periodo de la luz',
        'No, porque una estrella con rotación diferencial no tiene periodo',
      ],
      hints: [
        'La regla del modelo es P(lat) = P(ecuador) / (1 − k sen² lat). ¿Cuáles de ellos se conocen por la luz?',
      ],
      because:
        'El periodo de la luz es el de las manchas, P(lat) = P(ecuador) / (1 − k sen² lat), y la luz sola no da ni la latitud ni k. Una estrella con varias manchas a varias latitudes muestra varios periodos y el pico del periodograma es el más fuerte. Es un límite declarado del modelo, y el periodo que da el panel es el de las manchas, no un periodo de rotación de toda la estrella.',
      misconceptions: [
        {
          say: 'Coinciden solo para k = 0, una estrella que gira como una rueda sólida.',
        },
      ],
    },
  ],
};

export const FLARES_ES = {
  title: 'Erupciones',
  subtitle:
    'Halla las erupciones en la luz de una enana roja, mide cuánta luz da cada una como duración equivalente y cuenta las erupciones por tamaño',
  objectives: [
    'Decir qué aspecto tiene una erupción en una curva de luz y qué parte es más rápida, la subida o la bajada',
    'Decir qué es una duración equivalente y leer una con su incertidumbre',
    'Contar las erupciones de una estrella real y decir con qué frecuencia ocurren',
    'Decir qué significa la pendiente de la distribución de erupciones por tamaño, y por qué depende de dónde empieza el ajuste',
  ],
  steps: [
    {
      title: 'Una erupción es un pico en la luz',
      body: 'Una <strong>erupción</strong> es una liberación repentina de energía magnética en la atmósfera de una estrella, el mismo tipo de suceso que una erupción solar. La estrella se aviva en minutos y se apaga en más tiempo. Las enanas rojas tienen erupciones a menudo, y una erupción puede sumar más de una décima de la luz de la estrella.\n\nEl panel muestra un día de la luz de AU Microscopii, una enana roja joven, del telescopio espacial TESS, con una lectura cada dos minutos. La línea azul es el nivel en calma de la estrella, los puntos son la luz, y cada anillo marca una erupción hallada por una regla: puntos al menos tres desviaciones típicas por encima del nivel en calma, tres o más seguidos.',
    },
    {
      title: '¿Más rápida la subida o la bajada?',
      body: 'Una erupción se aviva y luego se apaga hasta el nivel en calma de la estrella.',
      prompt: '¿Qué parte de una erupción es la más rápida?',
      options: [
        'La subida: unos minutos hacia arriba y una cola larga que se apaga despacio',
        'La bajada: la erupción se enciende despacio y acaba de golpe',
        'Las dos tardan lo mismo, así que una erupción es simétrica',
        'Depende de la estrella, y ninguna forma es típica',
      ],
      hints: [
        'Piensa en una hoguera: ¿cómo de deprisa se aviva comparado con lo que tarda en apagarse?',
      ],
      because:
        'La más rápida es la subida: la luz sube en minutos y luego baja en más tiempo, con una cola larga. Las erupciones de distinto tamaño comparten una forma común, una subida rápida y una bajada en dos partes, y por eso se puede ajustar una forma estándar para hallar el tamaño de una erupción.',
    },
    {
      title: 'Lee una erupción',
      body: 'El panel muestra de cerca la segunda mayor erupción de AU Microscopii. Lee su <strong>duración equivalente</strong> en segundos, su <strong>pico sobre el nivel en calma</strong> en por ciento y su <strong>anchura a la mitad del pico</strong> en minutos.',
      fields: [
        { label: 'Duración equivalente' },
        { label: 'Pico sobre el nivel en calma' },
        { label: 'Anchura a la mitad del pico' },
      ],
    },
    {
      title: 'Qué es una duración equivalente',
      body: 'La erupción que leíste tiene una duración equivalente de unos 118 segundos.',
      prompt: '¿Qué significa ese número?',
      options: [
        'El tiempo que tardaría la estrella, en su nivel en calma, en emitir la misma luz que sumó la erupción',
        'Cuánto duró la erupción',
        'El tiempo desde el comienzo de la erupción hasta su pico',
        'La energía de la erupción, en julios',
      ],
      hints: [
        'Es el área bajo la luz extra de la erupción, dividida por la luz en calma de la estrella, así que tiene unidades de tiempo.',
      ],
      because:
        'La duración equivalente es la integral de la luz extra de la erupción dividida por la luz en calma, así que es el tiempo que necesitaría la estrella en calma para emitir la misma luz. No es cuánto dura la erupción (unos 29 minutos a la mitad del pico aquí, más en la cola), y es un tiempo en la banda del telescopio, no una energía: convertirlo en una exige la luminosidad de la estrella y la temperatura de la erupción, y Gravitas no da ninguna de las dos.',
      misconceptions: [
        {
          say: 'La duración de la erupción es cuánto dura; la duración equivalente mide cuánta luz suma, escrita como un tiempo.',
        },
        {
          say: 'Sería una energía solo tras multiplicar por la luminosidad de la estrella en la banda y corregir a todas las longitudes de onda, lo que exige más de lo que da esta curva de luz.',
        },
      ],
    },
    {
      title: 'Cuenta las erupciones',
      body: 'El segundo panel cuenta las erupciones de AU Microscopii por tamaño. Lee el <strong>número de erupciones halladas</strong> y calcula cuántas hay <strong>al día</strong> de media.',
      fields: [
        { label: 'Erupciones halladas' },
        { label: 'Erupciones al día' },
      ],
    },
    {
      title: 'Un tiempo, no una energía',
      body: 'Todos los números de aquí son en la banda del telescopio, que cubre más o menos de 600 a 1000 nanómetros. La energía de una erupción exigiría la luminosidad de la estrella en esa banda y una corrección por el resto del espectro, que depende de cuán caliente sea la erupción. Gravitas comprobó una corrección de ese tipo y vio que depende demasiado de la temperatura que se suponga, así que no da energía de erupción: la medida es la duración equivalente.\n\nLos niveles más profundos ajustan cómo se distribuyen las erupciones por tamaño y preguntan qué puede y qué no puede decir el ajuste.',
    },
  ],
};

export const FLARES_DEEPER_ES = {
  steps: [
    {
      title: 'La pendiente',
      body: 'Por encima de un suelo, los recuentos de erupciones de al menos cada tamaño caen en una recta en estos ejes logarítmicos: una <strong>ley de potencias</strong> de pendiente α. El panel la ajusta por encima del tamaño que el telescopio halla por completo. Lee α, su intervalo del 95 por ciento y el número de erupciones por encima del suelo.',
      fields: [
        { label: 'Pendiente α' },
        { label: 'Extremo inferior del intervalo' },
        { label: 'Extremo superior del intervalo' },
        { label: 'Erupciones sobre el suelo' },
      ],
    },
    {
      title: 'Mueve el suelo',
      body: 'Pon <strong>Suelo del ajuste</strong> en <em>ninguno</em>. La pendiente baja de 1,92 a 1,27 y la recta ya no sigue los puntos.',
      prompt:
        '¿Por qué es más plano el ajuste cuando incluye las erupciones más pequeñas?',
      options: [
        'El telescopio pierde parte de las erupciones pequeñas, así que hay menos de ellas de las que tiene la ley de potencias, y los recuentos se curvan por debajo del suelo',
        'Las erupciones pequeñas siguen otra ley de la física',
        'Las erupciones más pequeñas son las más fiables, así que deben contar más',
        'El ajuste tiene más puntos, así que debe ser mejor',
      ],
      hints: [
        'Una erupción débil y breve puede esconderse en el ruido. ¿Qué hace eso al recuento de tamaños pequeños?',
      ],
      because:
        'Las erupciones débiles y breves se hallan solo en parte o no se hallan, así que los recuentos en tamaños pequeños caen por debajo de la ley de potencias y la recta ajustada se aplana. El límite de completitud es el tamaño por encima del cual la regla halla una erupción por completo en la prueba de inyección del panel, y ahí empieza el ajuste. Más puntos no son mejores puntos.',
    },
    {
      title: 'Un ajuste con una verdad conocida',
      body: 'Cambia la fuente a la estrella sintética. Sus erupciones se sortearon de una ley de potencias de pendiente 1,80, y se aplicaron la misma regla y el mismo ajuste a su curva de luz: el ajuste devuelve 1,74, con un intervalo del 95 por ciento de 1,55 a 1,96.',
      prompt: '¿Qué dice eso del ajuste?',
      options: [
        'El intervalo contiene la pendiente verdadera, 1,80, como debe hacer un intervalo del 95 por ciento unas diecinueve veces de cada veinte: el método funciona cuando se conoce la verdad',
        'El ajuste está mal, porque 1,74 no es 1,80',
        'El ajuste es exacto, porque los datos son sintéticos',
        'El intervalo es demasiado ancho para decir nada',
      ],
      hints: [
        'Un ajuste con un número finito de erupciones se desvía un poco. ¿Contiene el intervalo la verdad?',
      ],
      because:
        'El ajuste es una pendiente de máxima verosimilitud a partir de un número finito de erupciones, así que no es exactamente la pendiente verdadera; su intervalo del 95 por ciento debe contener la verdad unas diecinueve veces de cada veinte, y aquí lo hace. La validación del método lo ejecutó con muchas estrellas sintéticas. Una estrella muestra que puede funcionar, no con qué frecuencia.',
      misconceptions: [
        {
          say: 'Una pendiente de 48 erupciones no puede ser igual a la pendiente de la que se sorteó la población; el intervalo dice cuánto puede desviarse.',
        },
      ],
    },
    {
      title: 'Un suelo elegido tras mirar',
      body: 'Pon <strong>Suelo del ajuste</strong> en <em>mejor ajuste</em> para AU Microscopii: el suelo que hace que la recta siga mejor los puntos es 6,1 segundos, y el ajuste da 1,98 (1,71 a 2,29) con 44 erupciones.',
      prompt: '¿Es una medida mejor que 1,92 con el límite de completitud?',
      options: [
        'No: el suelo se eligió tras mirar los datos, lo que hace el intervalo demasiado estrecho, y los dos coinciden dentro de sus intervalos',
        'Sí: usa más erupciones, así que es más precisa',
        'Sí: el mejor ajuste es siempre la mejor medida',
        'No: 1,98 queda fuera del primer intervalo',
      ],
      hints: [
        'Un suelo elegido por lo bien que ajusta se elige con los mismos datos en que luego se usa.',
      ],
      because:
        'El límite de completitud sale de una prueba de inyección con otros datos y no depende de esta curva de luz; el suelo que mejor ajusta se elige a partir de ella. Una elección hecha mirando el resultado no se cuenta en el intervalo, que por eso subestima la incertidumbre. 1,98 queda dentro del primer intervalo (1,62 a 2,28), así que los dos no discrepan.',
      misconceptions: [{ say: '1,98 queda dentro de 1,62 a 2,28.' }],
    },
    {
      title: 'Cuántas erupciones para una pendiente',
      body: 'El intervalo del 95 por ciento de la pendiente con 29 erupciones va de 1,62 a 2,28, unos 0,67 de ancho.',
      prompt:
        '¿Cuántas erupciones por encima del suelo harían falta, más o menos, para reducir a la mitad el ancho del intervalo?',
      options: [
        'Unas cuatro veces más, 120 o así: el ancho cae como uno sobre la raíz cuadrada del número',
        'El doble, 58',
        'Unas 30 más',
        'Ningún número: el ancho no se puede reducir',
      ],
      hints: [
        'El error de una media cae como uno sobre la raíz cuadrada del número de valores.',
      ],
      because:
        'El error de una pendiente ajustada por máxima verosimilitud va como (α − 1) dividido por la raíz cuadrada del número de erupciones, así que reducirlo a la mitad exige cuatro veces las erupciones. Para AU Microscopii son unas cuatro veces 27 días de buenos datos, o unos cuantos sectores más.',
    },
  ],
};

const CONTENT = {
  'how-fast-does-the-star-spin': {
    topic:
      'How a spotted star’s light gives its rotation period: a spot dims the star once a turn, a periodogram finds the period of the dimming (4.00 days for the model star, 4.86 for AU Microscopii, 2.56 for EK Draconis) with an interval, two opposite spots make the light repeat at half the rotation period so the period found is one answer and twice it the other, a baseline of fewer than two cycles cannot test the longer one, and a star that turns unevenly shows the period of its spots’ latitude.',
    difficulty:
      'Introductory (the dimming repeats once a turn, the period read from a periodogram, a second period left open by two spots); majors (a second real star and the width of the interval, the fold at twice the period); advanced (an alias the baseline cannot test, the equatorial period behind a spot’s period)',
    placement:
      'In a survey course after the unit on the Sun (the investigation The Turning Sun gives the Sun’s own rotation from its spots) or the unit on stellar properties, and beside the periodogram investigations Why the Period Is Wrong and Variable Stars from Frames; in a majors course with time-series analysis. It supports OpenStax Astronomy 2e chapter 16 (the Sun). It needs no mathematics beyond a ratio at the survey depth.',
    overview:
      'Students predict how many dips a one-spot star shows in a turn, read the period (4.00 days) and the dimming (2.7 percent) from the periodogram, see that two opposite spots move the peak to 2.00 days and leave 4.00 days as a second period the light cannot exclude, read the period of AU Microscopii (4.86 days, with 9.71 days not excluded), and set a spot at 60 degrees with differential rotation 0.20 to see the period of the spot’s latitude (4.71 days) differ from the equator’s (4.00). At depth they read EK Draconis (2.555 days, 2.532 to 2.579), say what widens the interval, fold AU Microscopii at twice its period, see why an alias cannot be tested with fewer than two cycles, and say why a period from spots does not give the equator’s. A reading step says why no age is stated.',
    priorKnowledge: [
      'A light curve as brightness against time, and a period as the time for a pattern to repeat',
      'That sunspots are cooler and darker than the Sun’s surface, and that the Sun turns',
      'The idea of a rotation period and of a ratio, such as half or double a period',
    ],
    keyConcepts: [
      {
        heading: 'A spot dims the star once a turn',
        body: 'A dark spot reduces the light while it faces us and not while it is on the far side, so the light repeats with the star’s rotation. The period of the repeat is what a periodogram finds.',
      },
      {
        heading: 'The light can leave a second period open',
        body: 'Two like spots on opposite sides make the light repeat at half the rotation period. The period found is the period of the dimming; twice it can be the rotation period, and the light alone does not always exclude it. The panel reports it as not excluded or untestable.',
      },
      {
        heading: 'A period from spots is the spots’ period',
        body: 'A star that turns unevenly has a different period at each latitude, and the light shows the period of its spots, not the equator’s: P(lat) = P(equator) / (1 − k sin² lat).',
      },
    ],
    features: [
      {
        name: 'The activity panels (activity-spots and activity-period)',
        text: 'The synthetic spotted star with its spot latitude, size, brightness, the tilt of its axis, an optional second spot and a differential rotation, with the light curve, the periodogram and two folds; and two real TESS light curves (AU Microscopii, EK Draconis) with the period, its interval, the other periods it could be, the false-alarm probability and the published value.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: a second real star, the width of the interval, the fold at twice the period. Advanced: an alias the data cannot test and the equator behind a spot’s period.',
      },
      {
        name: 'Synthetic and real data, stated',
        text: 'The spotted star is a model with a seeded noise draw and its truth stated in the panel; the two real curves are TESS two-minute and 30-minute light curves of the pipeline’s PDCSAP flux, loaded as files when the panel opens.',
      },
    ],
    misconceptions: [
      {
        claim: 'The period of the peak is always the rotation period.',
        response:
          'It is the period of the dimming. Two like spots on opposite sides make the dimming repeat twice a turn, so the rotation period may be twice it; only something beyond the light curve can choose.',
      },
      {
        claim:
          'A star’s light curve gives one rotation period for the whole star.',
        response:
          'It gives the period of its spots. A star that turns faster at the equator than near the poles shows the period of the latitude its spots are at.',
      },
      {
        claim: 'A spin period gives a star’s age.',
        response:
          'A period and a color have been used to estimate the age of young stars, but the relations hold only for the stars and ages they were calibrated on and scatter widely. Gravitas states no age.',
      },
      {
        claim: 'If the periodogram has a strong peak, the period is certain.',
        response:
          'A strong peak says there is a repeating signal, not which of its multiples is the rotation period, and the interval states only how well the peak’s position is known.',
      },
    ],
    teachingNotes: [
      'The model star is made with P = 4.00 days, a spot of 15 degrees radius at 30 degrees latitude, an axis tilt of 70 degrees and noise of 0.04 percent; the periodogram returns 4.0005 days with an interval of 3.999 to 4.002.',
      'AU Microscopii (TESS sector 1, 27 days, the SPOC two-minute light curve, binned to 30 minutes for the fit) gives 4.856 days with an interval of 4.849 to 4.863 and the factor-two alias not excluded; the published value from all sectors is 4.85 ± 0.03. EK Draconis (sector 16, 30-minute bins) gives 2.555 days with an interval of 2.532 to 2.579.',
      'The method is checked against an independent routine and an ensemble for the coverage of the interval (STELLAR_ACTIVITY.md). Two legs of the committed contract fail and are recorded there: the periodogram’s sinusoid peak is biased relative to the harmonic fit (the panel uses the harmonic fit), and a double-dip curve of unequal spots returns the period of the larger rather than half of it.',
      'Gyrochronology ages were gated and the verdict is C (ACTIVITY_AGES_GATE.md): the coverage of the interval on a synthetic sample, scored with refused draws counted as misses, was 0.909 against a bar of 0.93; scored on answered draws only it would have been 0.959, which is a question for Carl and is not used. The reading step says no age is stated.',
    ],
    discussion: [
      'A star shows two equal dips per cycle in its light. What would you need to measure to decide whether it turns in the time between dips or twice that?',
      'The Sun at 60 degrees turns more slowly than at the equator. If you saw the Sun as a distant star with spots only at high latitudes, what period would you find, and how would you misjudge its rotation?',
      'Why might a period from one sector of 27 days be less sure for a star whose spots change quickly than for one whose spots last for months?',
    ],
    extensions: [
      'Turn on the second spot and change the first spot’s latitude; say whether the period found changes and why.',
      'Set the axis tilt to 20 degrees and say what happens to the dimming and to the period.',
    ],
    modelNotes:
      'js/kernels/activity/spots.js (the spot model), js/kernels/activity/rotation.js (the period, its interval and the alias test over js/kernels/variables/period.js), js/activityField.js, js/activityWidgets.js, STELLAR_ACTIVITY.md.',
  },
  flares: {
    topic:
      'How the flares of a red dwarf are found and counted: a flare is a fast rise and a slower fall, a rule finds the points above the star’s quiet level, the equivalent duration is the time the quiet star would need to give out the light the flare added (118 s for the second largest flare of AU Microscopii), 76 flares in 24.6 days of data are found (3.1 a day), and the counts by size fall on a power law of slope 1.92 (1.62 to 2.28) above the completeness limit, a slope that depends on where the fit starts.',
    difficulty:
      'Introductory (what a flare looks like, an equivalent duration, a count and a rate); majors (the power-law slope with its interval, the floor, a synthetic star with a known slope); advanced (a floor chosen after looking, how many flares a slope needs)',
    placement:
      'In a survey course after the unit on the Sun (solar flares) or on stellar activity and habitability around red dwarfs; in a majors course with statistics of power laws. It supports OpenStax Astronomy 2e chapter 16 (the Sun). It needs no mathematics beyond a ratio at the survey depth.',
    overview:
      'Students predict whether a flare rises or falls faster, read the second largest flare of AU Microscopii (equivalent duration 118 s, peak 3.5 percent, width at half peak 29 minutes), say what an equivalent duration is, and count the flares (76 in 24.6 days, 3.1 a day). At depth they read the power-law slope (1.92, 1.62 to 2.28, 29 flares), see why including the smallest flares flattens it, check a fit on a synthetic star whose slope is known (1.80, returned as 1.74 with 1.55 to 1.96), say why a floor chosen after looking is not a better measurement, and work out how many flares halve the interval. A reading step says why no flare energy is stated.',
    priorKnowledge: [
      'A light curve as brightness against time',
      'That solar flares are sudden releases of magnetic energy',
      'Reading a value off a logarithmic axis, where equal steps are equal factors',
    ],
    keyConcepts: [
      {
        heading: 'A flare is a fast rise and a slow fall',
        body: 'Flares share a shape, a rise in minutes and a two-part decay, which is why a standard shape can be fitted to find a flare’s size.',
      },
      {
        heading: 'The equivalent duration is a time',
        body: 'It is the integral of the flare’s extra light over the quiet light: the time the quiet star would take to give out the same light, in the telescope’s band. It is not an energy.',
      },
      {
        heading: 'Counts by size follow a power law above a floor',
        body: 'The number of flares at least a given size falls as a power law whose slope the panel fits by maximum likelihood with an exact interval; below the completeness limit flares are missed and the counts bend, so the slope depends on where the fit starts.',
      },
    ],
    features: [
      {
        name: 'The flare panels (activity-flares and activity-ffd)',
        text: 'A day of AU Microscopii (TESS sector 1, two-minute cadence) with each flare marked, one flare close up with its equivalent duration, uncertainty, peak, width and the fit to the standard shape; and the counts of flares by size on logarithmic axes with the power-law fit above the completeness limit, the best-fitting floor or every flare, for AU Microscopii or a synthetic star made with a known slope.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the slope with its interval, the floor, a fit with a known truth. Advanced: a floor chosen after looking and the number of flares a slope needs.',
      },
      {
        name: 'Real and synthetic data, stated',
        text: 'The AU Microscopii flares are found by the kernel’s rule on the real light curve; the synthetic star’s light curve is a spotted star with flares of the standard shape injected from a named random stream, the same rule and fit run on it.',
      },
    ],
    misconceptions: [
      {
        claim: 'The equivalent duration is how long a flare lasts.',
        response:
          'It is a measure of how much light the flare adds, written as a time: the time the quiet star would need to give out that light.',
      },
      {
        claim: 'The equivalent duration is the flare’s energy.',
        response:
          'It is in the telescope’s band. An energy needs the star’s luminosity in the band and a correction for the rest of the spectrum, which depends on the flare’s temperature; Gravitas states none.',
      },
      {
        claim: 'A best-fitting floor gives the best slope.',
        response:
          'A floor chosen by how well it fits uses the data it is then applied to, so the interval understates the uncertainty; the completeness limit comes from an injection test and does not depend on this light curve.',
      },
      {
        claim:
          'The more flares a star has, the more active it is, whatever the telescope.',
        response:
          'The count depends on the telescope’s noise, its cadence and the rule: faint and short flares are found only in part, so counts from different instruments are compared above a size they both find completely.',
      },
    ],
    teachingNotes: [
      'The rule is the form of Chang and colleagues’ three criteria (three standard deviations, two, three points in a row) after a detrend by a harmonic series at the rotation period and a 0.25-day running median; the equivalent duration is a fit of the standard flare shape of Davenport and colleagues with a free local baseline, and its uncertainty is from a parametric bootstrap, widened by the factor 1.35 the validation found.',
      'On AU Microscopii the kernel finds 76 flares against 69 for an independent routine, 86 percent and 93 percent of the two lists matching within two minutes, with a median difference in equivalent duration of 0.08; the slope above the completeness limit is 1.92 (1.62 to 2.28) from 29 flares. The published rate quoted in the contract is lower (1.86 a day), and the contract allows a factor of two either way because rules differ.',
      'The coverage of the equivalent duration’s uncertainty on injected flares is 0.937 and the completeness limit is from an injection-recovery table (STELLAR_ACTIVITY.md). The panel states no flare energy: the bolometric correction was gated and the verdict is C.',
      'Inherited limits: flares that overlap count as one, the threshold rule misses faint flares, and complex flares with several peaks are fitted by the standard shape anyway (the largest flare of AU Microscopii has a chi-square of 984 for 234 degrees of freedom, and the second largest, the one the investigation reads, has 27,026 for 418: a long tail the standard shape does not follow, with the panel showing the quiet level it was measured against below the tail; its equivalent duration is the fit’s, 118 seconds, against 132 seconds for the plain sum of the excess over its 4.2-hour window, a difference the quoted uncertainty of 4 seconds does not cover, which is the model’s limit and not the star’s).',
    ],
    discussion: [
      'A planet around a red dwarf receives flares of a given size a few times a day. What would you want to know about the flares before saying what they do to its atmosphere?',
      'Why does the number of flares found depend on the telescope and the rule, and how would you compare two stars observed by different telescopes?',
      'A student fits the slope above the floor that gives the smallest misfit. What is wrong with quoting the interval?',
    ],
    extensions: [
      'Open the five largest flares one by one and say which look like the standard shape and which do not.',
      'Compare the slope with the floor at the completeness limit, at the best-fitting floor and at every flare, and say which you would publish.',
    ],
    modelNotes:
      'js/kernels/activity/flares.js (the template, the rule, the equivalent duration and the slope), js/activityField.js, js/activityWidgets.js, STELLAR_ACTIVITY.md.',
  },
};

const FLOW = {
  'how-fast-does-the-star-spin': [
    {
      from: 'a-spot-turns-with-the-star',
      to: 'how-many-dips',
      text: 'A dark spot turning with a star, and the prediction of how many dips a turn shows before the panel is read.',
    },
    {
      from: 'read-the-period',
      to: 'two-spots',
      text: 'The period and dimming read from the periodogram, then a second spot and the second period the light leaves open.',
    },
    {
      from: 'a-real-star',
      to: 'a-real-star',
      text: 'A real star, AU Microscopii: its rotation period and the period it could also be.',
    },
    {
      from: 'the-sun-turns-unevenly',
      to: 'why-no-age',
      text: 'A star that turns unevenly shows its spots’ period; and what a period does not give, which is an age.',
    },
  ],
  flares: [
    {
      from: 'a-flare-is-a-spike',
      to: 'rise-or-fall',
      text: 'Flares marked in a day of a red dwarf’s light, and the prediction of which part of a flare is quicker.',
    },
    {
      from: 'read-a-flare',
      to: 'what-is-an-equivalent-duration',
      text: 'One flare read close up, and what its equivalent duration means.',
    },
    {
      from: 'count-the-flares',
      to: 'count-the-flares',
      text: 'The flares of the whole sector counted: how many, and how often.',
    },
    {
      from: 'a-time-not-an-energy',
      to: 'a-time-not-an-energy',
      text: 'Why the measure stays a time in the telescope’s band and no energy is stated.',
    },
  ],
};

const EXPECTATIONS = {
  'how-fast-does-the-star-spin': {
    'read-the-period':
      'The period found 4.00 days (within 0.05) and the dimming about 2.7 percent (within 0.3), with the panel’s default one-spot star.',
    'a-real-star':
      'The rotation period of AU Microscopii about 4.86 days (within 0.05) and the other period it could be about 9.71 days (within 0.1).',
    'the-sun-turns-unevenly':
      'At latitude 60 degrees with differential rotation 0.20: the equatorial period 4.00 days (within 0.05) and the period of the spot’s latitude about 4.71 days (within 0.05).',
  },
  flares: {
    'read-a-flare':
      'The second largest flare of AU Microscopii: an equivalent duration about 118 s (within 6), a peak about 3.5 percent (within 0.2) and a width at half peak about 29 minutes (within 3).',
    'count-the-flares':
      '76 flares (within 1) and about 3.1 a day (within 0.15) from the frequency panel on AU Microscopii.',
  },
};

const BANDS = {
  'how-fast-does-the-star-spin': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
  flares: { core: 'medium', quantitative: 'long', advanced: 'long' },
};

/** The guides, flows, expectations and time bands of the lessons above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};

/** The Spanish shadows by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = {
  'how-fast-does-the-star-spin': HOW_FAST_DOES_THE_STAR_SPIN_ES,
  flares: FLARES_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'how-fast-does-the-star-spin': HOW_FAST_DOES_THE_STAR_SPIN_DEEPER,
  flares: FLARES_DEEPER,
};
export const DEPTH_ES = {
  'how-fast-does-the-star-spin': HOW_FAST_DOES_THE_STAR_SPIN_DEEPER_ES,
  flares: FLARES_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [HOW_FAST_DOES_THE_STAR_SPIN, FLARES];
