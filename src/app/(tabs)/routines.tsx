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
import { useActiveSessionStore } from '@/stores/active-session';
import { colors, FontFamily, Spacing } from '@/theme';

/** Routine list — LOG register. Tapping opens the editor. */
export default function Routines() {
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [starting, setStarting] = useState(false);
  const activeSessionId = useActiveSessionStore((state) => state.sessionId);
  const startFromRoutine = useActiveSessionStore((state) => state.startFromRoutine);
  const startEmpty = useActiveSessionStore((state) => state.startEmpty);

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

  /** Start (or resume) a session; one live session at a time, never modal. */
  const start = useCallback(
    async (begin: () => Promise<void>) => {
      if (starting) {
        return;
      }
      if (activeSessionId) {
        router.push('/workout');
        return;
      }
      setStarting(true);
      try {
        await begin();
        router.push('/workout');
      } finally {
        setStarting(false);
      }
    },
    [activeSessionId, starting],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.void }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: Spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
          <SectionLabel>Routines</SectionLabel>
          <Text variant="micro" style={{ flex: 1 }}>
            {routines.length} total
          </Text>
          <Button
            label="Empty ▶"
            variant="ghost"
            disabled={starting}
            onPress={() => void start(() => startEmpty())}
          />
          <Button label="+ New" variant="ghost" onPress={() => router.push('/routine/new')} />
        </View>

        {activeSessionId ? (
          <Pressable
            onPress={() => router.push('/workout')}
            accessibilityRole="button"
            accessibilityLabel="Resume active workout"
            style={({ pressed }) => ({
              borderWidth: 2,
              borderColor: colors.coin,
              backgroundColor: pressed ? colors.rule : colors.panel,
              padding: Spacing[3],
              alignItems: 'center',
            })}
          >
            <Text variant="label" color="coin">
              Workout in progress — tap to resume
            </Text>
          </Pressable>
        ) : null}

        {routines.length === 0 ? (
          <EmptyState message="No routines yet. Create one, or start from scratch — starter templates arrive on first launch." />
        ) : (
          <View style={{ borderWidth: 2, borderColor: colors.edge }}>
            {routines.map(({ routine, exerciseCount }, index) => (
              <View
                key={routine.id}
                style={{
                  borderTopWidth: index === 0 ? 0 : 2,
                  borderTopColor: colors.rule,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Pressable
                    onPress={() => router.push(`/routine/${routine.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Routine ${routine.name}, ${exerciseCount} exercises`}
                    android_ripple={{ color: colors.rule, foreground: true }}
                    style={({ pressed }) => ({
                      padding: Spacing[4],
                      gap: Spacing[1],
                      backgroundColor: pressed ? colors.panel : 'transparent',
                      flex: 1,
                    })}
                  >
                    <Text variant="body" style={{ fontFamily: FontFamily.uiBold }}>
                      {routine.name}
                    </Text>
                    <Text variant="micro">
                      {exerciseCount} exercises{routine.notes ? ` · ${routine.notes}` : ''}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void start(() => startFromRoutine(routine.id))}
                    disabled={starting}
                    accessibilityRole="button"
                    accessibilityLabel={`Start workout: ${routine.name}`}
                    android_ripple={{ color: colors.rule, foreground: true }}
                    style={({ pressed }) => ({
                      width: 72,
                      height: 72,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderLeftWidth: 2,
                      borderLeftColor: colors.rule,
                      backgroundColor: pressed ? colors.rule : 'transparent',
                    })}
                  >
                    <Text variant="body" color="coin">
                      ▶
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
