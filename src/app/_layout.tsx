import { Silkscreen_400Regular, Silkscreen_700Bold, useFonts } from '@expo-google-fonts/silkscreen';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts as useSpaceGroteskFonts,
} from '@expo-google-fonts/space-grotesk';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import Constants from 'expo-constants';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text } from '@/components/text';
import { db } from '@/db/client';
import { ensureSeeded } from '@/db/seed';
import { colors, Spacing } from '@/theme';

import migrations from '../../drizzle/migrations';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash already hidden — safe to ignore.
});

type SeedState = { status: 'pending' | 'running' | 'done' | 'error'; message?: string };

/**
 * App-start gate: fonts → SQLite migrations → first-launch seed. Nothing
 * renders (splash stays up) until the database is verified. A failed
 * migration shows a clear error screen instead of silently running on a
 * broken database — training history is irreplaceable. In dev, a gate that
 * stays closed for 2.5s becomes a diagnostics screen naming the stuck step.
 */
function RootLayout() {
  const [displayLoaded, displayError] = useFonts({
    Silkscreen_400Regular,
    Silkscreen_700Bold,
  });
  const [uiLoaded, uiError] = useSpaceGroteskFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  // A font load FAILURE must not brick the app: proceed with system fonts.
  // (Unloaded family names fall back to the system font at render time.)
  const fontsSettled =
    (displayLoaded || displayError !== undefined) && (uiLoaded || uiError !== undefined);
  const _fontError = displayError?.message ?? uiError?.message;

  const { success: migrationsApplied, error: migrationError } = useMigrations(db, migrations);

  const [seedState, setSeedState] = useState<SeedState>({ status: 'pending' });

  // Dev safety net: if the gate hasn't opened within 2.5s, say why instead of
  // showing an eternal splash — and drop the native splash so this screen is
  // actually visible (preventAutoHideAsync would otherwise cover it forever).
  const [diagnostics, setDiagnostics] = useState(false);
  useEffect(() => {
    if (!__DEV__) {
      return;
    }
    const timer = setTimeout(() => {
      setDiagnostics(true);
      SplashScreen.hideAsync().catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!migrationsApplied) {
      return;
    }
    let cancelled = false;
    setSeedState({ status: 'running' });
    ensureSeeded()
      .then(() => {
        if (!cancelled) {
          setSeedState({ status: 'done' });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSeedState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [migrationsApplied]);

  const ready = fontsSettled && migrationsApplied && seedState.status === 'done';

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (migrationError) {
    return (
      <StartupErrorScreen
        title="Database update failed"
        message={migrationError.message}
        hint="Your training history is untouched. Restart the app to retry. Do not reinstall."
      />
    );
  }

  if (seedState.status === 'error') {
    return (
      <StartupErrorScreen
        title="Could not prepare exercise library"
        message={seedState.message ?? 'Unknown error'}
        hint="Restart the app to retry."
      />
    );
  }

  if (!ready) {
    if (diagnostics) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.void,
            alignItems: 'center',
            justifyContent: 'center',
            padding: Spacing[6],
            gap: Spacing[2],
          }}
        >
          <Text variant="title">Startup hang (dev)</Text>
          <Text variant="micro">
            splash fonts:{' '}
            {displayLoaded ? 'ok' : displayError ? `ERROR: ${displayError.message}` : 'PENDING'}
          </Text>
          <Text variant="micro">
            ui fonts: {uiLoaded ? 'ok' : uiError ? `ERROR: ${uiError.message}` : 'PENDING'}
          </Text>
          <Text variant="micro">migrations: {migrationsApplied ? 'ok' : 'PENDING'}</Text>
          <Text variant="micro">seed: {seedState.status}</Text>
          <Text variant="micro">env: {Constants.executionEnvironment}</Text>
        </View>
      );
    }
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.void }}>
      <ThemeProvider value={DarkTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function StartupErrorScreen({
  title,
  message,
  hint,
}: {
  title: string;
  message: string;
  hint: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.void,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing[6],
        gap: Spacing[3],
      }}
    >
      <Text variant="dataXL" color="pr">
        !
      </Text>
      <Text variant="title">{title}</Text>
      <Text variant="micro" style={{ textAlign: 'center' }}>
        {message}
      </Text>
      <Text variant="micro" color="ink" style={{ textAlign: 'center' }}>
        {hint}
      </Text>
    </View>
  );
}

export default RootLayout;
