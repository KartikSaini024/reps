import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { colors, FontFamily, Spacing } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

const LABEL_COLOR: Record<ButtonVariant, 'void' | 'ink' | 'coin'> = {
  primary: 'void',
  secondary: 'ink',
  ghost: 'coin',
};

/**
 * Log-register button: 48dp minimum target, 2dp borders, hard shadow,
 * zero radius. Pressing translates the face 2dp into its shadow — a state
 * change, not a performance (DESIGN §7 log motion rules).
 */
export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const hasShadow = variant !== 'ghost' && !disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={label}
      style={{
        paddingRight: hasShadow ? 4 : 0,
        paddingBottom: hasShadow ? 4 : 0,
        alignSelf: 'flex-start',
      }}
    >
      {({ pressed }) => (
        <>
          {hasShadow ? (
            <View
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                right: 0,
                bottom: 0,
                backgroundColor: colors.void,
              }}
            />
          ) : null}
          <View
            style={{
              minHeight: 48,
              paddingHorizontal: Spacing[4],
              alignItems: 'center',
              justifyContent: 'center',
              transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : [],
              ...(variant === 'ghost'
                ? {
                    backgroundColor: pressed && !disabled ? colors.panel : 'transparent',
                  }
                : {
                    backgroundColor: disabled
                      ? colors.rule
                      : variant === 'primary'
                        ? colors.coin
                        : colors.panel,
                    borderWidth: 2,
                    borderColor: colors.edge,
                  }),
            }}
          >
            <Text
              color={disabled ? 'faint' : LABEL_COLOR[variant]}
              style={{
                fontFamily: FontFamily.uiBold,
                fontSize: 15,
                lineHeight: 20,
                textTransform: 'uppercase',
              }}
            >
              {label}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}
