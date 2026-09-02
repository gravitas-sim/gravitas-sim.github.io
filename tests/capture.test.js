import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';
import {
  canRecord,
  pickMimeType,
  frameSize,
  isRecording,
  startRecording,
  stopRecording,
  recordingStatus,
  extensionFor,
} from '../js/capture.js';

// The clip recorder. What matters here is not the encoding - that is the
// browser's - but the two promises the module makes around it: that a
// recording is bounded in memory, and that whatever it does hand back is a
// file with the right name on it. Both are testable without a real encoder.

/** A canvas stand-in: jsdom has no 2D context worth compositing onto. */
function fakeCanvas(width, height) {
  const ctx = {
    fillStyle: '',
    fillRect: jest.fn(),
    drawImage: jest.fn(),
  };
  return {
    width,
    height,
    getContext: () => ctx,
    captureStream: () => ({ getTracks: () => [] }),
    ctx,
  };
}

/**
 * A MediaRecorder stand-in that emits chunks of a size the test chooses, so a
 * byte budget can be reached in three calls rather than in two minutes.
 */
class FakeRecorder {
  static supported = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8'];
  static isTypeSupported(type) {
    return FakeRecorder.supported.includes(type);
  }
  static instances = [];
  constructor(stream, options) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'video/webm';
    this.videoBitsPerSecond = options?.videoBitsPerSecond;
    this.state = 'inactive';
    FakeRecorder.instances.push(this);
  }
  start(timeslice) {
    this.state = 'recording';
    this.timeslice = timeslice;
  }
  stop() {
    this.state = 'inactive';
    this.onstop?.();
  }
  /** Hand over a chunk, the way a real encoder does once per timeslice. */
  emit(size) {
    this.ondataavailable?.({ data: { size, _blob: true } });
  }
}

let created = [];

beforeEach(() => {
  FakeRecorder.instances = [];
  FakeRecorder.supported = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8'];
  created = [];
  global.window.MediaRecorder = FakeRecorder;
  global.HTMLCanvasElement.prototype.captureStream = function () {
    return { getTracks: () => [] };
  };
  jest.spyOn(document, 'createElement').mockImplementation(tag => {
    if (tag !== 'canvas') return {};
    const c = fakeCanvas(0, 0);
    created.push(c);
    return c;
  });
  global.requestAnimationFrame = () => 1;
  global.cancelAnimationFrame = () => {};
});

afterEach(() => {
  if (isRecording()) stopRecording('user');
  jest.restoreAllMocks();
  delete global.window.MediaRecorder;
  delete global.HTMLCanvasElement.prototype.captureStream;
});

describe('frame geometry', () => {
  test('a modest canvas is recorded at its own size', () => {
    expect(frameSize(1280, 720)).toEqual({
      width: 1280,
      height: 720,
      scale: 1,
    });
  });

  test('a retina canvas is scaled down to the cap, longest side first', () => {
    const { width, height, scale } = frameSize(3200, 1800);
    expect(width).toBe(1600);
    expect(scale).toBeCloseTo(0.5);
    expect(height).toBe(900);
  });

  test('both dimensions come out even, which every encoder prefers', () => {
    const { width, height } = frameSize(1919, 1081);
    expect(width % 2).toBe(0);
    expect(height % 2).toBe(0);
  });

  test('a zero-sized canvas cannot produce a zero-sized frame', () => {
    const { width, height } = frameSize(0, 0);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });
});

describe('codec choice', () => {
  test('H.264 wins where the browser can encode it, because that is what a slide and a PDF will play', () => {
    FakeRecorder.supported = [
      'video/mp4;codecs=avc1.42E01E',
      'video/webm;codecs=vp9',
    ];
    expect(pickMimeType()).toBe('video/mp4;codecs=avc1.42E01E');
    expect(extensionFor(pickMimeType())).toBe('mp4');
  });

  test('VP9 is taken where there is no H.264 to be had', () => {
    expect(pickMimeType()).toBe('video/webm;codecs=vp9');
  });

  test('VP8 is taken when VP9 is not offered', () => {
    FakeRecorder.supported = ['video/webm;codecs=vp8'];
    expect(pickMimeType()).toBe('video/webm;codecs=vp8');
  });

  test('a browser with no canvas recorder reports it rather than failing later', () => {
    delete global.window.MediaRecorder;
    expect(pickMimeType()).toBe('');
    expect(canRecord()).toBe(false);
  });

  test('the extension follows the container the browser actually gave us', () => {
    expect(extensionFor('video/webm;codecs=vp9')).toBe('webm');
    expect(extensionFor('video/mp4')).toBe('mp4');
  });
});

