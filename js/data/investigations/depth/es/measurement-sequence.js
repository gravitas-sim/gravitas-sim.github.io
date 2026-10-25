// Las investigaciones de medición y afirmación, más a fondo: las palabras en español, paso a paso con ../measurement-sequence.js (D-R10-67).
// Sin lectura por una persona que lea español con fluidez.

export const WHAT_IS_A_MEASUREMENT_DEEPER = {
  steps: [
    {
      title: 'La posición con su barra de error',
      body: 'Un resultado se informa como un valor, luego ±, luego su incertidumbre. Informa la posición x media de las cinco marcas con su error estándar, a partir de las dos filas que ya has leído.\n\nCuenta como correcto cuando el intervalo que das se solapa con el que permiten las marcas, y no es más ancho que unos pocos errores estándar, porque una incertidumbre tan grande que se solapa con cualquier cosa no ha dicho nada a nadie.',
      prompt: 'La posición x media, con su incertidumbre',
      placeholder: 'p. ej. 12,3 ± 0,4',
      hints: ['Escribe la media, luego ±, luego el error estándar de x.'],
      because:
        'La media es 31,10 píxeles y su error estándar 0,36, así que la posición es 31,10 ± 0,36 píxeles: un intervalo que queda alrededor de las marcas y, como muestran los pasos siguientes, alrededor de la verdad.',
    },
    {
      title: '¿Cuántas marcas para una décima de píxel?',
      body: 'Una marca de esta estrella se dispersa unos 0,8&nbsp;píxeles. El error estándar es la dispersión entre la raíz cuadrada del número de marcas, N. Quieres que el error estándar sea 0,1&nbsp;píxeles.',
      prompt: 'El número de marcas necesarias',
      hints: ['Despeja N en 0,1 = 0,8 ÷ √N.', 'N = (0,8 ÷ 0,1)².'],
      worked:
        'N = (0,8 ÷ 0,1)² = 8² = 64 marcas. Pasar de 5 marcas a 64 compra un error estándar de una décima de píxel, y el coste crece como el cuadrado de la precisión que se quiere.',
      feedback: {
        close:
          'Casi. Eleva al cuadrado el cociente entre la dispersión y el error estándar deseado.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Recuerda que el error estándar solo baja como la raíz cuadrada de N.',
        off: 'N = (dispersión ÷ error estándar deseado)², con 0,8 y 0,1.',
      },
    },
    {
      title: 'Lo que más marcas no pueden arreglar',
      body: 'Un instrumento nuevo coloca cada marca <strong>1,0 píxel</strong> demasiado a la derecha: la cruz queda donde está el punto activo del cursor, y nadie lo ha comprobado. Pon <strong>Desplazamiento de cada marca</strong> en 1,0, toma 30 marcas y muestra la verdad. Lee el error estándar de x y el error de la media en errores estándar.',
      fields: [
        { label: 'Error estándar de x, 30 marcas' },
        { label: 'Error de la media en errores estándar' },
      ],
    },
    {
      title: 'De qué es una declaración el más-menos',
      body: 'Un informe declara la posición x de la estrella como 32,27 ± 0,14 píxeles, a partir de 30 marcas.',
      prompt: '¿Qué describe el ± 0,14?',
      options: [
        'Cómo se dispersaría la media de estas marcas si el marcado se repitiera, suponiendo que las marcas se dispersan al azar alrededor de un centro',
        'Cuán lejos está la media de la posición verdadera',
        'Cuán bien está calibrado el instrumento',
        'El tamaño de todos los errores de la medición, aleatorios y sistemáticos juntos',
      ],
      misconceptions: [
        {
          say: 'El error estándar cuenta la dispersión de las marcas. Un desplazamiento igual en todas las marcas no es dispersión, así que no está en él, por muchas marcas que se hagan.',
        },
      ],
      hints: ['¿Qué tipo de error reduce tomar más marcas?'],
      because:
        'La dispersión de la media bajo repetición, con un supuesto sobre las marcas. Un desplazamiento sistemático, igual en todas las marcas, queda fuera, y también cualquier cosa que las marcas compartan. Declarar las dos cosas, la parte aleatoria y lo que se hizo para comprobar la sistemática, es la afirmación completa.',
    },
  ],
};

