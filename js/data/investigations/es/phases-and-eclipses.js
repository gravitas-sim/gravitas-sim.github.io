// Fases y eclipses - español, paso a paso con ../phases-and-eclipses.js.
export default {
  title: 'Fases y eclipses',
  subtitle:
    'Mide qué parte de la Luna está iluminada y averigua por qué los eclipses son raros',
  objectives: [
    'Medir la fracción iluminada de la Luna frente a su elongación respecto del Sol',
    'Predecir la fracción iluminada a una elongación dada',
    'Usar la latitud eclíptica de la Luna para decir si es posible un eclipse en una luna nueva o llena',
    'Explicar por qué los eclipses vienen en temporadas separadas medio año',
  ],
  steps: [
    {
      title: 'Una Luna que cambia',
      body: 'La Luna siempre tiene la mitad iluminada por el Sol. Lo que cambia es cuánto de esa mitad podemos ver, y eso depende de un solo ángulo: la <strong>elongación</strong>, el ángulo en el cielo entre la Luna y el Sol. En luna nueva es cercano a 0&deg;, en luna llena cercano a 180&deg;.\n\nEl instrumento es la Luna y el Sol del núcleo (un modelo calculado con series publicadas, no una imagen del cielo de esta noche). A la izquierda: los tres cuerpos vistos desde arriba, con la luz del Sol desde la izquierda. A la derecha: la Luna vista desde la Tierra. El control cuenta días desde la luna nueva del 29 de enero de 2025.',
    },
    {
      title: 'Predice el cuarto',
      body: 'En cuarto creciente la Luna está a 90&deg; del Sol en el cielo.',
      prompt: 'En ese momento, ¿qué parte del disco de la Luna está iluminada?',
      options: ['ninguna', 'un cuarto', 'la mitad', 'tres cuartos'],
      hints: [
        'Dibuja el Sol, la Tierra y la Luna desde arriba, con la Luna en ángulo recto con el Sol visto desde la Tierra.',
      ],
      because:
        'La mitad. «Cuarto» cuenta cuánto de su órbita ha recorrido la Luna, no cuánto está iluminado. Vista desde la Tierra en ángulo recto con el Sol, se ve exactamente la mitad del hemisferio iluminado. El paso siguiente lo mide.',
    },
    {
      title: 'Cuatro lecturas',
      body: 'Pon los días desde la luna nueva en cada valor y lee la fracción del disco que está iluminada.',
      fields: [
        { label: 'Iluminada a 3,7 días' },
        { label: 'Iluminada a 7,4 días' },
        { label: 'Iluminada a 11,1 días' },
        { label: 'Iluminada a 14,8 días' },
      ],
    },
    {
      title: 'Del ángulo a la fracción',
      body: 'La fracción iluminada del disco es (1 &minus; cos&nbsp;E)/2 para una elongación E. Compruébalo con una de tus lecturas (el instrumento da la elongación) y luego úsalo.',
      prompt: 'Fracción del disco iluminada cuando la Luna está a 60° del Sol',
      hints: ['cos 60° vale 0,5.', 'Pon la elongación en (1 − cos E) ÷ 2.'],
      worked: '(1 − cos 60°) ÷ 2 = (1 − 0,5) ÷ 2 = 0,25.',
      feedback: {
        close: 'Casi. (1 − cos E) dividido entre 2, con E en grados.',
        'wrong-order-of-magnitude': 'Una fracción del disco está entre 0 y 1.',
        off: 'Fracción iluminada = (1 − cos E) ÷ 2.',
      },
    },
    {
      title: 'Predice los eclipses',
      body: 'En cada luna nueva la Luna pasa entre la Tierra y el Sol.',
      prompt: 'Entonces los eclipses de Sol ocurren&hellip;',
      options: [
        'en cada luna nueva, 12 o 13 veces al año',
        'unas pocas veces al año',
        'solo una vez por década',
        'nunca, porque la Luna es demasiado pequeña',
      ],
      hints: [
        'Si hubiera un eclipse cada mes no sería nada notable. ¿Qué podría mantener a la Luna fuera de la línea al Sol?',
      ],
      because:
        'Unas pocas veces al año. La órbita de la Luna está inclinada, y la mayoría de las lunas nuevas pasan por encima o por debajo del Sol. El paso siguiente tabula las lunas nuevas y llenas de medio año.',
    },
    {
      title: 'Cuenta las oportunidades de eclipse',
      body: 'El instrumento lista todas las lunas nuevas y llenas de medio año con la latitud eclíptica de la Luna, y marca como eclipses posibles las que están a menos de 1,5&deg; de la eclíptica. Usa los dos preajustes de 2025 y cuenta las filas que dicen que es posible un eclipse.',
      fields: [
        { label: 'Eclipses posibles, enero a junio de 2025' },
        { label: 'Eclipses posibles, julio a diciembre de 2025' },
      ],
    },
    {
      title: 'A medio año de distancia',
      body: 'Los eclipses posibles de marzo caen en la luna llena del 14&nbsp;de marzo y los de septiembre en la luna llena del 7&nbsp;de septiembre.',
      prompt:
        'Días desde la luna llena del 14 de marzo hasta la del 7 de septiembre',
      hints: [
        'Cuenta los días del 14 de marzo al 14 de septiembre y ajusta por las fechas y la hora del día de la lista.',
        'La lista da la hora de cada luna llena en UT.',
      ],
      worked: 'De 2025-03-14 06:55 UT a 2025-09-07 18:11 UT hay 177,5 días.',
      feedback: {
        close:
          'Casi. Cuenta los días entre las dos marcas de tiempo de la lista.',
        'wrong-order-of-magnitude': 'Cerca de medio año, en días.',
        off: 'Resta las dos fechas: días del 14 de marzo al 7 de septiembre.',
      },
    },
    {
      title: 'Por qué no cada mes',
      body: 'Mira la columna de la latitud. La mayoría de las lunas nuevas están varios grados al norte o al sur de la eclíptica.',
      prompt: '¿Por qué los eclipses no son mensuales?',
      options: [
        'La órbita de la Luna está inclinada unos 5° respecto de la eclíptica, así que suele pasar por encima o por debajo del Sol y de la sombra de la Tierra',
        'La Luna es demasiado pequeña para cubrir el Sol',
        'La sombra de la Tierra es demasiado corta para llegar a la Luna',
        'La órbita de la Luna está en el mismo plano que la de la Tierra, pero es más lenta',
      ],
      hints: [
        'Compara la latitud de la Luna con el tamaño de los discos del Sol y de la Luna, de medio grado cada uno.',
      ],
      because:
        'La órbita inclinada cruza la eclíptica en dos puntos, los nodos. Solo cuando la luna nueva o llena ocurre a un mes o así de un nodo, lo que sucede más o menos cada seis meses, pueden alinearse el Sol, la Tierra y la Luna. Esas ventanas son las temporadas de eclipses.',
    },
    {
      title: 'Con tus palabras',
      body: 'Mira otra vez las parejas de eclipses de marzo y de septiembre.',
      prompt:
        'Explica, usando la latitud eclíptica de la Luna, por qué los eclipses vienen en temporadas.',
    },
    {
      title: 'Lo que has deducido',
      body: 'La fracción iluminada de la Luna la fija su elongación respecto del Sol, (1 &minus; cos&nbsp;E)/2. Un eclipse necesita una luna nueva o llena sobre la eclíptica, y la órbita inclinada de la Luna la pone ahí solo cerca de sus nodos, que el Sol alcanza más o menos cada medio año. El instrumento es un modelo de la geometría (un límite aproximado de 1,5&deg;), no un pronóstico de qué eclipse se ve desde dónde. La investigación siguiente sigue a los planetas.',
    },
  ],
};
