// =============================================================================
// Las palabras de la herramienta de fotometría, en español
// -----------------------------------------------------------------------------
// Las registra js/observatory/imagePhotometry.js cuando la herramienta se abre
// por primera vez (con el traductor del Observatorio), así que ninguna otra
// página las carga. Ids obs.ph.*; el título del panel está en es.observatory.js
// (está en la página antes de que la herramienta cargue). Sin revisar por una
// persona hispanohablante fluida.
// =============================================================================

export const ES_IMAGEPHOTOMETRY = {
  'obs.ph.help':
    'Mide la luz que envió una estrella, con el error que la acompaña. Elige una marca o escribe una posición, fija la apertura (el círculo que contiene la estrella) y el anillo de cielo (el anillo que mide el fondo) y pulsa Medir. Los radios están en píxeles: cámbialos en las casillas, con los botones o tocando la imagen.',
  'obs.ph.no.display-only':
    'Esta imagen es solo para mostrar: se puede marcar, pero la fotometría necesita valores de píxel que midan luz, y sus píxeles se han estirado, recodificado o nunca tuvieron registradas sus unidades y su procedencia.',
  'obs.ph.no.no-contract':
    'Esta imagen no declara un contrato de píxeles (unidades, ganancia, ruido de lectura, saturación), así que es solo para mostrar: se puede marcar, y la fotometría espera un contrato.',
  'obs.ph.no.not-flux':
    'Los valores de píxel no miden luz (son indicadores, niveles de pantalla o una unidad que nadie registró), así que no hay fotometría que hacer.',
  'obs.ph.no.incomplete-contract':
    'La fotometría necesita el contrato de píxeles completo; a este le falta: {missing}.',
  'obs.ph.no.lossy-history':
    'Los píxeles pasaron por un paso que no conserva la luz medida (un estiramiento, una codificación con pérdida o un remuestreo que no conserva el flujo), así que no se puede medir su luz.',
  'obs.ph.no.raw-frame':
    'Este fotograma está en bruto: su fondo todavía contiene el sesgo, así que el ruido del cielo sería incorrecto. Calíbralo primero.',
  'obs.ph.no.invalid': 'Esta no es una descripción de imagen válida.',
  'obs.ph.no.saturated':
    'Sin medir: {pixels} píxeles de la apertura llegan al nivel en que el detector deja de ser lineal, así que la luz allí no es la que envió la estrella.',
  'obs.ph.no.masked':
    'Sin medir: {pixels} píxeles de la apertura están enmascarados o no tienen valor.',
  'obs.ph.no.edge': 'Sin medir: la apertura se sale de la imagen.',
  'obs.ph.no.crowded':
    'Sin medir: otra fuente ({with}) está lo bastante cerca para alcanzar el anillo de cielo de esta. Esta herramienta no separa vecinas.',
  'obs.ph.no.annulus':
    'Sin medir: el anillo de cielo solo tiene {pixels} píxeles útiles; necesita al menos 20.',
  'obs.ph.no.centroid': 'Sin medir: no se pudo encontrar el centro ({reason}).',
  'obs.ph.reason.edge': 'la ventana llega al borde',
  'obs.ph.reason.no-flux': 'no hay luz sobre el cielo en la ventana',
  'obs.ph.reason.not-converged': 'no se estabilizó',
  'obs.ph.noMarks':
    'Todavía no hay marcas de punto ni de conteo en esta imagen.',
  'obs.ph.target': 'Fuente',
  'obs.ph.typed': 'Una posición escrita aquí',
  'obs.ph.x': 'x (píxeles)',
  'obs.ph.y': 'y (píxeles)',
  'obs.ph.fwhm': 'Anchura de una estrella, FWHM (píxeles)',
  'obs.ph.r': 'Radio de la apertura (píxeles)',
  'obs.ph.rIn': 'Anillo de cielo, radio interior (píxeles)',
  'obs.ph.rOut': 'Anillo de cielo, radio exterior (píxeles)',
  'obs.ph.edge': 'Borde de la apertura',
  'obs.ph.edge.exact': 'Con píxeles parciales',
  'obs.ph.edge.center': 'Solo píxeles enteros',
  'obs.ph.sky': 'Cielo',
  'obs.ph.sky.annulus': 'Media del anillo',
  'obs.ph.sky.plane': 'Plano por el anillo',
  'obs.ph.recentre': 'Centrar antes en la estrella (centroide ponderado)',
  'obs.ph.ring': 'Cambiar el tamaño de',
  'obs.ph.ring.aperture': 'la apertura',
  'obs.ph.ring.inner': 'el anillo interior',
  'obs.ph.ring.outer': 'el anillo exterior',
  'obs.ph.smaller': 'Menor',
  'obs.ph.larger': 'Mayor',
  'obs.ph.step': 'Paso',
  'obs.ph.step.fine': 'Fino (0,25 px)',
  'obs.ph.step.normal': 'Normal (1 px)',
  'obs.ph.step.coarse': 'Grueso (4 px)',
  'obs.ph.picture':
    'Los píxeles alrededor de la fuente con la apertura y el anillo de cielo dibujados. Toca para fijar el radio elegido.',
  'obs.ph.measure': 'Medir',
  'obs.ph.curve': 'Curva de crecimiento',
  'obs.ph.all': 'Medir todas las marcas',
  'obs.ph.cancel': 'Parar',
  'obs.ph.keep': 'Guardar en el registro',
  'obs.ph.csv': 'Guardar como CSV',
  'obs.ph.readout': 'Resultado',
  'obs.ph.net': 'Luz neta {net} ± {sigma} electrones (señal a ruido {snr})',
  'obs.ph.sky.line':
    'Cielo {sky} ± {skySigma} electrones por píxel, de {n} píxeles',
  'obs.ph.pos':
    'Posición x {x} ± {sx}, y {y} ± {sy} (píxeles, contando desde 1)',
  'obs.ph.mag': 'Magnitud instrumental {mag} ± {sigma}',
  'obs.ph.limit':
    'No detectada: la luz neta es menor que tres veces su error. A lo sumo {limit} electrones (magnitud instrumental {mag} o más débil).',
  'obs.ph.area': 'Área de la apertura {area} píxeles',
  'obs.ph.route.variance': 'ruido del plano de varianza de la imagen',
  'obs.ph.route.ccd':
    'ruido de la ecuación del CCD (ganancia y ruido de lectura)',
  'obs.ph.table': 'Fotometría de las marcas',
  'obs.ph.col.mark': 'Marca',
  'obs.ph.col.x': 'x',
  'obs.ph.col.y': 'y',
  'obs.ph.col.net': 'Luz neta (e⁻)',
  'obs.ph.col.sigma': 'Error',
  'obs.ph.col.snr': 'Señal a ruido',
  'obs.ph.col.sky': 'Cielo por píxel (e⁻)',
  'obs.ph.col.skySigma': 'Error del cielo',
  'obs.ph.col.mag': 'Magnitud',
  'obs.ph.col.magSigma': 'Error de la magnitud',
  'obs.ph.col.status': 'Estado',
  'obs.ph.status.measured': 'medida',
  'obs.ph.status.limit': 'límite superior',
  'obs.ph.growth.caption': 'Curva de crecimiento',
  'obs.ph.growth.r': 'Radio (píxeles)',
  'obs.ph.growth.net': 'Luz neta (e⁻)',
  'obs.ph.growth.frac': 'Del mayor',
  'obs.ph.said.measured': 'Medida {id}: {net} electrones ± {sigma}.',
  'obs.ph.said.limit': '{id} no detectada: a lo sumo {limit} electrones.',
  'obs.ph.said.refused': '{id}: {why}',
  'obs.ph.said.batch':
    'Medidas {n} de {total} marcas; {other} rechazadas o no detectadas.',
  'obs.ph.said.cancelled': 'Parado tras {n} de {total} marcas.',
  'obs.ph.said.radius': 'Radio {ring}: {r} píxeles.',
  'obs.ph.said.target': '{id} elegida en x {x}, y {y}.',
  'obs.ph.said.kept': 'Guardadas {n} cantidades en el registro.',
  'obs.ph.said.keepFailed': 'No se pudo guardar en el registro: {why}',
  'obs.ph.said.csv': 'Guardada una tabla de {n} filas.',
  'obs.ph.said.curve': 'La luz deja de crecer en torno a {r} píxeles.',
  'obs.ph.ledgerEntry': 'Fotometría de {title}',
  'obs.ph.q.net': 'luz neta',
  'obs.ph.q.x': 'x',
  'obs.ph.q.y': 'y',
  'obs.ph.q.snr': 'señal a ruido',
  'obs.ph.q.sky': 'cielo por píxel',
  'obs.ph.q.mag': 'magnitud instrumental',
};