export const WHAT_DOES_PLUS_MINUS_CLAIM_DEEPER = {
  steps: [
    {
      title: 'La cuenta también es incierta',
      body: 'La cobertura se contó con un número finito de repeticiones, así que tiene una incertidumbre propia. Pon <strong>Repeticiones</strong> en 100 y el intervalo en ±1 σ. Lee la cobertura y su propia incertidumbre.',
      fields: [
        { label: 'Cobertura' },
        { label: 'Incertidumbre de la cobertura' },
      ],
    },
    {
      title: 'La incertidumbre de una cobertura, a mano',
      body: 'Cada repetición contiene la verdad o no, con probabilidad p. Para R repeticiones la parte que la contiene tiene una desviación estándar √(p(1 − p) ÷ R). Toma p = 0,68 y R = 2000.',
      prompt: 'La incertidumbre de la parte, en por ciento',
      hints: [
        'Calcula primero 0,68 × 0,32, divide entre 2000, saca la raíz cuadrada y exprésalo en por ciento.',
      ],
      worked:
        '0,68 × 0,32 = 0,2176; dividido entre 2000 es 0,0001088; la raíz cuadrada es 0,01043, que es 1,04 por ciento. Con 2000 repeticiones una cobertura es buena hasta un punto porcentual más o menos.',
      feedback: {
        close: 'Casi. Saca la raíz cuadrada al final.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Da la respuesta en por ciento, y divide entre R antes de la raíz cuadrada.',
        off: 'La dispersión es la raíz cuadrada de p por la probabilidad de fallar, dividida entre R.',
      },
    },
    {
      title: 'La cobertura sesgada, a mano',
      body: 'Cada lectura es la verdad más 0,4 más un error aleatorio de dispersión 0,3. Un intervalo de ±0,3 contiene la verdad cuando ese error aleatorio queda entre −0,7 y −0,1 respecto del centro, es decir entre −2,33 y −0,33 dispersiones. La curva normal tiene 0,0099 de su área por debajo de −2,33 y 0,3707 por debajo de −0,33.',
      prompt:
        'La parte de los intervalos que contienen la verdad, en por ciento',
      hints: ['Resta el área menor de la mayor y exprésalo en por ciento.'],
      worked:
        '0,3707 − 0,0099 = 0,3608, 36,1 por ciento. El conjunto da 36,3, dentro de lo que permiten 2000 repeticiones. Una afirmación de dos de cada tres, cumplida algo más de una vez de cada tres.',
      feedback: {
        close: 'Casi. Resta las dos áreas.',
        off: 'Parte = área por debajo de −0,33 menos área por debajo de −2,33.',
      },
    },
    {
      title: 'El límite a partir de una cuenta de cero',
      body: 'Un experimento no ve ningún suceso. El límite superior del 95 por ciento para la tasa es la tasa λ con la que no ver ninguno tiene solo un 5 por ciento de probabilidad. La probabilidad de no ver ninguno, cuando la media es λ, es e<sup>−λ</sup>.',
      prompt: 'El límite superior del 95 por ciento para la tasa, en sucesos',
      hints: [
        'Despeja λ en e elevado a −λ igual a 0,05, con un logaritmo natural.',
      ],
      worked:
        'λ = −ln(0,05) = 2,996, cerca de 3. Así que una cuenta de cero dice que la tasa está por debajo de unos tres sucesos al 95 por ciento, y por eso «no ver nada» es un límite y no cero.',
      feedback: {
        close: 'Casi. Usa el logaritmo natural, y un signo menos.',
        off: 'λ = −ln(0,05).',
      },
    },
    {
      title: 'Lo que esta comprobación no puede hacer',
      body: 'En este instrumento se conocía el valor verdadero, y la cobertura era una cuenta.',
      prompt:
        '¿Por qué no se puede contar así la cobertura de una medición real?',
      options: [
        'No se conoce la verdad, así que la afirmación solo se puede comprobar contra repeticiones, una calibración o un método independiente',
        'Las mediciones reales no tienen incertidumbre declarada',
        'Los instrumentos reales nunca tienen sesgo',
        'Una cobertura real es siempre exactamente la declarada',
      ],
      hints: ['¿Qué necesitaba la cuenta que una estrella real no da?'],
      because:
        'La cuenta necesitaba la verdad. Una afirmación real se comprueba contra repeticiones de la medición, contra una fuente de calibración de valor conocido o contra un método independiente, y cada una de esas es una comprobación de una sola cosa. Esta investigación muestra qué es una comprobación, y una real rara vez es tan completa.',
    },
    {
      title: 'Por qué un límite superior no alcanza su nivel',
      body: 'Con una tasa verdadera de 3,0 los límites cumplieron el 95,6 por ciento, y con 4,0 cumplieron el 98,7. Las cuentas de sucesos son números enteros.',
      prompt: '¿Qué muestra el salto entre las dos coberturas?',
      options: [
        'Una cuenta solo puede tomar valores enteros, así que el límite toma pocos valores discretos y la cobertura no se puede ajustar a exactamente 95 por ciento; es al menos 95 por construcción',
        'El instrumento está averiado con una tasa de 4,0',
        'Las 2000 repeticiones son demasiado pocas para medir cualquier cobertura',
        'Un límite superior no tiene cobertura',
      ],
      hints: ['¿Cuántos límites distintos puede producir una cuenta?'],
      because:
        'El límite es una función escalonada de la cuenta, así que la cobertura es una escalera en la tasa, nunca por debajo de 95 y tocándolo solo en los escalones. Una afirmación conservadora es legítima; una afirmación de exactamente 95 por ciento necesitaría un procedimiento aleatorizado.',
    },
  ],
};

