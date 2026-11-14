export const DEEP_OR_WIDE_ES = {
  title: '¿Profundo o ancho?',
  subtitle:
    'Las mismas noches pueden alcanzar fuentes débiles en un área pequeña o fuentes brillantes en un área grande: cuál encuentra más depende de la clase de fuente',
  objectives: [
    'Predecir si exposiciones largas sobre un área pequeña o cortas sobre un área grande encuentran más fuentes de una clase cuyos conteos crecen con fuerza',
    'Leer en el panel la exposición que encuentra más fuentes y decir que la pendiente de los conteos de la clase lo decide, con 0,8 dex por magnitud como punto de equilibrio',
    'Decir qué compra un umbral de detección más bajo (más fuentes) y qué cuesta (más falsas)',
  ],
  steps: {
    'two-ways-to-spend-the-nights': {
      title: 'Dos formas de gastar las noches',
      body: 'Diez noches en un telescopio de un metro. Puedes tomar exposiciones largas: cada apuntado alcanza fuentes débiles, pero las noches compran pocos apuntados. O exposiciones cortas: cada apuntado es poco profundo, pero hay muchos. El panel muestra el <strong>área observada</strong> y las <strong>fuentes encontradas</strong> frente a la exposición, para una <em>clase</em> de fuente cuyos conteos crecen con la profundidad según una pendiente declarada.\n\nLa clase es un modelo didáctico, una ley de potencias con pendiente declarada, no una población real; todo número es un modelo con los límites que el panel enumera.',
    },
    'predict-deep-or-wide': {
      title: '¿Cuál encuentra más?',
      body: 'Una clase de fuente cuyos conteos crecen <em>con fuerza</em> con la profundidad: por cada magnitud más débil, unas diez veces más fuentes (una pendiente de 1,0 dex por magnitud). Las mismas diez noches se gastan en exposiciones largas sobre un área pequeña o en cortas sobre un área grande.',
      prompt: '¿Qué estrategia encuentra más de esta clase?',
      options: [
        'Profundo: las exposiciones largas, porque cada magnitud extra trae tantas fuentes más que compensa el área cedida',
        'Ancho: las exposiciones cortas, porque más cielo es siempre mejor que más profundidad',
        'Encuentran lo mismo, porque el tiempo de telescopio es el mismo',
        'No se puede decir sin conocer el telescopio',
      ],
      hints: [
        'La profundidad limitada por el cielo gana una magnitud por cada 2,5 veces la exposición (1,25 mag por década); el área cae como uno entre la exposición.',
      ],
      because:
        'La profundidad limitada por el cielo gana 1,25 magnitudes por década de exposición, así que los conteos por grado cuadrado crecen como la exposición elevada a 1,25 veces la pendiente, mientras el área cae como uno entre la exposición. Con pendiente 1,0 el producto sigue creciendo (con exponente 0,25): gana lo profundo.',
    },
    'euclid-best': {
      title: 'Una clase con la pendiente euclídea',
      body: 'Primero una clase con la pendiente que dan las fuentes repartidas por igual en el espacio, 0,6 dex por magnitud. Lee la fila <em>Mejor exposición</em>: la exposición con la que se encuentran más fuentes.',
      fields: [{ label: 'La exposición que encuentra más fuentes' }],
    },
    'steep-class': {
      title: 'Una clase con pendiente empinada',
      body: 'Ahora la clase de la predicción, pendiente 1,0. Lee la exposición que encuentra más fuentes. ¿Hay una mejor interior, o llega al extremo del control?',
      fields: [{ label: 'La exposición que encuentra más fuentes' }],
    },
    'what-decides-it': {
      title: '¿Qué lo decide?',
      body: 'La clase euclídea (0,6) tiene una mejor exposición en el medio; la empinada (1,0) llega a la más larga.',
      prompt: '¿Qué propiedad de la clase decide entre profundo y ancho?',
      options: [
        'Con qué rapidez crecen sus conteos con la profundidad: gana lo profundo solo donde crecen más rápido que 0,8 dex por magnitud',
        'Qué tan brillante es su fuente más brillante',
        'Qué tan grande es el telescopio',
        'Cuántas noches hay',
      ],
      misconceptions: [
        {
          say: 'El telescopio fija hasta dónde llega una exposición; los conteos de la clase fijan si esa profundidad compensa.',
        },
      ],
      hints: ['Compara 1,25 veces la pendiente con 1.'],
      because:
        'Los conteos encontrados van como la exposición elevada a 1,25 veces la pendiente menos 1, limitados por el cielo. Eso es positivo (gana lo profundo) por encima de una pendiente de 0,8 y negativo (gana lo ancho) por debajo.',
    },
    'the-rule-and-its-limits': {
      title: 'Una regla con límites',
      body: 'Gana lo profundo donde los conteos crecen más rápido que 0,8 dex por magnitud, y lo ancho donde crecen más despacio: las galaxias débiles reales se aplanan por debajo de eso, y por eso dominan los censos anchos. Los conteos aquí son solo de Poisson (sin agrupamiento), las clases son leyes de potencias declaradas y el tiempo es una fracción despejada supuesta. Un censo real pondría a prueba la regla con sus propios conteos.',
    },
  },
};

