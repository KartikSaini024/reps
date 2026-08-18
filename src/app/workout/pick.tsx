import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/button';
import { SearchField } from '@/components/exercises/search-field';
import { SectionLabel } from '@/components/exercises/section-label';
import { SafeScreen } from '@/components/safe-screen';
import { Text } from '@/components/text';
import { searchExercises } from '@/db/repositories/exercises';
import type { Exercise } from '@/db/schema';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useActiveSessionStore } from '@/stores/active-session';
import { colors, Spacing } from '@/theme';

/** Add exercises to the ACTIVE session — same picker pattern as routines. */
export default function PickWorkoutExercise() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Exercise[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const sessionExercises = useActiveSessionStore((state) => state.exercises);
  const addExercise = useActiveSessionStore((state) => state.addExercise);

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    let cancelled = false;
    void searchExercises(debouncedQuery).then((found) => {
      if (!cancelled) {
        setResults(found);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    setAddedIds(new Set(sessionExercises.map((exercise) => exercise.exerciseId)));
  }, [sessionExercises]);

  const toggle = useCallback(
    (exercise: Exercise) => {
      void addExercise(exercise);
    },
    [addExercise],
  );

  return (
    <SafeScreen>
      <View style={{ padding: Spacing[4], gap: Spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
          <SectionLabel>Add to workout</SectionLabel>
          <View style={{ flex: 1 }} />
          <Button label="Done" variant="ghost" onPress={() => router.back()} />
        </View>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search library" />
      </View>
      <FlashList
        data={results}
        style={{ flex: 1 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const added = addedIds.has(item.id);
          return (
            <View style={{ paddingHorizontal: Spacing[4] }}>
              <Pressable
                onPress={() => toggle(item)}
                disabled={added}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name} to workout`}
                android_ripple={{ color: colors.rule, foreground: true }}
                style={({ pressed }) => ({
                  paddingVertical: Spacing[3],
                  gap: Spacing[1],
                  opacity: pressed && !added ? 0.7 : 1,
                })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                  <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                    {item.name}
                  </Text>
                  {added ? (
                    <Text variant="micro" color="done">
                      added
                    </Text>
                  ) : null}
                </View>
                <Text variant="micro">
                  {item.primaryMuscle} · {item.equipment}
                </Text>
              </Pressable>
            </View>
          );
        }}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 2,
              backgroundColor: colors.rule,
              marginHorizontal: Spacing[4],
            }}
          />
        )}
        contentContainerStyle={{ paddingBottom: Spacing[6] }}
      />
    </SafeScreen>
  );
}
