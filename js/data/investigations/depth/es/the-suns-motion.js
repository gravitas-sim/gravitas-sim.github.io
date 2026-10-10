// El movimiento del Sol, más a fondo: las palabras en español, paso a paso con ../the-suns-motion.js.
export default {
  steps: [
    {
      title: 'La rapidez a partir de las componentes',
      body: 'Las tres componentes son perpendiculares, así que la rapidez del Sol es la raíz cuadrada de la suma de sus cuadrados: √(U² + V² + W²). Usa los tres valores que mediste (10,5, 21,9 y 9,1&nbsp;km/s, o los tuyos).',
      prompt: 'La rapidez del Sol respecto de estas estrellas',
      hints: ['Eleva al cuadrado las tres, súmalas y saca la raíz cuadrada.'],
      worked:
        '10,48² + 21,92² + 9,10² = 109,8 + 480,5 + 82,8 = 673,2, y √673,2 = 25,95 km/s. El instrumento lista el mismo número como la rapidez.',
      feedback: {
        close:
          'Casi. Comprueba que elevaste al cuadrado las componentes y sumaste las tres antes de la raíz.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. La rapidez no puede ser mucho mayor que la mayor componente, 22 km/s.',
        off: 'Rapidez = √(U² + V² + W²), en km/s.',
      },
    },
    {
      title: 'El retraso de Strömberg a mano',
      body: 'Lee σ<sub>U</sub>, la dispersión de velocidades de las estrellas en U, de la lista a 100&nbsp;pc: 38,1&nbsp;km/s. La relación de Strömberg dice que las estrellas se retrasan respecto del sistema local en reposo en σ<sub>U</sub>² ÷ 80&nbsp;km/s.',
      prompt: 'El retraso',
      hints: ['Eleva primero 38,1 al cuadrado y luego divide entre 80.'],
      worked:
        '38,11² = 1.452 y 1.452 ÷ 80 = 18,15 km/s. La V del Sol respecto de las estrellas es 21,92, así que respecto del LSR es 21,92 − 18,15 = 3,77 km/s.',
      feedback: {
        close: 'Casi. El retraso es σ_U al cuadrado, dividido entre 80.',
        off: 'Retraso = σ_U² ÷ 80 km/s, con σ_U = 38,1 km/s.',
      },
    },
    {
      title: 'De dónde viene la incertidumbre',
      body: 'La incertidumbre de la U del Sol es la dispersión de las estrellas dividida entre la raíz cuadrada de cuántas hay. Dentro de 1.000&nbsp;pc hay 1.570 estrellas y σ<sub>U</sub> es 41,0&nbsp;km/s.',
      prompt: 'La incertidumbre de U',
      hints: ['√1.570 es cerca de 39,6.'],
      worked:
        '41,0 ÷ √1.570 = 41,0 ÷ 39,62 = 1,03 km/s. Con cuatro veces más estrellas se reduciría a la mitad; baja solo como la raíz cuadrada.',
      feedback: {
        close:
          'Casi. Divide entre la raíz cuadrada de la cuenta, no entre la cuenta.',
        off: 'Incertidumbre = σ ÷ √N, con σ = 41,0 km/s y N = 1.570.',
      },
    },
    {
      title: 'Lo que cuesta el supuesto',
      body: 'A 100&nbsp;pc, lee la <strong>rapidez</strong> del Sol en el sistema de Strömberg (14,4&nbsp;km/s) y en el de Schönrich (18,5&nbsp;km/s). U y W son iguales en los dos; solo V es diferente.',
      prompt: 'La diferencia de la rapidez del Sol entre los dos sistemas',
      hints: ['Lee la fila Rapidez en cada sistema y resta.'],
      worked:
        'Strömberg: √(10,48² + 3,77² + 9,10²) = 14,38. Schönrich: √(10,48² + 12,24² + 9,10²) = 18,51. La diferencia es 4,12 km/s: casi el 30 por ciento de la rapidez menor, por la elección de una referencia.',
      feedback: {
        close: 'Casi. Resta la rapidez menor de la mayor.',
        off: 'Diferencia de las dos filas Rapidez, a 100 pc.',
      },
    },
    {
      title: '¿Qué lo resolvería?',
      body: 'La corrección de Strömberg trata el retraso como fijado solo por la dispersión. Schönrich y sus colegas hallaron que depende también de la metalicidad. En esta muestra, ajustar el retraso por intervalos de color da una V del Sol que se mueve más que su propio error de una elección de intervalos a otra.',
      prompt: '¿Qué permitiría a una muestra decidir entre los dos valores?',
      options: [
        'Muchas más estrellas con velocidad radial y metalicidad medida, separadas por ambas, para ajustar el retraso frente a cada una',
        'Usar solo las 25 estrellas más cercanas, donde no hay retraso',
        'Promediar los dos valores publicados',
        'Una mejor corrección del punto cero del paralaje',
      ],
      misconceptions: [
        {
          say: 'Un promedio no es una medición: sería un tercer valor sin argumento detrás.',
        },
      ],
      hints: [
        '¿Qué necesitarías para ver la dependencia de la metalicidad por separado de la de la dispersión?',
      ],
      because:
        'Muchas más estrellas con metalicidad, separadas por ambas. Las dos correcciones difieren en de qué depende el retraso, así que solo una muestra lo bastante grande para separar las dependencias puede elegir. Hasta entonces el valor es un supuesto, que se declara con el resultado.',
    },
  ],
};
