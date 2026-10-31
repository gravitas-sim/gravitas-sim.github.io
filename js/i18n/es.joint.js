// Las palabras de los paneles de ajuste conjunto, en español (Prompt 227). El sistema es sintético y
// los paneles lo dicen; la estrella es un dato con incertidumbre declarada y una fuente, nunca un resultado ajustado.
export const ES_JOINT = {
  'jointW.fit.title': 'El planeta y su estrella',
  'jointW.fit.note':
    'Un ajuste de un tránsito y treinta velocidades da la órbita del planeta y la amplitud del bamboleo de la estrella. La masa, el radio y la densidad del planeta necesitan además la masa y el radio de la estrella, que se declaran, no se ajustan. Cambia lo declarado y mira cuánto de cada incertidumbre es de la estrella.',
  'jointW.mr.title': 'Masa y radio',
  'jointW.mr.note':
    'El planeta en un diagrama de radio contra masa, con las líneas de densidad constante y los planetas del Sistema Solar. Los dos ejes son logaritmos. El recuadro es de una sigma; el recuadro discontinuo es lo que dirían solo los datos con la estrella tomada como exacta, que el ajuste no declara.',
  'jointW.control.massPct': 'Incertidumbre de la masa estelar',
  'jointW.control.radiusPct': 'Incertidumbre del radio estelar',
  'jointW.control.correlation': 'Correlación de ambas',
  'jointW.control.starMass': 'Masa estelar declarada',
  'jointW.control.starRadius': 'Radio estelar declarado',
  'jointW.control.alone': 'Mostrar solo los datos',
  'jointW.control.lines': 'Mostrar líneas de densidad constante',
  'jointW.on': 'sí',
  'jointW.off': 'no',
  'jointW.axis.pct':
    'Incertidumbre de la masa y el radio estelares, porcentaje de cada uno',
  'jointW.axis.rho': 'Incertidumbre de la densidad del planeta, porcentaje',
  'jointW.axis.logM': 'log10 de la masa, en masas terrestres',
  'jointW.axis.logR': 'log10 del radio, en radios terrestres',
  'jointW.legend.alone': 'Solo los datos',
  'jointW.legend.star': 'Con la estrella',
  'jointW.legend.now': 'Como se declara',
  'jointW.legend.solar': 'Sistema Solar',
  'jointW.legend.planet': 'Este planeta',
  'jointW.legend.box': 'Una sigma',
  'jointW.legend.boxAlone': 'Solo los datos',
  'jointW.legend.density': 'Densidad constante {d} g/cm3',
  'jointW.row.system': 'El sistema',
  'jointW.row.star': 'La estrella (un dato)',
  'jointW.row.mass': 'Masa',
  'jointW.row.radius': 'Radio',
  'jointW.row.density': 'Densidad',
  'jointW.row.tension': '¿Encaja la estrella con el tránsito?',
  'jointW.row.rates': 'Lo que cuesta dejar fuera la estrella',
  'jointW.row.class': 'Lo que dice la densidad',
  'jointW.row.assumes': 'Qué supone',
  'jointW.v.system':
    'Sintético: una curva de luz de cuatro tránsitos y 30 velocidades de dos instrumentos, ajustadas juntas con un período y una época (fluctuación {j} m/s, ji cuadrado {c} con {d} grados de libertad). No es una estrella real.',
  'jointW.v.star':
    'Masa {m} masas solares más o menos {sm} por ciento, radio {r} radios solares más o menos {sr} por ciento, correlación {rho}. Fuente: declarada para esta lección (una entrada tipo catálogo para una estrella sintética).',
  'jointW.v.mass':
    '{v} más o menos {s} masas de Júpiter ({e} masas terrestres). Los datos solos dan más o menos {a}, la estrella añade {b}; la estrella tiene el {p} por ciento de la varianza.',
  'jointW.v.radius':
    '{v} más o menos {s} radios de Júpiter. Los datos solos dan más o menos {a}, la estrella añade {b}; la estrella tiene el {p} por ciento de la varianza.',
  'jointW.v.density':
    '{v} más o menos {s} g/cm3, con la masa y el radio de la estrella dentro. Los datos solos dan más o menos {a}, la estrella añade {b}; la estrella tiene el {p} por ciento de la varianza.',
  'jointW.v.tension':
    'El tránsito da a la estrella una densidad de {t} más o menos {st} g/cm3; la masa y el radio declarados dan {s} más o menos {ss}. La diferencia es de {z} sigmas{flag}.',
  'jointW.v.tensionFlag':
    ' (más de 3: la estrella declarada y el tránsito no concuerdan, y la densidad del planeta vale lo que valga esa estrella)',
  'jointW.v.rates':
    'En un conjunto sembrado de {n} sistemas cuyas estrellas se sortearon de su incertidumbre declarada, el intervalo de una sigma contuvo la verdad, con la estrella dentro y con la estrella tomada como exacta, el {m} y el {n2} por ciento de las veces para la masa, el {a} y el {b} por ciento para el radio y el {c} y el {d} por ciento para la densidad. Una sigma debería contenerla cerca del 68 por ciento de las veces; la estrella importa más para la masa.',
  'jointW.v.class':
    '{c}: una convención sobre la densidad media (por debajo de 1,8 g/cm3 rica en volátiles, de 1,8 a 3 roca y hielo, por encima de 3 rocosa). No distingue hidrógeno y helio del hielo de agua, y la densidad de un planeta grande es menor que la de su material por su propio peso.',
  'jointW.class.rocky': 'Rocoso',
  'jointW.class.rock-ice': 'Roca y hielo',
  'jointW.class.volatile-rich': 'Rico en volátiles',
  'jointW.v.ambiguous':
    ' La densidad está a menos de 2 sigmas de un límite, así que la clase es ambigua.',
  'jointW.a':
    'Un planeta en una órbita, circular aquí; la masa y el radio de la estrella son datos independientes con la incertidumbre y la correlación declaradas; la covarianza es la del ajuste, linealizada. Los números son de primer orden; un Monte Carlo concuerda en unos pocos por ciento.',
};
