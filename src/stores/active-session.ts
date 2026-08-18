import { create } from 'zustand';

import {
  type ActiveExerciseData,
  type ActiveSessionData,
  addExerciseToSession,
  addSetRow,
  discardSession,
  finishSession,
  getActiveSession,
  getPreviousPerformance,
  getRoutineStartSpecs,
  logSetCompletion,
  reorderSessionExercises,
  softDeleteExerciseFromSession,
  softDeleteSetRow,
  startSession,
} from '@/db/repositories/sessions';
import { getOrCreateLocalUser } from '@/db/repositories/users';
import type { Exercise } from '@/db/schema';

import { onSetCompleted } from '@/session/on-set-completed';

/**
 * The active workout session. UI state is the source of truth while active;
 * every mutation updates this store synchronously (logging NEVER blocks)
 * and fires the database write behind an ordered queue in the repository.
 */

export interface ActiveSet extends Omit<ActiveExerciseData['sets'][number], 'weightKg' | 'reps'> {
  weightText: string;
  repsText: string;
}

export interface ActiveExercise extends Omit<ActiveExerciseData, 'sets'> {
  sets: ActiveSet[];
  /** "80 × 8, 8, 7" summary line from the previous session (display only). */
  previousSummary: string | null;
  /** Previous completed values by set index — prefill source. */
  previousByIndex: { weightKg: number; reps: number }[];
}

interface ActiveSessionState {
  sessionId: string | null;
  startedAt: number | null;
  routineId: string | null;
  routineName: string | null;
  exercises: ActiveExercise[];
  /** True once launch-time recovery check has run (active session or not). */
  recoveryChecked: boolean;
  lastFinished: {
    durationSeconds: number;
    totalVolumeKg: number;
    completedSetCount: number;
  } | null;

  recoverOnLaunch: () => Promise<void>;
  startFromRoutine: (routineId: string) => Promise<void>;
  startEmpty: () => Promise<void>;
  completeSet: (sessionExerciseId: string, setId: string) => void;
  setWeightText: (setId: string, text: string) => void;
  setRepsText: (setId: string, text: string) => void;
  addSet: (sessionExerciseId: string) => void;
  removeSet: (sessionExerciseId: string, setId: string) => void;
  removeExercise: (sessionExerciseId: string) => void;
  moveExercise: (from: number, to: number) => void;
  addExercise: (exercise: Exercise) => Promise<void>;
  finish: () => Promise<void>;
  discard: () => Promise<void>;
  clearLocal: () => void;
}

const weightToText = (kg: number | null): string =>
  kg === null ? '' : String(Number.isInteger(kg) ? kg : Math.round(kg * 100) / 100);

const parsePositive = (text: string): number | null => {
  const value = Number.parseFloat(text.replace(',', '.'));
  if (Number.isNaN(value) || value <= 0) {
    return null;
  }
  return value;
};

const summarisePrevious = (byIndex: { weightKg: number; reps: number }[]): string | null => {
  if (byIndex.length === 0) {
    return null;
  }
  return `LAST · ${byIndex.map((set) => `${weightToText(set.weightKg)} × ${set.reps}`).join(', ')}`;
};

const INITIAL_SETS_FOR_NEW_EXERCISE = 3;

