// La ley de Leavitt - español, paso a paso con ../leavitts-law.js.
export default {
  title: 'La ley de Leavitt',
  subtitle:
    'Ajustar la relación periodo-luminosidad de las cefeidas de la Gran Nube de Magallanes',
  objectives: [
    'Decir por qué las cefeidas de una sola galaxia sirven para calibrar el brillo frente al periodo',
    'Ajustar la relación periodo-luminosidad a 339 cefeidas y leer su pendiente, su punto cero y su dispersión',
    'Decir por qué se usa una magnitud de Wesenheit y cuánto polvo deja todavía',
    'Convertir la pendiente en una razón de brillos entre una cefeida de periodo largo y una de periodo corto',
  ],
  steps: [
    {
      title: 'Más brillante y más lenta',
      body: `En 1912 Henrietta Leavitt, clasificando placas fotográficas de la Pequeña Nube de Magallanes, notó que las variables cefeidas de periodo más largo eran las más brillantes. Todas las estrellas de esa nube están casi a la misma distancia, así que una diferencia de brillo aparente es una diferencia de luminosidad verdadera: el periodo de una cefeida dice lo que vale.
             \n\nEl instrumento guarda la misma relación para la Gran Nube de Magallanes, medida con el telescopio espacial Hubble: 339 cefeidas, cada una un punto de magnitud de Wesenheit (brillo con el efecto del polvo casi eliminado) frente al periodo en un eje logarítmico. Lo más brillante está arriba. La recta es un ajuste por mínimos cuadrados. Son mediciones <strong>auténticas</strong>; la fuente de la tabla está en la primera fila del instrumento.`,
    },
    {
      title: 'Hacia dónde se inclina',
      body: `El gráfico tiene el periodo abajo y la magnitud a un lado, con las estrellas más brillantes más arriba. Todavía no cambies el instrumento.`,
      prompt:
        'Comparada con una cefeida de periodo corto, una de periodo largo aparecerá&hellip;',
      options: [
        'más arriba en el gráfico, más brillante, así que la recta sube hacia la derecha',
        'más abajo en el gráfico, más débil, así que la recta baja hacia la derecha',
        'a la misma altura: el periodo no dice nada del brillo',
        'más arriba, pero solo para periodos de más de treinta días',
      ],
      hints: [
        'Piensa en el resultado de Leavitt: cuanto más largo el periodo, más luminosa la estrella.',
      ],
      because:
        'Más arriba, más brillante: la recta sube hacia la derecha en este gráfico. Las magnitudes van al revés, así que una estrella más brillante tiene una magnitud menor, y la pendiente ajustada es negativa. El paso siguiente la lee.',
    },
    {
      title: 'La calibración',
      body: `Lee la <strong>pendiente</strong> del ajuste en magnitudes por dex (un dex es un factor diez en el periodo) y la <strong>magnitud que da con un periodo de 10 días</strong>, el punto cero de la relación.`,
      fields: [{ label: 'Pendiente' }, { label: 'Magnitud a los 10 días' }],
    },
    {
      title: 'Qué tan ceñida es la relación',
      body: `Lee la <strong>dispersión alrededor de la relación</strong>, la separación de las estrellas por encima y por debajo de la recta, y el <strong>polvo que queda en una magnitud de Wesenheit</strong> por cada magnitud de atenuación visual por polvo (A<sub>V</sub>).`,
      fields: [
        { label: 'Dispersión alrededor de la relación' },
        { label: 'Polvo que queda por magnitud de A_V' },
      ],
    },
    {
      title: 'Por qué una magnitud de Wesenheit',
      body: `El brillo medido de una cefeida está atenuado por el polvo que hay entre ella y nosotros, en una cantidad que cambia de una estrella a otra. La magnitud de Wesenheit combina el brillo infrarrojo con la diferencia de dos colores visibles, en la proporción en que el polvo los atenúa.`,
      prompt: '¿Qué hace la combinación?',
      options: [
        'Hace las estrellas más brillantes para que la relación se vea mejor',
        'Cancela casi toda la atenuación por polvo, porque el polvo cambia los colores y el brillo a la vez en una proporción conocida',
        'Elimina el efecto de la propia pulsación de la estrella',
        'Corrige la distancia de la estrella',
      ],
      misconceptions: [
        {
          say: 'No se hace nada más brillante: la combinación está construida para que el polvo, que atenúa y enrojece, la deje casi sin cambio.',
        },
        {
          say: 'No se corrige la distancia: las estrellas de aquí están todas casi a la misma, y por eso la relación se puede ajustar.',
        },
      ],
      hints: [
        'El polvo atenúa más la luz azul que la roja; lo que mides en dos colores dice cuánta atenuación ha sufrido la estrella.',
      ],
      because:
        'El polvo atenúa los colores en una razón conocida, así que una mezcla concreta de las magnitudes (la de Wesenheit) no lo ve: lo que queda son 0,04 magnitudes por magnitud de atenuación en V, con la ley del núcleo de radiación y un R_V estándar de 3,3. Otra ley de polvo u otro R_V cambiaría esa cifra, y ese es el supuesto declarado.',
    },
    {
      title: 'Un paso de diez en el periodo',
      body: `La pendiente ajustada es −3,29 magnitudes por dex. Dos cefeidas tienen periodos de 10 y 100 días.`,
      prompt: '¿Cuántas magnitudes más brillante es la cefeida de 100 días?',
      options: [
        '0,33 magnitudes',
        '3,3 magnitudes',
        '33 magnitudes',
        'Igual: son el mismo tipo de estrella',
      ],
      misconceptions: [
        {
          say: 'Un factor diez en el periodo es un dex, y la pendiente son 3,29 magnitudes por cada dex, no por cada décima de dex.',
        },
      ],
      hints: ['El paso de 10 a 100 días es exactamente un dex.'],
      because:
        'Un dex son 3,29 magnitudes, y cinco magnitudes son un factor 100 en brillo, así que 3,29 magnitudes son un factor 10^(0,4 × 3,29) = 21. Una cefeida diez veces más lenta es veintiuna veces más luminosa.',
    },
    {
      title: 'Por qué ajustar en una sola galaxia',
      body: `La relación se ajusta con estrellas de la Gran Nube de Magallanes, no con una mezcla de galaxias.`,
      prompt: '¿Por qué?',
      options: [
        'Las cefeidas de otros sitios son otro tipo de estrella y no obedecen ninguna relación',
        'Todas sus estrellas están casi a la misma distancia, así que las diferencias de brillo son diferencias de luminosidad',
        'Es la galaxia más cercana, y las estrellas más cercanas sufren menos el polvo',
        'El Hubble no pudo observar ninguna otra galaxia',
      ],
      misconceptions: [
        {
          say: 'La misma relación se usa en otras galaxias en la investigación siguiente. El motivo de una sola galaxia es que la distancia allí es una constante.',
        },
      ],
      hints: [
        'Si las estrellas estuvieran a distancias distintas, una débil podría ser una cefeida luminosa lejana.',
      ],
      because:
        'En una galaxia la distancia es un único número, así que las magnitudes de las estrellas difieren solo por la luminosidad, y el ajuste lee la luminosidad a partir del periodo. Para convertirlo en una escala absoluta hay que conocer la distancia de la nube por otro camino, que viene de binarias eclipsantes y entra en la investigación siguiente como un número declarado.',
    },
    {
      title: 'Lo que has deducido',
      body: `Las cefeidas de la Gran Nube de Magallanes están sobre una recta: la magnitud de Wesenheit baja 3,29 magnitudes por cada factor diez en el periodo, con un punto cero de 12,60 a los 10 días y una dispersión de 0,09 magnitudes, así que una cefeida diez veces más lenta es veintiuna veces más luminosa. Una magnitud de Wesenheit cancela casi toda la atenuación por polvo. Ajustar en una sola galaxia funciona porque todas sus estrellas están a una misma distancia.
             \n\nLa recta es una regla cuya longitud solo se conoce salvo la distancia de la nube. La investigación siguiente la pone frente a cefeidas de otras dos galaxias y mide a qué distancia están, con un presupuesto de cada error. Sin corregir aquí: la metalicidad, que cambia algo la relación, y el apiñamiento en las imágenes de las galaxias anfitrionas.`,
    },
  ],
};
