// La luz que se curva - español, paso a paso con ../bending-light.js.
export default {
  title: 'La luz que se curva',
  subtitle:
    'Cuánto desvía una masa un rayo de luz, y los 1,75 segundos de arco del Sol',
  objectives: [
    'Decir de qué depende la desviación de un rayo de luz: la masa de la lente y lo cerca que pasa el rayo',
    'Medir la desviación en el limbo del Sol, unos 1,75 segundos de arco, y decir con qué se comparó en 1919',
    'Escalar la desviación con la masa y el máximo acercamiento, y decir en qué sentido va cada uno',
    'Decir qué supone la fórmula de campo débil y hallar un caso en que no es fiable',
  ],
  steps: [
    {
      title: 'Una masa desvía un rayo de luz',
      body: `La relatividad general dice que la masa curva el espacio, y un rayo de luz sigue la curva: al pasar junto a una masa se desvía hacia ella. Para un rayo que pasa junto a una masa puntual <em>M</em> con un máximo acercamiento <em>b</em>, muy fuera del radio de Schwarzschild de la propia masa, el ángulo es <strong>4GM ÷ (c²b)</strong>. Una partícula de materia que se moviera a la velocidad de la luz, con la gravedad de Newton, se desviaría la mitad.
             \n\nEl instrumento dibuja la desviación frente al máximo acercamiento en ejes logarítmicos. La línea gris es el Sol, la de color es la masa que elijas y el punto es el rayo. Es un <strong>modelo</strong>: una masa puntual, un rayo, en campo débil.`,
    },
    {
      title: 'Luz que roza el Sol',
      body: `Pon la masa en <strong>1</strong> masa solar y el máximo acercamiento en <strong>1</strong> radio solar: un rayo que apenas roza el Sol. Lee cuánto se desvía, en segundos de arco.`,
      fields: [{ label: 'Desviación' }],
    },
    {
      title: 'Un rayo cien veces más lejos',
      body: `Imagina ahora un rayo que pasa junto al Sol a 100 radios solares en vez de 1. Todavía no cambies el instrumento.`,
      prompt: 'La desviación será&hellip;',
      options: [
        'cien veces menor',
        'diez veces menor',
        'la misma, porque es el mismo Sol',
        'cien veces mayor',
      ],
      hints: ['La fórmula tiene el máximo acercamiento b en el denominador.'],
      because:
        'Cien veces menor. La desviación es inversamente proporcional al máximo acercamiento, así que cien veces la distancia da 1/100 del ángulo. El paso siguiente la mide.',
    },
    {
      title: 'Mide el rayo lejano',
      body: `Pon el máximo acercamiento en <strong>100</strong> radios solares y lee la desviación.`,
      fields: [{ label: 'Desviación' }],
    },
    {
      title: 'Diez veces la masa',
      body: `Vuelve al limbo, 1 radio solar, pero haz que la lente sea una estrella de <strong>10</strong> masas solares. Lee la desviación y el radio de Schwarzschild 2GM/c².`,
      fields: [{ label: 'Desviación' }, { label: 'Radio de Schwarzschild' }],
    },
    {
      title: 'Lo que decidió el eclipse de 1919',
      body: `El instrumento indica dos predicciones para el limbo del Sol: los 1,75 segundos de arco de la relatividad general y la mitad newtoniana, 0,88. Las expediciones de Eddington fotografiaron estrellas cerca del Sol durante el eclipse del 29 de mayo de 1919 y midieron 1,98 ± 0,12 y 1,61 ± 0,30 segundos de arco en sus dos sitios.`,
      prompt: '¿Qué afirmación apoyan las mediciones?',
      options: [
        'La desviación está cerca de 1,75 segundos de arco, y el 0,88 newtoniano queda descartado',
        'La desviación está cerca de 0,88 segundos de arco, como dijo Newton',
        'No hay desviación: las estrellas no se movieron',
        'Los dos sitios discrepan tanto que no se puede decir nada',
      ],
      misconceptions: [
        {
          say: 'Los dos valores están lejos de 0,88: 1,98 está a más de ocho barras de error y 1,61 a más de dos. Rodean 1,75.',
        },
      ],
      hints: [
        'Compara cada medición con 0,88 y con 1,75, en unidades de su barra de error.',
      ],
      because:
        'Las mediciones concuerdan con la relatividad general, 1,75, y excluyen el 0,88 newtoniano (el valor 1,98 por unas nueve barras de error, el 1,61 por unas dos y media). El resultado fue noticia porque podía haber salido al revés.',
    },
    {
      title: 'Dónde no se puede fiar de la fórmula',
      body: `Carga “Un agujero negro de 100 millones de Soles”. Lee a cuántos radios de Schwarzschild del centro pasa el rayo, y qué desviación dice la fórmula. La fórmula supone que el rayo pasa muy fuera del radio de Schwarzschild, y el instrumento dice si es así.`,
      fields: [{ label: 'Máximo acercamiento en radios de Schwarzschild' }],
    },
    {
      title: 'Lo que has deducido',
      body: `Una masa desvía un rayo de luz en 4GM ÷ (c²b): en proporción a la masa e inversamente al máximo acercamiento. Para el limbo del Sol son 1,75 segundos de arco, el doble del valor newtoniano, y 1919 lo favoreció. La fórmula es de campo débil, válida cuando el rayo pasa a muchos radios de Schwarzschild, y falla para un rayo que pasa por el borde de un agujero negro. Cuando la lente, la fuente y el observador se alinean, una desviación así hace anillos, y la investigación siguiente los hace.`,
    },
  ],
};
