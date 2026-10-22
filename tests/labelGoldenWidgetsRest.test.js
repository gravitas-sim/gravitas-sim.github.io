// The instrument-widget label golden, part "rest": the families PARTS.rest
// names in tests/labelGolden/widgetParts.mjs, which says why the recording is
// in parts, and the proof that the recording tells a toFixed swap from a
// wrapper. The guard over all the parts is tests/labelGoldenWidgets.test.js.
import {
  describeToFixedSwap,
  describeWidgetPart,
} from './labelGolden/widgetParts.mjs';

describeWidgetPart('rest');
describeToFixedSwap();
