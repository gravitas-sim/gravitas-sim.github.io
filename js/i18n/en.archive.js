// =============================================================================
// The observatory's archive import in English
// -----------------------------------------------------------------------------
// js/observatory/archivePanel.js registers these when a reader first opens
// the panel, so the page does not carry them at start-up. Only the panel's
// title, which the page shows closed, stays in ./en.observatory.js.
// =============================================================================

export const EN_ARCHIVE = {
  'obs.arc.privacy':
    'Nothing is sent until you press Find. Then the name you type goes to CDS in Strasbourg (Sesame), and the position it returns goes to CDS’s VizieR, which also sees your IP address, as any server does. No cookie or referrer is sent, and nothing is sent to Gravitas. Gaia data are licensed CC BY-NC 3.0 IGO.',
  'obs.arc.name': 'Star or object name',
  'obs.arc.find': 'Find',
  'obs.arc.cancel': 'Cancel',
  'obs.arc.asking.sesame': 'Asking CDS Sesame where it is…',
  'obs.arc.asking.vizier': 'Asking VizieR for Gaia DR3 sources there…',
  'obs.arc.asking.epochs': 'Asking VizieR for its Gaia epoch photometry…',
  'obs.arc.notFound': 'Sesame knows no object called “{name}”.',
  'obs.arc.position': '{name}: RA {ra}°, Dec {dec}° ({type})',
  'obs.arc.sky': 'View this position in Aladin Lite at CDS (opens their site)',
  'obs.arc.noSource': 'No Gaia DR3 source within 2″ of that position.',
  'obs.arc.sources': 'Gaia DR3 sources within 2″: {n}',
  'obs.arc.source': 'Gaia DR3 {id}, G {g}',
  'obs.arc.sourceVariable': 'Gaia DR3 {id}, G {g}, flagged variable',
  'obs.arc.look': 'Look at its epochs',
  'obs.arc.review': 'Before you open it',
  'obs.arc.reviewReady':
    '{rows} rows from VizieR, ready to review before you open them.',
  'obs.arc.summary':
    '{rows} rows, {kb} kB, status {status}, retrieved {when} UTC.',
  'obs.arc.cache.fresh':
    'From this device: retrieved {days} days ago, and not asked for again.',
  'obs.arc.cache.stale':
    'From this device, {days} days old: CDS could not be reached ({why}).',
  'obs.arc.cache.changed':
    'VizieR’s answer has changed since it was last kept here. This is a different observation from the one saved before.',
  'obs.arc.overflow':
    'The service stopped at its row limit: this is not every epoch.',
  'obs.arc.fields': 'The table, as the service describes it',
  'obs.arc.col.field': 'Field',
  'obs.arc.col.unit': 'Unit',
  'obs.arc.col.ucd': 'UCD',
  'obs.arc.col.description': 'Description',
  'obs.arc.unit.notStated': 'not stated',
  'obs.arc.sha.bytes': 'SHA-256 of these bytes',
  'obs.arc.sha.content': 'SHA-256 of the table’s content (its identity)',
  'obs.arc.band': 'Band',
  'obs.arc.license': '{credit}. License: {license}.',
  'obs.arc.plotLabel': '{n} {band} epochs, magnitude against time',
  'obs.arc.open': 'Open in the workspace',
  'obs.arc.err.blocked':
    'The browser could not reach CDS. Either the service no longer allows this site, or the network is down: a page cannot tell which.',
  'obs.arc.err.timeout': 'CDS did not answer within {seconds} seconds.',
  'obs.arc.err.rateLimited':
    'CDS asked for fewer requests. Try again in a minute.',
  'obs.arc.err.rateLimitedAfter':
    'CDS asked for fewer requests. Try again after {after} seconds.',
  'obs.arc.err.unavailable': 'CDS is unavailable (HTTP {status}).',
  'obs.arc.err.refused': 'CDS refused the request (HTTP {status}).',
  'obs.arc.err.tooLarge':
    'The answer is larger than {kb} kB, the most this page reads.',
  'obs.arc.err.wrongType': 'CDS answered with something other than a table.',
  'obs.arc.err.offList':
    'The request was sent on to {origin}, which this page does not talk to.',
  'obs.arc.err.canceled': 'Canceled.',
  'obs.arc.err.serviceError': 'VizieR reported an error: {said}',
  'obs.arc.err.units':
    'The service says {field} is in {stated}, where {expected} was expected, so it was not converted.',
  'obs.arc.err.votable': 'VizieR’s answer is not a table this page can read.',
  'obs.arc.err.other': 'Something went wrong reading the answer.',
};
