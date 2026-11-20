// =============================================================================
// Extending an Experiment
// Content only, no imports. The student runs the compute page's reviewed
// notebook "population-at-scale" on twenty seeded planets of the Binary Planet
// Lab and types back the numbers its capsule holds. tests/
// computeInvestigations.test.js holds every literal here to the notebook's own
// answer and to tests/fixtures/compute/investigation-runs.json, written by
// tools/compute-answers.mjs. `move-the-definition-yours` and `which-trial-moved`
// take menu choices, so their expected numbers are tables (CUTOFF, MOVED); a
// check sees only its own step, so each menu is a field of its step.
// =============================================================================

/** The run of the-fit: cutoff 3, the baseline every cutoff is compared with. */
const BASE = { edge: 0.255, extended: 0.596 };
/** The notebook's half-way distance and synthetic bound fraction for each cutoff on the menu. */
const CUTOFF = {
  2: { edge: 0.233, extended: 0.5292 },
  4: { edge: 0.289, extended: 0.7007 },
  6: { edge: 0.289, extended: 0.7007 },
  10: { edge: 0.289, extended: 0.7007 },
};
/**
 * The trials that change class between two cutoffs (the smaller first), each
 * as its starting distance and the centre of its bin in the notebook's table,
 * nearest the star first.
 */
const MOVED = {
  '2|3': [[0.2468, 0.255]],
  '2|4': [
    [0.2315, 0.225],
    [0.2468, 0.255],
  ],
  '2|6': [
    [0.2315, 0.225],
    [0.2468, 0.255],
  ],
  '2|10': [
    [0.2315, 0.225],
    [0.2468, 0.255],
  ],
  '3|4': [[0.2315, 0.225]],
  '3|6': [[0.2315, 0.225]],
  '3|10': [[0.2315, 0.225]],
  '4|6': [],
  '4|10': [],
  '6|10': [],
};
/** One field's value for each cutoff, for the answer key. */
const byCutoff = field =>
  Object.fromEntries(Object.entries(CUTOFF).map(([c, r]) => [c, r[field]]));
/** A cutoff, or the group of cutoffs that give the same numbers, in words. */
const named = c =>
  [4, 6, 10].includes(Number(c)) ? 'cutoffs 4, 6 and 10' : `cutoff ${c}`;

