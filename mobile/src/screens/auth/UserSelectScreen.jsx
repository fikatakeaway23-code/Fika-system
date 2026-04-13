import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { colors, spacing, radius, fontSize, shadow } from '../../constants/theme.js';

const USERS = [
  { role: 'barista_am', name: 'Barista 1', initials: 'B1', shift: 'Morning Shift', hours: '6AM – 2PM',  color: colors.primary },
  { role: 'barista_pm', name: 'Barista 2', initials: 'B2', shift: 'Afternoon Shift',hours: '12PM – 8PM', color: colors.primary },
  { role: 'owner',      name: 'Owner',     initials: 'OW', shift: 'Full Access',    hours: 'All Hours',  color: colors.secondary },
];

export function UserSelectScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Who's working?</Text>
        <Text style={styles.sub}>Select your profile to continue</Text>

        {USERS.map((u) => (
          <TouchableOpacity
            key={u.role}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('PIN', { role: u.role, name: u.name, initials: u.initials, color: u.color })}
            style={[styles.card, u.role === 'owner' && styles.cardOwner]}
          >
            <View style={[styles.avatar, { backgroundColor: u.color }]}>
              <Text style={styles.initials}>{u.initials}</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, u.role === 'owner' && styles.nameOwner]}>{u.name}</Text>
              <Text style={[styles.shift, u.role === 'owner' && styles.shiftOwner]}>{u.shift}</Text>
              <View style={[styles.badge, u.role === 'owner' && styles.badgeOwner]}>
                <Text style={[styles.badgeText, u.role === 'owner' && styles.badgeTextOwner]}>{u.hours}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.footer}>📍 Dillibazar, Kathmandu · Open 6AM–8PM</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: colors.background },
  scroll:   { padding: spacing.base, paddingTop: spacing['3xl'] },

  heading:  { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text, marginBottom: 6 },
  sub:      { fontSize: fontSize.base, color: colors.textMuted, marginBottom: spacing.xl },

  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: colors.surface,
    borderRadius:    radius.xl,
    padding:         spacing.base,
    marginBottom:    spacing.md,
    borderWidth:     1,
    borderColor:     colors.border,
    ...shadow.sm,
  },
  cardOwner: { backgroundColor: colors.secondary, borderColor: colors.secondary },

  avatar: {
    width:        56,
    height:       56,
    borderRadius: radius.full,
    alignItems:   'center',
    justifyContent: 'center',
    marginRight:  spacing.base,
  },
  initials:   { fontSize: fontSize.lg, fontWeight: '700', color: colors.textInverse },

  info:       { flex: 1 },
  name:       { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: 2 },
  nameOwner:  { color: colors.textInverse },
  shift:      { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 6 },
  shiftOwner: { color: 'rgba(255,255,255,0.75)' },

  badge:         { alignSelf: 'flex-start', backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
  badgeOwner:    { backgroundColor: 'rgba(255,255,255,0.2)' },
  badgeText:     { fontSize: fontSize.xs, fontWeight: '600', color: '#276749' },
  badgeTextOwner:{ color: colors.textInverse },

  footer: { textAlign: 'center', fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.xl },
});
