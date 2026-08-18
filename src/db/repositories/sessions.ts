import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '../client';
import { newId } from '../ids';
import {
  exercises,
  routineExercises,
  routines,
  type Session,
  type SetType,
  sessionExercises,
  sessions,
  sets,
} from '../schema';

/**
 * Typed data-access layer for workout sessions. During an active session
 * every write goes through `enqueue`, a single ordered promise chain: the
 * UI never awaits any of this (logging must never block), but the writes
 * themselves are serialised so a fast follow-up can never overtake the row
 * it depends on (e.g. complete-set before insert-set commits).
 */

export interface ActiveSetData {
  setId: string;
  setIndex: number;
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  setType: SetType;
  isCompleted: boolean;
}

export interface ActiveExerciseData {
  sessionExerciseId: string;
  exerciseId: string;
  exerciseName: string;
  orderIndex: number;
  notes: string | null;
  sets: ActiveSetData[];
}

export interface ActiveSessionData {
  sessionId: string;
  startedAt: number;
  routineId: string | null;
  routineName: string | null;
  notes: string | null;
  exercises: ActiveExerciseData[];
}

export interface StartExerciseSpec {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
}

export interface PreviousPerformance {
  /** Completed working sets of the most recent completed session, by index. */
  byIndex: { weightKg: number; reps: number }[];
}

/** Ordered write queue for the active session — see module doc. */
let writeQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(operation, operation);
  writeQueue = run.catch(() => undefined);
  return run;
}

export function resetSessionWriteQueue(): void {
  writeQueue = Promise.resolve();
}

export function estimate1rm(weightKg: number, reps: number): number | null {
  // Epley, valid for r ≤ 10 (PRD E6). Beyond that the estimate inflates.
  if (reps < 1 || reps > 10 || weightKg <= 0) {
    return null;
  }
  return Math.round(weightKg * (1 + reps / 30) * 100) / 100;
}

export async function getPreviousPerformance(
  userId: string,
  exerciseId: string,
): Promise<PreviousPerformance> {
  const lastSession = await db
    .select({ sessionId: sessions.id })
    .from(sessions)
    .innerJoin(sessionExercises, eq(sessionExercises.sessionId, sessions.id))
    .where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.status, 'complete'),
        eq(sessionExercises.exerciseId, exerciseId),
        isNull(sessions.deletedAt),
        isNull(sessionExercises.deletedAt),
      ),
    )
    .orderBy(desc(sessions.startedAt))
    .limit(1);
  if (!lastSession[0]) {
    return { byIndex: [] };
  }
  const rows = await db
    .select({ weightKg: sets.weight, reps: sets.reps, setIndex: sets.setIndex })
    .from(sets)
    .innerJoin(sessionExercises, eq(sessionExercises.id, sets.sessionExerciseId))
    .where(
      and(
        eq(sessionExercises.sessionId, lastSession[0].sessionId),
        eq(sessionExercises.exerciseId, exerciseId),
        eq(sets.isCompleted, true),
        eq(sets.setType, 'working'),
        isNull(sets.deletedAt),
      ),
    )
    .orderBy(asc(sets.setIndex));
  return {
    byIndex: rows.map((row) => ({ weightKg: row.weightKg, reps: row.reps })),
  };
}

/** Pre-fill for set `index`: same index last time, else the final set. */
export function prefillFor(
  previous: PreviousPerformance,
  index: number,
): { weightKg: number | null; reps: number | null } {
  if (previous.byIndex.length === 0) {
    return { weightKg: null, reps: null };
  }
  const within = previous.byIndex[index];
  if (within) {
    return within;
  }
  const last = previous.byIndex[previous.byIndex.length - 1];
  return last ?? { weightKg: null, reps: null };
}

