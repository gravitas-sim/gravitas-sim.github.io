// =============================================================================
// gravitas.investigation-pack/1, as the SDK sees it
// -----------------------------------------------------------------------------
// The format belongs to the platform (js/platform/investigation.js); the whole
// verdict - the format's own rules, then the compiled lesson through the
// checker every lesson in the repository passes - is the composer's
// (js/composer/api.js), which the Studio's lesson composer uses too. Re-exported
// so the SDK, the composer and the tests can never disagree about what a pack is.
// =============================================================================

export {
  FORMAT,
  FORMAT_VERSION,
  migrateInvestigationPack,
} from '../../js/platform/investigation.js';
export { checkInvestigationPack, packApi } from '../../js/composer/api.js';
export { collectTexts } from '../../js/composer/compile.js';
