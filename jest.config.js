export default {
  testEnvironment: 'jsdom',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  // The long suites start first; see the file for why. Order only.
  testSequencer: '<rootDir>/tools/jest-sequencer.mjs',
  // The CI runner has four cores and Jest's default leaves one of them to the
  // main process, which only collects results while the workers run suites
  // that block on child processes (detection, physics validation). The
  // suite is bound by summed suite time over the workers, so CI uses all four.
  // A developer machine keeps Jest's default; --maxWorkers still overrides.
  ...(process.env.CI ? { maxWorkers: '100%' } : {}),
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/main.js', // Exclude main.js as it's primarily UI initialization
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
