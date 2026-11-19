// Weighing the Stars, deeper: the Spanish words, step for step with ../weighing-stars.js.
export default {
  steps: [
    {
      title: '¿Qué tan seguro es el total?',
      body: 'Tu periodo salió de un cronómetro que arranca y para una persona, así que es una lectura, no un valor exacto. Cronometra una vuelta otra vez, las veces que decidas (al menos dos), y toma cada tiempo. La dispersión de tus propios tiempos es lo que fija la barra de error del periodo.\n\nEl tamaño de la órbita se lee del panel, así que su incertidumbre es la finura con que lo imprime. Di cuánto podría desviarse cada una.\n\nLuego la página mueve una lectura cada vez, con las lecturas que ya tomaste, y recalcula la masa: <em>a</em> por su barra de error, después <em>P</em> por la suya. Esto se hace con tus números, no volviendo a ejecutar la escena. La masa es <em>a</em>³ / <em>P</em>², así que un error fraccionario en <em>a</em> cuenta tres veces y uno en <em>P</em> dos; los errores independientes se suman en cuadratura.',
      tool: {
        title: 'Cronometra una vuelta otra vez',
        note: 'Pulsa Marcar, espera a que la Estrella A vuelva a la línea de puntos, y pulsa Parar.',
      },
      fields: [
        { label: 'Tiempo 1, una vuelta', unit: 'años' },
        { label: 'Tiempo 2, una vuelta', unit: 'años' },
        { label: 'Tiempo 3, una vuelta', unit: 'años' },
        { label: 'Tiempo 4, una vuelta', unit: 'años' },
        { label: 'Tiempos tomados' },
        { label: 'Dispersión de la media de tus tiempos', unit: 'años' },
        {
          label: 'Cuánto podría desviarse P',
          unit: 'años',
          hint: 'fijado por tus propios tiempos',
        },
        {
          label: 'Cuánto podría desviarse a',
          unit: 'UA',
          hint: 'fijado por la finura con que lo imprime el panel',
        },
        {
          label: 'La masa se mueve esto si solo a se desvía su barra de error',
          unit: 'M☉',
        },
        {
          label: 'La masa se mueve esto si solo P se desvía su barra de error',
          unit: 'M☉',
        },
        { label: 'Masa total', unit: 'M☉' },
        { label: 'Su incertidumbre', unit: 'M☉' },
      ],
    },
    {
      title: 'Da la masa con barra de error',
      body: 'Escribe la masa total del par como se da: el valor, ±, y su incertidumbre del paso anterior. Cuenta como correcta cuando el rango que das se solapa con el que respalda la medición y no es más ancho que el doble de la semianchura de ese rango.',
      prompt: 'Masa total del par, con su incertidumbre',
      placeholder: 'un valor y, luego, ± su incertidumbre',
      hints: {
        concept: 'Una masa es un valor y lo bien que se conoce.',
        method: 'Copia el total y su incertidumbre del paso anterior.',
      },
      because: 'Cuatro masas solares, con incertidumbre de media.',
    },
    {
      title: '¿Qué medida te limita?',
      body: 'En el paso anterior moviste una lectura cada vez por su barra de error y viste cuánto desplazaba cada movimiento tu masa. La masa va como a³ / P².',
      prompt: '¿Cuál de tus dos lecturas movió más tu masa?',
      options: [
        'el tamaño de la órbita, porque se eleva al cubo',
        'el periodo, porque se eleva al cuadrado y es el menos bien conocido de los dos',
        'contribuyen igual, porque las dos están medidas',
        'ninguna: la masa es exacta si la ley es exacta',
      ],
      because:
        'La potencia importa, pero también lo bien que se conoce cada lectura. El tamaño de la órbita se imprime con una centésima de UA, mientras que un cronómetro lo para una mano, así que el periodo cargó con la mayor parte de la incertidumbre; una medida más cuidadosa del cronómetro, por ejemplo cronometrando varias vueltas y dividiendo, mejora más la masa que una regla más fina.',
    },
    {
      title: 'Pesa una estrella, con barra de error',
      body: 'El total es 4,0 ± 0,5 masas solares. El punto de equilibrio queda de modo que la Estrella A, la más pesada, lleva 0,75 del total, conocido con ±0,02. Una parte de un total es un producto, así que las incertidumbres fraccionarias se suman en cuadratura: σ<sub>m</sub>/m = √((σ<sub>M</sub>/M)² + (σ<sub>f</sub>/f)²).',
      prompt: 'Masa de la Estrella A, con su incertidumbre',
      placeholder: 'un valor y, luego, ± su incertidumbre',
      hints: {
        concept: 'La masa de la Estrella A es su parte del total.',
        method:
          'm = 0,75 × 4,0. Las fracciones son 0,5/4,0 y 0,02/0,75; combínalas y multiplica por m.',
      },
      because:
        'Tres masas solares, con incertidumbre de unos cuatro décimos. El reparto de la masa se conoce mejor que la masa misma, porque la razón de las dos distancias se mide directamente, mientras que el total depende de a al cubo.',
    },
  ],
};
