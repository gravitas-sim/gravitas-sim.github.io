// La forma de la expansión - español, paso a paso con ../the-shape-of-expansion.js.
export default {
  title: 'La forma de la expansión',
  subtitle:
    'Ajustar la densidad de materia a 1.829 supernovas, y lo que el ajuste puede y no puede decir',
  objectives: [
    'Decir de qué depende la curva del módulo de distancia frente al corrimiento al rojo, y qué predice un universo solo de materia',
    'Leer una densidad de materia de mejor ajuste, su intervalo y un chi cuadrado frente al ajuste',
    'Decir por qué un ajuste con solo errores estadísticos da un intervalo demasiado estrecho',
    'Decir qué pueden determinar las supernovas, y qué no',
  ],
  steps: [
    {
      title: 'Una curva por el diagrama',
      body: `La curva cálida es un modelo: un universo plano de materia, con densidad Ω<sub>m</sub> como fracción de la densidad crítica, y una <strong>constante cosmológica</strong> que completa el resto. Su forma es la historia de la expansión. El modelo no tiene posición vertical libre: el instrumento lo desplaza con el único desfase que mejor ajusta, porque las supernovas solas no fijan la escala.
             \n\nLa segunda imagen resta un <strong>universo vacío y sin frenado</strong> de cada punto y de la curva, de modo que una recta plana en cero es lo que darían ni deceleración ni aceleración. Una supernova por encima de la recta es más débil de lo que dice ese universo, y una por debajo es más brillante. Los datos son las supernovas <strong>auténticas</strong> del Dark Energy Survey, con solo errores estadísticos.`,
    },
    {
      title: 'Un universo solo de materia',
      body: `Con solo materia, la gravedad frena la expansión, así que para un corrimiento al rojo dado la luz ha recorrido un camino más corto que en un universo vacío. Fija <strong>Ω<sub>m</sub> = 1</strong>, en la imagen de residuos. Todavía no leas la lectura.`,
      prompt: 'La curva solo de materia quedará&hellip;',
      options: [
        'justo por las supernovas, porque la materia es todo lo que hay',
        'por debajo de las supernovas: las reales son más débiles de lo que predice un universo que frena',
        'por encima de las supernovas: las reales son más brillantes de lo que predice',
        'sobre la recta en cero, igual que el universo vacío',
      ],
      hints: [
        'Un universo que frena acorta las distancias, así que sus supernovas parecen más brillantes. Las reales parecen…',
      ],
      because:
        'La curva queda por debajo de las supernovas. La deceleración acorta las distancias, así que un universo solo de materia predice supernovas más brillantes que las reales, que son más débiles. El paso siguiente pone cifra a lo mal que ajusta.',
    },
    {
      title: 'Lo mal que ajusta solo la materia',
      body: `Con <strong>Ω<sub>m</sub> = 1</strong> fijado, lee el <strong>chi cuadrado de la curva elegida</strong> y cuánto está <strong>por encima del mejor ajuste</strong>.`,
      fields: [
        { label: 'Chi cuadrado de la curva' },
        { label: 'Por encima del mejor ajuste' },
      ],
    },
    {
      title: 'El mejor ajuste',
      body: `Lee la <strong>densidad de materia de mejor ajuste</strong> y los dos extremos de su <strong>intervalo del 68%</strong>.`,
      fields: [
        { label: 'Ωm de mejor ajuste' },
        { label: 'Extremo inferior del intervalo' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    {
      title: 'Frente a 0,30',
      body: `Muchos libros usan Ω<sub>m</sub> = 0,3. Fíjalo en <strong>0,30</strong> y lee cuánto está el <strong>chi cuadrado de la curva</strong> <strong>por encima del mejor ajuste</strong>.`,
      fields: [{ label: 'Por encima del mejor ajuste' }],
    },
    {
      title: '¿Está descartado 0,30?',
      body: `Por los errores del instrumento, Ω<sub>m</sub> = 0,30 está a 5,6 desviaciones típicas del mejor ajuste. El análisis publicado de esta muestra, con el presupuesto completo de errores del sondeo, da 0,352 ± 0,017.`,
      prompt: '¿Qué explica un intervalo más estrecho que el publicado?',
      options: [
        'Los errores del instrumento son solo los estadísticos de las supernovas; los errores que comparten todas, como la calibración, las correcciones y la selección del sondeo, quedan fuera y ensanchan el intervalo verdadero',
        'El valor publicado es sencillamente erróneo',
        'Una muestra mayor da siempre un intervalo más ancho',
        'El intervalo es la dispersión de los puntos, que es grande',
      ],
      misconceptions: [
        {
          say: 'El intervalo publicado responde una pregunta más difícil, con errores que este ajuste deja fuera. Es más ancho porque es más honesto, no porque sea otra medición.',
        },
        {
          say: 'Más datos estrechan el intervalo estadístico. No pueden estrechar la parte del error que todos los puntos comparten.',
        },
      ],
      hints: [
        'Pregunta qué errores mueven todas las supernovas a la vez, y si un ajuste a la dispersión de los puntos puede verlos.',
      ],
      because:
        'El intervalo sale de los errores propios de los puntos, que bajan con el número de supernovas. Los errores comunes a todas no bajan y no están en la tabla que lee el instrumento. El valor publicado, 0,352 ± 0,017, está a menos de 0,01 de este ajuste, y su intervalo es unas 1,5 veces más ancho.',
    },
    {
      title: 'Cambiar la escala',
      body: `Fija la densidad de materia en el mejor ajuste, <strong>0,36</strong>. Luego piensa en el otro control: el error en la magnitud absoluta de las supernovas, que representa cualquier cambio de calibración. Todavía no lo cambies.`,
      prompt:
        'Moverlo 0,15 magnitudes cambiará el chi cuadrado de la curva&hellip;',
      options: [
        'en cientos: la curva ya no ajustará',
        'en unos treinta, como al mover Ωm a 0,30',
        'nada, aunque cambiará la constante de Hubble implícita',
        'en 0,15',
      ],
      hints: [
        'El ajuste ya resuelve un desfase vertical libre. ¿Qué pasa cuando añades otro?',
      ],
      because:
        'El chi cuadrado no cambia. Un error en la magnitud absoluta es un desplazamiento vertical de todos los módulos, y el ajuste tiene un desplazamiento vertical libre, así que el segundo se absorbe. La constante de Hubble que implica se mueve, y el paso siguiente muestra cuánto.',
    },
    {
      title: 'La escala es libre',
      body: `Con Ω<sub>m</sub> en <strong>0,36</strong>, lleva el <strong>error en la magnitud absoluta</strong> a <strong>0,15</strong>. Lee el <strong>chi cuadrado de la curva</strong> y la <strong>constante de Hubble implícita</strong>.`,
      fields: [
        { label: 'Chi cuadrado de la curva' },
        { label: 'Constante de Hubble implícita' },
      ],
    },
    {
      title: 'Lo que has deducido',
      body: `Solo la materia no puede describir estas supernovas: Ω<sub>m</sub> = 1 está 1.615 en chi cuadrado por encima del mejor ajuste, que es Ω<sub>m</sub> = 0,361 (0,349 a 0,372), y el resto una constante cosmológica. Las supernovas son más débiles de lo que predice un universo que frena, así que la expansión se ha ido acelerando. Lo que no pueden dar es la escala, H<sub>0</sub>, que cualquier desfase oculta.
             \n\nSe supone aquí: un universo plano, una densidad constante de energía oscura (w = −1), sin radiación y sin curvatura del modelo salvo el universo vacío de la imagen de residuos, y solo errores estadísticos. Otra suposición, por ejemplo un universo curvo, desplaza la densidad y da otro intervalo; los datos solos no eligen entre ellas sin otras medidas.`,
    },
  ],
};
