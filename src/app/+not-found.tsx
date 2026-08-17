import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <Text>This screen does not exist.</Text>
      <Link href="/">Go to Home</Link>
    </View>
  );
}
