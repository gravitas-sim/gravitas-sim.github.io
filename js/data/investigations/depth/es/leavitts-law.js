// La ley de Leavitt, más a fondo: las palabras en español, paso a paso con ../leavitts-law.js.
export default {
  steps: [
    {
      title: 'Una cefeida de treinta días',
      body: 'La recta es m = a + b (log₁₀ P − 1), con a la magnitud a los 10 días (12,60 aquí) y b la pendiente (−3,29). Una cefeida de la nube tiene un periodo de 30 días. Calcula la magnitud de Wesenheit que le da la recta.',
      prompt: 'La magnitud de Wesenheit de la recta a los 30 días',
      hints: [
        'log₁₀ 30 = 1,477, así que log₁₀ P − 1 = 0,477. Luego 12,60 − 3,29 × 0,477.',
      ],
      worked:
        '12,60 − 3,29 × 0,4771 = 12,60 − 1,57 = 11,03 magnitudes: 1,57 magnitudes más brillante que a los 10 días, un factor 4,2. Leer el brillo de una cefeida a partir de su periodo es todo el método; la distancia sale de comparar este valor con el medido de verdad en otra galaxia.',
      feedback: {
        close: 'Casi. Resta 3,29 por (log₁₀ 30 − 1) al punto cero.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la corrección es de unas 1,6 magnitudes, así que la respuesta ronda 11, no 1 ni 100.',
        off: '12,60 − 3,29 × (log₁₀ 30 − 1).',
      },
    },
    {
      title: 'El error de una estrella en distancia',
      body: 'Supón que mides una cefeida de una galaxia lejana y usas la relación para hallar el módulo de distancia. La estrella queda unas 0,089 magnitudes fuera de la recta, una dispersión. Un cambio Δμ en el módulo cambia la distancia en la fracción (ln 10 ÷ 5) Δμ, o 0,4605 Δμ. Da el error en la distancia, en porcentaje.',
      prompt:
        'El error fraccionario en la distancia de una dispersión, en porcentaje',
      hints: ['0,4605 × 0,0894 × 100.'],
      worked:
        '0,4605 × 0,0894 = 0,0412, que es el 4,1 por ciento. Una cefeida da una distancia buena a un 4 por ciento; cien independientes dan un 0,4 por ciento, por eso se usa toda la muestra de una galaxia, y por eso el límite real son los errores que no se reducen al promediar.',
      feedback: {
        close: 'Casi. Multiplica 0,0894 por 0,4605 y por 100.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: 0,09 magnitudes son unos pocos por ciento en distancia, no unas pocas decenas.',
        off: '100 × 0,4605 × 0,0894.',
      },
    },
    {
      title: 'La razón de brillos',
      body: 'Cinco magnitudes son un factor 100 en brillo, así que una diferencia de Δm magnitudes es un factor 10<sup>0,4 Δm</sup>. Usa la pendiente para hallar cuántas veces más brillante es la cefeida de 100 días que la de 10.',
      prompt: 'La razón de brillos de las dos cefeidas',
      hints: ['10 elevado a 0,4 × 3,29 = 10 elevado a 1,316.'],
      worked:
        '10^(0,4 × 3,29) = 10^1,316 = 20,7. El brillo crece como la potencia 1,3 del periodo: L ∝ P^1,3. Una relación tan empinada es lo que hace visibles a las cefeidas lejos, porque las de periodo largo son lo bastante luminosas para verse en otras galaxias.',
      feedback: {
        close: 'Casi. El exponente es 0,4 por las 3,29 magnitudes.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la razón son un par de decenas, no cientos ni décimas.',
        off: '10^(0,4 × 3,29).',
      },
    },
    {
      title: 'Lo que compran 339 estrellas',
      body: 'El punto cero de un ajuste se conoce aproximadamente con la dispersión dividida por √N para N estrellas independientes. Calcúlalo para 339 estrellas con una dispersión de 0,0894 magnitudes, y compáralo con el error que da el instrumento para la magnitud a los 10 días.',
      prompt: 'El error del punto cero, en magnitudes',
      hints: ['√339 = 18,4.'],
      worked:
        '0,0894 ÷ 18,4 = 0,0049 magnitudes, la cifra que indica el instrumento. La dispersión propia de la calibración apenas importa con 339 estrellas; lo que queda son las 0,026 magnitudes de la distancia de la nube, porque ningún número de cefeidas puede reducirlas.',
      feedback: {
        close:
          'Casi. Divide la dispersión entre la raíz cuadrada del número de estrellas.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: la respuesta es mucho menor que la dispersión, pero no una milésima de ella.',
        off: '0,0894 ÷ √339.',
      },
    },
  ],
};
