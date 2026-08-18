import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { SectionLabel } from '@/components/exercises/section-label';
import { LabeledInput } from '@/components/labeled-input';
import { ReorderableList } from '@/components/reorderable-list';
import { NumericField } from '@/components/routines/numeric-field';
import { Text } from '@/components/text';
import {
  createRoutine,
  duplicateRoutine,
  softDeleteRoutine,
  updateRoutine,
} from '@/db/repositories/routines';
import { getOrCreateLocalUser } from '@/db/repositories/users';
import { type RoutineEntryDraft, useRoutineEditorStore } from '@/stores/routine-editor';
import { colors, FontFamily, Spacing } from '@/theme';

const ROW_HEIGHT = 72;

/**
 * Shared editor UI for create + edit. State lives in the routine-editor
 * store so the exercise picker route can contribute. Log register.
 */
export function RoutineEditorView({ isExisting }: { isExisting: boolean }) {
  const { routineId, name, notes, entries, setName, setNotes, removeEntry, updateEntry, reorder } =
    useRoutineEditorStore();
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = (): string | null => {
    if (!name.trim()) {
      return 'Name is required';
    }
    if (entries.length === 0) {
      return 'Add at least one exercise';
    }
    for (const entry of entries) {
      if (entry.targetSets < 1 || entry.targetSets > 20) {
        return `${entry.exerciseName}: sets must be 1–20`;
      }
      if (
        entry.targetRepsMin < 1 ||
        entry.targetRepsMax < 1 ||
        entry.targetRepsMin > 100 ||
        entry.targetRepsMax > 100
      ) {
        return `${entry.exerciseName}: reps must be 1–100`;
      }
      if (entry.targetRepsMin > entry.targetRepsMax) {
        return `${entry.exerciseName}: rep min exceeds rep max`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        notes: notes.trim() || null,
        entries: entries.map((entry) => ({
          exerciseId: entry.exerciseId,
          targetSets: entry.targetSets,
          targetRepsMin: entry.targetRepsMin,
          targetRepsMax: entry.targetRepsMax,
        })),
      };
      if (routineId) {
        await updateRoutine(routineId, input);
      } else {
        const user = await getOrCreateLocalUser();
        await createRoutine(user.id, input);
      }
      useRoutineEditorStore.getState().reset();
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!routineId) {
      return;
    }
    Alert.alert(
      'Delete routine',
      `Delete "${name}"? It stays in history but disappears from lists.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void softDeleteRoutine(routineId).then(() => {
              useRoutineEditorStore.getState().reset();
              router.back();
            });
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.void }} edges={['top', 'bottom']}>
      <ScrollView
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: Spacing[4], gap: Spacing[5] }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Button label="‹ Back" variant="ghost" onPress={() => router.back()} />
        </View>

        <LabeledInput
          label="Routine name"
          value={name}
          onChangeText={setName}
          placeholder="Push Day"
        />
        <LabeledInput
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Starter · PPL · 6 days/week"
        />

        <View style={{ gap: Spacing[2] }}>
          <SectionLabel>Exercises</SectionLabel>
          <View style={{ borderWidth: 2, borderColor: colors.edge }}>
            <ReorderableList
              items={entries}
              keyOf={(entry: RoutineEntryDraft) => entry.exerciseId}
              rowHeight={ROW_HEIGHT}
              onReorder={reorder}
              onDragStateChange={setScrollEnabled}
              emptyMessage="No exercises yet — add the first one below."
              renderRow={(entry) => (
                <View style={{ flex: 1, paddingVertical: Spacing[1], gap: Spacing[1] }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                    <Text
                      variant="body"
                      numberOfLines={1}
                      style={{ flex: 1, fontFamily: FontFamily.ui }}
                    >
                      {entry.exerciseName}
                    </Text>
                    <Pressable
                      onPress={() => removeEntry(entry.exerciseId)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${entry.exerciseName}`}
                      hitSlop={12}
                      style={{ paddingHorizontal: Spacing[2], paddingVertical: Spacing[1] }}
                    >
                      <Text variant="label" color="faint">
                        ×
                      </Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
                    <NumericField
                      value={entry.targetSets}
                      onChange={(v) => updateEntry(entry.exerciseId, { targetSets: v })}
                      accessibilityLabel={`${entry.exerciseName} target sets`}
                      max={20}
                    />
                    <Text variant="label" color="faint">
                      ×
                    </Text>
                    <NumericField
                      value={entry.targetRepsMin}
                      onChange={(v) => updateEntry(entry.exerciseId, { targetRepsMin: v })}
                      accessibilityLabel={`${entry.exerciseName} minimum reps`}
                    />
                    <Text variant="label" color="faint">
                      –
                    </Text>
                    <NumericField
                      value={entry.targetRepsMax}
                      onChange={(v) => updateEntry(entry.exerciseId, { targetRepsMax: v })}
                      accessibilityLabel={`${entry.exerciseName} maximum reps`}
                    />
                    <Text variant="label" color="faint">
                      reps
                    </Text>
                  </View>
                </View>
              )}
            />
          </View>
          <Button
            label="+ Add exercise"
            variant="secondary"
            onPress={() => router.push('/routine/pick')}
          />
        </View>

        {error ? (
          <Text variant="label" color="pr">
            {error}
          </Text>
        ) : null}

        <Button
          label={saving ? 'Saving…' : 'Save routine'}
          onPress={() => void handleSave()}
          disabled={saving}
        />

        {isExisting && routineId ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] }}>
            <Button
              label="Duplicate"
              variant="secondary"
              onPress={() => {
                void duplicateRoutine(routineId).then(() => {
                  useRoutineEditorStore.getState().reset();
                  router.back();
                });
              }}
            />
            <Button label="Delete" variant="ghost" onPress={confirmDelete} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
