# REPS — Phase Logs

One entry per executed phase. Newest at the bottom. This file is the durable
record of what changed, why, and what was deliberately deferred.

---

## Phase 0 — Project scaffold and build pipeline

**Date:** 17 August 2026 · **Commit:** `0624b05` (on top of template `02e610f`)

**Goal:** A running app on a physical device and a proven path to an installable binary. No features.

**What was done:**

- Scaffolded with `create-expo-app` on **Expo SDK 57** (`expo@57.0.13`, RN 0.86.2, React 19.2.3, New Architecture always-on) — SDK 57 verified as current stable via npm dist-tags; newer than the SDK 56 that techstack.md could confirm.
- TypeScript `strict: true` confirmed in `tsconfig.json`.
- Biome 2.5.8 installed and configured (`biome.json`) as the single lint + format tool. The SDK 57 template no longer ships ESLint at all.
- Expo Router tab scaffold: Home / History / Profile, plain text. Replaced the template's **unstable** `NativeTabs` with the standard stable `Tabs` navigator.
- `app.json`: name `REPS`, dark UI style, bundle IDs set, scheme `reps`.
- Native targets verified from installed packages (not docs): Android compile/target SDK **36** (Play mandate satisfied by SDK default; no app.json field exists for this in modern Expo), iOS floor **16.4** (SDK 57 minimum; an attempted `expo-build-properties` pin to 16.0 was rejected by the plugin's own validation, so the pin and the dependency were removed).
- `eas.json` with development / preview / production profiles (`requireCommit`, local version source, preview = internal APK).
- Stripped template example code, `scripts/`, `CLAUDE.md`, `.claude/`, unused assets; pruned example-only dependencies.
- Added `.gitattributes` (LF enforcement) and README (dev server, device testing, EAS preview build, project structure).
- Branch renamed `master` → `main`; pushed to `github.com/KartikSaini024/reps`.

**Verification:** `tsc --noEmit` clean · Biome clean · `expo export --platform android` produced a valid 2.6MB Hermes bundle · `expo-doctor` 21/21.

**Decisions of note:**

- Removed the template LICENSE (Expo's own MIT, copyrighted to 650 Industries) — project licence still undecided.
- Kept template experiments `typedRoutes` and `reactCompiler`.
- Bundle ID initially `com.kartiksaini.reps`, later changed to `com.krumaxx.reps` in Phase 1 at owner request.

**Known gaps left:** template icon/splash art; EAS project ID not yet linked (the owner linked it between Phase 0 and 1); no CI.

---

## Phase 1 — Design tokens and base components

**Date:** 17 August 2026 · **Commit:** `9fdad0d`

**Goal:** Token system + component gallery inspectable on device.

**What was done:**

- `src/theme/colors.ts` — the nine DESIGN §4 tokens behind a `ThemeColors` interface; `midnightArcade` theme object; active theme via a single `colors` binding (DESIGN §11 swap structure, no switching built).
- `src/theme/typography.ts` — `FontFamily` map + seven-variant type scale (marquee/title/dataXL/dataL/body/label/micro), 0.12em tracking and auto-uppercase on display variants.
- Fonts: **Silkscreen** (400/700, display) + **Space Grotesk** (400/500/700, UI and data) via `@expo-google-fonts/*` + `expo-font`. **Both SIL OFL 1.1 — verified from the licence files in the packages; commercial use permitted.**
- Data-role tabular figures: Space Grotesk `tnum` **verified present in all shipped weights** by grepping the TTF binaries — no mono face needed.
- `src/theme/spacing.ts` — 4dp-base scale keyed by multiplier, typed step union.
- `src/theme/pixel-scale.ts` — `PIXEL_SCALE` from DESIGN §6's round-in-physical-pixels algorithm.
- Components in `src/components/`: `Panel` (2dp edge border, panel fill, hard-offset void shadow as a sibling view), `Text` (7 variants, token-only colours), `Button` (primary/secondary/ghost × normal/disabled, 48dp minimum, press = 2dp translate into shadow), `StepBar` (segmented, 3dp gaps, floor-fill semantics), `Marquee` (display header + 2dp rule).
- Dev-only Gallery screen (`src/app/gallery.tsx`, `__DEV__`-gated) reachable from Profile; redirects home in production.
- Bundle ID → `com.krumaxx.reps` both platforms; README updated.

**Verification:** `tsc --noEmit` clean · Biome clean (one justified inline `biome-ignore` in StepBar for array-index keys on stateless positional segments) · bundle export OK · design QA grep: **0** `borderRadius` in `src/`, all hex values confined to `theme/colors.ts`, zero colour opacity.

**Decisions of note:**

- Panel/Button hard shadows are sibling views, not platform shadow props — deterministic cross-platform, no blur.
- Variant default colours: marquee→coin, dataXL→data, label/micro→faint, rest→ink.
- Marquee's rule beneath is `--edge` (DESIGN specifies the rule, not its colour).
- New dependencies declared: `expo-font` (reinstated — now actually used), the two `@expo-google-fonts` packages.

**Known gaps left:** button press is an instant state change (no 120ms easing — lands with Reanimated usage); splash/icons still template art; StepBar fills whole segments only.

---

## Phase 2 — Database schema, migrations, and seed data

**Date:** 17 August 2026 · **Commits:** `c430fb1` (schema + migration 0000 + seed + list) → `f57282e` (migration 0001) → Sentry commit

**Goal:** Working local SQLite database with the exercise library seeded, proven by a list on screen.

**What was done:**

- **Standing instruction adopted this phase:** all variable settings centralised from the start — `src/config/sounds.ts` (five named MVP sound slots, null placeholders per DESIGN §14.3), `src/config/training-defaults.ts` (rest-by-mechanic, weekly-goal bounds, canonical unit, e1RM rep cap), `src/config/telemetry.ts` (Sentry DSN + flags). This file (PhaseLogs.md) created and backfilled for Phases 0–1.
- **Stack:** `expo-sqlite` (~57.0.1, config plugin auto-registered) + `drizzle-orm` 0.45.2 stable + `drizzle-kit` 0.31.10 + `babel-plugin-inline-import` 3.0.0 + `expo-crypto` (UUID PKs). The drizzle@rc/1.0 line was NOT used — stable supports the full documented Expo flow (verified `useMigrations` exists in installed 0.45.2 before committing to it).
- **Schema** (`src/db/schema.ts`): all 18 PRD §9 tables. Conventions on every table via shared column factories: UUID text PKs (minted in the data layer via `Crypto.randomUUID()` — the schema deliberately has no `$defaultFn` for ids so drizzle-kit can import it under Node without RN modules), `updated_at` everywhere, `deleted_at` soft deletes, weights canonical kg REAL. Typed unions for mechanic/force/equipment/muscle/difficulty/set-type/session-status/record-type. Foreign keys declared and enforced via `PRAGMA foreign_keys = ON` at connection. Sensible indexes on the hot join/aggregate paths.
- **Migrations:** `drizzle.config.ts` with `driver: 'expo'` → `npx drizzle-kit generate` (npm run db:generate) emits SQL + a JS bundle (`drizzle/migrations.js`) that inlines `.sql` via the babel plugin; `metro.config.js` adds `sql` to sourceExts. Migration 0000 = full world (18 tables). Migration 0001 = trivial `routines.is_archived` column, committed separately so the upgrade path can be tested against an existing database.
- **App-start gate** (`src/app/_layout.tsx`): fonts → `useMigrations(db, migrations)` → `ensureSeeded()`. Splash held until all three pass. A failed migration or seed renders a clear error screen ("history untouched, do not reinstall") instead of running on a broken database.
- **Seed** (`src/db/seed-data.ts`, `seed.ts`): exactly 60 exercises across all major patterns (squat/hinge/lunge/push-h/push-v/pull-h/pull-v/shoulders/arms/legs/core/carries/power). Placeholder instructions per PRD B3; rest seconds from config by mechanic. Idempotent: no-op if any non-custom exercise exists; promise-cached to survive effect re-runs; failure clears the cache for next-launch retry; asserts count 60.
- **Data-access layer** (`src/db/repositories/`): `getAllExercises`, `searchExercises` (name match, escaped LIKE). UI never touches drizzle or SQL.
- **Home tab**: plain FlatList of the library (name + muscle · equipment · mechanic), 2dp rule separators.
- **Sentry** (`@sentry/react-native` 7.11.0 — `sentry-expo` is deprecated; flow verified against current Sentry Expo docs): DSN in `src/config/telemetry.ts`, init + `Sentry.wrap(RootLayout)`, startup migration/seed failures captured with tags, Metro switched to `getSentryExpoConfig`, config plugin auto-added to app.json. Errors only: `tracesSampleRate: 0`, `sendDefaultPii: false`, **disabled in development** (`enabled: !__DEV__`) so dev/Expo Go stays offline; production builds report.

**Gotchas hit (documented for the future):**

1. First `expo export` after adding the babel plugin served a **stale Metro transform cache** — the .sql never reached the bundle. `--clear` fixed it. If a bundled asset ever seems missing, clear the Metro cache before suspecting code.
2. TS numeric-key quirk: `keyof` on numeric-keyed objects widens to `number`, so the spacing scale uses an explicit `SpacingStep` union + `Record` completeness check.
3. Drizzle-kit imports the schema under Node → schema must stay free of RN imports.
4. Biome 2.5.8's `noArrayIndexKey` flags even template-literal index keys; StepBar's segments are fixed positional slots, so the rule is file-scoped off in `biome.json` with the justification in the component docblock.
5. `biome.json` overrides use `includes`, not `path` (Biome 2 rename).

**Verification:** `tsc --noEmit` clean · Biome clean · `expo export --platform android --clear` bundles both migrations (verified by grepping the Hermes bundle for DDL and `is_archived`) and the Sentry DSN · seed count asserted 60 · `expo config --type prebuild` evaluates with the Sentry plugin (warns about missing org/project slugs — expected, see gaps).

**Decisions of note:**

- New dependencies declared: `expo-sqlite`, `drizzle-orm`, `drizzle-kit` (dev), `babel-plugin-inline-import` (dev), `expo-crypto` (UUID PKs without guessing at engine WebCrypto), `@sentry/react-native`.
- `user_progression` has a UUID `id` PK + unique `user_id` FK (convention says UUID PKs; a composite/natural PK would complicate sync later).
- `sync_queue` ships now (PRD §9 says include everything) though nothing writes it until Phase 2-backend.
- FlatList (built-in) for the 60-row list; FlashList v2 arrives with the real searchable library screen.
- Difficulty is a 3-level text enum; muscle taxonomy is a 17-group union chosen to cover the PRD's heatmap needs without sub-muscle sprawl.
- Sentry is error-only and dev-silent: crash telemetry is the one exception to the "no network" rule, explicitly authorised by the owner this phase.

**Known gaps left:** Sentry native crash capture requires a development/preview build (not Expo Go); no runtime retry button on the startup error screen (restart retries); PhaseLogs to be updated at the end of every phase per standing instruction.

**Post-phase fixups (same day):**

1. **Expo Go splash hang (owner report, fixed in `e40154b`):** `@sentry/react-native` resolves its native turbo module at import time (`TurboModuleRegistry.getEnforcing('RNSentry')`) and throws where it doesn't exist — Expo Go and web don't ship it. The static import in the root layout crashed the bundle before React mounted, so Expo Go sat on the splash forever. Sentry now loads via `src/telemetry/sentry.ts`: lazily `require()`'d, guarded to skip Expo Go/web, init and `Sentry.wrap` conditional. Verified: dev bundle serves via the Expo Go entry (HTTP 200), production export still bundles the SDK. Lesson: verify the Expo Go story for any native-backed dependency, not just the build story.
2. **Sentry completed:** organization `personal-bol` / project `react-native` slugs added to the app.json plugin; `SENTRY_AUTH_TOKEN` added to EAS by the owner — source maps upload on the next EAS build (no more config warning). Master switch added: `TELEMETRY.sentryEnabled` in `src/config/telemetry.ts`; Sentry is on a 10-day trial and is deliberately built for removal — flip the boolean to stop it entirely, or remove per: uninstall `@sentry/react-native`, revert `metro.config.js` to `getDefaultConfig` (keep the `sql` sourceExt), drop the plugin from app.json, delete `src/telemetry/sentry.ts` + the three Sentry lines in `_layout.tsx` + `src/config/telemetry.ts`.
3. **Expo Go splash hang — full postmortem (`e4ef7c0`):** two stacked failures. (a) The Sentry import crash (above). (b) The real killer: Expo Go requests the dev bundle with `transform.routerRoot=src/app`; that pulls `drizzle/migrations.js` → `.sql` imports, which are only valid with `babel-plugin-inline-import` from `babel.config.js`. A Metro **transform cache predating `babel.config.js`** parsed `.sql` as JavaScript → TransformError → Expo Go sat on the splash forever. The fix is `npx expo start -c`. Two hard-won lessons logged: bundle-request URLs without the CLI's `transform.*` params silently build a router-empty shell (a red herring that cost hours — always probe with `transform.routerRoot=src/app`), and **any change to babel.config.js requires a Metro cache clear** (`-c`) on this machine — the cache does not self-invalidate. A dev-only startup diagnostics screen (fonts/migrations/seed states after 2.5s) now makes any future gate hang self-explaining. Verified: 1969-module dev bundle with seed data and both migrations inlined.
4. **Sentry removed** (owner decision, trial cut short): uninstalled `@sentry/react-native`, plugin dropped from app.json, `metro.config.js` back to plain `getDefaultConfig` (+`sql` sourceExt), `src/telemetry/sentry.ts` deleted, `_layout.tsx` Sentry-free, `config/telemetry.ts` kept as a documented off-slot. Verified: production export and dev bundle (correct transform params) contain zero Sentry references and no `@sentry` requires; app markers all present. If crash reporting returns before store submission, re-add per this log's earlier entries — lazily, never statically imported.
5. **Startup gate made honest (`67e3d4f`):** the dev diagnostics screen had a self-defeating bug — it rendered *underneath* the native splash because `preventAutoHideAsync` was only dropped on success, so a gate hang looked identical to a dead app. Diagnostics now hides the splash when it activates, font-load failures settle the gate (system-font fallback) instead of hanging forever, and per-font errors are shown. All Expo Go native deps verified present in `expo/bundledNativeModules.json`. No Android SDK on the dev machine, so runtime reproduction must happen on the owner's device via this instrumentation.
6. **Seed crash fixed (`77b6cac`):** `import Crypto from 'expo-crypto'` is `undefined` at runtime — expo-crypto exports only *named* functions (`randomUUID`), and TS's synthetic-default interop let the wrong import style typecheck. Seeding threw "cannot read property 'randomUUID' of undefined", surfaced by the new error screen (migrations had passed). Lesson: verify export style of every first-imported module from its installed `.d.ts`, and prefer named imports for Expo SDK modules.

---

## Phase 3 — Exercise library UI

**Date:** 18 August 2026

**Goal:** Browse, search, filter, view, and create exercises. LOG register: quiet, dense, fast.

**What was done:**

- **FlashList v2.0.2** (`@shopify/flash-list`, via `npx expo install`): New Architecture support verified from current docs before installing; v2 no longer wants `estimatedItemSize`, padding goes in `contentContainerStyle`.
- **Migration 0002** (`is_favourite`, `last_opened_at` on `exercises`): favourites/recent need storage (PRD B8). Flags live on the row — single-user local-only until accounts exist. `last_opened_at` backs "recently used" *temporarily*; when workout logging lands, `getRecentlyUsedExercises` re-points at `session_exercises` (noted in the repository).
- **Schema** now exports the vocabulary lists (`MUSCLE_GROUPS`, `EQUIPMENT_TYPES`, `MECHANICS`, `FORCE_DIRECTIONS`, `DIFFICULTIES`) — UI options derive from these, never hardcoded.
- **Repository** extended: `searchExercises(query, {primaryMuscle, equipment})` — SQLite-side, debounced from the UI (300ms) with a request-id stale guard; alias matching via LIKE on the JSON text column (documented: switch to `json_each` only when every OS SQLite ≥ 3.38); favourites/recent getters; `setFavourite`, `markOpened`, `createCustomExercise`, `updateCustomExercise` (custom-only guard), `softDeleteExercise`.
- **Components** (`src/components/exercises/`): `SearchField`, `FilterChipRow` (horizontal, single-select, tap-again-to-clear), `ChipSelect` (wrapping, multi for form fields), `ExerciseRow`, `EmptyState`, `MediaPlaceholder` (flat token shapes only — no art until Phase 10), `SectionLabel`, `ExerciseForm` (shared create/edit, validation, chip pickers, no form library per techstack).
- **Screens:** Library tab (renamed Home → Exercises) = FlashList with search + two filter rows + Favourites/Recent shelves in the header (shelves only while browsing, hidden during search); detail (`/exercise/[id]`) with metadata, instructions/cues/mistakes, media slot, favourite toggle, empty-history state, edit/delete for custom; `/exercise/new`; `/exercise/[id]/edit` (custom-only). Data reloads on focus (`useFocusEffect`) so favourite toggles reflect on return.
- **UI-change-readiness** (owner's standing instruction): every visual piece is a component; screens compose components + repository calls only; all styling inline-token-based via the theme module.

**Verification:** `tsc --noEmit` clean (after regenerating typed routes — `expo export` does NOT regenerate `.expo/types`; only `expo start` does) · Biome clean · dev bundle probed with real Expo Go params (`transform.routerRoot=src/app`): 7.2MB with SearchField/form/FlashList/`is_favourite` markers present.

**Decisions of note:**

- Alias search matches the stored JSON text via LIKE — pragmatic for ASCII terms; documented upgrade path in the repository.
- "Recently used" = last *opened* until session logging exists (honest placeholder, swap point documented in code).
- Type-scale gap found: the log register has no headline size (title/marquee are display-face, banned here). Detail screen uses `uiBold` 20/24 inline; promote to a named variant when a second screen needs it.
- Seeded exercises are read-only; only custom rows can be edited/soft-deleted (library content is curated data).
- Delete is soft (`deleted_at`), with an Alert confirm.

**Known gaps left:** no pagination/virtualization tuning needed at 60+ rows (FlashList handles it); media upload lands with B5 (Phase 9); secondary-muscle filtering not exposed in UI (schema + query ready if wanted); the create-form has no dedupe check on names.

---

## Phase 4 — Routine creation and management

**Date:** 18 August 2026

**Goal:** Build, edit, and organise workout templates. LOG register.

**What was done:**

- **Routines repository** (`src/db/repositories/routines.ts`): list with exercise counts (leftJoin + groupBy), fetch-with-entries (join to exercises for names), create/update inside transactions, duplicate (deep copy, " (copy)" name), soft delete cascading to entries. `updateRoutine` soft-deletes the previous entry set and inserts the new order — reorderings never hard-delete rows.
- **Local user** (`src/db/repositories/users.ts`): `getOrCreateLocalUser()` — routines need a `user_id` FK and skip-first onboarding (PRD A1) means no account; a single local users row is created lazily and cached. When accounts arrive it gets linked, its UUID PK never changes.
- **Starter routines** (PRD A6): `starter-routines.ts` — 6 templates covering the 3/4/6-day frequencies (Full Body; Upper+Lower; Push/Pull/Legs days). Referenced by exact library name; the seeder resolves to ids and throws on any mismatch. `ensureSeeded` is now per-table idempotent: exercises and routines seed independently, so existing installs pick up the starters without touching anything else.
- **Zustand 5.0.15** (first use — techstack-mandated): `src/stores/routine-editor.ts` holds the editor draft so the exercise picker route can contribute and the editor survives navigation. Null rep-targets normalise to 8–12 at hydration.
- **ReorderableList** (`src/components/reorderable-list.tsx`): hand-rolled long-press drag on Gesture Handler (`Pan().activateAfterLongPress(250)`) + Reanimated 4 worklets (finger-tracking on the UI thread, 120ms settle, siblings reflow as plain state). Fixed-height rows; per-row gesture instances; active row tracked by key so it survives reorders mid-drag. `react-native-draggable-flatlist` was evaluated and rejected: its peer range admits Reanimated 4 but was built against v3 and actual compat is unverifiable without a device — per the working agreement, no gamble. `GestureHandlerRootView` added at the app root (required for any GH gesture).
- **Screens:** Routines tab (4th tab — Exercises/Routines/History/Profile) with counts + empty state; shared `RoutineEditorView` (name, notes, reorderable entries with per-exercise sets × rep-range numeric fields, add-exercise picker with search + multi-add, validation, save; duplicate/delete for existing routines); `SafeScreen` wrapper extracted (safe-area boilerplate was spreading); `LabeledInput` extracted from the exercise form and reused.
- Per-exercise rest overrides (schema supports `rest_seconds`) deliberately not exposed yet — E2 territory.

**Verification:** `tsc --noEmit` clean · Biome clean · dev bundle probed with real Expo Go params: 9.8MB with ReorderableList/starter-routine/worklet markers present.

**Decisions of note:**

- Drag-reorder hand-rolled rather than a library (compat gamble + log-register minimalism); if it ever feels cheap, revisit `react-native-draggable-flatlist` once it explicitly supports Reanimated 4.
- Starter "3 templates" expanded to 6 routine rows (Upper/Lower and PPL are multi-day templates; each day is its own routine, labelled in notes).
- Rep-target nullability (schema-optional per PRD) is normalised at the editor boundary rather than via a migration to NOT NULL.
- Editor draft in Zustand rather than route params — first Zustand use, the pattern for the Phase 5 active-workout session state.

**Known gaps left:** no drag auto-scroll when dragging beyond the visible area (lists are short; revisit if routines grow past ~10 entries); no supersets/folders (explicitly out of scope); picker doesn't filter out exercises already added (they're marked "added" instead).

**QA pass (same day, pre-phase-5):** three real bugs found by audit and fixed: (1) ReorderableList slot math trusted the gesture closure's `index` prop, which can go stale when mid-drag reorders re-render the list — the row now tracks its live slot in a shared value the worklet reads; (2) `getOrCreateLocalUser` could double-insert under concurrent first calls (seed + screen) — now promise-memoised with failure-clearing retry; (3) search LIKE patterns escaped `%`/`_`/`\` but SQLite ignores backslash escaping without an explicit `ESCAPE '\'` clause — raw sql with ESCAPE added. Verified: tsc, Biome, export, and dev bundle (real Expo Go params) all carry the fixes.

---

## Phase 5 — Active workout logging

**Date:** 18 August 2026

**Goal:** Start a session, log sets, finish, saved correctly. THE critical screen — speed is a hard requirement. LOG register per DESIGN §9.1.

**What was done:**

- **Sessions repository** (`src/db/repositories/sessions.ts`): start (prefills resolved before row creation), previous-performance lookup (most recent *complete* session per exercise, completed working sets by index), fire-and-forget set completion/update/add/remove (soft deletes), exercise add/remove/reorder, finish (duration computed from `started_at` at finish time — never accumulated; authoritative volume recomputed in SQL; routine `last_performed_at` stamped), discard, recovery fetch, latest-completed lookup. **All active-session writes flow through an ordered promise queue** (`enqueue`) so a fast follow-up can never overtake the row it depends on, while the UI never awaits anything.
- **Epley e1RM** (`estimate1rm`): computed on set completion and stored on the set row (r ≤ 10 per PRD E6); the denormalised column is ready for PR detection and charts.
- **Active-session store** (`src/stores/active-session.ts`, Zustand): synchronous optimistic mutations + background writes; prefill semantics (same set index last time, else the final set of that session, else empty); derived volume/set-count; launch recovery; `lastFinished` summary handoff to the History tab.
- **SetRow** (DESIGN §8): 56dp grid `SET | PREV | KG | REPS | ✓`, three states (pending faint / active panel-bg with amber-focused field / done mint with filled checkbox), tabular numerals, one-tap completion, long-press set number to remove, invalid/empty values redirect the tap into the empty field instead of failing silently. Inputs are system-keyboard **temporarily** — Phase 6's keypad swaps in behind the same callbacks.
- **ExerciseSection**: name, `LAST · 80 × 8, 8, 7` previous-performance line always visible, column header, set rows, + Add set (56dp), move ▲▼ and remove ✕ in the header.
- **Workout screen** (`/workout`): header with name + live timer (dataXL cyan, from `started_at`, display-only 1s tick) + live sets/volume; scroll of exercise sections; bottom third: + Add exercise (56dp), Finish (56dp primary), Discard (56dp). `useKeepAwake()` while mounted. Nothing modal except the discard confirmation. No spinners anywhere.
- **Persistent banner** (PRD D2): live-ticking 56dp bar above the tab navigator on every tab; tap to resume. One live session at a time — starting while active routes to the running session instead (never a dialog).
- **Start points**: ▶ button per routine row (72dp) and "Empty ▶" in the Routines header; both navigate once the session model is ready (local SQLite only — no perceptible wait).
- **Crash recovery** (PRD D12): launch gate (after seed, non-blocking) hydrates any `status='active'` session into the store → banner appears with correct elapsed time → tap to resume. Kill the app mid-workout and reopen: everything logged is there.
- **Finish flow**: session persisted `complete` with duration/volume; History tab shows a plain "Workout saved — N sets · X kg · MM:SS" card plus the latest completed session. No XP, no celebration (Phase 10).
- **Rest-timer hook** (`src/session/on-set-completed.ts`): completion calls a typed no-op hook — the timer phase plugs in here.
- **expo-keep-awake** declared and installed (new dependency: first-party Expo, required by PRD D11).

**Taps to log a repeat set: ONE.** The next set's weight/reps arrive pre-filled from the previous session's same index; the checkbox completes it. (Modified set: tap field → edit → ✓.)

**Verification:** `tsc --noEmit` clean · Biome clean · production export clean · dev bundle (real Expo Go params) contains session store/repository/screen markers.

**Decisions of note:**

- Write-serialisation via a repository-level queue rather than awaiting writes in the UI — satisfies "never block" without losing write ordering (complete-before-insert races).
- Recovery is the banner itself (non-modal, per the constraint) — PRD US-06's "prompt" implemented as an inline resumable bar, not a dialog.
- Exercise reorder mid-session via ▲▼ buttons (56dp) rather than drag — exercise sections are variable-height, which the fixed-row drag from Phase 4 doesn't fit; quiet and fast, revisit drag only if it feels slow in practice.
- Set removal via long-press on the set number — no per-row ✕ keeps the grid clean per DESIGN §8.
- `startSession` creates session/exercise/set rows in the background immediately (not lazily at first completion) so crash recovery has rows to restore from second one.
- History tab remains a placeholder (latest session only) — full history is the analytics phase.

**Known gaps left:** rest timer (hook stubbed); set types/RPE/notes/units (Phase 6 — set rows already carry `setType` and volume already excludes non-working sets); warm-up exclusion logic present but invisible until types exist; banner on non-tab screens (exercise detail, pickers) intentionally omitted for this phase — the session is still reachable via tab bar.
