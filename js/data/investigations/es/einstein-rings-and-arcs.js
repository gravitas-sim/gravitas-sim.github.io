// Anillos y arcos de Einstein - español, paso a paso con ../einstein-rings-and-arcs.js.
export default {
  title: 'Anillos y arcos de Einstein',
  subtitle:
    'La geometría de la lente fuerte, y un anillo como manera de pesar una lente',
  objectives: [
    'Decir qué es un anillo de Einstein y cuándo lo hace una lente',
    'Medir el radio de Einstein de una estrella y de una galaxia, y ver por qué difieren en un factor de un millón',
    'Usar el tamaño de un anillo para hallar la masa que contiene',
    'Hallar las dos imágenes de una fuente descentrada y sus amplificaciones, para una masa puntual y para una galaxia',
    'Decir por qué la mayoría de las galaxias con lente se ven como arcos y no como anillos',
  ],
  steps: [
    {
      title: 'Un anillo hecho con una lente',
      body: `Si una fuente está justo detrás de una lente, la luz puede llegar hasta nosotros por todo su contorno. Vemos un <strong>anillo</strong>, con un radio angular llamado <strong>radio de Einstein</strong>: θ<sub>E</sub> = √(4GM ÷ c² × D<sub>ls</sub> ÷ (D<sub>l</sub>D<sub>s</sub>)), donde D<sub>l</sub>, D<sub>s</sub> y D<sub>ls</sub> son las distancias a la lente, a la fuente y entre ambas.
             \n\nEl instrumento dibuja el cielo alrededor de una lente en unidades del radio de Einstein (el anillo de trazos). El disco naranja es la fuente y las formas azules son sus imágenes. Es un <strong>modelo</strong>: una lente delgada, una fuente al doble de su distancia, distancias euclídeas ordinarias y nada de cosmología.`,
    },
    {
      title: '¿De qué tamaño es el anillo de una estrella?',
      body: `La lente es una estrella de una masa solar, a 4 kiloparsecs, con la fuente justo detrás, a 8. Todavía no cambies el instrumento.`,
      prompt: 'El radio angular del anillo es de unos&hellip;',
      options: [
        'un milisegundo de arco',
        'un segundo de arco',
        'un grado',
        'un microsegundo de arco',
      ],
      hints: [
        'Un milisegundo de arco es una milésima de segundo de arco; Hubble resuelve unos 50.',
      ],
      because:
        'Unos mil milésimas de segundo de arco, un milisegundo. El radio de Einstein de una estrella a distancias de kiloparsecs es mucho menor que lo que resuelve cualquier telescopio, y por eso las estrellas hacen un suceso de microlente en vez de un anillo visible.',
    },
    {
      title: 'El anillo de una estrella',
      body: `Con una masa solar a 4 kpc, lee el radio de Einstein en milisegundos de arco.`,
      fields: [{ label: 'Radio de Einstein' }],
    },
    {
      title: 'El anillo de una galaxia',
      body: `Carga “Una galaxia a 1 Gpc, fuente justo detrás”: 10<sup>11</sup> masas solares dentro del anillo, a un gigaparsec. Lee el radio de Einstein en segundos de arco, y su tamaño en la lente en kiloparsecs.`,
      fields: [{ label: 'Radio de Einstein' }, { label: 'Radio en la lente' }],
    },
    {
      title: 'Pesa una galaxia con su anillo',
      body: `Se ve un anillo alrededor de una galaxia a 1 gigaparsec, y mide <strong>1,0 segundo de arco</strong> de radio. Cambia la masa hasta que el radio de Einstein del instrumento sea 1,0 segundo de arco (deja la distancia en 1 Gpc y el desplazamiento en 0). La masa está dentro del anillo, sea de lo que sea la lente: estrellas, gas o materia oscura.`,
      fields: [{ label: 'Masa dentro del anillo' }],
    },
    {
      title: 'Mueve la fuente a un lado',
      body: `Carga “Lo mismo, con la fuente a un lado”: la fuente está a medio radio de Einstein de la lente. Una masa puntual hace dos imágenes, una fuera del anillo y otra dentro, del lado contrario. Lee la posición de la imagen exterior (en radios de Einstein) y la amplificación total.`,
      fields: [{ label: 'Imagen exterior' }, { label: 'Amplificación total' }],
    },
    {
      title: 'Una galaxia no es un punto',
      body: `Una galaxia real tiene su masa repartida. Carga “Una galaxia isoterma, fuente a un lado”, una esfera isoterma singular con el mismo anillo y la misma posición de la fuente. Lee otra vez la imagen exterior y la amplificación total.`,
      fields: [{ label: 'Imagen exterior' }, { label: 'Amplificación total' }],
    },
    {
      title: 'Arcos, no anillos',
      body: `Pon el desplazamiento en <strong>0,3</strong> y el radio de la fuente en <strong>0,2</strong>, conservando la masa puntual. La fuente es un disco y no un punto.`,
      prompt:
        '¿Por qué la mayoría de las galaxias con lente se ven como arcos y no como anillos?',
      options: [
        'La fuente rara vez está justo detrás de la lente, y una fuente extensa se estira en un arco a lo largo del anillo',
        'Las lentes solo pueden hacer arcos',
        'Los anillos solo se forman con estrellas, no con galaxias',
        'El anillo está ahí, pero es demasiado débil para verse',
      ],
      misconceptions: [
        {
          say: 'Pon el desplazamiento en 0 en el instrumento: las imágenes se unen en un anillo. Un alineamiento perfecto es raro, pero ocurre.',
        },
      ],
      hints: [
        'Pon el desplazamiento en 0 y luego otra vez en 0,3 y mira las formas azules.',
      ],
      because:
        'Un anillo necesita la fuente justo detrás de la lente, y eso es raro. Fuera del eje las imágenes son dos arcos separados, cada uno una copia estirada de la fuente, más largos cuanto mayor es la fuente y más cercano el alineamiento.',
    },
    {
      title: 'Lo que has deducido',
      body: `Una lente hace un anillo de radio angular θ<sub>E</sub>, que es de un milisegundo de arco para una estrella y de un segundo de arco para una galaxia. El tamaño de un anillo da la masa que contiene, para cualquier lente. Fuera del eje el anillo se parte en dos imágenes de distinta amplificación, y qué lente es (un punto o una galaxia extensa) cambia esos números. El anillo de una estrella es demasiado pequeño para verse, pero el brillo total de sus imágenes se puede vigilar mientras la lente se mueve: la investigación siguiente.`,
    },
  ],
};
