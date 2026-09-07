// =============================================================================
// Diseña el calendario - Spanish
// -----------------------------------------------------------------------------
// A shadow of ../design-the-schedule.js carrying only its words. Laid over the
// English lesson by mergeTranslation() in ../i18n.js, so anything absent here
// keeps its English and nothing here can reach the lesson's machinery: no
// scenario name, no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English.
// =============================================================================

export default {
  series: 'Detección de exoplanetas',
  title: 'Diseña el calendario',
  subtitle:
    'Ocho noches en el instrumento real, y los tiempos que elijas deciden la respuesta',
  duration: '35-40 min',
  level: 'Astronomía introductoria',
  summary:
    'Tienes ocho noches y una estrella. Planifica tú mismo la campaña en el panel de Velocidad Radial, comprométete con una predicción y luego observa dos calendarios en paralelo sobre la misma estrella, con el mismo instrumento y el mismo ruido: uno recupera un Júpiter y el otro ni siquiera puede establecer que la velocidad cambie. Después rompe tu propio resultado — cambia la semilla, pierde quince días por mal tiempo y escribe una lista de fechas a mano — hasta que puedas decir qué debe acompañar a un periodo publicado para que otra persona pueda comprobarlo.',
  objectives: [
    'Configurar una campaña por sus tiempos y no solo por su cadencia',
    'Comprometerse con una predicción antes de observar, y decir después qué cambió la observación',
    'Explicar qué significa un pico de la ventana espectral cercano a uno',
    'Decir por qué la misma estrella, el mismo instrumento y el mismo ruido pueden dar dos periodos distintos',
    'Explicar por qué una sola campaña de cada calendario no puede establecer que un calendario sea mejor',
    'Describir qué le hace un hueco a un resultado, y qué no',
    'Enunciar con qué hay que citar un periodo: el rango explorado, el calendario y la semilla',
  ],
  steps: [
    {
      title: 'Ocho noches',
      body: 'La estrella en pantalla tiene un planeta. No se te va a decir su periodo, y no vas a tener mucho tiempo de espectrógrafo: <strong>ocho medidas</strong>, de 8 m/s cada una, a lo largo de unos veinticinco días.\n\nOcho medidas no son muchas. Pero lo que decidirá si encuentras el planeta no es cuántas tienes, sino <em>cuándo las tomas</em>, y eso hay que decidirlo antes de haber visto una sola velocidad.\n\nEl instrumento de esta lección es el de verdad. No un widget que lo sustituye: el panel de Velocidad Radial, observando esta simulación mientras corre, en tiempo real. Una campaña tarda unos minutos y no se puede deshacer.',
      tip: 'El tiempo de telescopio se asigna con meses de antelación. El calendario se escribe antes de que nadie sepa qué aspecto tendrán los datos, que es exactamente la situación en la que te pone esta lección.',
    },
    {
      title: 'Prepara la campaña',
      body: 'Abre <strong>Velocidad Radial</strong> en la lista de Herramientas y marca <strong>Campaña de observación sintética</strong>. Eso cambia el panel: en vez de dibujar una curva continua, conserva solo las medidas que habría producido un calendario declarado.\n\nConfigúralo así y déjalo:\n\n<strong>Línea de base 24,673 d · Incertidumbre 8 m/s · Semilla de ruido schedule-1 · Calendario: Cadencia regular · Observaciones 8</strong>\n\nLa nota bajo los campos te dirá en qué quedó el plan: ocho observaciones en 24,673 días, y una suma de comprobación del calendario. Apúntala: es como sabrás luego si dos registros se tomaron en los mismos instantes.',
      tip: 'El campo Observaciones aparece en cuanto eliges una forma de calendario o activas una comparación. Es lo que obliga a las dos campañas a tener el mismo número de noches.',
    },
    {
      title: 'Antes de observar',
      body: 'Ocho observaciones repartidas uniformemente en 24,673 días ponen una cada <strong>3,525 días</strong>.\n\nEl periodo del planeta, que se supone que aún no sabes pero que esta lección te va a decir porque el asunto está en otra parte, es de <strong>3,5247 días</strong>.\n\nComprométete ahora con una respuesta. Después se te preguntará qué cambió la observación.',
      prompt:
        'Ocho noches, una cada 3,525 días, sobre un planeta de periodo 3,5247 días. ¿Qué mostrará la campaña?',
      options: [
        'Una señal limpia de 3,52 días: la cadencia coincide exactamente con el periodo',
        'Una velocidad que apenas cambia, porque cada noche cae en el mismo punto de la órbita',
        'Dispersión aleatoria de unos 84 m/s, sin ningún periodo recuperable',
        'La amplitud completa, pero con el periodo recuperado al doble de su valor real',
      ],
      because:
        'Cada observación cae en la misma fase orbital, así que la estrella está haciendo lo mismo cada vez que miras. Las velocidades vuelven casi idénticas — no nulas, casi constantes — y una campaña que no puede ver cambiar la velocidad no puede medir ningún periodo. Nada del planeta cambió: simplemente nunca miraste al otro lado de la órbita.',
    },
    {
      title: 'Observa los dos calendarios a la vez',
      body: 'Ahora la versión controlada de esa pregunta. Marca <strong>Comparar con un segundo calendario</strong> y pon el segundo en <strong>Irregular</strong>, con <strong>Dispersión 0,45</strong>.\n\nLos dos calendarios observan ahora la misma estrella en los mismos fotogramas. Las mismas ocho observaciones, la misma línea de base, los mismos 8 m/s, la misma semilla: el ruido de la observación n-ésima es el mismo sorteo en ambos brazos. La única diferencia entre los dos registros es cuándo miraron.\n\nDéjalo correr. Veinticinco días simulados son unas siete órbitas; sube la velocidad de la simulación si no quieres esperar, pero vigila el aviso de que los fotogramas están demasiado separados, que significa que las medidas se están leyendo cruzando la curva en vez de sobre ella. La comparación aparece cuando ambos calendarios han terminado.',
      tip: 'Un segundo brazo no es una segunda campaña. Repetir la campaña cambiaría el sorteo de ruido además de los tiempos, y no podrías saber cuál de los dos movió la respuesta.',
    },
    {
      title: 'Lee la comparación',
      body: 'El bloque de comparación bajo los controles informa de ambos brazos. Lee cuatro números.\n\nTus cifras no coincidirán dígito a dígito con estas — otra velocidad de simulación coloca los fotogramas de otra manera — pero deberían contar la misma historia.',
      fields: [
        { label: 'Cadencia regular: mejor periodo' },
        { label: 'Cadencia regular: K' },
        { label: 'Irregular: mejor periodo' },
        { label: 'Irregular: K' },
      ],
    },
    {
      title: 'Un pico de ventana del 100%',
      body: 'La comparación indica un "pico de ventana peor" para cada calendario: alrededor del <strong>100%</strong> para la cadencia regular y alrededor del <strong>57%</strong> para la irregular.\n\nEse número sale solo de los tiempos de observación. No entra ninguna velocidad: podrías calcularlo antes de observar nada, que es justamente la razón por la que merece la pena calcularlo.',
      prompt: 'Un pico de ventana del 100% significa que el calendario…',
      options: [
        'midió la estrella con un 100% de precisión',
        'no puede distinguir una señal a esa frecuencia de una a frecuencia cero: ambas ajustan los datos igual de bien',
        'cubrió el 100% del ciclo orbital',
        'tiene el 100% de sus observaciones dentro de la línea de base',
      ],
      because:
        'La ventana espectral es lo que el calendario por sí solo puede y no puede distinguir. Un pico de uno dice que hay una frecuencia a la que dos señales completamente distintas producen exactamente las mismas ocho medidas, así que ningún cuidado en el ajuste puede separarlas. Es una propiedad de los tiempos, calculable de antemano, y es el número que hay que mirar al decidir un calendario, no al defender un resultado.',
    },
    {
      title: '¿Entonces los calendarios irregulares son mejores?',
      body: 'Acabas de ver un calendario irregular recuperar un planeta que uno regular perdió por completo, con todo lo demás igualado. La tentación es evidente.',
      prompt:
        '¿Qué establece esta comparación sobre los calendarios irregulares en general?',
      options: [
        'Que son mejores: el experimento estaba controlado y el resultado fue concluyente',
        'Nada en general: es un sorteo de ruido de un par de calendarios frente a un periodo, y dice lo que pasó aquí',
        'Que son peores, porque la K que devolvieron era demasiado alta',
        'Que el calendario regular estaba estropeado y habría que descartarlo',
      ],
      because:
        'La comparación estaba controlada, y lo que estableció es real: en esta estrella, con esta semilla, estos tiempos encontraron el planeta y aquellos no. Eso es un hecho sobre esta campaña. "Irregular es mejor" es una afirmación sobre calendarios en general, y una sola campaña de cada uno no puede sostenerla, que es por lo que el panel imprime la advertencia bajo cada comparación en vez de dejarla a la memoria.',
    },
    {
      title: 'Rompe tu propio resultado',
      body: 'Una afirmación que no puedes poner a prueba vale poco, así que pon esta a prueba.\n\nCambia la <strong>Semilla de ruido</strong> a otra cosa — <strong>schedule-2</strong>, <strong>schedule-3</strong> — y vuelve a ejecutar la comparación. Cada semilla es un sorteo distinto del mismo ruido de 8 m/s sobre la misma estrella con los mismos dos calendarios.\n\nObserva qué se mantiene y qué no. El fracaso del brazo regular no es cuestión de suerte: sus ocho noches caen en la misma fase haga lo que haga el ruido, así que falla con todas las semillas. El éxito del brazo irregular es en parte suerte: el periodo que devuelve se mueve, y la amplitud se mueve más.',
      tip: 'Esta es la diferencia entre una propiedad del calendario y una propiedad del sorteo. Tres semillas no son un estudio, pero bastan para ver cuál de las dos estás mirando.',
    },
    {
      title: 'Y entonces llueve',
      body: 'Las campañas reales pierden noches. Supón que el centro de la tuya se nubla: se pierde todo entre el día 8 y el día 16, y nadie replanifica el resto — las noches que quedan ocurren cuando siempre iban a ocurrir.\n\nComprométete antes de probarlo.',
      prompt:
        'Perder el tercio central de la campaña, con los demás tiempos intactos, va a…',
      options: [
        'no tener efecto: la forma del calendario sigue siendo la misma',
        'dejar menos observaciones en la misma línea de base, y un resultado más grueso que el panel debería declarar como más grueso',
        'acortar la línea de base a un tercio y hacer imposible encontrar el periodo',
        'rellenarse en silencio interpolando entre las noches que sobreviven',
      ],
      because:
        'La línea de base no cambia — la primera y la última noche siguen donde estaban — pero hay menos observaciones dentro, y la cobertura de fase tiene un agujero. El panel dice cuántas épocas cayeron en el hueco en vez de observar en silencio una campaña más corta, y la comparación deja de llamarse controlada si los dos brazos pierden un número distinto de noches.',
    },
    {
      title: 'Pierde quince días',
      body: 'Escribe <strong>8-16</strong> en <strong>Huecos</strong> y deja correr otra vez los dos brazos.\n\nLa nota bajo los controles dice ahora cuántas épocas cayeron dentro del hueco y no se observaron. Fíjate en lo que le pasa después al bloque de comparación: si los dos calendarios perdieron un número distinto de noches, te dirá que la comparación ya no trata solo del calendario, y enumerará qué dejó de ser igual.\n\nEso no es que el panel sea quisquilloso. Dos brazos con distinto número de observaciones difieren en dos cosas a la vez, y cualquier diferencia en sus respuestas podría ser cualquiera de las dos.',
      tip: 'Un hueco se escribe en días desde el inicio de la campaña, así que 8-16 es la segunda semana y algo. Se pueden listar varios huecos separados por comas.',
    },
    {
      title: 'Escribe tú las fechas',
      body: 'Última configuración. Pon el primer calendario en <strong>Tiempos indicados</strong> y escribe en la caja ocho tiempos tuyos: días desde el inicio de la campaña, en cualquier orden, separados por espacios o comas.\n\nIntenta ganarle al calendario irregular. Ahora conoces el periodo, así que puedes apuntar a las fases que nadie ha mirado; eso es exactamente lo que hace una segunda temporada de observación.\n\nLuego intenta romper el campo: escribe algo que no sea un número, o el mismo tiempo dos veces. La nota te dirá qué no pudo leer y qué fusionó, en vez de observar en silencio sobre una lista más corta que la que escribiste.',
      tip: 'Un calendario es un conjunto de instantes. Dos entradas al mismo tiempo son una sola observación, se escriban como se escriban, y la nota lo dice.',
    },
    {
      title: 'El rango que exploraste',
      body: 'Cada comparación que has ejecutado imprimió el rango en el que se exploraron ambos brazos — algo como <em>0,247 a 24,67 días</em> — y te habría avisado si un mejor ajuste hubiera caído en su borde.',
      prompt:
        '¿Por qué un periodo publicado necesita el rango explorado al lado?',
      options: [
        'Porque un rango más amplio siempre es una búsqueda mejor',
        'Porque el periodo publicado es el mejor ajuste dentro de ese rango, y un periodo verdadero fuera de él vuelve como el extremo más cercano',
        'Porque el rango determina la incertidumbre del periodo',
        'No lo necesita: el mejor ajuste es el mejor ajuste',
      ],
      because:
        'Una búsqueda de periodos devuelve el mejor periodo que se le permitió considerar. Dale un rango que no contenga la respuesta y devolverá el extremo del rango, sin error y sin quejarse, y dos campañas que hayan hecho eso coincidirán perfectamente entre sí. Por eso el panel señala un ajuste que se sienta en su propio borde en vez de imprimirlo como una medida.',
    },
    {
      title: 'Qué tiene que acompañar a un periodo',
      body: 'Vas a enviarle a alguien tu resultado: un periodo, en días, de una de estas campañas.',
      prompt:
        '¿Qué necesita ese número al lado para que el resultado sea comprobable?',
      options: [
        'La estrella y la fecha, que es lo que lleva una cita normal',
        'Los tiempos observados (o su suma de comprobación), la incertidumbre, la semilla de ruido y el rango explorado',
        'La marca y el modelo del instrumento',
        'Nada más: el periodo es una medida de la estrella, no de la campaña',
      ],
      because:
        'Todo lo de la segunda lista puede cambiar el número mientras la estrella sigue siendo exactamente la misma, que es lo que ha estado demostrando toda esta lección. El CSV exportado lleva todo eso: tipo de calendario, suma de comprobación, épocas planificadas, huecos, la incertidumbre declarada y la semilla, en cada fila. Eso es lo que permite a otra persona averiguar si obtuvo una respuesta distinta porque la estrella es distinta o porque miró en otros momentos.',
    },
    {
      title: 'Lo que decidiste antes de mirar',
      body: 'Ocho noches, una estrella, un instrumento, un sorteo de ruido. El planeta estuvo ahí todo el tiempo y la física nunca cambió.\n\nLo que cambió fue la lista de instantes, y decidió el resultado. Un calendario no es la burocracia que rodea a un experimento; en una medida muestreada <em>es</em> el experimento, y sus propiedades — la cobertura de fase, la función ventana — se pueden calcular antes de apuntar ningún telescopio a ninguna parte.\n\nLo que no se puede calcular de antemano es qué calendario tendrá suerte esa noche. Por eso la forma honesta del resultado que has producido hoy no es "el muestreo irregular es mejor", sino "estos tiempos, en esta estrella, con esta semilla, en este rango, dieron este periodo" — con suficiente de la campaña anotado como para que otra persona pueda discrepar en condiciones.',
      tip: 'Todos los números que imprime la comparación, la advertencia incluida, van al archivo exportado y a una entrada del cuaderno guardada desde el espacio de análisis.',
    },
  ],
};
