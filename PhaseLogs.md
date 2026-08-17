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

**Known gaps left:** Sentry source-map upload needs the Sentry organization/project slugs + `SENTRY_AUTH_TOKEN` as an EAS secret (plugin currently warns at config time, builds fine; stacks will be unsymbolicated until then); Sentry native crash capture requires a development/preview build (not Expo Go); no runtime retry button on the startup error screen (restart retries); PhaseLogs to be updated at the end of every phase per standing instruction.
