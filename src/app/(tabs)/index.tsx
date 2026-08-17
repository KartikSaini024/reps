import { FlashList } from '@shopify/flash-list';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/exercises/empty-state';
import { ExerciseRow } from '@/components/exercises/exercise-row';
import { FilterChipRow } from '@/components/exercises/filter-chip-row';
import { SearchField } from '@/components/exercises/search-field';
import { SectionLabel } from '@/components/exercises/section-label';
import { Text } from '@/components/text';
import {
  getFavouriteExercises,
  getRecentlyUsedExercises,
  searchExercises,
} from '@/db/repositories/exercises';
import {
  EQUIPMENT_TYPES,
  type Equipment,
  type Exercise,
  MUSCLE_GROUPS,
  type MuscleGroup,
} from '@/db/schema';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { colors, Spacing } from '@/theme';

/**
 * Exercise library — the LOG register: quiet, dense, fast. Search and
 * filters run against SQLite (debounced), never an in-memory filter.
 */
export default function ExerciseLibrary() {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | undefined>();
  const [equipment, setEquipment] = useState<Equipment | undefined>();
  const [results, setResults] = useState<Exercise[]>([]);
  const [favourites, setFavourites] = useState<Exercise[]>([]);
  const [recent, setRecent] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const debouncedQuery = useDebouncedValue(query, 300);
  const browsing =
    debouncedQuery.trim().length === 0 && muscle === undefined && equipment === undefined;

  const requestId = useRef(0);
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const [found, favs, recents] = await Promise.all([
        searchExercises(debouncedQuery, { primaryMuscle: muscle, equipment }),
        browsing ? getFavouriteExercises() : Promise.resolve([]),
        browsing ? getRecentlyUsedExercises() : Promise.resolve([]),
      ]);
      if (id === requestId.current) {
        setResults(found);
        setFavourites(favs);
        setRecent(recents);
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
      }
    }
  }, [debouncedQuery, muscle, equipment, browsing]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const header = (
    <View style={{ padding: Spacing[4], gap: Spacing[4], paddingBottom: Spacing[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
        <SectionLabel>Exercises</SectionLabel>
        <Text variant="micro" style={{ flex: 1 }}>
          {results.length} shown
        </Text>
        <Button label="+ New" variant="ghost" onPress={() => router.push('/exercise/new')} />
      </View>

      <SearchField value={query} onChangeText={setQuery} />

      <FilterChipRow
        label="Muscle"
        options={MUSCLE_GROUPS}
        selected={muscle}
        onSelect={setMuscle}
      />
      <FilterChipRow
        label="Equipment"
        options={EQUIPMENT_TYPES}
        selected={equipment}
        onSelect={setEquipment}
      />

      {browsing && favourites.length > 0 ? (
        <MiniRow label="Favourites" exercises={favourites} />
      ) : null}
      {browsing && recent.length > 0 ? <MiniRow label="Recent" exercises={recent} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.void }}>
      <FlashList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: Spacing[4] }}>
            <ExerciseRow exercise={item} onPress={() => router.push(`/exercise/${item.id}`)} />
          </View>
        )}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 2,
              backgroundColor: colors.rule,
              marginHorizontal: Spacing[4],
            }}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? null : (
            <View style={{ padding: Spacing[4] }}>
              <EmptyState message="No exercises match. Try clearing filters — or create it." />
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: Spacing[6] }}
      />
    </View>
  );
}

/** Compact horizontal shelf of exercise names (favourites / recent). */
function MiniRow({ label, exercises }: { label: string; exercises: Exercise[] }) {
  return (
    <View style={{ gap: Spacing[2] }}>
      <Text variant="micro" color="faint" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: Spacing[2], paddingRight: Spacing[4] }}
      >
        {exercises.map((exercise) => (
          <Pressable
            key={exercise.id}
            onPress={() => router.push(`/exercise/${exercise.id}`)}
            accessibilityRole="button"
            accessibilityLabel={exercise.name}
            style={{
              height: 48,
              paddingHorizontal: Spacing[4],
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: colors.edge,
              backgroundColor: colors.panel,
            }}
          >
            <Text variant="label">{exercise.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
