// =============================================================================
// The image import's words, in English
// -----------------------------------------------------------------------------
// Registered by js/observatory/imageImport.js when a reader first chooses a FITS
// image, a PNG or a JPEG (through the Observatory's translator), so no other
// page carries them. obs.imp.* ids. Every refusal code the readers can give has
// a sentence of its own under obs.imp.no.*; the reader's own English message is
// shown beside it, because it carries the numbers (a computed string is never
// translated).
// =============================================================================

export const EN_IMAGEIMPORT = {
  'obs.imp.title': 'An image from your device',
  'obs.imp.local':
    'The file is read on this device, in a background worker of this page. It is not uploaded, and nothing is sent anywhere.',
  'obs.imp.reading': 'Reading {name}…',
  'obs.imp.cancel': 'Cancel',
  'obs.imp.canceled':
    'Canceled. The read was stopped, the memory it held was released, and nothing was kept.',
  'obs.imp.close': 'Close',
  'obs.imp.readerSays': 'In the reader’s own words (English):',
  'obs.imp.noSave':
    'This image has {n} pixels. A saved workspace writes every pixel as text and reads back at most {max} rows, so saving it is off; its marks and measurements can be kept in the ledger.',
  'obs.imp.ready': '{name} was read. Describe it, then open it.',
  'obs.imp.open': 'Open the image',
  'obs.imp.opened': '{name} opened: {w} by {h} pixels.',
  'obs.imp.kind.fits': 'FITS image',
  'obs.imp.kind.png': 'PNG picture',
  'obs.imp.kind.jpeg': 'JPEG picture',
  'obs.imp.fact.file': 'File',
  'obs.imp.fact.kind': 'Kind',
  'obs.imp.fact.size': 'Size',
  'obs.imp.fact.sizeValue': '{w} by {h} pixels, {bytes} bytes',
  'obs.imp.fact.use': 'Treated as',
  'obs.imp.quantitative':
    'quantitative: its numbers can measure light, once the contract below is complete',
  'obs.imp.useDisplay':
    'display-only: marks, and nothing that needs light or the sky',
  'obs.imp.fact.digest': 'SHA-256 (first 16 digits)',
  'obs.imp.fact.bitpix': 'Stored as (BITPIX)',
  'obs.imp.fact.hdu': 'The image is in unit',
  'obs.imp.fact.blank': 'Blank pixels (kept as missing)',
  'obs.imp.fact.wcs': 'World coordinates',
  'obs.imp.fact.wcsValue': 'tangent plane, about {scale} arcseconds per pixel',
  'obs.imp.fact.noWcs': 'none in the header',
  'obs.imp.displayOnly':
    'A PNG or a JPEG is display-only: its numbers are gray levels from 0 to 255, made for the eye, not a measure of light or of position on the sky. You can mark it and measure it in pixels, or in a unit you give with a reference pair. Photometry and astrometry are refused, because they need pixel values that count light and positions tied to the sky.',
  'obs.imp.needs':
    'A quantitative image needs: pixel values that measure light in a stated unit; a range where the detector is linear; a saturation level; noise from a gain and a read noise, or a variance plane; a calibration state; a time with its scale; an exposure time; and, for the sky, world coordinates. A FITS frame can carry these. A picture cannot.',
  'obs.imp.claims':
    'What the file’s header says. These are the file’s claims, shown with the card each came from; none is believed until you accept it below.',
  'obs.imp.claimsNone': 'The header states none of these.',
  'obs.imp.claim.unit': 'Pixel unit (BUNIT)',
  'obs.imp.claim.exposureSeconds': 'Exposure, seconds',
  'obs.imp.claim.dateObs': 'Observation date and time',
  'obs.imp.claim.mjdObs': 'Observation date, MJD',
  'obs.imp.claim.timeScale': 'Time scale',
  'obs.imp.claim.gain': 'Gain, electrons per count',
  'obs.imp.claim.readNoise': 'Read noise, electrons',
  'obs.imp.claim.saturation': 'Saturation level',
  'obs.imp.claim.object': 'Object',
  'obs.imp.fromCard': 'from header card {card}',
  'obs.imp.fields': 'Describe the image (all optional)',
  'obs.imp.notStated': 'not stated',
  'obs.imp.field.time': 'Time of the exposure (date and time, ISO 8601)',
  'obs.imp.field.timeScale': 'Time scale',
  'obs.imp.field.timeRef': 'The time is the exposure’s',
  'obs.imp.ref.start': 'start',
  'obs.imp.ref.mid': 'middle',
  'obs.imp.ref.end': 'end',
  'obs.imp.effect.time':
    'Time: the marks panel shows the frame’s time with its scale, and the ledger record carries it. A time with no scale is not shown as a time, so a date needs its scale; choose “local” if it is the clock where the picture was taken.',
  'obs.imp.field.scale': 'Pixel scale, arcseconds per pixel',
  'obs.imp.effect.scale':
    'Scale: kept with the image and in the saved record. It does not make marks measure on the sky: a length in arcseconds needs the world coordinates of a FITS frame, or a reference pair you mark yourself, which works on any image.',
  'obs.imp.field.orientation': 'Angle of north, degrees from up toward east',
  'obs.imp.field.east': 'East is on the',
  'obs.imp.east.left': 'left',
  'obs.imp.east.right': 'right',
  'obs.imp.effect.orientation':
    'Orientation: kept with the image and in the saved record, as your statement. Nothing in this release computes with it, and it does not give positions on the sky.',
  'obs.imp.field.pixelsAre': 'The pixel values are',
  'obs.imp.pixelsAre.light': 'light, as the detector recorded it',
  'obs.imp.pixelsAre.display': 'display levels, or I do not know',
  'obs.imp.effect.pixelsAre':
    'If the pixels are light, the pixel contract below can make the image quantitative. If they are display levels, or you do not know, the image is display-only: it can be marked and nothing more.',
  'obs.imp.field.unit': 'Unit of the pixel values',
  'obs.imp.field.calibration': 'Calibration state',
  'obs.imp.cal.raw': 'raw',
  'obs.imp.cal.bias-subtracted': 'bias subtracted',
  'obs.imp.cal.dark-subtracted': 'dark subtracted',
  'obs.imp.cal.flat-fielded': 'flat fielded',
  'obs.imp.cal.calibrated': 'fully calibrated',
  'obs.imp.field.exposure': 'Exposure, seconds',
  'obs.imp.field.saturation': 'Saturation level (pixel value)',
  'obs.imp.field.gain': 'Gain, electrons per count',
  'obs.imp.field.readNoise': 'Read noise, electrons',
  'obs.imp.field.linearLimit': 'Linear up to (pixel value)',
  'obs.imp.field.linearHow': 'How you know it is linear',
  'obs.imp.effect.contract':
    'Contract: photometry is allowed only when all of these are stated and nothing in the picture’s history stretched or re-encoded it. A number copied from the header is marked as the header’s; a number you type is marked as yours. The verdict below says what is still missing.',
  'obs.imp.verdict': 'What this image will allow',
  'obs.imp.use.marking': 'Marks',
  'obs.imp.use.photometry': 'Photometry',
  'obs.imp.use.astrometry': 'Astrometry',
  'obs.imp.allowed': 'allowed',
  'obs.imp.refused': 'refused.',
  'obs.imp.missing': 'Still missing for photometry: {list}.',
  'obs.imp.gap.linearity': 'a linear range and how you know it',
  'obs.imp.gap.saturation': 'a saturation level',
  'obs.imp.gap.noise': 'a gain and a read noise',
  'obs.imp.gap.calibration': 'a calibration state',
  'obs.imp.gap.time': 'a time with its scale',
  'obs.imp.gap.exposure': 'an exposure time',
  'obs.imp.why.display-only':
    'This image is display-only; see what a quantitative image needs below.',
  'obs.imp.why.not-flux': 'The pixel values are not a measure of light.',
  'obs.imp.why.incomplete-contract': 'The pixel contract is incomplete.',
  'obs.imp.why.no-wcs': 'The image has no world coordinates.',
  'obs.imp.why.wcs-unsupported':
    'Its world coordinates are not in a form this workspace reads.',
  'obs.imp.why.lossy-history':
    'The pixels went through a step that does not keep the light.',
  'obs.imp.why.geometry-unrecorded':
    'The pixels moved without their world coordinates.',
  'obs.imp.why.invalid': 'The description is not valid yet.',
  'obs.imp.problem.timeValue': 'A time scale needs a time to go with it.',
  'obs.imp.problem.timeFormat':
    'The time is not a date and time like 2026-03-14T02:15:30.',
  'obs.imp.problem.timeScale': 'A time needs its scale; choose one.',
  'obs.imp.problem.scaleRange':
    'The pixel scale is a number above 0 and at most 3600 arcseconds per pixel.',
  'obs.imp.problem.orientationRange':
    'The angle of north is at least 0 and under 360 degrees.',
  'obs.imp.problem.exposureRange':
    'The exposure is a number of seconds above 0.',
  'obs.imp.problem.gainRange': 'The gain is a number above 0.',
  'obs.imp.problem.saturationRange':
    'The saturation level is a number above 0.',
  'obs.imp.problem.linearLimitRange': 'The linear limit is a number above 0.',
  'obs.imp.problem.readNoiseRange': 'The read noise is a number, 0 or more.',
  'obs.imp.problem.linearHow':
    'A linear limit needs a line saying how you know it.',
  'obs.imp.no.not-fits':
    'This is not a FITS file: it does not begin the way a FITS file does.',
  'obs.imp.no.truncated':
    'The file ends before it should. It was cut short or only partly saved; save it again and choose it again.',
  'obs.imp.no.header-too-large':
    'The header is larger than the 16 blocks this reader allows.',
  'obs.imp.no.card-malformed':
    'A header card is not written the way FITS writes it, so the file cannot be trusted.',
  'obs.imp.no.duplicate-card':
    'A header card that must appear once appears twice, so the file says two things at once.',
  'obs.imp.no.missing-card': 'A header card that every image needs is missing.',
  'obs.imp.no.dimension-overflow':
    'The header gives a size too large to be a real image.',
  'obs.imp.no.nonfinite-header':
    'A number in the header is not finite (it is infinity or not a number).',
  'obs.imp.no.axis-invalid':
    'The image has a side that is not a whole number of pixels, at least 1.',
  'obs.imp.no.hdu-unsupported':
    'The file holds a kind of unit this reader does not read. Only a two-dimensional image is read here; a table or random groups are not.',
  'obs.imp.no.bitpix-unsupported':
    'The pixels are stored in a way this reader does not read. It reads 8, 16 and 32-bit integers and 32 and 64-bit floating point.',
  'obs.imp.no.compressed':
    'The image is tile-compressed, which this reader does not read.',
  'obs.imp.no.axes-unsupported':
    'This is not a two-dimensional image. A cube is not sliced here; export one plane as its own image.',
  'obs.imp.no.too-large':
    'The frame is larger than the 4,194,304 pixels (2,048 by 2,048) or the 8,192 pixels a side that this page will hold. Crop or reduce it first.',
  'obs.imp.no.file-too-large':
    'The file is larger than the 33,647,040 bytes this page will take. It was not read.',
  'obs.imp.no.too-many-hdus':
    'No image was found in the first 8 units of the file, and the reader looks no further.',
  'obs.imp.no.no-image':
    'The file holds no two-dimensional image. A table is not read as an image.',
  'obs.imp.no.scale-invalid':
    'BSCALE is 0, which would make every pixel the same value.',
  'obs.imp.no.blank-invalid':
    'BLANK is not usable for this image’s pixel type.',
  'obs.imp.no.nonfinite-pixel':
    'A pixel is infinite. A blank is NaN, and nothing in an image is infinite, so the file was refused rather than guessed at.',
  'obs.imp.no.canceled': 'The read was canceled.',
  'obs.imp.no.wcs-projection':
    'The world coordinates use a projection this workspace does not read. Only right ascension and declination in the tangent plane (TAN) are.',
  'obs.imp.no.wcs-distortion':
    'The world coordinates carry a distortion (SIP or TPV) that this workspace does not apply, so positions would be wrong.',
  'obs.imp.no.wcs-incomplete':
    'The world coordinates in the header are incomplete or unusable.',
  'obs.imp.no.wcs-ambiguous':
    'The header gives the world coordinates in two forms at once.',
  'obs.imp.no.empty-file': 'The file is empty.',
  'obs.imp.no.unknown-format':
    'This is not a FITS, PNG or JPEG file, whatever its name says.',
  'obs.imp.no.png-malformed':
    'The PNG is damaged or edited: its structure does not hold together.',
  'obs.imp.no.jpeg-malformed':
    'The JPEG is damaged or edited: its structure does not hold together.',
  'obs.imp.no.raster-unsupported':
    'This picture is coded in a way the browsers do not read, so it was refused.',
  'obs.imp.no.undecodable':
    'The browser could not decode this picture: its pixel data is damaged or is not what its header says.',
  'obs.imp.no.dimension-mismatch':
    'The picture’s header and its pixels disagree about its size, so it was refused rather than misread.',
  'obs.imp.no.no-decoder':
    'This browser cannot decode a picture in the background. Try a FITS image, or another browser.',
  'obs.imp.no.unreadable': 'The browser could not read that file.',
  'obs.imp.no.timeout': 'The read took too long and was stopped.',
  'obs.imp.no.resourceLimit':
    'The read would hold more memory than this page allows, so it was not started.',
  'obs.imp.no.workerFailed':
    'The background worker that reads the file failed. Nothing was kept.',
  'obs.imp.no.other': 'The file was refused.',
};
