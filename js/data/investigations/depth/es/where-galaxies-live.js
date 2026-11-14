// Dónde viven las galaxias, más a fondo: las palabras en español, paso a paso con ../where-galaxies-live.js.
export default {
  steps: [
    {
      title: 'La razón de las densidades',
      body: `Divide la densidad de la capa cercana entre la de la lejana, tal como se leyeron: 15.800 y 4.860.`,
      prompt: 'La densidad cercana sobre la lejana',
      hints: ['15.800 ÷ 4.860.'],
      worked:
        '15.800 ÷ 4.860 = 3,26. La capa lejana tiene 3,3 veces menos galaxias por volumen, y el volumen que abarca es mayor, así que contiene más en total: 217 frente a 92.',
      feedback: {
        close: 'Casi. Cercana sobre lejana, no al revés.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: las dos densidades difieren en un factor pequeño.',
        off: 'cercana ÷ lejana.',
      },
    },
    {
      title: 'El volumen de una capa',
      body: `La franja cubre un ángulo sólido de 120° × 0,5°, que son 0,01828 estereorradianes. El volumen entre dos distancias r<sub>1</sub> y r<sub>2</sub> es (ángulo sólido ÷ 3)(r<sub>2</sub>³ − r<sub>1</sub>³). Halla el volumen de la capa de 100 a 125 megapársecs.`,
      prompt: 'El volumen de la capa, en megapársecs cúbicos',
      hints: ['0,01828 ÷ 3 = 0,006093, y 125³ − 100³ = 953.125.'],
      worked:
        '0,006093 × 953.125 = 5.807 megapársecs cúbicos. La capa contiene 92 galaxias, que son 92 ÷ 5.807 = 0,01584 por megapársec cúbico, o 15.840 por millón, que el instrumento muestra con tres cifras como 15.800.',
      feedback: {
        close:
          'Casi. Eleva ambas distancias al cubo, resta, y multiplica por un tercio del ángulo sólido.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: los cubos son del orden de un millón, el tercio del ángulo sólido del orden de una centésima.',
        off: '(0,01828 ÷ 3)(125³ − 100³).',
      },
    },
    {
      title: 'Cuánto más brillante',
      body: `Un límite de flujo significa que una galaxia solo puede verse hasta una distancia que crece como la raíz cuadrada de su luminosidad. Una galaxia que apenas pasa el corte a 100 megapársecs queda fuera de alcance a 300 salvo que sea más brillante. ¿Cuántas veces más luminosa debe ser?`,
      prompt:
        'El factor de luminosidad necesario para llegar a 300 megapársecs en lugar de 100',
      hints: [
        'La distancia es tres veces mayor, y el flujo cae como el cuadrado de la distancia.',
      ],
      worked:
        'La distancia es 3 veces mayor, el flujo cae como 3² = 9, así que la galaxia debe ser 9 veces más luminosa. A 300 megapársecs el sondeo solo ve galaxias 9 veces más brillantes que las más débiles que ve a 100, y hay muchas menos de esas: ese es todo el enrarecimiento.',
      feedback: {
        close: 'Casi. El flujo cae como el cuadrado de la razón de distancias.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el factor es un número entero pequeño.',
        off: '(300 ÷ 100)².',
      },
    },
    {
      title: 'Eso en magnitudes',
      body: `Un factor de luminosidad L son 2,5 log<sub>10</sub>(L) magnitudes. Pasa a magnitudes el factor del paso anterior.`,
      prompt: 'El mismo factor, en magnitudes',
      hints: ['2,5 × log₁₀(9).'],
      worked:
        '2,5 × 0,9542 = 2,39 magnitudes. Un sondeo con límite de magnitud pierde 2,4 magnitudes de profundidad en la función de luminosidad entre 100 y 300 megapársecs, aunque ambas capas son el mismo universo.',
      feedback: {
        close: 'Casi. 2,5 veces el log₁₀ del factor.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: unas pocas magnitudes como mucho.',
        off: '2,5 × log₁₀(9).',
      },
    },
  ],
};
