export const HOW_FAST_DOES_THE_STAR_SPIN_ES = {
  title: '¿Con qué rapidez gira la estrella?',
  subtitle:
    'Lee el periodo de rotación de una estrella a partir de la atenuación de sus manchas, mira por qué la luz sola puede dejar abierta una segunda respuesta y mide dos estrellas reales',
  objectives: [
    'Decir por qué la luz de una estrella con manchas se repite una vez por vuelta, y leer el periodo de la atenuación en una curva de luz',
    'Decir por qué la luz sola puede dejar abierto un segundo periodo, y cuál produce un par de manchas opuestas',
    'Leer el periodo de rotación de una estrella real en un periodograma, con su intervalo',
    'Decir que el Sol y otras estrellas giran más deprisa en el ecuador que cerca de los polos, y qué hace eso a un periodo leído de las manchas',
  ],
  steps: {
    'a-spot-turns-with-the-star': {
      title: 'Una mancha gira con la estrella',
      body: 'Una estrella no es un disco uniforme. Las <strong>manchas estelares</strong> son zonas más frías y oscuras, como las manchas solares, y viajan por la superficie mientras la estrella gira. Cuando una mancha nos mira, la estrella es un poco más tenue; al pasar el limbo, la estrella se aviva otra vez; y el patrón se repite una vez por vuelta.\n\nEl panel hace girar una estrella modelo con una mancha oscura cada 4,00 días y dibuja su luz durante 16 días, con un poco de ruido. La línea es la estrella sin ruido; los puntos son lo que registraría un telescopio. Los datos son sintéticos y el panel lo dice.',
    },
    'how-many-dips': {
      title: '¿Cuántos mínimos en una vuelta?',
      body: 'La estrella gira una vez en 4,00 días y lleva una mancha oscura, que nos mira en algún momento y queda oculta tras la estrella media vuelta después.',
      prompt: 'En 16 días la curva de luz mostrará&hellip;',
      options: [
        'cuatro mínimos, uno cada vez que la mancha vuelve: una vez por vuelta',
        'ocho mínimos, uno cuando la mancha nos mira y otro cuando está oculta en la cara lejana',
        'un solo mínimo largo, porque la mancha sigue en la estrella',
        'ninguno: una mancha es demasiado pequeña para cambiar la luz de una estrella',
      ],
      hints: [
        'La mancha atenúa la estrella solo mientras está en la cara que vemos, y está en esa cara una vez por vuelta.',
      ],
      because:
        'Cuatro. La mancha atenúa la estrella cuando nos mira y no hace nada mientras está en la cara lejana, así que hay un mínimo por vuelta: 16 días son cuatro vueltas de 4,00 días. Incluso una mancha de pocos por ciento del disco atenúa la estrella unos pocos por ciento, lo que un telescopio espacial mide con facilidad.',
    },
    'read-the-period': {
      title: 'Lee el periodo',
      body: 'El periodograma busca el periodo que mejor ajusta la luz. Lee el <strong>periodo hallado</strong> y la <strong>atenuación por las manchas</strong>, de pico a valle.',
      fields: [
        { label: 'Periodo hallado' },
        { label: 'Atenuación por las manchas' },
      ],
    },
    'two-spots': {
      title: 'Una segunda mancha, en la cara lejana',
      body: 'Activa <strong>Segunda mancha, en el lado opuesto</strong>: una mancha del mismo tamaño media vuelta más allá de la primera. La estrella sigue girando una vez en 4,00 días. El periodograma tiene ahora su pico en 2,00 días, y el panel anota 4,00 días como otro periodo posible.',
      prompt:
        '¿Qué dice esta curva de luz sola sobre el periodo de rotación de la estrella?',
      options: [
        'La luz se repite cada 2,00 días, así que la estrella gira en 2,00 días o en 4,00, y la luz sola no puede decir cuál',
        'La estrella gira en 2,00 días: el pico del periodograma es el periodo de rotación',
        'La estrella gira en 4,00 días, porque eso dice el panel que se hizo con',
        'No tiene periodo de rotación, porque dos manchas se cancelan',
      ],
      hints: [
        'Con dos manchas iguales opuestas, ¿cómo se ve la estrella media vuelta después?',
      ],
      because:
        'Media vuelta después la estrella se ve igual, así que la luz se repite cada 2,00 días. Que la estrella gire en 2,00 días con un patrón o en 4,00 con dos manchas iguales da la misma luz: el periodo de la atenuación es una respuesta y su doble es la otra, y solo algo más allá de la curva de luz (un espectro, una segunda estrella, el tamaño y la velocidad de la estrella) puede elegir. Por eso el panel da 4,00 días como no excluido en vez de descartarlo. El panel dice con qué se hizo porque es sintético; una estrella real no lo dice.',
      misconceptions: [
        {
          say: 'El pico es el periodo de la atenuación, que es el periodo de rotación solo cuando el patrón aparece una vez por vuelta. Dos manchas iguales lo hacen aparecer dos veces.',
        },
        {
          say: 'La verdad se conoce aquí solo porque los datos son sintéticos. Con una estrella real, la curva de luz es todo lo que hay, y no trae la respuesta.',
        },
      ],
    },
    'a-real-star': {
      title: 'Una estrella real: AU Microscopii',
      body: 'AU Microscopii es una enana roja joven, a 32 años luz, y el telescopio espacial TESS la observó durante 27 días. Este es su periodograma. Lee el <strong>periodo de rotación</strong> y el <strong>otro periodo que podría ser</strong>, en días.',
      fields: [
        { label: 'Periodo de rotación' },
        { label: 'Otro periodo que podría ser' },
      ],
    },
    'the-sun-turns-unevenly': {
      title: 'El Sol, y las estrellas como él, giran de forma desigual',
      body: 'El Sol no es una rueda sólida. Sus manchas cerca del ecuador dan la vuelta en unos 25 días y las que están cerca de los 60&deg; de latitud tardan unos 30 (mira <em>El Sol que gira</em>). El panel puede hacer lo mismo con la estrella modelo: pon la mancha a <strong>60&deg;</strong> y la rotación diferencial en <strong>0,20</strong>, y lee el periodo de la latitud de la mancha junto al del ecuador.',
      fields: [
        { label: 'Periodo en el ecuador' },
        { label: 'Periodo de la latitud de la mancha' },
      ],
    },
    'why-no-age': {
      title: 'Lo que el periodo no da',
      body: 'Una estrella joven gira deprisa y se frena al envejecer, así que se han usado un periodo de giro y un color para estimar la edad de una estrella, un método llamado <strong>girocronología</strong>. Esta investigación se detiene en el periodo, a propósito. Las relaciones publicadas valen solo para las estrellas y edades con que se calibraron, tienen una dispersión grande, y dos de las más conocidas discrepan en una estrella más de lo que dicen sus intervalos. Gravitas comprobó con qué frecuencia se cumplía el intervalo que daría en una muestra sintética, y la comprobación quedó por debajo del listón que se había fijado de antemano; por eso no da una edad.\n\nEl periodo, su intervalo y el periodo que podría ser es lo que da la curva de luz. Los niveles más profundos leen una segunda estrella, preguntan por qué es ancho el intervalo y miran lo que el modelo deja fuera.',
    },
  },
};

