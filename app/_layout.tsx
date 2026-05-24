import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'PASSPORT PHOTO', headerBackVisible: false }}
        />
        <Stack.Screen name="template" options={{ title: 'SELECT COUNTRY' }} />
        <Stack.Screen name="compliance" options={{ title: 'COMPLIANCE CHECK' }} />
        <Stack.Screen name="preview" options={{ title: 'PREVIEW' }} />
      </Stack>
    </>
  );
}
