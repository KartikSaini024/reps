/**
 * DESIGN §6: base unit 4dp — all padding, margins and component heights are
 * multiples of 4. Keys name the multiple: Spacing[3] === 12dp.
 */
export const SPACING_BASE = 4;

/** The valid multiples of the 4dp base provided by the scale. */
export type SpacingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 12 | 14 | 16 | 20;

export const Spacing: Record<SpacingStep, number> = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
};
