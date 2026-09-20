// =============================================================================
// Doce noches - Spanish
// -----------------------------------------------------------------------------
// A shadow of ../twelve-nights.js carrying only its words. Laid over the
// English lesson by mergeTranslation() in ../i18n.js, so anything absent here
// keeps its English and nothing here can reach the lesson's machinery: no
// scenario name, no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English.
// =============================================================================

export default {
  series: 'Detección de exoplanetas',
  title: 'Doce noches',
  subtitle:
    'Tú eliges cuándo mirar, y la mayor parte de la elección ya está hecha',
  duration: '40-50 min',
  level: 'Astronomía introductoria',
  summary:
    'Un comité te concede doce noches sobre una estrella desde un telescopio en Chile. La estrella está por encima del límite de masa de aire cinco horas cada noche y la ventana se abre cuatro minutos antes cada vez, así que tus doce medidas caen sobre un peine cuyo espaciado no elegiste. Planifica la campaña en el planificador de observación, mira la ventana espectral antes de tener una sola velocidad, y luego lleva dos planes al espectrógrafo en vivo y descubre que uno de ellos devuelve un planeta con el periodo equivocado. Termina averiguando qué lo arreglaría de verdad, y por qué más noches no lo harían.',
  objectives: [
    'Calcular cuándo un objetivo es observable desde un sitio dado, y decir cuál de las tres restricciones manda',
    'Explicar por qué una ventana de observación se abre cuatro minutos antes cada noche',
    'Leer una ventana espectral y decir qué significa un pico cercano a uno para el calendario que lo produjo',
    'Predecir los alias de un periodo bajo un peine de una vez por noche, y reconocerlos en un resultado',
    'Mostrar que dónde cae una época dentro de su ventana cambia la respuesta más que cuántas noches abarca la campaña',
    'Enunciar qué eliminaría un alias de un día, y por qué una campaña más larga desde el mismo sitio no lo haría',
  ],
  steps: [
    {
      title: 'Doce noches',
      body: 'Un comité de asignación de tiempo te ha dado <strong>doce noches</strong> sobre una estrella: HD&nbsp;209458, desde <strong>La&nbsp;Silla</strong>, en Chile, repartidas como quieras a lo largo de una campaña de veinte noches en septiembre. Una medida por noche, de 8&nbsp;m/s cada una. Puedes elegir las noches y puedes elegir la hora.\n\nHay una trampa, y no es pequeña. HD&nbsp;209458 está a declinación <strong>+18,9&deg;</strong> y La&nbsp;Silla a latitud <strong>&minus;29,3&deg;</strong>. El objetivo nunca sube más de <strong>41,9&deg;</strong> sobre el horizonte, así que nunca se ve a través de menos de una atmósfera y media, y solo está por encima del límite habitual de <strong>masa de aire&nbsp;2</strong> durante parte de cada noche.\n\nConviene dejar clara una cosa antes de empezar, porque el resto de la lección depende de ella. <strong>Aquí el cielo es real y la estrella no.</strong> Las ventanas de observación se calculan para el sitio real, el objetivo real y fechas reales de septiembre de 2026, contra efemérides publicadas. Las velocidades que vas a recoger salen de la simulación en pantalla. Lo único que cruza de un lado al otro es la lista de tiempos, que es exactamente lo que cruza entre una herramienta de planificación y un telescopio.',
      tip: 'Gravitas no modela la rotación de la Tierra. js/observingWindow.js la calcula aparte, con la misma trigonometría esférica que usa un observatorio, y entrega el calendario como una lista de números.',
    },
    {
      title: 'Lo que de verdad te dan',
      body: 'Abre el planificador. Cada fila es una noche de la asignación. La barra tenue es la <strong>noche astronómica</strong>: el Sol a más de 18&deg; bajo el horizonte. La parte brillante es cuando el objetivo está <em>además</em> por encima del límite de masa de aire. Esa parte brillante es todo tu presupuesto para esa noche.\n\nMira la página entera antes de tocar nada. Las barras brillantes no están apiladas en vertical: se inclinan.',
      checklist: [
        'Encuentra la ventana brillante de la noche 1, y encuéntrala otra vez en la noche 20',
        'Calcula aproximadamente cuánto antes se abre la ventana cada noche',
        'Lleva el límite de masa de aire de 2 a 3 y mira cómo se ensanchan las ventanas',
        'Llévalo a 1,5 y mira cómo casi se cierran',
        'Devuélvelo a 2',
      ],
      tip: 'La ventana la fija el ángulo horario del objetivo, y el ángulo horario lo llevan las estrellas, no el Sol. Esa es toda la razón de que se incline.',
    },
    {
      title: 'Mide el presupuesto',
      body: 'Lee dos números del planificador con el límite de masa de aire en <strong>2</strong>. Los dos están en la lectura bajo la figura.',
      fields: [
        { label: 'Ventana utilizable por noche' },
        { label: 'Cuánto antes se abre la ventana cada noche' },
      ],
      tip: 'Cuatro minutos al día es la diferencia entre el día solar y el día sideral. A lo largo de las veinte noches de la campaña la ventana se desplaza cerca de una hora y cuarto.',
    },
    {
      title: 'Antes de planificar nada',
      body: 'Tienes doce medidas que colocar. Todas tienen que caer dentro de una ventana de cinco horas, y hay exactamente una ventana así por noche.\n\nLa <strong>ventana espectral</strong> de un calendario se calcula <em>solo</em> a partir de los tiempos de observación: no entra ninguna velocidad. Un pico de 1 en alguna frecuencia significa que el calendario no puede distinguir una señal a esa frecuencia de la ausencia de señal: dos estrellas completamente distintas producirían los mismos doce números.\n\nComprométete antes de mirar el panel inferior del planificador.',
      prompt:
        'Elijas los doce tiempos que elijas, la ventana espectral tendrá un pico grande aproximadamente en…',
      options: [
        'ninguna frecuencia concreta: los tiempos los eliges tú, así que la ventana es la que tú hagas',
        'un ciclo por día, porque hay una ventana por noche y todo lo que reserves cae dentro de una',
        'un ciclo por veinte días, la duración de la campaña',
        'la frecuencia del propio planeta, porque es lo que el calendario sirve para encontrar',
      ],
      because:
        'Una visita por noche significa que los tiempos son un peine con un espaciado de aproximadamente un día, y un peine tiene un peine por ventana espectral: un pico en cada múltiplo de un ciclo al día. Puedes mover cada época unas horas dentro de su ventana y puedes saltarte noches, pero no puedes poner una medida a media tarde. El pico es una propiedad de dónde está el telescopio y hacia dónde apunta, no de lo cuidadoso que seas.',
    },
    {
      title: 'Tres planes',
      body: 'Ahora el panel inferior. Es la ventana espectral de las doce épocas que el planificador ha colocado, hasta dos ciclos por día, con la frecuencia del día sideral marcada.\n\nPrueba los tres ajustes predefinidos en orden y mira el número etiquetado <strong>potencia de la ventana en el día sideral</strong>. Después coge el deslizador <em>Usar esta fracción de cada ventana</em> y muévelo despacio de 0 a 1 con el reparto en 20 noches.',
      checklist: [
        'Doce noches seguidas, el mejor momento: lee la potencia de la ventana',
        'Repartidas en veinte noches, el mejor momento: léela otra vez',
        'Repartidas, ambos extremos de cada ventana: léela una tercera vez',
        'Barre el deslizador de uso de la ventana de 0 a 1 y mira caer el pico',
        'Comprueba en qué frecuencia está el pico más alto: no es 1,000',
      ],
      tip: 'Repartir las mismas doce noches en veinte en vez de en doce cambia la línea de base y por tanto la resolución. Apenas toca el pico en un ciclo al día, que es otro problema distinto.',
    },
    {
      title: 'Dos planes, dos ventanas',
      body: 'Anota la potencia de la ventana en el día sideral para dos de los ajustes predefinidos. Los dos usan las mismas doce noches repartidas en veinte; se diferencian solo en <em>en qué punto de la ventana de cada noche</em> se toma la medida.',
      fields: [
        { label: 'Repartidas, el mejor momento (uso de ventana 0)' },
        { label: 'Repartidas, ambos extremos (uso de ventana 1)' },
      ],
    },
    {
      title: 'Por qué 1,00274 y no 1',
      body: 'El pico más alto no está en 1,000 ciclos al día. Está en <strong>1,00274</strong>, que es un ciclo por <strong>0,99727 días</strong>: 23 horas, 56 minutos y 4 segundos.',
      prompt:
        'Ese número es el día sideral. ¿Por qué el peine está espaciado por él?',
      options: [
        'Por redondeo: el planificador muestrea la ventana en una rejilla y el pico cae ligeramente desplazado',
        'Porque la ventana la fija el ángulo horario del objetivo, que llevan las estrellas; la Tierra devuelve el objetivo al mismo sitio en 23h56m, no en 24h',
        'Porque el periodo orbital del planeta no es un número entero de días',
        'Porque el Sol se mueve, así que el crepúsculo astronómico llega cuatro minutos más tarde cada noche',
      ],
      because:
        'La ventana se abre cuando el objetivo alcanza el límite de masa de aire, y eso es una afirmación sobre dónde está el objetivo, no sobre dónde está el Sol. La Tierra tarda 23h56m04s en devolver una estrella al mismo ángulo horario y 24h en devolver al Sol, y los cuatro minutos de diferencia son el desplazamiento que mediste en el paso 3.\n\nMerece la pena fijarse en esto en vez de archivarlo: el peine de tu calendario lleva grabado el periodo de rotación de la Tierra respecto a las estrellas fijas. No vino de tus costumbres. Vino del cielo.',
    },
    {
      title: 'Antes de observar',
      body: 'El planeta es HD&nbsp;209458&nbsp;b, y su periodo es de <strong>3,5247 días</strong>. Se te dice porque el objetivo de esta lección está en otra parte.\n\nUn peine a 1,00274 ciclos al día pone un alias de ese planeta en cada frecuencia <em>f</em>&nbsp;&plusmn;&nbsp;<em>n</em>&nbsp;&times;&nbsp;1,00274. Calculando los dos más cercanos: <strong>1,391 d</strong> y <strong>0,777 d</strong>.\n\nEstás a punto de ejecutar los dos planes en el espectrógrafo en vivo, con la misma estrella, los mismos errores de 8 m/s y la misma semilla de ruido. Solo cambian los doce tiempos.',
      prompt: '¿Qué van a devolver las dos campañas?',
      options: [
        'Las dos devuelven 3,5247 días: el planeta es real y doce medidas sobran',
        'El plan del mejor momento devuelve un alias — 0,78 o 1,39 días — y el plan de los dos extremos suele devolver unos 3,52',
        'Las dos devuelven un alias, porque el peine está ahí en cualquiera de los dos planes',
        'Ninguna devuelve nada: doce puntos no pueden acotar un periodo en absoluto',
      ],
      because:
        'Una potencia de ventana de casi exactamente 1 significa que el alias ajusta los datos igual de bien que la verdad, así que cuál de los dos sale más bajo lo decide el ruido y no el planeta. En 0,7 la verdad suele ganar. Fíjate en el «suele»: el pico es más pequeño, no ha desaparecido, y esta es una lección sobre mejorar tus probabilidades, no sobre eliminar un problema.',
    },
    {
      title: 'Confirma el calendario',
      body: 'Abre <strong>Velocidad Radial</strong> en la lista de Herramientas y marca <strong>Campaña de observación sintética</strong>. Pon <strong>Incertidumbre 8 m/s</strong>, <strong>Semilla de ruido twelve-1</strong> y <strong>Calendario: Tiempos explícitos</strong>.\n\nAhora vuelve al planificador, ponlo en <em>Repartidas, el mejor momento</em>, y copia la lista de épocas de la última fila de la lectura al campo <strong>Lista de épocas</strong> del calendario. Déjalo correr y apunta el mejor periodo.\n\nDespués cambia el planificador a <em>Repartidas, ambos extremos</em>, copia la nueva lista en el mismo campo y ejecútalo otra vez. Deja todo lo demás exactamente como estaba.\n\nEl ruido va indexado por el <em>número</em> de época, así que la primera medida de la segunda campaña recibe el mismo sorteo que la primera medida de la primera. Las dos campañas se diferencian en los doce tiempos y en nada más.',
      tip: 'Dos campañas en vez del modo Comparar del panel: la comparación comparte una única lista de épocas entre los dos brazos, así que no puede poner dos calendarios explícitos distintos uno al lado del otro. Ejecutarlos en secuencia con la misma semilla es la versión controlada de lo mismo.',
    },
    {
      title: 'Lo que devolvieron los dos planes',
      body: 'Anota el mejor periodo de cada campaña. Tus números no coincidirán con los de nadie dígito a dígito — una velocidad de simulación distinta hace caer los fotogramas en otro sitio — pero deberían contar la misma historia.',
      fields: [
        { label: 'Mejor momento: mejor periodo' },
        { label: 'Ambos extremos: mejor periodo' },
      ],
    },
    {
      title: 'Pídele más noches al comité',
      body: 'La respuesta obvia a un resultado dudoso es pedir más tiempo. Supón que el comité vuelve con <strong>sesenta noches</strong> en doce semanas en vez de doce noches en tres, sobre la misma estrella y desde el mismo telescopio.\n\nLa tabla de abajo está medida, no supuesta: dieciséis sorteos de ruido por fila, el mismo planeta y los mismos 8 m/s cada vez.\n\n<strong>12 épocas, centro de la ventana:</strong> potencia de ventana 1,000, recuperado 1/16.\n<strong>60 épocas, centro de la ventana:</strong> potencia de ventana 0,971, recuperado 13/16.\n<strong>12 épocas, ambos extremos:</strong> potencia de ventana 0,696, recuperado 13/16.\n<strong>60 épocas, ambos extremos:</strong> potencia de ventana 0,810, recuperado 16/16.',
      prompt:
        '¿Qué dicen las cuatro filas sobre lo que compraron las nueve semanas de más?',
      options: [
        'Sesenta noches es decisivamente mejor: más datos son más datos',
        'Casi nada que la colocación no comprara ya: doce épocas bien colocadas igualan a sesenta mal colocadas, y el pico sideral no baja de 0,7 en ninguna fila',
        'Nada en absoluto: el número de épocas no influye en nada',
        'Las noches de más perjudican, porque la potencia de la ventana subió',
      ],
      because:
        'Doce épocas que usan todo el ancho de la ventana rinden tanto como sesenta tomadas en el mejor momento de cada noche: 13 de 16 en ambos casos. La decisión que importaba se tomó en una tarde, y trataba de en qué punto de una ventana de cinco horas apuntar el telescopio.\n\nY mira la potencia de la ventana en esa columna: 1,000, 0,971, 0,696, 0,810. Nunca baja de 0,7, hagas lo que hagas. Más noches desde un solo sitio añaden épocas al mismo peine; no pueden quitar el peine. Eso no es una afirmación sobre esta estrella ni sobre este telescopio. Es aritmética sobre una sola longitud.',
    },
    {
      title: 'Entonces, ¿qué lo arreglaría?',
      body: 'Tienes un calendario con un pico en 1,00274 ciclos al día que no consigues bajar de 0,7, y un periodo que podría ser de 3,52 días o podría ser de 0,78.',
      prompt:
        'En dos o tres frases: ¿qué cambio en el programa de observación eliminaría de verdad el alias de un día, y por qué funciona cuando más noches no lo hacen?',
      tip: 'Por esto los programas de seguimiento de velocidad radial y de tránsitos se organizan como redes en longitud y no como un solo sitio con más tiempo.',
    },
    {
      title: 'Lo que decidió el cielo',
      body: 'Doce noches, una estrella, un instrumento, un sorteo de ruido. Elegiste las noches y elegiste las horas, y buena parte del calendario estaba escrito antes de que llegaras.\n\nEl objetivo está arriba una quinta parte del día. La ventana camina cuatro minutos por noche porque la Tierra gira contra las estrellas y no contra el Sol. Esos dos hechos ponen un pico en tu ventana espectral en 1,00274 ciclos al día, y ese pico puso un alias de un planeta de 3,5247 días en 0,777 días, que es el número con el que volvió una de tus campañas.\n\nLo que sí podías decidir era en qué punto de esas cinco horas mirar, y resultó ser la mayor decisión disponible: suficiente para llevar la tasa de recuperación de 1 de cada 16 a 13 de cada 16 con exactamente las mismas doce noches. Lo que no podías decidir era si tener el peine o no. Para eso hace falta una segunda longitud.\n\nLa forma honesta de un periodo salido de una campaña así no es «el planeta tiene un periodo de 3,52 días». Es «estos doce tiempos, desde este sitio, sobre esta estrella, con esta semilla, en este rango de búsqueda, dieron 3,52 días, y el calendario tiene un pico de ventana de 0,7 en la frecuencia sideral», porque quien conozca esa última cláusula sabe qué otras respuestas estaban casi igual de bien.',
      tip: 'La lista de épocas, la semilla, la incertidumbre y el rango de búsqueda viajan todos en el CSV exportado y en una entrada de cuaderno guardada desde el espacio de trabajo. El pico de la ventana tienes que citarlo tú.',
    },
  ],
};
