export const WHY_NOT_EARTH_ES = {
  title: 'Por qué no podemos ver la Tierra desde aquí',
  subtitle:
    'Dos problemas distintos separan a un telescopio de un planeta, un ángulo y un contraste: mira por qué un planeta como la Tierra a diez pársecs está fuera de alcance, y por qué λ/D no es el ángulo de trabajo interno de un coronógrafo',
  objectives: [
    'Decir que ver un planeta exige dos cosas, una separación en el cielo y un brillo frente a su estrella, y calcular cada una para un planeta a cierta distancia',
    'Decir qué es λ/D, y que el ángulo de trabajo interno de un coronógrafo es un número aparte, propio del instrumento, que λ/D no da',
    'Leer un veredicto de no observable con este instrumento y decir cuál de los dos problemas lo causó',
    'Decir por qué un gigante joven se puede fotografiar y un planeta como la Tierra no, y qué supone el panel de cada uno',
  ],
  steps: {
    'two-problems': {
      title: 'Dos problemas, no uno',
      body: `Un planeta junto a su estrella es difícil de ver por dos razones distintas. Tiene que estar lo bastante lejos de la estrella en el cielo para distinguirse de su luz: eso es un <strong>ángulo</strong>. Y tiene que ser lo bastante brillante frente al resplandor de la estrella: eso es un <strong>contraste</strong>, la luz del planeta dividida entre la de la estrella.\n\nEl panel pone a la Tierra alrededor de una estrella como el Sol, a diez pársecs, y deja cambiar el planeta, la distancia, el instrumento y la longitud de onda. Los cuatro instrumentos son <strong>ejemplos didácticos</strong>: sus ángulos de trabajo y sus pisos de contraste no son las especificaciones de ningún instrumento real.`,
    },
    'how-far-apart': {
      title: '¿A qué distancia de su estrella está la Tierra?',
      body: `Un observador a diez pársecs mira al Sol, y la Tierra está en su mayor separación de él, un cuarto de órbita a cada lado del Sol. Una unidad astronómica vista desde un pársec es un segundo de arco.`,
      prompt: '¿A qué distancia del Sol, en el cielo, está la Tierra?',
      options: [
        'Unos 0,0001 segundos de arco',
        'Unos 0,1 segundos de arco',
        'Unos 10 segundos de arco',
        'Aproximadamente un grado',
      ],
      hints: [
        'Una UA a un pársec es un segundo de arco. ¿Qué le pasa a un ángulo cuando la distancia se multiplica por diez?',
      ],
      because:
        'Unos 0,1 segundos de arco. Una UA vista desde un pársec subtiende un segundo de arco, por la definición del pársec, y el ángulo cae en proporción a la distancia, así que a diez pársecs es una décima de segundo de arco. El panel lee 0,100 segundos de arco con un ángulo de fase de 90 grados.',
    },
    'the-angle': {
      title: '¿Cuál es el problema difícil?',
      body: `El panel está en un telescopio espacial de 6 m a 0,55 micrómetros. Su escala de difracción λ/D es 0,019 segundos de arco, y la Tierra está a 0,100 segundos de arco de su estrella: 5,3 veces λ/D. La línea de contraste dice cuánto más débil que su estrella es el planeta.`,
      prompt:
        'Para este telescopio, ¿cuál es el principal obstáculo para ver la Tierra?',
      options: [
        'El ángulo: la Tierra está demasiado cerca de su estrella para separarla',
        'El contraste: la Tierra es unos 8500 millones de veces más débil que su estrella',
        'El telescopio es demasiado pequeño para recoger suficiente luz de la Tierra',
        'No hay ningún obstáculo',
      ],
      hints: [
        'Compara primero la separación con λ/D. ¿Está la Tierra más cerca de su estrella de lo que el telescopio puede distinguir?',
        'Luego lee la línea de contraste. ¿Cuántas veces más débil que su estrella es el planeta?',
      ],
      because:
        'El contraste. La Tierra está a 5,3 escalas de difracción de su estrella, así que solo por el ángulo un telescopio de 6 m podría distinguirlas; lo que hay que ver a través del resplandor es la luz reflejada del planeta, unos 1,2 × 10⁻¹⁰ de la de la estrella. Los dos problemas son distintos y un telescopio puede resolver uno sin el otro.',
      misconceptions: [
        {
          say: 'Recoger más luz ayuda, pero el planeta es débil comparado con la estrella, y la luz de la estrella también se recoge. Lo que importa es el cociente, y un espejo mayor no lo cambia.',
        },
      ],
    },
    'two-numbers': {
      title: 'Dos ángulos, por separado',
      body: `El panel está ahora en un telescopio espacial de 2,4 m a 0,55 micrómetros. λ/D es 0,047 segundos de arco y la Tierra está a 2,1 λ/D de su estrella. El instrumento de ejemplo tiene un ángulo de trabajo interno de 3 λ/D: un número elegido para este ejemplo didáctico, no una especificación citada.`,
      prompt: '¿Qué dice el panel, y qué muestra sobre los dos ángulos?',
      options: [
        'Observable: la Tierra está más lejos de su estrella que λ/D, el límite del telescopio',
        'No observable con este instrumento: la Tierra está dentro de su ángulo de trabajo interno, que es del instrumento y un número aparte de λ/D',
        'No observable: el telescopio es menor que el límite de difracción',
        'El panel no puede decirlo',
      ],
      hints: [
        'Lee la línea del ángulo de trabajo interno. ¿Es el mismo número que λ/D?',
      ],
      because:
        'No observable con este instrumento. λ/D es la escala de difracción del telescopio. El ángulo de trabajo interno de un coronógrafo es donde la supresión de la luz de la estrella de ese instrumento empieza a funcionar: lo fijan la máscara y el control del frente de onda, difiere entre instrumentos y se declara para el instrumento en lugar de derivarse de λ/D. Aquí la Tierra está dentro de los 3 λ/D del ejemplo.',
      misconceptions: [
        {
          say: 'λ/D es la escala en la que un telescopio difumina un punto de luz. Un coronógrafo elimina luz estelar dentro de su propio ángulo de trabajo interno, que es otra cantidad: suele ser unas veces λ/D, y el número es del instrumento.',
        },
      ],
    },
    'the-infrared': {
      title: 'Pasemos al infrarrojo',
      body: `La Tierra también brilla con su propio calor, y un planeta a unos 254 kelvin irradia más cerca de 11 micrómetros. Pon la longitud de onda en 10 micrómetros para el telescopio de 6 m y mira el gráfico: la curva térmica sube por encima de la reflejada. La escala de difracción crece en proporción a la longitud de onda.`,
      prompt: '¿Qué hace pasar de 0,55 a 10 micrómetros?',
      options: [
        'Hace más fáciles los dos problemas',
        'Alivia el contraste a unos doce millones de veces más débil, y empeora el ángulo: λ/D crece a 0,34 segundos de arco y la Tierra está a 0,3 λ/D de su estrella',
        'No cambia ninguno',
        'Empeora el contraste y mejora el ángulo',
      ],
      hints: [
        'Lee otra vez las dos líneas a 10 micrómetros: el contraste, y la separación en λ/D.',
      ],
      because:
        'Cambia un problema por el otro. A 10 micrómetros el calor propio del planeta lo hace solo unos doce millones de veces más débil que su estrella en lugar de unos 8500 millones, pero λ/D es 18 veces mayor, 0,34 segundos de arco, así que la Tierra queda a 0,3 λ/D, muy dentro de cualquier ángulo de trabajo. Elegir una longitud de onda es elegir qué problema tener.',
    },
    'what-it-would-take': {
      title: 'Lo que haría falta',
      body: `De los cuatro ejemplos solo el instrumento de 6 m en luz visible ve la Tierra, y solo porque su piso de contraste de 10⁻¹⁰ se eligió justo por debajo de los 1,2 × 10⁻¹⁰ de la Tierra: es un experimento mental sobre lo que tendría que hacer un telescopio, no una afirmación sobre ninguna misión. Ver un planeta como la Tierra exige un ángulo de trabajo menor de 0,1 segundos de arco a una longitud de onda dada y una supresión de la luz de la estrella que llegue al contraste del planeta.\n\nEl panel no modela la supresión misma: ni coronógrafo, ni ruido de moteado, ni tiempo de exposición. Lo que dice es una condición necesaria.`,
    },
  },
};

