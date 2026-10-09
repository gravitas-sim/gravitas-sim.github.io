// Color y temperatura - español, paso a paso con ../color-and-temperature.js.
export default {
  title: 'Color y temperatura',
  subtitle: 'Predice y luego mide cómo se ve algo caliente que brilla',
  objectives: [
    'Predecir cómo cambia la longitud de onda del máximo de un objeto que brilla con su temperatura, y medirla',
    'Usar la ley de Wien para hallar una temperatura a partir de la longitud de onda del máximo',
    'Explicar por qué la longitud de onda del máximo no es el color que ve el ojo',
    'Recuperar una temperatura a partir de un índice de color',
    'Decir en qué se aparta una estrella real de un cuerpo negro',
  ],
  steps: [
    {
      title: 'Todo brilla',
      body: 'El aro caliente de una cocina se pone rojo opaco, luego naranja y luego blanco amarillento. La luz que da depende de su temperatura y de casi nada más. Un objeto que lo absorbe todo y emite luz solo por su temperatura es un <strong>cuerpo negro</strong>, y una estrella se parece lo bastante a uno como para estudiarla así.\n\nEl instrumento dibuja la luz de un cuerpo negro frente a la longitud de onda. Es una curva calculada (ley de Planck), no la medición de una estrella. Las tres estrellas del lienzo son hipotéticas, de 3.000, 5.772 y 10.000 K.',
    },
    {
      title: 'Predice el máximo',
      body: 'Toda curva de cuerpo negro tiene un máximo: la longitud de onda en que da más luz por unidad de longitud de onda. Todavía no muevas el control.',
      prompt:
        'Si un cuerpo negro se calienta de 3.000 K a 6.000 K, la longitud de onda de su máximo&hellip;',
      options: [
        'se duplica',
        'se reduce a la mitad',
        'se queda donde está y solo crece la curva',
        'baja a cerca del 70 por ciento de lo que era',
      ],
      hints: [
        'Lo más caliente da luz de longitud de onda más corta: piensa en un metal que pasa de rojo a blanco.',
      ],
      because:
        'Se reduce a la mitad. La longitud de onda del máximo es inversamente proporcional a la temperatura (ley de Wien): al doble de temperatura, la mitad de longitud de onda. El paso siguiente lo mide.',
    },
    {
      title: 'Mide tres máximos',
      body: 'Pon cada temperatura de abajo y lee la longitud de onda del máximo en la lista bajo la gráfica.',
      fields: [
        { label: 'Máximo a 3.000 K' },
        { label: 'Máximo a 6.000 K' },
        { label: 'Máximo a 12.000 K' },
        { label: 'Máximo × temperatura a 6.000 K' },
      ],
    },
    {
      title: 'Usa la regla',
      body: 'Máximo × temperatura es una constante, unos 2,898 millones de nm·K. Úsala antes de comprobarla con el instrumento.',
      prompt: 'Longitud de onda del máximo de un cuerpo negro de 4.000 K',
      hints: [
        'Divide la constante entre la temperatura.',
        'Las unidades salen en nm porque la constante está en nm·K.',
      ],
      worked: '2.897.772 nm·K ÷ 4.000 K = 724,4 nm.',
      feedback: {
        close:
          'Casi. Divide la constante entre la temperatura, sin ningún otro factor.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. El máximo de un cuerpo negro como una estrella está en el visible o cerca, a cientos de nanómetros.',
        off: 'La ley de Wien da longitud de onda = constante ÷ temperatura.',
      },
    },
    {
      title: 'Al revés',
      body: 'El espectro de una estrella tiene su máximo en 380&nbsp;nm, en el borde violeta del visible. La ley de Wien sirve en los dos sentidos.',
      prompt:
        'Temperatura de un cuerpo negro cuyo espectro tiene el máximo en 380 nm',
      hints: [
        'Temperatura = constante ÷ longitud de onda del máximo.',
        'Deja la longitud de onda en nm para que las unidades coincidan con la constante.',
      ],
      worked: '2.897.772 nm·K ÷ 380 nm = 7.626 K.',
      feedback: {
        close:
          'Casi. Divide la constante entre la longitud de onda, no al revés.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. La superficie de las estrellas va de unos miles a unas decenas de miles de kelvin.',
        off: 'Temperatura = constante ÷ longitud de onda, con la longitud de onda en nm.',
      },
    },
    {
      title: 'El máximo del Sol es verde',
      body: 'Pon la temperatura del Sol. Su máximo está en unos 502&nbsp;nm, que es verde. El Sol no se ve verde.',
      prompt: '¿Por qué no?',
      options: [
        'El máximo es una sola longitud de onda; el ojo suma toda la luz visible, y la curva es ancha',
        'El Sol no es un cuerpo negro, así que la ley de Wien no se aplica',
        'La atmósfera de la Tierra vuelve blanca la luz',
        'El máximo está en realidad en el infrarrojo',
      ],
      misconceptions: [
        {
          say: 'El máximo está en el visible; compara la posición de la línea de puntos con la banda sombreada.',
        },
      ],
      hints: [
        'Mira lo ancha que es la curva junto a la banda visible sombreada.',
      ],
      because:
        'La curva es ancha: el Sol da mucha luz en todo el rango visible y el ojo la mezcla en un blanco casi neutro. La longitud de onda del máximo dice dónde hay más luz, no de qué color se ve algo.',
    },
    {
      title: 'Mide un índice de color',
      body: 'Los astrónomos miden el color como una diferencia de magnitudes con dos filtros. Con las bandas en <strong>B &minus; V</strong>, lee el índice de color a cada temperatura. Un número mayor es más rojo. La muestra enseña más o menos cómo se ve el cuerpo negro.',
      fields: [
        { label: 'B − V a 3.000 K' },
        { label: 'B − V a 6.000 K' },
        { label: 'B − V a 10.000 K' },
      ],
    },
    {
      title: 'Halla la temperatura a partir del color',
      body: 'Una estrella tiene B &minus; V = 0,82. Mueve la temperatura hasta que el explorador dé ese índice de color.',
      prompt: 'Temperatura del cuerpo negro con B − V = 0,82',
      hints: [
        'El índice baja al subir la temperatura; mueve el control hasta que la fila marque 0,82.',
      ],
      worked:
        'A la temperatura en que la fila B − V marca 0,82, el cuerpo negro es algo más frío que el Sol.',
      feedback: {
        close:
          'Casi. Mueve un poco el control y mira la fila del índice de color.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Pon primero el control y lee la temperatura en su etiqueta.',
        off: 'Más frío es más rojo es mayor. Si tu índice es demasiado grande, sube la temperatura.',
      },
    },
    {
      title: 'Dónde se acaba el modelo',
      body: 'Una estrella real no es un cuerpo negro perfecto. Su atmósfera absorbe en muchas longitudes de onda (las líneas de la siguiente investigación) y su color se mide con filtros reales.',
      prompt:
        'Una temperatura de color hallada así se describe mejor como&hellip;',
      options: [
        'la temperatura del cuerpo negro que tendría este color',
        'exactamente la temperatura de la superficie de la estrella',
        'la temperatura del núcleo de la estrella',
        'sin sentido, porque las estrellas no son cuerpos negros',
      ],
      hints: ['Es la respuesta a «¿qué cuerpo negro coincide?»'],
      because:
        'Es la temperatura del cuerpo negro que coincide con el color. Está cerca de la temperatura de la superficie (efectiva) en muchas estrellas y se diferencia de ella por el efecto de las líneas y los saltos del espectro real.',
    },
    {
      title: 'Con tus palabras',
      body: 'Han aparecido dos formas de sacar una temperatura de la luz: la longitud de onda del máximo y un índice de color.',
      prompt:
        '¿Cuál preferirías usar con una estrella tenue, y por qué? Di qué necesita cada una de la observación.',
    },
    {
      title: 'Lo que has averiguado',
      body: 'La longitud de onda del máximo de un cuerpo negro es la constante de 2,898 millones de nm·K dividida entre su temperatura. Su índice de color también baja de forma constante con la temperatura, y es más fácil de medir en una estrella tenue. Ninguno cuenta toda la historia: un espectro real tiene líneas, y la siguiente investigación las lee.',
    },
  ],
};