describe('recording', () => {
  const sources = () => [fakeCanvas(1280, 720), fakeCanvas(1280, 720)];

  test('starting composites onto an offscreen canvas, not onto the sources', () => {
    const src = sources();
    expect(startRecording({ sources: src })).toBe(true);
    expect(created.length).toBe(1);
    // Background first, then both source canvases, flattened into one frame.
    expect(created[0].ctx.fillRect).toHaveBeenCalled();
    expect(created[0].ctx.drawImage).toHaveBeenCalledTimes(2);
    expect(isRecording()).toBe(true);
  });

  test('a second start while one is running is refused', () => {
    expect(startRecording({ sources: sources() })).toBe(true);
    expect(startRecording({ sources: sources() })).toBe(false);
  });

  test('a canvas with no pixels yet is not recorded', () => {
    expect(startRecording({ sources: [fakeCanvas(0, 0)] })).toBe(false);
    expect(isRecording()).toBe(false);
  });

  test('the encoder is asked for chunks on a timeslice, so the total is known as it grows', () => {
    startRecording({ sources: sources() });
    expect(FakeRecorder.instances[0].timeslice).toBeGreaterThan(0);
  });

  test('the running total is reported for the indicator', () => {
    startRecording({ sources: sources() });
    FakeRecorder.instances[0].emit(2 * 1024 * 1024);
    const status = recordingStatus();
    expect(status.recording).toBe(true);
    expect(status.bytes).toBe(2 * 1024 * 1024);
    expect(status.maxBytes).toBeGreaterThan(0);
    expect(status.maxSeconds).toBeGreaterThan(0);
  });

  test('a long capture stops itself at the byte budget instead of growing without limit', () => {
    const onStop = jest.fn();
    startRecording({ sources: sources(), onStop });
    const rec = FakeRecorder.instances[0];
    const { maxBytes } = recordingStatus();
    let emitted = 0;
    // Ten seconds of a very high bitrate stream, one chunk a second.
    while (emitted < maxBytes * 2 && isRecording()) {
      rec.emit(16 * 1024 * 1024);
      emitted += 16 * 1024 * 1024;
    }
    expect(isRecording()).toBe(false);
    expect(onStop).toHaveBeenCalledTimes(1);
    const [, meta] = onStop.mock.calls[0];
    expect(meta.reason).toBe('size');
    // It stopped within one timeslice of the budget, not at some multiple.
    expect(meta.bytes).toBeLessThanOrEqual(maxBytes + 16 * 1024 * 1024);
  });

  test('stopping hands over a file and drops every reference to the chunks', () => {
    const onStop = jest.fn();
    startRecording({ sources: sources(), onStop });
    FakeRecorder.instances[0].emit(1024);
    stopRecording('user');
    expect(onStop).toHaveBeenCalledTimes(1);
    const [blob, meta] = onStop.mock.calls[0];
    expect(blob).toBeTruthy();
    expect(meta.reason).toBe('user');
    expect(meta.type).toContain('video/');
    // Nothing is still being counted, and a new take starts from zero.
    expect(isRecording()).toBe(false);
    expect(recordingStatus().bytes).toBe(0);
  });

  test('stopping twice is not two files', () => {
    const onStop = jest.fn();
    startRecording({ sources: sources(), onStop });
    FakeRecorder.instances[0].emit(1024);
    expect(stopRecording('user')).toBe(true);
    expect(stopRecording('user')).toBe(false);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  test('a take that produced nothing hands back no blob rather than an empty file', () => {
    const onStop = jest.fn();
    startRecording({ sources: sources(), onStop });
    stopRecording('user');
    expect(onStop.mock.calls[0][0]).toBeNull();
  });
});