export const useActiveSessionStore = create<ActiveSessionState>()((set, get) => ({
  sessionId: null,
  startedAt: null,
  routineId: null,
  routineName: null,
  exercises: [],
  recoveryChecked: false,
  lastFinished: null,

  recoverOnLaunch: async () => {
    if (get().recoveryChecked) {
      return;
    }
    set({ recoveryChecked: true });
    try {
      const user = await getOrCreateLocalUser();
      const active = await getActiveSession(user.id);
      if (active) {
        set(stateFromActiveData(active, null));
      }
    } catch {
      // Recovery is best-effort; a failure here must never block the app.
    }
  },

  startFromRoutine: async (routineId) => {
    const user = await getOrCreateLocalUser();
    const specs = await getRoutineStartSpecs(routineId);
    if (!specs) {
      throw new Error('Routine is empty or missing');
    }
    const previous = await Promise.all(
      specs.exercises.map((spec) => getPreviousPerformance(user.id, spec.exerciseId)),
    );
    const data = await startSession(user.id, {
      routineId,
      routineName: specs.routineName,
      exercises: specs.exercises,
    });
    set(stateFromActiveData(data, previous));
  },

  startEmpty: async () => {
    const user = await getOrCreateLocalUser();
    const data = await startSession(user.id, { exercises: [] });
    set(stateFromActiveData(data, []));
  },

  completeSet: (sessionExerciseId, setId) => {
    const state = get();
    const exercise = state.exercises.find((e) => e.sessionExerciseId === sessionExerciseId);
    const target = exercise?.sets.find((s) => s.setId === setId);
    if (!exercise || !target) {
      return;
    }
    const weightKg = parsePositive(target.weightText);
    const reps = parsePositive(target.repsText);
    if (weightKg === null || reps === null) {
      return; // Invalid/empty values: the row component keeps focus instead.
    }
    set({
      exercises: state.exercises.map((e) =>
        e.sessionExerciseId !== sessionExerciseId
          ? e
          : {
              ...e,
              sets: e.sets.map((s) => (s.setId === setId ? { ...s, isCompleted: true } : s)),
            },
      ),
    });
    logSetCompletion(setId, { weightKg, reps, setType: target.setType });
    // Hook for the rest timer (later phase): completion is the trigger.
    onSetCompleted({
      exerciseName: exercise.exerciseName,
      weightKg,
      reps,
      completedAt: Date.now(),
    });
  },

  setWeightText: (setId, text) =>
    set((state) => ({
      exercises: state.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((s) => (s.setId === setId ? { ...s, weightText: text } : s)),
      })),
    })),

  setRepsText: (setId, text) =>
    set((state) => ({
      exercises: state.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((s) => (s.setId === setId ? { ...s, repsText: text } : s)),
      })),
    })),

  addSet: (sessionExerciseId) => {
    const state = get();
    const exercise = state.exercises.find((e) => e.sessionExerciseId === sessionExerciseId);
    if (!exercise) {
      return;
    }
    const setIndex = exercise.sets.length;
    const previous = exercise.previousByIndex;
    const within = previous[setIndex] ?? previous[previous.length - 1] ?? null;
    const setId = addSetRow(sessionExerciseId, setIndex, {
      weightKg: within?.weightKg ?? null,
      reps: within?.reps ?? null,
    });
    set({
      exercises: state.exercises.map((e) =>
        e.sessionExerciseId !== sessionExerciseId
          ? e
          : {
              ...e,
              sets: [
                ...e.sets,
                {
                  setId,
                  setIndex,
                  weightText: weightToText(within?.weightKg ?? null),
                  repsText:
                    within?.reps === null || within?.reps === undefined ? '' : String(within.reps),
                  setType: 'working' as const,
                  isCompleted: false,
                },
              ],
            },
      ),
    });
  },

  removeSet: (sessionExerciseId, setId) => {
    const state = get();
    const exercise = state.exercises.find((e) => e.sessionExerciseId === sessionExerciseId);
    if (!exercise) {
      return;
    }
    softDeleteSetRow(setId);
    const remaining = exercise.sets
      .filter((s) => s.setId !== setId)
      .map((s, index) => ({ ...s, setIndex: index }));
    set({
      exercises: state.exercises.map((e) =>
        e.sessionExerciseId !== sessionExerciseId ? e : { ...e, sets: remaining },
      ),
    });
  },

  removeExercise: (sessionExerciseId) => {
    const state = get();
    softDeleteExerciseFromSession(sessionExerciseId);
    set({ exercises: state.exercises.filter((e) => e.sessionExerciseId !== sessionExerciseId) });
  },

  moveExercise: (from, to) => {
    const state = get();
    const { exercises } = state;
    if (from === to || from < 0 || to < 0 || from >= exercises.length || to >= exercises.length) {
      return;
    }
    const next = [...exercises];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const reindexed = next.map((exercise, index) => ({ ...exercise, orderIndex: index }));
    set({ exercises: reindexed });
    reorderSessionExercises(reindexed.map((exercise) => exercise.sessionExerciseId));
  },

  addExercise: async (exercise) => {
    const state = get();
    if (!state.sessionId) {
      return;
    }
    if (state.exercises.some((e) => e.exerciseId === exercise.id)) {
      return;
    }
    const user = await getOrCreateLocalUser();
    const previous = await getPreviousPerformance(user.id, exercise.id);
    const orderIndex = state.exercises.length;
    const sessionExerciseId = addExerciseToSession(state.sessionId, exercise.id, orderIndex, []);
    const sets = Array.from({ length: INITIAL_SETS_FOR_NEW_EXERCISE }, (_, setIndex) => {
      const within =
        previous.byIndex[setIndex] ?? previous.byIndex[previous.byIndex.length - 1] ?? null;
      const setId = addSetRow(sessionExerciseId, setIndex, {
        weightKg: within?.weightKg ?? null,
        reps: within?.reps ?? null,
      });
      return {
        setId,
        setIndex,
        weightText: weightToText(within?.weightKg ?? null),
        repsText: within?.reps === null || within?.reps === undefined ? '' : String(within.reps),
        setType: 'working' as const,
        isCompleted: false,
      };
    });
    set({
      exercises: [
        ...state.exercises,
        {
          sessionExerciseId,
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          orderIndex,
          sets,
          previousSummary: summarisePrevious(previous.byIndex),
          previousByIndex: previous.byIndex,
        },
      ],
    });
  },

  finish: async () => {
    const state = get();
    if (!state.sessionId) {
      return;
    }
    const summary = await finishSession(state.sessionId);
    set({
      sessionId: null,
      startedAt: null,
      routineId: null,
      routineName: null,
      exercises: [],
      lastFinished: summary
        ? {
            durationSeconds: summary.durationSeconds,
            totalVolumeKg: summary.totalVolumeKg,
            completedSetCount: summary.completedSetCount,
          }
        : null,
    });
  },

  discard: async () => {
    const state = get();
    if (!state.sessionId) {
      return;
    }
    await discardSession(state.sessionId);
    set({
      sessionId: null,
      startedAt: null,
      routineId: null,
      routineName: null,
      exercises: [],
      lastFinished: null,
    });
  },

  clearLocal: () =>
    set({
      sessionId: null,
      startedAt: null,
      routineId: null,
      routineName: null,
      exercises: [],
    }),
}));

function stateFromActiveData(
  data: ActiveSessionData,
  previousList: { byIndex: { weightKg: number; reps: number }[] }[] | null,
): Partial<ActiveSessionState> {
  return {
    sessionId: data.sessionId,
    startedAt: data.startedAt,
    routineId: data.routineId,
    routineName: data.routineName,
    exercises: data.exercises.map((exercise, index) => {
      const previous =
        previousList?.[index]?.byIndex ??
        // Recovery path: rebuild the prefill source from the session itself.
        exercise.sets
          .filter((s) => s.isCompleted)
          .map((s) => ({ weightKg: s.weightKg ?? 0, reps: s.reps ?? 0 }));
      return {
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          weightText: weightToText(set.weightKg),
          repsText: set.reps === null ? '' : String(set.reps),
        })),
        previousSummary: summarisePrevious(previous),
        previousByIndex: previous,
      };
    }),
    lastFinished: null,
  };
}
