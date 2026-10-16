// Errantes en el cielo, más a fondo: palabras en español, paso a paso con ../wanderers-on-the-sky.js.
export default {
  steps: [
    {
      title: 'Cada cuánto vuelve el lazo',
      body: 'La Tierra gana a Marte una vez por <em>periodo sinódico</em> S, con 1/S = 1/P<sub>Tierra</sub> − 1/P<sub>Marte</sub>. Los periodos orbitales son 365,256 y 686,98 días.',
      prompt: 'El periodo sinódico de Marte',
      hints: ['Toma la diferencia de las dos tasas (por día) e invierte.'],
      worked:
        '1/S = 1/365,256 − 1/686,98, así que S = 779,9 días: un lazo retrógrado cada unos 26 meses.',
      feedback: {
        close: 'Casi. Resta los inversos y luego invierte.',
        'wrong-order-of-magnitude':
          'Más largo que un año y más corto que una década.',
        off: 'S = 1 ÷ (1/365,256 − 1/686,98).',
      },
    },
    {
      title: 'La velocidad del lazo',
      body: 'En la oposición la Tierra (29,78&nbsp;km/s) adelanta a Marte (24,07&nbsp;km/s) en una línea que pasa por el Sol, a 0,524&nbsp;ua (7,84×10⁷&nbsp;km) en órbitas circulares. La línea de visión gira a la velocidad relativa dividida entre la distancia.',
      prompt:
        'La tasa hacia el oeste de Marte en la oposición en órbitas circulares, como magnitud en grados por día',
      hints: [
        'Velocidad relativa ÷ distancia da radianes por segundo; pásalo a grados por día.',
      ],
      worked:
        '(29,78 − 24,07) km/s ÷ 7,84×10⁷ km = 7,3×10⁻⁸ rad/s = 0,36° por día. El instrumento da 0,40° por día en esta oposición, porque las órbitas no son circulares.',
      feedback: {
        close:
          'Casi. Velocidad relativa ÷ distancia, y luego radianes a grados y segundos a días.',
        'wrong-order-of-magnitude':
          'Un planeta se mueve menos de un grado al día contra las estrellas.',
        off: 'Tasa = (v Tierra − v Marte) ÷ distancia, en rad por segundo; ×86.400 s y ×57,30 para grados por día.',
      },
    },
  ],
};
