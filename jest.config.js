export default {
  testEnvironment: 'jsdom',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/main.js', // Exclude main.js as it's primarily UI initialization
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
}; 