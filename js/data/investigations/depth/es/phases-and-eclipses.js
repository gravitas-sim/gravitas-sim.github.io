// Fases y eclipses, más a fondo: palabras en español, paso a paso con ../phases-and-eclipses.js.
export default {
  steps: [
    {
      title: 'El año de los eclipses',
      body: 'La línea de los nodos gira hacia el oeste, una vuelta en 18,6 años (6.798,4 días), así que el Sol encuentra un nodo algo antes de cada año. El intervalo entre regresos, el año de los eclipses E, cumple 1/E = 1/365,2422 + 1/6798,4 por día.',
      prompt:
        'Medio año de eclipses, el tiempo entre temporadas de eclipses, en días',
      hints: ['Suma las dos tasas, invierte y toma la mitad del resultado.'],
      worked:
        'E = 346,62 días, así que la mitad es 173,3 días: las temporadas de eclipses llegan cada 173 días, unos 4 días antes cada medio año que el calendario.',
      feedback: {
        close: 'Casi. Suma los inversos, invierte y luego toma la mitad.',
        'wrong-order-of-magnitude': 'Es cerca de medio año, en días.',
        off: 'E = 1 ÷ (1/365,2422 + 1/6798,4); las temporadas están separadas E ÷ 2.',
      },
    },
    {
      title: 'Una coincidencia de meses',
      body: 'Un mes sinódico, de luna nueva a luna nueva, dura 29,530589&nbsp;días. Un mes dracónico, de nodo a nodo, dura 27,212221&nbsp;días. Tras 223 meses sinódicos la Luna ha completado también casi exactamente 242 meses dracónicos: el saros, tras el cual se repite un eclipse.',
      prompt: '¿En cuántos días difieren 223 meses sinódicos y 242 dracónicos?',
      hints: [
        'Multiplica cada mes por su cantidad y resta.',
        'Los dos totales rondan los 6.585 días.',
      ],
      worked:
        '223 × 29,530589 = 6.585,321 d; 242 × 27,212221 = 6.585,357 d: una diferencia de 0,036 d, menos de una hora.',
      feedback: {
        close: 'Casi. Calcula los dos totales y resta.',
        'wrong-order-of-magnitude':
          'Los dos totales coinciden con menos de una hora de diferencia.',
        off: 'Diferencia = 242 × 27,212221 − 223 × 29,530589.',
      },
    },
  ],
};
