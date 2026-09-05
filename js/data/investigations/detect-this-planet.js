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
// unambiguous. The second - eleven times the baseline, the same number of
// nights, the same instrument - is a shrug. Nothing about the planet changed.
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

const DETECT_THIS_PLANET = {
  id: 'detect-this-planet',
  thumbnail: 'images/scenarios/exoplanet-characterization-lab.webp',
  series: 'Detecting exoplanets',
  title: 'Can You Detect This Planet?',
  subtitle: 'Same planet, same twelve nights, two different answers',
  duration: '15-20 min',
  level: 'Introductory astronomy',
  lock: { placement: true, inspector: true },
  summary:
    'A planet is either there or it is not, but whether you find it depends on choices you make before you take a single measurement. Plan two observing runs of the same star with the same instrument and the same number of nights, and discover that one of them finds a Jupiter and the other cannot tell you anything at all.',
  objectives: [
    'Predict whether an observing schedule can detect a given planet, and say which of cadence, baseline and precision decides it',
    'Explain why more measurements over a longer baseline can be worse than fewer over a shorter one',
    'State what excess scatter in a radial-velocity dataset does and does not establish',
    'Say what a flat radial-velocity dataset rules out, and what it leaves open',
  ],
  steps: [
    // --- Part 1: the question is about the schedule, not the planet ---------
    {
      type: 'read',
      title: 'Twelve nights',
      setup: RV_LAB,
      body: `You have been given twelve nights on a spectrograph. Not twelve
             consecutive nights necessarily - twelve nights, to use when you
             like, over as long a run as you care to ask for.
             \n\nThe target is the star on screen. Somewhere around it, too faint
             to see, there may or may not be a planet. Your twelve measurements
             of the star's velocity are all the evidence you are going to get.
             \n\nThe usual question is <em>is there a planet</em>. This lesson
             asks a different one, and it is the question an observer actually
             has to answer first: <strong>would this schedule find it if there
             were?</strong>`,
      tip: 'Time on a large telescope is allocated in nights, months in advance. The schedule is decided before anyone knows what the data will show.',
    },
    {
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
        'Compare the scatter of the measurements with the scatter expected from noise alone',
        'Set the uncertainty to zero and watch the points fall exactly on the dashed curve',
      ],
      tip: 'The right-hand panel is folded on the true period. A real survey does not know the period, which is part of why this is harder in practice than it looks here.',
    },
    {
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
      type: 'explore',
      title: 'The same planet, invisible',
      body: `Switch the preset to <strong>Schedule B: one cycle apart</strong>.
             \n\nThe left panel now covers thirty-nine days instead of three and
             a half, and the twelve measurements are almost a flat line. The
             right panel shows why: fold them onto the cycle and they pile up in
             two bins out of ten.`,
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
    {
      type: 'read',
      title: 'What you decided before you looked',
      body: `Twelve measurements. One instrument. One planet, which was there the
             whole time.
             \n\nSchedule A found it beyond argument. Schedule B, with eleven
             times the baseline and not one measurement fewer, came home with a
             shrug - and a student handed only Schedule B's data, with no
             knowledge of the answer, would have written an honest paper saying
             they had found nothing conclusive.
             \n\nThat is not a failure of the data. It is a decision that was
             made months earlier, when someone wrote down a cadence. The
             observing schedule is part of the experiment, and like the rest of
             the experiment it can be designed well or badly before a single
             photon arrives.`,
      tip: 'Real surveys defend against this by deliberately irregular spacing, by observing from several longitudes, and by checking any candidate period against the cadence that found it.',
    },
  ],
};

export default DETECT_THIS_PLANET;
