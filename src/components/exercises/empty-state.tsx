import { View } from 'react-native';

import { Text } from '@/components/text';
import { colors, Spacing } from '@/theme';

export interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <View
      style={{
        borderWidth: 2,
        borderColor: colors.edge,
        backgroundColor: colors.panel,
        padding: Spacing[6],
        alignItems: 'center',
      }}
    >
      <Text variant="label" color="faint" style={{ textAlign: 'center' }}>
        {message}
      </Text>
    </View>
  );
}
