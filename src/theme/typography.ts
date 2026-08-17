import type { FontVariant } from 'react-native';

/**
 * DESIGN §5: three type roles.
 *  - Display (pixel face, arcade register only): Silkscreen, ALL CAPS, 0.12em tracking.
 *  - UI (humanist grotesque, log register): Space Grotesk.
 *  - Data (tabular figures, non-negotiable): Space Grotesk `tnum`
 *    (verified present in the shipped TTFs for 400/500/700).
 */
export const FontFamily = {
  display: 'Silkscreen_700Bold',
  displayRegular: 'Silkscreen_400Regular',
  ui: 'SpaceGrotesk_400Regular',
  uiMedium: 'SpaceGrotesk_500Medium',
  uiBold: 'SpaceGrotesk_700Bold',
  data: 'SpaceGrotesk_400Regular',
  dataMedium: 'SpaceGrotesk_500Medium',
  dataBold: 'SpaceGrotesk_700Bold',
} as const;

export type FontFamilyToken = keyof typeof FontFamily;

/** Arcade-register tracking from DESIGN §5's casing rule. */
export const TRACKING_EM = 0.12;

export interface TypeVariant {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textTransform?: 'uppercase';
  fontVariant?: FontVariant[];
}

export type TextVariant = 'marquee' | 'title' | 'dataXL' | 'dataL' | 'body' | 'label' | 'micro';

const em = (fontSize: number, ratio: number): number => Math.round(fontSize * ratio * 100) / 100;

export const typeVariants: Record<TextVariant, TypeVariant> = {
  /** 32sp display — level-up, STAGE CLEAR */
  marquee: {
    fontFamily: FontFamily.display,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: em(32, TRACKING_EM),
    textTransform: 'uppercase',
  },
  /** 20sp display — achievement names, rank */
  title: {
    fontFamily: FontFamily.display,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: em(20, TRACKING_EM),
    textTransform: 'uppercase',
  },
  /** 28sp data — live volume, session timer */
  dataXL: {
    fontFamily: FontFamily.dataBold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  /** 17sp data — set table weight/reps */
  dataL: {
    fontFamily: FontFamily.dataMedium,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  /** 15sp UI — exercise names, prose */
  body: {
    fontFamily: FontFamily.ui,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0,
  },
  /** 13sp UI — column headers, metadata */
  label: {
    fontFamily: FontFamily.ui,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0,
  },
  /** 11sp UI — timestamps, footnotes */
  micro: {
    fontFamily: FontFamily.ui,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0,
  },
};
