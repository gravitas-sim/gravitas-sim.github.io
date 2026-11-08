// Las investigaciones guiadas del laboratorio 3-D: su español, y el del
// ejecutor (js/lab3d/view/guidePanel.js), con los mismos ids que
// ./en.lab3dGuides.js.

export const ES_LAB3DGUIDES = {
  // --- El ejecutor
  'g3.heading': 'Investigaciones guiadas',
  'g3.intro':
    'Un conjunto de investigaciones sobre lo que un modelo plano no puede contener: el plano de una órbita, cómo se ve desde fuera, los planos de dos órbitas, un tercer cuerpo lejano, los seis elementos orbitales, la elección de un plano de referencia, una órbita vista desde una dirección elegida y dos planetas enganchados en una resonancia. Cada una pide una predicción, te hace cambiar algo y medir, y dice dónde se detiene el modelo. Cada respuesta se comprueba con los números del propio laboratorio.',
  'g3.meta': 'Unos {intro} minutos; {advanced} en el recorrido avanzado.',
  'g3.startIntro': 'Empezar',
  'g3.startAdvanced': 'Empezar el recorrido avanzado',
  'g3.where': '{guide}: paso {n} de {of}, {path}.',
  'g3.path.intro': 'recorrido introductorio',
  'g3.path.advanced': 'recorrido avanzado',
  'g3.progress': 'Pasos',
  'g3.stepsDone': 'Pasos: {done} de {of} hechos',
  'g3.status.open': 'sin hacer',
  'g3.status.passed': 'hecho',
  'g3.status.shown': 'respuesta mostrada',
  'g3.status.recorded': 'registrada',
  'g3.status.tried': 'intentado',
  'g3.back': 'Atrás',
  'g3.next': 'Siguiente',
  'g3.finish': 'Terminar y ver el informe',
  'g3.all': 'Todas las investigaciones',
  'g3.do': 'Hazlo por mí',
  'g3.keep': 'Guardar este momento',
  'g3.check': 'Comprobar',
  'g3.reveal': 'Mostrar la respuesta',
  'g3.revealed':
    'La respuesta es {value}. El paso queda marcado como mostrado, no encontrado.',
  'g3.predict': 'Tu predicción',
  'g3.choose': 'Tu respuesta',
  'g3.record': 'Registrar mi predicción',
  'g3.recorded':
    'Registrada. Un paso posterior vuelve a ella; las predicciones no se califican.',
  'g3.pick': 'Elige primero una de las opciones.',
  'g3.notNumber':
    'Eso no es un número. Escríbelo con punto o coma decimal, y sin unidad.',
  'g3.missing':
    'Esto aún no se puede calcular: abre el sistema de este paso, o guarda el momento que lee.',
  'g3.waiting': 'Esperando a que el laboratorio muestre esto.',
  'g3.keepWaiting':
    'Cuando el laboratorio muestre lo que pide este paso, pulsa «Guardar este momento».',
  'g3.report': 'Tu informe',
  'g3.reportSummary':
    '{passed} de los {graded} pasos comprobados se superaron. Las predicciones figuran como registradas.',
  'g3.name': 'Tu nombre, para el informe (opcional)',
  'g3.save': 'Guardar el informe como archivo',
  'g3.unit.deg': 'Tu respuesta, en grados',
  'g3.unit.starRadii': 'Tu respuesta, en radios de la estrella',
  'g3.unit.fraction': 'Tu respuesta, como fracción (no como porcentaje)',
  'g3.unit.none': 'Tu respuesta (un número sin unidades)',

  // --- Los sistemas que traen las guías
  'gd.target.R1': 'Una órbita de Kepler inclinada (R1)',
  'gd.target.R3': 'Una estrella y dos planetas (R3)',
  'gd.target.R6': 'Ciclos de Kozai-Lidov (R6)',
  'gd.target.tilt-0': 'Investigación: un planeta en el plano de referencia',
  'gd.target.tilt-02': 'Investigación: la misma órbita inclinada 0,2°',
  'gd.target.tilt-05': 'Investigación: la misma órbita inclinada 0,5°',
  'gd.target.same-tilt': 'Investigación: dos planetas, ambos inclinados 10°',

  // --- l3-planes
  'gd.l3-planes.title': 'El plano de una órbita',
  'gd.l3-planes.summary':
    'La inclinación y la línea de los nodos: cómo se ve una órbita inclinada desde arriba y desde su propio canto, y qué números describen su inclinación.',
  'gd.l3-planes.intro.title': 'Toda órbita tiene un plano',
  'gd.l3-planes.intro.text':
    'Dos cuerpos orbitan en un plano que permanece fijo en el espacio. El laboratorio dibuja un plano de referencia, z = 0, como una cuadrícula. La inclinación de una órbita es el ángulo entre su plano y el plano de referencia, y la línea de los nodos es donde los dos planos se cortan.',
  'gd.l3-planes.predict-shape.title': 'Predice: la vista desde arriba',
  'gd.l3-planes.predict-shape.text':
    'Esta órbita es una elipse inclinada 40° respecto del plano de referencia. Mirando justo hacia abajo sobre el plano de referencia, ¿qué forma tendrá su trayectoria?',
  'gd.l3-planes.predict-shape.opt.same': 'La misma elipse, del mismo tamaño',
  'gd.l3-planes.predict-shape.opt.narrower':
    'Una elipse comprimida a través de la línea de los nodos',
  'gd.l3-planes.predict-shape.opt.circle': 'Un círculo',
  'gd.l3-planes.open.title': 'Abre la órbita, vista desde arriba',
  'gd.l3-planes.open.text':
    'Abre «Una órbita de Kepler inclinada» y elige la vista «Hacia abajo, sobre el plano de referencia».',
  'gd.l3-planes.open.ok':
    'Estás mirando justo hacia abajo sobre el plano de referencia.',
  'gd.l3-planes.play.title': 'Déjala dar una vuelta',
  'gd.l3-planes.play.text':
    'Reproduce hasta que el secundario haya dado la vuelta completa, para que su trayectoria muestre todo el recorrido.',
  'gd.l3-planes.play.ok':
    'Una órbita completa: la trayectoria es todo el recorrido.',
  'gd.l3-planes.shape.title': '¿Qué forma tiene la trayectoria desde arriba?',
  'gd.l3-planes.shape.text':
    'Compara la trayectoria con tu predicción. ¿Cuál la describe?',
  'gd.l3-planes.shape.opt.same': 'La misma elipse, del mismo tamaño',
  'gd.l3-planes.shape.opt.narrower':
    'Una elipse comprimida a través de la línea de los nodos',
  'gd.l3-planes.shape.opt.circle': 'Un círculo',
  'gd.l3-planes.shape.ok':
    'Correcto. Mirando hacia abajo, las distancias a lo largo de la línea de los nodos se conservan, y las que la atraviesan se reducen por cos i. Una imagen 2-D de una órbita inclinada es una proyección, no la órbita.',
  'gd.l3-planes.shape.no':
    'Vuelve a mirar la trayectoria sobre la cuadrícula. A lo largo de la línea de los nodos nada se reduce; a través de ella, cada distancia se multiplica por el coseno de la inclinación.',
  'gd.l3-planes.orbit-tool.title': 'Mide la órbita',
  'gd.l3-planes.orbit-tool.text':
    'Elige el instrumento «Órbita» sobre el secundario. Lee la órbita a partir de las posiciones y las velocidades, no de la imagen. La tabla bajo la vista tiene los mismos números.',
  'gd.l3-planes.orbit-tool.ok':
    'El instrumento de órbita está sobre el secundario.',
  'gd.l3-planes.inclination.title': 'La inclinación',
  'gd.l3-planes.inclination.text':
    '¿Cuál es la inclinación del secundario, en grados? Está en la lectura y en la tabla de órbitas.',
  'gd.l3-planes.inclination.ok':
    'Correcto: 40°, el ángulo entre el plano de la órbita y el plano de referencia.',
  'gd.l3-planes.inclination.no':
    'No del todo. Lee «i» en la lectura, o la columna de inclinación de la tabla de órbitas.',
  'gd.l3-planes.node.title': 'El nodo ascendente',
  'gd.l3-planes.node.text':
    'Donde el secundario cruza el plano de referencia hacia arriba está el nodo ascendente. Su dirección desde el primario se da como un ángulo desde el eje x, la longitud del nodo ascendente. ¿Cuánto vale, en grados? Está en la tabla de órbitas.',
  'gd.l3-planes.node.ok':
    'Correcto: 30°. Junto con la inclinación, fija el plano de la órbita en el espacio; un modelo plano no tiene ni lo uno ni lo otro.',
  'gd.l3-planes.node.no':
    'No del todo. La columna «Nodo ascendente» de la tabla de órbitas lo tiene, medido desde +x.',
  'gd.l3-planes.edge-on.title': 'Mira a lo largo del canto de la órbita',
  'gd.l3-planes.edge-on.text':
    'Elige la vista «De canto a la órbita», con el secundario centrado. El laboratorio mira a lo largo de la línea de los nodos de la órbita.',
  'gd.l3-planes.edge-on.ok':
    'Estás mirando a lo largo de la línea de los nodos de la órbita.',
  'gd.l3-planes.edge-shape.title': 'La órbita, de canto',
  'gd.l3-planes.edge-shape.text':
    'De canto a su propio plano, ¿cómo se ve la órbita?',
  'gd.l3-planes.edge-shape.opt.line': 'Una línea recta',
  'gd.l3-planes.edge-shape.opt.ellipse': 'Una elipse',
  'gd.l3-planes.edge-shape.opt.circle': 'Un círculo',
  'gd.l3-planes.edge-shape.ok':
    'Correcto: todos los puntos de un plano visto a lo largo del plano se alinean. Así se ve desde la Tierra una órbita que produce eclipses.',
  'gd.l3-planes.edge-shape.no':
    'Vuelve a mirar la trayectoria: vista a lo largo de su propio plano, todo el recorrido está sobre una línea.',
  'gd.l3-planes.periapsis.title': 'El argumento del periastro',
  'gd.l3-planes.periapsis.text':
    'Dentro de su plano, la elipse está girada de modo que su periastro (su punto más cercano al primario) queda a un ángulo del nodo ascendente: el argumento del periastro. ¿Cuánto vale, en grados?',
  'gd.l3-planes.periapsis.ok':
    'Correcto: 60°. La inclinación, el nodo y el periastro juntos orientan la elipse en el espacio.',
  'gd.l3-planes.periapsis.no':
    'No del todo. Está en la tabla de órbitas, en la columna «Argumento del periastro».',
  'gd.l3-planes.frame.title': 'Cambia el marco',
  'gd.l3-planes.frame.text':
    'Elige el marco «Centrado en primary». Ahora la imagen se mueve con el primario.',
  'gd.l3-planes.frame.ok':
    'El laboratorio muestra ahora el marco centrado en el primario.',
  'gd.l3-planes.frame-elements.title': '¿Cambió la órbita?',
  'gd.l3-planes.frame-elements.text':
    'Vuelve a mirar la tabla de órbitas. ¿Cambiaron la inclinación, el nodo o el periastro con el marco?',
  'gd.l3-planes.frame-elements.opt.unchanged': 'No, son los mismos',
  'gd.l3-planes.frame-elements.opt.changed': 'Sí, cambiaron',
  'gd.l3-planes.frame-elements.ok':
    'Correcto. Los elementos describen el movimiento del secundario respecto del primario, y todos los marcos de aquí coinciden en eso. Solo cambió dónde está centrada la imagen.',
  'gd.l3-planes.frame-elements.no':
    'Compara de nuevo las columnas. Los elementos son respecto del primario, esté la vista en el marco que esté.',
  'gd.l3-planes.flat.title': 'Lo que un modelo plano conserva, y lo que pierde',
  'gd.l3-planes.flat.text':
    'Un modelo 2-D de esta órbita es su vista de frente. Conserva exactamente el tamaño, la forma y el período: a, e y el período no dependen de la inclinación. Pierde la inclinación y el nodo, es decir, dónde está la órbita. Para una sola órbita estudiada por sí misma, un modelo plano basta; en cuanto importa un segundo plano, el de referencia, un observador u otra órbita, ya no.',
  'gd.l3-planes.limits.title': 'Dónde se detiene el modelo',
  'gd.l3-planes.limits.text':
    'Masas puntuales bajo la gravedad newtoniana, integradas por el núcleo validado. Los elementos son osculadores: la órbita de dos cuerpos que seguirían ahora las posiciones y velocidades. Aquí permanecen fijos; con un tercer cuerpo derivarían. Las medidas son las cuatro cifras significativas de la tabla.',

  // --- l3-eclipse
  'gd.l3-eclipse.title': 'Visto desde fuera',
  'gd.l3-eclipse.summary':
    'Que un planeta eclipse a su estrella depende de la línea de visión: una cuestión de fracciones de grado, y algo en lo que un tamaño dibujado puede equivocarse.',
  'gd.l3-eclipse.intro.title': 'Un observador fuera de la órbita',
  'gd.l3-eclipse.intro.text':
    'Un observador lejano ve el sistema proyectado sobre el cielo, el plano perpendicular a su línea de visión. Un planeta eclipsa a su estrella cuando, en la conjunción, su separación en el cielo es menor que la suma de sus radios. Aquí el radio de la estrella es 0,005 del radio de la órbita, más o menos el del Sol frente a la órbita de la Tierra, y el del planeta es una décima del de la estrella.',
  'gd.l3-eclipse.open-flat.title':
    'Una órbita en el plano de referencia, vista a lo largo de él',
  'gd.l3-eclipse.open-flat.text':
    'Abre «Investigación: un planeta en el plano de referencia» y mira «A lo largo del plano de referencia», desde -y: el observador. Elige el instrumento «En el cielo, visto desde aquí» sobre la estrella y el planeta.',
  'gd.l3-eclipse.open-flat.ok':
    'Visto desde aquí, la órbita está de canto: una vez por órbita, el planeta pasa justo por delante de la estrella.',
  'gd.l3-eclipse.predict.title': 'Predice: inclínala medio grado',
  'gd.l3-eclipse.predict.text':
    'Inclina la misma órbita 0,5° alrededor del eje x, y deja al observador donde está. ¿Seguirá pasando el planeta por delante de la estrella?',
  'gd.l3-eclipse.predict.opt.yes': 'Sí',
  'gd.l3-eclipse.predict.opt.no': 'No',
  'gd.l3-eclipse.open-tilted.title': 'Abre la órbita inclinada',
  'gd.l3-eclipse.open-tilted.text':
    'Abre «Investigación: la misma órbita inclinada 0,5°», todavía vista a lo largo del plano de referencia, y pon el instrumento «Órbita» sobre el planeta.',
  'gd.l3-eclipse.open-tilted.ok':
    'La órbita inclinada está abierta, con el instrumento de órbita sobre el planeta.',
  'gd.l3-eclipse.impact.title': '¿A qué distancia pasa?',
  'gd.l3-eclipse.impact.text':
    'En la conjunción el planeta está a la distancia a del radio de la órbita, elevado sobre la línea del observador a × sen(i). Calcula esa separación en radios de la estrella, a × sen(i) ÷ 0,005, a partir de la a y la i que lee el instrumento.',
  'gd.l3-eclipse.impact.ok':
    'Correcto: unos 1,75 radios de la estrella. Los astrónomos lo llaman parámetro de impacto.',
  'gd.l3-eclipse.impact.no':
    'Revisa la cuenta: a = 1 e i = 0,5°, así que a sen i es unos 0,0087; divide entre el radio de la estrella, 0,005.',
  'gd.l3-eclipse.eclipses.title': '¿Hay eclipse?',
  'gd.l3-eclipse.eclipses.text':
    'Un eclipse necesita que la separación sea menor que el radio de la estrella más el del planeta: aquí, 1,1 radios de la estrella. ¿Eclipsa esta órbita a su estrella, vista desde el observador?',
  'gd.l3-eclipse.eclipses.opt.yes': 'Sí',
  'gd.l3-eclipse.eclipses.opt.no': 'No',
  'gd.l3-eclipse.eclipses.ok':
    'Correcto: a 1,75 radios de la estrella, el planeta pasa por encima de ella. Medio grado bastó para perder el eclipse, y por eso la mayoría de los planetas nunca transitan vistos desde la Tierra.',
  'gd.l3-eclipse.eclipses.no':
    'Compara tu separación con 1,1 radios de la estrella. Si es mayor, el planeta no la toca.',
  'gd.l3-eclipse.enlarged.title': 'Míralo pasar, dibujado más grande',
  'gd.l3-eclipse.enlarged.text':
    'El laboratorio dibuja los cuerpos a diez veces su radio y reproduce a un cuarto de velocidad. Mira cómo el planeta da la vuelta por delante de la estrella, y lee la separación en el cielo mientras pasa.',
  'gd.l3-eclipse.enlarged.ok': 'El planeta ha dado una vuelta.',
  'gd.l3-eclipse.appears.title': '¿Qué mostró la imagen?',
  'gd.l3-eclipse.appears.text':
    'Dibujados a diez veces sus radios, ¿pareció el planeta cruzar la estrella?',
  'gd.l3-eclipse.appears.opt.yes': 'Sí, pareció cruzarla',
  'gd.l3-eclipse.appears.opt.no': 'No, pasó sin tocarla',
  'gd.l3-eclipse.appears.ok':
    'Correcto, pareció cruzarla, y no hay eclipse. Dibujados diez veces más grandes, los discos se superponen. La leyenda dice que el tamaño está aumentado; un tamaño dibujado es una elección, y deciden los números.',
  'gd.l3-eclipse.appears.no':
    'Vuelve a mirar con el tamaño en radio × 10: los discos aumentados se superponen cuando pasa el planeta, aunque los verdaderos no.',
  'gd.l3-eclipse.open-slight.title': 'Una inclinación menor',
  'gd.l3-eclipse.open-slight.text':
    'Abre «Investigación: la misma órbita inclinada 0,2°», vista a lo largo del plano de referencia, con el instrumento de órbita sobre el planeta.',
  'gd.l3-eclipse.open-slight.ok': 'La órbita de 0,2° está abierta.',
  'gd.l3-eclipse.impact-slight.title': '¿A qué distancia ahora?',
  'gd.l3-eclipse.impact-slight.text':
    'Calcula de nuevo a × sen(i) ÷ 0,005 para esta órbita.',
  'gd.l3-eclipse.impact-slight.ok':
    'Correcto: unos 0,70 radios de la estrella.',
  'gd.l3-eclipse.impact-slight.no':
    'No del todo. Con i = 0,2°, a sen i es unos 0,0035; divide entre 0,005.',
  'gd.l3-eclipse.eclipses-slight.title': '¿Eclipsa esta?',
  'gd.l3-eclipse.eclipses-slight.text':
    '¿Es 0,70 radios de la estrella menor que el 1,1 que necesita un eclipse?',
  'gd.l3-eclipse.eclipses-slight.opt.yes': 'Sí, hay eclipse',
  'gd.l3-eclipse.eclipses-slight.opt.no': 'No',
  'gd.l3-eclipse.eclipses-slight.ok':
    'Correcto: cruza el disco de la estrella, fuera del centro. La profundidad y la duración de un tránsito así le dan a un astrónomo este número.',
  'gd.l3-eclipse.eclipses-slight.no':
    'Compara de nuevo: 0,70 es menor que 1,1, así que el planeta cruza el disco.',
  'gd.l3-eclipse.critical.title': 'La mayor inclinación que aún eclipsa',
  'gd.l3-eclipse.critical.text':
    'La órbita eclipsa mientras a × sen(i) sea menor que la suma de los dos radios, 0,0055. ¿Cuál es la mayor inclinación, en grados, que todavía da un eclipse?',
  'gd.l3-eclipse.critical.ok':
    'Correcto: unos 0,32°. Para órbitas orientadas al azar, la probabilidad de ver un tránsito es de alrededor de (R* + Rp) ÷ a, aquí medio por ciento.',
  'gd.l3-eclipse.critical.no':
    'Despeja i de sen(i) = 0,0055 ÷ a, con a = 1, y pásalo a grados.',
  'gd.l3-eclipse.flat.title':
    'Lo que un modelo plano conserva, y lo que pierde',
  'gd.l3-eclipse.flat.text':
    'Un modelo 2-D no tiene un afuera: su observador está en el plano, y entonces toda órbita eclipsa, o por encima de él, y entonces ninguna. Si una órbita real eclipsa lo deciden décimas de grado fuera de ese plano. Un modelo plano sigue siendo correcto para lo que no depende de la inclinación: el período, el tamaño de la órbita y los momentos de la conjunción.',
  'gd.l3-eclipse.limits.title': 'Dónde se detiene el modelo',
  'gd.l3-eclipse.limits.text':
    'La estrella y el planeta son esferas de radio fijo, usadas para los contactos y el dibujo; el núcleo no modela la luz, el oscurecimiento hacia el borde ni el tiempo finito que dura un tránsito. Aquí un eclipse es geometría: la separación en el cielo frente a la suma de los radios.',

  // --- l3-mutual
  'gd.l3-mutual.title': 'Los planos de dos órbitas',
  'gd.l3-mutual.summary':
    'La inclinación mutua: dos órbitas con la misma inclinación no tienen por qué compartir un plano, y cuándo un modelo plano de un sistema planetario es suficiente.',
  'gd.l3-mutual.intro.title': 'El ángulo entre dos órbitas',
  'gd.l3-mutual.intro.text':
    'Cada órbita tiene su propio plano. El ángulo entre dos planos es su inclinación mutua, y es lo que determina cómo se perturban las órbitas entre sí. La inclinación por sí sola mide cada una respecto del plano de referencia.',
  'gd.l3-mutual.open.title': 'Dos planetas, ambos inclinados',
  'gd.l3-mutual.open.text':
    'Abre «Investigación: dos planetas, ambos inclinados 10°» y pon el instrumento «Órbita» sobre el planeta b.',
  'gd.l3-mutual.open.ok':
    'Los dos planetas están abiertos, con el instrumento de órbita sobre el planeta b.',
  'gd.l3-mutual.inclination-b.title': 'La inclinación del planeta b',
  'gd.l3-mutual.inclination-b.text':
    '¿Cuál es la inclinación del planeta b, en grados?',
  'gd.l3-mutual.inclination-b.ok': 'Correcto: 10°.',
  'gd.l3-mutual.inclination-b.no':
    'No del todo. Lee i en la lectura, o en la tabla de órbitas.',
  'gd.l3-mutual.inclination-c.title': 'La inclinación del planeta c',
  'gd.l3-mutual.inclination-c.text':
    '¿Y la del planeta c? Mueve el instrumento al planeta c, o lee la tabla de órbitas.',
  'gd.l3-mutual.inclination-c.ok': 'Correcto: también 10°.',
  'gd.l3-mutual.inclination-c.no':
    'No del todo. La fila del planeta c en la tabla de órbitas la tiene.',
  'gd.l3-mutual.predict.title': 'Predice: ¿un plano o dos?',
  'gd.l3-mutual.predict.text':
    'Las dos órbitas están inclinadas 10° respecto del plano de referencia. ¿Están en el mismo plano?',
  'gd.l3-mutual.predict.opt.same': 'Sí, en el mismo plano',
  'gd.l3-mutual.predict.opt.different': 'No, en planos distintos',
  'gd.l3-mutual.between.title': 'Mide el ángulo entre ellas',
  'gd.l3-mutual.between.text':
    'Elige el instrumento «Entre dos órbitas», del planeta b al planeta c.',
  'gd.l3-mutual.between.ok':
    'El instrumento está midiendo los planos de las dos órbitas.',
  'gd.l3-mutual.mutual.title': 'La inclinación mutua',
  'gd.l3-mutual.mutual.text':
    '¿Qué ángulo lee el instrumento entre las dos órbitas, en grados?',
  'gd.l3-mutual.mutual.ok':
    'Correcto: unos 14,1°, aunque las dos inclinaciones son 10°. Sus nodos ascendentes están separados 90°: los planos se inclinan en direcciones distintas.',
  'gd.l3-mutual.mutual.no': 'No del todo. Está en la lectura del instrumento.',
  'gd.l3-mutual.planes.title': '¿Un plano o dos?',
  'gd.l3-mutual.planes.text':
    'Entonces, ¿están las dos órbitas en el mismo plano?',
  'gd.l3-mutual.planes.opt.same': 'Sí, en el mismo plano',
  'gd.l3-mutual.planes.opt.different': 'No, en planos distintos',
  'gd.l3-mutual.planes.ok':
    'Correcto. Inclinaciones iguales significan la misma inclinación respecto del plano de referencia, no el mismo plano: también importa la dirección de la inclinación, el nodo.',
  'gd.l3-mutual.planes.no':
    'Vuelve a mirar la inclinación mutua. Dos planos en los que las órbitas forman 14° entre sí no son un solo plano.',
  'gd.l3-mutual.formula.title': 'El ángulo, a partir de los elementos',
  'gd.l3-mutual.formula.text':
    'La inclinación mutua I se obtiene de la i y la Ω de cada órbita: cos I = cos i₁ cos i₂ + sen i₁ sen i₂ cos(Ω₁ − Ω₂). Calcúlala con los valores de la tabla de órbitas, en grados.',
  'gd.l3-mutual.formula.ok': 'Correcto: la fórmula y el instrumento coinciden.',
  'gd.l3-mutual.formula.no':
    'Revisa los ángulos: i₁ = i₂ = 10°, y los nodos difieren en 90°, así que cos(Ω₁ − Ω₂) = 0.',
  'gd.l3-mutual.open-r3.title': 'Un sistema como el nuestro',
  'gd.l3-mutual.open-r3.text':
    'Abre «Una estrella y dos planetas», un Júpiter y un Saturno, y mide entre las órbitas del planeta interior y del exterior.',
  'gd.l3-mutual.open-r3.ok':
    'El instrumento está entre las órbitas de los dos planetas.',
  'gd.l3-mutual.mutual-r3.title': 'Su inclinación mutua',
  'gd.l3-mutual.mutual-r3.text': '¿Cuánto vale, en grados?',
  'gd.l3-mutual.mutual-r3.ok':
    'Correcto: unos 1,27°, cerca de la de los verdaderos Júpiter y Saturno. La diferencia de sus inclinaciones, 1,2°, se acerca, pero no es igual.',
  'gd.l3-mutual.mutual-r3.no':
    'No del todo. Está en la lectura del instrumento.',
  'gd.l3-mutual.flat-error.title': '¿Cuánto se equivoca un modelo plano?',
  'gd.l3-mutual.flat-error.text':
    'Tumbar la órbita exterior sobre el plano de la interior acorta sus distancias a través de la línea de los nodos común en una fracción 1 − cos I. Calcúlala para esta I.',
  'gd.l3-mutual.flat-error.ok':
    'Correcto: unos 0,00024, dos partes en diez mil.',
  'gd.l3-mutual.flat-error.no':
    'Pasa I a radianes antes si tu calculadora lo necesita, y luego calcula 1 − cos I.',
  'gd.l3-mutual.flat-enough.title': '¿Basta aquí un modelo plano?',
  'gd.l3-mutual.flat-enough.text':
    'Para las distancias de los planetas a la estrella y sus períodos, ¿es un modelo plano de este sistema una buena aproximación?',
  'gd.l3-mutual.flat-enough.opt.yes': 'Sí',
  'gd.l3-mutual.flat-enough.opt.no': 'No',
  'gd.l3-mutual.flat-enough.ok':
    'Correcto. Con una inclinación mutua de cerca de 1°, un modelo 2-D se equivoca en unas pocas partes en diez mil en la distancia, y por eso el sandbox 2-D puede modelar bien los planetas del Sistema Solar.',
  'gd.l3-mutual.flat-enough.no':
    'Compara el error con la precisión que necesitas: dos partes en diez mil está por debajo de lo que miden la mayoría de las investigaciones.',
  'gd.l3-mutual.flat.title': 'Lo que un modelo plano conserva, y lo que pierde',
  'gd.l3-mutual.flat.text':
    'Un modelo 2-D pone todas las órbitas en un plano: todas sus inclinaciones mutuas son cero. Es un buen modelo de un sistema casi plano como el nuestro, y uno equivocado allí donde las órbitas están muy inclinadas entre sí, como muestra la siguiente investigación.',
  'gd.l3-mutual.limits.title': 'Dónde se detiene el modelo',
  'gd.l3-mutual.limits.text':
    'Los planetas de aquí son ligeros y están lejos entre sí, así que sus órbitas apenas cambian durante el tiempo que miras. A lo largo de muchas órbitas sus planos precesan alrededor del momento angular total; los elementos osculadores que lee el instrumento son los del momento.',

  // --- l3-kozai
  'gd.l3-kozai.title': 'Un tercer cuerpo lejano',
  'gd.l3-kozai.summary':
    'Un triple jerárquico: un compañero lejano y pesado cambia poco a poco la inclinación de una órbita por excentricidad, el ciclo de Kozai-Lidov, mientras una combinación de las dos se mantiene.',
  'gd.l3-kozai.intro.title': 'Un triple en dos niveles',
  'gd.l3-kozai.intro.text':
    'Una partícula de prueba orbita una estrella a una distancia de 1. Veinte veces más lejos, una segunda estrella de la misma masa orbita al par en el plano de referencia. La órbita de la partícula empieza casi circular e inclinada 65° respecto de la órbita exterior. El sistema es jerárquico: una órbita interior y una exterior.',
  'gd.l3-kozai.open.title': 'Abre el triple',
  'gd.l3-kozai.open.text':
    'Abre «Ciclos de Kozai-Lidov», mantén la estrella centrada y pon el instrumento «Órbita» sobre la partícula.',
  'gd.l3-kozai.open.ok':
    'El triple está abierto, con el instrumento de órbita sobre la partícula.',
  'gd.l3-kozai.start.title': 'Guarda el momento inicial',
  'gd.l3-kozai.start.text':
    'Antes de reproducir, pulsa «Guardar este momento»: las respuestas posteriores leen la órbita tal como estaba al principio.',
  'gd.l3-kozai.start.ok': 'El momento inicial está guardado.',
  'gd.l3-kozai.e0.title': 'La excentricidad inicial',
  'gd.l3-kozai.e0.text':
    '¿Cuál es la excentricidad de la partícula en el momento que guardaste?',
  'gd.l3-kozai.e0.ok': 'Correcto: 0,01, casi circular.',
  'gd.l3-kozai.e0.no':
    'No del todo. Lee e en la tabla de órbitas, fila de la partícula, en el momento guardado.',
  'gd.l3-kozai.i0.title': 'La inclinación inicial',
  'gd.l3-kozai.i0.text':
    '¿Y su inclinación, en grados? El plano de referencia es el plano orbital de la estrella exterior, así que esta es la inclinación mutua.',
  'gd.l3-kozai.i0.ok': 'Correcto: 65°.',
  'gd.l3-kozai.i0.no': 'No del todo. Lee i en la tabla de órbitas.',
  'gd.l3-kozai.predict.title': 'Predice: a lo largo de muchas órbitas',
  'gd.l3-kozai.predict.text':
    'La estrella exterior tira de la partícula con suavidad, un poco distinto a cada lado de su órbita. A lo largo de miles de órbitas de la partícula, ¿qué hará su excentricidad?',
  'gd.l3-kozai.predict.opt.stays': 'Seguir siendo pequeña',
  'gd.l3-kozai.predict.opt.returns': 'Crecer mucho y luego volver',
  'gd.l3-kozai.predict.opt.escapes': 'Crecer hasta que la partícula escape',
  'gd.l3-kozai.peak.title': 'Reproduce, y guarda la mayor excentricidad',
  'gd.l3-kozai.peak.text':
    'Reproduce a ×256 y observa e en la tabla de órbitas. Cuando esté en su máximo, pausa y pulsa «Guardar este momento». Cerca del máximo cambia despacio, así que basta un momento próximo.',
  'gd.l3-kozai.peak.ok':
    'El momento está guardado, con e muy por encima de su valor inicial.',
  'gd.l3-kozai.e-peak.title': 'La mayor excentricidad',
  'gd.l3-kozai.e-peak.text':
    '¿Cuál es la excentricidad de la partícula en el momento que guardaste?',
  'gd.l3-kozai.e-peak.ok':
    'Correcto. Subió de 0,01 a más de 0,8: la órbita se volvió una elipse larga y estrecha.',
  'gd.l3-kozai.e-peak.no':
    'No del todo. La respuesta es e en el momento que guardaste: pausa ahí y lee la tabla de órbitas antes de seguir reproduciendo.',
  'gd.l3-kozai.i-peak.title': 'La inclinación en ese momento',
  'gd.l3-kozai.i-peak.text': '¿Y la inclinación en ese momento, en grados?',
  'gd.l3-kozai.i-peak.ok':
    'Correcto: bajó a medida que subía e, hasta cerca de 39°. La órbita cambió inclinación por excentricidad.',
  'gd.l3-kozai.i-peak.no':
    'No del todo. Lee i en la tabla en el momento guardado.',
  'gd.l3-kozai.outcome.title': '¿Qué hace e?',
  'gd.l3-kozai.outcome.text':
    'Sigue reproduciendo y observa. ¿Qué hizo la excentricidad?',
  'gd.l3-kozai.outcome.opt.stays': 'Siguió siendo pequeña',
  'gd.l3-kozai.outcome.opt.returns': 'Creció mucho y luego volvió',
  'gd.l3-kozai.outcome.opt.escapes': 'Creció hasta que la partícula escapó',
  'gd.l3-kozai.outcome.ok':
    'Correcto: oscila y vuelve cerca de su valor inicial, una y otra vez. Es el ciclo de Kozai-Lidov, validado en el problema de referencia R6 del núcleo.',
  'gd.l3-kozai.outcome.no':
    'Sigue reproduciendo después del máximo: e vuelve a bajar, y luego sube otra vez.',
  'gd.l3-kozai.k-start.title': 'Una magnitud que se mantiene: al principio',
  'gd.l3-kozai.k-start.text':
    'Calcula √(1 − e²) × cos(i) para el momento inicial, con la e y la i que encontraste.',
  'gd.l3-kozai.k-start.ok': 'Correcto: unos 0,423.',
  'gd.l3-kozai.k-start.no':
    'Compruébalo: e = 0,01 hace que √(1 − e²) sea casi exactamente 1, y cos 65° es unos 0,4226.',
  'gd.l3-kozai.k-peak.title': 'Y en el máximo',
  'gd.l3-kozai.k-peak.text':
    'Ahora √(1 − e²) × cos(i) para el momento del máximo.',
  'gd.l3-kozai.k-peak.ok': 'Correcto.',
  'gd.l3-kozai.k-peak.no':
    'Compruébalo con la e y la i del momento del máximo que guardaste.',
  'gd.l3-kozai.kept.title': '¿Cambió?',
  'gd.l3-kozai.kept.text':
    'Compara los dos valores. Con una precisión del uno por ciento, ¿son iguales?',
  'gd.l3-kozai.kept.opt.same': 'Iguales',
  'gd.l3-kozai.kept.opt.different': 'Distintos',
  'gd.l3-kozai.kept.ok':
    'Correcto. √(1 − e²) cos i es el momento angular de la partícula a lo largo del eje de la órbita exterior, por unidad de tamaño de su órbita. El tirón de la estrella exterior gira la órbita pero no puede cambiar esa componente: a medida que la órbita se inclina menos, su momento angular total debe disminuir, y la órbita se vuelve excéntrica. El momento angular se intercambia entre la dirección de la órbita y su forma.',
  'gd.l3-kozai.kept.no':
    'Compara los dos números que calculaste: difieren en menos del uno por ciento.',
  'gd.l3-kozai.predicted.title': 'El máximo según la teoría',
  'gd.l3-kozai.predicted.text':
    'La teoría secular, en su orden más bajo, predice la mayor excentricidad a partir de la inclinación inicial: e_max = √(1 − (5/3) cos² i₀). Calcúlala para tu i₀.',
  'gd.l3-kozai.predicted.ok':
    'Correcto: unos 0,838. El máximo del núcleo está cerca; la pequeña diferencia son los términos de orden superior que la fórmula omite.',
  'gd.l3-kozai.predicted.no':
    'Compruébalo: cos 65° al cuadrado es unos 0,1786; por 5/3 da unos 0,298.',
  'gd.l3-kozai.below-critical.title': 'Una inclinación menor',
  'gd.l3-kozai.below-critical.text':
    'La fórmula no tiene solución real cuando (5/3) cos² i₀ > 1, es decir, por debajo de i₀ = 39,2°. ¿Qué daría una inclinación inicial de 30°?',
  'gd.l3-kozai.below-critical.opt.cycles': 'Ciclos de excentricidad como estos',
  'gd.l3-kozai.below-critical.opt.none':
    'Ningún ciclo grande: e sigue siendo pequeña',
  'gd.l3-kozai.below-critical.ok':
    'Correcto. Por debajo de 39,2° la órbita precesa, pero su excentricidad no aumenta. La inclinación en el máximo que mediste, cerca de 39°, es este ángulo crítico.',
  'gd.l3-kozai.below-critical.no':
    'Por debajo del ángulo crítico, 39,2°, la teoría de orden más bajo no da crecimiento de la excentricidad.',
  'gd.l3-kozai.flat.title': 'Lo que un modelo plano conserva, y lo que pierde',
  'gd.l3-kozai.flat.text':
    'En un modelo 2-D toda órbita tiene inclinación mutua cero, que está por debajo del ángulo crítico: un triple plano no tiene ningún ciclo de Kozai. Un modelo plano sigue sirviendo para un triple cuyas órbitas son casi coplanares, por debajo de unos 39°, en lo que respecta a este efecto.',
  'gd.l3-kozai.limits.title': 'Dónde se detiene el modelo',
  'gd.l3-kozai.limits.text':
    'La partícula no tiene masa y las estrellas son puntos. El núcleo integra el problema completo de tres cuerpos, así que incluye los efectos de orden superior que la fórmula omite. No tiene relatividad general, cuya precesión amortiguaría estos ciclos para una órbita interior estrecha, ni mareas. Aquí el laboratorio muestrea la órbita interior de forma gruesa, 40 pasos por órbita, lo que cambia la imagen pero no los números.',

  // --- Modos de ejecución, como los nombra el ejecutor (Prompt 271)
  'g3.modeLine': 'Este paso se ejecuta en el modo de ejecución {mode}.',
  'g3.mode.kepler': 'solo Kepler',
  'g3.mode.nbody': 'N cuerpos',
  'g3.mode.precomputed': 'precalculado',
  'g3.mode.undeclared':
    'Este paso no indica un modo de ejecución, así que no se puede comprobar.',
  'g3.mode.needsKepler':
    'Este paso se comprueba en el modo de ejecución solo Kepler. Elige «Solo Kepler» en «Modo de ejecución», o pulsa «Hazlo por mí».',
  'g3.mode.needsNbody':
    'Este paso necesita el modo de ejecución N cuerpos: solo el integrador deja que los cuerpos se atraigan entre sí, y este paso trata de lo que eso produce. Elige «N cuerpos» en «Modo de ejecución», o pulsa «Hazlo por mí».',
  'g3.mode.needsPrecomputed':
    'Este paso se comprueba sobre una ejecución precalculada reproducida, que el laboratorio abre desde un archivo.',

  // --- Los sistemas que trae el segundo currículo
  'gd.target.el-start': 'Investigación: una órbita para editar',
  'gd.target.frames-solar': 'Investigación: dos planetas, en unidades solares',
  'gd.target.seen-binary':
    'Investigación: la órbita de una estrella binaria, inclinada 60°',
  'gd.target.seen-eclipse':
    'Investigación: una órbita excéntrica, a un cuarto de grado',
  'gd.target.mutual-two': 'Investigación: dos planetas, inclinados 10° y 25°',
  'gd.target.res-21': 'Investigación: dos planetas cerca de una resonancia 2:1',

  // --- l3-elements
  'gd.l3-elements.title': 'El lenguaje de las órbitas',
  'gd.l3-elements.summary':
    'Seis números describen una órbita. Cambia cada uno por turno, mira qué mueve y qué deja quieto, y descubre qué no está definido cuando una órbita es plana. Todos los pasos se ejecutan en el modo de ejecución solo Kepler.',
  'gd.l3-elements.intro.title': 'Seis números y un instante',
  'gd.l3-elements.intro.text':
    'Una órbita alrededor de un cuerpo queda fijada por seis elementos orbitales: el semieje mayor a (su tamaño), la excentricidad e (cuán alargada es), la inclinación i (cuánto se inclina su plano respecto del plano de referencia), el nodo Ω (por dónde sube a través de ese plano), el periapsis ω (dónde la órbita está más cerca) y la anomalía media M (dónde está el planeta a lo largo de ella). El laboratorio los lee de la posición y la velocidad del planeta, y el botón Aplicar hace el camino inverso: construye una posición y una velocidad nuevas a partir de los números que escribes. El modo de ejecución aquí es solo Kepler: el planeta sigue exactamente su propia órbita de dos cuerpos y nada la perturba, que es el modo adecuado para aprender qué significan los números.',
  'gd.l3-elements.open.title': 'Abre una órbita para editar',
  'gd.l3-elements.open.text':
    'Elige «Solo Kepler» en «Modo de ejecución». Abre «Investigación: una órbita para editar» y pon el instrumento «Órbita» sobre el planeta. El planeta orbita una estrella de masa 1; las longitudes están en unidades de código, con G = 1.',
  'gd.l3-elements.open.ok':
    'La órbita está abierta en el modo de ejecución solo Kepler, con el instrumento de órbita sobre el planeta.',
  'gd.l3-elements.panel.title': 'Abre el editor de órbitas',
  'gd.l3-elements.panel.text':
    'Pulsa «Editor de órbitas y vista del cielo». Su primera sección, «Órbita», muestra los seis elementos y dice respecto de qué se miden, en qué ejes, en qué instante, en qué escala de tiempo y en qué unidades. Pulsa «Cargar los elementos actuales» para rellenar los campos.',
  'gd.l3-elements.panel.ok': 'El editor de órbitas está abierto.',
  'gd.l3-elements.predict-a.title': 'Predice: duplicar el semieje mayor',
  'gd.l3-elements.predict-a.text':
    'Vas a hacer la órbita el doble de grande, a = 2, dejando lo demás igual. ¿Cómo cambiará el período? La tercera ley de Kepler es T² ∝ a³.',
  'gd.l3-elements.predict-a.opt.same': 'Queda igual',
  'gd.l3-elements.predict-a.opt.double': 'Se duplica',
  'gd.l3-elements.predict-a.opt.x283': 'Crece en un factor de 2,83',
  'gd.l3-elements.predict-a.opt.x4': 'Crece en un factor de 4',
  'gd.l3-elements.edit-a.title': 'Hazla el doble de grande',
  'gd.l3-elements.edit-a.text':
    'Escribe 2 en el campo de a y pulsa Aplicar. La ejecución continúa desde este instante sobre la órbita nueva; solo cambia el planeta, que conserva su inclinación, su forma y su lugar a lo largo de la órbita.',
  'gd.l3-elements.edit-a.ok': 'La órbita tiene ahora a = 2.',
  'gd.l3-elements.period.title': 'El período nuevo',
  'gd.l3-elements.period.text':
    'Lee el período en el instrumento. ¿Cuánto vale, en tiempo de código? (Con a = 1 era 2π, unos 6,28.)',
  'gd.l3-elements.period.ok': 'Correcto: unos 17,77, que es 2π × 2^1,5.',
  'gd.l3-elements.period.no':
    'No del todo. El período es 2π por la raíz cuadrada de a³ dividido entre la masa de la estrella (1 aquí); con a = 2 es 2π × 2,83.',
  'gd.l3-elements.ratio.title': '¿Qué predicción era la correcta?',
  'gd.l3-elements.ratio.text':
    'Compara el período nuevo con el anterior, 2π. ¿En qué factor creció?',
  'gd.l3-elements.ratio.opt.same': 'Quedó igual',
  'gd.l3-elements.ratio.opt.double': 'Se duplicó',
  'gd.l3-elements.ratio.opt.x283': 'Creció en un factor de 2,83',
  'gd.l3-elements.ratio.opt.x4': 'Creció en un factor de 4',
  'gd.l3-elements.ratio.ok':
    'Correcto: 2^1,5 = 2,83. Una órbita mayor es más lenta de dos maneras, un camino más largo y una velocidad menor, y el período crece más deprisa que el tamaño.',
  'gd.l3-elements.ratio.no':
    'Compara los dos períodos: 17,77 ÷ 6,28. Un período que fuera con el tamaño se duplicaría; uno que fuera con su cuadrado se multiplicaría por cuatro.',
  'gd.l3-elements.edit-e.title': 'Aliárgala',
  'gd.l3-elements.edit-e.text':
    'Escribe 0,7 en el campo de e y pulsa Aplicar. La órbita conserva su tamaño y su inclinación y se convierte en una elipse alargada.',
  'gd.l3-elements.edit-e.ok': 'La órbita tiene ahora e = 0,7.',
  'gd.l3-elements.periapsis.title': 'El acercamiento máximo',
  'gd.l3-elements.periapsis.text':
    '¿Cuánto se acerca el planeta a la estrella, en el periapsis? Es a × (1 − e).',
  'gd.l3-elements.periapsis.ok':
    'Correcto: 0,6. El apoapsis, el punto más lejano, es a × (1 + e), 3,4.',
  'gd.l3-elements.periapsis.no':
    'No del todo. Con a = 2 y e = 0,7, la distancia mínima es 2 × (1 − 0,7).',
  'gd.l3-elements.edit-i.title': 'Inclínala',
  'gd.l3-elements.edit-i.text':
    'Escribe 60 en el campo de i y pulsa Aplicar. La órbita forma ahora un ángulo de 60° con el plano de referencia.',
  'gd.l3-elements.edit-i.ok': 'La órbita tiene ahora i = 60°.',
  'gd.l3-elements.observe.title': 'Mírala de lado',
  'gd.l3-elements.observe.text':
    'En «El cielo, visto por un observador», pon el acimut en −90 y la elevación en 0, y pulsa «Fijar el observador». Este observador mira a lo largo del plano de referencia, desde −y.',
  'gd.l3-elements.observe.ok':
    'El observador está fijado: la figura del cielo muestra la órbita vista a lo largo del plano de referencia.',
  'gd.l3-elements.height.title': '¿Cuánto sube?',
  'gd.l3-elements.height.text':
    'En la tabla del cielo, «Punto más alto en el cielo» da cuánto se eleva la órbita sobre el plano de referencia, en unidades de código. ¿Qué lee?',
  'gd.l3-elements.height.ok':
    'Correcto: unos 0,54. Cuánto sube una órbita inclinada depende de su forma y de hacia dónde apunta su periapsis, además de i, así que es menos que a sen i, 1,73.',
  'gd.l3-elements.height.no':
    'No del todo. Lee «Punto más alto en el cielo» en la tabla del cielo, con el observador en acimut −90 y elevación 0.',
  'gd.l3-elements.before-node.title': 'Guarda la órbita como está',
  'gd.l3-elements.before-node.text':
    'Pausa y pulsa «Guardar este momento» para anotar la órbita antes del siguiente cambio.',
  'gd.l3-elements.before-node.ok': 'La órbita está guardada.',
  'gd.l3-elements.edit-node.title': 'Gira el nodo',
  'gd.l3-elements.edit-node.text':
    'Escribe 100 en el campo de Ω (era 40) y pulsa Aplicar. La órbita conserva su inclinación y su forma y gira alrededor del eje vertical.',
  'gd.l3-elements.edit-node.ok': 'El nodo es ahora Ω = 100°.',
  'gd.l3-elements.after-node.title': 'Guarda la órbita girada',
  'gd.l3-elements.after-node.text': 'Pulsa «Guardar este momento» otra vez.',
  'gd.l3-elements.after-node.ok': 'La órbita girada está guardada.',
  'gd.l3-elements.node-tilt.title': '¿Cuánto giró el plano?',
  'gd.l3-elements.node-tilt.text':
    'La inclinación no cambió, i = 60° las dos veces, pero el plano de la órbita sí. ¿Qué ángulo hay entre el plano de antes y el de después? Es el ángulo entre las normales de las órbitas, con cos θ = cos²i + sen²i cos ΔΩ.',
  'gd.l3-elements.node-tilt.ok':
    'Correcto: unos 51,3°. Girar el nodo 60° con i = 60° gira el plano 51°, porque una inclinación alrededor de otro eje es otro plano.',
  'gd.l3-elements.node-tilt.no':
    'No del todo. Con i = 60° y ΔΩ = 60°, cos θ = 0,25 + 0,75 × 0,5.',
  'gd.l3-elements.predict-flat.title': 'Predice: haz la órbita plana',
  'gd.l3-elements.predict-flat.text':
    'Vas a poner la inclinación en 0, de modo que la órbita quede en el plano de referencia. Una órbita en el plano no lo atraviesa en ninguna parte, así que dónde está su nodo no significa nada. ¿Qué hará el editor con Ω?',
  'gd.l3-elements.predict-flat.opt.kept': 'Conservar la Ω de antes',
  'gd.l3-elements.predict-flat.opt.zero': 'Leer Ω como 0 y pasar el ángulo a ω',
  'gd.l3-elements.edit-flat.title': 'Aplánala',
  'gd.l3-elements.edit-flat.text':
    'Escribe 0 en el campo de i y pulsa Aplicar.',
  'gd.l3-elements.edit-flat.ok':
    'La órbita está ahora en el plano de referencia.',
  'gd.l3-elements.flat-omega.title': '¿Qué lee ahora ω?',
  'gd.l3-elements.flat-omega.text':
    'Pulsa «Cargar los elementos actuales» y lee ω, en grados. ¿Cuánto es? Compáralo con la Ω y la ω de antes.',
  'gd.l3-elements.flat-omega.ok':
    'Correcto. Ω lee 0, y ω es lo que sumaban Ω y ω: el ángulo desde la dirección de referencia hasta el periapsis, medido en el plano. Ese ángulo está bien definido cuando el nodo no lo está.',
  'gd.l3-elements.flat-omega.no':
    'No del todo. Suma la Ω de antes y la ω de antes; en una órbita plana el laboratorio mide el periapsis desde la dirección de referencia.',
  'gd.l3-elements.flat-node.title': '¿Qué fue del nodo?',
  'gd.l3-elements.flat-node.text': '¿Qué lee ahora Ω?',
  'gd.l3-elements.flat-node.opt.kept': 'Conservó su valor anterior',
  'gd.l3-elements.flat-node.opt.zero': 'Lee 0',
  'gd.l3-elements.flat-node.ok':
    'Correcto: 0, por convención. El nodo es donde la órbita cruza el plano, y una órbita plana nunca lo cruza; la lectura pasa ese ángulo a ω para que la órbita siga descrita. Un modelo plano es uno en el que el nodo no existe.',
  'gd.l3-elements.flat-node.no':
    'Lee Ω en los campos, después de pulsar «Cargar los elementos actuales».',
  'gd.l3-elements.edit-m.title': 'Mueve el planeta a lo largo de su órbita',
  'gd.l3-elements.edit-m.text':
    'Pausa. Escribe 90 en el campo de M y pulsa Aplicar. Solo cambia el lugar del planeta en la órbita; la órbita sigue igual.',
  'gd.l3-elements.edit-m.ok': 'El planeta está en M = 90°.',
  'gd.l3-elements.kept-m.title': 'Guarda este momento',
  'gd.l3-elements.kept-m.text': 'Pulsa «Guardar este momento».',
  'gd.l3-elements.kept-m.ok': 'El momento está guardado.',
  'gd.l3-elements.distance.title': '¿A qué distancia de la estrella?',
  'gd.l3-elements.distance.text':
    '¿A qué distancia de la estrella está el planeta en este momento, en unidades de código? Es a × (1 − e cos E), donde E resuelve M = E − e sen E.',
  'gd.l3-elements.distance.ok':
    'Correcto: unos 2,77, ya más lejos que a, 2. Un cuarto de órbita en tiempo lleva al planeta más de un cuarto del camino, porque se mueve más deprisa cerca de la estrella.',
  'gd.l3-elements.distance.no':
    'No del todo. Resuelve E − 0,7 sen E = π/2 para E (unos 2,15) y calcula 2 × (1 − 0,7 cos E). O lee la distancia en el instrumento de órbita.',
  'gd.l3-elements.flat.title':
    'Lo que un modelo plano conserva y lo que pierde',
  'gd.l3-elements.flat.text':
    'Un modelo 2-D tiene cuatro de estos números: a, e, ω (desde la dirección de referencia) y M. No tiene i, porque no hay hacia dónde inclinarse, ni Ω, porque una órbita plana no tiene nodo. Un modelo plano acierta, pues, con el tamaño, la forma, el período y el momento de una órbita, y no puede decir cómo se vería desde fuera una órbita inclinada ni cómo giraría.',
  'gd.l3-elements.limits.title': 'Dónde se detiene el modelo',
  'gd.l3-elements.limits.text':
    'Los elementos aquí son osculadores: la órbita de dos cuerpos que seguiría el planeta si la atracción de todo lo demás cesara en este instante. En el modo de ejecución solo Kepler esa es exactamente la órbita que se sigue para siempre. En el modo de ejecución N cuerpos, los demás cuerpos atraen al planeta y los elementos se desplazan; el editor cambia solo el cuerpo que eliges y lo que lo orbita. La estrella y todos los demás cuerpos quedan bit a bit como estaban.',

  // --- l3-frames
  'gd.l3-frames.title': 'Cambiar de marco',
  'gd.l3-frames.summary':
    'Los mismos dos planetas medidos respecto de la eclíptica, el ecuador, su plano invariable y el cielo de un observador: tres de los seis elementos cambian con el plano, tres no.',
  'gd.l3-frames.intro.title': 'La misma órbita en ejes distintos',
  'gd.l3-frames.intro.text':
    'Una inclinación es un ángulo desde un plano de referencia, y el plano es una elección. Dos planetas orbitan una estrella de una masa solar en unidades solares: uno ligero a 1 UA (b, 3 × 10⁻⁵ de la estrella) y uno pesado a 3 UA (c, una milésima de la estrella, casi una masa de Júpiter). Estos sistemas son inventados; no hay planetas reales detrás. Cambiar el plano cambia cómo se miden los números, no dónde está nada.',
  'gd.l3-frames.open.title': 'Abre los dos planetas',
  'gd.l3-frames.open.text':
    'Elige «Solo Kepler» en «Modo de ejecución». Abre «Investigación: dos planetas, en unidades solares», pon el instrumento «Órbita» sobre el planeta b y elige «Los ejes propios del sistema (la eclíptica en un sistema solar)» en «Plano de referencia».',
  'gd.l3-frames.open.ok':
    'Los planetas están abiertos, con el instrumento de órbita sobre el planeta b en los ejes propios del sistema.',
  'gd.l3-frames.i-system.title':
    'La inclinación del planeta b respecto de la eclíptica',
  'gd.l3-frames.i-system.text':
    '¿Cuál es la inclinación del planeta b, en grados, en los ejes propios del sistema?',
  'gd.l3-frames.i-system.ok': 'Correcto: 8°.',
  'gd.l3-frames.i-system.no':
    'No del todo. Lee i en la lectura, con el plano de referencia en los ejes propios del sistema.',
  'gd.l3-frames.predict-eq.title': 'Predice: mídela desde el ecuador',
  'gd.l3-frames.predict-eq.text':
    'El ecuador de la Tierra está inclinado respecto de la eclíptica por la oblicuidad, 23,44° (el valor del núcleo del cielo, para J2000). Si mides la inclinación del planeta b desde el plano ecuatorial, ¿será menor, igual o mayor?',
  'gd.l3-frames.predict-eq.opt.smaller': 'Menor',
  'gd.l3-frames.predict-eq.opt.same': 'Igual',
  'gd.l3-frames.predict-eq.opt.larger': 'Mayor',
  'gd.l3-frames.plane-eq.title': 'Elige el plano ecuatorial',
  'gd.l3-frames.plane-eq.text':
    'En «Plano de referencia», elige «Ecuatorial (la eclíptica inclinada por la oblicuidad)». Los números se vuelven a leer en los ejes nuevos; nada se mueve.',
  'gd.l3-frames.plane-eq.ok': 'El plano de referencia es el plano ecuatorial.',
  'gd.l3-frames.i-eq.title':
    'La inclinación del planeta b respecto del ecuador',
  'gd.l3-frames.i-eq.text': '¿Cuál es ahora la inclinación del planeta b?',
  'gd.l3-frames.i-eq.ok':
    'Correcto: unos 30,0°. Ni 8° + 23,44° ni 23,44° − 8°: los nodos de los dos planos deciden cómo se combinan las inclinaciones.',
  'gd.l3-frames.i-eq.no':
    'No del todo. Vuelve a leer i en la lectura, con el plano ecuatorial elegido.',
  'gd.l3-frames.larger.title': '¿Qué predicción era la correcta?',
  'gd.l3-frames.larger.text':
    'Comparada con la eclíptica, ¿la inclinación desde el ecuador es menor, igual o mayor?',
  'gd.l3-frames.larger.opt.smaller': 'Menor',
  'gd.l3-frames.larger.opt.same': 'Igual',
  'gd.l3-frames.larger.opt.larger': 'Mayor',
  'gd.l3-frames.larger.ok':
    'Correcto, aquí es mayor. No tendría por qué: desde otro nodo podría ser menor. La inclinación pertenece al par formado por la órbita y el plano.',
  'gd.l3-frames.larger.no':
    'Compara las dos lecturas: 8° desde la eclíptica, y lo que lees desde el ecuador.',
  'gd.l3-frames.changed.title': '¿Qué cambió y qué no?',
  'gd.l3-frames.changed.text':
    'Cambia el plano de un lado a otro y mira los seis elementos. ¿Cuántos cambian cuando cambia el plano?',
  'gd.l3-frames.changed.opt.all': 'Los seis',
  'gd.l3-frames.changed.opt.three': 'Tres: i, Ω y ω',
  'gd.l3-frames.changed.opt.one': 'Uno: i',
  'gd.l3-frames.changed.ok':
    'Correcto: i, Ω y ω. Girar los ejes no cambia el tamaño de una órbita (a), su forma (e) ni dónde está el planeta a lo largo de ella (M); cambia los ángulos que sitúan el plano de la órbita y su eje mayor.',
  'gd.l3-frames.changed.no':
    'Compara a, e y M en los ejes del sistema y en el plano ecuatorial. ¿Cuáles de los seis difieren?',
  'gd.l3-frames.plane-inv.title': 'Elige el plano invariable',
  'gd.l3-frames.plane-inv.text':
    'En «Plano de referencia», elige «Plano invariable (momento angular total)». El momento angular total de los cuerpos respecto de su centro de masa apunta a lo largo de su eje +z, y no cambia en un sistema aislado.',
  'gd.l3-frames.plane-inv.ok': 'El plano de referencia es el plano invariable.',
  'gd.l3-frames.i-b-inv.title': 'El planeta b desde el plano invariable',
  'gd.l3-frames.i-b-inv.text':
    '¿Cuál es ahora la inclinación del planeta b, en grados?',
  'gd.l3-frames.i-b-inv.ok': 'Correcto: unos 13,3°.',
  'gd.l3-frames.i-b-inv.no':
    'No del todo. Lee i del planeta b, con el plano invariable elegido.',
  'gd.l3-frames.i-c-inv.title': 'El planeta c desde el plano invariable',
  'gd.l3-frames.i-c-inv.text':
    'Pon el instrumento «Órbita» sobre el planeta c. ¿Cuál es ahora su inclinación?',
  'gd.l3-frames.i-c-inv.ok':
    'Correcto: unos 0,23°. El planeta pesado lleva casi todo el momento angular, así que el plano invariable es casi su propio plano.',
  'gd.l3-frames.i-c-inv.no':
    'No del todo. Pon el instrumento sobre el planeta c y lee i, con el plano invariable elegido.',
  'gd.l3-frames.closer.title':
    '¿Qué órbita queda más cerca del plano invariable?',
  'gd.l3-frames.closer.text':
    '¿La órbita de qué planeta está más cerca del plano invariable?',
  'gd.l3-frames.closer.opt.b': 'El planeta b, el ligero',
  'gd.l3-frames.closer.opt.c': 'El planeta c, el pesado',
  'gd.l3-frames.closer.ok':
    'Correcto: el planeta c. Un plano atado al momento angular sigue a la masa, y por eso los astrónomos lo usan como el plano desde el que medir otras inclinaciones.',
  'gd.l3-frames.closer.no':
    'Compara las dos inclinaciones desde el plano invariable: la menor es la más cercana.',
  'gd.l3-frames.plane-sky.title': 'Elige el cielo de un observador',
  'gd.l3-frames.plane-sky.text':
    'Pon el observador en acimut −90 y elevación 0 (en «El cielo, visto por un observador»), y elige «El cielo de un observador (línea de visión a lo largo de z)» en «Plano de referencia». Ahora +z apunta al observador y una inclinación se mide desde la vista de frente.',
  'gd.l3-frames.plane-sky.ok':
    'El plano de referencia es el cielo del observador.',
  'gd.l3-frames.i-sky.title': 'El planeta b en el cielo',
  'gd.l3-frames.i-sky.text':
    'Pon el instrumento «Órbita» sobre el planeta b. ¿Cuál es su inclinación respecto de la dirección de frente de este observador?',
  'gd.l3-frames.i-sky.ok':
    'Correcto: unos 83,9°. Una inclinación de 90° sería de canto; esta órbita se ve casi, pero no exactamente, a lo largo de su plano.',
  'gd.l3-frames.i-sky.no':
    'No del todo. Lee i del planeta b, con el cielo del observador elegido.',
  'gd.l3-frames.flat.title': 'Lo que un modelo plano conserva y lo que pierde',
  'gd.l3-frames.flat.text':
    'Un modelo plano tiene un solo plano, así que un marco solo se puede girar dentro de él: el periapsis ω se mueve con los ejes y nada más. Con un tercer eje, la elección del plano decide qué significa una inclinación, y una inclinación publicada es solo un número hasta que se nombra el plano desde el que se mide. El modelo sigue acertando con los tamaños, las formas, los períodos y el lugar del planeta en su órbita; esas cosas no dependen del marco.',
  'gd.l3-frames.limits.title': 'Dónde se detiene el modelo',
  'gd.l3-frames.limits.text':
    'Los planos aquí son ejes fijos, girados al leer. El plano invariable se calcula a partir del momento angular de los cuerpos respecto de su centro de masa; el plano ecuatorial usa la oblicuidad de J2000 y vale solo para sistemas en unidades solares. El modo de ejecución solo Kepler mantiene fija cada órbita, así que no puede mostrar que los planetas se tiran de los planos el uno al otro. En el modo de ejecución N cuerpos el nodo del planeta b gira en el plano invariable, retrocediendo unos 1,27 grados cada 100 órbitas del planeta interior, algo que una ejecución solo Kepler no puede mostrar.',

  // --- l3-seen
  'gd.l3-seen.title': 'Visto desde aquí',
  'gd.l3-seen.summary':
    'Cómo se ve una órbita desde una dirección elegida: la elipse aparente de una estrella binaria, la línea de visión que produce un tránsito y el número que un cambio de periapsis puede estropear.',
  'gd.l3-seen.intro.title': 'Una órbita proyectada sobre el cielo',
  'gd.l3-seen.intro.text':
    'Un observador ve una órbita aplastada sobre el cielo, el plano transversal a su línea de visión. Un círculo visto en oblicuo se vuelve una elipse, y una elipse verdadera vista en oblicuo es otra elipse que no tiene la forma de la primera. Un astrónomo que mide una estrella binaria ve solo esta órbita aparente. En este laboratorio el observador es una dirección, acimut y elevación, y los números que siguen se calculan para ella a partir de las mismas posiciones y velocidades que cualquier otra lectura.',
  'gd.l3-seen.open-binary.title': 'Abre una estrella binaria',
  'gd.l3-seen.open-binary.text':
    'Elige «Solo Kepler» en «Modo de ejecución». Abre «Investigación: la órbita de una estrella binaria, inclinada 60°» y pon el instrumento «Órbita» sobre la compañera. Abre «Editor de órbitas y vista del cielo».',
  'gd.l3-seen.open-binary.ok':
    'La binaria está abierta en el modo de ejecución solo Kepler, con el instrumento de órbita sobre la compañera.',
  'gd.l3-seen.observe.title': 'Obsérvala de lado',
  'gd.l3-seen.observe.text':
    'Pon el observador en acimut −90 y elevación 0, pulsa «Fijar el observador» y luego «Mostrar los números en el cielo de este observador». El plano de referencia pasa a ser el cielo de este observador.',
  'gd.l3-seen.observe.ok':
    'El plano de referencia es el cielo de este observador.',
  'gd.l3-seen.i-sky.title': 'La inclinación como la mide este observador',
  'gd.l3-seen.i-sky.text':
    'La órbita está inclinada 60° respecto del plano de referencia del sistema. ¿Cuál es su inclinación respecto de la dirección de frente de este observador, en grados?',
  'gd.l3-seen.i-sky.ok':
    'Correcto: unos 41,4°. La inclinación de un observador es el ángulo entre su línea de visión y la normal de la órbita, y por eso depende de dónde se sitúa.',
  'gd.l3-seen.i-sky.no':
    'No del todo. Lee i en la lectura de la compañera, con el cielo del observador elegido.',
  'gd.l3-seen.predict-centre.title':
    'Predice: ¿está la estrella en el centro de la órbita aparente?',
  'gd.l3-seen.predict-centre.text':
    'La estrella está en un foco de la órbita verdadera, no en su centro, porque la órbita es excéntrica (e = 0,5). En la elipse aparente, proyectada sobre el cielo, ¿estará la estrella en el centro?',
  'gd.l3-seen.predict-centre.opt.yes': 'Sí, en el centro',
  'gd.l3-seen.predict-centre.opt.no': 'No, descentrada',
  'gd.l3-seen.major.title': 'La elipse aparente: su mitad larga',
  'gd.l3-seen.major.text':
    'Lee el semieje mayor aparente en la tabla «La órbita en el cielo», en unidades del semieje mayor verdadero.',
  'gd.l3-seen.major.ok':
    'Correcto: unos 0,867. El eje largo de la órbita aparente es más corto que el verdadero, porque el plano está inclinado respecto del cielo.',
  'gd.l3-seen.major.no':
    'No del todo. Lee «Semieje mayor aparente» en la tabla del cielo.',
  'gd.l3-seen.minor.title': 'La elipse aparente: su mitad corta',
  'gd.l3-seen.minor.text': 'Lee el semieje menor aparente en la misma tabla.',
  'gd.l3-seen.minor.ok': 'Correcto: unos 0,749.',
  'gd.l3-seen.minor.no':
    'No del todo. Lee «Semieje menor aparente» en la tabla del cielo.',
  'gd.l3-seen.offset.title': '¿Cuánto se aparta del centro la estrella?',
  'gd.l3-seen.offset.text':
    '¿A qué distancia está la estrella del centro de la elipse aparente, en unidades del semieje mayor verdadero? El desplazamiento verdadero es a × e, 0,5; la proyección lo acorta.',
  'gd.l3-seen.offset.ok':
    'Correcto: unos 0,376. La proyección conserva el centro de una elipse pero no sus focos, así que la estrella está descentrada y, en general, tampoco en un foco de la elipse aparente. Los astrónomos ajustan juntas la elipse aparente y la posición de la estrella para recuperar la órbita verdadera.',
  'gd.l3-seen.offset.no':
    'No del todo. El desplazamiento es la distancia de la estrella al medio de la elipse aparente; en la figura del cielo es la distancia de la estrella al centro de la figura.',
  'gd.l3-seen.centre.title': '¿Qué predicción era la correcta?',
  'gd.l3-seen.centre.text':
    '¿Está la estrella en el centro de la órbita aparente?',
  'gd.l3-seen.centre.opt.yes': 'Sí, en el centro',
  'gd.l3-seen.centre.opt.no': 'No, descentrada',
  'gd.l3-seen.centre.ok':
    'Correcto, descentrada. La estrella de una órbita excéntrica está en un foco, y verla desde fuera no la lleva al medio.',
  'gd.l3-seen.centre.no':
    'Compara el desplazamiento con 0: si no es 0, la estrella está descentrada.',
  'gd.l3-seen.open-eclipse.title': 'Abre un sistema con eclipses',
  'gd.l3-seen.open-eclipse.text':
    'Abre «Investigación: una órbita excéntrica, a un cuarto de grado», todavía en el modo de ejecución solo Kepler, con el observador en acimut −90 y elevación 0, y pon el instrumento «Órbita» sobre el planeta. La órbita del planeta tiene e = 0,3 y está inclinada un cuarto de grado respecto del plano de referencia, que este observador mira de lado, con el periapsis en la conjunción.',
  'gd.l3-seen.open-eclipse.ok':
    'El sistema con eclipses está abierto, con el observador fijado.',
  'gd.l3-seen.impact.title': '¿A qué distancia pasa de la estrella?',
  'gd.l3-seen.impact.text':
    'En la tabla del cielo, «Parámetro de impacto, en radios de la estrella» es el acercamiento máximo del planeta al centro de la estrella en el cielo. ¿Qué lee?',
  'gd.l3-seen.impact.ok':
    'Correcto: unos 0,61 radios de la estrella. En la conjunción el planeta está en el periapsis, a 0,7 del semieje mayor de la estrella, así que la misma inclinación lo aparta menos de la línea de visión que en un círculo.',
  'gd.l3-seen.impact.no':
    'No del todo. Lee «Parámetro de impacto, en radios de la estrella» en la tabla del cielo.',
  'gd.l3-seen.transits.title': '¿Hay tránsito?',
  'gd.l3-seen.transits.text':
    'Un tránsito necesita un parámetro de impacto menor que 1,1, el radio de la estrella más el del planeta, en radios de la estrella. ¿Pasa el planeta por delante de la estrella?',
  'gd.l3-seen.transits.opt.yes': 'Sí',
  'gd.l3-seen.transits.opt.no': 'No',
  'gd.l3-seen.transits.ok':
    'Correcto: 0,61 es menor que 1,1, y la tabla dice que pasa por delante de la estrella.',
  'gd.l3-seen.transits.no':
    'Compara el parámetro de impacto con 1,1, o lee «Pasa por delante de la estrella».',
  'gd.l3-seen.predict-omega.title': 'Predice: gira el periapsis al otro lado',
  'gd.l3-seen.predict-omega.text':
    'Vas a girar el eje largo media vuelta, de ω = 270° a ω = 90°, dejando la inclinación. La conjunción queda entonces en el apoapsis, 1,3 veces más lejos de la estrella que el semieje mayor. ¿Se conservará el tránsito?',
  'gd.l3-seen.predict-omega.opt.kept': 'Se conserva',
  'gd.l3-seen.predict-omega.opt.lost': 'Se pierde',
  'gd.l3-seen.edit-omega.title': 'Gira el periapsis',
  'gd.l3-seen.edit-omega.text': 'Escribe 90 en el campo de ω y pulsa Aplicar.',
  'gd.l3-seen.edit-omega.ok': 'El periapsis está ahora en ω = 90°.',
  'gd.l3-seen.impact-after.title': '¿A qué distancia pasa ahora?',
  'gd.l3-seen.impact-after.text':
    'Vuelve a leer el parámetro de impacto, en radios de la estrella.',
  'gd.l3-seen.impact-after.ok':
    'Correcto: unos 1,13 radios de la estrella, justo fuera de la distancia de contacto de 1,1.',
  'gd.l3-seen.impact-after.no':
    'No del todo. Vuelve a leer «Parámetro de impacto, en radios de la estrella», después de pulsar Aplicar.',
  'gd.l3-seen.outcome.title': '¿Qué predicción era la correcta?',
  'gd.l3-seen.outcome.text': '¿Se conserva el tránsito?',
  'gd.l3-seen.outcome.opt.kept': 'Se conserva',
  'gd.l3-seen.outcome.opt.lost': 'Se pierde',
  'gd.l3-seen.outcome.ok':
    'Correcto, se pierde. La inclinación de la órbita no cambió, y un tránsito depende tanto de la distancia del planeta en la conjunción como de la inclinación: 0,7 de a en el periapsis, 1,3 en el apoapsis. Hacia qué lado apunta el eje largo es cuestión de la línea de visión, y los astrónomos tienen que medirlo.',
  'gd.l3-seen.outcome.no':
    'Compara el parámetro de impacto nuevo con 1,1, o lee «Pasa por delante de la estrella».',
  'gd.l3-seen.restore.title': 'Devuélvelo',
  'gd.l3-seen.restore.text': 'Escribe 270 en el campo de ω y pulsa Aplicar.',
  'gd.l3-seen.restore.ok':
    'El periapsis vuelve a estar en ω = 270° y el planeta transita.',
  'gd.l3-seen.chord.title': '¿Cuánto mide la cuerda?',
  'gd.l3-seen.chord.text':
    'El planeta cruza el círculo de contacto, de radio 1,1 radios de la estrella, a lo largo de una cuerda. Lee la mitad en la tabla del cielo, en radios de la estrella, y compárala con √(1,1² − b²), con b el parámetro de impacto.',
  'gd.l3-seen.chord.ok':
    'Correcto: unos 0,91 radios de la estrella. La duración de un tránsito, fijada por la cuerda y la velocidad del planeta allí, es como los astrónomos recuperan el parámetro de impacto.',
  'gd.l3-seen.chord.no':
    'No del todo. Lee «Mitad de la cuerda a través del círculo de contacto» en la tabla del cielo.',
  'gd.l3-seen.flat.title': 'Lo que un modelo plano conserva y lo que pierde',
  'gd.l3-seen.flat.text':
    'Un modelo plano tiene al observador en el plano o por encima de él. En el plano, toda órbita se ve de canto y toda órbita eclipsa; por encima, toda órbita es una elipse de frente con la forma de la verdadera. Ninguno tiene una elipse aparente distinta de la órbita verdadera, una estrella descentrada ni un tránsito que va y viene con el periapsis. Un modelo plano sigue acertando con los períodos y con los momentos de las conjunciones.',
  'gd.l3-seen.limits.title': 'Dónde se detiene el modelo',
  'gd.l3-seen.limits.text':
    'La órbita aparente se calcula a partir de la órbita de dos cuerpos como una proyección geométrica: sin tiempo de viaje de la luz, sin aberración estelar, sin movimiento propio y sin oscurecimiento del borde. Los cuerpos son esferas de radio fijo usadas solo para el contacto. El cielo aquí es una dirección elegida a mano; la dirección de un observador real es en sí misma una medición con una incertidumbre.',

  // --- l3-tilts
  'gd.l3-tilts.title': 'Inclinaciones mutuas',
  'gd.l3-tilts.summary':
    'El ángulo entre los planos de dos órbitas no es la diferencia de sus inclinaciones. Mídelo, mira adónde va en el plano invariable y observa qué hace en un triple. Modos de ejecución: solo Kepler para la geometría, N cuerpos para el ciclo.',
  'gd.l3-tilts.intro.title': 'El ángulo entre dos planos',
  'gd.l3-tilts.intro.text':
    'Dos órbitas inclinadas 10° y 25° respecto del plano de referencia podrían diferir en tan poco como 15° o en tanto como 35°, según dónde estén sus nodos. La inclinación mutua es el ángulo entre sus normales, y es el ángulo que gobierna cómo se perturban las órbitas entre sí. La primera parte de esta investigación la mide en el modo de ejecución solo Kepler, porque eso es solo geometría. La última parte observa un ciclo en una estrella triple, que necesita el modo de ejecución N cuerpos: una ejecución solo Kepler mantiene fija cada órbita, así que no puede mostrar uno.',
  'gd.l3-tilts.open.title': 'Abre los dos planetas',
  'gd.l3-tilts.open.text':
    'Elige «Solo Kepler» en «Modo de ejecución». Abre «Investigación: dos planetas, inclinados 10° y 25°», elige el instrumento «Entre dos órbitas», con el planeta b y el planeta c, y «Los ejes propios del sistema» en «Plano de referencia». El planeta b es ligero; el planeta c tiene una milésima de la masa de la estrella.',
  'gd.l3-tilts.open.ok':
    'Los planetas están abiertos, con el instrumento entre sus órbitas.',
  'gd.l3-tilts.predict.title': 'Predice: el ángulo entre las dos órbitas',
  'gd.l3-tilts.predict.text':
    'El planeta b está inclinado 10° respecto del plano de referencia, con su nodo en 0°; el planeta c, 25°, con su nodo en 120°. Comparado con 15°, la diferencia de sus inclinaciones, ¿el ángulo entre sus órbitas es menor, igual o mayor?',
  'gd.l3-tilts.predict.opt.less': 'Menor que 15°',
  'gd.l3-tilts.predict.opt.same': 'Igual, 15°',
  'gd.l3-tilts.predict.opt.more': 'Mayor que 15°',
  'gd.l3-tilts.mutual.title': 'La inclinación mutua',
  'gd.l3-tilts.mutual.text':
    'Lee en el instrumento el ángulo entre las dos órbitas, en grados.',
  'gd.l3-tilts.mutual.ok':
    'Correcto: unos 31,1°. Está entre la diferencia de las inclinaciones, 15°, y su suma, 35°, y depende de los nodos: con nodos iguales sería 15°, con nodos opuestos, 35°.',
  'gd.l3-tilts.mutual.no':
    'No del todo. Lee el ángulo entre las órbitas en la lectura del instrumento.',
  'gd.l3-tilts.compare.title': '¿Qué predicción era la correcta?',
  'gd.l3-tilts.compare.text':
    'Comparada con 15°, la diferencia de las inclinaciones, ¿la inclinación mutua es menor, igual o mayor?',
  'gd.l3-tilts.compare.opt.less': 'Menor que 15°',
  'gd.l3-tilts.compare.opt.same': 'Igual, 15°',
  'gd.l3-tilts.compare.opt.more': 'Mayor que 15°',
  'gd.l3-tilts.compare.ok':
    'Correcto, mayor. La diferencia de las inclinaciones es la inclinación mutua solo cuando los nodos son iguales, y la suma solo cuando son opuestos.',
  'gd.l3-tilts.compare.no': 'Compara la inclinación mutua que leíste con 15°.',
  'gd.l3-tilts.plane-inv.title': 'Mide desde el plano invariable',
  'gd.l3-tilts.plane-inv.text':
    'Elige «Plano invariable (momento angular total)» en «Plano de referencia» y pon el instrumento «Órbita» sobre el planeta b.',
  'gd.l3-tilts.plane-inv.ok': 'El plano de referencia es el plano invariable.',
  'gd.l3-tilts.i-b.title': 'El planeta b desde el plano invariable',
  'gd.l3-tilts.i-b.text':
    '¿Cuál es ahora la inclinación del planeta b, en grados?',
  'gd.l3-tilts.i-b.ok': 'Correcto: unos 30,6°.',
  'gd.l3-tilts.i-b.no':
    'No del todo. Lee i del planeta b, con el plano invariable elegido.',
  'gd.l3-tilts.i-c.title': 'El planeta c desde el plano invariable',
  'gd.l3-tilts.i-c.text':
    'Pon el instrumento «Órbita» sobre el planeta c. ¿Cuál es ahora su inclinación?',
  'gd.l3-tilts.i-c.ok': 'Correcto: unos 0,55°.',
  'gd.l3-tilts.i-c.no':
    'No del todo. Lee i del planeta c, con el plano invariable elegido.',
  'gd.l3-tilts.sum.title': 'Suma las dos inclinaciones',
  'gd.l3-tilts.sum.text':
    'Suma las dos inclinaciones desde el plano invariable. ¿Cómo se compara la suma con la inclinación mutua que leíste?',
  'gd.l3-tilts.sum.ok':
    'Correcto: 31,1°, la inclinación mutua. Las dos órbitas están a lados opuestos del plano invariable, así que el ángulo entre ellas es la suma de sus ángulos con él. El planeta pesado está casi en el plano, y el ligero lleva casi todo el ángulo.',
  'gd.l3-tilts.sum.no': 'Suma las dos inclinaciones que leíste.',
  'gd.l3-tilts.closer.title': '¿Qué órbita está más cerca del plano?',
  'gd.l3-tilts.closer.text':
    '¿La órbita de qué planeta está más cerca del plano invariable?',
  'gd.l3-tilts.closer.opt.b': 'El planeta b, el ligero',
  'gd.l3-tilts.closer.opt.c': 'El planeta c, el pesado',
  'gd.l3-tilts.closer.ok':
    'Correcto: el planeta c. En un par de órbitas el momento angular se reparte según la masa y la distancia, y el pesado fija el plano.',
  'gd.l3-tilts.closer.no':
    'Compara las dos inclinaciones desde el plano invariable.',
  'gd.l3-tilts.open-r6.title': 'Un triple, en el modo de ejecución N cuerpos',
  'gd.l3-tilts.open-r6.text':
    'Elige «N cuerpos» en «Modo de ejecución». Abre «Ciclos de Kozai-Lidov (R6)», elige el instrumento «Entre dos órbitas», con la partícula y el perturbador, y «Mantener centrado» sobre la estrella. El problema de referencia es una partícula en una órbita cercana a una estrella, con un perturbador lejano que orbita esa estrella en un plano inclinado.',
  'gd.l3-tilts.open-r6.ok':
    'El triple está abierto en el modo de ejecución N cuerpos.',
  'gd.l3-tilts.start.title': 'Guarda el momento inicial',
  'gd.l3-tilts.start.text':
    'Pausa y pulsa «Guardar este momento» para anotar el inicio.',
  'gd.l3-tilts.start.ok': 'El momento inicial está guardado.',
  'gd.l3-tilts.mutual-0.title': 'El ángulo al principio',
  'gd.l3-tilts.mutual-0.text':
    'Lee el ángulo entre la órbita de la partícula y la del perturbador, en grados.',
  'gd.l3-tilts.mutual-0.ok':
    'Correcto: 65°, por encima del ángulo crítico de 39,2° para un ciclo de Kozai-Lidov.',
  'gd.l3-tilts.mutual-0.no':
    'No del todo. Lee el ángulo entre las dos órbitas.',
  'gd.l3-tilts.peak.title': 'Ejecuta hasta el primer máximo de excentricidad',
  'gd.l3-tilts.peak.text':
    'Pon la velocidad en ×256 y reproduce. Cuando la excentricidad de la partícula sea al menos 0,7, pulsa «Guardar este momento».',
  'gd.l3-tilts.peak.ok': 'El momento del máximo está guardado.',
  'gd.l3-tilts.mutual-peak.title': 'El ángulo en el máximo',
  'gd.l3-tilts.mutual-peak.text':
    'Lee el ángulo entre las dos órbitas en el momento que guardaste, en grados.',
  'gd.l3-tilts.mutual-peak.ok':
    'Correcto: unos 39,4°. Al subir la excentricidad la inclinación mutua baja hasta el ángulo crítico: el ciclo cambia inclinación por excentricidad.',
  'gd.l3-tilts.mutual-peak.no':
    'No del todo. Lee el ángulo entre las dos órbitas en el momento del máximo que guardaste.',
  'gd.l3-tilts.kept.title': '¿Qué se conserva?',
  'gd.l3-tilts.kept.text':
    'Calcula √(1 − e²) × cos i para la partícula al principio y en el máximo, con e e i de su órbita alrededor de la estrella, medida desde el plano de referencia. ¿Es igual en los dos momentos, con unas pocas centésimas de margen, o distinta?',
  'gd.l3-tilts.kept.opt.same': 'Igual',
  'gd.l3-tilts.kept.opt.different': 'Distinta',
  'gd.l3-tilts.kept.ok':
    'Correcto: igual. La excentricidad subió y la inclinación bajó de modo que el producto no cambió.',
  'gd.l3-tilts.kept.no':
    'Compara los valores que lee el laboratorio en los dos momentos guardados.',
  'gd.l3-tilts.predicted.title': 'El máximo, predicho',
  'gd.l3-tilts.predicted.text':
    'La teoría de orden más bajo da la excentricidad máxima solo a partir de la inclinación inicial, √(1 − (5/3) cos² i₀). Calcúlala con la inclinación inicial de la partícula, desde el plano de referencia.',
  'gd.l3-tilts.predicted.ok':
    'Correcto: unos 0,84. El máximo de N cuerpos queda cerca, lo que es una comprobación de ambos.',
  'gd.l3-tilts.predicted.no':
    'No del todo. Toma la inclinación inicial de la órbita de la partícula respecto del plano del perturbador, luego 1 − 5/3 × cos² de ella, y después la raíz cuadrada.',
  'gd.l3-tilts.flat.title': 'Lo que un modelo plano conserva y lo que pierde',
  'gd.l3-tilts.flat.text':
    'Un modelo plano tiene inclinación mutua 0 para cada par. Un par de órbitas que comparten plano no puede tener un ciclo de Kozai-Lidov y, para el modelo, un par de órbitas que difieren 31° es igual que uno que no difiere nada. Sirve para un sistema planetario cuyas órbitas son casi coplanarias, y falla para cualquiera cuyas órbitas no lo son.',
  'gd.l3-tilts.limits.title': 'Dónde se detiene el modelo',
  'gd.l3-tilts.limits.text':
    'La inclinación mutua es el ángulo entre órbitas osculadoras en un instante; en una ejecución de N cuerpos cambia a medida que intercambian momento angular. En una ejecución solo Kepler nunca cambia, y por eso el ciclo no se le pide a una ejecución solo Kepler. El triple de referencia tiene una partícula sin masa y estrellas puntuales.',

  // --- l3-resonant
  'gd.l3-resonant.title': 'Pares resonantes',
  'gd.l3-resonant.summary':
    'Dos planetas con períodos en la razón 2 a 1: un ángulo que oscila de un lado a otro durante cientos de órbitas, algo que solo puede mostrar una ejecución en la que los planetas se atraen entre sí.',
  'gd.l3-resonant.intro.title': 'Dos períodos, una razón sencilla',
  'gd.l3-resonant.intro.text':
    'Los planetas cuyos períodos están en una razón de números enteros pequeños se encuentran una y otra vez en los mismos lugares, y las atracciones se suman. El argumento resonante φ = 2λ(exterior) − λ(interior) − ϖ(interior) combina sus longitudes medias λ y la longitud del periapsis del planeta interior ϖ. Si circula, dando toda la vuelta, el par no está enganchado; si libra, oscilando de un lado a otro de un valor, sí lo está. Dos planetas de 3 × 10⁻⁴ de la masa de la estrella están cerca de la razón 2:1. La ejecución es de N cuerpos: la libración es el efecto de la atracción mutua de los planetas, y hace falta una ventana de 600 órbitas del planeta interior, 24 000 tics, para ver más de cinco oscilaciones.',
  'gd.l3-resonant.predict.title': 'Predice: ¿qué hará el argumento resonante?',
  'gd.l3-resonant.predict.text':
    'Los planetas empiezan con el ángulo en 0. Durante las 600 órbitas siguientes del planeta interior, ¿librará, circulará o se quedará en 0?',
  'gd.l3-resonant.predict.opt.librates': 'Oscilará de un lado a otro de 0',
  'gd.l3-resonant.predict.opt.circulates': 'Dará toda la vuelta',
  'gd.l3-resonant.predict.opt.still': 'Se quedará cerca de 0',
  'gd.l3-resonant.open.title': 'Abre el par',
  'gd.l3-resonant.open.text':
    'Elige «N cuerpos» en «Modo de ejecución». Abre «Investigación: dos planetas cerca de una resonancia 2:1», pon el instrumento «Órbita» sobre el planeta c y deja «Los ejes propios del sistema».',
  'gd.l3-resonant.open.ok':
    'El par está abierto en el modo de ejecución N cuerpos, con el instrumento de órbita sobre el planeta c.',
  'gd.l3-resonant.panel.title': 'Abre la sección de la resonancia',
  'gd.l3-resonant.panel.text':
    'Pulsa «Editor de órbitas y vista del cielo». En «Un par resonante», elige el planeta b como cuerpo interior, el planeta c como exterior y 2 para la resonancia; la sección lee el argumento resonante ahora y el intervalo que ha recorrido.',
  'gd.l3-resonant.panel.ok': 'El par resonante está preparado.',
  'gd.l3-resonant.ratio.title': 'La razón de los períodos',
  'gd.l3-resonant.ratio.text':
    '¿Cuánto vale el período del planeta c dividido entre el del planeta b?',
  'gd.l3-resonant.ratio.ok':
    'Correcto: 2. El planeta c está situado de modo que su período es el doble del de b; la atracción de cada uno sobre el otro lo desplaza muy poco, y de eso está hecha la resonancia.',
  'gd.l3-resonant.ratio.no':
    'No del todo. Divide el período del planeta c entre el del planeta b, según el instrumento de órbita.',
  'gd.l3-resonant.window.title': 'Reproduce la ventana',
  'gd.l3-resonant.window.text':
    'Pon la velocidad en ×256 y reproduce hasta que el planeta b haya dado 600 vueltas. Esta es la ventana: más de cinco períodos de libración, suficientes para ver los dos extremos más de una vez.',
  'gd.l3-resonant.window.ok': 'La ventana de 600 órbitas se ha reproducido.',
  'gd.l3-resonant.phi-hi.title': 'Guarda el punto alto',
  'gd.l3-resonant.phi-hi.text':
    'Pausa cuando el argumento resonante sea al menos 0,45 rad y pulsa «Guardar este momento».',
  'gd.l3-resonant.phi-hi.ok': 'El punto alto está guardado.',
  'gd.l3-resonant.phi-lo.title': 'Guarda el punto bajo',
  'gd.l3-resonant.phi-lo.text':
    'Sigue reproduciendo, pausa cuando sea como mucho −0,45 rad y pulsa «Guardar este momento».',
  'gd.l3-resonant.phi-lo.ok': 'El punto bajo está guardado.',
  'gd.l3-resonant.amplitude.title': '¿Cuánto oscila?',
  'gd.l3-resonant.amplitude.text':
    'La mitad de la diferencia entre el punto alto y el bajo es la amplitud de libración. ¿Cuánto vale, en radianes?',
  'gd.l3-resonant.amplitude.ok':
    'Correcto: oscila unos 0,55 rad como máximo, unos 31°, y dos momentos que captes por casualidad pueden dar algo menos. El ángulo nunca se acerca a π: el par está enganchado.',
  'gd.l3-resonant.amplitude.no':
    'No del todo. Resta las dos lecturas que guardaste y divide la diferencia entre dos.',
  'gd.l3-resonant.period.title': '¿Cuánto dura una oscilación?',
  'gd.l3-resonant.period.text':
    'El tiempo del punto alto al bajo es media libración. ¿Cuánto vale el período de libración, en órbitas del planeta interior?',
  'gd.l3-resonant.period.ok':
    'Correcto, para los dos momentos que guardaste. Medido en toda la ventana, a partir de todas sus oscilaciones, el período de libración es de unas 112 órbitas, y media oscilación tomada entre dos momentos es más burda. En cualquier caso la oscilación es lenta frente a las órbitas mismas: los planetas dan más de cien vueltas mientras el ángulo va y vuelve una vez.',
  'gd.l3-resonant.period.no':
    'No del todo. Toma el tiempo entre los dos momentos guardados, duplícalo y divídelo entre el período del planeta interior.',
  'gd.l3-resonant.outcome.title': '¿Qué predicción era la correcta?',
  'gd.l3-resonant.outcome.text': '¿Qué hizo el argumento resonante?',
  'gd.l3-resonant.outcome.opt.librates': 'Osciló de un lado a otro de 0',
  'gd.l3-resonant.outcome.opt.circulates': 'Dio toda la vuelta',
  'gd.l3-resonant.outcome.opt.still': 'Se quedó cerca de 0',
  'gd.l3-resonant.outcome.ok':
    'Correcto: libró, con una amplitud de unos 0,55 rad y un período de unas 112 órbitas. El par está en la resonancia 2:1.',
  'gd.l3-resonant.outcome.no':
    'Compara los dos puntos que guardaste: uno por encima de 0, otro por debajo, y ninguno cerca de ±π.',
  'gd.l3-resonant.window-periods.title':
    '¿Cuántas oscilaciones caben en la ventana?',
  'gd.l3-resonant.window-periods.text':
    'Divide las 600 órbitas de la ventana entre tu período de libración.',
  'gd.l3-resonant.window-periods.ok':
    'Correcto, para tu período. Con el período medido en toda la ventana, 112 órbitas, la ventana contiene unas 5,3 oscilaciones, así que un período medido a partir de media oscilación queda comprobado por varias más.',
  'gd.l3-resonant.window-periods.no':
    'No del todo. Divide 600 entre el período de libración que hallaste.',
  'gd.l3-resonant.kepler-open.title':
    'El mismo par, en el modo de ejecución solo Kepler',
  'gd.l3-resonant.kepler-open.text':
    'Elige «Solo Kepler» en «Modo de ejecución». Abre el mismo par otra vez y reproduce 50 órbitas.',
  'gd.l3-resonant.kepler-open.ok':
    'El par ha recorrido 50 órbitas en el modo de ejecución solo Kepler.',
  'gd.l3-resonant.kepler-phi.title': '¿Qué lee el argumento?',
  'gd.l3-resonant.kepler-phi.text':
    'Lee ahora el argumento resonante, en radianes.',
  'gd.l3-resonant.kepler-phi.ok':
    'Correcto: 0, salvo redondeo. Cada planeta sigue su propia órbita fija de dos cuerpos, así que nada cambia el ángulo: se queda donde empezó.',
  'gd.l3-resonant.kepler-phi.no':
    'No del todo. Lee el argumento resonante en «Un par resonante», en el modo de ejecución solo Kepler.',
  'gd.l3-resonant.why.title': '¿Por qué no hay libración aquí?',
  'gd.l3-resonant.why.text':
    '¿Por qué no libra el argumento en el modo de ejecución solo Kepler?',
  'gd.l3-resonant.why.opt.pull':
    'Los planetas no se atraen entre sí en este modo',
  'gd.l3-resonant.why.opt.short': 'La ejecución es demasiado corta',
  'gd.l3-resonant.why.opt.ratio': 'Los períodos no están en la razón 2 a 1',
  'gd.l3-resonant.why.ok':
    'Correcto. Una libración es el efecto de la atracción mutua de los planetas; sin ella, las órbitas son fijas y el ángulo no puede cambiar. Por eso una libración solo se pide en el modo de ejecución N cuerpos.',
  'gd.l3-resonant.why.no':
    'Los períodos están en la razón 2 a 1, y la ejecución fue suficientemente larga en el modo N cuerpos. ¿Qué deja fuera una ejecución solo Kepler?',
  'gd.l3-resonant.flat.title':
    'Lo que un modelo plano conserva y lo que pierde',
  'gd.l3-resonant.flat.text':
    'Un modelo plano puede contener una resonancia: el argumento no necesita una tercera dimensión, y una ejecución plana de N cuerpos libra igual. Lo que no puede contener es la inclinación, así que se pierden las resonancias de inclinación (las que involucran a los nodos) y el intercambio de inclinación entre un par de planetas.',
  'gd.l3-resonant.limits.title': 'Dónde se detiene el modelo',
  'gd.l3-resonant.limits.text':
    'La libración aquí es una propiedad del movimiento integrado de dos masas de 3 × 10⁻⁴ alrededor de una estrella, y la ventana es el tiempo que necesita esa ejecución, 600 órbitas: otra razón de masas u otra excentricidad tiene otra ventana. El argumento resonante se construye con elementos osculadores, así que lleva su oscilación de período corto. El núcleo no tiene mareas, relatividad ni gas, que dan forma a los pares resonantes reales.',
};
