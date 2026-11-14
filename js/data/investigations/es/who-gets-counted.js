// Quién entra en la cuenta - español, paso a paso con ../who-gets-counted.js.
export default {
  title: 'Quién entra en la cuenta',
  subtitle: 'Qué hace un límite de magnitud a un censo de las estrellas',
  objectives: [
    'Decir qué selecciona un límite de magnitud: las estrellas que parecen brillantes, no las que son comunes',
    'Medir qué parte de una población sintética cuenta un sondeo con tres límites, y qué hay en la parte que pierde',
    'Hallar a qué distancia puede estar una estrella de un brillo dado y aun así ser contada',
    'Explicar por qué un catálogo de las estrellas más brillantes tiene un brillo medio distinto del de las estrellas que hay',
    'Decir por qué una cuenta de lo que se encontró no es un censo de lo que hay',
  ],
  steps: [
    {
      title: 'Un censo del cielo',
      body: 'Un sondeo cuenta las estrellas que puede ver. Para ver una estrella, su luz tiene que llegar al telescopio por encima de un límite: la <strong>magnitud aparente</strong> más débil que el sondeo registra. Una estrella de magnitud 18 es cien veces más débil que una de magnitud 13, y un número menor significa más brillante.\n\nEl instrumento de abajo guarda un cono de estrellas <strong>sintéticas</strong>. Son un modelo: cada una tiene un brillo conocido, sacado de una población de enanas rojas, estrellas como el Sol y gigantes brillantes en las proporciones en que nacen las estrellas, y repartidas por igual en 1.000&nbsp;parsecs. Como las hicimos nosotros, conocemos cada estrella que el sondeo perdió. Un sondeo real nunca la conoce. Los puntos grises son estrellas perdidas, los de color son contadas; la línea naranja es el límite.',
    },
    {
      title: '¿Qué pierde un sondeo somero?',
      body: 'El sondeo tiene un límite de magnitud 14, que es somero. Todavía no cambies el instrumento.',
      prompt: 'La mayoría de las estrellas que pierde serán&hellip;',
      options: [
        'las débiles: estrellas de baja luminosidad, sobre todo enanas rojas',
        'las brillantes, porque son raras',
        'las parecidas al Sol, que no son ni brillantes ni débiles',
        'una muestra al azar de todo tipo de estrellas',
      ],
      hints: [
        'Una estrella se cuenta cuando parece brillante. ¿Qué hace que una estrella parezca débil?',
      ],
      because:
        'Las débiles. Una estrella parece débil cuando es intrínsecamente débil o está lejos, y las enanas rojas son a la vez las más comunes y las más débiles, así que son lo que pierde un sondeo somero. Los pasos siguientes miden cuántas.',
    },
    {
      title: 'Cuenta un sondeo somero',
      body: 'Con el límite en <strong>14</strong>, lee cuántas estrellas <strong>contó</strong> el sondeo y qué parte de todas las estrellas del cono es.',
      fields: [
        { label: 'Estrellas contadas' },
        { label: 'Parte de las estrellas' },
      ],
    },
    {
      title: 'Cuatro magnitudes más profundo',
      body: 'Sube el límite a <strong>18</strong>, un sondeo profundo: se cuenta una estrella cuatro magnitudes más débil, que es cuarenta veces más débil en luz. Lee otra vez el número contado y la parte.',
      fields: [
        { label: 'Estrellas contadas' },
        { label: 'Parte de las estrellas' },
      ],
    },
    {
      title: '¿Qué hay en la otra mitad?',
      body: 'Con un límite de 18 el instrumento indica la parte de las estrellas <em>perdidas</em> que son más débiles que una magnitud absoluta de 8, las enanas rojas. Léela.',
      prompt: '¿Qué es verdad de las estrellas que pierde un límite de 18?',
      options: [
        'Casi todas son enanas rojas débiles, más débiles que la magnitud absoluta 8',
        'Son una muestra justa de todo tipo de estrellas',
        'La mayoría son estrellas brillantes que estaban demasiado lejos',
        'Ninguna es una enana roja',
      ],
      misconceptions: [
        {
          say: 'Una muestra justa tendría estrellas brillantes y débiles en la proporción en que se forman. La fila dice que toda estrella perdida es débil: el sondeo no eligió al azar, eligió por brillo.',
        },
      ],
      hints: ['Lee “Perdidas que son más débiles que M = 8”.'],
      because:
        'Todas. Una estrella de magnitud absoluta 8 alcanza el límite de 18 solo a 1.000 parsecs, el borde del cono, así que toda estrella más brillante se cuenta esté donde esté. Lo que pierde un sondeo profundo es el extremo intrínsecamente débil de la población, que además es el más numeroso.',
    },
    {
      title: '¿A qué distancia puede estar una estrella?',
      body: 'Vuelve a poner el límite en <strong>14</strong>. El instrumento indica la distancia a partir de la cual una estrella de un brillo dado cae por debajo del límite: una estrella como el Sol (magnitud absoluta 4,7) y una enana roja (magnitud absoluta 10). Lee las dos.',
      fields: [
        { label: 'Una estrella como el Sol' },
        { label: 'Una enana roja' },
      ],
    },
    {
      title: 'La estrella media, contada y real',
      body: 'Con un límite de <strong>14</strong>, lee la magnitud absoluta media de todas las estrellas del cono y de las que el sondeo contó. Un número mayor es una estrella más débil.',
      fields: [
        { label: 'Media de todas las estrellas' },
        { label: 'Media de las estrellas contadas' },
      ],
    },
    {
      title: 'Contar por magnitud',
      body: 'Cambia la imagen a <strong>el número de estrellas más brillantes que cada magnitud</strong>. La línea gris son todas las estrellas; la de color es lo que cuenta el sondeo. Van juntas en el extremo brillante y se separan en el límite.',
      prompt: '¿Por qué se separan las dos líneas cerca del límite?',
      options: [
        'Más allá del límite el sondeo no registra nada, aunque las estrellas estén ahí',
        'Las estrellas débiles no existen',
        'El telescopio empeora para las estrellas más brillantes',
        'La línea gris está mal ahí',
      ],
      hints: ['¿Dónde se detiene la línea de color?'],
      because:
        'El sondeo no registra nada más débil que su límite, así que su cuenta se aplana ahí, mientras las estrellas (la línea gris) siguen subiendo. Pasado el límite, la diferencia no es un hecho del cielo.',
    },
    {
      title: 'Una amiga lee el catálogo',
      body: 'Una amiga mira un catálogo de las estrellas más brillantes que la magnitud 14 y dice: «La mayoría de las estrellas son brillantes, como el Sol o más, así que la Galaxia es sobre todo estrellas como estas».',
      prompt:
        'En dos o tres frases, di qué falla en la conclusión, usando lo que mediste.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Un sondeo cuenta lo que está por encima de su límite de magnitud. En este modelo un límite de 14 cuenta una estrella de cada dieciséis y uno de 18 cuenta una de cada dos; todo lo que pierde es débil. Una estrella como el Sol puede contarse hasta 700&nbsp;parsecs con el primer límite, pero una enana roja solo hasta 63. Así que un catálogo es más brillante que la población de la que salió, aquí en cuatro magnitudes y media. La investigación siguiente mide ese sesgo, y la otra lo corrige.',
    },
  ],
};
