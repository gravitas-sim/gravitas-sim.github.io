// =============================================================================
// Color and Temperature
// -----------------------------------------------------------------------------
// Content only, no imports: every step that needs a live number is handed a
// `ctx` by the engine, so a lesson stays a description of what is being taught
// rather than a piece of the simulation. The card paragraph is not here; it is
// written once in summaries.js (and summaries.es.js).
//
// Every step carries a `sid`: an opaque, stable id that student progress is
// keyed by. Reword a step, move it, translate it - but never change its sid, or
// every answer already saved against it is orphaned. See
// js/investigations/progressSchema.js.
//
// Scaffolded by tools/new-investigation.mjs. Run `npm run author:check` as you
// write - it validates every step against the widget registry, the scenario
// catalog and the grader - and `?author=color-and-temperature&step=<n>` to look at one.
// =============================================================================

const COLOR_AND_TEMPERATURE = {
  id: 'color-and-temperature',
  thumbnail: 'images/scenarios/solar-system.webp',
  title: "Color and Temperature",
  subtitle: "One line on what the student will measure",
  duration: '30-40 min',
  level: 'Introductory astronomy',
  // Subject tags, for the browser's filters. Pick from the vocabulary the
  // other lessons already use - chaos, compact-objects, exoplanets, galaxies,
  // gravity, habitability, observing, orbits, resonance, solar-system,
  // spaceflight, stars - and add a new one only with a name for it in both
  // js/i18n/en.deferred.js and js/i18n/es.deferred.js as inv.tag.<tag>, which
  // tests/investigationBrowse.test.js checks.
  tags: ['orbits'],
  lock: { placement: true, inspector: true },
  objectives: [
    'State what the student will be able to do, in a verb they can be tested on',
    'One objective per thing the lesson actually asks for',
  ],
  steps: [
    {
      sid: 'where-this-starts',
      type: 'read',
      title: 'Where this starts',
      body: `Set the scene. Two or three short paragraphs; separate them with a
             blank line.`,
      setup: {
        scenario: 'solar-system',
        seed: 'color-and-temperature',
        camera: { zoom: 1, pan: { x: 0, y: 0 } },
        paused: false,
      },
    },
    {
      sid: 'commit-before-you-measure',
      type: 'predict',
      title: 'Commit before you measure',
      body: `Ask for a commitment before there is any evidence. The point is the
             commitment, so these are recorded whether or not they are right.`,
      prompt: 'What do you expect to happen?',
      options: [
        'The first possibility',
        'The second possibility',
        'The third possibility',
      ],
      answer: 1,
      because:
        'Why that is the answer, and why the plausible wrong ones are wrong.',
    },
    {
      sid: 'look-at-it',
      type: 'explore',
      title: 'Look at it',
      body: `Free play, with a checklist of things worth noticing.`,
      checklist: [
        'Something specific to watch for',
        'Something else, that the next question depends on',
      ],
    },
    {
      sid: 'write-down-what-you-measured',
      type: 'measure',
      title: 'Write down what you measured',
      body: `Ask for numbers. Every field needs an id, a label and a unit; a
             \`hint\` is the value you expect, and \`npm run author:check\` feeds
             the hints through \`validate\` to prove it accepts your own answer.`,
      fields: [
        { id: 'value', label: 'The thing measured', unit: 'AU', hint: '1' },
      ],
      validate: v => {
        if (!Number.isFinite(v.value)) return null;
        if (v.value <= 0) {
          return { level: 'error', message: 'That has to be a positive number.' };
        }
        return { level: 'ok', message: 'That is the right sort of value.' };
      },
    },
    {
      sid: 'use-it',
      type: 'question',
      kind: 'numeric',
      title: 'Use it',
      body: `Ask them to do something with the number they measured.`,
      prompt: 'What do you get?',
      answer: 1,
      tolerance: 0.1,
      unit: 'AU',
      because: 'The working, in a sentence or two.',
    },
    {
      sid: 'what-you-worked-out',
      type: 'read',
      title: 'What you worked out',
      body: `Close the lesson. Say what they established, and what it does not
             yet settle.`,
    },
  ],
};

export default COLOR_AND_TEMPERATURE;
