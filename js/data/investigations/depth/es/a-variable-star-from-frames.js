// Una estrella variable a partir de imágenes, más a fondo: las palabras en español, paso a paso con ../a-variable-star-from-frames.js.
export default {
  steps: [
    {
      title: 'Una dispersión como parte de la luz',
      body: `Un cambio de 0,0088 magnitudes es un cambio de brillo del factor 10<sup>0,4 × 0,0088</sup>. Para un cambio pequeño, una magnitud es el 92,1 por ciento de la luz, porque 0,4 veces el logaritmo natural de 10 es 0,921.`,
      prompt:
        'La dispersión de 0,0088 magnitudes de la estrella de control, como porcentaje de su luz',
      hints: ['0,0088 × 92,1.'],
      worked:
        '0,0088 × 92,1 = 0,81 por ciento. Una sola medida diferencial es buena a menos del uno por ciento de la luz de la estrella; la estrella sola, con 0,070 magnitudes, era buena al 6,5 por ciento.',
      feedback: {
        close: 'Casi. Multiplica la dispersión en magnitudes por 92,1.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: una centésima de magnitud es cerca de un uno por ciento.',
        off: 'magnitudes × 92,1 = porcentaje.',
      },
    },
    {
      title: 'El periodo en horas',
      body: `El mejor seno tiene un periodo de 0,1223 días.`,
      prompt: 'El periodo, en horas',
      hints: ['Multiplica los días por 24.'],
      worked:
        '0,1223 × 24 = 2,93 horas. Las 40 imágenes, separadas 11 minutos, cubren 7,2 horas, así que la serie contiene dos ciclos y medio, y por eso el periodo se conoce solo a cerca del dos por ciento.',
      feedback: {
        close: 'Casi. Multiplica los días por 24.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: una décima de día son un par de horas.',
        off: 'días × 24.',
      },
    },
    {
      title: 'La amplitud en errores',
      body: `La amplitud del mejor seno es de 0,0417 magnitudes con un error de 0,0018, según la tabla.`,
      prompt: 'Cuántos errores es la amplitud',
      hints: ['La amplitud sobre su error.'],
      worked:
        '0,0417 ÷ 0,0018 = 23: la amplitud está a más de veinte errores de cero. Una detección necesita solo unos pocos; lo importante del número es que se mide frente a un error que llevan los datos, no una suposición.',
      feedback: {
        close: 'Casi. Divide la amplitud entre su error.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: unas centésimas sobre un par de milésimas son unas decenas.',
        off: 'amplitud ÷ error.',
      },
    },
    {
      title: 'Una noche sin calibrar frente a la verdad',
      body: `Elige «ninguna: las imágenes crudas» para la calibración, muestra el manifiesto de la verdad, y mira la media de la variable frente a la de comparación y la verdad a su lado. Las dos son diferencias de magnitud.`,
      prompt: 'A cuánto está la media sin calibrar de la verdad, en magnitudes',
      hints: ['La media de la verdad menos la media sin calibrar.'],
      worked:
        'Cerca de 0,346 − 0,313 = 0,032 magnitudes, un tres por ciento en la razón de la luz de las dos estrellas. Sin sesgo, oscura ni plano, las dos estrellas están en partes distintas de la imagen y llevan desfases distintos, y tomar una diferencia de magnitudes no los cancela. Con todos los pasos, la media concuerda con la verdad a mejor que una milésima de magnitud.',
      feedback: {
        close: 'Casi. Resta la media sin calibrar de la verdad.',
        'wrong-order-of-magnitude':
          'Unas centésimas de magnitud: los dos números son cerca de un tercio de magnitud.',
        off: 'verdad − media sin calibrar.',
      },
    },
    {
      title: 'Todo el proceso, desde las imágenes',
      body: `Esta investigación ha usado la reducción del laboratorio en una noche ordenada. El panel «De imágenes a una curva de luz» del Observatorio hace cada paso desde las imágenes en bruto de una secuencia inventada: calibra, marca las estrellas una sola vez, alinea cada imagen con la primera (el telescopio se mueve), mide todas las estrellas, elige las estrellas de comparación por su brillo y su constancia, y hace la curva de luz con sus errores. Ábrelo, deja la semilla en 1 y cada ajuste como está, pulsa «Ejecutar el proceso» y avanza hasta la curva de luz.`,
      prompt: 'El periodo que encuentra el proceso para la semilla 1, en horas',
      hints: [
        'El último paso da el periodo en días, con su error. Multiplica por 24.',
      ],
      worked:
        'Cerca de 0,1202 × 24 = 2,88 horas, con un error de 0,0004 días (0,01 horas) y una semiamplitud de 0,0502 ± 0,0012 magnitudes. Los datos se hicieron con un periodo de 0,12 días, 2,88 horas, y una semiamplitud de 0,05 magnitudes: el proceso recupera las dos desde imágenes en bruto, aunque ninguna imagen apunta igual y las nubes atenuaron cada estrella en una décima. Una segunda estrella del campo varía solo si lo pides: marca «Hacer que la estrella de comparación C2 también varíe», ejecuta de nuevo, y el paso de comparación la marca y la deja fuera.',
      feedback: {
        close:
          'Casi. Lee el periodo en días en el último paso y multiplícalo por 24.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: una décima de día son un par de horas.',
        off: 'días × 24.',
      },
    },
  ],
};
