// Las palabras del panel de ajuste de cúmulos, en español (Prompt 219, CLUSTER_FITTING.md).
export const ES_CLUSTER = {
  'clusterObs.note':
    'Ajusta isocronas MIST a las estrellas a la vista, sobre dos cosas solamente: la edad del cúmulo y su módulo de distancia. Todo lo demás es lo que usted declara aquí, y la respuesta depende de ello.',
  'clusterObs.feh': 'Metalicidad [Fe/H], supuesta',
  'clusterObs.E': 'Enrojecimiento E(g − r), supuesto',
  'clusterObs.eps': 'Fracción de estrellas que no son miembros, supuesta',
  'clusterObs.dmLo': 'Módulo de distancia desde',
  'clusterObs.dmHi': 'hasta',
  'clusterObs.fit': 'Ajustar',
  'clusterObs.busy': 'Ajustando: unos segundos.',
  'clusterObs.needs':
    'Hace falta una tabla con magnitudes g y r de los miembros del cúmulo: recorte primero a los miembros.',
  'clusterObs.row.age': 'Edad',
  'clusterObs.row.logAge': 'log de la edad',
  'clusterObs.row.dm': 'Módulo de distancia',
  'clusterObs.row.distance': 'Distancia',
  'clusterObs.row.members':
    'Miembros (las estrellas de la ventana, menos la fracción supuesta)',
  'clusterObs.row.stat': 'Estadístico (desviación, menor es mejor)',
  'clusterObs.row.valley': 'Edad frente a distancia',
  'clusterObs.row.assumed': 'Supuesto, no ajustado',
  'clusterObs.v.interval': '{v} ({lo} a {hi}, una sigma)',
  'clusterObs.v.open':
    '{v}: los datos lo dejan abierto dentro de la malla de los modelos',
  'clusterObs.v.age': '{v} Ga',
  'clusterObs.v.dm': '{v} mag',
  'clusterObs.v.pc': '{v} pc',
  'clusterObs.v.valley':
    'correlación {r} en la región que permiten los datos: una edad mayor va con un cúmulo más cercano',
  'clusterObs.v.valleyNone':
    'la región permitida es demasiado pequeña para medir una correlación',
  'clusterObs.v.assumed':
    '[Fe/H] {feh}, E(g − r) {E}, A_g / E(g − r) = {R}, {eps} no son miembros',
  'clusterObs.nc.members':
    'No restringido: {n} estrellas en la ventana dejan unos {m} miembros con la fracción supuesta, y el ajuste necesita {min}.',
  'clusterObs.nc.no-cluster':
    'No restringido: un cúmulo de estrellas supera a un campo de estrellas solas por solo {gain} en el estadístico, así que aquí no hay un cúmulo que ajustar.',
  'clusterObs.nc.interval':
    'No restringido por un lado: un intervalo llega al borde de las edades de los modelos o de su rango de distancias, así que la respuesta es un límite, no un valor.',
  'clusterObs.warn.ageAtOldEdge':
    'La mejor edad es la mayor que alcanzan los modelos (4 Ga): el cúmulo puede ser más viejo.',
  'clusterObs.warn.ageAtYoungEdge':
    'La mejor edad es la menor que alcanzan los modelos (1 Ga): el cúmulo puede ser más joven.',
  'clusterObs.warn.dmAtEdge':
    'El mejor módulo de distancia está en el extremo de su rango: ámplielo.',
  'clusterObs.assumes': 'Lo que supone este resultado',
  'clusterObs.a.feh':
    'La metalicidad es la que usted fijó. Otra distinta mueve la edad y la distancia más que los intervalos de abajo.',
  'clusterObs.a.single':
    'Las estrellas son simples: el modelo no tiene binarias, y una fracción de binarias sesga el ajuste sin ensanchar los intervalos.',
  'clusterObs.a.members':
    'Los miembros son las estrellas de la tabla, como usted las recortó; la fracción supuesta que no son miembros se reparte por igual en el color.',
  'clusterObs.a.selection':
    'La selección del sondeo en magnitud es desconocida y no se usa: el ajuste compara colores en cada magnitud, no cuentas.',
  'clusterObs.a.model':
    'Las isocronas son las de MIST v1.2: un modelo, no una medida. Entre sus edades y metalicidades la curva es una mezcla de las vecinas.',
  'clusterObs.a.interval':
    'Un intervalo es donde el estadístico sube 1 desde su mínimo: dice cómo se dispersaría una medida repetida si todos los supuestos fueran ciertos, no cuán segura es la edad.',
  'clusterObs.cmd': 'Las estrellas y la mejor isocrona',
  'clusterObs.cmd.colour': 'g − r',
  'clusterObs.cmd.g': 'g',
  'clusterObs.cmd.label':
    'Diagrama color–magnitud de {n} estrellas con la mejor isocrona dibujada encima',
  'clusterObs.profileAge': 'El estadístico frente a la edad',
  'clusterObs.profileDm': 'El estadístico frente al módulo de distancia',
  'clusterObs.profile.label':
    'La subida del estadístico sobre su mínimo frente a {what}; el intervalo es donde está por debajo de 1',
  'clusterObs.profile.age': 'log de la edad',
  'clusterObs.profile.dm': 'módulo de distancia',
  'clusterObs.profile.delta': 'subida del estadístico',
  'clusterObs.valley.title': 'El valle: la mejor distancia a cada edad',
  'clusterObs.valley.label':
    'El módulo de distancia que mejor ajusta a cada edad: una línea a lo largo de la cual los datos no distinguen las edades',
  'clusterObs.record': 'Descargar el registro',
  'clusterObs.recordName': 'ajuste-de-cumulo',
  'clusterObs.synthetic': 'Cúmulo sintético, verdad conocida',
};
