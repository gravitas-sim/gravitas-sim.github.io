// Las investigaciones de atmósfera (Prompt 200) - español, paso a paso con ../atmosphere-sequence.js (D-R10-81).
// Sin lectura por una persona que lea español con fluidez; los mensajes que calculan los validadores quedan en inglés, como en las demás investigaciones.

// Por qué Venus es caliente: paso a paso con el inglés.
export const WHY_VENUS_IS_HOT = {
  title: 'Por qué Venus es caliente',
  subtitle:
    'Qué da la luz del Sol por sí sola a un planeta, la diferencia que deja y qué la cierra',
  objectives: [
    'Decir qué es la temperatura de equilibrio de un planeta y qué no es',
    'Hallar la diferencia entre la temperatura de equilibrio de un planeta y la temperatura medida en su superficie, y leerla como un efecto invernadero solo donde lo es',
    'Ver que Venus, con la temperatura de equilibrio más baja, tiene la superficie más caliente',
    'Hallar el único número que necesita una atmósfera gris para dar a Venus su temperatura superficial, y ver por qué una sola capa no puede',
  ],
  steps: [
    {
      title: 'Dos temperaturas para un planeta',
      body: 'La superficie de Venus está a 737 K, unos 464 &deg;C, más caliente que la de Mercurio, que está mucho más cerca del Sol. Esta investigación pregunta qué daría la luz del Sol por sí sola a cada planeta y qué queda de más.\n\nLa <strong>temperatura de equilibrio</strong> es la de un cuerpo negro que irradia exactamente la luz solar que el planeta absorbe. Depende de la distancia al Sol y del <strong>albedo de Bond</strong>, la fracción de la luz solar que un planeta refleja. No es la temperatura del suelo: es lo que el planeta irradiaría al espacio si la luz del Sol fuera todo lo que hay. Usa el instrumento para compararla con la temperatura medida en la superficie. Los modelos de aquí dejan fuera la convección, las nubes y cualquier calor interior del planeta, y el instrumento lo dice.',
    },
    {
      title: 'La Tierra: solo la luz solar',
      body: 'Empieza por casa. Con el planeta en <strong>Tierra</strong> y su propio albedo, lee la <strong>temperatura de equilibrio</strong> de la Tierra y la diferencia <strong>medida menos de equilibrio</strong>.',
      fields: [
        { label: 'Temperatura de equilibrio de la Tierra' },
        { label: 'Temperatura medida en la superficie menos de equilibrio' },
      ],
    },
    {
      title: 'Venus: ¿más cerca, así que más caliente?',
      body: 'Venus está más cerca del Sol que la Tierra, así que recibe casi el doble de luz solar en lo alto de su atmósfera. Sus nubes además reflejan la mayor parte: su albedo de Bond es 0,76, frente al 0,306 de la Tierra.',
      prompt:
        'La temperatura de equilibrio de Venus, solo con la luz solar, sería&hellip;',
      options: [
        'más alta que la de la Tierra, cerca de 330 K, porque Venus está más cerca del Sol',
        'más o menos igual que la de la Tierra',
        'más baja que la de la Tierra, cerca de 230 K, porque sus nubes reflejan mucha luz solar',
        'cerca de 737 K, la temperatura medida en su superficie',
      ],
      misconceptions: [
        {
          say: 'Más cerca significa que llega más luz solar, pero un planeta se calienta con la luz solar que absorbe, y Venus refleja el 76 por ciento.',
        },
        {
          say: 'Esa es la temperatura medida en la superficie. La temperatura de equilibrio es lo que da la luz solar por sí sola, y el paso siguiente es averiguar cuánto se separan las dos.',
        },
      ],
      hints: [
        'Multiplica la luz solar en Venus por la fracción que absorbe, 1 − 0,76, y compara con el 1 − 0,306 de la Tierra.',
      ],
      because:
        'Venus absorbe solo una cuarta parte de la luz solar que le llega, y eso fija su temperatura de equilibrio cerca de 229 K, más fría que los 254 K de la Tierra. El paso siguiente la lee en el instrumento.',
    },
    {
      title: 'Venus: solo la luz solar',
      body: 'Pon el planeta en <strong>Venus</strong> y lee su temperatura de equilibrio, y la diferencia entre la temperatura medida en la superficie y ella.',
      fields: [
        { label: 'Temperatura de equilibrio de Venus' },
        { label: 'Temperatura medida en la superficie menos de equilibrio' },
      ],
    },
    {
      title: '¿Qué dice la diferencia?',
      body: 'La superficie de Venus está 508 K más caliente de lo que puede dejarla la luz solar sola.',
      prompt: '¿Cuál es la lectura más razonable de esa diferencia?',
      options: [
        'La atmósfera retiene calor: la superficie está más caliente que la temperatura que el planeta irradia al espacio',
        'Venus tiene una fuente de calor interna mucho mayor que la luz solar que absorbe',
        'El albedo de Venus debe de estar mal, porque un planeta más caliente reflejaría menos',
        'La luz solar en Venus es mucho más fuerte de lo que usa el modelo',
      ],
      misconceptions: [
        {
          say: 'Venus no tiene una fuente de calor interna de ese tamaño. El calor del interior de un planeta es una fracción pequeña de la luz solar que absorbe, salvo en los planetas gigantes.',
        },
        {
          say: 'Incluso con el albedo de la Tierra, la temperatura de equilibrio de Venus sería de unos 299 K, muy lejos de 737 K. La diferencia es demasiado grande para ser un error de albedo.',
        },
      ],
      hints: [
        'Compara la temperatura que el planeta irradia al espacio con la temperatura de su suelo.',
      ],
      because:
        'El planeta en conjunto irradia lo que absorbe, a 229 K, desde lo alto de la atmósfera. El suelo está mucho más caliente porque una atmósfera espesa que absorbe radiación infrarroja lleva el calentamiento desde el suelo hacia arriba a través de muchas capas: un efecto invernadero.',
    },
    {
      title: '¿La diferencia es siempre un efecto invernadero?',
      body: 'Recorre los demás cuerpos. Lee la diferencia de <strong>Marte</strong> (una atmósfera fina de dióxido de carbono) y la de <strong>Júpiter</strong>. Júpiter no tiene superficie: su fila compara el modelo con la temperatura del nivel de 1 bar, y Júpiter además emite calor propio.',
      fields: [
        { label: 'Marte: medida menos de equilibrio' },
        { label: 'Júpiter: medida (1 bar) menos de equilibrio' },
      ],
    },
    {
      title: '¿Una capa para Venus?',
      body: 'El efecto invernadero más sencillo es <strong>una capa</strong> que deja pasar la luz solar y absorbe una fracción del infrarrojo, la <em>emisividad</em>. El suelo que puede calentar es como mucho 2<sup>1/4</sup> = 1,19 veces la temperatura de equilibrio, por espesa que sea la capa. Pon el planeta en <strong>Venus</strong> y la emisividad en 1, lo máximo que puede hacer la capa, y lee la temperatura del suelo que da el modelo de una capa.',
      fields: [
        {
          label:
            'La temperatura del suelo más alta que una capa puede dar a Venus',
        },
      ],
    },
    {
      title: 'Una profundidad óptica para Venus',
      body: 'Una <strong>atmósfera gris</strong> es otro modelo: la opacidad es la misma en todas las longitudes de onda y la atmósfera tiene una <strong>profundidad óptica</strong>, una medida de lo opaca que es toda la columna. Una columna lo bastante gruesa puede calentar el suelo sin límite. Con el planeta en <strong>Venus</strong>, lee la profundidad óptica que da la temperatura superficial medida.',
      fields: [
        {
          label:
            'Profundidad óptica que da la temperatura superficial de Venus',
        },
      ],
    },
    {
      title: 'Lo que has deducido',
      body: 'La luz solar sola da a la Tierra 254 K y a Venus 229 K, y las superficies están a 288 K y 737 K: diferencias de 34 K y 508 K. Venus refleja la mayor parte de su luz solar, así que tiene la temperatura de equilibrio más fría y la superficie más caliente. La diferencia de Marte es una fracción de kelvin, y la de Júpiter no es en absoluto una diferencia de efecto invernadero. Una sola capa absorbente no puede dar a Venus más de 272 K; una atmósfera gris con una profundidad óptica de unos 142 sí puede. Son modelos de enseñanza: dejan fuera la convección, las nubes y la dependencia con la longitud de onda de la opacidad real, y el único número ajustado para Venus no es una medida de su atmósfera.',
    },
  ],
};

