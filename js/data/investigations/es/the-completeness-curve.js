// La curva de completitud - español, paso a paso con ../the-completeness-curve.js.
export default {
  title: 'La curva de completitud',
  subtitle: 'Corregir una función de luminosidad y decir qué sesgo queda',
  objectives: [
    'Decir qué es una curva de completitud y qué deja fuera una cuenta bruta de las estrellas de un intervalo',
    'Corregir una función de luminosidad ponderando cada estrella contada por el volumen en que pudo verse',
    'Juzgar un valor corregido frente a su error de Poisson, y decir cuándo la corrección no puede ayudar',
    'Decir qué sesgo queda cuando la corrección usa las magnitudes del propio catálogo',
    'Declarar, para un resultado corregido, un supuesto y un sesgo residual',
  ],
  steps: [
    {
      title: 'Un sondeo que se desvanece',
      body: 'Un sondeo real no cuenta todas las estrellas por encima de su límite. La fracción que halla baja a medida que las estrellas se debilitan: la <strong>curva de completitud</strong>. En este instrumento es una curva que vale el 50 por ciento en una magnitud y cae en una anchura indicada.\n\nLa otra imagen es la <strong>función de luminosidad</strong>: cuántas estrellas hay por parsec cúbico en cada magnitud absoluta. Como las estrellas son sintéticas, conocemos la verdadera (gris). La cuenta <em>bruta</em> (un cuadrado abierto) solo divide las estrellas contadas de cada intervalo entre el volumen del cono; el valor <em>corregido</em> (un punto, con su error de Poisson) pondera cada estrella contada por 1 ÷ el volumen en que pudo contarse.',
    },
    {
      title: '¿Cuánto pierde una cuenta bruta?',
      body: 'El sondeo tiene un límite de 20 y es completo al 50 por ciento ahí, con un borde nítido, así que cuenta casi toda estrella que alcanza. Toma el intervalo más débil, magnitudes absolutas de 10 a 12, y todavía no cambies el instrumento.',
      prompt: 'Una cuenta bruta de ese intervalo recuperará&hellip;',
      options: [
        'cerca de la mitad de las estrellas que hay, porque las enanas rojas solo se ven cerca',
        'todas: el sondeo es casi completo',
        'casi ninguna',
        'más de las que hay',
      ],
      hints: [
        'Recuerda a qué distancia se ve una enana roja con un límite de 20, comparada con la profundidad del cono.',
      ],
      because:
        'Cerca de la mitad. Incluso con un borde nítido, una estrella de magnitud absoluta 11 se pierde más allá de 630 parsecs, dentro de un cono de 1.000 parsecs de profundidad. El paso siguiente lee el número.',
    },
    {
      title: 'Bruta frente a verdad, con un borde nítido',
      body: 'El límite es 20 y el sondeo es completo al 50 por ciento en 20, con un borde nítido. En los dos intervalos más débiles, lee la <strong>cuenta bruta como parte de la verdad</strong>: el intervalo de M = 8 a 10 y el de 10 a 12.',
      fields: [{ label: 'Intervalo 8 a 10' }, { label: 'Intervalo 10 a 12' }],
    },
    {
      title: '¿Por qué es baja la cuenta bruta?',
      body: 'El sondeo llega al mismo límite para toda estrella, pero una estrella de magnitud absoluta 11 lo alcanza a 630&nbsp;parsecs y una de magnitud absoluta 7 a 4.000, que está fuera del cono.',
      prompt:
        '¿Por qué se queda corta la cuenta bruta para las estrellas más débiles?',
      options: [
        'Una estrella débil solo puede contarse en parte del cono, así que la cuenta sale de un volumen menor que aquel entre el que se divide',
        'Hay menos estrellas débiles de las que dice el modelo',
        'Las estrellas débiles son más azules y más difíciles de ver',
        'La curva de completitud está mal',
      ],
      hints: [
        'Compara el volumen en que se ve una estrella débil con el volumen del cono.',
      ],
      because:
        'Cada estrella débil se ve solo dentro de un volumen menor (una distancia al cubo), así que una cuenta dividida entre todo el cono sale demasiado pequeña. Dar a cada estrella contada un peso de 1 ÷ su propio volumen devuelve las estrellas que faltan.',
    },
    {
      title: 'Corrige un sondeo que se desvanece pronto',
      body: 'Ahora el sondeo es completo al 50 por ciento en la magnitud 17, mucho antes de su límite de 20, y se desvanece en media magnitud (el segundo ajuste). Lee la <strong>cuenta bruta como parte de la verdad</strong> en el intervalo de M = 8 a 10, y el valor <strong>corregido</strong>.',
      fields: [
        { label: 'Bruta, intervalo 8 a 10' },
        { label: 'Corregido, intervalo 8 a 10' },
      ],
    },
    {
      title: '¿Es 0,97 igual a 1?',
      body: 'El valor corregido es 0,97, con un error de Poisson de 0,06. Es una parte del valor verdadero, así que 1 sería exacto.',
      prompt: '¿Cómo debe leerse 0,97 ± 0,06?',
      options: [
        'Compatible con 1: la diferencia es menor que el error, así que la corrección recupera la verdad dentro del ruido',
        'Mal: no es exactamente 1',
        'Prueba de que el sondeo es completo',
        'Solo vale cuando el sondeo es completo',
      ],
      hints: ['Compara la distancia a 1 con el error.'],
      because:
        'Compatible con 1. La diferencia, 0,03, es la mitad del error. El error es la parte de la respuesta que es azar: contar 368 estrellas da una dispersión de un 5 por ciento, y un resultado dentro de ella ni confirma ni refuta la corrección.',
    },
    {
      title: 'Cuando una corrección no puede ayudar',
      body: 'Pasa a un sondeo pobre: límite 17, 50 por ciento en 16, un desvanecimiento ancho (el tercer ajuste). En el intervalo de M = 10 a 12, lee cuántas estrellas se <strong>contaron</strong> y el error de Poisson del valor corregido. Cada una de esas estrellas lleva un peso grande.',
      fields: [
        { label: 'Estrellas contadas, intervalo 10 a 12' },
        { label: 'Error del valor corregido' },
      ],
    },
    {
      title: 'Corrige con las magnitudes del propio catálogo',
      body: 'Hasta ahora la corrección usó la magnitud absoluta verdadera de cada estrella, que solo un sondeo sintético conoce. Un analista tiene la magnitud aparente y la paralaje medidas y calcula con ellas la magnitud absoluta. Vuelve al primer ajuste. En el intervalo de M = 10 a 12, lee el valor corregido con magnitudes verdaderas y el valor <strong>con las magnitudes del propio catálogo</strong>.',
      fields: [
        { label: 'Corregido, magnitudes verdaderas' },
        { label: 'Corregido, magnitudes del catálogo' },
      ],
    },
    {
      title: 'Infórmalo',
      body: 'Corregiste una función de luminosidad de un sondeo con una curva de completitud que se desvanece y la mediste contra una verdad que un sondeo real no te da.',
      prompt:
        'En tres o cuatro frases, informa del resultado corregido: el supuesto, la coincidencia con la verdad y el sesgo que queda.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Una cuenta bruta de las estrellas de un intervalo sale baja para las estrellas débiles porque cada una solo puede verse en parte del cono. Ponderar cada estrella contada por el volumen en que pudo verse recupera la función de luminosidad dentro de su error de Poisson, incluso para un sondeo que se desvanece mucho antes de su límite, siempre que se contara alguna estrella de cada clase. Una corrección hecha con las magnitudes del propio catálogo deja un sesgo, aquí del 60 por ciento en el intervalo más débil, por los errores de la medición. El resultado que informar es el valor corregido, su error, el supuesto en que descansa y el sesgo que queda.',
    },
  ],
};
