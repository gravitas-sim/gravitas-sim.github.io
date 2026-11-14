// =============================================================================
// Cluster Membership by Motion
// -----------------------------------------------------------------------------
// Content only, no imports. Every step has a stable `sid` (progressSchema.js).
// The instrument is the galactic family's cluster tool (js/galacticWidgets.js,
// js/galactic/model.js): 993 Gaia DR3 stars in the field of NGC 2420, a
// mixture fit over proper motion (and parallax) and a membership PROBABILITY
// for every star. The color-magnitude diagram is drawn from the same table and
// was not used by the fit. Expected values: tests/galacticInvestigations.test.js.
//
// Not claimed: the instrument's 1 / parallax reading has no zero point and is not
// the cluster's distance. The measured distance (Prompt 233, GAIA_WORKFLOWS.md) is
// stated with its labels: a zero point per star, 2.324 kpc with a statistical
// interval of 2.316 to 2.332 kpc and no systematic floor, leg E1 NOT RUN, and not
// validated against a published catalog distance. Its numbers are those of
// tests/fixtures/gaia-workflows/results.json.
// =============================================================================

const STARS = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'member', name: 'A cluster star', teffK: 6200, lumSun: 2 },
    { role: 'field', name: 'A field star', teffK: 4800, lumSun: 0.3 },
  ],
};
const CM = (values = {}) => ({ id: 'cluster-members', values });

