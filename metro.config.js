// metro.config.js
// Necessário para o Firebase JS SDK (v10+) funcionar corretamente com o
// bundler do Expo/Metro. Sem isso, módulos como @firebase/firestore
// não resolvem os polyfills de ambiente corretamente no React Native.

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Firebase usa exports condicionais de pacote. O Metro precisa
// resolver "react-native" antes de "browser" no campo "exports".
config.resolver.unstable_conditionNames = [
  "require",
  "react-native",
  "default",
];

// Necessário para o Firebase v10+ resolver corretamente módulos ESM
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
