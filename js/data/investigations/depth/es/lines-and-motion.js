// Líneas y movimiento, más a fondo: las palabras en español, paso a paso con ../lines-and-motion.js.
export default {
  steps: [
    {
      title: 'Cuando el corrimiento no es pequeño',
      body: 'v = c × Δλ ÷ λ<sub>reposo</sub> solo vale muy por debajo de la velocidad de la luz. En general, el corrimiento z = Δλ ÷ λ<sub>reposo</sub> y la velocidad β = v ÷ c se relacionan por 1 + z = √((1 + β) ÷ (1 − β)). Todas las líneas de una galaxia están corridas z = 0,1, una décima de su longitud de onda. (A este tamaño la mayor parte del corrimiento es el estiramiento del espacio, no una velocidad; el número que se pide es la velocidad que sería si fuese un corrimiento Doppler.)',
      prompt: 'La velocidad según la fórmula relativista',
      hints: [
        'Eleva al cuadrado los dos lados: (1 + z)² = (1 + β) ÷ (1 − β). Despeja β.',
        'β = ((1 + z)² − 1) ÷ ((1 + z)² + 1).',
      ],
      worked:
        '(1,1)² = 1,21, así que β = 0,21 ÷ 2,21 = 0,0950, que son 0,0950 × 299.792 = 28.487 km/s. La fórmula de corrimientos pequeños da c × 0,1 = 29.979 km/s, un 5 por ciento de más.',
      feedback: {
        close:
          'Casi. Usa la fórmula relativista, no c × z, que da 29.979 km/s.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Un corrimiento de una décima de la longitud de onda es una velocidad del orden de una décima de c.',
        off: 'β = ((1 + z)² − 1) ÷ ((1 + z)² + 1), y luego multiplica por c.',
      },
    },
    {
      title: 'Dos líneas, una estrella',
      body: 'La estrella sintética 1 tiene H-alfa y H-beta, dos líneas de una misma estrella, cada una una medición aparte de la misma velocidad. Lee las dos velocidades y sus incertidumbres en el visor y combínalas ponderando cada una por 1 ÷ σ², el inverso del cuadrado de su incertidumbre σ.',
      prompt: 'La velocidad media ponderada de la estrella sintética 1',
      hints: [
        'Pesos: w = 1 ÷ σ² para cada línea.',
        'Media = (w₁v₁ + w₂v₂) ÷ (w₁ + w₂). La línea con menor incertidumbre cuenta más.',
      ],
      worked:
        'H-alfa 85,7 ± 4,8 y H-beta 78,3 ± 5,0 km/s: pesos 0,0434 y 0,0402, así que la media es (85,7 × 0,0434 + 78,3 × 0,0402) ÷ 0,0836 = 82,2 km/s, con una incertidumbre de 1 ÷ √0,0836 = 3,5 km/s, menor que la de cualquiera de las dos líneas.',
      feedback: {
        close:
          'Casi. Pondera cada velocidad por 1 ÷ σ², no por σ, y divide entre la suma de los pesos.',
        off: 'Media = Σ(v ÷ σ²) ÷ Σ(1 ÷ σ²), sobre las dos líneas.',
      },
    },
    {
      title: 'Cuánta luz quita una línea',
      body: 'El <strong>ancho equivalente</strong> de una línea es el ancho de un rectángulo tan alto como el continuo que tiene la misma área que la línea: la luz total que quita la línea, medida en Å. No depende de la forma de la línea. Acércate a <strong>H-beta</strong> en la estrella A y léelo en la lista.',
      prompt: 'El ancho equivalente de H-beta en la estrella A',
      hints: ['Es la fila «Ancho equivalente» de la estrella A y H-beta.'],
      worked:
        'El nodo del visor suma (1 − flujo ÷ continuo) sobre la línea, en Å: 8,70 ± 0,29 Å.',
      feedback: {
        close: 'Casi. Comprueba que la estrella es la A y la línea H-beta.',
        off: 'Lee la fila «Ancho equivalente» con la estrella A y H-beta elegidas.',
      },
    },
    {
      title: 'La velocidad de una estrella real',
      body: 'La estrella A es real, observada por SDSS. Acércate a sus líneas <strong>H-alfa</strong> y <strong>H-beta</strong> y lee cada velocidad y su incertidumbre. Combina las dos como antes, ponderando por 1 ÷ σ².',
      prompt: 'La velocidad media ponderada de la estrella A',
      hints: [
        'Las dos velocidades son negativas: la estrella A se acerca.',
        'Media = Σ(v ÷ σ²) ÷ Σ(1 ÷ σ²).',
      ],
      worked:
        'H-alfa −212,3 ± 13,7 y H-beta −241,6 ± 16,0 km/s se combinan en −224,8 km/s, con una incertidumbre de unos 10 km/s.',
      feedback: {
        close: 'Casi. Conserva los signos: las dos velocidades son negativas.',
        off: 'Media = Σ(v ÷ σ²) ÷ Σ(1 ÷ σ²), sobre H-alfa y H-beta.',
      },
    },
    {
      title: 'Frente al catálogo',
      body: 'La canalización de SDSS da a esta estrella z = −0,00081, es decir −243 ± 1&nbsp;km/s; el visor lo lista bajo las líneas. La canalización ajusta una plantilla a todo el espectro, no a una línea. (Todavía no existe un instrumento de comparación que superponga tu medición al catálogo; el valor del catálogo es el que tabula el paquete de datos.)',
      prompt: '¿Cómo se compara tu −225 ± 10 km/s?',
      options: [
        'Concuerda en unas dos de sus propias incertidumbres, y el valor del catálogo es más preciso porque usa todo el espectro',
        'Discrepa por un factor de dos, así que uno de los dos está mal',
        'Es idéntico, así que el valor del catálogo son solo estas dos líneas',
        'El valor del catálogo debe de estar mal, porque tiene la menor incertidumbre',
      ],
      hints: [
        'Halla la diferencia y divídela entre tu incertidumbre: ¿a cuántas σ están?',
      ],
      because:
        'La diferencia es de unos 18 km/s, menos de dos veces la incertidumbre de 10 km/s, así que concuerdan. El valor del catálogo es mucho más preciso porque usa miles de píxeles y no dos líneas; una medición con mayor incertidumbre no está mal, solo es menos nítida.',
    },
    {
      title: '¿La velocidad de quién?',
      body: 'El telescopio va sobre la Tierra, que gira alrededor del Sol a unos 30&nbsp;km/s. Las longitudes de onda de los espectros de SDSS se han corregido al sistema del Sol, así que son <em>heliocéntricas</em>.',
      prompt: '¿Por qué hace falta esa corrección?',
      options: [
        'Sin ella la órbita de la Tierra sumaría hasta unos 30 km/s, subiendo y bajando a lo largo de un año, a toda velocidad',
        'Sin ella todas las estrellas parecerían corridas al rojo la misma cantidad',
        'El propio movimiento del Sol alrededor de la galaxia sumaría 30 km/s',
        'Hace los espectros más nítidos',
      ],
      hints: [
        'Piensa en la Tierra yendo hacia una estrella en una estación y alejándose en la otra.',
      ],
      because:
        'La velocidad orbital de la Tierra es de unos 30 km/s, hacia una estrella en una época del año y alejándose en la opuesta, así que una velocidad sin corregir oscila hasta 30 km/s a lo largo del año. El movimiento del Sol alrededor de la galaxia es mucho mayor (cientos de km/s) y una corrección heliocéntrica no lo quita.',
    },
  ],
};
