// A lesson shaped like the real ones: a setup step, steps that depend on it,
// a second setup, and more steps after it (the shape tests/assignment.test.js
// uses). Plain data, so both trees read the same thing.
export const lesson = () => ({
  id: 'tides',
  title: 'Tides',
  steps: [
    { sid: 'intro', type: 'read' },
    { sid: 'build-a', type: 'read', setup: { scenario: 'Solar System' } },
    { sid: 'look', type: 'read' },
    { sid: 'guess', type: 'predict', options: ['a', 'b'], answer: 0 },
    { sid: 'measure', type: 'measure', fields: [{ id: 'd' }] },
    {
      sid: 'ask',
      type: 'question',
      kind: 'choice',
      options: ['x', 'y', 'z'],
      answer: 2,
    },
  ],
});
