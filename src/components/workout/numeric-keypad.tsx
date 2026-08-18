import { Pressable, Text as RNText, View } from 'react-native';

import { Text } from '@/components/text';
import type { Units } from '@/db/schema';
import { colors, FontFamily } from '@/theme';

/**
 * In-app numeric keypad (DESIGN §8 "Keypad"): digits, decimal, backspace,
 * unit-aware ±2.5/±5 increments, Next/Done. Pinned to the bottom third —
 * replaces the system keyboard for set fields. Log register: flat, 2dp
 * borders, 56dp keys, zero radius.
 */
export interface NumericKeypadProps {
  /** Draft text in DISPLAY units — the keypad edits the string, the host commits. */
  draft: string;
  onDraftChange: (text: string) => void;
  allowDecimal: boolean;
  units: Units;
  onNext: () => void;
  onDone: () => void;
  hasFurtherFields: boolean;
}

const KEY_HEIGHT = 56;

export function NumericKeypad({
  draft,
  onDraftChange,
  allowDecimal,
  units,
  onNext,
  onDone,
  hasFurtherFields,
}: NumericKeypadProps) {
  const pressDigit = (digit: string) => onDraftChange((draft + digit).slice(0, 8));
  const pressDecimal = () => {
    if (allowDecimal && !draft.includes('.')) {
      onDraftChange(draft.length === 0 ? '0.' : `${draft}.`);
    }
  };
  const pressBackspace = () => onDraftChange(draft.slice(0, -1));

  /** Increment operates on the draft (display units), so kg/lb is automatic. */
  const pressIncrement = (delta: number) => {
    const current = Number.parseFloat(draft.replace(',', '.'));
    const base = Number.isNaN(current) ? 0 : current;
    const next = Math.max(0, Math.round((base + delta) * 100) / 100);
    onDraftChange(String(next));
  };

  return (
    <View
      style={{ borderTopWidth: 2, borderTopColor: colors.edge, backgroundColor: colors.void }}
      accessibilityLabel="Numeric keypad"
    >
      <View style={{ flexDirection: 'row' }}>
        <DigitKey label="7" onPress={() => pressDigit('7')} />
        <DigitKey label="8" onPress={() => pressDigit('8')} />
        <DigitKey label="9" onPress={() => pressDigit('9')} />
        <IncKey label={`+5${units}`} onPress={() => pressIncrement(5)} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <DigitKey label="4" onPress={() => pressDigit('4')} />
        <DigitKey label="5" onPress={() => pressDigit('5')} />
        <DigitKey label="6" onPress={() => pressDigit('6')} />
        <IncKey label={`-5${units}`} onPress={() => pressIncrement(-5)} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <DigitKey label="1" onPress={() => pressDigit('1')} />
        <DigitKey label="2" onPress={() => pressDigit('2')} />
        <DigitKey label="3" onPress={() => pressDigit('3')} />
        <IncKey label={`+2.5${units}`} onPress={() => pressIncrement(2.5)} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        <DigitKey
          label="."
          onPress={pressDecimal}
          disabled={!allowDecimal}
          accessibilityLabel="Decimal point"
        />
        <DigitKey label="0" onPress={() => pressDigit('0')} />
        <DigitKey label="⌫" onPress={pressBackspace} accessibilityLabel="Backspace" />
        <IncKey label={`-2.5${units}`} onPress={() => pressIncrement(-2.5)} />
      </View>
      <View style={{ flexDirection: 'row' }}>
        {hasFurtherFields ? <WideKey label="Next →" onPress={onNext} kind="secondary" /> : null}
        <WideKey label="Done" onPress={onDone} kind="primary" />
      </View>
    </View>
  );
}

function DigitKey({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => ({
        flex: 1,
        height: KEY_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.edge,
        backgroundColor: pressed ? colors.rule : colors.panel,
        opacity: disabled ? 0.3 : 1,
      })}
    >
      <RNText
        style={{
          color: colors.ink,
          fontFamily: FontFamily.data,
          fontVariant: ['tabular-nums'],
          fontSize: 19,
        }}
      >
        {label}
      </RNText>
    </Pressable>
  );
}

function IncKey({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        height: KEY_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.edge,
        backgroundColor: pressed ? colors.rule : 'transparent',
      })}
    >
      <Text variant="micro" color="coin">
        {label}
      </Text>
    </Pressable>
  );
}

function WideKey({
  label,
  onPress,
  kind,
}: {
  label: string;
  onPress: () => void;
  kind: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        height: KEY_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.edge,
        backgroundColor:
          kind === 'primary'
            ? pressed
              ? colors.rule
              : colors.coin
            : pressed
              ? colors.panel
              : 'transparent',
      })}
    >
      <Text
        variant="label"
        color={kind === 'primary' ? 'void' : 'ink'}
        style={{ fontFamily: FontFamily.uiBold, textTransform: 'uppercase' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
