// The instrument-widget label golden, the proof that the power-law recording
// does not depend on the engine's Math. It is a suite of its own because the
// recording runs with every Math.pow, log, atan2 and hypot call wrapped (some
// 770 million of them), which takes as long as a part. The guard over all the
// parts is tests/labelGoldenWidgets.test.js.
import { describeEngineMath } from './labelGolden/widgetParts.mjs';

describeEngineMath();
