import { View } from 'react-native';

import { colors } from '@/theme';

export interface StepBarProps {
  /** Number of segments. DESIGN §8 default is 10. */
  count?: number;
  /** Progress 0..1. Segments fill whole — fractional progress floors to the last filled segment, never a partial bar. */
  value?: number;
  /** Height in dp. */
  height?: number;
}

const GAP = 3;

/**
 * Segmented progress (DESIGN §8): the segmentation IS the pixel language —
 * never a continuous bar. Filled segments --coin, empty --rule.
 *
 * Segments are fixed positional slots with no state or reordering, so the
 * slot index is the identity and keys are derived from it.
 */
export function StepBar({ count = 10, value = 0, height = 8 }: StepBarProps) {
  const clamped = Math.min(1, Math.max(0, value));
  const filledCount = Math.floor(clamped * count + 1e-9);

  return (
    <View style={{ flexDirection: 'row', gap: GAP }}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={`segment-${index}`}
          style={{
            flex: 1,
            height,
            backgroundColor: index < filledCount ? colors.coin : colors.rule,
          }}
        />
      ))}
    </View>
  );
}
