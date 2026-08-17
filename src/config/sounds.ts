/**
 * Central sound registry (DESIGN §14.3): MVP ships five sounds; none exist
 * yet. Every sound the app will ever play is named here from day one so the
 * audio pass (Phase 8) is a drop-in, not a refactor. null = not yet shipped.
 *
 * Sound is always optional and must never be required for operation (DESIGN §10).
 */
export const SOUND_MANIFEST = {
  /** Checkbox tick on set completion */
  setComplete: null,
  /** PR detected / revealed */
  personalRecord: null,
  /** Level-up takeover */
  levelUp: null,
  /** Weekly quest completed */
  questComplete: null,
  /** Rest timer finished */
  restOver: null,
} as const;

export type SoundKey = keyof typeof SOUND_MANIFEST;
