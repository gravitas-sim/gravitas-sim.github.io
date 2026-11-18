// Depth II gate, criterion 1 (spike only): Weighing the Stars at the
// quantitative depth, built by whichever tree `load` reads.
export const DEPTH = 'quantitative';
export async function lessons(load) {
  const { layDepth, lessonAt } = await load('js/investigations/depthPure.js');
  const m = await load('js/data/investigations/weighing-stars.js');
  const core = m.default || Object.values(m).find(x => x && x.steps);
  const deep = (await load('js/data/investigations/depth/weighing-stars.js'))
    .default;
  const laid = layDepth(core, deep.steps);
  return { core, laid, at: lessonAt(laid, DEPTH) };
}
export async function backupFor(load) {
  const { buildBackup } = await load('js/investigations/progressBackup.js');
  const { stepKey } = await load('js/investigations/progressSchema.js');
  const { at } = await lessons(load);
  const key = sid => stepKey(at.id, sid);
  const responses = {
    [key('how-would-you-do-it')]: '1',
    [key('where-does-it-sit')]: '0',
    [key('weigh-the-pair')]: '{"a":"4","p":"4"}',
    [`${key('how-sure-is-the-total')}:sa`]: '0.1',
    [`${key('how-sure-is-the-total')}:sp`]: '0.2',
    [key('weigh-it-with-an-error-bar')]: '4 ± 0.5',
    [key('splitting-them-up')]: '1',
    [key('one-on-your-own')]: '{"a":"3","p":"3"}',
  };
  const visited = at.steps
    .slice(0, at.steps.findIndex(s => s.sid === 'one-on-your-own') + 1)
    .map(s => s.sid);
  const backup = buildBackup({
    lesson: at,
    responses,
    attempts: {},
    visited,
    stepSid: visited.at(-1),
    startedAt: '2026-11-01T10:00:00.000Z',
    studentName: 'Ada',
  });
  backup.savedAt = '2026-11-01T10:30:00.000Z';
  return { backup, responses };
}
