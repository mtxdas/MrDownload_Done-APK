const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
};

module.exports = config;
