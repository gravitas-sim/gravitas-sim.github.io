export const HOW_MANY_EARTHS_ES = {
  title: '¿Cuántas Tierras?',
  subtitle:
    'De los planetas que encontró un sondeo a cuántos hay: qué podía haber visto, en qué se convierte una cuenta y qué no puede decir una casilla',
  objectives: [
    'Decir por qué una cuenta de los planetas que encontró un sondeo no es una tasa, y qué podía haber encontrado en cambio',
    'Leer qué parte de los planetas de un tamaño y un período podía ver un sondeo, y que es geometría por la búsqueda',
    'Calcular una tasa a partir de los listados y la completitud de una casilla, con su intervalo',
    'Decir qué dan una casilla sin listados y una que el sondeo apenas podía ver, y qué no puede decir una rejilla de tasas',
  ],
  steps: {
    'a-count-is-not-a-rate': {
      title: 'Una cuenta no es una tasa',
      body: `Un sondeo vigiló 2000 estrellas y listó algunos planetas. ¿Cuántos planetas tiene una estrella? No el número listado dividido entre 2000: un planeta solo se ve si su órbita cruza por casualidad nuestra línea de visión, y solo si la búsqueda saca su caída del ruido de la estrella. El primer panel muestra la segunda parte. Se <em>inyectaron</em> planetas de todos los tamaños y períodos en la serie propia de cada estrella y se ejecutó la búsqueda: la parte que encontró es la eficiencia. Las estrellas son sintéticas, con ruido y duración propios, y los planetas también.`,
    },
    'what-is-easy-prediction': {
      title: 'A quién ve el sondeo',
      body: `Planetas de 0,5 a 1 radio terrestre, con períodos orbitales de 8 a 16 días. Solo importan los que transitan.`,
      prompt: '¿Qué parte de los planetas que transitan recupera la búsqueda?',
      options: [
        'Casi todos: un tránsito es un tránsito',
        'Cerca de un tercio',
        'Uno de cada cien',
        'Ninguno: planetas tan pequeños no se pueden recuperar',
      ],
      hints: [
        'Un planeta de este tamaño atenúa su estrella en bastante menos de cien partes por millón, y el ruido de un cuadro es del orden de cien.',
      ],
      because:
        'Cerca de un tercio: el 36 por ciento. Un planeta tan pequeño se recupera cuando se suman sus muchos tránsitos, y a este período una estrella contiene muchos, así que algunos se encuentran y muchos no.',
    },
    'who-the-survey-sees': {
      title: 'Pruébalo',
      body: `Pon la <strong>casilla de radio</strong> en 0,5 a 1 y la <strong>casilla de período</strong> en 8 a 16, y lee la fila de la eficiencia.`,
      prompt:
        '¿Qué parte de los planetas que transitan aquí recupera la búsqueda?',
      options: [
        'El 100 por ciento',
        'Cerca de un tercio: el 36 por ciento',
        'Cerca del uno por ciento',
        'La mitad: el 50 por ciento',
      ],
      hints: [
        'La fila dice qué por ciento de los planetas que transitan aquí se recuperan.',
      ],
      because:
        'La eficiencia es del 36 por ciento. Haz el planeta mayor y sube al 85 por ciento a 1 a 2 radios terrestres y a casi todos por encima de 2: la caída es más profunda que el ruido.',
      misconceptions: [
        {
          say: 'Un tránsito que está en los datos no siempre se encuentra: la caída de un planeta tan pequeño es una fracción del ruido de un cuadro, y la búsqueda necesita los tránsitos juntos.',
        },
      ],
    },
    'how-many-it-lists': {
      title: 'De los listados a una tasa',
      body: `El segundo panel tiene los listados de una población buscada. Mira planetas de 1 a 2 radios terrestres con períodos de 8 a 16 días. La fila de la completitud dice cuántos planetas lista el sondeo por cada planeta por estrella en esta casilla: probabilidad de tránsito por recuperación, sumada sobre las estrellas. Los listados se dividen entre ella, y entre la parte de listados que no son planetas (la fiabilidad, declarada).`,
      prompt:
        'La casilla tiene 10 listados. ¿Cuántos planetas por estrella son?',
      options: ['10', 'Cerca de 0,12', 'Cerca de 0,012', 'Cerca de 8'],
      hints: [
        'Divide los listados entre la completitud y quita después la fiabilidad.',
      ],
      because:
        'El sondeo lista 82 planetas por cada planeta por estrella aquí. Diez listados son por tanto unos 0,12 planetas por estrella (10 entre 82 es 0,122, y una fiabilidad de 0,95 lo deja en 0,116). Los listados decían 10; la tasa dice qué significa eso por estrella.',
    },
    'the-next-population': {
      title: 'Otra población',
      body: `Cambia la <strong>semilla</strong> a 2. Es otra población sacada de la misma verdad, listada por el mismo sondeo.`,
      prompt: '¿Qué hace la tasa de la misma casilla?',
      options: [
        'Nada: es un hecho fijo del sondeo',
        'Se mueve un poco, dentro de lo que dice su intervalo',
        'Cambia muchísimo: el método está roto',
        'Se duplica',
      ],
      hints: [
        'Cuenta los listados de la casilla con cada semilla y lee el intervalo.',
      ],
      because:
        'La casilla tiene 9 listados y una tasa de 0,105 con la semilla 2, 7 listados y 0,081 con la 3, frente a 10 y 0,116 con la 1. Los listados son una cuenta, así que se dispersan en torno a su raíz cuadrada, y el intervalo lo dice.',
      misconceptions: [
        {
          say: 'El sondeo es fijo; qué planetas se listan por casualidad no lo es. Otra población da otros listados, y el intervalo es la anchura de esa dispersión.',
        },
      ],
    },
    'a-bin-it-cannot-see': {
      title: 'Una casilla que no puede ver',
      body: `Vuelve a poner la semilla en 1, la <strong>casilla de radio</strong> en 0,5 a 1 y la <strong>casilla de período</strong> en 128 a 256.`,
      prompt: '¿Qué da el panel para esta casilla, que no tiene listados?',
      options: [
        'Una tasa de cero: no se encontró nada',
        'Una tasa con un intervalo ancho',
        'Nada: ni tasa ni límite, porque el sondeo lista solo 1,3 planetas por cada planeta por estrella aquí',
        'Un límite superior de 0,02 planetas por estrella',
      ],
      hints: [
        'Lee la fila de la completitud: ¿cuántos planetas lista el sondeo por cada planeta por estrella aquí, y cuál es el mínimo?',
      ],
      because:
        'El sondeo lista 1,3 planetas por cada planeta por estrella aquí, por debajo del mínimo de 5, así que una casilla con ninguno, o con uno, dice casi nada. El panel no da ni tasa ni límite: no encontrar nada no es que no haya nada, y un sondeo que apenas podía ver una casilla lo dice.',
      misconceptions: [
        {
          say: 'No listar nada es una medida solo donde el sondeo podía haber listado algo. Aquí apenas podía, así que el cero no es una tasa.',
        },
      ],
    },
    'what-you-can-now-say': {
      title: 'Lo que ya puedes decir',
      body: `Una tasa es los listados divididos entre la completitud, quitando la fiabilidad: los planetas por estrella que darían lo que listó el sondeo. La completitud es la probabilidad de un tránsito por la probabilidad de que la búsqueda lo recupere, sumada sobre las estrellas, y baja con el período y con el tamaño. Otra población mueve una casilla en torno a la raíz cuadrada de sus listados. Una casilla que el sondeo apenas podía ver no da tasa, y una casilla sin listados donde podía haber visto da solo un límite.`,
    },
  },
};

