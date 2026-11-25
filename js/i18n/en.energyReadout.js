// The conservation check's energy lines (js/render.js), in English: the energy
// this world's model conserves, why there is none, the all-pairs figure as its
// own line, and an event's change. Registered by the readout.
export const EN_ENERGYREADOUT = {
  'readout.model.energy': 'Energy drift',
  'readout.model.energyChange': 'Energy change',
  'readout.model.fixedField': 'Energy drift in the fixed field',
  'readout.model.fixedFieldChange': 'Energy change in the fixed field',
  'readout.model.none': 'Conserved energy',
  'readout.model.reason': 'none here: {reason}',
  'readout.model.reason.mond': 'modified gravity (MOND) is on',
  'readout.model.reason.halo': 'the dark-matter halo is not in the sum',
  'readout.model.reason.decay': 'black-hole orbits decay by design',
  'readout.model.reason.movingSource': 'a body that pulls one way is moving',
  'readout.model.reason.prescribed': 'a body follows a prescribed path',
  'readout.model.reason.contact': 'bodies touch in every step',
  'readout.model.reason.tidal': 'a body is being stripped in every step',
  'readout.model.event':
    'Energy changed by {change} at a {event}; drift is measured from here.',
  'readout.model.event.collision': 'collision',
  'readout.model.event.merger': 'merger',
  'readout.model.event.absorption': 'absorption',
  'readout.model.event.collapse': 'collapse',
  'readout.model.event.tidal': 'tidal stripping',
  'readout.drift.allPairs': 'Energy drift, all pairs',
  'readout.drift.allPairsChange': 'Energy change, all pairs',
};
