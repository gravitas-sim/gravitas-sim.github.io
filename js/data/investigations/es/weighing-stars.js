// =============================================================================
// weighing-stars - es
// -----------------------------------------------------------------------------
// A shadow of ../weighing-stars.js carrying only its words. Laid over the English lesson
// by mergeTranslation() in ../i18n.js, so anything absent here keeps its
// English and nothing here can reach the lesson's machinery: no scenario name,
// no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: 'Pesar las estrellas',
  subtitle: 'Usa una órbita para medir algo que no puedes poner en una balanza',
  duration: '35-45 min',
  level: 'Astronomía introductoria',
  summary:
    'Las leyes de Kepler terminan con la corrección de Newton, y para esto sirve esa corrección. Observa dos estrellas girando una alrededor de la otra, encuentra el punto de equilibrio que ambas rodean, y usa nada más que el tamaño y la duración de su órbita para deducir cuánto pesa cada una. Ningún telescopio ha puesto jamás una estrella en una balanza; así es como se hace de verdad.',
  objectives: [
    'Explicar por qué se mueven ambas estrellas de una binaria, en lugar de girar una alrededor de la otra',
    'Decir qué es el baricentro y dónde se sitúa cuando una estrella es más pesada',
    'Usar las distancias de dos estrellas al baricentro para comparar sus masas',
    'Usar el tamaño y el periodo de una órbita para hallar la masa total de un par',
    'Repartir una masa total medida entre dos estrellas',
    'Explicar por qué las estrellas binarias son la manera en que los astrónomos saben cuánto pesan las estrellas',
  ],
  steps: [
    {
      title: 'No puedes poner una estrella en una balanza',
      body: 'Una báscula de baño funciona empujando hacia arriba. Súbete a ella y mide con cuánta fuerza te está tirando la Tierra hacia abajo. No existe ninguna versión de eso para una estrella. Las estrellas son enormes, son inalcanzables, y la más cercana después del Sol está a cuarenta mil años a la velocidad de una nave espacial.\n\nY sin embargo, abre cualquier libro de texto de astronomía y te dirá la masa de decenas de estrellas, con dos decimales. Alguien las midió. ¿Cómo?\n\nLa respuesta es lo último que te mostró la investigación de Kepler. Kepler descubrió que el tamaño y la duración de una órbita van juntos. Newton descubrió que la <em>masa</em> de lo que tira también forma parte de esa relación, y una vez que sabes eso, una órbita se convierte en un instrumento de medida.\n\nEsta lección trata de apuntar ese instrumento a un par de estrellas.',
      tip: 'Aquí no hace falta álgebra. Leerás dos números de una pantalla y harás una división.',
    },
    {
      title: '¿Cómo lo harías tú?',
      body: 'Antes de seguir, piensa qué podría funcionar. Tienes un telescopio. No puedes viajar hasta allí, no puedes tocarla, y no puedes esperar mucho tiempo.',
      prompt: '¿Cómo podría un astrónomo medir la masa de una estrella?',
      options: [
        'Medir cuánto brilla',
        'Medir cuán grande se ve',
        'Observar cómo su gravedad mueve otra cosa',
        'No hay manera de medir la masa de una estrella',
      ],
      because:
        'La gravedad es la única de estas opciones que depende de la masa. El brillo y el tamaño están relacionados con la masa en las estrellas ordinarias, pero solo de manera aproximada, y solo porque alguien midió antes las masas de otra forma. Observar cómo una estrella tira de otra cosa es la medida directa, y todo lo demás se calibra contra ella.',
    },
    {
      title: 'Dos estrellas, una junto a la otra',
      body: 'En pantalla hay dos estrellas de aproximadamente el mismo tamaño, lo bastante cerca como para que la gravedad las mantenga unidas. Los pares así son muy comunes: alrededor de la mitad de todas las estrellas que puedes ver tienen compañera.\n\nDentro de un momento las observarás. Comprométete primero con una respuesta.',
      prompt: 'Cuando pulses reproducir, ¿qué estrella se queda donde está?',
      options: [
        'La Estrella A se queda quieta y la Estrella B gira a su alrededor',
        'La Estrella B se queda quieta y la Estrella A gira a su alrededor',
        'Las dos se quedan quietas',
        'Ninguna se queda quieta',
      ],
      because:
        'Ninguna. Esto engaña a casi todo el mundo la primera vez, porque todos los diagramas del Sistema Solar tienen al Sol clavado en el centro de la página. No lo está: el Sol también se mueve, solo que no mucho. Con dos estrellas de tamaño parecido, ambas se mueven bastante, y se nota.',
    },
    {
      title: 'Obsérvalas',
      body: 'Aquí están, con una estela detrás de cada una para que veas dónde ha estado.\n\nNo midas nada todavía. Solo observa unos segundos y fíjate en lo que hace cada estrella.',
      tool: {
        title: 'Dos estrellas',
        note: 'Dos estrellas de igual masa, separadas cuatro UA. Las estelas muestran dónde ha estado cada una.',
      },
      checklist: [
        'Observa hasta que cada estrella haya dado al menos una vuelta completa',
        'Sigue la Estrella A con la vista durante una vuelta entera',
        'Ahora sigue la Estrella B durante una vuelta entera',
        'Pulsa Ejecutar / Pausar para congelar la imagen y mira las dos estelas',
      ],
      tip: 'Los botones Ejecutar / Pausar y Reiniciar están debajo de la imagen. Pausar suele ser la manera más fácil de mirar algo con detenimiento.',
    },
    {
      title: '¿Qué se movió?',
      body: 'Has observado una vuelta completa. Responde según lo que viste, no según lo que esperabas.',
      prompt: 'En ese sistema…',
      options: [
        'solo se movió la Estrella A',
        'solo se movió la Estrella B',
        'se movieron las dos estrellas, cada una trazando su propio círculo',
        'las estrellas se quedaron quietas y se movió el fondo',
      ],
      because:
        'Se movieron las dos, y cada una trazó su propio círculo. Fíjate en otra cosa de esas dos estelas: las estrellas estaban siempre en lados opuestos. Cuando una estaba a la izquierda, la otra estaba a la derecha. No se persiguen la una a la otra; giran en torno a algo que hay en medio.',
    },
    {
      title: '¿Alrededor de qué giran?',
      body: 'Si ambas estrellas se mueven, y están siempre en lados opuestos la una de la otra, entonces hay un punto entre ellas que ninguna estrella visita nunca y que no se mueve en absoluto.\n\nEse punto tiene nombre. Es el <strong>baricentro</strong>, que no es más que una palabra técnica para el punto de equilibrio de las dos estrellas: el lugar donde el par se equilibraría si pudieras ponerlas en un balancín.\n\nAhora está marcado en la imagen con una cruz. Observa cómo las estrellas giran a su alrededor.',
      tool: {
        title: 'El punto de equilibrio',
        note: 'La cruz es el baricentro: el punto de equilibrio de las dos estrellas. Ninguna estrella llega nunca hasta él, y él no se mueve nunca.',
      },
      tip: 'Todo par en órbita del universo tiene uno de estos, incluidos la Tierra y la Luna. El baricentro Tierra-Luna está dentro de la Tierra, a unos mil seiscientos kilómetros bajo la superficie, y la Tierra gira a su alrededor una vez al mes.',
    },
    {
      title: '¿Dónde se sitúa?',
      body: 'Estas dos estrellas tienen la misma masa. Mira dónde está la cruz, y los dos números de debajo de la imagen.',
      prompt: 'Con dos estrellas iguales, el baricentro se sitúa…',
      options: [
        'justo al lado de la Estrella A',
        'justo al lado de la Estrella B',
        'exactamente a mitad de camino entre ellas',
        'en algún lugar completamente fuera del par',
      ],
      because:
        'Exactamente a mitad de camino. Ambas estrellas están a dos UA de él, que es lo que cabría esperar de un balancín con dos niños del mismo peso: para equilibrarse, se sientan a la misma distancia del centro.',
    },
    {
      title: 'Haz una de ellas más pesada',
      body: 'Ahora la parte interesante. En el paso siguiente podrás cambiar cuánto pesa la Estrella A, y la harás bastante más pesada que la Estrella B.\n\nPiensa en el balancín antes de hacerlo.',
      prompt:
        'Si la Estrella A se vuelve mucho más pesada que la Estrella B, el punto de equilibrio…',
      options: [
        'se moverá hacia la Estrella A, la más pesada',
        'se moverá hacia la Estrella B, la más ligera',
        'se quedará exactamente donde está',
        'desaparecerá: ya no hay punto de equilibrio',
      ],
      because:
        'Se mueve hacia la estrella más pesada. En un balancín, un niño pesado tiene que sentarse más cerca del centro para equilibrar a uno ligero situado más lejos. Dos estrellas hacen exactamente lo mismo, y exactamente por la misma razón.',
    },
    {
      title: 'Pruébalo',
      body: 'Ambos deslizadores de masa están desbloqueados. Empieza con ellos iguales, después sube la masa de la Estrella A y observa la cruz.\n\nVe al extremo: pon la Estrella A en 4 masas solares y la Estrella B en 1. Mira el tamaño de las dos estelas.',
      tool: {
        title: 'Cambia las masas',
        note: 'Arrastra un deslizador de masa y la imagen vuelve a empezar con las masas nuevas. La cruz es el punto de equilibrio.',
      },
      checklist: [
        'Empieza con ambas estrellas a 2 M☉ y observa que la cruz está en el medio',
        'Sube la Estrella A a 3 M☉ y observa cómo se desplaza la cruz',
        'Pon la Estrella A en 4 M☉ y la Estrella B en 1 M☉',
        'Observa qué estrella hace ahora el círculo pequeño y cuál el grande',
        'Pruébalo al revés, con la Estrella B como la pesada',
      ],
      tip: 'La estrella más pesada no se queda quieta. Sigue moviéndose. Solo que se mueve en un círculo mucho menor, y se mueve más despacio, porque tiene menos recorrido que hacer en el mismo tiempo.',
    },
    {
      title: 'La regla',
      body: 'Ya has visto varias combinaciones. Elige la afirmación que coincide con lo que ocurrió de verdad.',
      prompt: 'Comparando una estrella pesada con una ligera en el mismo par…',
      options: [
        'la estrella más pesada hace el círculo mayor',
        'la estrella más pesada se queda más cerca del punto de equilibrio y hace el círculo menor',
        'la masa no cambia nada el tamaño de los círculos',
        'la estrella más pesada deja de moverse por completo',
      ],
      because:
        'La estrella más pesada se queda más cerca del punto de equilibrio. Dicho como un par de flechas es fácil de retener: MÁS MASA → más adentro, círculo menor. MENOS MASA → más afuera, círculo mayor. Ese único hecho te va a permitir comparar las masas de dos estrellas sin conocer ninguna de las dos.',
    },
    {
      title: 'Ponlas en un balancín',
      body: 'Aquí está la misma idea dibujada como un balancín de verdad, con el punto de equilibrio en el medio y las dos estrellas sentadas a lo largo de la viga.\n\nMueve los dos deslizadores de distancia y observa cómo cambian de tamaño las estrellas. Prueba los ajustes predefinidos: cada uno fija un par de distancias y te dice qué significa.',
      checklist: [
        'Pon la Estrella A a 1 UA y la Estrella B a 2 UA',
        'Lee cuántas veces más pesada tiene que ser la Estrella A',
        'Prueba 1 UA y 3 UA',
        'Prueba 2 UA y 4 UA, y fíjate en que obtienes la misma respuesta que con 1 y 2',
      ],
      tip: 'Solo importa el cociente de las dos distancias. 2 UA frente a 4 UA te dice lo mismo que 1 UA frente a 2 UA, porque en ambos casos una estrella está el doble de lejos que la otra.',
    },
    {
      title: 'Leer el balancín',
      body: 'La Estrella A está a <strong>1 UA</strong> del punto de equilibrio. La Estrella B está a <strong>2 UA</strong> del punto de equilibrio.',
      prompt: '¿Qué estrella es más pesada, y por cuánto?',
      options: [
        'La Estrella B, por unas dos veces',
        'La Estrella A, por unas dos veces',
        'La Estrella A, por unas cuatro veces',
        'Pesan lo mismo: la distancia no importa',
      ],
      because:
        'La Estrella A, por unas dos veces. La Estrella B tiene que recorrer el doble de distancia desde el punto de equilibrio, así que la Estrella A debe ser el doble de pesada para mantener bajo el otro extremo. La estrella que se queda más cerca es la más pesada, y el cociente de las distancias es el cociente de las masas, del revés.',
    },
    {
      title: 'Escribirlo',
      body: 'Eso es toda la primera idea, y se puede escribir en una línea. Si prefieres retenerla en palabras, las palabras son:\n\n<strong>la estrella más pesada se queda proporcionalmente más cerca del punto de equilibrio.</strong>\n\nSi prefieres tener la línea, aquí está. Llama a las dos masas M<sub>A</sub> y M<sub>B</sub>, y a sus distancias al punto de equilibrio r<sub>A</sub> y r<sub>B</sub>:\n\n<strong>M<sub>A</sub> × r<sub>A</sub> = M<sub>B</sub> × r<sub>B</sub></strong>\n\nNo tendrás que despejarla. Está aquí para que la línea te resulte familiar si te la encuentras más adelante. Todo lo que necesitas de verdad es el balancín: tres veces más lejos significa un tercio de pesada.',
      tip: 'Por esto funciona un balancín. Un niño pequeño se sienta en el extremo, un adulto grande se sienta cerca del medio, y masa por distancia sale igual en ambos lados.',
    },
    {
      title: 'Una más, para asegurar',
      body: 'Un par distinto. La Estrella A está a <strong>2 UA</strong> del punto de equilibrio, y la Estrella B está a <strong>4 UA</strong>.',
      prompt: '¿Cómo se comparan sus masas?',
      options: [
        'La Estrella A es el doble de pesada que la Estrella B',
        'La Estrella B es el doble de pesada que la Estrella A',
        'La Estrella A es cuatro veces más pesada que la Estrella B',
        'No puedes saberlo sin conocer el periodo',
      ],
      because:
        'La Estrella A es el doble de pesada. Es la misma respuesta que 1 UA frente a 2 UA, porque el cociente es el mismo. Fíjate en lo que esta medida te da y lo que no: te dice cómo se <em>reparte</em> la masa entre las dos estrellas, pero no cuánta hay en total. Eso es lo próximo que hay que encontrar.',
    },
    {
      title: 'Lo que encontró Kepler, y lo que añadió Newton',
      body: 'En la investigación de Kepler mediste las órbitas de los planetas y descubriste que el tamaño de una órbita y el tiempo que tarda van juntos:\n\n<strong>a<sup>3</sup> = P<sup>2</sup></strong>\n\ncon el tamaño orbital a en UA y el periodo P en años. Órbita mayor, año más largo, siempre.\n\nEsa relación funciona de maravilla para los planetas, y lleva dentro un supuesto oculto: todos los planetas del Sistema Solar giran alrededor del mismo Sol. Kepler nunca tuvo que preocuparse por la masa, porque la masa nunca cambiaba.\n\nNewton dedujo qué ocurre cuando sí cambia. Más masa significa gravedad más fuerte, y gravedad más fuerte significa que un objeto es arrastrado más rápido por su órbita. Dos estrellas separadas cuatro UA tardarán tiempos distintos en darse la vuelta la una a la otra según lo pesadas que sean.\n\nEsa es la segunda idea, y es la que convierte una órbita en una balanza.',
    },
    {
      title: '¿Qué par es más rápido?',
      body: 'A continuación verás dos sistemas binarios uno al lado del otro. Las dos estrellas de cada par están exactamente a <strong>4 UA</strong> una de otra, en ambos sistemas.\n\nEl par de la izquierda pesa media masa solar por estrella. El de la derecha pesa dos masas solares por estrella, así que cuatro veces más en total.',
      prompt: 'Saliendo a la vez, ¿qué par completa su órbita primero?',
      options: [
        'el par ligero de la izquierda',
        'el par pesado de la derecha',
        'terminan a la vez: la separación es la misma',
        'ninguno: nunca completan una órbita',
      ],
      because:
        'El par pesado, y por un margen claro. Más masa significa una atracción más fuerte, así que las estrellas son arrastradas más rápido por una órbita del mismo tamaño. Este es exactamente el efecto que Kepler no podía ver, porque él solo tuvo un Sol con el que trabajar.',
    },
    {
      title: 'Hazlos correr juntos',
      body: 'Ambos sistemas empiezan en el mismo momento. El contador de debajo de cada uno dice cuántas vueltas completas ha dado.\n\nDéjalos correr hasta que el par pesado haya dado dos vueltas.',
      checklist: [
        'Arranca ambos y observa hasta que el par de la derecha complete una vuelta',
        'Comprueba hasta dónde ha llegado el par de la izquierda en ese momento',
        'Sigue hasta que el par de la derecha haya dado dos vueltas',
        'Confirma que el par de la izquierda ha dado exactamente una',
      ],
      tip: 'Cuatro veces la masa resulta dar exactamente la mitad del periodo. No necesitas saber por qué sale ese factor concreto; lo único importante es que más masa significa una órbita más rápida.',
    },
    {
      title: 'Por qué gana el par pesado',
      body: 'Las dos órbitas eran del mismo tamaño. Solo las masas eran distintas.',
      prompt: 'El par más pesado completó su órbita antes porque…',
      options: [
        'las estrellas más pesadas están siempre más juntas',
        'más masa significa una atracción más fuerte, así que las estrellas recorren más rápido la misma órbita',
        'las estrellas más pesadas son más brillantes, así que parece que se mueven más rápido',
        'el par más pesado tenía una órbita menor',
      ],
      because:
        'Más masa, atracción más fuerte, vuelta más rápida. Y esta es la razón por la que eso importa tanto: funciona al revés. Si puedes ver cómo de grande es una órbita y cronometrar cuánto tarda, entonces lo único que queda que pueda explicar el tiempo es la masa. La órbita te dice cuánto pesan las estrellas.',
    },
    {
      title: 'La versión de Newton, y para qué sirve',
      body: 'Aquí está la relación que encontró Newton, escrita como la usa un astrónomo:\n\n<strong>masa total = a<sup>3</sup> ÷ P<sup>2</sup></strong>\n\ncon <strong>a</strong> el tamaño de la órbita en UA, <strong>P</strong> el tiempo de una vuelta en años, y la respuesta en masas solares. Eso es todo. Dos medidas dentro, un número fuera:\n\n<strong>mide el tamaño de la órbita → mide el periodo → obtén la masa total.</strong>\n\nUn detalle importa, y es el único sitio donde la gente se equivoca. La <strong>a</strong> de esa fórmula es el tamaño de la órbita de las <em>dos</em> estrellas, no la parte de una sola. Imagina el par con el punto de equilibrio entre ellas:\n\n<strong>Estrella A ── r<sub>A</sub> ── baricentro ── r<sub>B</sub> ── Estrella B</strong>\n\ny <strong>a</strong> es la suma de los dos trozos: r<sub>A</sub> + r<sub>B</sub>, que es simplemente la distancia de una estrella a la otra.\n\nAsí que cuando midas a, mide de estrella a estrella.',
      tip: 'Si por error tomas solo la distancia de una estrella al baricentro, obtendrás una masa varias veces demasiado pequeña. Medir de estrella a estrella lo arregla, y de todos modos es más fácil.',
    },
    {
      title: 'Un ensayo',
      body: 'Prueba la fórmula una vez con números elegidos para ser amables, antes de usarla con algo real.\n\nUn par de estrellas está a <strong>2 UA</strong> y tarda <strong>2 años</strong> en dar la vuelta. Escribe esos dos números. El resto se calcula por ti, línea a línea, para que veas de dónde sale la respuesta.',
      fields: [
        { label: 'Tamaño de la órbita a', unit: 'UA', hint: '2' },
        { label: 'Periodo P', unit: 'años', hint: '2' },
        { label: 'a<sup>3</sup>, es decir a × a × a', unit: '' },
        { label: 'P<sup>2</sup>, es decir P × P', unit: '' },
        { label: 'Masa total, a<sup>3</sup> ÷ P<sup>2</sup>', unit: 'M☉' },
      ],
      tip: 'Los numeritos elevados solo significan «multiplícalo por sí mismo esas veces». a³ es a × a × a. P² es P × P. Si prefieres usar una calculadora, aquí nada lo prohíbe.',
    },
    {
      title: 'El par misterioso',
      body: 'Ahora lo de verdad.\n\nLos siguientes pasos muestran un sistema binario cuyas masas están <strong>ocultas</strong>. Nada en la pantalla te dirá cuánto pesa ninguna de las dos estrellas. Vas a deducirlo de todos modos, usando solo lo que puedas ver hacer a las estrellas, que es exactamente la situación de un astrónomo real.\n\nYa tienes todo lo que necesitas. Ve medida a medida.',
      tip: 'No hay truco ni dificultad oculta. Los números se han elegido para salir limpios, así que si tu respuesta no está cerca de un número entero, revisa la medida antes que la aritmética.',
    },
    {
      title: '¿Qué necesitas medir?',
      body: 'Antes de tocar nada, decide qué estás buscando.',
      prompt:
        'Para hallar la masa total del par, las dos cosas que necesitas son…',
      options: [
        'el brillo de cada estrella y su color',
        'el tamaño de la órbita y el tiempo que tarda en dar la vuelta',
        'la distancia al sistema y su edad',
        'la temperatura de cada estrella y su tamaño',
      ],
      because:
        'Tamaño de la órbita y periodo. Son las dos únicas cosas de la fórmula, y ambas son cosas que puedes ver suceder. Todo lo demás sobre las estrellas, por interesante que sea, es irrelevante aquí.',
    },
    {
      title: 'Medida uno: ¿cómo de grande es la órbita?',
      body: 'La imagen tiene ahora anillos dibujados, uno cada unidad astronómica, centrados en el punto de equilibrio. Son tu regla.\n\nPausa el sistema cuando las dos estrellas estén bien alineadas, y lee lo lejos que está cada estrella del centro. Después recuerda lo que dijo el paso anterior: el tamaño orbital <strong>a</strong> es la distancia de una estrella <em>a la otra</em>, así que suma las dos lecturas.',
      tool: {
        title: 'Mide la órbita',
        note: 'Cada anillo está a una UA del punto de equilibrio. Pausa con el botón Ejecutar / Pausar para leer las posiciones.',
      },
      checklist: [
        'Pausa el sistema con el botón Ejecutar / Pausar',
        'Lee en qué anillo está la Estrella A',
        'Lee en qué anillo está la Estrella B',
        'Súmalos para obtener la distancia de estrella a estrella',
        'Vuelve a ponerlo en marcha y comprueba que tu lectura sigue valiendo una vuelta después',
      ],
      tip: 'La Estrella A está en el anillo de 1 UA y la Estrella B en el de 3 UA, así que las dos estrellas están a 4 UA. Anótalo: a = 4 UA.',
    },
    {
      title: 'Medida dos: ¿cuánto dura una vuelta?',
      body: 'Ahora cronométralo. Hay un cronómetro debajo de la imagen, y un reloj en la esquina que cuenta años simulados.\n\nPulsa <strong>Marcar</strong> cuando la Estrella A esté en un sitio fácil de reconocer. Aparecerá una línea de puntos en esa posición. Después espera, observa a la Estrella A dar la vuelta entera, y pulsa <strong>Parar</strong> en el momento en que vuelva a cruzar la línea.',
      tool: {
        title: 'Cronometra una vuelta',
        note: 'Pulsa Marcar, espera a que la Estrella A vuelva a la línea de puntos, y pulsa Parar. El reloj corre en años simulados.',
      },
      checklist: [
        'Pulsa Marcar y fíjate en la línea de puntos que aparece',
        'Observa a la Estrella A dar la vuelta entera una vez',
        'Pulsa Parar cuando vuelva a cruzar la línea',
        'Lee el cronómetro: debería estar cerca de un número entero de años',
        'Si se te pasó, pulsa Marcar otra vez y vuelve a intentarlo',
      ],
      tip: 'No tiene que ser perfecto. Cualquier valor entre 3,5 y 4,5 años te llevará a la respuesta correcta, porque la respuesta es un número entero.',
    },
    {
      title: 'Pesa el par',
      body: 'Introduce tus dos medidas. La aritmética se hace por ti, línea a línea.\n\nSi tu lectura del cronómetro se desvió un poco, redondéala primero al año entero más próximo: las medidas reales se redondean constantemente, y esta está pensada para redondearse.',
      fields: [
        {
          label: 'Tamaño de la órbita a, de estrella a estrella',
          unit: 'UA',
          hint: 'de los anillos',
        },
        {
          label: 'Periodo P, una vuelta completa',
          unit: 'años',
          hint: 'del cronómetro',
        },
        { label: 'a<sup>3</sup>', unit: '' },
        { label: 'P<sup>2</sup>', unit: '' },
        { label: 'Masa total del par', unit: 'M☉' },
      ],
      tip: 'Si mediste a = 4 y P = 4, entonces a³ = 4 × 4 × 4 = 64 y P² = 4 × 4 = 16.',
    },
    {
      title: 'Detente y mira lo que acabas de hacer',
      body: 'Tienes la masa combinada de dos estrellas a las que nadie se ha acercado jamás, y la obtuviste de dos cosas que podías ver: lo separadas que están y cuánto tardan en dar la vuelta.\n\nEsta no es una versión simplificada de cómo se hace. Es cómo se hace. Las masas de los libros de texto salieron exactamente de este cálculo, aplicado a pares de estrellas que los astrónomos llevan fotografiando pacientemente siglo y medio.\n\nQueda una cosa. Sabes cuánto pesa el par <em>en conjunto</em>. Todavía no sabes cómo se reparte ese peso entre las dos, y para eso necesitas la otra idea de antes en esta lección.',
    },
    {
      title: 'De vuelta al punto de equilibrio',
      body: 'Los anillos están de vuelta. Esta vez léelos al revés: no para sumar las dos distancias, sino para compararlas.\n\n¿Qué estrella se queda más cerca del punto de equilibrio?',
      tool: {
        title: '¿Cuál se queda más cerca?',
        note: 'Los anillos están separados una UA, centrados en el punto de equilibrio.',
      },
      checklist: [
        'Lee la distancia de la Estrella A al punto de equilibrio',
        'Lee la distancia de la Estrella B al punto de equilibrio',
        'Calcula cuántas veces más lejos está la Estrella B',
        'Decide cuál de las dos tiene que ser la estrella más pesada',
      ],
      tip: 'La Estrella A está en el anillo de 1 UA. La Estrella B está en el de 3 UA. La Estrella B recorre tres veces más distancia.',
    },
    {
      title: 'Separarlas',
      body: 'La Estrella A se queda a <strong>1 UA</strong> del punto de equilibrio. La Estrella B se aleja hasta <strong>3 UA</strong>.',
      prompt: 'Entonces, ¿cómo se comparan las dos masas?',
      options: [
        'La Estrella B es tres veces más pesada que la Estrella A',
        'La Estrella A es tres veces más pesada que la Estrella B',
        'Son iguales, ya que orbitan juntas',
        'La Estrella A es nueve veces más pesada que la Estrella B',
      ],
      because:
        'La Estrella A es tres veces más pesada. Es el balancín otra vez: la Estrella B está tres veces más lejos, así que la Estrella A debe ser tres veces más pesada para equilibrarla. Ahora conoces la masa total y el cociente, que es suficiente para fijar ambas estrellas.',
    },
    {
      title: 'Ahora pesa cada una',
      body: 'Tienes cuatro masas solares que repartir, y sabes que el reparto tiene que ser de tres a uno.\n\nEl panel lo muestra como bloques. Pon la Estrella A a 1 UA y la Estrella B a 3 UA y cuéntalos: tres bloques a un lado, uno al otro, cuatro bloques en total. Después escribe las dos masas abajo.',
      tool: {
        title: 'Reparte cuatro masas solares',
        note: 'Cada bloque es una masa solar. El balancín decide cómo se reparten.',
      },
      fields: [
        { label: 'Masa de la Estrella A', unit: 'M☉', hint: 'la más pesada' },
        { label: 'Masa de la Estrella B', unit: 'M☉', hint: 'la más ligera' },
        {
          label: '¿Suman el total que mediste?',
          unit: 'M☉',
        },
      ],
    },
    {
      title: 'La respuesta',
      body: 'Las masas que estuvieron ocultas todo el tiempo:\n\n<strong>Estrella A: 3 masas solares. Estrella B: 1 masa solar.</strong>\n\nSi eso es lo que obtuviste, no lo adivinaste y no te lo dijeron. Mediste una distancia, cronometraste una vuelta, dividiste un número entre otro y comparaste dos distancias a un punto de equilibrio. Ese es todo el método.\n\nY fíjate en lo poco que necesitaste. Ni la distancia al sistema, ni la temperatura de las estrellas, ni sus colores, ni sus edades. Dos estrellas girando una alrededor de la otra entregan sus masas a cualquiera que tenga la paciencia de observar.',
      tip: 'Obtener 3,9 o 4,2 masas solares en lugar de exactamente 4 sería un resultado perfectamente bueno. Las medidas reales de binarias reales llevan incertidumbres de unos pocos por ciento, y siguen siendo las masas estelares más fiables que tenemos.',
    },
    {
      title: 'Alguien hizo esto de verdad',
      body: 'Sirio es la estrella más brillante del cielo nocturno. En 1844 Friedrich Bessel advirtió que no se movía en línea recta por el cielo: se bamboleaba. Concluyó que tenía que haber algo pesado a su lado que nadie podía ver. Dieciocho años después, un fabricante de telescopios que probaba una lente nueva lo encontró.\n\nEl panel muestra lo que los astrónomos han registrado desde entonces: la posición de la compañera tenue respecto a la estrella brillante, una vez cada cinco años. Avanza por las décadas y observa cómo la órbita aparece punto a punto.',
      checklist: [
        'Avanza hasta 1910 y observa lo poco que puede deducirse de tres puntos',
        'Avanza hasta 1925 y observa cómo empieza a formarse una curva',
        'Avanza hasta 1945, una órbita completa, y observa cómo se cierra la forma',
        'Llega hasta el año 2000 y confirma que vuelve a recorrer el mismo camino',
        'Fíjate en que los puntos están más separados en la parte rápida de la órbita',
      ],
      tip: 'Esa órbita dura 50,1 años y mide 19,8 UA de diámetro. Mételos en tu fórmula: 19,8 al cubo es 7762, y 50,1 al cuadrado es 2510. Divide, y el par pesa 3,1 masas solares. El valor aceptado, tras un siglo de trabajo cuidadoso, es 3,06.',
    },
    {
      title: 'Y las estrellas no son lo único que lo hace',
      body: 'Una última idea, porque conecta con algo que quizá ya hayas visto.\n\nNada de esta lección exigía que ambos objetos fueran estrellas. Una estrella con un <em>planeta</em> también gira alrededor de un punto de equilibrio compartido. El planeta es miles de veces más ligero, así que el punto de equilibrio queda casi en el centro de la estrella, y el círculo propio de la estrella es correspondientemente diminuto.\n\nPero no es cero. Júpiter hace que el Sol gire alrededor de un punto justo fuera de su propia superficie, una vez cada doce años. Ese bamboleo es pequeño, y es medible, y medirlo es una de las maneras en que hemos encontrado planetas alrededor de otras estrellas.\n\nLa imagen muestra una estrella con un planeta, y un recuadro ampliado del pequeño círculo propio de la estrella para que puedas verlo siquiera.',
      tool: {
        title: 'Una estrella y un planeta',
        note: 'Una estrella parecida al Sol con un Júpiter al lado. El recuadro de la esquina amplía el movimiento propio de la estrella, que de otro modo es demasiado pequeño para verse.',
      },
      tip: 'Esa es otra investigación. Esta habrá cumplido su función si sabes decir por qué se mueve la estrella.',
    },
    {
      title: 'Uno por tu cuenta',
      body: 'Un par nuevo, que no has visto. Las dos estrellas están a <strong>3 UA</strong> y tardan <strong>3 años</strong> en girar una alrededor de la otra.\n\nCalcula cuánto pesan entre las dos.',
      fields: [
        { label: 'Tamaño de la órbita a', unit: 'UA', hint: '3' },
        { label: 'Periodo P', unit: 'años', hint: '3' },
        { label: 'a<sup>3</sup>', unit: '' },
        { label: 'P<sup>2</sup>', unit: '' },
        { label: 'Masa total', unit: 'M☉' },
      ],
    },
    {
      title: '¿Y cuál es más pesada?',
      body: 'El mismo par. Observándolo, descubres que una estrella se queda cerca del punto de equilibrio mientras la otra se aleja mucho más.',
      prompt: 'La estrella que se queda cerca del punto de equilibrio es…',
      options: [
        'la más ligera de las dos',
        'la más pesada de las dos',
        'siempre exactamente la mitad de la masa total',
        'imposible de comparar sin conocer el periodo',
      ],
      because:
        'La más pesada. Junto con el paso anterior, esas son las dos mitades del método: el tamaño y la duración de la órbita te dan la masa total, y las distancias al punto de equilibrio te dicen cómo repartirla.',
    },
    {
      title: 'Lo que ahora puedes decir',
      body: 'En palabras corrientes, sin memorizar nada:\n\n<strong>Cuando dos estrellas se orbitan mutuamente, ambas se mueven alrededor de un punto de equilibrio compartido. Cómo de grande es su órbita y cuánto tarda nos dicen su masa combinada. Lo lejos que está cada estrella del punto de equilibrio nos dice cómo se reparte esa masa entre ellas.</strong>\n\nPor eso importan tanto las estrellas binarias. Son la única manera directa que tenemos de pesar una estrella, y casi todo lo demás que decimos saber sobre masas estelares descansa en ellas. Cuando un libro de texto dice que el Sol es una estrella corriente, o que una estrella diez veces la masa del Sol se consume en unas decenas de millones de años, los números que hay detrás de esas afirmaciones se calibraron con pares de estrellas medidos exactamente como acabas de hacerlo tú.\n\nAlrededor de la mitad de las estrellas del cielo tienen compañera. Cada una de ellas anuncia calladamente su propia masa a quien observe el tiempo suficiente.',
      tip: 'Bessel encontró Sirio B al advertir un bamboleo, décadas antes de que nadie la viera. Medir lo que no puedes ver observando lo que le hace a algo que sí puedes ver es uno de los trucos más antiguos de esta materia y sigue siendo de los mejores.',
    },
  ],
};
