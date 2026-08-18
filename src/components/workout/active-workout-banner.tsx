import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/text';
import { useActiveSessionStore } from '@/stores/active-session';
import { colors, FontFamily } from '@/theme';

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Persistent active-workout banner (PRD D2): sits above the tab bar on
 * every tab while a session is live. Never modal — a single tap resumes.
 */
export function ActiveWorkoutBanner({ onPress }: { onPress: () => void }) {
  const sessionId = useActiveSessionStore((state) => state.sessionId);
  const startedAt = useActiveSessionStore((state) => state.startedAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sessionId]);

  if (!sessionId || !startedAt) {
    return null;
  }

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Active workout, ${formatDuration(elapsed)} elapsed. Tap to resume.`}
      style={({ pressed }) => ({
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        backgroundColor: pressed ? colors.rule : colors.panel,
        borderTopWidth: 2,
        borderTopColor: colors.coin,
      })}
    >
      <View style={{ width: 12, height: 12, backgroundColor: colors.coin }} />
      <Text variant="label" color="coin" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
        active
      </Text>
      <View style={{ flex: 1 }} />
      <Text variant="dataL" color="data" style={{ fontFamily: FontFamily.dataBold }}>
        {formatDuration(elapsed)}
      </Text>
    </Pressable>
  );
}