export const WHY_NOT_EARTH_DEEPER_ES = {
  steps: {
    'read-the-contrast': {
      title: 'El contraste de la Tierra',
      body: `Con la Tierra a un ángulo de fase de 90 grados y el instrumento de 6 m en luz visible, lee la línea de contraste: la luz reflejada como fracción de la de la estrella. Dala como múltiplo de 10⁻¹⁰.`,
      fields: [{ label: 'Contraste reflejado, en unidades de 10⁻¹⁰' }],
    },
    'phase-trade': {
      title: 'La mejor fase no es el mejor lugar',
      body: `Mueve el ángulo de fase entre 0 y 180 grados. La separación en el cielo es el radio de la órbita por el seno del ángulo de fase, y la luz reflejada sigue la función de fase de Lambert, que es mayor con ángulo de fase 0.`,
      prompt:
        '¿Dónde es más brillante la Tierra, y dónde está más lejos de su estrella?',
      options: [
        'Más brillante y más lejos con el mismo ángulo de fase',
        'Más brillante con ángulo de fase 0, donde está detrás de su estrella y la separación es cero; más lejos a 90 grados, donde es unas 3,1 veces más débil',
        'Más brillante a 90 grados y más lejos a 0',
        'Ninguna depende del ángulo de fase',
      ],
      hints: ['Lee la separación y el contraste reflejado a 0 y a 90 grados.'],
      because:
        'Más brillante con ángulo de fase 0, más lejos a 90 grados. Con ángulo de fase 0 el planeta está totalmente iluminado y es 3,7 × 10⁻¹⁰ de la luz de la estrella, pero está detrás de la estrella y su separación es cero; a 90 grados está tan lejos de la estrella como puede estar, 0,100 segundos de arco, y la función de fase de Lambert ha caído a 1/π, así que es unas 3,1 veces más débil. Un observador toma un compromiso entre ambos.',
    },
    'young-giant-angle': {
      title: 'Un planeta que se puede ver',
      body: `Elige el gigante joven, 10 pársecs, un ángulo de fase de 90 grados y el instrumento de 8 m en infrarrojo cercano. El gigante joven es un sustituto a 30 UA de una estrella fría. Lee a cuántas escalas de difracción λ/D está de su estrella.`,
      fields: [{ label: 'Separación en λ/D' }],
    },
    'own-heat': {
      title: 'Su propio calor',
      body: `Lee la línea de temperatura del gigante joven. La luz de la estrella sola lo calentaría solo a 25 kelvin, porque está a 30 UA de una estrella fría, pero el panel lo dibuja a 1500 kelvin, la temperatura indicada para él. El contraste es un cuerpo negro a esa temperatura.`,
      prompt:
        'Di por qué un gigante joven se puede fotografiar y un planeta como la Tierra no, di qué supone el panel sobre la temperatura del gigante y di qué deja fuera un cuerpo negro a 1500 kelvin.',
      rubric:
        'Crédito por decir que el gigante es brillante porque irradia su calor almacenado (unos 1500 K frente a 25 K de la luz estelar), así que su contraste, de unos 10⁻⁶ a 10⁻³ según la longitud de onda, es mucho mayor que los 10⁻¹⁰ reflejados de una Tierra, y que a 30 UA además está lejos de su estrella en ángulo; por decir que el panel toma la temperatura como indicada y dibuja un cuerpo negro, no un espectro calculado; y por nombrar algo que un cuerpo negro deja fuera (bandas de absorción molecular, nubes, la evolución de la temperatura con la edad, una temperatura que no es un solo número). No califiques la longitud.',
      rubricCriteria: [
        {
          name: 'Explica el gigante frente a la Tierra',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que el gigante brilla con su propio calor, lo que hace su contraste millones de veces mayor que la luz reflejada de la Tierra, y que su órbita amplia ayuda en el ángulo.',
            },
            {
              label: 'Aún no',
              text: 'Dice que es mayor o más cercano, o no da ninguna razón.',
            },
          ],
        },
        {
          name: 'Declara el supuesto',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la temperatura es indicada, no derivada de la luz de la estrella, y que el contraste es un cuerpo negro a ella.',
            },
            {
              label: 'Aún no',
              text: 'Trata los 1500 K como calculados, o no los menciona.',
            },
          ],
        },
        {
          name: 'Nombra lo que deja fuera un cuerpo negro',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra una entre bandas de absorción, nubes, la edad y el enfriamiento del planeta, o una temperatura que varía.',
            },
            {
              label: 'Aún no',
              text: 'No nombra nada.',
            },
          ],
        },
      ],
    },
  },
};

