import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { Spacing } from '@/theme';

export default function Profile() {
  return (
    <View style={{ padding: Spacing[4], gap: Spacing[4] }}>
      <Text variant="body">Profile</Text>
      {__DEV__ ? (
        <Button label="Component Gallery" variant="ghost" onPress={() => router.push('/gallery')} />
      ) : null}
    </View>
  );
}
