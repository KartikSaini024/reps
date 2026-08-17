import type { ReactNode } from 'react';
import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { type ColorToken, colors, type TextVariant, typeVariants } from '@/theme';

const VARIANT_DEFAULT_COLOR: Record<TextVariant, ColorToken> = {
  marquee: 'coin',
  title: 'ink',
  dataXL: 'data',
  dataL: 'ink',
  body: 'ink',
  label: 'faint',
  micro: 'faint',
};

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  /** Token name only — never a raw colour value. */
  color?: ColorToken;
  children: ReactNode;
}

/**
 * The app's only text component. Display variants (marquee, title) render
 * ALL CAPS with 0.12em tracking per DESIGN §5; data variants set tabular
 * figures so columns of numbers never jitter.
 */
export function Text({ variant = 'body', color, style, ...rest }: AppTextProps) {
  const token = color ?? VARIANT_DEFAULT_COLOR[variant];
  return (
    <RNText
      style={[{ color: colors[token] }, typeVariants[variant], style] as StyleProp<TextStyle>}
      {...rest}
    />
  );
}
