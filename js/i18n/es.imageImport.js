// =============================================================================
// Las palabras de la importación de imágenes, en español
// -----------------------------------------------------------------------------
// Las registra js/observatory/imageImport.js cuando alguien elige por primera
// vez una imagen FITS, un PNG o un JPEG (por medio del traductor del
// Observatorio), de modo que ninguna otra página las lleva. Mismos ids que
// en.imageImport.js. Cada código de rechazo tiene su frase; el mensaje en
// inglés del lector se muestra al lado, porque lleva los números (una cadena
// calculada no se traduce nunca). Sin leer por una persona hispanohablante.
// =============================================================================

export const ES_IMAGEIMPORT = {
  'obs.imp.title': 'Una imagen de tu dispositivo',
  'obs.imp.local':
    'El archivo se lee en este dispositivo, en un proceso en segundo plano de esta página. No se sube y no se envía nada a ninguna parte.',
  'obs.imp.reading': 'Leyendo {name}…',
  'obs.imp.cancel': 'Cancelar',
  'obs.imp.canceled':
    'Cancelado. Se detuvo la lectura, se liberó la memoria que ocupaba y no se guardó nada.',
  'obs.imp.close': 'Cerrar',
  'obs.imp.readerSays': 'En palabras del propio lector (en inglés):',
  'obs.imp.ready': 'Se leyó {name}. Descríbelo y luego ábrelo.',
  'obs.imp.open': 'Abrir la imagen',
  'obs.imp.opened': 'Se abrió {name}: {w} por {h} píxeles.',
  'obs.imp.kind.fits': 'Imagen FITS',
  'obs.imp.kind.png': 'Imagen PNG',
  'obs.imp.kind.jpeg': 'Imagen JPEG',
  'obs.imp.fact.file': 'Archivo',
  'obs.imp.fact.kind': 'Tipo',
  'obs.imp.fact.size': 'Tamaño',
  'obs.imp.fact.sizeValue': '{w} por {h} píxeles, {bytes} bytes',
  'obs.imp.fact.use': 'Se trata como',
  'obs.imp.quantitative':
    'cuantitativa: sus números pueden medir luz, cuando el contrato de abajo esté completo',
  'obs.imp.useDisplay':
    'solo para mostrar: marcas, y nada que necesite luz ni cielo',
  'obs.imp.fact.digest': 'SHA-256 (primeros 16 dígitos)',
  'obs.imp.fact.bitpix': 'Almacenada como (BITPIX)',
  'obs.imp.fact.hdu': 'La imagen está en la unidad',
  'obs.imp.fact.blank': 'Píxeles en blanco (se guardan como faltantes)',
  'obs.imp.fact.wcs': 'Coordenadas del cielo',
  'obs.imp.fact.wcsValue':
    'plano tangente, unos {scale} segundos de arco por píxel',
  'obs.imp.fact.noWcs': 'ninguna en la cabecera',
  'obs.imp.displayOnly':
    'Un PNG o un JPEG es solo para mostrar: sus números son niveles de gris de 0 a 255, hechos para el ojo, no una medida de la luz ni de la posición en el cielo. Puedes marcarlo y medirlo en píxeles, o en una unidad que des con un par de referencia. La fotometría y la astrometría se rechazan, porque necesitan valores de píxel que cuenten luz y posiciones ligadas al cielo.',
  'obs.imp.needs':
    'Una imagen cuantitativa necesita: valores de píxel que midan luz en una unidad dicha; un rango donde el detector es lineal; un nivel de saturación; ruido a partir de una ganancia y un ruido de lectura, o un plano de varianza; un estado de calibración; un tiempo con su escala; un tiempo de exposición; y, para el cielo, coordenadas del cielo. Un cuadro FITS puede traerlos. Una imagen común no.',
  'obs.imp.claims':
    'Lo que dice la cabecera del archivo. Son afirmaciones del archivo, con la tarjeta de la que viene cada una; ninguna se da por buena hasta que la aceptes abajo.',
  'obs.imp.claimsNone': 'La cabecera no afirma ninguno de estos datos.',
  'obs.imp.claim.unit': 'Unidad del píxel (BUNIT)',
  'obs.imp.claim.exposureSeconds': 'Exposición, segundos',
  'obs.imp.claim.dateObs': 'Fecha y hora de observación',
  'obs.imp.claim.mjdObs': 'Fecha de observación, MJD',
  'obs.imp.claim.timeScale': 'Escala de tiempo',
  'obs.imp.claim.gain': 'Ganancia, electrones por cuenta',
  'obs.imp.claim.readNoise': 'Ruido de lectura, electrones',
  'obs.imp.claim.saturation': 'Nivel de saturación',
  'obs.imp.claim.object': 'Objeto',
  'obs.imp.fromCard': 'de la tarjeta {card} de la cabecera',
  'obs.imp.fields': 'Describe la imagen (todo es opcional)',
  'obs.imp.notStated': 'no indicado',
  'obs.imp.field.time': 'Hora de la exposición (fecha y hora, ISO 8601)',
  'obs.imp.field.timeScale': 'Escala de tiempo',
  'obs.imp.field.timeRef': 'La hora es la de la exposición en su',
  'obs.imp.ref.start': 'inicio',
  'obs.imp.ref.mid': 'mitad',
  'obs.imp.ref.end': 'final',
  'obs.imp.effect.time':
    'Hora: el panel de marcas muestra la hora del cuadro con su escala y el registro del cuaderno la lleva. Una hora sin escala no se muestra como hora, así que una fecha necesita su escala; elige «local» si es el reloj del lugar donde se tomó la imagen.',
  'obs.imp.field.scale': 'Escala del píxel, segundos de arco por píxel',
  'obs.imp.effect.scale':
    'Escala: se guarda con la imagen y en el registro. No hace que las marcas midan en el cielo: una longitud en segundos de arco necesita las coordenadas del cielo de un cuadro FITS, o un par de referencia que marques tú, que sirve en cualquier imagen.',
  'obs.imp.field.orientation':
    'Ángulo del norte, grados desde arriba hacia el este',
  'obs.imp.field.east': 'El este está a la',
  'obs.imp.east.left': 'izquierda',
  'obs.imp.east.right': 'derecha',
  'obs.imp.effect.orientation':
    'Orientación: se guarda con la imagen y en el registro, como una afirmación tuya. Nada en esta versión calcula con ella, y no da posiciones en el cielo.',
  'obs.imp.field.pixelsAre': 'Los valores de píxel son',
  'obs.imp.pixelsAre.light': 'luz, como la registró el detector',
  'obs.imp.pixelsAre.display': 'niveles para mostrar, o no lo sé',
  'obs.imp.effect.pixelsAre':
    'Si los píxeles son luz, el contrato de píxeles de abajo puede volver cuantitativa la imagen. Si son niveles para mostrar, o no lo sabes, la imagen es solo para mostrar: se puede marcar y nada más.',
  'obs.imp.field.unit': 'Unidad de los valores de píxel',
  'obs.imp.field.calibration': 'Estado de calibración',
  'obs.imp.cal.raw': 'sin procesar',
  'obs.imp.cal.bias-subtracted': 'con el bias restado',
  'obs.imp.cal.dark-subtracted': 'con la oscuridad restada',
  'obs.imp.cal.flat-fielded': 'con campo plano',
  'obs.imp.cal.calibrated': 'totalmente calibrada',
  'obs.imp.field.exposure': 'Exposición, segundos',
  'obs.imp.field.saturation': 'Nivel de saturación (valor de píxel)',
  'obs.imp.field.gain': 'Ganancia, electrones por cuenta',
  'obs.imp.field.readNoise': 'Ruido de lectura, electrones',
  'obs.imp.field.linearLimit': 'Lineal hasta (valor de píxel)',
  'obs.imp.field.linearHow': 'Cómo sabes que es lineal',
  'obs.imp.effect.contract':
    'Contrato: la fotometría se permite solo cuando todo esto está dicho y nada en la historia de la imagen la estiró o la recodificó. Un número copiado de la cabecera se marca como de la cabecera; uno que escribes tú se marca como tuyo. El veredicto de abajo dice qué falta todavía.',
  'obs.imp.verdict': 'Qué permitirá esta imagen',
  'obs.imp.use.marking': 'Marcas',
  'obs.imp.use.photometry': 'Fotometría',
  'obs.imp.use.astrometry': 'Astrometría',
  'obs.imp.allowed': 'permitida',
  'obs.imp.refused': 'rechazada.',
  'obs.imp.missing': 'Falta todavía para la fotometría: {list}.',
  'obs.imp.gap.linearity': 'un rango lineal y cómo lo sabes',
  'obs.imp.gap.saturation': 'un nivel de saturación',
  'obs.imp.gap.noise': 'una ganancia y un ruido de lectura',
  'obs.imp.gap.calibration': 'un estado de calibración',
  'obs.imp.gap.time': 'una hora con su escala',
  'obs.imp.gap.exposure': 'un tiempo de exposición',
  'obs.imp.why.display-only':
    'Esta imagen es solo para mostrar; abajo está lo que necesita una imagen cuantitativa.',
  'obs.imp.why.not-flux': 'Los valores de píxel no miden luz.',
  'obs.imp.why.incomplete-contract': 'El contrato de píxeles está incompleto.',
  'obs.imp.why.no-wcs': 'La imagen no tiene coordenadas del cielo.',
  'obs.imp.why.wcs-unsupported':
    'Sus coordenadas del cielo no están en una forma que este espacio de trabajo lea.',
  'obs.imp.why.lossy-history':
    'Los píxeles pasaron por un paso que no conserva la luz.',
  'obs.imp.why.geometry-unrecorded':
    'Los píxeles se movieron sin sus coordenadas del cielo.',
  'obs.imp.why.invalid': 'La descripción todavía no es válida.',
  'obs.imp.problem.timeValue': 'Una escala de tiempo necesita una hora.',
  'obs.imp.problem.timeFormat':
    'La hora no es una fecha y hora como 2026-03-14T02:15:30.',
  'obs.imp.problem.timeScale': 'Una hora necesita su escala; elige una.',
  'obs.imp.problem.scaleRange':
    'La escala del píxel es un número mayor que 0 y de a lo sumo 3600 segundos de arco por píxel.',
  'obs.imp.problem.orientationRange':
    'El ángulo del norte es al menos 0 y menor que 360 grados.',
  'obs.imp.problem.exposureRange':
    'La exposición es un número de segundos mayor que 0.',
  'obs.imp.problem.gainRange': 'La ganancia es un número mayor que 0.',
  'obs.imp.problem.saturationRange':
    'El nivel de saturación es un número mayor que 0.',
  'obs.imp.problem.linearLimitRange':
    'El límite lineal es un número mayor que 0.',
  'obs.imp.problem.readNoiseRange':
    'El ruido de lectura es un número, 0 o más.',
  'obs.imp.problem.linearHow':
    'Un límite lineal necesita una línea que diga cómo lo sabes.',
  'obs.imp.no.not-fits':
    'Esto no es un archivo FITS: no empieza como empieza un archivo FITS.',
  'obs.imp.no.truncated':
    'El archivo termina antes de lo debido. Se cortó o se guardó solo en parte; guárdalo de nuevo y elígelo otra vez.',
  'obs.imp.no.header-too-large':
    'La cabecera es mayor que los 16 bloques que permite este lector.',
  'obs.imp.no.card-malformed':
    'Una tarjeta de la cabecera no está escrita como la escribe FITS, así que no se puede confiar en el archivo.',
  'obs.imp.no.duplicate-card':
    'Una tarjeta de la cabecera que debe aparecer una vez aparece dos, así que el archivo dice dos cosas a la vez.',
  'obs.imp.no.missing-card':
    'Falta una tarjeta de la cabecera que toda imagen necesita.',
  'obs.imp.no.dimension-overflow':
    'La cabecera da un tamaño demasiado grande para ser una imagen real.',
  'obs.imp.no.nonfinite-header':
    'Un número de la cabecera no es finito (es infinito o no es un número).',
  'obs.imp.no.axis-invalid':
    'La imagen tiene un lado que no es un número entero de píxeles, de al menos 1.',
  'obs.imp.no.hdu-unsupported':
    'El archivo tiene un tipo de unidad que este lector no lee. Aquí solo se lee una imagen bidimensional; una tabla o grupos aleatorios no.',
  'obs.imp.no.bitpix-unsupported':
    'Los píxeles están almacenados de una forma que este lector no lee. Lee enteros de 8, 16 y 32 bits y coma flotante de 32 y 64 bits.',
  'obs.imp.no.compressed':
    'La imagen está comprimida por teselas, algo que este lector no lee.',
  'obs.imp.no.axes-unsupported':
    'No es una imagen bidimensional. Aquí no se corta un cubo; exporta un plano como imagen propia.',
  'obs.imp.no.too-large':
    'El cuadro es mayor que los 4.194.304 píxeles (2.048 por 2.048) o los 8.192 píxeles por lado que esta página admite. Recórtalo o redúcelo primero.',
  'obs.imp.no.file-too-large':
    'El archivo es mayor que los 33.647.040 bytes que esta página admite. No se leyó.',
  'obs.imp.no.too-many-hdus':
    'No se encontró ninguna imagen en las primeras 8 unidades del archivo, y el lector no busca más allá.',
  'obs.imp.no.no-image':
    'El archivo no tiene ninguna imagen bidimensional. Una tabla no se lee como imagen.',
  'obs.imp.no.scale-invalid':
    'BSCALE vale 0, lo que daría el mismo valor a todos los píxeles.',
  'obs.imp.no.blank-invalid':
    'BLANK no sirve para el tipo de píxel de esta imagen.',
  'obs.imp.no.nonfinite-pixel':
    'Un píxel es infinito. Un blanco es NaN y nada en una imagen es infinito, así que se rechazó el archivo en vez de adivinar.',
  'obs.imp.no.canceled': 'Se canceló la lectura.',
  'obs.imp.no.wcs-projection':
    'Las coordenadas del cielo usan una proyección que este espacio de trabajo no lee. Solo se leen ascensión recta y declinación en el plano tangente (TAN).',
  'obs.imp.no.wcs-distortion':
    'Las coordenadas del cielo llevan una distorsión (SIP o TPV) que este espacio de trabajo no aplica, así que las posiciones saldrían mal.',
  'obs.imp.no.wcs-incomplete':
    'Las coordenadas del cielo de la cabecera están incompletas o no sirven.',
  'obs.imp.no.wcs-ambiguous':
    'La cabecera da las coordenadas del cielo en dos formas a la vez.',
  'obs.imp.no.empty-file': 'El archivo está vacío.',
  'obs.imp.no.unknown-format':
    'Esto no es un archivo FITS, PNG ni JPEG, diga lo que diga su nombre.',
  'obs.imp.no.png-malformed':
    'El PNG está dañado o editado: su estructura no se sostiene.',
  'obs.imp.no.jpeg-malformed':
    'El JPEG está dañado o editado: su estructura no se sostiene.',
  'obs.imp.no.raster-unsupported':
    'Esta imagen está codificada de una forma que los navegadores no leen, así que se rechazó.',
  'obs.imp.no.undecodable':
    'El navegador no pudo decodificar esta imagen: sus datos de píxel están dañados o no son lo que dice su cabecera.',
  'obs.imp.no.dimension-mismatch':
    'La cabecera y los píxeles de la imagen no coinciden en su tamaño, así que se rechazó en vez de leerla mal.',
  'obs.imp.no.no-decoder':
    'Este navegador no puede decodificar una imagen en segundo plano. Prueba con una imagen FITS, o con otro navegador.',
  'obs.imp.no.unreadable': 'El navegador no pudo leer ese archivo.',
  'obs.imp.no.timeout': 'La lectura tardó demasiado y se detuvo.',
  'obs.imp.no.resourceLimit':
    'La lectura ocuparía más memoria de la que esta página permite, así que no se empezó.',
  'obs.imp.no.workerFailed':
    'Falló el proceso en segundo plano que lee el archivo. No se guardó nada.',
  'obs.imp.no.other': 'Se rechazó el archivo.',
};
