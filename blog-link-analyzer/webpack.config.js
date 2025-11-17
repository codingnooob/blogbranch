const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const isFirefox = env && env.firefox === 'true';
  
  return {
    entry: {
      'background/service-worker': './background/service-worker.js',
      'popup/popup': './popup/popup.js',
      'content/blog-detector': './content/blog-detector.js',
      'content/link-extractor': './content/link-extractor.js',
      'utils/ai-service': './utils/ai-service.js',
      'utils/browser-compat': './utils/browser-compat.js',
      'utils/content-fetcher': './utils/content-fetcher.js',
      'utils/data-extractors': './utils/data-extractors.js',
      'utils/error-handling': './utils/error-handling.js',
      'utils/platform-detectors': './utils/platform-detectors.js',
      'utils/storage-manager': './utils/storage-manager.js'
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    
    module: {
      rules: [
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: 'ts-loader'
        }
      ]
    },
    
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'icons', to: 'icons' },
          { from: isFirefox ? 'manifest-firefox.json' : 'manifest.json', to: 'manifest.json' },
          { from: 'popup/popup.html', to: 'popup/popup.html' },
          { from: 'content/content-styles.css', to: 'content/content-styles.css' },
          { from: 'popup/popup.css', to: 'popup/popup.css' },
          { from: 'LICENSE', to: 'LICENSE' },
          { from: 'PRIVACY.md', to: 'PRIVACY.md' },
          { from: 'README.md', to: 'README.md' }
        ]
      })
    ],
    
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    },
    
    resolve: {
      extensions: ['.js', '.ts'],
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@utils': path.resolve(__dirname, 'utils'),
        '@content': path.resolve(__dirname, 'content'),
        '@background': path.resolve(__dirname, 'background'),
        '@popup': path.resolve(__dirname, 'popup')
      }
    },
    
    devtool: isProduction ? false : 'inline-source-map',
    
    watchOptions: {
      ignored: /node_modules/
    }
  };
};