export const HOW_FAST_DOES_THE_STAR_SPIN_DEEPER_ES = {
  steps: {
    'a-second-star': {
      title: 'Una segunda estrella: EK Draconis',
      body: 'EK Draconis es una estrella joven parecida al Sol, observada durante 27 días por TESS. Lee su <strong>periodo de rotación</strong> y los dos extremos de su <strong>intervalo del 95 por ciento</strong>.',
      fields: [
        { label: 'Periodo de rotación' },
        { label: 'Extremo inferior del intervalo' },
        { label: 'Extremo superior del intervalo' },
      ],
    },
    'why-the-interval-is-wider': {
      title: 'Por qué el intervalo es ancho',
      body: 'El pico de un periodograma tiene una anchura que fija cuántas vueltas contienen los datos, y el intervalo que da el panel es más ancho que eso. EK Draconis se ensancha por un factor de 6,2 y AU Microscopii por 2,9.',
      prompt: '¿Para qué sirve el ensanchamiento?',
      options: [
        'La dispersión alrededor de la curva ajustada está correlacionada de un punto al siguiente, como ocurre cuando las manchas cambian de forma durante el sector; los puntos vecinos no son pruebas independientes, y el periodo es menos seguro de lo que sugiere el número de puntos',
        'Las estrellas mayores tienen intervalos más anchos, y EK Draconis es mayor',
        'Para tener en cuenta la distancia de la estrella, de la que depende el periodo',
        'Para que el intervalo parezca más cauto de lo que justifican los datos',
      ],
      hints: [
        'Un ajuste que trata cada punto como independiente está demasiado seguro cuando los residuos van en tramos largos por encima y por debajo de la curva.',
      ],
      because:
        'El ajuste trata los puntos como independientes. Cuando los residuos están correlacionados (una mancha que crece, se apaga o se mueve deja tramos de datos por encima o por debajo de la curva ajustada), la información real es menor que el número de puntos, y el intervalo se ensancha por el factor que da la correlación de los residuos vecinos. El periodo no depende de la distancia, y el ensanchamiento no es discrecional: se calcula a partir de los residuos.',
      misconceptions: [
        {
          say: 'Un periodo es un tiempo, medido igual desde cualquier distancia.',
        },
        {
          say: 'El factor se calcula con los datos, no se elige, y la validación de la cobertura del intervalo lo probó con estrellas sintéticas de periodo conocido.',
        },
      ],
    },
    'fold-it-twice': {
      title: 'Pliégalo dos veces',
      body: 'Plegar una curva de luz a un periodo es poner cada ciclo encima del anterior, por fase. El panel puede plegar AU Microscopii a su periodo de 4,86 días y al doble, 9,71 días. Prueba las dos.',
      prompt: '¿Qué muestra el pliegue de 9,71 días?',
      options: [
        'Las dos mitades quedan una sobre otra dentro del ruido, así que los datos no pueden descartar 9,71 días como periodo de rotación',
        'Las dos mitades difieren, así que 9,71 días es el periodo verdadero',
        'El pliegue está vacío, porque 9,71 días es más largo que los datos',
        'El pliegue tiene dos manchas, así que la estrella tiene dos manchas',
      ],
      hints: [
        'Si la estrella girara en 9,71 días con dos manchas parecidas en lados opuestos, las dos mitades del ciclo se verían iguales.',
      ],
      because:
        'Las dos mitades coinciden (la prueba del panel sobre si difieren da una probabilidad de 0,63 de ver una diferencia así de grande solo por el ruido), así que la luz muestra un patrón cada 4,86 días y no distingue una rotación de 4,86 días de una de 9,71 con dos manchas parecidas. Solo si las mitades difirieran, como con manchas distintas, quedaría demostrado el periodo más largo. El ciclo de 9,71 días cabe 2,8 veces en el sector de 27 días.',
      misconceptions: [
        {
          say: 'Si las mitades difirieran, el periodo más largo sería el que prefieren los datos. Aquí no difieren.',
        },
      ],
    },
    'a-baseline-too-short': {
      title: 'Un alias que los datos no pueden probar',
      body: 'Vuelve a la estrella modelo con una mancha. Sus 16 días contienen cuatro vueltas de 4,00 días. El panel anota 8,00 días como otro periodo posible, y dice que no se puede probar.',
      prompt: '¿Por qué no pueden probar los datos 8,00 días?',
      options: [
        'Una prueba necesita que los datos contengan al menos dos ciclos del periodo probado, y 16 días contienen menos de dos ciclos de 8,00',
        'Porque 8,00 días no es múltiplo de 4,00',
        'Porque la estrella no gira tan despacio',
        'Porque el ruido es demasiado grande',
      ],
      hints: [
        'Para ver si las dos mitades de un ciclo de 8,00 días difieren, hacen falta dos de esos ciclos.',
      ],
      because:
        'Para decir si los mínimos pares e impares difieren hay que ver más de un ciclo del periodo más largo, y 16 días son un poco menos de dos ciclos de 8,00. El panel marca entonces el periodo más largo como no comprobable en vez de decir que está excluido o permitido. Un sector más largo, o la misma estrella observada otra vez, lo probaría.',
    },
    'the-equator-from-a-spot': {
      title: 'El ecuador a partir de una mancha',
      body: 'La estrella modelo a 60&deg; con rotación diferencial 0,20 muestra un periodo de 4,71 días en su luz.',
      prompt: '¿Puedes saber su periodo ecuatorial solo con la curva de luz?',
      options: [
        'No: la luz da el periodo de la latitud de la mancha, y el del ecuador se sigue solo si se conocen la latitud y la rotación diferencial',
        'Sí: es el mismo que el periodo de la luz',
        'Sí: es la mitad del periodo de la luz',
        'No, porque una estrella con rotación diferencial no tiene periodo',
      ],
      hints: [
        'La regla del modelo es P(lat) = P(ecuador) / (1 − k sen² lat). ¿Cuáles de ellos se conocen por la luz?',
      ],
      because:
        'El periodo de la luz es el de las manchas, P(lat) = P(ecuador) / (1 − k sen² lat), y la luz sola no da ni la latitud ni k. Una estrella con varias manchas a varias latitudes muestra varios periodos y el pico del periodograma es el más fuerte. Es un límite declarado del modelo, y el periodo que da el panel es el de las manchas, no un periodo de rotación de toda la estrella.',
      misconceptions: [
        {
          say: 'Coinciden solo para k = 0, una estrella que gira como una rueda sólida.',
        },
      ],
    },
  },
};

