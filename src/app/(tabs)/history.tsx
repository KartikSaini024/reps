import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/exercises/empty-state';
import { SectionLabel } from '@/components/exercises/section-label';
import { Text } from '@/components/text';
import { formatDuration } from '@/components/workout/active-workout-banner';
import { getLatestCompletedSession } from '@/db/repositories/sessions';
import { getOrCreateLocalUser } from '@/db/repositories/users';
import type { Session } from '@/db/schema';
import { useActiveSessionStore } from '@/stores/active-session';
import { colors, FontFamily, Spacing } from '@/theme';

/**
 * History placeholder: the latest completed session, plain (log register).
 * The full history list + detail views are the analytics phase.
 */
export default function History() {
  const [latest, setLatest] = useState<Session | null>(null);
  const lastFinished = useActiveSessionStore((state) => state.lastFinished);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const user = await getOrCreateLocalUser();
        const session = await getLatestCompletedSession(user.id);
        if (!cancelled) {
          setLatest(session);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.void }}
      contentContainerStyle={{ padding: Spacing[4], gap: Spacing[4] }}
    >
      <SectionLabel>History</SectionLabel>

      {lastFinished ? (
        <View
          style={{
            borderWidth: 2,
            borderColor: colors.edge,
            backgroundColor: colors.panel,
            padding: Spacing[4],
            gap: Spacing[2],
          }}
        >
          <Text variant="body" style={{ fontFamily: FontFamily.uiBold }}>
            Workout saved
          </Text>
          <Text variant="dataL">
            {lastFinished.completedSetCount} sets ·{' '}
            {lastFinished.totalVolumeKg.toLocaleString('en-AU')} kg ·{' '}
            {formatDuration(lastFinished.durationSeconds)}
          </Text>
        </View>
      ) : null}

      {latest ? (
        <View style={{ gap: Spacing[2] }}>
          <Text variant="micro" color="faint">
            LAST COMPLETED
          </Text>
          <View
            style={{
              borderWidth: 2,
              borderColor: colors.edge,
              backgroundColor: colors.panel,
              padding: Spacing[4],
              gap: Spacing[2],
            }}
          >
            <Text variant="body">{latest.startedAt.toLocaleString('en-AU')}</Text>
            <Text variant="dataL">
              {latest.durationSeconds ? formatDuration(latest.durationSeconds) : '–'} ·{' '}
              {Math.round(latest.totalVolume).toLocaleString('en-AU')} kg
            </Text>
          </View>
          <Text variant="micro" color="faint">
            Full session history arrives with the analytics phase.
          </Text>
        </View>
      ) : (
        <EmptyState message="No completed workouts yet. Start one from the Routines tab." />
      )}
    </ScrollView>
  );
}
