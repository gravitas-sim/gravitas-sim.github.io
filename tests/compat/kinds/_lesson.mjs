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
    {
      sid: 'guess',
      type: 'predict',
      prompt: 'Which is bigger?',
      options: ['a', 'b'],
      answer: 0,
    },
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

// The four ways an author may change that lesson (CONTRIBUTING_CONTENT.md,
// "Changing a shipped step"; the task-change contract). The corpus builds a
// record with the lesson as shipped and reads it under each of these.
//   reword  the same task in other words: same id, nothing recorded
//   revise  a different task: a new id, the old one retired with its successor
//   insert  a step added: nothing retired, every other id as it was
//   remove  a step taken out: retired with no successor
export const EDITS = ['reword', 'revise', 'insert', 'remove'];

const WAS = {
  guess: {
    en: 'Which of the two is bigger?',
    es: 'Cual de los dos es mayor?',
  },
  measure: { en: 'Measure the distance d.', es: 'Mide la distancia d.' },
};

export function editedLesson(edit) {
  const l = lesson();
  const at = sid => l.steps.findIndex(s => s.sid === sid);
  if (edit === 'reword') {
    l.steps[at('guess')].prompt = 'Which of the two is the bigger one?';
  } else if (edit === 'revise') {
    l.steps[at('guess')] = {
      sid: 'guess-2',
      type: 'predict',
      prompt: 'Which is bigger, once the Moon is added?',
      options: ['a', 'b', 'c'],
      answer: 1,
    };
    l.retired = {
      guess: { to: 'guess-2', release: '3.1', was: WAS.guess },
    };
  } else if (edit === 'insert') {
    l.steps.splice(1, 0, { sid: 'warm-up', type: 'read' });
  } else if (edit === 'remove') {
    l.steps.splice(at('measure'), 1);
    l.retired = { measure: { to: null, release: '3.1', was: WAS.measure } };
  } else if (edit !== undefined && edit !== 'none') {
    throw new Error(`unknown edit ${edit}`);
  }
  return l;
}
