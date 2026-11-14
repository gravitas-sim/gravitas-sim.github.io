export const PLANET_OR_NOT_ES = {
  title: '¿Planeta o no?',
  subtitle:
    'Tres pruebas intentan rechazar un candidato a tránsito, y algunos candidatos no se pueden decidir: aprende qué significa una lista superada y qué no significa',
  objectives: [
    'Decir qué puede rechazar cada una de tres pruebas (profundidades impares y pares, un segundo eclipse y dónde baja la luz), y qué falso positivo se le escapa a cada una',
    'Leer un veredicto de aprobada, suspendida o no concluyente con su motivo, y decir por qué no concluyente es una respuesta y no un fallo',
    'Decir que un candidato que pasa todas las pruebas no está validado, y qué no pudieron ver las pruebas',
    'Decidir un candidato a partir de su lista y justificar la decisión, incluso cuando la decisión correcta es que los datos no pueden decidir',
  ],
  steps: {
    'a-dip-is-a-candidate': {
      title: 'Una caída es un candidato',
      body: `Una estrella se atenúa un poco, cada pocos días, durante unas horas. Podría ser un planeta que pasa por delante. También podría ser una estrella que pasa por delante de otra, con la luz de una tercera mezclada para que la caída parezca pequeña, o una pareja eclipsante junto al objetivo que los mismos píxeles también recogen. Una caída es solo un <strong>candidato</strong>. Verificar es el trabajo de intentar rechazarlo.\n\nEl panel verifica un candidato sintético con tres pruebas: si los tránsitos impares y pares tienen la misma profundidad, si hay un segundo eclipse media órbita después y, en imágenes de la estrella y de su vecina, si la luz que baja está en la posición del objetivo. Todos los candidatos de aquí los hizo un modelo, y el panel puede mostrar qué lo hizo.`,
    },
    'read-the-checklist': {
      title: 'Un candidato limpio',
      body: `Candidato A: los tránsitos impares y pares coinciden, no hay segundo eclipse, y la caída está en la posición del objetivo. Todas las pruebas dicen <strong>aprobada</strong>. El resumen del panel dice a qué equivale eso.`,
      prompt: '¿A qué equivale?',
      options: [
        'Es un planeta: pasó todas las pruebas',
        'No está rechazado, pero tampoco validado: las pruebas descartan algunos falsos positivos y dejan otros',
        'Está rechazado: un planeta debería suspender alguna prueba',
        'Las pruebas no dicen nada sobre él',
      ],
      hints: [
        'Lee la línea del resumen. ¿Usa la palabra planeta?',
        'Una prueba solo puede descartar lo que podía ver. Lee lo que dice cada prueba que podía ver.',
      ],
      because:
        'No rechazado, y no validado. Cada prueba descartó un tipo de falso positivo: estrellas desiguales con el doble del período, una binaria en el objetivo con un segundo eclipse, una vecina que se atenúa. Un candidato que sobrevive no se ha demostrado planeta; no se ha demostrado otra cosa con estas pruebas y estos datos. El panel nunca dice planeta.',
      misconceptions: [
        {
          say: 'Una lista superada no es validación. Aprobar significa que cada prueba buscó un tipo de falso positivo y no encontró ninguno que pudiera ver. Un planeta se confirma con otra evidencia, una masa medida por ejemplo, o con un argumento estadístico de que ningún falso positivo es probable.',
        },
        {
          say: 'Un planeta debería pasar todas las pruebas; pasar es lo que hace uno real. Lo que pasar no puede hacer es demostrar que nada más también pasaría.',
        },
      ],
    },
    'which-test-catches': {
      title: 'Caídas profundas y someras',
      body: `El candidato B alterna: sus caídas impares son profundas y las pares someras. Su luz viene de una pareja de estrellas desiguales junto al objetivo, cuyo período real es el doble del que muestra el candidato.`,
      prompt: '¿Qué prueba debería atraparlo?',
      options: [
        'Solo un telescopio mayor podría atraparlo',
        'El segundo eclipse media órbita después',
        'Las profundidades impares y pares: las caídas impares son los eclipses más profundos de la pareja y las pares los más someros',
        'Ninguna: una pareja de estrellas atenúa como un planeta',
      ],
      hints: [
        'Una pareja eclipsante tiene dos tipos de eclipse. ¿Cuál cuenta el período del candidato como caída uno y cuál como caída dos?',
      ],
      because:
        'Las profundidades impares y pares. Una pareja de estrellas desiguales tiene un eclipse profundo y uno somero. Tomadas a la mitad de su período real, una de cada dos caídas es profunda y las demás someras, y los tránsitos de un planeta no alternan. La prueba compara las dos profundidades con sus incertidumbres.',
    },
    'deep-and-shallow': {
      title: 'Rechazado dos veces',
      body: `Lee la lista del candidato B. Las profundidades impares y pares difieren mucho más que su incertidumbre, y la segunda prueba no encuentra segundo eclipse media órbita después. Las imágenes dicen que la luz que baja está a 1,5 píxeles del objetivo.`,
      prompt: '¿Qué pruebas lo rechazan?',
      options: [
        'Solo las profundidades impares y pares',
        'Las profundidades impares y pares, y las imágenes; la búsqueda de un segundo eclipse se aprueba',
        'Las tres',
        'Solo las imágenes',
      ],
      hints: [
        'Cuenta los veredictos que dicen suspendida. La prueba del segundo eclipse se aprueba cuando podía haber visto uno y no lo vio.',
      ],
      because:
        'Dos pruebas lo rechazan. Con el período del candidato, los dos eclipses de la pareja son las caídas impares y pares y el segundo eclipse es el otro tipo de caída, no uno nuevo media órbita después, así que la prueba 2 se aprueba. La prueba impar-par y las imágenes lo rechazan cada una por su cuenta: una prueba distinta llega al mismo rechazo por otro camino.',
      misconceptions: [
        {
          say: 'La prueba del segundo eclipse mira media órbita después de la caída que muestra el candidato. El segundo eclipse de esta pareja ya es una de las caídas del candidato, así que no hay nada a media órbita: esa prueba se aprueba, y hace bien.',
        },
      ],
    },
    'a-dip-on-the-target': {
      title: 'Una binaria en el objetivo',
      body: `Candidato C: las profundidades impares y pares coinciden, y las imágenes ponen la caída justo en el objetivo. Pero media órbita después de cada caída hay una segunda, más somera, con la mitad de profundidad que la primera.`,
      prompt: '¿Qué es C?',
      options: [
        'Un planeta con una luna',
        'No rechazado: dos de las tres pruebas se aprueban',
        'Rechazado: la segunda caída es un segundo eclipse demasiado profundo para la luz propia de un planeta, así que el objetivo es probablemente una binaria eclipsante',
        'Sin decidir: las pruebas discrepan',
      ],
      hints: [
        'Un planeta da algo de luz propia. ¿Cuán profundo puede ser su segundo eclipse comparado con su tránsito?',
      ],
      because:
        'Rechazado por el segundo eclipse. La luz propia de un planeta es una fracción pequeña de la de la estrella, así que el eclipse del planeta media órbita después es una fracción minúscula del tránsito; una caída de la mitad de profundidad significa que lo que cruza la estrella es otra estrella. Las imágenes y la prueba impar-par se aprueban porque la caída está en el objetivo y sus dos eclipses son iguales: cada prueba ve un tipo de falso positivo y este es de un tipo que no pueden ver.',
      misconceptions: [
        {
          say: 'Una prueba que suspende no queda en minoría frente a las que aprueban. Cada prueba busca un falso positivo distinto, así que una que ve el suyo basta para rechazar al candidato.',
        },
      ],
    },
    'no-frames': {
      title: 'Uno limpio sin imágenes',
      body: `El candidato D pasa las dos primeras pruebas, y no se tomaron imágenes, así que la tercera prueba no se hizo. El resumen dice <em>no rechazado</em>. Muestra qué lo hizo con <strong>Mostrar qué lo hizo</strong>.`,
      prompt: '¿Qué significa aquí no rechazado?',
      options: [
        'Que D es un planeta, porque ninguna prueba suspendió',
        'Que D debería rechazarse: un candidato al que le falta una prueba no puede pasar',
        'Solo que dos pruebas se aprobaron: la prueba que busca una vecina no se hizo, así que no dice nada, y D es una mezcla de dos estrellas iguales que la curva de luz sola no distingue de un planeta',
        'Que las imágenes se habrían aprobado',
      ],
      hints: [
        'Dos estrellas iguales con el doble del período: todas las caídas tienen la misma profundidad y no hay segundo eclipse a la mitad del período.',
      ],
      because:
        'D son dos estrellas iguales con el doble del período, junto al objetivo. Todas las caídas tienen la misma profundidad, así que las profundidades impares y pares coinciden, y no hay nada a la mitad del período, así que la prueba del segundo eclipse se aprueba. Solo las imágenes pueden decir que la luz que baja no está en el objetivo, y no se tomó ninguna. Una prueba que no se hizo no es una prueba aprobada.',
      misconceptions: [
        {
          say: 'Ninguna prueba suspendió porque las dos que se hicieron no pueden ver este tipo de falso positivo, y la que podía no se hizo. La ausencia de fallo no es evidencia cuando la prueba no podía fallar.',
        },
      ],
    },
    'inconclusive-is-an-answer': {
      title: 'No concluyente es una respuesta',
      body: `El candidato F es una caída débil en datos ruidosos, con imágenes débiles. Todas las pruebas dicen <strong>no concluyente</strong>, y dan un motivo: los datos son demasiado ruidosos para excluir lo que busca la prueba.`,
      prompt: '¿Qué deberías concluir sobre F?',
      options: [
        'Que es un planeta, porque ninguna prueba lo rechazó',
        'Que está rechazado, porque ninguna prueba lo aprobó',
        'Que las pruebas están rotas',
        'Nada sobre su naturaleza: los datos no pueden decidir, y el informe honesto dice qué lo decidiría, como más tránsitos o una imagen mejor',
      ],
      hints: [
        'El panel dice cuán grande una diferencia o un segundo eclipse podían haber visto los datos. Compáralo con lo que busca la prueba.',
      ],
      because:
        'Sin decidir. Una prueba se aprueba solo cuando podía haber visto lo que busca; con datos tan ruidosos no podía haber visto ni una diferencia grande, así que aprobar habría afirmado más de lo que los datos sostienen. Decirlo es el resultado: este candidato es indecidible con estos datos, y más tránsitos reducirían las incertidumbres hasta que una prueba pueda responder.',
      misconceptions: [
        {
          say: 'Ninguna prueba lo rechazó porque ninguna podía. Una prueba que se aprobaría fuera cual fuera la verdad no dice nada, y el panel no la deja aprobar.',
        },
      ],
    },
    'what-the-checklist-says': {
      title: 'Lo que dice la lista',
      body: `Un candidato a tránsito se verifica con pruebas que buscan cada una un falso positivo: las profundidades impares y pares para estrellas desiguales con el doble del período, un segundo eclipse para una binaria en el objetivo, y el lugar donde baja la luz para la binaria de una vecina. Una prueba responde aprobada, suspendida o <strong>no concluyente</strong>; solo se aprueba cuando podía haber visto lo que busca. Un candidato que ninguna prueba rechaza no está validado, y algunos candidatos no se pueden decidir con los datos disponibles. Los datos de aquí son sintéticos: la verificación real añade el ruido propio del detector, sistemáticos y más de una vecina.`,
    },
  },
};

