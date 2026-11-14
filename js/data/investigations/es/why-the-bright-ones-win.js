// Por qué ganan las brillantes - español, paso a paso con ../why-the-bright-ones-win.js.
export default {
  title: 'Por qué ganan las brillantes',
  subtitle: 'El sesgo de Malmquist, medido contra una verdad que conocemos',
  objectives: [
    'Medir cuánto más brillantes son las estrellas contadas que las que hay, en capas de distancia',
    'Explicar por qué el sesgo crece con la distancia: un límite admite solo las estrellas intrínsecamente brillantes desde lejos',
    'Comparar un sesgo de Malmquist medido con su forma cerrada para candelas estándar con dispersión',
    'Decir por qué seleccionar por una paralaje bien medida hace que las estrellas parezcan más débiles de lo que son',
    'Decir qué hace cada sesgo a una distancia o una luminosidad calculada a partir de un catálogo',
  ],
  steps: [
    {
      title: 'El mismo sondeo, por distancia',
      body: 'La investigación anterior halló que un sondeo cuenta las estrellas brillantes. Aquí las estrellas se agrupan en <strong>capas</strong> de distancia, y para cada capa el instrumento compara las estrellas que el sondeo <em>contó</em> con <em>todas</em> las de la capa. Ambas son estrellas sintéticas de brillo conocido.\n\nLa diferencia es el <strong>sesgo de Malmquist</strong> (Malmquist, 1920 y 1936): en una muestra limitada por magnitud, la estrella media es más brillante que la estrella media que hay. Léelo en magnitudes; un número mayor significa que las estrellas contadas son más brillantes en esa cantidad.',
    },
    {
      title: 'Cerca y lejos',
      body: 'El sondeo tiene un límite de 16. Compara las estrellas contadas en la capa más cercana con todas las de allí, y en la capa más lejana con todas las de allí. Todavía no cambies el instrumento.',
      prompt: '¿Cómo será el sesgo en la capa lejana comparado con la cercana?',
      options: [
        'Será mayor: las estrellas contadas son más brillantes, comparadas con las que hay',
        'Será igual: el sondeo trata todas las capas por igual',
        'Será menor: las estrellas lejanas son todas parecidas',
        'No habrá sesgo en ninguna capa',
      ],
      hints: [
        'El límite es el mismo en todas partes. ¿Qué hace eso con qué estrellas son bastante brillantes a una gran distancia?',
      ],
      because:
        'Mayor. El límite es una magnitud aparente, pero una estrella lejana necesita más brillo intrínseco para alcanzarlo. Así, cuanto más lejos la capa, más solo se cuentan las más brillantes de sus estrellas y mayor es el sesgo.',
    },
    {
      title: 'Mide el sesgo en dos capas',
      body: 'Con el límite en <strong>16</strong> y las estrellas en <strong>la población estelar</strong>, lee el sesgo en la capa más cercana (0–250&nbsp;pc) y en la más lejana (750–1.000&nbsp;pc): cuántas magnitudes más brillantes son las estrellas contadas.',
      fields: [{ label: 'Capa 0–250 pc' }, { label: 'Capa 750–1.000 pc' }],
    },
    {
      title: '¿Por qué crece?',
      body: 'Una estrella de magnitud absoluta M aparece en m = M + 5 log<sub>10</sub>(d ÷ 10 pc). Con un límite de 16, una estrella a 100&nbsp;pc debe tener M por debajo de 11; a 1.000&nbsp;pc debe tener M por debajo de 6.',
      prompt: '¿Qué hace el límite con las estrellas de una capa lejana?',
      options: [
        'Admite solo las intrínsecamente brillantes, así que las contadas son una muestra cada vez más brillante',
        'Hace que las estrellas lejanas parezcan más cercanas',
        'Elimina las estrellas cercanas',
        'Cambia lo brillantes que son realmente las estrellas',
      ],
      misconceptions: [
        {
          say: 'Las estrellas no cambian por estar lejos ni por ser contadas. Su brillo es fijo en el modelo; solo qué estrellas llegan al sondeo depende del límite.',
        },
      ],
      hints: [
        'Compara la M que necesita una estrella a 100 pc con la que necesita a 1.000 pc.',
      ],
      because:
        'Solo las brillantes. El brillo que necesita una estrella sube cinco magnitudes por cada factor de diez en distancia, así que el corte sube por la función de luminosidad y las estrellas contadas pasan a ser una muestra más brillante de la población.',
    },
    {
      title: 'Candelas estándar con dispersión',
      body: 'El caso de los libros: estrellas casi del mismo brillo, con una dispersión de 0,7 magnitudes. Pon las estrellas en <strong>candelas estándar</strong> (límite 16). Lee el sesgo <em>en el límite</em>, entre las estrellas de la última media magnitud antes de él, y la <strong>forma cerrada de Malmquist</strong>, −1,382&nbsp;σ², con σ = 0,7. Escribe ambos con el signo que muestra el instrumento.',
      fields: [{ label: 'Sesgo en el límite' }, { label: 'Forma cerrada' }],
    },
    {
      title: 'Duplica la dispersión',
      body: 'La forma cerrada es −1,382&nbsp;σ². Supón que las estrellas no se dispersaran 0,7 magnitudes sino 1,4: el doble.',
      prompt: 'El sesgo pasa a ser&hellip;',
      options: [
        'cuatro veces mayor, porque va como el cuadrado de la dispersión',
        'el doble',
        'igual: el sesgo no depende de la dispersión',
        'unas 1,4 veces mayor',
      ],
      hints: ['Eleva al cuadrado ambas dispersiones y compara.'],
      because:
        'Cuatro veces: σ pasa de 0,7 a 1,4 y σ² de 0,49 a 1,96. Una población con una función de luminosidad ancha, como las estrellas reales, tiene un sesgo grande; una candela estándar limpia casi no tiene, y por eso se aprecian tanto.',
    },
    {
      title: 'Un segundo sesgo: fiarse de las buenas paralajes',
      body: 'Un catálogo da paralajes, y un analista puede conservar solo las estrellas cuya paralaje está bien medida, digamos al menos 3 veces su error. Pon el límite en <strong>18</strong>, las estrellas en <strong>la población</strong> y el corte de paralaje en <strong>3</strong>. (Este instrumento mide la paralaje peor que Gaia.) Lee cuánto más grandes son las paralajes medidas de la muestra, y cuánto más débiles salen las magnitudes absolutas calculadas con ellas.',
      fields: [
        { label: 'Paralajes demasiado grandes en' },
        { label: 'Magnitudes absolutas demasiado débiles en' },
      ],
    },
    {
      title: 'Sube el corte',
      body: 'Pon el corte de paralaje en <strong>10</strong> (límite 18). El sesgo casi desaparece, hasta cerca del 1 %. La fila de arriba muestra las estrellas que quedaron.',
      prompt: '¿Qué costó el corte más estricto?',
      options: [
        'La mayor parte de la muestra, y las estrellas que quedan son las más cercanas y brillantes, que es otra selección',
        'Nada: un corte más estricto siempre es mejor',
        'El sesgo volvió en sentido contrario',
        'Hizo las paralajes menos exactas',
      ],
      hints: ['Compara el número de estrellas con un corte de 3 y de 10.'],
      because:
        'La mayor parte de la muestra: quedan 82 estrellas de 471. Son las bastante cercanas para medirse bien, así que el sesgo en la paralaje desaparece y el sesgo de Malmquist del sondeo, que crecía con la distancia, sigue ahí. Cada remedio es una nueva selección.',
    },
    {
      title: 'Qué se sigue',
      body: 'Un estudiante promedia las magnitudes absolutas de todas las estrellas de un catálogo con límite 16 y dice: «Ese es el brillo medio de las estrellas de la Galaxia».',
      prompt:
        'En dos o tres frases, di qué sesgo ignora esto, en qué sentido empuja la respuesta y una forma de evitarlo.',
    },
    {
      title: 'Lo que has deducido',
      body: 'Un límite de magnitud admite solo las estrellas intrínsecamente brillantes desde lejos, así que las contadas son más brillantes que las que hay: aquí en media magnitud cerca y tres y media lejos. Para candelas estándar el sesgo en el límite es −1,382&nbsp;σ², y el valor medido coincide. Seleccionar por una paralaje bien medida añade el error contrario a una luminosidad: hace que las estrellas parezcan más cercanas y más débiles. Ambos sesgos vienen de cómo se seleccionaron las estrellas, no de cómo se midieron. La investigación siguiente corrige uno de ellos.',
    },
  ],
};
