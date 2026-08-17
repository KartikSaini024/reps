import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/text';
import { colors, Spacing } from '@/theme';

export interface FilterChipRowProps<T extends string> {
  label: string;
  options: readonly T[];
  selected?: T;
  onSelect: (option: T | undefined) => void;
}

/**
 * Horizontal single-select filter row ("All" + options). Tapping the active
 * chip clears it. Chips are quiet: transparent when off, panel-filled on.
 */
export function FilterChipRow<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: FilterChipRowProps<T>) {
  return (
    <View style={{ gap: Spacing[2] }}>
      <Text variant="micro" color="faint" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing[2], paddingRight: Spacing[4] }}
      >
        {([undefined, ...options] as (T | undefined)[]).map((option) => {
          const active = option === undefined ? selected === undefined : selected === option;
          return (
            <Pressable
              key={option ?? 'all'}
              onPress={() =>
                onSelect(option === undefined ? undefined : active ? undefined : option)
              }
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option === undefined ? `All ${label}` : option}
              style={{
                height: 48,
                paddingHorizontal: Spacing[4],
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: colors.edge,
                backgroundColor: active ? colors.panel : 'transparent',
              }}
            >
              <Text variant="label" color={active ? 'ink' : 'faint'}>
                {option ?? 'all'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
