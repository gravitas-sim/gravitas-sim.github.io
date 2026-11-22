// The sandbox scene's own words in English: the frame the picture is drawn in,
// which bodies pull on which, and the barycenter marker and its rail control.
// Registered by js/sceneStatement.js, which loads on first use.
export const EN_SCENE = {
  'rail.barycenterMarker': 'Barycenter',
  'rail.barycenterMarker.hint':
    'The mass-weighted mean position of these bodies. Nothing is there.',
  'rail.barycenterMarker.off': 'Off',
  'rail.barycenterMarker.system': 'Whole system',
  'rail.barycenterMarker.pair': 'Selected body and its primary',
  'rail.barycenterMarker.noPrimary':
    'Select a body that has a primary to mark it and its primary.',
  'frame.world': 'World',
  'frame.object': 'Selected object',
  'frame.line': 'Frame: {name}',
  'frame.line.trails': 'Frame: {name}. Trails drawn in this frame',
  'readout.frame': 'Frame',
  'sources.item': '{kind} ({n})',
  'sources.pulling': 'Pulling on others: {list}.',
  'sources.feeling': 'Feeling gravity, not pulling: {list}.',
  'sources.holesOnly': 'Black holes feel only other black holes.',
  'sources.staticHoles':
    'Static black holes stay fixed (a newly formed one keeps moving briefly).',
  'sources.schematic':
    'G is {g} here, so the units describe a schematic scale: one time unit is {days} days.',
  'roles.label': 'Gravity',
  'roles.pulledBy': 'Pulled by {list}.',
  'roles.pulledByNone': 'Pulled by nothing here.',
  'roles.pulls': 'Pulls on {list}.',
  'roles.pullsNone': 'Pulls on nothing here.',
  'roles.fixedHole':
    'A static black hole: fixed, pulled by nothing (a newly formed one keeps moving briefly).',
  'roles.modelOwned': "Moved by the investigation's model, not by gravity.",
  'summary.barycenter.system':
    'Barycenter marker: the mass-weighted mean position of the whole system, {n} bodies.',
  'summary.barycenter.pair':
    'Barycenter marker: the mass-weighted mean position of {body} and its primary, {primary}.',
  'summary.barycenter.none':
    'Barycenter marker: nothing to average; select a body that has a primary.',
};
