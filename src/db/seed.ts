import { eq } from 'drizzle-orm';

import { db } from './client';
import { newId } from './ids';
import { exercises, type NewExercise } from './schema';
import { SEED_EXERCISES, SEED_INSTRUCTION_PLACEHOLDER, seedRestSeconds } from './seed-data';

const EXPECTED_SEED_COUNT = 60;

let seedPromise: Promise<void> | null = null;

/**
 * Seed the exercise library on first launch. Idempotent: if any seeded
 * (non-custom) exercise exists, it does nothing. The promise is cached so
 * concurrent callers (and React effect re-runs) never double-seed; a failure
 * clears the cache so the next launch can retry.
 */
export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error: unknown) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

async function runSeed(): Promise<void> {
  if (SEED_EXERCISES.length !== EXPECTED_SEED_COUNT) {
    throw new Error(
      `Seed data corrupted: expected ${EXPECTED_SEED_COUNT} exercises, found ${SEED_EXERCISES.length}`,
    );
  }

  const existing = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(eq(exercises.isCustom, false))
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  const now = new Date();
  const rows: NewExercise[] = SEED_EXERCISES.map((exercise) => ({
    id: newId(),
    name: exercise.name,
    aliases: exercise.aliases,
    primaryMuscle: exercise.primaryMuscle,
    secondaryMuscles: exercise.secondaryMuscles,
    equipment: exercise.equipment,
    mechanic: exercise.mechanic,
    force: exercise.force,
    difficulty: exercise.difficulty,
    instructions: SEED_INSTRUCTION_PLACEHOLDER,
    cues: [],
    commonMistakes: [],
    defaultRestSeconds: seedRestSeconds(exercise),
    isCustom: false,
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction(async (tx) => {
    await tx.insert(exercises).values(rows);
  });
}
