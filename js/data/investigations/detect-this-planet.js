// =============================================================================
// Can You Detect This Planet?
// -----------------------------------------------------------------------------
// A short lesson about observing rather than about physics. The three exoplanet
// lessons all hand the student a signal and ask what it means; this one hands
// them a telescope schedule and asks whether it would ever have shown them the
// signal at all.
//
// The spine is one comparison. Twelve measurements of the same star, at the
// same precision, taken on two different schedules: one spread across a single
// orbit, one taken at intervals of almost exactly one orbit. The first is
// unambiguous about the star's velocity varying. The second - eleven times the
// baseline, the same number of nights, the same instrument - cannot establish
// even that, though it is not empty either. Nothing about the planet changed.
//
// Everything the student needs to see that lives in two places: the
// `survey-schedule` widget in js/exoplanetWidgets.js, which is analytic so the
// comparison takes seconds rather than forty simulated days, and the synthetic
// observing run in the live Radial Velocity panel, which does the same thing to
// the actual simulated star. Both draw their noise from js/rvSurvey.js, so a
// seed means the same thing in both and two students can compare answers.
//
// What the lesson must not do, and is written throughout to avoid: turn a ratio
// of amplitude to noise into a detection. The readouts report how surprising
// the scatter is if the velocity never changed, which is a statement about
// constancy and not about planets, and the questions at steps 12 and 14 exist
// to make the difference something the student has had to say out loud.
// =============================================================================

// The same system the other exoplanet lessons use, with the star free to move.
// HD 209458: a 0.69 Jupiter-mass planet on a 3.5247-day orbit, K = 84 m/s.
const RV_LAB = {
  scenario: 'Exoplanet Characterization Lab',
  seed: 'detect',
  camera: { zoom: 55, pan: { x: 0, y: 0 } },
  paused: false,
};

/** Twelve measurements spread across one orbit. */
const SCHEDULE_A = { cadence: 0.32, n: 12, sigma: 8, mp: 0.69, seed: 1 };
/** Twelve measurements taken one orbit apart. */
const SCHEDULE_B = { cadence: 3.52, n: 12, sigma: 8, mp: 0.69, seed: 1 };

// The two schedules are a controlled comparison and it is worth being exact
// about what is controlled. Same star, same planet (mp), same instrument
// precision (sigma), same number of nights (n), same random draw (seed). One
// thing differs: the cadence, and with it the baseline the twelve nights span.
// Anything a student concludes from the two is a conclusion about cadence.

/** The target, bound by exact name so a step can say which star it means. */
const TARGET = {
  star: { name: 'HD 209458' },
  planet: { name: 'HD 209458 b' },
};

/**
 * Where the target actually is, beside what the planner is assuming.
 *
 * The planner works in days since the run began and the canvas works in
 * position, and until now nothing connected the two: a student could read
 * "phase coverage 3 of 10" without ever seeing that a phase is a place the
 * star is in its orbit. The first three rows are the live star; the last two
 * are the schedule the panel is drawing.
 */
const targetRows = ctx => {
  const now = ctx.rvNow();
  if (!now) {
    return [{ label: 'Target', value: 'select the star on the canvas' }];
  }
  const rows = [{ label: 'Target', value: now.name }];
  if (now.held) {
    rows.push({
      label: 'Spectrograph',
      value: 'this star is pinned, so there is no reflex motion to measure',
    });
    return rows;
  }
  rows.push(
    {
      label: 'Where it is in its orbit now',
      value: `${now.phaseDeg.toFixed(0)}°`,
    },
    {
      label: 'What a spectrograph reads now',
      value: `${now.velocity.toFixed(1)} m/s — ${now.towards}`,
    }
  );
  return rows;
};

