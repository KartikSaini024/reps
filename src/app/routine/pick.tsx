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
import { useRoutineEditorStore } from '@/stores/routine-editor';
import { colors, Spacing } from '@/theme';

/**
 * Exercise picker for the routine editor. Adds directly into the editor
 * draft (Zustand) — multi-add, then Done.
 */
export default function PickExercise() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Exercise[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const entries = useRoutineEditorStore((state) => state.entries);
  const addExercise = useRoutineEditorStore((state) => state.addExercise);

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

  // Pre-mark exercises already in the draft.
  useEffect(() => {
    setAddedIds(new Set(entries.map((entry) => entry.exerciseId)));
  }, [entries]);

  const toggle = useCallback(
    (exercise: Exercise) => {
      addExercise(exercise);
      setAddedIds((prev) => new Set(prev).add(exercise.id));
    },
    [addExercise],
  );

  return (
    <SafeScreen>
      <View style={{ padding: Spacing[4], gap: Spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
          <SectionLabel>Add exercises</SectionLabel>
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
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name} to routine`}
                android_ripple={{ color: colors.rule, foreground: true }}
                style={({ pressed }) => ({
                  paddingVertical: Spacing[3],
                  gap: Spacing[1],
                  opacity: pressed ? 0.7 : 1,
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
