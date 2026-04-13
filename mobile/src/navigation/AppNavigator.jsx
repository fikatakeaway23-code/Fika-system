import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth.store.js';
import { AuthNavigator } from './AuthNavigator.jsx';
import { BaristaNavigator } from './BaristaNavigator.jsx';
import { OwnerNavigator } from './OwnerNavigator.jsx';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../constants/theme.js';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { user, isLoggedIn, isLoading, hydrate } = useAuthStore();

  useEffect(() => { hydrate(); }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : user?.role === 'owner' ? (
          <Stack.Screen name="Owner" component={OwnerNavigator} />
        ) : (
          <Stack.Screen name="Barista" component={BaristaNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
