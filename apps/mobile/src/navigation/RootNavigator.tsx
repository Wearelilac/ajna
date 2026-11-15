/**
 * M1.1: Root Navigator (Stack-based)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../providers/AuthProvider';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AboutScreen } from '../screens/AboutScreen';

// Feature A: Resilience Radar
import { RadarScreen } from '../features/radar/RadarScreen';

// Feature B: Monitor
import { MonitorScreen } from '../features/monitor/MonitorScreen';

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Settings: undefined;
  About: undefined;
  Radar: undefined;
  Monitor: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null; // TODO: Add loading screen
  }

  return (
    <Stack.Navigator
      initialRouteName={user ? 'Home' : 'Login'}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2563eb', // blue-600
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {user ? (
        <>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'Ajna' }}
          />
          <Stack.Screen 
            name="Radar" 
            component={RadarScreen} 
            options={{ title: 'Resilience Radar' }}
          />
          <Stack.Screen 
            name="Monitor" 
            component={MonitorScreen} 
            options={{ title: 'Monitor Session' }}
          />
          <Stack.Screen 
            name="Settings" 
            component={SettingsScreen} 
            options={{ title: 'Settings' }}
          />
          <Stack.Screen 
            name="About" 
            component={AboutScreen} 
            options={{ title: 'About Ajna' }}
          />
        </>
      ) : (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
}
