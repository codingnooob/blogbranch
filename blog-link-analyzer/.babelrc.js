module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        chrome: '88',
        firefox: '78'
      },
      modules: false
    }]
  ],
  plugins: []
};