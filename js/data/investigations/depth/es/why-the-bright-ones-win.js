// Por qué ganan las brillantes, más a fondo: las palabras en español, paso a paso con ../why-the-bright-ones-win.js.
export default {
  steps: [
    {
      title: 'La forma cerrada a mano',
      body: 'Para estrellas de igual densidad numérica, cortadas en una magnitud aparente fija, la magnitud absoluta media de una función de luminosidad gaussiana se desplaza −(3 ln 10 ÷ 5) σ² = −1,3816 σ². Las candelas estándar tienen σ = 0,7&nbsp;magnitudes.',
      prompt: 'El tamaño del desplazamiento',
      hints: [
        'Eleva primero 0,7 al cuadrado: 0,49. Luego multiplica por 1,3816.',
      ],
      worked:
        '0,7² = 0,49 y 1,3816 × 0,49 = 0,677 magnitudes, más brillante que la media de la población. El instrumento lo indica como la forma cerrada, y las estrellas que cuenta coinciden dentro de su dispersión.',
      feedback: {
        close: 'Casi. Eleva σ al cuadrado antes de multiplicar por 1,3816.',
        off: 'Desplazamiento = 1,3816 × σ², con σ = 0,7.',
      },
    },
    {
      title: 'Una dispersión mayor',
      body: 'Ahora la dispersión es el doble, σ = 1,4&nbsp;magnitudes.',
      prompt: 'El tamaño del desplazamiento',
      hints: ['1,4² = 1,96.'],
      worked:
        '1,3816 × 1,96 = 2,708 magnitudes: cuatro veces el desplazamiento, un factor de doce en luminosidad. La función de luminosidad real de las estrellas es mucho más ancha que 1,4 magnitudes, y por eso un catálogo de estrellas limitado por magnitud es tan distinto de las estrellas que hay.',
      feedback: {
        close: 'Casi. σ² para σ = 1,4 es 1,96.',
        off: 'Desplazamiento = 1,3816 × 1,96.',
      },
    },
    {
      title: 'Qué hace el sesgo de paralaje a una luminosidad',
      body: 'Con un corte de paralaje de 3 y límite 18, las magnitudes absolutas salen 0,25 magnitudes demasiado débiles. Una luminosidad es L ∝ 10<sup>−0,4 M</sup>.',
      prompt: '¿En qué porcentaje se subestima la luminosidad?',
      hints: [
        'El cociente de la luminosidad estimada y la verdadera es 10 elevado a −0,4 × 0,25.',
      ],
      worked:
        '10^(−0,1) = 0,794: la luminosidad es el 79 % de la verdadera, una subestimación del 20,6 %. Para una distancia medida con esa luminosidad el error sería de un 10 % (la raíz cuadrada del cociente de flujos).',
      feedback: {
        close: 'Casi. Resta el cociente de 1 para obtener la subestimación.',
        off: 'Subestimación = 1 − 10^(−0,4 × 0,25).',
      },
    },
    {
      title: 'Un catálogo real también lo hace',
      body: 'En el paquete del entorno solar (estrellas reales de Gaia), la magnitud absoluta media baja de 8,80 a menos de 100&nbsp;pc a 6,68 entre 100 y 250, 5,35 entre 250 y 500 y 4,23 entre 500 y 1.000&nbsp;pc. Esa muestra se seleccionó por una velocidad radial, que Gaia mide solo para estrellas más brillantes que la magnitud 14 o 15.',
      prompt:
        '¿Esa deriva es prueba de que las estrellas son más brillantes lejos del Sol?',
      options: [
        'No: una muestra limitada por flujo muestra la misma deriva con la distancia aunque las estrellas sean iguales en todas partes',
        'Sí: las estrellas son realmente más brillantes más lejos',
        'Sí: las paralajes son mejores lejos',
        'No: los datos son demasiado ruidosos para decir nada',
      ],
      misconceptions: [
        {
          say: 'Las estrellas sintéticas tienen la misma población en todas partes y muestran la misma deriva. Una deriva así es lo que predice la selección; no puede leerse como un gradiente de las estrellas sin un modelo de la selección.',
        },
      ],
      hints: [
        'Compara con las capas del sondeo sintético, donde las estrellas son iguales en todas partes.',
      ],
      because:
        'No. Las estrellas sintéticas son iguales en cada capa y el sondeo deriva exactamente así. Para decir algo de las estrellas reales se necesita la función de selección del sondeo, que es lo que construye la tercera investigación.',
    },
  ],
};