export const WHEN_THE_METHOD_MUST_REFUSE_DEEPER = {
  steps: [
    {
      title: 'La cota del 95 por ciento, a mano',
      body: 'Para masas por debajo del producto el mejor ajuste tiene la inclinación en su límite de 1, así que el chi cuadrado es ((m − 0,85) ÷ 0,06)². El intervalo del 95 por ciento es donde el chi cuadrado ha subido 3,84, que son 1,96 errores estándar.',
      prompt:
        'La masa más pequeña dentro de un intervalo del 95 por ciento, en masas de Júpiter',
      hints: ['Resta al producto 1,96 veces el error del producto.'],
      worked:
        '0,85 − 1,96 × 0,06 = 0,85 − 0,1176 = 0,732 masas de Júpiter. El instrumento lee lo mismo. Sigue sin haber cota superior, sea cual sea el nivel de confianza.',
      feedback: {
        close: 'Casi. La cota queda por debajo del producto, no por encima.',
        off: 'm = 0,85 − 1,96 × 0,06.',
      },
    },
    {
      title: 'Los grados de libertad de la recta',
      body: 'El chi cuadrado reducido es el chi cuadrado dividido entre el número de grados de libertad: el número de puntos menos el número de parámetros ajustados. La recta tiene dos parámetros, una ordenada y una pendiente, y hay seis puntos.',
      prompt: 'Los grados de libertad',
      hints: ['Seis puntos, dos parámetros ajustados.'],
      worked:
        'Seis puntos menos dos parámetros son cuatro. Con cuatro grados de libertad el chi cuadrado de un modelo que ajusta es de unos 4, y el 30,5 que da la recta es casi ocho veces eso.',
      feedback: {
        close: 'Casi. Cuenta los puntos y resta los parámetros ajustados.',
        off: 'Grados de libertad = puntos − parámetros.',
      },
    },
    {
      title: 'Lo que añadiría un a priori sobre la inclinación',
      body: 'Un análisis distinto supone que las órbitas están inclinadas al azar, sin dirección preferida, e informa una masa mediana con un intervalo.',
      prompt: '¿Qué lleva ese número que el perfil no lleva?',
      options: [
        'Un supuesto sobre la inclinación, que los datos no contienen: el intervalo es en parte del a priori, y debería informarse nombrando el a priori',
        'Más información de los datos sobre la inclinación',
        'Una incertidumbre menor, que siempre es mejor',
        'Una forma de medir la masa sin el producto',
      ],
      misconceptions: [
        {
          say: 'Los datos fijan el producto y nada más. Lo que aporte el a priori de la inclinación es del a priori, y otro a priori da otro intervalo con los mismos datos.',
        },
      ],
      hints: [
        'Los datos fijan solo el producto. ¿De dónde sale el resto del intervalo?',
      ],
      because:
        'De un supuesto. Un a priori puede ser razonable, y con inclinaciones al azar da un intervalo definido, pero entonces el intervalo responde «dado este supuesto». El perfil mantiene separadas las dos cosas: lo que fijan los datos, y lo que se supone.',
    },
    {
      title: 'Lo que un modelo que ajusta no demuestra',
      body: 'La parábola tiene un chi cuadrado reducido inferior a 1 y un valor p cercano a 0,8, con seis puntos.',
      prompt: '¿Qué se puede decir de la parábola?',
      options: [
        'Describe estos seis puntos dentro de sus errores; no está demostrado que sea la curva verdadera, y seis puntos no pueden descartar otras con tantos parámetros',
        'Es la curva verdadera, porque el valor p es alto',
        'Es seguro que está mal, porque un valor p alto es sospechoso',
        'Sus coeficientes se miden exactamente',
      ],
      hints: [
        '¿Qué deja abierto un modelo de tres parámetros ajustado a seis puntos?',
      ],
      because:
        'No se rechaza. Un modelo que ajusta es uno que los datos no pueden rechazar, lo que es más débil que uno que los datos apoyan frente a toda alternativa. Si más términos, otras formas o una razón física de la curva ajustan igual de bien es la pregunta siguiente, y el chi cuadrado reducido no puede responderla.',
    },
  ],
};

/** By lesson id: what instructorLocale.js registers. */
export default {
  'what-is-a-measurement': WHAT_IS_A_MEASUREMENT_DEEPER,
  'what-does-plus-minus-claim': WHAT_DOES_PLUS_MINUS_CLAIM_DEEPER,
  'when-the-method-must-refuse': WHEN_THE_METHOD_MUST_REFUSE_DEEPER,
};
