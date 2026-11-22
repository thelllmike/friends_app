import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { MatchProvider } from '@/lib/match';
import { OfflineGate } from '@/components/OfflineGate';
import { ToastHost } from '@/components/Toast';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Poppins_600SemiBold, Poppins_700Bold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MatchProvider>
          <StatusBar style="dark" />
          <OfflineGate>
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#fff' } }}>
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="call" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="premium" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            </Stack>
          </OfflineGate>
          <ToastHost />
        </MatchProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
