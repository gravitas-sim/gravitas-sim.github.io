// The scripted drafts of THRESHOLDS.md U4: per use, 10 that must be refused and
// 10 that must be accepted as drafts. `reply` is what the stand-in endpoint
// puts in its text field; it is not always a string.
const NUMERIC = { kind: 'numeric', answer: 8, tolerance: 0.4 };
const CHOICE = {
  kind: 'choice',
  answer: 0,
  options: [
    'The planet closest to the star completes an orbit fastest of all',
    'The planet farthest from the star completes an orbit fastest',
    'Every planet completes an orbit in the same time',
  ],
};
const EN_A =
  'The bending is 1.75 arcseconds, and the formula holds for one ray only.';
const EN_B = 'Compare P<sup>2</sup> with a<sup>3</sup> for each planet.';
const EN_C = 'A planet that moves faster is closer to the star.';

const r = (label, reply, extra = {}) => ({
  label,
  reply,
  expect: 'refuse',
  ...extra,
});
const a = (label, reply, extra = {}) => ({
  label,
  reply,
  expect: 'accept',
  ...extra,
});
const long = 'x'.repeat(400);

export const SCRIPTS = {
  hint: [
    r('a digit', 'The period comes out near 8 years.', { step: NUMERIC }),
    r(
      'a number word, English',
      'Cube the distance, take the root; expect eight.',
      { step: NUMERIC }
    ),
    r('a number word, Spanish', 'Eleva al cubo y espera ocho de resultado.', {
      step: NUMERIC,
    }),
    r('empty', '   ', { step: NUMERIC }),
    r('not a string', 42, { step: NUMERIC }),
    r('a script tag', '<script>alert(1)</script> Check the cube.', {
      step: NUMERIC,
    }),
    r('an anchor', 'Check <a href="https://example.test">the units</a>.', {
      step: NUMERIC,
    }),
    r('over the length', long, { step: NUMERIC }),
    r('a numeric entity', 'Check the cube of the &#52; planets.', {
      step: NUMERIC,
    }),
    r(
      'the right option, as a hint',
      'Remember that the planet closest to the star completes an orbit fastest of all.',
      { step: CHOICE }
    ),
    a('what to check', 'Check which quantity sits in the denominator.', {
      step: NUMERIC,
    }),
    a('units', 'Look at the units of the distance before you cube it.', {
      step: NUMERIC,
    }),
    a(
      'emphasis',
      'Re-read the <em>axis labels</em> before reading the value.',
      { step: NUMERIC }
    ),
    a(
      'a named entity',
      'Compare the curves&hellip; and see which flattens sooner.',
      { step: NUMERIC }
    ),
    a('method', 'Do the cube and the root as separate steps.', {
      step: NUMERIC,
    }),
    a('concept', 'The year depends on the distance and on the central mass.', {
      step: NUMERIC,
    }),
    a('Spanish', 'Revisa qué magnitud está en el denominador.', {
      step: NUMERIC,
    }),
    a(
      'choice, no leak',
      'Think about what the star pulls hardest on, and what that does to the speed.',
      { step: CHOICE }
    ),
    a('choice, short', 'Compare the planets by their distance from the star.', {
      step: CHOICE,
    }),
    a('sub', 'Keep M<sub>star</sub> and M<sub>planet</sub> apart.', {
      step: NUMERIC,
    }),
  ],
  spanish: [
    r(
      'adds a digit',
      'La desviación es 1,75 segundos de arco y la fórmula vale para 2 rayos.',
      { en: EN_A }
    ),
    r(
      'adds a number word',
      'La desviación es 1,75 segundos de arco, para tres o cuatro rayos.',
      { en: EN_A }
    ),
    r(
      'changes a number',
      'La desviación es 1,57 segundos de arco, para un rayo.',
      { en: EN_A }
    ),
    r('empty', '', { en: EN_A }),
    r('not a string', { es: 'x' }, { en: EN_A }),
    r('a script tag', '<script>alert(1)</script> La desviación es 1,75.', {
      en: EN_A,
    }),
    r('over the length', long.repeat(2), { en: EN_C }),
    r('a numeric entity', 'La desviación es 1&#44;75 segundos de arco.', {
      en: EN_A,
    }),
    r('a control character', 'La desviación es 1,75\u0007 segundos de arco.', {
      en: EN_A,
    }),
    r(
      'a stray ampersand',
      'La desviación & la fórmula, 1,75 segundos de arco.',
      { en: EN_A }
    ),
    a(
      'decimal comma',
      'La desviación es 1,75 segundos de arco, y la fórmula vale para un solo rayo.',
      { en: EN_A }
    ),
    a(
      'decimal point kept',
      'La desviación es 1.75 segundos de arco, y la fórmula vale solo para un rayo.',
      { en: EN_A }
    ),
    a('drops a number', 'La desviación es de unos segundos de arco.', {
      en: EN_A,
    }),
    a(
      'keeps the sups',
      'Compara P<sup>2</sup> con a<sup>3</sup> en cada planeta.',
      { en: EN_B }
    ),
    a(
      'no numbers',
      'Un planeta que se mueve más rápido está más cerca de la estrella.',
      { en: EN_C }
    ),
    a(
      'a named entity',
      'Un planeta que se mueve más rápido&hellip; está más cerca de la estrella.',
      { en: EN_C }
    ),
    a(
      'emphasis',
      'Un planeta que se mueve <em>más rápido</em> está más cerca de la estrella.',
      { en: EN_C }
    ),
    a('a number word the English has', 'Mide un foco de la elipse.', {
      en: 'Measure one focus of the ellipse.',
    }),
    a('a digit with its unit', 'La masa es 1 masa solar.', {
      en: 'The mass is 1 solar mass.',
    }),
    a('short', 'Sí.', { en: 'Yes.' }),
  ],
  distractor: [
    r('a digit', 'The planet at 3 AU', { step: CHOICE }),
    r('a number word, English', 'It depends on three things', { step: CHOICE }),
    r('a number word, Spanish', 'Depende de tres cosas', { step: CHOICE }),
    r('repeats an option', 'Every planet completes an orbit in the same time', {
      step: CHOICE,
    }),
    r(
      'is the right answer',
      'The planet closest to the star completes an orbit fastest of all, clearly',
      { step: CHOICE }
    ),
    r('two lines', 'It depends on the mass\nand on the radius', {
      step: CHOICE,
    }),
    r('a script tag', '<script>alert(1)</script>', { step: CHOICE }),
    r('empty', '', { step: CHOICE }),
    r('over the length', long, { step: CHOICE }),
    r('a numeric entity', 'The &#51; planets', { step: CHOICE }),
    a(
      'plausible',
      'The planet with the most moons completes an orbit fastest',
      { step: CHOICE }
    ),
    a('plausible, mass', 'The most massive planet completes an orbit fastest', {
      step: CHOICE,
    }),
    a('plausible, size', 'The largest planet completes an orbit slowest', {
      step: CHOICE,
    }),
    a(
      'plausible, brightness',
      'The brightest planet completes an orbit fastest',
      { step: CHOICE }
    ),
    a('plausible, age', 'The oldest planet completes an orbit fastest', {
      step: CHOICE,
    }),
    a('plausible, colour', 'The reddest planet completes an orbit slowest', {
      step: CHOICE,
    }),
    a('with emphasis', 'It depends only on the planet’s <em>mass</em>', {
      step: CHOICE,
    }),
    a('Spanish', 'El planeta más masivo completa la órbita más rápido', {
      step: CHOICE,
    }),
    a('a named entity', 'None of these&hellip; the orbit never closes', {
      step: CHOICE,
    }),
    a('short', 'It cannot be said', { step: CHOICE }),
  ],
};
