import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/exercises/empty-state';
import { RoutineEditorView } from '@/components/routines/routine-editor-view';
import { SafeScreen } from '@/components/safe-screen';
import { getRoutineWithEntries } from '@/db/repositories/routines';
import { useRoutineEditorStore } from '@/stores/routine-editor';

/** Edit an existing routine (also hosts duplicate/delete). */
export default function EditRoutine() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const hydrateFrom = useRoutineEditorStore((state) => state.hydrateFrom);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    void getRoutineWithEntries(id)
      .then((found) => {
        if (cancelled) {
          return;
        }
        if (found) {
          hydrateFrom(found);
          setState('ready');
        } else {
          setState('missing');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState('missing');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, hydrateFrom]);

  if (state === 'missing') {
    return (
      <SafeScreen>
        <EmptyState message="Routine not found." />
        <Button label="‹ Back" variant="ghost" onPress={() => router.back()} />
      </SafeScreen>
    );
  }

  if (state === 'loading') {
    return null;
  }

  return <RoutineEditorView isExisting />;
}
