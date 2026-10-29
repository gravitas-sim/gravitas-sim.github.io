// Las palabras del instrumento de efectos del detector, en español (Prompt 211).
export const ES_EFFECTS = {
  'fxW.title': 'Qué le hace un detector a una medida',
  'fxW.note':
    'Una imagen sintética de una estrella brillante y otras más débiles, hecha con los efectos del detector que actives y medida con la herramienta de fotometría del Observatorio. La herramienta rechaza un píxel en el límite lineal y un píxel que el archivo asociado de la imagen marca; el número que habría dado se muestra junto al rechazo.',
  'fxW.control.bright': 'Estrella brillante S (magnitud V)',
  'fxW.control.exposure': 'Exposición',
  'fxW.control.nonlinear': 'No linealidad cerca de la capacidad máxima',
  'fxW.control.bleed': 'Desbordamiento de carga',
  'fxW.control.cosmic': 'Trazas de rayos cósmicos',
  'fxW.control.fwhm': 'Anchura del perfil (FWHM, píxeles)',
  'fxW.control.flags': 'Mostrar las marcas del archivo asociado',
  'fxW.toggle.0': 'desactivado',
  'fxW.toggle.1': 'activado',
  'fxW.row.model': 'Modelo',
  'fxW.m':
    'Una imagen CCD sintética con efectos declarados: una caída tipo tanh por encima de un codo en 0,8 de la capacidad máxima, trazas de rayos cósmicos y desbordamiento de carga a lo largo de las columnas; un perfil gaussiano integrado sobre píxeles cuadrados',
  'fxW.row.sampling': 'Muestreo',
  'fxW.v.sampling':
    'FWHM de {w} píxeles, {r} (hacen falta unos 2 para muestrear un perfil); el píxel del máximo guarda de {lo} a {hi} por ciento de la luz de una estrella, según dónde esté la estrella dentro de él; el flujo dentro de una apertura de radio 1,5 FWHM varía en {s} por ciento (1 sigma) con esa posición',
  'fxW.regime.under': 'submuestreado',
  'fxW.regime.adequate': 'bien muestreado',
  'fxW.regime.over': 'sobremuestreado',
  'fxW.row.limit': 'Límite lineal',
  'fxW.v.limitOn':
    'un píxel con {lim} electrones se lee 1 por ciento por debajo de lo lineal; un píxel lleno ({fw} electrones) se lee {plateau}',
  'fxW.v.limitOff':
    'la respuesta es lineal hasta la capacidad máxima; un píxel lleno se lee {fw} electrones (la herramienta rechaza a menos de 5 sigmas de ruido de lectura de ese valor)',
  'fxW.row.star': 'Estrella {id}',
  'fxW.role.bright': 'la estrella brillante',
  'fxW.role.trail': 'débil, en la columna de la estrella brillante',
  'fxW.role.control': 'débil, fuera de toda columna',
  'fxW.role.ladder': 'un peldaño de la escalera de brillo',
  'fxW.v.measured':
    '{role}, V = {m}: {net} electrones, a {pull} sigmas de los {truth} que puso el modelo; marcas del archivo: {flags}',
  'fxW.v.refused.saturated':
    '{role}, V = {m}: rechazada, un píxel de la apertura está en el límite o por encima; sin tenerlo en cuenta, leería {ratio} por ciento de los {truth} electrones que puso el modelo; marcas del archivo: {flags}',
  'fxW.v.refused.masked':
    '{role}, V = {m}: rechazada, un píxel que el archivo marca como desbordamiento o rayo cósmico está en la apertura; sin tenerlo en cuenta, leería {ratio} por ciento de los {truth} electrones que puso el modelo; marcas del archivo: {flags}',
  'fxW.v.refused.other':
    '{role}, V = {m}: rechazada ({code}); marcas del archivo: {flags}',
  'fxW.flags.none': 'ninguna',
  'fxW.flag.saturated': 'saturado',
  'fxW.flag.bleed': 'desbordamiento',
  'fxW.flag.cosmic': 'rayo cósmico',
  'fxW.flag.nonlinear': 'no lineal',
  'fxW.row.bleed': 'Desbordamiento',
  'fxW.v.bleed':
    '{n} píxeles recibieron carga de píxeles saturados; se perdieron {lost} electrones en el tope de longitud o en el borde de la imagen',
  'fxW.v.bleedOff':
    'desactivado: un píxel saturado guarda su capacidad máxima y nada se derrama',
  'fxW.row.cosmic': 'Trazas de rayos cósmicos',
  'fxW.v.cosmic': '{n} trazas, {p} píxeles marcados',
  'fxW.v.cosmicOff': 'desactivado: no hay rayos cósmicos en esta imagen',
  'fxW.row.assumes': 'Qué deja fuera',
  'fxW.a':
    'la pérdida por transferencia de carga; una dispersión de la pérdida de energía de los rayos cósmicos; columnas calientes, resplandor del amplificador y persistencia; el desbordamiento entre filas; la difusión de carga entre píxeles; la respuesta medida de cualquier detector (la curva, el depósito de las trazas y la regla de desbordamiento son modelos declarados, no medidas)',
  'fxW.axis.x': 'Carga recogida en el máximo (electrones)',
  'fxW.axis.y': 'Registrado (electrones)',
  'fxW.legend.frame': 'imagen sintética',
  'fxW.legend.flags':
    'rojo saturado · magenta desbordamiento · cian rayo cósmico · naranja no lineal',
  'fxW.legend.plot':
    'los máximos de las estrellas frente a la respuesta declarada',
};
