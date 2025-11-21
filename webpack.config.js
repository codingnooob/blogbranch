const path = require('path');

module.exports = {
  entry: './popup.js',
  output: {
    filename: 'popup.bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    alias: {
      './src': './popup.js'
    }
  },
  mode: 'production'
};