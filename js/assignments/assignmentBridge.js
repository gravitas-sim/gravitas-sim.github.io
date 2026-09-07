// =============================================================================
// Opening an assignment link
// -----------------------------------------------------------------------------
// The eager half of the feature: a check on the fragment at boot, and the
// import that happens only when there is one. Instructors build assignments
// rarely and students open them once, so neither the builder nor the codec
// belongs in everybody's start-up bundle.
// =============================================================================

import { t } from '../i18n/index.js';

/**
 * Open whatever assignment the address bar names.
 *
 * Never throws: this runs at boot, and a mangled link must leave a working
 * application behind rather than a blank one. Every refusal is named and shown.
 *
 * @returns {Promise<boolean>} Whether an assignment was opened
 */
export async function openAssignmentFromUrl() {
  // js/investigations.js directly, which is safe because the only caller -
  // watchForAssignments() in js/investigationsLoader.js - has already awaited
  // ensureInvestigations(). Going back through the loader here instead would
  // put the two modules in a cycle for no benefit.
  const [{ readAssignmentLink }, investigations, { toast }] = await Promise.all(
    [
      import('./assignmentLink.js'),
      import('../investigations.js'),
      import('../controls.js'),
      // These strings are not in the start-up catalogue, and every refusal
      // below is one of them.
      import('../i18n/deferredMessages.js').then(m =>
        m.ensureDeferredMessages().catch(() => {})
      ),
    ]
  );
  const { openInvestigation } = investigations;

  const read = await readAssignmentLink(location.hash);
  if (!read.ok) {
    toast(t(`assign.error.${read.reason}`, read.detail || {}));
    return false;
  }

  const opened = await openInvestigation(read.assignment.l, {
    assignment: read.assignment,
  });
  // openInvestigation returns a refusal only when it cannot proceed; a normal
  // open returns nothing at all.
  if (opened && opened.ok === false) {
    toast(t(`assign.error.${opened.reason}`));
    return false;
  }

  // A lesson revised since the assignment was set. Said out loud, because the
  // student is about to see fewer steps than their classmate, or a question
  // that opens blank when they know they answered it.
  const binding = investigations.activeAssignmentBinding();
  if (binding?.missing)
    toast(t('assign.notice.missing', { n: binding.missing }));
  if (binding?.changed)
    toast(t('assign.notice.changed', { n: binding.changed }));
  return true;
}
