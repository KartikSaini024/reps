import { create } from 'zustand';
import { getOrCreateLocalUser, updateUserSettings } from '@/db/repositories/users';
import type { Units } from '@/db/schema';

/**
 * User-facing settings (units, RPE visibility). Persisted on the local
 * users row; hydrated once at launch, non-blocking. Writes are
 * fire-and-forget — the UI reflects immediately.
 */
interface SettingsState {
  units: Units;
  showRpe: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setUnits: (units: Units) => void;
  setShowRpe: (show: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  units: 'kg',
  showRpe: false,
  hydrated: false,

  hydrate: async () => {
    if (useSettingsStore.getState().hydrated) {
      return;
    }
    try {
      const user = await getOrCreateLocalUser();
      set({ units: user.units, showRpe: user.showRpe, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setUnits: (units) => {
    set({ units });
    void updateUserSettings({ units });
  },

  setShowRpe: (showRpe) => {
    set({ showRpe });
    void updateUserSettings({ showRpe });
  },
}));
