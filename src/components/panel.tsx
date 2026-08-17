import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

export interface PanelProps {
  children?: ReactNode;
  /** Applied to the content box (inside the border). */
  style?: StyleProp<ViewStyle>;
}

/**
 * The universal container (DESIGN §8): 2dp --edge border, --panel fill,
 * hard-offset shadow (4dp x, 4dp y, 0 blur, --void), zero radius.
 *
 * The shadow is a sibling view inset by 4dp on the trailing edges so it
 * never depends on platform shadow behaviour or overflow clipping.
 */
export function Panel({ children, style }: PanelProps) {
  return (
    <View style={{ paddingRight: 4, paddingBottom: 4 }}>
      <View
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          right: 0,
          bottom: 0,
          backgroundColor: colors.void,
        }}
      />
      <View
        style={[
          {
            backgroundColor: colors.panel,
            borderWidth: 2,
            borderColor: colors.edge,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}