export async function startSession(
  userId: string,
  options: { routineId?: string; routineName?: string | null; exercises: StartExerciseSpec[] },
): Promise<ActiveSessionData> {
  const previousByExercise = new Map<string, PreviousPerformance>();
  for (const spec of options.exercises) {
    previousByExercise.set(spec.exerciseId, await getPreviousPerformance(userId, spec.exerciseId));
  }

  const sessionId = newId();
  const startedAt = new Date();
  const activeExercises: ActiveExerciseData[] = options.exercises.map((spec, index) => {
    const previous = previousByExercise.get(spec.exerciseId) ?? { byIndex: [] };
    return {
      sessionExerciseId: newId(),
      exerciseId: spec.exerciseId,
      exerciseName: spec.exerciseName,
      orderIndex: index,
      notes: null,
      sets: Array.from({ length: spec.targetSets }, (_, setIndex) => {
        const prefill = prefillFor(previous, setIndex);
        return {
          setId: newId(),
          setIndex,
          weightKg: prefill.weightKg,
          reps: prefill.reps,
          rpe: null as number | null,
          setType: 'working' as SetType,
          isCompleted: false,
        };
      }),
    };
  });

  const data: ActiveSessionData = {
    sessionId,
    startedAt: startedAt.getTime(),
    routineId: options.routineId ?? null,
    routineName: options.routineName ?? null,
    notes: null,
    exercises: activeExercises,
  };

  void enqueue(async () => {
    await db.transaction(async (tx) => {
      await tx.insert(sessions).values({
        id: sessionId,
        userId,
        routineId: options.routineId ?? null,
        startedAt,
        status: 'active',
        createdAt: startedAt,
        updatedAt: startedAt,
      });
      for (const exercise of activeExercises) {
        await tx.insert(sessionExercises).values({
          id: exercise.sessionExerciseId,
          sessionId,
          exerciseId: exercise.exerciseId,
          orderIndex: exercise.orderIndex,
          createdAt: startedAt,
          updatedAt: startedAt,
        });
        if (exercise.sets.length > 0) {
          await tx.insert(sets).values(
            exercise.sets.map((set) => ({
              id: set.setId,
              sessionExerciseId: exercise.sessionExerciseId,
              setIndex: set.setIndex,
              weight: set.weightKg ?? 0,
              reps: set.reps ?? 0,
              setType: set.setType,
              isCompleted: false,
              createdAt: startedAt,
              updatedAt: startedAt,
            })),
          );
        }
      }
    });
  });

  return data;
}

export async function getActiveSession(userId: string): Promise<ActiveSessionData | null> {
  const activeRows = await db
    .select()
    .from(sessions)
    .where(
      and(eq(sessions.userId, userId), eq(sessions.status, 'active'), isNull(sessions.deletedAt)),
    )
    .orderBy(desc(sessions.startedAt))
    .limit(1);
  const session = activeRows[0];
  if (!session) {
    return null;
  }
  const exerciseRows = await db
    .select({
      sessionExerciseId: sessionExercises.id,
      exerciseId: sessionExercises.exerciseId,
      exerciseName: exercises.name,
      orderIndex: sessionExercises.orderIndex,
      notes: sessionExercises.notes,
    })
    .from(sessionExercises)
    .innerJoin(exercises, eq(exercises.id, sessionExercises.exerciseId))
    .where(and(eq(sessionExercises.sessionId, session.id), isNull(sessionExercises.deletedAt)))
    .orderBy(asc(sessionExercises.orderIndex));
  if (exerciseRows.length === 0) {
    return null;
  }
  const setRows = await db
    .select()
    .from(sets)
    .where(
      and(
        inArray(
          sets.sessionExerciseId,
          exerciseRows.map((row) => row.sessionExerciseId),
        ),
        isNull(sets.deletedAt),
      ),
    )
    .orderBy(asc(sets.setIndex));
  const setsByExercise = new Map<string, ActiveSetData[]>();
  for (const row of setRows) {
    const list = setsByExercise.get(row.sessionExerciseId) ?? [];
    list.push({
      setId: row.id,
      setIndex: row.setIndex,
      weightKg: row.weight,
      reps: row.reps,
      rpe: row.rpe,
      setType: row.setType,
      isCompleted: row.isCompleted,
    });
    setsByExercise.set(row.sessionExerciseId, list);
  }
  let routineName: string | null = null;
  if (session.routineId) {
    const routineRows = await db
      .select({ name: routines.name })
      .from(routines)
      .where(eq(routines.id, session.routineId))
      .limit(1);
    routineName = routineRows[0]?.name ?? null;
  }
  return {
    sessionId: session.id,
    startedAt: session.startedAt.getTime(),
    routineId: session.routineId,
    routineName,
    notes: session.notes,
    exercises: exerciseRows.map((row) => ({
      sessionExerciseId: row.sessionExerciseId,
      exerciseId: row.exerciseId,
      exerciseName: row.exerciseName,
      orderIndex: row.orderIndex,
      notes: row.notes,
      sets: setsByExercise.get(row.sessionExerciseId) ?? [],
    })),
  };
}

