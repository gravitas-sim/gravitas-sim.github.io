export const WHY_THE_PERIOD_IS_WRONG_ES = {
  title: 'Por qué el período sale mal',
  subtitle:
    'Por qué mirar una vez por noche no distingue un período de sus alias, cómo diseñar una cadencia que sí, y cuánto cuesta un plan',
  objectives: [
    'Predecir qué período devuelve una búsqueda para una estrella observada una vez por noche a la misma hora, y decir por qué los datos no distinguen el período verdadero de sus alias',
    'Leer en el panel los alias que predice una cadencia y el veredicto (resuelto o ambiguo)',
    'Decir qué cambios de la cadencia deshacen el empate (tiempos irregulares) y cuáles no (más noches a la misma hora)',
    'Decir que un período citado de una búsqueda lleva la cadencia que lo produjo',
  ],
  steps: {
    'a-star-seen-once-a-night': {
      title: 'Una estrella vista una vez por noche',
      body: 'Una estrella se aviva y se apaga cada <strong>0,8 días</strong>, unas 19 horas. Puedes mirarla desde un observatorio, una vez por noche, durante cuarenta noches, a la misma hora cada noche. El panel de abajo es la vista de la búsqueda de períodos de ese plan: la curva azul es lo que devuelve la búsqueda para una señal <em>perfecta</em> en la frecuencia verdadera cuando se muestrea en tus épocas. El pico verdadero vale 1; cualquier otro pico es un <strong>alias</strong>, una frecuencia que tu cadencia no distingue de la verdadera. \n\nTodas las series son <strong>sintéticas</strong>: las hace el modelo, con el período fijado en 0,8 días. Nadie las observó.',
    },
    'predict-the-period': {
      title: '¿Qué dirá la búsqueda?',
      body: 'Cuarenta visitas, una por noche, siempre a la misma hora. El período verdadero es 0,8 días. Una búsqueda de períodos busca el período que mejor ajusta los puntos.',
      prompt: 'La búsqueda devolverá&hellip;',
      options: [
        '0,8 días, el período verdadero, porque es el único período que tiene la estrella',
        'El período verdadero y un período de unos 4 días ajustan los puntos igual de bien, así que los datos no pueden decir cuál',
        'Ningún período: cuarenta puntos son pocos para hallar uno',
        'Un período de exactamente un día, la separación de las visitas',
      ],
      hints: [
        'Mira la curva: ¿qué altura tiene el pico más alto aparte del verdadero?',
      ],
      because:
        'Los datos no los distinguen: una visita por noche a la misma hora se repite una vez por día sidéreo, así que una estrella que pulsa cada 0,8 días y otra que pulsa cada 4,04 días dan exactamente los mismos cuarenta puntos. La curva llega a 1 en el alias igual que en la verdad.',
    },
    'the-aliases': {
      title: 'Lee los alias',
      body: 'En el panel (<em>nocturna, hora fija</em>, período verdadero 0,8 días) lee las tres filas de alias. Una está cerca de 4 días. Escribe su período y la <em>preferencia en chi cuadrado</em> que dan los datos al período verdadero sobre él: cuántas veces peor que la verdad es un ajuste en el alias, en unidades del estadístico. Nueve o más es una preferencia clara.',
      fields: [
        { label: 'El alias cerca de 4 días' },
        { label: 'Preferencia en chi cuadrado por la verdad' },
      ],
    },
    'why-the-comb': {
      title: 'De dónde salen los alias',
      body: 'Los períodos de los alias son 4,04, 0,444 y 0,307 días, ninguno múltiplo ni fracción simple de 0,8. Pero una visita por noche los pone todos en la lista.',
      prompt: '¿Por qué los produce una cadencia de una visita por noche?',
      options: [
        'Las visitas se repiten una vez por día sidéreo, así que una frecuencia y la misma desplazada un ciclo por día se ven idénticas en cada visita',
        'La estrella pulsa en realidad en varios períodos a la vez',
        'El telescopio es demasiado pequeño para medir la estrella con exactitud',
        'Hay muy pocas visitas: con cien noches los alias desaparecerían',
      ],
      misconceptions: [
        {
          say: 'La estrella modelo tiene un solo período, 0,8 días. Los otros períodos están en el muestreo, no en la estrella.',
        },
        {
          say: 'El ruido no es el problema: una señal perfecta, sin ruido, tiene los mismos alias. Vienen de cuándo miras.',
        },
        {
          say: 'Más noches a la misma hora afilan todos los picos, alias incluidos. El peine sigue igual de alto.',
        },
      ],
      hints: [
        'Entre una visita y la siguiente la estrella completa un número entero de pulsos más una fracción. ¿Y si la fracción se repite?',
      ],
      because:
        'Entre dos visitas separadas un día la estrella avanza 1,25 pulsos, un cuarto más que un número entero. Una estrella que pulsara 0,25 veces al día avanzaría lo mismo, 0,25, así que en las visitas las dos se ven idénticas. Desplazar una frecuencia un ciclo por día, la tasa de visitas, no cambia nada de lo que las visitas pueden ver.',
    },
    'break-the-tie': {
      title: 'Deshaz el empate',
      body: 'Cambia la cadencia a <em>tres por noche</em>: las mismas cuarenta noches, pero cada noche tres visitas a horas distintas. Lee la fila del alias más fuerte: cuánto sube su pico, en por ciento del pico verdadero, y la preferencia en chi cuadrado que ahora dan los datos a la verdad.',
      fields: [
        { label: 'Alias más fuerte, por ciento del pico verdadero' },
        { label: 'Preferencia en chi cuadrado por la verdad' },
      ],
    },
    'what-breaks-it': {
      title: 'Qué deshace el empate',
      body: 'Podrías cambiar el plan de varias maneras.',
      prompt: '¿Cuál deshace el empate entre el período y su alias?',
      options: [
        'Mirar en tiempos irregulares, para que las visitas no se repitan todas a un mismo ritmo',
        'Mirar más noches, siempre a la misma hora',
        'Exponer más tiempo en cada visita',
        'Usar un telescopio mayor',
      ],
      misconceptions: [
        {
          say: 'Más noches a la misma hora dejan cada visita en el mismo peine. Prueba sesenta noches en el panel con la cadencia «nocturna, hora fija»: el alias sigue igual de alto que la verdad.',
        },
        {
          say: 'Una exposición más larga baja el ruido de cada punto. Los alias están en los tiempos de los puntos, no en su ruido.',
        },
        {
          say: 'Un telescopio mayor también baja el ruido. Una señal sin ruido tiene los mismos alias.',
        },
      ],
      hints: [
        '¿Qué tienen en común las cadencias del panel cuando el veredicto es resuelto?',
      ],
      because:
        'Los alias vienen de los tiempos. Solo una cadencia cuyas visitas no caen todas en un mismo peine baja el alias por debajo de la verdad; el ruido, la exposición y la apertura no intervienen.',
    },
    'the-wrong-answer': {
      title: 'La búsqueda que sonaba segura',
      body: 'Vuelve a <em>nocturna, hora fija</em> y activa <strong>Buscar en una serie</strong>. El panel hace la serie que daría el plan (0,8 días, con ruido) y ejecuta en ella la búsqueda de períodos. Devuelve unos <strong>0,266 días</strong>.',
      prompt: '¿Qué te dice ese resultado?',
      options: [
        'La estrella pulsa cada 0,266 días',
        'Ganó un alias: el período verdadero es uno de los que lista el panel, y estas visitas no pueden decir cuál',
        'La búsqueda está rota: debería haber hallado 0,8 días',
        'El ruido hizo pulsar más rápido a la estrella',
      ],
      misconceptions: [
        {
          say: 'Una búsqueda siempre devuelve un pico más alto, y aquí cuarenta picos son casi iguales. Cuál gana lo decide el ruido. El panel llamó ambigua a la cadencia antes de hacer ninguna búsqueda.',
        },
        {
          say: 'La búsqueda halló bien el pico más alto. La cadencia hizo iguales los picos.',
        },
      ],
      hints: ['Lee primero la fila del veredicto.'],
      because:
        'El veredicto era ambiguo antes de la búsqueda. Con un peine perfecto el período verdadero y sus alias son iguales, así que una búsqueda devuelve el que favorezca el ruido. Un período de una búsqueda vale lo que la cadencia que lo produjo.',
    },
    'the-cadence-comes-first': {
      title: 'Primero la cadencia',
      body: 'Los alias eran previsibles antes de la primera noche. La función ventana de las épocas dice qué períodos no distingue el plan, y el veredicto del panel dice si el ruido te deja escoger el verdadero. Un período que publiques debe llevar la cadencia que lo produjo, para que un lector pueda calcular también los alias. Los pasos más profundos diseñan una cadencia que deshace el empate, la comprueban en una serie, y miden la ventana, la cobertura de fase y el coste de un plan.',
    },
  },
};

