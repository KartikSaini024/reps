/**
 * Crash reporting configuration (techstack §8: Sentry — non-negotiable).
 * The DSN is a public client identifier by design (it ships in every build).
 * Error events only: no performance traces, no PII, and nothing is sent from
 * development builds until explicitly flipped here.
 */
export const SENTRY_DSN =
  'https://7a91e4b8dc6cdba75680ed8b0c4bfc88@o4511924094894080.ingest.us.sentry.io/4511924099284992';

export const TELEMETRY = {
  /** 0 = error reporting only; raise when performance monitoring is wanted. */
  tracesSampleRate: 0,
  /** Development builds stay silent; production builds report. */
  enabledInDevelopment: false,
  /**
   * Source-map upload needs the Sentry organization/project slugs plus a
   * SENTRY_AUTH_TOKEN (EAS secret) — add via app.json's
   * "@sentry/react-native" plugin options when available.
   */
  sourcemapsConfigured: false,
} as const;
