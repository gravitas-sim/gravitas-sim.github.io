// Candelas estándar, más a fondo: las palabras en español, paso a paso con ../standard-candles.js.
export default {
  steps: [
    {
      title: 'El factor de distancia',
      body: `Un error de módulo de distancia Δμ multiplica toda distancia por 10<sup>Δμ/5</sup>. Si cada supernova es 0,1 magnitudes más débil de lo supuesto, cada una está más lejos en ese factor.`,
      prompt: 'El aumento de toda distancia, en porcentaje',
      hints: ['10 elevado a 0,1 ÷ 5 = 0,02.'],
      worked:
        '10^0,02 = 1,0471: toda distancia es un 4,71 por ciento mayor. Cinco magnitudes son un factor cien en brillo y diez en distancia, así que una décima de magnitud es 10^(0,1/5).',
      feedback: {
        close: 'Casi. Eleva 10 a Δμ ÷ 5, luego resta 1 y multiplica por 100.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: una décima de magnitud son unos pocos por ciento en distancia.',
        off: '(10^(0,1 ÷ 5) − 1) × 100.',
      },
    },
    {
      title: 'Y la constante de Hubble',
      body: `La constante de Hubble es una velocidad sobre una distancia, así que cuando toda distancia es mayor en 1,0471 baja a 1 ÷ 1,0471 de su valor. Halla la bajada como porcentaje de los 70 de que partía.`,
      prompt: 'La bajada de la constante de Hubble, en porcentaje',
      hints: ['1 − 1 ÷ 1,0471.'],
      worked:
        '1 ÷ 1,0471 = 0,955, así que la constante baja a 66,85, una bajada del 4,5 por ciento: algo menos que el 4,71 por ciento en que subieron las distancias, porque una es una razón y la otra su inversa.',
      feedback: {
        close: 'Casi. La bajada es 1 menos la inversa del factor de distancia.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: son unos pocos por ciento.',
        off: '100 × (1 − 1 ÷ 1,0471).',
      },
    },
    {
      title: 'La calibración para un uno por ciento',
      body: `Supón que quieres la constante de Hubble a un 1 por ciento. Un cambio fraccionario f en una distancia es un cambio de 5 log<sub>10</sub>(1 + f) magnitudes.`,
      prompt:
        'El mayor error de calibración que mantiene H₀ dentro de un 1 por ciento, en magnitudes',
      hints: ['5 × log₁₀(1,01); log₁₀(1,01) es unos 0,00432.'],
      worked:
        '5 × 0,004321 = 0,0216 magnitudes. Un uno por ciento en H₀ pide unas centésimas de magnitud en cada peldaño, que es más o menos el error de una buena distancia por cefeidas: la razón de que la escalera de distancias sea lo difícil.',
      feedback: {
        close: 'Casi. Multiplica por 5 el log₁₀ de 1,01.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: son un par de centésimas de magnitud.',
        off: '5 × log₁₀(1,01).',
      },
    },
    {
      title: 'Una diferencia del cinco por ciento',
      body: `Dos maneras de hallar la constante de Hubble discrepan un 5 por ciento. Si toda la discrepancia fuera una diferencia en la calibración de las supernovas, ¿cuántas magnitudes sería?`,
      prompt:
        'La diferencia de calibración que da una brecha del 5 por ciento, en magnitudes',
      hints: ['5 × log₁₀(1,05).'],
      worked:
        '5 × 0,02119 = 0,106 magnitudes. Una brecha del cinco por ciento es una décima de magnitud, así que un pequeño error de calibración común a todas las supernovas es un sospechoso natural; y no se distingue de otra constante de Hubble con solo las supernovas.',
      feedback: {
        close: 'Casi. 5 × log₁₀(1,05).',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: es una décima de magnitud.',
        off: '5 × log₁₀(1 + 0,05).',
      },
    },
  ],
};
