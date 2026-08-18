/**
 * Starter routines (PRD A6): three templates matched to 3/4/6-day weekly
 * frequencies. Upper/Lower and PPL each expand to their day routines.
 * Exercises are referenced by exact seed-library name and resolved to ids
 * at seed time — a mismatch throws rather than seeding a broken routine.
 */
export interface StarterRoutine {
  name: string;
  notes: string;
  entries: StarterEntry[];
}

export interface StarterEntry {
  exerciseName: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
}

export const STARTER_ROUTINES: StarterRoutine[] = [
  {
    name: 'Full Body',
    notes: 'Starter · Full Body · 3 days/week',
    entries: [
      { exerciseName: 'Back Squat', targetSets: 3, targetRepsMin: 5, targetRepsMax: 8 },
      { exerciseName: 'Romanian Deadlift', targetSets: 3, targetRepsMin: 8, targetRepsMax: 10 },
      { exerciseName: 'Barbell Bench Press', targetSets: 3, targetRepsMin: 5, targetRepsMax: 8 },
      { exerciseName: 'Barbell Row', targetSets: 3, targetRepsMin: 6, targetRepsMax: 10 },
      { exerciseName: 'Face Pull', targetSets: 2, targetRepsMin: 12, targetRepsMax: 15 },
    ],
  },
  {
    name: 'Upper',
    notes: 'Starter · Upper/Lower · 4 days/week',
    entries: [
      { exerciseName: 'Barbell Bench Press', targetSets: 3, targetRepsMin: 5, targetRepsMax: 8 },
      { exerciseName: 'One-Arm Dumbbell Row', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      { exerciseName: 'Lat Pulldown', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      {
        exerciseName: 'Dumbbell Lateral Raise',
        targetSets: 3,
        targetRepsMin: 12,
        targetRepsMax: 15,
      },
      { exerciseName: 'Dumbbell Hammer Curl', targetSets: 2, targetRepsMin: 10, targetRepsMax: 15 },
    ],
  },
  {
    name: 'Lower',
    notes: 'Starter · Upper/Lower · 4 days/week',
    entries: [
      { exerciseName: 'Back Squat', targetSets: 3, targetRepsMin: 5, targetRepsMax: 8 },
      { exerciseName: 'Romanian Deadlift', targetSets: 3, targetRepsMin: 8, targetRepsMax: 10 },
      { exerciseName: 'Bulgarian Split Squat', targetSets: 2, targetRepsMin: 8, targetRepsMax: 12 },
      { exerciseName: 'Lying Leg Curl', targetSets: 2, targetRepsMin: 10, targetRepsMax: 15 },
      { exerciseName: 'Standing Calf Raise', targetSets: 3, targetRepsMin: 10, targetRepsMax: 15 },
    ],
  },
  {
    name: 'Push Day',
    notes: 'Starter · PPL · 6 days/week',
    entries: [
      { exerciseName: 'Barbell Bench Press', targetSets: 3, targetRepsMin: 5, targetRepsMax: 8 },
      {
        exerciseName: 'Seated Dumbbell Shoulder Press',
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 12,
      },
      {
        exerciseName: 'Dumbbell Lateral Raise',
        targetSets: 3,
        targetRepsMin: 12,
        targetRepsMax: 15,
      },
      {
        exerciseName: 'Cable Triceps Pushdown',
        targetSets: 2,
        targetRepsMin: 10,
        targetRepsMax: 15,
      },
    ],
  },
  {
    name: 'Pull Day',
    notes: 'Starter · PPL · 6 days/week',
    entries: [
      { exerciseName: 'Pull-Up', targetSets: 3, targetRepsMin: 5, targetRepsMax: 10 },
      { exerciseName: 'Barbell Row', targetSets: 3, targetRepsMin: 6, targetRepsMax: 10 },
      { exerciseName: 'Face Pull', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15 },
      { exerciseName: 'Dumbbell Hammer Curl', targetSets: 2, targetRepsMin: 10, targetRepsMax: 15 },
    ],
  },
  {
    name: 'Legs Day',
    notes: 'Starter · PPL · 6 days/week',
    entries: [
      { exerciseName: 'Back Squat', targetSets: 3, targetRepsMin: 5, targetRepsMax: 8 },
      { exerciseName: 'Romanian Deadlift', targetSets: 3, targetRepsMin: 8, targetRepsMax: 10 },
      { exerciseName: 'Leg Press', targetSets: 3, targetRepsMin: 8, targetRepsMax: 12 },
      { exerciseName: 'Lying Leg Curl', targetSets: 2, targetRepsMin: 10, targetRepsMax: 15 },
      { exerciseName: 'Seated Calf Raise', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15 },
    ],
  },
];