// Dos modelos de efecto invernadero: paso a paso con el inglés.
export const TWO_GREENHOUSE_MODELS = {
  title: 'Dos modelos de efecto invernadero',
  subtitle:
    'Una sola capa y una atmósfera gris, los mismos planetas y por qué los números difieren',
  objectives: [
    'Ajustar la temperatura superficial de la Tierra con una emisividad de una capa y con una profundidad óptica gris, y decir por qué los dos números difieren',
    'Decir qué significa el número libre de cada modelo y qué deja fuera cada uno',
    'Ver qué modelo puede alcanzar la temperatura superficial de Venus y cuál no',
    'Leer el perfil de temperatura de una atmósfera gris y el error de la aproximación de Eddington',
  ],
  steps: [
    {
      title: 'Dos maneras de modelar un efecto invernadero',
      body: 'Los dos modelos parten del mismo planeta: la luz solar llega, el planeta está en equilibrio de energía y la temperatura de equilibrio es aquella a la que irradia. Difieren en cómo la atmósfera absorbe el calor del suelo.\n\nEl modelo de <strong>una capa</strong> es una sola lámina con una <em>emisividad</em> entre 0 y 1. El modelo <strong>gris</strong> es una columna con una <em>profundidad óptica</em> de arriba abajo y la misma opacidad en todas las longitudes de onda, resuelto aquí con la aproximación de Eddington. Cada uno tiene un número libre y ninguno es el otro con otro nombre. Ajustarás los dos a la Tierra, Marte y Venus.',
    },
    {
      title: 'La Tierra en el modelo de una capa',
      body: 'Con el planeta en <strong>Tierra</strong>, lee la <strong>emisividad de una capa</strong> que da la temperatura superficial medida de la Tierra, 288 K.',
      fields: [{ label: 'Emisividad que da 288 K' }],
    },
    {
      title: 'La Tierra en el modelo gris',
      body: 'Ahora el modelo gris. Lee la <strong>profundidad óptica</strong> que da la temperatura superficial de la Tierra.',
      fields: [{ label: 'Profundidad óptica que da 288 K' }],
    },
    {
      title: 'El mismo planeta, números distintos',
      body: 'La Tierra necesita una emisividad de 0,79 en un modelo y una profundidad óptica de 0,87 en el otro.',
      prompt: '¿Por qué son distintos los dos números?',
      options: [
        'Son magnitudes distintas: una emisividad es la parte que absorbe una lámina, y una profundidad óptica fija lo opaca que es toda una columna, capa a capa',
        'Uno de los dos modelos está sencillamente mal para la Tierra y su número debe ignorarse',
        'La emisividad debe ser siempre igual a la profundidad óptica si los modelos son correctos',
        'La profundidad óptica cuenta las nubes y la emisividad no',
      ],
      misconceptions: [
        {
          say: 'Una emisividad no puede pasar de 1, y una profundidad óptica puede ser 142. No son la misma magnitud, y los modelos coinciden en una temperatura del suelo, no en lo que dicen de la atmósfera.',
        },
      ],
      hints: ['¿Cuál es el valor más grande que puede tomar cada número?'],
      because:
        'Los dos reproducen 288 K, y los dos se ajustan a la única medida. Lo que afirman de la atmósfera es distinto, y ninguno se ha medido: un número ajustado a una temperatura superficial no es una observación de la atmósfera.',
    },
    {
      title: 'Venus en los dos modelos',
      body: 'La superficie de Venus está a 737 K y su temperatura de equilibrio es 229 K.',
      prompt: '¿Qué modelo puede dar la temperatura superficial de Venus?',
      options: [
        'los dos, cada uno con una emisividad o profundidad óptica adecuada',
        'solo el modelo gris, con una profundidad óptica grande',
        'solo el modelo de una capa, con una emisividad cercana a 1',
        'ninguno: la luz solar sola no puede',
      ],
      misconceptions: [
        {
          say: 'Una capa tiene un techo: su suelo es como mucho 2^(1/4) veces la temperatura de equilibrio, por alta que sea la emisividad. El paso siguiente comprueba cuánto es eso para Venus.',
        },
      ],
      hints: [
        '¿Cuál es el suelo más caliente que puede dar una capa, como múltiplo de la temperatura de equilibrio?',
      ],
      because:
        'Solo el modelo gris. Una capa no puede pasar de 2^(1/4) = 1,19 veces la temperatura de equilibrio, 272 K para Venus, mientras que la temperatura del suelo de una atmósfera gris sigue subiendo con su profundidad óptica.',
    },
    {
      title: 'Venus: el techo y la profundidad',
      body: 'Pon el planeta en <strong>Venus</strong>. Lee la temperatura del suelo más alta que le puede dar una capa (emisividad 1) y la profundidad óptica que necesita el modelo gris.',
      fields: [
        {
          label:
            'La temperatura del suelo más alta que una capa puede dar a Venus',
        },
        {
          label:
            'Profundidad óptica que da la temperatura superficial de Venus',
        },
      ],
    },
    {
      title: 'Lo que has deducido',
      body: 'La Tierra necesita una emisividad de 0,79 en el modelo de una capa y una profundidad óptica de 0,87 en el modelo gris: dos números para un planeta, porque son dos magnitudes distintas. Venus necesita una profundidad óptica cercana a 142 en el modelo gris y no tiene solución en el de una capa, cuyo suelo no puede pasar de 1,19 veces la temperatura de equilibrio. Cada número se ajusta a una sola temperatura superficial; ninguno es una medida de la atmósfera. Los pasos más profundos miran Marte, el perfil dentro de una atmósfera gris y dónde la opacidad gris deja de ser una buena descripción.',
    },
  ],
};

export default {
  'why-venus-is-hot': WHY_VENUS_IS_HOT,
  'two-greenhouse-models': TWO_GREENHOUSE_MODELS,
};
