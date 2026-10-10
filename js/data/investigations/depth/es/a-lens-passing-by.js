// Una lente que pasa, más a fondo: las palabras en español, paso a paso con ../a-lens-passing-by.js.
export default {
  steps: [
    {
      title: 'El tiempo de cruce a mano',
      body: 'El ángulo de Einstein de la lente es 0,319 milisegundos de arco y está a 6 kpc, así que su radio de Einstein en la lente es 0,319 × 6 = 1,91 unidades astronómicas. Una unidad astronómica son 1,496 × 10<sup>8</sup> km, y la lente se mueve a 200 km/s a través de la línea de visión.',
      prompt: 'El tiempo que tarda la lente en recorrer un radio de Einstein',
      hints: ['t = R ÷ v, y luego divide entre los 86.400 segundos de un día.'],
      worked:
        'R = 1,91 × 1,496 × 10⁸ km = 2,86 × 10⁸ km; t = 2,86 × 10⁸ ÷ 200 = 1,43 × 10⁶ s = 16,6 días. El instrumento indica el mismo tiempo de cruce.',
      feedback: {
        close: 'Casi. Comprueba la conversión de segundos a días.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: una lente a 200 km/s recorre 17 millones de kilómetros al día.',
        off: 't_E = (1,91 × 1,496 × 10⁸ km) ÷ (200 km/s), en días.',
      },
    },
    {
      title: 'El máximo a mano',
      body: 'La amplificación de una lente puntual es A(u) = (u² + 2) ÷ (u √(u² + 4)). Toma u = 0,5, un paso a medio radio de Einstein.',
      prompt: 'La amplificación con u = 0,5',
      hints: ['u² + 2 = 2,25 y u² + 4 = 4,25.'],
      worked:
        'A = 2,25 ÷ (0,5 × √4,25) = 2,25 ÷ (0,5 × 2,062) = 2,18. A un radio de Einstein sería 1,34 y a una décima es 10; el mismo número es la suma de las dos imágenes de una lente puntual con desplazamiento 0,5 en el plano de la lente.',
      feedback: {
        close: 'Casi. √4,25 es 2,062.',
        off: 'A = (0,25 + 2) ÷ (0,5 × √(0,25 + 4)).',
      },
    },
    {
      title: 'Ajusta el suceso sintético, con la mezcla libre',
      body: 'Activa “Suceso sintético con ruido”. Los puntos grises son un suceso de microlente sintético: una curva modelo con un 2 por ciento de ruido, hecha aquí, así que la verdad existe aunque no se te dice. El instrumento lo ajusta con el ajustador del núcleo de inferencia. Lee el tiempo de cruce del ajuste en que la mezcla es libre.',
      prompt: 'El tiempo de cruce del mejor ajuste con la mezcla libre',
      hints: [
        'Lee “Mejor ajuste con mezcla libre: tE”; su barra de error es de unos 0,65 días.',
      ],
      worked:
        'El ajuste libre da tE = 25,2 ± 0,7 días, u0 = 0,148 y una parte de la fuente de 0,59, con chi cuadrado por punto 1,01: el modelo encaja dentro del ruido. La tolerancia aquí son dos errores estándar.',
      feedback: {
        close: 'Casi. Lee la fila del ajuste con la mezcla libre, no fija.',
        off: 'Usa “Mejor ajuste con mezcla libre: tE”.',
      },
    },
    {
      title: 'El ajuste que supone que no hay mezcla',
      body: 'El otro ajuste fija la mezcla en cero: supone que toda la luz es de la fuente. Halla un suceso más corto con una barra de error mucho menor. Lee su chi cuadrado por punto; un ajuste que describe los datos dentro del ruido tiene cerca de 1.',
      prompt: 'Chi cuadrado por punto del ajuste sin mezcla',
      hints: ['Lee “Mejor ajuste sin mezcla: chi cuadrado por punto”.'],
      worked:
        'El ajuste sin mezcla da chi cuadrado por punto 2,13 con un tiempo de cruce de 17,4 ± 0,06 días: una respuesta equivocada y segura, 8 días por debajo de la verdad, cuya barra de error pequeña cubre solo el ruido y no el supuesto equivocado. La barra mayor del ajuste libre, 0,65 días, es la honrada. Una sola curva no puede darte la masa de todos modos: el tiempo de cruce sigue dejando degeneradas la masa, la distancia y la velocidad.',
      feedback: {
        close: 'Casi. Lee el ajuste fijo, el que no tiene mezcla.',
        off: 'Usa “Mejor ajuste sin mezcla: chi cuadrado por punto”.',
      },
    },
  ],
};
