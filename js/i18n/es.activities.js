// =============================================================================
// The classroom activities' words, in Spanish
// -----------------------------------------------------------------------------
// Split out of ./es.teaching.js because two very different readers shared one
// catalogue. /teaching/ reads all of it; the application reads only these
// `teach.activity.*` strings - an activity's title, its objectives and each
// format's opening - which is what js/activities/activityBridge.js registers
// when somebody opens an activity link.
//
// Before the split the bridge pulled the whole showcase page's prose into the
// application's lazy chunks: the cycle, the journey, the instrument
// descriptions, the demonstrations, the access notes, the evaluation template
// and the feedback form, in both languages, none of which the application can
// render. Fifty-seven kilobytes of a page the simulation never shows.
//
// ./es.teaching.js still exports everything by spreading this in, so the showcase
// page and every test that reads one catalogue are unchanged.
// =============================================================================

export const ES_ACTIVITIES = {
  'teach.activity.duration': 'unos {n} minutos',
  'teach.activity.format.demonstration': 'Demostración',
  'teach.activity.format.guided': 'Actividad guiada',
  'teach.activity.format.lab': 'Práctica completa',

  'teach.activity.orbital-speed.title':
    'Movimiento orbital: ¿por qué cambian de velocidad los planetas?',
  'teach.activity.orbital-speed.question':
    'Un planeta en una órbita elíptica fija acelera y frena, sin que nada lo empuje y sin quemar combustible. ¿Qué se intercambia y qué se conserva?',
  'teach.activity.orbital-speed.audience':
    'Astronomía introductoria o física con álgebra. Sirve proyectada ante toda la clase, por parejas frente a un ordenador o como sesión de práctica.',
  'teach.activity.orbital-speed.prerequisites':
    'Basta con saber que la gravedad atrae dos masas y se debilita con la distancia. No hace falta cálculo, ni haber trabajado antes con elipses, ni conocer el momento angular: la actividad lo construye.',
  'teach.activity.orbital-speed.objective.1':
    'Predecir en qué punto de una órbita elíptica se mueve más rápido un planeta, y explicar por qué',
  'teach.activity.orbital-speed.objective.2':
    'Medir la velocidad y la distancia en el punto más cercano y en el más lejano, y enunciar la relación entre ambas',
  'teach.activity.orbital-speed.objective.3':
    'Explicar el cambio de velocidad mediante una magnitud conservada, e identificar qué le hace y qué no le hace la gravedad',

  'teach.activity.orbital-speed.demonstration.for':
    'Proyectada, dirigida por el profesorado',
  'teach.activity.orbital-speed.demonstration.intro':
    'Una predicción, el movimiento y la razón, en lo que se tarda en cambiar de tema. Pide a la clase que se moje antes de que nada se mueva; las porciones de área igual del final son la recompensa.',
  'teach.activity.orbital-speed.demonstration.closing':
    'Cierra preguntando qué tendría que pasar para que un planeta se moviera a velocidad constante. La respuesta —una órbita circular, donde la distancia nunca cambia— es la que demuestra que han entendido la idea y no solo la frase.',

  // --- Las tres rutas cortas de /teaching/ ----------------------------------
  'teach.activity.format.route': 'Ruta corta',

  'teach.activity.orbital-speed.route.for': 'Una persona, en un ordenador',
  'teach.activity.orbital-speed.route.intro':
    'Comprométete a dónde se mueve más rápido el planeta antes de que nada corra. Tu respuesta queda registrada y sin corregir hasta que la medida la resuelva: decide el experimento, no la clave de respuestas. Después ejecútalo, lee la velocidad y la distancia en ambos extremos con el vigía de eventos y di qué se está intercambiando.',
  'teach.activity.orbital-speed.route.closing':
    'Mediste el producto de velocidad y distancia en dos puntos de una misma órbita y salió igual. Eso es el momento angular, y se conserva porque la gravedad tira a lo largo de la línea que une los dos cuerpos y no ejerce par respecto a la estrella. La investigación completa lleva esa misma medida a las tres leyes de Kepler y a dónde dejan de valer.',

  'teach.activity.binary-planets.title':
    'Planetas alrededor de dos estrellas: ¿dónde sobrevive una órbita?',
  'teach.activity.binary-planets.question':
    'Un planeta orbita una de las estrellas de un par binario cerrado. ¿Hasta dónde puede empezar y seguir ahí veinte periodos binarios después?',
  'teach.activity.binary-planets.audience':
    'Astronomía introductoria, o cualquiera que conozca el problema de dos cuerpos y esté listo para ver su límite. Sin cálculo.',
  'teach.activity.binary-planets.prerequisites':
    'Conviene saber qué es una órbita y que una órbita de dos cuerpos se repite. No se supone nada sobre estabilidad, resonancia ni caos: la comparación es la introducción.',
  'teach.activity.binary-planets.objective.1':
    'Predecir si un planeta situado a una fracción dada de la separación binaria sobrevive, y comprometerse antes de ejecutarlo',
  'teach.activity.binary-planets.objective.2':
    'Leer la ejecución que sigue y decir qué significa «expulsado» como medida y no como palabra',
  'teach.activity.binary-planets.route.for':
    'Una persona, dos ejecuciones de la misma binaria',
  'teach.activity.binary-planets.route.intro':
    'La misma binaria, la misma semilla, los mismos veinte periodos: lo único que cambia entre las dos ejecuciones es dónde empieza el planeta. Predice qué ocurre al llevarlo a 0,30 separaciones, después ejecútalo y lee cuándo se marchó.',
  'teach.activity.binary-planets.route.closing':
    'Dos ejecuciones de un sistema con semilla fija que difieren en un número son un experimento controlado, y la segunda termina con el planeta desligado en vez de en una órbita más ancha. La investigación completa lo repite en cinco separaciones, pregunta si el límite que encuentra es física o aritmética, y lo vuelve a comprobar con un paso de integración menor.',

  'teach.activity.star-sizes.title':
    'Dos estrellas, una temperatura: ¿cuál es más grande?',
  'teach.activity.star-sizes.question':
    'Dos estrellas tienen la misma temperatura superficial y una es trescientas veces más luminosa. ¿Qué dice eso de sus tamaños, y cómo lo sabrías?',
  'teach.activity.star-sizes.audience':
    'Astronomía introductoria. La aritmética es una raíz cuadrada; lo importante es que un tamaño que nadie puede resolver se puede medir igualmente.',
  'teach.activity.star-sizes.prerequisites':
    'Conviene saber que una superficie más caliente radia más por unidad de área. La relación entre luminosidad, radio y temperatura se construye aquí, no se supone.',
  'teach.activity.star-sizes.objective.1':
    'Predecir la razón de radios de dos estrellas a partir de sus luminosidades con la misma temperatura',
  'teach.activity.star-sizes.objective.2':
    'Leer temperatura, luminosidad y radio de una estrella en la ficha de comparación y en el diagrama H–R, y decir cuál de las tres se midió y cuál se dedujo',
  'teach.activity.star-sizes.route.for': 'Una persona, en un ordenador',
  'teach.activity.star-sizes.route.intro':
    'Hay dos estrellas sobre el lienzo y en el diagrama de al lado. Comprométete a una razón de radios y después selecciona cada una y lee los números que da la ficha de comparación. Los números vienen de trazas evolutivas publicadas, no de la simulación, y la ficha lo dice.',
  'teach.activity.star-sizes.route.closing':
    'La luminosidad es el área de la superficie por lo que radia cada metro cuadrado, así que a temperatura fija el radio va como la raíz cuadrada de la luminosidad. Trescientas veces la luz son unas diecisiete veces el radio. La investigación completa construye así todo el diagrama H–R y después pregunta qué habría visto y qué no un sondeo de estrellas reales.',

  'teach.activity.orbital-speed.guided.for':
    'Una persona o una pareja, frente a un ordenador',
  'teach.activity.orbital-speed.guided.intro':
    'Dale forma tú a la órbita, comprométete con una predicción y deja que la simulación se detenga en los dos momentos que la resuelven. Las mediciones se adjuntan al cuaderno según las tomas.',
  'teach.activity.orbital-speed.guided.closing':
    'Para transferir lo aprendido: pon la excentricidad en 0,7 y predice la razón de velocidades antes de volver a medirla. Una órbita más redonda debería dar una razón más cercana a uno; explica por qué antes de comprobarlo.',

  'teach.activity.orbital-speed.lab.for':
    'Una sesión completa, individualmente o por parejas',
  'teach.activity.orbital-speed.lab.intro':
    'El argumento entero, medido en vez de afirmado: dónde está la estrella, cómo se define la forma, dos órbitas comparadas de forma controlada, las velocidades en ambos extremos y dónde deja de funcionar el razonamiento.',
  'teach.activity.orbital-speed.lab.closing':
    'La comparación es controlada porque ambos cuerpos giran alrededor de la misma estrella con el mismo semieje mayor, así que la excentricidad es lo único que cambia. El último paso pregunta dónde falla esa descripción: en un par de masas comparables, donde ninguno de los dos cuerpos orbita simplemente al otro.',
};
