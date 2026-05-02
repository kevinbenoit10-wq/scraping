const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Aggressive minification in production: renames variables, strips console calls,
// and outputs ASCII-only to make bundle harder to reverse-engineer
config.transformer.minifierConfig = {
  compress: {
    drop_console: true,
    drop_debugger: true,
    passes: 2,
    toplevel: true,
  },
  mangle: {
    toplevel: true,
  },
  output: {
    ascii_only: true,
    comments: false,
  },
};

module.exports = config;
