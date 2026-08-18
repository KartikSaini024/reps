import { useEffect } from 'react';

import { RoutineEditorView } from '@/components/routines/routine-editor-view';
import { useRoutineEditorStore } from '@/stores/routine-editor';

/** Create a routine. Draft state lives in the routine-editor store. */
export default function NewRoutine() {
  const hydrateNew = useRoutineEditorStore((state) => state.hydrateNew);

  useEffect(() => {
    hydrateNew();
  }, [hydrateNew]);

  return <RoutineEditorView isExisting={false} />;
}
