import React, { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import '../global.css';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiBaseUrl } from '@/services/api';
import { useColorScheme } from '@/components/useColorScheme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Check for server URL on load
  useEffect(() => {
    const checkServerUrl = async () => {
      try {
        const url = await AsyncStorage.getItem('server_url');
        if (url) {
          setApiBaseUrl(url);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsReady(true);
      }
    };
    checkServerUrl();
  }, []);

  // Protected Route Logic
  useEffect(() => {
    if (!isReady || !loaded) return;

    const inConnectGroup = segments[0] === 'connect';

    const checkAuth = async () => {
      const url = await AsyncStorage.getItem('server_url');
      if (!url && !inConnectGroup) {
        // Redirect to connect screen if no URL
        router.replace('/connect');
      } else if (url && inConnectGroup) {
        // Redirect to dashboard if URL exists
        router.replace('/(tabs)');
      }
    };

    checkAuth();
  }, [isReady, loaded, segments]);

  if (!loaded || !isReady) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="connect" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
