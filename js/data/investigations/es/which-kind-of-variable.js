// Qué tipo de variable - español, paso a paso con ../which-kind-of-variable.js.
export default {
  title: 'Qué tipo de variable',
  subtitle:
    'Distinguir cinco tipos de estrella variable y leer una tabla de confusión en lugar de una sola respuesta',
  objectives: [
    'Medir una estrella variable por su periodo, su amplitud y la forma de su curva de luz',
    'Leer una tabla de confusión y decir qué tipos de estrella se toman por cuáles',
    'Mostrar lo que compra cada medida añadida, y por qué una sola cifra de exactitud lo oculta',
    'Decir qué no te cuenta una muestra sintética y equilibrada sobre un sondeo real',
  ],
  steps: [
    {
      title: 'Cinco tipos de estrella',
      body: `Los sondeos encuentran millones de estrellas cuyo brillo cambia, y nadie puede mirar cada una. Un <strong>clasificador</strong> las ordena por números medidos en la curva de luz: el <strong>periodo</strong>, la <strong>amplitud</strong> y la <strong>forma</strong> (aquí el número R21, la fuerza del segundo armónico de la curva sobre el primero, como en la primera investigación).
             \n\nEl instrumento guarda 120 estrellas, 24 de cada uno de cinco tipos: estrellas RR Lyrae con curva en diente de sierra (RRab) y otra más suave (RRc), cefeidas, estrellas delta Scuti y binarias eclipsantes. La muestra es <strong>sintética</strong>: hecha por un modelo directo a partir de plantillas estilizadas de cada tipo, con ruido, y medida con la misma tubería que una curva de luz real, así que las etiquetas se conocen. El clasificador da a cada estrella el tipo mayoritario de sus cinco vecinas más próximas entre las otras 119, y el instrumento muestra una <strong>tabla de confusión</strong>: para cada tipo verdadero, cómo se le llamó.`,
    },
    {
      title: 'Solo el periodo',
      body: `Con “solo el periodo” como lo que el clasificador puede usar, lee la <strong>proporción bien clasificada</strong> y la <strong>proporción hallada</strong> de las binarias eclipsantes.`,
      fields: [
        { label: 'Bien clasificadas' },
        { label: 'Binarias eclipsantes halladas' },
      ],
    },
    {
      title: 'Leer la tabla de confusión',
      body: `Cada fila “En verdad …, llamadas” cuenta las estrellas de un tipo verdadero según cómo las llamó el clasificador. Mira la fila de las <strong>binarias eclipsantes</strong>: lee cuántas se llamaron <strong>RRab</strong> y cuántas se llamaron <strong>eclipsante</strong>.`,
      fields: [
        { label: 'Binarias eclipsantes llamadas RRab' },
        { label: 'Binarias eclipsantes llamadas eclipsante' },
      ],
    },
    {
      title: 'Por qué se pierden las binarias',
      body: `Mira la imagen: con solo el periodo, las binarias eclipsantes se reparten por los mismos periodos que los pulsadores. Una búsqueda de periodo sobre una binaria eclipsante halla la mitad del periodo orbital, porque la estrella se atenúa dos veces en cada órbita, casi por igual.`,
      prompt:
        '¿Por qué el periodo solo no distingue una binaria eclipsante de un pulsador?',
      options: [
        'Las binarias eclipsantes no varían de brillo',
        'Sus periodos caen en el mismo intervalo que los de los pulsadores, así que un periodo dice poco del tipo',
        'El clasificador no tiene binarias eclipsantes de las que aprender',
        'Las binarias siempre son demasiado débiles para medirlas',
      ],
      misconceptions: [
        {
          say: 'Una binaria eclipsante se atenúa mucho en cada eclipse. Varía; es el periodo, que comparte con otros tipos, lo que la delata mal.',
        },
        {
          say: 'Hay 24 en la muestra, igual que de cualquier otro tipo. El solapamiento está en los números, no en el entrenamiento.',
        },
      ],
      hints: [
        'Mira dónde están las binarias eclipsantes a lo largo del eje del periodo en la imagen.',
      ],
      because:
        'El periodo es un solo número, y varios tipos comparten el intervalo de unas horas a unos días. Las otras medidas (cuánto oscila y la forma de la curva) difieren mucho más entre los tipos.',
    },
    {
      title: 'Añade la amplitud',
      body: `Deja ahora que el clasificador use la amplitud además del periodo. Todavía no cambies el instrumento.`,
      prompt: 'El tipo de estrella que más mejorará será&hellip;',
      options: [
        'las estrellas RR Lyrae de curva en diente de sierra',
        'las estrellas delta Scuti',
        'las binarias eclipsantes',
        'las cefeidas',
      ],
      hints: ['¿Qué tipo se halló menos veces con solo el periodo?'],
      because:
        'Las binarias eclipsantes: eran las que más margen tenían, y un eclipse típico es más profundo o más somero que una pulsación, lo que las separa de varios pulsadores. El paso siguiente lee los números nuevos.',
    },
    {
      title: 'Periodo y amplitud',
      body: `Elige “el periodo y la amplitud”. Lee la proporción bien clasificada y la proporción hallada de las binarias eclipsantes.`,
      fields: [
        { label: 'Bien clasificadas' },
        { label: 'Binarias eclipsantes halladas' },
      ],
    },
    {
      title: 'Añade la forma',
      body: `Elige “el periodo, la amplitud y la forma” y pon la imagen en “Forma (R21) frente al periodo”. Lee la proporción bien clasificada y la proporción hallada de las binarias eclipsantes.`,
      fields: [
        { label: 'Bien clasificadas' },
        { label: 'Binarias eclipsantes halladas' },
      ],
    },
    {
      title: 'Lo que oculta un solo número',
      body: `Un clasificador que da un 99 por ciento de exactitud parece terminado.`,
      prompt: '¿Qué te dice la tabla de confusión que no te dice la exactitud?',
      options: [
        'Nada: la exactitud ya dice lo bueno que es un clasificador',
        'Qué tipos se toman por cuáles y con qué frecuencia se halla cada tipo, y que la propia exactitud depende de cuántas estrellas de cada tipo tiene la muestra',
        'Cuánta confianza tiene el clasificador en cada estrella',
        'Si las propias etiquetas son correctas',
      ],
      misconceptions: [
        {
          say: 'La exactitud con solo el periodo fue del 83 por ciento, y ocultaba un tipo hallado solo el 29 por ciento de las veces. Un solo número promedia los tipos.',
        },
        {
          say: 'Este clasificador da un voto, no una confianza, y la tabla es un recuento de resultados. Ninguno dice cuán seguro estaba de una estrella.',
        },
      ],
      hints: [
        'Compara el 83 por ciento con el 29 por ciento de las binarias eclipsantes, y piensa qué habría dado una muestra con muchas más binarias.',
      ],
      because:
        'La tabla dice dónde están los errores, así que se ve qué tipo está en apuros y qué medir para arreglarlo. Y como la exactitud es un promedio sobre los tipos, ponderado por cuántos hay de cada uno, una muestra con muchas binarias y pocos pulsadores daría una cifra peor con el mismo clasificador. Un cielo real no está equilibrado, así que la cifra de aquí no se traslada a un sondeo.',
    },
    {
      title: 'Lo que has deducido',
      body: `Con solo el periodo, el 83 por ciento de una muestra sintética y equilibrada de cinco tipos se clasifica bien, pero las binarias eclipsantes solo el 29 por ciento de las veces, tomadas por pulsadores de periodo parecido. La amplitud lo sube al 54 por ciento, y la forma de la curva al 100, con un 99 por ciento en total. Una tabla de confusión muestra qué tipos se toman por cuáles, y la exactitud depende de la mezcla de tipos de la muestra.
             \n\nLa muestra es sintética y estilizada: solo cinco tipos, sin mezclas de luz, sin estallidos, sin segundos periodos, y la búsqueda de periodo de una binaria eclipsante cae en la mitad de la órbita. Un sondeo real no está equilibrado y tiene estrellas fuera de estos cinco tipos. Esto muestra cómo funciona el método; no dice lo bien que rinde el clasificador de un sondeo concreto.`,
    },
  ],
};
