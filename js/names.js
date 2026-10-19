// Names (P107 2c, D-DECOMP-14): KEY_ storage keys, EV_ window events, ID_ format
// ids, spelled once; values never change. tests/keyRegistry.test.js pins them,
// tools/key-registry-allowlist.json lists those not yet moved. A leaf module.

export const KEY_UNITS = 'gravitas_units';
export const KEY_MOTION = 'gravitas_motion';
export const CACHE_PARTS = 'gravitas-parts';
export const EV_SIMULATION_RESET = 'gravitasSimulationReset';
export const EV_UNITS_CHANGED = 'gravitasUnitsChanged';
export const EV_THEME_CHANGED = 'gravitasThemeChanged';
export const EV_REQUEST_REBUILD = 'gravitasRequestRebuild';
export const EV_MERGE = 'gravitasMerge';
export const EV_COLLISION = 'gravitasCollision';
export const EV_LOCALE_CHANGED = 'gravitasLocaleChanged';
export const EV_SELECTION_CLEARED = 'gravitasSelectionCleared';
export const EV_STOP_SIGNAL_AUDIO = 'gravitasStopSignalAudio';
export const EV_ESCAPE = 'gravitasEscape';
export const EV_SPEED_CHANGED = 'gravitasSpeedChanged';
export const EV_PLACEMENT_ARMED = 'gravitasPlacementArmed';
export const EV_OBJECT_PLACED = 'gravitasObjectPlaced';
export const EV_WORKER_FAILED = 'gravitasWorkerFailed';
export const EV_SIGNAL_AUDIO = 'gravitasSignalAudio';
export const EV_MANEUVER_REQUESTED = 'gravitasManeuverRequested';
export const EV_LIGHT_CURVE_TOGGLED = 'gravitasLightCurveToggled';
export const EV_GALAXY_GRAVITY_CHANGED = 'gravitasGalaxyGravityChanged';
export const EV_SETTINGS_APPLIED = 'gravitasSettingsApplied';
export const EV_PRESENTATION_CHANGED = 'gravitasPresentationChanged';

// Storage keys, and the prefixes a key is built from (a name that ends in _PREFIX),
// with the database, protocol, format and meta names that share the shape.
export const KEY_DASHED_PREFIX = 'gravitas-';
export const KEY_META_BUILD = 'gravitas-build';
export const KEY_PROTOCOL_EMBED = 'gravitas-embed';
export const KEY_FORMAT_EXPERIMENT = 'gravitas-experiment';
export const KEY_FORMAT_MANEUVER_LOG = 'gravitas-maneuver-log';
export const KEY_META_REVISION = 'gravitas-revision';
export const KEY_COURSE_LEVEL = 'gravitas_course_level';
export const KEY_EXPERIMENT_PREFIX = 'gravitas_experiment_';
export const KEY_EXPERIMENTS_INDEX = 'gravitas_experiments_index';
export const KEY_INVESTIGATION_PREFIX = 'gravitas_investigation_';
export const KEY_LECTURE_SEQUENCE = 'gravitas_lecture_sequence';
export const KEY_NEXT_CONTEXT = 'gravitas_next_context';
export const KEY_ORIENTATION_SEEN_V1 = 'gravitas_orientation_seen_v1';
export const KEY_RAIL_SECTIONS = 'gravitas_rail_sections';
export const KEY_SIMULATION_SAVE = 'gravitas_simulation_save';
export const KEY_THEME = 'gravitas_theme';
export const KEY_WELCOME_SEEN_V1 = 'gravitas_welcome_seen_v1';

// The rest of the storage keys, with the database, protocol, format and meta
// names that share the shape.
export const KEY_DB_ARCHIVE = 'gravitas-archive';
export const KEY_DB_CATALOG = 'gravitas-catalog';
export const KEY_PROTOCOL_COMPUTE = 'gravitas-compute';
export const KEY_DB_STORE = 'gravitas-store';
export const KEY_ASSIGNMENT_PREFIX = 'gravitas_assignment_';
export const KEY_CAPABILITY_VERSIONS = 'gravitas_capability_versions';
export const KEY_COMPOSER_PREFIX = 'gravitas_composer_';
export const KEY_COMPOSER_PREVIEW = 'gravitas_composer_preview';
export const KEY_COURSE_PREFIX = 'gravitas_course_';
export const KEY_COURSE_PREVIEW = 'gravitas_course_preview';
export const KEY_EVALUATION_DRAFT_PREFIX = 'gravitas_evaluation_draft_';
export const KEY_EVALUATION_DRAFT_V1 = 'gravitas_evaluation_draft_v1';
export const KEY_EVIDENCE_NOTEBOOK = 'gravitas_evidence_notebook';
export const KEY_EXPERIMENT = 'gravitas_experiment';
export const KEY_EXPERIMENT_CHECKPOINT_PREFIX =
  'gravitas_experiment_checkpoint_';
export const KEY_GUIDES = 'gravitas_guides';
export const KEY_INSTRUCTOR_KEY = 'gravitas_instructor_key';
export const KEY_LAB3D_GUIDE_PREFIX = 'gravitas_lab3d_guide_';
export const KEY_LAST_EXPORT = 'gravitas_last_export';
export const KEY_LESSON_OBJECTS_OPEN = 'gravitas_lesson_objects_open';
export const KEY_LOCALE = 'gravitas_locale';
export const KEY_MADE_PREFIX = 'gravitas_made_';
export const KEY_MISSIONLAB_PREFIX = 'gravitas_missionlab_';
export const KEY_ORIENTATION_SEEN_PREFIX = 'gravitas_orientation_seen_';
export const KEY_STORE_PREFIX = 'gravitas_store:';
export const KEY_STUDENT_NAME = 'gravitas_student_name';
export const KEY_STUDIO_PREFIX = 'gravitas_studio_';
export const KEY_STUDIO_DRAFT_PREFIX = 'gravitas_studio_draft:';
export const KEY_STUDIO_LAST = 'gravitas_studio_last';
export const KEY_TEACHING_NOTES_PREFIX = 'gravitas_teaching_notes_';
export const KEY_TEACHING_NOTES_V1 = 'gravitas_teaching_notes_v1';
export const KEY_WELCOME_SEEN_PREFIX = 'gravitas_welcome_seen_';
