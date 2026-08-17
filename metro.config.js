const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Drizzle migrations are bundled as .sql files (see babel inline-import).
config.resolver.sourceExts.push('sql');

module.exports = config;
