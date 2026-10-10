// El Sol a lo largo del año, más a fondo: palabras en español, paso a paso con ../the-sun-through-the-year.js.
export default {
  steps: [
    {
      title: 'Luz solar sobre un metro cuadrado',
      body: 'La luz solar media diaria en lo alto de la atmósfera sobre un metro cuadrado horizontal es S&#8320;/&pi; &times; (1/R&sup2;) &times; (H sen&phi; sen&delta; + cos&phi; cos&delta; sen&nbsp;H), donde S&#8320; es la constante solar del Sol del núcleo de radiación, 1.361&nbsp;W/m&sup2;, R la distancia en ua y H el semiarco del día. El instrumento la evalúa. A latitud 40&deg;, léela en los dos solsticios.',
      fields: [
        { label: 'Solsticio de junio' },
        { label: 'Solsticio de diciembre' },
        { label: 'Junio dividido entre diciembre' },
      ],
    },
    {
      title: 'Cuánto importa la distancia',
      body: 'La luz solar cae como 1/R&sup2;. El Sol está a 1,0163&nbsp;ua en el solsticio de junio y a 0,9838&nbsp;ua en el de diciembre.',
      prompt:
        '¿En qué porcentaje es más fuerte la luz solar en diciembre que en junio, solo por la distancia?',
      hints: [
        'La razón de las luces es el cuadrado de la razón inversa de las distancias.',
        'Pasa la razón a un porcentaje de aumento.',
      ],
      worked:
        '(1,0163 / 0,9838)² = 1,067: un 6,7 por ciento más fuerte en diciembre, frente a un cambio de tres veces a 40° por la inclinación.',
      feedback: {
        close:
          'Casi. Eleva al cuadrado la razón de las distancias y luego resta 1.',
        'wrong-order-of-magnitude': 'Unos pocos por ciento, no decenas.',
        off: 'Luz solar ∝ 1/R², así que la razón es (R junio ÷ R diciembre)².',
      },
    },
    {
      title: 'El polo supera al ecuador',
      body: 'En el solsticio de junio, lee la luz solar media diaria a latitud 0&deg; y a latitud 65&deg;.',
      prompt: '¿Cuál recibe más luz solar a lo largo del día?',
      options: [
        'la latitud 65°, donde el Sol está bajo pero arriba durante 22 horas',
        'el ecuador, donde el Sol está alto al mediodía',
        'son iguales',
        'ninguna: no hay luz solar en lo alto de la atmósfera',
      ],
      hints: [
        'Compara los dos números de la lectura, y las duraciones del día.',
      ],
      because:
        'La latitud 65° recibe unos 478 W/m² frente a los 385 del ecuador: el Sol está arriba 22 horas, y eso pesa más que la menor altura. En todo el año el ecuador sigue recibiendo más, porque el invierno polar no tiene ninguna.',
    },
  ],
};
