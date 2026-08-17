# REPS

A gamified gym logger & progress tracker. Built with Expo, TypeScript, and Expo Router.

Current status: **Phase 0 — scaffold only.** Three placeholder tabs, no features.

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 57 (React Native 0.86, New Architecture) |
| Language | TypeScript, `strict: true` |
| Navigation | Expo Router (file-based, `src/app/`) |
| Lint / format | Biome (replaces ESLint + Prettier) |
| Builds | EAS Build (cloud, no Mac required) |

## Prerequisites

- **Node** LTS (20.19+ or 22.12+; this project was scaffolded on Node 26)
- **npm** (ships with Node)
- **Expo Go** on your phone — [Android (Play Store)](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS (App Store)](https://apps.apple.com/app/apple-store/id982107779) — for running the dev server on a device
- A free [Expo account](https://expo.dev/signup) for EAS builds

## Run the dev server

```bash
npm install        # once, after cloning
npx expo start
```

Metro starts and prints a QR code. Keep the terminal open.

## Run on your physical device

1. Connect your phone to the same Wi-Fi as this machine (or use a USB cable on Android).
2. Start the dev server (above).
3. **Android:** open Expo Go → "Scan QR code" → scan the terminal QR.
   (USB alternative: `npx expo start --android` with USB debugging enabled.)
4. **iOS:** open the Camera app → scan the QR → it opens in Expo Go.

The app reloads automatically as you save files.

## Build a preview APK (EAS)

One-time setup:

```bash
npm install -g eas-cli   # or use `npx eas-cli` everywhere
eas login                 # free Expo account
```

Then:

```bash
eas build --platform android --profile preview
```

- First run asks to create the EAS project for `kartiksaini024/reps` — accept; it writes the project ID into `app.json`.
- The build runs in Expo's cloud (~10–25 min on the free tier).
- When finished, the CLI prints a download URL for the `.apk`. Install it on your phone (Android will ask to allow installs from that source — that's normal).

`eas build --platform android --profile development` builds a development client instead (useful once native dependencies arrive; requires the `expo-dev-client` package at that point).

## Project structure

```
reps/
├── src/
│   ├── app/               # Expo Router file routes
│   │   ├── _layout.tsx    # Root gate: fonts → migrations → seed (dark theme)
│   │   ├── +not-found.tsx # Fallback for unmatched routes
│   │   ├── gallery.tsx    # Dev-only component gallery
│   │   └── (tabs)/        # Tab navigator group
│   │       ├── _layout.tsx  # Tabs: Home / History / Profile
│   │       ├── index.tsx    # Home — exercise list (from SQLite)
│   │       ├── history.tsx  # History
│   │       └── profile.tsx  # Profile
│   ├── components/        # Base components (Panel, Text, Button, StepBar, Marquee)
│   ├── config/            # Central settings: sounds, training defaults, telemetry
│   ├── db/                # Drizzle schema, client, seed, repositories
│   └── theme/             # Colour tokens, type scale, spacing, PIXEL_SCALE
├── drizzle/               # Generated migrations (committed — bundled into the app)
├── assets/                # App icon, splash, adaptive icons (template defaults)
├── app.json               # Expo config — name, IDs, dark UI, plugins, targets
├── babel.config.js        # babel-preset-expo + .sql inline-import (Drizzle migrations)
├── metro.config.js        # Sentry Expo config + .sql source extension
├── eas.json               # EAS profiles: development / preview / production
├── biome.json             # Lint + format config
├── drizzle.config.ts      # Drizzle Kit config (npm run db:generate)
├── tsconfig.json          # TypeScript strict + @/* path alias
├── PhaseLogs.md           # Per-phase change log
└── AGENTS.md              # Notes for AI coding agents working in this repo
```

## Native targets (verified from installed SDK)

- **Android:** compileSdk / targetSdk **36** (SDK 57 default, satisfies the Play Store API 36 mandate), minSdk 24
- **iOS:** deployment target **16.4** (SDK 57 default; meets the project's iOS 16+ floor)
- Bundle ID / package: `com.krumaxx.reps` (changeable until first store submission)

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start Metro dev server |
| `npm run android` / `npm run ios` / `npm run web` | Start and open on that platform |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Biome lint + format check |
| `npm run format` | Biome auto-format |
| `npm run db:generate` | Generate a Drizzle migration from schema changes |

**Schema changes:** edit `src/db/schema.ts`, run `npm run db:generate`, commit the `drizzle/` folder. Migrations apply automatically on next app start. Never edit a committed migration.

## Repository

- Remote: `https://github.com/KartikSaini024/reps.git`
