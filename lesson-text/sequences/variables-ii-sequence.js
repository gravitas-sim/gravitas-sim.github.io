export const THE_METALLICITY_TERM_ES = {
  title: 'El término de metalicidad',
  subtitle:
    'Añade el contenido de metales de una galaxia a la relación período-luminosidad de las cefeidas, mira qué hace a una distancia y a su error, y mira dónde deja de estar comprobado el término citado',
  objectives: [
    'Escribir la relación período-luminosidad con un término de metalicidad y decir hacia dónde va el término citado',
    'Decir qué hace el término al módulo de distancia de una galaxia y a su distancia, y qué añade al error',
    'Decir que el coeficiente y el contenido de metales de las galaxias son valores citados con errores, y dónde se detiene la calibración citada',
    'Decir por qué una sola galaxia no puede decidir si hace falta el término',
  ],
  steps: {
    'a-term-for-the-gas': {
      title: 'Un término para el gas',
      body: `La ley de Leavitt dice que el período de una cefeida indica su brillo real. Para medir la distancia de una galaxia se calibra la ley donde la distancia se conoce, aquí la Gran Nube de Magallanes, y se lleva el desfase a las cefeidas de la otra galaxia. Eso supone que la ley es la misma en las dos. Podría no serlo: las estrellas se forman del gas, y el gas de galaxias distintas tiene cantidades distintas de elementos pesados, que los astrónomos llaman metales y miden como la abundancia de oxígeno, escrita [O/H] y dada en <strong>dex</strong> (un factor diez) respecto del Sol.
             \n\nLa ley recibe entonces un término más, el término de metalicidad, un coeficiente por [O/H]. El panel usa el coeficiente de Riess et al. 2022, &minus;0,217 &plusmn; 0,046 magnitudes por dex, y el [O/H] medio que dan para las cefeidas de cada galaxia. Ninguno se midió aquí; ambos son citados, y cada uno tiene un error que el panel lleva. Las cefeidas son auténticas. Se dibujan la relación y las cefeidas de la galaxia; las distancias están en la lectura.`,
    },
    'which-way-does-metal-go': {
      title: 'Hacia dónde van los metales',
      body: `Toma dos cefeidas con el mismo período, una en una galaxia rica en metales y otra en una pobre. No cambies todavía el panel. El coeficiente es negativo: una magnitud es menor cuanto más brillante es la estrella.`,
      prompt: 'La cefeida rica en metales es…',
      options: [
        'un poco más brillante que la pobre en metales',
        'un poco más débil que la pobre en metales',
        'exactamente igual de brillante: solo el período fija la luminosidad',
        'más brillante solo con períodos de más de treinta días',
      ],
      hints: [
        'Un coeficiente negativo por un [O/H] mayor hace menor la magnitud. ¿Una magnitud menor es más brillante o más débil?',
      ],
      because:
        'Un poco más brillante: &minus;0,217 mag por dex por una galaxia 0,2 dex más rica son &minus;0,04 mag. Una galaxia más rica que aquella en que se calibró la ley tiene cefeidas más brillantes de lo que dice esa ley, así que si omites el término las tomas por más cercanas de lo que están. No es polvo: la magnitud Wesenheit ya lo quita. El paso siguiente lo mide.',
    },
    'the-distance-twice': {
      title: 'La distancia dos veces',
      body: `El panel está en <strong>NGC 4258</strong>, con sus cefeidas puestas frente a las de la GNM. Lee el <strong>módulo de distancia</strong> con el término <strong>omitido</strong>, luego pon el término en <strong>incluido</strong> y léelo otra vez.`,
      fields: [
        { label: 'Módulo, sin el término' },
        { label: 'Módulo, con el término' },
      ],
    },
    'what-a-term-this-size-does': {
      title: 'Lo que hace un término de este tamaño',
      body: `Un cambio de 0,041 mag en el módulo parece pequeño. Un módulo es cinco veces el logaritmo de la distancia, así que un cambio de <em>s</em> magnitudes cambia la distancia en un factor diez elevado a <em>s</em> sobre cinco. Las filas de <strong>distancia</strong> dan las dos distancias; el cociente es la última fila de la lectura.`,
      prompt:
        '¿En qué porcentaje, aproximadamente, cambia la distancia al incluir el término?',
      options: [
        'Un 2 por ciento: poco junto a la distancia, y siempre en el mismo sentido para una galaxia más rica que la GNM',
        'Un 20 por ciento: una corrección a una magnitud es una corrección grande a una distancia',
        'Un 0,2 por ciento: una centésima de magnitud como mucho',
        'En nada: la distancia la fijan los períodos',
      ],
      hints: ['Diez elevado a 0,041 sobre cinco es el factor.'],
      because:
        '10^(0,0412/5) = 1,019: el término hace la galaxia un 1,9 por ciento más lejana, 7,59 Mpc frente a 7,74. Es poco junto al error de 2,3 por ciento de la distancia, y es un sesgo: tiene el mismo signo para toda galaxia más rica que la GNM, así que más cefeidas no lo quitarían.',
      misconceptions: [
        {
          say: 'Un módulo es un logaritmo: cinco magnitudes son un factor cien en distancia, así que cuatro centésimas de magnitud son solo unos pocos por ciento.',
        },
        {
          say: 'Los períodos fijan la luminosidad dentro de una calibración; la metalicidad mueve la propia calibración.',
        },
      ],
    },
    'what-the-term-adds-to-the-error': {
      title: 'Lo que el término añade al error',
      body: `Con el término incluido el módulo es 29,444 &plusmn; 0,053, y omitido 29,403 &plusmn; 0,051. Tres filas se suman al balance de errores: el error del coeficiente llevado sobre la diferencia de [O/H], y el error del [O/H] medio de cada galaxia llevado por el coeficiente. Léelas frente al error de las propias cefeidas de la galaxia.`,
      prompt: '¿Cómo cambia el término el error total?',
      options: [
        'Añade un poco, un 4 por ciento: los términos nuevos son 0,009, 0,011 y 0,004 mag, pequeños junto a los 0,043 de las cefeidas de la propia galaxia, y se suman en cuadratura',
        'Lo duplica: cada número citado trae su error y todos se suman',
        'Lo quita: una corrección hace exacta la distancia',
        'Lo deja igual: un número citado no tiene error',
      ],
      hints: [
        'Los errores independientes se suman en cuadratura, la raíz de la suma de cuadrados. ¿Qué término es el mayor?',
      ],
      because:
        'Un poco. La corrección mueve el módulo 0,041 y suma 0,009, 0,011 y 0,004 mag en cuadratura a un total que ya fijan las cefeidas de la galaxia (0,043) y la distancia de la GNM (0,026), así que el error pasa de 0,051 a 0,053. La corrección es mayor que el error que trae: por eso merece la pena.',
      misconceptions: [
        {
          say: 'Una corrección con un coeficiente citado y abundancias citadas vale lo que valen ellos, y el panel lleva sus errores.',
        },
        {
          say: 'El coeficiente es −0,217 ± 0,046 y cada [O/H] medio tiene una incertidumbre de 0,02 a 0,05 dex; el panel enumera lo que aporta cada uno.',
        },
      ],
    },
    'beyond-the-calibration': {
      title: 'Más allá de la calibración',
      body: `Pon la metalicidad de la galaxia en <strong>mía</strong> y el deslizador en el valor más bajo, &minus;0,6 dex por debajo de la GNM. La fila Intervalo avisa.`,
      prompt: '¿Qué significa el aviso?',
      options: [
        'El coeficiente se ajustó en un intervalo de [O/H] y esta galaxia queda fuera, así que la corrección es una extrapolación del término citado y no una comprobada',
        'La galaxia no puede ser tan pobre en metales',
        'El panel no puede calcular una distancia ahí',
        'Las cefeidas de la galaxia ya no siguen una relación período-luminosidad',
      ],
      hints: [
        'El intervalo se lee de la calibración citada, de la muestra más pobre a la más rica.',
      ],
      because:
        'La calibración citada abarca galaxias desde la PNM, en &minus;0,72, hasta unas pocas en +0,17 de [O/H]. Una galaxia en −0,89 está por debajo de todas, así que el término, una recta en [O/H], se usa donde nada lo comprobó. El panel da igualmente un número y lo dice, en vez de ocultar que es una extrapolación.',
      misconceptions: [
        {
          say: 'Nada dice que una galaxia así no pueda existir; el aviso trata de los datos de los que salió el coeficiente, no de la galaxia.',
        },
      ],
    },
    'what-the-term-says': {
      title: 'Lo que dice el término',
      body: `La relación de las cefeidas no es del todo la misma en todas partes: una galaxia más rica en metales que aquella en que se calibró la relación tiene cefeidas más brillantes con el mismo período, y omitir el término la sitúa demasiado cerca. Para NGC 4258 el efecto es de 0,04 magnitudes, un dos por ciento en distancia; para M101, aún más rica, un cuatro. El término viene con un coeficiente citado y abundancias citadas, cada uno con un error, y esos errores pasan al de la distancia. Se ajustó en un intervalo de abundancias, y fuera de él la corrección es una extrapolación. La imagen del <strong>efecto</strong> dibuja el cambio y su error por el coeficiente frente a la diferencia de [O/H].`,
    },
  },
};

