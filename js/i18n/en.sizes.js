// The Sizes statement (js/sizeStatement.js), in English: what is drawn to scale
// and what is not, and the canvas description's size sentence. Registered
// by js/sizeFacts.js when it loads.
export const EN_SIZES = {
  'sizes.title': 'What is drawn to scale',
  'sizes.distances':
    'Distances are drawn to one scale, the model’s own, and the scale bar measures them. Where a scenario lays a system out closer than the real one, the drawing is closer too.',
  'sizes.notSizes':
    'Sizes are not. Each kind of body is drawn by its own factor, usually larger than real and in some scenes smaller, so neither a size nor the ratio of two sizes can be read off the canvas.',
  'sizes.collision':
    'The model radius is the collision radius: two bodies touch when their centers are closer than the sum of their model radii, and merging uses it too. A black hole’s model radius also sets where a body passing it starts to be torn apart; the simulation computes no Roche limit. It is itself larger than real. The drawn radius is the model radius times a factor for the kind of body, and never less than {floor} px on screen, so a small body stays visible.',
  'sizes.caption': 'Radii of the bodies in this world',
  'sizes.col.body': 'Body',
  'sizes.col.real': 'Real radius',
  'sizes.col.model': 'Model (collision) radius',
  'sizes.col.drawn': 'Drawn, times real',
  'sizes.noReal': 'not recorded',
  'sizes.notModelled': 'not modeled as a size',
  'sizes.close': 'Close',
  'sizes.empty': 'Nothing is in the world yet.',
  'sizes.timesRange': '{lo}× to {hi}×',
  'sizes.summary': 'Drawn size against real: {list}.',
  'sizes.summary.selected': '{name} is drawn {times} its real radius.',
  'sizes.button': 'Sizes',
  'sizes.offline':
    'The Sizes statement could not be loaded: it needs a connection the first time.',
};
