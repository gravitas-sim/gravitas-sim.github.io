// =============================================================================
// The Clock That Drifts (Prompt 226)
// -----------------------------------------------------------------------------
// One investigation at three depths, in one module that also carries its Spanish words, its deeper
// steps and its instructor content: this is the one closure file the prompt adds (D-R10-226-05),
// because the shared sequence files sit at their line ceilings. The per-lesson path every loader
// builds from an id is a one-line re-export of a named export here, and the instructor modules read
// INSTRUCTOR. No imports: every number a step states is recomputed in tests/ttvLessons.test.js from
// the instruments (js/ttvWidgets.js over js/ttvField.js and the kernel js/kernels/ttv/). Every step
// carries a `sid`, an opaque stable id that student progress is keyed by.
//
// The data are SYNTHETIC: two planets on a star, integrated by the engine, each transit a seeded
// noisy window of light curve measured by the kernel's template fit. No star was observed
// (D-RIGHTS-03; Part A's leg E1, a published Kepler system's times, was not run). A mass from an
// amplitude is offered only under a stated circular assumption (the gate's verdict B).
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [{ role: 'sun', name: 'The star', teffK: 5772, lumSun: 1 }],
};
/** The transit panel: noise 0 is 100 ppm, 1 is 400, 2 is 1600; view 0 the light curve, 1 the chi-square. */
const TRANSIT = (values = {}) => ({
  id: 'ttv-transit',
  values: { system: 0, planet: 0, transit: 40, noise: 0, view: 0, ...values },
});
/** The timing panel: system 0 near 2:1, 1 near 3:2, 2 far; planet 0 inner; span the percent of the record; view 1 the mass. */
const TIMING = (values = {}) => ({
  id: 'ttv-timing',
  values: { system: 0, planet: 0, span: 100, view: 0, zfree: 0.01, ...values },
});

