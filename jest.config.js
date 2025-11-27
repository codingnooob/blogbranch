/** @type {module} */
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [],
  testMatch: [
    '**/test*.js',
    '**/*.test.js'
  ],
  testPathIgnorePatterns: [
    'scripts/test-deployment.js'
  ]
};