export const FLARES_ES = {
  title: 'Erupciones',
  subtitle:
    'Halla las erupciones en la luz de una enana roja, mide cuánta luz da cada una como duración equivalente y cuenta las erupciones por tamaño',
  objectives: [
    'Decir qué aspecto tiene una erupción en una curva de luz y qué parte es más rápida, la subida o la bajada',
    'Decir qué es una duración equivalente y leer una con su incertidumbre',
    'Contar las erupciones de una estrella real y decir con qué frecuencia ocurren',
    'Decir qué significa la pendiente de la distribución de erupciones por tamaño, y por qué depende de dónde empieza el ajuste',
  ],
  steps: {
    'a-flare-is-a-spike': {
      title: 'Una erupción es un pico en la luz',
      body: 'Una <strong>erupción</strong> es una liberación repentina de energía magnética en la atmósfera de una estrella, el mismo tipo de suceso que una erupción solar. La estrella se aviva en minutos y se apaga en más tiempo. Las enanas rojas tienen erupciones a menudo, y una erupción puede sumar más de una décima de la luz de la estrella.\n\nEl panel muestra un día de la luz de AU Microscopii, una enana roja joven, del telescopio espacial TESS, con una lectura cada dos minutos. La línea azul es el nivel en calma de la estrella, los puntos son la luz, y cada anillo marca una erupción hallada por una regla: puntos al menos tres desviaciones típicas por encima del nivel en calma, tres o más seguidos.',
    },
    'rise-or-fall': {
      title: '¿Más rápida la subida o la bajada?',
      body: 'Una erupción se aviva y luego se apaga hasta el nivel en calma de la estrella.',
      prompt: '¿Qué parte de una erupción es la más rápida?',
      options: [
        'La subida: unos minutos hacia arriba y una cola larga que se apaga despacio',
        'La bajada: la erupción se enciende despacio y acaba de golpe',
        'Las dos tardan lo mismo, así que una erupción es simétrica',
        'Depende de la estrella, y ninguna forma es típica',
      ],
      hints: [
        'Piensa en una hoguera: ¿cómo de deprisa se aviva comparado con lo que tarda en apagarse?',
      ],
      because:
        'La más rápida es la subida: la luz sube en minutos y luego baja en más tiempo, con una cola larga. Las erupciones de distinto tamaño comparten una forma común, una subida rápida y una bajada en dos partes, y por eso se puede ajustar una forma estándar para hallar el tamaño de una erupción.',
    },
    'read-a-flare': {
      title: 'Lee una erupción',
      body: 'El panel muestra de cerca la segunda mayor erupción de AU Microscopii. Lee su <strong>duración equivalente</strong> en segundos, su <strong>pico sobre el nivel en calma</strong> en por ciento y su <strong>anchura a la mitad del pico</strong> en minutos.',
      fields: [
        { label: 'Duración equivalente' },
        { label: 'Pico sobre el nivel en calma' },
        { label: 'Anchura a la mitad del pico' },
      ],
    },
    'what-is-an-equivalent-duration': {
      title: 'Qué es una duración equivalente',
      body: 'La erupción que leíste tiene una duración equivalente de unos 118 segundos.',
      prompt: '¿Qué significa ese número?',
      options: [
        'El tiempo que tardaría la estrella, en su nivel en calma, en emitir la misma luz que sumó la erupción',
        'Cuánto duró la erupción',
        'El tiempo desde el comienzo de la erupción hasta su pico',
        'La energía de la erupción, en julios',
      ],
      hints: [
        'Es el área bajo la luz extra de la erupción, dividida por la luz en calma de la estrella, así que tiene unidades de tiempo.',
      ],
      because:
        'La duración equivalente es la integral de la luz extra de la erupción dividida por la luz en calma, así que es el tiempo que necesitaría la estrella en calma para emitir la misma luz. No es cuánto dura la erupción (unos 29 minutos a la mitad del pico aquí, más en la cola), y es un tiempo en la banda del telescopio, no una energía: convertirlo en una exige la luminosidad de la estrella y la temperatura de la erupción, y Gravitas no da ninguna de las dos.',
      misconceptions: [
        {
          say: 'La duración de la erupción es cuánto dura; la duración equivalente mide cuánta luz suma, escrita como un tiempo.',
        },
        {
          say: 'Sería una energía solo tras multiplicar por la luminosidad de la estrella en la banda y corregir a todas las longitudes de onda, lo que exige más de lo que da esta curva de luz.',
        },
      ],
    },
    'count-the-flares': {
      title: 'Cuenta las erupciones',
      body: 'El segundo panel cuenta las erupciones de AU Microscopii por tamaño. Lee el <strong>número de erupciones halladas</strong> y calcula cuántas hay <strong>al día</strong> de media.',
      fields: [
        { label: 'Erupciones halladas' },
        { label: 'Erupciones al día' },
      ],
    },
    'a-time-not-an-energy': {
      title: 'Un tiempo, no una energía',
      body: 'Todos los números de aquí son en la banda del telescopio, que cubre más o menos de 600 a 1000 nanómetros. La energía de una erupción exigiría la luminosidad de la estrella en esa banda y una corrección por el resto del espectro, que depende de cuán caliente sea la erupción. Gravitas comprobó una corrección de ese tipo y vio que depende demasiado de la temperatura que se suponga, así que no da energía de erupción: la medida es la duración equivalente.\n\nLos niveles más profundos ajustan cómo se distribuyen las erupciones por tamaño y preguntan qué puede y qué no puede decir el ajuste.',
    },
  },
};

