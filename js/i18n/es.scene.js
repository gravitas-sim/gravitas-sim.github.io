// The sandbox scene's own words in Spanish: the frame the picture is drawn in,
// which bodies pull on which, and the barycenter marker and its Tools control.
// Registered by js/sceneStatement.js, which loads on first use.
export const ES_SCENE = {
  'rail.barycenterMarker': 'Mostrar el baricentro',
  'rail.barycenterMarker.hint':
    'La posición media de estos cuerpos, ponderada por su masa. Allí no hay nada.',
  'rail.barycenterMarker.off': 'No',
  'rail.barycenterMarker.system': 'Todo el sistema',
  'rail.barycenterMarker.pair': 'El cuerpo seleccionado y su primario',
  'rail.barycenterMarker.noPrimary':
    'Selecciona un cuerpo que tenga un primario para marcarlo junto con él.',
  'frame.world': 'Mundo',
  'frame.object': 'Objeto seleccionado',
  'frame.line': 'Sistema de referencia: {name}',
  'frame.line.trails':
    'Sistema de referencia: {name}. Estelas dibujadas en este sistema',
  'readout.frame': 'Sistema de referencia',
  'sources.item': '{kind} ({n})',
  'sources.pulling': 'Atraen a los demás: {list}.',
  'sources.feeling': 'Sienten la gravedad sin atraer: {list}.',
  'summary.barycenter.system':
    'Marcador del baricentro: la posición media de todo el sistema ponderada por la masa, {n} cuerpos.',
  'summary.barycenter.pair':
    'Marcador del baricentro: la posición media de {body} y su primario, {primary}, ponderada por la masa.',
  'summary.barycenter.none':
    'Marcador del baricentro: nada que promediar; selecciona un cuerpo que tenga un primario.',
};