export const DEEP_OR_WIDE_DEEPER_ES = {
  steps: {
    'the-exponent': {
      title: 'El exponente',
      body: 'Limitada por el cielo, la profundidad gana 1,25 magnitudes por década de exposición y el área cae como uno entre la exposición.',
      prompt:
        'Para una clase con pendiente 1,0, las fuentes encontradas van como la exposición elevada a p. ¿Cuánto vale p?',
      hints: ['1,25 veces la pendiente, menos 1.'],
      because:
        'Los conteos por grado cuadrado van como la exposición elevada a 1,25 veces la pendiente, y el área como la exposición a menos uno: 1,25 - 1 = 0,25.',
    },
    'the-rule-undershoots': {
      title: '¿Encuentra la regla la mejor exposición?',
      body: 'Para la clase aplanada (pendiente 0,4) el panel da tanto la exposición que encuentra más fuentes como la estimación de la regla limitada por el cielo, 1,25 veces la pendiente entre uno menos eso, por el tiempo muerto. Lee ambas.',
      fields: [
        { label: 'Mejor exposición encontrada' },
        { label: 'La regla limitada por el cielo da' },
      ],
    },
    'a-lower-threshold': {
      title: 'Profundidad frente a contaminación',
      body: 'Bajar el umbral de detección encuentra fuentes más débiles, pero los picos de ruido también lo superan. Para la clase empinada en el telescopio de un metro, 31,6 s por visita, diez noches, a <strong>3 sigma</strong>: lee la profundidad y la parte de las detecciones que son reales.',
      fields: [
        { label: 'Profundidad en el umbral' },
        { label: 'Fiabilidad, la parte real de las detecciones' },
      ],
    },
    'what-a-threshold-costs': {
      title: 'Lo que cuesta un umbral',
      body: 'A 3 sigma el censo es media magnitud más profundo y encuentra muchas más fuentes, con una de cada diez falsa.',
      prompt: 'Para una clase rara, ¿qué le pasa a la fiabilidad a 3 sigma?',
      options: [
        'Cae mucho más: los falsos positivos no dependen de la clase, así que ahogan a una clase rara',
        'Se mantiene igual, porque la tasa de falsos es propia del umbral solo para las fuentes reales',
        'Sube, porque una clase rara es más fácil de distinguir',
        'No se puede decir',
      ],
      hints: [
        'Los falsos positivos por grado cuadrado dependen del ruido y del umbral, no de la clase.',
      ],
      because:
        'El número de detecciones falsas por grado cuadrado es la cola del ruido sobre el umbral por el número de elementos independientes: no depende de cuántas fuentes reales haya, así que cuantas menos haya, mayor es la parte falsa. Para una clase rara a 3 sigma puede superar la mitad.',
    },
  },
};