export const THE_METALLICITY_TERM_DEEPER_ES = {
  steps: {
    'the-shift-for-m101': {
      title: 'M101 a mano',
      body: `Cambia la galaxia a <strong>M101</strong>. Su [O/H] citado es +0,10 y el de la GNM &minus;0,29. El término suma <em>&minus;&#947; &times; &#916;[O/H]</em> al módulo con &#947; = &minus;0,217. Calcula el cambio y compáralo con el del panel.`,
      prompt: 'El cambio del módulo de distancia, en magnitudes',
      hints: ['Δ[O/H] = 0,10 − (−0,29) = 0,39 dex.'],
      worked:
        '0,217 × 0,39 = 0,0846 mag, el cambio del panel para M101. Las cefeidas de M101 son 0,39 dex más ricas que las de la GNM, el doble de los 0,19 de NGC 4258, así que el cambio es el doble.',
      feedback: {
        close: 'Casi. Multiplica 0,217 por la diferencia de [O/H], 0,39.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: el cambio es menos de una décima de magnitud.',
        off: '0,217 × (0,10 − (−0,29)).',
      },
    },
    'the-distance-for-m101': {
      title: 'La distancia de M101',
      body: `La distancia cambia en diez elevado a <em>s</em> sobre cinco para un cambio de <em>s</em> magnitudes. Usa el cambio que hallaste para M101.`,
      prompt: '¿En qué porcentaje cambia el término la distancia de M101?',
      hints: ['10^(0,0846 / 5) − 1.'],
      worked:
        '10^(0,0846/5) = 1,040: un 4,0 por ciento, 6,95 Mpc sin el término y 7,23 con él. El efecto crece con lo lejos que está la abundancia de la galaxia de la del ancla, y es un sesgo, no dispersión: más cefeidas no lo quitarían.',
      feedback: {
        close:
          'Casi. Diez elevado a 0,0846 dividido entre cinco, menos uno, por cien.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: un cambio de menos de una décima de magnitud son unos pocos por ciento en distancia.',
        off: '(10^(0,0846 / 5) − 1) × 100.',
      },
    },
    'two-published-coefficients': {
      title: 'Dos coeficientes publicados',
      body: `El panel usa &minus;0,217 &plusmn; 0,046 (Riess et al. 2022). Otro ajuste a las cefeidas de la Vía Láctea y las Nubes de Magallanes (Breuval et al. 2022, tabla 4, la misma magnitud Wesenheit) da &minus;0,280 &plusmn; 0,078. Los dos coinciden dentro de 0,7 de su error combinado. Para NGC 4258, con &#916;[O/H] = 0,19 dex, calcula cuánto difiere el módulo entre los dos coeficientes.`,
      prompt: 'La diferencia de los dos cambios, en magnitudes',
      hints: ['(0,280 − 0,217) × 0,19.'],
      worked:
        '0,063 × 0,19 = 0,012 mag, la cuarta parte del error de 0,047 del módulo corregido: la elección del coeficiente está dentro del balance que el panel ya lleva (el error del propio coeficiente aporta 0,009 mag), así que dos valores publicados que coinciden dentro de sus errores no cambian la distancia más que su error.',
      feedback: {
        close:
          'Casi. Toma la diferencia de los dos coeficientes y multiplica por 0,19.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez: los dos cambios difieren en una centésima de magnitud.',
        off: '(0,280 − 0,217) × 0,19.',
      },
    },
    'does-one-galaxy-prove-the-term': {
      title: '¿Prueba una galaxia el término?',
      body: `NGC 4258 tiene una distancia por máseres de agua que no usa cefeidas: 29,397 &plusmn; 0,032. El panel la muestra. Con el término omitido la calibración de la GNM da 29,403 (0,1 de error combinado de los máseres); con él, 29,444 (0,8 de ellos).`,
      prompt: '¿Qué dice esta galaxia sobre el término?',
      options: [
        'Nada decisivo: ambos valores coinciden con los máseres dentro de sus errores, y el término aleja un poco la estimación de ellos; el argumento a favor del término viene de ajustar muchas galaxias y anclas juntas, no de una',
        'Que el término está mal, porque la estimación se alejó de los máseres',
        'Que el término es correcto, porque una corrección siempre es una mejora',
        'Que los máseres están mal',
      ],
      hints: [
        'Compara cada estimación con los máseres en unidades del error combinado, como permiten las filas del panel.',
      ],
      because:
        'Ninguna estimación está en tensión con los máseres: 0,1 y 0,8 errores combinados. Una galaxia con una diferencia de metalicidad de 0,19 dex no puede distinguir un término de ese tamaño de ninguno, porque su efecto, 0,04 mag, es menor que los errores de la comparación. El coeficiente citado sale de ajustar a la vez las cefeidas de muchos anfitriones y las tres anclas (Riess et al. 2022), una palanca mucho más fuerte, y este panel no repite ese ajuste.',
      misconceptions: [
        {
          say: 'Un movimiento de 0,8 errores combinados está bien dentro de lo que da el azar; no es evidencia contra nada.',
        },
        {
          say: 'Una corrección es una mejora solo si es la correcta, y una galaxia no lo demuestra.',
        },
      ],
    },
  },
};
