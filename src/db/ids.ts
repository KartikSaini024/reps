import Crypto from 'expo-crypto';

/**
 * Client-generated UUID primary keys (project convention). Minted here in
 * the data layer — the schema file stays free of React Native imports so
 * drizzle-kit can load it under Node.
 */
export function newId(): string {
  return Crypto.randomUUID();
}
