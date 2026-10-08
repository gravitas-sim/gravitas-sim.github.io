// The Missing Mass, deeper: the Spanish words, step for step with ../missing-mass.js.
export default {
  steps: [
    {
      title: '¿Qué tan seguro es ese número?',
      body: 'La razón entre la masa del halo y la visible lleva dos incertidumbres. La masa del halo va como el cuadrado de la velocidad plana, así que el fallo medio del ajuste, como fracción de esa velocidad, cuenta dos veces. Y la masa visible no se pesa: se calcula a partir de la luz, con una suposición sobre cuánta masa lleva cada unidad de luz, que es buena hasta quizá un 20 %.\n\nLos números del ajuste son los que anotaste; solo el 20 % es nuevo. Las incertidumbres fraccionarias se suman en cuadratura.',
      fields: [
        { label: 'Incertidumbre de la masa visible, como fracción' },
        { label: 'Masa del halo ÷ masa visible' },
        { label: 'Incertidumbre de la masa del halo, como fracción' },
        { label: 'Incertidumbre de la razón' },
      ],
    },
    {
      title: 'Dale una barra de error a la razón',
      body: 'Escribe la razón como se da: el valor, ±, y la incertidumbre del paso anterior. Cuenta como correcta cuando el rango que das se solapa con el que respalda la medición y no es más ancho que el doble de la semianchura de ese rango.',
      prompt:
        'Masa del halo dentro de 30 kpc, dividida entre la masa visible, con su incertidumbre',
      placeholder: 'p. ej. 3,4 ± 0,7',
      hints: {
        concept: 'La razón que hallaste, ahora con lo bien que se conoce.',
        method: 'Copia la razón y su incertidumbre del paso anterior.',
      },
      worked:
        'Unos 3,4, con incertidumbre de unos 0,7, casi toda por la masa visible.',
      because:
        'Unos 3,4 con una incertidumbre de unos 0,7. Incluso en el extremo de ese rango el halo pesa más del doble que lo visible, y por eso la conclusión sobrevive a una incertidumbre tan grande.',
    },
    {
      title: '¿Por qué no dar un solo número?',
      body: 'El consejo del ajuste decía que los dos deslizadores del halo se compensan: un halo más rápido con un núcleo mayor ajusta casi tan bien como uno más lento con un núcleo menor. Di que dos ajustes, 150 km/s con un núcleo de 6 kpc y 160 km/s con uno de 9 kpc, fallan ambos en 2 km/s.',
      prompt: '¿Qué debería decir un resultado publicado?',
      options: [
        'el de núcleo menor, porque es más simple',
        'ambos parámetros juntos, con cómo varían juntos; cualquiera solo exagera lo que saben los datos',
        'el promedio de los dos, porque está en medio',
        'nada: si dos ajustes funcionan, el ajuste ha fallado',
      ],
      because:
        'Cuando dos parámetros se compensan, los datos restringen una combinación de ellos mejor que cualquiera por separado. Dar uno solo con su propia barra de error subestima su incertidumbre; el informe honesto da ambos y la covarianza, que es lo que hacen los artículos reales de curvas de rotación.',
    },
    {
      title: '¿Qué distinguiría dos modelos?',
      body: 'Un halo y una ley de gravedad modificada pueden ajustar la misma curva de rotación. La incertidumbre de tu ajuste dice cuánto margen tiene cada modelo.',
      prompt:
        'En unas frases: ¿qué habría que medir para distinguirlos, y por qué un mejor ajuste de esta sola curva no basta?',
      rubric:
        'Busca una medida que los modelos predigan distinto (el cúmulo, o una galaxia de otra masa, o las lentes) y la idea de que dos modelos que ajustan una curva dentro de su incertidumbre no han sido separados por ella.',
    },
  ],
};
