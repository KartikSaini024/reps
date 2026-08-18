import { create } from 'zustand';

import {
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
  updateExerciseNote,
  updateSessionNote,
  updateSetRpe,
  updateSetType,
  updateSetValues,
} from '@/db/repositories/sessions';
import { getOrCreateLocalUser } from '@/db/repositories/users';
import type { Exercise, SetType } from '@/db/schema';

import { onSetCompleted } from '@/session/on-set-completed';

/**
 * The active workout session. UI state is the source of truth while active;
 * every mutation updates this store synchronously (logging NEVER blocks)
 * and fires the database write behind an ordered queue in the repository.
 *
 * Weights are canonical kilograms (never converted here — display-layer
 * conversion only). Set types cycle working → warm-up → drop → failure →
 * AMRAP; warm-up sets are excluded from volume/set-count/e1RM.
 */

export interface ActiveSet {
  setId: string;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  setType: SetType;
  isCompleted: boolean;
}

export interface ActiveExercise {
  sessionExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  notes: string;
  sets: ActiveSet[];
  /** Previous completed values by set index — prefill source (canonical kg). */
  previousByIndex: { weightKg: number; reps: number }[];
}

export const SET_TYPE_CYCLE: readonly SetType[] = ['working', 'warmup', 'drop', 'failure', 'amrap'];

interface ActiveSessionState {
  sessionId: string | null;
  startedAt: number | null;
  routineId: string | null;
  routineName: string | null;
  sessionNote: string;
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
  setWeight: (setId: string, weightKg: number | null) => void;
  setReps: (setId: string, reps: number | null) => void;
  setRpe: (setId: string, rpe: number | null) => void;
  cycleSetType: (setId: string) => void;
  setSessionNote: (note: string) => void;
  setExerciseNote: (sessionExerciseId: string, note: string) => void;
  addSet: (sessionExerciseId: string) => void;
  removeSet: (sessionExerciseId: string, setId: string) => void;
  removeExercise: (sessionExerciseId: string) => void;
  moveExercise: (from: number, to: number) => void;
  addExercise: (exercise: Exercise) => Promise<void>;
  finish: () => Promise<void>;
  discard: () => Promise<void>;
  clearLocal: () => void;
}

const INITIAL_SETS_FOR_NEW_EXERCISE = 3;
const NOTE_WRITE_DEBOUNCE_MS = 600;

/** Debounced fire-and-forget note writers, keyed by target id. */
const noteTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debounceNoteWrite(key: string, write: () => void): void {
  const existing = noteTimers.get(key);
  if (existing) {
    clearTimeout(existing);
  }
  noteTimers.set(
    key,
    setTimeout(() => {
      noteTimers.delete(key);
      write();
    }, NOTE_WRITE_DEBOUNCE_MS),
  );
}

function flushNoteWrites(): void {
  for (const timer of noteTimers.values()) {
    clearTimeout(timer);
  }
  noteTimers.clear();
}

