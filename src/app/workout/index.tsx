import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/exercises/empty-state';
import { SafeScreen } from '@/components/safe-screen';
import { Text } from '@/components/text';
import { formatDuration } from '@/components/workout/active-workout-banner';
import { ExerciseSection } from '@/components/workout/exercise-section';
import { useActiveSessionStore } from '@/stores/active-session';
import { colors, FontFamily, Spacing } from '@/theme';

/**
 * The active workout screen (DESIGN §9.1) — log register, as fast as
 * Strong. Nothing modal except discard confirmation; no spinners, no
 * blocking awaits; controls in the bottom two-thirds; screen stays awake.
 */
export default function ActiveWorkout() {
  useKeepAwake();

  const sessionId = useActiveSessionStore((state) => state.sessionId);
  const startedAt = useActiveSessionStore((state) => state.startedAt);
  const routineName = useActiveSessionStore((state) => state.routineName);
  const exercises = useActiveSessionStore((state) => state.exercises);
  const completeSet = useActiveSessionStore((state) => state.completeSet);
  const setWeightText = useActiveSessionStore((state) => state.setWeightText);
  const setRepsText = useActiveSessionStore((state) => state.setRepsText);
  const addSet = useActiveSessionStore((state) => state.addSet);
  const removeSet = useActiveSessionStore((state) => state.removeSet);
  const removeExercise = useActiveSessionStore((state) => state.removeExercise);
  const moveExercise = useActiveSessionStore((state) => state.moveExercise);
  const finish = useActiveSessionStore((state) => state.finish);
  const discard = useActiveSessionStore((state) => state.discard);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sessionId]);

  const { totalVolume, completedSets } = useMemo(() => {
    let volume = 0;
    let count = 0;
    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        if (set.isCompleted && set.setType === 'working') {
          const weight = Number.parseFloat(set.weightText.replace(',', '.'));
          const reps = Number.parseInt(set.repsText, 10);
          if (!Number.isNaN(weight) && !Number.isNaN(reps)) {
            volume += weight * reps;
            count += 1;
          }
        }
      }
    }
    return { totalVolume: Math.round(volume), completedSets: count };
  }, [exercises]);

  if (!sessionId || !startedAt) {
    return (
      <SafeScreen>
        <View style={{ padding: Spacing[4], gap: Spacing[4] }}>
          <Button label="‹ Back" variant="ghost" onPress={() => router.back()} />
          <EmptyState message="No active workout. Start one from the Routines tab." />
        </View>
      </SafeScreen>
    );
  }

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));

  const confirmDiscard = () => {
    Alert.alert(
      'Discard workout',
      'Discard this session? Sets already logged are kept as discarded.',
      [
        { text: 'Keep training', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            void discard().then(() => router.back());
          },
        },
      ],
    );
  };

  return (
    <SafeScreen>
      {/* Header: name + live timer + stats */}
      <View
        style={{
          padding: Spacing[4],
          gap: Spacing[1],
          borderBottomWidth: 2,
          borderBottomColor: colors.edge,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[3] }}>
          <Text
            variant="body"
            numberOfLines={1}
            style={{ flex: 1, fontFamily: FontFamily.uiBold, fontSize: 20, lineHeight: 24 }}
          >
            {routineName ?? 'Workout'}
          </Text>
          <Text variant="dataXL" color="data" style={{ fontFamily: FontFamily.dataBold }}>
            {formatDuration(elapsed)}
          </Text>
        </View>
        <Text variant="label" color="faint">
          <Text variant="label" color="data">
            {completedSets}
          </Text>
          {' sets · '}
          <Text variant="label" color="data">
            {totalVolume.toLocaleString('en-AU')} kg
          </Text>
          {' volume'}
        </Text>
      </View>

      {exercises.length === 0 ? (
        <EmptyState message="Empty session — add the first exercise below." />
      ) : null}

      <ScrollView contentContainerStyle={{ padding: Spacing[4], gap: Spacing[5] }}>
        {exercises.map((exercise, index) => (
          <ExerciseSection
            key={exercise.sessionExerciseId}
            exercise={exercise}
            position={index}
            exerciseCount={exercises.length}
            onCompleteSet={(setId) => completeSet(exercise.sessionExerciseId, setId)}
            onWeightChange={setWeightText}
            onRepsChange={setRepsText}
            onAddSet={() => addSet(exercise.sessionExerciseId)}
            onRemoveSet={(setId) => removeSet(exercise.sessionExerciseId, setId)}
            onMoveUp={() => moveExercise(index, index - 1)}
            onMoveDown={() => moveExercise(index, index + 1)}
            onRemoveExercise={() => removeExercise(exercise.sessionExerciseId)}
          />
        ))}
      </ScrollView>

      {/* Bottom controls — thumb zone */}
      <View
        style={{
          padding: Spacing[4],
          gap: Spacing[3],
          borderTopWidth: 2,
          borderTopColor: colors.edge,
        }}
      >
        <Pressable
          onPress={() => router.push('/workout/pick')}
          accessibilityRole="button"
          accessibilityLabel="Add exercise to workout"
          style={({ pressed }) => ({
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: colors.edge,
            backgroundColor: pressed ? colors.panel : 'transparent',
          })}
        >
          <Text variant="label" color="ink">
            + Add exercise
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
          <View style={{ flex: 1 }}>
            <FinishButton
              label="Finish"
              onPress={() => {
                void finish().then(() => router.replace('/history'));
              }}
            />
          </View>
          <Pressable
            onPress={confirmDiscard}
            accessibilityRole="button"
            accessibilityLabel="Discard workout"
            style={({ pressed }) => ({
              height: 56,
              width: 96,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.panel : 'transparent',
            })}
          >
            <Text variant="label" color="pr">
              Discard
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeScreen>
  );
}

function FinishButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Finish workout"
      style={({ pressed }) => ({
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.rule : colors.coin,
        borderWidth: 2,
        borderColor: colors.edge,
      })}
    >
      <Text variant="label" style={{ fontFamily: FontFamily.uiBold, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </Pressable>
  );
}
