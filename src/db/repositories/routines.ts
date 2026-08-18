import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '../client';
import { newId } from '../ids';
import { type Exercise, exercises, type Routine, routineExercises, routines } from '../schema';

/**
 * Typed data-access layer for routines and their ordered exercise entries.
 */

export interface RoutineEntryInput {
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
}

export interface RoutineInput {
  name: string;
  notes: string | null;
  entries: Omit<RoutineEntryInput, 'orderIndex'>[];
}

export interface RoutineWithEntries {
  routine: Routine;
  entries: RoutineEntry[];
}

export interface RoutineEntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: Exercise['primaryMuscle'];
  equipment: Exercise['equipment'];
  orderIndex: number;
  targetSets: number;
  /** Schema-optional; the editor normalises nulls to defaults. */
  targetRepsMin: number | null;
  targetRepsMax: number | null;
}

export interface RoutineSummary {
  routine: Routine;
  exerciseCount: number;
}

export async function listRoutines(userId: string): Promise<RoutineSummary[]> {
  const rows = await db
    .select({
      routine: routines,
      exerciseCount: sql<number>`cast(count(${routineExercises.id}) as integer)`,
    })
    .from(routines)
    .leftJoin(
      routineExercises,
      and(eq(routineExercises.routineId, routines.id), isNull(routineExercises.deletedAt)),
    )
    .where(and(eq(routines.userId, userId), isNull(routines.deletedAt)))
    .groupBy(routines.id)
    .orderBy(asc(routines.createdAt));
  return rows;
}

export async function getRoutineWithEntries(id: string): Promise<RoutineWithEntries | null> {
  const routineRows = await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, id), isNull(routines.deletedAt)))
    .limit(1);
  const routine = routineRows[0];
  if (!routine) {
    return null;
  }
  const entryRows = await db
    .select({
      id: routineExercises.id,
      exerciseId: routineExercises.exerciseId,
      exerciseName: exercises.name,
      primaryMuscle: exercises.primaryMuscle,
      equipment: exercises.equipment,
      orderIndex: routineExercises.orderIndex,
      targetSets: routineExercises.targetSets,
      targetRepsMin: routineExercises.targetRepsMin,
      targetRepsMax: routineExercises.targetRepsMax,
    })
    .from(routineExercises)
    .innerJoin(exercises, eq(exercises.id, routineExercises.exerciseId))
    .where(and(eq(routineExercises.routineId, id), isNull(routineExercises.deletedAt)))
    .orderBy(asc(routineExercises.orderIndex));
  return { routine, entries: entryRows };
}

export async function createRoutine(userId: string, input: RoutineInput): Promise<string> {
  const now = new Date();
  const routineId = newId();
  await db.transaction(async (tx) => {
    await tx.insert(routines).values({
      id: routineId,
      userId,
      name: input.name,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(routineExercises).values(
      input.entries.map((entry, index) => ({
        id: newId(),
        routineId,
        exerciseId: entry.exerciseId,
        orderIndex: index,
        targetSets: entry.targetSets,
        targetRepsMin: entry.targetRepsMin,
        targetRepsMax: entry.targetRepsMax,
        createdAt: now,
        updatedAt: now,
      })),
    );
  });
  return routineId;
}

export async function updateRoutine(id: string, input: RoutineInput): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(routines)
      .set({ name: input.name, notes: input.notes, updatedAt: now })
      .where(eq(routines.id, id));
    // Soft-delete the previous entry set, then insert the new order/contents.
    await tx
      .update(routineExercises)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(routineExercises.routineId, id), isNull(routineExercises.deletedAt)));
    await tx.insert(routineExercises).values(
      input.entries.map((entry, index) => ({
        id: newId(),
        routineId: id,
        exerciseId: entry.exerciseId,
        orderIndex: index,
        targetSets: entry.targetSets,
        targetRepsMin: entry.targetRepsMin,
        targetRepsMax: entry.targetRepsMax,
        createdAt: now,
        updatedAt: now,
      })),
    );
  });
}

export async function duplicateRoutine(id: string): Promise<string | null> {
  const source = await getRoutineWithEntries(id);
  if (!source) {
    return null;
  }
  return createRoutine(source.routine.userId, {
    name: `${source.routine.name} (copy)`,
    notes: source.routine.notes,
    entries: source.entries.map((entry) => ({
      exerciseId: entry.exerciseId,
      targetSets: entry.targetSets,
      targetRepsMin: entry.targetRepsMin ?? 8,
      targetRepsMax: entry.targetRepsMax ?? 12,
    })),
  });
}

/** Soft delete — never hard delete (project convention). */
export async function softDeleteRoutine(id: string): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(routines).set({ deletedAt: now, updatedAt: now }).where(eq(routines.id, id));
    await tx
      .update(routineExercises)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(routineExercises.routineId, id), isNull(routineExercises.deletedAt)));
  });
}
