// =============================================================================
// Pasos e investigaciones revisados, sustituidos o retirados, en español
// -----------------------------------------------------------------------------
// Su propio fragmento, como ./es.adapt.js: solo lo carga una página que se
// encuentra con trabajo guardado o con un enlace que nombra algo revisado
// (js/investigations/revisionText.js), así que ninguna ruta de lección lo lleva.
// =============================================================================

export const ES_REVISIONS = {
  'rev.earlier': 'respondida en una versión anterior',
  'rev.heading': 'Respuestas de una versión anterior ({n})',
  'rev.item':
    '"{was}" - tu respuesta: {text}. Respondida en una versión anterior (antes de la {release}); no se corrige.',
  'rev.unknown':
    'Un paso que esta investigación ya no tiene - tu respuesta: {text}. Respondida en una versión anterior; no se corrige.',
  'rev.now': 'El paso es ahora: {title}.',
  'rev.gone': 'Ningún paso lo sustituye.',
  'rev.replaced':
    'El paso "{was}" se sustituyó en la versión {release} por "{title}".',
  'rev.removed':
    'El paso "{was}" se quitó en la versión {release}; ningún paso lo sustituye.',
  'rev.inv.moved':
    'Esta investigación se sustituyó en la versión {release} por "{title}", que se abre ahora.',
  'rev.inv.retired':
    'Esta investigación se retiró en la versión {release} y ya no está en Gravitas.',
  'rev.inv.pin':
    'La investigación "{id}" se sustituyó en la versión {release} por "{to}".',
  'rev.inv.pinGone':
    'La investigación "{id}" se retiró en la versión {release}; ninguna investigación la sustituye.',
};
