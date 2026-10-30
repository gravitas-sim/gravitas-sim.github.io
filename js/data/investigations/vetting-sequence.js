// =============================================================================
// Planet or Not? (Prompt 228)
// -----------------------------------------------------------------------------
// One investigation at three depths, in one module that also carries its Spanish words, its
// deeper steps and its instructor content: this is the one closure file the prompt adds
// (D-R10-228-05), because the shared sequence files sit at their line ceilings. The per-lesson
// path every loader builds from an id is a one-line re-export of a named export here, and the
// instructor modules read INSTRUCTOR. No imports: every number a step states is recomputed in
// tests/vettingLessons.test.js from the instrument (js/vettingWidgets.js over
// js/vettingField.js and the kernel js/kernels/vetting/). Every step carries a `sid`, an
// opaque stable id that student progress is keyed by.
//
// The candidates are synthetic and say so. What they teach is rejection and ambiguity: a
// candidate that no test rejects is not validated, a test that cannot decide says so, and no
// step grades "planet" as the answer.
// =============================================================================

const near = (x, target, tolerance) =>
  Number.isFinite(x) && Math.abs(x - target) <= tolerance;

const STAGE = {
  spacing: 150,
  fit: true,
  stars: [
    { role: 'star', name: 'A star with a dip', teffK: 5800, lumSun: 1 },
    { role: 'star', name: 'A neighbor', teffK: 5200, lumSun: 0.4 },
  ],
};
/** The vetting panel: candidate 0 to 7 (A to H); plots 0 hidden, 1 shown; view 0 odd and even, 1 half an orbit later, 2 where the light dips; truth 0 hidden, 1 shown. */
const VET = (values = {}) => ({
  id: 'vetting-checklist',
  values: { candidate: 0, plots: 0, view: 0, truth: 0, ...values },
});

