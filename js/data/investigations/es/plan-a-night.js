// Planifica una noche en el telescopio - español, paso a paso con ../plan-a-night.js.
export default {
  title: 'Planifica una noche en el telescopio',
  subtitle:
    'Elige objetivos para una fecha y un lugar con límites de crepúsculo, masa de aire y Luna',
  objectives: [
    'Medir las horas de oscuridad astronómica de una fecha y un lugar',
    'Calcular una masa de aire a partir de una altura y decir por qué los observadores la limitan',
    'Medir lo que le cuesta a un objetivo una Luna brillante',
    'Elegir objetivos que cumplan tres restricciones y justificar cada elección con palabras',
  ],
  steps: [
    {
      title: 'El encargo',
      body: 'Tienes una noche en un telescopio a latitud 30° norte, y ocho estrellas brillantes que te gustaría observar. ¿Cuáles puedes observar, y por cuánto tiempo? Lo deciden tres cosas: la <strong>oscuridad astronómica</strong> (el Sol a más de 18° bajo el horizonte), la <strong>masa de aire</strong> (cuánta atmósfera cruza la luz, que crece cuando una estrella está baja) y la <strong>Luna</strong> (una Luna brillante cerca borra el cielo).\n\nEs el paso previo a las investigaciones <em>Diseña el calendario</em> y <em>Doce noches</em>, que toman el objetivo como dado y planifican sus épocas. Aquí eliges los objetivos. El instrumento es un modelo del núcleo del Laboratorio del Cielo: cada fila es una estrella a lo largo de la noche, y la lista de abajo da sus horas utilizables.',
    },
    {
      title: 'Predice la oscuridad',
      body: 'La noche del 29 de enero y la noche del 21 de junio, a latitud 30° norte.',
      prompt: 'Comparada con la noche de enero, la noche de junio tiene una oscuridad astronómica&hellip;',
      options: [
        'de duración parecida',
        'unas cuatro horas más corta',
        'el doble de larga',
        'ausente por completo',
      ],
      hints: ['A latitudes medias el Sol de verano se mantiene más cerca del horizonte toda la noche.'],
      because:
        'Unas cuatro horas más corta: el Sol de verano no se hunde mucho bajo el horizonte, así que el crepúsculo dura más y la oscuridad se reduce. El paso siguiente mide las dos noches.',
    },
    {
      title: 'Cuánto dura la oscuridad',
      body: 'Pon la tarde en 2025-01-29 y luego en 2025-06-21, a latitud 30°. Lee cada vez la duración de la oscuridad astronómica.',
      fields: [
        { label: 'Oscuridad astronómica, 29 de enero' },
        { label: 'Oscuridad astronómica, 21 de junio' },
        { label: 'Cuánto más larga en enero' },
      ],
    },
    {
      title: 'Cuánta atmósfera',
      body: 'La masa de aire es el camino a través de la atmósfera comparado con mirar directamente hacia arriba. Para una capa plana es 1/sen(altura).',
      prompt: 'Masa de aire de una estrella a una altura de 30°',
      hints: [
        '¿Cuánto vale el seno de 30°?',
        'Masa de aire = 1 ÷ sen(altura).',
      ],
      worked:
        '1 ÷ sen 30° = 1 ÷ 0,5 = 2,0. El ajuste más cuidadoso que usa el núcleo da 1,99.',
      feedback: {
        close: 'Casi. Masa de aire = 1 dividido entre el seno de la altura.',
        'wrong-order-of-magnitude':
          'Cerca del cenit la masa de aire es 1; a 30° es un entero pequeño.',
        off: 'Masa de aire = 1 ÷ sen(altura).',
      },
    },
    {
      title: 'Por qué limitar la masa de aire',
      body: 'La mayoría de las propuestas de observación dicen «masa de aire menor que 2».',
      prompt: '¿Por qué un límite?',
      options: [
        'Las estrellas bajas son más tenues, más rojas y más borrosas, y la refracción es más difícil de corregir, así que la medición es peor',
        'Los telescopios no pueden apuntar por debajo de una altura de 30°',
        'Las estrellas se mueven más rápido cerca del horizonte',
        'La Luna siempre está cerca del horizonte',
      ],
      hints: ['Piensa en cómo se ve el Sol cerca del horizonte.'],
      because:
        'Una estrella baja se ve a través de más aire: se atenúa, se enrojece, se desenfoca por la turbulencia, y la refracción desplaza su posición en una cantidad que depende del tiempo. Los observadores cambian una ventana más larga por una medición peor, y el límite de masa de aire es donde paran.',
    },
    {
      title: 'Lo que cuesta la Luna',
      body: 'Mira Régulo, con el límite de masa de aire 2 y la menor distancia a la Luna 30°. Lee sus horas utilizables la tarde de 2025-01-29 (luna nueva) y la tarde de 2025-02-12 (luna llena).',
      fields: [
        { label: 'Régulo, noche de luna nueva' },
        { label: 'Régulo, noche de luna llena' },
        { label: 'Horas perdidas por la Luna' },
      ],
    },
    {
      title: 'Cuántas valen la pena',
      body: 'Pon la tarde en 2025-02-15, latitud 30°, límite de masa de aire 2 y menor distancia a la Luna 30°. Un objetivo vale una noche si tiene al menos 3 horas utilizables.',
      prompt:
        '¿Cuántas de las ocho estrellas tienen al menos 3 horas utilizables?',
      hints: [
        'Lee las horas utilizables de cada estrella en la lista y cuenta las de 3 o más.',
      ],
      worked:
        'Sirio, Arturo, Capela, Aldebarán y Régulo: cinco. Vega, Spica y Altair tienen menos de tres horas o ninguna.',
      feedback: {
        close: 'Casi. Cuenta las filas con 3 horas o más.',
        'wrong-order-of-magnitude': 'Solo hay ocho estrellas.',
        off: 'Cuenta las estrellas cuyas horas utilizables son al menos 3.',
      },
    },
    {
      title: 'Una masa de aire más estricta',
      body: 'Para fotometría precisa quieres un límite más estricto. Baja la masa de aire máxima a 1,5, manteniendo la misma tarde.',
      prompt:
        'Ahora, ¿cuántas de las ocho estrellas tienen al menos 3 horas utilizables?',
      hints: ['Vuelve a leer la lista tras cambiar el límite y cuenta.'],
      worked:
        'Arturo, Capela, Aldebarán y Régulo siguen teniendo 3 horas o más; Sirio baja a 1,5 horas.',
      feedback: {
        close: 'Casi. Vuelve a contar tras cambiar el límite.',
        'wrong-order-of-magnitude': 'Solo hay ocho estrellas.',
        off: 'Cuenta las estrellas cuyas horas utilizables son al menos 3.',
      },
    },
    {
      title: 'Escribe el plan',
      body: 'Pon la tarde en 2025-02-15, masa de aire máxima 2, distancia a la Luna 30°. Mira las barras: dónde es utilizable cada estrella a lo largo de la noche.',
      prompt:
        'Escribe un plan para la noche: tres objetivos, el orden en que los observarías y qué restricción decide cada uno.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Una noche en el telescopio es un conjunto de ventanas: la oscuridad astronómica, el tiempo que cada estrella está sobre el límite de masa de aire y el tiempo que está lejos de la Luna. Las horas de oscuridad cambian en horas a lo largo del año, la Luna puede quitar un objetivo por completo, y un límite de masa de aire más estricto recorta todas las ventanas. Las investigaciones sobre velocidad radial y calendario siguen desde aquí, con el objetivo ya elegido.',
    },
  ],
};