export const HOW_MANY_EARTHS_DEEPER_ES = {
  id: 'how-many-earths',
  steps: {
    'read-a-rate': {
      title: 'Lee una tasa',
      body: `Con la semilla 1, 1 a 2 radios terrestres y 8 a 16 días, lee la tasa y el extremo superior de su intervalo del 68 por ciento.`,
      fields: [
        { label: 'Tasa, en planetas por estrella' },
        {
          label:
            'Extremo superior del intervalo del 68 por ciento, en planetas por estrella',
        },
      ],
    },
    'a-bin-with-none': {
      title: 'Una casilla sin listados',
      body: `Pon la semilla en 1, la <strong>casilla de radio</strong> en 8 a 16 y la <strong>casilla de período</strong> en 8 a 16. El sondeo no vio ningún planeta tan grande. Lee el límite, y cuántos planetas lista el sondeo por cada planeta por estrella aquí.`,
      fields: [
        { label: 'Límite superior al 95 por ciento, en planetas por estrella' },
        { label: 'Planetas listados por cada planeta por estrella' },
      ],
    },
    'what-a-stated-reliability-does': {
      title: 'Qué hace una fiabilidad declarada',
      body: `Pon la <strong>casilla de radio</strong> en 2 a 4 y la <strong>casilla de período</strong> en 64 a 128, sin fiabilidad declarada. Lee la tasa (0,224 con los 4 listados) y declara después la fiabilidad. Se toma que una quinta parte de los listados a este período no son planetas.`,
      prompt: '¿Por qué factor cambia la tasa?',
      options: [
        'No cambia',
        'Baja a 0,80 de lo que era: una quinta parte de los listados no son planetas',
        'Baja a 0,2 de lo que era',
        'Se duplica',
      ],
      hints: [
        'La tasa es los listados por la fiabilidad entre la completitud.',
      ],
      because:
        'La tasa es n por la fiabilidad entre E, así que baja en la fiabilidad misma, de 0,224 a 0,179 planetas por estrella. La fiabilidad se declara, no se calcula: el sondeo no sabe qué listados son falsos, y una declaración errónea mueve todas las tasas de la casilla por el mismo factor.',
    },
    'the-total-the-grid-cannot-give': {
      title: 'El total que la rejilla no puede dar',
      body: `Pon la <strong>casilla de radio</strong> en 0,5 a 1 y la semilla en 1. La última fila suma las tasas de las casillas que tienen una: cerca de un planeta por estrella. Dos de las ocho casillas de período no están acotadas.`,
      prompt:
        '¿Puedes decir que una estrella tiene cerca de un planeta de este tamaño?',
      options: [
        'Sí: las tasas suman cerca de 0,98',
        'Solo para los períodos con tasa: las casillas de 64 días en adelante no están acotadas, y la rejilla no dice qué hay en ellas',
        'Sí, y el intervalo de la suma es la suma de los intervalos',
        'No: no hay ninguno a los períodos largos',
      ],
      hints: [
        '¿Qué hay en las casillas que la suma deja fuera, y qué haría falta para decirlo?',
      ],
      because:
        'La suma cubre las casillas que el sondeo podía ver. Las que apenas podía ver (aquí 128 días en adelante, con los períodos largos donde está la mayoría de los planetas de esta población) contienen más que la suma, y la rejilla no tiene modo de decir cuánto sin un modelo de cómo depende la tasa del período que el propio sondeo no puede comprobar. Activa las tasas verdaderas para verlo: suman 1,6.',
    },
    'what-the-grid-cannot-say': {
      title: 'Lo que la rejilla no puede decir',
      body: `Las tasas son de este sondeo, esta búsqueda y esta población. La búsqueda es el filtro adaptado al período y la fase conocidos, así que la completitud es mejor que la de una búsqueda real. El intervalo lleva solo el error de cuenta de los listados: la fiabilidad se declara y se toma como exacta, y la completitud tiene un pequeño error propio. Una tasa puede pasar de un planeta por estrella, y una suma sobre casillas también. No se ofrece ningún suavizado de la rejilla; una rejilla suavizada sería una regularización y no una posterior. Y un sondeo no dice nada de las casillas que apenas podía ver.`,
    },
  },
};
