// Dónde viven las galaxias - español, paso a paso con ../where-galaxies-live.js.
export default {
  title: 'Dónde viven las galaxias',
  subtitle:
    'Una cuña del cielo del sondeo Sloan: la escala de la estructura, y un enrarecimiento que no es un vacío',
  objectives: [
    'Decir cómo un corrimiento al rojo se vuelve una posición, y leer una cuña de galaxias como un mapa',
    'Medir cuán agrupadas están las galaxias frente a una dispersión al azar',
    'Decir por qué la densidad de un sondeo limitado por flujo cae con la distancia',
    'Distinguir estructura de selección, y decir cuál es una densidad que cae aquí',
  ],
  steps: [
    {
      title: 'Una rebanada del universo',
      body: `El corrimiento al rojo de una galaxia da su distancia, por la expansión, y su posición en el cielo da su dirección. Juntos la sitúan en el espacio. El instrumento muestra 2.911 galaxias del Sloan Digital Sky Survey en una franja de 120 grados de largo y medio grado de grosor, vista desde arriba: estamos abajo, y la distancia crece hacia arriba. Son corrimientos al rojo <strong>auténticos</strong>.
             \n\nLo primero que hay que leer es hasta dónde llega la imagen. Elige las galaxias más cercanas, <strong>z ≤ 0,04</strong>, y lee cuántas hay y a qué distancia está la más lejana.`,
    },
    {
      title: 'La muestra cercana',
      body: `Con el intervalo en <strong>z ≤ 0,04</strong>, lee las <strong>galaxias mostradas</strong> y la <strong>distancia de la más lejana</strong>.`,
      fields: [
        { label: 'Galaxias mostradas' },
        { label: 'Distancia de la más lejana' },
      ],
    },
    {
      title: 'La franja entera',
      body: `Ahora toma todo, <strong>z ≤ 0,12</strong>. Lee las galaxias mostradas y la distancia de la más lejana.`,
      fields: [
        { label: 'Galaxias mostradas' },
        { label: 'Distancia de la más lejana' },
      ],
    },
    {
      title: 'Agrupadas o dispersas',
      body: `Divide la franja en 24 celdas de 5 grados de ascensión recta, en cada capa de distancia, y cuenta las galaxias de cada una. Para una dispersión al azar, la varianza de los recuentos es igual a su media, así que su cociente es 1. El instrumento da ese cociente, promediado sobre las capas. Todavía no lo leas.`,
      prompt: 'El cociente de estas galaxias será&hellip;',
      options: [
        'cercano a 1: las galaxias se dispersan al azar',
        'muy inferior a 1: las galaxias se evitan entre sí',
        'muy superior a 1: las galaxias se reúnen en grumos y dejan vacíos entre ellos',
        'exactamente el número de galaxias',
      ],
      hints: [
        'Si las galaxias se agrupan, algunas celdas tienen muchas y otras ninguna, y la varianza es grande.',
      ],
      because:
        'Es muy superior a 1. Las galaxias se reúnen en paredes, filamentos y cúmulos, con vacíos entre ellos, así que los recuentos en celdas varían mucho más de lo que permite una dispersión al azar. El paso siguiente lee cuánto.',
    },
    {
      title: 'Cuán agrupadas',
      body: `Con la franja entera a la vista, lee la <strong>varianza sobre la media</strong> de los recuentos en celdas.`,
      fields: [{ label: 'Varianza sobre la media' }],
    },
    {
      title: 'Cerca y lejos',
      body: `Cambia a la imagen de galaxias por volumen frente a distancia. El instrumento da la densidad en una capa de 100 a 125 megapársecs y en una de 300 a 325. Todavía no las leas.`,
      prompt: 'La densidad a 300 megapársecs será&hellip;',
      options: [
        'más o menos igual que a 100, si el universo es igual en todas partes',
        'unas tres veces mayor',
        'mucho menor, un tercio más o menos',
        'cero',
      ],
      hints: [
        'La cuña se enrarece a la vista con la distancia. Pregunta si lo hace el universo o el sondeo.',
      ],
      because:
        'Es mucho menor, un tercio más o menos. Si eso es el universo o el sondeo es la pregunta siguiente. El paso siguiente lee ambos números.',
    },
    {
      title: 'La densidad cerca y lejos',
      body: `Lee las <strong>galaxias por millón de megapársecs cúbicos</strong> en la capa de 100 a 125 megapársecs, y en la de 300 a 325.`,
      fields: [{ label: 'A 100 a 125 Mpc' }, { label: 'A 300 a 325 Mpc' }],
    },
    {
      title: 'Un vacío, o el sondeo',
      body: `Las galaxias son tres veces más escasas a 300 megapársecs que a 100, y el sondeo tomó todas las que pudo con una magnitud en la banda r más brillante que 17,77.`,
      prompt: '¿Cuál es la mejor explicación?',
      options: [
        'Vivimos en el centro de un enorme vacío, y la densidad sube con la distancia desde nosotros',
        'El sondeo solo ve galaxias más brillantes que su límite; lejos, cuenta solo las intrínsecamente más brillantes, así que la densidad que da cae: selección, no estructura',
        'La expansión del universo ha separado las galaxias lejanas',
        'Los corrimientos al rojo de las galaxias lejanas son menos exactos',
      ],
      misconceptions: [
        {
          say: 'Un vacío local de ese tamaño contradiría todo lo demás que sabemos de la uniformidad del universo. Un límite de flujo explica el enrarecimiento sin física nueva.',
        },
        {
          say: 'La expansión ya está en las distancias: una densidad por volumen comóvil no cambia por ella. El enrarecimiento está en los recuentos, no en el espacio.',
        },
      ],
      hints: [
        'Una galaxia tiene que ser lo bastante brillante para pasar el corte. Pregunta qué fracción de galaxias lo es a 100 megapársecs y a 300.',
      ],
      because:
        'A 100 megapársecs el sondeo cuenta galaxias mucho más débiles que a 300, así que halla muchas más por volumen cerca y solo las más brillantes lejos. El enrarecimiento sigue del límite. Es un efecto de selección: un sondeo que se viera igual a toda distancia necesitaría una función de luminosidad para corregirse. Los efectos de selección son el tema del siguiente grupo de investigaciones.',
    },
    {
      title: 'Lo que has deducido',
      body: `Un corrimiento al rojo colocó 2.911 galaxias en una cuña de 500 megapársecs de fondo, y la cuña no es lisa: los recuentos en celdas varían con una varianza 9,8 veces la media, donde el azar daría 1. Las galaxias se reúnen en cúmulos y paredes con vacíos entre ellos. La densidad en la capa lejana es 3,3 veces más escasa que en la cercana, y eso es el límite de flujo del sondeo, que solo ve las galaxias más brillantes lejos.
             \n\nNo se hace aquí: el estiramiento de un corrimiento al rojo por el propio movimiento de una galaxia (que estira los cúmulos a lo largo de la línea de visión), la corrección por el límite del sondeo que mostraría la densidad verdadera, y la imagen tridimensional de un sondeo de todo el cielo. Las distancias usan un universo plano con la densidad de materia que fijes.`,
    },
  ],
};