export const WHY_THE_PERIOD_IS_WRONG_DEEPER_ES = {
  steps: {
    'design-a-cadence': {
      title: 'Diseña una cadencia',
      body: 'Tres visitas por noche funcionaron, pero cuestan el triple de tiempo de telescopio. Prueba <em>nocturna, hora varía</em>: una visita cada noche, pero su hora se mueve hasta 3,6 horas a un lado y a otro. Lee la fila del alias más fuerte.',
      fields: [
        { label: 'Alias más fuerte, por ciento del pico verdadero' },
        { label: 'Preferencia en chi cuadrado por la verdad' },
      ],
    },
    'how-many-resolve': {
      title: '¿Qué cadencias lo resuelven?',
      body: 'Recorre las cinco cadencias con 0,8 días, cuarenta noches y una amplitud cinco veces el ruido. Cuenta las que tienen el veredicto <em>resuelto</em>.',
      fields: [{ label: 'Cadencias que resuelven el período' }],
    },
    'verify-on-a-series': {
      title: 'Compruébalo en una serie',
      body: 'Toma <em>tres por noche</em> y activa <strong>Buscar en una serie</strong>. Lee el período que halla la búsqueda y su incertidumbre, de la cota de Cramér-Rao para las épocas y el ruido.',
      fields: [{ label: 'Período hallado' }, { label: 'Su incertidumbre' }],
    },
    'is-it-consistent': {
      title: '¿Es compatible con 0,8 días?',
      body: 'La búsqueda dice 0,8004 &plusmn; 0,0002 días. El período verdadero del modelo es exactamente 0,8.',
      prompt: '¿Es la medida compatible con la verdad?',
      options: [
        'Sí: está a 1,6 desviaciones estándar, dentro del intervalo del 95 por ciento de dos',
        'No: el intervalo no contiene 0,8',
        'No hay información suficiente: el período verdadero se desconoce, así que no se puede comparar nada',
        'Sí, pero solo porque la cadencia deshizo el alias; la incertidumbre no significa nada',
      ],
      misconceptions: [
        {
          say: 'Un intervalo de una sigma contiene la verdad solo unas dos veces de cada tres. Aquí la verdad está a 1,6 sigma, dentro de dos sigma.',
        },
        {
          say: 'En esta serie sintética la verdad se conoce (eso es lo que la hace una prueba del método). Con datos reales compararías dos medidas del mismo modo.',
        },
      ],
      hints: ['Divide la diferencia entre la incertidumbre.'],
      because:
        'La diferencia es 0,0004 días, 1,6 veces la incertidumbre. Un intervalo del 95 por ciento correcto contiene la verdad unas 95 veces de cada 100, y la validación del panel cuenta justo eso en 300 series (alrededor del 94 por ciento).',
    },
    'window-width': {
      title: 'El ancho de un pico',
      body: 'Lee la base de las cuarenta noches en la fila <em>Épocas</em> (el intervalo desde la primera visita hasta la última, en días). Un pico de la ventana tiene unos <strong>uno sobre la base</strong> de ancho, en ciclos por día: lo finamente que el plan puede distinguir dos frecuencias.',
      fields: [
        { label: 'Base' },
        { label: 'Ancho del pico en ciclos por día, uno sobre la base' },
      ],
    },
    'phase-coverage': {
      title: 'Cuánto del ciclo ves',
      body: 'Pliega las visitas sobre el período: cada una cae en una fase entre 0 y 1 de un pulso. Con la cadencia <em>nocturna, hora fija</em>, lee la fila <em>Cobertura de fase</em> con un período verdadero de <strong>0,8 días</strong> y luego de <strong>1,0 días</strong>: cuántas de las veinte casillas de fase tienen un punto, y el arco vacío más largo.',
      fields: [
        { label: 'Casillas llenas con 0,8 d' },
        { label: 'Arco vacío más largo con 0,8 d, en ciclos' },
        { label: 'Casillas llenas con 1,0 d' },
        { label: 'Arco vacío más largo con 1,0 d, en ciclos' },
      ],
    },
    'what-a-plan-costs': {
      title: 'Lo que cuesta un plan',
      body: 'El panel del plan pide a una instalación las noches en que un objetivo es útil: Cerro Tololo, un objetivo en declinación &minus;30, 14 noches, tres visitas por noche de 300 segundos más 60 de tiempo muerto. El tiempo es un sorteo con semilla (sorteo 3, 60 por ciento de noches despejadas, persistencia 0,5): pierde noches enteras. Lee la fila <em>Coste</em>: las horas pedidas y las ejecutadas.',
      fields: [
        { label: 'Horas pedidas' },
        { label: 'Horas ejecutadas' },
        { label: 'Horas perdidas por el tiempo' },
      ],
    },
    'the-plan-and-the-verdict': {
      title: '¿Distingue el plan el período?',
      body: 'Activa <strong>Buscar en la serie</strong> en el panel del plan y lee la fila <em>¿Distingue el plan el período?</em> con <em>tres visitas por noche</em>, y luego con <em>una visita por noche</em> (la visita va en el centro de la ventana cada noche, así que es otra vez el peine). Escribe la preferencia en chi cuadrado de cada una.',
      fields: [
        { label: 'Preferencia con tres visitas por noche' },
        { label: 'Preferencia con una visita por noche' },
      ],
    },
    'when-the-verdict-is-wrong': {
      title: 'Cuando el veredicto no se aplica',
      body: 'El veredicto compara una sinusoide en el período verdadero con una sinusoide en cada alias, en ruido blanco. Un objetivo real puede ser una binaria eclipsante con caídas bruscas, o una estrella con manchas que cambian.',
      prompt: '¿Qué le hace eso al veredicto?',
      options: [
        'Es solo el veredicto de una sinusoide: una señal brusca tiene armónicos con alias propios, y el ruido rojo puede fingir un pico, así que «resuelto» no es una garantía',
        'Nada: el veredicto es exacto para cualquier curva de luz',
        'Hace «ambigua» a toda cadencia',
        'Significa que hay que recalcular la ventana a partir de la curva de luz',
      ],
      misconceptions: [
        {
          say: 'El criterio supone una sinusoide y ruido blanco. Dice lo bien que la cadencia separa sinusoides; una curva de luz real puede salir peor.',
        },
        {
          say: 'La ventana es una propiedad solo de los tiempos, sea lo que sea lo que se observe. Por eso se puede calcular antes de la primera noche.',
        },
      ],
      hints: ['¿Qué supone el veredicto sobre la señal?'],
      because:
        'La ventana es exacta para los tiempos; el veredicto añade una suposición sobre la señal (una sinusoide en ruido blanco). Di lo que supusiste junto al período que publiques.',
    },
  },
};

