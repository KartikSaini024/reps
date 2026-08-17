import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Full data model from PRD §9. Every table follows the project conventions:
 *   - client-generated UUID primary keys (minted in the data layer via
 *     expo-crypto; deliberately NOT $defaultFn here so drizzle-kit can import
 *     this file under Node without React Native modules)
 *   - updated_at on every table
 *   - soft deletes via deleted_at — never hard delete
 *   - weights stored canonically in kg as REAL; convert only for display
 *
 * This file must stay importable by plain Node (drizzle-kit reads it), so it
 * may not import anything React-Native-specific.
 */

export type Units = 'kg' | 'lb';
export type ExperienceLevel = 'new' | 'some' | 'experienced';
export type MuscleGroup =
  | 'chest'
  | 'front-delts'
  | 'side-delts'
  | 'rear-delts'
  | 'traps'
  | 'lats'
  | 'upper-back'
  | 'lower-back'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'obliques';
export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'band'
  | 'other';
export type Mechanic = 'compound' | 'isolation';
export type ForceDirection = 'push' | 'pull' | 'static';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type SetType = 'warmup' | 'working' | 'drop' | 'failure' | 'amrap';
export type SessionStatus = 'active' | 'complete' | 'discarded';
export type RecordType = 'max_weight' | 'max_e1rm' | 'max_set_volume' | 'rep_pr';
export type PhotoPose = 'front' | 'side' | 'back';

const idColumn = () => text('id').primaryKey();

const createdAtColumn = () =>
  integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAtColumn = () =>
  integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date());

const deletedAtColumn = () => integer('deleted_at', { mode: 'timestamp_ms' });

