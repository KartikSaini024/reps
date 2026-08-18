import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Text } from '@/components/text';
import { type KeypadField, SetRow } from '@/components/workout/set-row';
import { formatWeightKg } from '@/config/units';
import type { Units } from '@/db/schema';
import type { ActiveExercise } from '@/stores/active-session';
import { colors, FontFamily, Spacing } from '@/theme';

export interface ExerciseSectionProps {
  exercise: ActiveExercise;
  position: number;
  exerciseCount: number;
  units: Units;
  showRpe: boolean;
  activeField: { setId: string; field: KeypadField } | null;
  draft: string;
  onOpenField: (setId: string, field: KeypadField) => void;
  onCompleteSet: (setId: string) => void;
  onCycleType: (setId: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemoveExercise: () => void;
  onNoteChange: (note: string) => void;
}

/**
 * One exercise block in the active workout (DESIGN §9.1): name, previous
 * performance line (always visible, unit-converted), set table with the
 * keypad-driven SetRow, per-exercise notes (inline, never modal).
 */
export function ExerciseSection({
  exercise,
  position,
  exerciseCount,
  units,
  showRpe,
  activeField,
  draft,
  onOpenField,
  onCompleteSet,
  onCycleType,
  onAddSet,
  onRemoveSet,
  onMoveUp,
  onMoveDown,
  onRemoveExercise,
  onNoteChange,
}: ExerciseSectionProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const firstUncompleted = exercise.sets.findIndex((set) => !set.isCompleted);

  const previousSummary =
    exercise.previousByIndex.length === 0
      ? null
      : `LAST · ${exercise.previousByIndex
          .map((set) => `${formatWeightKg(set.weightKg, units)} × ${set.reps}`)
          .join(', ')}`;

  return (
    <View style={{ borderWidth: 2, borderColor: colors.edge, backgroundColor: colors.panel }}>
      <View style={{ padding: Spacing[3], gap: Spacing[1] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
          <Text variant="body" numberOfLines={1} style={{ flex: 1, fontFamily: FontFamily.uiBold }}>
            {exercise.exerciseName}
          </Text>
          <SectionButton
            label={`${exercise.exerciseName} notes`}
            glyph="✎"
            onPress={() => setNotesOpen((open) => !open)}
            active={notesOpen || exercise.notes.length > 0}
          />
          {exerciseCount > 1 ? (
            <View style={{ flexDirection: 'row' }}>
              <SectionButton
                label={`Move ${exercise.exerciseName} up`}
                glyph="▲"
                onPress={onMoveUp}
                disabled={position === 0}
              />
              <SectionButton
                label={`Move ${exercise.exerciseName} down`}
                glyph="▼"
                onPress={onMoveDown}
                disabled={position === exerciseCount - 1}
              />
            </View>
          ) : null}
          <SectionButton
            label={`Remove ${exercise.exerciseName}`}
            glyph="✕"
            onPress={onRemoveExercise}
          />
        </View>
        <Text variant="micro" color="faint" numberOfLines={1}>
          {previousSummary ?? 'first time — no history yet'}
        </Text>
        {notesOpen ? (
          <View
            style={{
              borderWidth: 2,
              borderColor: colors.edge,
              backgroundColor: colors.void,
              paddingHorizontal: Spacing[3],
            }}
          >
            <TextInput
              value={exercise.notes}
              onChangeText={onNoteChange}
              placeholder="Notes for this exercise"
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

      {/* Column header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderTopWidth: 2,
          borderTopColor: colors.rule,
          paddingVertical: Spacing[1],
        }}
      >
        <HeaderCell label="SET" width={showRpe ? 48 : 40} />
        <HeaderCell label="PREV" flex />
        <HeaderCell label={units.toUpperCase()} width={showRpe ? 76 : 88} />
        <HeaderCell label="REPS" width={showRpe ? 52 : 64} />
        {showRpe ? <HeaderCell label="RPE" width={48} /> : null}
        <HeaderCell label="✓" width={56} />
      </View>

      {exercise.sets.map((set, index) => {
        const previous = exercise.previousByIndex[set.setIndex];
        return (
          <SetRow
            key={set.setId}
            set={set}
            previousLabel={
              previous ? `${formatWeightKg(previous.weightKg, units)}×${previous.reps}` : null
            }
            state={set.isCompleted ? 'done' : index === firstUncompleted ? 'active' : 'pending'}
            units={units}
            showRpe={showRpe}
            activeField={activeField}
            draft={draft}
            onOpenField={onOpenField}
            onComplete={onCompleteSet}
            onCycleType={onCycleType}
            onRemove={onRemoveSet}
          />
        );
      })}

      <Pressable
        onPress={onAddSet}
        accessibilityRole="button"
        accessibilityLabel={`Add set to ${exercise.exerciseName}`}
        style={({ pressed }) => ({
          height: 56,
          borderTopWidth: 2,
          borderTopColor: colors.rule,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.rule : 'transparent',
        })}
      >
        <Text variant="label" color="faint">
          + Add set
        </Text>
      </Pressable>
    </View>
  );
}

function SectionButton({
  label,
  glyph,
  onPress,
  disabled = false,
  active = false,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      <Text variant="label" color={glyph === '✕' ? 'pr' : active ? 'coin' : 'faint'}>
        {glyph}
      </Text>
    </Pressable>
  );
}

function HeaderCell({
  label,
  width,
  flex = false,
}: {
  label: string;
  width?: number;
  flex?: boolean;
}) {
  return (
    <Text
      variant="micro"
      color="faint"
      style={{
        width,
        flex: flex ? 1 : undefined,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 1,
      }}
    >
      {label}
    </Text>
  );
}
