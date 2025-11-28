module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  // Run tests sequentially to avoid interference
  maxWorkers: 1,
  // Clear mocks between tests
  clearMocks: true,
  // Reset modules between tests to avoid state sharing
  resetModules: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageDirectory: 'coverage',
  testMatch: [
    '**/test/unit/**/*.test.js',
    '**/test/integration/**/*.test.js', 
    '**/test/e2e/**/*.test.js'
  ]
};