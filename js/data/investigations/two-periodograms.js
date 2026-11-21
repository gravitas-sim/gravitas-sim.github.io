// =============================================================================
// Two Periodograms
// -----------------------------------------------------------------------------
// Content only (one import: the number formatter). The companion of the compute page's notebook
// "periodograms" (Roadmap II Prompt 102, COMPUTE.md). There is no instrument on
// this page: the student runs the reviewed notebook at /compute/ on the TESS
// light curve of HD 209458 that the Observatory's box search reads, and types
// back the numbers the capsule holds. Every number here is a declared output of
// that notebook (js/compute/catalogueData.js), checked by
// tests/computeInvestigations.test.js against the notebook's own answer
// (tests/fixtures/compute/periodograms.answer.json) and, in
// tests/computeCurriculum.test.js, against the Observatory's box search and a
// Lomb-Scargle written again. The runs are deterministic: two students get the
// same digits. `the-box-with-your-limit` takes a menu choice (the longest box
// duration the search may try), so its expected numbers are one set per choice
// (BOX) and the menu is a field of the step, since a check sees only its own
// step. The numbers of each choice come from the generated runs in
// tests/fixtures/compute/investigation-runs.json and a test copies them.
//
// The numbers (default settings: periods to 15 days, durations to 6 hours):
//   Lomb-Scargle best period 1.7689 d (power 0.0723), box least squares best
//   period 3.52396 d, duration 2.5 h, depth 14,582 +/- 76 ppm, S/N 191; the
//   ratio of the two periods 0.502; the fit panel's period for the same
//   light curve 3.52454 +/- 0.00003 d, 19 of its sigmas from the box period.
//   Lomb-Scargle power at the harmonics of 3.52454 d: 0.056 at P, 0.073 at P/2,
//   0.071 at P/3 and P/4.
// =============================================================================

import { fixed } from '../../format.js';

/**
 * The box search for each longest duration a student may allow (hours): the best
 * box's duration, depth (ppm) and signal-to-noise ratio, the best period, and
 * whether the best duration is the limit itself. Limit 6 is the default.
 */
const BOX = {
  2: { duration: 2.0, depth: 15244, snr: 103.7, period: 3.52407, edge: 1 },
  3: { duration: 2.6, depth: 14405, snr: 208.4, period: 3.52381, edge: 0 },
  4: { duration: 2.5, depth: 14582, snr: 191.2, period: 3.52396, edge: 0 },
  6: { duration: 2.5, depth: 14582, snr: 191.2, period: 3.52396, edge: 0 },
  8: { duration: 2.7, depth: 13982, snr: 181.1, period: 3.52381, edge: 0 },
};
/** One field's value for each choice, for the answer key. */
const byLimit = field =>
  Object.fromEntries(Object.entries(BOX).map(([n, r]) => [n, r[field]]));
/** A limit, or the limits that give the same numbers, in words. */
const named = n =>
  [4, 6].includes(Number(n)) ? 'limits 4 and 6' : `limit ${n}`;

