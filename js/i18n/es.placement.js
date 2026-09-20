// =============================================================================
// The words for typed placement and for the tables behind the plots, in Spanish
// -----------------------------------------------------------------------------
// Split out of ./es.deferred.js for the reason ./es.activities.js was split
// out of the teaching catalog: the deferred catalog is embedded in four
// separate bundles - the application's lazy chunks, the instructor portal and
// the validation worker among them - so a string added there is downloaded four
// times by somebody who needs it once, and by three readers who cannot reach
// the feature at all.
//
// These fifty-odd strings cost 5.7 KB of source and 16 KB across those bundles,
// which was the whole of a deferred-budget overrun. Here they are imported by
// js/precisePlacement.js and js/seriesTable.js, both of which are loaded on
// demand, and registered for the one locale in use rather than both.
// =============================================================================

export const ES_PLACEMENT = {
  'place.precise.title': 'Colocaci\u00f3n precisa',
  'place.precise.intro':
    'A\u00f1ade un cuerpo introduciendo su estado. Es la misma colocaci\u00f3n que realiza el lienzo; un cuerpo a\u00f1adido aqu\u00ed es id\u00e9ntico a uno colocado con un clic, y el bot\u00f3n de deshacer lo elimina igual.',
  'place.precise.field.type': 'Tipo de objeto',
  'place.precise.field.x': 'Posici\u00f3n X ({unit})',
  'place.precise.field.y': 'Posici\u00f3n Y ({unit})',
  'place.precise.field.vx': 'Velocidad X ({unit})',
  'place.precise.field.vy': 'Velocidad Y ({unit})',
  'place.precise.field.mass': 'Masa ({unit})',
  'place.precise.unit.length': 'unidades de longitud de simulaci\u00f3n',
  'place.precise.unit.speed': 'unidades de longitud por unidad de tiempo',
  'place.precise.mass.suns': 'masas solares',
  'place.precise.mass.earths': 'masas terrestres',
  'place.precise.mass.jupiters': 'masas de J\u00fapiter',
  'place.precise.mass.ceres': 'masas de Ceres',
  'place.precise.mass.halleys': 'masas de Halley',
  'place.precise.limitHint':
    'Entre \u2212{limit} y {limit}. D\u00e9jalo en blanco para cero.',
  'place.precise.massHint':
    'Entre {min} y {max}. D\u00e9jalo en blanco y se elige una por ti, como al colocar con un clic. Un valor t\u00edpico es {placeholder}.',
  'place.precise.auHint':
    'Esa posici\u00f3n es {x} UA, {y} UA desde el origen.',
  'place.precise.submit': 'A\u00f1adir cuerpo',
  'place.precise.close': 'Listo',
  'place.precise.error.number': 'Introduce un n\u00famero.',
  'place.precise.error.range': 'Debe estar entre \u2212{limit} y {limit}.',
  'place.precise.error.massRange': 'Debe estar entre {min} y {max}.',
  'place.precise.error.type': '{type} no es un tipo que se pueda colocar.',
  'place.precise.error.failed':
    'No se pudo crear el cuerpo. Revisa los valores e int\u00e9ntalo de nuevo.',
  'place.precise.invalid':
    '{count} campo necesita atenci\u00f3n. El foco se ha movido al primero.',
  'place.precise.placed':
    '{type} a\u00f1adido en {x}, {y}. El formulario sigue abierto; a\u00f1ade otro o elige Listo.',
  'place.precise.placedShort': 'A\u00f1adido {type} en {x}, {y}.',
  'series.table.all': '{name}: las {rows} filas, como tabla.',
  'series.table.sampled':
    '{name}: {shown} de {rows} filas, una de cada {stride}. Descarga el CSV para todas.',
  'series.table.empty': '{name}: a\u00fan no hay nada grabado.',
  'series.column.t_days': 'Tiempo',
  'series.column.flux_relative': 'Brillo',
  'series.column.in_transit': 'En tr\u00e1nsito',
  'series.column.transit_number': 'N\u00famero de tr\u00e1nsito',
  'series.column.rv_ms': 'Velocidad radial',
  'series.column.rv_err_ms': 'Incertidumbre',
  'series.column.r_au': 'Radio',
  'series.column.v_kms': 'Velocidad orbital',
  'series.column.v_tangential_kms': 'Velocidad tangencial',
  'series.column.mass_solar': 'Masa',
  'series.column.name': 'Nombre',
};
