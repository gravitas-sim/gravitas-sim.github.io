// Las palabras del instrumento del telescopio, en español (Prompt 208).
// Las mismas claves que en.telescope.js; sin revisar por un hablante nativo.
export const ES_TELESCOPE = {
  'telW.title': 'Un telescopio, su apertura y el aire',
  'telW.note':
    'Una imagen sintética de una estrella doble o de un campo débil, hecha con el telescopio que ajustes y medida con la herramienta de PSF del Observatorio. Dos anchuras se mantienen separadas: la separación de Rayleigh se calcula a partir de la apertura; el FWHM medido se lee de las estrellas de esta imagen.',
  'telW.control.aperture': 'Apertura',
  'telW.control.focal': 'Relación focal',
  'telW.control.wavelength': 'Longitud de onda',
  'telW.control.seeing': 'Seeing (FWHM; 0 es el espacio)',
  'telW.control.obstruction': 'Obstrucción central',
  'telW.control.exposure': 'Exposición',
  'telW.control.scene': 'Campo',
  'telW.control.separation': 'Separación del par',
  'telW.scene.0': 'estrella doble',
  'telW.scene.1': 'campo débil',
  'telW.row.model': 'Modelo',
  'telW.m':
    'Un patrón de Airy de la apertura convolucionado con un perfil de seeing de Moffat, en una imagen sintética',
  'telW.row.rayleigh':
    'Separación de Rayleigh (calculada a partir de la apertura y la longitud de onda)',
  'telW.row.fwhm':
    'FWHM medido (ajustado a las estrellas de referencia de esta imagen)',
  'telW.v.fwhm': '{w} ± {s} segundos de arco',
  'telW.v.fwhmLimited':
    '{w} ± {s} segundos de arco, un ajuste de modelo: el perfil no es una Moffat',
  'telW.v.none':
    'no se pudo medir ninguna anchura (una estrella estaba saturada o demasiado cerca de un borde)',
  'telW.row.airy':
    'El FWHM propio del patrón de difracción (calculado, sin seeing)',
  'telW.row.seeing': 'El seeing que ajustaste',
  'telW.row.profile': 'FWHM del perfil combinado (calculado)',
  'telW.row.pair': 'El par',
  'telW.v.pair':
    'separación {s} segundos de arco, {r} veces la separación de Rayleigh; la caída entre las estrellas es del {d} por ciento (dos patrones de difracción a la separación de Rayleigh caen un 26,5 por ciento)',
  'telW.row.faint': 'La estrella débil',
  'telW.v.faintSeen':
    'V = {m}: aparece en la lista del detector; la ecuación del CCD da una señal a ruido de {e}',
  'telW.v.faintMissed':
    'V = {m}: no aparece en la lista; la ecuación del CCD da una señal a ruido de {e}',
  'telW.row.gather': 'Luz recogida',
  'telW.v.gather':
    '{a} veces un telescopio de 10 cm; {b} veces el ojo adaptado a la oscuridad',
  'telW.row.scale': 'Escala de placa',
  'telW.v.scale':
    '{p} segundos de arco por píxel (distancia focal {f} m, píxeles de 5 micras)',
  'telW.row.saturated': 'Aviso',
  'telW.v.saturated': 'una estrella está saturada: no se mide su anchura',
  'telW.row.assumes': 'Lo que deja fuera',
  'telW.a':
    'la óptica adaptativa; una pantalla de fase de Kolmogorov (el seeing es una Moffat de FWHM dado, igual en toda longitud de onda y apertura); las aberraciones y una araña; una respuesta del detector distinta del píxel cuadrado; más de una longitud de onda; el brillo de una estrella es su magnitud V sea cual sea la longitud de onda. Toda imagen es sintética.',
  'telW.axis.x': 'Desplazamiento a lo largo del par (segundos de arco)',
  'telW.axis.y': 'Brillo (máximo = 1)',
  'telW.legend.pair': 'las dos estrellas, sumadas (modelo)',
  'telW.legend.row': 'esta imagen, la fila que pasa por el par',
  'telW.legend.faint': 'estrella débil aquí',
  'telW.legend.frame': 'imagen sintética',
};
