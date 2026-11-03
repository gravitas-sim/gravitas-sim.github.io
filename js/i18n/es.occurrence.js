// Las palabras de los paneles de ocurrencia, en español (Prompt 229). El sondeo es sintético y los paneles lo dicen; la
// fiabilidad de los listados es un dato declarado, nunca calculado de los datos.
export const ES_OCCURRENCE = {
  'occW.eff.title': 'A quién podía ver el sondeo',
  'occW.eff.note':
    'Un sondeo de 2000 estrellas sintéticas, cada una con su ruido y su duración. Se inyectaron planetas de cada tamaño y período en la serie de cada estrella y se ejecutó la búsqueda: la parte que encontró es la eficiencia. Además un planeta tiene que transitar, que es cuestión de geometría. Las dos juntas son la completitud.',
  'occW.grid.title': 'Planetas por estrella',
  'occW.grid.note':
    'Los listados de una población buscada, con la tasa de cada casilla calculada a partir de ellos: los listados divididos entre la completitud de la casilla, por la fiabilidad declarada. Una tasa es un número esperado de planetas por estrella y puede ser mayor que uno. Una casilla sin listados da un límite, y una casilla que el sondeo apenas podía ver no da nada.',
  'occW.control.radius': 'Casilla de radio del planeta',
  'occW.control.period': 'Casilla de período orbital',
  'occW.control.view': 'Vista',
  'occW.control.seed': 'Semilla de la población',
  'occW.control.level': 'Intervalo',
  'occW.control.reliability': 'Fiabilidad de los listados',
  'occW.control.truth': 'Mostrar las tasas verdaderas',
  'occW.view.period': 'por período',
  'occW.view.curve': 'la curva',
  'occW.level.68': '68 por ciento',
  'occW.level.95': '95 por ciento',
  'occW.mode.none': 'ninguna declarada',
  'occW.mode.stated': 'declarada',
  'occW.mode.doubled': 'el doble de falsos',
  'occW.on': 'sí',
  'occW.off': 'no',
  'occW.axis.period': 'log10 del período orbital, en días',
  'occW.axis.eff': 'Parte de los planetas que transitan y se recuperan',
  'occW.axis.snr': 'Señal a ruido del tránsito inyectado',
  'occW.axis.rate': 'Planetas por estrella en la casilla',
  'occW.legend.radius': '{a} a {b} radios terrestres',
  'occW.legend.measured': 'Medida',
  'occW.legend.band': 'Una sigma',
  'occW.legend.analytic': 'Forma analítica',
  'occW.legend.threshold': 'Umbral',
  'occW.legend.now': 'Esta casilla',
  'occW.legend.rate': 'Tasa',
  'occW.legend.lo': 'Extremo inferior',
  'occW.legend.hi': 'Extremo superior',
  'occW.legend.limit': 'Límite superior',
  'occW.legend.truth': 'Tasa verdadera',
  'occW.row.survey': 'El sondeo',
  'occW.row.bin': 'La casilla',
  'occW.row.efficiency': 'Eficiencia',
  'occW.row.completeness': 'Completitud',
  'occW.row.listed': 'Listados',
  'occW.row.reliability': 'Fiabilidad',
  'occW.row.rate': 'Tasa',
  'occW.row.sum': 'La casilla de radio en total',
  'occW.row.truth': 'La verdad',
  'occW.row.assumes': 'Qué supone',
  'occW.v.survey':
    '{n} estrellas sintéticas, {k} tránsitos inyectados ({t} por estrella y casilla), umbral {s} sigmas, al menos {m} tránsitos',
  'occW.v.bin': '{r} radios terrestres, {p} días',
  'occW.v.efficiency':
    'Se recupera el {e} por ciento de los planetas que transitan aquí; {g} es la suma de las probabilidades de tránsito sobre las estrellas',
  'occW.v.completeness':
    '{c} planetas listados por cada planeta por estrella ({f} de las estrellas tienen {m} o más tránsitos a este período)',
  'occW.v.listed': '{n} listados',
  'occW.v.reliability':
    '{r}: se toma el {p} por ciento de los listados por planetas',
  'occW.v.rate':
    '{v} planetas por estrella, de {lo} a {hi} (intervalo {lv}); {n} listados',
  'occW.v.rateAbove': ' Es más de un planeta por estrella en la casilla.',
  'occW.v.limit':
    'Sin listados: menos de {v} planetas por estrella en la casilla, al 95 por ciento. No es una tasa.',
  'occW.v.floor':
    'Sin acotar: el sondeo lista {c} planetas por cada planeta por estrella aquí, menos de {f}. Ni tasa ni límite.',
  'occW.v.sum':
    '{s} planetas por estrella sobre las {a} casillas con tasa; {b} casillas dan solo un límite y {c} no están acotadas y no se suman',
  'occW.v.truth':
    '{t} planetas por estrella en la casilla; {r} de los {n} listados son planetas y {f} no',
  'occW.a':
    'Estrellas y planetas sintéticos. La búsqueda es el filtro adaptado al período y la fase conocidos, así que la completitud es mejor que la de una búsqueda real. El intervalo lleva solo el error de cuenta de los listados: la fiabilidad se declara y se toma como exacta, y la completitud tiene un pequeño error propio.',
};