export const THE_CLOCK_THAT_DRIFTS = {
  id: 'the-clock-that-drifts',
  thumbnail: 'images/investigations/the-clock-that-drifts.webp',
  title: 'The Clock That Drifts',
  subtitle:
    'Measure when a planet transits, plot how far each transit is from a steady clock, and read the slow wave a second planet writes',
  duration: '14-30 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 20, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['transit-photometry', 'when-orbits-lock'],
  tags: ['exoplanets', 'orbits', 'resonance'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Measure the time of a transit with an error bar, and say when the error bar can be read as one',
    'Plot the O-C diagram of a planet and say what a flat one and a wave mean',
    'Read the super-period and the amplitude of a wave, and say what sets the period (the pair) and why a record can be too short for one',
    'Say what an amplitude does and does not give: a mass only if the orbits are assumed circular',
  ],
  steps: [
    {
      sid: 'a-clock-that-ticks',
      stage: STAGE,
      type: 'read',
      title: 'A clock that ticks',
      body: `A planet that crosses its star every ten days is a clock: transit number n happens at a time
             T0 plus n times the period. To use it you need the time of each transit, and the time of a transit
             is not something you read off a dial. It is measured: you have the star’s light for a few hours around
             the dip, with noise on every point, and you slide a template of the dip along the time axis until it
             fits best. The panel does that for one transit of a planet in a made-up system, and says how
             sure it is. The systems here are synthetic, made by the engine with the noise added, so that the
             true time is known and the measurement can be checked.`,
      tool: TRANSIT(),
    },
    {
      sid: 'one-transit-time',
      stage: STAGE,
      type: 'measure',
      title: 'One transit time',
      body: `The panel shows transit number 40 of the inner planet, with a low noise (100 parts per million per
             point). Read the <strong>mid-time from the prediction</strong> in minutes, and the
             <strong>error bar</strong> (one sigma) in minutes.`,
      fields: [
        {
          id: 'a',
          label: 'Mid-time from the prediction',
          unit: 'minutes',
          hint: '1.53',
        },
        {
          id: 'b',
          label: 'Error bar (one sigma)',
          unit: 'minutes',
          hint: '0.52',
        },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 1.53, 0.15) && near(v.b, 0.52, 0.06)) {
          return {
            level: 'ok',
            message:
              'The transit came 1.5 minutes after the prediction, give or take half a minute. The panel also says the engine’s true time was 0.07 minutes from the fitted one: the measurement is right to well within its error bar.',
          };
        }
        return {
          level: 'error',
          message:
            'Leave transit 40, the inner planet and the low noise: the time is about 1.5 minutes from the prediction, with an error bar of about 0.5 minutes.',
        };
      },
      tool: TRANSIT(),
    },
    {
      sid: 'a-bigger-error-bar',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A bigger error bar',
      body: `Set <strong>noise per point</strong> to Typical, four times higher. The same transit, measured again
             from noisier light. Read the error bar and the line below it, which says whether the error bar can be
             read as one.`,
      prompt: 'What happens to the error bar of the time?',
      options: [
        'It grows about fourfold: noise four times larger on every point leaves the time four times less certain',
        'It stays the same: the planet crossed at the same time',
        'It grows by about 40 percent, the square root of two',
        'It shrinks, because more noise means more points near the dip',
      ],
      answer: 0,
      hints: [
        'The time is fixed by how the light changes at the edges of the dip. What does noise on those points do to where the edge seems to be?',
      ],
      because:
        'The error bar goes from 0.52 to 2.1 minutes, four times larger, because the time is read from the slope at the two edges of the dip and four times the noise blurs where the edge is by four times. And at this noise the panel adds that the error bar is as long as the two-minute spacing of the points, and in that regime the real scatter is larger than the error bar says: it is a lower bound, not an interval. The check that found this is in the validation table.',
      misconceptions: [
        {
          id: 'same',
          option: 1,
          say: 'The planet did cross at the same true time. What changed is how well the light lets you say when.',
        },
      ],
      tool: TRANSIT({ noise: 1 }),
    },
    {
      sid: 'a-steady-clock',
      stage: STAGE,
      type: 'read',
      title: 'A steady clock',
      body: `Now the whole record. For each transit the panel takes the measured time and subtracts the time a
             perfectly steady clock would give, the straight line fitted to all of them. What is left is
             <strong>O minus C</strong>, observed minus calculated, in minutes, with its error bar. This is a pair of
             planets far from each other in period (ten and twenty-seven days), the inner one measured over about a
             hundred transits. The points scatter by about half a minute, which is what the error bars say they
             should, and the panel reports that there is no signal above the noise: this planet is on a steady clock.`,
      tool: TIMING({ system: 2 }),
    },
    {
      sid: 'a-wave',
      stage: STAGE,
      type: 'predict',
      reveal: 'read-the-wave',
      title: 'A second planet pulls',
      body: `Now a pair that is close to a resonance: the outer planet takes about twice as long as the inner one,
             twenty and a half days to ten. Each time they pass, the outer planet tugs the inner one a little
             forward or backward along its orbit, and the transits come a little early or late. The pair is not
             exactly at two to one, so the geometry of the tug drifts.`,
      prompt: 'The O-C diagram of the inner planet will…',
      options: [
        'stay flat: a planet’s clock does not care about its neighbors',
        'rise in a straight line: the planet’s period is a little different from the one assumed',
        'swing slowly up and down in a regular wave, much longer than either planet’s period',
        'jump around at random by a few minutes',
      ],
      answer: 2,
      hints: [
        'A straight line is already taken out: the clock the times are compared with is the best straight line. What kind of change could it not absorb?',
      ],
      because:
        'A slow wave. A steady change of period is a straight line in the times and the straight-line clock absorbs it; what it cannot absorb is a push that grows and fades as the geometry of the pair comes round, and that is a wave whose length is the time for the pair to return to the same arrangement.',
      tool: TIMING({ system: 0 }),
    },
    {
      sid: 'read-the-wave',
      stage: STAGE,
      type: 'measure',
      title: 'Read the wave',
      body: `The panel shows the inner planet of the near two-to-one pair. Read the
             <strong>super-period</strong>, the length of the wave in days, and its
             <strong>amplitude</strong>, half the swing from top to bottom, in minutes.`,
      fields: [
        { id: 'a', label: 'Super-period', unit: 'days', hint: '345' },
        { id: 'b', label: 'Amplitude', unit: 'minutes', hint: '4.7' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 345.2, 3) && near(v.b, 4.73, 0.3)) {
          return {
            level: 'ok',
            message:
              'A wave about 345 days long with an amplitude near 4.7 minutes: the transits of a planet that goes round in ten days arrive up to five minutes early or late, over a cycle of about three hundred and forty-five days, thirty-odd of its own orbits. Neither planet has that period; the pair does.',
          };
        }
        return {
          level: 'error',
          message:
            'Leave the system on the near two-to-one pair, the inner planet and the whole record: the wave is about 345 days long and 4.7 minutes in amplitude.',
        };
      },
      tool: TIMING({ system: 0 }),
    },
    {
      sid: 'the-pair-sets-it',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'The pair sets it',
      body: `Set the system to <strong>Far from resonance</strong>: ten and twenty-seven days, with the same
             masses and the same noise. Read the verdict.`,
      prompt: 'What does the panel say, and why?',
      options: [
        'No TTV signal above noise: the planets are not near a resonance, the pushes average out quickly, and what is left is far below the noise',
        'The same wave, only longer: any two planets make one',
        'No signal, because this planet has no neighbor',
        'It cannot say: the record is too short',
      ],
      answer: 0,
      hints: [
        'The slow wave comes from the pair drifting slowly through the same arrangement. Is there a slow drift of that kind for these two periods?',
      ],
      because:
        'No signal above noise. For periods that are not near a simple ratio the arrangement of the two planets changes quickly and the tugs cancel from one orbit to the next, so the transit times stay within a fraction of a minute of the straight line, below the half-minute noise. The neighbor is there: it just does not write a wave. And the panel declines to quote the relation at all for a pair this far from a first-order resonance.',
      misconceptions: [
        {
          id: 'any-two',
          option: 1,
          say: 'Two planets always pull on each other, but the pull makes a slow wave only when the periods are close to a simple ratio. Away from one the effect is too small and too fast to see.',
        },
      ],
      tool: TIMING({ system: 2 }),
    },
    {
      sid: 'what-the-wave-says',
      stage: STAGE,
      type: 'read',
      title: 'What the wave says',
      body: `A planet’s transit times are a clock, and the clock is measured: each time has an error bar, and the
             bar can be read as one only when it is well under the spacing of the points. The O-C diagram is
             those times minus the best straight-line clock. Flat means the planet keeps its time; a slow wave
             means something is tugging on it, and the wave’s length is the super-period of the pair, which neither
             planet has by itself. In this investigation the systems are made by the engine with noise added, and
             nothing here is an observed star.`,
      tool: TIMING(),
    },
  ],
};