const EXTENDING_AN_EXPERIMENT = {
  id: 'extending-an-experiment',
  thumbnail: 'images/scenarios/binary-planet-lab.webp',
  title: 'Extending an Experiment',
  subtitle:
    'From twenty planets that the engine ran to a population of two hundred thousand, with every uncertainty, in Python on the compute page',
  duration: '30-40 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'upper',
  mathematics: 'logarithms',
  prerequisites: ['binary-star-planets'],
  tags: ['exoplanets'],
  lock: { placement: true, inspector: true },
  objectives: [
    'Classify the trials of an experiment result into an outcome, and say how the definition of the outcome moves the result',
    'Run a reviewed Python notebook that fits the chance of an outcome with a bootstrap and extends it to a large synthetic population',
    'Say what the interval of an extension does and does not cover',
    'Explain why a sample of twenty can differ from the population it was drawn from by more than its error bar suggests',
  ],
  steps: [
    {
      sid: 'twenty-planets',
      type: 'read',
      canvas: 'quiet',
      title: 'Twenty planets that the engine ran',
      body: `How well can twenty planets that the engine ran say what a population of
             two hundred thousand would do? The notebook on the compute page answers
             with an interval, and you will see what that interval covers.
             \n\nThe Binary Planet Lab puts a planet near one star of a pair that is ten
             astronomical units apart. An <strong>experiment</strong> on the
             experiment runner ran twenty trials of it: in each the planet started at
             a distance from its star drawn at random between 0.12 and 0.42 of the
             stars' separation, and the engine ran it for about twenty orbits of the binary. Some planets
             stayed in orbit and some were thrown out.
             \n\nThe experiment's result is a file, and the notebook reads it. It
             calls a planet <strong>bound</strong> if its mean distance from the star
             stayed within a cutoff (three, to start) times the distance it started
             at, fits the chance of being bound as a smooth curve of the starting
             distance, repeats the fit on 400 resamples of the twenty to get its
             uncertainty, and draws two hundred thousand synthetic planets to say how
             many would stay bound in a larger population.
             \n\nOpen the compute page at <strong>/compute/</strong> of this site. It
             is online only and downloads about 19 MB of Python the first time, when
             you press the button. Choose the notebook <strong>A population of
             planets, extended</strong>, keep its example input (the twenty planets),
             and its settings at slope 1, 200,000 planets and cutoff 3. Do not press
             Run yet.`,
    },
    {
      sid: 'how-well-can-twenty-place-an-edge',
      type: 'predict',
      reveal: 'the-fit',
      title: 'How well can twenty place an edge',
      body: `Before you run it. The twenty planets started at random distances from
             their star. The ones that stayed bound started close to it and the ones that
             were thrown out started far from it, with a wide gap between the two groups
             and a few close calls near its edge.`,
      prompt:
        'The notebook will report the starting distance where the chance of staying bound is one half, with an uncertainty. That uncertainty will be&hellip;',
      options: [
        'tiny, because two hundred thousand synthetic planets are used',
        'a few hundredths, a fraction of the gap between the last planet that stayed and the first that left',
        'zero, because the engine is exact',
        'large, because twenty is too few to say anything',
      ],
      answer: 1,
      because:
        'The edge lies somewhere in the gap between the last planet that stayed and the first that left, about a tenth of the stars’ separation wide. The bootstrap, which repeats the fit on resamples of the twenty, reports a spread that is a fraction of that gap, a few hundredths; the two hundred thousand synthetic planets add nothing to it.',
    },
    {
      sid: 'the-fit',
      compute: 'population-at-scale',
      type: 'measure',
      title: 'Run it: the edge and the fractions',
      body: `Press <strong>Start the runtime</strong>, wait, then <strong>Run the
             notebook</strong>. Read the quantities it returns and enter them here: the
             starting distance where the chance of staying bound is a half, and the
             uncertainty shown beside it; the fraction of the twenty trials that were
             bound; and the fraction of the synthetic population.`,
      fields: [
        { id: 'edge', label: 'Half-way distance', unit: '', want: '0.255' },
        {
          id: 'edgeSigma',
          label: 'Its uncertainty',
          unit: '',
          want: '0.0243',
        },
        {
          id: 'sample',
          label: 'Fraction bound in the trials',
          unit: '',
          want: '0.6',
        },
        {
          id: 'extended',
          label: 'Fraction bound in the synthetic population',
          unit: '',
          want: '0.596',
        },
      ],
      validate: v => {
        if (![v.edge, v.edgeSigma, v.sample, v.extended].every(Number.isFinite))
          return null;
        if (
          Math.abs(v.edge - 0.255) <= 0.003 &&
          Math.abs(v.edgeSigma - 0.0243) <= 0.004 &&
          Math.abs(v.sample - 0.6) <= 0.01 &&
          Math.abs(v.extended - 0.596) <= 0.02
        ) {
          return {
            level: 'ok',
            message:
              'The edge is at 0.255 of the stars’ separation, good to 0.024, a fraction of the gap of about a tenth that the trials leave open. Twelve of the twenty stayed, and the extension to two hundred thousand gives nearly the same fraction, 0.596, but with an uncertainty of 0.076.',
          };
        }
        return {
          level: 'error',
          message:
            'Check the settings (slope 1, 200,000 planets, cutoff 3) and read the edge, its uncertainty, and the two fractions from the page.',
        };
      },
    },
    {
      sid: 'a-uniform-population',
      compute: 'population-at-scale',
      type: 'measure',
      title: 'A uniform population',
      body: `The twenty planets were drawn uniformly in the starting distance. Set the
             <strong>slope</strong> to <strong>0</strong>, which draws the synthetic
             population the same way, and run again. Enter the fraction bound in the
             synthetic population and how far it is below the trials' fraction of
             0.6.`,
      fields: [
        {
          id: 'extended',
          label: 'Fraction bound, uniform population',
          unit: '',
          want: '0.451',
        },
        {
          id: 'gap',
          label: 'Trials’ fraction minus this',
          unit: '',
          want: '0.149',
        },
      ],
      validate: v => {
        if (![v.extended, v.gap].every(Number.isFinite)) return null;
        if (
          Math.abs(v.extended - 0.451) <= 0.02 &&
          Math.abs(v.gap - 0.149) <= 0.03
        ) {
          return {
            level: 'ok',
            message:
              'A uniform population at the same edge would have 0.451 bound, not 0.6: the twenty drawn happened to put more planets near the star than a uniform draw does on average.',
          };
        }
        return {
          level: 'error',
          message:
            'Set the slope to 0, keep the other two settings, run, read the fraction in the synthetic population, and subtract it from 0.6.',
        };
      },
    },
    {
      sid: 'why-the-sample-differs',
      type: 'question',
      kind: 'choice',
      title: 'Why the sample differs',
      body: `The trials' fraction, 0.6, is 0.15 above the uniform population's, 0.451.
             The bootstrap uncertainty of the extension, 0.081, is about half that
             gap.`,
      prompt: 'What is the best account of the difference?',
      options: [
        'The twenty were a random draw, and a random draw of twenty puts the sample fraction off the population fraction by about its own binomial error, here 0.11',
        'The notebook has a bug that lowers the population fraction',
        'The engine runs differently on the synthetic planets',
        'The bootstrap interval is wrong and should be zero',
      ],
      answer: 0,
      misconceptions: [
        {
          id: 'bug',
          option: 1,
          say: 'The population fraction is the fitted curve averaged over a uniform draw, which is (0.255 − 0.12) ÷ (0.42 − 0.12) = 0.45, worked by hand: nothing is wrong with it.',
        },
        {
          id: 'engine',
          option: 2,
          say: 'No synthetic planet is run by the engine. Each is given the fitted chance, which is the notebook’s assumption.',
        },
      ],
      hints: [
        'A fraction of twenty planets has a binomial error of the square root of p(1 − p) ÷ 20.',
      ],
      because:
        'The sample fraction of twenty has a binomial error near 0.11, so 0.6 against 0.45 is under two of those errors: unremarkable. The population fraction is the model’s average over a uniform draw, and it is what the twenty were meant to estimate.',
    },
    {
      sid: 'move-the-definition-yours',
      canvas: 'scene',
      setup: { scenario: 'Binary Planet Lab', seed: 'binary', paused: true },
      compute: 'population-at-scale',
      type: 'measure',
      title: 'Move the definition',
      body: `The run of the <em>Run it</em> step, with a cutoff of 3, is the baseline.
             Now change what <strong>bound</strong> means. Put the <strong>slope</strong>
             back to <strong>1</strong>, choose a cutoff from the menu, <strong>2</strong>,
             <strong>4</strong>, <strong>6</strong> or <strong>10</strong>, set
             <strong>cutoff</strong> to it, and run again: a planet now counts as bound if it
             stays within that many starting distances, not three. (A distance cutoff, not
             the ejection test of the binary-star investigation.) Enter your cutoff, the
             new half-way distance, and the fraction of the synthetic population.`,
      fields: [
        {
          id: 'cutoff',
          label: 'The cutoff you ran',
          unit: '',
          options: [2, 4, 6, 10],
          want: '6',
        },
        {
          id: 'edge',
          label: 'Half-way distance, your cutoff',
          unit: '',
          want: String(CUTOFF[6].edge),
          by: byCutoff('edge'),
        },
        {
          id: 'extended',
          label: 'Fraction bound, your cutoff',
          unit: '',
          want: String(CUTOFF[6].extended),
          by: byCutoff('extended'),
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.cutoff))
          return [v.edge, v.extended].some(Number.isFinite)
            ? {
                level: 'warn',
                message:
                  'Choose the cutoff you ran from the menu first: what is right depends on it.',
              }
            : null;
        if (![v.edge, v.extended].every(Number.isFinite)) return null;
        const mine = CUTOFF[v.cutoff];
        if (!mine) return null;
        const matches = row =>
          Math.abs(v.edge - row.edge) <= 0.004 &&
          Math.abs(v.extended - row.extended) <= 0.02;
        if (matches(mine)) {
          return {
            level: 'ok',
            message:
              v.cutoff === 2
                ? 'A cutoff of 2 makes one trial stop counting as bound, so 11 of the twenty are bound instead of 12. The edge moved down from 0.255 to 0.233, and the bound fraction from 0.596 to 0.529, with the same twenty planets.'
                : 'Cutoffs 4, 6 and 10 give the same numbers: the edge moved up from 0.255 to 0.289, and the bound fraction from 0.596 to 0.701, with the same twenty planets. No trial’s mean distance lies between four and ten of its starting distances, so raising the cutoff past four changes nothing more. The notebook also warns that the transition is now a clean step, so its width means nothing beyond "sharper than the grid".',
          };
        }
        if (matches(BASE))
          return {
            level: 'error',
            message: `Those are the numbers of the baseline run, cutoff 3. You chose ${v.cutoff}: set the cutoff to ${v.cutoff} on the compute page and run again.`,
          };
        const other = Object.keys(CUTOFF).find(
          c => Number(c) !== v.cutoff && matches(CUTOFF[c])
        );
        if (other)
          return {
            level: 'error',
            message: `Those are the numbers for ${named(other)}. You chose ${v.cutoff}: set the cutoff to ${v.cutoff} on the compute page and run again.`,
          };
        return {
          level: 'error',
          message: `Set the slope to 1 and the cutoff to ${v.cutoff}, keep 200,000 planets, run, and read the half-way distance and the fraction in the synthetic population.`,
        };
      },
    },
    {
      sid: 'which-trial-moved',
      type: 'measure',
      title: 'Which trial moved',
      body: `Nothing about the planets changes between two cutoffs: the same twenty
             trials, the same engine, the same orbits. Only the definition of bound moves,
             so some trial must change class between them, or none.
             \n\nChoose two different cutoffs from the menus, <strong>2</strong>,
             <strong>3</strong>, <strong>4</strong>, <strong>6</strong> or
             <strong>10</strong>; your last choice and the baseline's 3 are a natural pair.
             Run each on the compute page if you have not, and set the <em>bound trials</em>
             column of the notebook's two tables side by side. The table has ten bins of
             starting distance, and its first column holds each bin's center.
             Enter your two cutoffs, how many trials change class between them, and the
             center of the bin nearest the star where the bound count differs. If no bin
             differs, enter 0 and write <strong>none</strong>.`,
      fields: [
        {
          id: 'from',
          label: 'First cutoff',
          unit: '',
          options: [2, 3, 4, 6, 10],
          want: '3',
        },
        {
          id: 'to',
          label: 'Second cutoff',
          unit: '',
          options: [2, 3, 4, 6, 10],
          want: '6',
        },
        {
          id: 'count',
          label: 'Trials that change class',
          unit: '',
          want: '1',
        },
        {
          id: 'where',
          label: 'Nearest bin where the count differs (its center), or none',
          unit: '',
          kind: 'text',
          want: String(MOVED['3|6'][0][1]),
        },
      ],
      validate: v => {
        const word = String(v.where_text ?? '').trim();
        if (![v.from, v.to].every(Number.isFinite))
          return Number.isFinite(v.count) || word
            ? {
                level: 'warn',
                message:
                  'Choose both cutoffs from the menus first: what is right depends on the pair.',
              }
            : null;
        if (!Number.isFinite(v.count) || (!word && !Number.isFinite(v.where)))
          return null;
        const pair = (a, b) => `${Math.min(a, b)}|${Math.max(a, b)}`;
        const trials = (a, b) => (a === b ? [] : (MOVED[pair(a, b)] ?? []));
        const mine = trials(v.from, v.to);
        const none = /^(none|ninguno|ninguna)$/i.test(word);
        const says = list =>
          list.length === 0
            ? none && v.count === 0
            : v.count === list.length &&
              !none &&
              Math.abs(v.where - list[0][1]) <= 0.005;
        const lo = Math.min(v.from, v.to);
        const hi = Math.max(v.from, v.to);
        if (says(mine)) {
          return {
            level: 'ok',
            message: !mine.length
              ? `No trial changes class between cutoffs ${lo} and ${hi}: none has a mean distance between ${lo} and ${hi} of its starting distances, so the two tables agree in every bin.`
              : mine.length === 1
                ? `One trial changes class: the one that started at ${mine[0][0]}, in the bin centered on ${mine[0][1]}. Its mean distance is more than ${lo} and less than ${hi} of its starting distance, so it is unbound at the smaller cutoff and bound at the larger. One reclassification is enough to move the edge: an outcome is a definition, and the uncertainty of the extension does not include the choice of it.`
                : `Two trials change class: the ones that started at ${mine[0][0]} and ${mine[1][0]}, in the bins centered on ${mine[0][1]} and ${mine[1][1]}. Each has a mean distance between ${lo} and ${hi} of its starting distance. An outcome is a definition, and the uncertainty of the extension does not include the choice of it.`,
          };
        }
        // "None" for a pair that moves a trial is not the answer of another pair: say they differ.
        const cutoffs = [2, 3, 4, 6, 10];
        if (mine.length && none)
          return {
            level: 'error',
            message: `The bound counts do differ between cutoffs ${lo} and ${hi}. Compare the bound trials column of the two tables bin by bin, count how many trials change class, and give the center of the bin nearest the star where they differ.`,
          };
        for (const a of cutoffs)
          for (const b of cutoffs)
            if (a < b && pair(a, b) !== pair(lo, hi) && says(trials(a, b)))
              return {
                level: 'error',
                message: `That is the answer for cutoffs ${a} and ${b}, not ${lo} and ${hi}. Compare the bound column of the tables for the two cutoffs you chose.`,
              };
        return {
          level: 'error',
          message: mine.length
            ? `The bound counts do differ between cutoffs ${lo} and ${hi}. Compare the bound trials column of the two tables bin by bin, count how many trials change class, and give the center of the bin nearest the star where they differ.`
            : `No bound count differs between cutoffs ${lo} and ${hi}. If the tables agree in every bin, enter 0 and write none.`,
        };
      },
    },
    {
      sid: 'what-you-worked-out',
      type: 'read',
      title: 'What you worked out',
      body: `Twenty planets, run by the engine, fixed the edge of the bound region to
             about 0.255 &plusmn; 0.024 of the stars' separation. Extended to two hundred
             thousand synthetic planets, the bound fraction was 0.596 &plusmn; 0.076 for a
             population with equal numbers per factor of distance, and 0.451 &plusmn; 0.081
             for a uniform one, which is where the sample's own 0.6 should have been. And
             the definition of bound, the cutoff you chose, moved both the edge and the
             fraction while every planet stayed the same: one trial changing class is
             enough.
             \n\nWhat the interval does not cover: it counts the scatter of twenty
             trials and nothing else. It does not count the choice of a logistic curve,
             the definition of bound, or the draw's range, outside of which no synthetic
             planet is made. A larger synthetic population has a smaller sampling error
             and exactly the same assumptions. "Bound" here is a distance cutoff of the
             notebook, not the ejection test of the binary-star investigation, so the two
             words are not the same claim. The run is yours to keep: its capsule
             records the notebook's hash and the result file's, so a report can cite it.`,
    },
  ],
  retired: {
    'move-the-definition': {
      to: 'move-the-definition-yours',
      release: '3.1',
      was: {
        en: 'Set the cutoff to 6, run again, and enter the new half-way distance and the fraction of the synthetic population.',
        es: 'Poner el umbral en 6, ejecutar de nuevo e introducir la nueva distancia de mitad y la fracción de la población sintética.',
      },
    },
    'what-moved-it': {
      to: 'which-trial-moved',
      release: '3.1',
      was: {
        en: 'Choose why the edge moved between a cutoff of 3 and a cutoff of 6.',
        es: 'Elegir por qué se movió el borde entre un umbral de 3 y uno de 6.',
      },
    },
  },
};

export default EXTENDING_AN_EXPERIMENT;
