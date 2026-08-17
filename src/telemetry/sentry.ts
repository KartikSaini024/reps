import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { SENTRY_DSN, TELEMETRY } from '@/config/telemetry';

type SentryModule = typeof import('@sentry/react-native');

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let cached: SentryModule | null | undefined;

/**
 * @sentry/react-native resolves its native turbo module at IMPORT time
 * (`TurboModuleRegistry.getEnforcing('RNSentry')`), which throws in Expo Go
 * (no Sentry native module) and on web. So the module is only ever
 * require()'d here, lazily, in real builds — dev clients and standalone apps.
 */
function loadSentry(): SentryModule | null {
  if (cached !== undefined) {
    return cached;
  }
  if (isExpoGo || Platform.OS === 'web') {
    cached = null;
    return cached;
  }
  // Intentional lazy CommonJS require: keeps Expo Go from ever evaluating
  // the Sentry module factory. Metro executes factories only on first require.
  const mod = require('@sentry/react-native') as SentryModule;
  cached = mod;
  return cached;
}

/** Initialise Sentry once at app start. Returns null where Sentry can't run. */
export function initSentry(): SentryModule | null {
  const Sentry = loadSentry();
  if (!Sentry) {
    return null;
  }
  Sentry.init({
    dsn: SENTRY_DSN,
    tracesSampleRate: TELEMETRY.tracesSampleRate,
    sendDefaultPii: false,
    enabled: !__DEV__ || TELEMETRY.enabledInDevelopment,
  });
  return Sentry;
}
