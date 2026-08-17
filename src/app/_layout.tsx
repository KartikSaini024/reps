import { Silkscreen_400Regular, Silkscreen_700Bold, useFonts } from '@expo-google-fonts/silkscreen';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts as useSpaceGroteskFonts,
} from '@expo-google-fonts/space-grotesk';
import * as Sentry from '@sentry/react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/text';
import { SENTRY_DSN, TELEMETRY } from '@/config/telemetry';
import { db } from '@/db/client';
import { ensureSeeded } from '@/db/seed';
import { colors, Spacing } from '@/theme';

import migrations from '../../drizzle/migrations';

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: TELEMETRY.tracesSampleRate,
  sendDefaultPii: false,
  enabled: !__DEV__ || TELEMETRY.enabledInDevelopment,
});

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash already hidden — safe to ignore.
});

/**
 * App-start gate: fonts → SQLite migrations → first-launch seed. Nothing
 * renders (splash stays up) until the database is verified. A failed
 * migration shows a clear error screen instead of silently running on a
 * broken database — training history is irreplaceable.
 */
function RootLayout() {
  const [displayLoaded] = useFonts({
    Silkscreen_400Regular,
    Silkscreen_700Bold,
  });
  const [uiLoaded] = useSpaceGroteskFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  const { success: migrationsApplied, error: migrationError } = useMigrations(db, migrations);

  const [seedState, setSeedState] = useState<{ status: 'pending' | 'error'; message?: string }>({
    status: 'pending',
  });

  useEffect(() => {
    if (!migrationsApplied) {
      return;
    }
    let cancelled = false;
    ensureSeeded()
      .then(() => {
        if (!cancelled) {
          setSeedState({ status: 'pending' });
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

  const ready = displayLoaded && uiLoaded && migrationsApplied && seedState.status === 'pending';

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  useEffect(() => {
    if (migrationError) {
      Sentry.captureException(migrationError, { tags: { startup: 'migration' } });
    }
  }, [migrationError]);

  useEffect(() => {
    if (seedState.status === 'error') {
      Sentry.captureException(new Error(seedState.message), { tags: { startup: 'seed' } });
    }
  }, [seedState.status, seedState.message]);

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
    return null;
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}

export default Sentry.wrap(RootLayout);

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
