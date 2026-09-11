// =============================================================================
// ¿Puedes detectar este planeta? - Spanish
// -----------------------------------------------------------------------------
// A shadow of ../detect-this-planet.js carrying only its words. Laid over the
// English lesson by mergeTranslation() in ../i18n.js, so anything absent here
// keeps its English and nothing here can reach the lesson's machinery: no
// scenario name, no seed, no widget id, no numeric answer, no probe.
//
// Arrays line up by index with the English.
// =============================================================================

export default {
  series: 'Detección de exoplanetas',
  title: '¿Puedes detectar este planeta?',
  subtitle:
    'El mismo planeta, las mismas doce noches, dos respuestas distintas',
  duration: '30-35 min',
  level: 'Astronomía introductoria',
  summary:
    'Un planeta está ahí o no está, pero que lo encuentres depende de decisiones que tomas antes de hacer una sola medida. Planifica dos campañas de observación de la misma estrella, con el mismo instrumento y el mismo número de noches, y descubre que una encuentra un Júpiter y la otra no puede decirte absolutamente nada.',
  objectives: [
    'Predecir si un calendario de observación puede detectar un planeta dado, y decir cuál de los tres factores (cadencia, intervalo total y precisión) lo decide',
    'Explicar por qué más medidas a lo largo de un intervalo más largo pueden ser peores que menos medidas en uno más corto',
    'Enunciar qué establece, y qué no, un exceso de dispersión en un conjunto de datos de velocidad radial',
    'Decir qué descarta un conjunto de datos de velocidad radial plano, y qué deja abierto',
  ],
  steps: [
    {
      title: 'Doce noches',
      body: 'Te han concedido doce noches en un espectrógrafo. No necesariamente doce noches seguidas: doce noches, para usarlas cuando quieras, repartidas por el tiempo que pidas.\n\nEl objetivo es la estrella en pantalla. En algún lugar a su alrededor, demasiado tenue para verse, puede haber o no un planeta. Tus doce medidas de la velocidad de la estrella son todas las pruebas que vas a tener.\n\nLa pregunta habitual es <em>¿hay un planeta?</em>. Esta lección plantea otra distinta, y es la que un observador tiene que responder primero: <strong>¿lo encontraría este calendario si lo hubiera?</strong>\n\nEl objetivo es la estrella de la pantalla: haz clic en ella, o usa <strong>Objetos de esta actividad</strong> más abajo, para que el instrumento sepa a qué estrella te refieres.',
      tip: 'El tiempo en un telescopio grande se asigna por noches, con meses de antelación. El calendario se decide antes de que nadie sepa qué mostrarán los datos.',
    },
    {
      title: '¿Qué decide si lo encuentras?',
      body: 'Cuatro cosas son evidentes en cualquier campaña de observación: cuántas medidas tomas, con qué precisión, qué intervalo de tiempo abarcan y cómo se reparten dentro de ese intervalo.\n\nSupón que el número de medidas está fijado en doce y que el instrumento también está fijado. Comprométete con una respuesta antes de ver ningún dato.',
      prompt:
        'Con doce medidas y un solo instrumento, ¿qué elección crees que importa más?',
      options: [
        'Repartirlas a lo largo del intervalo total más largo posible',
        'Cómo se espacian con respecto a la órbita del planeta',
        'Tomarlas todas en noches consecutivas',
        'No puede importar mucho: doce medidas son doce medidas',
      ],
      because:
        'El espaciado con respecto a la órbita. Las próximas pantallas son la demostración: dos campañas de doce medidas, una de ellas once veces más larga que la otra, y es la más corta la que encuentra el planeta.',
    },
    {
      title: 'Calendario A: doce noches, una órbita',
      body: 'Este instrumento planifica una campaña y te muestra con qué volvería a casa. Está puesto en el primer calendario: doce medidas, separadas unas ocho horas, que abarcan una sola órbita del planeta.\n\nLa curva discontinua es el planeta tal como lo conoce la simulación. Está dibujada para enseñar y <strong>no son datos</strong>: un sondeo real solo tiene los puntos y sus barras de error. El panel de la derecha pliega esas mismas medidas sobre un ciclo, que es donde el espaciado se hace visible.\n\nUna «fase» es un lugar de la órbita en el que está la estrella, no una abstracción: la lectura de abajo da la fase en la que está la estrella ahora mismo, y el panel plegado usa ese mismo eje.',
      tool: {
        title: 'Planifica una campaña de observación',
        note: 'Usa los ajustes preestablecidos de abajo para cambiar entre los dos calendarios. La semilla del ruido cambia qué extracción aleatoria te toca, no lo bueno que es el calendario.',
      },
      checklist: [
        'Lee la cobertura en fase: cuántos de los diez intervalos del ciclo contienen al menos una medida',
        'Compara la dispersión de las medidas con la dispersión esperada solo por el ruido',
        'Pon la incertidumbre a cero y observa cómo los puntos caen exactamente sobre la curva discontinua',
      ],
      tip: 'El panel de la derecha está plegado con el periodo verdadero. Un sondeo real no conoce el periodo, y esa es una de las razones por las que en la práctica esto es más difícil de lo que parece aquí.',
    },
    {
      title: 'Anota lo que consiguió el calendario A',
      body: 'Vuelve a poner el instrumento en <strong>Calendario A: un ciclo</strong>, con la incertidumbre en 8 m/s y la semilla en 1, y lee tres números del panel de resultados.',
      fields: [
        { label: 'Intervalos de fase cubiertos (de 10)' },
        { label: 'Dispersión de las medidas' },
        { label: 'χ²/gdl frente a una velocidad constante' },
      ],
    },
    {
      title: '¿Qué has establecido?',
      body: 'Las medidas se dispersan unos 56 m/s. Las barras de error son de 8 m/s. Un χ²/gdl cercano a 49 dice que, si la velocidad de la estrella hubiera sido realmente constante, una dispersión así prácticamente nunca ocurriría por azar.\n\nCuidado con el siguiente paso. Es aquel sobre el que se construye toda esta lección.',
      prompt: 'Lo máximo que establecen por sí solas estas doce medidas es:',
      options: [
        'Un planeta de unas 0,7 masas de Júpiter orbita esta estrella cada 3,5 días',
        'Un planeta orbita esta estrella, aunque su masa y su periodo sigan siendo desconocidos',
        'La velocidad de la estrella no es constante',
        'Nada, porque doce medidas son demasiado pocas',
      ],
      because:
        'La velocidad no es constante. Eso es todo lo que la dispersión puede sostener por sí misma. Un planeta es la explicación más probable y no es la única: una compañera estelar tenue, pulsaciones, manchas que rotan por la superficie o un fallo del instrumento producen también variaciones de velocidad. Convertir «no es constante» en «un planeta, de esta masa, con este periodo» necesita más que una dispersión: necesita que la variación se repita con un periodo definido, y necesita descartar las demás explicaciones.',
      tip: 'El panel de resultados dice lo mismo bajo «Lo que eso no dice». Está ahí a propósito.',
    },
    {
      title: 'Calendario B: doce noches, treinta y nueve días',
      body: 'Ahora el segundo plan. La misma estrella, el mismo instrumento, las mismas doce medidas y la misma precisión de 8 m/s, pero tomadas cada 3,52 días en lugar de cada ocho horas, de modo que la campaña abarca treinta y nueve días en vez de tres y medio.\n\nOnce veces el intervalo total, por las mismas doce noches de telescopio.',
      prompt: 'Comparado con el calendario A, el calendario B:',
      options: [
        'Lo hará mejor: un intervalo más largo es más información',
        'Lo hará más o menos igual: las mismas doce medidas de la misma estrella',
        'Lo hará peor',
        'Lo hará mejor, pero solo si el planeta tiene un periodo largo',
      ],
      because:
        'Lo hace mucho peor, y la razón no es el número de medidas ni la duración de la campaña. Cambia el instrumento al calendario B en la pantalla siguiente y mira el panel plegado.',
    },
    {
      title: 'El mismo planeta, invisible',
      body: 'Cambia al ajuste <strong>Calendario B: un ciclo de separación</strong>.\n\nEl panel izquierdo abarca ahora treinta y nueve días en lugar de tres y medio, y las doce medidas son casi una línea plana. El panel derecho enseña por qué: al plegarlas sobre el ciclo se amontonan en dos intervalos de diez.\n\nSé exacto sobre qué ha cambiado y qué no. La misma estrella, el mismo planeta, la misma precisión del instrumento, las mismas doce noches, la misma tirada aleatoria. Difiere una sola cosa: cuánto se separan las noches entre sí. Así que cualquier cosa que concluyas comparando estas dos campañas es una conclusión sobre la <em>cadencia</em>, y sobre nada más.\n\nLa estrella del lienzo tampoco ha cambiado. Fíjate en dónde está cuando se habría tomado cada medida: una cadencia de una órbita significa pillarla casi en el mismo sitio de su órbita cada vez, y por eso doce medidas pueden no decirte casi nada.',
      tool: {
        title: 'Calendario B',
        note: 'Todo excepto la cadencia es idéntico al calendario A.',
      },
      checklist: [
        'Lee la cobertura en fase y compárala con la del calendario A',
        'Lee el χ²/gdl y fíjate en que ya no es aplastante',
        'Aparta un poco la cadencia de 3,52 (prueba 3,0 o 4,2) y observa cómo se recupera la cobertura',
      ],
    },
    {
      title: 'Anota lo que consiguió el calendario B',
      body: 'Con el ajuste en <strong>Calendario B</strong>, incertidumbre 8 m/s y semilla 1, lee los mismos tres números.',
      fields: [
        { label: 'Intervalos de fase cubiertos (de 10)' },
        { label: 'Dispersión de las medidas' },
        { label: 'χ²/gdl frente a una velocidad constante' },
      ],
    },
    {
      title: 'Por qué falló',
      body: 'El periodo orbital del planeta es de 3,5247 días. El calendario B toma una medida cada 3,52 días.',
      prompt:
        '¿Cuántas órbitas completas hace el planeta entre una medida y la siguiente?',
      unit: 'órbitas',
      because:
        '3,52 / 3,5247 = 0,9987, que es una órbita con un margen de dos milésimas. Cada medida sorprende a la estrella casi exactamente en el mismo punto de su órbita, así que el movimiento del planeta no tiene dónde manifestarse. La estrella se movía de verdad a 84 m/s en cada sentido todo el tiempo; sencillamente, el calendario nunca miró la otra parte del ciclo. Esto se llama solapamiento (aliasing), y es la razón por la que los observadores evitan cadencias cercanas a un número entero de días cuando buscan planetas con periodos cercanos a un número entero de días.',
    },
    {
      title: 'El tercer mando',
      body: 'La cadencia es uno de tres factores distintos, y merece la pena ver los otros dos por separado.\n\nPulsa <strong>Un planeta más pequeño</strong>: el calendario vuelve a ser el bueno, pero el planeta pasa a ser un Neptuno y K cae de 84 a unos 7 m/s, más pequeño que las barras de error. Después pulsa <strong>Un espectrógrafo mejor</strong>: el mismo Neptuno, el mismo calendario, medido con 1 m/s en lugar de 8.',
      tool: {
        title: 'La precisión, con el calendario fijo',
        note: 'Entre los dos últimos ajustes solo cambia la incertidumbre. El planeta y el calendario son idénticos.',
      },
      checklist: [
        'Con el Neptuno a 8 m/s, fíjate en que la cobertura en fase sigue siendo perfecta y el χ²/gdl sigue cerca de 1',
        'Cambia a 1 m/s y observa cómo el mismo planeta se vuelve evidente',
        'Convéncete de que nada del planeta cambió entre esos dos ajustes',
      ],
      tip: 'La cadencia decide si miras en los momentos adecuados. El intervalo total decide qué periodos podrías llegar a ver. La precisión decide qué señal tan pequeña sobrevive al ruido. Fallan de forma independiente, y cualquiera de los tres puede arruinar una campaña.',
    },
    {
      title: 'Pruebas ambiguas',
      body: 'El calendario B dio un χ²/gdl cercano a 1,9 con doce medidas. Tomado al pie de la letra, eso es un exceso leve: más dispersión de la que predicen las barras de error, pero del tipo que aparece por azar quizá en uno de cada cuarenta conjuntos de datos.\n\nEstás redactando el informe de la campaña.',
      prompt: '¿Cuál es la frase honesta?',
      options: [
        'Detectamos un planeta alrededor de esta estrella.',
        'No encontramos indicios de un planeta alrededor de esta estrella.',
        'Vemos un exceso marginal sobre el ruido de medida que este calendario no puede interpretar: no restringe ningún periodo y es igual de compatible con una barra de error algo subestimada.',
        'La amplitud de la variación es el doble del ruido, así que la detección es significativa.',
      ],
      because:
        'La tercera. La primera exagera gravemente un resultado de apenas dos sigmas. La segunda se equivoca en el sentido contrario: <em>sí</em> hay un planeta, y uno al que este sondeo resultó ser ciego, así que «no hay indicios» se queda corto respecto a lo que los datos no pueden decir. La cuarta es justamente el error que esta lección existe para evitar: un cociente entre amplitud y ruido no es una significación, porque no tiene en cuenta cuántos puntos hay, cómo se distribuyen, ni cuántos periodos distintos has buscado de forma implícita.',
      tip: 'Las barras de error subestimadas son la causa más común de un exceso leve de χ² en el trabajo real, y por eso la tercera opción la menciona.',
    },
    {
      title: 'Hazlo con la estrella de verdad',
      body: 'El instrumento de arriba es un modelo de la señal. Ahora ejecuta un calendario contra la propia simulación.\n\nAbre <strong>Velocidad radial</strong> en la lista de Herramientas y marca <strong>Campaña de observación sintética</strong> al final del panel. Deja la cadencia en 0,32 días y el intervalo total en 3,52 (eso es el calendario A) y déjalo correr. Una órbita tarda unos trece segundos, así que todo el programa termina en aproximadamente ese tiempo.\n\nLas medidas están fechadas en días simulados, no en fotogramas, de modo que un portátil lento y uno rápido registran los mismos doce números. Entre ellas no se registra nada.',
      checklist: [
        'Observa cómo las medidas van cayendo sobre la curva ideal discontinua, una a una',
        'Desmarca «Mostrar la señal ideal» y mira lo que tendría un observador real',
        'Cambia la cadencia a 3,52 y reinicia: el mismo panel produce ahora el calendario B',
      ],
      tip: 'La campaña se reinicia sola si cambias el calendario, cambias de estrella o mueves al observador: las medidas tomadas en condiciones distintas no son un mismo programa, y el panel no las va a concatenar.',
    },
    {
      title: 'Llévate los datos',
      body: 'Una campaña se puede exportar. Abre <strong>Exportar datos</strong> en el menú y elige <strong>Medidas de velocidad radial</strong>.\n\nEl archivo tiene una fila por medida y nada entre ellas: el instante en días, la velocidad medida, su incertidumbre, de qué estrella se trata y el calendario que la produjo. Los huecos del archivo son los huecos de la campaña de observación, y ese es el objetivo: un ajuste a estos datos tiene que lidiar con los mismos agujeros que uno real.\n\nComo el ruido procede de una semilla, todo el mundo en el aula que use la misma semilla tiene el mismo archivo, y quien use otra tiene otra extracción del mismo experimento.',
      tip: 'La incertidumbre es una columna junto a la velocidad, no una nota en una cabecera, así que no se queda atrás cuando se representan los datos.',
    },
    {
      title: 'Los límites de no encontrar nada',
      body: 'Apuntas el mismo programa de doce noches a otra estrella y obtienes un conjunto de datos plano: χ²/gdl cercano a 1, ningún exceso de dispersión y cobertura en fase completa para periodos de unos pocos días.',
      prompt:
        '¿Qué puedes concluir y qué no? Escribe dos o tres frases, y sé concreto sobre qué descarta realmente un resultado plano.',
      rubric:
        'Crédito completo por las dos mitades. Lo que descarta: planetas lo bastante masivos y cercanos como para producir una oscilación de velocidad holgadamente mayor que la precisión, en el rango de periodos que el calendario podía muestrear; a grandes rasgos, queda excluido un Júpiter caliente. Lo que no descarta: planetas más pequeños, cuya señal queda por debajo del ruido; planetas con periodos más largos que el intervalo total, que aparecen como una deriva demasiado lenta para verse o como ningún cambio; planetas con periodos que la cadencia solapa, exactamente como en el calendario B; y planetas en órbitas casi de frente, donde la componente del movimiento estelar a lo largo de la línea de visión es pequeña por masivo que sea el planeta.\n\nAcepta dos cualesquiera de las cuatro exclusiones. No aceptes «no hay planeta» sin matizar, ni «no aprendimos nada»: una no detección con una sensibilidad declarada es un resultado real y es la forma en que se publican los límites superiores. Una buena respuesta dice que la conclusión trata de una región del espacio de parámetros, no de la estrella.',
    },
    {
      title: 'La otra forma de encontrarlos',
      body: `Todo lo anterior ha vigilado el movimiento de la estrella. Hay un
             segundo método, y a él se debe la mayoría de los planetas que
             conocemos: vigilar el <strong>brillo</strong> de la estrella y
             esperar a que el planeta pase por delante.
             \n\nLa aritmética es más fácil que en el caso de la velocidad
             radial. Un planeta bloquea la fracción del disco estelar que cubre,
             así que la profundidad de la caída es solo un cociente de áreas:
             \n\n<strong>profundidad = (R<sub>planeta</sub> / R<sub>estrella</sub>)²</strong>
             \n\nSin masas, sin inclinación, sin espectroscopía. Pero el mismo
             problema estructural está esperando: que puedas ver la caída tiene
             muy poco que ver con que el planeta esté ahí, y mucho con
             decisiones tomadas antes de empezar a observar.`,
      tip: 'Los tránsitos exigen además que la órbita esté casi de canto. Para un Júpiter caliente las probabilidades son de una entre diez; para una Tierra a una unidad astronómica, de una entre doscientas.',
    },
    {
      title: '¿Cómo de profunda es una Tierra?',
      body: `El radio de la Tierra es de 6.371 km y el del Sol de 695.700 km.
             \n\nCalcula la profundidad del tránsito que vería un astrónomo
             alienígena cuando la Tierra cruza por delante del Sol, y dala en
             partes por millón.`,
      prompt: 'Profundidad del tránsito, en partes por millón',
      unit: 'ppm',
      hints: {
        concept: `El planeta bloquea la fracción del disco estelar que cubre, y
                  el área va con el radio al cuadrado.`,
        method: `Divide los radios, eleva el resultado al cuadrado y multiplica
                 por un millón para pasar de fracción a partes por millón.`,
      },
      worked: `6371 / 695700 = 0,009158. Al cuadrado son 8,39 × 10⁻⁵, es decir 84
               partes por millón: la estrella se atenúa ocho milésimas de uno por
               ciento durante unas trece horas, una vez al año.`,
      because: `Unas 84 ppm. Quédate con ese número: es toda la razón por la que
                encontrar otra Tierra es difícil, y vuelve dentro de unas
                pantallas como un planeta al que un telescopio real no llega.`,
      misconceptions: [
        {
          say: `Ese es el cociente de los radios, no el de las áreas. Un tránsito
                bloquea un disco, así que la profundidad va con el cuadrado.`,
        },
      ],
    },
    {
      title: 'Contra qué compite un tránsito',
      body: `Una profundidad es solo la mitad de la pregunta. La otra mitad es
             todo lo demás que hace oscilar el brillo medido de una estrella, y
             este instrumento lo pone todo uno al lado del otro.
             \n\nEmpieza con un caso real del extremo fácil: un Júpiter caliente
             de los que Kepler estuvo mirando cuatro años. 6.400 partes por
             millón de profundidad, un tránsito de cuatro horas, y seiscientos de
             ellos.
             \n\nLas barras de la izquierda son las contribuciones al ruido. La
             línea verde es la profundidad. El panel de la derecha es el aspecto
             que tendría de verdad la curva de luz plegada.`,
      checklist: [
        'Lee la cifra de profundidad sobre ruido bajo la curva de luz: unas 355',
        'Fíjate en lo lejos que queda la línea verde de profundidad respecto de cada barra de ruido',
        'Arrastra el número de tránsitos de 600 a 1 y mira qué le pasa al cociente',
        'Ahora vuelve a subirlo por encima de 600 y fíjate en lo poco que mejora',
      ],
      tip: 'Un cociente de 355 no es una detección marginal que se discuta. Este es el régimen en el que las preguntas interesantes son sobre el planeta y no sobre si existe.',
    },
    {
      title: 'El mismo planeta, desde tierra',
      body: `Coge ese planeta idéntico -misma estrella, mismas 6.400 ppm de
             profundidad, mismo tránsito de cuatro horas- y obsérvalo con un buen
             telescopio pequeño desde la superficie de la Tierra en vez de desde
             el espacio.
             \n\nEl aire sobre el telescopio es turbulento, la estrella sale y se
             pone atravesando masas de aire cambiantes, y el detector se calienta
             y se enfría a lo largo de la noche.`,
      prompt:
        'Observando el mismo tránsito de 6.400 ppm desde tierra en vez de desde el espacio, esperas que la profundidad sobre ruido caiga de 355 a aproximadamente:',
      options: [
        '250: la atmósfera cuesta algo, pero no mucho',
        '100: una penalización seria, y aun así una detección fácil',
        '2,5: de la certeza a la discusión',
        '0,1: completamente invisible',
      ],
      because: `Unas 2,5, que es un factor de ciento cuarenta. El planeta no ha
                cambiado, ni tampoco su profundidad; lo que ha cambiado es un
                suelo por debajo de la medida que ninguna cantidad de paciencia
                elimina. Los sondeos desde tierra sí encontraron Júpiteres
                calientes, pero tuvieron que observar miles de estrellas durante
                años para lograrlo, y esta es la razón.`,
    },
    {
      title: '¿Hasta dónde llega la paciencia?',
      body: `Cambia el instrumento a <strong>El mismo planeta, desde
             tierra</strong>.
             \n\nLa línea de profundidad no se ha movido. La barra de ruido
             blanco es mayor, como cabía esperar de un telescopio más pequeño.
             Pero la barra más grande es la del medio: el vaivén de la atmósfera
             de una noche a otra, que está correlacionado a lo largo de todo un
             tránsito y por tanto no se puede promediar dentro de una sola noche.
             \n\nAhora haz el experimento que importa: sube el número de
             tránsitos todo lo que dé de sí y vigila dos números, la razón y la
             fila que dice a qué llegaría una observación ilimitada.`,
      checklist: [
        'Lee la profundidad sobre ruido con tres noches: unas 4',
        'Arrastra el número de tránsitos a 300: cien veces más observación',
        'Vuelve a leerlo: unas 31, una mejora de casi ocho veces',
        'Ahora lee la fila del techo: unas 49, y no se mueve por mucho que arrastres',
      ],
      tip: 'Cien veces más datos han comprado un factor de ocho, no de diez, porque parte del presupuesto ya era el término persistente. Sigue arrastrando y la razón se acerca a 49 y se para. Ese número, y no el de noches, es el que decide si la medida es posible.',
    },
    {
      title: 'Tres clases de ruido, tres respuestas distintas',
      body: `El ruido suele enseñarse en dos clases. Aquí es más útil en tres,
             porque la del medio es la que decide cuánta observación merece la
             pena hacer.
             \n\nEl <strong>ruido blanco</strong> es independiente de una medida
             a la siguiente: conteo de fotones, ruido de lectura del detector.
             Los errores independientes se cancelan en parte, así que promediar N
             de ellos reduce el ruido en √N. Cae con el <em>tiempo total</em>
             pasado en tránsito, se acumule como se acumule.
             \n\nEl <strong>correlacionado dentro de un tránsito</strong> es el
             incómodo: granulación, el paso de una mancha, el detector
             calentándose durante una noche. Estos vagan a lo largo de
             <em>horas</em>, la duración de un tránsito, así que agrupar más fino
             dentro de un tránsito no gana nada. Pero un tránsito tres semanas
             después es una tirada nueva del mismo proceso, así que este término
             cae como la raíz cuadrada del <em>número de tránsitos</em>. No del
             tiempo: diez tránsitos de una hora le ganan a uno de diez horas para
             este término, y empatan para el ruido blanco.
             \n\nEl <strong>persistente</strong> es cualquier cosa atada a la
             propia observación: una estrella débil dentro de la apertura, un
             patrón del detector sobre el que cae el objetivo en cada órbita, un
             sesgo en el procesado. Es el mismo número equivocado siempre, así que
             promediar no le hace absolutamente nada. Este es el único suelo de
             verdad.
             \n\nAsí que la respuesta a «¿ayudará observar más?» es <em>casi
             siempre sí, y al final no</em>. Ayuda hasta que domina el término
             persistente, y la fila del techo te dice dónde está eso antes de
             gastar las noches.`,
      tip: 'Por eso los telescopios espaciales valen lo que cuestan, y no es solo que la atmósfera desaparezca. Por encima de ella el término correlacionado en horas es mucho menor y el persistente está mucho mejor caracterizado, y un sistemático que puedes medir es un sistemático que puedes restar.',
    },
    {
      title: 'Qué está fingiendo este modelo',
      body: `El panel hace dos supuestos sobre el término del medio y los dos son
             extremos.
             \n\nLo trata como <strong>perfectamente correlacionado</strong> a lo
             largo de un tránsito —de modo que un tránsito da una sola muestra
             independiente por fino que lo agrupes— y <strong>perfectamente
             independiente</strong> entre tránsitos, de modo que N tránsitos dan
             exactamente N muestras. El ruido real no es ninguna de las dos cosas.
             Un grupo de manchas vive semanas y será en parte el mismo en noches
             consecutivas. Un ciclo térmico puede repetirse con la órbita de la
             nave y ser así en parte persistente.
             \n\nLa verdad es una función de correlación, y los dos extremos son
             lo que muestra el panel: el término del medio es el mejor caso para
             observar más, el persistente es el peor. Un análisis real tiene que
             medir dónde entre ambos está de verdad el ruido, normalmente mirando
             cómo cae la dispersión de los puntos agrupados con el tamaño del
             grupo y viendo dónde deja de seguir √N.
             \n\nEso conviene saberlo antes de fiarse de un número de un panel
             como este. El modelo es una caricatura elegida para hacer visibles
             los dos extremos, no un presupuesto de ruido de ningún instrumento
             real.`,
      tip: 'El diagnóstico habitual es un «factor beta»: la razón entre la dispersión real de los residuos agrupados y la que predeciría el ruido blanco puro. Los artículos de tránsitos lo citan de forma rutinaria, y son comunes valores de 1,5 a 3, es decir que la verdad suele estar más cerca del extremo optimista que del pesimista, pero nunca en él.',
    },
    {
      title: 'Dos presupuestos, uno al lado del otro',
      body: `Lee la profundidad sobre ruido de dos de los ajustes, y la mayor
             contribución individual al ruido en cada uno.`,
      fields: [
        {
          label: 'Júpiter caliente con Kepler: profundidad sobre ruido',
          unit: '',
          hint: 'cociente',
        },
        {
          label: 'El mismo planeta desde tierra: profundidad sobre ruido',
          unit: '',
          hint: 'cociente',
        },
        {
          label: 'El mayor término de ruido desde tierra, en ppm',
          unit: 'ppm',
          hint: 'ppm',
        },
      ],
    },
    {
      title: '¿Dónde deja de pagar la paciencia?',
      body: `Desde tierra, tres tránsitos daban una razón de unas 4 y trescientos
             daban unas 31: una mejora real, pero no el factor de diez que
             predeciría una ley de raíz cuadrada pura. Sigue arrastrando y se
             acerca a 49 y se para.`,
      prompt: 'La mejor explicación es:',
      options: [
        'Los datos extra eran de peor calidad que los de las tres primeras noches',
        'Parte del presupuesto es persistente, así que a los términos que sí promedian se les acaba el margen',
        'Trescientos tránsitos siguen siendo pocos para que importe la raíz cuadrada',
        'La profundidad del tránsito cambia de una noche a otra',
      ],
      because: `Dos de los tres términos caen al observar más y uno no. Con tres
                noches domina el vaivén nocturno de la atmósfera, unas 1.440 ppm,
                y el persistente es solo 120; con trescientas noches el vaivén ha
                bajado a 144 y el persistente es lo más grande que queda. La ley
                de la raíz cuadrada nunca estuvo mal: se aplica a dos de los tres
                términos, y el tercero es el que fija el techo de 49. Decidir si
                ese techo es bastante alto es lo que te dice si merece la pena
                gastar las noches.`,
    },
    {
      title: 'El límite de lo que puede hacer un sondeo',
      body: `Ahora tres casos reales de TESS, en orden de dificultad.
             \n\n<strong>Supertierra</strong> es Pi Mensae c: el doble del radio
             terrestre, alrededor de una estrella lo bastante brillante como para
             verla a simple vista. Profundidad 290 ppm, y una detección genuina.
             \n\n<strong>Planeta rocoso en la zona habitable</strong> es TOI-700 d:
             más o menos del tamaño de la Tierra, pero alrededor de una estrella
             roja pequeña, así que la profundidad son unos respetables 547 ppm medidos por TESS. Su
             problema es un periodo de 37 días: aproximadamente un tránsito por
             sector de TESS, y costó un año de ellos.
             \n\n<strong>Gemela de la Tierra</strong> son las 84 ppm que calculaste
             antes, alrededor de una estrella como el Sol. Un tránsito de trece
             horas, una vez al año.`,
      checklist: [
        'Supertierra: profundidad sobre ruido de unas 5,3, una detección real y no precisamente cómoda',
        'Planeta rocoso: unas 1,75, a partir de once tránsitos reunidos a lo largo de un año',
        'Gemela de la Tierra: unas 0,54, el tránsito es más pequeño que el ruido que lo mide',
        'En la gemela de la Tierra, arrastra los tránsitos a 200 y mira cómo el cociente se para en torno a 1,2',
        'Fíjate en que la gemela de la Tierra tiene con diferencia el tránsito más largo y no le sirve de nada',
      ],
      tip: 'TOI-700 d es un planeta real, encontrado en 2020, y encontrarlo costó once sectores de datos de TESS más un reanálisis después de un error en los parámetros estelares originales.',
    },
    {
      title: '¿Qué haría falta?',
      body: `La gemela de la Tierra se queda en 0,54 -la caída es más o menos la
             mitad de la incertidumbre que la mide- y cien veces más observación
             la lleva a 1,2 y no más allá.`,
      prompt:
        'Para convertir eso en una detección, lo que de verdad tendría que cambiar es:',
      options: [
        'Más tránsitos, hasta que gane la ley de la raíz cuadrada',
        'Un tránsito más largo, para que cada evento aporte más datos',
        'Un suelo de ruido correlacionado más bajo: un instrumento más estable, o una estrella más tranquila',
        'Nada: un tránsito de 84 ppm está por debajo de cualquier medida posible',
      ],
      because: `El suelo persistente. Es lo que limita esta medida por mucho que se
                observe, así que bajarlo es la única jugada que cambia la
                respuesta, y es exactamente lo que hace una misión diseñada para
                ello. La cuarta opción merece rechazarse explícitamente: 84 ppm no
                está por debajo de lo físicamente medible, y Kepler midió de forma
                rutinaria tránsitos menos profundos que ese. Está por debajo de lo
                que <em>este</em> instrumento puede alcanzar alrededor de
                <em>esta</em> estrella, y la diferencia entre esas dos
                afirmaciones es todo el asunto de esta lección.`,
    },
    {
      title: 'Lo que decidiste antes de mirar',
      body: 'Dos métodos, y la misma lección dos veces.\n\nDoce medidas. Un instrumento. Un planeta, que estuvo ahí todo el tiempo.\n\nEl calendario A estableció, más allá de toda duda razonable, que la velocidad de esta estrella no es constante, a lo largo de un ciclo que muestreó de principio a fin. Eso no es lo mismo que haber detectado un planeta: es la prueba sobre la que un planeta pasa a ser, con diferencia, la mejor explicación, una vez que se demuestra que la variación se repite con un periodo definido y se descartan las demás causas.\n\nEl calendario B, con once veces el intervalo total y ni una medida menos, no pudo establecer ni siquiera eso. No está vacío: acota cuán grande pudo ser la oscilación de velocidad de la estrella en las dos fases que llegó a visitar, y esa es una restricción real aunque estrecha. Lo que no puede es decir nada sobre las otras ocho décimas del ciclo, que es donde vive este planeta.\n\nNinguno de los dos resultados es un fallo de los datos. Ambos se decidieron meses antes, cuando alguien escribió una cadencia. El calendario de observación forma parte del experimento y, como el resto del experimento, puede diseñarse bien o mal antes de que llegue un solo fotón.\n\nLa mitad de los tránsitos hizo el mismo planteamiento con otro mando. Un planeta, una profundidad, y una detección a 355 sigmas o una discusión a 2,5 dependiendo por completo de lo que hubiera por debajo de la medida. Y mientras que el fallo de la velocidad radial podía repararse observando de otra manera, el fotométrico en general no: pasado el suelo de ruido correlacionado, más noches compran más datos con la misma precisión y nada más. Una gemela de la Tierra no es indetectable en principio: es indetectable con ese instrumento, alrededor de esa estrella, y mejorar cualquiera de las tres cosas es un proyecto distinto de tener paciencia.\n\nQue es el resumen honesto de las dos mitades. La pregunta \u00ab¿puedes detectar este planeta?\u00bb nunca trata solo del planeta.',
      tip: 'Los sondeos reales se protegen del fallo de la velocidad radial con espaciados deliberadamente irregulares, varias longitudes geográficas y comprobando cualquier periodo candidato frente a la cadencia que lo encontró. Del fotométrico se protegen yendo al espacio, eligiendo estrellas tranquilas y modelando el ruido correlacionado en vez de fingir que se promediará solo.',
    },
  ],
};
