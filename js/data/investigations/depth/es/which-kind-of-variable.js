// Qué tipo de variable, más a fondo: las palabras en español, paso a paso con ../which-kind-of-variable.js.
export default {
  steps: [
    {
      title: 'La exactitud a partir de la tabla',
      body: 'Con solo el periodo, la diagonal de la tabla (estrellas llamadas lo que son en verdad) es 23 RRab, 24 RRc, 22 cefeidas, 24 delta Scuti y 7 binarias eclipsantes, de 120 estrellas. Calcula la exactitud y compárala con la del instrumento.',
      prompt: 'La exactitud, en porcentaje',
      hints: ['23 + 24 + 22 + 24 + 7 = 100.'],
      worked:
        '100 ÷ 120 = 83,3 por ciento, la cifra del instrumento. Las 20 estrellas fuera de la diagonal son los errores: 1 RRab, 2 cefeidas y 17 binarias eclipsantes.',
      feedback: {
        close:
          'Casi. Suma las cinco cuentas de la diagonal y divide entre 120.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la respuesta es un porcentaje entre 0 y 100.',
        off: '(23 + 24 + 22 + 24 + 7) ÷ 120 × 100.',
      },
    },
    {
      title: 'Sin las binarias',
      body: 'De las 96 estrellas que no son binarias eclipsantes, el periodo solo clasifica bien 23 + 24 + 22 + 24. Da la exactitud en esos cuatro tipos.',
      prompt: 'La exactitud en los cuatro tipos de pulsador, en porcentaje',
      hints: ['93 ÷ 96.'],
      worked:
        '93 ÷ 96 = 96,9 por ciento. Los pulsadores se separan bien por el periodo; las binarias son lo que baja la cifra total a 83. Un clasificador vale lo que vale su peor clase, y el número global no dice cuál es.',
      feedback: {
        close: 'Casi. Suma 23, 24, 22 y 24, y divide entre 96.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la respuesta es un porcentaje entre 0 y 100.',
        off: '(23 + 24 + 22 + 24) ÷ 96 × 100.',
      },
    },
    {
      title: 'El mismo clasificador con otra mezcla',
      body: 'Supón que un sondeo tuviera diez veces más binarias eclipsantes que de cada uno de los cuatro tipos de pulsador (los pesos son 1, 1, 1, 1 y 10), y que cada tipo se hallara con la misma tasa que en esta muestra con solo el periodo: 23/24, 24/24, 22/24, 24/24 y 7/24. La exactitud es la tasa de cada tipo ponderada por su peso. Calcúlala.',
      prompt: 'La exactitud ponderada, en porcentaje',
      hints: ['(0,958 + 1 + 0,917 + 1 + 10 × 0,292) ÷ 14.'],
      worked:
        '(0,958 + 1,000 + 0,917 + 1,000 + 2,917) ÷ 14 = 0,485, o el 48,5 por ciento, con el mismo clasificador que sacó 83,3 en la muestra equilibrada. El clasificador no cambió; cambió la mezcla. Es el efecto de la tasa base, y por eso la exactitud citada de un clasificador se traslada a un sondeo solo si la mezcla del sondeo se parece a la de la muestra de entrenamiento.',
      feedback: {
        close:
          'Casi. Pondera cada tasa, suma y divide entre el peso total, 14.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la respuesta es un porcentaje entre 0 y 100.',
        off: '(23/24 + 1 + 22/24 + 1 + 10 × 7/24) ÷ 14 × 100.',
      },
    },
  ],
};
