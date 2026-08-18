import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/exercises/empty-state';
import { SectionLabel } from '@/components/exercises/section-label';
import { Text } from '@/components/text';
import { listRoutines, type RoutineSummary } from '@/db/repositories/routines';
import { getOrCreateLocalUser } from '@/db/repositories/users';
import { colors, FontFamily, Spacing } from '@/theme';

/** Routine list — LOG register. Tapping opens the editor. */
export default function Routines() {
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const user = await getOrCreateLocalUser();
        const rows = await listRoutines(user.id);
        if (!cancelled) {
          setRoutines(rows);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.void }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: Spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
          <SectionLabel>Routines</SectionLabel>
          <Text variant="micro" style={{ flex: 1 }}>
            {routines.length} total
          </Text>
          <Button label="+ New" variant="ghost" onPress={() => router.push('/routine/new')} />
        </View>

        {routines.length === 0 ? (
          <EmptyState message="No routines yet. Create one, or start from scratch — starter templates arrive on first launch." />
        ) : (
          <View style={{ borderWidth: 2, borderColor: colors.edge }}>
            {routines.map(({ routine, exerciseCount }, index) => (
              <Pressable
                key={routine.id}
                onPress={() => router.push(`/routine/${routine.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Routine ${routine.name}, ${exerciseCount} exercises`}
                android_ripple={{ color: colors.rule, foreground: true }}
                style={({ pressed }) => ({
                  padding: Spacing[4],
                  gap: Spacing[1],
                  backgroundColor: pressed ? colors.panel : 'transparent',
                  borderTopWidth: index === 0 ? 0 : 2,
                  borderTopColor: colors.rule,
                })}
              >
                <Text variant="body" style={{ fontFamily: FontFamily.uiBold }}>
                  {routine.name}
                </Text>
                <Text variant="micro">
                  {exerciseCount} exercises{routine.notes ? ` · ${routine.notes}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
