import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, radius } from '../constants/theme.js';

const VARIANTS = {
  active:    { bg: colors.primaryLight, text: '#276749' },
  pending:   { bg: colors.warningLight, text: '#C05621' },
  alert:     { bg: colors.dangerLight,  text: '#C53030' },
  cancelled: { bg: '#EDF2F7',           text: '#4A5568' },
  am:        { bg: colors.primaryLight, text: '#276749' },
  pm:        { bg: '#EBF8FF',           text: '#2B6CB0' },
  submitted: { bg: colors.primaryLight, text: '#276749' },
  in_progress: { bg: colors.warningLight, text: '#C05621' },
  reviewed:  { bg: '#EDF2F7',           text: '#4A5568' },
};

export function Badge({ variant = 'active', label, style }) {
  const v = VARIANTS[variant] ?? VARIANTS.active;
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      radius.full,
    alignSelf:         'flex-start',
  },
  text: {
    fontSize:   fontSize.xs,
    fontWeight: '600',
  },
});
