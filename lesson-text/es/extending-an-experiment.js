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
  steps: {
    'twenty-planets': {
      title: 'Veinte planetas que ejecutó el motor',
      body: `¿Qué tan bien pueden veinte planetas que ejecutó el motor decir qué haría una población de doscientos mil? El cuaderno de la página de cálculo responde con un intervalo, y verás qué cubre ese intervalo.
             \n\nEl Laboratorio de planeta en binaria pone un planeta cerca de una estrella de un par separado diez unidades astronómicas. Un <strong>experimento</strong> del ejecutor de experimentos corrió veinte ensayos: en cada uno el planeta empezó a una distancia de su estrella sacada al azar entre 0,12 y 0,42 de la separación de las estrellas, y el motor lo ejecutó unas veinte órbitas de la binaria. Algunos planetas siguieron en órbita y otros fueron expulsados.
             \n\nEl resultado del experimento es un archivo, y el cuaderno lo lee. Llama <strong>ligado</strong> a un planeta si su distancia media a la estrella se mantuvo dentro de un umbral (tres, al principio) veces la distancia de partida, ajusta la probabilidad de estar ligado como una curva suave de la distancia inicial, repite el ajuste en 400 remuestreos de los veinte para obtener su incertidumbre, y genera doscientos mil planetas sintéticos para decir cuántos seguirían ligados en una población mayor.
             \n\nAbre la página de cálculo en <strong>/compute/</strong> de este sitio. Solo funciona con conexión y la primera vez descarga unos 19 MB de Python, cuando pulsas el botón. Elige el cuaderno <strong>Una población de planetas, ampliada</strong>, deja su entrada de ejemplo (los veinte planetas) y sus ajustes en pendiente 1, 200.000 planetas y umbral 3. Todavía no pulses Ejecutar.`,
    },
    'how-well-can-twenty-place-an-edge': {
      title: 'Qué tan bien sitúan veinte un borde',
      body: `Antes de ejecutarlo. Los veinte planetas partieron de distancias al azar de su estrella. Los que siguieron ligados partieron cerca de ella y los que fueron expulsados partieron lejos, con una brecha amplia entre los dos grupos y unos pocos casos dudosos cerca de su borde.`,
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
    'the-fit': {
      title: 'Ejecútalo: el borde y las fracciones',
      body: `Pulsa <strong>Iniciar el entorno</strong>, espera, y luego <strong>Ejecutar el cuaderno</strong>. Lee las cantidades que devuelve e introdúcelas aquí: la distancia inicial donde la probabilidad de seguir ligado es un medio y la incertidumbre que aparece junto a ella; la fracción de los veinte ensayos que quedó ligada; y la fracción de la población sintética.`,
      fields: [
        { label: 'Distancia a medio camino' },
        { label: 'Su incertidumbre' },
        { label: 'Fracción ligada en los ensayos' },
        { label: 'Fracción ligada en la población sintética' },
      ],
    },
    'a-uniform-population': {
      title: 'Una población uniforme',
      body: `Los veinte planetas se sortearon de forma uniforme en la distancia inicial. Pon la <strong>pendiente</strong> en <strong>0</strong>, que genera la población sintética del mismo modo, y ejecuta de nuevo. Introduce la fracción ligada de la población sintética y cuánto queda por debajo de la fracción de los ensayos, 0,6.`,
      fields: [
        { label: 'Fracción ligada, población uniforme' },
        { label: 'Fracción de los ensayos menos esta' },
      ],
    },
    'why-the-sample-differs': {
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
    'move-the-definition-yours': {
      title: 'Mueve la definición',
      body: `La ejecución del paso <em>Ejecútalo</em>, con un umbral de 3, es la de referencia. Cambia ahora lo que significa <strong>ligado</strong>. Devuelve la <strong>pendiente</strong> a <strong>1</strong>, elige un umbral del menú, <strong>2</strong>, <strong>4</strong>, <strong>6</strong> o <strong>10</strong>, pon el <strong>umbral</strong> en él y ejecuta de nuevo: un planeta cuenta ahora como ligado si se queda dentro de ese número de distancias iniciales, no tres. (Un umbral de distancia, no la prueba de expulsión de la investigación de las binarias.) Introduce tu umbral, la nueva distancia a medio camino y la fracción de la población sintética.`,
      fields: [
        { label: 'El umbral que ejecutaste' },
        { label: 'Distancia a medio camino, tu umbral' },
        { label: 'Fracción ligada, tu umbral' },
      ],
    },
    'which-trial-moved': {
      title: 'Qué ensayo se movió',
      body: `Nada de los planetas cambia entre dos umbrales: los mismos veinte ensayos, el mismo motor, las mismas órbitas. Solo se mueve la definición de ligado, así que algún ensayo debe cambiar de clase entre ellos, o ninguno.
             \n\nElige dos umbrales distintos de los menús, <strong>2</strong>, <strong>3</strong>, <strong>4</strong>, <strong>6</strong> o <strong>10</strong>; tu última elección y el 3 de la referencia son una pareja natural. Ejecuta cada uno en la página de cálculo si aún no lo has hecho, y pon la columna <em>bound trials</em> (ensayos ligados) de las dos tablas del cuaderno una junto a otra. La tabla tiene diez tramos de distancia inicial, y su primera columna contiene el centro de cada uno. Introduce tus dos umbrales, cuántos ensayos cambian de clase entre ellos y el centro del tramo más cercano a la estrella donde difiere el recuento de ligados. Si ningún tramo difiere, introduce 0 y escribe <strong>ninguno</strong>.`,
      fields: [
        { label: 'Primer umbral' },
        { label: 'Segundo umbral' },
        { label: 'Ensayos que cambian de clase' },
        {
          label:
            'Tramo más cercano donde difiere el recuento (su centro), o ninguno',
        },
      ],
    },
    'what-you-worked-out': {
      title: 'Lo que calculaste',
      body: `Veinte planetas, ejecutados por el motor, fijaron el borde de la región ligada en unos 0,255 &plusmn; 0,024 de la separación de las estrellas. Ampliada a doscientos mil planetas sintéticos, la fracción ligada fue 0,596 &plusmn; 0,076 para una población con números iguales por factor de distancia, y 0,451 &plusmn; 0,081 para una uniforme, que es donde debió estar el 0,6 de la propia muestra. Y la definición de ligado, el umbral que elegiste, movió el borde y la fracción mientras cada planeta seguía igual: basta con que un ensayo cambie de clase.
             \n\nLo que el intervalo no cubre: cuenta la dispersión de veinte ensayos y nada más. No cuenta la elección de una curva logística, la definición de ligado ni el rango del sorteo, fuera del cual no se genera ningún planeta sintético. Una población sintética mayor tiene un error de muestreo menor y exactamente las mismas suposiciones. "Ligado" aquí es un umbral de distancia del cuaderno, no la prueba de expulsión de la investigación de las binarias, así que las dos palabras no afirman lo mismo. La ejecución es tuya: su cápsula registra el hash del cuaderno y el del archivo de resultados, así que un informe puede citarla.`,
    },
  },
};

export const messages = () =>
  import('../../../i18n/computingMessagesEs.js').catch(() => {});
