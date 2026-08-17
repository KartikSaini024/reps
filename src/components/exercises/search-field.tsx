import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@/components/text';
import { colors, FontFamily, Spacing } from '@/theme';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/** Log-register search input: 2dp border, amber focus, clear affordance. */
export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search exercises',
}: SearchFieldProps) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: focused ? colors.coin : colors.edge,
        backgroundColor: colors.panel,
        paddingHorizontal: Spacing[3],
        height: 48,
      }}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        returnKeyType="search"
        autoCorrect={false}
        style={{
          flex: 1,
          color: colors.ink,
          fontFamily: FontFamily.ui,
          fontSize: 15,
          padding: 0,
        }}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => {
            onChangeText('');
            inputRef.current?.focus();
          }}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={12}
        >
          <Text variant="label" color="faint">
            ×
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
