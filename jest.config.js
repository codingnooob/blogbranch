/** @type {module} */
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: [],
  testMatch: [
    '**/test*.js',
    '**/*.test.js'
  ],
  testPathIgnorePatterns: [
    'scripts/test-deployment.js',
    'scripts/test-chrome-api.js',
    'scripts/test-correct-publisher-id.js',
    'scripts/get-project-info.js'
  ]
};