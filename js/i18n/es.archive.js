// =============================================================================
// La importación de archivos del observatorio, en español
// -----------------------------------------------------------------------------
// js/observatory/archivePanel.js registra estos textos cuando un lector abre
// el panel por primera vez, para que la página no los cargue al inicio. Solo
// el título del panel, que la página muestra cerrado, queda en
// ./es.observatory.js.
// =============================================================================

export const ES_ARCHIVE = {
  'obs.arc.privacy':
    'No se envía nada hasta que pulses Buscar. Entonces el nombre que escribas va al CDS de Estrasburgo (Sesame), y la posición que devuelve va a VizieR, del CDS, que también ve tu dirección IP, como cualquier servidor. No se envía ninguna cookie ni referente, y nada va a Gravitas. Los datos de Gaia tienen licencia CC BY-NC 3.0 IGO.',
  'obs.arc.name': 'Nombre de la estrella u objeto',
  'obs.arc.find': 'Buscar',
  'obs.arc.cancel': 'Cancelar',
  'obs.arc.asking.sesame': 'Preguntando a Sesame (CDS) dónde está…',
  'obs.arc.asking.vizier': 'Preguntando a VizieR por fuentes de Gaia DR3 allí…',
  'obs.arc.asking.epochs':
    'Preguntando a VizieR por su fotometría de épocas de Gaia…',
  'obs.arc.notFound': 'Sesame no conoce ningún objeto llamado «{name}».',
  'obs.arc.position': '{name}: AR {ra}°, Dec {dec}° ({type})',
  'obs.arc.sky': 'Ver esta posición en Aladin Lite, en el CDS (abre su sitio)',
  'obs.arc.noSource':
    'No hay ninguna fuente de Gaia DR3 a menos de 2″ de esa posición.',
  'obs.arc.sources': 'Fuentes de Gaia DR3 a menos de 2″: {n}',
  'obs.arc.source': 'Gaia DR3 {id}, G {g}',
  'obs.arc.sourceVariable': 'Gaia DR3 {id}, G {g}, marcada como variable',
  'obs.arc.look': 'Ver sus épocas',
  'obs.arc.review': 'Antes de abrirla',
  'obs.arc.reviewReady':
    '{rows} filas de VizieR, listas para revisar antes de abrirlas.',
  'obs.arc.summary':
    '{rows} filas, {kb} kB, estado {status}, obtenidas el {when} UTC.',
  'obs.arc.cache.fresh':
    'De este dispositivo: obtenidas hace {days} días, y no se han vuelto a pedir.',
  'obs.arc.cache.stale':
    'De este dispositivo, con {days} días de antigüedad: no se pudo contactar con el CDS ({why}).',
  'obs.arc.cache.changed':
    'La respuesta de VizieR ha cambiado desde la última vez que se guardó aquí. Es una observación distinta de la que se guardó antes.',
  'obs.arc.overflow':
    'El servicio se detuvo en su límite de filas: no son todas las épocas.',
  'obs.arc.fields': 'La tabla, tal como la describe el servicio',
  'obs.arc.col.field': 'Campo',
  'obs.arc.col.unit': 'Unidad',
  'obs.arc.col.ucd': 'UCD',
  'obs.arc.col.description': 'Descripción',
  'obs.arc.unit.notStated': 'no indicada',
  'obs.arc.sha.bytes': 'SHA-256 de estos bytes',
  'obs.arc.sha.content': 'SHA-256 del contenido de la tabla (su identidad)',
  'obs.arc.band': 'Banda',
  'obs.arc.license': '{credit}. Licencia: {license}.',
  'obs.arc.plotLabel': '{n} épocas en {band}, magnitud frente al tiempo',
  'obs.arc.open': 'Abrir en el espacio de trabajo',
  'obs.arc.err.blocked':
    'El navegador no pudo contactar con el CDS. O el servicio ya no permite este sitio, o no hay red: una página no puede saber cuál de las dos.',
  'obs.arc.err.timeout': 'El CDS no respondió en {seconds} segundos.',
  'obs.arc.err.rateLimited':
    'El CDS pidió menos solicitudes. Inténtalo de nuevo en un minuto.',
  'obs.arc.err.rateLimitedAfter':
    'El CDS pidió menos solicitudes. Inténtalo de nuevo dentro de {after} segundos.',
  'obs.arc.err.unavailable': 'El CDS no está disponible (HTTP {status}).',
  'obs.arc.err.refused': 'El CDS rechazó la solicitud (HTTP {status}).',
  'obs.arc.err.tooLarge':
    'La respuesta supera los {kb} kB, lo máximo que lee esta página.',
  'obs.arc.err.wrongType': 'El CDS respondió con algo que no es una tabla.',
  'obs.arc.err.offList':
    'La solicitud se redirigió a {origin}, con el que esta página no se comunica.',
  'obs.arc.err.canceled': 'Cancelado.',
  'obs.arc.err.serviceError': 'VizieR informó de un error: {said}',
  'obs.arc.err.units':
    'El servicio dice que {field} está en {stated}, donde se esperaba {expected}, así que no se convirtió.',
  'obs.arc.err.votable':
    'La respuesta de VizieR no es una tabla que esta página pueda leer.',
  'obs.arc.err.other': 'Algo salió mal al leer la respuesta.',
};