export const FLARES_DEEPER_ES = {
  steps: {
    'the-slope': {
      title: 'La pendiente',
      body: 'Por encima de un suelo, los recuentos de erupciones de al menos cada tamaño caen en una recta en estos ejes logarítmicos: una <strong>ley de potencias</strong> de pendiente α. El panel la ajusta por encima del tamaño que el telescopio halla por completo. Lee α, su intervalo del 95 por ciento y el número de erupciones por encima del suelo.',
      fields: [
        { label: 'Pendiente α' },
        { label: 'Extremo inferior del intervalo' },
        { label: 'Extremo superior del intervalo' },
        { label: 'Erupciones sobre el suelo' },
      ],
    },
    'move-the-floor': {
      title: 'Mueve el suelo',
      body: 'Pon <strong>Suelo del ajuste</strong> en <em>ninguno</em>. La pendiente baja de 1,92 a 1,27 y la recta ya no sigue los puntos.',
      prompt:
        '¿Por qué es más plano el ajuste cuando incluye las erupciones más pequeñas?',
      options: [
        'El telescopio pierde parte de las erupciones pequeñas, así que hay menos de ellas de las que tiene la ley de potencias, y los recuentos se curvan por debajo del suelo',
        'Las erupciones pequeñas siguen otra ley de la física',
        'Las erupciones más pequeñas son las más fiables, así que deben contar más',
        'El ajuste tiene más puntos, así que debe ser mejor',
      ],
      hints: [
        'Una erupción débil y breve puede esconderse en el ruido. ¿Qué hace eso al recuento de tamaños pequeños?',
      ],
      because:
        'Las erupciones débiles y breves se hallan solo en parte o no se hallan, así que los recuentos en tamaños pequeños caen por debajo de la ley de potencias y la recta ajustada se aplana. El límite de completitud es el tamaño por encima del cual la regla halla una erupción por completo en la prueba de inyección del panel, y ahí empieza el ajuste. Más puntos no son mejores puntos.',
    },
    'a-known-truth': {
      title: 'Un ajuste con una verdad conocida',
      body: 'Cambia la fuente a la estrella sintética. Sus erupciones se sortearon de una ley de potencias de pendiente 1,80, y se aplicaron la misma regla y el mismo ajuste a su curva de luz: el ajuste devuelve 1,74, con un intervalo del 95 por ciento de 1,55 a 1,96.',
      prompt: '¿Qué dice eso del ajuste?',
      options: [
        'El intervalo contiene la pendiente verdadera, 1,80, como debe hacer un intervalo del 95 por ciento unas diecinueve veces de cada veinte: el método funciona cuando se conoce la verdad',
        'El ajuste está mal, porque 1,74 no es 1,80',
        'El ajuste es exacto, porque los datos son sintéticos',
        'El intervalo es demasiado ancho para decir nada',
      ],
      hints: [
        'Un ajuste con un número finito de erupciones se desvía un poco. ¿Contiene el intervalo la verdad?',
      ],
      because:
        'El ajuste es una pendiente de máxima verosimilitud a partir de un número finito de erupciones, así que no es exactamente la pendiente verdadera; su intervalo del 95 por ciento debe contener la verdad unas diecinueve veces de cada veinte, y aquí lo hace. La validación del método lo ejecutó con muchas estrellas sintéticas. Una estrella muestra que puede funcionar, no con qué frecuencia.',
      misconceptions: [
        {
          say: 'Una pendiente de 48 erupciones no puede ser igual a la pendiente de la que se sorteó la población; el intervalo dice cuánto puede desviarse.',
        },
      ],
    },
    'the-floor-you-pick': {
      title: 'Un suelo elegido tras mirar',
      body: 'Pon <strong>Suelo del ajuste</strong> en <em>mejor ajuste</em> para AU Microscopii: el suelo que hace que la recta siga mejor los puntos es 6,1 segundos, y el ajuste da 1,98 (1,71 a 2,29) con 44 erupciones.',
      prompt: '¿Es una medida mejor que 1,92 con el límite de completitud?',
      options: [
        'No: el suelo se eligió tras mirar los datos, lo que hace el intervalo demasiado estrecho, y los dos coinciden dentro de sus intervalos',
        'Sí: usa más erupciones, así que es más precisa',
        'Sí: el mejor ajuste es siempre la mejor medida',
        'No: 1,98 queda fuera del primer intervalo',
      ],
      hints: [
        'Un suelo elegido por lo bien que ajusta se elige con los mismos datos en que luego se usa.',
      ],
      because:
        'El límite de completitud sale de una prueba de inyección con otros datos y no depende de esta curva de luz; el suelo que mejor ajusta se elige a partir de ella. Una elección hecha mirando el resultado no se cuenta en el intervalo, que por eso subestima la incertidumbre. 1,98 queda dentro del primer intervalo (1,62 a 2,28), así que los dos no discrepan.',
      misconceptions: [{ say: '1,98 queda dentro de 1,62 a 2,28.' }],
    },
    'how-many-flares': {
      title: 'Cuántas erupciones para una pendiente',
      body: 'El intervalo del 95 por ciento de la pendiente con 29 erupciones va de 1,62 a 2,28, unos 0,67 de ancho.',
      prompt:
        '¿Cuántas erupciones por encima del suelo harían falta, más o menos, para reducir a la mitad el ancho del intervalo?',
      options: [
        'Unas cuatro veces más, 120 o así: el ancho cae como uno sobre la raíz cuadrada del número',
        'El doble, 58',
        'Unas 30 más',
        'Ningún número: el ancho no se puede reducir',
      ],
      hints: [
        'El error de una media cae como uno sobre la raíz cuadrada del número de valores.',
      ],
      because:
        'El error de una pendiente ajustada por máxima verosimilitud va como (α − 1) dividido por la raíz cuadrada del número de erupciones, así que reducirlo a la mitad exige cuatro veces las erupciones. Para AU Microscopii son unas cuatro veces 27 días de buenos datos, o unos cuantos sectores más.',
    },
  },
};
