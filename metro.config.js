const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Browser builds (used by the Playwright suite) swap expo-sqlite for an in-memory shim.
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'expo-sqlite') {
    return { type: 'sourceFile', filePath: path.join(__dirname, 'src/web/sqliteShim.ts') };
  }
  return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
