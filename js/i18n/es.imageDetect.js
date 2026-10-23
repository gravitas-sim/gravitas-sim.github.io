// =============================================================================
// Las palabras de la herramienta de detección y PSF, en español
// -----------------------------------------------------------------------------
// Las registra js/observatory/imageDetect.js cuando la herramienta se abre por
// primera vez (con el traductor del Observatorio), de modo que ninguna otra
// página las lleva. Identificadores obs.dt.*; el título del panel está en
// es.observatory.js (está en la página antes de que cargue la herramienta). Sin
// revisar por una persona hispanohablante fluida.
// =============================================================================

export const ES_IMAGEDETECT = {
  'obs.dt.help':
    'Encuentra las fuentes de la imagen: cada grupo de píxeles que sobresale del cielo local por el número de sigmas fijado abajo. Cada una recibe una posición, un tamaño, un brillo medido como en la herramienta de fotometría, una forma y avisos que dicen cuándo no fiarse de ella. Las fuentes que se tocan no se separan, y un campo muy poblado no es tarea de esta herramienta.',
  'obs.dt.no.display-only':
    'Esta imagen es solo para mostrar: se puede marcar, pero encontrar fuentes necesita valores de píxel que midan luz, y los suyos se han estirado, recodificado o nunca tuvieron sus unidades anotadas.',
  'obs.dt.no.no-contract':
    'Esta imagen no declara un contrato de píxeles (unidades, ganancia, ruido de lectura, saturación), así que es solo para mostrar: se puede marcar, y la detección espera a un contrato.',
  'obs.dt.no.not-flux':
    'Los valores de píxel no miden luz (indicadores, niveles de visualización o una unidad que nadie anotó), así que no hay nada que detectar.',
  'obs.dt.no.incomplete-contract':
    'La detección necesita el contrato de píxeles completo; a este le falta: {missing}.',
  'obs.dt.no.lossy-history':
    'Los píxeles pasaron por un paso que no conserva la luz medida (un estiramiento, una codificación con pérdida o un remuestreo que no conserva el flujo), así que no se pueden medir fuentes en ellos.',
  'obs.dt.no.raw-frame':
    'Este fotograma está en bruto: su fondo aún contiene el bias, así que el ruido del cielo sería erróneo. Calíbralo primero.',
  'obs.dt.no.invalid': 'Esta no es una descripción de imagen válida.',
  'obs.dt.no.bad-parameter':
    'Un ajuste está fuera de rango ({name}). Usa un ancho entre 0,5 y 50 píxeles, un umbral de 2 a 100 sigmas, un área mínima entera de al menos 1 y una caja de 4 a 256 píxeles.',
  'obs.dt.no.no-background':
    'No se pudo estimar el cielo: todas las cajas de la imagen están enmascaradas o vacías.',
  'obs.dt.no.edge':
    'No ajustada: el cuadrado alrededor de la estrella sale de la imagen.',
  'obs.dt.no.saturated':
    'No ajustada: píxeles cercanos a la estrella llegan al nivel en que el detector deja de ser lineal, así que la forma de su luz no es la de la estrella.',
  'obs.dt.no.masked':
    'No ajustada: {pixels} píxeles alrededor de la estrella están enmascarados o no tienen valor.',
  'obs.dt.no.no-convergence': 'No ajustada: el ajuste no se estabilizó.',
  'obs.dt.no.not-constrained':
    'No ajustada: los píxeles no fijan todos los parámetros del modelo.',
  'obs.dt.no.no-stars':
    'No se pudo ajustar ninguna estrella. Detecta primero las fuentes y comprueba que alguna sea brillante, redonda y sin avisos; o baja el límite de señal a ruido.',
  'obs.dt.settings': 'Ajustes de la detección',
  'obs.dt.fwhm': 'Ancho de una estrella, FWHM (píxeles)',
  'obs.dt.sigma': 'Umbral (sigmas sobre el cielo)',
  'obs.dt.area': 'Fuente más pequeña (píxeles)',
  'obs.dt.box': 'Caja para el cielo (píxeles)',
  'obs.dt.settingsNote':
    'La imagen se suaviza con una gaussiana del ancho de arriba, y un píxel cuenta cuando sobresale más que el umbral por el ruido suavizado sobre el cielo de su caja de 16 píxeles. Un umbral más bajo o una fuente más pequeña encuentra cosas más débiles y más falsas.',
  'obs.dt.detect': 'Encontrar fuentes',
  'obs.dt.marks': 'Añadir como marcas',
  'obs.dt.csv': 'Guardar como CSV',
  'obs.dt.picture':
    'La imagen con las fuentes encontradas rodeadas; las estrellas usadas para el ancho van rodeadas con un segundo color. La tabla de abajo las lista todas.',
  'obs.dt.table': 'Fuentes encontradas',
  'obs.dt.col.id': 'Fuente',
  'obs.dt.col.x': 'x',
  'obs.dt.col.y': 'y',
  'obs.dt.col.area': 'Área (píxeles)',
  'obs.dt.col.peak': 'Pico (e⁻)',
  'obs.dt.col.flux': 'Luz neta (e⁻)',
  'obs.dt.col.fluxSigma': 'Error',
  'obs.dt.col.snr': 'Señal a ruido',
  'obs.dt.col.ellipticity': 'Elipticidad',
  'obs.dt.col.orientation': 'Ángulo (°)',
  'obs.dt.col.fwhm': 'Ancho (píxeles)',
  'obs.dt.col.flags': 'Avisos',
  'obs.dt.col.psf': 'Usada para el ancho',
  'obs.dt.yes': 'sí',
  'obs.dt.noFlux': 'no medida',
  'obs.dt.flag.saturated': 'saturada',
  'obs.dt.flag.edge': 'borde',
  'obs.dt.flag.masked': 'junto a una máscara',
  'obs.dt.flag.crowded': 'apiñada',
  'obs.dt.flag.sharp': 'puntual',
  'obs.dt.flagHelp':
    'Saturada: un píxel pasa el nivel en que el detector es lineal. Borde: toca el borde de la imagen. Junto a una máscara: hay un píxel enmascarado al lado. Apiñada: otra fuente está tan cerca que alcanza su anillo de cielo. Puntual: un solo píxel contiene más de la mitad de su luz, lo que es tanto un rayo cósmico o un píxel caliente como una estrella.',
  'obs.dt.found': 'Se encontraron {n} fuentes, {m} de ellas con avisos.',
  'obs.dt.truncated': 'Solo se listan las primeras {n}.',
  'obs.dt.limits':
    'Límites: no se separan fuentes que se tocan (dos estrellas en contacto son una fuente), no hay campos muy poblados, y el flujo es la apertura de la herramienta de fotometría, no un ajuste.',
  'obs.dt.psfTitle': 'El ancho de las estrellas',
  'obs.dt.psfHelp':
    'Se ajusta un modelo de la luz de la estrella a cada estrella que es brillante, redonda y está sola, y se combinan los anchos. El perfil apilado muestra cómo cae la luz desde el centro.',
  'obs.dt.model': 'Modelo',
  'obs.dt.model.gaussian': 'Gaussiana',
  'obs.dt.model.moffat': 'Moffat',
  'obs.dt.weights': 'Pesos',
  'obs.dt.weights.poisson': 'Según el ruido de cada píxel',
  'obs.dt.weights.none': 'Iguales',
  'obs.dt.snr': 'Solo las estrellas más brillantes: señal a ruido de al menos',
  'obs.dt.psf': 'Medir el ancho',
  'obs.dt.keep': 'Guardar en el registro',
  'obs.dt.fwhmLine': 'Ancho de las estrellas (FWHM): {fwhm} ± {sigma} píxeles',
  'obs.dt.betaLine': 'Beta de Moffat {beta} ± {sigma}',
  'obs.dt.starsLine':
    'De {n} estrellas ({refused} rechazadas). Chi-cuadrado reducido de los ajustes {chi2}.',
  'obs.dt.scaled':
    'Las estrellas discrepan más de lo que dicen sus errores, así que el error se multiplica por la raíz de su chi-cuadrado ({chi2}).',
  'obs.dt.modelLimited':
    'Los ajustes dejan más que ruido: el perfil puede no ser el de este modelo, y el error de arriba es solo la parte que explica el ruido. Un chi-cuadrado bajo no demuestra que el modelo sea correcto, porque las alas débiles quedan bajo el ruido del cielo: ajusta también el otro modelo y compara los anchos.',
  'obs.dt.profileLabel':
    'El perfil radial apilado de {n} estrellas: la parte de la luz de cada estrella en un píxel frente a su distancia al centro, con el modelo ajustado dibujado encima.',
  'obs.dt.profile.table': 'Perfil radial apilado',
  'obs.dt.profile.r': 'Distancia al centro (píxeles)',
  'obs.dt.profile.value':
    'Luz en un píxel, como fracción del total de la estrella',
  'obs.dt.profile.sem': 'Error de la media',
  'obs.dt.profile.stars': 'Estrellas',
  'obs.dt.profile.model': 'Modelo ajustado',
  'obs.dt.profile.width': 'Ancho leído del perfil (FWHM): {w} píxeles',
  'obs.dt.said.detected':
    'Se encontraron {n} fuentes, {m} de ellas con avisos.',
  'obs.dt.said.none': 'Ninguna fuente sobresale del cielo a {sigma} sigmas.',
  'obs.dt.said.marks': 'Se añadieron {n} fuentes como marcas de punto.',
  'obs.dt.said.marksFull':
    'La tabla de marcas está llena: se añadieron {n} de {total}.',
  'obs.dt.said.csv': 'Se guardó una tabla de {n} filas.',
  'obs.dt.said.psf':
    'Ancho de las estrellas {fwhm} ± {sigma} píxeles, de {n} estrellas.',
  'obs.dt.said.kept': 'Se guardó el ancho en el registro.',
  'obs.dt.said.keepFailed': 'No se pudo guardar en el registro: {why}',
  'obs.dt.said.working': 'Trabajando…',
  'obs.dt.ledgerEntry': 'Función de dispersión de punto de {title}',
  'obs.dt.q.fwhm': 'ancho (FWHM)',
  'obs.dt.q.beta': 'beta de Moffat',
};