export const ARCHITECTURES_ES = {
  title: 'Arquitecturas',
  subtitle:
    'Los planetas con imagen directa y los planetas del sistema solar en un diagrama logarítmico: mira qué puede encontrar la imagen directa, y por qué eso no es un retrato de los planetas que existen',
  objectives: [
    'Leer un diagrama logarítmico de semieje mayor contra masa y colocar en él los planetas del sistema solar y los planetas con imagen directa',
    'Decir qué tienen en común los planetas con imagen directa y por qué la muestra está seleccionada por lo que un instrumento puede ver',
    'Calcular con un panel cuántos planetas quedan fuera del ángulo de trabajo interno de un instrumento de ejemplo',
    'Decir qué no muestra el diagrama sobre los planetas que existen, y nombrar lo que haría falta para una afirmación sobre poblaciones',
  ],
  steps: {
    'two-kinds-of-system': {
      title: 'Nosotros y los planetas con imagen directa',
      body: `El diagrama pone los ocho planetas del sistema solar y los planetas del Archivo de Exoplanetas de la NASA que se hallaron por imagen directa en una escala logarítmica: a qué distancia orbita cada uno y cuánta masa tiene. Una escala logarítmica da el mismo espacio a un factor de diez donde sea, así que Mercurio y un planeta a 500 UA pueden compartir la página.\n\nLos planetas con imagen directa se listan como los tiene el archivo: una distancia al Sol, un semieje mayor y, para la mayoría, una masa. Lee cómo se colocan los dos grupos.`,
    },
    'where-do-they-sit': {
      title: '¿Dónde se colocarán?',
      body: `Mira los planetas del sistema solar en el diagrama, de Mercurio a Neptuno a 30 UA, y de la Tierra, con cerca de un tercio de uno por ciento de la masa de Júpiter, a Júpiter mismo.`,
      prompt:
        'Comparados con ellos, ¿dónde se colocan la mayoría de los planetas con imagen directa?',
      options: [
        'Cerca, como Mercurio y Venus',
        'Entre los planetas del sistema solar, entre la Tierra y Júpiter',
        'En su mayoría más lejos que Neptuno y más pesados que Júpiter',
        'En su mayoría más ligeros que la Tierra',
      ],
      hints: [
        'Piensa en lo que un telescopio puede separar del resplandor de una estrella, y en lo que es lo bastante brillante para verse.',
      ],
      because:
        'En su mayoría más lejos que Neptuno y más pesados que Júpiter: 70 de los 94 planetas con imagen directa que tienen semieje y masa están más allá de los 30 UA de Neptuno, y 93 son más pesados que Júpiter. Quedan arriba y a la derecha del sistema solar.',
    },
    'the-median-planet': {
      title: 'El planeta típico con imagen directa',
      body: `Lee la línea de los planetas con imagen directa: el semieje mayor mediano y la masa mediana.`,
      prompt: '¿Cómo es el planeta mediano con imagen directa?',
      options: [
        'A unos 1 UA de su estrella y con la masa de la Tierra',
        'A unos 5 UA y con la masa de Júpiter',
        'A unos 170 UA y con unas 12 masas de Júpiter',
        'A unos 0,05 UA y con 0,5 masas de Júpiter',
      ],
      hints: ['Lee en el panel el semieje mayor mediano y la masa mediana.'],
      because:
        'A unos 170 UA y con unas 12 masas de Júpiter: un planeta mucho más lejano que Neptuno y más masivo que Júpiter, cerca del límite entre planetas y enanas marrones. Nada así hay en el sistema solar.',
    },
    'why-so-wide': {
      title: '¿Por qué todos son lejanos y pesados?',
      body: `Cambia el gráfico a ángulo y masa. La línea verde es el ángulo de trabajo interno del instrumento de ejemplo. Los planetas con imagen directa se colocan en el ángulo que dan su semieje y su distancia.`,
      prompt:
        '¿Por qué la muestra con imagen directa es tan distinta del sistema solar?',
      options: [
        'Los planetas se forman así alrededor de otras estrellas',
        'La muestra está seleccionada por lo que un instrumento puede ver: un planeta tiene que estar lo bastante lejos de su estrella y ser lo bastante brillante, lo que favorece planetas lejanos, masivos y jóvenes',
        'Los planetas del sistema solar no son planetas',
        'El archivo lista solo estrellas poco comunes',
      ],
      hints: [
        '¿Qué dos cosas debe cumplir un planeta para fotografiarse? El panel las nombra en Por qué no podemos ver la Tierra desde aquí.',
      ],
      because:
        'La muestra está seleccionada por lo que un instrumento puede ver. Un planeta tiene que estar fuera del ángulo de trabajo y por encima del piso de contraste, lo que favorece planetas lejanos de su estrella y que brillan con su propio calor: masivos y jóvenes. Los planetas con imagen directa son los que se pueden fotografiar. Dicen poco sobre los planetas que existen.',
      misconceptions: [
        {
          say: 'Una muestra es lo que encuentra un método. Un método que solo puede hallar planetas lejanos y masivos solo halla esos, haya lo que haya. Para decir cuán comunes son planetas como Júpiter o la Tierra, un sondeo debe contar las estrellas que buscó y los planetas que podría haber hallado.',
        },
      ],
    },
    'our-system-from-afar': {
      title: 'Nuestro sistema, visto desde diez pársecs',
      body: `Pon el instrumento en el ejemplo de 2,4 m en luz visible, visto desde 10 pársecs. Su ángulo de trabajo interno es 0,142 segundos de arco. El panel dice cuántos de los planetas del sistema solar quedan fuera. Aquí solo juzga la separación, no el contraste.`,
      prompt:
        '¿Cuántos de los ocho planetas quedan fuera del ángulo de trabajo?',
      options: ['Los ocho', 'Cinco de los ocho', 'Dos de los ocho', 'Ninguno'],
      hints: [
        'Lee la última línea del panel: el ángulo de trabajo de ejemplo y la cuenta.',
      ],
      because:
        'Cinco de los ocho. Mercurio, Venus y la Tierra están a 0,039, 0,072 y 0,100 segundos de arco, dentro de 0,142; Marte y los cuatro gigantes están fuera. Incluso con un ángulo tan grande, los tres planetas interiores no podrían separarse de la estrella, y el contraste aún no se ha juzgado.',
    },
    'what-the-diagram-says': {
      title: 'Lo que dice el diagrama',
      body: `Los planetas con imagen directa son lejanos, masivos y jóvenes, porque esos son los que un telescopio puede distinguir del resplandor de la estrella. El sistema solar no es raro por ser distinto de ellos; ellos son distintos por cómo se hallaron. Una afirmación sobre cuán comunes son los planetas necesita un sondeo que cuente las estrellas que buscó y los planetas que podría haber visto, con una tasa y su incertidumbre.\n\nLas próximas investigaciones toman los planetas de un método a la vez. Esta dibujó los planetas de un método.`,
    },
  },
};

