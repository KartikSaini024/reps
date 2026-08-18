import { create } from 'zustand';

import type { RoutineWithEntries } from '@/db/repositories/routines';
import type { Exercise } from '@/db/schema';

/**
 * Draft state for the routine editor. Held outside the screen so the
 * exercise picker (a separate route) can add into the draft and the editor
 * survives navigation. Zustand is the mandated client-state lib (techstack).
 */
export interface RoutineEntryDraft {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: Exercise['primaryMuscle'];
  equipment: Exercise['equipment'];
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
}

interface RoutineEditorState {
  routineId: string | null;
  name: string;
  notes: string;
  entries: RoutineEntryDraft[];
  hydrateNew: () => void;
  hydrateFrom: (routine: RoutineWithEntries) => void;
  setName: (name: string) => void;
  setNotes: (notes: string) => void;
  addExercise: (exercise: Exercise) => void;
  removeEntry: (exerciseId: string) => void;
  updateEntry: (
    exerciseId: string,
    patch: Partial<Pick<RoutineEntryDraft, 'targetSets' | 'targetRepsMin' | 'targetRepsMax'>>,
  ) => void;
  reorder: (from: number, to: number) => void;
  reset: () => void;
}

const DEFAULT_TARGETS = { targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 };

export const useRoutineEditorStore = create<RoutineEditorState>()((set) => ({
  routineId: null,
  name: '',
  notes: '',
  entries: [],

  hydrateNew: () => set({ routineId: null, name: '', notes: '', entries: [] }),

  hydrateFrom: ({ routine, entries }) =>
    set({
      routineId: routine.id,
      name: routine.name,
      notes: routine.notes ?? '',
      entries: entries.map((entry) => ({
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        primaryMuscle: entry.primaryMuscle,
        equipment: entry.equipment,
        targetSets: entry.targetSets,
        targetRepsMin: entry.targetRepsMin ?? DEFAULT_TARGETS.targetRepsMin,
        targetRepsMax: entry.targetRepsMax ?? DEFAULT_TARGETS.targetRepsMax,
      })),
    }),

  setName: (name) => set({ name }),
  setNotes: (notes) => set({ notes }),

  addExercise: (exercise) =>
    set((state) => {
      if (state.entries.some((entry) => entry.exerciseId === exercise.id)) {
        return state;
      }
      return {
        entries: [
          ...state.entries,
          {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            primaryMuscle: exercise.primaryMuscle,
            equipment: exercise.equipment,
            ...DEFAULT_TARGETS,
          },
        ],
      };
    }),

  removeEntry: (exerciseId) =>
    set((state) => ({
      entries: state.entries.filter((entry) => entry.exerciseId !== exerciseId),
    })),

  updateEntry: (exerciseId, patch) =>
    set((state) => ({
      entries: state.entries.map((entry) =>
        entry.exerciseId === exerciseId ? { ...entry, ...patch } : entry,
      ),
    })),

  reorder: (from, to) =>
    set((state) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= state.entries.length ||
        to >= state.entries.length
      ) {
        return state;
      }
      const next = [...state.entries];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { entries: next };
    }),

  reset: () => set({ routineId: null, name: '', notes: '', entries: [] }),
}));