/** Convention columns shared by every table. */
const baseColumns = () => ({
  id: idColumn(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
  deletedAt: deletedAtColumn(),
});

export const users = sqliteTable('users', {
  ...baseColumns(),
  displayName: text('display_name'),
  units: text('units').$type<Units>().notNull().default('kg'),
  weeklyGoal: integer('weekly_goal').notNull().default(3),
  experienceLevel: text('experience_level').$type<ExperienceLevel>().notNull().default('new'),
});

export const exercises = sqliteTable(
  'exercises',
  {
    ...baseColumns(),
    name: text('name').notNull(),
    aliases: text('aliases', { mode: 'json' }).$type<string[]>().notNull(),
    primaryMuscle: text('primary_muscle').$type<MuscleGroup>().notNull(),
    secondaryMuscles: text('secondary_muscles', { mode: 'json' }).$type<MuscleGroup[]>().notNull(),
    equipment: text('equipment').$type<Equipment>().notNull(),
    mechanic: text('mechanic').$type<Mechanic>().notNull(),
    force: text('force').$type<ForceDirection>().notNull(),
    difficulty: text('difficulty').$type<Difficulty>().notNull(),
    instructions: text('instructions').notNull(),
    cues: text('cues', { mode: 'json' }).$type<string[]>().notNull(),
    commonMistakes: text('common_mistakes', { mode: 'json' }).$type<string[]>().notNull(),
    defaultRestSeconds: integer('default_rest_seconds').notNull(),
    mediaUri: text('media_uri'),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => [
    index('idx_exercises_name').on(table.name),
    index('idx_exercises_is_custom').on(table.isCustom),
  ],
);

export const routines = sqliteTable(
  'routines',
  {
    ...baseColumns(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    /** Folder grouping is a P1 feature; the column ships now per PRD §9. */
    folderId: text('folder_id'),
    /** Soft visibility flag for retired routines (keeps history intact). */
    isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
    lastPerformedAt: integer('last_performed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [index('idx_routines_user').on(table.userId)],
);

export const routineExercises = sqliteTable(
  'routine_exercises',
  {
    ...baseColumns(),
    routineId: text('routine_id')
      .notNull()
      .references(() => routines.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull(),
    targetSets: integer('target_sets').notNull(),
    targetRepsMin: integer('target_reps_min'),
    targetRepsMax: integer('target_reps_max'),
    targetRpe: real('target_rpe'),
    supersetGroup: integer('superset_group'),
    restSeconds: integer('rest_seconds'),
  },
  (table) => [index('idx_routine_exercises_routine').on(table.routineId)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    ...baseColumns(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    routineId: text('routine_id').references(() => routines.id, { onDelete: 'set null' }),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
    durationSeconds: integer('duration_seconds'),
    notes: text('notes'),
    status: text('status').$type<SessionStatus>().notNull().default('active'),
    totalVolume: real('total_volume').notNull().default(0),
    xpAwarded: integer('xp_awarded').notNull().default(0),
  },
  (table) => [
    index('idx_sessions_user_started').on(table.userId, table.startedAt),
    index('idx_sessions_status').on(table.status),
  ],
);

export const sessionExercises = sqliteTable(
  'session_exercises',
  {
    ...baseColumns(),
    sessionId: text('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    orderIndex: integer('order_index').notNull(),
    notes: text('notes'),
    supersetGroup: integer('superset_group'),
  },
  (table) => [index('idx_session_exercises_session').on(table.sessionId)],
);

export const sets = sqliteTable(
  'sets',
  {
    ...baseColumns(),
    sessionExerciseId: text('session_exercise_id')
      .notNull()
      .references(() => sessionExercises.id, { onDelete: 'cascade' }),
    setIndex: integer('set_index').notNull(),
    /** Canonical kg. Convert only for display. */
    weight: real('weight').notNull(),
    reps: integer('reps').notNull(),
    rpe: real('rpe'),
    setType: text('set_type').$type<SetType>().notNull().default('working'),
    isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    /** Denormalised per PRD §9 — queried constantly for charts and PR detection. */
    est1rm: real('est_1rm'),
  },
  (table) => [index('idx_sets_session_exercise').on(table.sessionExerciseId)],
);

export const personalRecords = sqliteTable(
  'personal_records',
  {
    ...baseColumns(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    recordType: text('record_type').$type<RecordType>().notNull(),
    value: real('value').notNull(),
    /** Only meaningful for rep_pr (the weight the rep record was set at). */
    reps: integer('reps'),
    setId: text('set_id').references(() => sets.id, { onDelete: 'set null' }),
    achievedAt: integer('achieved_at', { mode: 'timestamp_ms' }).notNull(),
    previousValue: real('previous_value'),
  },
  (table) => [
    index('idx_prs_user_exercise_type').on(table.userId, table.exerciseId, table.recordType),
  ],
);

export const bodyMetrics = sqliteTable(
  'body_metrics',
  {
    ...baseColumns(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    metricType: text('metric_type').notNull(),
    value: real('value').notNull(),
    unit: text('unit').notNull(),
    recordedAt: integer('recorded_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('idx_body_metrics_user_type').on(table.userId, table.metricType)],
);

export const progressPhotos = sqliteTable(
  'progress_photos',
  {
    ...baseColumns(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    localUri: text('local_uri').notNull(),
    pose: text('pose').$type<PhotoPose>().notNull(),
    takenAt: integer('taken_at', { mode: 'timestamp_ms' }).notNull(),
    /** Canonical kg at capture time. */
    bodyweightAtCapture: real('bodyweight_at_capture'),
    isEncrypted: integer('is_encrypted', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [index('idx_progress_photos_user').on(table.userId)],
);

export const userProgression = sqliteTable('user_progression', {
  ...baseColumns(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  totalXp: integer('total_xp').notNull().default(0),
  level: integer('level').notNull().default(1),
  rankTier: text('rank_tier').notNull().default('Bronze'),
  currentStreakWeeks: integer('current_streak_weeks').notNull().default(0),
  longestStreakWeeks: integer('longest_streak_weeks').notNull().default(0),
  freezesAvailable: integer('freezes_available').notNull().default(0),
  consistencyScore: integer('consistency_score').notNull().default(0),
  lastWeekEvaluated: integer('last_week_evaluated', { mode: 'timestamp_ms' }),
});

export const xpEvents = sqliteTable(
  'xp_events',
  {
    ...baseColumns(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceType: text('source_type').notNull(),
    amount: integer('amount').notNull(),
    sessionId: text('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  },
  (table) => [index('idx_xp_events_user_created').on(table.userId, table.createdAt)],
);

export const achievements = sqliteTable(
  'achievements',
  {
    ...baseColumns(),
    key: text('key').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    rarity: text('rarity').notNull(),
    xpReward: integer('xp_reward').notNull(),
    criteriaJson: text('criteria_json', { mode: 'json' })
      .$type<Record<string, unknown>>()
      .notNull(),
    cosmeticRewardId: text('cosmetic_reward_id'),
  },
  (table) => [index('idx_achievements_category').on(table.category)],
);

export const userAchievements = sqliteTable(
  'user_achievements',
  {
    ...baseColumns(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    achievementId: text('achievement_id')
      .notNull()
      .references(() => achievements.id, { onDelete: 'cascade' }),
    unlockedAt: integer('unlocked_at', { mode: 'timestamp_ms' }),
    progress: integer('progress').notNull().default(0),
  },
  (table) => [
    uniqueIndex('uq_user_achievements_user_achievement').on(table.userId, table.achievementId),
  ],
);

export const exerciseMastery = sqliteTable(
  'exercise_mastery',
  {
    ...baseColumns(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    xp: integer('xp').notNull().default(0),
    level: integer('level').notNull().default(1),
  },
  (table) => [uniqueIndex('uq_exercise_mastery_user_exercise').on(table.userId, table.exerciseId)],
);

export const quests = sqliteTable('quests', {
  ...baseColumns(),
  key: text('key').notNull().unique(),
  template: text('template').notNull(),
  xpReward: integer('xp_reward').notNull(),
});

export const userQuests = sqliteTable(
  'user_quests',
  {
    ...baseColumns(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questId: text('quest_id')
      .notNull()
      .references(() => quests.id, { onDelete: 'cascade' }),
    weekStart: integer('week_start', { mode: 'timestamp_ms' }).notNull(),
    target: integer('target').notNull(),
    progress: integer('progress').notNull().default(0),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [index('idx_user_quests_user_week').on(table.userId, table.weekStart)],
);

/** Phase 2 (backend) — the table ships now per PRD §9; unused until sync exists. */
export const syncQueue = sqliteTable('sync_queue', {
  ...baseColumns(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  operation: text('operation').notNull(),
  payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  syncedAt: integer('synced_at', { mode: 'timestamp_ms' }),
});

// ---- Inferred row types for the data-access layer ----

export type User = typeof users.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Routine = typeof routines.$inferSelect;
export type RoutineExercise = typeof routineExercises.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SessionExercise = typeof sessionExercises.$inferSelect;
export type WorkoutSet = typeof sets.$inferSelect;
export type PersonalRecord = typeof personalRecords.$inferSelect;
export type BodyMetric = typeof bodyMetrics.$inferSelect;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type UserProgression = typeof userProgression.$inferSelect;
export type XpEvent = typeof xpEvents.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type ExerciseMastery = typeof exerciseMastery.$inferSelect;
export type Quest = typeof quests.$inferSelect;
export type UserQuest = typeof userQuests.$inferSelect;
export type SyncQueueEntry = typeof syncQueue.$inferSelect;