export const PLANET_OR_NOT = {
  id: 'planet-or-not',
  thumbnail: 'images/investigations/planet-or-not.webp',
  title: 'Planet or Not?',
  subtitle:
    'Three tests try to reject a transit candidate, and some candidates cannot be decided: learn what a passed checklist means and what it does not',
  duration: '15-30 min',
  level: 'Introductory astronomy',
  audience: 'intro',
  textbook: { chapter: 21, section: null },
  courseLevel: 'majors',
  mathematics: 'algebra',
  prerequisites: ['transit-photometry'],
  tags: ['exoplanets', 'observing'],
  lock: { placement: true, inspector: true },
  depths: ['core', 'quantitative', 'advanced'],
  objectives: [
    'Say what each of three tests (odd and even depths, a second eclipse, and where the light dips) can reject, and which false positive each one misses',
    'Read a verdict of pass, fail or inconclusive with its reason, and say why inconclusive is an answer and not a failure',
    'Say that a candidate that passes every test is not validated, and what the tests could not see',
    'Decide a candidate from its checklist and justify the decision, including when the right decision is that the data cannot decide',
  ],
  steps: [
    {
      sid: 'a-dip-is-a-candidate',
      stage: STAGE,
      type: 'read',
      title: 'A dip is a candidate',
      body: `A star dims a little, every few days, for a few hours. That could be a planet crossing in front of it.
             It could also be a star crossing in front of another, with a third star&rsquo;s light mixed in so the dip
             looks small, or an eclipsing pair next to the target that the same pixels also collect. A dip is only a
             <strong>candidate</strong>. Vetting is the work of trying to reject it.\n\nThe panel vets a synthetic
             candidate with three tests: do odd and even transits have the same depth, is there a second eclipse half
             an orbit later, and, on frames of the star and its neighbor, is the light that dips at the
             target&rsquo;s position. Every candidate here was made by a model, and the panel can show what made it.`,
      tool: VET(),
    },
    {
      sid: 'read-the-checklist',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A clean candidate',
      body: `Candidate A: odd and even transits agree, there is no second eclipse, and the dip is at the
             target&rsquo;s position. Every test says <strong>pass</strong>. The panel&rsquo;s summary says what that
             adds up to.`,
      prompt: 'What does it add up to?',
      options: [
        'It is a planet: it passed every test',
        'It is not rejected, but not validated: the tests rule out some false positives and leave others',
        'It is rejected: a planet should fail some test',
        'The tests do not say anything about it',
      ],
      answer: 1,
      hints: [
        'Read the summary line. Does it use the word planet?',
        'A test can only rule out what it could see. Read what each test says it could see.',
      ],
      because:
        'Not rejected, and not validated. Each test ruled out one kind of false positive: unequal stars at twice the period, a binary on the target with a second eclipse, a neighbor that is dimming. A candidate that survives has not been shown to be a planet; it has failed to be shown to be something else by these tests, with these data. The panel never says planet.',
      misconceptions: [
        {
          id: 'planet',
          option: 0,
          say: 'A passed checklist is not validation. Passing means that each test looked for one kind of false positive and found none it could see. A planet is confirmed by other evidence, a measured mass for instance, or a statistical argument that no false positive is likely.',
        },
        {
          id: 'rejected',
          option: 2,
          say: 'A planet should pass every test; passing is what a real planet does. What passing cannot do is prove that nothing else would also pass.',
        },
      ],
      tool: VET(),
    },
    {
      sid: 'which-test-catches',
      stage: STAGE,
      type: 'predict',
      reveal: 'deep-and-shallow',
      title: 'Deep dips and shallow dips',
      body: `Candidate B alternates: its odd dips are deep and its even dips are shallow. Its light comes from a
             pair of unequal stars next to the target, whose real period is twice the one the candidate shows.`,
      prompt: 'Which test should catch it?',
      options: [
        'Only a larger telescope could catch it',
        'The second eclipse half an orbit later',
        'The odd and even depths: the odd dips are the deeper eclipses of the pair, the even dips the shallower',
        'Neither: a pair of stars dims like a planet',
      ],
      answer: 2,
      hints: [
        'An eclipsing pair has two kinds of eclipse. Which one does the candidate’s period count as dip one, and which as dip two?',
      ],
      because:
        'The odd and even depths. A pair of unequal stars has a deep eclipse and a shallow one. Taken at half its true period, every other dip is a deep one and the rest are shallow, and a planet’s transits do not alternate. The test compares the two depths with their uncertainties.',
      tool: VET({ candidate: 1 }),
    },
    {
      sid: 'deep-and-shallow',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Rejected twice',
      body: `Read the checklist for candidate B. The odd and even depths differ by far more than their uncertainty, and
             the second test finds no second eclipse half an orbit later. The frames say the light that dips is 1.5
             pixels from the target.`,
      prompt: 'Which tests reject B?',
      options: [
        'Only the odd and even depths',
        'The odd and even depths, and the frames; the search for a second eclipse passes',
        'All three',
        'Only the frames',
      ],
      answer: 1,
      hints: [
        'Count the verdicts that say fail. The second eclipse test passes when it could have seen one and did not.',
      ],
      because:
        'Two tests reject it. At the candidate’s period the pair’s two eclipses are the odd and even dips and the second eclipse is the other kind of dip, not a new one half an orbit later, so test 2 passes. The odd-even test and the frames each reject it on their own: a different test reaches the same rejection by a different route.',
      misconceptions: [
        {
          id: 'all-three',
          option: 2,
          say: 'The second eclipse test looks half an orbit after the dip the candidate shows. This pair’s second eclipse is already one of the candidate’s dips, so nothing is there at half an orbit: that test passes, and it is right to.',
        },
      ],
      tool: VET({ candidate: 1, truth: 1 }),
    },
    {
      sid: 'a-dip-on-the-target',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A binary on the target',
      body: `Candidate C: the odd and even depths agree, and the frames put the dip exactly on the target. But
             half an orbit after each dip there is a second, shallower one, half as deep as the first.`,
      prompt: 'What is C?',
      options: [
        'A planet with a moon',
        'Not rejected: two of the three tests pass',
        'Rejected: the second dip is a second eclipse too deep for a planet’s own light, so the target is probably an eclipsing binary',
        'Undecided: the tests disagree',
      ],
      answer: 2,
      hints: [
        'A planet gives out a little light of its own. How deep can its second eclipse be compared with its transit?',
      ],
      because:
        'Rejected by the second eclipse. A planet’s own light is a small share of the star’s, so the eclipse of the planet half an orbit later is a tiny fraction of the transit; a dip half as deep means the thing crossing the star is itself a star. The frames and the odd-even test pass because the dip is on the target and its two eclipses are alike: each test sees one kind of false positive and this one is a kind they cannot see.',
      misconceptions: [
        {
          id: 'two-of-three',
          option: 1,
          say: 'A test that fails is not outvoted by tests that pass. Each test looks for a different false positive, so one that sees its own is enough to reject the candidate.',
        },
      ],
      tool: VET({ candidate: 2 }),
    },
    {
      sid: 'no-frames',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'A clean one with no frames',
      body: `Candidate D passes the first two tests, and no frames were taken, so the third test did not run. The
             summary says <em>not rejected</em>. Show what made it with <strong>Show what made it</strong>.`,
      prompt: 'What does not rejected mean here?',
      options: [
        'That D is a planet, because no test failed',
        'That D should be rejected: a candidate with a missing test cannot pass',
        'Only that two tests passed: the test that looks for a neighbor was not run, so it says nothing, and D is a blend of two equal stars that the light curve alone cannot tell from a planet',
        'That the frames would have passed',
      ],
      answer: 2,
      hints: [
        'Two equal stars at twice the period: every dip is the same depth, and there is no second eclipse at half the period.',
      ],
      because:
        'D is two equal stars at twice the period, next to the target. Every dip is the same depth, so the odd and even depths agree, and there is nothing at half the period, so the second eclipse test passes. Only the frames can say the light that dips is not at the target, and none were taken. A test that was not run is not a pass.',
      misconceptions: [
        {
          id: 'planet',
          option: 0,
          say: 'No test failed because the two that ran cannot see this kind of false positive, and the one that could was not run. Absence of failure is not evidence when the test could not have failed.',
        },
      ],
      tool: VET({ candidate: 3, truth: 1 }),
    },
    {
      sid: 'inconclusive-is-an-answer',
      stage: STAGE,
      type: 'question',
      kind: 'choice',
      title: 'Inconclusive is an answer',
      body: `Candidate F is a faint dip in noisy data, with faint frames. Every test says <strong>inconclusive</strong>,
             and gives a reason: the data are too noisy to exclude what the test looks for.`,
      prompt: 'What should you conclude about F?',
      options: [
        'That it is a planet, because no test rejected it',
        'That it is rejected, because no test passed it',
        'That the tests are broken',
        'Nothing about its nature: the data cannot decide, and the honest report says what would, such as more transits or a better frame',
      ],
      answer: 3,
      hints: [
        'The panel states how large a difference or a second eclipse the data could have seen. Compare it with what the test looks for.',
      ],
      because:
        'Undecided. A test passes only when it could have seen what it looks for; with data this noisy it could not have seen even a large difference, so passing would have claimed more than the data support. Saying so is the result: this candidate is undecidable with these data, and more transits would shrink the uncertainties until a test can answer.',
      misconceptions: [
        {
          id: 'planet',
          option: 0,
          say: 'No test rejected it because none could have. A test that would pass whatever the truth is says nothing, and the panel does not let it pass.',
        },
      ],
      tool: VET({ candidate: 5 }),
    },
    {
      sid: 'what-the-checklist-says',
      stage: STAGE,
      type: 'read',
      title: 'What the checklist says',
      body: `A transit candidate is vetted by tests that each look for one false positive: odd and even depths for
             unequal stars at twice the period, a second eclipse for a binary on the target, and the place where the
             light dips for a neighbor&rsquo;s binary. A test answers pass, fail or <strong>inconclusive</strong>; it
             passes only when it could have seen what it looks for. A candidate that no test rejects is not
             validated, and some candidates cannot be decided with the data in hand. The data here are synthetic:
             real vetting adds a detector&rsquo;s own noise, systematics, and more than one neighbor.`,
      tool: VET(),
    },
  ],
};

