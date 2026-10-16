// El movimiento del Sol - español, paso a paso con ../the-suns-motion.js.
export default {
  title: 'El movimiento del Sol',
  subtitle: 'Medir el ápex solar a partir de estrellas cercanas en Gaia',
  objectives: [
    'Convertir el paralaje, el movimiento propio y la velocidad radial de una estrella en una velocidad tridimensional',
    'Medir la velocidad del Sol respecto de las estrellas cercanas como menos la velocidad media de ellas, con una incertidumbre',
    'Decir hacia dónde va el Sol (el ápex) y por qué no es la dirección de rotación de la Galaxia',
    'Explicar por qué el movimiento medio de las estrellas no es el sistema local en reposo, y qué es la deriva asimétrica',
    'Declarar, como supuesto, qué valor del movimiento del Sol respecto del sistema local en reposo se usa, y qué depende de esa elección',
  ],
  steps: [
    {
      title: 'Tres números, luego una velocidad',
      body: 'Gaia mide a qué distancia está una estrella (su <strong>paralaje</strong>) y con qué rapidez cruza el cielo (su <strong>movimiento propio</strong>). Juntos dan la rapidez de la estrella a través de tu línea de visión. Su <strong>velocidad radial</strong>, del corrimiento Doppler que conociste en Líneas y movimiento, da la rapidez a lo largo de ella. Tres números hacen una velocidad en el espacio.\n\nEl instrumento de abajo guarda 1.570 estrellas de Gaia DR3 que tienen velocidad radial. Resuelve cada una en <strong>U</strong> (hacia el centro galáctico), <strong>V</strong> (el sentido en que gira la Galaxia) y <strong>W</strong> (hacia el polo norte galáctico). La imagen muestra las estrellas a menos de 100 parsecs; cada número está en la lista de debajo. Las dos estrellas de arriba son marcadores.',
    },
    {
      title: 'Qué dice el promedio de los vecinos',
      body: 'Supón que el Sol se mueve a través de un enjambre de estrellas cercanas que, en conjunto, no van a ninguna parte. Todavía no cambies el instrumento.',
      prompt:
        'Visto desde el Sol, la velocidad media de las estrellas apuntará&hellip;',
      options: [
        'en sentido opuesto al movimiento del propio Sol',
        'en el mismo sentido que el movimiento del propio Sol',
        'a ninguna parte: promediará cero',
        'hacia el centro galáctico, haga lo que haga el Sol',
      ],
      hints: [
        'Piensa en caminar entre una multitud que está quieta: ¿hacia dónde parece que va la gente?',
      ],
      because:
        'En sentido opuesto. Para un observador en movimiento una multitud quieta fluye al revés, así que el movimiento del Sol es menos la velocidad media de las estrellas. Así lo mide exactamente el paso siguiente.',
    },
    {
      title: 'Mide la velocidad del Sol',
      body: 'Deja <strong>las estrellas a menos de 100 pc</strong> y mide respecto de <strong>la media de estas estrellas</strong>. En la lista, lee la <strong>U</strong>, la <strong>V</strong> y la <strong>W</strong> del Sol. La imagen muestra la velocidad de cada estrella vista desde el Sol, la cruz azul es su media y la flecha naranja, menos esa media, es el movimiento del Sol.',
      fields: [
        { label: 'U del Sol' },
        { label: 'V del Sol' },
        { label: 'W del Sol' },
      ],
    },
    {
      title: '¿Por qué V es la mayor?',
      body: 'Respecto de estas estrellas el Sol se mueve unos 10 km/s en U, 9 en W y 22 en V. La Galaxia gira a más de 200 km/s en la dirección V, así que V es donde siempre cabía un número grande.',
      prompt: '¿Cuál es la razón más probable de que V sea mayor que U o W?',
      options: [
        'Las estrellas como grupo se retrasan respecto de la rotación de la Galaxia, así que el Sol se adelanta a ellas',
        'Gaia mide V peor que U o W',
        'El Sol es una estrella fugitiva expulsada de un cúmulo',
        'El Sol es la única estrella que se mueve en el sentido de rotación',
      ],
      misconceptions: [
        {
          say: 'El error de V no es mayor que el de los otros en la lista (1 a 2 km/s). Los 22 km/s son una propiedad real del movimiento de estas estrellas.',
        },
      ],
      hints: [
        'Las estrellas más viejas y de movimientos más agitados se quedan atrás de la rotación. Los pasos siguientes le ponen nombre.',
      ],
      because:
        'El grupo se retrasa. Las estrellas de órbitas más agitadas (mayor dispersión de rapideces) se alejan y se retrasan respecto de la órbita circular; esto se llama deriva asimétrica. Respecto de un grupo rezagado, el Sol, que va en una órbita casi circular, parece adelantarse.',
    },
    {
      title: 'Usa más estrellas, de más lejos',
      body: 'Sube el límite a <strong>1.000 pc</strong> (el segundo preajuste), de modo que la muestra pase de unas 490 estrellas a las 1.570. Lee la <strong>U</strong> del Sol y su incertidumbre.',
      fields: [
        { label: 'U del Sol dentro de 1.000 pc' },
        { label: 'su incertidumbre' },
      ],
    },
    {
      title: '¿Respecto de qué sistema en reposo?',
      body: 'El movimiento del Sol respecto de <em>estas estrellas</em> no es todavía el movimiento del Sol respecto del movimiento circular de la Galaxia aquí, el <strong>sistema local en reposo</strong> (LSR). Las estrellas se retrasan respecto de él, en una cantidad que crece con lo agitadas que estén. La relación de Strömberg estima el retraso como σ<sub>U</sub>² ÷ 80&nbsp;km/s, a partir de la propia dispersión σ<sub>U</sub> de las estrellas; el instrumento la lista. Réstala y la V del Sol respecto del LSR es de unos <strong>4&nbsp;km/s</strong>.\n\nLa corrección es una afirmación sobre <em>esta muestra</em>: toma el retraso de lo agitadas que están estas estrellas, mediante una relación calibrada con otras estrellas. No mide directamente el LSR.\n\nSchönrich, Binney y Dehnen (2010) hicieron una determinación independiente del movimiento del Sol. Sostuvieron, con estrellas de distinta metalicidad, que el retraso depende de algo más que de la dispersión, y hallaron que la V del Sol es de <strong>12,24&nbsp;km/s</strong>. Los dos valores publicados difieren en unos 8&nbsp;km/s. Esta muestra no puede elegir entre ellos, y Gravitas tampoco: el tercer sistema del instrumento está rotulado como un supuesto, y así debe estarlo tu respuesta.',
    },
    {
      title: 'Anota los dos',
      body: 'A 100 pc, pon «Medir la V del Sol respecto de» en <strong>el LSR por la corrección de Strömberg</strong> y lee V. Luego ponlo en <strong>el LSR de Schönrich et al.</strong> y lee V otra vez. El segundo no se mide aquí: el instrumento lo adopta.',
      fields: [
        { label: 'V, corrección de Strömberg' },
        { label: 'V, Schönrich et al.' },
      ],
    },
    {
      title: '¿Hacia dónde va el Sol?',
      body: 'Abre el mapa del cielo con el LSR de Strömberg y luego con el de Schönrich. La cruz marca el <strong>ápex</strong>: el punto del cielo hacia el que se mueve el Sol. El centro galáctico está en medio del mapa, en l = 0°. El ápex se mueve entre los dos sistemas.',
      prompt: '¿Qué es cierto del ápex en cualquiera de los dos sistemas?',
      options: [
        'Está bien a un lado del centro galáctico: el Sol se mueve sobre todo alrededor de la Galaxia, no hacia su centro',
        'Es el centro galáctico',
        'Es el polo norte galáctico',
        'Es el mismo en los dos sistemas',
      ],
      misconceptions: [
        {
          say: 'El ápex estaría en l = 0° si U fuera la componente mayor. Lo es V: el Sol se mueve en el sentido de la rotación, a 90° del centro.',
        },
      ],
      hints: [
        'Compara la l del ápex con 0° (el centro) y 90° (el sentido de rotación).',
      ],
      because:
        'Bien a un lado: l queda a decenas de grados del centro en los dos sistemas (unos 20° y 49° a 100 pc), porque el movimiento del Sol tiene una V grande. Se mueve con la rotación de la Galaxia, y el ápex depende del LSR que se suponga.',
    },
    {
      title: 'Tu supuesto',
      body: 'Un informe de la rapidez del Sol tiene que decir qué sistema usó.',
      prompt:
        'Escribe la frase que pondrías en un informe: qué valor de la V del Sol respecto del LSR usas, y qué lo hace un supuesto.',
    },
    {
      title: 'Lo que has deducido',
      body: 'El paralaje, el movimiento propio y la velocidad radial hacen una velocidad. El movimiento del Sol respecto de las estrellas cercanas es menos su velocidad media, con una incertidumbre que viene de su dispersión: unos 10, 22 y 9&nbsp;km/s en U, V y W. Las estrellas se retrasan respecto de la rotación de la Galaxia, así que ese no es el movimiento respecto del sistema local en reposo. Corregir el retraso necesita un modelo, y dos modelos publicados difieren en 8&nbsp;km/s en V: una elección que una medición aquí no puede hacer, y por tanto un supuesto que declarar.',
    },
  ],
};
