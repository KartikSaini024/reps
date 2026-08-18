import { asc, isNull } from 'drizzle-orm';

import { db } from '../client';
import { newId } from '../ids';
import { type User, users } from '../schema';

let userPromise: Promise<User> | null = null;

/**
 * The single local user. Skip-first onboarding (PRD A1) means no account
 * exists, but relational rows (routines, sessions, progression) need a
 * user_id from day one. When accounts arrive (Phase 2-backend), this row
 * gets linked to an auth identity — its UUID PK never changes.
 *
 * The in-flight promise is memoised so concurrent first callers (e.g. the
 * seed and a screen) cannot insert two user rows; a failure clears it so
 * the next call retries.
 */
export function getOrCreateLocalUser(): Promise<User> {
  if (!userPromise) {
    userPromise = resolveLocalUser().catch((error: unknown) => {
      userPromise = null;
      throw error;
    });
  }
  return userPromise;
}

async function resolveLocalUser(): Promise<User> {
  const existing = await db
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.createdAt))
    .limit(1);
  if (existing[0]) {
    return existing[0];
  }
  const now = new Date();
  const id = newId();
  await db.insert(users).values({ id, createdAt: now, updatedAt: now });
  const created = await db
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.createdAt))
    .limit(1);
  if (!created[0]) {
    throw new Error('Failed to create local user');
  }
  return created[0];
}
