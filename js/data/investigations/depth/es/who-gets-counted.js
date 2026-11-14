// Quién entra en la cuenta, más a fondo: las palabras en español, paso a paso con ../who-gets-counted.js.
export default {
  steps: [
    {
      title: 'La distancia a mano',
      body: 'Una estrella de magnitud absoluta M tiene magnitud aparente m a una distancia d, donde m − M = 5 log<sub>10</sub>(d ÷ 10 pc). El límite se alcanza cuando m lo iguala. Toma la estrella como el Sol (M = 4,74) y el límite 14.',
      prompt: 'La distancia a la que alcanza el límite',
      hints: [
        'Despeja d: d = 10 pc × 10 elevado a (m − M) ÷ 5, con m − M = 9,26.',
      ],
      worked:
        'm − M = 14 − 4,74 = 9,26, así que log₁₀(d ÷ 10) = 9,26 ÷ 5 = 1,852 y d = 10 × 10^1,852 = 711 pc. El instrumento indica el mismo número.',
      feedback: {
        close:
          'Casi. Comprueba que dividiste m − M entre 5 antes de elevar 10 a ese valor.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Diez parsecs es la distancia a la que m iguala a M; esta estrella se atenúa 9 magnitudes.',
        off: 'd = 10 pc × 10^((m − M) ÷ 5), con m − M = 14 − 4,74.',
      },
    },
    {
      title: 'Lo que compra una magnitud',
      body: 'Cada magnitud de profundidad permite contar una estrella de un brillo dado a una distancia 10<sup>0,2</sup> (1,585) veces mayor. Las estrellas están repartidas por igual, así que el número dentro crece como el <em>cubo</em> de la distancia.',
      prompt: '¿En qué factor crece el volumen por una magnitud más?',
      hints: ['Eleva 1,585 al cubo, o escríbelo como 10 elevado a 0,6.'],
      worked:
        '1,585³ = 3,98: unas cuatro veces las estrellas de cualquier brillo dado por cada magnitud de profundidad. Por eso un sondeo más profundo cuesta mucho más de lo que parece, y por eso la cuenta sigue subiendo hasta que se acaba el cono o la población.',
      feedback: {
        close: 'Casi. El volumen va como la distancia al cubo.',
        off: 'Factor de volumen = (10^0,2)³ = 10^0,6.',
      },
    },
    {
      title: 'La misma deriva en estrellas reales',
      body: 'El paquete del entorno solar (1.570 estrellas de Gaia DR3 con velocidades radiales, una muestra real limitada por lo que el espectrómetro de Gaia puede medir, hacia G = 14 a 15) permite hacer la misma pregunta a datos. Tomando la magnitud absoluta de cada estrella de su paralaje, la M<sub>G</sub> media es <strong>8,80</strong> para las 485 estrellas a menos de 100&nbsp;pc y <strong>4,23</strong> para las 686 de 500 a 1.000&nbsp;pc. (Las paralajes se usan tal cual, sin corrección del punto cero.)',
      prompt:
        '¿Cuánto más brillantes, en promedio, son las estrellas lejanas que las cercanas?',
      hints: ['Resta la media lejana de la media cercana.'],
      worked:
        '8,80 − 4,23 = 4,56 magnitudes, un factor de unos 67 en luminosidad. La muestra real deriva como la sintética, y por la misma razón: un límite de flujo admite solo las estrellas brillantes desde lejos. Nada de las estrellas cambió con la distancia; cambió la selección.',
      feedback: {
        close: 'Casi. Media cercana menos media lejana, en magnitudes.',
        off: 'Diferencia de las dos medias: 8,80 y 4,23.',
      },
    },
    {
      title: 'Lo que la muestra real no puede decir',
      body: 'La muestra de Gaia es un subconjunto: sus estrellas cercanas son una de cada 273 de las que pasan los cortes, las lejanas se muestrean con más densidad, y solo conserva estrellas con velocidad radial. En el sondeo sintético conocíamos cada estrella perdida.',
      prompt: '¿Qué no puede decir la muestra real que sí dice la sintética?',
      options: [
        'Cuántas estrellas de cada brillo se perdieron, porque no se conoce la población verdadera',
        'El brillo medio de las estrellas que sí contiene',
        'La distancia de sus estrellas',
        'Si las estrellas más brillantes son más raras',
      ],
      hints: [
        '¿Qué números necesitaban que conociéramos cada estrella del cono?',
      ],
      because:
        'Las estrellas perdidas. Con un catálogo real se desconoce el denominador, así que una corrección necesita un modelo de la selección (su límite y su completitud) y un supuesto declarado sobre lo que hay. Ese es el trabajo de la tercera investigación, y la razón de que existan los sondeos sintéticos: probar la corrección donde se conoce la respuesta.',
    },
    {
      title: 'La misma pregunta para planetas',
      body: 'Un sondeo de planetas tiene el mismo problema con dos causas más de fallo. Un planeta solo se ve si su órbita cruza nuestra línea de visión, que es cuestión de geometría y es más raro cuanto más ancha es la órbita, y solo si la búsqueda saca su caída del ruido de la estrella, que depende de la estrella y de cuántos tránsitos contiene su duración. La completitud de una casilla es las dos probabilidades multiplicadas y sumadas sobre las estrellas, y una tasa es los listados divididos entre ella, que es la corrección de la segunda investigación hecha para planetas. El panel de abajo contiene un sondeo sintético de 2000 estrellas.',
    },
    {
      title: 'En qué se convierte la cuenta',
      body: 'La casilla de 1 a 2 radios terrestres y 8 a 16 días lista 10 planetas, y el sondeo lista 82 planetas por cada planeta por estrella ahí. Pon la <strong>casilla de radio</strong> en 0,5 a 1 y la <strong>casilla de período</strong> en 128 a 256 para ver una casilla que el sondeo apenas podía ver.',
      prompt:
        '¿Qué necesita un sondeo de planetas que no necesitaba uno de estrellas?',
      options: [
        'Nada: dividir la cuenta entre la completitud',
        'La probabilidad de un tránsito además de la de una detección, y una negativa para las casillas que apenas podía ver',
        'Más estrellas',
        'Un límite más brillante',
      ],
      hints: [
        'Lee la fila de la completitud de las dos casillas, y la de la tasa de la segunda.',
      ],
      because:
        'La cuenta se divide entre una completitud que tiene dos partes, la geometría y la búsqueda, y donde baja de 5 planetas listados por cada planeta por estrella el sondeo no puede acotar la casilla: el panel no da ni tasa ni límite. Una cuenta de lo encontrado no es un censo de lo que hay, para planetas como para estrellas.',
    },
  ],
};
