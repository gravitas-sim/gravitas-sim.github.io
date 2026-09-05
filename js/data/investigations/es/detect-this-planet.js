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
  duration: '15-20 min',
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
      body: 'Te han concedido doce noches en un espectrógrafo. No necesariamente doce noches seguidas: doce noches, para usarlas cuando quieras, repartidas por el tiempo que pidas.\n\nEl objetivo es la estrella en pantalla. En algún lugar a su alrededor, demasiado tenue para verse, puede haber o no un planeta. Tus doce medidas de la velocidad de la estrella son todas las pruebas que vas a tener.\n\nLa pregunta habitual es <em>¿hay un planeta?</em>. Esta lección plantea otra distinta, y es la que un observador tiene que responder primero: <strong>¿lo encontraría este calendario si lo hubiera?</strong>',
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
      body: 'Este instrumento planifica una campaña y te muestra con qué volvería a casa. Está puesto en el primer calendario: doce medidas, separadas unas ocho horas, que abarcan una sola órbita del planeta.\n\nLa curva discontinua es el planeta tal como lo conoce la simulación. Está dibujada para enseñar y <strong>no son datos</strong>: un sondeo real solo tiene los puntos y sus barras de error. El panel de la derecha pliega esas mismas medidas sobre un ciclo, que es donde el espaciado se hace visible.',
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
      body: 'Cambia al ajuste <strong>Calendario B: un ciclo de separación</strong>.\n\nEl panel izquierdo abarca ahora treinta y nueve días en lugar de tres y medio, y las doce medidas son casi una línea plana. El panel derecho enseña por qué: al plegarlas sobre el ciclo se amontonan en dos intervalos de diez.',
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
      title: 'Lo que decidiste antes de mirar',
      body: 'Doce medidas. Un instrumento. Un planeta, que estuvo ahí todo el tiempo.\n\nEl calendario A lo encontró sin discusión. El calendario B, con once veces el intervalo total y ni una medida menos, volvió a casa encogiéndose de hombros, y un estudiante al que solo se le entreguen los datos del calendario B, sin conocer la respuesta, habría escrito un artículo honesto diciendo que no encontró nada concluyente.\n\nEso no es un fallo de los datos. Es una decisión que se tomó meses antes, cuando alguien escribió una cadencia. El calendario de observación forma parte del experimento y, como el resto del experimento, puede diseñarse bien o mal antes de que llegue un solo fotón.',
      tip: 'Los sondeos reales se protegen de esto espaciando las observaciones de forma deliberadamente irregular, observando desde varias longitudes geográficas y comprobando cualquier periodo candidato frente a la cadencia que lo encontró.',
    },
  ],
};
