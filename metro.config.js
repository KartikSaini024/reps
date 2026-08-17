const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Drizzle migrations are bundled as .sql files (see babel inline-import).
config.resolver.sourceExts.push('sql');

module.exports = config;
