// El latido de una estrella - español, paso a paso con ../the-beat-of-a-star.js.
export default {
  title: 'El latido de una estrella',
  subtitle:
    'Hallar el periodo de una estrella pulsante y los falsos periodos de un telescopio que mira una vez por noche',
  objectives: [
    'Hallar el periodo de una estrella pulsante a partir de una curva de luz con una búsqueda de periodos, y plegar la luz sobre él',
    'Dar un periodo con su error, y decir por qué una serie de pocos ciclos da un pico más ancho y un error mayor',
    'Mostrar que un periodo de plegado equivocado emborrona la curva y que el doble del periodo muestra dos copias de ella',
    'Explicar por qué observar una vez por noche mete picos falsos en la búsqueda de periodos, y dónde caen',
  ],
  steps: [
    {
      title: 'Una estrella que se repite',
      body: `Algunas estrellas se hinchan y se encogen con un horario, y su brillo sube y baja con ellas. SU Draconis, una estrella RR Lyrae, lo hace en unas dieciséis horas. El instrumento guarda una curva de luz real suya del telescopio espacial TESS de la NASA: 1.799 puntos agrupados a lo largo de 26 días. Lo más brillante está arriba.
             \n\nPara hallar el <strong>periodo</strong> no se cuenta a ojo. Una <strong>búsqueda de periodos</strong> prueba cada periodo de ensayo y puntúa lo bien que una curva suave que se repite con ese periodo ajusta los puntos; la puntuación, llamada potencia, tiene su pico en el periodo que la estrella tiene de verdad. <strong>Plegar</strong> después apila todos los ciclos unos sobre otros dibujando el brillo frente a la fase, la fracción de un periodo desde el mismo punto del ciclo. Elige “La búsqueda de periodo” y luego “Plegada con un periodo” en “Imagen” para ver ambas.`,
    },
    {
      title: 'El primer periodo',
      body: `Con “SU Draconis, toda la serie” y la imagen en “La búsqueda de periodo”, lee el <strong>periodo del pico más alto</strong> y la <strong>anchura de ese pico</strong> a media altura. La anchura dice lo bien que la serie distingue un periodo de otro cercano.`,
      fields: [{ label: 'Pico más alto' }, { label: 'Anchura del pico' }],
    },
    {
      title: 'Pliégala y da un error',
      body: `El pico de la búsqueda es una primera estimación. El instrumento la afina ajustando una curva que se repite hecha de unas pocas ondas seno, y da su error por <strong>bootstrap</strong>: repite la búsqueda sobre muchas copias remuestreadas de los datos y toma la dispersión de las respuestas. Lee el <strong>periodo</strong> afinado, su <strong>error</strong> y la <strong>amplitud</strong> de la estrella, la altura total de la curva plegada en magnitudes.`,
      fields: [
        { label: 'Periodo' },
        { label: 'Error del periodo' },
        { label: 'Amplitud' },
      ],
    },
    {
      title: 'Pliega sobre el doble del periodo',
      body: `Supón que pliegas la luz sobre el <strong>doble</strong> del periodo de la estrella. Todavía no cambies el instrumento.`,
      prompt: 'En el pliegue, los puntos&hellip;',
      options: [
        'caerán sobre una curva fina, exactamente como antes',
        'caerán sobre una curva fina que muestra la misma forma dos veces en cada pliegue',
        'se dispersarán en una nube sin curva',
        'caerán sobre una curva fina de solo la mitad de altura',
      ],
      hints: [
        'Ahora caben dos ciclos verdaderos en cada pliegue. ¿Son distintos entre sí?',
      ],
      because:
        'La misma forma dos veces en cada pliegue. Cada ciclo verdadero es igual, así que dos juntos hacen una curva que se repite una vez dentro del pliegue. Plegar sobre el doble del periodo (o cualquier múltiplo entero) no es un error, solo es redundante: por eso se da el periodo más corto que pliega la curva sobre sí misma. El paso siguiente lo pone en pantalla.',
    },
    {
      title: 'El doble del periodo',
      body: `Pon “Plegar con” en <strong>el doble del periodo</strong> y lee el periodo que usa el pliegue. Mira la imagen: muestra dos ciclos de fase, así que la forma debería aparecer cuatro veces.`,
      fields: [{ label: 'Periodo que usa el pliegue' }],
    },
    {
      title: 'Un periodo que se pasa un dos por ciento',
      body: `Vuelve a “el periodo”. Mueve el deslizador “Periodo, por encima o por debajo del mejor” a <strong>+2 por ciento</strong> y mira cómo la curva plegada se abre en una banda. Lee el periodo que usa el pliegue.`,
      fields: [{ label: 'Periodo que usa el pliegue' }],
    },
    {
      title: 'Una segunda estrella',
      body: `Eta Aquilae es una cefeida, una estrella mucho mayor que pulsa mucho más despacio. Elígela y lee su <strong>periodo</strong> afinado, el <strong>error</strong> de ese periodo y el <strong>número de ciclos</strong> que cubre la serie.`,
      fields: [
        { label: 'Periodo' },
        { label: 'Error del periodo' },
        { label: 'Ciclos en la serie' },
      ],
    },
    {
      title: 'Por qué el error es mayor',
      body: `El periodo de Eta Aquilae se conoce al 0,4 por ciento y el de SU Draconis al 0,02 por ciento, con el mismo telescopio y el mismo método.`,
      prompt: '¿Qué afirmación explica mejor la diferencia?',
      options: [
        'Las cefeidas pulsan con menos regularidad que las RR Lyrae',
        'La serie cubre 3,7 ciclos de Eta Aquilae y 39 de SU Draconis, así que su pico de búsqueda es más ancho y su periodo está peor fijado',
        'TESS es menos sensible a las cefeidas',
        'El bootstrap no funciona con periodos de más de un día',
      ],
      misconceptions: [
        {
          say: 'Las dos estrellas se repiten con mucha precisión. La diferencia no está en las estrellas sino en cuántos ciclos caben en una serie de 27 días.',
        },
        {
          say: 'Eta Aquilae es brillante y está bien medida; en todo caso satura el detector, que es otro problema. El error lo fija sobre todo el número de ciclos.',
        },
      ],
      hints: [
        'Compara los ciclos de cada serie y las anchuras de los dos picos.',
      ],
      because:
        'La anchura de un pico es aproximadamente el periodo al cuadrado dividido por la duración de la serie, así que un periodo de 7 días en una serie de 27 días tiene un pico de unos 2 días de ancho, mientras que un periodo de 0,66 días en una serie de la misma duración lo tiene de unos 0,017 días. Para fijar un periodo largo hace falta una serie larga.',
    },
    {
      title: 'Un telescopio en tierra',
      body: `Un telescopio en tierra ve SU Draconis una vez por noche, más o menos a la misma hora, porque el Sol estorba el resto del día. El instrumento conserva un solo grupo por día de los mismos datos de TESS, 178 puntos. Todavía no cambies el instrumento.`,
      prompt: 'El pico más alto de la búsqueda de periodos estará&hellip;',
      options: [
        'otra vez en 0,66 días: los puntos siguen llevando la misma información',
        'en otro periodo, con el periodo verdadero aún como un pico casi igual de alto',
        'en ninguna parte: con tan pocos puntos no se puede hallar ningún pico',
        'en la mitad del periodo verdadero',
      ],
      hints: [
        'Piensa en lo que vería quien observa una vez por noche si la estrella se repitiera exactamente una vez al día.',
      ],
      because:
        'En otro periodo, con el verdadero casi igual de alto. Muestrear una vez al día no distingue un ritmo del mismo ritmo desplazado un ciclo por día, así que los datos ajustan varios periodos casi igual de bien. El paso siguiente los lee.',
    },
    {
      title: 'Una vez por noche',
      body: `Elige “SU Draconis, vista una vez por noche” con la búsqueda de periodos. Lee el <strong>periodo del pico más alto</strong> y la <strong>anchura de ese pico</strong>.`,
      fields: [{ label: 'Pico más alto' }, { label: 'Anchura del pico' }],
    },
    {
      title: 'Dónde caen los picos falsos',
      body: `Vuelve a toda la serie de SU Draconis, donde el periodo verdadero no está en duda, y lee los dos <strong>alias</strong> que da el instrumento: los periodos que un muestreo de una vez al día confundiría con él, uno más largo en frecuencia por día y otro más corto.`,
      fields: [{ label: 'Primer alias' }, { label: 'Segundo alias' }],
    },
    {
      title: 'Por qué hay alias',
      body: `Los picos falsos están en 1,945 y 0,398 días, y el periodo verdadero es 0,660 días.`,
      prompt: '¿Qué hace que una búsqueda de una vez por noche los produzca?',
      options: [
        'Ruido en los datos que casualmente se repite',
        'Observar a la misma hora cada día no distingue una frecuencia de esa frecuencia más o menos una por día',
        'La estrella tiene tres periodos distintos',
        'La serie de Fourier añade periodos extra por su cuenta',
      ],
      misconceptions: [
        {
          say: 'Los mismos datos, tomados a cualquier ritmo, no dan picos falsos. Vienen del patrón de las horas de observación, no del ruido.',
        },
        {
          say: 'La estrella tiene un solo periodo. Los demás picos son lo que el muestreo hace de él.',
        },
      ],
      hints: [
        'Un reloj que se mira una vez al día marca la misma hora sea cual sea su velocidad, salvo un número entero de vueltas.',
      ],
      because:
        'Cada noche se ve la estrella en un solo momento de su ciclo, y una estrella que gana exactamente un ciclo entre visitas se ve igual que una que no gana ninguno. Los remedios son observar a horas variadas, añadir un observatorio en otra longitud o conservar una serie larga, que es lo que hace TESS.',
    },
    {
      title: 'Lo que has deducido',
      body: `Una búsqueda de periodos puntúa cada periodo de ensayo y tiene su pico en el de la estrella; plegar sobre él apila los ciclos en una sola curva, y un bootstrap da un error. Los 0,66041 ± 0,00015 días de SU Draconis salen de casi cuarenta ciclos; los 7,226 ± 0,030 días de Eta Aquilae, de menos de cuatro, por lo que su pico es ancho. Un periodo que se pasa un dos por ciento emborrona el pliegue, y el doble del periodo muestra la forma dos veces. Vista una vez por noche, la misma estrella da un pico más alto en 1,97 días, el triple de su periodo real, con picos iguales en 0,66 y 0,40: los alias que hace el muestreo.
             \n\nEs el primer paso hacia la escalera de distancias: el periodo de una cefeida dice cuán luminosa es. Queda fuera aquí: la banda de TESS no es la V; el bootstrap trata los puntos como independientes, así que sus errores son mínimos; y la cronometría de púlsares, que necesita otro método, no se modela.`,
    },
  ],
};
