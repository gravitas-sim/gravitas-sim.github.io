export const WHAT_IS_IT_MADE_OF_ES = {
  title: '¿De qué está hecho?',
  subtitle:
    'La densidad de un planeta vale lo que valga su estrella: mira cuánto de la incertidumbre es de la estrella, y qué puede y qué no puede decir una densidad',
  objectives: [
    'Decir por qué el radio, la masa y la densidad de un planeta dependen del radio y la masa de la estrella, y cómo',
    'Leer cuánto de cada incertidumbre es de la estrella y cuánto de los datos',
    'Decir qué le pasa al radio y a la densidad de un planeta cuando se declara mal la estrella alrededor de la cual se mide',
    'Decir qué puede decir una densidad media sobre la composición y qué no',
  ],
  steps: {
    'a-radius-and-a-mass': {
      title: 'Un radio y una masa',
      body: `Un tránsito da el radio del planeta <em>como fracción del de la estrella</em>. El bamboleo de la estrella da la masa del planeta
             <em>para una estrella de la masa que digas</em>. Junta ambos y tienes una densidad, y una densidad dice algo de qué está hecho el
             planeta. Pero el radio y la masa de la estrella no se midieron aquí: se declaran, con una incertidumbre, y el panel lleva esa
             incertidumbre a cada número. Este planeta es sintético: una curva de luz de cuatro tránsitos y treinta velocidades de dos
             instrumentos, ajustadas juntas.`,
    },
    'bigger-star-prediction': {
      title: 'Si la estrella es mayor',
      body: `El panel declara la estrella con 1,15 radios solares. Supón que en realidad es un 13 por ciento mayor, 1,30 radios solares, y
             nada más cambia: el tránsito y las velocidades son los mismos.`,
      prompt: '¿Qué pasa con el radio y la densidad del planeta?',
      options: [
        'Ninguno cambia: lo midió el tránsito',
        'El radio es un 13 por ciento mayor y la densidad baja casi un tercio',
        'El radio es un 13 por ciento mayor y la densidad no cambia, porque masa y volumen crecen juntos',
        'El radio es un 13 por ciento menor',
      ],
      hints: [
        'El tránsito mide el cociente de radios. El radio es ese cociente por el radio de la estrella.',
        'La masa sale de las velocidades y de la masa de la estrella, no de su radio. La densidad es la masa entre el volumen, y el volumen va con el cubo del radio.',
      ],
      because:
        'El radio es el cociente de radios por el radio de la estrella, así que una estrella un 13 por ciento mayor da un planeta un 13 por ciento mayor. La masa no depende del radio de la estrella, así que se queda, en un volumen 1,13 al cubo o 1,44 veces mayor, y la densidad baja a 0,69 de la que era: casi un tercio menos.',
    },
    'a-bigger-star': {
      title: 'Pruébalo',
      body: `Pon el <strong>radio estelar declarado</strong> en 1,30 radios solares y lee el radio y la densidad del planeta.`,
      prompt: '¿Cuánto dice ahora el panel que es la densidad?',
      options: [
        'Unos 0,36 g/cm³, sin cambio',
        'Unos 0,25 g/cm³: el radio creció a 1,50 radios de Júpiter y la densidad bajó casi un tercio',
        'Unos 0,48 g/cm³, más alta, porque la estrella es mayor',
        'Unos 0,12 g/cm³, un tercio de la que era',
      ],
      hints: ['Lee la fila de la densidad, y la del radio, encima.'],
      because:
        'La densidad baja de 0,36 a 0,25 g/cm³ y el radio sube de 1,33 a 1,50 radios de Júpiter. El planeta no cambió; cambió lo que se dijo de su estrella.',
      misconceptions: [
        {
          say: 'El tránsito no cambió, ni las velocidades, pero sí aquello de lo que el cociente de radios es cociente. El radio del planeta es ese cociente por el radio de la estrella.',
        },
      ],
    },
    'whose-uncertainty': {
      title: '¿De quién es la incertidumbre?',
      body: `Vuelve a poner el radio estelar declarado en 1,15. Lee la fila de la masa: los datos solos dan una incertidumbre pequeña, la estrella
             añade la suya, y el panel dice qué parte de la varianza es de la estrella.`,
      prompt: '¿Qué parte de la incertidumbre de la masa es mayor?',
      options: [
        'La de los datos: las velocidades son el eslabón débil',
        'La de la estrella: su masa, declarada al 5 por ciento, tiene cerca del 87 por ciento de la varianza',
        'Son casi iguales',
        'La estrella no añade nada a la masa: solo el radio necesita la estrella',
      ],
      hints: [
        'Compara los dos números de la fila: lo que dan los datos solos y lo que añade la estrella.',
      ],
      because:
        'La de la estrella. Los datos solos fijan la masa en unas 0,009 masas de Júpiter, y una masa estelar declarada al 5 por ciento añade 0,023, así que la estrella tiene cerca del 87 por ciento de la varianza. La masa necesita la masa de la estrella: es proporcional a su potencia dos tercios.',
      misconceptions: [
        {
          say: 'La masa necesita la masa de la estrella: las velocidades fijan lo deprisa que se mueve la estrella, y el planeta que la mueve así de deprisa depende de lo pesada que sea la estrella.',
        },
      ],
    },
    'where-on-the-diagram': {
      title: 'En el diagrama',
      body: `El segundo panel pone el planeta en un diagrama de radio contra masa, ambos en logaritmos, con los planetas del Sistema Solar y líneas de densidad constante.`,
      prompt: '¿A qué línea de densidad constante está más cerca el planeta?',
      options: ['0,3 g/cm³', '1 g/cm³', '5,5 g/cm³', '12 g/cm³'],
      hints: [
        'La fila de la densidad da el número. Busca la línea más cercana.',
      ],
      because:
        'La densidad media del planeta es 0,36 g/cm³, la más cercana a la línea de 0,3, muy por debajo de la de Saturno. Es ligero para su tamaño: un planeta grande de poca masa.',
    },
    'what-the-density-says': {
      title: 'Lo que dice la densidad',
      body: `Lee la línea <em>Lo que dice la densidad</em>.`,
      prompt:
        '¿Qué puede decir la densidad media sobre de qué está hecho el planeta?',
      options: [
        'Que es un gigante gaseoso de hidrógeno y helio: nada más es tan ligero',
        'Que es rico en volátiles, por debajo de 1,8 g/cm³; no distingue hidrógeno y helio del hielo de agua, y haría falta otra evidencia',
        'Que es rocoso',
        'Nada en absoluto',
      ],
      hints: [
        'La línea dice a qué clase pertenece una densidad por debajo de 1,8, y qué no distingue.',
      ],
      because:
        'Una densidad por debajo de 1,8 g/cm³ es rica en volátiles por convención, y la clase no distingue hidrógeno y helio del hielo de agua. Un planeta grande es además menos denso que su material en uno pequeño, por su propio peso. Dice algo y no todo.',
      misconceptions: [
        {
          say: 'El hidrógeno y el helio son una manera de ser así de ligero y el hielo de agua a menor presión es otra; una densidad sola no puede elegir. La clase es una convención sobre un número.',
        },
      ],
    },
    'what-you-can-now-say': {
      title: 'Lo que ya puedes decir',
      body: `El radio, la masa y la densidad de un planeta se miden cada uno <em>frente a su estrella</em>, y la masa y el radio de la estrella se
             declaran, no se ajustan, con una incertidumbre que entra en cada uno de ellos. Aquí la estrella tiene la mayor parte de la incertidumbre
             de la masa y cerca de la mitad de la del radio y la de la densidad. Una estrella mal declarada mueve al planeta, y la medida que el
             propio tránsito hace de la densidad de la estrella puede decirlo. Una densidad media por debajo de 1,8 g/cm³ es rica en
             volátiles, que es una pista de qué está hecho un planeta y no la respuesta.`,
    },
  },
};

