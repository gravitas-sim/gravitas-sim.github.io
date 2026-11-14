// Reajustar un tránsito - español, paso a paso con ../refitting-a-transit.js.
export default {
  title: 'Reajustar un tránsito',
  subtitle:
    'El mismo modelo y la misma curva de luz que el panel de ajuste del Observatorio, ajustados otra vez por otro camino en Python, para ver qué cambia el camino',
  objectives: [
    'Ajustar un modelo de tránsito a una curva de luz con los mínimos cuadrados acotados de SciPy y leer el sigma de la covarianza y el intervalo de perfil',
    'Decir en qué pueden y en qué no pueden diferir dos ajustes correctos del mismo modelo a los mismos puntos',
    'Explicar por qué un intervalo de perfil puede ser asimétrico cuando el sigma de una covarianza es simétrico',
    'Decir qué le hace a una incertidumbre y a la respuesta fijar un parámetro de molestia',
  ],
  steps: [
    {
      title: 'El mismo modelo, otro camino',
      body: `El panel de ajuste del Observatorio ajusta un tránsito a la curva de luz de TESS de HD 209458: una órbita circular, una estrella con oscurecimiento del limbo, una línea de base y siete números buscados dentro de límites. Parte de una búsqueda de caja, refina con un Levenberg-Marquardt acotado e informa la incertidumbre de cada número de tres maneras. Esta investigación ajusta el <strong>mismo modelo a los mismos 1.882 puntos</strong> con otro optimizador, de modo que todo lo que difiera pueda atribuirse al camino y no al modelo.
             \n\nEl cuaderno parte de los tránsitos que encuentra con <strong>scipy.ndimage</strong>, ajusta con <strong>scipy.optimize.least_squares</strong>, toma cada incertidumbre de la covarianza en el mínimo, y halla el intervalo de perfil del tamaño del planeta y del parámetro de impacto con un buscador de raíces. Su modelo de tránsito se escribió de nuevo en NumPy y coincide con el de la aplicación hasta el último dígito de un doble.
             \n\nAbre la página de cálculo en <strong>/compute/</strong> de este sitio. Solo funciona con conexión y la primera vez descarga unos 23 MB de Python, cuando pulsas el botón. Elige el cuaderno <strong>Reajustar un tránsito con SciPy</strong>, deja su entrada de ejemplo (la curva de luz de TESS) y su único ajuste en 1. Todavía no pulses Ejecutar.`,
    },
    {
      title: 'Qué tan cerca estarán',
      body: `Antes de ejecutarlo. El ajuste del panel de esta curva de luz dio un período de 3,52454 días, con una incertidumbre de 0,00003.`,
      prompt:
        'El cuaderno dará cada número ajustado. Comparados con los del panel, su período y su tamaño de planeta serán&hellip;',
      options: [
        'idénticos en todos los dígitos, porque es el mismo modelo con los mismos puntos',
        'iguales hasta una pequeña fracción de una barra de error, porque es el mismo mínimo alcanzado por otro camino',
        'distintos en una barra de error, porque dos optimizadores siempre difieren en eso',
        'muy distintos, porque SciPy no tiene un modelo de tránsito',
      ],
      because:
        'Los dos optimizadores buscan el chi cuadrado más bajo de una misma función, así que hallan el mismo mínimo, pero cada uno se detiene cuando lo dice su propia tolerancia, y cada uno deriva la función a su manera. Los valores coinciden hasta unas milésimas de una barra de error; no son idénticos, y no difieren en una barra de error.',
    },
    {
      title: 'Ejecútalo: cinco números y el chi cuadrado',
      body: `Pulsa <strong>Iniciar el entorno</strong>, espera, y luego <strong>Ejecutar el cuaderno</strong>. Lee las cantidades que devuelve e introdúcelas aquí: el período, el cociente de radios planeta-estrella, el tamaño de la órbita en radios estelares, el parámetro de impacto y el chi cuadrado reducido.`,
      fields: [
        { label: 'Período' },
        { label: 'Rp/R*' },
        { label: 'a/R*' },
        { label: 'Parámetro de impacto' },
        { label: 'Chi cuadrado reducido' },
      ],
    },
    {
      title: 'Dos clases de incertidumbre',
      body: `La tabla muestra cada número ajustado con un sigma tomado de la covarianza en el mínimo, escalado por el chi cuadrado reducido. Para Rp/R* y el parámetro de impacto muestra además un <strong>intervalo de perfil</strong>: el rango de valores para los que, reajustando todos los demás, el chi cuadrado (escalado) sube como mucho una unidad. Introduce el sigma de Rp/R* y los dos extremos de cada intervalo de perfil.`,
      fields: [
        { label: 'Rp/R*, sigma' },
        { label: 'Rp/R*, intervalo de perfil, extremo inferior' },
        { label: 'Rp/R*, intervalo de perfil, extremo superior' },
        {
          label: 'Parámetro de impacto, intervalo de perfil, extremo inferior',
        },
        {
          label: 'Parámetro de impacto, intervalo de perfil, extremo superior',
        },
      ],
    },
    {
      title: 'Por qué el intervalo es asimétrico',
      body: `El sigma del parámetro de impacto es 0,071, simétrico por construcción. Su intervalo de perfil va de 0,368 a 0,476, 0,062 por debajo del mejor valor y 0,046 por encima.`,
      prompt: '¿Cuál es la mejor explicación de la diferencia?',
      options: [
        'La covarianza describe el chi cuadrado como una parábola simétrica en el mínimo; el valle que el parámetro de impacto comparte con a/R* y el oscurecimiento del limbo es curvo, y el perfil sigue la curva',
        'El optimizador de SciPy se detuvo antes de tiempo, así que el sigma está mal',
        'El intervalo de perfil tiene otro nivel de confianza que el sigma',
        'El parámetro de impacto no puede ser negativo, así que su intervalo está cortado',
      ],
      misconceptions: [
        {
          say: 'El mínimo mismo coincide con el del panel hasta unas milésimas de una barra de error. El sigma y el perfil salen del mismo mínimo; miden cosas distintas del valle que lo rodea.',
        },
        {
          say: 'Los dos son un cambio de una unidad en el chi cuadrado (escalado), que es cerca del 68 por ciento para una parábola. La parábola es la suposición que falla aquí.',
        },
        {
          say: 'El extremo inferior, 0,368, está lejos de cero: nada lo corta. La asimetría viene de la forma del valle.',
        },
      ],
      hints: [
        'El sigma sale de la curvatura del chi cuadrado en el único mínimo. El perfil reajusta todos los demás números en cada valor del parámetro de impacto y sigue lo que ocurre.',
      ],
      because:
        'La covarianza es la curvatura del chi cuadrado en el mínimo, así que es simétrica y describe una parábola. El valle en que está el parámetro de impacto, con a/R* y el oscurecimiento del limbo, es curvo, y el perfil reajusta los demás en cada valor y lo sigue. Donde los dos difieren, el perfil es el número más honesto.',
    },
    {
      title: 'Fija el oscurecimiento del limbo',
      body: `Pon el único ajuste del cuaderno en <strong>0</strong>, que fija el oscurecimiento del limbo en q1 = 0,36 y q2 = 0,30 en lugar de ajustarlo, y ejecuta de nuevo. Introduce el nuevo Rp/R*, su nuevo sigma, y cuántos de sus nuevos sigmas se movió desde el valor que hallaste con el oscurecimiento ajustado, 0,11926.`,
      fields: [
        { label: 'Rp/R*, oscurecimiento fijo' },
        { label: 'Su sigma' },
        { label: 'Desplazamiento, en sigmas nuevos' },
      ],
    },
    {
      title: 'Lo que no cuentan los sigmas',
      body: `El chi cuadrado reducido es 8. El panel de ajuste del Observatorio informa, para esta curva de luz, que sus residuos están correlacionados en el tiempo, con un factor de ruido rojo de 1,66. Este cuaderno escala cada sigma por la raíz cuadrada del chi cuadrado reducido, y no cuenta la correlación.`,
      prompt: '¿Qué dicen esto sobre los sigmas de la tabla?',
      options: [
        'La dispersión es unas 2,8 veces las barras de error, lo que el escalado tiene en cuenta, y está correlacionada en el tiempo, lo que el escalado no tiene: los sigmas probablemente siguen siendo demasiado pequeños, en torno al factor de ruido rojo',
        'El ajuste está mal y debe descartarse',
        'Las barras de error del archivo son demasiado pequeñas y no se puede decir más',
        'Un chi cuadrado de ocho significa que el modelo se ajusta a los datos ocho veces mejor de lo necesario',
      ],
      misconceptions: [
        {
          say: 'El ajuste es lo mejor que puede dar este modelo y el mínimo coincide con el del panel. Lo que está en duda es cuánto fiarse de sus barras de error, no de sus valores.',
        },
        {
          say: 'Un chi cuadrado reducido mayor que uno significa que el modelo, con las barras de error dadas, se ajusta peor de lo que permitiría el ruido solo, no mejor.',
        },
      ],
      hints: [
        'El ruido que se repite de un punto al siguiente no se promedia a la baja como el ruido independiente.',
      ],
      because:
        'Escalar por el chi cuadrado reducido supone que la dispersión extra es independiente de un punto a otro. El ruido correlacionado se promedia más despacio, así que un sigma calculado sin él es demasiado pequeño: el factor de ruido rojo del panel, 1,66, haría el sigma de Rp/R* de unos 0,0027. Un ajuste tiene las incertidumbres del modelo de ruido que supone.',
    },
    {
      title: 'Lo que has deducido',
      body: `Ajustar el mismo modelo a los mismos puntos por otro camino dio el mismo mínimo: un período de 3,52454 días y un Rp/R* de 0,1193, hasta unas milésimas de una barra de error de los del panel. Lo que un camino distinto sí cambia es lo que puedes decir de la incertidumbre. El sigma de la covarianza es una parábola, el intervalo de perfil sigue el valle, y para el parámetro de impacto difieren en una quinta parte de la anchura y en la simetría.
             \n\nEl otro punto es lo que un ajuste mantiene fijo. Fijar el oscurecimiento del limbo redujo la barra de error de Rp/R* a un tercio y movió el valor tres de las nuevas barras: la incertidumbre del número fijo no desapareció, salió de la tabla. Y los sigmas cuentan solo ruido blanco, en una curva de luz cuyo ruido no lo es. La ejecución es tuya para conservarla: su cápsula registra el hash del cuaderno y el de la curva de luz, así que un informe puede citarla.`,
    },
  ],
};
