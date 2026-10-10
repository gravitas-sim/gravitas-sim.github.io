// Color y temperatura, más a fondo: las palabras en español, paso a paso con ../color-and-temperature.js.
export default {
  steps: [
    {
      title: 'Cuánta luz, de qué tamaño de superficie',
      body: 'Un cuerpo negro da σT⁴ de potencia por cada metro cuadrado (léelo bajo la gráfica), así que una esfera de radio R da L = 4πR²σT⁴. Una estrella tiene 0,8 radios solares y una temperatura de 4.400&nbsp;K. La temperatura del Sol es 5.772&nbsp;K.',
      prompt: 'La luminosidad de la estrella, en luminosidades solares',
      hints: [
        'Compárala con el Sol: el área va como R², y la potencia por metro cuadrado como T⁴.',
        'Multiplica las dos razones: (razón de R)² × (razón de T)⁴.',
      ],
      worked: 'L/L☉ = 0,8² × (4.400 / 5.772)⁴ = 0,64 × 0,338 = 0,216.',
      feedback: {
        close:
          'Casi. Comprueba que la razón de temperaturas va a la cuarta y la de radios al cuadrado.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Una estrella algo más fría y algo menor que el Sol es más tenue que el Sol, pero no mil veces.',
        off: 'El radio cuenta al cuadrado y la temperatura a la cuarta potencia.',
      },
    },
    {
      title: 'El tamaño a partir de la luz y el color',
      body: 'Una supergigante fría da 100.000 veces la luminosidad del Sol a una temperatura de 3.600&nbsp;K. Da la vuelta a L = 4πR²σT⁴ para hallar su radio.',
      prompt: 'Su radio, en radios solares',
      hints: [
        'En unidades solares, R = √L ÷ T², con T en unidades de la temperatura del Sol.',
      ],
      worked: 'R/R☉ = √(100.000) ÷ (3.600 / 5.772)² = 316,2 ÷ 0,389 = 813.',
      feedback: {
        close: 'Casi. El radio va como la raíz cuadrada de la luminosidad.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Revisa la raíz y la razón de temperaturas al cuadrado.',
        off: 'Radio = √(luminosidad) ÷ (razón de temperaturas)², todo en unidades solares.',
      },
    },
    {
      title: 'Fotometría sintética en dos bandas reales',
      body: 'El explorador halla un color integrando la luz del cuerpo negro con dos curvas de filtro reales y comparando los resultados, como haría un observador. Pon las bandas en <strong>g &minus; r</strong> (los filtros de SDSS, sistema AB) y la temperatura en 4.400&nbsp;K.',
      prompt: 'El color g − r de un cuerpo negro de 4.400 K',
      hints: [
        'Léelo en la fila del índice de color con las bandas g − r elegidas.',
      ],
      worked: 'La integración da g − r = 0,906 a 4.400 K.',
      feedback: {
        close: 'Casi. Asegúrate de que las bandas son g − r, no B − V.',
        off: 'Lee la fila del índice de color con las bandas en g − r.',
      },
    },
    {
      title: 'Dos colores para un mismo cuerpo negro',
      body: 'A 4.400 K el mismo cuerpo negro tiene B − V = 1,00 (sistema Vega) y g − r = 0,91 (sistema AB). Un enano naranja real tiene un g − r medido algo distinto otra vez.',
      prompt: '¿Por qué difieren los dos números para el mismo cuerpo negro?',
      options: [
        'el cuerpo negro cambia de temperatura entre las dos mediciones',
        'las bandas y los puntos cero de los dos sistemas son distintos',
        'uno de los dos es un error de medición',
        'g y r son bandas infrarrojas',
      ],
      hints: ['Los dos índices usan filtros y puntos cero distintos.'],
      because:
        'Los dos índices usan bandas y puntos cero distintos (Vega frente a AB), así que sus números difieren para el mismo cuerpo negro. Una estrella real difiere del cuerpo negro otra vez por sus líneas. Un color solo tiene sentido con sus bandas y su sistema nombrados.',
    },
  ],
};
