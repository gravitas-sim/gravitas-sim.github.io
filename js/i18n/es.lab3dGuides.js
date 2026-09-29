// Las investigaciones guiadas del laboratorio 3-D: su español, y el del
// ejecutor (js/lab3d/view/guidePanel.js), con los mismos ids que
// ./en.lab3dGuides.js.

export const ES_LAB3DGUIDES = {
  // --- El ejecutor
  'g3.heading': 'Investigaciones guiadas',
  'g3.intro':
    'Cuatro investigaciones sobre lo que un modelo plano no puede contener: el plano de una órbita, cómo se ve desde fuera, los planos de dos órbitas y un tercer cuerpo lejano. Cada una pide una predicción, te hace cambiar algo y medir, y dice dónde se detiene el modelo. Cada respuesta se comprueba con los números del propio laboratorio.',
  'g3.meta': 'Unos {intro} minutos; {advanced} en el recorrido avanzado.',
  'g3.startIntro': 'Empezar',
  'g3.startAdvanced': 'Empezar el recorrido avanzado',
  'g3.where': '{guide}: paso {n} de {of}, {path}.',
  'g3.path.intro': 'recorrido introductorio',
  'g3.path.advanced': 'recorrido avanzado',
  'g3.progress': 'Pasos',
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
  'gd.target.tilt-0': 'Guía: un planeta en el plano de referencia',
  'gd.target.tilt-02': 'Guía: la misma órbita inclinada 0,2°',
  'gd.target.tilt-05': 'Guía: la misma órbita inclinada 0,5°',
  'gd.target.same-tilt': 'Guía: dos planetas, ambos inclinados 10°',

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
    'Abre «Guía: un planeta en el plano de referencia» y mira «A lo largo del plano de referencia», desde -y: el observador. Elige el instrumento «En el cielo, visto desde aquí» sobre la estrella y el planeta.',
  'gd.l3-eclipse.open-flat.ok':
    'Visto desde aquí, la órbita está de canto: una vez por órbita, el planeta pasa justo por delante de la estrella.',
  'gd.l3-eclipse.predict.title': 'Predice: inclínala medio grado',
  'gd.l3-eclipse.predict.text':
    'Inclina la misma órbita 0,5° alrededor del eje x, y deja al observador donde está. ¿Seguirá pasando el planeta por delante de la estrella?',
  'gd.l3-eclipse.predict.opt.yes': 'Sí',
  'gd.l3-eclipse.predict.opt.no': 'No',
  'gd.l3-eclipse.open-tilted.title': 'Abre la órbita inclinada',
  'gd.l3-eclipse.open-tilted.text':
    'Abre «Guía: la misma órbita inclinada 0,5°», todavía vista a lo largo del plano de referencia, y pon el instrumento «Órbita» sobre el planeta.',
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
    'Abre «Guía: la misma órbita inclinada 0,2°», vista a lo largo del plano de referencia, con el instrumento de órbita sobre el planeta.',
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
    'Abre «Guía: dos planetas, ambos inclinados 10°» y pon el instrumento «Órbita» sobre el planeta b.',
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
    'Compara el error con la precisión que necesitas: dos partes en diez mil está por debajo de lo que miden la mayoría de las lecciones.',
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
};
