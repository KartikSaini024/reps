import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/exercises/empty-state';
import { SafeScreen } from '@/components/safe-screen';
import { Text } from '@/components/text';
import { formatDuration } from '@/components/workout/active-workout-banner';
import { ExerciseSection } from '@/components/workout/exercise-section';
import { NumericKeypad } from '@/components/workout/numeric-keypad';
import type { KeypadField } from '@/components/workout/set-row';
import { displayUnitToKg, formatWeightKg, weightUnitLabel } from '@/config/units';
import { useActiveSessionStore } from '@/stores/active-session';
import { useSettingsStore } from '@/stores/settings';
import { colors, FontFamily, Spacing } from '@/theme';

interface ActiveFieldTarget {
  setId: string;
  field: KeypadField;
}

/**
 * The active workout screen (DESIGN §9.1) — log register, as fast as
 * Strong. Custom keypad instead of the system keyboard (Phase 6); tab
 * between fields without dismissing; nothing modal except discard; screen
 * stays awake; controls in the bottom two-thirds.
 */
export default function ActiveWorkout() {
  useKeepAwake();

  const sessionId = useActiveSessionStore((state) => state.sessionId);
  const startedAt = useActiveSessionStore((state) => state.startedAt);
  const routineName = useActiveSessionStore((state) => state.routineName);
  const exercises = useActiveSessionStore((state) => state.exercises);
  const sessionNote = useActiveSessionStore((state) => state.sessionNote);
  const setSessionNote = useActiveSessionStore((state) => state.setSessionNote);
  const setExerciseNote = useActiveSessionStore((state) => state.setExerciseNote);
  const completeSet = useActiveSessionStore((state) => state.completeSet);
  const setWeight = useActiveSessionStore((state) => state.setWeight);
  const setReps = useActiveSessionStore((state) => state.setReps);
  const setRpe = useActiveSessionStore((state) => state.setRpe);
  const cycleSetType = useActiveSessionStore((state) => state.cycleSetType);
  const addSet = useActiveSessionStore((state) => state.addSet);
  const removeSet = useActiveSessionStore((state) => state.removeSet);
  const removeExercise = useActiveSessionStore((state) => state.removeExercise);
  const moveExercise = useActiveSessionStore((state) => state.moveExercise);
  const finish = useActiveSessionStore((state) => state.finish);
  const discard = useActiveSessionStore((state) => state.discard);

  const units = useSettingsStore((state) => state.units);
  const showRpe = useSettingsStore((state) => state.showRpe);

  const [activeField, setActiveField] = useState<ActiveFieldTarget | null>(null);
  const [draft, setDraft] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sessionId]);

  const { totalVolumeKg, completedSets } = useMemo(() => {
    let volume = 0;
    let count = 0;
    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        if (
          set.isCompleted &&
          set.setType === 'working' &&
          set.weightKg !== null &&
          set.reps !== null
        ) {
          volume += set.weightKg * set.reps;
          count += 1;
        }
      }
    }
    return { totalVolumeKg: Math.round(volume * 100) / 100, completedSets: count };
  }, [exercises]);

  /** Field order for keypad tabbing: weight → reps → (rpe) per set, skipping done rows. */
  const fieldSequence = useMemo<ActiveFieldTarget[]>(() => {
    const sequence: ActiveFieldTarget[] = [];
    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        if (set.isCompleted) {
          continue;
        }
        sequence.push({ setId: set.setId, field: 'weight' });
        sequence.push({ setId: set.setId, field: 'reps' });
        if (showRpe) {
          sequence.push({ setId: set.setId, field: 'rpe' });
        }
      }
    }
    return sequence;
  }, [exercises, showRpe]);

  const findSetValues = (setId: string) => {
    for (const exercise of exercises) {
      const set = exercise.sets.find((s) => s.setId === setId);
      if (set) {
        return set;
      }
    }
    return null;
  };

  const displayTextFor = (setId: string, field: KeypadField): string => {
    const set = findSetValues(setId);
    if (!set) {
      return '';
    }
    if (field === 'weight') {
      return set.weightKg === null ? '' : formatWeightKg(set.weightKg, units);
    }
    if (field === 'reps') {
      return set.reps === null ? '' : String(set.reps);
    }
    return set.rpe === null ? '' : String(set.rpe);
  };

  const openField = (setId: string, field: KeypadField) => {
    setActiveField({ setId, field });
    setDraft(displayTextFor(setId, field));
  };

  /** Commit the current draft into the store (canonical kg for weight). */
  const commitDraft = () => {
    if (!activeField) {
      return;
    }
    const { setId, field } = activeField;
    if (field === 'weight') {
      const parsed = Number.parseFloat(draft.replace(',', '.'));
      setWeight(setId, Number.isNaN(parsed) || parsed <= 0 ? null : displayUnitToKg(parsed, units));
    } else if (field === 'reps') {
      const parsed = Number.parseInt(draft, 10);
      setReps(setId, Number.isNaN(parsed) || parsed <= 0 ? null : parsed);
    } else {
      const parsed = Number.parseFloat(draft.replace(',', '.'));
      setRpe(setId, Number.isNaN(parsed) ? null : Math.min(10, Math.max(0, parsed)));
    }
  };

  const moveNext = () => {
    if (!activeField) {
      return;
    }
    commitDraft();
    const index = fieldSequence.findIndex(
      (entry) => entry.setId === activeField.setId && entry.field === activeField.field,
    );
    const next = index >= 0 ? fieldSequence[index + 1] : undefined;
    if (next) {
      // Commit lands in the store synchronously (zustand), so the next
      // field's draft picks up the just-committed value immediately.
      openField(next.setId, next.field);
    } else {
      setActiveField(null);
    }
  };

  const doneKeypad = () => {
    commitDraft();
    setActiveField(null);
  };

  const hasFurtherFields = useMemo(() => {
    if (!activeField) {
      return false;
    }
    const index = fieldSequence.findIndex(
      (entry) => entry.setId === activeField.setId && entry.field === activeField.field,
    );
    return index >= 0 && index < fieldSequence.length - 1;
  }, [activeField, fieldSequence]);

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

  const handleComplete = (sessionExerciseId: string, setId: string) => {
    // Commit any pending keypad edit for this set before completing.
    if (activeField && activeField.setId === setId) {
      commitDraft();
    }
    completeSet(sessionExerciseId, setId);
    if (activeField && activeField.setId === setId) {
      setActiveField(null);
    }
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
          <Pressable
            onPress={() => setNotesOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel="Session notes"
            hitSlop={8}
          >
            <Text variant="label" color={notesOpen || sessionNote.length > 0 ? 'coin' : 'faint'}>
              ✎
            </Text>
          </Pressable>
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
            {formatWeightKg(totalVolumeKg, units)} {weightUnitLabel(units)}
          </Text>
          {' volume'}
        </Text>
        {notesOpen ? (
          <View
            style={{
              borderWidth: 2,
              borderColor: colors.edge,
              backgroundColor: colors.panel,
              paddingHorizontal: Spacing[3],
            }}
          >
            <TextInput
              value={sessionNote}
              onChangeText={setSessionNote}
              placeholder="Session notes"
              placeholderTextColor={colors.faint}
              multiline
              style={{
                color: colors.ink,
                fontFamily: FontFamily.ui,
                fontSize: 14,
                paddingVertical: Spacing[2],
                minHeight: 48,
                textAlignVertical: 'top',
              }}
            />
          </View>
        ) : null}
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
            units={units}
            showRpe={showRpe}
            activeField={activeField}
            draft={draft}
            onOpenField={openField}
            onCompleteSet={(setId) => handleComplete(exercise.sessionExerciseId, setId)}
            onCycleType={cycleSetType}
            onAddSet={() => addSet(exercise.sessionExerciseId)}
            onRemoveSet={(setId) => removeSet(exercise.sessionExerciseId, setId)}
            onMoveUp={() => moveExercise(index, index - 1)}
            onMoveDown={() => moveExercise(index, index + 1)}
            onRemoveExercise={() => removeExercise(exercise.sessionExerciseId)}
            onNoteChange={(note) => setExerciseNote(exercise.sessionExerciseId, note)}
          />
        ))}
      </ScrollView>

      {/* Custom keypad — pinned bottom, replaces the system keyboard */}
      {activeField ? (
        <NumericKeypad
          draft={draft}
          onDraftChange={setDraft}
          allowDecimal={activeField.field !== 'reps'}
          units={units}
          onNext={moveNext}
          onDone={doneKeypad}
          hasFurtherFields={hasFurtherFields}
        />
      ) : null}

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
            <Pressable
              onPress={() => {
                void finish().then(() => router.replace('/history'));
              }}
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
              <Text
                variant="label"
                style={{ fontFamily: FontFamily.uiBold, textTransform: 'uppercase' }}
              >
                Finish
              </Text>
            </Pressable>
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
