// La curva de completitud, más a fondo: las palabras en español, paso a paso con ../the-completeness-curve.js.
export default {
  steps: [
    {
      title: 'El peso de una estrella',
      body: 'Toma una estrella contada de magnitud absoluta 11 en un sondeo con un límite duro de 20, en un cono de 1.000&nbsp;pc de profundidad. Alcanza el límite en d = 10 pc × 10<sup>(20 − 11 + 5) ÷ 5</sup> = 631&nbsp;pc. Como el volumen de un cono va como el cubo de su profundidad, la estrella podía contarse en (631 ÷ 1.000)³ del cono.',
      prompt:
        '¿A cuántas estrellas de su clase en el cono representa esta estrella?',
      hints: ['Representa 1 ÷ la fracción del cono en que podía contarse.'],
      worked:
        '(631 ÷ 1.000)³ = 0,251, y 1 ÷ 0,251 = 3,98. Toda estrella contada de ese brillo se pondera por ese número, que es el método del volumen efectivo de Schmidt (1968): la estimación «1/V<sub>max</sub>».',
      feedback: {
        close:
          'Casi. Eleva al cubo el cociente de las distancias y toma su inverso.',
        off: 'Peso = (1.000 ÷ 631)³.',
      },
    },
    {
      title: 'El error de Poisson',
      body: 'En el intervalo de M = 10 a 12 el sondeo contó 498 estrellas. El número de estrellas contadas en un intervalo varía de un sondeo a otro como una cuenta de Poisson, con una dispersión de √N.',
      prompt: 'El error fraccionario de la cuenta',
      hints: ['Divide √498 entre 498, o toma 1 ÷ √498.'],
      worked:
        '√498 = 22,3 y 22,3 ÷ 498 = 4,5 por ciento. El instrumento da 4,6 por ciento, algo más, porque los pesos difieren de una estrella a otra. Con cuatro veces las estrellas se reduciría a la mitad.',
      feedback: {
        close: 'Casi. El error fraccionario es 1 ÷ √N.',
        off: 'Error = √N ÷ N, con N = 498.',
      },
    },
    {
      title: 'La pendiente de cuentas de un campo uniforme',
      body: 'Para estrellas de un solo brillo, repartidas por igual, el número más brillante que la magnitud m crece como el cubo de la distancia hasta la que pueden verse, y una magnitud es un factor 10<sup>0,2</sup> en distancia. Así que log<sub>10</sub> N sube linealmente con m.',
      prompt: 'La pendiente de log₁₀ N(< m) frente a m',
      hints: ['N va como d³ y d va como 10 elevado a 0,2 m.'],
      worked:
        'N ∝ d³ ∝ (10^(0,2 m))³ = 10^(0,6 m), así que la pendiente de log₁₀ N es 0,6. La cuenta del modelo de una candela estándar en un cono profundo sale en 0,60 (tests/surveyModel.test.js). Todo lo que la curva, un borde, el polvo, un disco o una muestra incompleta, se ve como una pendiente menor.',
      feedback: {
        close:
          'Casi. Eleva al cubo el factor de distancia de una magnitud y toma su logaritmo.',
        off: 'Pendiente = 3 × 0,2.',
      },
    },
    {
      title: 'Un catálogo real se agota',
      body: 'El paquete de fotometría de NGC 2420 (SDSS DR18, estrellas reales a menos de 14 minutos de arco del cúmulo) cuenta estrellas por magnitud en r: 312 de 17 a 18, 377, 431 y 519 de 20 a 21, luego <strong>153</strong> de 21 a 22 y <strong>11</strong> de 22 a 23. El cielo no se queda sin estrellas débiles en r = 21.',
      prompt: '¿Qué muestran las dos últimas cuentas?',
      options: [
        'La completitud del sondeo está cayendo: es casi completo hasta r = 21 y pierde la mayoría de las estrellas más allá',
        'Hay pocas estrellas más débiles que r = 21',
        'El cúmulo termina en r = 21',
        'Las cuentas son al azar y no significan nada',
      ],
      misconceptions: [
        {
          say: 'La subida de 312 a 519 es del cielo: cada magnitud tiene más estrellas que la anterior. Una caída después, de 519 a 153 y a 11, es del sondeo. La función de luminosidad del modelo tampoco se detiene.',
        },
      ],
      hints: [
        '¿Qué hacían las cuentas antes de la caída, y qué haría un sondeo completo?',
      ],
      because:
        'La completitud está cayendo. Las cuentas subieron con regularidad hasta 519 y luego caen en un factor de 3 y otro de 14: el cielo no hace eso, una curva de completitud sí. Es el mismo desvanecimiento que dibuja el instrumento, aquí medido en estrellas reales (el paquete es el campo del cúmulo, así que la subida no es euclídea).',
    },
    {
      title: 'Qué puede decir un bootstrap',
      body: 'El bootstrap del laboratorio de análisis remuestrea con reemplazo las estrellas contadas y recalcula cada vez la función de luminosidad corregida, dando un intervalo para cada intervalo. Para el intervalo más débil el intervalo es ancho; para los intermedios es estrecho.',
      prompt: '¿Qué mide el intervalo del bootstrap?',
      options: [
        'Cuánto cambiaría el valor corregido con otra extracción de estrellas del mismo sondeo; no incluye el sesgo de la selección ni el de las magnitudes',
        'Cuán lejos está el valor corregido de la verdad',
        'El tamaño del sesgo de Malmquist',
        'Si la curva de completitud es correcta',
      ],
      hints: ['¿Qué varía y qué mantiene fijo?'],
      because:
        'Solo la dispersión de muestreo. Remuestrea las estrellas que se contaron y mantiene la selección y las magnitudes tal como están, así que un sesgo en cualquiera de las dos, como el 60 por ciento de la corrección con magnitudes del catálogo, le es invisible. El intervalo dice cuánto restringen los datos la respuesta, no si la respuesta es correcta.',
    },
  ],
};
