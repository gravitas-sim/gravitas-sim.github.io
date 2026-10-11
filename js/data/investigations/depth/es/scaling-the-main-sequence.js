// Escalar la secuencia principal, más a fondo: las palabras en español, paso a paso con ../scaling-the-main-sequence.js.
export default {
  steps: [
    {
      title: 'Duplicar la masa, según los modelos',
      body: 'La escala dice que L ∝ M³, así que duplicar la masa multiplica la luminosidad por 2³ = 8. Elige el modelo de 20 masas solares y lee su luminosidad, luego el de 40 masas solares, y divide la segunda entre la primera.',
      prompt:
        'Luminosidad del modelo de 40 M☉ ÷ luminosidad del modelo de 20 M☉',
      hints: [
        'Las luminosidades son unas 42.900 y 226.600 luminosidades solares.',
      ],
      worked:
        '226.595 ÷ 42.855 = 5,29, no 8: entre 20 y 40 masas solares la luminosidad crece más despacio que M³. La presión de radiación es grande en estas estrellas, y una estrella cerca de su límite de Eddington tiene una luminosidad que solo crece como M.',
      feedback: {
        close: 'Casi. Divide la luminosidad mayor entre la menor.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: un factor dos en la masa da aquí un factor de pocas unidades en la luminosidad.',
        off: 'Lee la luminosidad de cada modelo de 20 y 40 masas solares y divide la segunda entre la primera.',
      },
    },
    {
      title: 'El exponente entre dos modelos',
      body: 'Una ley de potencias por dos puntos tiene exponente log(L₂ ÷ L₁) ÷ log(M₂ ÷ M₁). Usa los dos modelos más masivos, de 20 y 40 masas solares, cuyas luminosidades puedes leer en el instrumento.',
      prompt: 'El exponente efectivo de la luminosidad de 20 a 40 M☉',
      hints: [
        'El cociente de luminosidades es 5,29 y el de masas es 2: el exponente es log 5,29 ÷ log 2.',
      ],
      worked:
        'log₂ 5,29 = 2,40. El exponente ha bajado de 3,16 entre 2 y 40 a 2,4 en la última octava, y sigue bajando hacia 1 cuando el límite de Eddington toma el mando: la escala para la dispersión de electrones es una etapa en el camino, no el final.',
      feedback: {
        close: 'Casi. Usa log 5,29 ÷ log 2, en la misma base.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el exponente es un número entre 1 y 4.',
        off: 'Exponente = log(5,29) ÷ log(2).',
      },
    },
  ],
};
