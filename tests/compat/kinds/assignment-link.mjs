import { lesson } from './_lesson.mjs';

// An assignment link (#a<n><z|r>...): the fragment a teacher shares.
// Reader: readAssignmentLink -> {ok, assignment, reason}.
export default {
  id: 'assignment-link',
  label: 'assignment link',
  format: 'gravitas.assignment/2 (link prefix a)',
  newToOld: 'accepts',
  capabilities: 'none',
  // What the 2.0.0 reader does with a top-level field it does not know:
  // 'refused', 'ignored' (accepted, silently dropped), or 'n/a' (the record is
  // an encoded fragment, so there is no field to add from outside).
  unknownFields: 'n/a',
  async make(load) {
    const { buildAssignment } = await load('js/assignments/assignment.js');
    const { assignmentLink } = await load('js/assignments/assignmentLink.js');
    const { stepFingerprint } = await load(
      'js/investigations/progressBackup.js'
    );
    const a = buildAssignment({
      lesson: lesson(),
      chosen: ['guess', 'ask'],
      title: 'Week 3',
      fingerprint: stepFingerprint,
      provider: null,
    });
    const link = await assignmentLink(a, 'https://example.test/');
    return { fragment: link.fragment };
  },
  async read(load, fx) {
    const { readAssignmentLink } = await load(
      'js/assignments/assignmentLink.js'
    );
    const r = await readAssignmentLink(fx.fragment);
    if (!r.ok) return { accepted: false, problems: [r.reason] };
    // The id is made fresh each build; the rest is the assignment.
    const { id, ...rest } = r.assignment;
    return { accepted: true, value: { hasId: Boolean(id), ...rest } };
  },
  async rewrite(load, fx) {
    const { readAssignmentLink, assignmentLink } = await load(
      'js/assignments/assignmentLink.js'
    );
    const r = await readAssignmentLink(fx.fragment);
    const link = await assignmentLink(r.assignment, 'https://example.test/');
    return { fragment: link.fragment };
  },
};
