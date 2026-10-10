// Planifica una noche, más a fondo: palabras en español, paso a paso con ../plan-a-night.js.
export default {
  steps: [
    {
      title: 'Cuánto se equivoca la capa plana',
      body: 'La masa de aire de capa plana 1/sen(altura) crece sin límite en el horizonte, lo que la atmósfera real, curva, no hace. El ajuste de Kasten y Young que usa el núcleo da 5,59 a una altura de 10&deg;.',
      prompt: '¿Cuánto sobreestima 1/sen(altura) la masa de aire a 10°?',
      hints: ['Calcula 1 ÷ sen 10° y luego resta el ajuste.'],
      worked:
        '1 ÷ sen 10° = 5,76, y 5,76 − 5,59 = 0,17: un error del 3 por ciento con una masa de aire cercana a 6, despreciable cerca de 2.',
      feedback: {
        close: 'Casi. 1 ÷ sen 10° es unos 5,76; resta el ajuste.',
        'wrong-order-of-magnitude':
          'Las dos masas de aire coinciden con unos pocos por ciento.',
        off: 'Diferencia = 1/sen(10°) − 5,59.',
      },
    },
    {
      title: 'Por qué no hay oscuridad',
      body: 'Pon la tarde en 2025-06-21 y la latitud en 60&deg;: el instrumento informa de que no hay oscuridad astronómica. A medianoche el Sol está lo más bajo, a una altura de latitud + declinación &minus; 90&deg;. El 21 de junio la declinación es +23,44&deg;. La oscuridad astronómica necesita una altura menor que &minus;18&deg;.',
      prompt: 'La altura del Sol a medianoche el 21 de junio a latitud 60°',
      hints: ['Suma la latitud y la declinación, y luego resta 90°.'],
      worked:
        '60° + 23,44° − 90° = −6,6°, muy por encima de −18°: el cielo nunca se oscurece lo bastante.',
      feedback: {
        close: 'Casi. Latitud más declinación menos 90°.',
        'wrong-order-of-magnitude': 'Es un ángulo negativo pequeño.',
        off: 'Altura mínima = latitud + declinación − 90°.',
      },
    },
  ],
};
