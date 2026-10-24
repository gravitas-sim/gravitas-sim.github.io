// =============================================================================
// Las palabras de la herramienta de completitud, en español
// -----------------------------------------------------------------------------
// Las registra js/observatory/imageInject.js cuando la herramienta se abre por
// primera vez (con el traductor del Observatorio), de modo que ninguna otra
// página las lleva. Identificadores obs.inj.*; el título del panel está en
// es.observatory.js (está en la página antes de que cargue la herramienta). Sin
// revisar por una persona hispanohablante fluida.
// =============================================================================

export const ES_IMAGEINJECT = {
  'obs.inj.help':
    'Averigua lo que el detector no ve. Se añaden a una copia de esta imagen fuentes de magnitudes elegidas, repartidas según el ancho de una estrella que das abajo y con su propio ruido de fotones, y el mismo buscador de fuentes vuelve a mirar. La proporción que encuentra, por magnitud, es la completitud de esta imagen: la probabilidad de detectar una estrella de este ancho sobre este cielo, y de ninguna otra.',
  'obs.inj.no.display-only':
    'Esta imagen es solo para mostrar: se puede marcar, pero añadir fuentes necesita valores de píxel que midan luz, y los suyos se han estirado, recodificado o nunca tuvieron sus unidades anotadas.',
  'obs.inj.no.no-contract':
    'Esta imagen no declara un contrato de píxeles (unidades, ganancia, ruido de lectura, saturación), así que es solo para mostrar: se puede marcar, y esta herramienta espera a un contrato.',
  'obs.inj.no.not-flux':
    'Los valores de píxel no miden luz (indicadores, niveles de visualización o una unidad que nadie anotó), así que no hay dónde añadir fuentes.',
  'obs.inj.no.incomplete-contract':
    'Esta herramienta necesita el contrato de píxeles completo; a este le falta: {missing}.',
  'obs.inj.no.lossy-history':
    'Los píxeles pasaron por un paso que no conserva la luz medida (un estiramiento, una codificación con pérdida o un remuestreo que no conserva el flujo), así que no se pueden medir fuentes en ellos.',
  'obs.inj.no.raw-frame':
    'Este fotograma está en bruto: su fondo aún contiene el bias, así que el ruido del cielo sería erróneo. Calíbralo primero.',
  'obs.inj.no.invalid': 'Esta no es una descripción de imagen válida.',
  'obs.inj.no.unit':
    'Los píxeles están en {unit}, no en electrones, así que las fuentes añadidas no podrían llevar su propio ruido de fotones.',
  'obs.inj.no.too-large':
    'Añadir fuentes necesita {bytes} bytes de píxeles decodificados en total, más de los {limit} que cabe en una página.',
  'obs.inj.no.bad-parameter':
    'Un ajuste está fuera de rango ({name}). Usa hasta 500 fuentes por ensayo, hasta 200 ensayos y 20.000 fuentes en total, un ancho de estrella entre 0,5 y 50 píxeles, una magnitud más brillante que no sea más débil que la más débil, y intervalos que den como máximo 60 pasos.',
  'obs.inj.no.beyond-linearity':
    'La magnitud más brillante es demasiado brillante: su pico pasaría el nivel en que el detector deja de ser lineal. La más brillante permitida es la magnitud {allowed}.',
  'obs.inj.no.no-room':
    'No hay sitio para una fuente: el margen del borde y la distancia que se guarda a otras fuentes no dejan ningún lugar libre en esta imagen.',
  'obs.inj.no.no-range':
    'No se pudo leer el ruido del cielo, así que no se eligió un rango de magnitudes: escribe las dos magnitudes.',
  'obs.inj.no.no-background':
    'No se pudo estimar el cielo: todas las cajas de la imagen están enmascaradas o vacías.',
  'obs.inj.no.range': 'Rellena las dos magnitudes, o deja las dos vacías.',
  'obs.inj.psf': 'Ancho de una estrella, FWHM (píxeles)',
  'obs.inj.measure': 'Medirlo en esta imagen',
  'obs.inj.measuring': 'Midiendo el ancho de las estrellas…',
  'obs.inj.psfDone':
    'Ancho de las estrellas {fwhm} píxeles, con {n} estrellas.',
  'obs.inj.psfFail':
    'No se pudo medir ninguna estrella. Escribe a mano un ancho de estrella.',
  'obs.inj.bright': 'Magnitud más brillante',
  'obs.inj.faint': 'Magnitud más débil (profundidad)',
  'obs.inj.auto': 'automático',
  'obs.inj.count': 'Fuentes por ensayo',
  'obs.inj.trials': 'Ensayos',
  'obs.inj.seed': 'Semilla',
  'obs.inj.settings': 'Más ajustes',
  'obs.inj.bin': 'Ancho de un intervalo de magnitud',
  'obs.inj.settingsNote':
    'Las magnitudes son instrumentales: menos 2,5 veces el logaritmo de la tasa en electrones por segundo, como en la herramienta de fotometría. Si se dejan vacías, el rango va de una señal a ruido de 12 hasta 2,5, para el ancho de arriba y el ruido de esta imagen. La misma semilla y los mismos ajustes dan la misma ejecución.',
  'obs.inj.run': 'Inyectar y volver a mirar',
  'obs.inj.stop': 'Parar',
  'obs.inj.csv': 'Guardar las listas como CSV',
  'obs.inj.keep': 'Guardar en el registro',
  'obs.inj.progress': 'Ensayo {t} de {n}…',
  'obs.inj.result':
    'Se inyectaron {injected} fuentes en {trials} ensayos; el detector encontró {recovered}.',
  'obs.inj.m50':
    'La mitad de las fuentes se encuentra en la magnitud {m} (entre {lo} y {hi}, {level} por ciento).',
  'obs.inj.m50.open':
    'La mitad de las fuentes se encuentra en la magnitud {m}.',
  'obs.inj.m50.never':
    'La completitud nunca baja de la mitad en este rango, o empieza por debajo: amplía el rango.',
  'obs.inj.m90':
    'Nueve de cada diez se encuentran en la magnitud {m} (entre {lo} y {hi}, {level} por ciento).',
  'obs.inj.m90.open': 'Nueve de cada diez se encuentran en la magnitud {m}.',
  'obs.inj.m90.never':
    'La completitud nunca baja de nueve de cada diez en este rango, o empieza por debajo.',
  'obs.inj.extra':
    'Detecciones que no coinciden con ninguna fuente inyectada ni con ninguna que ya estuviera en la imagen: {x} por ensayo.',
  'obs.inj.unplaced':
    '{n} fuentes no se pudieron colocar (el margen del borde y la distancia que se guarda a otras fuentes); no se cuentan.',
  'obs.inj.conditions':
    'Esta curva es la probabilidad de detección para una estrella de {fwhm} píxeles de ancho ({source}) sobre el ruido de cielo de esta imagen, de {noise} electrones por píxel, hallada con un umbral de {sigma} sigmas y al menos {area} píxeles. Para otro ancho de estrella, otro cielo u otros ajustes no es la probabilidad de detección: mídela de nuevo.',
  'obs.inj.source.measured': 'medido en esta imagen',
  'obs.inj.source.entered': 'escrito a mano',
  'obs.inj.limits':
    'Límites: las fuentes se colocan lejos del borde y unas de otras, así que un campo muy poblado no se prueba; un solo ancho de estrella sirve para toda la imagen; la cuenta de un intervalo es binomial, con su intervalo exacto, y la completitud de un intervalo es un promedio a lo largo de él.',
  'obs.inj.plot':
    'Completitud frente a magnitud instrumental: la proporción de fuentes inyectadas que se encuentra, con los bordes de su intervalo dibujados como dos líneas.',
  'obs.inj.axis.m': 'Magnitud instrumental',
  'obs.inj.axis.p': 'Proporción encontrada',
  'obs.inj.lower': 'Borde inferior del intervalo',
  'obs.inj.upper': 'Borde superior del intervalo',
  'obs.inj.table': 'Completitud por magnitud',
  'obs.inj.col.range': 'Magnitudes',
  'obs.inj.col.n': 'Inyectadas',
  'obs.inj.col.k': 'Encontradas',
  'obs.inj.col.p': 'Completitud',
  'obs.inj.col.lo': 'Borde inferior',
  'obs.inj.col.hi': 'Borde superior',
  'obs.inj.csvCol.id': 'Fuente',
  'obs.inj.csvCol.x': 'x',
  'obs.inj.csvCol.y': 'y',
  'obs.inj.csvCol.m': 'Magnitud',
  'obs.inj.csvCol.flux': 'Luz (e⁻)',
  'obs.inj.csvCol.found': 'Encontrada',
  'obs.inj.csvCol.fx': 'Encontrada en x',
  'obs.inj.csvCol.fy': 'Encontrada en y',
  'obs.inj.said.done':
    'Se inyectaron {injected} fuentes y se encontraron {recovered}: la mitad se encuentra en la magnitud {m}.',
  'obs.inj.said.doneNoHalf':
    'Se inyectaron {injected} fuentes y se encontraron {recovered}.',
  'obs.inj.said.stopped': 'Parado tras {t} ensayos.',
  'obs.inj.said.csv': 'Guardada una tabla de {n} filas.',
  'obs.inj.said.kept': 'La completitud se guardó en el registro.',
  'obs.inj.said.keepFailed': 'No se pudo guardar en el registro: {why}',
  'obs.inj.ledgerEntry': 'Completitud de {title}',
  'obs.inj.q.m50': 'magnitud con la mitad de completitud',
  'obs.inj.q.m90': 'magnitud con nueve décimas de completitud',
  'obs.inj.q.bin': 'completitud de la magnitud {lo} a la {hi}',
  'obs.inj.q.extra': 'detecciones extra por ensayo',
};