/** The deeper steps: quantitative (majors) and advanced (upper-level), after the core steps they hang on. */
export const THE_CLOCK_THAT_DRIFTS_DEEPER = {
  id: 'the-clock-that-drifts',
  steps: [
    {
      sid: 'the-beat',
      after: 'read-the-wave',
      depth: 'quantitative',
      type: 'measure',
      title: 'The beat of two clocks',
      body: `The super-period is not a fit parameter, it is arithmetic on the two planets’ periods. The pair
             returns to the same arrangement every <strong>1 / |2 / P<sub>outer</sub> &minus; 1 / P<sub>inner</sub>|</strong>
             days (the two to one resonance has j = 2). Read the inner planet’s clock from the panel, then switch to
             the outer planet and read its clock, and compute the super-period.`,
      fields: [
        { id: 'a', label: 'Inner period', unit: 'days', hint: '10.0003' },
        { id: 'b', label: 'Outer period', unit: 'days', hint: '20.5955' },
        { id: 'c', label: 'Super-period', unit: 'days', hint: '346.2' },
      ],
      validate: v => {
        if (![v.a, v.b, v.c].every(Number.isFinite)) return null;
        if (
          near(v.a, 10.0003, 0.002) &&
          near(v.b, 20.5955, 0.005) &&
          near(v.c, 346.2, 3)
        ) {
          return {
            level: 'ok',
            message:
              'One over the difference of 2 over 20.5955 and 1 over 10.0003 is 346 days, and the wave the panel fitted is 345: the relation of Lithwick, Xie and Wu (2012) gives the length of the wave from the two periods alone.',
          };
        }
        return {
          level: 'error',
          message:
            'The periods are about 10.0003 and 20.5955 days (the panel’s clock row for each planet); then 1 / |2 / 20.5955 − 1 / 10.0003| is about 346 days.',
        };
      },
      tool: TIMING({ system: 0 }),
    },
    {
      sid: 'a-different-pair',
      after: 'the-pair-sets-it',
      depth: 'quantitative',
      type: 'measure',
      title: 'A different pair',
      body: `Switch to the pair near three to two (ten and fifteen and a half days, j = 3), inner planet. Read
             the super-period the fit finds, and the one the relation gives from the two periods.`,
      fields: [
        { id: 'a', label: 'Fitted super-period', unit: 'days', hint: '173.7' },
        { id: 'b', label: 'From the periods', unit: 'days', hint: '173.8' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 173.7, 3) && near(v.b, 173.8, 1)) {
          return {
            level: 'ok',
            message:
              'About 174 days both ways, half the first pair’s because three to two is a closer-spaced ratio at the same distance from resonance: the wave’s length depends on which resonance the pair is near.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the near three to two system and the inner planet: the fit and the relation both give about 174 days.',
        };
      },
      tool: TIMING({ system: 1 }),
    },
    {
      sid: 'which-swings-more',
      after: 'a-different-pair',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Which one swings more',
      body: `On the near two-to-one pair the inner planet’s wave has an amplitude of about 4.7 minutes. Switch to
             the outer planet: its wave is about 1.6 minutes. The inner planet has 10 Earth masses and the outer 15.`,
      prompt: 'Why does the lighter planet swing more?',
      options: [
        'A planet’s swing is driven mostly by the other planet’s mass, here the heavier one, with a coefficient that is larger for the inner planet',
        'Because the inner planet is the heavier one',
        'Because it transits more often, so it has more points on its wave',
        'Because of the noise: the outer planet has fewer transits',
      ],
      answer: 0,
      hints: [
        'The tug that shifts a planet’s transits is the pull of the other planet. Which planet pulls harder, the 10 or the 15 Earth-mass one?',
      ],
      because:
        'The amplitude of one planet’s swing is proportional to the other planet’s mass, and to its own period, with a coefficient that depends on the resonance and is larger for the inner planet here (about 1.1 against 0.4). So the 10 Earth-mass inner planet, tugged by the 15 Earth-mass outer one, swings about three times as much as the outer planet does.',
      misconceptions: [
        {
          id: 'own-mass',
          option: 1,
          say: 'The inner planet is the lighter one. A planet’s own mass does not move its own transits much; it moves its neighbor’s.',
        },
      ],
      tool: TIMING({ system: 0, planet: 1 }),
    },
    {
      sid: 'too-short-a-record',
      after: 'which-swings-more',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Too short a record',
      body: `Go back to the inner planet of the near two-to-one pair and set <strong>part of the record</strong>
             to 40 percent: the first 44 transits, 430 days. The wave is 345 days long.`,
      prompt: 'What does the panel say, and why?',
      options: [
        'There is a signal, but no super-period: the record covers 1.2 cycles, and a period needs at least one and a half, because a straight line can absorb a short piece of a long swing',
        'The same super-period, only with a bigger error bar',
        'No signal: there are too few transits',
        'A super-period of 430 days, the length of the record',
      ],
      answer: 0,
      hints: [
        'The straight-line clock is fitted to the same transits. What can a straight line do to a stretch of a wave shorter than one and a half cycles?',
      ],
      because:
        'The panel reports a signal (the wave is there) but declines to give a period: 430 days is 1.2 cycles of a 345-day wave, and the straight line fitted to the record soaks up part of a swing that short, so the period that comes out of the fit would be arbitrary. It needs about 520 days. This is the check that tells a long period from a short record.',
      misconceptions: [
        {
          id: 'same-period',
          option: 1,
          say: 'With a short record the fit can return nearly any period, and an error bar would hide that. The panel declines to give one.',
        },
      ],
      tool: TIMING({ system: 0, span: 40 }),
    },
    {
      sid: 'a-mass-if-circular',
      after: 'too-short-a-record',
      depth: 'advanced',
      type: 'measure',
      title: 'A mass, if the orbits are circular',
      body: `Show <strong>what the amplitude says about the mass</strong>, for the inner planet of the near
             two-to-one pair. The amplitude of its wave is proportional to the <strong>outer</strong> planet’s mass, so the panel turns the measured amplitude into that mass,
             <strong>if both orbits are circular</strong>, for a star of one solar mass, with an interval that
             holds the measurement and the accuracy of the relation. Read the mass and the ends of the interval.`,
      fields: [
        {
          id: 'a',
          label: 'Mass of the outer planet',
          unit: 'M⊕',
          hint: '14.4',
        },
        { id: 'b', label: 'Low end', unit: 'M⊕', hint: '12.1' },
        { id: 'c', label: 'High end', unit: 'M⊕', hint: '17.4' },
      ],
      validate: v => {
        if (![v.a, v.b, v.c].every(Number.isFinite)) return null;
        if (
          near(v.a, 14.4, 0.5) &&
          near(v.b, 12.1, 0.5) &&
          near(v.c, 17.4, 0.6)
        ) {
          return {
            level: 'ok',
            message:
              'About 14 Earth masses, from 12 to 17. The panel also shows the engine’s own value, 15.0: the circular reading is inside its interval, four percent low, because in this system the free eccentricity happens to be small.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose the inner planet of the near two-to-one pair and the mass view: about 14.4 Earth masses, from 12.1 to 17.4.',
        };
      },
      tool: TIMING({ system: 0, view: 1 }),
    },
    {
      sid: 'what-an-eccentricity-does',
      after: 'a-mass-if-circular',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'What an eccentricity does',
      body: `The mass above assumed circular orbits. The amplitude also depends on the planets’ eccentricities, through
             a combination the panel calls |Z|, which the amplitude cannot give. The control is set to 0.010. The
             panel’s two curves show, for the <em>same masses</em>, the largest and smallest amplitude any direction of
             that eccentricity could give; read how far they are from the circular value.`,
      prompt:
        'What does that do to a mass read from the amplitude as if circular?',
      options: [
        'Nothing: the amplitude depends only on the masses',
        'It could be wrong by tens of percent either way, about 45 percent in this system, and the amplitude alone cannot say which',
        'It would always read too high, since eccentric planets pull harder',
        'It makes no difference unless the eccentricity is above 0.1',
      ],
      answer: 1,
      hints: [
        'The curves are for fixed masses. If the amplitude moves along them, what does a reader who assumed a circular orbit do with the number?',
      ],
      because:
        'For these masses an eccentricity combination of 0.010 could make the amplitude anywhere from 55 to 145 percent of the circular one, so a reader who assumed circular orbits would be off by tens of percent in either direction and the amplitude has no way to say which. A gate tested whether an interval that allows for an assumed bound on the eccentricity is useful: it covered, but its edges were about four times apart, wider than the bound committed beforehand, so Gravitas gives the circular mass and states the assumption, and does not give the interval as a bound.',
      misconceptions: [
        {
          id: 'only-mass',
          option: 0,
          say: 'To first order the amplitude is proportional to the mass, but it also has a term with the eccentricity in it, and that is what the two curves show.',
        },
      ],
      tool: TIMING({ system: 0, view: 1, zfree: 0.01 }),
    },
    {
      sid: 'the-other-planet',
      after: 'what-an-eccentricity-does',
      depth: 'advanced',
      type: 'question',
      kind: 'choice',
      title: 'The other planet',
      body: `Switch to the <strong>outer</strong> planet, whose wave gives the <em>inner</em> planet’s mass, with the
             same |Z| of 0.010. The spread is now from about &minus;73 to +127 percent.`,
      prompt: 'Why is the same eccentricity so much worse here?',
      options: [
        'The outer planet’s wave has a smaller circular coefficient (about 0.4 against 1.1), so the same eccentricity term is a larger share of it',
        'Because the outer planet is heavier',
        'Because the outer planet has fewer transits',
        'It is not worse: the panel is showing a different quantity',
      ],
      answer: 0,
      hints: [
        'The amplitude is a circular part plus an eccentricity part. If the circular part is smaller, what happens to the share of the eccentricity part?',
      ],
      because:
        'The circular part of the outer planet’s wave carries a coefficient of about 0.4 and the eccentricity part is the same, so the eccentricity part is nearly three times as large a share of it. For this planet the amplitude could even be near zero or more than double the circular one, and a mass from it would be next to useless without knowing the eccentricity.',
      misconceptions: [
        {
          id: 'heavier',
          option: 1,
          say: 'The coefficient that multiplies the circular part depends on the resonance and which planet, not on how heavy the planet is.',
        },
      ],
      tool: TIMING({ system: 0, planet: 1, view: 1, zfree: 0.01 }),
    },
    {
      sid: 'what-an-amplitude-cannot-say',
      after: 'the-other-planet',
      depth: 'advanced',
      type: 'read',
      title: 'What an amplitude cannot say',
      body: `An amplitude gives a mass only together with an assumption about the eccentricity. Under the assumption
             that the orbits are circular the panel gives the mass with its interval and says so; it does not give
             an interval that allows for the unknown eccentricity as a bound, and it does not give the eccentricity.
             Both planets’ waves together carry more (their phases too), and that is what published analyses use. The
             systems here are synthetic, two planets in one plane, outside the width of the resonance.`,
      tool: TIMING({ system: 0, view: 1 }),
    },
  ],
};

// ---- Spanish ------------------------------------------------------------------------------

export const THE_CLOCK_THAT_DRIFTS_ES = {
  title: 'El reloj que se desajusta',
  subtitle:
    'Mide cuándo transita un planeta, dibuja a qué distancia cae cada tránsito de un reloj constante y lee la onda lenta que escribe un segundo planeta',
  objectives: [
    'Medir el instante de un tránsito con su barra de error y decir cuándo la barra puede leerse como tal',
    'Dibujar el diagrama O-C de un planeta y decir qué significan uno plano y una onda',
    'Leer el superperiodo y la amplitud de una onda, y decir qué fija el periodo (el par) y por qué un registro puede ser demasiado corto para uno',
    'Decir qué da y qué no da una amplitud: una masa solo si se suponen órbitas circulares',
  ],
  steps: [
    {
      title: 'Un reloj que marca el tiempo',
      body: 'Un planeta que cruza su estrella cada diez días es un reloj: el tránsito número n ocurre en un instante T0 más n veces el periodo. Para usarlo hace falta el instante de cada tránsito, y ese instante no se lee en una esfera. Se mide: se tiene la luz de la estrella durante unas horas alrededor del descenso, con ruido en cada punto, y se desliza una plantilla del descenso a lo largo del eje del tiempo hasta que ajusta lo mejor posible. El panel lo hace con un tránsito de un planeta de un sistema inventado y dice con qué seguridad. Los sistemas son sintéticos, hechos por el motor con el ruido añadido, de modo que el instante verdadero se conoce y la medida puede comprobarse.',
    },
    {
      title: 'El instante de un tránsito',
      body: 'El panel muestra el tránsito número 40 del planeta interior, con poco ruido (100 partes por millón por punto). Lee el <strong>instante central respecto de la previsión</strong> en minutos y la <strong>barra de error</strong> (una sigma) en minutos.',
      fields: [
        { label: 'Instante central respecto de la previsión' },
        { label: 'Barra de error (una sigma)' },
      ],
    },
    {
      title: 'Una barra de error mayor',
      body: 'Pon el <strong>ruido por punto</strong> en Típico, cuatro veces mayor. El mismo tránsito, medido de nuevo con luz más ruidosa. Lee la barra de error y la línea de debajo, que dice si la barra puede leerse como una.',
      prompt: '¿Qué le pasa a la barra de error del instante?',
      options: [
        'Crece unas cuatro veces: un ruido cuatro veces mayor en cada punto deja el instante cuatro veces menos cierto',
        'Se queda igual: el planeta cruzó en el mismo instante',
        'Crece un 40 por ciento, la raíz cuadrada de dos',
        'Se reduce, porque más ruido significa más puntos cerca del descenso',
      ],
      hints: [
        'El instante se fija por cómo cambia la luz en los bordes del descenso. ¿Qué hace el ruido en esos puntos con el lugar donde parece estar el borde?',
      ],
      because:
        'La barra de error pasa de 0,52 a 2,1 minutos, cuatro veces mayor, porque el instante se lee de la pendiente en los dos bordes del descenso y un ruido cuatro veces mayor emborrona cuatro veces dónde está el borde. Y con este ruido el panel añade que la barra de error es tan larga como los dos minutos entre puntos, y en ese régimen la dispersión real es mayor de lo que la barra dice: es una cota inferior, no un intervalo. La comprobación que lo halló está en la tabla de validación.',
      misconceptions: [
        {
          say: 'El planeta sí cruzó en el mismo instante verdadero. Lo que cambió es lo bien que la luz permite decir cuándo.',
        },
      ],
    },
    {
      title: 'Un reloj constante',
      body: 'Ahora el registro entero. Para cada tránsito el panel toma el instante medido y le resta el que daría un reloj perfectamente constante, la recta ajustada a todos. Lo que queda es <strong>O menos C</strong>, observado menos calculado, en minutos, con su barra de error. Este es un par de planetas muy distintos en periodo (diez y veintisiete días), con el interior medido en unos cien tránsitos. Los puntos se dispersan en torno a medio minuto, que es lo que dicen las barras de error, y el panel indica que no hay señal sobre el ruido: este planeta tiene un reloj constante.',
    },
    {
      title: 'Un segundo planeta tira',
      body: 'Ahora un par cercano a una resonancia: el planeta exterior tarda casi el doble que el interior, veinte días y medio frente a diez. Cada vez que pasan, el exterior tira un poco del interior hacia delante o hacia atrás en su órbita, y los tránsitos llegan un poco pronto o tarde. El par no está exactamente en dos a uno, así que la geometría del tirón va cambiando.',
      prompt: 'El diagrama O-C del planeta interior…',
      options: [
        'se quedará plano: el reloj de un planeta no se entera de sus vecinos',
        'subirá en línea recta: el periodo del planeta es un poco distinto del supuesto',
        'oscilará despacio arriba y abajo en una onda regular, mucho más larga que el periodo de cualquiera de los dos',
        'saltará al azar unos minutos',
      ],
      hints: [
        'Una recta ya está quitada: el reloj con que se comparan los instantes es la mejor recta. ¿Qué tipo de cambio no podría absorber?',
      ],
      because:
        'Una onda lenta. Un cambio constante del periodo es una recta en los instantes y el reloj de línea recta lo absorbe; lo que no puede absorber es un empujón que crece y se apaga a medida que gira la geometría del par, y eso es una onda cuya longitud es el tiempo que tarda el par en volver a la misma disposición.',
    },
    {
      title: 'Lee la onda',
      body: 'El panel muestra el planeta interior del par cercano a dos a uno. Lee el <strong>superperiodo</strong>, la longitud de la onda en días, y su <strong>amplitud</strong>, la mitad de la oscilación de cresta a valle, en minutos.',
      fields: [{ label: 'Superperiodo' }, { label: 'Amplitud' }],
    },
    {
      title: 'Lo fija el par',
      body: 'Pon el sistema en <strong>Lejos de la resonancia</strong>: diez y veintisiete días, con las mismas masas y el mismo ruido. Lee el veredicto.',
      prompt: '¿Qué dice el panel, y por qué?',
      options: [
        'Sin señal de TTV sobre el ruido: los planetas no están cerca de una resonancia, los empujones se compensan enseguida y lo que queda está muy por debajo del ruido',
        'La misma onda, solo más larga: dos planetas cualesquiera la hacen',
        'Sin señal, porque este planeta no tiene vecino',
        'No puede decirlo: el registro es demasiado corto',
      ],
      hints: [
        'La onda lenta viene de que el par va pasando despacio por la misma disposición. ¿Hay una deriva lenta así para estos dos periodos?',
      ],
      because:
        'Sin señal sobre el ruido. Con periodos que no están cerca de una razón simple la disposición de los dos planetas cambia deprisa y los tirones se compensan de una órbita a otra, de modo que los instantes se quedan a una fracción de minuto de la recta, por debajo del ruido de medio minuto. El vecino está ahí: simplemente no escribe una onda. Y el panel se niega a citar la relación para un par tan lejos de una resonancia de primer orden.',
      misconceptions: [
        {
          say: 'Dos planetas siempre tiran uno del otro, pero el tirón hace una onda lenta solo cuando los periodos están cerca de una razón simple. Lejos de una, el efecto es demasiado pequeño y rápido para verse.',
        },
      ],
    },
    {
      title: 'Lo que dice la onda',
      body: 'Los instantes de tránsito de un planeta son un reloj, y el reloj se mide: cada instante tiene una barra de error, y la barra puede leerse como tal solo cuando es bastante menor que la separación entre puntos. El diagrama O-C son esos instantes menos el mejor reloj de línea recta. Plano significa que el planeta guarda su hora; una onda lenta significa que algo tira de él, y la longitud de la onda es el superperiodo del par, que ninguno de los planetas tiene por sí solo. En esta investigación los sistemas los hace el motor con ruido añadido, y nada de lo que se ve es una estrella observada.',
    },
  ],
};

export const THE_CLOCK_THAT_DRIFTS_DEEPER_ES = {
  steps: [
    {
      title: 'El pulso de dos relojes',
      body: 'El superperiodo no es un parámetro del ajuste, es aritmética con los periodos de los dos planetas. El par vuelve a la misma disposición cada <strong>1 / |2 / P<sub>exterior</sub> &minus; 1 / P<sub>interior</sub>|</strong> días (la resonancia dos a uno tiene j = 2). Lee el reloj del planeta interior en el panel, cambia al exterior y lee su reloj, y calcula el superperiodo.',
      fields: [
        { label: 'Periodo interior' },
        { label: 'Periodo exterior' },
        { label: 'Superperiodo' },
      ],
    },
    {
      title: 'Otro par',
      body: 'Cambia al par cercano a tres a dos (diez y quince días y medio, j = 3), planeta interior. Lee el superperiodo que halla el ajuste y el que da la relación con los dos periodos.',
      fields: [
        { label: 'Superperiodo ajustado' },
        { label: 'Según los periodos' },
      ],
    },
    {
      title: 'Cuál oscila más',
      body: 'En el par cercano a dos a uno la onda del planeta interior tiene una amplitud de unos 4,7 minutos. Cambia al exterior: su onda es de unos 1,6 minutos. El interior tiene 10 masas terrestres y el exterior 15.',
      prompt: '¿Por qué oscila más el planeta más ligero?',
      options: [
        'La oscilación de un planeta la mueve sobre todo la masa del otro, aquí la mayor, con un coeficiente mayor para el interior',
        'Porque el planeta interior es el más pesado',
        'Porque transita más a menudo y tiene más puntos en su onda',
        'Por el ruido: el exterior tiene menos tránsitos',
      ],
      hints: [
        'El tirón que mueve los tránsitos de un planeta es la atracción del otro. ¿Cuál atrae más, el de 10 o el de 15 masas terrestres?',
      ],
      because:
        'La amplitud de la oscilación de un planeta es proporcional a la masa del otro y a su propio periodo, con un coeficiente que depende de la resonancia y que aquí es mayor para el interior (unos 1,1 frente a 0,4). Así, el interior de 10 masas terrestres, atraído por el exterior de 15, oscila unas tres veces más que el exterior.',
      misconceptions: [
        {
          say: 'El planeta interior es el más ligero. La masa propia de un planeta no mueve mucho sus propios tránsitos; mueve los de su vecino.',
        },
      ],
    },
    {
      title: 'Un registro demasiado corto',
      body: 'Vuelve al planeta interior del par cercano a dos a uno y pon la <strong>parte del registro</strong> en el 40 por ciento: los primeros 44 tránsitos, 430 días. La onda dura 345 días.',
      prompt: '¿Qué dice el panel, y por qué?',
      options: [
        'Hay señal, pero no superperiodo: el registro cubre 1,2 ciclos, y un periodo necesita al menos uno y medio, porque una recta puede absorber un trozo corto de una oscilación larga',
        'El mismo superperiodo, solo que con una barra de error mayor',
        'Sin señal: hay muy pocos tránsitos',
        'Un superperiodo de 430 días, la longitud del registro',
      ],
      hints: [
        'El reloj de línea recta se ajusta a los mismos tránsitos. ¿Qué puede hacer una recta con un tramo de onda menor que uno y medio ciclos?',
      ],
      because:
        'El panel indica que hay señal (la onda está ahí) pero se niega a dar un periodo: 430 días son 1,2 ciclos de una onda de 345 días, y la recta ajustada al registro absorbe parte de una oscilación tan corta, de modo que el periodo que saliera del ajuste sería arbitrario. Hacen falta unos 520 días. Esta es la comprobación que distingue un periodo largo de un registro corto.',
      misconceptions: [
        {
          say: 'Con un registro corto el ajuste puede devolver casi cualquier periodo, y una barra de error lo ocultaría. El panel se niega a dar uno.',
        },
      ],
    },
    {
      title: 'Una masa, si las órbitas son circulares',
      body: 'Muestra <strong>qué dice la amplitud sobre la masa</strong>, para el planeta interior del par cercano a dos a uno. La amplitud de su onda es proporcional a la masa del planeta <strong>exterior</strong>, así que el panel convierte la amplitud medida en esa masa, <strong>si ambas órbitas son circulares</strong>, para una estrella de una masa solar, con un intervalo que recoge la medida y la exactitud de la relación. Lee la masa y los extremos del intervalo.',
      fields: [
        { label: 'Masa del planeta exterior' },
        { label: 'Extremo inferior' },
        { label: 'Extremo superior' },
      ],
    },
    {
      title: 'Qué hace una excentricidad',
      body: 'La masa anterior suponía órbitas circulares. La amplitud depende también de las excentricidades de los planetas, a través de una combinación que el panel llama |Z|, que la amplitud no puede dar. El control está en 0,010. Las dos curvas del panel muestran, para las <em>mismas masas</em>, la amplitud mayor y la menor que podría dar cualquier dirección de esa excentricidad; lee a qué distancia están del valor circular.',
      prompt:
        '¿Qué le hace eso a una masa leída de la amplitud como si fuera circular?',
      options: [
        'Nada: la amplitud depende solo de las masas',
        'Podría equivocarse en decenas por ciento en un sentido u otro, un 45 por ciento en este sistema, y la amplitud sola no puede decir cuál',
        'Siempre saldría demasiado alta, pues los planetas excéntricos tiran más',
        'No importa salvo que la excentricidad supere 0,1',
      ],
      hints: [
        'Las curvas son para masas fijas. Si la amplitud se mueve sobre ellas, ¿qué hace con el número quien supuso una órbita circular?',
      ],
      because:
        'Para estas masas una combinación de excentricidades de 0,010 podría hacer que la amplitud estuviera entre el 55 y el 145 por ciento de la circular, de modo que quien supusiera órbitas circulares se equivocaría en decenas por ciento en cualquier sentido y la amplitud no tiene cómo decir cuál. Una puerta comprobó si un intervalo que admite una cota supuesta de la excentricidad es útil: cubría, pero sus extremos estaban unas cuatro veces separados, más que la cota fijada de antemano, así que Gravitas da la masa circular y declara la suposición, y no da el intervalo como cota.',
      misconceptions: [
        {
          say: 'A primer orden la amplitud es proporcional a la masa, pero tiene además un término con la excentricidad, y eso es lo que muestran las dos curvas.',
        },
      ],
    },
    {
      title: 'El otro planeta',
      body: 'Cambia al planeta <strong>exterior</strong>, cuya onda da la masa del <em>interior</em>, con el mismo |Z| de 0,010. La dispersión es ahora de aproximadamente &minus;73 a +127 por ciento.',
      prompt: '¿Por qué es mucho peor aquí la misma excentricidad?',
      options: [
        'La onda del planeta exterior tiene un coeficiente circular menor (unos 0,4 frente a 1,1), así que el mismo término de excentricidad es una parte mayor de ella',
        'Porque el planeta exterior es más pesado',
        'Porque el planeta exterior tiene menos tránsitos',
        'No es peor: el panel muestra otra magnitud',
      ],
      hints: [
        'La amplitud es una parte circular más una parte de excentricidad. Si la parte circular es menor, ¿qué le pasa a la proporción de la parte de excentricidad?',
      ],
      because:
        'La parte circular de la onda del planeta exterior lleva un coeficiente de unos 0,4 y la parte de excentricidad es la misma, así que la parte de excentricidad es casi tres veces mayor como proporción. Para este planeta la amplitud podría ser casi cero o más del doble de la circular, y una masa sacada de ella sería casi inútil sin conocer la excentricidad.',
      misconceptions: [
        {
          say: 'El coeficiente que multiplica la parte circular depende de la resonancia y de qué planeta es, no de lo pesado que sea el planeta.',
        },
      ],
    },
    {
      title: 'Lo que una amplitud no puede decir',
      body: 'Una amplitud da una masa solo junto con una suposición sobre la excentricidad. Con la suposición de que las órbitas son circulares el panel da la masa con su intervalo y lo dice; no da como cota un intervalo que admita la excentricidad desconocida, y no da la excentricidad. Las ondas de los dos planetas juntas llevan más (también sus fases), y eso es lo que usan los análisis publicados. Los sistemas son sintéticos, dos planetas en un plano, fuera de la anchura de la resonancia.',
    },
  ],
};

// ---- instructor content ------------------------------------------------------------------

const CONTENT = {
  'the-clock-that-drifts': {
    topic:
      'How the times of a planet’s transits are measured, why the O-C diagram of a planet alone is flat and that of a planet near a resonance is a slow wave, what sets the wave’s length (the pair’s super-period), when a record is too short to give one, and why an amplitude gives a mass only under an assumption about the eccentricity.',
    difficulty:
      'Introductory (one transit time and its error bar; what a flat O-C and a wave mean; the super-period and the amplitude read from the panel); majors (the super-period from the two periods, the same for a three to two pair, which planet swings more and why, a record that is too short); upper-level (a mass from an amplitude under a circular assumption, how far an eccentricity moves the amplitude for the same masses, and why the circular mass is the only one Gravitas gives).',
    placement:
      'After Transit Photometry, in an exoplanets unit, and beside When Orbits Lock, whose resonant angles are the dynamical side of the same near-resonance; before or with the radial-velocity and joint-fit material. In a course without those, the first part reads on its own.',
    overview:
      'Students watch a transit time being measured from a window of synthetic light curve (1.5 minutes after the prediction, give or take 0.5), see the error bar grow fourfold with four times the noise and read the panel’s warning that at that noise it is only a lower bound, then see an O-C diagram that is flat for a pair far from resonance and a wave of about 345 days and 4.7 minutes for a pair near two to one. The majors depth computes the wave’s length from the two periods, repeats it for three to two, explains why the lighter planet swings more and why a record of 1.2 cycles gives no period. The upper depth turns the amplitude into a mass of the other planet under a circular assumption (14.4 Earth masses against the engine’s 15.0), shows how far an eccentricity of 0.01 moves the amplitude for fixed masses (45 percent either way), and why the same eccentricity is worse for the other planet.',
    priorKnowledge: [
      'A transit as a dip in a star’s light and the period of a planet (Transit Photometry)',
      'Orbital period and the idea of a resonance as a ratio of periods (When Orbits Lock)',
      'A straight-line fit and what a residual is; an error bar as one standard deviation',
    ],
    keyConcepts: [
      {
        heading: 'A transit time is a measurement with an error bar',
        body: 'It comes from fitting a template of the dip to a window of noisy light. The error bar grows with the noise and falls with the number of points on the edges of the dip. It can be read as one standard deviation only when it is well under the spacing of the points; at a typical noise it is as long as the spacing and the real scatter is larger.',
      },
      {
        heading: 'O minus C is what the straight-line clock cannot absorb',
        body: 'A planet alone keeps a straight-line clock, so its O-C is flat within the noise. A neighbor that tugs on it writes a slow wave, whose length is the pair’s super-period, one over the difference of j over the outer period and j minus one over the inner, and whose amplitude is mostly set by the other planet’s mass.',
      },
      {
        heading: 'An amplitude is not a mass',
        body: 'To first order the amplitude is proportional to the other planet’s mass but also depends on the eccentricities through a combination the amplitude cannot give. Under a circular assumption the panel gives a mass with an interval and says so; the gate that tested an interval for a declared bound on the eccentricity found its edges four times apart, wider than the bound committed beforehand, so Gravitas does not give it.',
      },
    ],
    features: [
      {
        name: 'The transit panel (ttv-transit)',
        text: 'One transit’s window of light curve and the template fit that measures its time, at three noise levels, with the error bar, the fit’s own check and whether the error bar can be read as an interval, and the engine’s true time to compare.',
      },
      {
        name: 'The timing panel (ttv-timing)',
        text: 'The O-C diagram of either planet of three engine-made systems, the straight-line clock, the fitted sinusoid with its period and amplitude, the period from the pair’s mean periods and the formula’s amplitude, a verdict of no signal or too short a record, and a view that turns the amplitude into a mass under a circular assumption with the spread a free eccentricity allows.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: the super-period from the periods, the three to two pair, which planet swings more, a record that is too short. Advanced: a mass from an amplitude if the orbits are circular, what an eccentricity does to the amplitude, why it is worse for the inner planet’s mass, and what an amplitude cannot say.',
      },
    ],
    misconceptions: [
      {
        claim: 'A planet’s own mass makes its own transit times swing.',
        response:
          'Its neighbor’s pull moves its transits, so a planet’s wave is mostly set by the other planet’s mass. The lighter planet swings more here because it is the one tugged by the heavier.',
      },
      {
        claim: 'Any two planets make a wave in each other’s transit times.',
        response:
          'Only near a simple period ratio. Away from one the tugs cancel from orbit to orbit and the O-C is flat within the noise, as the far-from-resonance system shows.',
      },
      {
        claim:
          'An error bar on a transit time is always one standard deviation.',
        response:
          'It is the curvature of the fit, and when it is as long as the spacing of the points the real scatter is larger. The panel says so at the noisier settings; at 400 parts per million the normalized error had a standard deviation of 1.4 in the validation.',
      },
      {
        claim: 'A TTV amplitude gives the planet’s mass.',
        response:
          'Only with an assumption about the eccentricity: for the same masses an eccentricity combination of 0.01 moves the amplitude by about 45 percent either way, and the amplitude cannot say in which direction.',
      },
    ],
    teachingNotes: [
      'The super-period is 1 / |j / P_outer − (j − 1) / P_inner| for the first-order resonance j to j minus 1 (Lithwick, Xie and Wu 2012, equation 1), from the mean periods of the two clocks; the amplitudes are their equations 8 and 9 to first order in the masses, with the Laplace-coefficient combinations f and g of Murray and Dermott (1999). Z, the free-eccentricity combination, is the term an amplitude cannot give.',
      'The systems are synthetic: the engine (Velocity Verlet, 2000 steps per inner period) integrates a star and two planets in a plane and the transit is the moment the planet is in front of the star; each transit has a seeded window of light curve at 100 parts per million per two-minute point, measured by the kernel’s template fit. The validation compared the engine with an independent scipy integration to 6e-6 days.',
      'Validation (TTV.md): the engine’s super-periods agree with the relation to 1 percent, the amplitudes to 5 percent (inner) and 16 percent (outer); at 400 parts per million the error bars undercover (the normalized error’s standard deviation is 1.4), at 100 they cover, and the legs that failed at 400 stay failing and labeled. No published system was compared: its transit times were requested and not supplied.',
      'The mass is given only for a circular pair because the gate’s verdict was B. The degeneracy interval for a stated bound on the eccentricity covered (1.00) but its edges were 4.19 times apart against a bound of 4 committed first.',
    ],
    discussion: [
      'The O-C diagram removes a straight line from the transit times. What kinds of physical effect does that hide, and which does it show?',
      'The error bar of a transit time is not reliable when it is as long as the spacing of the points. What would you change in the observation to make it reliable?',
      'The panel gives a circular mass and states the assumption. What would you need to measure to drop the assumption?',
    ],
    extensions: [
      'Compare the amplitudes of the two planets in each of the two near-resonant systems and say which planet’s wave carries information about which planet’s mass.',
      'Show the first 30, 40, 50 and 60 percent of the record for the inner planet of the two to one pair and say where the period first appears, and why it does not before.',
    ],
    modelNotes:
      'js/kernels/ttv/ (the template fit, the ephemeris and the verdict, the super-period and amplitudes, the circular mass, the engine forward model), js/ttvField.js, js/ttvWidgets.js, js/data/ttvPack.js (the three systems) and TTV.md; the gate is TTV_MASS_GATE.md.',
  },
};

const FLOW = {
  'the-clock-that-drifts': [
    {
      from: 'a-clock-that-ticks',
      to: 'one-transit-time',
      text: 'A planet as a clock and one transit time measured from noisy light, with its error bar.',
    },
    {
      from: 'a-bigger-error-bar',
      to: 'a-steady-clock',
      text: 'Four times the noise, four times the error bar and the warning that it is then a lower bound; then the O-C diagram of a planet on a steady clock.',
    },
    {
      from: 'a-wave',
      to: 'read-the-wave',
      text: 'The prediction for a pair near two to one, then the wave read from the panel: its length and amplitude.',
    },
    {
      from: 'the-pair-sets-it',
      to: 'the-pair-sets-it',
      text: 'A pair far from resonance writes no wave.',
    },
    {
      from: 'what-the-wave-says',
      to: 'what-the-wave-says',
      text: 'The summary: a transit time is a measurement, the O-C is what a straight line cannot absorb, and a wave’s length belongs to the pair.',
    },
  ],
};

const EXPECTATIONS = {
  'the-clock-that-drifts': {
    'one-transit-time':
      'For transit 40 of the inner planet at low noise, a mid-time about 1.53 minutes from the prediction (within 0.15) and an error bar about 0.52 minutes (within 0.06).',
    'read-the-wave':
      'For the inner planet of the near two-to-one pair, a super-period of about 345 days (within 3) and an amplitude of about 4.7 minutes (within 0.3).',
  },
};

const BANDS = {
  'the-clock-that-drifts': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
};

/** The guide, flow, expectations and time bands of the lesson above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};

/** The Spanish shadow by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = {
  'the-clock-that-drifts': THE_CLOCK_THAT_DRIFTS_ES,
};

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = {
  'the-clock-that-drifts': THE_CLOCK_THAT_DRIFTS_DEEPER,
};
export const DEPTH_ES = {
  'the-clock-that-drifts': THE_CLOCK_THAT_DRIFTS_DEEPER_ES,
};

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [THE_CLOCK_THAT_DRIFTS];