const CLUSTER_MEMBERSHIP = {
  id: 'cluster-membership',
  thumbnail: 'images/investigations/cluster-membership.webp',
  title: 'Cluster Membership by Motion',
  subtitle: 'Finding the stars of NGC 2420 in Gaia, as probabilities',
  duration: '25-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 22, section: null },
  courseLevel: 'majors',
  depths: ['core', 'quantitative', 'advanced'],
  mathematics: 'algebra',
  prerequisites: ['lives-of-stars'],
  tags: ['stars', 'galaxies', 'observing'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Recognize a star cluster as a clump in proper motion that the field’s stars do not make',
    'Measure a cluster’s proper motion and its number of members from a fit that gives each star a probability',
    'Explain why a membership is a probability and a membership count depends on a threshold that is chosen',
    'Check a membership made from motion against a color-magnitude diagram that it did not use',
    'State the cluster’s measured distance with its labels (a zero point per star, a statistical interval with no systematic floor) and say that it is not validated against a published catalog distance',
  ],
  steps: [
    {
      sid: 'a-cluster-in-a-field',
      stage: STARS,
      type: 'read',
      title: 'A cluster and a field',
      body: `NGC 2420 is an old open cluster in Gemini, thousands of light-years
             away. Along the same line of sight lie stars of the Galaxy’s
             disk that have nothing to do with it. A picture of the sky cannot
             separate them; their <strong>motions</strong> can, because the
             stars of a cluster were born together and still move together.
             \n\nThe instrument holds 993 Gaia DR3 stars brighter than G = 17.5
             within 14 arcminutes of the cluster, and plots each star’s
             <strong>proper motion</strong> in the sky. Gaia’s errors are
             included in the fit. Nothing is labeled yet: the list under the
             picture is what a fit finds.`,
      tool: CM({ view: 0, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'predict-the-clump',
      stage: STARS,
      type: 'predict',
      reveal: 'measure-the-cluster',
      title: 'Where the cluster shows up',
      body: `Look at the proper-motion picture, with every star in it. Do not
             change the instrument yet.`,
      prompt: 'The stars of the cluster will appear as&hellip;',
      options: [
        'a tight clump, set apart from a broad cloud of field stars',
        'a ring around the field’s center',
        'an even spread over the whole plane',
        'a line, with the field on one side',
      ],
      answer: 0,
      hints: [
        'Stars born together move together; the field’s stars move in all sorts of ways.',
      ],
      because:
        'A tight clump. The cluster’s stars share one motion (to within about 0.1 mas/yr, a velocity of about 1 km/s at this distance), while field stars, at all distances and ages, are spread over several mas/yr.',
      tool: CM({ view: 0, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'measure-the-cluster',
      stage: STARS,
      type: 'measure',
      title: 'The cluster’s motion and size',
      body: `The fit has put a narrow component on the clump and a broad one on
             the field. Read the <strong>cluster’s proper motion</strong> in
             right ascension and in declination (the two numbers in the row),
             and the number of stars with a membership probability above
             <strong>0.5</strong>.`,
      fields: [
        {
          id: 'pmra',
          label: 'Proper motion in right ascension',
          unit: 'mas/yr',
          want: '-1.2',
        },
        {
          id: 'pmdec',
          label: 'Proper motion in declination',
          unit: 'mas/yr',
          want: '-2.0',
        },
        { id: 'members', label: 'Stars above 0.5', unit: '', want: '506' },
      ],
      validate: v => {
        if (![v.pmra, v.pmdec, v.members].every(Number.isFinite)) return null;
        if (
          Math.abs(v.pmra - -1.227) <= 0.05 &&
          Math.abs(v.pmdec - -2.041) <= 0.05 &&
          Math.abs(v.members - 506) <= 8
        ) {
          return {
            level: 'ok',
            message:
              'About 506 of the 993 stars are in the cluster, moving at (−1.23, −2.04) mas/yr. The other 487 or so are field stars that happen to be in the same direction.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the preset “Proper motions”: the fit with proper motion and parallax, threshold 0.5. Read the “Cluster’s proper motion” row and “Stars above the probability threshold”.',
        };
      },
      tool: CM({ view: 0, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'a-label-or-a-probability',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'A star at 0.5',
      body: `Each star has a <strong>probability</strong> of belonging to the
             cluster, given its motion, its parallax and their errors. Take a
             star whose probability is exactly 0.5.`,
      prompt: 'Is it a member?',
      options: [
        'The data cannot say: it is equally likely to be either, and whether it is counted depends on a threshold someone chooses',
        'Yes: any star above zero is a member',
        'No: only a probability of 1 makes a member',
        'Yes, because 0.5 rounds up',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'label-thinking',
          option: 3,
          say: 'A threshold of 0.5 is a choice, and rounding up is another choice. The star itself is exactly as likely to be one as the other.',
        },
      ],
      hints: ['What does a probability of one half mean?'],
      because:
        'The data cannot say. The fit returns how likely the star is to belong, and a count of members is a count above a threshold that the analyst states: here 0.5, but it could as well be 0.9.',
      tool: CM({ view: 0, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'move-the-threshold',
      stage: STARS,
      type: 'measure',
      title: 'Move the threshold',
      body: `Raise the threshold to <strong>0.99</strong> (the “Strict” preset)
             and read the number of stars above it. Then lower it to
             <strong>0.1</strong> and read it again.`,
      fields: [
        { id: 'strict', label: 'Stars above 0.99', unit: '', want: '497' },
        { id: 'loose', label: 'Stars above 0.1', unit: '', want: '509' },
      ],
      validate: v => {
        if (![v.strict, v.loose].every(Number.isFinite)) return null;
        if (Math.abs(v.strict - 497) <= 6 && Math.abs(v.loose - 509) <= 6) {
          return {
            level: 'ok',
            message:
              'The count moves only from 497 to 509 across almost the whole range of thresholds, because nearly every star is either clearly a member or clearly not. Only a handful sit in between.',
          };
        }
        return {
          level: 'error',
          message:
            'Use the fit with proper motion and parallax. Set the threshold to 0.99 and read “Stars above the probability threshold”, then set it to 0.1 and read it again.',
        };
      },
      tool: CM({ view: 0, dims: 1, threshold: 0.99 }),
    },
    {
      sid: 'why-so-stable',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'Why so stable?',
      body: `The number of members hardly changed from threshold 0.1 to 0.99,
             and the list says only 4 stars have a probability between 0.1 and
             0.9.`,
      prompt: 'What does that say about this cluster?',
      options: [
        'It is well separated from the field in motion and parallax: most stars are clearly in or clearly out',
        'The fit is broken',
        'The probabilities are all 0 or 1 by construction',
        'The cluster has no members',
      ],
      answer: 0,
      hints: [
        'Compare the width of the cluster’s clump to the distance between it and the field’s center.',
      ],
      because:
        'It stands apart. The clump is narrow (about 0.08 mas/yr) and the field broad (several mas/yr), so a star’s motion nearly decides which it belongs to. A less distinct cluster, or the same fit with proper motion alone (8 uncertain stars), leaves more stars in between.',
      tool: CM({ view: 0, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'does-the-color-agree',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'A check the fit did not use',
      body: `Switch the picture to the <strong>color-magnitude diagram</strong>.
             Blue points are stars above the threshold, gray the others. The
             fit used only motion (and parallax), never color or brightness.`,
      prompt: 'What does it mean that the blue points make a narrow sequence?',
      options: [
        'The members really are one population: the same age and distance, as a cluster’s are',
        'Color and brightness were fitted too',
        'Nothing: any set of stars makes a sequence',
        'The field stars are all fainter',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'circular-check',
          option: 1,
          say: 'They were not. The fit sees proper motion and parallax only, so the sequence is an independent result.',
        },
      ],
      hints: [
        'A random set of stars at different distances would not line up on one curve.',
      ],
      because:
        'It is an independent confirmation. Stars of one age and distance line up along one main sequence with a turnoff; field stars at all distances are scattered across the diagram. A sequence found by motion alone says the motion picked out a real cluster.',
      tool: CM({ view: 1, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'read-the-distance',
      stage: STARS,
      type: 'measure',
      title: 'A distance from parallax',
      body: `With the threshold at 0.5, read the members’ <strong>mean
             parallax</strong> and the reading the instrument gives from it, 1 ÷
             parallax, in kiloparsecs when the parallax is in milliarcseconds. It
             is the catalog’s parallax with no zero point, so it is not yet the
             cluster’s distance.`,
      fields: [
        {
          id: 'parallax',
          label: 'Mean parallax of the members',
          unit: 'mas',
          want: '0.385',
        },
        {
          id: 'distance',
          label: 'Reading, 1 ÷ parallax (uncorrected)',
          unit: 'kpc',
          want: '2.6',
        },
      ],
      validate: v => {
        if (![v.parallax, v.distance].every(Number.isFinite)) return null;
        if (
          Math.abs(v.parallax - 0.385) <= 0.02 &&
          Math.abs(v.distance - 2.6) <= 0.15
        ) {
          return {
            level: 'ok',
            message:
              'The instrument’s uncorrected reading: a mean parallax of 0.385 mas is 1 ÷ parallax of 2.6 kpc, the catalog’s parallax with no zero point, and not the cluster’s distance. With Gaia’s zero point applied star by star to members taken from proper motion alone (a different member list from this instrument’s, which also uses parallax), the astrometry panel measures 2.324 kpc with a statistical interval of 2.316 to 2.332 kpc, and that interval has no systematic floor: the zero point’s own uncertainty is not known here. The distance is not validated against a published catalog distance: the check that would do it, leg E1 of the validation, is NOT RUN, waiting for a table that could not be fetched.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the threshold to 0.5 and read “Mean parallax of the members” and “Reading from that parallax”. The reading is 1 divided by the parallax.',
        };
      },
      tool: CM({ view: 0, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'what-is-not-corrected',
      stage: STARS,
      type: 'question',
      kind: 'choice',
      title: 'What the distance leaves out',
      body: `The distance row says it uses no zero-point correction and no check
             against another method. The astrometry panel applies a zero point to
             every star.`,
      prompt: 'What does the zero point do to the cluster’s distance?',
      options: [
        'It raises the parallax by about 0.04 mas and moves the distance from 2.555 to 2.324 kpc, far more than its statistical interval',
        'Change the cluster’s proper motion',
        'Remove all the field stars',
        'Nothing: the parallax is exact',
      ],
      answer: 0,
      hints: ['Compare the two distances, with the zero point and without it.'],
      because:
        'It raises the parallax, so it lowers the distance: the members’ mean zero point is −0.0368 mas, and the distance goes from 2.555 kpc without it to 2.324 kpc with it. The interval of the corrected value, 2.316 to 2.332 kpc, is statistics only, with no systematic floor, and the distance is not validated against a published catalog distance (E1 NOT RUN). The sources the validation lists: 2.48 and 2.54 kpc from photometry (converted here from a distance modulus), 2.59 kpc from Gaia DR2, 2.78 kpc from a DR3 parallax as printed with no zero point stated (2.38 to 3.33 kpc), and about 3 kpc with no method read. The corrected distance is below all of them: that is what the data gave under a contract fixed beforehand, not an agreement with the literature.',
      tool: CM({ view: 0, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'one-sentence',
      stage: STARS,
      type: 'question',
      kind: 'short',
      rubric:
        'Full credit for saying that a star in the overlap of the cluster and the field cannot be assigned with certainty, that the probability states how likely it is, and that a count of members depends on a threshold that has to be stated. Credit adding that a label would hide the uncertainty from anyone using the list. Do not credit an answer that only says that probabilities are more accurate.',
      title: 'Why a probability',
      body: `A table with a member / not member column is easier to use.`,
      prompt:
        'Explain why a membership probability is more honest than a label for a star whose motion lies between the cluster and the field.',
      tool: CM({ view: 0, dims: 1, threshold: 0.5 }),
    },
    {
      sid: 'what-you-worked-out',
      stage: STARS,
      type: 'read',
      title: 'What you worked out',
      body: `A cluster is a clump in proper motion that the field does not make.
             A mixture fit puts a narrow component on it and a broad one on the
             field, and gives every star a probability. About 506 of 993 stars
             are members, moving at (−1.23, −2.04)&nbsp;mas/yr; a count depends
             on a threshold that is chosen, though here it hardly matters.
             A color-magnitude diagram the fit never saw confirms a single
             population. With a zero point applied star by star, their parallax
             gives 2.324&nbsp;kpc, a statistical interval of 2.316 to 2.332&nbsp;kpc
             with no systematic floor, and not validated against a published
             catalog distance.`,
      tool: CM({ view: 1, dims: 1, threshold: 0.5 }),
    },
  ],
};

export default CLUSTER_MEMBERSHIP;
