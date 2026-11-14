// Errantes en el cielo - español, paso a paso con ../wanderers-on-the-sky.js.
export default {
  title: 'Errantes en el cielo',
  subtitle:
    'Sigue a Marte, Venus y Júpiter por sus lazos, desde el cielo y desde arriba',
  objectives: [
    'Medir el comienzo, el final y la duración de un lazo retrógrado en el cielo',
    'Decir dónde está la Tierra respecto de un planeta exterior cuando este se mueve más rápido hacia el oeste',
    'Medir la mayor elongación de un planeta interior y explicar su límite',
    'Decir cuándo es retrógrado un planeta exterior',
    'Relacionar un lazo en el cielo con las órbitas vistas desde arriba',
  ],
  steps: [
    {
      title: 'Cinco errantes',
      body: 'La palabra antigua para un planeta es <em>errante</em>. Contra las estrellas fijas avanza hacia el este, casi siempre, luego se detiene, retrocede hacia el oeste un tiempo, se detiene y vuelve a avanzar hacia el este. La investigación hermana <strong>Por qué Marte va hacia atrás</strong> muestra la causa en las órbitas: la Tierra adelantando a un planeta más lento. Esta mide lo mismo desde el cielo.\n\nEl instrumento tiene dos vistas de una fecha, con el modelo de planetas del Laboratorio del Cielo (elementos de Standish, buenos a unos 0,2°): la trayectoria por el cielo durante 120 días a cada lado, y las órbitas vistas desde arriba, con la línea de visión de la Tierra (verde) al planeta (azul). El día&nbsp;0 es el 1&nbsp;de octubre de 2024.',
    },
    {
      title: 'Predice el lazo',
      body: 'Marte suele avanzar hacia el este entre las estrellas, algo menos de medio grado al día. Observa la fila «Cambio de longitud» al recorrer los meses siguientes. Todavía no muevas el control.',
      prompt: 'Durante los próximos meses, Marte&hellip;',
      options: [
        'seguirá avanzando hacia el este a ritmo constante',
        'se frenará, se detendrá, irá hacia el oeste un par de meses, se detendrá otra vez y reanudará hacia el este',
        'irá hacia el oeste para siempre',
        'se apagará y reaparecerá al otro lado del cielo',
      ],
      hints: ['Se llama movimiento retrógrado, y no dura.'],
      because:
        'Se frena, se detiene, va hacia el oeste unos dos meses y medio y luego se reanuda. El paso siguiente halla las fechas.',
    },
    {
      title: 'Encuentra el lazo',
      body: 'Con Marte seleccionado, recorre el control de fecha cerca del día&nbsp;60 y halla el primer número de día en que la fila de movimiento dice <strong>retrógrado</strong>. Luego halla el primer número de día, unos meses después, en que dice <strong>directo</strong> otra vez.',
      fields: [
        { label: 'Primer día de movimiento retrógrado' },
        { label: 'Primer día de movimiento directo otra vez' },
        { label: 'Duración del lazo retrógrado' },
      ],
    },
    {
      title: 'Dónde está el Sol',
      body: 'Recorre los días 100 a 112 y halla el día en que el cambio de longitud es el más negativo: Marte moviéndose hacia el oeste lo más rápido. Lee su elongación, el ángulo respecto del Sol, ese día.',
      prompt:
        'La elongación de Marte cuando se mueve más rápido hacia el oeste',
      hints: [
        'Observa la fila de cambio de longitud y toma el valor más negativo.',
        'La mayor elongación posible significa que el planeta está justo opuesto al Sol.',
      ],
      worked:
        'Más rápido hacia el oeste el día 106 (cerca del 12 de enero de 2025), con una elongación de 175°: casi opuesto al Sol, en oposición.',
      feedback: {
        close:
          'Casi. Lee la fila de elongación el día con el cambio de longitud más negativo.',
        'wrong-order-of-magnitude':
          'Una elongación es un ángulo en el cielo, nunca mayor que media circunferencia.',
        off: 'En el movimiento más rápido hacia el oeste, busca la fila de elongación.',
      },
    },
    {
      title: 'El mismo suceso desde arriba',
      body: 'El día en que Marte se mueve más rápido hacia el oeste, mira el panel de la derecha: la Tierra (verde), Marte (azul) y la línea entre ellos.',
      prompt: '¿Qué está haciendo la Tierra?',
      options: [
        'adelantando a Marte por la vía interior, así que la línea de visión gira hacia el oeste',
        'quieta mientras Marte retrocede en su órbita',
        'al otro lado del Sol respecto de Marte',
        'alejándose de Marte a su mayor velocidad',
      ],
      misconceptions: [
        {
          id: 'mars-goes-back',
          say: 'Marte nunca invierte su marcha en la órbita. Mueve el control del día y observa el punto azul: sigue en el mismo sentido.',
        },
      ],
      hints: [
        'Avanza el control unos días y observa cuál de los dos puntos se mueve más rápido.',
      ],
      because:
        'La Tierra se mueve más rápido que Marte y va por la vía interior. Al adelantarlo, la línea de visión hacia Marte retrocede contra las estrellas. Marte nunca da la vuelta. Es el mismo suceso que muestra Por qué Marte va hacia atrás al cambiar el sistema de referencia.',
    },
    {
      title: 'Lo más lejos de Venus respecto del Sol',
      body: 'Selecciona Venus. Recorre el control de fecha entre los días 60 y 140 y halla el día en que su elongación respecto del Sol es mayor. Lee la elongación y el número de día.',
      fields: [
        { label: 'Mayor elongación de Venus' },
        { label: 'Número de día de la mayor elongación' },
      ],
    },
    {
      title: 'Por qué 47 grados',
      body: 'La órbita de Venus tiene radio 0,723&nbsp;ua. La línea de visión desde la Tierra es tangente a la órbita de Venus cuando Venus está tan lejos del Sol como puede parecer, lo que forma un ángulo recto en Venus. En órbitas circulares, sen&nbsp;E = 0,723.',
      prompt: 'Mayor elongación de Venus en órbitas circulares',
      hints: [
        'Toma el seno inverso de 0,723.',
        'El valor medido es algo distinto porque las órbitas no son circunferencias.',
      ],
      worked:
        'arcsen(0,723) = 46,3°, cerca de los 47,2° medidos: las órbitas son ligeramente excéntricas.',
      feedback: {
        close: 'Casi. Usa el seno inverso de 0,723, en grados.',
        'wrong-order-of-magnitude': 'Una elongación está entre 0° y 180°.',
        off: 'E = arcsen(radio de la órbita en ua).',
      },
    },
    {
      title: 'El lazo de Júpiter',
      body: 'Selecciona Júpiter y halla, cerca del comienzo del intervalo del control, el primer día en que se mueve en retrógrado y el primer día en que vuelve a ir directo.',
      fields: [
        { label: 'Primer día de movimiento retrógrado' },
        { label: 'Primer día de movimiento directo otra vez' },
        { label: 'Duración del lazo de Júpiter' },
      ],
    },
    {
      title: 'Cuándo es retrógrado un planeta exterior',
      body: 'Compara Marte y Júpiter. En cada uno, el lazo está centrado en el día en que el planeta está opuesto al Sol.',
      prompt: 'Un planeta exterior es retrógrado&hellip;',
      options: [
        'durante un tiempo a cada lado de la oposición, cuando la Tierra lo adelanta',
        'cuando está cerca del Sol en el cielo',
        'solo en luna llena',
        'en una fecha fija cada año',
      ],
      hints: [
        'Compara la elongación el día del movimiento más rápido hacia el oeste con 180°.',
      ],
      because:
        'Cerca de la oposición la Tierra adelanta al planeta por la vía interior, y es entonces cuando la línea de visión retrocede. Cerca de la conjunción, con el planeta detrás del Sol, se mueve hacia el este lo más rápido. El lazo se repite cada periodo sinódico, no cada año.',
    },
    {
      title: 'Con tus palabras',
      body: 'Mira una vez más los dos paneles el día en que Marte va más rápido hacia el oeste.',
      prompt:
        'Explica cómo un planeta puede parecer ir hacia atrás sin invertir su órbita.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Marte fue retrógrado unos 79 días en torno a su oposición de enero de 2025, Júpiter unos 118 días, y el lazo aparece siempre que la Tierra adelanta a un planeta más lento. Venus nunca se aleja más de unos 47° del Sol porque su órbita está dentro de la nuestra. Son modelos del cielo (posiciones de planetas buenas a unos 0,2°), y cada uno puede comprobarse con un almanaque. La investigación siguiente usa las posiciones para planificar una noche en un telescopio.',
    },
  ],
};
