// =============================================================================
// Twelve Nights
// -----------------------------------------------------------------------------
// The companion to "Design the Schedule", and its opposite in one respect that
// decides everything else. There, the student compares two schedules somebody
// else wrote and learns that placement matters. Here they write the schedule
// themselves, under the constraint a real time allocation imposes, and find
// that most of the placement was decided for them before they sat down.
//
// The constraint is the lesson
// -----------------------------------------------------------------------------
// HD 209458 is at declination +18.9. La Silla is at latitude -29.3. The target
// therefore culminates at 41.9 degrees, never gets better than airmass 1.5,
// and is above airmass 2 for 4.96 hours a night - a fifth of a day. Every
// epoch a student can book falls inside that fifth, once per night, and the
// window opens 3.9 minutes earlier each night because it is anchored to the
// target's hour angle and not to the clock.
//
// So the twelve epochs lie on a comb whose spacing is one SIDEREAL day, and
// the schedule has an alias at 1.00274 cycles a day no matter how the student
// arranges it. The aliases of the 3.5247-day planet under that comb are at
// 1.3908 d, 0.7773 d and 0.5808 d - and those are exactly the wrong answers
// the run comes back with.
//
// What the student can and cannot do about it
// -----------------------------------------------------------------------------
// Measured with js/observingWindow.js, js/rvSchedule.js and js/rvFit.js, 84
// m/s on 8 m/s errors, sixteen noise draws per row:
//
//   placement          epochs  nights   W(sidereal)   recovered
//   window center        12      20        1.000        1 / 16
//   window center        60      84        0.971       13 / 16
//   both window ends     12      20        0.696       13 / 16
//   both window ends     20      28        0.702       16 / 16
//   both window ends     60      84        0.810       16 / 16
//
// Two things fall out of that table and the lesson is built on both.
//
// The first is that WHERE IN THE WINDOW beats HOW MANY NIGHTS, and not by a
// little: twelve epochs using the full width do better than sixty epochs over
// twelve weeks taken at the best moment of each night.
//
// The second is that the window power at the sidereal day never falls. It is
// 0.70 at twelve epochs and 0.81 at sixty. Adding nights from one site does
// not remove the alias and cannot; the fix is a second longitude, and the
// lesson ends by saying so rather than by implying that persistence would
// have been enough.
//
// The seam, stated in step 1
// -----------------------------------------------------------------------------
// The windows are real - real site, real target, real dates, computed against
// published ephemerides. The velocities are simulated. The only thing that
// crosses between them is the list of times, and the lesson says this out loud
// in its first screen rather than letting a student infer that Gravitas is
// modeling the Earth's rotation. It is not.
// =============================================================================

/** The same lab the other radial-velocity lessons observe in. */
const RV_LAB = {
  scenario: 'Exoplanet Characterization Lab',
  seed: 'twelve-nights',
  camera: { zoom: 55, pan: { x: 0, y: 0 } },
  paused: false,
};

/** Bound by name, so the chips select the star the plan is about. */
const TARGET = {
  star: { name: 'HD 209458' },
  planet: { name: 'HD 209458 b' },
};

/** The planner, with nothing preset: choosing is the exercise. */
const PLANNER = { id: 'observing-planner' };

