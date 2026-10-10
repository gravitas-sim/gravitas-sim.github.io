// El cielo que gira, más a fondo: las palabras en español, paso a paso con ../the-turning-sky.js.
export default {
  steps: [
    {
      title: 'Los cuatro minutos a partir del año',
      body: 'En un año de 365,2422 días la Tierra da 366,2422 vueltas respecto de las estrellas: una vuelta más que el número de amaneceres. Un día solar tiene 1.440 minutos.',
      prompt: '¿Cuántos minutos más corto que un día solar es un día sidéreo?',
      hints: [
        'La vuelta extra se reparte entre todos los días del año.',
        'Divide 1.440 minutos entre el número de vueltas.',
      ],
      worked:
        '1.440 min ÷ 366,2422 = 3,93 min, así que un día sidéreo dura 23 h 56 min 4 s.',
      feedback: {
        close:
          'Casi. Divide el día solar entre el número de vueltas en un año, 366,2422.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Los dos tipos de día difieren en minutos, no en horas ni en segundos.',
        off: 'Más corto en 1.440 ÷ 366,2422 minutos.',
      },
    },
    {
      title: 'Cuánto tiempo se queda arriba',
      body: 'Con Arcturus seleccionada a latitud 40&deg;, halla con las horas de salida y de puesta cuánto tiempo está sobre el horizonte. El ángulo horario al que se pone una estrella cumple cos H = &minus;tan&nbsp;latitud &times; tan&nbsp;declinación, así que el tiempo arriba es 2H en horas de tiempo sidéreo. El instrumento también tiene en cuenta la refracción y el lugar aparente de la estrella.',
      prompt: 'Tiempo que Arcturus está sobre el horizonte a latitud 40°',
      hints: [
        'Resta la hora de salida a la de puesta y pasa los minutos a horas.',
        'O usa la fórmula: H = arccos(−tan 40° × tan 19,2°), y 2H ÷ 15 da las horas.',
      ],
      worked:
        'Sale a los 738,5 min y se pone a los 1.597,6 min después del mediodía: 859,1 min = 14,3 h.',
      feedback: {
        close:
          'Casi. Toma la puesta menos la salida y divide entre 60 para tener horas.',
        'wrong-order-of-magnitude':
          'Una estrella está arriba entre 0 y 24 horas.',
        off: 'Tiempo arriba = (hora de puesta − hora de salida) ÷ 60, en horas.',
      },
    },
  ],
};
