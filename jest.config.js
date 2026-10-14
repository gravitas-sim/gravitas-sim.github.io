export default {
  testEnvironment: 'jsdom',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  // The long suites start first; see the file for why. Order only.
  testSequencer: '<rootDir>/tools/jest-sequencer.mjs',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/main.js', // Exclude main.js as it's primarily UI initialization
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
