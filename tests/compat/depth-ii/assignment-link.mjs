import { lessons, DEPTH } from './_ws.mjs';
const CHOSEN = [
  'where-does-it-sit',
  'weigh-the-pair',
  'how-sure-is-the-total',
  'weigh-it-with-an-error-bar',
  'one-on-your-own',
];
export default {
  async make(load) {
    const { buildAssignment } = await load('js/assignments/assignment.js');
    const { assignmentLink } = await load('js/assignments/assignmentLink.js');
    const { stepFingerprint } = await load(
      'js/investigations/progressBackup.js'
    );
    const { laid } = await lessons(load);
    const a = buildAssignment({
      lesson: laid,
      chosen: CHOSEN,
      title: 'Week 9',
      fingerprint: stepFingerprint,
      provider: null,
      depth: DEPTH,
    });
    return {
      fragment: (await assignmentLink(a, 'https://example.test/')).fragment,
    };
  },
  async read(load, fx) {
    const { readAssignmentLink } = await load(
      'js/assignments/assignmentLink.js'
    );
    const { stepBindings } = await load('js/assignments/assignment.js');
    const { stepFingerprint } = await load(
      'js/investigations/progressBackup.js'
    );
    const r = await readAssignmentLink(fx.fragment);
    if (!r.ok) return { accepted: false, problems: [r.reason] };
    const { laid } = await lessons(load);
    const b = stepBindings(r.assignment, laid, stepFingerprint);
    return {
      accepted: true,
      depth: r.assignment.d ?? null,
      steps: r.assignment.s,
      present: b.present,
      changed: b.changed,
      missing: b.missing,
    };
  },
};
