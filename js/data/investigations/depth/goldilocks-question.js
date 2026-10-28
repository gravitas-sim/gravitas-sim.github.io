// =============================================================================
// The Goldilocks Question, deeper (Prompt 205 part B, HABITABLE_ZONE_II.md)
// -----------------------------------------------------------------------------
// The limits as amounts of starlight, the locking radius, and the zone at three
// ages. The same code the lesson's own panels read (js/habitability.js) and the
// kernel in js/kernels/habitablezone/ say every number here, and
// tests/habitableZoneLessons.test.js recomputes each one. Nothing here changes
// the grading of a core step. There is no escape bar (verdict B of Prompt 199)
// and no climate history: the last step says why.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const LIM = (values = {}, hide = []) => ({ id: 'hz-limits', values, hide });
const LOCK = (values = {}, hide = []) => ({ id: 'hz-locking', values, hide });
const AGE = (values = {}, hide = []) => ({ id: 'hz-ages', values, hide });

export default {
  id: 'goldilocks-question',
  steps: [
    // ---- The limits, as amounts of starlight ------------------------------
    {
      sid: 'the-limits-as-starlight',
      after: 'what-the-wider-band-bought',
      depth: 'quantitative',
      type: 'measure',
      title: 'The edges are amounts of starlight',
      body: `Every edge you have used was a distance. Behind each distance is an
             amount of starlight, in Earths, that a published climate fit says a
             planet of one Earth mass can cope with. The distance follows from the
             star&rsquo;s luminosity and the inverse-square law you wrote down at the
             start; the amount of starlight is the fit&rsquo;s own.
             \n\nThe panel shows the four limits for the Sun. Read the starlight at the
             <strong>runaway greenhouse</strong> limit (the inner edge of the
             conservative zone) and at the <strong>maximum greenhouse</strong> limit
             (the outer edge).`,
      fields: [
        {
          id: 'runaway',
          label: 'Starlight at the runaway-greenhouse limit',
          unit: 'Earths',
          hint: '1.04',
        },
        {
          id: 'maximum',
          label: 'Starlight at the maximum-greenhouse limit',
          unit: 'Earths',
          hint: '0.35',
        },
      ],
      validate: v => {
        if (![v.runaway, v.maximum].every(Number.isFinite)) return null;
        if (near(v.runaway, 1.0385, 0.005) && near(v.maximum, 0.3507, 0.003)) {
          return {
            level: 'ok',
            message:
              '1.04 Earths at the inner limit and 0.35 Earths at the outer. Earth, at one Earth of starlight, sits between them. These are numbers from a fit, and only the two that come from a climate model: the optimistic limits are what the history of Venus and Mars allows, and are not predictions at all.',
          };
        }
        return {
          level: 'error',
          message:
            'Read “Runaway greenhouse” and “Maximum greenhouse” in the panel for the Sun. Each row begins with the amount of starlight, in Earths.',
        };
      },
      tool: {
        ...LIM({
          star: 0,
          runawayGreenhouse: 1,
          maximumGreenhouse: 1,
          recentVenus: 1,
          earlyMars: 1,
        }),
        title: 'Four limits for the Sun',
        note: 'Each dot is a limit: how much starlight, and at what distance. The rows beneath give the amount of starlight first.',
      },
    },
    {
      sid: 'the-same-limit-a-dim-star',
      after: 'the-limits-as-starlight',
      depth: 'quantitative',
      type: 'measure',
      title: 'The same limit around a dim star',
      body: `Choose <strong>an M dwarf (3200 K)</strong>, a star with about 0.4 percent of the
             Sun&rsquo;s luminosity. Read the starlight at its runaway-greenhouse limit and
             the distance at which a planet receives it.
             \n\nThe amount of starlight changes only a little from star to star (the fit
             depends weakly on the star&rsquo;s temperature). The distance changes a great
             deal, because the luminosity does.`,
      fields: [
        {
          id: 'flux',
          label: 'Starlight at the runaway-greenhouse limit',
          unit: 'Earths',
          hint: '0.87',
        },
        {
          id: 'distance',
          label: 'Distance of that limit',
          unit: 'AU',
          hint: '0.068',
        },
      ],
      validate: v => {
        if (![v.flux, v.distance].every(Number.isFinite)) return null;
        if (near(v.flux, 0.8679, 0.005) && near(v.distance, 0.0679, 0.002)) {
          return {
            level: 'ok',
            message:
              '0.87 Earths at 0.068 AU, against 1.04 Earths at 0.98 AU for the Sun. The limit is almost the same amount of starlight and fourteen times closer in, because the star gives off a few hundred times less light. Check it with the inverse-square law: the square root of 0.004 divided by 0.868 is 0.068.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the M dwarf (3200 K) and read the “Runaway greenhouse” row: the amount of starlight first, then the distance.',
        };
      },
      tool: {
        ...LIM({ star: 3 }),
        title: 'The same limit, a dim star',
        note: 'The distance axis is rescaled to the star. The horizontal position of each dot is its distance; its height is the amount of starlight.',
      },
    },
    {
      sid: 'a-star-the-fit-refuses',
      after: 'the-same-limit-a-dim-star',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'A star the fit was not made for',
      body: `Now choose <strong>TRAPPIST-1</strong>. Its surface is at 2566 K, a little
             cooler than the coolest star the published fit was calibrated for, 2600 K.`,
      prompt:
        'What does the panel give for the habitable-zone limits of TRAPPIST-1?',
      options: [
        'The same limits as for the Sun, scaled by its luminosity',
        'Limits from the nearest calibrated temperature, 2600 K, marked as an estimate',
        'No limits: it says the star is outside the temperature range of the fit',
        'Limits of zero, because the star is so dim',
      ],
      answer: 2,
      because:
        'No limits. The fit is a polynomial in the star’s temperature, calibrated from 2600 K to 7200 K, and a polynomial run past its data does not fail gracefully. The panel declines instead of quoting a number it cannot stand behind. The ring the simulation draws for TRAPPIST-1 evaluates the fit at the nearest calibrated temperature and flags it as an extrapolation; that is a choice for a picture, and it is not the fit covering the star.',
      tool: {
        ...LIM({ star: 4 }),
        title: 'TRAPPIST-1, outside the fit',
        note: 'The panel names the temperature it was given and the range the fit covers.',
      },
    },
    // ---- The zone at three ages --------------------------------------------
    {
      sid: 'the-zone-at-three-ages',
      after: 'venus-by-the-rule-you',
      depth: 'advanced',
      type: 'measure',
      title: 'The zone at three ages',
      body: `A star does not keep its luminosity. The panel follows a model star of one
             solar mass along a published evolution track and draws its conservative zone
             against age. Read the <strong>inner edge</strong> at 1, 4.57 and 8 billion
             years; the buttons set each age.
             \n\nThe age counts from the start of the model track, and this is a
             <em>model</em> star: it is about 11 percent brighter than the Sun at the
             Sun&rsquo;s age.`,
      fields: [
        {
          id: 'inner1',
          label: 'Inner edge at 1 billion years',
          unit: 'AU',
          hint: '0.89',
        },
        {
          id: 'inner457',
          label: 'Inner edge at 4.57 billion years',
          unit: 'AU',
          hint: '1.03',
        },
        {
          id: 'inner8',
          label: 'Inner edge at 8 billion years',
          unit: 'AU',
          hint: '1.24',
        },
      ],
      validate: v => {
        if (![v.inner1, v.inner457, v.inner8].every(Number.isFinite))
          return null;
        if (
          near(v.inner1, 0.8946, 0.01) &&
          near(v.inner457, 1.0287, 0.01) &&
          near(v.inner8, 1.2393, 0.01)
        ) {
          return {
            level: 'ok',
            message:
              '0.89, 1.03 and 1.24 AU. The inner edge moves out by about a third between 1 and 8 billion years, because the star brightens and the zone is a band of starlight: a brighter star puts the same amount of light farther away. That is the zone’s position at three ages. It is not what any planet’s climate did.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the 1 Gyr, 4.57 Gyr and 8 Gyr buttons and read “Conservative zone” each time: the first number is the inner edge.',
        };
      },
      tool: {
        ...AGE({ age: 4.57 }),
        title: 'A model star and its zone',
        note: 'The violet line is the inner edge and the blue line the outer edge. The green dashed line is 1 AU.',
      },
    },
    {
      sid: 'earth-in-the-model-zone',
      after: 'the-zone-at-three-ages',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'Earth in the model star’s zone',
      body: `Set the age to <strong>4.57 billion years</strong>, the Sun&rsquo;s age. The panel
             says how much starlight a planet at 1 AU receives from this model star and where
             that falls against the zone.`,
      prompt:
        'What does the model star put Earth’s distance at, at the Sun’s age?',
      options: [
        'Inside the zone, as for the real Sun',
        'Closer in than the inner edge: it receives slightly more than the runaway limit',
        'Farther out than the outer edge',
        'The panel cannot say, because the star is a model',
      ],
      answer: 1,
      because:
        'Closer in than the inner edge. The model star is about 11 percent brighter than the real Sun at this age, so a planet at 1 AU receives 1.11 Earths of starlight, a little over the 1.05 of the runaway limit. The Sun really gives Earth 1.00. The reading belongs to the model star, which is one solar mass but not the Sun, and it shows how much a zone’s edge depends on the luminosity you feed it.',
      tool: {
        ...AGE({ age: 4.57 }),
        title: 'A planet at 1 AU, at the Sun’s age',
        note: 'The readout says how much starlight 1 AU receives and where that falls against the conservative zone.',
      },
    },
    {
      sid: 'why-no-climate-history',
      after: 'earth-in-the-model-zone',
      depth: 'advanced',
      type: 'read',
      title: 'Why this is not a climate history',
      body: `Three positions of a band along a model star&rsquo;s track make an
             attractive picture: the zone sweeps outward, Earth falls behind it, and the
             story seems to write itself. This investigation stops there on purpose.
             \n\nWhat you have is where a band of starlight lies at three ages. A
             planet&rsquo;s climate depends on much that this does not hold: how much of
             the light clouds reflect, how the atmosphere&rsquo;s composition changed, what
             the volcanoes and the oceans did, whether the planet kept its water. None of
             that is in the two published limits, and no evolving-climate model checked
             against a published code is part of this application. Until one is, the
             honest statement is the narrow one: <strong>the zone moves outward as the star
             brightens, and a planet that was inside it may no longer be.</strong>
             \n\nNothing here says when Earth leaves the zone, or that it does.`,
      tip: 'A trajectory is a claim about one planet’s history. The zone at an age is a claim about a band of starlight. The two are easy to confuse, and the first needs far more than the second.',
    },
    // ---- The locking radius ------------------------------------------------
    {
      sid: 'the-m-dwarf-zone-and-the-tide',
      after: 'all-seven-planets',
      depth: 'quantitative',
      type: 'measure',
      title: 'Which zones the star’s tide reaches',
      body: `A star&rsquo;s tide slows the spin of a planet near it, faster the closer it is,
             until the planet keeps one face to the star. The panel works out the
             <strong>locking radius</strong>: the distance inside which that happens within
             the star&rsquo;s age, for an Earth-like planet. It compares it with the zone of
             a model star.
             \n\nChoose <strong>0.2 solar masses</strong> at <strong>5 billion years</strong>
             with Q = 100. Read the locking radius and the inner edge of the zone.`,
      fields: [
        {
          id: 'radius',
          label: 'Locking radius',
          unit: 'AU',
          hint: '0.28',
        },
        {
          id: 'inner',
          label: 'Inner edge of the conservative zone',
          unit: 'AU',
          hint: '0.074',
        },
      ],
      validate: v => {
        if (![v.radius, v.inner].every(Number.isFinite)) return null;
        if (near(v.radius, 0.2819, 0.01) && near(v.inner, 0.0743, 0.003)) {
          return {
            level: 'ok',
            message:
              '0.28 AU for the radius and 0.074 AU for the inner edge: the whole zone, which ends at 0.14 AU, is well inside the locking radius. In this model a planet in the zone of a 0.2 solar-mass star would be despun within the star’s age. That is why such planets are expected to keep one face to their star, not a measurement that any of them does.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose 0.2 solar masses, set the age to 5 Gyr and Q = 100, and read “Locking radius” and the first number of “Conservative zone”.',
        };
      },
      tool: {
        ...LOCK({ star: 0, age: 5, q: 2 }),
        title: 'A dim star and its tide',
        note: 'The orange line is the locking radius, with its range dashed. The violet and blue lines are the zone’s edges.',
      },
    },
    {
      sid: 'a-middling-star',
      after: 'the-m-dwarf-zone-and-the-tide',
      depth: 'quantitative',
      type: 'measure',
      title: 'A star in the middle',
      body: `Now <strong>0.5 solar masses</strong>, at the same 5 billion years and
             Q = 100. Read the locking radius and the outer edge of the zone.`,
      fields: [
        {
          id: 'radius',
          label: 'Locking radius',
          unit: 'AU',
          hint: '0.38',
        },
        {
          id: 'outer',
          label: 'Outer edge of the conservative zone',
          unit: 'AU',
          hint: '0.40',
        },
      ],
      validate: v => {
        if (![v.radius, v.outer].every(Number.isFinite)) return null;
        if (near(v.radius, 0.3826, 0.01) && near(v.outer, 0.4017, 0.01)) {
          return {
            level: 'ok',
            message:
              '0.38 AU for the radius and 0.40 AU for the outer edge: the locking radius falls inside the zone. The inner part of the zone is despun within the age and the outer part is not, so this star has a zone with both kinds of planet. A star of one solar mass has its whole zone outside the radius: choose it and see.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose 0.5 solar masses, set the age to 5 Gyr and Q = 100, and read “Locking radius” and the second number of “Conservative zone”.',
        };
      },
      tool: {
        ...LOCK({ star: 1, age: 5, q: 2 }),
        title: 'A star in the middle',
        note: 'The locking radius runs through the zone.',
      },
    },
    {
      sid: 'how-sure-is-the-radius',
      after: 'a-middling-star',
      depth: 'advanced',
      type: 'measure',
      title: 'How sure is that radius?',
      body: `The radius depends on the planet&rsquo;s tidal quality factor Q, which nobody
             knows for a particular planet to better than a factor of ten. The panel gives
             the radius as a range: the dashed lines show it for Q ten times larger and ten
             times smaller than the one you set.
             \n\nStay with <strong>0.5 solar masses</strong>, 5 billion years and Q = 100. Read
             the range of the locking radius, from its low end to its high end.`,
      fields: [
        {
          id: 'low',
          label: 'Locking radius if Q is ten times larger',
          unit: 'AU',
          hint: '0.26',
        },
        {
          id: 'high',
          label: 'Locking radius if Q is ten times smaller',
          unit: 'AU',
          hint: '0.56',
        },
      ],
      validate: v => {
        if (![v.low, v.high].every(Number.isFinite)) return null;
        if (near(v.low, 0.2607, 0.01) && near(v.high, 0.5616, 0.015)) {
          return {
            level: 'ok',
            message:
              '0.26 to 0.56 AU, a factor of 2.2 across (the radius goes as the sixth root of Q, so a factor of ten in Q is a factor of 1.47 each way). At the high end the whole zone, which reaches 0.40 AU, is inside the radius; at the low end the radius still cuts through the zone. The honest statement is a range, and for this star it changes the answer: the model cannot tell you whether the outer part of the zone is despun.',
          };
        }
        return {
          level: 'error',
          message:
            'Keep 0.5 solar masses, 5 Gyr and Q = 100, and read the two dashed ends of the range in “Locking radius”.',
        };
      },
      tool: {
        ...LOCK({ star: 1, age: 5, q: 2 }),
        title: 'The radius, with its range',
        note: 'The dashed orange lines are the radius for Q ten times larger and ten times smaller.',
      },
    },
  ],
};
