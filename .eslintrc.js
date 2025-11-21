module.exports = {
  env: {
    browser: true,
    es2021: true,
    webextensions: true,
    node: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  ignorePatterns: [
    'dist/**',
    'build-firefox/**',
    'node_modules/**',
    '*.min.js',
    '*.bundle.js'
  ],
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'no-unsafe-finally': 'warn',
    'no-func-assign': 'warn',
    'no-cond-assign': 'warn',
    'no-case-declarations': 'warn',
    'no-redeclare': 'warn',
    'no-fallthrough': 'warn'
  },
  globals: {
    chrome: 'readonly',
    browser: 'readonly',
    module: 'readonly',
    content: 'readonly',
    errorMessage: 'readonly',
    AIService: 'readonly',
    ContentFetcher: 'readonly'
  }
};