export const TWO_TELESCOPES_ES = {
  title: 'Dos telescopios, una pregunta',
  subtitle:
    'La misma profundidad sobre la misma área con un telescopio de un metro y uno de 8,4 metros: cuánto más tarda el pequeño, y por qué',
  objectives: [
    'Predecir cuánto más tarda un telescopio de un metro que uno de 8,4 metros en alcanzar la misma profundidad sobre la misma área',
    'Leer en el panel las visitas, los apuntados y las horas que necesita cada instalación, y su cociente',
    'Decir que dos cosas lo fijan: la luz que reúne cada apuntado (profundidad) y el campo que cubre (área)',
  ],
  steps: {
    'one-goal-two-telescopes': {
      title: 'Un objetivo, dos telescopios',
      body: 'El objetivo: llegar a la magnitud 23 sobre 10 grados cuadrados, con 100 s por visita. El panel da, para cada instalación, las visitas que debe apilar en cada apuntado para alcanzar la profundidad, los apuntados para cubrir el área y las horas. Las dos instalaciones son el Las Cumbres de 1,0 m con un campo de 0,2 grados cuadrados y Rubin (8,4 m, 9,6 grados cuadrados); su rendimiento es un valor supuesto y el campo, la escala de píxel y el tiempo muerto vienen de la tabla citada.',
    },
    'predict-the-ratio': {
      title: '¿Cuánto más?',
      body: 'Rubin reúne unas 70 veces la luz del telescopio de un metro y cubre unas 50 veces el cielo en cada apuntado.',
      prompt:
        '¿Cómo se compara el tiempo que necesita Rubin para este objetivo con el del telescopio de un metro?',
      options: [
        'Más o menos igual: la cámara es el mismo tipo de detector',
        'Unas 10 veces menos',
        'Unas 60 veces menos',
        'Unas 600 veces menos',
      ],
      hints: [
        'Ambas ventajas ayudan, pero Rubin alcanza la profundidad en una visita y el pequeño en dos.',
      ],
      because:
        'El telescopio de un metro necesita dos visitas apiladas en cada uno de 52 apuntados (3,8 horas); Rubin alcanza la profundidad en una visita y necesita 2 apuntados (3,7 minutos): unas 60 veces menos.',
    },
    'read-the-hours': {
      title: 'Lee las horas',
      body: 'Lee las horas que necesita la primera instalación (el telescopio de un metro) y el cociente de la segunda entre la primera.',
      fields: [
        { label: 'Horas del telescopio de un metro' },
        { label: 'La segunda tarda este número de veces lo que la primera' },
      ],
    },
    'why-so-much': {
      title: '¿Por qué tanto?',
      body: 'El cociente es de aproximadamente 1 entre 65.',
      prompt: '¿Qué dos ventajas del telescopio grande se combinan para darlo?',
      options: [
        'Su espejo mayor alcanza la profundidad con menos visitas (profundidad por apuntado), y su campo más ancho necesita muchos menos apuntados (área por apuntado)',
        'Solo su espejo: el campo no importa',
        'Solo su campo: el espejo no importa',
        'Su sitio más alto: el cielo es el mismo para ambos',
      ],
      hints: [
        'Cuenta las visitas y los apuntados que necesita cada instalación.',
      ],
      because:
        'El tiempo es los apuntados por las visitas por el coste de una visita. Rubin necesita 26 veces menos apuntados y un apilado menor, así que el producto cae unas 65 veces.',
    },
    'two-limits-of-the-comparison': {
      title: 'Límites de la comparación',
      body: 'Ambas instalaciones toman la misma exposición por visita y el mismo umbral de detección, con un rendimiento supuesto de 0,5 y la misma fracción despejada; los apuntados no se solapan. Otra exposición cambia la respuesta: un telescopio pequeño con una exposición más larga desperdicia menos tiempo en tiempo muerto. El cociente es un modelo para una conversación de planificación, no un pronóstico.',
    },
  },
};

