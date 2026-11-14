// La luz que se curva, más a fondo: las palabras en español, paso a paso con ../bending-light.js.
export default {
  steps: [
    {
      title: 'La desviación a mano',
      body: 'Para el Sol, GM ÷ c² es 1,477 km y el radio es 695.700 km. La desviación de un rayo que roza el limbo es 4GM ÷ (c²R) radianes, y un segundo de arco son 4,848 × 10<sup>−6</sup> radianes.',
      prompt: 'La desviación de un rayo en el limbo del Sol',
      hints: [
        'Divide 4 × 1,477 km entre 695.700 km, y luego entre 4,848 × 10⁻⁶.',
      ],
      worked:
        '4 × 1,477 ÷ 695.700 = 8,49 × 10⁻⁶ radianes, y 8,49 × 10⁻⁶ ÷ 4,848 × 10⁻⁶ = 1,75 segundos de arco. El instrumento indica el mismo número.',
      feedback: {
        close: 'Casi. Comprueba el factor 4 y la conversión desde radianes.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la desviación en radianes es del orden de 10⁻⁵, y un segundo de arco son 10⁻⁶ de radián.',
        off: 'α = 4 × (GM ÷ c²) ÷ R, y luego divide entre 4,848 × 10⁻⁶ para tener segundos de arco.',
      },
    },
    {
      title: 'Dónde se cruzan los rayos',
      body: 'Los rayos que rozan el Sol se desvían todos hacia él 1,75 segundos de arco, así que cruzan la recta que pasa por su centro a una distancia <em>d</em> = R ÷ α del Sol, donde R es el radio y α está en radianes. Un telescopio colocado ahí vería enfocada toda la luz del limbo del Sol. La unidad astronómica son 1,496 × 10<sup>8</sup> km.',
      prompt: 'La distancia a la que se cruzan los rayos del limbo',
      hints: [
        'd = 695.700 km ÷ 8,49 × 10⁻⁶, y luego divide entre la unidad astronómica.',
      ],
      worked:
        'd = 695.700 km ÷ 8,49 × 10⁻⁶ = 8,19 × 10¹⁰ km, que son 548 unidades astronómicas: unas trece veces la distancia de Neptuno. Es el punto más cercano de la lente gravitatoria del Sol, y por eso las propuestas para usarla envían un telescopio mucho más allá de los planetas. (Un rayo a 2 radios solares cruza al doble de distancia, así que el Sol es una lente pobre, con una línea de focos y no un punto.)',
      feedback: {
        close:
          'Casi. Comprueba que α esté en radianes al dividir R entre ella.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: 8 × 10¹⁰ km dividido entre 1,5 × 10⁸ km por unidad astronómica son cientos.',
        off: 'd = R ÷ α con α = 8,49 × 10⁻⁶ rad, en unidades astronómicas.',
      },
    },
  ],
};
