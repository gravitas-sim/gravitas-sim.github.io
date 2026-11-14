export const THE_CLOCK_THAT_DRIFTS_ES = {
  title: 'El reloj que se desajusta',
  subtitle:
    'Mide cuándo transita un planeta, dibuja a qué distancia cae cada tránsito de un reloj constante y lee la onda lenta que escribe un segundo planeta',
  objectives: [
    'Medir el instante de un tránsito con su barra de error y decir cuándo la barra puede leerse como tal',
    'Dibujar el diagrama O-C de un planeta y decir qué significan uno plano y una onda',
    'Leer el superperiodo y la amplitud de una onda, y decir qué fija el periodo (el par) y por qué un registro puede ser demasiado corto para uno',
    'Decir qué da y qué no da una amplitud: una masa solo si se suponen órbitas circulares',
  ],
  steps: {
    'a-clock-that-ticks': {
      title: 'Un reloj que marca el tiempo',
      body: 'Un planeta que cruza su estrella cada diez días es un reloj: el tránsito número n ocurre en un instante T0 más n veces el periodo. Para usarlo hace falta el instante de cada tránsito, y ese instante no se lee en una esfera. Se mide: se tiene la luz de la estrella durante unas horas alrededor del descenso, con ruido en cada punto, y se desliza una plantilla del descenso a lo largo del eje del tiempo hasta que ajusta lo mejor posible. El panel lo hace con un tránsito de un planeta de un sistema inventado y dice con qué seguridad. Los sistemas son sintéticos, hechos por el motor con el ruido añadido, de modo que el instante verdadero se conoce y la medida puede comprobarse.',
    },
    'one-transit-time': {
      title: 'El instante de un tránsito',
      body: 'El panel muestra el tránsito número 40 del planeta interior, con poco ruido (100 partes por millón por punto). Lee el <strong>instante central respecto de la previsión</strong> en minutos y la <strong>barra de error</strong> (una sigma) en minutos.',
      fields: [
        { label: 'Instante central respecto de la previsión' },
        { label: 'Barra de error (una sigma)' },
      ],
    },
    'a-bigger-error-bar': {
      title: 'Una barra de error mayor',
      body: 'Pon el <strong>ruido por punto</strong> en Típico, cuatro veces mayor. El mismo tránsito, medido de nuevo con luz más ruidosa. Lee la barra de error y la línea de debajo, que dice si la barra puede leerse como una.',
      prompt: '¿Qué le pasa a la barra de error del instante?',
      options: [
        'Crece unas cuatro veces: un ruido cuatro veces mayor en cada punto deja el instante cuatro veces menos cierto',
        'Se queda igual: el planeta cruzó en el mismo instante',
        'Crece un 40 por ciento, la raíz cuadrada de dos',
        'Se reduce, porque más ruido significa más puntos cerca del descenso',
      ],
      hints: [
        'El instante se fija por cómo cambia la luz en los bordes del descenso. ¿Qué hace el ruido en esos puntos con el lugar donde parece estar el borde?',
      ],
      because:
        'La barra de error pasa de 0,52 a 2,1 minutos, cuatro veces mayor, porque el instante se lee de la pendiente en los dos bordes del descenso y un ruido cuatro veces mayor emborrona cuatro veces dónde está el borde. Y con este ruido el panel añade que la barra de error es tan larga como los dos minutos entre puntos, y en ese régimen la dispersión real es mayor de lo que la barra dice: es una cota inferior, no un intervalo. La comprobación que lo halló está en la tabla de validación.',
      misconceptions: [
        {
          say: 'El planeta sí cruzó en el mismo instante verdadero. Lo que cambió es lo bien que la luz permite decir cuándo.',
        },
      ],
    },
    'a-steady-clock': {
      title: 'Un reloj constante',
      body: 'Ahora el registro entero. Para cada tránsito el panel toma el instante medido y le resta el que daría un reloj perfectamente constante, la recta ajustada a todos. Lo que queda es <strong>O menos C</strong>, observado menos calculado, en minutos, con su barra de error. Este es un par de planetas muy distintos en periodo (diez y veintisiete días), con el interior medido en unos cien tránsitos. Los puntos se dispersan en torno a medio minuto, que es lo que dicen las barras de error, y el panel indica que no hay señal sobre el ruido: este planeta tiene un reloj constante.',
    },
    'a-wave': {
      title: 'Un segundo planeta tira',
      body: 'Ahora un par cercano a una resonancia: el planeta exterior tarda casi el doble que el interior, veinte días y medio frente a diez. Cada vez que pasan, el exterior tira un poco del interior hacia delante o hacia atrás en su órbita, y los tránsitos llegan un poco pronto o tarde. El par no está exactamente en dos a uno, así que la geometría del tirón va cambiando.',
      prompt: 'El diagrama O-C del planeta interior…',
      options: [
        'se quedará plano: el reloj de un planeta no se entera de sus vecinos',
        'subirá en línea recta: el periodo del planeta es un poco distinto del supuesto',
        'oscilará despacio arriba y abajo en una onda regular, mucho más larga que el periodo de cualquiera de los dos',
        'saltará al azar unos minutos',
      ],
      hints: [
        'Una recta ya está quitada: el reloj con que se comparan los instantes es la mejor recta. ¿Qué tipo de cambio no podría absorber?',
      ],
      because:
        'Una onda lenta. Un cambio constante del periodo es una recta en los instantes y el reloj de línea recta lo absorbe; lo que no puede absorber es un empujón que crece y se apaga a medida que gira la geometría del par, y eso es una onda cuya longitud es el tiempo que tarda el par en volver a la misma disposición.',
    },
    'read-the-wave': {
      title: 'Lee la onda',
      body: 'El panel muestra el planeta interior del par cercano a dos a uno. Lee el <strong>superperiodo</strong>, la longitud de la onda en días, y su <strong>amplitud</strong>, la mitad de la oscilación de cresta a valle, en minutos.',
      fields: [{ label: 'Superperiodo' }, { label: 'Amplitud' }],
    },
    'the-pair-sets-it': {
      title: 'Lo fija el par',
      body: 'Pon el sistema en <strong>Lejos de la resonancia</strong>: diez y veintisiete días, con las mismas masas y el mismo ruido. Lee el veredicto.',
      prompt: '¿Qué dice el panel, y por qué?',
      options: [
        'Sin señal de TTV sobre el ruido: los planetas no están cerca de una resonancia, los empujones se compensan enseguida y lo que queda está muy por debajo del ruido',
        'La misma onda, solo más larga: dos planetas cualesquiera la hacen',
        'Sin señal, porque este planeta no tiene vecino',
        'No puede decirlo: el registro es demasiado corto',
      ],
      hints: [
        'La onda lenta viene de que el par va pasando despacio por la misma disposición. ¿Hay una deriva lenta así para estos dos periodos?',
      ],
      because:
        'Sin señal sobre el ruido. Con periodos que no están cerca de una razón simple la disposición de los dos planetas cambia deprisa y los tirones se compensan de una órbita a otra, de modo que los instantes se quedan a una fracción de minuto de la recta, por debajo del ruido de medio minuto. El vecino está ahí: simplemente no escribe una onda. Y el panel se niega a citar la relación para un par tan lejos de una resonancia de primer orden.',
      misconceptions: [
        {
          say: 'Dos planetas siempre tiran uno del otro, pero el tirón hace una onda lenta solo cuando los periodos están cerca de una razón simple. Lejos de una, el efecto es demasiado pequeño y rápido para verse.',
        },
      ],
    },
    'what-the-wave-says': {
      title: 'Lo que dice la onda',
      body: 'Los instantes de tránsito de un planeta son un reloj, y el reloj se mide: cada instante tiene una barra de error, y la barra puede leerse como tal solo cuando es bastante menor que la separación entre puntos. El diagrama O-C son esos instantes menos el mejor reloj de línea recta. Plano significa que el planeta guarda su hora; una onda lenta significa que algo tira de él, y la longitud de la onda es el superperiodo del par, que ninguno de los planetas tiene por sí solo. En esta investigación los sistemas los hace el motor con ruido añadido, y nada de lo que se ve es una estrella observada.',
    },
  },
};