/** The deeper steps: quantitative (majors, the set of candidates) and advanced (upper-level), after the core steps they hang on. */
export const PLANET_OR_NOT_DEEPER = {
  id: 'planet-or-not',
  steps: [
    {
      sid: 'decide-e',
      after: 'inconclusive-is-an-answer',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Decide E',
      body: `Candidate E is the same equal-star blend as D, with frames. Read the checklist. Decide it.`,
      prompt: 'What is your decision on E?',
      options: [
        'Undecided: the first two tests pass and the third is not enough',
        'Not rejected: every test passed',
        'Rejected: the frames find the light that dips 1.8 pixels from the target',
        'A planet',
      ],
      answer: 2,
      hints: [
        'Read the third line: the distance of the dip from the target in pixels, and the exclusion radius.',
      ],
      because:
        'Rejected by the frames. The odd-even and second-eclipse tests pass, because two equal stars look like a planet in the light curve; the difference image puts the dip 1.8 pixels from the target, 15 sigma away, so the light that dips belongs to a neighbor. The one test that could see this false positive found it.',
      misconceptions: [
        {
          id: 'planet',
          option: 3,
          say: 'No step in this lesson grades planet as the answer. A candidate is rejected, not rejected or undecided.',
        },
      ],
      tool: VET({ candidate: 4 }),
    },
    {
      sid: 'decide-g',
      after: 'decide-e',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Decide G',
      body: `Candidate G passes all three tests, including the frames: the dip is 0.17 pixels from the target, inside
             the exclusion radius of 0.30 pixels the panel states. Show what made it.`,
      prompt: 'What is your decision on G?',
      options: [
        'Rejected: 0.17 pixels is not zero',
        'A planet: it passed every test',
        'Not rejected, not validated: the frames could only exclude a neighbor farther than 0.30 pixels, and G’s binary is closer than that',
        'Undecided: the frames were inconclusive',
      ],
      answer: 2,
      hints: [
        'The third line says how far away a neighbor would have to be to have been seen. Compare it with where G’s binary is.',
      ],
      because:
        'Not rejected, and the panel’s own number says why that is weak. The test could place the dip to about 0.09 pixels, so it could exclude a source farther than 0.30; G’s binary is 0.15 pixels from the target, inside that radius, where a neighbor looks the same as the target itself. It passes, and it is a false positive. Closer than the frames can separate, only a velocity or a sharper image can tell.',
      misconceptions: [
        {
          id: 'planet',
          option: 1,
          say: 'G passes every test and is a blend. A pass means that nothing the test could see was found, and this blend is below what the frames can see.',
        },
        {
          id: 'not-zero',
          option: 0,
          say: 'An offset of 0.17 pixels is 2 sigma, not 3.44; the uncertainty of the position is about 0.09 pixels, so an offset this small is not a rejection.',
        },
      ],
      tool: VET({ candidate: 6, truth: 1 }),
    },
    {
      sid: 'decide-h',
      after: 'decide-g',
      depth: 'quantitative',
      type: 'question',
      kind: 'choice',
      title: 'Decide H',
      body: `Candidate H is a planet whose odd and even transits really do differ by 20 percent, in noisy data. The odd
             and even depths say <strong>pass</strong>, the second eclipse says <strong>inconclusive</strong> and the
             frames pass.`,
      prompt: 'What is your decision on H?',
      options: [
        'Not rejected: the odd and even depths pass',
        'Rejected: one test did not pass',
        'A planet',
        'Undecided: no test fails, and the second eclipse could not decide; even the odd-even pass could only have seen a large difference',
      ],
      answer: 3,
      hints: [
        'The odd-even line says how large a difference it could have seen. Is 20 percent of the depth bigger than that?',
      ],
      because:
        'Undecided. The odd-even test passed because the two depths happened to agree within noise, but the panel says it could only have seen a difference of about 37 percent of the depth; the true difference is 20 percent, which it could not see. The second eclipse test could not decide. No test failed and the passes are weak: the report is that the data cannot decide.',
      misconceptions: [
        {
          id: 'one-pass',
          option: 0,
          say: 'The pass is real, but it says only that no difference larger than about 37 percent of the depth is there. A 20 percent difference passes this test often at this noise.',
        },
      ],
      tool: VET({ candidate: 7, truth: 1 }),
    },
    {
      sid: 'read-the-power',
      after: 'decide-h',
      depth: 'quantitative',
      type: 'measure',
      title: 'What the test could see',
      body: `For candidate H, read the odd-even line: the smallest difference between the odd and even depths the test
             could have seen, as a percent of the depth. Then say whether a 20 percent difference was within reach.`,
      fields: [
        {
          id: 'a',
          label: 'Smallest difference it could see',
          unit: 'percent of the depth',
          hint: '37',
        },
      ],
      validate: v => {
        if (!Number.isFinite(v.a)) return null;
        if (near(v.a, 37, 2)) {
          return {
            level: 'ok',
            message:
              'About 37 percent of the depth. A 20 percent difference is below it, so the test could not have seen it: its pass for H only rules out differences larger than that.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose candidate H and read the odd and even depths line: it could see a difference of 0.43 percent, about 37 percent of the depth.',
        };
      },
      tool: VET({ candidate: 7 }),
    },
    {
      sid: 'justify-the-set',
      after: 'read-the-power',
      depth: 'quantitative',
      type: 'question',
      kind: 'short',
      title: 'Justify the set',
      body: `You have decided E, F, G and H. A decision without its reasons is not a vetting report.`,
      prompt:
        'For each of E, F, G and H say whether it is rejected, not rejected or undecided, name the evidence from the checklist, and for the ones you cannot decide say what observation would decide them.',
      rubric:
        'Credit for deciding E as rejected by the frames, F as undecidable from the data (every test inconclusive), G as not rejected but not validated because its neighbor is inside the frames’ exclusion radius, and H as undecided because the odd-even pass could not have seen a 20 percent difference; for naming the evidence (the distance and radius, the reasons for inconclusive, the smallest difference seen); for saying what would decide F and H (more transits, a better frame) and G (a velocity or a sharper image); and for never calling any of them a planet. Do not mark the length.',
      rubricCriteria: [
        {
          name: 'Decides each candidate from its checklist',
          kind: 'correctness',
          levels: [
            {
              label: 'Full',
              points: 3,
              text: 'E rejected, F undecided, G not rejected and not validated, H undecided, each as the checklist says.',
            },
            {
              label: 'Partly',
              points: 1,
              text: 'Two or three of the four decisions agree with the checklist.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'One or none agree, or a candidate is called a planet.',
            },
          ],
        },
        {
          name: 'Recognizes what cannot be decided',
          kind: 'reasoning',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says why F and H cannot be decided (the data are too noisy for the tests to have seen what they look for) and why G cannot be excluded.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Treats a pass as a proof or an inconclusive as a failure.',
            },
          ],
        },
        {
          name: 'States what the tests could and could not see',
          kind: 'uncertainty',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Uses the panel’s numbers: the smallest difference the odd-even test could see, the exclusion radius, the upper limit on a second eclipse.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Gives a verdict without a number from the panel.',
            },
          ],
        },
        {
          name: 'Names a next observation',
          kind: 'completion',
          levels: [
            {
              label: 'Full',
              points: 1,
              text: 'Names an observation that would help for at least two of F, G and H.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Names none.',
            },
          ],
        },
      ],
      tool: VET({ candidate: 5 }),
    },
    {
      sid: 'the-exclusion-radius',
      after: 'justify-the-set',
      depth: 'advanced',
      type: 'measure',
      title: 'How close is too close',
      body: `Choose candidate G. Read, from the third line, how far the dip is from the target and the exclusion radius:
             how far away a neighbor would have to be for the frames to have seen it.`,
      fields: [
        {
          id: 'a',
          label: 'Distance of the dip from the target',
          unit: 'pixels',
          hint: '0.17',
        },
        { id: 'b', label: 'Exclusion radius', unit: 'pixels', hint: '0.30' },
      ],
      validate: v => {
        if (![v.a, v.b].every(Number.isFinite)) return null;
        if (near(v.a, 0.17, 0.02) && near(v.b, 0.3, 0.02)) {
          return {
            level: 'ok',
            message:
              'The dip is 0.17 pixels from the target, inside the 0.30 exclusion radius: the frames cannot tell a neighbor that close from the target itself. The radius is 3.44 times the uncertainty of the dip’s position, which a brighter target or more frames would shrink.',
          };
        }
        return {
          level: 'error',
          message:
            'Choose candidate G and read the third line: the dip is 0.17 pixels from the target and the exclusion radius is 0.30 pixels.',
        };
      },
      tool: VET({ candidate: 6, view: 2, plots: 1 }),
    },
    {
      sid: 'what-a-pass-leaves',
      after: 'the-exclusion-radius',
      depth: 'advanced',
      type: 'question',
      kind: 'short',
      title: 'What a pass leaves',
      body: `Read the line <em>What the thresholds do</em>: on seeded synthetic ensembles it states how often the
             committed thresholds reject a real planet and how often a false positive passes. The thresholds were
             fixed before the kernel existed, and no ensemble includes a neighbor closer than the frames can
             separate or an eccentric binary whose second eclipse is not at half an orbit.`,
      prompt:
        'Name two kinds of false positive these tests would pass, say why none of the three can see them, and say what a validated planet needs that a passed checklist does not.',
      rubric:
        'Credit for two of: two equal stars at twice the period with no frames (odd-even and second eclipse cannot see it), a neighbor inside the frames’ exclusion radius, an eccentric binary whose second eclipse is not at half an orbit (the search is at 0.5), a candidate too noisy for any test; and for saying that validation needs independent evidence such as a measured mass or a statistical argument over the false positives that remain. Do not mark the length.',
      rubricCriteria: [
        {
          name: 'Names false positives the tests miss',
          kind: 'correctness',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Names two real blind spots and says which test misses each.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Names fewer than two, or names a case a test does catch.',
            },
          ],
        },
        {
          name: 'Says what validation needs',
          kind: 'reasoning',
          levels: [
            {
              label: 'Full',
              points: 2,
              text: 'Says that validation needs evidence the tests do not give, such as a mass or a probability that no false positive remains.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Says a passed checklist is enough, or gives no reason.',
            },
          ],
        },
        {
          name: 'States the limits',
          kind: 'uncertainty',
          levels: [
            {
              label: 'Full',
              points: 1,
              text: 'Says what the synthetic ensembles do not include.',
            },
            {
              label: 'Not yet',
              points: 0,
              text: 'Treats the rates as true of real data.',
            },
          ],
        },
      ],
      tool: VET({ candidate: 3 }),
    },
  ],
};

