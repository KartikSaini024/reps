import { type RefObject, useRef, useState } from 'react';
import { Pressable, Text as RNText, TextInput, View } from 'react-native';

import { Text } from '@/components/text';
import type { ActiveSet } from '@/stores/active-session';
import { colors, FontFamily } from '@/theme';

export interface SetRowProps {
  set: ActiveSet;
  /** "80×8" or null when there is no history for this index. */
  previousLabel: string | null;
  /** pending | active | done — active is the first uncompleted set. */
  state: 'pending' | 'active' | 'done';
  onComplete: () => void;
  onWeightChange: (text: string) => void;
  onRepsChange: (text: string) => void;
  /** Long-press the set number to remove the set. */
  onRemove: () => void;
}

const ROW_HEIGHT = 56;

/**
 * The most important component in the app (DESIGN §8): 56dp, tabular
 * numerals, three states. Completing a set is ONE tap on the checkbox.
 * Inputs are system-keyboard for now — Phase 6 swaps in the custom keypad
 * behind the same callbacks.
 */
export function SetRow({
  set,
  previousLabel,
  state,
  onComplete,
  onWeightChange,
  onRepsChange,
  onRemove,
}: SetRowProps) {
  const [focusedField, setFocusedField] = useState<'weight' | 'reps' | null>(null);
  const weightRef = useRef<TextInput>(null);
  const repsRef = useRef<TextInput>(null);

  const done = state === 'done';
  const active = state === 'active';

  const handleComplete = () => {
    const weight = Number.parseFloat(set.weightText.replace(',', '.'));
    const reps = Number.parseInt(set.repsText, 10);
    if (Number.isNaN(weight) || weight <= 0) {
      weightRef.current?.focus();
      return;
    }
    if (Number.isNaN(reps) || reps <= 0) {
      repsRef.current?.focus();
      return;
    }
    onComplete();
  };

  return (
    <View
      style={{
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 0,
        backgroundColor: active ? colors.panel : 'transparent',
        borderTopWidth: 2,
        borderTopColor: colors.rule,
      }}
    >
      {/* SET # — long-press removes the set */}
      <Pressable
        onLongPress={onRemove}
        delayLongPress={400}
        accessibilityLabel={`Set ${set.setIndex + 1}. Long-press to remove.`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{
          width: 40,
          height: ROW_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          variant="dataL"
          color={done ? 'done' : active ? 'ink' : 'faint'}
          style={{ fontSize: 15 }}
        >
          {set.setIndex + 1}
        </Text>
      </Pressable>

      {/* PREVIOUS */}
      <Text variant="micro" color="faint" style={{ flex: 1, textAlign: 'center' }}>
        {previousLabel ?? '–'}
      </Text>

      {/* WEIGHT */}
      <Field
        value={set.weightText}
        onChangeText={onWeightChange}
        editable={!done}
        focused={focusedField === 'weight'}
        keyboardType="decimal-pad"
        inputRef={weightRef}
        onFocus={() => setFocusedField('weight')}
        onBlur={() => setFocusedField(null)}
        onSubmitEditing={() => repsRef.current?.focus()}
        accessibilityLabel={`Set ${set.setIndex + 1} weight`}
        color={done ? 'done' : 'ink'}
        width={88}
      />

      {/* REPS */}
      <Field
        value={set.repsText}
        onChangeText={onRepsChange}
        editable={!done}
        focused={focusedField === 'reps'}
        keyboardType="number-pad"
        inputRef={repsRef}
        onFocus={() => setFocusedField('reps')}
        onBlur={() => setFocusedField(null)}
        onSubmitEditing={handleComplete}
        accessibilityLabel={`Set ${set.setIndex + 1} reps`}
        color={done ? 'done' : 'ink'}
        width={64}
      />

      {/* DONE CHECKBOX — 56dp, one tap completes */}
      <Pressable
        onPress={handleComplete}
        disabled={done}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`Complete set ${set.setIndex + 1}`}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        style={{
          width: ROW_HEIGHT,
          height: ROW_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderWidth: 2,
            borderColor: done ? colors.done : active ? colors.coin : colors.edge,
            backgroundColor: done ? colors.done : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {done ? (
            <RNText style={{ color: colors.void, fontSize: 20, fontWeight: '700' }}>✓</RNText>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

function Field({
  value,
  onChangeText,
  editable,
  focused,
  keyboardType,
  inputRef,
  onFocus,
  onBlur,
  onSubmitEditing,
  accessibilityLabel,
  color,
  width,
}: {
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  focused: boolean;
  keyboardType: 'decimal-pad' | 'number-pad';
  inputRef: RefObject<TextInput | null>;
  onFocus: () => void;
  onBlur: () => void;
  onSubmitEditing: () => void;
  accessibilityLabel: string;
  color: 'ink' | 'done';
  width: number;
}) {
  return (
    <View
      style={{
        width,
        height: 48,
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: focused ? colors.coin : 'transparent',
        backgroundColor: focused ? colors.void : 'transparent',
      }}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        selectTextOnFocus
        returnKeyType="next"
        onFocus={onFocus}
        onBlur={onBlur}
        onSubmitEditing={onSubmitEditing}
        accessibilityLabel={accessibilityLabel}
        style={{
          color: color === 'done' ? colors.done : colors.ink,
          fontFamily: FontFamily.data,
          fontVariant: ['tabular-nums'],
          fontSize: 17,
          padding: 0,
          textAlign: 'center',
        }}
      />
    </View>
  );
}
