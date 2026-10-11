// El primer peldaño - español, paso a paso con ../the-first-rung.js.
export default {
  title: 'El primer peldaño',
  subtitle:
    'La distancia a dos galaxias a partir de sus cefeidas, con cada error contabilizado',
  objectives: [
    'Medir el módulo de distancia de una galaxia deslizando la relación de las cefeidas sobre las suyas, y convertirlo en una distancia',
    'Contrastar una distancia por cefeidas con una independiente y decir si concuerdan dentro de sus errores',
    'Leer un presupuesto de errores y decir qué término limita la distancia y cuáles no importan',
    'Decir qué queda sin corregir y qué no alcanza este primer peldaño',
  ],
  steps: [
    {
      title: 'Deslizar la relación',
      body: `El periodo de una cefeida da su luminosidad, y su luminosidad con su brillo medido da su distancia. En la práctica no se hace estrella por estrella: se ajusta la relación con estrellas a una distancia conocida y luego se desliza toda la recta hacia arriba o hacia abajo hasta que pase por las cefeidas de otra galaxia. El deslizamiento, en magnitudes, es el <strong>módulo de distancia</strong>, μ, la diferencia entre lo brillantes que parecen las estrellas y lo brillantes que son. La distancia es 10<sup>(μ+5)/5</sup> pársecs.
             \n\nEl instrumento tiene la relación de la Gran Nube de Magallanes como la recta pálida. Elige una galaxia: sus cefeidas aparecen como puntos de color y la recta cálida es la relación deslizada. Son mediciones <strong>auténticas</strong> del Hubble, reducidas a una de cada cuatro estrellas.`,
    },
    {
      title: 'NGC 4258',
      body: `Elige <strong>NGC 4258</strong>, una galaxia espiral de los Perros de Caza. Lee su <strong>módulo de distancia</strong> y su <strong>distancia</strong> en megapársecs.`,
      fields: [{ label: 'Módulo de distancia' }, { label: 'Distancia' }],
    },
    {
      title: '¿Concuerda?',
      body: `NGC 4258 tiene una segunda distancia, independiente. Los máseres de agua de su núcleo orbitan el agujero negro central, y su movimiento da la distancia geométricamente, sin ninguna cefeida. Todavía no cambies el instrumento.`,
      prompt: 'El módulo de distancia por cefeidas&hellip;',
      options: [
        'concordará con la distancia por máseres dentro de los errores de ambos',
        'diferirá en unos dos errores combinados',
        'diferirá en muchas veces los errores combinados',
        'será imposible de comparar, porque uno es un módulo y la otra una distancia',
      ],
      hints: [
        'La comparación es la diferencia de los dos módulos sobre la suma cuadrática de sus errores.',
      ],
      because:
        'Concordará. Los dos métodos no comparten ningún paso salvo la distancia de la Gran Nube de Magallanes por el lado de las cefeidas, y la diferencia sale de una décima del error combinado. Un módulo de distancia y una distancia son la misma cantidad en dos unidades, así que se pueden comparar. El paso siguiente lee el valor de los máseres.',
    },
    {
      title: 'El contraste con los máseres',
      body: `Con NGC 4258 elegida, lee el <strong>módulo de distancia por máseres de agua</strong> que indica el instrumento, y su error.`,
      fields: [
        { label: 'Módulo de distancia por máseres' },
        { label: 'Su error' },
      ],
    },
    {
      title: 'El presupuesto',
      body: `El error de ±0,051 magnitudes es la suma, en cuadratura, de cuatro términos. Lee los dos mayores: el <strong>error por la dispersión de esta galaxia</strong> y el <strong>error en la distancia de la Nube de Magallanes</strong>.`,
      fields: [
        { label: 'Por la dispersión de esta galaxia' },
        { label: 'Por la distancia de la Nube' },
      ],
    },
    {
      title: 'Qué limita la distancia',
      body: `Los términos son 0,043 (la dispersión de la galaxia sobre sus 111 estrellas), 0,026 (la distancia de la Nube), 0,005 (la dispersión de la calibración sobre 339 estrellas) y 0,0002 (la pendiente).`,
      prompt:
        '¿Cuáles de ellos se reducirían si hallaras diez veces más cefeidas en ambas galaxias?',
      options: [
        'Los cuatro, a una décima',
        'Los dos términos de dispersión, que bajan como uno sobre la raíz cuadrada del número de estrellas, pero no la distancia de la Nube, que es una medición aparte',
        'Solo la distancia de la Nube',
        'Ninguno: más estrellas nunca ayudan',
      ],
      misconceptions: [
        {
          say: 'Los términos de dispersión bajan como uno sobre √N, así que diez veces más estrellas ayuda en un factor 3, no 10; y la distancia de la Nube no baja nada, porque es otra medición.',
        },
        {
          say: 'Más estrellas sí ayudan a los términos de dispersión. Solo que no alcanzan la parte del error que viene de fuera de las cefeidas.',
        },
      ],
      hints: [
        'Pregunta, para cada término, si es un promedio sobre estrellas o un número que vino de otra parte.',
      ],
      because:
        'Los términos de la galaxia y de la calibración son promedios sobre estrellas y bajan como 1/√N; la distancia de la Nube es una entrada fija con su propio error. Con cien veces más estrellas los términos de dispersión serían despreciables y los 0,026 de la Nube fijarían el suelo, un 1,2 por ciento en distancia. Ese suelo es la razón de que los anclajes importen tanto en la escalera de distancias.',
    },
    {
      title: 'M101',
      body: `Elige <strong>M101</strong>, la galaxia del Molinete, y lee su <strong>módulo de distancia</strong> y su <strong>distancia</strong>.`,
      fields: [{ label: 'Módulo de distancia' }, { label: 'Distancia' }],
    },
    {
      title: 'Lo que has deducido',
      body: `Deslizar la relación de las cefeidas de la Nube de Magallanes sobre las de NGC 4258 da un módulo de distancia de 29,40 ± 0,05, 7,59 ± 0,18 megapársecs, y la distancia geométrica por máseres concuerda con una décima del error combinado. M101 sale a 6,95 ± 0,17 megapársecs. El error es la dispersión propia de la galaxia y la distancia de la Nube; el resto no importa.
             \n\nEs el primer peldaño de la escalera de distancias: las cefeidas llegan a galaxias a decenas de millones de años luz, y las supernovas, calibradas con ellas, llegan mucho más lejos. Sin corregir aquí: el efecto del contenido de metales en las cefeidas, el apiñamiento en las imágenes y la covarianza en los errores de la tabla, que la dispersión alrededor de la relación sustituye. El enlace de esta escalera con la constante de Hubble no se hace aquí; necesita un catálogo de galaxias anfitrionas de supernovas que esta investigación no lleva.`,
    },
  ],
};
