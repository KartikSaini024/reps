import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';

import { Text } from '@/components/text';
import { getAllExercises } from '@/db/repositories/exercises';
import type { Exercise } from '@/db/schema';
import { colors, Spacing } from '@/theme';

export default function Home() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllExercises()
      .then((rows) => {
        if (!cancelled) {
          setExercises(rows);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.void, padding: Spacing[4] }}>
        <Text variant="body">Could not load exercises: {error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.void }}>
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing[4] }}
        ItemSeparatorComponent={() => <View style={{ height: 2, backgroundColor: colors.rule }} />}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: Spacing[3], gap: Spacing[1] }}>
            <Text variant="body">{item.name}</Text>
            <Text variant="micro">
              {item.primaryMuscle} · {item.equipment} · {item.mechanic}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
