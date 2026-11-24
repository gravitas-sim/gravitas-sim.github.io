// The sandbox scene's own words in Spanish: the frame the picture is drawn in,
// which bodies pull on which, and the barycenter marker and its rail control.
// Registered by js/sceneStatement.js, which loads on first use.
export const ES_SCENE = {
  'rail.barycenterMarker': 'Baricentro',
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
  'frame.line.gap':
    'Sistema de referencia: {name}. Estelas dibujadas en este sistema; no se muestran las partes anteriores a su registro',
  'frame.centred': 'Centrado en {body}',
  'frame.system': 'Baricentro del sistema',
  'frame.pair': 'Baricentro de {a} y {b}',
  'frame.rotating': 'Girando con {a} y {b}',
  'frame.note.pair':
    'Posiciones y estelas respecto al centro de masas de la pareja, que ahora queda quieto.',
  'frame.note.rotating':
    'Posiciones y estelas en un sistema que gira con la pareja: los dos cuerpos quedan sobre una misma línea horizontal, el más pesado a la izquierda.',
  'rail.frame.pair': 'Baricentro del cuerpo seleccionado y su primario',
  'rail.frame.rotating': 'Girando con el cuerpo seleccionado y su primario',
  'readout.frame': 'Sistema de referencia',
  'sources.item': '{kind} ({n})',
  'sources.pulling': 'Atraen a los demás: {list}.',
  'sources.feeling': 'Sienten la gravedad sin atraer: {list}.',
  'sources.holesOnly':
    'Los agujeros negros solo sienten a otros agujeros negros.',
  'sources.staticHoles':
    'Los agujeros negros estáticos quedan fijos (uno recién formado sigue moviéndose un momento).',
  'sources.schematic':
    'Aquí G vale {g}, así que las unidades describen una escala esquemática: una unidad de tiempo son {days} días.',
  'roles.label': 'Gravedad',
  'roles.pulledBy': 'Lo atraen: {list}.',
  'roles.pulledByNone': 'Aquí no lo atrae nada.',
  'roles.pulls': 'Atrae a: {list}.',
  'roles.pullsNone': 'Aquí no atrae a nada.',
  'roles.fixedHole':
    'Un agujero negro estático: fijo, no lo atrae nada (uno recién formado sigue moviéndose un momento).',
  'roles.modelOwned': 'Lo mueve el modelo de la investigación, no la gravedad.',
  'summary.barycenter.system':
    'Marcador del baricentro: la posición media de todo el sistema ponderada por la masa, {n} cuerpos.',
  'summary.barycenter.pair':
    'Marcador del baricentro: la posición media de {body} y su primario, {primary}, ponderada por la masa.',
  'summary.barycenter.none':
    'Marcador del baricentro: nada que promediar; selecciona un cuerpo que tenga un primario.',
  'share.frameNotCarried':
    'Este enlace se abre en el sistema de referencia del mundo: los enlaces no llevan el sistema {name}.',
};
