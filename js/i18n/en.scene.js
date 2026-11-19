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
  'summary.barycenter.system':
    'Barycenter marker: the mass-weighted mean position of the whole system, {n} bodies.',
  'summary.barycenter.pair':
    'Barycenter marker: the mass-weighted mean position of {body} and its primary, {primary}.',
  'summary.barycenter.none':
    'Barycenter marker: nothing to average; select a body that has a primary.',
};