export const TWO_TELESCOPES_DEEPER_ES = {
  steps: {
    'the-field-ratio': {
      title: 'El cociente de campos',
      body: 'Cada apuntado de Rubin cubre 9,6 grados cuadrados y cada uno del telescopio de un metro 0,195.',
      prompt: '¿Cuántas veces más cielo cubre un apuntado de Rubin?',
      hints: ['Divide los dos campos.'],
      because:
        '9,6 / 0,195 = 49,2: 52 apuntados frente a 2 es el mismo factor salvo el redondeo a apuntados enteros.',
    },
    'the-fixed-exposure': {
      title: 'Una exposición fija',
      body: 'Ambas instalaciones toman 100 s por visita.',
      prompt:
        '¿Por qué una exposición distinta puede cambiar qué instalación parece mejor?',
      options: [
        'Cada visita cuesta un tiempo muerto que la exposición no cambia, así que una exposición corta desperdicia una parte mayor en una instalación de tiempo muerto largo, y una exposición más profunda de lo que pide el objetivo desperdicia tiempo',
        'La exposición no importa: solo el espejo y el campo',
        'Una exposición más larga favorece siempre al telescopio mayor',
        'El detector se satura a los 100 s',
      ],
      hints: [
        'Compara los 28 s de tiempo muerto del telescopio de un metro con su visita de 100 s.',
      ],
      because:
        'El tiempo por apuntado es las visitas por (exposición más tiempo muerto); una exposición mucho más corta o más profunda de lo que pide el objetivo cambia esa mezcla. La comparación es función de la exposición.',
    },
  },
};

export const PROPOSE_AN_OBSERVATION_ES = {
  title: 'Propón una observación',
  subtitle:
    'Diseña un censo para un objetivo declarado, predice qué encontrará, compruébalo con el modelo y justifica el plan: muchos planes son correctos',
  objectives: [
    'Elegir una instalación, exposición, visitas, noches y umbral que cumplan una profundidad, un área y una fiabilidad declaradas, y decir qué encontrará el plan antes de comprobarlo',
    'Justificar la elección por lo que cede, y nombrar una alternativa que también cumpla el objetivo',
    'Decir qué deja fuera el modelo (agrupamiento, una población real, el tiempo) y qué le hace al intervalo del conteo',
  ],
  steps: {
    'the-brief': {
      title: 'El encargo',
      body: 'Tienes <strong>diez noches</strong>. Encuentra fuentes de la <em>clase aplanada</em> (conteos que crecen 0,4 dex por magnitud) hasta una profundidad de <strong>magnitud 22,5</strong>, sobre al menos <strong>100 grados cuadrados</strong>, con al menos un <strong>95 por ciento</strong> de las detecciones reales. Hay tres instalaciones: los telescopios Las Cumbres de 0,35 m y de 1,0 m y Rubin. Explora con el panel y propón después un plan.\n\nNo hay un único plan correcto. Se comprueba si tu plan cumple el objetivo y si lo que dices que alcanza coincide con él.',
    },
    'propose-a-plan': {
      title: 'Propón un plan',
      body: 'Introduce tu plan: la instalación, la exposición, las visitas apiladas, las noches (como máximo 10) y el umbral de detección. Después di qué alcanza: la profundidad (la magnitud a la que se encuentra la mitad de las fuentes) y el número de fuentes encontradas por grado cuadrado. Ambas son predicciones que puedes comprobar en el panel.',
      fields: [
        {
          label:
            'Instalación, contada desde 1: 1 LCO 0,35 m, 2 LCO 1,0 m, 3 Rubin 8,4 m',
        },
        { label: 'Exposición por visita' },
        { label: 'Visitas apiladas' },
        { label: 'Noches' },
        { label: 'Umbral de detección (en sigma)' },
        { label: 'Profundidad que alcanza tu plan (se encuentra la mitad)' },
        { label: 'Fuentes que encuentra tu plan por grado cuadrado' },
      ],
    },
    'justify-the-plan': {
      title: '¿Por qué este plan?',
      body: 'Un plan es un conjunto de compromisos. Di a qué renuncia el tuyo.',
      prompt:
        '¿Por qué este plan? Di a qué renunciaste y nombra un plan distinto que también habría cumplido el objetivo y por qué no lo elegiste.',
      rubric:
        'Crédito por nombrar un compromiso real (profundidad frente a área, umbral frente a falsos positivos, tiempo muerto frente a exposición), por un segundo plan que sí cumpla el objetivo (por ejemplo otra instalación) y por decir qué deja fuera el modelo (agrupamiento, una población real, el tiempo). Cualquier plan que la pantalla aceptó es una respuesta válida; no califique la elección, califique el razonamiento.',
      rubricCriteria: [
        {
          name: 'El plan cumple el objetivo',
          levels: [
            {
              label: 'Completo',
              text: 'El plan propuesto fue aceptado: viable y coherente.',
            },
            {
              label: 'Aún no',
              text: 'El plan no fue aceptado, o no se introdujo ninguno.',
            },
          ],
        },
        {
          name: 'Nombra el compromiso',
          levels: [
            {
              label: 'Completo',
              text: 'Dice a qué renuncia el plan y por qué valió la pena.',
            },
            { label: 'Aún no', text: 'Repite el plan sin un compromiso.' },
          ],
        },
        {
          name: 'Un plan válido distinto',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra una alternativa que también cumple el objetivo.',
            },
            {
              label: 'Aún no',
              text: 'No nombra ninguna, o una que no cumple el objetivo.',
            },
          ],
        },
        {
          name: 'Lo que deja fuera el modelo',
          levels: [
            {
              label: 'Completo',
              text: 'Dice qué no incluye el intervalo del conteo (agrupamiento, una población real, el tiempo).',
            },
            {
              label: 'Aún no',
              text: 'Trata el intervalo como toda la incertidumbre.',
            },
          ],
        },
      ],
      hints: [
        'Dos planes en instalaciones distintas pueden cumplir este objetivo.',
      ],
    },
    'two-valid-plans': {
      title: 'Muchos planes, un objetivo',
      body: 'El telescopio de un metro con unos 60 s por visita durante diez noches, Rubin con unos 30 s y el de 0,35 m con unos 1000 s cumplen este objetivo; un umbral de 3 sigma profundiza cada uno pero incumple la fiabilidad. La pantalla juzga la viabilidad y la coherencia, nunca una respuesta única. El intervalo del conteo es solo de Poisson: un censo real dispersa más, por el agrupamiento y porque la población real difiere de una clase declarada.',
    },
  },
};

