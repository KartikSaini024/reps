import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { SetRow } from '@/components/workout/set-row';
import type { ActiveExercise } from '@/stores/active-session';
import { colors, FontFamily, Spacing } from '@/theme';

export interface ExerciseSectionProps {
  exercise: ActiveExercise;
  position: number;
  exerciseCount: number;
  onCompleteSet: (setId: string) => void;
  onWeightChange: (setId: string, text: string) => void;
  onRepsChange: (setId: string, text: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemoveExercise: () => void;
}

/**
 * One exercise block in the active workout (DESIGN §9.1): name, previous
 * performance line (always visible), set table, add-set. Reorder/remove
 * controls in the header — quiet, 56dp.
 */
export function ExerciseSection({
  exercise,
  position,
  exerciseCount,
  onCompleteSet,
  onWeightChange,
  onRepsChange,
  onAddSet,
  onRemoveSet,
  onMoveUp,
  onMoveDown,
  onRemoveExercise,
}: ExerciseSectionProps) {
  const firstUncompleted = exercise.sets.findIndex((set) => !set.isCompleted);

  return (
    <View style={{ borderWidth: 2, borderColor: colors.edge, backgroundColor: colors.panel }}>
      <View style={{ padding: Spacing[3], gap: Spacing[1] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
          <Text variant="body" numberOfLines={1} style={{ flex: 1, fontFamily: FontFamily.uiBold }}>
            {exercise.exerciseName}
          </Text>
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
          {exercise.previousSummary ?? 'first time — no history yet'}
        </Text>
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
        <HeaderCell label="SET" width={40} />
        <HeaderCell label="PREV" flex />
        <HeaderCell label="KG" width={88} />
        <HeaderCell label="REPS" width={64} />
        <HeaderCell label="✓" width={56} />
      </View>

      {exercise.sets.map((set) => {
        const previous = exercise.previousByIndex[set.setIndex];
        return (
          <SetRow
            key={set.setId}
            set={set}
            previousLabel={previous ? `${previous.weightKg}×${previous.reps}` : null}
            state={
              set.isCompleted
                ? 'done'
                : exercise.sets.indexOf(set) === firstUncompleted
                  ? 'active'
                  : 'pending'
            }
            onComplete={() => onCompleteSet(set.setId)}
            onWeightChange={(text) => onWeightChange(set.setId, text)}
            onRepsChange={(text) => onRepsChange(set.setId, text)}
            onRemove={() => onRemoveSet(set.setId)}
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
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  disabled?: boolean;
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
      <Text variant="label" color={glyph === '✕' ? 'pr' : 'faint'}>
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
