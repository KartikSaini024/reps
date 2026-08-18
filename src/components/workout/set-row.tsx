import { Pressable, Text as RNText, View } from 'react-native';

import { Text } from '@/components/text';
import { formatWeightKg } from '@/config/units';
import type { Units } from '@/db/schema';
import type { ActiveSet } from '@/stores/active-session';
import { colors, FontFamily } from '@/theme';

export type KeypadField = 'weight' | 'reps' | 'rpe';

export interface SetRowProps {
  set: ActiveSet;
  /** Display-unit text for the previous session's same index ("80×8"). */
  previousLabel: string | null;
  /** pending | active | done — active is the first uncompleted set. */
  state: 'pending' | 'active' | 'done';
  units: Units;
  showRpe: boolean;
  /** Which field the keypad is editing (this row's?), plus the live draft. */
  activeField: { setId: string; field: KeypadField } | null;
  draft: string;
  onOpenField: (setId: string, field: KeypadField) => void;
  onComplete: (setId: string) => void;
  onCycleType: (setId: string) => void;
  onRemove: (setId: string) => void;
}

const ROW_HEIGHT = 56;

/** Per-type badge: letter + token colour. Working shows the plain number. */
const TYPE_BADGE: Record<
  ActiveSet['setType'],
  { label: string | null; color: 'data' | 'coin' | 'pr' | 'done' }
> = {
  working: { label: null, color: 'data' },
  warmup: { label: 'WU', color: 'data' },
  drop: { label: 'D', color: 'coin' },
  failure: { label: 'F', color: 'pr' },
  amrap: { label: 'A', color: 'done' },
};

/**
 * The most important component in the app (DESIGN §8): 56dp, tabular
 * numerals, three states. Fields open the custom keypad (never the system
 * keyboard); tap the set number to cycle set type; long-press it to remove.
 * Warm-up sets are excluded from volume/set-count/e1RM upstream.
 */
export function SetRow({
  set,
  previousLabel,
  state,
  units,
  showRpe,
  activeField,
  draft,
  onOpenField,
  onComplete,
  onCycleType,
  onRemove,
}: SetRowProps) {
  const done = state === 'done';
  const active = state === 'active';
  const badge = TYPE_BADGE[set.setType];

  const weightDisplay =
    activeField?.setId === set.setId && activeField.field === 'weight'
      ? draft
      : set.weightKg === null
        ? ''
        : formatWeightKg(set.weightKg, units);
  const repsDisplay =
    activeField?.setId === set.setId && activeField.field === 'reps'
      ? draft
      : set.reps === null
        ? ''
        : String(set.reps);
  const rpeDisplay =
    activeField?.setId === set.setId && activeField.field === 'rpe'
      ? draft
      : set.rpe === null
        ? ''
        : String(set.rpe);

  return (
    <View
      style={{
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: active ? colors.panel : 'transparent',
        borderTopWidth: 2,
        borderTopColor: colors.rule,
      }}
    >
      {/* SET # — tap cycles type, long-press removes */}
      <Pressable
        onPress={() => onCycleType(set.setId)}
        onLongPress={() => onRemove(set.setId)}
        delayLongPress={400}
        accessibilityLabel={`Set ${set.setIndex + 1}, type ${set.setType}. Tap to change type, long-press to remove.`}
        accessibilityRole="button"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{
          width: showRpe ? 48 : 40,
          height: ROW_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {badge.label ? (
          <Text variant="micro" color={badge.color} style={{ fontFamily: FontFamily.uiBold }}>
            {badge.label}
          </Text>
        ) : (
          <Text
            variant="dataL"
            color={done ? 'done' : active ? 'ink' : 'faint'}
            style={{ fontSize: 15 }}
          >
            {set.setIndex + 1}
          </Text>
        )}
      </Pressable>

      {/* PREVIOUS */}
      <Text
        variant="micro"
        color="faint"
        style={{ flex: 1, textAlign: 'center' }}
        numberOfLines={1}
      >
        {previousLabel ?? '–'}
      </Text>

      {/* WEIGHT — opens keypad */}
      <ValueCell
        text={weightDisplay}
        placeholder="–"
        focused={activeField?.setId === set.setId && activeField.field === 'weight'}
        done={done}
        width={showRpe ? 76 : 88}
        onPress={() => onOpenField(set.setId, 'weight')}
        accessibilityLabel={`Set ${set.setIndex + 1} weight, ${weightDisplay}`}
      />

      {/* REPS — opens keypad */}
      <ValueCell
        text={repsDisplay}
        placeholder="–"
        focused={activeField?.setId === set.setId && activeField.field === 'reps'}
        done={done}
        width={showRpe ? 52 : 64}
        onPress={() => onOpenField(set.setId, 'reps')}
        accessibilityLabel={`Set ${set.setIndex + 1} reps, ${repsDisplay}`}
      />

      {/* RPE — only when enabled in settings (PRD D5) */}
      {showRpe ? (
        <ValueCell
          text={rpeDisplay}
          placeholder="–"
          focused={activeField?.setId === set.setId && activeField.field === 'rpe'}
          done={done}
          width={48}
          onPress={() => onOpenField(set.setId, 'rpe')}
          accessibilityLabel={`Set ${set.setIndex + 1} RPE, ${rpeDisplay || 'not set'}`}
        />
      ) : null}

      {/* DONE CHECKBOX — one tap completes */}
      <Pressable
        onPress={() => onComplete(set.setId)}
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

function ValueCell({
  text,
  placeholder,
  focused,
  done,
  width,
  onPress,
  accessibilityLabel,
}: {
  text: string;
  placeholder: string;
  focused: boolean;
  done: boolean;
  width: number;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        width,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: focused ? colors.coin : 'transparent',
        backgroundColor: focused ? colors.void : 'transparent',
      }}
    >
      <RNText
        style={{
          color: done ? colors.done : text.length > 0 ? colors.ink : colors.faint,
          fontFamily: FontFamily.data,
          fontVariant: ['tabular-nums'],
          fontSize: 17,
        }}
      >
        {text.length > 0 ? text : placeholder}
      </RNText>
    </Pressable>
  );
}
