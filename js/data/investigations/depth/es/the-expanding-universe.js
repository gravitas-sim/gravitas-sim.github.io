// El universo en expansión, más a fondo: las palabras en español, paso a paso con ../the-expanding-universe.js.
export default {
  steps: [
    {
      title: 'El tiempo de Hubble',
      body: `Si las galaxias se hubieran movido siempre a sus velocidades actuales, una galaxia a distancia d habría partido hace d ÷ v = 1 ÷ H<sub>0</sub>. Con H<sub>0</sub> en kilómetros por segundo por megapársec, 1 ÷ H<sub>0</sub> son 977,8 ÷ H<sub>0</sub> miles de millones de años. Usa la pendiente de Hubble de 424.`,
      prompt:
        'El tiempo 1 ÷ H₀ para la pendiente de Hubble, en miles de millones de años',
      hints: ['977,8 ÷ 424.'],
      worked:
        '977,8 ÷ 423,9 = 2,31 miles de millones de años: una edad del universo menor que la de la Tierra, algo que notaron los contemporáneos de Hubble. Con 66,3 la misma estimación es de 14,7 miles de millones de años. Una pendiente demasiado grande daba un universo demasiado joven.',
      feedback: {
        close: 'Casi. Divide 977,8 entre la pendiente.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: una pendiente de varios cientos da un tiempo de unos pocos miles de millones de años.',
        off: '977,8 ÷ la pendiente en km/s/Mpc.',
      },
    },
    {
      title: 'Una velocidad a partir de una distancia',
      body: `La recta por el origen dice v = H<sub>0</sub> d. Usa la pendiente de las supernovas hasta z = 0,1, 66,33, para una galaxia a una distancia de 100 megapársecs.`,
      prompt: 'La velocidad a 100 megapársecs, en kilómetros por segundo',
      hints: ['66,33 × 100.'],
      worked:
        '66,33 × 100 = 6.633 kilómetros por segundo, un corrimiento al rojo de 6.633 ÷ 299.792 = 0,022. Cada megapársec añade 66 kilómetros por segundo, así que una galaxia diez veces más lejos se aleja diez veces más rápido, mientras la recta valga.',
      feedback: {
        close: 'Casi. Multiplica la pendiente por la distancia.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: 66 por cada uno de 100 megapársecs son miles, no cientos ni decenas de miles.',
        off: 'pendiente × distancia.',
      },
    },
    {
      title: 'El error como parte de la pendiente',
      body: `Una pendiente de 66,33 ± 0,24 km/s/Mpc. El error relativo es el error sobre la pendiente. Usa el 0,245 sin redondear del instrumento.`,
      prompt: 'El error de la pendiente, en porcentaje',
      hints: ['100 × 0,245 ÷ 66,33.'],
      worked:
        '100 × 0,245 ÷ 66,33 = 0,37 por ciento. Un tercio de uno por ciento, con 197 supernovas, que es solo el error estadístico: los errores sistemáticos de la escala de distancias son mucho mayores, como deja claro la investigación siguiente.',
      feedback: {
        close: 'Casi. Divide el error entre la pendiente y multiplica por 100.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: un cuarto de unidad en 66 es una fracción de uno por ciento.',
        off: '100 × error ÷ pendiente.',
      },
    },
    {
      title: 'A cuántos errores',
      body: `La muestra cercana da 66,33 ± 0,245 y la lejana 59,35 ± 0,196. Para dos estimaciones independientes, la diferencia sobre la raíz cuadrada de la suma de los errores al cuadrado es el número de desviaciones típicas entre ellas.`,
      prompt: 'El número de desviaciones típicas entre las dos pendientes',
      hints: [
        'La diferencia es 6,98. El error combinado es sqrt(0,245² + 0,196²).',
      ],
      worked:
        '6,98 ÷ sqrt(0,0600 + 0,0384) = 6,98 ÷ 0,3137 = 22,3. Las muestras se solapan (la cercana está en la lejana), así que el número verdadero no es exactamente este, pero una pendiente que cambia veinte desviaciones típicas no es ruido. La muestra hasta z = 0,5 tiene la forma equivocada para una recta.',
      feedback: {
        close:
          'Casi. Divide la diferencia entre el error combinado, no entre uno solo.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la diferencia es varias veces el error de cada pendiente, no cientos.',
        off: '(66,33 − 59,35) ÷ sqrt(0,245² + 0,196²).',
      },
    },
  ],
};
