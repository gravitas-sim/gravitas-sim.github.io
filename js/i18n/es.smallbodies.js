// =============================================================================
// Las palabras de los instrumentos de cuerpos menores, en español
// -----------------------------------------------------------------------------
// Las registra js/smallBodiesWidgets.js al cargar la familia, de modo que
// ninguna otra página las lleva. Identificadores sbW.*. Las mismas claves están
// en en.smallbodies.js. Sin lectura de una persona hispanohablante fluida.
// =============================================================================

export const ES_SMALLBODIES = {
  'sbW.row.source': 'Qué es esto',
  'sbW.row.how': 'Lo que queda fuera',
  'sbW.loading': 'Cargando los datos que necesita este instrumento',
  'sbW.failed': 'No se pudo cargar el catálogo',
  'sbW.refused': 'Sin restricción',
  'sbW.on': 'sí',
  'sbW.off': 'no',
  'sbW.b.title': 'Los huecos del cinturón',
  'sbW.b.note':
    'Los semiejes mayores de 8 886 planetas menores numerados con H menor que 13, un catálogo real del JPL Small-Body Database. Se ajusta una curva suave fuera de las ventanas de resonancia; un hueco es cuánto cae el recuento dentro de una ventana por debajo de ella.',
  'sbW.b.legend': 'objetos por 0,01 UA · línea base · ventanas de resonancia',
  'sbW.b.refused': 'Se rechazaron las ventanas o el ajuste',
  'sbW.b.axis': 'semieje mayor a (UA)',
  'sbW.b.control.gap': 'Ventana de resonancia',
  'sbW.b.control.hlimit': 'Más brillantes que (límite de H)',
  'sbW.b.control.width': 'Ancho de la ventana',
  'sbW.b.control.degree': 'Grado del polinomio de la línea base',
  'sbW.b.control.classes': 'Mostrar el recuento por clases de órbita',
  'sbW.b.control.survey': 'Mostrar lo que conserva un sondeo',
  'sbW.b.gapName': '{id} en {a} UA',
  'sbW.b.hName': 'H menor que {h}',
  'sbW.b.preset.default': 'El hueco 3:1, catálogo completo',
  'sbW.b.preset.five': 'El hueco 5:2',
  'sbW.b.value.source':
    'Un catálogo real: {n} planetas menores numerados con magnitud absoluta H menor que 13 del JPL Small-Body Database (consultado el {date}; crédito JPL, sin su aval)',
  'sbW.b.row.cut': 'Qué es el corte',
  'sbW.b.value.cut':
    'Los objetos que se encontraron y se numeraron, no los objetos que hay. El corte conserva los cuerpos grandes, por debajo del límite de completitud de los descubrimientos del cinturón principal, y no dice nada de los cuerpos pequeños. El cinturón exterior y los troyanos están menos completos que el interior con la misma H.',
  'sbW.b.value.refused':
    'El núcleo rechazó esta petición (código {code}); cambia el ancho de la ventana o el límite de H',
  'sbW.b.row.used': 'Objetos usados',
  'sbW.b.value.used':
    '{n} objetos con H menor que {h} y a entre {lo} y {hi} UA',
  'sbW.b.row.window': 'Ventana',
  'sbW.b.value.window': '{id}, a = {a} UA ± {half} UA',
  'sbW.b.row.found': 'Encontrados, y esperados según la línea base',
  'sbW.b.value.found': '{found} encontrados, {expected} esperados',
  'sbW.b.row.depletion': 'Vaciamiento (1 − encontrados / esperados)',
  'sbW.b.value.depletion':
    '{d} por ciento, intervalo del 95 por ciento de {lo} a {hi} por ciento (un bootstrap de las filas del catálogo)',
  'sbW.b.row.verdict': 'Veredicto',
  'sbW.verdict.resolved':
    'resuelto: el intervalo queda por encima de cero y no se aplica ninguna advertencia',
  'sbW.verdict.not': 'no resuelto: {why}',
  'sbW.reason.too-few-expected':
    'la línea base espera muy pocos objetos en la ventana',
  'sbW.reason.steep-baseline':
    'la línea base cambia demasiado de golpe a lo largo de la ventana',
  'sbW.reason.uneven-flanks':
    'los dos lados de la ventana difieren demasiado para una línea base suave',
  'sbW.reason.interval-includes-zero': 'el intervalo incluye el cero',
  'sbW.reason.unknown': 'no se pudo hacer el intervalo',
  'sbW.b.row.warnings': 'Advertencias',
  'sbW.warn.steep-baseline': 'la línea base es empinada aquí',
  'sbW.warn.uneven-flanks': 'los flancos son desiguales',
  'sbW.warn.edge': 'la ventana está cerca del borde del intervalo',
  'sbW.short.resolved': 'resuelto',
  'sbW.short.not': 'no resuelto',
  'sbW.b.row.other': 'La ventana {id}',
  'sbW.b.value.other': 'vaciamiento {d} por ciento, {verdict}',
  'sbW.b.row.baseline': 'Línea base',
  'sbW.b.value.baseline':
    'Un polinomio de grado {degree} en el logaritmo del recuento (un ajuste de Poisson) sobre {bins} intervalos fuera de toda ventana; {draws} extracciones bootstrap',
  'sbW.b.row.classes': 'Clases de órbita',
  'sbW.b.value.classes':
    'Cinturón principal, interior {inner}, medio {middle}, exterior {outer}; hildas {hilda}; troyanos de Júpiter {trojan} (recuentos de lo que guarda el catálogo, no de lo que existe)',
  'sbW.b.row.surveyRatio': 'Un sondeo limitado por magnitud',
  'sbW.b.value.surveyRatio':
    'Con una misma magnitud límite, un cuerpo a {inner} UA se encuentra {ratio} veces más completamente que uno a {outer} UA (pendiente de 0,5, magnitudes en oposición)',
  'sbW.b.row.surveyMean': 'La media de lo que se encuentra',
  'sbW.b.value.surveyMean':
    'Un cinturón uniforme en a mostraría en un sondeo así una media de {mean} UA, frente a una verdadera de {truth} UA',
  'sbW.b.value.how':
    'El intervalo es solo error de muestreo, y la forma de la línea base añade un sesgo sistemático de cerca de un error estándar en cinturones de prueba. Otra ventana, otro grado u otro límite de H es otra medición. Un vaciamiento es lo que muestra este catálogo, no la parte que despejó Júpiter.',
  'sbW.s.title': '¿Qué tan rápido gira?',
  'sbW.s.note':
    'Una curva de luz sintética de un elipsoide que gira, hecha con un flujo de ruido con semilla. Elige las noches, las horas y el ruido, lee el periodo en el pico y la amplitud en el pliegue, y pide la verdad solo después de responder.',
  'sbW.s.legend': 'datos · periodograma · pliegue al periodo de rotación',
  'sbW.s.legendTruth': 'SINTÉTICO · la verdad se muestra abajo',
  'sbW.s.axis.time': 'tiempo (días) · brillo',
  'sbW.s.axis.period': 'periodo de rotación (horas, escala logarítmica)',
  'sbW.s.axis.phase': 'fase de rotación, dos vueltas',
  'sbW.s.control.target': 'Objetivo',
  'sbW.s.control.nights': 'Noches',
  'sbW.s.control.hours': 'Horas por noche',
  'sbW.s.control.noise': 'Ruido',
  'sbW.s.control.cadence': 'Muestreo',
  'sbW.s.control.truth': 'Mostrar la verdad',
  'sbW.s.targetName': 'Objetivo {id}',
  'sbW.s.cadence.dense': 'noches densas (40 puntos)',
  'sbW.s.cadence.once': 'un punto por noche, 40 noches',
  'sbW.s.preset.default': 'Objetivo A, cinco noches densas',
  'sbW.s.preset.once': 'Objetivo A, un punto por noche',
  'sbW.s.value.source':
    'Sintético: un elipsoide triaxial que gira en torno a su eje corto, visto con un solo aspecto, con dispersión geométrica a ángulo de fase cero y ruido gaussiano con semilla. No es la luz de un asteroide real; la verdad queda oculta hasta que la pides',
  'sbW.s.row.data': 'Observaciones',
  'sbW.s.value.data':
    '{n} puntos en {nights} noches de {hours} horas, ruido {noise} mag',
  'sbW.s.value.dataOnce':
    '{n} puntos, uno por noche durante {nights} noches a horas algo distintas, ruido {noise} mag',
  'sbW.s.value.refused':
    'El núcleo rechazó esta serie (código {code}); usa más puntos o más noches',
  'sbW.s.row.peak': 'Pico más fuerte del periodograma',
  'sbW.s.value.peak':
    'un periodo de luz de {p} h, potencia {power}, probabilidad de falsa alarma {fap}',
  'sbW.s.value.tiny': 'menor que 0,001',
  'sbW.s.row.verdict': 'Veredicto',
  'sbW.s.value.notPeriodic':
    'no periódica: el pico más fuerte podría ser ruido, así que no se da ningún periodo',
  'sbW.s.row.period': 'Periodo de rotación (dos máximos por rotación)',
  'sbW.s.value.period':
    '{p} h ± {s} h (un bootstrap de los puntos: un piso del error)',
  'sbW.s.value.single': 'un periodo destaca',
  'sbW.s.value.ambiguous':
    'ambiguo: un segundo pico es casi igual de fuerte, así que el muestreo no distingue los periodos',
  'sbW.s.row.candidates': 'Los periodos en competencia',
  'sbW.s.value.candidates': '{p1} h o {p2} h',
  'sbW.s.row.alternative': 'Si hay un solo máximo por rotación',
  'sbW.s.value.alternative':
    '{p} h en su lugar (una mancha de albedo o una forma muy distinta de un elipsoide daría un máximo)',
  'sbW.s.row.amplitude': 'Amplitud (pico a pico)',
  'sbW.s.value.amplitude':
    '{a} mag, intervalo del 95 por ciento de {lo} a {hi} mag',
  'sbW.s.value.withheld.phase-gap':
    'retenida: una fracción de {gap} de la rotación no se observó nunca, así que la curva ajustada allí es una conjetura',
  'sbW.s.value.withheld.ill-conditioned':
    'retenida: la curva ajustada oscila más que una amplitud física',
  'sbW.s.row.bound': 'La razón de ejes a/b',
  'sbW.s.value.bound':
    'a/b es al menos {b} (con la amplitud ajustada, {est}): una cota inferior, igual a a/b solo si se ve desde el ecuador',
  'sbW.s.row.truth': 'La verdad (sintética)',
  'sbW.s.value.truth':
    'periodo de rotación {p} h, a/b = {ab}, b/c = {bc}, aspecto {th} grados, amplitud {amp} mag',
  'sbW.s.value.how':
    'Queda fuera: el ángulo de fase (cambia la amplitud y la forma), las manchas de albedo, las formas muy distintas de un elipsoide y el balanceo caótico. El periodo supone dos máximos por rotación; la amplitud da una cota inferior de a/b y nada dice de b/c; los errores son pisos.',
};
