// =============================================================================
// Design the Schedule
// -----------------------------------------------------------------------------
// The hands-on companion to "Can You Detect This Planet?". That lesson makes
// the argument with an analytic widget, which is the right way to make it: the
// comparison takes seconds and the student can run it a dozen times. This one
// makes the student do it for real, on the live spectrograph, against the
// simulated star, with a run that takes minutes and cannot be rewound.
//
// The spine is one controlled comparison, run inside the Radial Velocity
// panel's own Compare mode. Two schedules observe the SAME star over the SAME
// frames with the same eight observations, the same 24.673-day baseline, the
// same 8 m/s uncertainty and the same noise seed. The only difference between
// the two recordings is when the telescope looked. One of them recovers the
// 3.5247-day planet; the other cannot establish that the velocity varies at
// all, because its eight nights land 3.52 days apart and therefore all at the
// same orbital phase.
//
// Three things this lesson is built to prevent, in the order they are usually
// got wrong:
//
//   1. Reading the result before committing to a prediction. The predict step
//      comes before the run, and the step that reads the numbers declares it
//      as a `requires`, so an assignment that includes the reading has to
//      include the prediction too.
//   2. Turning one draw into a ranking. Each arm is one noise draw. The panel
//      says so in every comparison it prints and the questions here make the
//      student say it back. The seed step exists so the claim can actually be
//      tested rather than asserted.
//   3. Quoting a period without the range it was found in. The panel reports
//      the search range and flags a fit that lands on its edge; the last part
//      of the lesson is about what has to travel with a number for somebody
//      else to be able to check it.
//
// The numbers quoted in the prose were measured from this configuration in a
// real browser, not estimated: regular lands near 0.28 d with K about 7 m/s,
// irregular near 3.525 d with K about 105 m/s against a true 84. The K
// overestimate is not a defect to be tuned away - eight points with a
// two-thirds phase hole overestimate an amplitude, and the lesson says so.
// =============================================================================

/** HD 209458 with the star free to move: P = 3.5247 d, K = 84 m/s. */
const RV_LAB = {
  scenario: 'Exoplanet Characterization Lab',
  seed: 'schedule',
  camera: { zoom: 55, pan: { x: 0, y: 0 } },
  paused: false,
};

