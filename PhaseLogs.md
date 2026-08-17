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
