/**
 * The nine colour tokens from DESIGN §4. Every colour in the app comes from
 * this module — no ad-hoc hex values, no opacity on colours.
 *
 * A theme (DESIGN §11) is one object satisfying ThemeColors; swapping themes
 * later means pointing `colors` at a different theme object.
 */
export interface ThemeColors {
  /** App background */
  void: string;
  /** Card / raised surface */
  panel: string;
  /** Dividers, empty progress segments */
  rule: string;
  /** Borders, inactive outlines */
  edge: string;
  /** Primary: XP, levels, rank, the marquee */
  coin: string;
  /** Personal records, celebration, rare achievements */
  pr: string;
  /** Charts, timers, secondary data */
  data: string;
  /** Completed sets, success */
  done: string;
  /** Primary text */
  ink: string;
  /** Secondary text, labels */
  faint: string;
}

/** DESIGN §11 'Midnight Arcade' — the default theme. */
export const midnightArcade: ThemeColors = {
  void: '#12101C',
  panel: '#1E1B2E',
  rule: '#2E2A45',
  edge: '#3A3458',
  coin: '#FFB627',
  pr: '#FF3D7F',
  data: '#3DDCFF',
  done: '#7DF9A8',
  ink: '#F2EDFF',
  faint: '#8B84A8',
};

/** The active theme. A theme swap is reassigning this binding. */
export const colors: ThemeColors = midnightArcade;

export type ColorToken = keyof ThemeColors;
