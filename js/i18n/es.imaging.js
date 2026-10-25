// =============================================================================
// Las palabras de los instrumentos de medición de imágenes, en español
// -----------------------------------------------------------------------------
// Las registra js/imagingWidgets.js al cargar la familia, de modo que ninguna
// otra página las lleva. Identificadores imgW.*. Las mismas claves están en
// en.imaging.js. Sin lectura de una persona hispanohablante fluida.
// =============================================================================

export const ES_IMAGING = {
  'imgW.row.source': 'Qué es esto',
  'imgW.row.how': 'Lo que queda fuera',
  'imgW.waiting': 'Cargando los datos que necesita este instrumento',
  'imgW.refused': 'Sin restricción',
  'imgW.m.title': 'Marcar la Luna',
  'imgW.m.note':
    'Una fotografía real de la Luna tomada por la sonda Galileo el 7 de diciembre de 1992, mostrada en gris. Marca el ancho completo del disco con un par de referencia de longitud conocida y luego rodea un accidente: la escala sale del par y de ninguna otra parte.',
  'imgW.m.legend': 'par de referencia · círculo',
  'imgW.m.loading': 'Cargando la imagen',
  'imgW.m.failed': 'No se pudo cargar la imagen',
  'imgW.m.control.x1': 'Extremo izquierdo del par, x',
  'imgW.m.control.x2': 'Extremo derecho del par, x',
  'imgW.m.control.cx': 'Centro del círculo, x',
  'imgW.m.control.cy': 'Centro del círculo, y',
  'imgW.m.control.r': 'Radio del círculo',
  'imgW.m.preset.reset': 'Empezar de nuevo',
  'imgW.m.value.source':
    'Una imagen real, color realzado de un sobrevuelo de Galileo mostrado en gris: sus niveles de gris son para el ojo y no miden luz, así que el Observatorio la marca como solo para mostrar',
  'imgW.m.row.pair': 'Longitud del par',
  'imgW.m.row.assumed': 'Longitud que se toma que abarca el par',
  'imgW.m.value.assumed':
    '{km} km, el diámetro medio de la Luna (supuesto)',
  'imgW.m.row.scale': 'Escala a partir del par',
  'imgW.m.row.radius': 'Radio del círculo',
  'imgW.m.row.diameterPx': 'Diámetro del círculo',
  'imgW.m.row.diameterKm': 'Diámetro del círculo en kilómetros',
  'imgW.m.row.offset':
    'Distancia del círculo al centro del disco, en radios del disco',
  'imgW.m.row.foreshort':
    'Ancho de un accidente redondo allí, en esa dirección, como parte de su ancho verdadero',
  'imgW.m.value.how':
    'La incertidumbre indicada es solo el redondeo de cada colocación (un píxel es un paso de 0,29 píxeles); cuán nítido es el borde y si la imagen está recortada no están en ella',
  'imgW.m.value.none': 'sin fijar',
  'imgW.p.title': 'La trayectoria de una estrella en el cielo',
  'imgW.p.note':
    'Catorce posiciones de una estrella sintética durante casi dos años, cada una con una incertidumbre de 4 milisegundos de arco, hechas con la geometría exacta de la órbita de la Tierra. Elige qué ajustar: un desplazamiento entre dos épocas, un movimiento propio recto o un movimiento propio con paralaje.',
  'imgW.p.legend': 'posiciones · ajuste · este →, norte ↑ (mas)',
  'imgW.p.control.fit': 'Qué ajustar',
  'imgW.p.control.n': 'Épocas usadas',
  'imgW.p.control.zero': 'Corrección a paralaje absoluto',
  'imgW.p.fit.shift': 'desplazamiento entre dos épocas',
  'imgW.p.fit.motion': 'movimiento propio',
  'imgW.p.fit.joint': 'paralaje y movimiento',
  'imgW.p.preset.shift': 'Desplazamiento, primera a última',
  'imgW.p.preset.motion': 'Solo movimiento',
  'imgW.p.preset.joint': 'Paralaje y movimiento',
  'imgW.p.value.source':
    'Sintético: una estrella a una distancia y con un movimiento que eligió la investigación, vista desde la posición cambiante de la Tierra, con ruido sembrado; aquí no se muestra la verdad',
  'imgW.p.row.n': 'Épocas usadas',
  'imgW.p.row.span': 'Tiempo cubierto',
  'imgW.p.row.label': 'Qué es este resultado',
  'imgW.p.value.shiftLabel':
    'Un desplazamiento bajo un supuesto de movimiento fijo, no un paralaje',
  'imgW.p.row.dx': 'Desplazamiento al este',
  'imgW.p.row.dy': 'Desplazamiento al norte',
  'imgW.p.row.sep': 'Tamaño del desplazamiento',
  'imgW.p.row.rate': 'Velocidad si todo fuera movimiento',
  'imgW.p.row.lever': 'Paralaje que el desplazamiento podría ocultar, por 100 mas',
  'imgW.p.row.mux': 'Movimiento propio al este',
  'imgW.p.row.muy': 'Movimiento propio al norte',
  'imgW.p.row.chi2': 'Chi cuadrado del ajuste',
  'imgW.p.row.dof': 'Grados de libertad',
  'imgW.p.row.pValue': 'Probabilidad de un ajuste tan malo si el modelo fuera cierto',
  'imgW.p.row.verdict': 'Residuos',
  'imgW.p.verdict.consistent': 'coherentes con las incertidumbres indicadas',
  'imgW.p.verdict.inconsistent':
    'no coherentes con las incertidumbres indicadas: el modelo no describe los datos',
  'imgW.p.row.parallax': 'Paralaje, relativo',
  'imgW.p.row.correction': 'Corrección a absoluto',
  'imgW.p.value.correction': '{value} mas ± {sigma} (un supuesto indicado)',
  'imgW.p.value.noCorrection': 'ninguna aplicada',
  'imgW.p.row.absolute': 'Paralaje, absoluto',
  'imgW.p.row.distance': 'Distancia, 1 sobre el paralaje',
  'imgW.p.row.interval68': 'Distancia, intervalo del 68 por ciento',
  'imgW.p.row.interval95': 'Distancia, intervalo del 95 por ciento',
  'imgW.p.row.signif': 'Paralaje sobre su incertidumbre',
  'imgW.p.row.frame': 'Marco de referencia',
  'imgW.p.value.relative':
    'El paralaje es relativo a las estrellas de referencia, así que es menor que el absoluto en su paralaje medio y la distancia nunca es menor que la verdadera',
  'imgW.p.value.corrected':
    'Se aplicó una corrección a absoluto; el paralaje absoluto vale tanto como esa corrección',
  'imgW.p.row.no': 'Por qué',
  'imgW.p.no.too-few-epochs':
    'Un paralaje necesita al menos {min} épocas que muestreen la órbita de la Tierra; {n} no bastan: no hay restricción',
  'imgW.p.no.span':
    'Un paralaje necesita épocas durante al menos {min} año; estas cubren {spanYears}',
  'imgW.p.no.phase-coverage':
    'Las épocas no muestrean la órbita de la Tierra: no hay restricción',
  'imgW.p.no.other': 'Se rechazó el ajuste: {code}',
  'imgW.p.value.how':
    'Errores independientes y un movimiento propio recto; sin movimiento orbital, sin desviación de la luz, y los errores comunes a las estrellas de referencia no se modelan',
  'imgW.o.title': 'La órbita de una estrella binaria',
  'imgW.o.note':
    'Doce posiciones de una compañera respecto de su estrella durante dieciséis años, cada una con una incertidumbre de 15 milisegundos de arco, de una binaria sintética. La curva es la órbita ajustada a las épocas usadas; un rechazo es la respuesta cuando las épocas no sostienen una.',
  'imgW.o.legend': 'compañera · órbita ajustada · este →, norte ↑ (arcsec)',
  'imgW.o.control.n': 'Épocas usadas',
  'imgW.o.control.model': 'Modelo de órbita',
  'imgW.o.control.plx': 'Paralaje, relativo',
  'imgW.o.model.ellipse': 'elíptica',
  'imgW.o.model.circle': 'circular',
  'imgW.o.preset.all': 'Las doce, elíptica',
  'imgW.o.preset.six': 'Las primeras seis',
  'imgW.o.value.source':
    'Sintético: una binaria de elementos elegidos vista en ángulo, con ruido sembrado; aquí no se muestra la verdad',
  'imgW.o.row.n': 'Épocas usadas',
  'imgW.o.row.span': 'Años cubiertos',
  'imgW.o.row.period': 'Período',
  'imgW.o.row.a': 'Semieje mayor',
  'imgW.o.row.e': 'Excentricidad',
  'imgW.o.row.i': 'Inclinación',
  'imgW.o.row.node': 'Nodo ascendente',
  'imgW.o.row.omega': 'Argumento del periastro',
  'imgW.o.row.T': 'Época del periastro',
  'imgW.o.row.chi2': 'Chi cuadrado y grados de libertad',
  'imgW.o.row.pValue': 'Probabilidad de un ajuste tan malo si el modelo fuera cierto',
  'imgW.o.row.coverage': 'Parte de un período que cubren las épocas',
  'imgW.o.row.mass': 'Suma de masas',
  'imgW.o.row.mass68': 'Suma de masas, intervalo del 68 por ciento',
  'imgW.o.row.mass95': 'Suma de masas, intervalo del 95 por ciento',
  'imgW.o.row.plx': 'Paralaje usado',
  'imgW.o.value.plx':
    '{value} mas ± {sigma}, relativo a estrellas de referencia',
  'imgW.o.row.frame': 'Marco de referencia',
  'imgW.o.value.frame':
    'El paralaje es relativo: la distancia y la suma de masas salen altas en el paralaje medio de las estrellas de referencia',
  'imgW.o.row.nodeNote': 'El nodo',
  'imgW.o.value.nodeNote':
    'Solo con posiciones no se sabe cuál de los dos cruces es el ascendente, así que el nodo se da entre 0 y 180 grados',
  'imgW.o.row.no': 'Por qué',
  'imgW.o.no.epochs':
    'Una órbita {depth} necesita al menos {need} épocas; se dieron {n}: no hay restricción',
  'imgW.o.no.inconsistent':
    'Los residuos no son coherentes con las incertidumbres indicadas (chi cuadrado {chi2} para {dof} grados de libertad): este modelo no describe los datos',
  'imgW.o.no.coverage':
    'Las épocas cubren muy poco de un período para fijar una órbita: no hay restricción',
  'imgW.o.no.other': 'Se rechazó el ajuste: {code}',
  'imgW.o.value.how':
    'Solo con posiciones no se obtienen las masas de las dos estrellas por separado, solo su suma; la suma supone la distancia, y su incertidumbre lleva la del paralaje, al cubo',
};
