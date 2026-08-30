import { jest } from '@jest/globals';

// Mock canvas element
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: jest.fn(() => ({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    createRadialGradient: jest.fn(() => ({
      addColorStop: jest.fn(),
    })),
    save: jest.fn(),
    restore: jest.fn(),
    setTransform: jest.fn(),
    fillRect: jest.fn(),
  })),
};

// Mock DOM elements that are used in the physics module
global.document = {
  getElementById: jest.fn(id => {
    if (id === 'simulationCanvas') {
      return mockCanvas;
    }
    return null;
  }),
};

// Make the canvas available globally for physics module
global.canvas = mockCanvas;

// Mock canvas context
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  save: jest.fn(),
  restore: jest.fn(),
  setTransform: jest.fn(),
  fillRect: jest.fn(),
}));

// Suppress console warnings during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Date.now for consistent testing
global.Date.now = jest.fn(() => 1234567890);
// --- Web platform APIs jsdom does not implement ------------------------------
// TextEncoder/TextDecoder, the compression streams and Blob.stream() all exist
// in every browser Gravitas targets, but jsdom ships none of them. Node has
// real implementations, so borrowing them tests the actual code paths rather
// than mocking around them — which matters most for the compressed branch of
// the shared-link codec, the one a stub would hide.
import { TextEncoder, TextDecoder } from 'node:util';
import { CompressionStream, DecompressionStream } from 'node:stream/web';
import { Blob } from 'node:buffer';

if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder;
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder;
if (typeof global.CompressionStream === 'undefined') {
  global.CompressionStream = CompressionStream;
}
if (typeof global.DecompressionStream === 'undefined') {
  global.DecompressionStream = DecompressionStream;
}
// jsdom's Blob has no .stream(); Node's does.
if (typeof global.Blob === 'undefined' || !global.Blob.prototype.stream) {
  global.Blob = Blob;
}