export const PLANET_OR_NOT_DEEPER_ES = {
  steps: {
    'decide-e': {
      title: 'Decide E',
      body: `El candidato E es la misma mezcla de estrellas iguales que D, con imágenes. Lee la lista. Decídelo.`,
      prompt: '¿Cuál es tu decisión sobre E?',
      options: [
        'Sin decidir: las dos primeras pruebas se aprueban y la tercera no basta',
        'No rechazado: todas las pruebas se aprobaron',
        'Rechazado: las imágenes hallan la luz que baja a 1,8 píxeles del objetivo',
        'Un planeta',
      ],
      hints: [
        'Lee la tercera línea: la distancia de la caída al objetivo en píxeles, y el radio de exclusión.',
      ],
      because:
        'Rechazado por las imágenes. Las pruebas impar-par y del segundo eclipse se aprueban, porque dos estrellas iguales parecen un planeta en la curva de luz; la imagen diferencia pone la caída a 1,8 píxeles del objetivo, a 15 sigma, así que la luz que baja es de una vecina. La única prueba que podía ver este falso positivo lo encontró.',
      misconceptions: [
        {
          say: 'Ningún paso de esta investigación califica planeta como respuesta. Un candidato está rechazado, no rechazado o sin decidir.',
        },
      ],
    },
    'decide-g': {
      title: 'Decide G',
      body: `El candidato G pasa las tres pruebas, también las imágenes: la caída está a 0,17 píxeles del objetivo, dentro del radio de exclusión de 0,30 píxeles que declara el panel. Muestra qué lo hizo.`,
      prompt: '¿Cuál es tu decisión sobre G?',
      options: [
        'Rechazado: 0,17 píxeles no es cero',
        'Un planeta: pasó todas las pruebas',
        'No rechazado, no validado: las imágenes solo podían excluir una vecina a más de 0,30 píxeles, y la binaria de G está más cerca',
        'Sin decidir: las imágenes no fueron concluyentes',
      ],
      hints: [
        'La tercera línea dice a qué distancia tendría que estar una vecina para haberse visto. Compárala con dónde está la binaria de G.',
      ],
      because:
        'No rechazado, y el propio número del panel dice por qué eso es débil. La prueba podía situar la caída con unos 0,09 píxeles, así que podía excluir una fuente a más de 0,30; la binaria de G está a 0,15 píxeles del objetivo, dentro de ese radio, donde una vecina se ve igual que el propio objetivo. Pasa, y es un falso positivo. Más cerca de lo que las imágenes pueden separar, solo una velocidad o una imagen más nítida pueden decidir.',
      misconceptions: [
        {
          say: 'G pasa todas las pruebas y es una mezcla. Aprobar significa que no se halló nada que la prueba pudiera ver, y esta mezcla está por debajo de lo que las imágenes pueden ver.',
        },
        {
          say: 'Un desplazamiento de 0,17 píxeles es 2 sigma, no 3,44; la incertidumbre de la posición es de unos 0,09 píxeles, así que un desplazamiento tan pequeño no es un rechazo.',
        },
      ],
    },
    'decide-h': {
      title: 'Decide H',
      body: `El candidato H es un planeta cuyos tránsitos impares y pares sí difieren un 20 por ciento, en datos ruidosos. Las profundidades impares y pares dicen <strong>aprobada</strong>, el segundo eclipse dice <strong>no concluyente</strong> y las imágenes se aprueban.`,
      prompt: '¿Cuál es tu decisión sobre H?',
      options: [
        'No rechazado: las profundidades impares y pares se aprueban',
        'Rechazado: una prueba no se aprobó',
        'Un planeta',
        'Sin decidir: ninguna prueba suspende, y el segundo eclipse no pudo decidir; incluso la aprobación impar-par solo podía haber visto una diferencia grande',
      ],
      hints: [
        'La línea impar-par dice cuán grande una diferencia podía haber visto. ¿Es el 20 por ciento de la profundidad mayor que eso?',
      ],
      because:
        'Sin decidir. La prueba impar-par se aprobó porque las dos profundidades coincidieron dentro del ruido, pero el panel dice que solo podía haber visto una diferencia de un 37 por ciento de la profundidad; la diferencia real es del 20 por ciento, que no podía ver. La prueba del segundo eclipse no pudo decidir. Ninguna prueba suspendió y las aprobaciones son débiles: el informe es que los datos no pueden decidir.',
      misconceptions: [
        {
          say: 'La aprobación es real, pero solo dice que no hay una diferencia mayor que un 37 por ciento de la profundidad. Una diferencia del 20 por ciento pasa a menudo esta prueba con este ruido.',
        },
      ],
    },
    'read-the-power': {
      title: 'Lo que la prueba podía ver',
      body: `Para el candidato H, lee la línea impar-par: la menor diferencia entre las profundidades impares y pares que la prueba podía haber visto, como porcentaje de la profundidad. Luego di si una diferencia del 20 por ciento estaba a su alcance.`,
      fields: [{ label: 'Menor diferencia que podía ver' }],
    },
    'justify-the-set': {
      title: 'Justifica el conjunto',
      body: `Has decidido E, F, G y H. Una decisión sin sus razones no es un informe de verificación.`,
      prompt:
        'Para cada uno de E, F, G y H di si está rechazado, no rechazado o sin decidir, nombra la evidencia de la lista, y para los que no puedes decidir di qué observación los decidiría.',
      rubric:
        'Crédito por decidir E como rechazado por las imágenes, F como indecidible con los datos (todas las pruebas no concluyentes), G como no rechazado pero no validado porque su vecina está dentro del radio de exclusión de las imágenes, y H como sin decidir porque la aprobación impar-par no podía haber visto una diferencia del 20 por ciento; por nombrar la evidencia (la distancia y el radio, los motivos de no concluyente, la menor diferencia vista); por decir qué decidiría F y H (más tránsitos, una imagen mejor) y G (una velocidad o una imagen más nítida); y por no llamar planeta a ninguno. No califique la extensión.',
      rubricCriteria: [
        {
          name: 'Decide cada candidato a partir de su lista',
          levels: [
            {
              label: 'Completo',
              text: 'E rechazado, F sin decidir, G no rechazado y no validado, H sin decidir, cada uno como dice la lista.',
            },
            {
              label: 'En parte',
              text: 'Dos o tres de las cuatro decisiones coinciden con la lista.',
            },
            {
              label: 'Aún no',
              text: 'Una o ninguna coinciden, o se llama planeta a un candidato.',
            },
          ],
        },
        {
          name: 'Reconoce lo que no se puede decidir',
          levels: [
            {
              label: 'Completo',
              text: 'Dice por qué F y H no se pueden decidir (los datos son demasiado ruidosos para que las pruebas hayan visto lo que buscan) y por qué G no se puede excluir.',
            },
            {
              label: 'Aún no',
              text: 'Trata una aprobación como una prueba o un no concluyente como un fallo.',
            },
          ],
        },
        {
          name: 'Declara lo que las pruebas podían y no podían ver',
          levels: [
            {
              label: 'Completo',
              text: 'Usa los números del panel: la menor diferencia que podía ver la prueba impar-par, el radio de exclusión, el límite superior de un segundo eclipse.',
            },
            {
              label: 'Aún no',
              text: 'Da un veredicto sin un número del panel.',
            },
          ],
        },
        {
          name: 'Nombra una observación siguiente',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra una observación que ayudaría en al menos dos de F, G y H.',
            },
            { label: 'Aún no', text: 'No nombra ninguna.' },
          ],
        },
      ],
    },
    'the-exclusion-radius': {
      title: 'Cuán cerca es demasiado cerca',
      body: `Elige el candidato G. Lee, en la tercera línea, a qué distancia del objetivo está la caída y el radio de exclusión: a qué distancia tendría que estar una vecina para que las imágenes la hubieran visto.`,
      fields: [
        { label: 'Distancia de la caída al objetivo' },
        { label: 'Radio de exclusión' },
      ],
    },
    'what-a-pass-leaves': {
      title: 'Lo que deja una aprobación',
      body: `Lee la línea <em>Qué hacen los umbrales</em>: en conjuntos sintéticos con semilla dice con qué frecuencia los umbrales fijados rechazan un planeta real y con qué frecuencia pasa un falso positivo. Los umbrales se fijaron antes de que existiera el núcleo, y ningún conjunto incluye una vecina más cerca de lo que las imágenes pueden separar ni una binaria excéntrica cuyo segundo eclipse no esté a media órbita.`,
      prompt:
        'Nombra dos tipos de falso positivo que estas pruebas pasarían, di por qué ninguna de las tres puede verlos, y di qué necesita un planeta validado que una lista superada no tiene.',
      rubric:
        'Crédito por dos de: dos estrellas iguales con el doble del período sin imágenes (la prueba impar-par y la del segundo eclipse no pueden verlo), una vecina dentro del radio de exclusión de las imágenes, una binaria excéntrica cuyo segundo eclipse no está a media órbita (la búsqueda es en 0,5), un candidato demasiado ruidoso para cualquier prueba; y por decir que la validación necesita evidencia independiente, como una masa medida o un argumento estadístico sobre los falsos positivos que quedan. No califique la extensión.',
      rubricCriteria: [
        {
          name: 'Nombra falsos positivos que las pruebas no ven',
          levels: [
            {
              label: 'Completo',
              text: 'Nombra dos puntos ciegos reales y dice qué prueba no ve cada uno.',
            },
            {
              label: 'Aún no',
              text: 'Nombra menos de dos, o nombra un caso que una prueba sí atrapa.',
            },
          ],
        },
        {
          name: 'Dice qué necesita la validación',
          levels: [
            {
              label: 'Completo',
              text: 'Dice que la validación necesita evidencia que las pruebas no dan, como una masa o una probabilidad de que no quede ningún falso positivo.',
            },
            {
              label: 'Aún no',
              text: 'Dice que basta una lista superada, o no da razón.',
            },
          ],
        },
        {
          name: 'Declara los límites',
          levels: [
            {
              label: 'Completo',
              text: 'Dice qué no incluyen los conjuntos sintéticos.',
            },
            {
              label: 'Aún no',
              text: 'Trata las tasas como ciertas para datos reales.',
            },
          ],
        },
      ],
    },
  },
};
