// La forma de la expansión, más a fondo: las palabras en español, paso a paso con ../the-shape-of-expansion.js.
export default {
  steps: [
    {
      title: 'La aceleración hoy',
      body: `Para un universo plano de materia y una constante cosmológica, el parámetro de deceleración hoy es q<sub>0</sub> = Ω<sub>m</sub> ÷ 2 − Ω<sub>Λ</sub>, con Ω<sub>Λ</sub> = 1 − Ω<sub>m</sub>. Un q<sub>0</sub> negativo es una expansión que se acelera. Usa Ω<sub>m</sub> = 0,361.`,
      prompt: 'El parámetro de deceleración q₀ (negativo si hay aceleración)',
      hints: ['0,361 ÷ 2 − 0,639; o 1,5 × 0,361 − 1.'],
      worked:
        '0,1805 − 0,639 = −0,459. Es negativo, así que la expansión se acelera hoy. El límite es Ω_m = 2/3: con más materia que eso, la gravedad aún ganaría.',
      feedback: {
        close:
          'Casi. Resta la parte de energía oscura de la mitad de la parte de materia.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el q₀ de un universo como el nuestro es de unas décimas.',
        off: 'Ωm ÷ 2 − (1 − Ωm).',
      },
    },
    {
      title: 'La parte de energía oscura',
      body: `En un universo plano la densidad de materia y la de la constante cosmológica suman uno. Halla la parte de la constante cosmológica cuando Ω<sub>m</sub> = 0,361.`,
      prompt: 'La parte de la constante cosmológica, en porcentaje',
      hints: ['100 × (1 − 0,361).'],
      worked:
        '100 × (1 − 0,361) = 63,9 por ciento. La mayor parte de la densidad de energía del universo, en este modelo, es la constante cosmológica: una conclusión del modelo y de la suposición de planitud, no solo de las supernovas.',
      feedback: {
        close: 'Casi. Resta Ωm de 1 y multiplica por 100.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: es una parte del total, entre 0 y 100.',
        off: '100 × (1 − Ωm).',
      },
    },
    {
      title: 'Cuántas sigmas',
      body: `Para un único parámetro ajustado, un chi cuadrado Δχ² por encima del mínimo está a √Δχ² desviaciones típicas del mejor ajuste. Usa el 30,9 que leíste para Ω<sub>m</sub> = 0,30.`,
      prompt: 'La distancia de 0,30 al mejor ajuste, en desviaciones típicas',
      hints: ['La raíz cuadrada de 30,9.'],
      worked:
        '√30,9 = 5,56 desviaciones típicas. Una probabilidad de uno en cien millones si los errores son correctos: una cifra que debería hacerte preguntar si los errores lo son, no si el universo tiene Ωm = 0,36.',
      feedback: {
        close: 'Casi. Toma la raíz cuadrada, no el cuadrado.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la respuesta es de unas pocas, no cientos.',
        off: 'sqrt(30,9).',
      },
    },
    {
      title: 'El intervalo publicado',
      body: `El intervalo del 68% del instrumento, de 0,349 a 0,372, tiene una semianchura de (0,372 − 0,349) ÷ 2. El análisis publicado de las mismas supernovas da ± 0,017. Halla cuántas veces más ancho es el publicado.`,
      prompt: 'La semianchura publicada sobre la de este ajuste, como razón',
      hints: ['La semianchura es 0,0115.'],
      worked:
        '0,017 ÷ 0,0115 = 1,48. Incluir los errores que comparten las supernovas ensancha el intervalo en una mitad, sin mover mucho el mejor valor: el efecto de los errores que dejaste fuera, medido.',
      feedback: {
        close: 'Casi. Divide la semianchura publicada entre la de este ajuste.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el intervalo publicado es algo más ancho, no muchas veces.',
        off: '0,017 ÷ ((0,372 − 0,349) ÷ 2).',
      },
    },
  ],
};
