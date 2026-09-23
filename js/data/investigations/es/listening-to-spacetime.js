// =============================================================================
// listening-to-spacetime - es
// -----------------------------------------------------------------------------
// A shadow of ../listening-to-spacetime.js carrying only its words. Laid over
// the English lesson by mergeTranslation() in ../i18n.js, so anything absent
// here keeps its English and nothing here can reach the lesson's machinery: no
// scenario name, no seed, no widget id, no numeric answer, no probe, no view
// or preset key.
//
// Arrays line up by index with the English. `null` means "not translated";
// that entry keeps its English.
// =============================================================================

export default {
  title: 'Escuchar el espacio-tiempo',
  series: 'Ondas gravitacionales',
  subtitle: 'Averigua qué produjo una señal y compárala luego con la cosa real',
  duration: '75-90 min',
  level: 'Astronomía introductoria',
  summary:
    'Llega un patrón sin etiqueta: una oscilación que se vuelve más rápida y más fuerte y luego se detiene. Averiguas qué podría producirla, mides las dos relaciones que la delatan, descubres qué preguntas puede responder el modelo y cuáles no, comparas tu respuesta con lo que registraron dos detectores en septiembre de 2015, y luego mides tú mismo cinco fusiones más del archivo abierto. Puedes hacerlo todo con el sonido apagado.',
  objectives: [
    'Leer una gráfica de deformación frente al tiempo y otra de frecuencia frente al tiempo de la misma señal',
    'Explicar por qué la frecuencia de la onda es el doble de la frecuencia orbital',
    'Decir qué es un chirrido y qué hace que suba',
    'Diseñar y ejecutar una comparación en la que cambie exactamente una cosa',
    'Explicar por qué la amplitud por sí sola no dice a qué distancia está una fuente',
    'Decir dónde deja de ser fiable un modelo de espiral a orden principal, y por qué',
    'Distinguir una medida, un modelo y una ilustración en la misma imagen',
    'Explicar por qué una señal que parece y suena como un chirrido todavía no es una detección',
    'Decir qué números sobre un evento real se midieron a partir de su deformación y cuáles aportó un catálogo',
  ],
  steps: [
    {
      title: 'Ha llegado algo',
      body: 'En el panel hay una señal. La ha generado un modelo en tu máquina, ahora mismo, y nadie te ha dicho de qué es ese modelo. Esto importa y se dice aquí y no al final: no es la grabación de un suceso astronómico, y ninguna conclusión a la que llegues en esta lección es prueba de que ocurriera nada en ninguna parte. Para lo que sirve es para lo mismo que sirve un patrón de laboratorio: para averiguar de qué tendría que venir una señal con esa forma.\n\nLa gráfica de arriba es la intensidad de esa señal frente al tiempo, y la de abajo su frecuencia. Pulsa <strong>Reproducir / pausar</strong> y observa el marcador cruzar las dos. Si tienes el sonido encendido, pulsa también <strong>Escuchar</strong>; si no, no te perderás nada: todo lo que pide esta lección puede leerse en las gráficas.\n\nEl patrón se acelera. Se hace más intenso. Luego se detiene.\n\nAntes de que te digan nada, comprométete con una respuesta. No se espera que aciertes.',
      prompt:
        'Algo cuya señal se vuelve más rápida y más intensa y luego se detiene es, con mayor probabilidad…',
      options: [
        'un solo objeto girando cada vez más deprisa hasta romperse',
        'dos objetos girando uno alrededor del otro, acercándose y dando vueltas más rápido',
        'una explosión, que es más intensa en el instante en que ocurre',
        'una estrella que late hacia dentro y hacia fuera, más deprisa según se calienta',
      ],
      because:
        'Dos objetos girando uno alrededor del otro. Nada más de esa lista produce una frecuencia que sube suavemente en un factor de tres y luego se detiene: una explosión no tiene motivo alguno para tener una frecuencia creciente, y una estrella que gira o late no tiene nada que la haga acelerarse en una fracción de segundo. Un par de objetos que pierde energía sí lo tiene, porque perder energía significa caer más cerca, y estar más cerca significa dar vueltas más rápido. De eso trata el resto de la lección. Si elegiste otra cosa, guarda el motivo que tenías: al final se te preguntará si sigue en pie.',
      tool: {
        note: 'Una señal generada por un modelo, calculada aquí y ahora. La gráfica superior es su intensidad y la inferior su frecuencia. Aquí todavía no se dice de qué es el modelo.',
      },
      tip: 'El deslizador «Posición en la señal» es un cabezal de reproducción: arrástralo para moverte por la señal, o pulsa Reproducir / pausar para dejarlo correr.',
    },
    {
      title: 'Tres cosas distintas, todas con el mismo nombre',
      body: 'Aquí está la fuente. Dos objetos compactos, girando uno alrededor del otro, acercándose.\n\nAhora hay tres imágenes en tu pantalla y son tres clases distintas de cosa. Merece la pena ser preciso sobre cuál es cuál, porque casi todo lo confuso que se ha escrito sobre ondas gravitacionales viene de mezclarlas.\n\n<strong>La animación detrás del panel</strong> es el simulador de siempre, y es dos cosas a la vez. El <em>movimiento</em> sí es un cálculo de verdad: gravedad newtoniana, integrada paso a paso, la misma aritmética que recibe cualquier otro cuerpo de esta aplicación. La <em>caída en espiral</em> no lo es. La gravedad newtoniana no contiene ondas gravitacionales y dejaría a esos dos agujeros negros girando para siempre, así que la simulación encoge su órbita por un factor pequeño en cada paso para que la fusión ocurra mientras alguien mira. Esa constante se eligió para que se viera bien, no se dedujo de lo deprisa que radia una binaria de verdad, y nada del ritmo al que lo ves ocurrir es una medida.\n\nAsí que: la órbita está calculada, la desintegración de la órbita es una ilustración, y ninguna de las dos produce la forma de onda del panel. Las gráficas se calculan aparte, a partir de las masas, con el modelo que se describe abajo; el simulador no las alimenta ni podría.\n\n<strong>La mitad izquierda del panel</strong> es un esquema. La separación entre los dos cuerpos sí está calculada (sale de la frecuencia por la tercera ley de Kepler), pero el dibujo no está a escala, los cuerpos están dibujados mucho más grandes de lo que son, y los anillos son una ilustración de dónde estarían las crestas de la onda. El propio panel lo dice.\n\n<strong>Las gráficas</strong> son el modelo. Un cálculo de verdad, en unidades de verdad, de lo que registraría un detector. Es bueno en un rango declarado y se detiene en un límite declarado, y encontrar ambos es parte de esta lección.\n\nLo que llega al detector no es sonido, y no es luz. Es un cambio en las distancias entre las cosas. El anillo de puntos de la derecha es lo que haría un círculo de masas de prueba libres al pasar la onda: estirado en una dirección, comprimido en la perpendicular, en ángulo recto con la dirección en que viaja la onda. El efecto real es de una parte en 10²¹, y por eso está dibujado enormemente exagerado.',
      tip: 'Una parte en 10²¹ es el grosor de un cabello humano comparado con la distancia a la estrella más cercana, cuatro veces.',
    },
    {
      title: 'Familiarízate con los mandos',
      body: 'Antes de medir nada, hazte con los controles.\n\nEl cabezal mueve el panel entero a la vez: la fuente esquemática, las dos gráficas y la lectura son el mismo instante leído cuatro veces. Aquí dentro no hay un segundo reloj en ninguna parte.',
      checklist: [
        'Pulsa Reproducir / pausar y observa el marcador cruzar las dos gráficas a la vez',
        'Púlsalo otra vez para detenerte en algún punto intermedio',
        'Arrastra a mano el deslizador «Posición en la señal» adelante y atrás',
        'Observa cómo se mueven los dos cuerpos del esquema mientras arrastras',
        'Pulsa Repetir para volver al principio',
        'Lee «En el cursor» en la lista bajo las gráficas: una frecuencia y un tiempo antes de la fusión',
        'Si tienes sonido: pulsa Escuchar y lee la línea que aparece diciendo qué se hizo para volverla audible',
      ],
      tip: 'El panel es deliberadamente lento: reproduce alrededor de una décima de segundo de señal por cada segundo en pantalla, y lo dice en la última línea de la lectura. Lo real se acabó en menos de un segundo.',
    },
    {
      title: 'A medida que la órbita se cierra',
      body: 'Los dos objetos están perdiendo energía (eso es lo que se llevan las ondas), así que caen el uno hacia el otro. Piensa qué le hace eso a su órbita antes de mirar.\n\nAlgo útil que tener en mente: un planeta cercano al Sol da vueltas más rápido que uno lejano. Mercurio tarda 88 días; Neptuno, 165 años.',
      prompt: 'A medida que los dos objetos caen en espiral, la señal…',
      options: [
        'se hará más lenta y más débil, porque se están quedando sin energía',
        'se hará más rápida y más intensa',
        'se hará más rápida pero más débil',
        'mantendrá la misma frecuencia y solo se hará más fuerte',
      ],
      because:
        'Más rápida y más intensa, y por dos motivos distintos. Más rápida porque una órbita más cerrada es una órbita más veloz, exactamente igual que para los planetas: cae más cerca y darás más vueltas. Más intensa porque las ondas que emite un par de masas en órbita se hacen más fuertes cuanto más cerca están y más deprisa se mueven. La primera respuesta es la intuitiva y es la trampa: en efecto pierden energía, pero lo que pierden es energía orbital, y una binaria que pierde energía orbital se acelera en vez de frenarse. Eso es genuinamente extraño y merece la pena detenerse en ello.',
    },
    {
      title: 'Mira cómo salen las ondas',
      body: 'Cambia a la vista de la fuente y observa pasar varias órbitas.\n\nCada anillo es una cresta de la onda, dibujada donde estaría ahora tras salir de la fuente. Los anillos de más afuera salieron antes, cuando la binaria giraba más despacio, así que están más separados. Los de cerca del centro acaban de salir.\n\nEl centro está deliberadamente vacío. La fórmula que da estas amplitudes es un resultado de campo lejano: describe la onda muy lejos de la fuente y no describe la región justo al lado de ella, que es una región de aproximadamente una longitud de onda de ancho que contiene dos agujeros negros. Dibujar algo ahí sería dibujar algo que nadie ha calculado.',
      checklist: [
        'Reproduce la señal y observa cómo se expande el patrón de anillos',
        'Fíjate en que los anillos están más separados en el borde que cerca del centro',
        'Detente cerca del principio y cuenta aproximadamente cuántos anillos caben a lo ancho',
        'Ve hasta cerca del final y cuenta otra vez',
        'Observa cómo el anillo de masas de prueba de la derecha se estira en una dirección y se comprime en la otra',
        'Confirma que el estiramiento es a través de la página, no a lo largo de la dirección por la que vino la onda',
      ],
      tip: 'Las masas de prueba son una imagen aparte, no un detector aparcado junto a la binaria. Un detector real para esta fuente estaba a unos 1300 millones de años luz.',
    },
    {
      title: '¿Cuántas ondas por órbita?',
      body: 'Una relación que merece la pena encontrar por uno mismo, porque explica un factor de dos que aparece por todas partes en este tema.\n\nDeja el cabezal cerca del comienzo de la señal, donde la órbita cambia despacio, y usa la vista esquemática de la fuente. Sigue a uno de los dos cuerpos (digamos el más pequeño) y cuenta cuántas vueltas da mientras cuentas crestas en la gráfica de deformación.\n\nLa forma más sencilla: pon el cabezal al principio del todo, fíjate dónde está el cuerpo pequeño y avanza el cabezal hasta que vuelva al mismo sitio. Eso es una órbita. Después cuenta los picos por los que pasó la gráfica de deformación en ese mismo intervalo.',
      fields: [
        { label: 'Órbitas que has seguido' },
        { label: 'Picos de onda en el mismo tiempo' },
        { label: 'Picos de onda por órbita' },
      ],
      tip: 'Dos, y el motivo es una simetría: gira la binaria media vuelta y los dos cuerpos han intercambiado sus sitios, lo que se ve exactamente igual que la disposición de partida. La onda tampoco nota la diferencia, así que se repite dos veces por órbita.',
    },
    {
      title: 'La frecuencia, dos veces',
      body: 'Ahora pon números a la subida.\n\nMueve el cabezal cerca del principio y lee la frecuencia en la línea de la lectura marcada <strong>En el cursor</strong>. Luego muévelo cerca del final y léela otra vez. Anota las dos, junto con cuánto antes de la fusión se tomó cada lectura.',
      fields: [
        { label: 'Frecuencia cerca del principio' },
        { label: 'Tiempo antes de la fusión entonces' },
        { label: 'Frecuencia cerca del final' },
        { label: 'Tiempo antes de la fusión entonces' },
        { label: 'Cuántas veces más alta llegó a ser la frecuencia' },
      ],
      tip: 'La gráfica de frecuencia tiene el eje vertical logarítmico, y por eso una curva que parece suave a la izquierda está subiendo en realidad con fuerza. Duplicar es la misma distancia hacia arriba del eje estés donde estés.',
    },
    {
      title: 'Párate en cincuenta hercios y anótalo',
      body: 'Un momento concreto, para que todo el mundo en el aula tenga el mismo.\n\nMueve el cabezal hasta que la lectura diga que la frecuencia está lo más cerca que puedas de <strong>50 Hz</strong>. Anota lo que la lectura te dice en ese instante.\n\nDespués pulsa <strong>Guardar en el cuaderno</strong>. Eso guarda los números, los ajustes con los que se tomaron y las limitaciones del propio modelo junto a ellos, de modo que una afirmación que hagas más tarde pueda comprobarse contra la lectura de la que salió.',
      fields: [
        { label: 'Frecuencia en la que te has parado' },
        { label: 'Tiempo antes de la fusión ahí' },
        { label: 'Separación ahí' },
        { label: 'Velocidad orbital ahí' },
      ],
      tip: 'La separación se da en radios de Schwarzschild de la masa combinada. Por debajo de unos tres no queda ninguna órbita circular estable, y ahí es donde el modelo se detiene.',
    },
    {
      title: 'Di qué es un chirrido',
      body: 'Ya tienes tres medidas: dos picos por órbita, una frecuencia que subió aproximadamente un factor de tres, y una separación que se encogió mientras lo hacía.\n\nJúntalas.',
      prompt:
        'Explica, en dos o tres frases, por qué la señal de dos objetos que caen en espiral sube en frecuencia. Usa la palabra «órbita» y di qué le pasa a la separación.',
      rubric:
        'Para la puntuación completa hace falta la cadena: la binaria radia energía, así que la separación se encoge; una órbita más pequeña es una órbita más rápida, así que la frecuencia orbital sube; y la frecuencia de la onda es el doble de la orbital, así que sube con ella. Da crédito a una respuesta que consiga los dos primeros eslabones sin el factor de dos. NO des crédito a una respuesta que diga que los objetos se aceleran porque los atraen con más fuerza sin conectarlo con la separación, ni a «se están quedando sin energía, así que se aceleran» sin mecanismo. Atención a la inversión habitual: quien diga que la frecuencia sube porque los objetos se vuelven más pesados ha leído mal el modelo, cuyas masas no cambian. Aparte de eso, que una cadena correcta no se convierta en una afirmación de más: aquí nada demuestra que esta señal se haya detectado, ni que los dos objetos sean agujeros negros. Un chirrido con esta forma dice «dos objetos compactos cayendo en espiral» y dice su masa de chirrido; no dice de qué están hechos, y una señal en una pantalla no es una observación.',
      tip: 'Cuidado con hasta dónde llevas la conclusión. Un chirrido ascendente es buena evidencia de que lo que lo produjo fueron dos objetos compactos cayendo en espiral, pero por sí solo no es la detección de nada, y no dice qué son esos objetos. Dos agujeros negros, dos estrellas de neutrones y uno de cada chirrían igual; el paso 15 muestra qué sí los distingue, y el paso 20 muestra lo que hace falta de verdad para una detección.',
    },
    {
      title: '¿Qué harían objetos más pesados?',
      body: 'Vas a recibir los controles de masa. Comprométete primero.\n\nUn detector solo es sensible en una banda de frecuencias: aproximadamente de 20 Hz a unos cientos de hercios para los que están en tierra. Por debajo, el propio suelo tiembla demasiado; por encima, no hay suficiente señal.\n\nSupón que haces ambos objetos más pesados manteniendo su proporción. Piensa cuánto tiempo permanece la señal dentro de esa banda.',
      prompt:
        'Un par más pesado, con la misma razón de masas, pasará… dentro de la banda del detector',
      options: [
        'más tiempo, porque hay más masa para radiar',
        'el mismo tiempo, porque la banda es la que es',
        'menos tiempo',
        'más tiempo, y alcanzará una frecuencia más alta al final',
      ],
      because:
        'Menos tiempo, y esto merece la pena recordarlo porque es contraintuitivo dos veces. Una binaria más pesada radia con más fuerza, así que barre cualquier rango de frecuencias más deprisa; y además se detiene antes, porque la frecuencia a la que dos objetos se quedan sin órbitas estables es más baja para un par más pesado. Los dos efectos empujan en el mismo sentido. Los pares más pesados que detectamos están en banda una fracción de segundo; los más ligeros, minutos.',
    },
    {
      title: 'Cambia una sola cosa',
      body: 'Una comparación solo vale algo si cambió una cosa. El panel te ayudará: fija los ajustes actuales como <strong>A</strong>, cambia algo, y la lectura te dirá qué es distinto, y lo dirá claramente si es más de una cosa.\n\nDeja la distancia y el ángulo de visión donde están. Cambia las dos masas a la vez, en la misma proporción, de modo que la razón de masas siga siendo aproximadamente 1,24 a 1.',
      checklist: [
        'Anota las masas actuales: 36 y 29 masas solares',
        'Pulsa Fijar como A',
        'Pon la primera masa en 18 y la segunda en 14,4: la mitad de cada una',
        'Lee la línea «Frente a A»: debería decir que cambió una cosa, o dos si moviste ambas masas',
        'Compara la traza naranja (A) con la azul en la gráfica de deformación',
        'Lee «Modelado» y «Dónde se detiene» para el par más ligero',
        'Prueba ahora 60 y 48 y vuelve a leer esas dos líneas',
      ],
      tool: {
        note: 'Fija una configuración como A y luego cambia una cosa. La lectura dice qué cambió y qué se mantuvo.',
      },
      tip: 'Mover dos masas son dos cambios, y la lectura lo dirá. Esa es la respuesta honesta: lo que estás manteniendo fijo es su proporción, no las masas individuales, y la comparación es entre dos sistemas que difieren en masa total.',
    },
    {
      title: 'Tiempo en banda, de tres maneras',
      body: 'Anota los dos mismos números para tres masas totales con la misma proporción. Usa las líneas de la lectura <strong>Modelado</strong> y <strong>Dónde se detiene</strong>.\n\nPara cada par, ajusta las masas y lee después cuánto dura toda la espiral desde 20 Hz y la frecuencia a la que termina el modelo.',
      fields: [
        { label: '18 + 14,4 M☉: espiral completa desde 20 Hz' },
        { label: '18 + 14,4 M☉: dónde se detiene' },
        { label: '36 + 29 M☉: espiral completa desde 20 Hz' },
        { label: '36 + 29 M☉: dónde se detiene' },
        { label: '60 + 48 M☉: espiral completa desde 20 Hz' },
        { label: '60 + 48 M☉: dónde se detiene' },
      ],
      tip: 'Las dos columnas van en el mismo sentido: más ligero significa más largo y más alto. Un par de estrellas de neutrones, con una cincuentava parte de estas masas, está en banda más de dos minutos y pasa del kilohercio.',
    },
    {
      title: 'Dos binarias distintas, una señal',
      body: 'Algo extraño, y es el hecho más útil de este tema.\n\nPon las masas en <strong>36 y 29</strong> y pulsa <strong>Fijar como A</strong>. Lee la masa de chirrido en lo alto de la lectura.\n\nAhora ponlas en <strong>50 y 19,4</strong>. Son objetos muy distintos (uno casi el triple del otro) y ni siquiera la masa total es la misma. Lee otra vez la masa de chirrido y después mira las dos trazas en la gráfica de deformación.',
      fields: [
        { label: 'Masa de chirrido de 36 + 29' },
        { label: 'Masa de chirrido de 50 + 19,4' },
        { label: 'Masa total de 36 + 29' },
        { label: 'Masa total de 50 + 19,4' },
      ],
      tip: 'La combinación que gobierna la espiral no es la masa total ni ninguna de las masas por separado. Es la masa de chirrido, y dos binarias que comparten una producen casi la misma señal, y por eso la masa de chirrido es lo primero que informa una detección y las masas individuales son mucho más difíciles de acotar.',
    },
    {
      title: 'El doble de lejos',
      body: 'Vuelve a poner las masas en 36 y 29, y piensa en la distancia antes de cambiarla.',
      prompt: 'Alejar la misma binaria al doble de distancia…',
      options: [
        'reducirá la deformación a la mitad y dejará las frecuencias igual',
        'reducirá la deformación a la cuarta parte y dejará las frecuencias igual',
        'reducirá la deformación a la mitad y también las frecuencias a la mitad',
        'no cambiará la deformación: la gravedad tiene alcance infinito',
      ],
      because:
        'A la mitad, y dejando las frecuencias completamente igual. La deformación cae como uno sobre la distancia, no como uno sobre la distancia al cuadrado: es una amplitud, como la altura de una ola, no una intensidad como el brillo. Y la frecuencia es una propiedad de la fuente: la rapidez con que giran los dos objetos no tiene nada que ver con quién mira. Esa separación entre lo que la distancia cambia y lo que no es para lo que sirve el paso siguiente.',
    },
    {
      title: 'Compruébalo, en una sola escala',
      body: 'Esta comparación solo funciona si no se mueve nada más, así que el panel ha fijado la escala vertical de la gráfica de deformación: las dos trazas se dibujan sobre el mismo eje, y una señal más débil se ve genuinamente más débil. Si usas el sonido, se escala con una referencia fija que no se mueve al cambiar la distancia, así que una fuente más lejana suena de verdad más floja.\n\nLee <strong>Amplitud de la deformación</strong>, no «Deformación ahora». La amplitud es la altura de la oscilación, siempre positiva, y es lo que significa «máximo». «Deformación ahora» es dónde está la onda dentro de esa oscilación en este instante, y pasa por cero dos veces por ciclo, así que es el número equivocado para anotar.\n\nPon la distancia en 400 Mpc y lee la amplitud al final de la señal. Luego 800. Luego 1600. Lee también cada vez la frecuencia final.',
      fields: [
        { label: 'Amplitud de la deformación a 400 Mpc' },
        { label: 'Amplitud de la deformación a 800 Mpc' },
        { label: 'Amplitud de la deformación a 1600 Mpc' },
        { label: 'Amplitud a 400 Mpc ÷ amplitud a 800 Mpc' },
        { label: 'Dónde se detiene, a 400 Mpc' },
        { label: 'Dónde se detiene, a 1600 Mpc' },
      ],
      tool: {
        note: 'La escala vertical está fijada en este paso, y la referencia de volumen también, para que las tres distancias puedan compararse en un solo eje y de oído.',
      },
      tip: 'Guarda una de estas en el cuaderno. La entrada anota la distancia, la escala fijada y los límites del modelo junto al número, y eso es lo que la convierte en evidencia y no en un número que apuntaste.',
    },
    {
      title: '¿Hacia dónde mira?',
      body: 'Vuelve a poner la distancia en 400 Mpc y fíjate en el ángulo de visión.\n\nUna binaria vista de frente (mirando justo a lo largo del eje sobre el que gira) produce la señal más intensa. Vista de canto, desde el plano de la órbita, produce la más débil. Mide cuánto más débil.\n\nDespués lee la línea marcada <strong>Distancia</strong>. Da dos números: dónde está realmente la fuente y dónde creería un solo detector que está a partir de la amplitud sola.',
      fields: [
        { label: 'Deformación máxima a 0° (de frente)' },
        { label: 'Deformación máxima a 90° (de canto)' },
        { label: 'Cuánto más débil es de canto' },
        { label: 'Distancia efectiva a 90°, según la lectura' },
      ],
      tip: 'Una binaria de frente a 800 Mpc y una de canto a 400 Mpc producen exactamente la misma señal en un detector. Nada en una sola traza puede distinguirlas, y por eso las distancias obtenidas de ondas gravitacionales vienen con barras de error grandes y por eso varios detectores son mejores que uno.',
    },
    {
      title: 'Tres clases de pareja',
      body: 'El panel tiene tres preajustes. Se diferencian en sus masas y en nada más: no hay ningún ajuste en este modelo que añada una característica propia de estrellas de neutrones, porque el modelo no tiene ninguna que añadir. Todo lo que distingue a las tres señales sale de la aritmética.\n\nCada preajuste modela una ventana que termina donde termina su propio modelo, y la lectura dice cuánto duraría toda la espiral desde 20 Hz.',
      checklist: [
        'Pulsa «Dos agujeros negros» y lee Modelado, Dónde se detiene y Masa de chirrido',
        'Pulsa «Dos estrellas de neutrones» y lee las mismas tres líneas',
        'Pulsa «Estrella de neutrones y agujero negro» y léelas otra vez',
        'Fíjate en que uno de los tres dice que solo modeló la última parte, y por qué',
        'Mira la gráfica de frecuencia de cada uno: la misma forma en rangos muy distintos',
        'Si tienes sonido: escucha los tres y lee cada vez la línea del mapeo',
      ],
      tip: 'El par de estrellas de neutrones está en banda más de dos minutos y llega a más de un kilohercio. El laboratorio modela sus últimos ocho segundos y lo dice, en vez de hacerte esperar.',
    },
    {
      title: 'Dónde deja esto de funcionar',
      body: 'Mira otra vez la lectura del preajuste de agujeros negros, en dos líneas concretas.\n\n<strong>Dónde se detiene</strong> dice 67,6 Hz. Léelo como un límite dibujado sobre el modelo, no como un suceso: es la órbita circular estable más interna para esa masa combinada, que es donde deja de ser cierto el supuesto sobre el que se apoya toda esta forma de onda, el de dos cuerpos en una órbita circular que se encoge despacio. La gráfica termina ahí porque ahí se apaga el modelo. Nada posterior a ese punto está calculado: en estas gráficas no hay fusión, no hay timbre final, y el último ciclo que ves no es el último ciclo que tuvo la binaria.\n\nLo mismo vale para la línea que dice cuánto falta para la fusión. Es la propia estimación de este modelo de cuándo llegaría la separación a cero si siguiera valiendo la misma aproximación, cosa que no ocurre. Es una cuenta atrás que imprime el modelo, no un suceso que haya calculado.\n\n<strong>Velocidad orbital</strong> dice algo como v/c = 0,27 incluso al principio de la banda. Ese número es la rapidez de los objetos como fracción de la velocidad de la luz, y las aproximaciones sobre las que está construido este modelo empeoran como su cuadrado.\n\nGW150914, el evento real, se vio desde unos 35 Hz hasta unos 250 Hz.',
      prompt:
        'Dados esos dos hechos, este modelo de una binaria pesada de agujeros negros…',
      options: [
        'describe todo lo que vieron los detectores',
        'describe razonablemente la parte inicial y se detiene bastante antes de la parte más intensa',
        'está mal y no debería usarse',
        'es exacto hasta el mismo instante de la fusión',
      ],
      because:
        'Describe la parte inicial y se detiene bastante antes del final. Esto no es un defecto que pudiera arreglarse esforzándose más con las mismas ecuaciones: dos agujeros negros a punto de fusionarse se mueven a un tercio de la velocidad de la luz en el espacio-tiempo fuertemente curvado del otro, y hacer eso bien le costó a la comunidad de relatividad numérica unos cuarenta años. Lo que este laboratorio hace en lugar de extrapolar es ceder el paso: la fusión que verás en el paso 22 es la propia forma de onda de relatividad numérica de la colaboración, no este modelo empujado más allá de su límite. Un modelo que dice dónde se detiene es más útil que uno que no lo dice.',
    },
    {
      title: 'Ahora ponlo dentro de un detector',
      body: 'Todo lo anterior ha sido una señal limpia. Un detector real no produce señales limpias; produce un temblor continuo de movimiento sísmico, vibración térmica y el comportamiento cuántico de la luz que hay dentro, y cualquier señal llega encima de eso.\n\nPulsa <strong>Ruido del detector</strong>. La traza gris es ruido simulado con el espectro que Advanced LIGO fue diseñado para tener. Se extrae de una semilla fija y <em>no</em> cambia cuando cambias un parámetro: si lo hiciera, cada comparación que hicieras estaría comparando dos cosas a la vez.',
      checklist: [
        'Pulsa Ruido del detector y mira la gráfica superior',
        'Mira la gráfica de detalle de debajo, donde se resuelven los ciclos individuales',
        'Lleva la distancia a 1200 Mpc y mira otra vez',
        'Aléjala más, a 2000 Mpc, e intenta encontrar la señal a ojo',
        'Pulsa Ruido nuevo para extraer otra realización, y comprueba que la imagen cambia pero la señal no',
        'Vuelve a poner la distancia en 410 Mpc',
      ],
      tip: 'Esta es una curva de diseño, no el ruido que LIGO tuvo realmente en septiembre de 2015. El ruido real de un detector contiene además fallos transitorios, líneas del instrumento y tramos en los que algo del edificio no estaba colaborando.',
    },
    {
      title: 'Se parece. ¿Basta con eso?',
      body: 'El panel puede ahora comparar dos señales por ti y dar un número.\n\nFija la señal actual como <strong>A</strong>. Esa es tu plantilla: un modelo limpio de lo que crees que hay. La similitud que informa es un solapamiento normalizado entre la plantilla y lo que muestra el detector: un número de 0 a 1, y el mismo producto interior sobre el que se construye una búsqueda real.\n\nMídelo tres veces: con la plantilla correcta, con una plantilla de masa de chirrido equivocada, y con la señal tan lejos que queda enterrada.',
      fields: [
        { label: 'Similitud con las masas correctas' },
        { label: 'Similitud con 20 + 16 M☉ en su lugar' },
        { label: 'Similitud con las masas correctas a 2000 Mpc' },
      ],
      tip: 'Fíjate en lo alto que puntúa todavía la plantilla equivocada, y en lo bien que puntúa la correcta incluso con la señal enterrada. Un número cercano a uno es fácil de conseguir. Convertirlo en «hemos detectado algo» requiere un banco de cientos de miles de plantillas, una estimación de con qué frecuencia el ruido solo produce una puntuación así de alta, y un recuento de cuántas veces has mirado. Nada de eso está aquí, y por eso este número se llama similitud y nada más.',
    },
    {
      title: 'Lo que registraron de verdad dos detectores',
      body: 'El 14 de septiembre de 2015 a las 09:50:45 UTC, dos instrumentos separados por tres mil kilómetros se movieron los dos.\n\nLo que hay ahora en el panel no es un modelo. Son los datos que las colaboraciones LIGO y Virgo publicaron con el artículo del descubrimiento, reproducidos aquí y no reprocesados. Lo único que se les hizo antes de publicarlos fue un filtro de banda entre 35 y 350 Hz y muescas en las frecuencias donde los instrumentos tienen líneas conocidas, y por eso parece una señal en vez de un muro de ruido sísmico.\n\nLas dos trazas no se parecen. Hay dos cosas por medio, y las dos son físicas. Encuéntralas: usa el control de desplazamiento para deslizar Livingston en el tiempo, y el de signo para darle la vuelta.',
      checklist: [
        'Mira las dos trazas tal como se publicaron: el mismo evento, y no coinciden',
        'Arrastra el control de desplazamiento y observa deslizarse la traza inferior',
        'Encuentra el desplazamiento en el que las grandes excursiones se alinean',
        'Cambia ahora el signo y mira otra vez',
        'Lee la línea «Mejor coincidencia» y compárala con lo que encontraste',
        'Pulsa «Tal como se publicó» para volver, y luego «Desplazado e invertido»',
      ],
      tip: 'El desplazamiento es un tiempo de viaje de la luz: la onda cruzó la Tierra y llegó a Livingston unos siete milisegundos antes que a Hanford. El cambio de signo es geometría: los brazos de los dos detectores están girados uno respecto al otro, así que un estiramiento a lo largo del brazo de uno es una compresión a lo largo del del otro. Ninguna de las dos cosas se aplicó a los datos guardados; el panel aplica lo que le pides y lo deja anotado.',
    },
    {
      title: 'La medida, el modelo y lo que queda',
      body: 'Tres trazas de las mismas quince centésimas de segundo.\n\nLa de arriba es lo que midió Hanford. La del medio es la forma de onda de la propia colaboración: un cálculo de relatividad numérica, no el modelo de este laboratorio ni una aproximación suya; es el que cubre la fusión y el timbre posterior, que es precisamente la parte que tu modelo se negó a adivinar.\n\nLa de abajo es la primera menos la segunda. Si la reconstrucción dio cuenta de lo que pasó, lo que quede debería ser solo el detector: igual de intenso antes de que llegue la señal que después, y sin forma alguna.',
      checklist: [
        'Compara las dos trazas de arriba: dónde coinciden y dónde no',
        'Busca los últimos ciclos, donde la amplitud llega al máximo y luego decae rápido',
        'Mira la traza de abajo antes de que llegue la señal, y después',
        'Confirma que el residuo no se hace más intenso cuando la señal lo hace',
        'Lee la línea «Lo que queda» en la lectura',
      ],
      tip: 'El decaimiento rápido del final es el timbre: un único agujero negro recién formado asentándose. Nada en el modelo propio de esta lección lo produce, y nada en esta lección fingió lo contrario.',
    },
    {
      title: 'Cinco fusiones más, del archivo',
      body: 'Los pasos 21 y 22 eran un solo evento, tal como lo publicó el artículo del descubrimiento. Estos son cinco, tal como los registraron los detectores: treinta y dos segundos de deformación de cada uno, descargados del Gravitational Wave Open Science Center, y un detector dibujado por evento.\n\nEl mapa es esa grabación, blanqueada por Gravitas con el ruido que tenía el mismo detector en los mismos treinta y dos segundos, y desplegada en tiempo y frecuencia. Una mancha brillante es energía más intensa que el propio ruido de ese detector, a esa frecuencia, en ese instante. Un chirrido es una curva en el mapa que sube y luego se detiene.\n\nLa lectura mantiene separadas cuatro clases de número, bajo cuatro encabezados: lo que se <strong>observó</strong>, lo que Gravitas <strong>midió</strong> a partir de ello, lo que dice el <strong>catálogo GWOSC</strong> y lo que predice el <strong>modelo</strong>. Por ahora el catálogo está reservado y el modelo desactivado.\n\n<strong>La pareja del lienzo no es ninguno de estos cinco.</strong> Es la binaria modelo del laboratorio de antes, todavía donde estaba. Nada del panel la mueve.',
      checklist: [
        'Recorre las cinco grabaciones con el control de evento',
        'En cada mapa, busca la curva que sube y luego se detiene',
        'Lee la línea «Final del chirrido» de cada una: el último instante en que Gravitas encontró algo más intenso que el ruido',
        'Encuentra la única grabación para la que Gravitas no mide ningún final',
        'Fíjate en qué curvas siguen visibles más tiempo antes de su final',
      ],
      tip: 'Cada hora del catálogo se publica con una décima de segundo, lo cual es demasiado grueso para situar una fusión con unas milésimas. Por eso Gravitas encuentra el final de cada chirrido en los datos, y todo «antes del final» en estas pantallas se cuenta hacia atrás desde ahí.',
    },
    {
      title: 'El mismo momento antes del final',
      body: 'En el laboratorio, una pareja más ligera estaba a una frecuencia más alta que una más pesada al mismo tiempo antes de su fusión, y se quedaba más tiempo en banda. Esa era la predicción del modelo. Estas grabaciones son una ocasión de ver si las binarias reales lo hacen.\n\nLas dos líneas marcadas <strong>Los cinco</strong> dan la frecuencia más intensa que Gravitas encontró en el mismo momento antes del final de cada chirrido: una décima de segundo y una vigésima. Un guion no es cero. Significa que nada en ese instante era más intenso de lo que el ruido del detector podría haber producido por azar.\n\nAnota las cuatro que tienen lectura una vigésima de segundo antes del final.',
      fields: [
        { label: 'GW150914, 0,05 s antes del final' },
        { label: 'GW190412' },
        { label: 'GW190521' },
        { label: 'GW190814' },
      ],
      tip: 'Mira también la línea de la décima de segundo. GW190521 tiene un guion ahí pero una lectura a la vigésima: fuera lo que fuese, solo se hizo visible en las últimas centésimas de segundo.',
    },
    {
      title: '¿Cuál era la más pesada?',
      body: 'Antes de que haya ninguna masa en pantalla: a partir de tus cuatro lecturas, y de lo que te enseñó el laboratorio, ¿cuál de estas parejas tenía la mayor masa de chirrido?\n\nUsa también la línea de la décima de segundo, además de la que anotaste. Cuánto tiempo sigue visible un chirrido también es evidencia.',
      prompt: 'De las cuatro con lectura, la mayor masa de chirrido es la de…',
      options: [
        'GW190814: llegó a la frecuencia más alta, y una pareja más pesada tiene más energía que radiar',
        'GW190521: era la más baja en el mismo momento antes del final, y la que estuvo visible menos tiempo',
        'GW150914: su curva es la más brillante de su mapa',
        'ninguna puede ordenarse hasta conocer las distancias',
      ],
      because:
        'GW190521. En el laboratorio, una pareja más pesada estaba a una frecuencia más baja al mismo tiempo antes de su fusión y pasaba menos tiempo en banda, y GW190521 hace las dos cosas: 55 Hz una vigésima de segundo antes de su final, y nada medible una décima antes, porque una pareja tan pesada aún estaba por debajo de la banda. La primera respuesta es la trampa: una frecuencia más alta en el mismo momento significa una pareja más ligera, no más pesada. La tercera y la cuarta hablan del brillo, que sí depende de la distancia y de cómo está inclinada la órbita respecto a nosotros. La frecuencia no, salvo por un efecto de la distancia que la pantalla siguiente corrige.',
    },
    {
      title: 'Lo que dice el catálogo',
      body: 'Pon el control del catálogo en <strong>visibles</strong> y recorre otra vez los cinco. Estos números son de GWOSC, no de Gravitas: masas, distancia y relación señal-ruido, cada uno con el intervalo que publicaron las colaboraciones. Salen de ajustar modelos completos de forma de onda a los datos de todos los detectores a la vez, un cálculo mucho mayor que nada de lo que hay en esta pantalla, y están bajo un encabezado que dice que <em>no se midieron aquí</em>.\n\nOrdena las cuatro que clasificaste por masa de chirrido y compáralo con tu clasificación.\n\nLuego mira las distancias. GW190521 está unas siete veces más lejos que GW150914, y el espacio se expandió mientras su onda venía hacia aquí, estirándola. Un chirrido estirado se parece exactamente al chirrido de una pareja más pesada. Lo que mide un detector es la masa de chirrido multiplicada por uno más el corrimiento al rojo: para GW150914 eso es un diez por ciento más, y para GW190521, más de la mitad otra vez.',
      checklist: [
        'Pon el control del catálogo en «visibles»',
        'Lee la masa de chirrido de cada uno de los cinco',
        'Ordena las cuatro que clasificaste por masa de chirrido y compáralo con tu predicción',
        'Busca la distancia de GW190521 y compárala con la de GW150914',
        'Comprueba bajo qué encabezado está cada número que has usado hasta ahora',
        'Busca la masa de chirrido de GW170817 y el tamaño de su intervalo',
      ],
      tip: 'El catálogo da masas en el sistema de la fuente: lo que pesaría la pareja si estuviera al lado. El corrimiento al rojo que las convierte también es un valor del catálogo, y el modelo de una pantalla posterior usa el producto de los dos.',
    },
    {
      title: 'La más intensa, y la que Gravitas no puede medir',
      body: 'GW170817 es la pareja de estrellas de neutrones cuya colisión también se vio como un estallido de rayos gamma, y luego como una fuente nueva de luz en una galaxia a unos cuarenta megapársecs. Su relación señal-ruido en el catálogo es 33, la más alta de las cinco. Y en su grabación, Gravitas no encuentra nada más intenso que el ruido.\n\nLas dos cosas son ciertas. La diferencia está en cómo se obtuvieron los dos números. El mapa pregunta si un píxel (una frecuencia, un instante) es más intenso de lo que el ruido podría hacerlo. Una pareja de estrellas de neutrones es ligera, así que su chirrido es débil en cada momento y muy largo: el modelo del laboratorio dice que pasa casi un minuto en la banda, miles de ciclos. El número del catálogo sale de un filtro adaptado que suma todos esos ciclos contra una plantilla antes de preguntar si el total es más intenso que el ruido. Gravitas no ejecuta esa búsqueda, y la lectura lo dice.\n\nLa última décima de segundo, donde terminan los chirridos de las parejas más pesadas, tampoco ayuda: una pareja tan ligera ya pasa de 300 Hz entonces y sigue subiendo por encima del borde superior del mapa cuando se fusiona.',
      checklist: [
        'Selecciona GW170817 y lee la línea «Final del chirrido»',
        'Mira con atención los dos últimos segundos de su mapa y decide si ves una traza',
        'Compara su relación señal-ruido con la de los otros cuatro',
        'Fíjate en el eje de tiempo: este mapa cubre seis segundos y medio, los otros tres',
      ],
      tip: 'Para este evento se dibuja Hanford y no Livingston porque Livingston registró una fuerte perturbación instrumental alrededor de un segundo antes de la fusión, documentada en la página del evento en GWOSC. Las colaboraciones la eliminaron antes de su análisis; Gravitas usa el detector que no necesitaba reparación.',
    },
    {
      title: 'El modelo del laboratorio, sobre las grabaciones',
      body: 'Activa ahora la traza del modelo. La línea discontinua es el mismo chirrido de orden más bajo que calculó el laboratorio, dibujado para la masa de chirrido en el sistema del detector de cada evento y terminando donde Gravitas midió el final del chirrido. Nada de ella se ajusta al mapa. Necesita la masa de chirrido del catálogo, así que sigue desactivada mientras el catálogo esté reservado.\n\nPara GW150914 el modelo y la medida coinciden con unos pocos hercios, lo que es un buen resultado para el evento alrededor del cual se construyó el laboratorio. Recorre los otros y encuentra dónde deja de haber acuerdo.\n\nDonde no coinciden lo bastante, el desacuerdo está en la grabación y no en el mapa. Un chirrido de orden más bajo puro, sumado a ruido y leído exactamente con el mismo procedimiento, vuelve con un error de menos de una sexta parte de la frecuencia que se puso, tan a menudo por encima como por debajo. Una vigésima de segundo antes de su final, GW190814 está más de una cuarta parte por debajo del modelo: más de lo que el mapa llega a equivocarse nunca con un chirrido puro. Tan cerca del final, la señal real no es un chirrido de orden más bajo.',
      checklist: [
        'En GW150914, compara las frecuencias del modelo con las medidas en la lectura',
        'En GW190521, busca la línea del modelo, y fíjate en lo poco de ella que cae en el mapa',
        'En GW190814, compara la frecuencia del modelo una vigésima de segundo antes del final con la medida',
        'En GW170817, lee el tiempo en banda del modelo y compáralo con lo que viste',
      ],
      tip: 'La línea del modelo de GW190521 solo aparece en las últimas centésimas de segundo, porque con casi cien masas solares en el sistema del detector el chirrido de orden más bajo está por debajo de 30 Hz hasta entonces. Lo que el mapa muestra para ella es sobre todo la fusión y el timbre posterior, que el modelo deja fuera. Cuanto más pesada es la pareja, menos de lo que ves es espiral.',
    },
    {
      title: 'Qué vino de dónde',
      body: 'Cada número de estas siete pantallas estaba bajo uno de cuatro encabezados. Algunos se leyeron de la deformación en tu navegador. Otros se copiaron del catálogo, que los obtuvo de un análisis que este instrumento no intenta. Una línea era un modelo, dibujado a partir de un valor del catálogo.\n\nLa conclusión a la que llegaste sobre qué pareja era la más pesada usó más de una clase.',
      prompt:
        '¿Qué mediste a partir de la deformación, y qué aportó GWOSC? Nombra al menos dos de cada, y di qué conclusión de estas pantallas necesitó las dos cosas.',
      rubric:
        'Busca una clasificación correcta. Medido a partir de la deformación: el final de cada chirrido, la frecuencia más intensa a un tiempo fijo antes de él, el ruido del detector a 100 Hz, y el hallazgo de que nada en la grabación de GW170817 supera el ruido. Aportado por GWOSC: las masas, la masa de chirrido, la distancia, el corrimiento al rojo, la relación señal-ruido y las horas del catálogo. La traza del modelo no es ninguna de las dos cosas, y un estudiante que dice que se calculó a partir de un valor del catálogo la ha entendido. Para la conclusión que necesitó las dos, las mejores respuestas nombran la clasificación: las frecuencias predijeron un orden de masas de chirrido y el catálogo lo confirmó, con el corrimiento al rojo explicando por qué las masas en el sistema del detector son las que fijan la frecuencia. El contraste de GW170817 también es una respuesta fuerte: una medida de ningún píxel detectable frente a una relación señal-ruido de catálogo de 33, reconciliadas por el filtro adaptado. NO des crédito a una respuesta que diga que la masa de chirrido se midió aquí: este instrumento no midió ninguna, y la lectura lo dice. Tampoco a una que llame a la relación señal-ruido una medida de Gravitas.',
      tip: 'Si no sabes de dónde salió un número, búscalo en la lectura y lee el encabezado que tiene encima. Ese encabezado es la respuesta.',
    },
    {
      title: 'Haz que sea más difícil de ver',
      body: 'Te toca. Diseña una comparación y ejecútala.\n\nLa pregunta: <strong>¿qué hace que una señal sea más difícil de distinguir del ruido?</strong> Tienes cuatro cosas que puedes cambiar (dos masas, una distancia y un ángulo de visión) y un número de similitud que dice lo bien que una plantilla limpia coincide con lo que ve el detector.\n\nLas reglas son las que has estado usando. Cambia una cosa. Mantén fija la semilla del ruido salvo que quieras deliberadamente otra realización. Anota qué cambiaste y qué pasó, y guarda al menos una lectura en el cuaderno: la entrada lleva consigo los ajustes y las limitaciones del modelo, y eso es lo que la convierte en evidencia que puedes citar después.',
      checklist: [
        'Decide qué única variable vas a cambiar, y anótalo antes de empezar',
        'Prepara el caso «antes» y pulsa Fijar como A',
        'Lee la similitud, y comprueba que la lectura dice que solo cambió una cosa',
        'Cambia tu variable y lee otra vez la similitud',
        'Pulsa Guardar en el cuaderno en el caso que creas que demuestra tu punto',
        'Prueba una segunda variable y mira si hace lo mismo',
        'Encuentra un cambio que haga la señal más fácil de ver, además de uno que la haga más difícil',
      ],
      tip: 'La distancia y el ángulo de visión cambian la amplitud y nada más. La masa cambia la forma de la señal además de su intensidad, así que un cambio de masa son dos efectos a la vez: merece la pena notarlo, y merece la pena decirlo en tu conclusión en vez de pasarlo por alto.',
    },
    {
      title: 'Lo que la señal te dice, y lo que no',
      body: 'De vuelta al principio. En el paso 1 se te mostró un patrón sin etiqueta y se te preguntó qué podría haberlo producido. Ahora sabes bastante más que entonces.\n\nAquí tienes uno nuevo en el que pensar mientras escribes: llega una señal que permanece noventa segundos en la banda de un detector y sube por encima de un kilohercio antes de desaparecer. Con lo que has medido ya puedes decir algo sobre qué clase de pareja era, y hay cosas que no puedes decir por mucho que mires.\n\nCuando hayas escrito tu respuesta, abre el cuaderno y expórtala con las lecturas que guardaste. Una afirmación viaja con su evidencia.',
      prompt:
        'Escribe un breve relato de lo que una señal de chirrido revela sobre su fuente y lo que deja indeterminado. Menciona al menos una cosa que hayas medido y al menos una que este modelo no pueda decirte. Di si tu predicción del paso 1 sigue en pie.',
      rubric:
        'Busca tres cosas. Primera, al menos una relación medida enunciada correctamente: que la frecuencia de la onda es el doble de la orbital, que lo que gobierna la espiral es la masa de chirrido y no las masas individuales, que la deformación va como uno sobre la distancia, o que los pares más ligeros permanecen más tiempo en banda. Segunda, una limitación real y bien razonada: la degeneración distancia-inclinación (la amplitud sola no puede separar una fuente lejana vista de frente de una cercana vista de canto), que el modelo se detiene antes de la fusión, o que la masa de chirrido no determina las dos masas por separado. Tercera, una revisión honesta del paso 1 y no una afirmación de haberlo sabido siempre. Quien diga que la señal de noventa segundos era un par de poca masa (estrellas de neutrones, o algo parecido) ha usado bien la lección; quien diga que eran sin duda estrellas de neutrones ha afirmado de más, porque la señal acota la masa de chirrido y no la composición, y esa distinción merece señalarse en la corrección más que penalizarse con dureza. NO des crédito a «más fuerte significa más cerca» sin la salvedad de la inclinación, ni a ninguna afirmación de que oír el sonido identifica la fuente.',
      tool: {
        note: 'La señal nueva, para la pregunta de al lado. Dos objetos de 1,4 masas solares cada uno, de donde salen los noventa segundos y el kilohercio.',
      },
      tip: 'Nada en una onda gravitacional dice de qué estaban hechos los objetos. Dice cuánto pesaban, cómo se movían y a qué distancia estaban; y la razón por la que creemos que GW170817 fue un par de estrellas de neutrones es que un estallido de rayos gamma se produjo en el mismo sitio dos segundos después y un telescopio encontró la galaxia.',
    },
    {
      title: 'Dónde te deja esto',
      body: '<strong>Dos gráficas, una señal.</strong> La deformación frente al tiempo es una onda que se hace más alta y más rápida; la frecuencia frente al tiempo es lo mismo como una curva que barre hacia arriba. Ese barrido es el chirrido, y la fuente se lee en su forma, no en su altura.\n\n<strong>La frecuencia de la onda es el doble de la orbital</strong>, porque la distribución de masa de un binario se repite dos veces por órbita y no una.\n\n<strong>Lo que fija la espiral es la masa de chirrido</strong>: una combinación concreta de las dos masas, no las dos masas por separado. Una señal que permanece en banda noventa segundos y sube por encima del kilohercio es un par ligero. Con solo esa prueba todavía no es un par de estrellas de neutrones, y la diferencia entre esas dos frases es casi todo lo que esta lección pretendía.\n\n<strong>La amplitud sola no es una distancia.</strong> Una fuente lejana vista de frente y otra más cercana vista de canto escriben la misma deformación. Separarlas exige más de un detector.\n\n<strong>Y un chirrido no es una detección.</strong> El modelo que ejecutaste se detiene antes de la fusión. El ruido que añadiste se coloreó para resultar convincente, no se midió en un instrumento. Una afirmación real es una señal coincidente en detectores separados con una tasa de falsa alarma asociada, y todo lo que hay en esta pantalla es un modelo de una cosa, etiquetado como tal.',
      tip: 'La distinción que llevas toda la lección haciendo —medida, modelo, ilustración— es la misma que hacen los observatorios en público. Un evento candidato se publica con su tasa de falsa alarma precisamente para que quien lo lea pueda hacerla también.',
    },
  ],
};
