export const PLAN_AN_EXPOSURE_ES = {
  title: 'Planifica una exposición',
  subtitle:
    'Cuánto exponer una estrella débil para una señal a ruido de 20, qué la limita, qué cuestan dividirla, el aire y la Luna, y qué responde una imagen',
  objectives: [
    'Planificar la exposición que alcanza una señal a ruido objetivo para una estrella en una banda, un cielo y un seeing declarados, y nombrar el término del presupuesto de ruido que la limita',
    'Decir qué cuestan dividir una exposición en más imágenes, una masa de aire mayor y un cielo más brillante, y por qué',
    'Comprobar el plan con una imagen sintética medida con fotometría de abertura, y decir qué muestra el acuerdo y qué no',
    'Decir cuándo un objetivo no se alcanza dentro del límite de exposición, y qué omite el cálculo',
  ],
  steps: {
    'what-a-plan-is': {
      title: 'Un plan a partir de la ecuación',
      body: 'El <strong>planificador de exposición</strong> toma una instalación de la biblioteca de instrumentos (aquí la cámara del Observatorio Rubin en la banda r), un objetivo y una señal a ruido que alcanzar, y devuelve la exposición que pide la ecuación del CCD, el presupuesto del ruido y el objeto más débil que alcanza esa exposición. A su lado hay una <strong>imagen sintética</strong> de ese mismo plan, y la fotometría de esa imagen.\n\nLos valores que declara la biblioteca (la escala de píxel, el ruido de lectura, el brillo del cielo, el seeing) vienen de su tabla citada. Los que no declara (la parte de la luz que entrega el sistema, la corriente oscura) son <strong>valores didácticos</strong>, y el panel los lista como aportados por Gravitas. El cálculo es una <strong>predicción</strong>: omite el error de aplanado, el apiñamiento y el cielo cambiante, y no es una garantía.',
    },
    'predict-the-limit': {
      title: 'Qué limita una estrella débil',
      body: 'Una estrella de magnitud 24 en la banda r, vista desde el suelo con el seeing que declara la biblioteca, es débil pero no imposible para un telescopio de 8 metros. Todavía no leas el planificador.',
      prompt:
        'El mayor término del presupuesto de ruido para esta estrella será&hellip;',
      options: [
        'Los fotones de la propia estrella',
        'Los fotones del cielo en la abertura',
        'La corriente oscura',
        'El ruido de lectura de la cámara',
      ],
      hints: [
        'La estrella es miles de veces más débil que el cielo en un disco de seeing de este tamaño.',
      ],
      because:
        'El cielo. En la abertura el cielo emite mucha más luz que la estrella, así que el ruido es el ruido de disparo del cielo, y el plan está limitado por el cielo. Las estrellas más brillantes están limitadas por sí mismas; las más débiles, en exposiciones cortas, por la cámara.',
    },
    'the-plan': {
      title: 'El plan para una señal a ruido de 20',
      body: 'Con Rubin en <strong>r</strong>, una magnitud de <strong>24</strong>, una señal a ruido objetivo de <strong>20</strong> y <strong>2</strong> exposiciones, lee la <strong>exposición total</strong> y el <strong>objeto más débil (5σ)</strong> que alcanza esa exposición.',
      fields: [
        { label: 'Exposición total' },
        { label: 'Objeto más débil (5σ)' },
      ],
    },
    'predict-more-exposures': {
      title: 'Dividir la exposición',
      body: 'Deja la misma estrella y el mismo objetivo. Un telescopio a menudo no puede tomar una sola imagen larga: el cielo satura el detector o un rayo cósmico la estropea. Supón que el plan se divide en 20 exposiciones más cortas.',
      prompt:
        'El tiempo total para alcanzar la misma señal a ruido será&hellip;',
      options: [
        'Mucho menor, porque cada imagen es más corta',
        'El mismo: la luz recogida es la misma',
        'Algo mayor, porque la cámara se lee 20 veces',
        'Mucho mayor: el ruido crece con el número de imágenes',
      ],
      hints: [
        'La estrella y el cielo recogen luz todo el tiempo. ¿Qué se paga una vez por cada imagen?',
      ],
      because:
        'Algo mayor. La luz de la estrella y del cielo se recoge durante todo el tiempo, se divida como se divida, pero el ruido de lectura se paga una vez por imagen, así que 20 imágenes llevan 10 veces el ruido de lectura de 2, y algo más de tiempo total recupera la calidad.',
    },
    'twenty-exposures': {
      title: 'Veinte exposiciones',
      body: 'Pon las exposiciones en <strong>20</strong> y lee la <strong>exposición total</strong> y la parte del ruido al cuadrado que tiene ahora el <strong>ruido de lectura</strong>, en por ciento.',
      fields: [
        { label: 'Exposición total' },
        { label: 'Parte del ruido de lectura' },
      ],
    },
    'airmass-cost': {
      title: 'Lo que cuesta el aire',
      body: 'Vuelve a 2 exposiciones. En el cenit el plan tarda 455,3 segundos. Pon la <strong>masa de aire</strong> en 2 (una estrella a 30 grados sobre el horizonte): la estrella se atenúa con la extinción que declara la biblioteca para la banda y el seeing se ensancha como la masa de aire elevada a 0,6.',
      prompt:
        '¿Cuántas veces mayor es la exposición total con una masa de aire de 2 que en el cenit?',
      hints: [
        'Pon la masa de aire en 2, lee la exposición total y divide entre 455,3.',
      ],
      worked:
        '1288 ÷ 455,3 = 2,83. La extinción atenúa la estrella 0,13 magnitudes, y el desenfoque crece de 0,65 a 0,99 segundos de arco, lo que mete más cielo en la abertura: las dos cosas cuestan tiempo, la segunda más, y por eso los sondeos evitan la masa de aire alta.',
      feedback: {
        close:
          'Casi. Divide la exposición con masa de aire 2 entre la del cenit.',
        'wrong-order-of-magnitude':
          'Un factor pequeño, unos pocos como mucho: las dos exposiciones son de cientos de segundos.',
        off: 'exposición con masa de aire 2 ÷ exposición en el cenit.',
      },
    },
    'the-moon': {
      title: 'Lo que cuesta la Luna',
      body: 'Elige <strong>Las Cumbres 1,0 m, V</strong>, una magnitud de <strong>22</strong>, un objetivo de <strong>20</strong> y <strong>1</strong> exposición. Lee la exposición total con el cielo en el valor oscuro de la biblioteca, y luego con el cielo <strong>2 magnitudes más brillante</strong> (una Luna brillante).',
      prompt:
        '¿Cuántas veces mayor es la exposición con el cielo más brillante que con el oscuro?',
      hints: [
        'Lee 602 segundos con el cielo oscuro, pon el cielo 2 magnitudes más brillante, lee el nuevo total y divide.',
      ],
      worked:
        '3067 ÷ 602 = 5,09. Un cielo 2 magnitudes más brillante es 6,3 veces más luz, pero los fotones de la propia estrella son parte del ruido, así que la exposición crece algo menos que eso.',
      feedback: {
        close:
          'Casi. Divide la exposición con el cielo brillante entre la del cielo oscuro.',
        'wrong-order-of-magnitude': 'Un factor de unos pocos, entre 3 y 7.',
        off: 'exposición con Luna ÷ exposición sin ella.',
      },
    },
    'on-the-frame': {
      title: 'Lo que responde la imagen',
      body: 'Vuelve a <strong>Rubin, r</strong>, magnitud 24, 2 exposiciones, un objetivo de 20 y masa de aire en el cenit. La imagen junto a la lectura es una exposición sintética de exactamente ese plan, y sus dos filas dicen qué predice el cálculo para la abertura de la propia imagen y qué <em>mide</em> en ella la fotometría de abertura. Lee las dos señales a ruido.',
      fields: [
        { label: 'Señal a ruido predicha' },
        { label: 'Señal a ruido medida' },
      ],
    },
    'cannot-be-reached': {
      title: 'Un objetivo que el límite de exposición prohíbe',
      body: 'Pon el brillo en <strong>29</strong>: una estrella más de cien veces más débil que el límite de 5σ de una exposición de 455 segundos. El planificador tiene un límite de cuatro horas de exposición.',
      prompt: '¿Qué hace el planificador?',
      options: [
        'Devuelve una exposición larguísima, de 4 millones de segundos, como plan',
        'Dice que el objetivo no se alcanza dentro del límite de exposición, y da la señal a ruido que alcanzan cuatro horas',
        'Baja la señal a ruido objetivo hasta que quepa en cuatro horas',
        'Devuelve la exposición de cuatro horas como plan, porque es lo máximo permitido',
      ],
      misconceptions: [
        {
          say: 'La ecuación sí da ese número (4,4 millones de segundos, unos 51 días), pero un plan que nadie puede observar no es un plan: el planificador lo rechaza y dice por qué.',
        },
        {
          say: 'El planificador nunca cambia tu objetivo. Informa de lo que alcanza el límite, 1,1, para que decidas tú.',
        },
        {
          say: 'Cuatro horas alcanzarían una señal a ruido de 1,1, no de 20. Devolverlas como plan prometería una medida que la exposición no puede dar.',
        },
      ],
      hints: [
        'Lee la fila «Resultado». Un plan que no se puede hacer se rechaza, con el motivo.',
      ],
      because:
        'Dice que el objetivo no se alcanza dentro del límite de exposición, e informa de la señal a ruido que alcanzan cuatro horas, cerca de 1,1. Las exposiciones limitadas por el cielo crecen como el cuadrado de la señal a ruido, así que una estrella tan débil necesita semanas, y la respuesta honesta es no.',
    },
    'what-the-plan-leaves-out': {
      title: 'Lo que omite el cálculo',
      body: 'Lee la última fila del panel, «Lo que omite». Un estudiante planifica la exposición de una estrella muy brillante para una señal a ruido de 500.',
      prompt: '¿Qué es lo correcto decir de ese plan?',
      options: [
        'El plan es exacto: una señal a ruido de 500 es solo una exposición más larga',
        'El cálculo promete más de lo que el aplanado puede dar, cerca del 1 por ciento, así que la medida no llegará a 500 por mucho que se exponga',
        'El espejo del telescopio se dañará con una estrella tan brillante',
        'El ruido de lectura lo limita, así que más exposiciones lo arreglarán',
      ],
      misconceptions: [
        {
          say: 'La ecuación no tiene error de aplanado, así que sigue prometiendo más con el tiempo. Una imagen real se aplana a cerca de un uno por ciento, un suelo sobre el que el panel avisa por encima de 100.',
        },
        {
          say: 'Para una estrella brillante el ruido de lectura es un término pequeño; es el error de aplanado, que el cálculo no tiene, el que fija el suelo.',
        },
      ],
      hints: [
        'Mira el aviso que da el panel para una señal a ruido objetivo alta.',
      ],
      because:
        'El cálculo omite el error de aplanado y de resta del cielo, así que para estrellas brillantes sigue prometiendo más con el tiempo de lo que da una medida real. El panel avisa por encima de una señal a ruido de 100 (un valor didáctico declarado para un aplanado de cerca del uno por ciento). Una predicción no es una garantía.',
    },
    'what-you-worked-out': {
      title: 'Lo que averiguaste',
      body: 'Una estrella de magnitud 24 en la banda r de Rubin necesitó unos 455 segundos en dos exposiciones para una señal a ruido de 20, limitada por el cielo, y esos 455 segundos alcanzarían una estrella de magnitud 25,5 con una señal a ruido de 5. Veinte exposiciones costaron un 12 por ciento más de tiempo, todo de ruido de lectura; una masa de aire de 2 costó un factor 2,8; y un cielo 2 magnitudes más brillante, en el telescopio de 1 m, un factor 5. Un objetivo 5 magnitudes más débil fue rechazado, con la señal a ruido que alcanzarían cuatro horas. La imagen coincidió con la predicción en unas décimas, lo que permite una realización del ruido.\n\nEl plan es una <strong>predicción</strong>. Omite el error de aplanado y de resta del cielo, el apiñamiento y el centelleo, y tres de sus entradas son valores didácticos que la biblioteca no declara. Un calculador real de tiempos de exposición añade un margen; este muestra adónde va el tiempo.',
    },
  },
};
