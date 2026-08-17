/**
 * Telemetry settings slot (kept per the centralised-config convention).
 *
 * Sentry was removed on 2026-08-17 during its trial: it broke Expo Go (the
 * SDK resolves its native module at import time, which Expo Go doesn't ship)
 * and complicated the dev loop more than the crash reports were worth at
 * this stage. If crash reporting returns, re-add per PhaseLogs (phase 2
 * postmortem) — package, plugin, lazy loader, and this config — before
 * shipping to testers.
 */
export const TELEMETRY = {
  /** No crash-reporting SDK is installed. */
  sentryEnabled: false,
} as const;
