/**
 * Crash reporting configuration (techstack §8: Sentry — non-negotiable).
 * The DSN is a public client identifier by design (it ships in every build).
 * Error events only: no performance traces, no PII, and nothing is sent from
 * development builds until explicitly flipped here.
 *
 * TRIAL NOTE: Sentry is on a 10-day trial. When it ends, either set
 * `sentryEnabled` to false (SDK stops loading entirely; one boolean) or
 * fully remove the package (see PhaseLogs phase 2 for the removal list).
 */
export const SENTRY_DSN =
  'https://7a91e4b8dc6cdba75680ed8b0c4bfc88@o4511924094894080.ingest.us.sentry.io/4511924099284992';

export const TELEMETRY = {
  /** Master switch — false disables Sentry entirely (module never loads). */
  sentryEnabled: true,
  /** 0 = error reporting only; raise when performance monitoring is wanted. */
  tracesSampleRate: 0,
  /** Development builds stay silent; production builds report. */
  enabledInDevelopment: false,
  /** Source-map upload: org/project slugs in app.json + SENTRY_AUTH_TOKEN on EAS. */
  sourcemapsConfigured: true,
} as const;
