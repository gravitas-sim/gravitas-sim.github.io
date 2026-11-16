// Dos periodogramas - español, paso a paso con ../two-periodograms.js.
export default {
  title: 'Dos periodogramas',
  subtitle:
    'Un periodograma de Lomb-Scargle y uno de mínimos cuadrados de caja de la misma curva de luz, calculados con Astropy en Python, y qué puede afirmar un período sacado de un periodograma',
  objectives: [
    'Calcular un periodograma de Lomb-Scargle y uno de mínimos cuadrados de caja de una curva de luz con Astropy y leer el mejor período de cada uno',
    'Explicar por qué el pico de Lomb-Scargle de una curva de luz de tránsito está en un armónico del período del planeta',
    'Decir qué es el período de un periodograma, y por qué no tiene una barra de error propia',
    'Comparar un período de un periodograma con un período ajustado en unidades de la incertidumbre del ajuste',
  ],
  steps: [
    {
      title: 'Dos maneras de buscar un período',
      body: `Una curva de luz que se hunde cada pocos días tiene un período, y hay dos maneras habituales de pedirlo. Un <strong>periodograma de Lomb-Scargle</strong> ajusta una onda senoidal en cada frecuencia de prueba, ponderada por las barras de error, e informa de cuánta variación explica cada una. Se hizo para datos espaciados de forma irregular y para señales que son senoides: una estrella con manchas que gira, una pulsación. Un <strong>periodograma de mínimos cuadrados de caja</strong> ajusta en cambio una caída de fondo plano en cada período, época y duración de prueba, que es lo que parece un tránsito. La búsqueda de caja del Observatorio es la misma idea.
             \n\nEl cuaderno calcula los dos para la curva de luz de TESS de HD 209458 con <strong>astropy.timeseries</strong>, y los pone en un mismo eje de períodos.
             \n\nAbre la página de cálculo en <strong>/compute/</strong> de este sitio. Solo funciona con conexión y la primera vez descarga unos 17 MB de Python, cuando pulsas el botón. Elige el cuaderno <strong>Dos periodogramas de una curva de luz</strong>, deja su entrada de ejemplo y sus ajustes en 15 días y 6 horas. Todavía no pulses Ejecutar.`,
    },
    {
      title: 'Dónde estará el pico más alto',
      body: `El planeta transita cada 3,52 días; la curva de luz dura 27,9 días. El cuaderno buscará períodos desde medio día hasta quince.`,
      prompt:
        'El pico más alto del periodograma de Lomb-Scargle estará en&hellip;',
      options: [
        'el período del planeta, unos 3,5 días',
        'aproximadamente la mitad, 1,8 días',
        'aproximadamente el doble, 7 días',
        'la órbita de la propia nave, unos 13,7 días',
      ],
      because:
        'Un tren de caídas estrechas que se repite cada P no es una onda senoidal: tiene potencia en P y en cada armónico, P/2, P/3, y así sucesivamente, con fuerza parecida en cada uno. Cuál es el más alto depende de la forma de las caídas y de los huecos de los datos. Aquí el fundamental es el más débil de los cuatro primeros, y el pico más alto es el segundo armónico.',
    },
    {
      title: 'Ejecútalo: los dos mejores períodos',
      body: `Pulsa <strong>Iniciar el entorno</strong>, espera, y luego <strong>Ejecutar el cuaderno</strong>. Lee las cantidades que devuelve e introdúcelas aquí: el mejor período de cada periodograma, y el cociente del de Lomb-Scargle entre el de caja.`,
      fields: [
        { label: 'Mejor período de Lomb-Scargle' },
        { label: 'Mejor período de mínimos cuadrados de caja' },
        { label: 'Lomb-Scargle entre caja' },
      ],
    },
    {
      title: 'Por qué la mitad',
      body: `El cuaderno también devuelve una tabla de los dos periodogramas en un mismo eje. Busca la potencia de Lomb-Scargle en las filas cercanas a 3,5, 1,76, 1,17 y 0,88 días: 0,056, 0,073, 0,071 y 0,071.`,
      prompt: '¿Qué muestra eso?',
      options: [
        'Una caída estrecha que se repite tiene potencia en el período del planeta y en sus armónicos, y los armónicos son tan fuertes como el período o más, así que el pico más alto no tiene por qué ser el período',
        'El verdadero período del planeta es 1,77 días',
        'La curva de luz contiene cuatro planetas distintos',
        'Lomb-Scargle tiene un error que divide los períodos por dos',
      ],
      misconceptions: [
        {
          say: 'La búsqueda de caja, las propias caídas y el ajuste dicen 3,52 días. Cuenta las caídas: ocho en 28 días.',
        },
        {
          say: 'Las potencias en 3,5, 1,76, 1,17 y 0,88 son 1, 1/2, 1/3 y 1/4 de un solo período: los armónicos de una señal, no cuatro señales.',
        },
      ],
      hints: [
        'Una onda senoidal tiene una joroba suave por ciclo. Una caída estrecha no es suave, y una suma de senoides en el período y sus armónicos la forma.',
      ],
      because:
        'Una caída estrecha que se repite cada P es una suma de senoides en P, P/2, P/3 y así sucesivamente, con fuerzas parecidas. Lomb-Scargle ajusta una senoide a la vez, así que cada una es un pico y cualquiera puede ser el más alto. Su pico más alto dice que hay una señal periódica y da un período que divide al real; no dice cuál.',
    },
    {
      title: 'La mejor caja',
      body: `La búsqueda de caja devuelve más que un período: la duración y la profundidad de la caja que mejor ajusta, y la relación señal-ruido de la profundidad, donde la barra de error de la profundidad se ha escalado hacia arriba porque los puntos se dispersan unas 2,8 veces sus barras de error. Introduce la duración, la profundidad y la relación señal-ruido.`,
      fields: [
        { label: 'Duración de la caja' },
        { label: 'Profundidad de la caja' },
        { label: 'S/N de la profundidad' },
      ],
    },
    {
      title: 'Frente al ajuste',
      body: `El panel de ajuste del Observatorio, que ajusta a esta curva de luz un tránsito y no una caja, da un período de <strong>3,52454</strong> días con una incertidumbre de 0,00003. Réstalo del período de la búsqueda de caja, y di a cuántas incertidumbres del ajuste están.`,
      fields: [
        { label: 'Período de caja menos período ajustado' },
        { label: 'En incertidumbres del ajuste' },
      ],
    },
    {
      title: 'Qué es un paso de la rejilla',
      body: `Un colega informa del período de la búsqueda de caja como 3,52396 &plusmn; 0,0000003 días, tomando el segundo número de la rejilla fina que el cuaderno recorre sobre el pico, cuyo paso es de 3e-7 días.`,
      prompt: '¿Qué hay de malo en eso?',
      options: [
        'El paso de la rejilla es la finura con que se muestrearon los períodos, no lo bien que los datos fijan el período: este período está a 19 incertidumbres del período del ajuste, así que su incertidumbre real es mucho mayor que el paso',
        'El paso de la rejilla es demasiado pequeño y debería hacerse mayor',
        'Una búsqueda de caja no puede encontrar un período',
        'La incertidumbre debería ser la relación señal-ruido',
      ],
      misconceptions: [
        {
          say: 'Hacer el paso mayor haría mayor la incertidumbre citada y no más honesta: seguiría siendo una propiedad de la rejilla.',
        },
        {
          say: 'Encontró el período, a una milésima de día. No puede decir lo bien que lo hizo, porque nada en una búsqueda de caja lo estima.',
        },
      ],
      hints: [
        'Cambia la rejilla y cambia el paso. ¿Cambia lo que los datos dicen del período?',
      ],
      because:
        'El período de un periodograma es el punto más alto de una curva evaluada en una rejilla. Su agudeza depende de la rejilla, de las duraciones probadas y de la forma de la caja, y ninguna es una barra de error. Para decir lo bien que los datos fijan el período, ajusta un modelo de tránsito, como hace el panel del Observatorio, y toma la covarianza o el perfil del período.',
    },
    {
      title: 'Lo que has deducido',
      body: `Dos periodogramas de una misma curva de luz discrepan en un factor de dos, y los dos aciertan en lo que se les preguntó. Lomb-Scargle halló la onda senoidal más fuerte, en 1,769 días, un armónico del período del planeta. La búsqueda de caja halló una caída, en 3,524 días, de 2,5 horas de duración y 14.600 partes por millón de profundidad, y coincide con el período del ajuste hasta 0,0006 días.
             \n\nUn periodograma responde a "¿hay aquí un período, y más o menos dónde?", y no a "¿cuál es, con qué precisión?". Lo segundo necesita un modelo, un ajuste y una incertidumbre, que la investigación anterior hizo y esta no. La ejecución es tuya para conservarla: su cápsula registra el hash del cuaderno y el de la curva de luz, así que un informe puede citarla.`,
    },
  ],
};