export const PLANET_OR_NOT_ES = {
  title: '¿Planeta o no?',
  subtitle:
    'Tres pruebas intentan rechazar un candidato a tránsito, y algunos candidatos no se pueden decidir: aprende qué significa una lista superada y qué no significa',
  objectives: [
    'Decir qué puede rechazar cada una de tres pruebas (profundidades impares y pares, un segundo eclipse y dónde baja la luz), y qué falso positivo se le escapa a cada una',
    'Leer un veredicto de aprobada, suspendida o no concluyente con su motivo, y decir por qué no concluyente es una respuesta y no un fallo',
    'Decir que un candidato que pasa todas las pruebas no está validado, y qué no pudieron ver las pruebas',
    'Decidir un candidato a partir de su lista y justificar la decisión, incluso cuando la decisión correcta es que los datos no pueden decidir',
  ],
  steps: [
    {
      title: 'Una caída es un candidato',
      body: `Una estrella se atenúa un poco, cada pocos días, durante unas horas. Podría ser un planeta que pasa por delante. También podría ser una estrella que pasa por delante de otra, con la luz de una tercera mezclada para que la caída parezca pequeña, o una pareja eclipsante junto al objetivo que los mismos píxeles también recogen. Una caída es solo un <strong>candidato</strong>. Verificar es el trabajo de intentar rechazarlo.\n\nEl panel verifica un candidato sintético con tres pruebas: si los tránsitos impares y pares tienen la misma profundidad, si hay un segundo eclipse media órbita después y, en imágenes de la estrella y de su vecina, si la luz que baja está en la posición del objetivo. Todos los candidatos de aquí los hizo un modelo, y el panel puede mostrar qué lo hizo.`,
    },
    {
      title: 'Un candidato limpio',
      body: `Candidato A: los tránsitos impares y pares coinciden, no hay segundo eclipse, y la caída está en la posición del objetivo. Todas las pruebas dicen <strong>aprobada</strong>. El resumen del panel dice a qué equivale eso.`,
      prompt: '¿A qué equivale?',
      options: [
        'Es un planeta: pasó todas las pruebas',
        'No está rechazado, pero tampoco validado: las pruebas descartan algunos falsos positivos y dejan otros',
        'Está rechazado: un planeta debería suspender alguna prueba',
        'Las pruebas no dicen nada sobre él',
      ],
      hints: [
        'Lee la línea del resumen. ¿Usa la palabra planeta?',
        'Una prueba solo puede descartar lo que podía ver. Lee lo que dice cada prueba que podía ver.',
      ],
      because:
        'No rechazado, y no validado. Cada prueba descartó un tipo de falso positivo: estrellas desiguales con el doble del período, una binaria en el objetivo con un segundo eclipse, una vecina que se atenúa. Un candidato que sobrevive no se ha demostrado planeta; no se ha demostrado otra cosa con estas pruebas y estos datos. El panel nunca dice planeta.',
      misconceptions: [
        {
          say: 'Una lista superada no es validación. Aprobar significa que cada prueba buscó un tipo de falso positivo y no encontró ninguno que pudiera ver. Un planeta se confirma con otra evidencia, una masa medida por ejemplo, o con un argumento estadístico de que ningún falso positivo es probable.',
        },
        {
          say: 'Un planeta debería pasar todas las pruebas; pasar es lo que hace uno real. Lo que pasar no puede hacer es demostrar que nada más también pasaría.',
        },
      ],
    },
    {
      title: 'Caídas profundas y someras',
      body: `El candidato B alterna: sus caídas impares son profundas y las pares someras. Su luz viene de una pareja de estrellas desiguales junto al objetivo, cuyo período real es el doble del que muestra el candidato.`,
      prompt: '¿Qué prueba debería atraparlo?',
      options: [
        'Solo un telescopio mayor podría atraparlo',
        'El segundo eclipse media órbita después',
        'Las profundidades impares y pares: las caídas impares son los eclipses más profundos de la pareja y las pares los más someros',
        'Ninguna: una pareja de estrellas atenúa como un planeta',
      ],
      hints: [
        'Una pareja eclipsante tiene dos tipos de eclipse. ¿Cuál cuenta el período del candidato como caída uno y cuál como caída dos?',
      ],
      because:
        'Las profundidades impares y pares. Una pareja de estrellas desiguales tiene un eclipse profundo y uno somero. Tomadas a la mitad de su período real, una de cada dos caídas es profunda y las demás someras, y los tránsitos de un planeta no alternan. La prueba compara las dos profundidades con sus incertidumbres.',
    },
    {
      title: 'Rechazado dos veces',
      body: `Lee la lista del candidato B. Las profundidades impares y pares difieren mucho más que su incertidumbre, y la segunda prueba no encuentra segundo eclipse media órbita después. Las imágenes dicen que la luz que baja está a 1,5 píxeles del objetivo.`,
      prompt: '¿Qué pruebas lo rechazan?',
      options: [
        'Solo las profundidades impares y pares',
        'Las profundidades impares y pares, y las imágenes; la búsqueda de un segundo eclipse se aprueba',
        'Las tres',
        'Solo las imágenes',
      ],
      hints: [
        'Cuenta los veredictos que dicen suspendida. La prueba del segundo eclipse se aprueba cuando podía haber visto uno y no lo vio.',
      ],
      because:
        'Dos pruebas lo rechazan. Con el período del candidato, los dos eclipses de la pareja son las caídas impares y pares y el segundo eclipse es el otro tipo de caída, no uno nuevo media órbita después, así que la prueba 2 se aprueba. La prueba impar-par y las imágenes lo rechazan cada una por su cuenta: una prueba distinta llega al mismo rechazo por otro camino.',
      misconceptions: [
        {
          say: 'La prueba del segundo eclipse mira media órbita después de la caída que muestra el candidato. El segundo eclipse de esta pareja ya es una de las caídas del candidato, así que no hay nada a media órbita: esa prueba se aprueba, y hace bien.',
        },
      ],
    },
    {
      title: 'Una binaria en el objetivo',
      body: `Candidato C: las profundidades impares y pares coinciden, y las imágenes ponen la caída justo en el objetivo. Pero media órbita después de cada caída hay una segunda, más somera, con la mitad de profundidad que la primera.`,
      prompt: '¿Qué es C?',
      options: [
        'Un planeta con una luna',
        'No rechazado: dos de las tres pruebas se aprueban',
        'Rechazado: la segunda caída es un segundo eclipse demasiado profundo para la luz propia de un planeta, así que el objetivo es probablemente una binaria eclipsante',
        'Sin decidir: las pruebas discrepan',
      ],
      hints: [
        'Un planeta da algo de luz propia. ¿Cuán profundo puede ser su segundo eclipse comparado con su tránsito?',
      ],
      because:
        'Rechazado por el segundo eclipse. La luz propia de un planeta es una fracción pequeña de la de la estrella, así que el eclipse del planeta media órbita después es una fracción minúscula del tránsito; una caída de la mitad de profundidad significa que lo que cruza la estrella es otra estrella. Las imágenes y la prueba impar-par se aprueban porque la caída está en el objetivo y sus dos eclipses son iguales: cada prueba ve un tipo de falso positivo y este es de un tipo que no pueden ver.',
      misconceptions: [
        {
          say: 'Una prueba que suspende no queda en minoría frente a las que aprueban. Cada prueba busca un falso positivo distinto, así que una que ve el suyo basta para rechazar al candidato.',
        },
      ],
    },
    {
      title: 'Uno limpio sin imágenes',
      body: `El candidato D pasa las dos primeras pruebas, y no se tomaron imágenes, así que la tercera prueba no se hizo. El resumen dice <em>no rechazado</em>. Muestra qué lo hizo con <strong>Mostrar qué lo hizo</strong>.`,
      prompt: '¿Qué significa aquí no rechazado?',
      options: [
        'Que D es un planeta, porque ninguna prueba suspendió',
        'Que D debería rechazarse: un candidato al que le falta una prueba no puede pasar',
        'Solo que dos pruebas se aprobaron: la prueba que busca una vecina no se hizo, así que no dice nada, y D es una mezcla de dos estrellas iguales que la curva de luz sola no distingue de un planeta',
        'Que las imágenes se habrían aprobado',
      ],
      hints: [
        'Dos estrellas iguales con el doble del período: todas las caídas tienen la misma profundidad y no hay segundo eclipse a la mitad del período.',
      ],
      because:
        'D son dos estrellas iguales con el doble del período, junto al objetivo. Todas las caídas tienen la misma profundidad, así que las profundidades impares y pares coinciden, y no hay nada a la mitad del período, así que la prueba del segundo eclipse se aprueba. Solo las imágenes pueden decir que la luz que baja no está en el objetivo, y no se tomó ninguna. Una prueba que no se hizo no es una prueba aprobada.',
      misconceptions: [
        {
          say: 'Ninguna prueba suspendió porque las dos que se hicieron no pueden ver este tipo de falso positivo, y la que podía no se hizo. La ausencia de fallo no es evidencia cuando la prueba no podía fallar.',
        },
      ],
    },
    {
      title: 'No concluyente es una respuesta',
      body: `El candidato F es una caída débil en datos ruidosos, con imágenes débiles. Todas las pruebas dicen <strong>no concluyente</strong>, y dan un motivo: los datos son demasiado ruidosos para excluir lo que busca la prueba.`,
      prompt: '¿Qué deberías concluir sobre F?',
      options: [
        'Que es un planeta, porque ninguna prueba lo rechazó',
        'Que está rechazado, porque ninguna prueba lo aprobó',
        'Que las pruebas están rotas',
        'Nada sobre su naturaleza: los datos no pueden decidir, y el informe honesto dice qué lo decidiría, como más tránsitos o una imagen mejor',
      ],
      hints: [
        'El panel dice cuán grande una diferencia o un segundo eclipse podían haber visto los datos. Compáralo con lo que busca la prueba.',
      ],
      because:
        'Sin decidir. Una prueba se aprueba solo cuando podía haber visto lo que busca; con datos tan ruidosos no podía haber visto ni una diferencia grande, así que aprobar habría afirmado más de lo que los datos sostienen. Decirlo es el resultado: este candidato es indecidible con estos datos, y más tránsitos reducirían las incertidumbres hasta que una prueba pueda responder.',
      misconceptions: [
        {
          say: 'Ninguna prueba lo rechazó porque ninguna podía. Una prueba que se aprobaría fuera cual fuera la verdad no dice nada, y el panel no la deja aprobar.',
        },
      ],
    },
    {
      title: 'Lo que dice la lista',
      body: `Un candidato a tránsito se verifica con pruebas que buscan cada una un falso positivo: las profundidades impares y pares para estrellas desiguales con el doble del período, un segundo eclipse para una binaria en el objetivo, y el lugar donde baja la luz para la binaria de una vecina. Una prueba responde aprobada, suspendida o <strong>no concluyente</strong>; solo se aprueba cuando podía haber visto lo que busca. Un candidato que ninguna prueba rechaza no está validado, y algunos candidatos no se pueden decidir con los datos disponibles. Los datos de aquí son sintéticos: la verificación real añade el ruido propio del detector, sistemáticos y más de una vecina.`,
    },
  ],
};

