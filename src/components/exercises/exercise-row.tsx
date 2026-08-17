import type { PressableProps } from 'react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import type { Exercise } from '@/db/schema';
import { colors, Spacing } from '@/theme';

export interface ExerciseRowProps extends PressableProps {
  exercise: Exercise;
}

/** Dense, quiet library row: name + one metadata line. 56dp+ target. */
export function ExerciseRow({ exercise, ...pressableProps }: ExerciseRowProps) {
  return (
    <Pressable
      android_ripple={{ color: colors.rule, borderless: false, foreground: true }}
      style={({ pressed }) => ({
        paddingVertical: Spacing[3],
        gap: Spacing[1],
        opacity: pressed ? 0.7 : 1,
      })}
      accessibilityLabel={`${exercise.name}, ${exercise.primaryMuscle}, ${exercise.equipment}`}
      {...pressableProps}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
        <Text variant="body" style={{ flex: 1 }}>
          {exercise.name}
        </Text>
        {exercise.isCustom ? (
          <Text variant="micro" color="data">
            custom
          </Text>
        ) : null}
      </View>
      <Text variant="micro">
        {exercise.primaryMuscle} · {exercise.equipment} · {exercise.mechanic}
      </Text>
    </Pressable>
  );
}
