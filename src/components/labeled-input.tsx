import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Text } from '@/components/text';
import { colors, FontFamily, Spacing } from '@/theme';

export interface LabeledInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
}

/** Log-register form input: label above, 2dp border, amber focus. */
export function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numeric = false,
}: LabeledInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: Spacing[2] }}>
      <Text variant="micro" color="faint" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
      <View
        style={{
          borderWidth: 2,
          borderColor: focused ? colors.coin : colors.edge,
          backgroundColor: colors.panel,
          paddingHorizontal: Spacing[3],
          minHeight: 48,
          justifyContent: multiline ? 'flex-start' : 'center',
        }}
      >
        <TextInput
          value={value}
          onChangeText={(text) => onChangeText(numeric ? text.replace(/[^0-9]/g, '') : text)}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          multiline={multiline}
          keyboardType={numeric ? 'number-pad' : 'default'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            color: colors.ink,
            fontFamily: numeric ? FontFamily.data : FontFamily.ui,
            fontVariant: numeric ? ['tabular-nums'] : undefined,
            fontSize: 15,
            paddingVertical: multiline ? Spacing[2] : 0,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
      </View>
    </View>
  );
}
