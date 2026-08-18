import { and, asc, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import { db } from '../client';
import { newId } from '../ids';
import {
  type Difficulty,
  type Equipment,
  type Exercise,
  exercises,
  type ForceDirection,
  type Mechanic,
  type MuscleGroup,
} from '../schema';

/**
 * The typed data-access layer for exercises. UI code imports these
 * functions — it never writes raw SQL or touches drizzle directly.
 */

export interface ExerciseFilters {
  primaryMuscle?: MuscleGroup;
  equipment?: Equipment;
}

export interface ExerciseInput {
  name: string;
  aliases: string[];
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  mechanic: Mechanic;
  force: ForceDirection;
  difficulty: Difficulty;
  defaultRestSeconds: number;
  instructions: string;
  cues: string[];
  commonMistakes: string[];
}

const escapeLike = (value: string): string => `%${value.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;

export async function getAllExercises(): Promise<Exercise[]> {
  return db
    .select()
    .from(exercises)
    .where(isNull(exercises.deletedAt))
    .orderBy(asc(exercises.name));
}

/**
 * Case-insensitive match on name or any alias (PRD B7). Aliases are stored
 * as JSON text, so the LIKE also matches alias substrings — switch to
 * json_each only when every supported OS SQLite is ≥ 3.38.
 */
export async function searchExercises(
  query: string,
  filters: ExerciseFilters = {},
): Promise<Exercise[]> {
  const conditions = [isNull(exercises.deletedAt)];

  const q = query.trim();
  if (q) {
    const pattern = escapeLike(q);
    // ESCAPE '\' is required — without it SQLite treats the backslash in the
    // pattern as a literal and % / _ stay wildcards.
    conditions.push(
      sql`(${exercises.name} LIKE ${pattern} ESCAPE '\\' OR ${exercises.aliases} LIKE ${pattern} ESCAPE '\\')`,
    );
  }
  if (filters.primaryMuscle) {
    conditions.push(eq(exercises.primaryMuscle, filters.primaryMuscle));
  }
  if (filters.equipment) {
    conditions.push(eq(exercises.equipment, filters.equipment));
  }

  return db
    .select()
    .from(exercises)
    .where(and(...conditions))
    .orderBy(asc(exercises.name));
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const rows = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, id), isNull(exercises.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getFavouriteExercises(): Promise<Exercise[]> {
  return db
    .select()
    .from(exercises)
    .where(and(isNull(exercises.deletedAt), eq(exercises.isFavourite, true)))
    .orderBy(asc(exercises.name));
}

/**
 * "Recently used" is backed by last_opened_at until session logging exists;
 * re-point this query at session_exercises when the workout phase lands.
 */
export async function getRecentlyUsedExercises(limit = 10): Promise<Exercise[]> {
  return db
    .select()
    .from(exercises)
    .where(and(isNull(exercises.deletedAt), isNotNull(exercises.lastOpenedAt)))
    .orderBy(desc(exercises.lastOpenedAt))
    .limit(limit);
}

export async function setFavourite(id: string, favourite: boolean): Promise<void> {
  await db
    .update(exercises)
    .set({ isFavourite: favourite, updatedAt: new Date() })
    .where(eq(exercises.id, id));
}

export async function markOpened(id: string): Promise<void> {
  await db
    .update(exercises)
    .set({ lastOpenedAt: new Date(), updatedAt: new Date() })
    .where(eq(exercises.id, id));
}

export async function createCustomExercise(input: ExerciseInput): Promise<Exercise> {
  const now = new Date();
  const id = newId();
  await db
    .insert(exercises)
    .values({ id, ...input, isCustom: true, createdAt: now, updatedAt: now });
  const created = await getExerciseById(id);
  if (!created) {
    throw new Error('Custom exercise insert failed');
  }
  return created;
}

export async function updateCustomExercise(id: string, input: ExerciseInput): Promise<Exercise> {
  const existing = await getExerciseById(id);
  if (!existing?.isCustom) {
    throw new Error('Only custom exercises can be edited');
  }
  await db
    .update(exercises)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(exercises.id, id));
  const updated = await getExerciseById(id);
  if (!updated) {
    throw new Error('Custom exercise update failed');
  }
  return updated;
}

/** Soft delete — never hard delete (project convention). */
export async function softDeleteExercise(id: string): Promise<void> {
  await db
    .update(exercises)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(exercises.id, id));
}
