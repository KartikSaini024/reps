import { View } from 'react-native';

import { Text } from '@/components/text';
import { colors, Spacing } from '@/theme';

export interface MarqueeProps {
  label: string;
}

/**
 * Arcade header (DESIGN §8): display face, all caps, tracked, amber, with a
 * 2dp rule beneath. Arcade register only.
 */
export function Marquee({ label }: MarqueeProps) {
  return (
    <View>
      <Text variant="marquee">{label}</Text>
      <View
        style={{
          height: 2,
          backgroundColor: colors.edge,
          marginTop: Spacing[2],
        }}
      />
    </View>
  );
}
