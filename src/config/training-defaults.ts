/**
 * Tunable training defaults in one place. Values come from the PRD; when a
 * feature phase needs them, it imports from here — never hardcodes.
 */
export const TRAINING_DEFAULTS = {
  /** PRD E2: rest defaults by mechanic (seconds) */
  restSeconds: {
    compound: 180,
    isolation: 90,
  } as const,
  /** PRD A3: weekly training goal bounds (sessions per week) */
  weeklyGoal: {
    min: 2,
    max: 6,
    default: 3,
  } as const,
  /** Canonical weight unit for storage is always kg (converted at display) */
  canonicalUnit: 'kg' as const,
  /** PRD E6: Epley e1RM applies for r ≤ 10 */
  e1rmMaxReps: 10,
} as const;
