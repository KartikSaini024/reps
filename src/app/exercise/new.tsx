import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseForm } from '@/components/exercises/exercise-form';
import { SectionLabel } from '@/components/exercises/section-label';
import { createCustomExercise } from '@/db/repositories/exercises';
import { colors, Spacing } from '@/theme';

/** Create a custom exercise (PRD B6). Log register. */
export default function NewExercise() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.void }} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing[4], gap: Spacing[5] }}
        keyboardShouldPersistTaps="handled"
      >
        <SectionLabel>New exercise</SectionLabel>
        <ExerciseForm
          submitLabel="Create"
          onSubmit={async (input) => {
            const created = await createCustomExercise(input);
            router.replace(`/exercise/${created.id}`);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