const DETECT_THIS_PLANET = {
  id: 'detect-this-planet',
  thumbnail: 'images/scenarios/exoplanet-characterization-lab.webp',
  series: 'Detecting exoplanets',
  title: 'Can You Detect This Planet?',
  subtitle:
    'Two methods, the same problem: the answer was decided before the data arrived',
  duration: '30-35 min',
  level: 'Introductory astronomy',
  // Subject tags, for the browser's filters. A fixed vocabulary
  // shared across the catalogue rather than free text, so a filter can offer
  // the whole set without a second list to keep in step.
  tags: ['exoplanets', 'observing'],
  lock: { placement: true, inspector: true },
  summary:
    'A planet is either there or it is not, but whether you find it depends on choices you make before you take a single measurement. Plan two radial-velocity runs of the same star with the same instrument and the same number of nights, and find that one detects a Jupiter and the other cannot tell you anything. Then do it again with transits, where the same planet is a 587-sigma certainty from space and a 4-sigma maybe from three nights on the ground — and work out how many more nights would fix that, and where the answer stops improving.',
  objectives: [
    'Predict whether an observing schedule can detect a given planet, and say which of cadence, baseline and precision decides it',
    'Explain why more measurements over a longer baseline can be worse than fewer over a shorter one',
    'State what excess scatter in a radial-velocity dataset does and does not establish',
    'Say what a flat radial-velocity dataset rules out, and what it leaves open',
    'Compute a transit depth from a planet and star radius, and compare it with a photometric noise budget',
    'Distinguish white noise, which averages down with more observing, from correlated noise, which does not',
    'Explain why a long-period planet is hard to find even when its transit is deep and long',
    'Say what makes a planet undetectable by a given instrument rather than merely difficult',
  ],
  steps: [
    // --- Part 1: the question is about the schedule, not the planet ---------
    {
      sid: 'twelve-nights',
      bind: TARGET,
      allowInspector: true,
      // The screen asks the reader to pick the target, so it shows them what
      // they have picked. Every instrument later in the lesson measures
      // whichever star is selected, and a run planned against nothing is the
      // commonest way this lesson stalls.
      probe: targetRows,
      type: 'read',
      title: 'Twelve nights',
      setup: RV_LAB,
      body: `You have been given twelve nights on a spectrograph. Not twelve
             consecutive nights necessarily - twelve nights, to use when you
             like, over as long a run as you care to ask for.
             \n\nThe target is the star on screen — click it, or use
             <strong>Objects in this activity</strong> below, so the instrument
             knows which star you mean. Somewhere around it, too faint
             to see, there may or may not be a planet. Your twelve measurements
             of the star's velocity are all the evidence you are going to get.
             \n\nThe usual question is <em>is there a planet</em>. This lesson
             asks a different one, and it is the question an observer actually
             has to answer first: <strong>would this schedule find it if there
             were?</strong>`,
      tip: 'Time on a large telescope is allocated in nights, months in advance. The schedule is decided before anyone knows what the data will show.',
    },
    {
      sid: 'what-decides-whether-you-find',
      bind: TARGET,
      type: 'predict',
      title: 'What decides whether you find it?',
      body: `Four things are obviously true of any observing run: how many
             measurements you take, how precise each one is, how long a stretch
             of time they span, and how they are spaced within that stretch.
             \n\nSuppose the number of measurements is fixed at twelve and the
             instrument is fixed. Commit to an answer before you see any data.`,
      prompt:
        'With twelve measurements and one instrument, which choice do you think matters most?',
      options: [
        'Spreading them over as long a total run as possible',
        'How they are spaced relative to the planet’s orbit',
        'Taking them all on consecutive nights',
        'It cannot matter much: twelve measurements are twelve measurements',
      ],
      answer: 1,
      because: `Spacing relative to the orbit. The next few screens are the
                demonstration: two runs of twelve, one of them eleven times
                longer than the other, and it is the shorter one that finds the
                planet.`,
    },

    // --- Part 2: a schedule that works --------------------------------------
    {
      sid: 'schedule-a-twelve-nights-one',
      bind: TARGET,
      type: 'explore',
      title: 'Schedule A: twelve nights, one orbit',
      body: `This instrument plans a run and shows you what it would come home
             with. It is set to the first schedule: twelve measurements, roughly
             eight hours apart, spanning a single orbit of the planet.
             \n\nThe dashed curve is the planet as the simulation knows it. It is
             drawn to teach and it is <strong>not data</strong> - a real survey
             has only the dots and their error bars. The right-hand panel folds
             the same measurements onto one cycle, which is where the spacing
             becomes visible.`,
      tool: {
        id: 'survey-schedule',
        values: SCHEDULE_A,
        title: 'Plan an observing run',
        note: 'Use the presets below to switch between the two schedules. The noise seed changes which random draw you get, not how good the schedule is.',
      },
      checklist: [
        'Read the phase coverage: how many of the ten bins of the cycle hold at least one measurement',
        'Watch the star on the canvas and match its position to a phase in that folded panel',
        'Compare the scatter of the measurements with the scatter expected from noise alone',
        'Set the uncertainty to zero and watch the points fall exactly on the dashed curve',
      ],
      allowInspector: true,
      probe: targetRows,
      tip: 'A "phase" is a place the star is in its orbit, not an abstraction: the readout below gives the phase the star is at right now, and the folded panel is the same axis. The right-hand panel is folded on the true period, which a real survey does not know — part of why this is harder in practice than it looks here.',
    },
    {
      sid: 'write-down-what-schedule-a',
      bind: TARGET,
      type: 'measure',
      title: 'Write down what Schedule A got',
      body: `Put the instrument back on <strong>Schedule A: one cycle</strong>
             with the uncertainty at 8 m/s and the seed at 1, and read three
             numbers off the readout.`,
      tool: { id: 'survey-schedule', values: SCHEDULE_A },
      fields: [
        {
          id: 'coverageA',
          label: 'Phase bins covered (out of 10)',
          unit: '',
          hint: '10',
        },
        {
          id: 'scatterA',
          label: 'Scatter of the measurements',
          unit: 'm/s',
          hint: '55.8',
        },
        {
          id: 'chiA',
          label: 'χ²/dof against a constant velocity',
          unit: '',
          hint: '48.7',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.coverageA) || !Number.isFinite(v.chiA)) {
          return null;
        }
        if (v.coverageA > 10) {
          return {
            level: 'error',
            message: 'There are only ten bins, so the count cannot exceed ten.',
          };
        }
        if (v.chiA < 5) {
          return {
            level: 'warn',
            message:
              'That is much lower than this schedule gives. Check the preset is Schedule A and the uncertainty is 8 m/s.',
          };
        }
        return {
          level: 'ok',
          message:
            'Full phase coverage, and a scatter many times larger than the error bars can account for.',
        };
      },
    },
    {
      sid: 'what-have-you-established',
      bind: TARGET,
      type: 'question',
      kind: 'choice',
      title: 'What have you established?',
      body: `The measurements scatter by about 56 m/s. The error bars are 8 m/s.
             A χ²/dof near 49 says that if the star's velocity had really been
             constant, a scatter this large would essentially never happen by
             chance.
             \n\nBe careful with the next step. It is the one this whole lesson
             is built around.`,
      prompt:
        'The most that these twelve measurements establish on their own is:',
      options: [
        'A planet of about 0.7 Jupiter masses orbits this star every 3.5 days',
        'A planet orbits this star, though its mass and period are still unknown',
        'The star’s velocity is not constant',
        'Nothing, because twelve measurements are too few',
      ],
      answer: 2,
      because: `The velocity is not constant. That is all the scatter can carry
                by itself. A planet is the most likely explanation and it is not
                the only one: a faint companion star, pulsations, spots rotating
                across the surface, or a fault in the instrument all produce
                velocity variations. Turning "not constant" into "a planet, of
                this mass, on this period" needs more than a scatter - it needs
                the variation to repeat on a definite period, and it needs the
                other explanations ruled out.`,
      tip: 'The readout says the same thing under "What that does not say". It is there deliberately.',
    },

    // --- Part 3: a schedule that fails --------------------------------------
    {
      sid: 'schedule-b-twelve-nights-thirty',
      bind: TARGET,
      type: 'predict',
      title: 'Schedule B: twelve nights, thirty-nine days',
      body: `Now the second plan. The same star, the same instrument, the same
             twelve measurements and the same 8 m/s precision - but taken 3.52
             days apart instead of eight hours apart, so the run spans thirty-nine
             days instead of three and a half.
             \n\nEleven times the baseline, for the same twelve nights of
             telescope time.`,
      prompt: 'Compared with Schedule A, Schedule B will:',
      options: [
        'Do better: a longer baseline is more information',
        'Do about the same: the same twelve measurements of the same star',
        'Do worse',
        'Do better, but only if the planet has a long period',
      ],
      answer: 2,
      because: `It does much worse, and the reason is not the number of
                measurements or the length of the run. Switch the instrument to
                Schedule B on the next screen and look at the folded panel.`,
    },
    {
      sid: 'the-same-planet-invisible',
      bind: TARGET,
      allowInspector: true,
      probe: targetRows,
      type: 'explore',
      title: 'The same planet, invisible',
      body: `Switch the preset to <strong>Schedule B: one cycle apart</strong>.
             \n\nThe left panel now covers thirty-nine days instead of three and
             a half, and the twelve measurements are almost a flat line. The
             right panel shows why: fold them onto the cycle and they pile up in
             two bins out of ten.
             \n\nBe exact about what has changed and what has not. Same star,
             same planet, same instrument precision, same twelve nights, same
             random draw. One thing differs: how far apart the nights are. So
             anything you conclude from comparing these two runs is a conclusion
             about <em>cadence</em>, and about nothing else.
             \n\nThe star on the canvas has not changed either. Watch where it
             is when each measurement would have been taken — a cadence of one
             orbit means catching it at nearly the same place in its orbit every
             time, which is why twelve measurements can tell you almost nothing.`,
      tool: {
        id: 'survey-schedule',
        values: SCHEDULE_B,
        title: 'Schedule B',
        note: 'Everything except the cadence is identical to Schedule A.',
      },
      checklist: [
        'Read the phase coverage and compare it with Schedule A',
        'Read the χ²/dof and notice it is no longer a landslide',
        'Nudge the cadence away from 3.52 - try 3.0 or 4.2 - and watch the coverage recover',
      ],
    },
    {
      sid: 'write-down-what-schedule-b',
      bind: TARGET,
      type: 'measure',
      title: 'Write down what Schedule B got',
      body: `With the preset on <strong>Schedule B</strong>, uncertainty 8 m/s
             and seed 1, read the same three numbers.`,
      tool: { id: 'survey-schedule', values: SCHEDULE_B },
      fields: [
        {
          id: 'coverageB',
          label: 'Phase bins covered (out of 10)',
          unit: '',
          hint: '2',
        },
        {
          id: 'scatterB',
          label: 'Scatter of the measurements',
          unit: 'm/s',
          hint: '11',
        },
        {
          id: 'chiB',
          label: 'χ²/dof against a constant velocity',
          unit: '',
          hint: '1.9',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.coverageB) || !Number.isFinite(v.chiB)) {
          return null;
        }
        if (v.coverageB > 4) {
          return {
            level: 'warn',
            message:
              'Schedule B should cover very few bins. Check the cadence is 3.52 days.',
          };
        }
        return {
          level: 'ok',
          message:
            'Two bins out of ten, and a χ²/dof a careful person would not publish either way.',
        };
      },
    },
    {
      sid: 'why-it-failed',
      bind: TARGET,
      type: 'question',
      kind: 'numeric',
      title: 'Why it failed',
      body: `The planet's orbital period is 3.5247 days. Schedule B takes a
             measurement every 3.52 days.`,
      prompt:
        'How many complete orbits does the planet make between one measurement and the next?',
      answer: 1,
      tolerance: 0.06,
      unit: 'orbits',
      because: `3.52 / 3.5247 = 0.9987, which is one orbit to within a fifth of a
                percent. Every measurement catches the star at almost exactly the
                same point in its orbit, so the planet's motion has nowhere to
                show itself. The star really was moving at 84 m/s each way the
                whole time; the schedule simply never looked at the other part of
                the cycle. This is called aliasing, and it is the reason
                observers avoid cadences close to a whole number of days when
                hunting for planets with periods close to a whole number of days.`,
    },

    // --- Part 4: three knobs, not one ---------------------------------------
    {
      sid: 'the-third-knob',
      bind: TARGET,
      type: 'explore',
      title: 'The third knob',
      body: `Cadence is one of three separate things, and it is worth seeing the
             other two isolated.
             \n\nPress <strong>A smaller planet</strong>: the schedule goes back
             to the good one, but the planet becomes a Neptune, and K drops from
             84 to about 7 m/s - smaller than the error bars. Then press
             <strong>A better spectrograph</strong>: the same Neptune, the same
             schedule, measured to 1 m/s instead of 8.`,
      tool: {
        id: 'survey-schedule',
        values: { cadence: 0.32, n: 12, sigma: 8, mp: 0.06, seed: 1 },
        title: 'Precision, holding the schedule fixed',
        note: 'Only the uncertainty changes between the last two presets. The planet and the schedule are identical.',
      },
      checklist: [
        'With the Neptune at 8 m/s, note that the phase coverage is still perfect and the χ²/dof is still near 1',
        'Switch to 1 m/s and watch the same planet become obvious',
        'Convince yourself that nothing about the planet changed between those two presets',
      ],
      tip: 'Cadence decides whether you look at the right moments. Baseline decides what periods you could ever see. Precision decides how small a signal survives the noise. They fail independently, and a run can be ruined by any one of them.',
    },
    {
      sid: 'ambiguous-evidence',
      bind: TARGET,
      type: 'question',
      kind: 'choice',
      title: 'Ambiguous evidence',
      body: `Schedule B gave a χ²/dof near 1.9 on twelve measurements. Taken at
             face value, that is a mild excess: more scatter than the error bars
             predict, but the kind of excess that turns up by chance in perhaps
             one dataset in forty.
             \n\nYou are writing up the run.`,
      prompt: 'Which sentence is the honest one?',
      options: [
        'We detect a planet around this star.',
        'We find no evidence for a planet around this star.',
        'We see a marginal excess over the measurement noise that this schedule cannot interpret: it does not constrain a period, and it is equally consistent with a mildly underestimated error bar.',
        'The amplitude of the variation is twice the noise, so the detection is significant.',
      ],
      answer: 2,
      because: `The third. The first overstates a two-sigma-ish result badly. The
                second is wrong in the other direction: there <em>is</em> a
                planet, and one this survey happened to be blind to, so
                "no evidence" understates what the data cannot say. The fourth is
                the specific error this lesson exists to prevent - an
                amplitude-to-noise ratio is not a significance, because it does
                not account for how many points there are, how they are
                distributed, or how many other periods you implicitly searched.`,
      tip: 'Underestimated error bars are the most common cause of a mild χ² excess in real work, which is why the third option names it.',
    },

    // --- Part 5: the live star ----------------------------------------------
    {
      sid: 'do-it-to-the-real',
      bind: TARGET,
      type: 'explore',
      title: 'Do it to the real star',
      setup: RV_LAB,
      body: `The instrument above is a model of the signal. Now run a schedule
             against the simulation itself.
             \n\nOpen <strong>Radial Velocity</strong> from the Tools list, then
             tick <strong>Synthetic observing run</strong> at the bottom of the
             panel. Leave the cadence at 0.32 days and the baseline at 3.52 -
             that is Schedule A - and let it run. One orbit takes about thirteen
             seconds, so the whole programme finishes in about that time.
             \n\nThe measurements are dated in simulated days, not in frames, so
             a slow laptop and a fast one record the same twelve numbers. Nothing
             is recorded between them.`,
      checklist: [
        'Watch the measurements land on the dashed ideal curve, one at a time',
        'Untick "Show the ideal signal" and look at what a real observer would have',
        'Change the cadence to 3.52 and restart: the same panel now produces Schedule B',
      ],
      tip: 'The run restarts by itself if you change the schedule, switch stars, or move the observer: measurements taken under different conditions are not one programme, and the panel will not concatenate them.',
    },
    {
      sid: 'take-the-data-with-you',
      bind: TARGET,
      type: 'read',
      title: 'Take the data with you',
      body: `A run can be exported. Open <strong>Export data</strong> from the
             menu and choose <strong>Radial velocity measurements</strong>.
             \n\nThe file has one row per measurement and nothing in between:
             the time in days, the measured velocity, its uncertainty, which star
             it is, and the schedule that produced it. The gaps in the file are
             the gaps in the observing run, which is the point - a fit to this
             data has to cope with the same holes a real one would.
             \n\nBecause the noise comes from a seed, everyone in the room who
             uses the same seed has the same file, and everyone who uses a
             different one has a different draw of the same experiment.`,
      tip: 'The uncertainty is a column beside the velocity, not a note in a header, so it does not get left behind when the file is plotted.',
    },

    // --- Part 6: what a flat line means -------------------------------------
    {
      sid: 'the-limits-of-finding-nothing',
      bind: TARGET,
      type: 'question',
      kind: 'short',
      title: 'The limits of finding nothing',
      body: `You point the same twelve-night programme at a different star and
             get a flat dataset: χ²/dof near 1, no excess scatter at all, phase
             coverage complete for periods of a few days.`,
      prompt:
        'What can you conclude, and what can you not? Write two or three sentences, and be specific about what a flat result does rule out.',
      rubric: `Full credit for both halves. What it rules out: planets massive
               enough and close enough to produce a velocity swing comfortably
               larger than the precision, over the range of periods the schedule
               could sample - roughly, a hot Jupiter is excluded. What it does
               not rule out: smaller planets, whose signal is below the noise;
               planets on periods longer than the baseline, which appear as a
               drift too slow to see or as no change at all; planets on periods
               the cadence aliases, exactly as in Schedule B; and planets on
               orbits close to face-on, where the line-of-sight component of the
               star's motion is small however massive the planet.
               \n\nAccept any two of the four exclusions. Do not accept "there is
               no planet" without qualification, and do not accept "we learned
               nothing" - a nondetection with a stated sensitivity is a real
               result and is how upper limits are published. A strong answer says
               the conclusion is about a region of parameter space rather than
               about the star.`,
    },
    // --- Part 6: the other method, and its own version of the problem -------
    {
      sid: 'the-other-way-to-find-one',
      bind: TARGET,
      type: 'read',
      title: 'The other way to find one',
      body: `Everything so far has watched the star move. There is a second
             method, and it accounts for most of the planets we know: watch the
             star's <strong>brightness</strong>, and wait for the planet to pass
             in front of it.
             \n\nThe arithmetic is easier than the radial-velocity case. A planet
             blocks the fraction of the star's disc that it covers, so the depth
             of the dip is just a ratio of areas:
             \n\n<strong>depth = (R<sub>planet</sub> / R<sub>star</sub>)²</strong>
             \n\nNo masses, no inclination, no spectroscopy. But the same
             structural problem is waiting: whether you can see the dip has very
             little to do with whether the planet is there, and a great deal to
             do with decisions made before the observing started.`,
      tip: 'Transits also require the orbit to be near edge-on. For a hot Jupiter the odds are about one in ten; for an Earth at one AU, about one in two hundred.',
    },
    {
      sid: 'how-deep-is-an-earth',
      bind: TARGET,
      type: 'question',
      kind: 'numeric',
      title: 'How deep is an Earth?',
      body: `Earth's radius is 6,371 km and the Sun's is 695,700 km.
             \n\nWork out the depth of the transit an alien astronomer would see
             when Earth crosses the Sun, and give it in parts per million.`,
      prompt: 'Transit depth, in parts per million',
      answer: 84,
      unit: 'ppm',
      tolerance: 6,
      hints: {
        concept: `The planet blocks the fraction of the star's disc that it
                  covers, and area goes as radius squared.`,
        method: `Divide the radii, square the result, then multiply by a
                 million to turn a fraction into parts per million.`,
      },
      worked: `6371 / 695700 = 0.009158. Squared, that is 8.39 × 10⁻⁵, which is
               84 parts per million — the star dims by eight thousandths of one
               per cent for about thirteen hours, once a year.`,
      because: `About 84 ppm. Hold on to that number: it is the whole reason
                finding another Earth is hard, and it comes back in a few
                screens as a planet that a real telescope cannot reach.`,
      misconceptions: [
        {
          id: 'forgotToSquare',
          equals: 9158,
          say: `That is the ratio of the radii rather than of the areas. A
                transit blocks a disc, so the depth goes as the square.`,
        },
      ],
    },
    {
      sid: 'the-noise-budget',
      bind: TARGET,
      type: 'explore',
      title: 'What a transit is competing with',
      body: `A depth is only half the question. The other half is everything else
             that makes a star's measured brightness wobble, and this instrument
             lays those out side by side.
             \n\nIt opens on a real case at the easy end: HAT-P-7 b, a hot
             Jupiter that Kepler stared at for four years. The measured depth is
             <strong>5,900 parts per million</strong>, the transit lasts about
             four hours, and there were six hundred of them.
             \n\nThree noise terms, and they behave differently. White noise is
             independent point to point. The second is correlated across a
             single transit but independent from one transit to the next. The
             third is locked to the observation itself and never averages down
             at all. Which is which decides everything that follows.
             \n\nThe bars on the left are the noise contributions. The green line
             is the depth. The panel on the right is what the folded light curve
             would actually look like.`,
      tool: {
        id: 'transit-noise',
        values: {
          depth: 5900,
          white: 40,
          correlated: 15,
          floor: 10,
          duration: 4,
          ntransits: 600,
        },
        title: 'The transit noise budget',
        note: 'The white-noise control is the scatter of a one-hour bin, and it falls as the square root of the total in-transit time. The second term falls as the square root of the number of transits — not of the time. The third does not fall at all. The depth and duration are measured; the three noise numbers are illustrative.',
      },
      checklist: [
        'Read the depth-over-noise figure under the light curve: about 587',
        'Notice how far the green depth line sits beyond every noise bar',
        'Drag the number of transits from 600 down to 1 and watch what happens to the ratio',
        'Now drag it back up past 600 and notice how little further it improves — and read the persistent-floor row to see why',
      ],
      tip: 'A ratio of 587 is not a marginal detection being argued over. This is the regime where the interesting questions are about the planet rather than about whether it exists. Almost all of the remaining noise here is the persistent term, which is why more transits stopped buying anything.',
    },
    {
      sid: 'the-same-planet-from-the-ground',
      bind: TARGET,
      type: 'predict',
      title: 'The same planet, from the ground',
      body: `Take that identical planet — same star, same 5,900 ppm depth, same
             four-hour transit — and observe it with a good small telescope from
             the surface of the Earth instead of from space.
             \n\nThe air above the telescope is turbulent, the star rises and sets
             through changing airmass, and the detector warms and cools through
             the night.`,
      prompt:
        'Observing the same 5,900 ppm transit from the ground on three nights instead of from space, you expect the depth-over-noise to fall from 587 to about:',
      options: [
        '250 — the atmosphere costs something, but not much',
        '100 — a serious penalty, still an easy detection',
        '4 — from certainty to an argument',
        '0.1 — completely invisible',
      ],
      answer: 2,
      because: `About 4, a factor of a hundred and fifty. The planet has not
                changed and neither has its depth; what changed is that the
                night-to-night wander of the atmosphere is now the largest term
                in the budget. Three nights is not many, though — the next
                screen asks what happens with three hundred, and the answer is
                not the one this lesson used to give.`,
    },
    {
      sid: 'the-floor',
      bind: TARGET,
      type: 'explore',
      title: 'How far can patience get you?',
      body: `Switch the instrument to <strong>Same planet, from the ground</strong>.
             \n\nThe depth line has not moved. The white-noise bar is larger, as
             you would expect from a smaller telescope. But the biggest bar is
             the middle one: the night-to-night wander of the atmosphere, which
             is correlated across a whole transit and so cannot be binned away
             within one night.
             \n\nNow do the experiment that matters: crank the number of
             transits up as far as it will go, and watch two numbers — the
             ratio, and the row that says what unlimited observing would reach.`,
      tool: {
        id: 'transit-noise',
        values: {
          depth: 5900,
          white: 900,
          correlated: 2500,
          floor: 120,
          duration: 4,
          ntransits: 3,
        },
      },
      checklist: [
        'Read the depth-over-noise with three nights: about 4',
        'Drag the transit count to 300 — a hundred times more observing',
        'Read it again: about 31, an improvement of nearly eight times',
        'Now read the ceiling row: about 49, and it does not move however far you drag',
      ],
      tip: 'A hundred times more data bought a factor of eight, not a factor of ten — because part of the budget was already the persistent term. Drag further and the ratio creeps towards 49 and stops. That number, not the number of nights, is what decides whether the measurement is possible.',
    },
    {
      sid: 'white-noise-and-red-noise',
      bind: TARGET,
      type: 'read',
      title: 'Three kinds of noise, three different answers',
      body: `Noise is usually taught as two kinds. It is more useful here as
             three, because the middle one is the one that decides how much
             observing is worth doing.
             \n\n<strong>White noise</strong> is independent from one
             measurement to the next: photon counting, detector read noise.
             Independent errors partly cancel, so averaging N of them shrinks
             the noise by √N. It falls with the <em>total time</em> spent in
             transit, however that time is accumulated.
             \n\n<strong>Correlated within a transit</strong> is the awkward
             one: granulation, a spot crossing, the detector warming through a
             night. These wander over <em>hours</em> — the length of a transit —
             so binning more finely inside one transit gains you nothing. But a
             transit three weeks later is a fresh draw of the same process, so
             this term falls as the square root of the <em>number of
             transits</em>. Not of the time: ten one-hour transits beat one
             ten-hour transit for this term, and they are equal for white noise.
             \n\n<strong>Persistent</strong> is anything locked to the
             observation itself: a faint star inside the aperture, a detector
             pattern the target lands on every orbit, a bias in the pipeline.
             It is the same wrong number every time, so averaging does nothing
             whatsoever. This is the only true floor.
             \n\nSo the answer to "will more observing help?" is <em>usually
             yes, and then eventually no</em>. It helps until the persistent
             term dominates, and the ceiling row in the panel tells you where
             that is before you spend the nights.`,
      tip: 'This is why space telescopes are worth their cost, and it is not only that the atmosphere is gone. Above it the hours-correlated term is far smaller and the persistent term is far better characterised — and a systematic you can measure is a systematic you can subtract.',
    },
    {
      sid: 'assumptions-of-the-model',
      bind: TARGET,
      type: 'read',
      title: 'What this model is pretending',
      body: `The panel makes two assumptions about the middle term and they are
             both extreme.
             \n\nIt treats that noise as <strong>perfectly correlated</strong>
             across one transit — so a transit gives one independent sample
             however finely you bin it — and <strong>perfectly
             independent</strong> between transits, so N transits give exactly
             N samples. Real noise is neither. A spot group lives for weeks and
             will be partly the same on consecutive nights. A thermal cycle may
             repeat with the spacecraft's orbit and so be partly persistent.
             \n\nThe truth is a correlation function, and the two ends of it are
             what the panel shows: the middle term is the best case for more
             observing, the persistent term is the worst. A real analysis has to
             measure where between them the noise actually sits, usually by
             looking at how the scatter of binned points falls with bin size and
             seeing where it stops following √N.
             \n\nThat is worth knowing before you trust a number from a panel
             like this one. The model is a caricature chosen to make the two
             limits visible, not a noise budget for any real instrument.`,
      tip: 'The standard diagnostic is a "beta factor": the ratio of the actual scatter of binned residuals to what pure white noise would predict. Published transit papers routinely quote it, and values of 1.5 to 3 are common — which is to say the truth is usually nearer the optimistic end than the pessimistic one, but never at it.',
    },
    {
      sid: 'read-two-budgets',
      bind: TARGET,
      type: 'measure',
      title: 'Two budgets, side by side',
      body: `Read the depth-over-noise for two of the presets, and read the
             largest single noise contribution in each.`,
      tool: { id: 'transit-noise' },
      fields: [
        {
          id: 'keplerRatio',
          label: 'Hot Jupiter with Kepler: depth over noise',
          unit: '',
          hint: 'ratio',
        },
        {
          id: 'groundRatio',
          label: 'The same planet from the ground: depth over noise',
          unit: '',
          hint: 'ratio',
        },
        {
          id: 'groundWorst',
          label: 'The largest noise term from the ground, in ppm',
          unit: 'ppm',
          hint: 'ppm',
        },
      ],
      validate: v => {
        if (
          !Number.isFinite(v.keplerRatio) ||
          !Number.isFinite(v.groundRatio)
        ) {
          return null;
        }
        if (v.groundRatio > v.keplerRatio) {
          return {
            level: 'warn',
            message:
              'Those look swapped. The space-based figure is the large one — about 587 against about 4.',
          };
        }
        return {
          level: 'ok',
          message:
            'A factor of about 150 between them, and the same planet in both. The within-transit bar is what did it — and unlike the persistent one, that bar does come down with more nights.',
        };
      },
    },
    {
      sid: 'why-more-nights-do-not-help',
      bind: TARGET,
      type: 'question',
      kind: 'choice',
      title: 'Where does patience stop paying?',
      body: `From the ground, three transits gave a ratio of about 4 and three
             hundred gave about 31 — a real improvement, but not the factor of
             ten that a pure square-root law would predict. Drag further and it
             creeps towards 49 and stops.`,
      prompt: 'The best explanation is:',
      options: [
        'The extra data was lower quality than the first three nights',
        'Part of the budget is persistent, so the terms that do average down are running out of room',
        'Three hundred transits is still too few for the square root to matter',
        'The transit depth changes from night to night',
      ],
      answer: 1,
      because: `Two of the three terms fall with more observing and one does
                not. At three nights the atmosphere's night-to-night wander
                dominates at about 1,440 ppm and the persistent term is only
                120; by three hundred nights the wander is down to 144 and the
                persistent term is the largest thing left. The square root law
                was never wrong — it applies to two of the three terms, and the
                third is what sets the ceiling of 49. Deciding whether that
                ceiling is high enough is what tells you whether the nights are
                worth spending.`,
    },
    {
      sid: 'the-edge-of-what-tess-can-do',
      bind: TARGET,
      type: 'explore',
      title: 'The edge of what a survey can do',
      body: `Now three real cases from TESS, in order of difficulty.
             \n\n<strong>Super-Earth</strong> is π Mensae c: twice Earth's radius,
             around a star bright enough to see with the naked eye. Depth 290
             ppm, and a genuine detection.
             \n\n<strong>Rocky planet in the habitable zone</strong> is TOI-700 d:
             about Earth's size, but around a small red star, so the depth is a
             respectable 547 ppm as measured by TESS. Its problem is a 37-day
             period — roughly one
             transit per TESS sector, and it took a year of them.
             \n\n<strong>Earth twin</strong> is the 84 ppm you computed earlier,
             around a Sun-like star. A thirteen-hour transit, once a year.`,
      tool: { id: 'transit-noise' },
      checklist: [
        'Super-Earth: depth over noise about 10.5 — a real detection, and not a comfortable one',
        'Rocky planet: about 2.7, from eleven transits gathered over a year',
        'Earth twin: about 0.6 — the transit is smaller than the noise on it',
        'On the Earth twin, drag the transits to 200: the ratio reaches about 2.5 and its ceiling is 2.8',
        'Notice the Earth twin has by far the longest transit and it barely helps',
      ],
      tip: 'TOI-700 d is a real planet, found in 2020, and finding it took eleven sectors of TESS data plus a reanalysis after an error in the original stellar parameters.',
    },
    {
      sid: 'what-would-it-take',
      bind: TARGET,
      type: 'question',
      kind: 'choice',
      title: 'What would it take?',
      body: `The Earth twin sits at about 0.6 — the dip is smaller than the
             uncertainty on it. A hundred times more observing takes it to about
             2.5, and its ceiling — what unlimited observing would reach — is
             2.8. Not zero, and not a detection either.`,
      prompt:
        'To turn that into a detection, the thing that would actually have to change is:',
      options: [
        'More transits, until the square root law wins',
        'A longer transit, so each event contributes more data',
        'A lower persistent floor — a more stable instrument, or a better-characterised systematic',
        'Nothing: an 84 ppm transit is below any possible measurement',
      ],
      answer: 2,
      because: `The persistent floor. That is what caps this measurement however
                long anyone observes, so lowering it is the only move that
                changes the answer — which is precisely what a purpose-built
                mission does.
                The fourth option is worth rejecting explicitly: 84 ppm is not
                below what is physically measurable, and Kepler routinely
                measured shallower transits than that. It is below what
                <em>this</em> instrument can reach around <em>this</em> star, and
                the difference between those two statements is the whole subject
                of this lesson.`,
    },

    {
      sid: 'what-you-decided-before-you',
      bind: TARGET,
      type: 'read',
      title: 'What you decided before you looked',
      body: `Two methods, and the same lesson twice.
             \n\nTwelve measurements. One instrument. One planet, which was there
             the whole time.
             \n\nSchedule A established beyond reasonable argument that this
             star's velocity is not constant, over a cycle it sampled from end to
             end. That is not the same as having detected a planet — it is the
             evidence on which a planet becomes much the best explanation, once
             the variation is shown to repeat on a definite period and the other
             causes are ruled out.
             \n\nSchedule B, with eleven times the baseline and not one
             measurement fewer, could not establish even that. It is not empty:
             it bounds how large a velocity swing the star can have had at the
             two phases it happened to visit, and that is a real if narrow
             constraint. What it cannot do is say anything about the other eight
             tenths of the cycle, which is where this planet lives.
             \n\nNeither outcome is a failure of the data. Both were decided
             months earlier, when someone wrote down a cadence. The observing
             schedule is part of the experiment, and like the rest of the
             experiment it can be designed well or badly before a single photon
             arrives.
             \n\nThe transit half made the same point with a different knob. One
             planet, one depth, and a detection at 587 sigma or an argument at
             4 depending entirely on what was underneath the measurement. And
             where the radial-velocity failure could be repaired by observing
             differently, the photometric one mostly cannot: past the correlated
             noise floor, more nights buy more data at the same precision and
             nothing else. An Earth twin is not undetectable in principle — it is
             undetectable with that instrument, around that star, and improving
             any of the three is a different project from being patient.
             \n\nWhich is the honest summary of both halves. The question
             "can you detect this planet?" is never only about the planet.`,
      tip: 'Real surveys defend against the radial-velocity failure with deliberately irregular spacing, several longitudes, and checking any candidate period against the cadence that found it. Against the photometric one they defend by going to space, by choosing quiet stars, and by modelling the correlated noise instead of pretending it will average away.',
    },
  ],
};

export default DETECT_THIS_PLANET;