export const PLANET_OR_NOT_DEEPER_ES = {
  steps: [
    {
      title: 'Decide E',
      body: `El candidato E es la misma mezcla de estrellas iguales que D, con imágenes. Lee la lista. Decídelo.`,
      prompt: '¿Cuál es tu decisión sobre E?',
      options: [
        'Sin decidir: las dos primeras pruebas se aprueban y la tercera no basta',
        'No rechazado: todas las pruebas se aprobaron',
        'Rechazado: las imágenes hallan la luz que baja a 1,8 píxeles del objetivo',
        'Un planeta',
      ],
      hints: [
        'Lee la tercera línea: la distancia de la caída al objetivo en píxeles, y el radio de exclusión.',
      ],
      because:
        'Rechazado por las imágenes. Las pruebas impar-par y del segundo eclipse se aprueban, porque dos estrellas iguales parecen un planeta en la curva de luz; la imagen diferencia pone la caída a 1,8 píxeles del objetivo, a 15 sigma, así que la luz que baja es de una vecina. La única prueba que podía ver este falso positivo lo encontró.',
      misconceptions: [
        {
          say: 'Ningún paso de esta lección califica planeta como respuesta. Un candidato está rechazado, no rechazado o sin decidir.',
        },
      ],
    },
    {
      title: 'Decide G',
      body: `El candidato G pasa las tres pruebas, también las imágenes: la caída está a 0,17 píxeles del objetivo, dentro del radio de exclusión de 0,30 píxeles que declara el panel. Muestra qué lo hizo.`,
      prompt: '¿Cuál es tu decisión sobre G?',
      options: [
        'Rechazado: 0,17 píxeles no es cero',
        'Un planeta: pasó todas las pruebas',
        'No rechazado, no validado: las imágenes solo podían excluir una vecina a más de 0,30 píxeles, y la binaria de G está más cerca',
        'Sin decidir: las imágenes no fueron concluyentes',
      ],
      hints: [
        'La tercera línea dice a qué distancia tendría que estar una vecina para haberse visto. Compárala con dónde está la binaria de G.',
      ],
      because:
        'No rechazado, y el propio número del panel dice por qué eso es débil. La prueba podía situar la caída con unos 0,09 píxeles, así que podía excluir una fuente a más de 0,30; la binaria de G está a 0,15 píxeles del objetivo, dentro de ese radio, donde una vecina se ve igual que el propio objetivo. Pasa, y es un falso positivo. Más cerca de lo que las imágenes pueden separar, solo una velocidad o una imagen más nítida pueden decidir.',
      misconceptions: [
        {
          say: 'G pasa todas las pruebas y es una mezcla. Aprobar significa que no se halló nada que la prueba pudiera ver, y esta mezcla está por debajo de lo que las imágenes pueden ver.',
        },
        {
          say: 'Un desplazamiento de 0,17 píxeles es 2 sigma, no 3,44; la incertidumbre de la posición es de unos 0,09 píxeles, así que un desplazamiento tan pequeño no es un rechazo.',
        },
      ],
    },
    {
      title: 'Decide H',
      body: `El candidato H es un planeta cuyos tránsitos impares y pares sí difieren un 20 por ciento, en datos ruidosos. Las profundidades impares y pares dicen <strong>aprobada</strong>, el segundo eclipse dice <strong>no concluyente</strong> y las imágenes se aprueban.`,
      prompt: '¿Cuál es tu decisión sobre H?',
      options: [
        'No rechazado: las profundidades impares y pares se aprueban',
        'Rechazado: una prueba no se aprobó',
        'Un planeta',
        'Sin decidir: ninguna prueba suspende, y el segundo eclipse no pudo decidir; incluso la aprobación impar-par solo podía haber visto una diferencia grande',
      ],
      hints: [
        'La línea impar-par dice cuán grande una diferencia podía haber visto. ¿Es el 20 por ciento de la profundidad mayor que eso?',
      ],
      because:
        'Sin decidir. La prueba impar-par se aprobó porque las dos profundidades coincidieron dentro del ruido, pero el panel dice que solo podía haber visto una diferencia de un 37 por ciento de la profundidad; la diferencia real es del 20 por ciento, que no podía ver. La prueba del segundo eclipse no pudo decidir. Ninguna prueba suspendió y las aprobaciones son débiles: el informe es que los datos no pueden decidir.',
      misconceptions: [
        {
          say: 'La aprobación es real, pero solo dice que no hay una diferencia mayor que un 37 por ciento de la profundidad. Una diferencia del 20 por ciento pasa a menudo esta prueba con este ruido.',
        },
      ],
    },
    {
      title: 'Lo que la prueba podía ver',
      body: `Para el candidato H, lee la línea impar-par: la menor diferencia entre las profundidades impares y pares que la prueba podía haber visto, como porcentaje de la profundidad. Luego di si una diferencia del 20 por ciento estaba a su alcance.`,
      fields: [{ label: 'Menor diferencia que podía ver' }],
    },
    {
      title: 'Justifica el conjunto',
      body: `Has decidido E, F, G y H. Una decisión sin sus razones no es un informe de verificación.`,
      prompt:
        'Para cada uno de E, F, G y H di si está rechazado, no rechazado o sin decidir, nombra la evidencia de la lista, y para los que no puedes decidir di qué observación los decidiría.',
      rubric:
        'Crédito por decidir E como rechazado por las imágenes, F como indecidible con los datos (todas las pruebas no concluyentes), G como no rechazado pero no validado porque su vecina está dentro del radio de exclusión de las imágenes, y H como sin decidir porque la aprobación impar-par no podía haber visto una diferencia del 20 por ciento; por nombrar la evidencia (la distancia y el radio, los motivos de no concluyente, la menor diferencia vista); por decir qué decidiría F y H (más tránsitos, una imagen mejor) y G (una velocidad o una imagen más nítida); y por no llamar planeta a ninguno. No califique la extensión.',
      rubricCriteria: [
        {
          name: 'Decide cada candidato a partir de su lista',
          levels: [
            {
              label: 'Completo',
              text: 'E rechazado, F sin decidir, G no rechazado y no validado, H sin decidir, cada uno como dice la lista.',
            },
            {
              label: 'En parte',
              text: 'Dos o tres de las cuatro decisiones coinciden con la lista.',
            },
            {
              label: 'Aún no',
              text: 'Una o ninguna coinciden, o se llama planeta a un candidato.',
            },
          ],
        },
        {
          name: 'Reconoce lo que no se puede decidir',
          levels: [
            {
              label: 'Completo',
              text: 'Dice por qué F y H no se pueden decidir (los datos son demasiado ruidosos para que las pruebas hayan visto lo que buscan) y por qué G no se puede excluir.',
            },
            {
              label: 'Aún no',
              text: 'Trata una aprobación como una prueba o un no concluyente como un fallo.',
            },
          ],
        },
        {
          name: 'Declara lo que las pruebas podían y no podían ver',
          levels: [
            {
              label: 'Completo',
              text: 'Usa los números del panel: la menor diferencia que podía ver la prueba impar-par, el radio de exclusión, el límite superior de un segundo eclipse.',
            },
            {
              label: 'Aún no',
              text: 'Da un veredicto sin un número del panel.',
            },
          ],
        },
        {
          name: 'Nombra una observación siguiente',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra una observación que ayudaría en al menos dos de F, G y H.',
            },
            { label: 'Aún no', text: 'No nombra ninguna.' },
          ],
        },
      ],
    },
    {
      title: 'Cuán cerca es demasiado cerca',
      body: `Elige el candidato G. Lee, en la tercera línea, a qué distancia del objetivo está la caída y el radio de exclusión: a qué distancia tendría que estar una vecina para que las imágenes la hubieran visto.`,
      fields: [
        { label: 'Distancia de la caída al objetivo' },
        { label: 'Radio de exclusión' },
      ],
    },
    {
      title: 'Lo que deja una aprobación',
      body: `Lee la línea <em>Qué hacen los umbrales</em>: en conjuntos sintéticos con semilla dice con qué frecuencia los umbrales fijados rechazan un planeta real y con qué frecuencia pasa un falso positivo. Los umbrales se fijaron antes de que existiera el núcleo, y ningún conjunto incluye una vecina más cerca de lo que las imágenes pueden separar ni una binaria excéntrica cuyo segundo eclipse no esté a media órbita.`,
      prompt:
        'Nombra dos tipos de falso positivo que estas pruebas pasarían, di por qué ninguna de las tres puede verlos, y di qué necesita un planeta validado que una lista superada no tiene.',
      rubric:
        'Crédito por dos de: dos estrellas iguales con el doble del período sin imágenes (la prueba impar-par y la del segundo eclipse no pueden verlo), una vecina dentro del radio de exclusión de las imágenes, una binaria excéntrica cuyo segundo eclipse no está a media órbita (la búsqueda es en 0,5), un candidato demasiado ruidoso para cualquier prueba; y por decir que la validación necesita evidencia independiente, como una masa medida o un argumento estadístico sobre los falsos positivos que quedan. No califique la extensión.',
      rubricCriteria: [
        {
          name: 'Nombra falsos positivos que las pruebas no ven',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra dos puntos ciegos reales y dice qué prueba no ve cada uno.',
            },
            {
              label: 'Aún no',
              text: 'Nombra menos de dos, o nombra un caso que una prueba sí atrapa.',
            },
          ],
        },
        {
          name: 'Dice qué necesita la validación',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la validación necesita evidencia que las pruebas no dan, como una masa o una probabilidad de que no quede ningún falso positivo.',
            },
            {
              label: 'Aún no',
              text: 'Dice que basta una lista superada, o no da razón.',
            },
          ],
        },
        {
          name: 'Declara los límites',
          levels: [
            {
              label: 'Completo',
              text: 'Dice qué no incluyen los conjuntos sintéticos.',
            },
            {
              label: 'Aún no',
              text: 'Trata las tasas como ciertas para datos reales.',
            },
          ],
        },
      ],
    },
  ],
};