export const WHAT_IS_IT_MADE_OF_DEEPER_ES = {
  id: 'what-is-it-made-of',
  steps: {
    'the-stars-share-of-density': {
      title: 'La parte de la estrella en la densidad',
      body: `Pon <strong>ambas</strong> incertidumbres estelares en 8 por ciento (y la estrella declarada otra vez en 1,10 y 1,15). Lee la fila de la
             densidad: su incertidumbre, y la parte de su varianza que es de la estrella.`,
      fields: [
        { label: 'Incertidumbre de la densidad (más o menos)' },
        { label: 'Parte de la varianza de la densidad que es de la estrella' },
      ],
    },
    'a-star-that-does-not-fit': {
      title: 'Una estrella que no encaja',
      body: `El tránsito mide también la densidad de la estrella, a partir del período y el tamaño de la órbita. Pon el radio estelar declarado en
             1,60 radios solares (con masa al 5 por ciento y radio al 3,5 por ciento). Lee a cuántas sigmas está la densidad de la estrella
             declarada de la del tránsito, y la densidad del planeta alrededor de esa estrella.`,
      fields: [
        { label: 'Desacuerdo de la estrella declarada con el tránsito' },
        { label: 'Densidad del planeta alrededor de esa estrella' },
      ],
    },
  },
};

