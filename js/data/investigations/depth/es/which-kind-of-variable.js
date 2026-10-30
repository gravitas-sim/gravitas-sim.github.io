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
    {
      title: 'El número de forma y su error',
      body: 'El clasificador de arriba lee R21, la razón del segundo armónico de la curva de luz al primero, para estrellas sintéticas. Una curva de luz real lo da con un error. El panel contiene la curva de luz de TESS de SU Draconis, una estrella RR Lyrae, plegada con su período, con el ajuste de tres armónicos; lee <strong>R21</strong> y su error para toda la serie.',
      prompt: 'R21 de SU Draconis',
      hints: ['La fila R21 da el valor y, tras el signo más-menos, su error.'],
      worked:
        'R21 = 0,539 ± 0,007, con 39 ciclos. Una curva RR Lyrae en diente de sierra tiene un segundo armónico grande, y 0,54 es el valor que toma la plantilla RRab del ejercicio; el error es la propagación de primer orden de la covarianza del ajuste, y supone que los puntos son independientes.',
      feedback: {
        close:
          'Casi. Lee la fila R21 con la estrella en SU Draconis y toda la serie.',
        'wrong-order-of-magnitude':
          'R21 es una razón de amplitudes, entre 0 y cerca de 1.',
        off: 'Pon la estrella en SU Draconis y los días en 28, y lee R21.',
      },
    },
    {
      title: 'Una serie demasiado corta para una forma',
      body: 'Cambia la estrella a <strong>Eta Aquilae</strong>, una cefeida, y usa solo los primeros <strong>6 días</strong> de su serie. El período es 7,2 días. Lee la fila <em>Números de forma</em>.',
      prompt: '¿Por qué retira el panel los números de forma?',
      options: [
        'La serie tiene menos de tres ciclos, así que los armónicos no están acotados: un ajuste devolvería igualmente números, pero describirían el ruido y los huecos',
        'La estrella no es una cefeida',
        'La curva de luz es demasiado débil para medirla',
        'R21 solo está definido para estrellas RR Lyrae',
      ],
      hints: ['Mira la fila de ciclos: ¿cuánto de un ciclo cubre la serie?'],
      because:
        'Seis días son 0,83 de un ciclo. Ajustar tres armónicos a menos de un ciclo devolvería una curva y números, pero otra disposición del mismo ruido devolvería otros. El panel rechaza por debajo de tres ciclos, o cuando las fases dejan un hueco de más de un tercio de ciclo, y dice por qué. Con toda la serie, 3,7 ciclos, los números vuelven con sus errores.',
      misconceptions: [
        {
          say: 'R21 está definido para cualquier curva periódica; lo que cambia es lo que separa unos tipos de otros.',
        },
      ],
    },
    {
      title: 'Cuándo no decir',
      body: 'Un clasificador que debe nombrar toda estrella se equivoca en las que no sabe distinguir. Este panel da una clase a una estrella solo si coinciden al menos <strong>4 de sus 5 vecinas más próximas</strong>, y deja las demás abiertas. Usa el período y la amplitud. Lee cuántas de las 120 estrellas quedan abiertas.',
      prompt: 'Estrellas abiertas',
      hints: [
        'La fila Estrellas abiertas; el preajuste es período y amplitud, 4 de 5.',
      ],
      worked:
        'Quedan abiertas 11 de 120, y las 109 con clase aciertan un 94,5 por ciento de las veces, frente a un 90,8 por ciento si hubiera que clasificar todas. Las abiertas son sobre todo binarias eclipsantes (6) y estrellas delta Scuti (3): los tipos que el período y la amplitud confunden. Con 5 de 5 quedan abiertas 37.',
      feedback: {
        close:
          'Casi. Lee la fila de estrellas abiertas con período y amplitud, 4 de 5.',
        'wrong-order-of-magnitude':
          'El número de estrellas abiertas es una cuenta menor que 120.',
        off: 'Usa período y amplitud, 4 vecinas de 5, y lee la fila.',
      },
    },
  ],
};
