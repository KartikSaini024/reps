import { eq, isNull } from 'drizzle-orm';

import { db } from './client';
import { newId } from './ids';
import { createRoutine } from './repositories/routines';
import { getOrCreateLocalUser } from './repositories/users';
import { exercises, type NewExercise, routines } from './schema';
import { SEED_EXERCISES, SEED_INSTRUCTION_PLACEHOLDER, seedRestSeconds } from './seed-data';
import { STARTER_ROUTINES } from './starter-routines';

const EXPECTED_SEED_COUNT = 60;

let seedPromise: Promise<void> | null = null;

/**
 * First-launch seeding: the exercise library (PRD B1) and the starter
 * routines (PRD A6). Idempotent per table — each part runs only when its
 * table is empty, so existing installs pick up new seed sections without
 * touching user data. The promise is cached so concurrent callers (and
 * React effect re-runs) never double-seed; a failure clears the cache so
 * the next launch can retry.
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
  await seedExercises();
  await seedStarterRoutines();
}

async function seedExercises(): Promise<void> {
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

async function seedStarterRoutines(): Promise<void> {
  const existing = await db
    .select({ id: routines.id })
    .from(routines)
    .where(isNull(routines.deletedAt))
    .limit(1);
  if (existing.length > 0) {
    return;
  }

  const library = await db
    .select({ id: exercises.id, name: exercises.name })
    .from(exercises)
    .where(isNull(exercises.deletedAt));
  const idByName = new Map(library.map((row) => [row.name, row.id]));

  const user = await getOrCreateLocalUser();

  for (const starter of STARTER_ROUTINES) {
    const entries = starter.entries.map((entry) => {
      const exerciseId = idByName.get(entry.exerciseName);
      if (!exerciseId) {
        throw new Error(
          `Starter routine "${starter.name}" references unknown exercise "${entry.exerciseName}"`,
        );
      }
      return {
        exerciseId,
        targetSets: entry.targetSets,
        targetRepsMin: entry.targetRepsMin,
        targetRepsMax: entry.targetRepsMax,
      };
    });
    await createRoutine(user.id, { name: starter.name, notes: starter.notes, entries });
  }
}
