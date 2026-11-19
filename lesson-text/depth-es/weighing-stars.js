// Weighing the Stars, deeper: the Spanish words, step for step with ../weighing-stars.js.
export default {
  steps: {
    'how-sure-is-the-total': {
      title: '¿Qué tan seguro es el total?',
      body: 'Tu periodo salió de un cronómetro que arranca y para una persona. Cronometra una vuelta otra vez las veces que decidas (al menos dos) y toma cada tiempo: la dispersión de tus propios tiempos (su desviación típica) es la barra de error de una vuelta cronometrada. El tamaño de la órbita se lee del panel, así que su barra de error es la finura con que lo imprime. Di cuánto podría desviarse cada una.\n\nLuego la página mueve una lectura cada vez con las que ya tomaste, <em>a</em> por su barra de error y <em>P</em> por la suya, y recalcula la masa <em>a</em>³ / <em>P</em>²: una comparación calculada, no una nueva ejecución de la escena.',
      tool: {
        title: 'Cronometra una vuelta otra vez',
        note: 'Pulsa Marcar, espera a que la Estrella A vuelva a la línea de puntos, y pulsa Parar.',
      },
      fields: [
        { label: 'Tiempo 1, una vuelta', unit: 'años' },
        { label: 'Tiempo 2, una vuelta', unit: 'años' },
        { label: 'Tiempo 3, una vuelta', unit: 'años' },
        { label: 'Tiempos tomados' },
        { label: 'Dispersión de un tiempo', unit: 'años' },
        {
          label: 'Cuánto podría desviarse P',
          unit: 'años',
          hint: 'de tus propios tiempos',
        },
        {
          label: 'Cuánto podría desviarse a',
          unit: 'UA',
          hint: 'de la precisión del panel',
        },
        { label: 'Cambio de la masa solo por a', unit: 'M☉' },
        { label: 'Cambio de la masa solo por P', unit: 'M☉' },
        { label: 'Masa total', unit: 'M☉' },
        { label: 'Su incertidumbre', unit: 'M☉' },
      ],
    },
    'weigh-it-with-an-error-bar': {
      title: 'Da la masa con barra de error',
      body: 'Escribe la masa total del par como se da: el valor, ±, y su incertidumbre del paso anterior. Cuenta como correcta cuando el rango que das se solapa con el que respalda la medición y no es más ancho que el doble de la semianchura de ese rango.',
      prompt: 'Masa total del par, con su incertidumbre',
      placeholder: 'un valor y, luego, ± su incertidumbre',
      hints: {
        concept: 'Una masa es un valor y lo bien que se conoce.',
        method: 'Copia el total y su incertidumbre del paso anterior.',
      },
      because:
        'Unas cuatro masas solares, con la incertidumbre que dieron tus propios tiempos.',
    },
    'which-measurement-limits-you': {
      title: '¿Qué medida te limita?',
      body: 'En el paso anterior moviste una lectura cada vez por su barra de error. Lee cuánto desplazó cada movimiento tu masa, y di qué lectura la limita: la que más la mueve.',
      fields: [
        { label: 'Cambio de la masa solo por a', unit: 'M☉' },
        { label: 'Cambio de la masa solo por P', unit: 'M☉' },
        {
          label: 'Qué lectura limita la masa, a o P',
          hint: 'a o P',
        },
      ],
    },
    'weigh-one-star-with-an-error-bar': {
      title: 'Pesa una estrella, con barra de error',
      body: 'Toma el total como 4,0 ± 0,5 masas solares, el tamaño de barra que da una vuelta cronometrada a mano. El punto de equilibrio queda de modo que la Estrella A, la más pesada, lleva 0,75 del total, conocido con ±0,02. Una parte de un total es un producto, así que las incertidumbres fraccionarias se suman en cuadratura: σ<sub>m</sub>/m = √((σ<sub>M</sub>/M)² + (σ<sub>f</sub>/f)²).',
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
  },
};
