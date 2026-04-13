import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, BOTTOM_NAV_HEIGHT } from '../constants/theme.js';
import { BaristaHomeScreen }  from '../screens/barista/BaristaHomeScreen.jsx';
import { ShiftFormScreen }    from '../screens/barista/ShiftFormScreen.jsx';
import { ExpenseScreen }      from '../screens/barista/ExpenseScreen.jsx';
import { ProfileScreen }      from '../screens/barista/ProfileScreen.jsx';

const Tab  = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ label, emoji, focused }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
      {focused && <View style={styles.tabIndicator} />}
    </View>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BaristaHome" component={BaristaHomeScreen} />
      <Stack.Screen name="ShiftForm"   component={ShiftFormScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

export function BaristaNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Home" emoji="🏠" focused={focused} /> }}
      />
      <Tab.Screen
        name="ShiftTab"
        component={ShiftFormScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Shift" emoji="📋" focused={focused} /> }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpenseScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Expense" emoji="💸" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Profile" emoji="👤" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height:          BOTTOM_NAV_HEIGHT,
    backgroundColor: colors.background,
    borderTopColor:  colors.border,
    borderTopWidth:  1,
    paddingBottom:   0,
  },
  tabItem: {
    alignItems:  'center',
    justifyContent: 'center',
    paddingTop:  8,
    position:    'relative',
  },
  tabEmoji:      { fontSize: 20 },
  tabEmojiActive:{ },
  tabLabel:      { fontSize: fontSize.xs, color: colors.textMuted,  marginTop: 2 },
  tabLabelActive:{ fontSize: fontSize.xs, color: colors.primary, fontWeight: '600', marginTop: 2 },
  tabIndicator:  {
    position:        'absolute',
    top:             -8,
    width:           32,
    height:          3,
    borderRadius:    2,
    backgroundColor: colors.primary,
  },
});