export const DESIGN_THE_SCHEDULE_DEEPER_ES = {
  steps: {
    'the-site-sets-the-comb': {
      title: 'El peine que impone el sitio',
      body: 'La ventana que leíste para tus ocho noches tiene dientes porque el sitio impone un peine: una visita por noche se repite una vez por día sidéreo. Usa el panel de estrategia para el planeta de esta investigación (un período de 3,5 días, el ajuste más cercano) con <em>nocturna, hora fija</em> durante 24 noches. Lee el veredicto y el período del alias cerca de 1,4 días.',
      fields: [
        { label: 'Período del alias cerca de 1,4 días' },
        { label: 'Preferencia en chi cuadrado por la verdad' },
      ],
    },
    'an-irregular-night-costs-nothing': {
      title: 'Lo que compran los tiempos irregulares, en números',
      body: 'Cambia la cadencia a <em>tres por noche</em> durante las mismas 24 noches con 3,5 días. Lee la fila del alias más fuerte: cuánto sube y la preferencia que dan los datos al período verdadero.',
      fields: [
        { label: 'Alias más fuerte, por ciento del pico verdadero' },
        { label: 'Preferencia en chi cuadrado por la verdad' },
      ],
    },
    'what-the-verdict-assumes': {
      title: 'Lo que supone el veredicto',
      body: 'El panel de estrategia llama resuelta a una cadencia cuando el alias más cercano queda descartado por una preferencia en chi cuadrado de nueve o más para una sinusoide en ruido blanco.',
      prompt: '¿Qué debe acompañar a un período hallado en un horario así?',
      options: [
        'Las épocas, la amplitud sobre el ruido y los alias que predice la cadencia, para que un lector vea qué períodos se descartaron y con qué suposición',
        'Solo el período y su incertidumbre',
        'El telescopio que se usó',
        'Nada: un veredicto resuelto hace seguro el período',
      ],
      misconceptions: [
        {
          say: 'Un período sin su cadencia no se puede comprobar: el lector no sabe si un alias era posible.',
        },
        {
          say: 'Resuelto dice que la cadencia separa sinusoides en ruido blanco; no prueba que la estrella sea una sinusoide.',
        },
      ],
      hints: ['¿Qué necesitaría otro astrónomo para recalcular los alias?'],
      because:
        'Los alias se calculan de las épocas; que importen o no depende de la amplitud, el ruido y la forma de la señal. Las tres cosas van con el número.',
    },
  },
};