export async function getRoutineStartSpecs(routineId: string): Promise<{
  routineName: string;
  exercises: StartExerciseSpec[];
} | null> {
  const rows = await db
    .select({
      routineName: routines.name,
      exerciseId: routineExercises.exerciseId,
      exerciseName: exercises.name,
      targetSets: routineExercises.targetSets,
    })
    .from(routineExercises)
    .innerJoin(exercises, eq(exercises.id, routineExercises.exerciseId))
    .innerJoin(routines, eq(routines.id, routineExercises.routineId))
    .where(and(eq(routineExercises.routineId, routineId), isNull(routineExercises.deletedAt)))
    .orderBy(asc(routineExercises.orderIndex));
  if (rows.length === 0) {
    return null;
  }
  return {
    routineName: rows[0].routineName,
    exercises: rows.map((row) => ({
      exerciseId: row.exerciseId,
      exerciseName: row.exerciseName,
      targetSets: row.targetSets,
    })),
  };
}

/** Fire-and-forget: complete a set (weight/reps already validated). */
export function logSetCompletion(
  setId: string,
  values: { weightKg: number; reps: number; setType: SetType; rpe?: number | null },
): void {
  const now = new Date();
  // Warm-up sets never produce an e1RM (excluded from PR-grade data).
  const est1rm = values.setType === 'warmup' ? null : estimate1rm(values.weightKg, values.reps);
  void enqueue(async () => {
    await db
      .update(sets)
      .set({
        weight: values.weightKg,
        reps: values.reps,
        setType: values.setType,
        rpe: values.rpe ?? null,
        isCompleted: true,
        completedAt: now,
        est1rm,
        updatedAt: now,
      })
      .where(eq(sets.id, setId));
  });
}

/** Fire-and-forget: per-set RPE edits land without completing anything. */
export function updateSetRpe(setId: string, rpe: number | null): void {
  const now = new Date();
  void enqueue(async () => {
    await db.update(sets).set({ rpe, updatedAt: now }).where(eq(sets.id, setId));
  });
}

/** Fire-and-forget: per-set type changes (also updates uncompleted rows). */
export function updateSetType(setId: string, setType: SetType): void {
  const now = new Date();
  void enqueue(async () => {
    await db.update(sets).set({ setType, updatedAt: now }).where(eq(sets.id, setId));
  });
}

/** Fire-and-forget: session-level note. */
export function updateSessionNote(sessionId: string, note: string): void {
  const now = new Date();
  void enqueue(async () => {
    await db
      .update(sessions)
      .set({ notes: note || null, updatedAt: now })
      .where(eq(sessions.id, sessionId));
  });
}

/** Fire-and-forget: per-exercise note. */
export function updateExerciseNote(sessionExerciseId: string, note: string): void {
  const now = new Date();
  void enqueue(async () => {
    await db
      .update(sessionExercises)
      .set({ notes: note || null, updatedAt: now })
      .where(eq(sessionExercises.id, sessionExerciseId));
  });
}

/** Fire-and-forget: field edits land without completing the set. */
export function updateSetValues(setId: string, weightKg: number, reps: number): void {
  const now = new Date();
  void enqueue(async () => {
    await db.update(sets).set({ weight: weightKg, reps, updatedAt: now }).where(eq(sets.id, setId));
  });
}

export function addSetRow(
  sessionExerciseId: string,
  setIndex: number,
  prefill: { weightKg: number | null; reps: number | null },
): string {
  const setId = newId();
  const now = new Date();
  void enqueue(async () => {
    await db.insert(sets).values({
      id: setId,
      sessionExerciseId,
      setIndex,
      weight: prefill.weightKg ?? 0,
      reps: prefill.reps ?? 0,
      setType: 'working',
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    });
  });
  return setId;
}