export const RADIAL_VELOCITY_DEEPER_ES = {
  id: 'radial-velocity',
  steps: {
    'the-star-in-the-density': {
      title: 'La estrella en la densidad',
      body: `Los 0,33 g/cm³ que acabas de leer tomaron la estrella como dada. No lo era: el radio es el cociente de radios del tránsito por el radio de la
             estrella, la masa necesita la masa de la estrella, y la densidad necesita ambas. El panel de abajo ajusta juntos un tránsito y treinta
             velocidades de un Júpiter caliente sintético de este tamaño, con un período y una época para ambos, y lleva la incertidumbre declarada
             de la estrella al planeta. Dos cosas más que hace el ajuste y tu lectura no: deja la órbita ser excéntrica (las velocidades fijan entonces
             <em>e</em> y la duración del tránsito se mueve con ella), y deja que las velocidades se dispersen más de lo que dicen sus barras de
             error, la <em>fluctuación</em>.`,
    },
    'whose-share-is-the-mass': {
      title: 'La parte de la estrella',
      body: `Lee la fila de la masa del panel: lo que dan los datos solos, lo que añade la estrella y la parte.`,
      prompt:
        '¿Cuánto de la varianza de la masa del planeta es de la estrella?',
      options: [
        'Cerca del 10 por ciento: la estrella es bien conocida',
        'Cerca de la mitad',
        'Cerca del 87 por ciento: la masa de la estrella, declarada al 5 por ciento, domina',
        'Nada: las velocidades fijan la masa',
      ],
      hints: [
        'El panel imprime la parte como porcentaje en la fila de la masa.',
      ],
      because:
        'Cerca del 87 por ciento. Las velocidades fijan la amplitud a menos del 2 por ciento; la masa va con la masa de la estrella a la dos tercios, y una masa estelar declarada al 5 por ciento añade más que los datos.',
    },
    'jitter-and-the-model': {
      title: 'Más dispersión de la que dicen los errores',
      body: `El ajuste encontró una fluctuación de 2,3 m/s frente a errores de 3,0 m/s en las velocidades, que es poco. Supón que hubiera encontrado 15 m/s.`,
      prompt: '¿Qué diría eso?',
      options: [
        'Que el instrumento está roto',
        'Que las velocidades se dispersan mucho más de lo que dicen sus errores, así que un planeta en una órbita puede no describirlas (un segundo planeta, o la actividad de la estrella) y la masa a partir de la amplitud es menos segura que su intervalo',
        'Que el planeta es más masivo',
        'Nada: la fluctuación siempre está presente',
      ],
      hints: [
        'La fluctuación es la dispersión que queda al quitar la órbita de un planeta.',
      ],
      because:
        'El modelo de un planeta explica las velocidades solo hasta esa dispersión; una grande dice que algo no está en el modelo, y el panel avisa de una fluctuación mayor que los errores. La masa depende del modelo de un planeta.',
    },
    'a-star-that-does-not-fit-tug': {
      title: 'Una estrella que no encaja',
      body: `El tránsito mide la densidad de la estrella a partir de la órbita. Pon el radio estelar declarado en 1,60 radios solares. Lee a cuántas sigmas
             está la densidad de la estrella declarada de la del tránsito, y la densidad del planeta alrededor de esa estrella.`,
      fields: [
        { label: 'Desacuerdo de la estrella declarada con el tránsito' },
        { label: 'Densidad del planeta alrededor de esa estrella' },
      ],
    },
  },
};
