import { asc, isNull, like } from 'drizzle-orm';

import { db } from '../client';
import { type Exercise, exercises } from '../schema';

/**
 * The typed data-access layer for exercises. UI code imports these
 * functions — it never writes raw SQL or touches drizzle directly.
 */

export async function getAllExercises(): Promise<Exercise[]> {
  return db
    .select()
    .from(exercises)
    .where(isNull(exercises.deletedAt))
    .orderBy(asc(exercises.name));
}

/** Case-insensitive match on name. Alias matching lands with the library screen phase. */
export async function searchExercises(query: string): Promise<Exercise[]> {
  const q = query.trim();
  if (!q) {
    return getAllExercises();
  }
  const pattern = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
  return db
    .select()
    .from(exercises)
    .where(like(exercises.name, pattern))
    .orderBy(asc(exercises.name));
}
