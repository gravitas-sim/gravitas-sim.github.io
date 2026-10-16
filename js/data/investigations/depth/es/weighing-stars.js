// Weighing the Stars, deeper: the Spanish words, step for step with ../weighing-stars.js.
export default {
  steps: [
    {
      title: '¿Qué tan seguro es el total?',
      body: 'Tus dos medidas fueron lecturas, no valores exactos: los anillos son algo más anchos que una línea, y un cronómetro lo arranca y lo para una persona. Di cuánto podría desviarse cada una.\n\nLa masa es a³ / P², así que un error fraccionario en a cuenta tres veces y uno en P dos, y los errores independientes se suman en cuadratura: σ<sub>M</sub>/M = √((3σ<sub>a</sub>/a)² + (2σ<sub>P</sub>/P)²). El tamaño de la órbita y el periodo son los que anotaste en el paso de pesar.',
      fields: [
        { label: 'Cuánto podría desviarse a' },
        { label: 'Cuánto podría desviarse P' },
        { label: 'Tamaño de la órbita a' },
        { label: 'Periodo P' },
        { label: 'Masa total' },
        { label: 'Su incertidumbre' },
      ],
    },
    {
      title: 'Da la masa con barra de error',
      body: 'Escribe la masa total del par como se da: el valor, ±, y su incertidumbre del paso anterior. Cuenta como correcta cuando el rango que das se solapa con el que respalda la medición y no es más ancho que el doble de la semianchura de ese rango.',
      prompt: 'Masa total del par, con su incertidumbre',
      placeholder: 'p. ej. 4,0 ± 0,5',
      hints: {
        concept: 'Una masa es un valor y lo bien que se conoce.',
        method: 'Copia el total y su incertidumbre del paso anterior.',
      },
      because: 'Cuatro masas solares, con incertidumbre de media.',
    },
    {
      title: '¿Qué medida te limita?',
      body: 'Di que a = 4,0 ± 0,1 UA y P = 4,0 ± 0,2 años. La primera es incierta en un 2,5 % y la segunda en un 5 %. La masa va como a³ / P².',
      prompt: '¿Cuál contribuye más a la incertidumbre de la masa?',
      options: [
        'el tamaño de la órbita, porque se eleva al cubo',
        'el periodo, porque se eleva al cuadrado y es el menos seguro de los dos',
        'contribuyen igual, porque las dos están medidas',
        'ninguna: la masa es exacta si la ley es exacta',
      ],
      because:
        'El tamaño de la órbita contribuye 3 × 2,5 % = 7,5 % y el periodo 2 × 5 % = 10 %. La potencia importa, pero también lo bien que se conoce cada una; aquí gana el periodo, así que medir con más cuidado el cronómetro, por ejemplo cronometrando varias vueltas y dividiendo, mejora más la masa que medir con más cuidado la regla.',
    },
    {
      title: 'Pesa una estrella, con barra de error',
      body: 'El total es 4,0 ± 0,3 masas solares. El punto de equilibrio queda de modo que la Estrella A, la más pesada, lleva 0,75 del total, conocido con ±0,02. Una parte de un total es un producto, así que las incertidumbres fraccionarias se suman en cuadratura: σ<sub>m</sub>/m = √((σ<sub>M</sub>/M)² + (σ<sub>f</sub>/f)²).',
      prompt: 'Masa de la Estrella A, con su incertidumbre',
      placeholder: 'p. ej. 3,0 ± 0,3',
      hints: {
        concept: 'La masa de la Estrella A es su parte del total.',
        method:
          'm = 0,75 × 4,0. Las fracciones son 0,3/4,0 y 0,02/0,75; combínalas y multiplica por m.',
      },
      because:
        'Tres masas solares, con incertidumbre de un cuarto. El reparto de la masa se conoce mejor que la masa misma, porque la razón de las dos distancias se mide directamente, mientras que el total depende de a al cubo.',
    },
  ],
};
