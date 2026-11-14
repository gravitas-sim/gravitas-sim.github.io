// Una lente que pasa - español, paso a paso con ../a-lens-passing-by.js.
export default {
  title: 'Una lente que pasa',
  subtitle:
    'Curvas de luz de microlente, y lo que una sola curva no puede decirte',
  objectives: [
    'Decir por qué una estrella se aviva y se apaga cuando una lente pasa por delante, y leer el máximo y la duración del suceso',
    'Hallar el tiempo de cruce a partir de una masa, una distancia y una velocidad',
    'Decir por qué una curva de luz fija el tiempo de cruce pero no la masa, la distancia y la velocidad por separado',
    'Decir qué hacen a una curva de luz la mezcla de luz y el tamaño finito de la fuente',
    'Decir qué puede y qué no puede recuperar el ajuste de un suceso de aspecto real',
  ],
  steps: [
    {
      title: 'Una estrella se aviva y se apaga',
      body: `Cuando una lente pasa casi por delante de una estrella, las dos imágenes están demasiado juntas para resolverse (a un milisegundo de arco), pero juntas llevan más luz que la estrella sola. La estrella se <strong>aviva</strong> y vuelve a apagarse cuando la lente sigue su camino, durante días o semanas.
             \n\nEl instrumento dibuja la curva de luz: el flujo sobre su nivel base tranquilo frente al tiempo. Depende de lo cerca que sea el paso (<em>u</em><sub>0</sub>, en radios de Einstein) y del <strong>tiempo de cruce</strong> t<sub>E</sub> que tarda la lente en recorrer un radio de Einstein, que a su vez depende de la masa, la distancia y la velocidad de la lente. Es un <strong>modelo</strong>: una lente puntual que se mueve en línea recta junto a una estrella.`,
    },
    {
      title: '¿Cuánto brilla?',
      body: `En el instrumento la lente pasa junto a la estrella a 0,1 radios de Einstein: diez veces más cerca que un radio de Einstein. Todavía no cambies el instrumento.`,
      prompt: 'En el máximo acercamiento la estrella será unas&hellip;',
      options: [
        'diez veces más brillante',
        'dos veces más brillante',
        'cien veces más brillante',
        'solo unos pocos por ciento más brillante',
      ],
      hints: [
        'A un radio de Einstein la amplificación es 1,34. Un paso más cercano da más.',
      ],
      because:
        'Unas diez veces. La amplificación de una lente puntual es (u² + 2) ÷ (u √(u² + 4)), que para u pequeño es casi 1 ÷ u: un paso a 0,1 radios de Einstein da 10.',
    },
    {
      title: 'El máximo',
      body: `Con el suceso típico (máximo acercamiento 0,1) lee el flujo máximo sobre el nivel base.`,
      fields: [{ label: 'Flujo máximo sobre el nivel base' }],
    },
    {
      title: 'Cuánto dura',
      body: `La lente tiene 0,3 masas solares, está a 6 kiloparsecs y se mueve a 200 km/s a través de la línea de visión, delante de una estrella a 8 kiloparsecs. Lee el tiempo de cruce y cuánto tiempo la estrella brilla más de 1,34 veces su nivel base.`,
      fields: [
        { label: 'Tiempo de cruce tE' },
        { label: 'Más brillante que 1,34' },
      ],
    },
    {
      title: 'El doble de velocidad',
      body: `Sube la velocidad transversal de la lente a <strong>400 km/s</strong>, dejando todo lo demás. Lee el tiempo de cruce.`,
      fields: [{ label: 'Tiempo de cruce tE' }],
    },
    {
      title: 'Otras lentes, la misma curva',
      body: `Vuelve al suceso típico, tE = 16,6 días. Las dos últimas filas del instrumento dan la masa que necesitaría una lente para hacer <em>exactamente esta</em> curva a otras distancias y velocidades. Lee ambas.`,
      fields: [
        { label: 'A 2 kpc y 100 km/s' },
        { label: 'A 6 kpc y 300 km/s' },
      ],
    },
    {
      title: '¿Puede la curva de luz pesar la lente?',
      body: `Prueba las tres lentes en el instrumento: pon la masa, la distancia y la velocidad en los pares que acabas de leer y mira la curva.`,
      prompt: '¿Qué fija la forma de una curva de luz de microlente?',
      options: [
        'Solo el tiempo de cruce: una combinación de masa, distancia y velocidad, no cada una por separado',
        'La masa de la lente, sea cual sea su distancia',
        'La distancia a la lente, sea cual sea su masa',
        'La velocidad de la lente, y por tanto su masa',
      ],
      misconceptions: [
        {
          say: 'La curva depende de la masa solo mediante el tiempo de cruce, que depende también de la distancia y de la velocidad. Tres masas distintas hicieron la misma curva en el paso anterior.',
        },
      ],
      hints: ['¿Qué tenían en común las tres lentes del paso anterior?'],
      because:
        'El tiempo de cruce y (con la distancia del paso y la mezcla) nada más. La forma depende de t_E = θ_E D_l ÷ v, un número para tres incógnitas, así que masa, distancia y velocidad son degeneradas. Romperlo requiere algo más: la luz de la lente, un paralaje desde un segundo observador o el tamaño finito de la fuente.',
    },
    {
      title: 'Luz de otras estrellas',
      body: `En un campo concurrido otras estrellas caen en el mismo píxel. Carga “El mismo suceso, con la mitad de la luz mezclada”: solo la mitad de la luz base es de la fuente. Lee el flujo máximo sobre el nivel base.`,
      fields: [{ label: 'Flujo máximo sobre el nivel base' }],
    },
    {
      title: 'Una estrella no es un punto',
      body: `Carga “Un paso muy cercano, fuente finita”: la lente pasa a 0,01 radios de Einstein del centro de la estrella, y el radio de la estrella es de 0,1 radios de Einstein. Una fuente puntual sería cien veces más brillante. Lee el máximo.`,
      fields: [{ label: 'Flujo máximo sobre el nivel base' }],
    },
    {
      title: 'Lo que has deducido',
      body: `Una lente que pasa por delante de una estrella la aviva en (u² + 2) ÷ (u √(u² + 4)), 10 para un paso a una décima del radio de Einstein, durante un tiempo de cruce de semanas para una lente de masa estelar. La curva fija ese tiempo pero no la masa, la distancia y la velocidad que lo hicieron. La luz mezclada baja el máximo, y una estrella finita lo limita. En la profundidad avanzada ajustas un suceso sintético y ves cómo un supuesto sobre la mezcla cambia la respuesta.`,
    },
  ],
};
