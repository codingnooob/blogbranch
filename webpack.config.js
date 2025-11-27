import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: {
    popup: './popup.js',
    'background/service-worker': './background/service-worker.js',
    'content/blog-detector': './content/blog-detector.js',
    'content/link-extractor': './content/link-extractor.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  mode: 'production',
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('CopyFiles', (compilation) => {
          // Copy HTML and CSS files that don't need processing
          const filesToCopy = [
            { src: 'popup-chrome.html', dest: 'popup.html' },
            { src: 'popup.css', dest: 'popup.css' },
            { src: 'content/content-styles.css', dest: 'content/content-styles.css' },
            { src: 'ai-service.js', dest: 'ai-service.js' },
            { src: 'storage-manager.js', dest: 'storage-manager.js' },
            { src: 'content-fetcher.js', dest: 'content-fetcher.js' },
            { src: 'LICENSE', dest: 'LICENSE' },
            { src: 'PRIVACY.md', dest: 'PRIVACY.md' },
          ];

          filesToCopy.forEach(({ src, dest }) => {
            try {
              const srcPath = path.resolve(__dirname, src);
              const destPath = path.resolve(__dirname, 'dist', dest);
              
              if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, destPath);
                console.log(`Copied ${src} -> ${dest}`);
              }
            } catch (error) {
              console.warn(`Failed to copy ${src}:`, error.message);
            }
          });
        });
      },
    },
  ],
};
