import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { colors, FontFamily } from '@/theme';

export interface NumericFieldProps {
  value: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
  max?: number;
}

/** Compact tabular-figures number input used inside routine rows. */
export function NumericField({ value, onChange, accessibilityLabel, max = 99 }: NumericFieldProps) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  const apply = (next: string) => {
    const stripped = next.replace(/[^0-9]/g, '').slice(0, 3);
    setText(stripped);
    const parsed = Number.parseInt(stripped, 10);
    if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= max) {
      onChange(parsed);
    }
  };

  return (
    <View
      style={{
        borderWidth: 2,
        borderColor: focused ? colors.coin : colors.edge,
        backgroundColor: focused ? colors.panel : 'transparent',
        width: 48,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextInput
        value={text}
        onChangeText={apply}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setText(String(value));
        }}
        keyboardType="number-pad"
        accessibilityLabel={accessibilityLabel}
        selectTextOnFocus
        style={{
          color: colors.ink,
          fontFamily: FontFamily.data,
          fontVariant: ['tabular-nums'],
          fontSize: 15,
          padding: 0,
          width: '100%',
          textAlign: 'center',
        }}
      />
    </View>
  );
}