const CONTENT = {
  'planet-or-not': {
    topic:
      'Vetting a transit candidate: three tests each look for one false positive (odd and even depths for unequal stars at twice the period, a second eclipse half an orbit later for a binary on the target, and the place where the light dips on frames for a neighbor’s binary), each answers pass, fail or inconclusive with a reason and an uncertainty, a pass is only given when the test could have seen what it looks for, and a candidate that no test rejects is not validated',
    difficulty:
      'Introductory (what each test rejects, what inconclusive means, why a clean candidate is not a planet); majors (decide four unseen candidates from their checklists, one rejected by the frames, one undecidable because it is too noisy, one that passes with a neighbor inside the frames’ exclusion radius, one that passes odd-even without being able to see its true 20 percent difference; justify the set); upper-level (the exclusion radius as 3.44 times the position’s uncertainty, what the committed thresholds do on ensembles, and what a validated planet needs beyond a checklist)',
    placement:
      'In a unit on exoplanets after Transit Photometry (and beside Two Stars Eclipsing, whose eclipses are the false positives it vets); before a unit on occurrence rates or on statistical validation. It pairs with the Exoplanet Observatory’s guides A Star That Is Not Alone and Is It a Planet?, which use real TESS light curves, while this one uses synthetic candidates whose truth can be shown.',
    overview:
      'Students meet a clean candidate and learn that passing every test is not validation, predict which test catches a pair of unequal stars at twice the period, see a candidate rejected by two tests and another by the second eclipse alone, meet a clean-looking candidate with no frames that is a blend, and learn that a noisy candidate is undecided and that saying so is the result. At the deeper depths they decide a set of candidates, justify the decisions with the panel’s numbers, read what a test could and could not see, and say what a validated planet needs beyond a checklist.',
    priorKnowledge: [
      'A transit as a periodic dip in a star’s light with a depth and a duration (Transit Photometry)',
      'That an eclipsing binary has two eclipses of different depths when its stars differ',
      'What an uncertainty is, and what it means that a measurement is within its uncertainty of another',
    ],
    keyConcepts: [
      {
        heading: 'Each test looks for one false positive',
        body: 'Odd and even depths see unequal stars at twice the period; a second eclipse half an orbit later sees a binary on the target; the difference image sees a neighbor’s binary. A test cannot see another’s false positive, so a failed test is not outvoted by passed ones.',
      },
      {
        heading: 'Inconclusive is an answer',
        body: 'A test passes only when it could have seen what it looks for, and the panel says how large a difference or a second eclipse it could have seen. With noisy data it could not, and the verdict is inconclusive with the reason; the honest report says what would decide it.',
      },
      {
        heading: 'A passed checklist is not validation',
        body: 'Two equal stars at twice the period pass the odd-even and second-eclipse tests by construction; a neighbor closer than the exclusion radius passes the frames. The summary says rejected, undecided or not rejected, never planet.',
      },
    ],
    features: [
      {
        name: 'The vetting panel (vetting-checklist)',
        text: 'Eight synthetic candidates (A to H) with three tests each: the odd and even depths with their uncertainties and the smallest difference the test could see, the search for a second eclipse with its upper limit, and the difference-image centroid on frames with its exclusion radius; the overall in three words; the rates the committed thresholds give on seeded ensembles; the record the summary makes; the plots behind a control and the truth behind another.',
      },
      {
        name: 'Depth',
        text: 'Quantitative: decide E, G and H, read what the odd-even test could see, justify the set (a rubric with four criteria). Advanced: the exclusion radius, and what a pass leaves (a rubric with three criteria).',
      },
      {
        name: 'A model, checked against an independent implementation',
        text: 'The candidates are made by the app’s transit and eclipsing-binary models and its detector frame model; the tests are checked against an independent implementation written for the purpose, and the two confirmed planets HD 209458 b and Kepler-13 A b are not rejected. No cited vetting package was run. Every candidate here is synthetic.',
      },
    ],
    misconceptions: [
      {
        claim: 'A candidate that passes every test is a planet.',
        response:
          'It is not rejected. Each test rules out one false positive it could see; validation needs evidence such as a measured mass, or a statistical argument that no false positive remains likely.',
      },
      {
        claim: 'If two of three tests pass, the candidate is probably fine.',
        response:
          'The tests are not votes. Each looks for a different false positive, and one that finds its own rejects the candidate whatever the others say.',
      },
      {
        claim: 'Inconclusive means the student did not get an answer.',
        response:
          'It is the answer: with these data the test could not have seen what it looks for, so passing would have claimed too much. Naming what would decide it is part of the report.',
      },
    ],
    teachingNotes: [
      'The tests are defined in VETTING.md and fixed in tests/fixtures/vetting/thresholds.json before the code existed: odd and even depths in the central half of the transit against a local baseline, with a red-noise factor; a second eclipse searched at half an orbit, the same way; the difference image, the out-of-transit mean minus the in-transit mean, whose centroid is compared with the target’s position (Bryson et al. 2013 in form).',
      'A test passes only when it could have seen what it looks for: the odd-even test must be able to see a difference of half the depth, the second-eclipse test a second eclipse a tenth as deep as the primary, and the frames must exclude a source farther than 1 pixel. Otherwise the verdict is inconclusive with the reason, which is a result and is graded as one.',
      'The candidates are synthetic: the transit of a limb-darkened planet, an eclipsing binary diluted by the target’s light, and 17 by 17 pixel frames from the detector forward model. The committed thresholds do the following on seeded ensembles: a real planet is rejected by odd-even in about 0.5 percent and by the second-eclipse search in none of 400; a blend of unequal stars is accepted by odd-even in none of 400; the frames pass a neighbor’s blend in none of 60 and reject a planet on its own target in none. The blind spots are stated, not hidden: equal stars without frames, a neighbor closer than the exclusion radius, an eccentric binary whose second eclipse is not at half an orbit, and any candidate too noisy for a test.',
      'No cited vetting package (exovetter, lightkurve, TRICERATOPS) was run. The oracle is an independent implementation written for the purpose, with its own light curves (batman) and its own frames; it shares the contract’s definitions. The two confirmed planets HD 209458 b and Kepler-13 A b are not rejected by the light-curve tests. Frames on real data are not shown: none ship.',
    ],
    discussion: [
      'Candidate D passes two tests and the third was not run. What would you tell someone who says it is probably a planet?',
      'Candidate G passes every test and is a blend. What would the frames have needed for the test to see it?',
      'A test that could not decide returns inconclusive. Is a report that says “the data cannot decide” a worse report than one that picks a side? What would you need to be able to pick?',
    ],
    extensions: [
      'Open candidate F and say how many more transits would shrink the odd-even uncertainty enough for the test to pass a clean planet (the uncertainty falls as the square root of the number of transits).',
      'Use the list of blind spots to write the one follow-up observation that would settle each of D, G and H.',
    ],
    assessment:
      'Core: the two predictions and the choices; the clean candidate is not a planet, the blend with no frames is not rejected, and the faint candidate is undecided. Quantitative: the numeric read of the smallest difference the odd-even test could see (37 percent of the depth, within 2) and the justification of the set. Advanced: the distance and radius (0.17 and 0.30 pixels, within 0.02) and the written account of what a pass leaves.',
    modelNotes:
      'js/kernels/vetting/ (depth.js, lightcurve.js, frames.js, blends.js, summary.js), js/vettingField.js, js/vettingWidgets.js, VETTING.md. The thresholds are tests/fixtures/vetting/thresholds.json, committed before the kernel; the oracle is tools/vetting-oracle/oracle.py (numpy, scipy, batman).',
  },
};

