import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['*.js', 'scripts/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        console: 'readonly',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        AbortSignal: 'readonly',
        performance: 'readonly',
        module: 'readonly',
        chrome: 'readonly',
        browser: 'readonly',
        window: 'readonly',
        document: 'readonly',
        AIService: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-unsafe-finally': 'warn',
      'no-func-assign': 'warn',
      'no-cond-assign': 'warn',
      'no-case-declarations': 'warn',
      'no-redeclare': 'warn',
      'no-fallthrough': 'warn'
    }
  },
  {
    files: ['content/**/*.js', 'background/**/*.js', 'popup.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        chrome: 'readonly',
        browser: 'readonly',
        module: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        AbortSignal: 'readonly',
        performance: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-unsafe-finally': 'warn',
      'no-func-assign': 'warn',
      'no-cond-assign': 'warn',
      'no-case-declarations': 'warn',
      'no-redeclare': 'warn',
      'no-fallthrough': 'warn'
    }
  },
  {
    ignores: [
      'dist/**',
      'build-firefox/**',
      'node_modules/**',
      '*.min.js',
      '*.bundle.js',
      '**/*.bundle.js',
      '**/*.min.js',
      'ai-service.js',
      'popup.js',
      'content-fetcher.js',
      'storage-manager.js',
      'background/service-worker.js',
      'content/blog-detector.js',
      'content/link-extractor.js',
      'manifest-firefox.json',
      'popup-chrome.html',
      'blog-link-analyzer-*.crx',
      'blog-link-analyzer-*.zip',
      'blog-link-analyzer-firefox-*.xpi',
      'blog-link-analyzer-firefox-*.zip'
    ]
  }
];