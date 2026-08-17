import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { colors, Spacing } from '@/theme';

export interface ChipSelectProps<T extends string> {
  label: string;
  options: readonly T[];
  selected: readonly T[];
  multiselect?: boolean;
  onSelect: (selected: readonly T[]) => void;
}

/** Wrapping chip group for forms (single-select unless `multiselect`). */
export function ChipSelect<T extends string>({
  label,
  options,
  selected,
  multiselect = false,
  onSelect,
}: ChipSelectProps<T>) {
  const toggle = (option: T) => {
    if (multiselect) {
      onSelect(
        selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option],
      );
    } else {
      onSelect(selected.includes(option) ? [] : [option]);
    }
  };

  return (
    <View style={{ gap: Spacing[2] }}>
      <Text variant="micro" color="faint" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] }}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => toggle(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                height: 48,
                paddingHorizontal: Spacing[4],
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: active ? colors.coin : colors.edge,
                backgroundColor: active ? colors.panel : 'transparent',
              }}
            >
              <Text variant="label" color={active ? 'ink' : 'faint'}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