export const ARCHITECTURES_DEEPER_ES = {
  steps: {
    'count-the-seen': {
      title: '¿Cuántos quedan fuera?',
      body: `Elige el gráfico de ángulo y masa y el ejemplo de 0,25 m en luz visible. Su ángulo de trabajo interno es 1,36 segundos de arco. Lee cuántos de los planetas con imagen directa que tienen distancia quedan fuera.`,
      fields: [
        { label: 'Planetas con imagen directa fuera del ángulo de trabajo' },
      ],
    },
    'median-orbit-and-mass': {
      title: 'El planeta mediano con imagen directa',
      body: `Lee las medianas de los planetas con imagen directa que tienen semieje y masa: el semieje mayor en UA y la masa en masas de Júpiter.`,
      fields: [{ label: 'Semieje mayor mediano' }, { label: 'Masa mediana' }],
    },
    'is-ours-unusual': {
      title: '¿Es raro el sistema solar?',
      body: `Alguien lee el diagrama y dice: el sistema solar no tiene ningún planeta a 170 UA y 12 masas de Júpiter, así que es raro. Lee la línea de la fuente: la tabla es la lista del archivo de planetas hallados por imagen directa, sin las referencias de cada planeta.`,
      prompt:
        'Di qué supone la afirmación, di por qué el diagrama no puede sostenerla y di qué tendría que informar un sondeo antes de poder hacerlo.',
      rubric:
        'Crédito por decir que la afirmación trata la muestra con imagen directa como una muestra de todos los sistemas planetarios cuando está seleccionada por lo que los instrumentos podían ver (fuera de un ángulo de trabajo, por encima de un piso de contraste, jóvenes y masivos); por señalar que los mismos instrumentos no habrían podido fotografiar un planeta del sistema solar, que es lo que muestra el gráfico de ángulo a 10 pársecs; y por decir que una afirmación sobre poblaciones necesita el número de estrellas buscadas, los planetas que podrían haberse hallado, la probabilidad de detección según órbita y masa, y una tasa con su incertidumbre. No califiques la longitud.',
      rubricCriteria: [
        {
          name: 'Identifica la selección',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la muestra con imagen directa está seleccionada por ángulo, contraste y juventud, y que los planetas del sistema solar no se fotografiarían con los mismos instrumentos.',
            },
            {
              label: 'Aún no',
              text: 'Acepta la muestra como típica, o dice que está mal sin una razón.',
            },
          ],
        },
        {
          name: 'Usa el panel',
          levels: [
            {
              label: 'Completo',
              text: 'Cita el ángulo al que están los planetas del sistema solar a diez pársecs o la cuenta fuera de un ángulo de trabajo.',
            },
            {
              label: 'Aún no',
              text: 'Hace el argumento sin un número del panel.',
            },
          ],
        },
        {
          name: 'Dice qué necesita un sondeo',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra las estrellas buscadas, la probabilidad de detección y una tasa con su incertidumbre.',
            },
            {
              label: 'Aún no',
              text: 'No nombra ninguna.',
            },
          ],
        },
      ],
    },
  },
};