const DESIGN_THE_SCHEDULE = {
  id: 'design-the-schedule',
  thumbnail: 'images/scenarios/exoplanet-characterization-lab.webp',
  series: 'Detecting exoplanets',
  title: 'Design the Schedule',
  subtitle:
    'Eight nights on the real instrument, and the times you choose decide the answer',
  duration: '35-40 min',
  level: 'Introductory astronomy',
  tags: ['exoplanets', 'observing'],
  lock: { placement: true, inspector: true },
  summary:
    'You have eight nights and one star. Plan the run yourself in the live Radial Velocity panel, commit to a prediction, then observe two schedules side by side against the same star with the same instrument and the same noise — and watch one of them recover a Jupiter while the other cannot establish that the velocity changes at all. Then break your own result: change the seed, lose a fortnight to weather, and type a list of dates by hand, until you can say what a reported period has to carry before anybody else can check it.',
  objectives: [
    'Configure an observing run by its times rather than only by its cadence',
    'Commit to a prediction before observing, and say afterwards what the observation changed',
    'Explain what a spectral window peak near one means about a schedule',
    'Say why the same star, the same instrument and the same noise can give two different periods',
    'Explain why one run of each schedule cannot establish that a schedule is better',
    'Describe what a gap in a run does to the result, and what it does not',
    'State what a reported period has to be quoted with: the range searched, the schedule, and the seed',
  ],
  steps: [
    // --- Part 1: the plan is the experiment ---------------------------------
    {
      sid: 'eight-nights',
      type: 'read',
      title: 'Eight nights',
      setup: RV_LAB,
      body: `The star on screen has a planet. You are not going to be told its
             period, and you are not going to be given much time on the
             spectrograph: <strong>eight measurements</strong>, at 8 m/s each,
             over about twenty-five days.
             \n\nEight measurements is not many. But the thing that will decide
             whether you find the planet is not how many you have - it is
             <em>when you take them</em>, and you have to decide that before you
             have seen a single velocity.
             \n\nThe instrument in this lesson is the real one. Not a widget
             standing in for it: the Radial Velocity panel, observing this
             simulation as it runs, in real time. A run takes a few minutes and
             cannot be undone.`,
      tip: 'Telescope time is allocated months ahead. The schedule is written before anybody knows what the data will look like — which is exactly the situation this lesson puts you in.',
    },
    {
      sid: 'set-the-run-up',
      type: 'explore',
      title: 'Set the run up',
      setup: RV_LAB,
      body: `Open <strong>Radial Velocity</strong> from the Tools list, and tick
             <strong>Synthetic observing run</strong>. That switches the panel
             from drawing a continuous curve to keeping only the measurements a
             stated schedule would have produced.
             \n\nSet it up like this and leave it there:
             \n\n<strong>Baseline 24.673 d · Uncertainty 8 m/s · Noise seed
             schedule-1 · Schedule: Regular cadence · Observations 8</strong>
             \n\nThe note under the fields will tell you what the plan came out
             as: eight observations over 24.673 days, and a schedule checksum.
             Write the checksum down - it is how you will tell later whether two
             recordings were taken at the same instants.`,
      tip: 'The Observations field appears as soon as you choose a schedule shape or switch on a comparison. It is what holds the two runs to the same number of nights.',
    },

    // --- Part 2: predict, and only then observe -----------------------------
    {
      sid: 'predict-the-comb',
      type: 'predict',
      title: 'Before you observe',
      body: `Eight observations spread evenly across 24.673 days puts one every
             <strong>3.525 days</strong>.
             \n\nThe planet's period, which you are not supposed to know yet but
             which this lesson will tell you because the point is elsewhere, is
             <strong>3.5247 days</strong>.
             \n\nCommit to an answer now. You will be asked afterwards what the
             observation changed.`,
      prompt:
        'Eight nights, one every 3.525 days, on a planet with a 3.5247-day period. What will the run show?',
      options: [
        'A clean 3.52-day signal: the cadence matches the period exactly',
        'A velocity that barely changes, because every night lands at the same point in the orbit',
        'Random scatter of about 84 m/s, with no period recoverable',
        'The full amplitude, but with the period recovered as twice its real value',
      ],
      answer: 1,
      because: `Every observation lands at the same orbital phase, so the star
                is doing the same thing every time you look. The velocities come
                back nearly identical - not zero, just nearly constant - and a
                run that cannot see the velocity change cannot measure a period
                at all. Nothing about the planet changed; you simply never
                looked at the other side of the orbit.`,
    },
    {
      sid: 'run-both-schedules',
      type: 'explore',
      title: 'Run both schedules at once',
      setup: RV_LAB,
      body: `Now the controlled version of that question. Tick
             <strong>Compare with a second schedule</strong> and set the second
             one to <strong>Irregular</strong>, with <strong>Scatter
             0.45</strong>.
             \n\nBoth schedules now observe the same star over the same frames.
             Same eight observations, same baseline, same 8 m/s, same seed - the
             noise on the nth observation is the same draw in both arms. The
             only difference between the two recordings is when they looked.
             \n\nLet it run. Twenty-five simulated days is about seven orbits;
             raise the simulation speed if you do not want to wait, but keep an
             eye out for the warning about frames being too far apart, which
             means the measurements are being read across a curve rather than on
             it. The comparison appears when both schedules have finished.`,
      tip: 'A second arm is not a second run. Re-running would change the noise draw as well as the times, and you could not tell which one moved the answer.',
    },
    {
      sid: 'read-the-comparison',
      type: 'measure',
      title: 'Read the comparison',
      // The prediction is not optional scaffolding: reading these numbers
      // without having committed to an answer first is the failure mode the
      // lesson exists to prevent, so an assignment that takes this step has to
      // take that one.
      requires: ['predict-the-comb'],
      body: `The comparison block under the controls reports both arms. Read
             four numbers off it.
             \n\nYour figures will not match these to the digit - a different
             simulation speed lands the frames differently - but they should be
             the same story.`,
      fields: [
        {
          id: 'periodRegular',
          label: 'Regular cadence: best period',
          unit: 'd',
          hint: '0.28',
        },
        {
          id: 'kRegular',
          label: 'Regular cadence: K',
          unit: 'm/s',
          hint: '7',
        },
        {
          id: 'periodIrregular',
          label: 'Irregular: best period',
          unit: 'd',
          hint: '3.52',
        },
        {
          id: 'kIrregular',
          label: 'Irregular: K',
          unit: 'm/s',
          hint: '105',
        },
      ],
      validate: v => {
        if (
          !Number.isFinite(v.periodIrregular) ||
          !Number.isFinite(v.kRegular)
        ) {
          return null;
        }
        if (Math.abs(v.periodIrregular - 3.5247) > 0.4) {
          return {
            level: 'warn',
            message:
              'The irregular arm should land near 3.5 days. Check the second schedule is Irregular with scatter 0.45, and that both arms finished all eight observations.',
          };
        }
        if (v.kRegular > 30) {
          return {
            level: 'warn',
            message:
              'The regular arm should see almost no variation - a K of a few m/s. A large K there suggests its eight nights did not land 3.52 days apart; check the baseline is 24.673 and the count is 8.',
          };
        }
        return {
          level: 'ok',
          message:
            'One schedule found a Jupiter. The other, on the same star with the same instrument and the same noise, found a nearly constant velocity.',
        };
      },
    },

    // --- Part 3: what the difference is, and what it is not -----------------
    {
      sid: 'what-the-window-says',
      type: 'question',
      kind: 'choice',
      title: 'A window peak of 100%',
      requires: ['read-the-comparison'],
      body: `The comparison quotes a "worst window peak" for each schedule:
             about <strong>100%</strong> for the regular cadence and about
             <strong>57%</strong> for the irregular one.
             \n\nThat number comes from the observation times alone. No
             velocities go into it - you could compute it before observing
             anything, which is the entire reason it is worth computing.`,
      prompt: 'A window peak at 100% means that the schedule…',
      options: [
        'measured the star with 100% precision',
        'cannot distinguish a signal at that frequency from one at zero: the two fit the data identically',
        'covered 100% of the orbital cycle',
        'has 100% of its observations inside the baseline',
      ],
      answer: 1,
      because: `The spectral window is what the schedule alone can and cannot
                tell apart. A peak of one says there is a frequency at which two
                completely different signals produce exactly the same eight
                measurements - so no amount of care in the fitting can separate
                them. It is a property of the times, computable in advance, and
                it is the number to look at when deciding a schedule rather than
                when defending a result.`,
    },
    {
      sid: 'is-irregular-better',
      type: 'question',
      kind: 'choice',
      title: 'So irregular schedules are better?',
      requires: ['read-the-comparison'],
      body: `You have just watched an irregular schedule recover a planet that a
             regular one missed entirely, with everything else held equal. The
             temptation is obvious.`,
      prompt:
        'What does this comparison establish about irregular schedules in general?',
      options: [
        'That they are better: the experiment was controlled and the result was decisive',
        'Nothing in general — this is one noise draw of one schedule pair against one period, and it says what happened here',
        'That they are worse, because the K they returned was too high',
        'That the regular schedule was broken and should be discarded',
      ],
      answer: 1,
      because: `The comparison was controlled, and what it established is real:
                on this star, with this seed, these times found the planet and
                those did not. That is a fact about this run. "Irregular is
                better" is a claim about schedules in general, and one run of
                each cannot support it - which is why the panel prints the
                caveat under every comparison it produces rather than leaving it
                to be remembered.`,
    },
    {
      sid: 'break-your-own-result',
      type: 'explore',
      title: 'Break your own result',
      setup: RV_LAB,
      body: `A claim you cannot test is not worth much, so test this one.
             \n\nChange the <strong>Noise seed</strong> to something else -
             <strong>schedule-2</strong>, <strong>schedule-3</strong> - and run the
             comparison again. Each seed is a different draw of the same 8 m/s
             noise on the same star with the same two schedules.
             \n\nWatch what stays the same and what does not. The regular arm's
             failure is not a matter of luck: its eight nights land at the same
             phase whatever the noise does, so it fails on every seed. The
             irregular arm's success is partly luck - the period it returns
             moves around, and the amplitude moves more.`,
      tip: 'This is the difference between a property of the schedule and a property of the draw. Three seeds is not a study, but it is enough to see which of the two you are looking at.',
    },

    // --- Part 4: the run you actually get -----------------------------------
    {
      sid: 'predict-the-weather',
      type: 'predict',
      title: 'Then it rains',
      body: `Real runs lose nights. Suppose the middle of your run is clouded
             out: everything between day 8 and day 16 is lost, and nobody
             re-plans the rest - the remaining nights happen when they were
             always going to happen.
             \n\nCommit before you try it.`,
      prompt:
        'Losing the middle third of the run, with the remaining times unchanged, will…',
      options: [
        'have no effect: the same schedule shape is still there',
        'leave fewer observations over the same baseline, and a coarser result that the panel should say is coarser',
        'shorten the baseline to a third and make the period impossible to find',
        'be silently filled in by interpolation between the surviving nights',
      ],
      answer: 1,
      because: `The baseline is unchanged - the first and last nights are where
                they always were - but the observations inside it are fewer, and
                the phase coverage has a hole in it. The panel says how many
                epochs fell inside the gap rather than quietly observing a
                shorter run, and the comparison stops calling itself controlled
                if the two arms lose different numbers of nights.`,
    },
    {
      sid: 'lose-a-fortnight',
      type: 'explore',
      title: 'Lose a fortnight',
      setup: RV_LAB,
      requires: ['predict-the-weather'],
      body: `Type <strong>8-16</strong> into <strong>Gaps</strong> and let both arms
             run again.
             \n\nThe note under the controls now says how many epochs fell
             inside the gap and were not observed. Look at what happened to the
             comparison block afterwards: if the two schedules lost different
             numbers of nights, it will tell you that the comparison is no
             longer about scheduling alone, and list what stopped being equal.
             \n\nThat is not the panel being fussy. Two arms with different
             numbers of observations differ in two things at once, and any
             difference in their answers could be either.`,
      tip: 'A gap is written in days from the start of the run, so 8-16 is the second week and a bit. Several gaps can be listed at once, separated by commas.',
    },
    {
      sid: 'type-the-dates',
      type: 'explore',
      title: 'Type the dates yourself',
      setup: RV_LAB,
      body: `Last configuration. Set the first schedule to <strong>Listed
             times</strong> and type eight times of your own into the box - days
             from the start of the run, in any order, separated by spaces or
             commas.
             \n\nTry to beat the irregular schedule. You know the period now, so
             you can aim at the phases nobody has looked at; that is exactly what
             a second season of observing does.
             \n\nThen try to break the field: type something that is not a
             number, or the same time twice. The note will tell you what it
             could not read and what it merged, rather than quietly observing on
             a shorter list than you wrote.`,
      tip: 'A schedule is a set of instants. Two entries at the same time are one observation however they were typed, and the note says so.',
    },

    // --- Part 5: what a result has to carry ---------------------------------
    {
      sid: 'the-range-you-searched',
      type: 'question',
      kind: 'choice',
      title: 'The range you searched',
      body: `Every comparison you have run printed the range both arms were
             searched over - something like <em>0.247 to 24.67 days</em> - and
             would have warned you if a best fit had landed on the edge of it.`,
      prompt: 'Why does a reported period need the search range beside it?',
      options: [
        'Because a longer range is always a better search',
        'Because the reported period is the best fit inside that range, and a true period outside it comes back as whichever end was nearest',
        'Because the range determines the uncertainty on the period',
        'It does not: the best fit is the best fit',
      ],
      answer: 1,
      because: `A period search returns the best period it was allowed to
                consider. Give it a range that does not contain the answer and
                it will return the edge of the range, with no error and no
                complaint, and two runs that both did that will agree with each
                other perfectly. That is why the panel flags a fit sitting on
                its own boundary instead of printing it as a measurement.`,
    },
    {
      sid: 'what-travels-with-a-period',
      type: 'question',
      kind: 'choice',
      title: 'What has to travel with a period',
      body: `You are going to send somebody your result: a period, in days, from
             one of these runs.`,
      prompt:
        'Which of these does that number need beside it for the result to be checkable?',
      options: [
        'The star and the date, which is what a normal citation carries',
        'The times observed (or their checksum), the uncertainty, the noise seed and the range searched',
        'The instrument make and model',
        'Nothing further: the period is a measurement of the star, not of the run',
      ],
      answer: 1,
      because: `Everything on the second list can change the number while the
                star stays exactly the same - which is what this whole lesson
                has been demonstrating. The exported CSV carries all of it:
                schedule kind, schedule checksum, planned epochs, gaps, the
                stated uncertainty and the seed, on every row. That is what lets
                somebody else find out whether they got a different answer
                because the star is different or because they looked at
                different times.`,
    },
    {
      sid: 'what-you-decided',
      type: 'read',
      title: 'What you decided before you looked',
      body: `Eight nights, one star, one instrument, one noise draw. The planet
             was there the whole time and the physics never changed.
             \n\nWhat changed was the list of instants, and it decided the
             result. A schedule is not administration around an experiment; on a
             sampled measurement it <em>is</em> the experiment, and its
             properties - the phase coverage, the window function - can be
             worked out before any telescope is pointed anywhere.
             \n\nWhat you cannot work out in advance is which schedule will get
             lucky on the night. That is why the honest form of the result you
             produced today is not "irregular sampling is better", but "these
             times, on this star, with this seed, over this range, gave this
             period" - with enough of the run written down that somebody else
             can disagree with you properly.`,
      tip: 'Every number the comparison prints, including the caveat, goes into the exported file and into a notebook entry saved from the workspace.',
    },
  ],
};

export default DESIGN_THE_SCHEDULE;
