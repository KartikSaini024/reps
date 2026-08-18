import { router, Tabs } from 'expo-router';
import { View } from 'react-native';

import { ActiveWorkoutBanner } from '@/components/workout/active-workout-banner';
import { colors } from '@/theme';

/**
 * Tab navigator with the persistent active-workout banner mounted above it
 * (PRD D2): the session is reachable from every tab, one tap, never modal.
 */
export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.void }}>
      <ActiveWorkoutBanner onPress={() => router.push('/workout')} />
      <Tabs>
        <Tabs.Screen name="index" options={{ title: 'Exercises' }} />
        <Tabs.Screen name="routines" options={{ title: 'Routines' }} />
        <Tabs.Screen name="history" options={{ title: 'History' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      </Tabs>
    </View>
  );
}
