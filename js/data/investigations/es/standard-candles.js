// Candelas estándar - español, paso a paso con ../standard-candles.js.
export default {
  title: 'Candelas estándar',
  subtitle:
    'De las cefeidas a las supernovas: cómo un error en un peldaño se vuelve un error en la constante de Hubble',
  objectives: [
    'Decir qué es una candela estándar y por qué el módulo de distancia de una supernova da una distancia',
    'Mostrar cómo un error en la calibración de una candela se vuelve un error en la constante de Hubble, y en cuánto',
    'Decir por qué las supernovas solas no pueden dar la constante de Hubble, y qué aportan los peldaños de debajo',
    'Comparar el error de un peldaño con el tamaño del error que transmite',
  ],
  steps: [
    {
      title: 'Una candela y su distancia',
      body: `Una <strong>candela estándar</strong> es un objeto cuyo brillo verdadero puedes conocer sin conocer su distancia. Una supernova de tipo Ia, una enana blanca empujada más allá de su límite, es casi una: todas alcanzan más o menos la misma luminosidad en el máximo, tras una pequeña corrección por la rapidez con que se apagan. Compara lo brillante que parece una con lo brillante que es, y la diferencia en magnitudes es su <strong>módulo de distancia</strong>.
             \n\nEl diagrama representa los módulos de 1.829 supernovas del Dark Energy Survey frente a sus corrimientos al rojo. Son <strong>auténticas</strong>, con solo errores estadísticos. La curva cálida es un universo plano con la densidad de materia y la constante de Hubble que fijes. Una supernova a la izquierda está cerca y una a la derecha está lejos, y nada aquí dice lo brillante que es de verdad cada una: eso viene de las cefeidas y los otros peldaños de la escalera, más abajo.`,
    },
    {
      title: 'La muestra',
      body: `Lee el <strong>número de supernovas</strong> y el <strong>chi cuadrado</strong> del mejor ajuste, el primer número del par.`,
      fields: [
        { label: 'Supernovas' },
        { label: 'Chi cuadrado del mejor ajuste' },
      ],
    },
    {
      title: 'Una candela que no es lo que creías',
      body: `Supón que cada supernova es en verdad 0,1 magnitudes más débil de lo que dice la calibración. Cada una está entonces más lejos de lo que se pensaba, así que todas las distancias son demasiado pequeñas en la misma fracción. Todavía no cambies el instrumento.`,
      prompt: 'La constante de Hubble que implican las supernovas&hellip;',
      options: [
        'subirá un 4,5 por ciento, más o menos',
        'bajará un 4,5 por ciento, más o menos',
        'subirá un 45 por ciento, más o menos',
        'no cambiará, porque los corrimientos al rojo no cambiaron',
      ],
      hints: [
        'Distancias demasiado pequeñas, para las mismas velocidades, dan una pendiente demasiado grande; corregirlas la baja.',
      ],
      because:
        'Baja, en torno a un 4,5 por ciento. Una candela más débil con el mismo brillo observado está más lejos, así que las distancias corregidas son mayores y, para las mismas velocidades de recesión, la pendiente es menor. Los corrimientos al rojo no cambiaron, pero una constante de Hubble es una velocidad dividida por una distancia, y la distancia sí.',
    },
    {
      title: '0,1 magnitudes de error',
      body: `Lleva el <strong>error en la magnitud absoluta de las supernovas</strong> a <strong>0,10</strong> magnitudes. Lee la <strong>constante de Hubble implícita</strong> y el <strong>cambio en H<sub>0</sub> por 0,1 mag</strong>.`,
      fields: [
        { label: 'Constante de Hubble implícita' },
        { label: 'Cambio en H₀ por 0,1 mag' },
      ],
    },
    {
      title: 'Por qué las supernovas solas no pueden decirlo',
      body: `Mover el error en la magnitud absoluta cambia la constante de Hubble que implica el instrumento, y deja el chi cuadrado de la curva donde estaba. Lo mismo vale para la constante de Hubble de la propia curva: el chi cuadrado para 50, 70 y 90 se diferencia en unos 10<sup>−12</sup>.`,
      prompt: '¿Qué te dice eso?',
      options: [
        'Las supernovas fijan la forma de la curva, y la constante de Hubble y el brillo verdadero de las supernovas desplazan todos los módulos por igual, así que las supernovas no pueden separarlos; la escala tiene que venir de los peldaños de debajo',
        'Las supernovas miden la constante de Hubble a la perfección, así que da igual cuál elijas',
        'El ajuste no convergió',
        'La constante de Hubble no afecta a las distancias',
      ],
      misconceptions: [
        {
          say: 'Es lo contrario: el ajuste es ciego a la escala. El chi cuadrado sería el mismo para cualquier valor, así que los datos no dicen cuál es el correcto.',
        },
        {
          say: 'La constante de Hubble cambia todas las distancias. Lo que no puede es cambiar la forma de un modo que el ajuste vea, porque un desfase es libre y lo absorbe.',
        },
      ],
      hints: [
        'El ajuste resuelve un desfase vertical libre en magnitud. Pregunta qué más podría absorber un desfase.',
      ],
      because:
        'La curva del módulo de distancia frente al corrimiento al rojo tiene una forma y una posición vertical. Las supernovas fijan la forma; la posición vertical es la constante de Hubble y la calibración, juntas. Para fijarla necesitas la distancia a unas pocas galaxias anfitrionas de supernovas por otra vía, como las cefeidas, y eso es la escalera.',
    },
    {
      title: 'Un error transmitido',
      body: `La investigación <em>El primer peldaño</em> halla un módulo de distancia por cefeidas bueno a 0,051 magnitudes. Un error de módulo Δμ es un error de distancia de Δd ÷ d = 0,4605 Δμ, y una constante de Hubble lleva el mismo error fraccionario que la distancia por la que se divide.`,
      prompt:
        '¿Qué error en la constante de Hubble transmiten 0,051 magnitudes?',
      options: [
        'Un 0,05 por ciento, más o menos, porque 0,051 es pequeño',
        'Un 2,4 por ciento, más o menos, por 0,4605 × 0,051',
        'Un 5 por ciento, más o menos, el mismo número',
        'Un 24 por ciento, más o menos, porque las magnitudes son logarítmicas',
      ],
      misconceptions: [
        {
          say: 'Una magnitud no es un porcentaje. La conversión es 0,4605 por magnitud, así que 0,051 magnitudes son un par de por cientos.',
        },
        {
          say: 'Las magnitudes son logarítmicas: 0,05 de una son unos pocos por ciento de una distancia, no una veinteava parte de un por ciento.',
        },
      ],
      hints: ['0,4605 × 0,051 × 100.'],
      because:
        '0,4605 × 0,051 = 0,0235: un 2,4 por ciento, más o menos, de este solo peldaño, antes de usar una sola supernova. Los peldaños de arriba añaden sus propios términos, y un resultado bueno a uno o dos por ciento pide cada peldaño bueno a unas centésimas de magnitud.',
    },
    {
      title: 'Lo que has deducido',
      body: `Una candela estándar convierte brillo en distancia solo tan bien como se conoce su brillo verdadero. Una décima de magnitud de error de calibración es un 4,5 por ciento en la constante de Hubble, y el chi cuadrado de las supernovas no puede verlo, porque las supernovas fijan la forma del diagrama y no su escala. La escala se transmite desde los peldaños de debajo, y un error en un peldaño es un error en todos los que se apoyan en él.
             \n\nNo se hace aquí: las correcciones dependientes del corrimiento al rojo de un análisis real de supernovas, los errores que comparten dos supernovas, y la dependencia del brillo máximo respecto de la galaxia anfitriona. Los módulos de distancia de la tabla están en la escala propia del sondeo; el «error en la magnitud absoluta» del instrumento sustituye a lo que cambiaría la calibración verdadera.`,
    },
  ],
};
