// Pertenencia a un cúmulo por movimiento - español, paso a paso con ../cluster-membership.js.
export default {
  title: 'Pertenencia a un cúmulo por movimiento',
  subtitle: 'Hallar las estrellas de NGC 2420 en Gaia, como probabilidades',
  objectives: [
    'Reconocer un cúmulo estelar como un grupo en movimiento propio que las estrellas del campo no hacen',
    'Medir el movimiento propio de un cúmulo y su número de miembros a partir de un ajuste que da a cada estrella una probabilidad',
    'Explicar por qué una pertenencia es una probabilidad y una cuenta de miembros depende de un umbral que se elige',
    'Comprobar una pertenencia hecha por movimiento con un diagrama color-magnitud que no usó',
    'Decir la distancia medida del cúmulo con sus etiquetas (un punto cero por estrella, un intervalo estadístico sin suelo sistemático) y decir que no está validada con la distancia de un catálogo publicado',
  ],
  steps: [
    {
      title: 'Un cúmulo y un campo',
      body: 'NGC 2420 es un cúmulo abierto viejo en Géminis, a miles de años luz. En la misma línea de visión hay estrellas del disco de la Galaxia que nada tienen que ver con él. Una imagen del cielo no puede separarlas; sus <strong>movimientos</strong> sí, porque las estrellas de un cúmulo nacieron juntas y todavía se mueven juntas.\n\nEl instrumento guarda 993 estrellas de Gaia DR3 más brillantes que G = 17,5 a menos de 14 minutos de arco del cúmulo, y traza el <strong>movimiento propio</strong> de cada una en el cielo. Los errores de Gaia entran en el ajuste. Aún no hay nada etiquetado: la lista bajo la imagen es lo que halla un ajuste.',
    },
    {
      title: 'Dónde aparece el cúmulo',
      body: 'Mira la imagen de movimientos propios, con todas las estrellas. Todavía no cambies el instrumento.',
      prompt: 'Las estrellas del cúmulo aparecerán como&hellip;',
      options: [
        'un grupo compacto, separado de una nube amplia de estrellas del campo',
        'un anillo alrededor del centro del campo',
        'una extensión uniforme por todo el plano',
        'una línea, con el campo a un lado',
      ],
      hints: [
        'Las estrellas nacidas juntas se mueven juntas; las del campo se mueven de mil maneras.',
      ],
      because:
        'Un grupo compacto. Las estrellas del cúmulo comparten un movimiento (con una diferencia de unos 0,1 mas/año, una velocidad de cerca de 1 km/s a esta distancia), mientras que las del campo, a todas las distancias y edades, se extienden por varios mas/año.',
    },
    {
      title: 'El movimiento y el tamaño del cúmulo',
      body: 'El ajuste ha puesto un componente estrecho sobre el grupo y uno ancho sobre el campo. Lee el <strong>movimiento propio del cúmulo</strong> en ascensión recta y en declinación (los dos números de la fila) y el número de estrellas con probabilidad de pertenencia superior a <strong>0,5</strong>.',
      fields: [
        { label: 'Movimiento propio en ascensión recta' },
        { label: 'Movimiento propio en declinación' },
        { label: 'Estrellas por encima de 0,5' },
      ],
    },
    {
      title: 'Una estrella en 0,5',
      body: 'Cada estrella tiene una <strong>probabilidad</strong> de pertenecer al cúmulo, dados su movimiento, su paralaje y sus errores. Toma una estrella cuya probabilidad es exactamente 0,5.',
      prompt: '¿Es miembro?',
      options: [
        'Los datos no pueden decirlo: es igual de probable que sea de uno o del otro, y que se cuente depende de un umbral que alguien elige',
        'Sí: cualquier estrella por encima de cero es miembro',
        'No: solo una probabilidad de 1 hace un miembro',
        'Sí, porque 0,5 se redondea hacia arriba',
      ],
      misconceptions: [
        {
          say: 'Un umbral de 0,5 es una elección, y redondear hacia arriba es otra. La estrella es exactamente tan probable de ser de uno como del otro.',
        },
      ],
      hints: ['¿Qué significa una probabilidad de un medio?'],
      because:
        'Los datos no pueden decirlo. El ajuste devuelve cuán probable es que la estrella pertenezca, y una cuenta de miembros es una cuenta por encima de un umbral que el analista declara: aquí 0,5, pero podría ser 0,9.',
    },
    {
      title: 'Mueve el umbral',
      body: 'Sube el umbral a <strong>0,99</strong> (el preajuste «Estricto») y lee el número de estrellas por encima. Luego bájalo a <strong>0,1</strong> y léelo otra vez.',
      fields: [
        { label: 'Estrellas por encima de 0,99' },
        { label: 'Estrellas por encima de 0,1' },
      ],
    },
    {
      title: '¿Por qué tan estable?',
      body: 'El número de miembros apenas cambió del umbral 0,1 a 0,99, y la lista dice que solo 4 estrellas tienen una probabilidad entre 0,1 y 0,9.',
      prompt: '¿Qué dice eso de este cúmulo?',
      options: [
        'Está bien separado del campo en movimiento y paralaje: casi todas las estrellas están claramente dentro o claramente fuera',
        'El ajuste está roto',
        'Las probabilidades son todas 0 o 1 por construcción',
        'El cúmulo no tiene miembros',
      ],
      hints: [
        'Compara el ancho del grupo del cúmulo con la distancia entre él y el centro del campo.',
      ],
      because:
        'Destaca. El grupo es estrecho (cerca de 0,08 mas/año) y el campo ancho (varios mas/año), así que el movimiento de una estrella casi decide a cuál pertenece. Un cúmulo menos distinto, o el mismo ajuste con solo movimiento propio (8 estrellas inciertas), deja más estrellas en medio.',
    },
    {
      title: 'Una comprobación que el ajuste no usó',
      body: 'Cambia la imagen al <strong>diagrama color-magnitud</strong>. Los puntos azules son las estrellas por encima del umbral, los grises las demás. El ajuste usó solo el movimiento (y el paralaje), nunca el color ni el brillo.',
      prompt:
        '¿Qué significa que los puntos azules formen una secuencia estrecha?',
      options: [
        'Los miembros son realmente una población: de la misma edad y distancia, como las de un cúmulo',
        'El color y el brillo también se ajustaron',
        'Nada: cualquier conjunto de estrellas forma una secuencia',
        'Las estrellas del campo son todas más débiles',
      ],
      misconceptions: [
        {
          say: 'No se ajustaron. El ajuste ve solo movimiento propio y paralaje, así que la secuencia es un resultado independiente.',
        },
      ],
      hints: [
        'Un conjunto al azar de estrellas a distintas distancias no se alinearía en una curva.',
      ],
      because:
        'Es una confirmación independiente. Las estrellas de una misma edad y distancia se alinean en una secuencia principal con un punto de giro; las del campo, a todas las distancias, se dispersan por el diagrama. Una secuencia hallada solo por el movimiento dice que el movimiento eligió un cúmulo real.',
    },
    {
      title: 'Una distancia por el paralaje',
      body: 'Con el umbral en 0,5, lee el <strong>paralaje medio</strong> de los miembros y la lectura que da el instrumento a partir de él, 1 ÷ paralaje, en kiloparsecs cuando el paralaje está en milisegundos de arco. Es el paralaje del catálogo sin punto cero, así que aún no es la distancia del cúmulo.',
      fields: [
        { label: 'Paralaje medio de los miembros' },
        { label: 'Lectura, 1 ÷ paralaje (sin corregir)' },
      ],
    },
    {
      title: 'Lo que la distancia deja fuera',
      body: 'La fila de la distancia dice que no usa corrección del punto cero ni comprobación con otro método. El panel de astrometría aplica un punto cero a cada estrella.',
      prompt: '¿Qué le hace el punto cero a la distancia del cúmulo?',
      options: [
        'Sube el paralaje en unos 0,04 mas y mueve la distancia de 2,555 a 2,324 kpc, mucho más que su intervalo estadístico',
        'Cambiar el movimiento propio del cúmulo',
        'Quitar todas las estrellas del campo',
        'Nada: el paralaje es exacto',
      ],
      hints: ['Compara las dos distancias, con el punto cero y sin él.'],
      because:
        'Sube el paralaje, así que baja la distancia: el punto cero medio de los miembros es −0,0368 mas, y la distancia pasa de 2,555 kpc sin él a 2,324 kpc con él. El intervalo del valor corregido, de 2,316 a 2,332 kpc, es solo estadístico, sin suelo sistemático, y la distancia no está validada con la distancia de un catálogo publicado (E1 NO SE EJECUTÓ). Las fuentes que lista la validación: 2,48 y 2,54 kpc por fotometría (convertidas aquí desde un módulo de distancia), 2,59 kpc de Gaia DR2, 2,78 kpc de un paralaje de DR3 tal como se imprimió, sin punto cero indicado (de 2,38 a 3,33 kpc), y cerca de 3 kpc sin método leído. La distancia corregida queda por debajo de todas: es lo que dieron los datos bajo un contrato fijado de antemano, no una concordancia con la literatura.',
    },
    {
      title: 'Por qué una probabilidad',
      body: 'Una tabla con una columna de miembro / no miembro es más fácil de usar.',
      prompt:
        'Explica por qué una probabilidad de pertenencia es más honesta que una etiqueta para una estrella cuyo movimiento queda entre el cúmulo y el campo.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Un cúmulo es un grupo en movimiento propio que el campo no hace. Un ajuste de mezcla pone un componente estrecho sobre él y uno ancho sobre el campo, y da a cada estrella una probabilidad. Unas 506 de 993 estrellas son miembros, con un movimiento de (−1,23, −2,04)&nbsp;mas/año; una cuenta depende de un umbral que se elige, aunque aquí apenas importa. Un diagrama color-magnitud que el ajuste nunca vio confirma una sola población, Con un punto cero aplicado estrella por estrella, su paralaje da 2,324&nbsp;kpc, un intervalo estadístico de 2,316 a 2,332&nbsp;kpc sin suelo sistemático, y no validado con la distancia de un catálogo publicado.',
    },
  ],
};