const FLOW = {
  'planet-or-not': [
    {
      from: 'a-dip-is-a-candidate',
      to: 'read-the-checklist',
      text: 'A dip is only a candidate, and a clean candidate that passes three tests is not rejected but not validated.',
    },
    {
      from: 'which-test-catches',
      to: 'a-dip-on-the-target',
      text: 'The prediction of which test catches unequal stars at twice the period, a candidate rejected by two tests, and a binary on the target caught by its second eclipse.',
    },
    {
      from: 'no-frames',
      to: 'inconclusive-is-an-answer',
      text: 'A clean-looking blend with no frames, where a test that was not run says nothing, and a faint candidate where every test is inconclusive.',
    },
    {
      from: 'what-the-checklist-says',
      to: 'what-the-checklist-says',
      text: 'The summary: each test’s false positive, inconclusive as an answer, and the limit of a passed checklist.',
    },
  ],
};

// The expectations are the core steps' checked numbers; the deeper steps' are in `assessment`.
const EXPECTATIONS = {
  'planet-or-not': {
    'read-the-checklist':
      'Candidate A is not rejected and not validated: every test passes, and the summary never says planet.',
    'inconclusive-is-an-answer':
      'Candidate F is undecided: every test is inconclusive because the data are too noisy to exclude what each looks for, and the report says what would decide it.',
  },
};

const BANDS = {
  'planet-or-not': {
    core: 'medium',
    quantitative: 'long',
    advanced: 'long',
  },
};

/** The guides, flows, expectations and time bands of the lesson above. */
export const INSTRUCTOR = {
  content: CONTENT,
  flow: FLOW,
  expectations: EXPECTATIONS,
  bands: BANDS,
};

/** The Spanish shadows by lesson id (what instructorLocale.js spreads). */
export const SHADOWS = { 'planet-or-not': PLANET_OR_NOT_ES };

/** The deeper steps by lesson id (what js/investigations/depth*.js read). */
export const DEPTH = { 'planet-or-not': PLANET_OR_NOT_DEEPER };
export const DEPTH_ES = { 'planet-or-not': PLANET_OR_NOT_DEEPER_ES };

/** The lessons, in catalog order (what js/data/investigations.js spreads). */
export default [PLANET_OR_NOT];
