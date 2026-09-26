// =============================================================================
// gravitas.course-pack/1, as the SDK sees it
// -----------------------------------------------------------------------------
// The format belongs to the platform (js/platform/course.js), which the
// catalog page also validates installed courses with; this re-exports it so
// the SDK's modules and anyone who imported it here keep working.
// =============================================================================

export {
  FORMAT,
  FORMAT_VERSION,
  validateCoursePack,
} from '../../js/platform/course.js';