export const useActiveSessionStore = create<ActiveSessionState>()((set, get) => ({
  sessionId: null,
  startedAt: null,
  routineId: null,
  routineName: null,
  sessionNote: '',
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
        set(stateFromActiveData(active));
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
    if (
      target.weightKg === null ||
      target.weightKg <= 0 ||
      target.reps === null ||
      target.reps <= 0
    ) {
      return; // Invalid/empty values: the row keeps focus instead.
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
    logSetCompletion(setId, {
      weightKg: target.weightKg,
      reps: target.reps,
      setType: target.setType,
      rpe: target.rpe,
    });
    // Hook for the rest timer (later phase): completion is the trigger.
    onSetCompleted({
      exerciseName: exercise.exerciseName,
      weightKg: target.weightKg,
      reps: target.reps,
      completedAt: Date.now(),
    });
  },

  setWeight: (setId, weightKg) => {
    set({
      exercises: get().exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((s) => (s.setId === setId ? { ...s, weightKg } : s)),
      })),
    });
    const row = findSet(get(), setId);
    if (row) {
      updateSetValues(setId, row.weightKg ?? 0, row.reps ?? 0);
    }
  },

  setReps: (setId, reps) => {
    set({
      exercises: get().exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((s) => (s.setId === setId ? { ...s, reps } : s)),
      })),
    });
    const row = findSet(get(), setId);
    if (row) {
      updateSetValues(setId, row.weightKg ?? 0, row.reps ?? 0);
    }
  },

  setRpe: (setId, rpe) => {
    set({
      exercises: get().exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((s) => (s.setId === setId ? { ...s, rpe } : s)),
      })),
    });
    updateSetRpe(setId, rpe);
  },

  cycleSetType: (setId) => {
    const { exercises } = get();
    const has = exercises.some((e) => e.sets.some((s) => s.setId === setId));
    if (!has) {
      return;
    }
    let next: SetType = 'working';
    for (const exercise of exercises) {
      const target = exercise.sets.find((s) => s.setId === setId);
      if (target) {
        next = SET_TYPE_CYCLE[(SET_TYPE_CYCLE.indexOf(target.setType) + 1) % SET_TYPE_CYCLE.length];
        break;
      }
    }
    set({
      exercises: exercises.map((e) => ({
        ...e,
        sets: e.sets.map((s) => (s.setId === setId ? { ...s, setType: next } : s)),
      })),
    });
    updateSetType(setId, next);
  },

  setSessionNote: (note) => {
    const sessionId = get().sessionId;
    set({ sessionNote: note });
    if (sessionId) {
      debounceNoteWrite(`session:${sessionId}`, () => updateSessionNote(sessionId, note));
    }
  },

  setExerciseNote: (sessionExerciseId, note) => {
    set({
      exercises: get().exercises.map((e) =>
        e.sessionExerciseId === sessionExerciseId ? { ...e, notes: note } : e,
      ),
    });
    debounceNoteWrite(`exercise:${sessionExerciseId}`, () =>
      updateExerciseNote(sessionExerciseId, note),
    );
  },

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
                  weightKg: within?.weightKg ?? null,
                  reps: within?.reps ?? null,
                  rpe: null,
                  setType: 'working',
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
        weightKg: within?.weightKg ?? null,
        reps: within?.reps ?? null,
        rpe: null,
        setType: 'working' as SetType,
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
          notes: '',
          sets,
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
    flushNoteWrites();
    const summary = await finishSession(state.sessionId);
    set({
      sessionId: null,
      startedAt: null,
      routineId: null,
      routineName: null,
      sessionNote: '',
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
    flushNoteWrites();
    await discardSession(state.sessionId);
    set({
      sessionId: null,
      startedAt: null,
      routineId: null,
      routineName: null,
      sessionNote: '',
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
      sessionNote: '',
      exercises: [],
    }),
}));

function findSet(
  state: ActiveSessionState,
  setId: string,
): { weightKg: number | null; reps: number | null } | null {
  for (const exercise of state.exercises) {
    const target = exercise.sets.find((s) => s.setId === setId);
    if (target) {
      return { weightKg: target.weightKg, reps: target.reps };
    }
  }
  return null;
}

function stateFromActiveData(
  data: ActiveSessionData,
  previousList?: { byIndex: { weightKg: number; reps: number }[] }[],
): Partial<ActiveSessionState> {
  return {
    sessionId: data.sessionId,
    startedAt: data.startedAt,
    routineId: data.routineId,
    routineName: data.routineName,
    sessionNote: data.notes ?? '',
    exercises: data.exercises.map((exercise, index) => {
      const previous =
        previousList?.[index]?.byIndex ??
        // Recovery path: rebuild the prefill source from the session itself.
        exercise.sets
          .filter((s) => s.isCompleted && s.setType === 'working')
          .map((s) => ({ weightKg: s.weightKg ?? 0, reps: s.reps ?? 0 }));
      return {
        ...exercise,
        notes: exercise.notes ?? '',
        previousByIndex: previous,
      };
    }),
    lastFinished: null,
  };
}
