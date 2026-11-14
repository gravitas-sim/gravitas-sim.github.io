// El límite - español, paso a paso con ../the-limit.js.
export default {
  title: 'El límite',
  subtitle: 'Masa y radio de las enanas blancas, y por qué 1,4 masas solares',
  objectives: [
    'Decir qué sostiene a una enana blanca y por qué su radio baja cuando sube su masa',
    'Medir la masa y el radio de una enana blanca modelo a partir de su densidad central',
    'Explicar por qué la masa tiene un límite y leer el límite en el modelo',
    'Decir cómo depende el límite de la composición y qué deja fuera el modelo',
  ],
  steps: [
    {
      title: 'Una estrella sostenida por electrones',
      body: `Una estrella que ha dejado de quemar combustible no tiene nada que la mantenga caliente. Una enana blanca es lo que queda, y no se desploma porque sus electrones están tan apretados que el principio de exclusión prohíbe que más de ellos compartan un estado: llenan todos los estados de momento hasta un valor máximo, y ese gas de electrones <strong>degenerado</strong> empuja hacia fuera, sea cual sea la temperatura. Los iones aportan la masa y los electrones la presión.
             \n\nEl instrumento integra una estrella de este gas hacia fuera desde una densidad central que elijas, equilibrando peso y presión en cada radio. La curva son todas esas estrellas; el punto es la tuya. Es un <strong>modelo</strong>: frío, con electrones ideales, y no se dibuja ninguna enana blanca observada.`,
    },
    {
      title: 'Una enana blanca típica',
      body: `Con una densidad central de 3 millones de g/cm³ (carbono y oxígeno, dos nucleones por electrón) lee la <strong>masa</strong> y el <strong>radio en kilómetros</strong>. Para comparar, la Tierra tiene 6.371 km de radio.`,
      fields: [{ label: 'Masa' }, { label: 'Radio' }],
    },
    {
      title: 'Aprieta el centro',
      body: `Imagina ahora una enana blanca cuya densidad central es unas trescientas veces mayor, mil millones de g/cm³. Todavía no cambies el instrumento.`,
      prompt: 'Comparada con la enana típica, tendrá&hellip;',
      options: [
        'más masa y más radio',
        'más masa y menos radio',
        'menos masa y menos radio',
        'la misma masa y el mismo radio',
      ],
      hints: [
        'Más densidad central significa que hay más estrella apretada, pero también crece el peso sobre los electrones.',
      ],
      because:
        'Más masa y menos radio. Una enana blanca más masiva comprime más a sus electrones, que resisten acercándose, y la estrella se encoge: las enanas blancas más pesadas son más pequeñas. El paso siguiente lo mide.',
    },
    {
      title: 'Una enana blanca densa',
      body: `Pon la densidad central en <strong>10⁹</strong> g/cm³ y lee la masa y el radio en kilómetros.`,
      fields: [{ label: 'Masa' }, { label: 'Radio' }],
    },
    {
      title: 'El techo',
      body: `Sube la densidad central otras cien veces, hasta <strong>10¹¹</strong> g/cm³ (el final del deslizador). Lee la masa y la <strong>masa límite</strong> que da el instrumento para esta composición, que es hacia donde va la curva.`,
      fields: [{ label: 'Masa' }, { label: 'Masa límite' }],
    },
    {
      title: 'Por qué un límite',
      body: `El momento de Fermi central, en unidades de mₑc, es 37 a esta densidad: los electrones de lo alto del gas se mueven casi a la velocidad de la luz. A baja densidad la presión degenerada crece como ρ<sup>5/3</sup>; cuando los electrones son relativistas crece solo como ρ<sup>4/3</sup>.`,
      prompt: '¿Qué afirmación explica la masa límite?',
      options: [
        'Por encima de esa masa la estrella se queda sin combustible nuclear y se desploma',
        'Los electrones relativistas añaden presión solo como ρ^(4/3), el mismo ritmo al que se intensifica la gravedad al contraerse la estrella, así que ninguna presión adicional puede sostener más masa',
        'A 1,4 masas solares una enana blanca se convierte en agujero negro de golpe',
        'Las enanas blancas más pesadas giran tan rápido que se desintegran',
      ],
      misconceptions: [
        {
          say: 'Una enana blanca no tiene combustible que agotar, sea cual sea su masa. El límite viene de cómo crece la presión de los electrones con la densidad, no de quemar.',
        },
        {
          say: 'Nada de esto hace un agujero negro. Una enana blanca empujada más allá del límite se desploma hasta que otra presión (la de los neutrones) la sostiene, o explota.',
        },
      ],
      hints: [
        'Compara el exponente de la presión frente a la densidad con el que necesita la gravedad. ¿Cuál gana en el límite?',
      ],
      because:
        'La gravedad crece al contraerse la estrella tan deprisa como la presión degenerada relativista, así que una estrella en la masa límite no tiene un tamaño estable: gana la masa extra. La masa a la que ocurre es 5,8 masas solares divididas entre μₑ², que son 1,46 para carbono y oxígeno.',
    },
    {
      title: 'Si la estrella fuera de hidrógeno',
      body: `El límite depende de cuántos nucleones acompañan a cada electrón, μₑ: 2 para carbono, oxígeno y helio, 1 para hidrógeno. Carga “Una estrella de hidrógeno hipotética, μₑ = 1” y lee la masa límite.`,
      fields: [{ label: 'Masa límite' }],
    },
    {
      title: 'Un núcleo de hierro',
      body: `El núcleo de una estrella muy masiva acaba como hierro, con 56 nucleones por 26 electrones: μₑ = 2,15. Pon “Nucleones por electrón” en <strong>2,15</strong> y lee la masa límite, que es por lo que un núcleo así colapsa algo por debajo del límite de las enanas blancas.`,
      fields: [{ label: 'Masa límite' }],
    },
    {
      title: 'Lo que has deducido',
      body: `Los electrones degenerados sostienen a una enana blanca, y como se acercan más cuando la estrella es más pesada, una enana blanca más pesada es más pequeña: 0,6 masas solares en una bola del tamaño de un planeta, 1,4 en menos de 3.000 kilómetros. La masa no crece sin fin: cuando los electrones son relativistas, su presión deja de seguir el ritmo de la gravedad, y la masa se acerca a 5,8 ÷ μₑ² masas solares, 1,46 para carbono y oxígeno. El modelo es frío e ideal, así que deja fuera las interacciones de los iones, las capas de composición, la temperatura y la relatividad de la propia estrella; una enana blanca real es unos pocos por ciento más pequeña que el modelo, y su límite queda algo más bajo por las inestabilidades que el modelo no tiene.`,
    },
  ],
};
