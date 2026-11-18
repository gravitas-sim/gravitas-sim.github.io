import { DEPTH } from './_ws.mjs';
const ITEMS = [
  { kind: 'lesson', lesson: 'weighing-stars', depth: DEPTH },
  {
    kind: 'assignment',
    lesson: 'weighing-stars',
    depth: DEPTH,
    steps: ['where-does-it-sit', 'weigh-the-pair', 'one-on-your-own'],
  },
];
async function facts(load) {
  const { lessonFacts } = await load('js/course/api.js');
  const m = await load('js/data/investigations/weighing-stars.js');
  const core = m.default || Object.values(m).find(x => x && x.steps);
  return lessonFacts(core);
}
export default {
  async make(load) {
    const { pinFor } = await load('js/course/review.js');
    const f = await facts(load);
    return { items: ITEMS.map(item => ({ ...item, pin: pinFor(item, f) })) };
  },
  async read(load, fx) {
    const { reviewItem } = await load('js/course/review.js');
    const f = await facts(load);
    const all = {
      lessons: new Map([[f.id, f]]),
      scenarios: new Set(),
      datasets: new Set(),
    };
    return {
      accepted: true,
      reviews: fx.items.map(item => {
        const r = reviewItem(item, all, 'pinned');
        return {
          kind: item.kind,
          status: r.status,
          needsReview: r.needsReview,
          changed: r.detail.changedSteps,
          missing: r.detail.missingSteps,
        };
      }),
    };
  },
};
