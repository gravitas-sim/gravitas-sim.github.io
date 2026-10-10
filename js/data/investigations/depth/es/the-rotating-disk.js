// El disco que gira, más a fondo: las palabras en español, paso a paso con ../the-rotating-disk.js.
export default {
  steps: [
    {
      title: 'La rapidez a mano',
      body: 'Una órbita circular tiene rapidez V = R × Ω, con R la distancia al centro y Ω la velocidad angular. A − B de Oort es Ω en el Sol: 27,24&nbsp;km/s/kpc. Usa R = 8,3&nbsp;kpc.',
      prompt: 'La rapidez circular en el Sol',
      hints: ['Multiplica 27,24 por 8,3.'],
      worked:
        '27,24 km/s/kpc × 8,3 kpc = 226 km/s. Su incertidumbre es 8,3 veces la de A − B (2,8 km/s/kpc), unos 24 km/s, así que los 244 km/s de la curva concuerdan.',
      feedback: {
        close: 'Casi. Revisa la multiplicación: 27,24 × 8,3.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Una rapidez en una galaxia es del orden de 100 a 300 km/s.',
        off: 'V = (A − B) × R, con A − B = 27,24 km/s/kpc y R = 8,3 kpc.',
      },
    },
    {
      title: 'La masa dentro de la órbita del Sol',
      body: 'La gravedad debe suministrar el movimiento circular: M = v² r ÷ G. En unidades de kiloparsecs, km/s y masas solares, G = 4,30 × 10<sup>−6</sup>. Toma v = 244&nbsp;km/s en r = 8,3&nbsp;kpc, los valores de la curva de rotación. Esto supone que la masa es esférica, lo que un disco no es: tómalo como una estimación.',
      prompt: 'La masa dentro de 8,3 kpc',
      hints: ['244² es 59.536; multiplica por 8,3 y divide entre 4,30 × 10⁻⁶.'],
      worked:
        '244² × 8,3 ÷ 4,30 × 10⁻⁶ = 59.536 × 8,3 ÷ 4,30 × 10⁻⁶ = 1,15 × 10¹¹, o 11,5 × 10¹⁰ masas solares.',
      feedback: {
        close:
          'Casi. M = v² r ÷ G; comprueba que dividiste entre G y no multiplicaste.',
        'wrong-order-of-magnitude':
          'Se pasa una potencia de diez. Revisa las unidades: la respuesta está en decenas de miles de millones de masas solares.',
        off: 'M = v² × r ÷ G, con v = 244, r = 8,3 y G = 4,30 × 10⁻⁶; divide la respuesta entre 10¹⁰.',
      },
    },
    {
      title: 'La parte del halo en el Sol',
      body: 'Las rapideces de componentes distintos se suman en cuadratura, así que la parte de la fuerza de un componente es su rapidez al cuadrado sobre la rapidez total al cuadrado. En el ajuste con halo, la fila de 8,3&nbsp;kpc da la rapidez del halo (178,3) y la total (270,3).',
      prompt: 'La parte del halo de v² a 8,3 kpc',
      hints: ['Eleva ambas al cuadrado, divide y multiplica por 100.'],
      worked:
        '178,3² ÷ 270,3² = 31.790 ÷ 73.080 = 0,435, o 43,5 por ciento. Cerca del Sol el halo ya es casi la mitad de la fuerza en el modelo; lejos es casi toda.',
      feedback: {
        close:
          'Casi. La parte de v² significa elevar al cuadrado antes de dividir.',
        off: '(halo ÷ total)² × 100, con halo = 178,3 y total = 270,3 km/s.',
      },
    },
    {
      title: 'Por qué se acota el disco',
      body: 'Los ajustes acotan el disco en 8 × 10<sup>10</sup> masas solares. Sin cota, un disco puede hacerse lo bastante masivo para ajustar la curva sin halo, y el ajuste no diría nada de un halo.',
      prompt:
        '¿Por qué acotar el disco es honesto y no poner el pulgar en la balanza?',
      options: [
        'La cota viene de estimaciones independientes de la masa estelar de la Galaxia, así que el ajuste pregunta si las estrellas que contamos pueden hacerlo',
        'Hace que el ajuste con halo se vea mejor',
        'Un disco no puede tener una masa superior a 8 × 10¹⁰ en ninguna galaxia',
        'Los datos prohíben un disco más pesado',
      ],
      misconceptions: [
        {
          say: 'La cota se aplica también al ajuste solo con estrellas, y es lo que hace que ese ajuste falle. Se fija antes del ajuste, a partir de las estrellas que podemos contar.',
        },
      ],
      hints: ['¿A qué pregunta pretende responder la comparación?'],
      because:
        'La pregunta es si bastan las estrellas y el gas que podemos contar. Un disco sin cota respondería otra pregunta (¿podría algún disco hacerlo?) y la respuesta no informaría. La cota declara la pregunta; otra cota es otro supuesto, declarado.',
    },
  ],
};
