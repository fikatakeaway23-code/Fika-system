import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, BOTTOM_NAV_HEIGHT } from '../constants/theme.js';

import { OwnerDashboardScreen }  from '../screens/owner/OwnerDashboardScreen.jsx';
import { ShiftsScreen }          from '../screens/owner/ShiftsScreen.jsx';
import { FinanceEntryScreen }    from '../screens/owner/FinanceEntryScreen.jsx';
import { DiscrepancyScreen }     from '../screens/owner/DiscrepancyScreen.jsx';
import { MonthlyReportScreen }   from '../screens/owner/MonthlyReportScreen.jsx';
import { ExpensesScreen }        from '../screens/owner/ExpensesScreen.jsx';
import { MembershipsScreen }     from '../screens/owner/MembershipsScreen.jsx';
import { MembershipDetailScreen }from '../screens/owner/MembershipDetailScreen.jsx';
import { HRScreen }              from '../screens/owner/HRScreen.jsx';
import { SettingsScreen }        from '../screens/owner/SettingsScreen.jsx';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ label, emoji, focused }) {
  return (
    <View style={styles.tabItem}>
      <Text style={styles.tabEmoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
      {focused && <View style={styles.tabIndicator} />}
    </View>
  );
}

function FinanceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FinanceEntry"  component={FinanceEntryScreen} />
      <Stack.Screen name="Discrepancy"   component={DiscrepancyScreen}  options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMenu"          component={MoreMenuScreen} />
      <Stack.Screen name="MonthlyReport"     component={MonthlyReportScreen}    options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Expenses"          component={ExpensesScreen}         options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Memberships"       component={MembershipsScreen}      options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="MembershipDetail"  component={MembershipDetailScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="HR"                component={HRScreen}               options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="Settings"          component={SettingsScreen}         options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

// Simple More menu screen
import { ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { spacing, radius, shadow } from '../constants/theme.js';

function MoreMenuScreen({ navigation }) {
  const items = [
    { label: 'Monthly Report', emoji: '📈', screen: 'MonthlyReport' },
    { label: 'Expenses',       emoji: '💸', screen: 'Expenses' },
    { label: 'Memberships',    emoji: '🏢', screen: 'Memberships' },
    { label: 'HR Records',     emoji: '👥', screen: 'HR' },
    { label: 'Settings',       emoji: '⚙️', screen: 'Settings' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <Text style={{ fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, margin: spacing.base, marginTop: spacing.xl }}>More</Text>
      <ScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.sm }}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.screen}
            onPress={() => navigation.navigate(item.screen)}
            style={{
              backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.base,
              flexDirection: 'row', alignItems: 'center', ...shadow.sm,
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 24, marginRight: spacing.md }}>{item.emoji}</Text>
            <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: colors.text }}>{item.label}</Text>
            <Text style={{ marginLeft: 'auto', color: colors.textMuted }}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export function OwnerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={OwnerDashboardScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Dashboard" emoji="📊" focused={focused} /> }}
      />
      <Tab.Screen
        name="Shifts"
        component={ShiftsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Shifts" emoji="📋" focused={focused} /> }}
      />
      <Tab.Screen
        name="Finance"
        component={FinanceStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="Finance" emoji="💰" focused={focused} /> }}
      />
      <Tab.Screen
        name="More"
        component={MoreStack}
        options={{ tabBarIcon: ({ focused }) => <TabIcon label="More" emoji="☰" focused={focused} /> }}
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
  },
  tabItem:       { alignItems: 'center', justifyContent: 'center', paddingTop: 8, position: 'relative' },
  tabEmoji:      { fontSize: 20 },
  tabLabel:      { fontSize: fontSize.xs, color: colors.textMuted,  marginTop: 2 },
  tabLabelActive:{ fontSize: fontSize.xs, color: colors.primary, fontWeight: '600', marginTop: 2 },
  tabIndicator:  { position: 'absolute', top: -8, width: 32, height: 3, borderRadius: 2, backgroundColor: colors.primary },
});
