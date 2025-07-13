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
  getElementById: jest.fn((id) => {
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