export function softDeleteSetRow(setId: string): void {
  const now = new Date();
  void enqueue(async () => {
    await db.update(sets).set({ deletedAt: now, updatedAt: now }).where(eq(sets.id, setId));
  });
}

export function addExerciseToSession(
  sessionId: string,
  exerciseId: string,
  orderIndex: number,
  initialSets: { setIndex: number; weightKg: number | null; reps: number | null }[],
): string {
  const sessionExerciseId = newId();
  const now = new Date();
  void enqueue(async () => {
    await db.insert(sessionExercises).values({
      id: sessionExerciseId,
      sessionId,
      exerciseId,
      orderIndex,
      createdAt: now,
      updatedAt: now,
    });
    if (initialSets.length > 0) {
      await db.insert(sets).values(
        initialSets.map((set) => ({
          id: newId(),
          sessionExerciseId,
          setIndex: set.setIndex,
          weight: set.weightKg ?? 0,
          reps: set.reps ?? 0,
          setType: 'working' as SetType,
          isCompleted: false,
          createdAt: now,
          updatedAt: now,
        })),
      );
    }
  });
  return sessionExerciseId;
}

export function softDeleteExerciseFromSession(sessionExerciseId: string): void {
  const now = new Date();
  void enqueue(async () => {
    await db.transaction(async (tx) => {
      await tx
        .update(sessionExercises)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(sessionExercises.id, sessionExerciseId));
      await tx
        .update(sets)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(sets.sessionExerciseId, sessionExerciseId), isNull(sets.deletedAt)));
    });
  });
}

export function reorderSessionExercises(orderedIds: string[]): void {
  const now = new Date();
  void enqueue(async () => {
    for (const [index, id] of orderedIds.entries()) {
      await db
        .update(sessionExercises)
        .set({ orderIndex: index, updatedAt: now })
        .where(eq(sessionExercises.id, id));
    }
  });
}

export interface FinishSummary {
  durationSeconds: number;
  totalVolumeKg: number;
  completedSetCount: number;
}

export async function finishSession(sessionId: string): Promise<FinishSummary | null> {
  const sessionRows = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
  const session = sessionRows[0];
  if (!session) {
    return null;
  }
  const endedAt = new Date();
  const durationSeconds = Math.max(
    0,
    Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000),
  );
  const totals = await db
    .select({
      volume: sql<number>`coalesce(sum(${sets.weight} * ${sets.reps}), 0)`,
      setCount: sql<number>`cast(count(${sets.id}) as integer)`,
    })
    .from(sets)
    .innerJoin(sessionExercises, eq(sessionExercises.id, sets.sessionExerciseId))
    .where(
      and(
        eq(sessionExercises.sessionId, sessionId),
        eq(sets.isCompleted, true),
        eq(sets.setType, 'working'),
        isNull(sets.deletedAt),
        isNull(sessionExercises.deletedAt),
      ),
    );
  const totalVolumeKg = Math.round((totals[0]?.volume ?? 0) * 100) / 100;
  const completedSetCount = totals[0]?.setCount ?? 0;

  await enqueue(async () => {
    const now = new Date();
    await db
      .update(sessions)
      .set({
        status: 'complete',
        endedAt,
        durationSeconds,
        totalVolume: totalVolumeKg,
        updatedAt: now,
      })
      .where(eq(sessions.id, sessionId));
    if (session.routineId) {
      await db
        .update(routines)
        .set({ lastPerformedAt: endedAt, updatedAt: now })
        .where(eq(routines.id, session.routineId));
    }
  });
  await writeQueue;
  resetSessionWriteQueue();
  return { durationSeconds, totalVolumeKg, completedSetCount };
}

export async function discardSession(sessionId: string): Promise<void> {
  await enqueue(async () => {
    const now = new Date();
    await db
      .update(sessions)
      .set({ status: 'discarded', endedAt: now, updatedAt: now })
      .where(eq(sessions.id, sessionId));
  });
  await writeQueue;
  resetSessionWriteQueue();
}

export async function getLatestCompletedSession(userId: string): Promise<Session | null> {
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(eq(sessions.userId, userId), eq(sessions.status, 'complete'), isNull(sessions.deletedAt)),
    )
    .orderBy(desc(sessions.startedAt))
    .limit(1);
  return rows[0] ?? null;
}
