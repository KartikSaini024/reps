import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/button';
import { ChipSelect } from '@/components/exercises/chip-select';
import { LabeledInput } from '@/components/labeled-input';
import { Text } from '@/components/text';
import { TRAINING_DEFAULTS } from '@/config/training-defaults';
import type { ExerciseInput } from '@/db/repositories/exercises';
import {
  DIFFICULTIES,
  type Difficulty,
  EQUIPMENT_TYPES,
  type Equipment,
  type Exercise,
  FORCE_DIRECTIONS,
  type ForceDirection,
  MECHANICS,
  type Mechanic,
  MUSCLE_GROUPS,
  type MuscleGroup,
} from '@/db/schema';
import { Spacing } from '@/theme';

export interface ExerciseFormProps {
  initial?: Exercise;
  submitLabel: string;
  onSubmit: (input: ExerciseInput) => Promise<void>;
}

function toInput(exercise?: Exercise): FormState {
  if (!exercise) {
    return {
      name: '',
      aliases: '',
      primaryMuscle: [],
      secondaryMuscles: [],
      equipment: [],
      mechanic: [],
      force: [],
      difficulty: [],
      defaultRestSeconds: '',
      instructions: '',
      cues: '',
      commonMistakes: '',
    };
  }
  return {
    name: exercise.name,
    aliases: exercise.aliases.join(', '),
    primaryMuscle: [exercise.primaryMuscle],
    secondaryMuscles: [...exercise.secondaryMuscles],
    equipment: [exercise.equipment],
    mechanic: [exercise.mechanic],
    force: [exercise.force],
    difficulty: [exercise.difficulty],
    defaultRestSeconds: String(exercise.defaultRestSeconds),
    instructions: exercise.instructions,
    cues: exercise.cues.join('\n'),
    commonMistakes: exercise.commonMistakes.join('\n'),
  };
}

interface FormState {
  name: string;
  aliases: string;
  primaryMuscle: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  mechanic: Mechanic[];
  force: ForceDirection[];
  difficulty: Difficulty[];
  defaultRestSeconds: string;
  instructions: string;
  cues: string;
  commonMistakes: string;
}

const parseLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

/**
 * Create/edit form for custom exercises. Log register: flat inputs, chip
 * pickers, no chrome beyond the component library.
 */
export function ExerciseForm({ initial, submitLabel, onSubmit }: ExerciseFormProps) {
  const [form, setForm] = useState<FormState>(() => toInput(initial));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): string | null => {
    if (!form.name.trim()) {
      return 'Name is required';
    }
    if (form.primaryMuscle.length !== 1) {
      return 'Pick one primary muscle';
    }
    if (form.equipment.length !== 1) {
      return 'Pick one equipment type';
    }
    if (form.mechanic.length !== 1) {
      return 'Pick a mechanic';
    }
    if (form.force.length !== 1) {
      return 'Pick a force direction';
    }
    if (form.difficulty.length !== 1) {
      return 'Pick a difficulty';
    }
    const rest = Number.parseInt(form.defaultRestSeconds, 10);
    if (Number.isNaN(rest) || rest <= 0 || rest > 900) {
      return 'Default rest must be 1–900 seconds';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        aliases: form.aliases
          .split(',')
          .map((a) => a.trim())
          .filter((a) => a.length > 0),
        primaryMuscle: form.primaryMuscle[0],
        secondaryMuscles: form.secondaryMuscles,
        equipment: form.equipment[0],
        mechanic: form.mechanic[0],
        force: form.force[0],
        difficulty: form.difficulty[0],
        defaultRestSeconds: Number.parseInt(form.defaultRestSeconds, 10),
        instructions: form.instructions.trim() || 'No instructions yet.',
        cues: parseLines(form.cues),
        commonMistakes: parseLines(form.commonMistakes),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ gap: Spacing[5] }}>
      <LabeledInput label="Name" value={form.name} onChangeText={(v) => set('name', v)} />
      <LabeledInput
        label="Aliases (comma-separated)"
        value={form.aliases}
        onChangeText={(v) => set('aliases', v)}
        placeholder="OHP, Military Press"
      />
      <ChipSelect
        label="Primary muscle"
        options={MUSCLE_GROUPS}
        selected={form.primaryMuscle}
        onSelect={(v) => set('primaryMuscle', [...v])}
      />
      <ChipSelect
        label="Secondary muscles"
        options={MUSCLE_GROUPS}
        selected={form.secondaryMuscles}
        multiselect
        onSelect={(v) => set('secondaryMuscles', [...v])}
      />
      <ChipSelect
        label="Equipment"
        options={EQUIPMENT_TYPES}
        selected={form.equipment}
        onSelect={(v) => set('equipment', [...v])}
      />
      <ChipSelect
        label="Mechanic"
        options={MECHANICS}
        selected={form.mechanic}
        onSelect={(v) => set('mechanic', [...v])}
      />
      <ChipSelect
        label="Force"
        options={FORCE_DIRECTIONS}
        selected={form.force}
        onSelect={(v) => set('force', [...v])}
      />
      <ChipSelect
        label="Difficulty"
        options={DIFFICULTIES}
        selected={form.difficulty}
        onSelect={(v) => set('difficulty', [...v])}
      />
      <LabeledInput
        label={`Default rest (seconds) — ${TRAINING_DEFAULTS.restSeconds.compound} compound / ${TRAINING_DEFAULTS.restSeconds.isolation} isolation`}
        value={form.defaultRestSeconds}
        onChangeText={(v) => set('defaultRestSeconds', v.replace(/[^0-9]/g, ''))}
        placeholder={String(TRAINING_DEFAULTS.restSeconds.compound)}
        numeric
      />
      <LabeledInput
        label="Instructions"
        value={form.instructions}
        onChangeText={(v) => set('instructions', v)}
        multiline
      />
      <LabeledInput
        label="Cues (one per line)"
        value={form.cues}
        onChangeText={(v) => set('cues', v)}
        multiline
      />
      <LabeledInput
        label="Common mistakes (one per line)"
        value={form.commonMistakes}
        onChangeText={(v) => set('commonMistakes', v)}
        multiline
      />

      {error ? (
        <Text variant="label" color="pr">
          {error}
        </Text>
      ) : null}

      <Button label={submitLabel} onPress={() => void handleSubmit()} disabled={submitting} />
    </View>
  );
}
