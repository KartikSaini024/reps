import { TRAINING_DEFAULTS } from '@/config/training-defaults';

/**
 * Hook point for the rest timer (later phase). Called the instant a set is
 * completed, after the optimistic UI update and the queued DB write. The
 * future timer will read per-exercise rest defaults and start here.
 */
export interface SetCompletedEvent {
  exerciseName: string;
  weightKg: number;
  reps: number;
  completedAt: number;
}

export function onSetCompleted(event: SetCompletedEvent): void {
  void event;
  void TRAINING_DEFAULTS.restSeconds;
  // Rest timer integration lands with the timer phase.
}
