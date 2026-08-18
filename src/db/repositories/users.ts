import { asc, isNull } from 'drizzle-orm';

import { db } from '../client';
import { newId } from '../ids';
import { type User, users } from '../schema';

let cachedLocalUserId: string | null = null;

/**
 * The single local user. Skip-first onboarding (PRD A1) means no account
 * exists, but relational rows (routines, sessions, progression) need a
 * user_id from day one. When accounts arrive (Phase 2-backend), this row
 * gets linked to an auth identity — its UUID PK never changes.
 */
export async function getOrCreateLocalUser(): Promise<User> {
  if (cachedLocalUserId) {
    const rows = await db.select().from(users).where(isNull(users.deletedAt)).limit(1);
    if (rows[0]) {
      return rows[0];
    }
  }
  const existing = await db
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.createdAt))
    .limit(1);
  if (existing[0]) {
    cachedLocalUserId = existing[0].id;
    return existing[0];
  }
  const now = new Date();
  const id = newId();
  await db.insert(users).values({ id, createdAt: now, updatedAt: now });
  const created = await db.select().from(users).where(isNull(users.deletedAt)).limit(1);
  if (!created[0]) {
    throw new Error('Failed to create local user');
  }
  cachedLocalUserId = created[0].id;
  return created[0];
}
