// =============================================================================
// replicating-51-peg - es
// -----------------------------------------------------------------------------
// A shadow of ../replicating-51-peg.js carrying only its words. Laid over the
// English lesson by mergeTranslation() in ../i18n.js, so anything absent here
// keeps its English and nothing here can reach the lesson's machinery: no
// scenario name, no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
//
// Decimals are written with a comma, as the rest of the Spanish catalog does.
// That is prose only: what a student TYPES is read by js/answerParse.js, which
// records the convention the answer was written under alongside it.
// =============================================================================

export default {
  title: 'La estrella de otra persona',
  subtitle:
    'Cuarenta y tres velocidades reales, y si obtienes la misma respuesta',
  duration: '35-45 min',
  level: 'Astronomía introductoria',
  summary:
    'Cuarenta y tres velocidades reales de 51 Pegasi, medidas en Keck una década después del descubrimiento y reproducidas aquí sin alterar. Ajústalas con el mismo instrumento que usarías con datos simulados. El periodo sale bien con tres partes en cien mil, y tu intervalo de confianza no contendrá el valor publicado. Por qué ambas cosas son ciertas es la lección.',
  objectives: [
    'Ajustar una serie temporal de velocidad radial publicada y recuperar un periodo orbital',
    'Leer un periodograma con una función ventana severa y explicar por qué el pico sigue siendo inequívoco',
    'Calcular una chi-cuadrado reducida e interpretar un valor lejano de 1',
    'Distinguir una incertidumbre interna de la dispersión real de una medida',
    'Ejecutar un Monte Carlo con semilla y decir qué cubre su intervalo y qué no',
    'Decidir si una replicación ha tenido éxito cuando los números coinciden y las barras de error no',
  ],
  steps: [
    {
      title: 'Una afirmación de 1995',
      body: `El seis de octubre de 1995, Michel Mayor y Didier Queloz
             anunciaron que la estrella 51 Pegasi tiene un planeta:
             aproximadamente la mitad de la masa de Júpiter, dando una vuelta
             cada 4,23 días, a una veinteava parte de la distancia de la Tierra
             al Sol.
             \n\nNinguna teoría de formación planetaria lo permitía. Un gigante
             gaseoso tan cerca de su estrella no debería haber podido formarse
             ahí y no tenía ninguna manera conocida de llegar. Se dudó de la
             afirmación, y la duda era razonable: la prueba era un bamboleo de
             unos cincuenta metros por segundo en la luz de una estrella a
             cincuenta años luz.
             \n\nEn unas semanas, otros dos grupos habían apuntado sus propios
             instrumentos hacia ella. Eso es lo que lo zanjó: no la discusión,
             la <strong>replicación</strong>. Estás a punto de hacer lo mismo.`,
      tip: 'Mayor y Queloz compartieron el Premio Nobel de Física de 2019 por esta medida.',
    },
    {
      title: 'De dónde salen estos números',
      body: `Las cuarenta y tres velocidades que vas a ajustar
             <strong>no son las del descubrimiento</strong>. Se tomaron con
             HIRES en el telescopio Keck I, por el sondeo Lick–Carnegie, y las
             publicó Butler et al. (2017), Astronomical Journal 153, 208.
             Abarcan 2.749 días —unos siete años y medio— y se obtuvieron del
             archivo VizieR del Observatorio de Estrasburgo como catálogo
             J/AJ/153/208, con su suma de verificación calculada al entrar, y se
             reproducen aquí sin hacerles nada.
             \n\nQue vengan de otro instrumento, otro equipo y otra década que
             el descubrimiento es justamente la cuestión. Si ajustaras los datos
             del descubrimiento y obtuvieras la respuesta del descubrimiento,
             habrías comprobado una cuenta. Ajustar observaciones independientes
             de otra persona es lo que hace de esto una replicación.
             \n\nUna línea que conviene retener durante el resto de la lección.
             Hay un sistema planetario <strong>simulado</strong> en el lienzo,
             detrás de este panel. Está detenido, es un modelo, y no tiene nada
             que ver con ningún número que vayas a tocar. Todo lo que hay en el
             espacio de trabajo es una <strong>medida</strong> que alguien hizo
             de una estrella real.`,
      tip: 'Cada número del panel arrastra su archivo, su consulta y su suma de verificación a todo lo que exportes.',
    },
    {
      title: 'Comprométete primero',
      body: `Ya sabes cuál es el periodo publicado: está en la primera pantalla
             de esta lección, y es 4,23 días.
             \n\nAsí que predice algo más difícil. Tu ajuste no caerá
             exactamente sobre el valor publicado; dos ajustes de datos
             distintos nunca lo hacen. Comprométete ahora con cuánto esperas
             acercarte; esto queda sin corregir hasta que lo hayas medido de
             verdad.`,
      prompt:
        'Mi periodo de mejor ajuste diferirá de los 4,23077 días publicados en aproximadamente…',
      options: [
        'menos de un segundo: los datos son lo bastante buenos para fijarlo así',
        'unos diez segundos: una parte en cien mil',
        'unos pocos minutos: una parte en mil',
        'una hora o más: esta es una medida difícil',
      ],
      because:
        'Unos once segundos, que son tres partes en cien mil. Es un nivel de acuerdo asombroso para una cantidad que nadie puede medir directamente, y viene de la duración de la serie más que de la calidad de una noche concreta: 2.749 días son 650 órbitas, y un error en el periodo se acumula a lo largo de todas ellas. Un periodo equivocado en un minuto dejaría el ajuste desfasado un cuarto de ciclo al final de la serie, y la chi-cuadrado se daría cuenta.',
    },
    {
      title: 'Míralas antes de ajustarlas',
      body: `El espacio de trabajo se ha abierto sobre las velocidades. Antes de
             tocar un solo control, mira qué te han dado.
             \n\nNo es una costumbre que convenga saltarse. Casi todos los malos
             ajustes en astronomía son ajustes a datos que quien los ajustó
             nunca miró.`,
      checklist: [
        'Encuentra la dispersión vertical: la estrella oscila unos 120 m/s de arriba abajo',
        'Encuentra las barras de error: son de aproximadamente 1 m/s, más pequeñas que los puntos dibujados',
        'Recorre el eje temporal y encuentra los tramos largos vacíos',
        'Encuentra al menos un sitio donde dos puntos se solapan',
      ],
      tip: 'Los puntos que se solapan son exposiciones consecutivas, tomadas con un par de minutos de diferencia. El catálogo las publica por separado y esta lección también.',
    },
    {
      title: 'La forma de la serie',
      body: `Dos números que describen el muestreo, no la estrella. Los dos
             están en la lectura del espacio de trabajo.
             \n\nUna serie de observaciones reales no es una cadencia que alguien
             eligió. Es lo que el tiempo meteorológico, el calendario del
             telescopio y la posición de la estrella en el cielo permitieron, y
             esas tres cosas dejan marcas.`,
      fields: [
        { label: 'Duración total de la serie' },
        { label: 'El mayor hueco que hay en ella' },
      ],
      tip: 'No se hizo nada para crear ese hueco. Es lo que contiene el registro de observaciones.',
    },
    {
      title: '¿Qué hace un hueco así?',
      body: `Estás buscando una señal que se repite cada cuatro días, en un
             registro con un agujero de catorce meses.`,
      prompt:
        'Un hueco largo en una serie temporal hace sobre todo cuál de estas cosas:',
      options: [
        'Poca cosa: los datos a ambos lados siguen siendo buenos',
        'Hace imposible medir periodos cortos',
        'Añade al periodograma picos que son artefactos del muestreo, no de la estrella',
        'Sesga el periodo medido hacia valores más largos',
      ],
      because:
        'Añade artefactos. Un periodograma no es una propiedad de la estrella sola; es la estrella convolucionada con cuándo te tocó mirar. Un espaciado regular en el registro de observaciones —cada noche, cada mes, cada año— coloca picos adicionales a frecuencias separadas de la verdadera por la frecuencia de ese espaciado, y esos alias pueden ser tan altos como el pico real. Esta es la forma más común en que un periodo publicado resulta estar mal. Estás a punto de ver si ha pasado aquí.',
    },
    {
      title: 'Buscar',
      body: `Ejecuta una búsqueda de periodo de <strong>1,5 a 100 días</strong>.
             \n\nEl espacio de trabajo ajusta una kepleriana en cada periodo de
             una rejilla y dibuja la chi-cuadrado que consiguió. La rejilla que
             elige son unas diez muestras a lo ancho del pico más estrecho que
             tu línea de base puede resolver, lo que en una serie de 2.749 días
             son unas dieciocho mil, así que dale un momento.`,
      checklist: [
        'Fija el rango de búsqueda en 1,5 – 100 días y ejecútala',
        'Encuentra el mínimo más profundo',
        'Cuenta cuántos otros mínimos se le acercan',
        'Ajusta los parámetros de prueba al mejor ajuste',
      ],
      tip: 'Cada mínimo es un periodo en el que alguna kepleriana ajusta mejor que las de al lado. La mayoría son el muestreo, no la estrella.',
    },
    {
      title: 'Tu respuesta',
      body: `Anota lo que encontró la búsqueda. Estos dos números son tu
             replicación.`,
      fields: [
        { label: 'Periodo de mejor ajuste' },
        { label: 'Semiamplitud K de mejor ajuste' },
      ],
    },
    {
      title: '¿Cómo de cerca, exactamente?',
      body: `Tu periodo es 4,23090 días si tomaste el mínimo más profundo. El
             valor publicado a partir de estas velocidades es
             <strong>4,23077</strong> días.
             \n\nEsa diferencia es lo bastante pequeña como para que los días
             sean la unidad equivocada.`,
      prompt: 'Tu periodo menos el periodo publicado, en segundos',
      hints: [
        'Resta primero y convierte después. La diferencia es de unos 0,00013 días.',
        'Un día tiene 86.400 segundos.',
      ],
      worked:
        '4,23090 − 4,23077 = 0,00013 d. 0,00013 × 86400 = 11,2 s. Sobre un periodo de 4,23 días eso es un acuerdo relativo de tres partes en cien mil.',
    },
    {
      title: 'Ahora mira cómo de bueno es el ajuste',
      body: `Tienes el periodo correcto. Eso no te dice que el modelo describa
             los datos.
             \n\nEl espacio de trabajo da una <strong>chi-cuadrado
             reducida</strong> para la curva que tienes en los deslizadores: la
             suma de residuos al cuadrado, cada uno dividido entre la
             incertidumbre de su propio punto, promediada sobre los cuarenta y
             tres puntos. Si el modelo es correcto y las barras de error son
             correctas, sale cercana a 1. Anota cuánto vale en realidad, y anota
             al lado la dispersión de los residuos.`,
      fields: [
        { label: 'Chi-cuadrado reducida de tu mejor ajuste' },
        { label: 'RMS de los residuos' },
      ],
      tip: 'Una chi-cuadrado reducida de 6 no es una desviación pequeña respecto a 1. Significa que los residuos al cuadrado son seis veces lo que predicen las barras de error, así que los puntos se apartan de la curva unas dos veces y media su incertidumbre declarada.',
    },
    {
      title: '¿Qué significa un 6?',
      body: `Tu periodo coincide con el publicado con once segundos de
             diferencia, y tu chi-cuadrado reducida es aproximadamente 6. Las
             dos cosas son ciertas a la vez.`,
      prompt: 'La explicación más probable es…',
      options: [
        'El periodo está mal después de todo: un buen ajuste daría 1',
        'Hay demasiados pocos puntos para que la chi-cuadrado signifique algo',
        'Las incertidumbres citadas son menores que la dispersión real de las medidas',
        'Un modelo de un solo planeta es incorrecto y hay un segundo planeta',
      ],
      because:
        'Las barras de error son demasiado pequeñas, o más exactamente, son las barras de error equivocadas. Las incertidumbres publicadas con estas velocidades son errores *internos*: ruido de fotones, la solución en longitud de onda, cómo de bien la reducción fijó el espectro. Son una descripción honesta de lo que hizo el instrumento. No son una descripción de lo que hizo la estrella. 51 Pegasi tiene movimientos convectivos y actividad magnética en su superficie que desplazan sus líneas espectrales unos pocos m/s en escalas de días, y ninguna barra de error de un espectrógrafo sabe de eso. La dispersión extra tiene nombre —jitter estelar— y en esta estrella es de unos 2,5 m/s, que es exactamente la diferencia entre 1,13 y 2,79. Un segundo planeta es una posibilidad real en general y es el instinto correcto; aquí los residuos no llevan estructura periódica y el índice de actividad no los sigue.',
    },
    {
      title: 'La barra de error y el error',
      body: `Esto es lo que resulta genuinamente difícil de aprender con datos
             simulados, y vale la pena ser franco sobre por qué.
             \n\nCuando ajustas una grabación hecha por la propia herramienta de
             sondeo de esta aplicación, el ruido se sacó de un generador con una
             anchura conocida, y esa anchura se escribió en la columna sigma.
             Las barras de error son correctas <em>por construcción</em>.
             Ajústalo y tu chi-cuadrado reducida sale cercana a 1, siempre,
             porque lo que produjo la dispersión y lo que informó de la
             dispersión eran la misma línea de código.
             \n\nUna medida real no tiene esa garantía. Quienes publicaron estas
             velocidades calcularon la mejor incertidumbre que pudieron a partir
             del instrumento, y la estrella añadió después algo que no tenían
             forma de poner en la columna. Nadie hizo nada mal. El número de la
             columna sigma simplemente no es el número que necesitas.
             \n\nTodo lo que queda de esta lección se deriva de ahí.`,
      tip: 'Una chi-cuadrado reducida es el instrumento más barato que tienes para detectar que tus barras de error te están mintiendo.',
    },
    {
      title: '¿Cómo de bien conoces el periodo?',
      body: `Un número de mejor ajuste sin un intervalo no es una medida.
             \n\nEl espacio de trabajo estimará uno. Genera un conjunto de datos
             sintético en tus propias épocas de observación a partir de tu
             propio mejor ajuste, dispersado según las incertidumbres citadas,
             lo reajusta desde cero por la misma rejilla de chi-cuadrado, y hace
             eso cuatrocientas veces. La dispersión de las cuatrocientas
             respuestas es el intervalo.
             \n\nUsa la semilla <strong>51peg</strong> y 400 pruebas. La semilla
             se guarda con el resultado: un intervalo que nadie puede reproducir
             no es una prueba.`,
      checklist: [
        'Estrecha los límites de búsqueda a aproximadamente 4,1 – 4,4 días',
        'Pon la semilla en 51peg y las pruebas en 400',
        'Ejecútalo y espera a que termine',
        'Pulsa «Guardar en el cuaderno», escribe una afirmación y pulsa «Quedármelo»',
      ],
      tip: 'Cada prueba pasa exactamente por el mismo código de ajuste por el que pasó tu propio ajuste. Es deliberado: un intervalo calculado por una segunda implementación sería un intervalo sobre un ajuste que nadie ejecutó.',
    },
    {
      title: 'Tu intervalo',
      body: `Abre tu entrada del cuaderno. El panel redondea el periodo a
             cuatro decimales, y este intervalo es más estrecho que eso: en
             pantalla los dos extremos ponen 4,2309, lo que ya te dice algo por
             sí solo. El cuaderno guarda la precisión completa, y anota la
             semilla al lado, así que el número de abajo es uno que otra persona
             podría reproducir.
             \n\nBusca la fila <strong>Periodo, con intervalo de Monte
             Carlo</strong>. Está escrita como un valor más menos una
             semianchura. Anota esa semianchura, y después anota a qué distancia
             queda el periodo publicado del tuyo, las dos cosas en unidades de
             10<sup>-5</sup> días, que es en lo que esta medida está realmente
             expresada.`,
      fields: [
        { label: 'El ± de tu periodo', hint: 'p. ej. 1,55' },
        {
          label: 'Tu periodo menos los 4,23077 d publicados',
          hint: 'p. ej. 13',
        },
        { label: 'El segundo dividido entre el primero' },
      ],
    },
    {
      title: 'El valor publicado queda fuera de tu intervalo',
      body: `Tu mejor ajuste coincide con el periodo publicado con once segundos
             de diferencia. Tu intervalo sobre ese periodo mide un segundo y
             pico, así que el valor publicado queda a unas <strong>ocho</strong>
             barras de error tuyas de tu respuesta.
             \n\nLas dos medidas se hicieron con cuidado. Una de ellas está
             siendo demasiado confiada.`,
      prompt: '¿Cuál es la mejor explicación de lo que ha ido mal?',
      options: [
        'El periodo publicado está mal; tu ajuste usó los mismos datos y es más cuidadoso',
        'Tu intervalo es demasiado estrecho, porque se generó con barras de error que subestiman la dispersión',
        'El Monte Carlo necesita más pruebas: 400 no bastan para encontrar las colas',
        'No pasa nada: se permite que los intervalos fallen alrededor de un tercio de las veces',
      ],
      because:
        'Tu intervalo es demasiado estrecho, y ya mediste por qué. El Monte Carlo dispersa cada punto sintético según su sigma citada, unos 1,13 m/s. Los puntos reales se apartan de la curva 2,79 m/s. Así que cada conjunto sintético es unas dos veces y media más limpio que el real, cada reajuste queda correspondientemente mejor determinado, y la dispersión de esos reajustes subestima la que obtendrías de verdad. Más pruebas no ayudarían: cuatrocientas son de sobra para medir la anchura de una distribución, y la distribución misma es lo que está mal. La última opción merece tomarse en serio —un intervalo del 68 % debería fallar alrededor de un tercio de las veces— pero el fallo aquí mide varias anchuras de intervalo, que es una queja distinta de la mala suerte.',
    },
    {
      title: 'Qué hace un artículo con esto',
      body: `El remedio habitual es añadir un término de <strong>jitter</strong>:
             una varianza extra única, la misma para todos los puntos, ajustada
             junto con la órbita y elegida para que la chi-cuadrado reducida
             salga 1. En estos datos ese término sería de unos 2,5 m/s, y el
             intervalo que produce sería unas dos veces y media más ancho que el
             tuyo, conteniendo cómodamente el valor publicado.
             \n\nEste espacio de trabajo no hace eso, y la negativa es
             deliberada. Ajustar un término de jitter significa afirmar que la
             dispersión sobrante es blanca, no correlacionada y del mismo tamaño
             durante toda la serie: tres afirmaciones sobre una estrella,
             presentadas como un parámetro molesto. A veces son ciertas. Cuando
             no lo son, el término absorbe una señal real y te devuelve una
             chi-cuadrado ordenada con un segundo planeta enterrado dentro.
             \n\nAsí que lo honesto para un instrumento que no puede comprobar
             esas afirmaciones es dar el intervalo que realmente puede
             justificar, dar la chi-cuadrado reducida al lado, y dejarte ver que
             las dos no concuerdan. Acabas de hacer la lectura que esa
             discrepancia exige.`,
      tip: 'Un intervalo citado sin su chi-cuadrado reducida es un intervalo que no puedes evaluar.',
    },
    {
      title: 'Entonces, ¿lo has replicado?',
      body: `Recuperaste un periodo que coincide con el publicado con tres
             partes en cien mil, y una amplitud que coincide en torno a un uno
             por ciento. Tu intervalo formal excluye el periodo publicado.
             \n\nAquí no hay una única respuesta correcta y el corrector no
             marcará ninguna. Escribe lo que dirías de verdad.`,
      prompt:
        'En tres o cuatro frases: ¿esto ha replicado la medida publicada? Di qué coincidió, qué no, y a cuál de las dos cosas darías más peso.',
      tip: 'Una buena respuesta distingue «las medidas coinciden» de «las incertidumbres son fiables». Son afirmaciones distintas y esta serie las resuelve de forma diferente.',
      rubric:
        'No hay un único veredicto correcto y las mejores respuestas discrepan entre sí. Da crédito a cualquier respuesta que (a) exprese el acuerdo cuantitativamente —el periodo con unas tres partes en cien mil, la amplitud con un uno por ciento aproximadamente—, (b) señale por separado que el intervalo formal excluye el valor publicado, y (c) dé una razón para dar más peso a uno que al otro. Un estudiante que diga «sí, replicado» porque dos instrumentos independientes coinciden en la cantidad física ha argumentado bien. También lo ha hecho quien diga «no con la precisión que cité» porque un intervalo que excluye un valor conocido y correcto es un intervalo que no puede defender. Lo que NO debería recibir la puntuación completa es una respuesta que informe de solo uno de los dos hechos, o que resuelva la tensión afirmando que el valor publicado está mal: la lección ya ha mostrado de dónde viene la discrepancia, y no es de ahí.',
    },
    {
      title: 'Lo que acabas de hacer',
      body: `Ajustaste una serie temporal publicada con el mismo instrumento que
             esta aplicación usa con sus propias grabaciones simuladas, y
             obtuviste la respuesta publicada. Merece la pena decirlo sin
             rodeos, porque no es una conclusión inevitable y buena parte del
             análisis publicado no sobrevive a esa prueba.
             

También encontraste el límite de lo que el ajuste podía
             decirte, y lo encontraste desde dentro del ajuste en vez de que te
             lo contaran. La chi-cuadrado reducida era el instrumento entero: un
             número, calculado con cantidades que ya tenías, que decía que las
             barras de error no estaban describiendo los datos. Todo lo demás se
             siguió de ahí.
             

La costumbre es la parte transferible. Siempre que te den una
             incertidumbre, la pregunta no es si la aritmética que la produjo
             era correcta —normalmente lo era— sino si las entradas que propagó
             eran las reales. Con datos simulados siempre lo son. En una
             estrella real son lo que alguien pudo medir, y la estrella no tiene
             ninguna obligación de estar de acuerdo.`,
      tip: 'Las velocidades, el archivo del que salieron y la semilla que usaste están todos en tu cuaderno. Un intervalo que nadie puede reproducir no es una prueba, y el tuyo sí es reproducible.',
    },
  ],
};