const TWELVE_NIGHTS = {
  id: 'twelve-nights',
  thumbnail: 'images/scenarios/exoplanet-characterization-lab.webp',
  series: 'Detecting exoplanets',
  title: 'Twelve Nights',
  subtitle:
    'You get to choose when to look, and most of the choice has already been made',
  duration: '40-50 min',
  level: 'Introductory astronomy',
  tags: ['exoplanets', 'observing'],
  lock: { placement: true, inspector: true },
  summary:
    'A committee gives you twelve nights on one star from one telescope in Chile. The star is above the airmass limit for five hours a night and the window opens four minutes earlier every night, so your twelve measurements land on a comb whose spacing you did not choose. Plan the run in the observing planner, watch the spectral window before you have a single velocity, then commit two plans to the live spectrograph and find that one of them returns a planet with the wrong period. Finish by working out what would actually fix it — and why more nights would not.',
  objectives: [
    'Compute when a target is observable from a given site, and say which of the three constraints is binding',
    'Explain why an observing window opens four minutes earlier each night',
    'Read a spectral window and say what a peak near one means for the schedule that produced it',
    'Predict the aliases of a period under a once-a-night comb, and recognize them in a result',
    'Show that where an epoch sits inside its window changes the answer more than how many nights the run covers',
    'State what would remove a one-day alias, and why a longer run from the same site would not',
  ],
  steps: [
    // --- Part 1: what you were given --------------------------------------
    {
      sid: 'the-allocation',
      bind: TARGET,
      type: 'read',
      title: 'Twelve nights',
      setup: RV_LAB,
      body: `A time allocation committee has given you <strong>twelve
             nights</strong> on one star: HD&nbsp;209458, from
             <strong>La&nbsp;Silla</strong> in Chile, spread anywhere you like
             across a twenty-night run in September. One measurement a night,
             8&nbsp;m/s each. You may choose the nights and you may choose the
             hour.
             \n\nThere is a catch, and it is not a small one. HD&nbsp;209458
             sits at declination <strong>+18.9&deg;</strong> and La&nbsp;Silla
             at latitude <strong>&minus;29.3&deg;</strong>. The target never
             rises higher than <strong>41.9&deg;</strong> above the horizon, so
             it is never seen through less than one and a half atmospheres, and
             it is above the usual <strong>airmass&nbsp;2</strong> limit for
             only part of each night.
             \n\nOne thing to be clear about before you start, because the rest
             of the lesson depends on it. <strong>The sky here is real and the
             star is not.</strong> The observing windows are computed for the
             real site, the real target and real dates in September 2026,
             against published ephemerides. The velocities you will collect
             come from the simulation on screen. The only thing that crosses
             between the two is the list of times &mdash; which is exactly what
             crosses between a planning tool and a telescope.`,
      tip: 'Gravitas does not model the Earth’s rotation. js/observingWindow.js computes it separately, from the same spherical trigonometry an observatory uses, and hands the schedule over as a list of numbers.',
    },
    {
      sid: 'look-at-the-windows',
      bind: TARGET,
      type: 'explore',
      title: 'What you actually get',
      setup: RV_LAB,
      tool: PLANNER,
      body: `Open the planner. Each row is one night of the allocation. The
             dim bar is <strong>astronomical night</strong> &mdash; the Sun
             more than 18&deg; below the horizon. The bright part of it is when
             the target is <em>also</em> above the airmass limit. That bright
             part is your whole budget for the night.
             \n\nLook down the page before you touch anything. The bright bars
             are not stacked vertically; they lean.`,
      checklist: [
        'Find the bright window on night 1, and find it again on night 20',
        'Work out roughly how much earlier the window opens each night',
        'Drag the airmass limit from 2 to 3 and watch the windows widen',
        'Drag it to 1.5 and watch them nearly close',
        'Put it back to 2',
      ],
      tip: 'The window is set by the target’s hour angle, and hour angle is kept by the stars rather than by the Sun. That is the whole reason it leans.',
    },
    {
      sid: 'measure-the-window',
      bind: TARGET,
      type: 'measure',
      title: 'Measure the budget',
      tool: PLANNER,
      body: `Read two numbers off the planner with the airmass limit at
             <strong>2</strong>. Both are in the readout under the figure.`,
      fields: [
        {
          id: 'windowHours',
          label: 'Usable window per night',
          unit: 'h',
          hint: '4.96',
        },
        {
          id: 'driftMinutes',
          label: 'How much earlier the window opens each night',
          unit: 'min',
          hint: '3.9',
        },
      ],
      validate: v => {
        if (
          !Number.isFinite(v.windowHours) ||
          !Number.isFinite(v.driftMinutes)
        ) {
          return null;
        }
        if (Math.abs(v.windowHours - 4.96) > 0.3) {
          return {
            level: 'warn',
            message:
              'That is not the window at airmass 2. Check the airmass slider is at 2.0 and read the first row of the readout.',
          };
        }
        if (Math.abs(v.driftMinutes - 3.93) > 0.6) {
          return {
            level: 'warn',
            message:
              'Close, but check the second readout row. The number you want is a few minutes, not a few hours.',
          };
        }
        return {
          level: 'ok',
          message:
            'Five hours a night, and the window walks 3.9 minutes earlier each time. Both numbers are about to matter more than they look.',
        };
      },
      tip: 'Four minutes a day is the difference between the solar day and the sidereal day. Over the twenty nights of the run the window moves by about an hour and a quarter.',
    },

    // --- Part 2: the comb you did not choose ------------------------------
    {
      sid: 'predict-the-comb',
      bind: TARGET,
      type: 'predict',
      reveal: 'the-three-plans',
      title: 'Before you plan anything',
      body: `You have twelve measurements to place. Every one of them has to
             fall inside a five-hour window, and there is exactly one such
             window per night.
             \n\nThe <strong>spectral window</strong> of a schedule is computed
             from the observation <em>times alone</em> &mdash; no velocities go
             into it at all. A peak of 1 at some frequency means the schedule
             cannot tell a signal at that frequency from no signal: two
             completely different stars would produce the same twelve numbers.
             \n\nCommit before you look at the lower panel of the planner.`,
      prompt:
        'Whatever twelve times you choose, the spectral window will have a large peak at about…',
      options: [
        'no particular frequency: the times are yours to choose, so the window is whatever you make it',
        'one cycle per day, because there is one window per night and everything you book is inside one',
        'one cycle per twenty days, the length of the run',
        'the planet’s own frequency, because that is what the schedule is being used to find',
      ],
      answer: 1,
      because: `One visit per night means the times are a comb with a spacing
                of about a day, and a comb has a comb for a spectral window: a
                peak at every multiple of one cycle a day. You can move each
                epoch by a few hours within its window and you can skip nights,
                but you cannot put a measurement in the middle of the
                afternoon. The peak is a property of where the telescope is and
                what it is pointed at, not of how careful you are.`,
    },
    {
      sid: 'the-three-plans',
      bind: TARGET,
      type: 'explore',
      title: 'Three plans',
      tool: PLANNER,
      body: `Now the lower panel. It is the spectral window of the twelve
             epochs the planner has placed, out to two cycles a day, with the
             sidereal-day frequency marked.
             \n\nTry the three presets in order and watch the number labeled
             <strong>window power at the sidereal day</strong>. Then take the
             <em>Use this much of each window</em> slider and move it slowly
             from 0 to 1 with the span at 20 nights.`,
      checklist: [
        'Twelve nights in a row, best moment: read the window power',
        'Spread out over twenty nights, best moment: read it again',
        'Spread out, both ends of each window: read it a third time',
        'Sweep the window-use slider from 0 to 1 and watch the peak fall',
        'Check the frequency the tallest peak sits at — it is not 1.000',
      ],
      tip: 'Spreading the same twelve nights over twenty rather than twelve changes the baseline and therefore the resolution. It barely touches the peak at one cycle a day, which is a different problem.',
    },
    {
      sid: 'measure-the-window-power',
      bind: TARGET,
      type: 'measure',
      title: 'Two plans, two windows',
      tool: PLANNER,
      requires: ['predict-the-comb'],
      body: `Record the window power at the sidereal day for two of the
             presets. Both use the same twelve nights spread over twenty; they
             differ only in <em>where inside each night's window</em> the
             measurement is taken.`,
      fields: [
        {
          id: 'wCentre',
          label: 'Spread out, best moment (window use 0)',
          hint: '0.998',
        },
        {
          id: 'wEnds',
          label: 'Spread out, both ends (window use 1)',
          hint: '0.701',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.wCentre) || !Number.isFinite(v.wEnds))
          return null;
        if (v.wCentre < 0.9) {
          return {
            level: 'warn',
            message:
              'The best-moment plan should be very close to 1. Check the window-use slider is at 0 and the span at 20.',
          };
        }
        if (v.wEnds >= v.wCentre) {
          return {
            level: 'warn',
            message:
              'The second number should be the smaller of the two. Set the window-use slider to 1 and read it again.',
          };
        }
        return {
          level: 'ok',
          message:
            'From essentially 1 down to about 0.7. Worth holding on to: 0.7 is a large improvement and it is still a very big peak.',
        };
      },
    },
    {
      sid: 'why-not-one-day',
      bind: TARGET,
      type: 'question',
      kind: 'choice',
      title: 'Why 1.00274 and not 1',
      requires: ['measure-the-window-power'],
      // The planner stays on screen: the answer to this question is the
      // dashed line it draws, and asking it with the figure put away would
      // be asking the student to remember a number rather than read one.
      tool: PLANNER,
      body: `The tallest peak is not at 1.000 cycles a day. It is at
             <strong>1.00274</strong>, which is one cycle per
             <strong>0.99727 days</strong> &mdash; 23 hours 56 minutes and 4
             seconds.`,
      prompt: 'That number is the sidereal day. Why is the comb spaced by it?',
      options: [
        'Rounding: the planner samples the window on a grid and the peak lands slightly off',
        'Because the window is set by the target’s hour angle, which is kept by the stars; the Earth returns the target to the same place in 23h56m, not 24h',
        'Because the planet’s orbital period is not a whole number of days',
        'Because the Sun moves, so astronomical twilight is four minutes later each night',
      ],
      answer: 1,
      because: `The window opens when the target reaches the airmass limit, and
                that is a statement about where the target is, not about where
                the Sun is. The Earth takes 23h56m04s to bring a star back to
                the same hour angle and 24h to bring the Sun back, and the four
                minutes between them is the drift you measured in step 3.
                \n\nThis is worth noticing rather than filing away: the comb in
                your schedule is stamped with the rotation period of the Earth
                relative to the fixed stars. It did not come from your habits.
                It came from the sky.`,
    },

    // --- Part 3: commit, and find out -------------------------------------
    {
      sid: 'predict-which-plan-wins',
      bind: TARGET,
      type: 'predict',
      reveal: 'read-what-you-got',
      title: 'Before you observe',
      body: `The planet is HD&nbsp;209458&nbsp;b, and its period is
             <strong>3.5247 days</strong>. You are being told because the point
             of this lesson is elsewhere.
             \n\nA comb at 1.00274 cycles a day puts an alias of that planet at
             every frequency <em>f</em>&nbsp;&plusmn;&nbsp;<em>n</em>&nbsp;&times;&nbsp;1.00274.
             Working the nearest two out: <strong>1.391 d</strong> and
             <strong>0.777 d</strong>.
             \n\nYou are about to run both plans on the live spectrograph, with
             the same star, the same 8 m/s errors and the same noise seed. Only
             the twelve times differ.`,
      prompt: 'What will the two runs return?',
      options: [
        'Both return 3.5247 days: the planet is real and twelve measurements is plenty',
        'The best-moment plan returns an alias — 0.78 or 1.39 days — and the both-ends plan usually returns about 3.52',
        'Both return an alias, because the comb is there in either plan',
        'Neither returns anything: twelve points cannot constrain a period at all',
      ],
      answer: 1,
      because: `A window power of almost exactly 1 means the alias fits the
                data as well as the truth does, so which one comes out lowest is
                decided by the noise rather than by the planet. At 0.7 the truth
                usually wins. Note the word "usually": the peak is smaller, not
                gone, and this is a lesson about improving your odds rather than
                about removing a problem.`,
    },
    {
      sid: 'commit-and-observe',
      bind: TARGET,
      type: 'explore',
      title: 'Commit the schedule',
      setup: RV_LAB,
      requires: ['predict-which-plan-wins'],
      // The planner stays open here rather than being put away: each of the
      // two runs starts by copying a fresh epoch list out of it, so it is an
      // instrument of this step and not only of the ones before it.
      tool: PLANNER,
      body: `Open <strong>Radial Velocity</strong> from the Tools list and tick
             <strong>Synthetic observing run</strong>. Set
             <strong>Uncertainty 8 m/s</strong>, <strong>Noise seed
             twelve-1</strong>, and <strong>Schedule: Explicit times</strong>.
             \n\nNow go back to the planner, set it to <em>Spread out, best
             moment</em>, and copy the epoch list out of the last readout row
             into the schedule's <strong>Epoch list</strong> field. Let it run,
             and write down the best period.
             \n\nThen change the planner to <em>Spread out, both ends</em>,
             copy the new list into the same field, and run it again. Leave
             everything else exactly as it was.
             \n\nThe noise is keyed to the epoch <em>index</em>, so the first
             measurement of the second run gets the same draw as the first
             measurement of the first. The two runs differ in the twelve times
             and in nothing else.`,
      checklist: [
        'Set the planner to Spread out, best moment and copy its epoch list',
        'Paste it into Epoch list, run, and write down the best period',
        'Set the planner to Spread out, both ends and copy the new list',
        'Paste that in, run again, and write down the second best period',
        'Check the seed, the uncertainty and the count are the same in both runs',
      ],
      tip: 'Two runs rather than the panel’s Compare mode: the comparison holds one epoch list between both arms, so it cannot put two different explicit schedules side by side. Running them in sequence with the same seed is the controlled version of the same thing.',
    },
    {
      sid: 'read-what-you-got',
      bind: TARGET,
      type: 'measure',
      title: 'What the two plans returned',
      requires: ['predict-which-plan-wins'],
      body: `Record the best period from each run. Your numbers will not match
             anybody else's to the digit &mdash; a different simulation speed
             lands the frames differently &mdash; but they should be the same
             story.`,
      fields: [
        {
          id: 'periodCentre',
          label: 'Best moment: best period',
          unit: 'd',
          hint: '0.78',
        },
        {
          id: 'periodEnds',
          label: 'Both ends: best period',
          unit: 'd',
          hint: '3.52',
        },
      ],
      validate: v => {
        if (
          !Number.isFinite(v.periodCentre) ||
          !Number.isFinite(v.periodEnds)
        ) {
          return null;
        }
        const alias = p =>
          [0.5808, 0.7773, 1.3908].some(a => Math.abs(p - a) < 0.08);
        const truth = p => Math.abs(p - 3.5247) < 0.15;
        if (truth(v.periodCentre) && truth(v.periodEnds)) {
          return {
            level: 'ok',
            message:
              'Both arms found the planet, which happens: at a window power of 1 the alias and the truth fit equally well, so a favourable noise draw can hand you the right answer. Change the seed to twelve-2 and run the best-moment plan again — it will not survive three seeds.',
          };
        }
        if (!truth(v.periodEnds)) {
          return {
            level: 'warn',
            message:
              'The both-ends plan misses about one time in five, so this is a real outcome rather than a mistake — but check the epoch list you pasted came from the window-use-1 preset before you accept it. Then try seed twelve-2.',
          };
        }
        if (alias(v.periodCentre)) {
          return {
            level: 'ok',
            message:
              'That is an alias, not a planet: 0.78 and 1.39 days are 3.5247 days reflected about the sidereal frequency. The star never did anything with that period. Your schedule did.',
          };
        }
        return {
          level: 'ok',
          message:
            'Recorded. Compare what you got against 3.5247 d and against its aliases at 1.391 d and 0.777 d, and say which of the three your first run actually found.',
        };
      },
    },

    // --- Part 4: what would fix it ----------------------------------------
    {
      sid: 'sixty-nights-would-not-help',
      bind: TARGET,
      type: 'question',
      kind: 'choice',
      title: 'Ask the committee for more nights',
      requires: ['read-what-you-got'],
      body: `The obvious response to a marginal result is to ask for more
             time. Suppose the committee comes back with <strong>sixty
             nights</strong> over twelve weeks instead of twelve nights over
             three, on the same star from the same telescope.
             \n\nThe table below was measured, not guessed: sixteen noise draws
             per row, the same planet and the same 8 m/s each time.
             \n\n<strong>12 epochs, window center:</strong> window power 1.000,
             recovered 1/16.
             \n<strong>60 epochs, window center:</strong> window power 0.971,
             recovered 13/16.
             \n<strong>12 epochs, both ends:</strong> window power 0.696,
             recovered 13/16.
             \n<strong>60 epochs, both ends:</strong> window power 0.810,
             recovered 16/16.`,
      prompt:
        'What do the four rows say about what the extra nine weeks bought?',
      options: [
        'Sixty nights is decisively better: more data is more data',
        'Almost nothing that the placement did not already buy — twelve well-placed epochs match sixty badly-placed ones, and the sidereal peak never falls below 0.7 in any row',
        'Nothing at all: the number of epochs has no effect on anything',
        'The extra nights hurt, because the window power went up',
      ],
      answer: 1,
      because: `Twelve epochs using the full width of the window do as well as
                sixty taken at the best moment of each night &mdash; 13 out of
                16 either way. The decision that mattered was made in an
                afternoon, and it was about where inside a five-hour window to
                point the telescope.
                \n\nAnd look at the window power down the column: 1.000, 0.971,
                0.696, 0.810. It never goes below about 0.7, whatever you do.
                More nights from one site add epochs to the same comb; they
                cannot take the comb away. That is not a statement about this
                star or this telescope. It is arithmetic about one longitude.`,
    },
    {
      sid: 'what-would-actually-fix-it',
      bind: TARGET,
      type: 'question',
      kind: 'short',
      title: 'So what would fix it',
      requires: ['read-what-you-got'],
      body: `You have a schedule with a peak at 1.00274 cycles a day that you
             cannot get below about 0.7, and a period that might be 3.52 days
             or might be 0.78.`,
      prompt:
        'In two or three sentences: what change to the observing program would actually remove the one-day alias, and why does it work when more nights do not?',
      rubric:
        'Full credit needs the mechanism, not just the remedy. The remedy is observations from a site at a different longitude — a second telescope some hours east or west, or a network of them — so that the target is observable at hour angles the first site can never reach, and the times stop being a once-per-sidereal-day comb. A space telescope, or a target far enough south to be circumpolar from La Silla and therefore observable across the whole night, earn the same credit for the same reason: in each case the constraint that produced the comb is removed rather than sampled more often. The "why" is that the alias is a property of the sampling pattern and not of the amount of data, so adding epochs at the same phase of the same comb reinforces the peak instead of filling it in — which is what the 60-epoch row shows. Credit an answer that says the window function has to be changed rather than the noise reduced. Do NOT credit longer exposures, a bigger telescope, better instrument precision, or simply "more nights", and do not credit "use an irregular cadence" on its own unless it says what would make the times irregular given that there is one window a night.',
      tip: 'This is why radial-velocity and transit follow-up programs are organized as longitude networks rather than as single sites with more time.',
    },
    {
      sid: 'what-the-sky-decided',
      bind: TARGET,
      type: 'read',
      title: 'What the sky decided',
      body: `Twelve nights, one star, one instrument, one noise draw. You chose
             the nights and you chose the hours, and a great deal of the
             schedule was written before you arrived.
             \n\nThe target is up for a fifth of a day. The window walks four
             minutes a night because the Earth turns against the stars rather
             than against the Sun. Those two facts put a peak in your spectral
             window at 1.00274 cycles a day, and that peak put an alias of a
             3.5247-day planet at 0.777 days &mdash; which is the number one of
             your runs came back with.
             \n\nWhat you could decide was where inside those five hours to
             look, and it turned out to be the biggest decision available:
             enough to take the recovery rate from 1 in 16 to 13 in 16 on
             exactly the same twelve nights. What you could not decide was
             whether to have the comb at all. For that you need a second
             longitude.
             \n\nThe honest form of a period from a run like this is not "the
             planet has a period of 3.52 days". It is "these twelve times, from
             this site, on this star, with this seed, over this search range,
             gave 3.52 days, and the schedule has a window peak of 0.7 at the
             sidereal frequency" &mdash; because somebody who knows that last
             clause knows which other answers were nearly as good.`,
      tip: 'The epoch list, the seed, the uncertainty and the search range all travel with the exported CSV and with a notebook entry saved from the workspace. The window peak is the one you have to quote yourself.',
    },
  ],
};

export default TWELVE_NIGHTS;
