// Señal, ruido y exposición - español, paso a paso con ../signal-noise-and-exposure.js.
export default {
  title: 'Señal, ruido y exposición',
  subtitle:
    'Cuánto exponer para alcanzar una señal a ruido, y por qué cuatro veces la luz no es cuatro veces la calidad',
  objectives: [
    'Leer la señal a ruido de una estrella en los términos de la ecuación del CCD, y nombrar el que la limita',
    'Predecir cómo cambia la señal a ruido con la exposición, y decir por qué no la sigue cuando importa el ruido de lectura',
    'Hallar la exposición que alcanza un objetivo, y decir qué cuesta un cielo más brillante',
    'Decir qué no puede prometer una calculadora que deja fuera el error del campo plano y el seeing',
  ],
  steps: [
    {
      title: 'Contar lo que no querías',
      body: `La luz de una estrella llega como fotones, y los fotones llegan al azar: una estrella que da 10.000 electrones da 10.000 ± 100 en otro intento, la raíz cuadrada. Ese es el <strong>ruido de fotones</strong> propio de la estrella. A su alrededor la medida añade los fotones del <strong>cielo</strong> en los mismos píxeles, la <strong>corriente oscura</strong> y el <strong>ruido de lectura</strong> de cada píxel. El ruido de fuentes independientes se suma en cuadrados, y la <strong>ecuación del CCD</strong> lo dice para una abertura redonda:
             \n\n<em>ruido² = S + n (B + D + R²)</em>
             \n\ncon S los electrones de la estrella en la abertura, n los píxeles que contiene, B y D los electrones del cielo y de la oscuridad por píxel y R el ruido de lectura en electrones. (Un pequeño factor, 1 + n sobre los píxeles del anillo de cielo, paga por medir el cielo en un anillo finito.) La <strong>señal a ruido</strong> es S sobre el ruido.
             \n\nEl instrumento lo calcula para un telescopio de 0,4 m con un CCD pequeño, píxeles de un segundo de arco y un ruido de lectura de 8 electrones. Es un <strong>cálculo</strong>, no una imagen: la luz de la estrella sale de la banda V del núcleo de radiación. El brillo está en magnitudes V, donde un número mayor es más débil.`,
    },
    {
      title: 'Una estrella de V = 15 en un minuto',
      body: `Con la estrella en V = 15, 60 segundos, una abertura de 5 píxeles y un sitio oscuro, lee los <strong>electrones de la estrella en la abertura</strong>, el <strong>ruido total</strong> y la <strong>señal a ruido</strong>.`,
      fields: [
        { label: 'Electrones de la estrella' },
        { label: 'Ruido total' },
        { label: 'Señal a ruido' },
      ],
    },
    {
      title: 'Qué limita a la estrella brillante',
      body: `Mira los cuatro cuadrados de la tabla: los electrones de la propia estrella, el ruido del cielo al cuadrado, el de la oscuridad y el del ruido de lectura.`,
      prompt: '¿Qué limita la señal a ruido de esta estrella en este minuto?',
      options: [
        'El ruido de lectura: todos los píxeles lo pagan',
        'El cielo, que es más brillante que la estrella en cada píxel',
        'Los fotones de la propia estrella: el mayor de los cuatro términos',
        'La corriente oscura',
      ],
      misconceptions: [
        {
          say: 'El ruido de lectura al cuadrado es aquí de 6.200 electrones al cuadrado, el segundo término tras los 33.600 de la estrella. Importa para una estrella débil en una exposición corta, como verás.',
        },
        {
          say: 'El cielo de un sitio oscuro da 1,4 electrones por segundo y píxel; en 60 segundos y 79 píxeles, con la pequeña corrección del anillo, su término es de 8.200, una cuarta parte del de la estrella.',
        },
      ],
      hints: [
        'La última línea de la tabla antes de «Qué lo limita» dice qué término es el mayor.',
      ],
      because:
        'El ruido de fotones de la propia estrella, la raíz cuadrada de sus electrones, es el mayor término. Una estrella en este régimen está limitada por fotones: nada de la cámara ni del cielo cambiaría mucho el resultado, solo más luz. Una estrella brillante es el caso al que se simplifica la fórmula de los libros.',
    },
    {
      title: 'Cuatro veces la exposición',
      body: `Mantén V = 15 en un sitio oscuro y la abertura de 5 píxeles. Todavía no cambies el instrumento.`,
      prompt:
        'Exponiendo cuatro veces más (240 segundos), la señal a ruido será&hellip;',
      options: [
        'unas cuatro veces mayor',
        'unas dos veces mayor',
        'unas 1,4 veces mayor',
        'no mayor: el ruido crece con la señal',
      ],
      hints: [
        'La señal crece cuatro veces. El ruido es una raíz cuadrada de una suma que crece cuatro veces.',
      ],
      because:
        'Unas dos veces. Cuando todos los términos del ruido crecen con la exposición, la señal crece como t y el ruido como la raíz cuadrada de t, así que la señal a ruido crece como la raíz cuadrada de t. Cuatro veces el tiempo da el doble de calidad.',
    },
    {
      title: 'Cuatro veces más',
      body: `Pon la exposición en 240 segundos. Lee la nueva <strong>señal a ruido</strong>, y calcula la <strong>razón</strong> con el 152,5 de un minuto.`,
      fields: [
        { label: 'Señal a ruido a 240 s' },
        { label: 'Razón con la primera' },
      ],
    },
    {
      title: 'Una estrella débil',
      body: `Ahora una estrella de V = 19 con una abertura de 3 píxeles en un sitio oscuro. Pon la exposición en 10 segundos y lee la <strong>señal a ruido</strong>; luego en 40 segundos, cuatro veces más, y léela otra vez.`,
      fields: [
        { label: 'Señal a ruido a 10 s' },
        { label: 'Señal a ruido a 40 s' },
      ],
    },
    {
      title: 'Por qué más del doble',
      body: `A los 10 segundos la tabla dice que el ruido de lectura es el término que limita a esta estrella débil.`,
      prompt:
        '¿Por qué cuatro veces la exposición dio tres veces la señal a ruido?',
      options: [
        'La estrella se hizo más brillante durante la exposición más larga',
        'El ruido de lectura se paga una vez por imagen sea cual sea su duración, así que no crece con la exposición y la señal le gana terreno',
        'Una exposición más larga tiene una abertura menor',
        'La calculadora redondea la respuesta',
      ],
      misconceptions: [
        {
          say: 'La tasa de la estrella es la misma en las dos exposiciones; solo cambia el tiempo.',
        },
        {
          say: 'La abertura es de 3 píxeles en las dos. Solo cambió la exposición.',
        },
      ],
      hints: ['¿Cuál de los cuatro términos no crece al exponer más?'],
      because:
        'Los electrones de la estrella, del cielo y de la oscuridad crecen con el tiempo; el ruido de lectura al cuadrado es un precio fijo por píxel y por imagen. Cuando domina, el ruido apenas crece y la señal a ruido sigue a la señal. Cuando el cielo o la estrella toman el mando, vuelve la ley de la raíz cuadrada, y una sola imagen larga vence a muchas cortas para una estrella débil.',
    },
    {
      title: 'La exposición para un objetivo',
      body: `Un proyecto de fotometría necesita una señal a ruido de 100. Para la estrella de V = 15 con una abertura de 5 píxeles en un barrio periférico (el cielo, V = 20, es más brillante), pon el objetivo en 100 y lee la <strong>exposición para el objetivo</strong>. Luego elige «una Luna brillante» y léela otra vez.`,
      fields: [
        { label: 'Exposición, un barrio periférico' },
        { label: 'Exposición, una Luna brillante' },
      ],
    },
    {
      title: 'La estrella más débil',
      body: `En un sitio oscuro con una abertura de 5 píxeles, lee la <strong>estrella más débil con señal a ruido 5</strong> para 60 segundos. Luego pon la exposición en 240 segundos y léela otra vez, y da cuántas magnitudes más débil llega cuatro veces la exposición.`,
      fields: [
        { label: 'Estrella más débil, 60 s' },
        { label: 'Ganancia, 240 s sobre 60 s' },
      ],
    },
    {
      title: 'Lo que calculaste',
      body: `El ruido de una medida es la raíz cuadrada de una suma de términos: los fotones de la propia estrella, los del cielo, la corriente oscura y el ruido de lectura de cada píxel. Una estrella de V = 15 en un minuto en un sitio oscuro alcanzó una señal a ruido de 152, limitada por sus propios fotones; cuatro veces la exposición dio cerca del doble. Una estrella débil en una exposición corta está limitada por el ruido de lectura, y allí cuatro veces la exposición dio tres veces la calidad. Un barrio periférico cuesta cerca de un 40 por ciento más de tiempo que un sitio oscuro para la misma estrella, y una Luna brillante cerca del triple.
             \n\nLa calculadora es un <strong>cálculo</strong> para un telescopio declarado de 0,4 m en el que el 55 por ciento de la luz llega al detector. Deja fuera el error del campo plano, un seeing que cambia durante la noche, el gradiente del cielo y la cuantización de la electrónica, y la abertura está perfectamente colocada. Una calculadora de tiempos de exposición real añade un margen; esta muestra adónde va el tiempo.`,
    },
  ],
};
