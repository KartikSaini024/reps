import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme';

/** App-standard screen wrapper: void background, top+bottom safe area. */
export function SafeScreen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.void }} edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  );
}
