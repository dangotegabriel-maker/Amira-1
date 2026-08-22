const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase Auth publishes a React Native-specific entrypoint through package
// conditions. Disabling Metro package exports lets Metro use the package's
// react-native field, which registers Auth correctly in native Android builds.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
