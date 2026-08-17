import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/**
 * The single SQLite database for the app. SQLite is the ONLY persistent
 * store (techstack §3) — never AsyncStorage/MMKV for domain data.
 */
export const expoDb = openDatabaseSync('reps.db', { enableChangeListener: true });

// Declare FKs in schema; enforce them at runtime per connection.
expoDb.execSync('PRAGMA foreign_keys = ON');

export const db = drizzle(expoDb, { schema });