const TWO_PERIODOGRAMS = {
  id: 'two-periodograms',
  thumbnail: 'images/scenarios/transit-lab.webp',
  title: 'Two Periodograms',
  subtitle:
    'A Lomb-Scargle and a box least squares periodogram of the same light curve, computed with Astropy in Python, and what a period from a periodogram can claim',
  duration: '30-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'upper',
  mathematics: 'logarithms',
  prerequisites: ['transit-photometry'],
  tags: ['exoplanets'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Compute a Lomb-Scargle and a box least squares periodogram of a light curve with Astropy and read each one’s best period',
    'Explain why the Lomb-Scargle peak of a transit light curve is at a harmonic of the planet’s period',
    'Say what a periodogram’s period is, and why it has no error bar of its own',
    'Compare a period from a periodogram with a fitted period in units of the fit’s uncertainty',
  ],
  steps: [
    {
      sid: 'two-ways-to-look-for-a-period',
      type: 'read',
      canvas: 'quiet',
      title: 'Two ways to look for a period',
      body: `How do you find the period of a planet from a light curve, and how much
             should you trust the number? A light curve that dips every few days has a
             period in it, and there are two standard ways to ask for it. A <strong>Lomb-Scargle periodogram</strong>
             fits a sine wave at each trial frequency, weighted by the error bars, and
             reports how much of the variation each one explains. It was made for unevenly
             spaced data and for signals that are sinusoids: a spotted star turning, a
             pulsation. A <strong>box least squares periodogram</strong> fits a flat-bottomed
             dip instead, at each trial period, epoch and duration, which is what a
             transit looks like. The Observatory's box search is the same idea.
             \n\nThe notebook computes both for the TESS light curve of HD 209458 with
             <strong>astropy.timeseries</strong>, and puts them on one period axis.
             \n\nOpen the compute page at <strong>/compute/</strong> of this site. It is
             online only and downloads about 17 MB of Python the first time, when you
             press the button. Choose the notebook <strong>Two periodograms of one light
             curve</strong>, keep its example input, and its settings at 15 days and 6
             hours. Do not press Run yet.`,
    },
    {
      sid: 'the-tallest-peak',
      type: 'predict',
      reveal: 'the-two-periods',
      title: 'Where the tallest peak will be',
      body: `The planet transits every 3.52 days; the light curve is 27.9 days long. The
             notebook will compute a Lomb-Scargle periodogram of it.`,
      prompt: 'The Lomb-Scargle periodogram’s tallest peak will be at&hellip;',
      options: [
        'the planet’s period, about 3.5 days',
        'about half of it, 1.8 days',
        'about twice it, 7 days',
        'the spacecraft’s own orbit, about 13.7 days',
      ],
      answer: 1,
      because:
        'A train of narrow dips repeating every P is not a sine wave: it has power at P and at every harmonic, P/2, P/3, and so on, with similar strength in each. Which of them is tallest depends on the dips’ shape and on the gaps in the data. Here the fundamental is the weakest of the first four, and the tallest peak is the second harmonic.',
    },
    {
      sid: 'the-two-periods',
      compute: 'periodograms',
      type: 'measure',
      title: 'Run it: the two best periods',
      body: `Press <strong>Start the runtime</strong>, wait, then <strong>Run the
             notebook</strong>. Read the quantities it returns and enter them here: each
             periodogram's best period, and the ratio of the Lomb-Scargle one to the box
             one.`,
      fields: [
        {
          id: 'ls',
          label: 'Lomb-Scargle best period',
          unit: 'd',
          want: '1.7689',
        },
        {
          id: 'bls',
          label: 'Box least squares best period',
          unit: 'd',
          want: '3.524',
        },
        {
          id: 'ratio',
          label: 'Lomb-Scargle over box',
          unit: '',
          want: '0.502',
        },
      ],
      validate: v => {
        if (![v.ls, v.bls, v.ratio].every(Number.isFinite)) return null;
        if (
          Math.abs(v.ls - 1.7689) <= 0.01 &&
          Math.abs(v.bls - 3.524) <= 0.002 &&
          Math.abs(v.ratio - 0.502) <= 0.004
        ) {
          return {
            level: 'ok',
            message:
              'The box search finds 3.524 days, the planet’s period. The Lomb-Scargle peak is at 1.769 days, 0.502 of that: very nearly half.',
          };
        }
        return {
          level: 'error',
          message:
            'Run the notebook with its settings at 15 and 6, and read the two best periods and their ratio from the table of numbers it returns.',
        };
      },
    },
    {
      sid: 'why-half',
      type: 'question',
      kind: 'choice',
      title: 'Why half',
      body: `The notebook also returns a table of both periodograms on one axis. Look up
             the Lomb-Scargle power in the rows near 3.5, 1.76, 1.17 and 0.88 days:
             0.056, 0.073, 0.071 and 0.071.`,
      prompt: 'What does that show?',
      options: [
        'A repeating narrow dip has power at the planet’s period and its harmonics, and the harmonics are as strong as the period or stronger, so the tallest peak need not be the period',
        'The planet’s true period is 1.77 days',
        'The light curve contains four different planets',
        'Lomb-Scargle has a bug that halves periods',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'true-half',
          option: 1,
          say: 'The box search, the dips themselves, and the fit all say 3.52 days. Count the dips: eight in 28 days.',
        },
        {
          id: 'four-planets',
          option: 2,
          say: 'The powers at 3.5, 1.76, 1.17 and 0.88 are 1, 1/2, 1/3 and 1/4 of one period: the harmonics of one signal, not four signals.',
        },
      ],
      hints: [
        'A sine wave has one smooth hump per cycle. A narrow dip is not smooth, and a sum of sine waves at the period and its harmonics makes one.',
      ],
      because:
        'A narrow dip repeating every P is a sum of sine waves at P, P/2, P/3 and so on, with similar strengths. Lomb-Scargle fits one sine at a time, so each of these is a peak and any of them may be the tallest. Its tallest peak says there is a periodic signal and gives a period that divides the real one; it does not say which.',
    },
    {
      sid: 'the-box-with-your-limit',
      compute: 'periodograms',
      type: 'measure',
      title: 'The best box, within your limit',
      body: `The box search tries boxes of several durations, up to a longest one that is
             one of the notebook's two settings. The run you made earlier allowed 6 hours,
             and is the reference. Choose a longest box duration from the menu:
             <strong>2</strong>, <strong>3</strong>, <strong>4</strong>, <strong>6</strong>
             or <strong>8</strong> hours. On the compute page set <strong>Longest box
             duration tried</strong> to your choice, keep the longest period at 15, and run
             again.
             \n\nThe search returns more than a period: the duration and depth of the box
             that fits best, and the depth's signal-to-noise ratio, where the depth's error
             bar is scaled up because the points scatter about 2.8 times their error bars.
             Enter your limit, the duration, the depth and the signal-to-noise ratio, and
             then say whether the best box is as long as the limit you allowed: enter
             <strong>1</strong> if it is, <strong>0</strong> if it is shorter. A best box
             as long as the limit sits at the edge of the range the search was allowed.`,
      fields: [
        {
          id: 'limit',
          label: 'Longest box duration you allowed',
          unit: 'h',
          options: [2, 3, 4, 6, 8],
          want: '2',
        },
        {
          id: 'duration',
          label: 'Best box duration',
          unit: 'h',
          want: String(BOX[2].duration),
          by: byLimit('duration'),
        },
        {
          id: 'depth',
          label: 'Best box depth',
          unit: 'ppm',
          want: String(BOX[2].depth),
          by: byLimit('depth'),
        },
        {
          id: 'snr',
          label: 'Depth S/N',
          unit: '',
          want: String(BOX[2].snr),
          by: byLimit('snr'),
        },
        {
          id: 'edge',
          label: 'Best box as long as your limit (1 yes, 0 no)',
          unit: '',
          options: [0, 1],
          want: '1',
          by: byLimit('edge'),
        },
      ],
      validate: v => {
        const typed = [v.duration, v.depth, v.snr];
        if (!Number.isFinite(v.limit))
          return typed.some(Number.isFinite) || Number.isFinite(v.edge)
            ? {
                level: 'warn',
                message:
                  'Choose the longest box duration you allowed from the menu first: what is right depends on it.',
              }
            : null;
        if (!typed.every(Number.isFinite) || !Number.isFinite(v.edge))
          return null;
        const mine = BOX[v.limit];
        if (!mine) return null;
        const matches = row =>
          Math.abs(v.duration - row.duration) <= 0.06 &&
          Math.abs(v.depth - row.depth) <= 100 &&
          Math.abs(v.snr - row.snr) <= 4;
        if (matches(mine)) {
          if (v.edge !== mine.edge)
            return {
              level: 'error',
              message: mine.edge
                ? `Your best box is ${mine.duration} hours long and your limit was ${v.limit}: the search could not try a longer box, so it is at the edge of the range. Enter 1.`
                : `Your best box is ${mine.duration} hours long and your limit was ${v.limit}: it is shorter than the limit, so the search had room for a longer box and did not choose one. Enter 0.`,
            };
          return {
            level: 'ok',
            message: mine.edge
              ? `With the limit at 2 hours the best box is 2.0 hours long: the limit itself. The search could not try a longer box, so what it reports is the longest box it was allowed, and a longer one might fit better. A box that is too short covers only the deepest part of the transit, so its depth is greater (${mine.depth.toLocaleString('en-US')} ppm) but it rests on fewer points, and its signal-to-noise ratio (${mine.snr}) is the lowest of the menu.`
              : `With the limit at ${v.limit} hours the best box is ${mine.duration} hours long, inside the range: the search had room for a longer box and did not choose one. That duration is 2.5 to 2.7 hours whichever limit you allow, a little different each time because the search refines its durations on a grid of 21 values from 1 hour to the limit. The box is an average of the real transit, which has sloped ingress and egress and a limb-darkened floor.`,
          };
        }
        for (const [n, row] of Object.entries(BOX))
          if (Number(n) !== v.limit && matches(row))
            return {
              level: 'error',
              message: `Those are the numbers of ${named(n)}. You chose ${v.limit}: set Longest box duration tried to ${v.limit} on the compute page and run again.`,
            };
        return {
          level: 'error',
          message: `Set Longest box duration tried to ${v.limit}, run, and read the box duration, the box depth and its signal-to-noise ratio from the table of numbers. They are rows of the table, in hours and in parts per million.`,
        };
      },
    },
    {
      sid: 'separation-from-your-period',
      compute: 'periodograms',
      type: 'measure',
      title: 'Against the fit',
      body: `The Observatory's fit panel, which fits a transit to this light curve rather
             than a box, gives a period of <strong>3.52454</strong> days with an
             uncertainty of 0.00003. Enter the box least squares period of your latest
             run, and how many of the fit's uncertainties apart the two periods are,
             without regard to which is the larger.
             \n\nThe panel also reports that this light curve's noise is correlated in
             time, which makes its uncertainties too small by a factor of about 1.7 (the panel's red-noise factor, 1.66, measured on the residuals by the time-averaging method of Winn et al. 2008), the usual simplification for red noise. Enter
             the separation again in units of the uncertainty made 1.7 times larger. Then
             decide: does the box period still differ from the fit's by more than three of
             those larger uncertainties (three is a convention)? Enter <strong>1</strong> for yes,
             <strong>0</strong> for no.`,
      fields: [
        {
          id: 'period',
          label: 'Your box period',
          unit: 'd',
          want: '3.52396',
        },
        {
          id: 'sigmas',
          label: 'Separation, in the fit’s uncertainties',
          unit: '',
          want: '19',
        },
        {
          id: 'corrected',
          label: 'Separation, with the uncertainty made 1.7 times larger',
          unit: '',
          want: '11',
        },
        {
          id: 'survives',
          label: 'Still beyond three of them (1 yes, 0 no)',
          unit: '',
          options: [0, 1],
          want: '1',
        },
      ],
      validate: v => {
        if (
          ![v.period, v.sigmas, v.corrected, v.survives].every(Number.isFinite)
        )
          return null;
        // Any box period the notebook gives, at any limit on the menu, is near 3.5238 to 3.5241.
        if (v.period < 3.5237 || v.period > 3.5242)
          return {
            level: 'error',
            message:
              'Read the box least squares period from the table of your latest run: it is a little under 3.5241 days at every setting the menu allows.',
          };
        const apart = Math.abs(v.period - 3.52454) / 0.00003;
        if (Math.abs(Math.abs(v.sigmas) - apart) > Math.max(1.5, 0.08 * apart))
          return {
            level: 'error',
            message:
              'Subtract your period from 3.52454, and divide by 0.00003, the fit’s uncertainty.',
          };
        const s = Math.abs(v.sigmas);
        if (Math.abs(v.corrected) < s / 1.8 || Math.abs(v.corrected) > s / 1.55)
          return {
            level: 'error',
            message:
              v.corrected > s
                ? 'Correlated noise makes the real uncertainty larger, so the same separation is fewer of them: divide by 1.7, not multiply.'
                : 'Make the uncertainty 1.7 times larger, which makes the separation 1.7 times smaller: divide your first separation by 1.7.',
          };
        if (v.survives !== 1)
          return {
            level: 'error',
            message: `The separation is about ${Math.round(Math.abs(v.corrected))} of the larger uncertainties, well beyond three: the difference survives the correction. Enter 1.`,
          };
        return {
          level: 'ok',
          message: `Your box period is ${fixed(apart, 0)} of the fit's uncertainties from the fitted one, about ${fixed(apart / 1.7, 0)} with the panel's correlated-noise factor, so the difference survives it. That is not a mistake of the box search: its period is the best point of a grid of boxes, and it was never a number with an error bar of 0.00003.`,
        };
      },
    },
    {
      sid: 'what-a-grid-step-is',
      type: 'question',
      kind: 'choice',
      title: 'What a grid step is',
      body: `A colleague reports the box search's period as 3.52396 &plusmn; 0.0000003
             days, taking the second number from the fine grid the notebook searches
             across the peak, which has a step of 3e-7 day.`,
      prompt: 'What is wrong with that?',
      options: [
        'The grid step is how finely the periods were sampled, not how well the data fix the period: this period is more than ten of the fit’s uncertainties from the fit’s, so its real uncertainty is far larger than the step',
        'The grid step is too small and should be made larger',
        'A box search cannot find a period at all',
        'The uncertainty should be the signal-to-noise ratio',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'larger',
          option: 1,
          say: 'Making the step larger would make the quoted uncertainty larger and no more honest: it is still a property of the grid.',
        },
        {
          id: 'cannot',
          option: 2,
          say: 'It found the period, to a thousandth of a day. It cannot say how well, because nothing in a box search estimates that.',
        },
      ],
      hints: [
        'Change the grid and the step changes. Does what the data say about the period change?',
      ],
      because:
        'A periodogram’s period is the highest point of a curve evaluated on a grid. Its sharpness depends on the grid, the durations tried and the shape of the box, and none of these is an error bar. To say how well the data fix the period, fit a transit model to it, as the Observatory’s panel does, and take the covariance or the profile of the period.',
    },
    {
      sid: 'what-you-worked-out',
      type: 'read',
      title: 'What you worked out',
      body: `Two periodograms of one light curve disagree by a factor of two, and both
             are right about what they were asked. Lomb-Scargle found the strongest
             sine wave, at 1.769 days, a harmonic of the planet's period. The box search
             found a dip, at 3.524 days, about 2.5 hours long and 14,600 parts per million
             deep when its limit left it room, and its period is within 0.0007 day of the
             fit's.
             \n\nA periodogram answers "is there a period here, and roughly where", and
             not "what is it, to what precision". The second needs a model, a fit and an
             uncertainty, which the previous investigation did and this one did not.
             \n\nWhat the box search does not cover: it fits one shape of dip, so its
             duration and depth are an average of the real transit, and the longest box you
             allow decides whether the search can even reach the best one. Its period is a
             grid point, and with the fit's uncertainties widened for correlated noise the
             box period still sits several of them away. The run is yours to keep: its
             capsule records the notebook's hash and the light curve's, so a report can cite
             it.`,
    },
  ],
  retired: {
    'the-box': {
      to: 'the-box-with-your-limit',
      release: '3.1',
      was: {
        en: 'Read the best box from the run with the longest box duration at 6 hours and enter its duration, depth and signal-to-noise ratio.',
        es: 'Leer la mejor caja de la ejecución con la duración máxima de caja en 6 horas e introducir su duración, profundidad y relación señal-ruido.',
      },
    },
    'against-the-fit': {
      to: 'separation-from-your-period',
      release: '3.1',
      was: {
        en: 'Subtract the fit panel’s period, 3.52454 days, from the box search’s period and enter the difference and how many of the fit’s uncertainties it is.',
        es: 'Restar el período del panel de ajuste, 3,52454 días, del período de la búsqueda de caja e introducir la diferencia y a cuántas incertidumbres del ajuste equivale.',
      },
    },
  },
};

export default TWO_PERIODOGRAMS;
