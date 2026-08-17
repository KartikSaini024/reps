import { View } from 'react-native';

import { Text } from '@/components/text';
import { colors, Spacing } from '@/theme';

/**
 * Flat token-colour placeholder for exercise media (PRD B4, option (a) at
 * MVP). No art until Phase 10 — shape and slot only.
 */
export function MediaPlaceholder() {
  return (
    <View
      style={{
        height: 160,
        borderWidth: 2,
        borderColor: colors.edge,
        backgroundColor: colors.panel,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing[1],
      }}
      accessibilityLabel="Exercise media placeholder"
    >
      <View style={{ width: Spacing[8], height: Spacing[8], backgroundColor: colors.rule }} />
      <Text variant="micro" color="faint">
        media placeholder
      </Text>
    </View>
  );
}
