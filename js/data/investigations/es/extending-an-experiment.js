// Ampliar un experimento - español, paso a paso con ../extending-an-experiment.js.
export default {
  title: 'Ampliar un experimento',
  subtitle:
    'De veinte planetas que ejecutó el motor a una población de doscientos mil, con todas las incertidumbres, en Python en la página de cálculo',
  objectives: [
    'Clasificar los ensayos de un resultado de experimento en un desenlace, y decir cómo la definición del desenlace mueve el resultado',
    'Ejecutar un cuaderno de Python revisado que ajusta la probabilidad de un desenlace con bootstrap y la extiende a una gran población sintética',
    'Decir qué cubre y qué no cubre el intervalo de una ampliación',
    'Explicar por qué una muestra de veinte puede diferir de la población de la que se sacó más de lo que sugiere su barra de error',
  ],
  steps: [
    {
      title: 'Veinte planetas que ejecutó el motor',
      body: `El Laboratorio de planeta en binaria pone un planeta cerca de una estrella de un par separado diez unidades astronómicas. Un <strong>experimento</strong> del ejecutor de experimentos corrió veinte ensayos: en cada uno el planeta empezó a una distancia de su estrella sacada al azar entre 0,12 y 0,42 de la separación de las estrellas, y el motor lo ejecutó unas veinte órbitas de la binaria. Algunos planetas siguieron en órbita y otros fueron expulsados.
             \n\nEl resultado del experimento es un archivo, y el cuaderno lo lee. Llama <strong>ligado</strong> a un planeta si su distancia media a la estrella se mantuvo dentro de un umbral (tres, al principio) veces la distancia de partida, ajusta la probabilidad de estar ligado como una curva suave de la distancia inicial, repite el ajuste en 400 remuestreos de los veinte para obtener su incertidumbre, y genera doscientos mil planetas sintéticos para decir cuántos seguirían ligados en una población mayor.
             \n\nAbre la página de cálculo en <strong>/compute/</strong> de este sitio. Solo funciona con conexión y la primera vez descarga unos 19 MB de Python, cuando pulsas el botón. Elige el cuaderno <strong>Una población de planetas, ampliada</strong>, deja su entrada de ejemplo (los veinte planetas) y sus ajustes en pendiente 1, 200.000 planetas y umbral 3. Todavía no pulses Ejecutar.`,
    },
    {
      title: 'Qué tan bien sitúan veinte un borde',
      body: `Antes de ejecutarlo. De los veinte planetas, los que siguieron ligados partieron a menos de 0,25 aproximadamente, y los que no, a más de 0,34, sin nada en medio salvo unos pocos casos dudosos.`,
      prompt:
        'El cuaderno dará la distancia inicial donde la probabilidad de seguir ligado es un medio, con una incertidumbre. Esa incertidumbre será&hellip;',
      options: [
        'diminuta, porque se usan doscientos mil planetas sintéticos',
        'unas centésimas, una fracción de la brecha entre el último planeta que se quedó y el primero que se fue',
        'cero, porque el motor es exacto',
        'grande, porque veinte son demasiado pocos para decir nada',
      ],
      because:
        'El borde está en algún lugar de la brecha entre el último planeta que se quedó y el primero que se fue, de aproximadamente una décima de la separación de las estrellas. El bootstrap, que repite el ajuste en remuestreos de los veinte, da una dispersión que es una fracción de esa brecha, unas centésimas; los doscientos mil planetas sintéticos no le añaden nada.',
    },
    {
      title: 'Ejecútalo: el borde y las fracciones',
      body: `Pulsa <strong>Iniciar el entorno</strong>, espera, y luego <strong>Ejecutar el cuaderno</strong>. Lee las cantidades que devuelve e introdúcelas aquí: la distancia inicial donde la probabilidad de seguir ligado es un medio y la incertidumbre que aparece junto a ella; la fracción de los veinte ensayos que quedó ligada; y la fracción de la población sintética.`,
      fields: [
        { label: 'Distancia a medio camino' },
        { label: 'Su incertidumbre' },
        { label: 'Fracción ligada en los ensayos' },
        { label: 'Fracción ligada en la población sintética' },
      ],
    },
    {
      title: 'Una población uniforme',
      body: `Los veinte planetas se sortearon de forma uniforme en la distancia inicial. Pon la <strong>pendiente</strong> en <strong>0</strong>, que genera la población sintética del mismo modo, y ejecuta de nuevo. Introduce la fracción ligada de la población sintética y cuánto queda por debajo de la fracción de los ensayos, 0,6.`,
      fields: [
        { label: 'Fracción ligada, población uniforme' },
        { label: 'Fracción de los ensayos menos esta' },
      ],
    },
    {
      title: 'Por qué difiere la muestra',
      body: `La fracción de los ensayos, 0,6, está 0,15 por encima de la de la población uniforme, 0,451. La incertidumbre del bootstrap de la ampliación, 0,081, es aproximadamente la mitad de esa diferencia.`,
      prompt: '¿Cuál es la mejor explicación de la diferencia?',
      options: [
        'Los veinte fueron un sorteo al azar, y un sorteo al azar de veinte aparta la fracción de la muestra de la de la población en torno a su propio error binomial, aquí 0,11',
        'El cuaderno tiene un error que reduce la fracción de la población',
        'El motor funciona de otra manera con los planetas sintéticos',
        'El intervalo del bootstrap está mal y debería ser cero',
      ],
      misconceptions: [
        {
          say: 'La fracción de la población es la curva ajustada promediada sobre un sorteo uniforme, que es (0,255 − 0,12) ÷ (0,42 − 0,12) = 0,45, calculada a mano: no hay nada mal en ella.',
        },
        {
          say: 'Ningún planeta sintético lo ejecuta el motor. A cada uno se le da la probabilidad ajustada, que es la suposición del cuaderno.',
        },
      ],
      hints: [
        'Una fracción de veinte planetas tiene un error binomial de la raíz cuadrada de p(1 − p) ÷ 20.',
      ],
      because:
        'La fracción de la muestra de veinte tiene un error binomial cercano a 0,11, así que 0,6 frente a 0,45 está a menos de dos de esos errores: nada raro. La fracción de la población es el promedio del modelo sobre un sorteo uniforme, y es lo que los veinte debían estimar.',
    },
    {
      title: 'Mueve la definición',
      body: `Devuelve la <strong>pendiente</strong> a <strong>1</strong> y pon el <strong>umbral</strong> en <strong>6</strong>: un planeta cuenta ahora como ligado si se queda dentro de seis distancias iniciales, no tres. Ejecuta de nuevo. Introduce la nueva distancia a medio camino y la fracción de la población sintética.`,
      fields: [
        { label: 'Distancia a medio camino, umbral 6' },
        { label: 'Fracción ligada, umbral 6' },
      ],
    },
    {
      title: 'Qué movió el borde',
      body: `Nada de los planetas cambió entre las dos ejecuciones: los mismos veinte ensayos, el mismo motor, las mismas órbitas.`,
      prompt: '¿Por qué se movió el borde de 0,255 a 0,289?',
      options: [
        'Un planeta cuya distancia media fue 3,8 veces su distancia inicial se reclasificó de no ligado a ligado: cambió la definición de ligado',
        'El bootstrap dio otra respuesta por azar',
        'El motor dio ensayos distintos la segunda vez',
        'Cambió la población sintética',
      ],
      misconceptions: [
        {
          say: 'El bootstrap tiene semilla, así que no varía entre ejecuciones; el cambio viene de la clasificación.',
        },
        {
          say: 'Los ensayos son los del archivo: el motor no corre de nuevo. Solo cambió la lectura que el cuaderno hace de ellos.',
        },
      ],
      hints: [
        '¿Qué planetas están ligados con un umbral de seis que no lo estaban con tres?',
      ],
      because:
        'Un planeta, con una distancia inicial de 0,2315, se quedó a una distancia media de 3,8 veces la de partida: no ligado con un umbral de tres y ligado con seis. Esa única reclasificación mueve el borde un tercio de la brecha que tiene al lado. Un desenlace es una definición, y la incertidumbre de la ampliación no incluye su elección.',
    },
    {
      title: 'Lo que calculaste',
      body: `Veinte planetas, ejecutados por el motor, fijaron el borde de la región ligada en unos 0,255 &plusmn; 0,024 de la separación de las estrellas. Ampliada a doscientos mil planetas sintéticos, la fracción ligada fue 0,596 &plusmn; 0,076 para una población con números iguales por factor de distancia, y 0,451 &plusmn; 0,081 para una uniforme, que es donde debió estar el 0,6 de la propia muestra.
             \n\nLo que los números no dicen: el intervalo cuenta la dispersión de veinte ensayos y nada más. No cuenta la elección de una curva logística, la definición de ligado ni el rango del sorteo, fuera del cual no se genera ningún planeta sintético. Una población sintética mayor tiene un error de muestreo menor y exactamente las mismas suposiciones. La ejecución es tuya: su cápsula registra el hash del cuaderno y el del archivo de resultados, así que un informe puede citarla.`,
    },
  ],
};
