import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/exercises/empty-state';
import { MediaPlaceholder } from '@/components/exercises/media-placeholder';
import { SectionLabel } from '@/components/exercises/section-label';
import { Text } from '@/components/text';
import {
  getExerciseById,
  markOpened,
  setFavourite,
  softDeleteExercise,
} from '@/db/repositories/exercises';
import type { Exercise } from '@/db/schema';
import { colors, FontFamily, Spacing } from '@/theme';

/** Exercise detail — log register. Seeded content shows placeholders (PRD B3). */
export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [notFound, setNotFound] = useState(false);

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
        setExercise(found);
        setNotFound(found === null);
        if (found) {
          void markOpened(found.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNotFound(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    return (
      <Screen>
        <EmptyState message="Exercise not found." />
        <Button label="‹ Back" variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (!exercise) {
    return null;
  }

  const toggleFavourite = () => {
    const next = !exercise.isFavourite;
    setExercise({ ...exercise, isFavourite: next });
    void setFavourite(exercise.id, next);
  };

  const confirmDelete = () => {
    Alert.alert('Delete exercise', `Remove "${exercise.name}"? History stays intact.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void softDeleteExercise(exercise.id).then(() => router.back());
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
        <Button label="‹ Back" variant="ghost" onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <Button
          label={exercise.isFavourite ? '★ Favourited' : '☆ Favourite'}
          variant="ghost"
          onPress={toggleFavourite}
        />
      </View>

      <Text variant="body" style={{ fontFamily: FontFamily.uiBold, fontSize: 20, lineHeight: 24 }}>
        {exercise.name}
      </Text>
      {exercise.aliases.length > 0 ? (
        <Text variant="micro">aka {exercise.aliases.join(', ')}</Text>
      ) : null}

      <MediaPlaceholder />

      <SectionLabel>Details</SectionLabel>
      <View style={{ gap: Spacing[2] }}>
        <MetadataRow label="Primary muscle" value={exercise.primaryMuscle} />
        {exercise.secondaryMuscles.length > 0 ? (
          <MetadataRow label="Secondary" value={exercise.secondaryMuscles.join(', ')} />
        ) : null}
        <MetadataRow label="Equipment" value={exercise.equipment} />
        <MetadataRow label="Mechanic" value={exercise.mechanic} />
        <MetadataRow label="Force" value={exercise.force} />
        <MetadataRow label="Difficulty" value={exercise.difficulty} />
        <Text variant="label">
          <Text variant="label" color="faint">
            Default rest{'\n'}
          </Text>
          <Text variant="dataL">{exercise.defaultRestSeconds}s</Text>
        </Text>
      </View>

      <SectionLabel>Instructions</SectionLabel>
      <Text variant="body">{exercise.instructions}</Text>

      {exercise.cues.length > 0 ? (
        <>
          <SectionLabel>Cues</SectionLabel>
          <View style={{ gap: Spacing[1] }}>
            {exercise.cues.map((cue) => (
              <Text key={cue} variant="body">
                · {cue}
              </Text>
            ))}
          </View>
        </>
      ) : null}

      {exercise.commonMistakes.length > 0 ? (
        <>
          <SectionLabel>Common mistakes</SectionLabel>
          <View style={{ gap: Spacing[1] }}>
            {exercise.commonMistakes.map((mistake) => (
              <Text key={mistake} variant="body" color="faint">
                · {mistake}
              </Text>
            ))}
          </View>
        </>
      ) : null}

      <SectionLabel>History</SectionLabel>
      <EmptyState message="Session history arrives with workout logging." />

      {exercise.isCustom ? (
        <View style={{ flexDirection: 'row', gap: Spacing[3], flexWrap: 'wrap' }}>
          <Button
            label="Edit"
            variant="secondary"
            onPress={() => router.push(`/exercise/${exercise.id}/edit`)}
          />
          <Button label="Delete" variant="ghost" onPress={confirmDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <Text variant="label">
      <Text variant="label" color="faint">
        {label}
        {'\n'}
      </Text>
      {value}
    </Text>
  );
}

function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.void }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: Spacing[5] }}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