export const THE_CLOCK_THAT_DRIFTS_DEEPER_ES = {
  steps: {
    'the-beat': {
      title: 'El pulso de dos relojes',
      body: 'El superperiodo no es un parámetro del ajuste, es aritmética con los periodos de los dos planetas. El par vuelve a la misma disposición cada <strong>1 / |2 / P<sub>exterior</sub> &minus; 1 / P<sub>interior</sub>|</strong> días (la resonancia dos a uno tiene j = 2). Lee el reloj del planeta interior en el panel, cambia al exterior y lee su reloj, y calcula el superperiodo.',
      fields: [
        { label: 'Periodo interior' },
        { label: 'Periodo exterior' },
        { label: 'Superperiodo' },
      ],
    },
    'a-different-pair': {
      title: 'Otro par',
      body: 'Cambia al par cercano a tres a dos (diez y quince días y medio, j = 3), planeta interior. Lee el superperiodo que halla el ajuste y el que da la relación con los dos periodos.',
      fields: [
        { label: 'Superperiodo ajustado' },
        { label: 'Según los periodos' },
      ],
    },
    'which-swings-more': {
      title: 'Cuál oscila más',
      body: 'En el par cercano a dos a uno la onda del planeta interior tiene una amplitud de unos 4,7 minutos. Cambia al exterior: su onda es de unos 1,6 minutos. El interior tiene 10 masas terrestres y el exterior 15.',
      prompt: '¿Por qué oscila más el planeta más ligero?',
      options: [
        'La oscilación de un planeta la mueve sobre todo la masa del otro, aquí la mayor, con un coeficiente mayor para el interior',
        'Porque el planeta interior es el más pesado',
        'Porque transita más a menudo y tiene más puntos en su onda',
        'Por el ruido: el exterior tiene menos tránsitos',
      ],
      hints: [
        'El tirón que mueve los tránsitos de un planeta es la atracción del otro. ¿Cuál atrae más, el de 10 o el de 15 masas terrestres?',
      ],
      because:
        'La amplitud de la oscilación de un planeta es proporcional a la masa del otro y a su propio periodo, con un coeficiente que depende de la resonancia y que aquí es mayor para el interior (unos 1,1 frente a 0,4). Así, el interior de 10 masas terrestres, atraído por el exterior de 15, oscila unas tres veces más que el exterior.',
      misconceptions: [
        {
          say: 'El planeta interior es el más ligero. La masa propia de un planeta no mueve mucho sus propios tránsitos; mueve los de su vecino.',
        },
      ],
    },
    'too-short-a-record': {
      title: 'Un registro demasiado corto',
      body: 'Vuelve al planeta interior del par cercano a dos a uno y pon la <strong>parte del registro</strong> en el 40 por ciento: los primeros 44 tránsitos, 430 días. La onda dura 345 días.',
      prompt: '¿Qué dice el panel, y por qué?',
      options: [
        'Hay señal, pero no superperiodo: el registro cubre 1,2 ciclos, y un periodo necesita al menos uno y medio, porque una recta puede absorber un trozo corto de una oscilación larga',
        'El mismo superperiodo, solo que con una barra de error mayor',
        'Sin señal: hay muy pocos tránsitos',
        'Un superperiodo de 430 días, la longitud del registro',
      ],
      hints: [
        'El reloj de línea recta se ajusta a los mismos tránsitos. ¿Qué puede hacer una recta con un tramo de onda menor que uno y medio ciclos?',
      ],
      because:
        'El panel indica que hay señal (la onda está ahí) pero se niega a dar un periodo: 430 días son 1,2 ciclos de una onda de 345 días, y la recta ajustada al registro absorbe parte de una oscilación tan corta, de modo que el periodo que saliera del ajuste sería arbitrario. Hacen falta unos 520 días. Esta es la comprobación que distingue un periodo largo de un registro corto.',
      misconceptions: [
        {
          say: 'Con un registro corto el ajuste puede devolver casi cualquier periodo, y una barra de error lo ocultaría. El panel se niega a dar uno.',
        },
      ],
    },
    'a-mass-if-circular': {
      title: 'Una masa, si las órbitas son circulares',
      body: 'Muestra <strong>qué dice la amplitud sobre la masa</strong>, para el planeta interior del par cercano a dos a uno. La amplitud de su onda es proporcional a la masa del planeta <strong>exterior</strong>, así que el panel convierte la amplitud medida en esa masa, <strong>si ambas órbitas son circulares</strong>, para una estrella de una masa solar, con un intervalo que recoge la medida y la exactitud de la relación. Lee la masa y los extremos del intervalo.',
      fields: [
        { label: 'Masa del planeta exterior' },
        { label: 'Extremo inferior' },
        { label: 'Extremo superior' },
      ],
    },
    'what-an-eccentricity-does': {
      title: 'Qué hace una excentricidad',
      body: 'La masa anterior suponía órbitas circulares. La amplitud depende también de las excentricidades de los planetas, a través de una combinación que el panel llama |Z|, que la amplitud no puede dar. El control está en 0,010. Las dos curvas del panel muestran, para las <em>mismas masas</em>, la amplitud mayor y la menor que podría dar cualquier dirección de esa excentricidad; lee a qué distancia están del valor circular.',
      prompt:
        '¿Qué le hace eso a una masa leída de la amplitud como si fuera circular?',
      options: [
        'Nada: la amplitud depende solo de las masas',
        'Podría equivocarse en decenas por ciento en un sentido u otro, un 45 por ciento en este sistema, y la amplitud sola no puede decir cuál',
        'Siempre saldría demasiado alta, pues los planetas excéntricos tiran más',
        'No importa salvo que la excentricidad supere 0,1',
      ],
      hints: [
        'Las curvas son para masas fijas. Si la amplitud se mueve sobre ellas, ¿qué hace con el número quien supuso una órbita circular?',
      ],
      because:
        'Para estas masas una combinación de excentricidades de 0,010 podría hacer que la amplitud estuviera entre el 55 y el 145 por ciento de la circular, de modo que quien supusiera órbitas circulares se equivocaría en decenas por ciento en cualquier sentido y la amplitud no tiene cómo decir cuál. Una puerta comprobó si un intervalo que admite una cota supuesta de la excentricidad es útil: cubría, pero sus extremos estaban unas cuatro veces separados, más que la cota fijada de antemano, así que Gravitas da la masa circular y declara la suposición, y no da el intervalo como cota.',
      misconceptions: [
        {
          say: 'A primer orden la amplitud es proporcional a la masa, pero tiene además un término con la excentricidad, y eso es lo que muestran las dos curvas.',
        },
      ],
    },
    'the-other-planet': {
      title: 'El otro planeta',
      body: 'Cambia al planeta <strong>exterior</strong>, cuya onda da la masa del <em>interior</em>, con el mismo |Z| de 0,010. La dispersión es ahora de aproximadamente &minus;73 a +127 por ciento.',
      prompt: '¿Por qué es mucho peor aquí la misma excentricidad?',
      options: [
        'La onda del planeta exterior tiene un coeficiente circular menor (unos 0,4 frente a 1,1), así que el mismo término de excentricidad es una parte mayor de ella',
        'Porque el planeta exterior es más pesado',
        'Porque el planeta exterior tiene menos tránsitos',
        'No es peor: el panel muestra otra magnitud',
      ],
      hints: [
        'La amplitud es una parte circular más una parte de excentricidad. Si la parte circular es menor, ¿qué le pasa a la proporción de la parte de excentricidad?',
      ],
      because:
        'La parte circular de la onda del planeta exterior lleva un coeficiente de unos 0,4 y la parte de excentricidad es la misma, así que la parte de excentricidad es casi tres veces mayor como proporción. Para este planeta la amplitud podría ser casi cero o más del doble de la circular, y una masa sacada de ella sería casi inútil sin conocer la excentricidad.',
      misconceptions: [
        {
          say: 'El coeficiente que multiplica la parte circular depende de la resonancia y de qué planeta es, no de lo pesado que sea el planeta.',
        },
      ],
    },
    'what-an-amplitude-cannot-say': {
      title: 'Lo que una amplitud no puede decir',
      body: 'Una amplitud da una masa solo junto con una suposición sobre la excentricidad. Con la suposición de que las órbitas son circulares el panel da la masa con su intervalo y lo dice; no da como cota un intervalo que admita la excentricidad desconocida, y no da la excentricidad. Las ondas de los dos planetas juntas llevan más (también sus fases), y eso es lo que usan los análisis publicados. Los sistemas son sintéticos, dos planetas en un plano, fuera de la anchura de la resonancia.',
    },
  },
};