export const PROPOSE_AN_OBSERVATION_DEEPER_ES = {
  steps: {
    'a-second-plan': {
      title: 'Un segundo plan',
      body: 'Propón ahora un segundo plan que también cumpla el objetivo, en una instalación distinta de la primera.',
      fields: [
        {
          label:
            'Instalación, contada desde 1: 1 LCO 0,35 m, 2 LCO 1,0 m, 3 Rubin 8,4 m',
        },
        { label: 'Exposición por visita' },
        { label: 'Visitas apiladas' },
        { label: 'Noches' },
        { label: 'Umbral de detección (en sigma)' },
        { label: 'Profundidad que alcanza tu plan (se encuentra la mitad)' },
        { label: 'Fuentes que encuentra tu plan por grado cuadrado' },
      ],
    },
    'compare-your-plans': {
      title: 'Compara tus dos planes',
      body: 'Ambos planes cumplen el objetivo.',
      prompt:
        '¿Cuál propondrías a un comité de asignación de tiempo y qué te haría cambiar de opinión?',
      rubric:
        'Crédito por elegir con un criterio declarado (robustez frente al tiempo, tiempo usado, margen sobre la profundidad, fiabilidad) y por nombrar algo que cambiaría la elección. Ningún plan es la respuesta.',
    },
    'what-the-interval-misses': {
      title: 'Lo que pierde el intervalo',
      body: 'El panel da un conteo con un intervalo de Poisson.',
      prompt:
        '¿Qué efecto hace que el conteo de un censo real disperse más que ese intervalo?',
      options: [
        'El agrupamiento y la varianza cósmica: las fuentes no se reparten de forma independiente, así que el conteo en un campo varía más que Poisson',
        'La forma del espejo del telescopio',
        'El tiempo de exposición',
        'El número de visitas',
      ],
      hints: ['Piensa en qué supone Poisson sobre dónde están las fuentes.'],
      because:
        'Un conteo de Poisson supone que las fuentes caen de forma independiente. Las fuentes reales se agrupan, así que la varianza entre campos es mayor, y un censo debe dar su intervalo con eso incluido.',
    },
  },
};
