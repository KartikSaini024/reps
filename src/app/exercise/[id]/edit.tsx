import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/exercises/empty-state';
import { ExerciseForm } from '@/components/exercises/exercise-form';
import { SectionLabel } from '@/components/exercises/section-label';
import { getExerciseById, updateCustomExercise } from '@/db/repositories/exercises';
import type { Exercise } from '@/db/schema';
import { colors, Spacing } from '@/theme';

/** Edit a custom exercise. Seeded library content is not editable here. */
export default function EditExercise() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'blocked'>('loading');

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    getExerciseById(id)
      .then((found) => {
        if (cancelled) {
          return;
        }
        if (found?.isCustom) {
          setExercise(found);
          setState('ready');
        } else {
          setState('blocked');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState('blocked');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.void }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing[4], gap: Spacing[5] }}
        keyboardShouldPersistTaps="handled"
      >
        <SectionLabel>Edit exercise</SectionLabel>
        {state === 'ready' && exercise ? (
          <ExerciseForm
            initial={exercise}
            submitLabel="Save"
            onSubmit={async (input) => {
              await updateCustomExercise(exercise.id, input);
              router.back();
            }}
          />
        ) : null}
        {state === 'blocked' ? (
          <>
            <EmptyState message="Only custom exercises can be edited." />
            <Button label="‹ Back" variant="ghost" onPress={() => router.back()} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
